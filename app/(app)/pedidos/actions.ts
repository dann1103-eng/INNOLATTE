"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolverPrecio, calcularSubtotal, calcularTotal } from "@/lib/pricing";
import { round2 } from "@/lib/utils";
import type { EstadoPedido } from "@/lib/types";

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
  const { clienteId, fecha, notas, items, lista: listaOverride } = parsed.data;

  // Cliente + su lista de precios.
  const { data: cliente, error: cliErr } = await supabase
    .from("clientes")
    .select("id, canal, forma_pago, direccion_entrega, lista_precios")
    .eq("id", clienteId)
    .single();
  if (cliErr || !cliente) return { ok: false, error: "Cliente no encontrado" };

  // La lista override aplica solo a este pedido; no modifica al cliente.
  const lista = listaOverride ?? cliente.lista_precios;

  // Productos con sus precios.
  const ids = items.map((i) => i.productoId);
  const { data: productos, error: prodErr } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, sabor, presentacion, producto_precios(lista, precio)")
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

  // Construye las líneas resolviendo el precio.
  const lineas: {
    producto_id: string;
    codigo: string;
    descripcion: string;
    sabor: string | null;
    presentacion: string | null;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[] = [];

  for (const item of items) {
    const prod = mapaProd.get(item.productoId);
    if (!prod) return { ok: false, error: "Un producto del pedido ya no existe" };

    // Precio: el fijado a mano (si es válido) tiene prioridad; si no, el de la lista.
    const base = resolverPrecio({ precios: prod.precios }, lista);
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

  // Inserta el pedido (cabecera con snapshot del cliente).
  const { data: pedido, error: pedErr } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: cliente.id,
      fecha,
      canal: cliente.canal,
      forma_pago: cliente.forma_pago,
      direccion_entrega: cliente.direccion_entrega,
      lista_precios_aplicada: lista,
      estado: "PENDIENTE",
      facturado: false,
      subtotal: total,
      total,
      notas: notas?.trim() || null,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (pedErr || !pedido) return { ok: false, error: pedErr?.message ?? "No se pudo crear" };

  // Inserta las líneas.
  const { error: itemsErr } = await supabase
    .from("pedido_items")
    .insert(lineas.map((l) => ({ ...l, pedido_id: pedido.id })));
  if (itemsErr) {
    // Rollback manual: elimina la cabecera huérfana.
    await supabase.from("pedidos").delete().eq("id", pedido.id);
    return { ok: false, error: itemsErr.message };
  }

  revalidatePath("/pedidos");
  revalidatePath("/");
  return { ok: true, id: pedido.id };
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
