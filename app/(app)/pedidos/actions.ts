"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  resolverPrecio,
  calcularSubtotal,
  calcularTotal,
  calcularTotalConIva,
} from "@/lib/pricing";
import { round2 } from "@/lib/utils";
import type { EstadoPedido, PedidoItem } from "@/lib/types";

const ItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
  // Precio fijado a mano para la línea (opcional). Si no viene, se usa la lista.
  precioUnitario: z.number().nonnegative().optional(),
});

const PedidoSchema = z.object({
  clienteId: z.string().uuid("Selecciona un cliente"),
  fecha: z.string().min(1),
  notas: z.string().nullable().optional(),
  // Lista de precios a aplicar SOLO a este pedido (override). Si no viene, la del cliente.
  lista: z.number().int().min(1).max(20).optional(),
  items: z.array(ItemSchema).min(1, "Agrega al menos un producto"),
});

export type CrearPedidoInput = z.infer<typeof PedidoSchema>;
export type CrearPedidoResult = { ok: boolean; id?: string; error?: string };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type LineaCalculada = {
  producto_id: string;
  codigo: string;
  descripcion: string;
  sabor: string | null;
  presentacion: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

/**
 * Resuelve cliente + líneas + total a partir del input. Recalcula los precios
 * en el servidor (no confía en el navegador). Compartido por crear y actualizar.
 */
async function resolverPedido(
  supabase: SupabaseClient,
  input: CrearPedidoInput,
): Promise<
  | { ok: true; cliente: { id: string; canal: string | null; forma_pago: string | null; direccion_entrega: string | null }; lista: number; lineas: LineaCalculada[]; total: number }
  | { ok: false; error: string }
> {
  const { clienteId, items, lista: listaOverride } = input;

  const { data: cliente, error: cliErr } = await supabase
    .from("clientes")
    .select("id, canal, forma_pago, direccion_entrega, lista_precios")
    .eq("id", clienteId)
    .single();
  if (cliErr || !cliente) return { ok: false, error: "Cliente no encontrado" };

  const lista = listaOverride ?? cliente.lista_precios;

  const ids = items.map((i) => i.productoId);
  const { data: productos, error: prodErr } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, categoria, sabor, presentacion, producto_precios(lista, precio)")
    .in("id", ids);
  if (prodErr) return { ok: false, error: prodErr.message };

  const mapaProd = new Map(
    (productos ?? []).map((p) => {
      const precios: Record<number, number> = {};
      for (const pr of (p.producto_precios ?? []) as { lista: number; precio: number }[]) {
        precios[pr.lista] = Number(pr.precio);
      }
      return [p.id, { ...p, precios }];
    }),
  );

  const lineas: LineaCalculada[] = [];
  for (const item of items) {
    const prod = mapaProd.get(item.productoId);
    if (!prod) return { ok: false, error: "Un producto del pedido ya no existe" };

    const base = resolverPrecio({ precios: prod.precios, categoria: prod.categoria }, lista);
    const precio =
      item.precioUnitario !== undefined && item.precioUnitario >= 0
        ? round2(item.precioUnitario)
        : base.precio;

    if (precio === null) {
      return {
        ok: false,
        error: `El producto ${prod.codigo} no tiene precio en la lista P${lista}. Asígnale un precio en la línea.`,
      };
    }
    lineas.push({
      producto_id: prod.id,
      codigo: prod.codigo,
      descripcion: prod.descripcion,
      sabor: prod.sabor,
      presentacion: prod.presentacion,
      cantidad: item.cantidad,
      precio_unitario: precio,
      subtotal: calcularSubtotal(precio, item.cantidad),
    });
  }

  const total = calcularTotal(lineas.map((l) => l.subtotal));
  return { ok: true, cliente, lista, lineas, total };
}

/**
 * Crea un pedido. Los precios se RECALCULAN en el servidor desde la base de
 * datos (no se confía en los valores del navegador) usando la lista del cliente.
 */
export async function crearPedido(
  input: CrearPedidoInput,
): Promise<CrearPedidoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = PedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const r = await resolverPedido(supabase, parsed.data);
  if (!r.ok) return r;

  const { data: pedido, error: pedErr } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: r.cliente.id,
      fecha: parsed.data.fecha,
      canal: r.cliente.canal,
      forma_pago: r.cliente.forma_pago,
      direccion_entrega: r.cliente.direccion_entrega,
      lista_precios_aplicada: r.lista,
      estado: "PENDIENTE",
      facturado: false,
      subtotal: r.total,
      total: calcularTotalConIva(r.total),
      notas: parsed.data.notas?.trim() || null,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (pedErr || !pedido) return { ok: false, error: pedErr?.message ?? "No se pudo crear" };

  const { error: itemsErr } = await supabase
    .from("pedido_items")
    .insert(r.lineas.map((l) => ({ ...l, pedido_id: pedido.id })));
  if (itemsErr) {
    await supabase.from("pedidos").delete().eq("id", pedido.id);
    return { ok: false, error: itemsErr.message };
  }

  revalidatePath("/pedidos");
  revalidatePath("/");
  return { ok: true, id: pedido.id };
}

/**
 * Actualiza un pedido existente: recalcula totales, actualiza la cabecera
 * (manteniendo folio, estado, facturado, creado_por) y reemplaza las líneas.
 */
export async function actualizarPedido(
  id: string,
  input: CrearPedidoInput,
): Promise<CrearPedidoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = PedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const r = await resolverPedido(supabase, parsed.data);
  if (!r.ok) return r;

  const { error: updErr } = await supabase
    .from("pedidos")
    .update({
      cliente_id: r.cliente.id,
      fecha: parsed.data.fecha,
      canal: r.cliente.canal,
      forma_pago: r.cliente.forma_pago,
      direccion_entrega: r.cliente.direccion_entrega,
      lista_precios_aplicada: r.lista,
      subtotal: r.total,
      total: calcularTotalConIva(r.total),
      notas: parsed.data.notas?.trim() || null,
    })
    .eq("id", id);
  if (updErr) return { ok: false, error: updErr.message };

  // Reemplaza las líneas.
  const { error: delErr } = await supabase.from("pedido_items").delete().eq("pedido_id", id);
  if (delErr) return { ok: false, error: delErr.message };

  const { error: insErr } = await supabase
    .from("pedido_items")
    .insert(r.lineas.map((l) => ({ ...l, pedido_id: id })));
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

/** Elimina un pedido (solo admin, según RLS). */
export async function eliminarPedido(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "admin")
    return { ok: false, error: "Solo un administrador puede eliminar pedidos" };

  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pedidos");
  revalidatePath("/");
  return { ok: true };
}

const ESTADOS: EstadoPedido[] = ["PENDIENTE", "EN_RUTA", "ENTREGADO", "CANCELADO"];

export async function actualizarEstado(
  id: string,
  estado: EstadoPedido,
): Promise<{ ok: boolean; error?: string }> {
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Estado inválido" };
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/pedidos");
  return { ok: true };
}

export async function marcarFacturado(
  id: string,
  facturado: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").update({ facturado }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/pedidos");
  return { ok: true };
}

/**
 * Devuelve los items de varios pedidos agrupados por pedido_id.
 * Usado por el PDF detallado (la tabla de la lista no carga items).
 * Respeta RLS (cliente de servidor autenticado).
 */
export async function getItemsDePedidos(
  ids: string[],
): Promise<Record<string, PedidoItem[]>> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedido_items")
    .select("*")
    .in("pedido_id", ids);
  if (error) throw new Error(error.message);

  const mapa: Record<string, PedidoItem[]> = {};
  for (const it of (data ?? []) as PedidoItem[]) {
    (mapa[it.pedido_id] ??= []).push(it);
  }
  return mapa;
}
