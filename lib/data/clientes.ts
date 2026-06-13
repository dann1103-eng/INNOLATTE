import { createClient } from "@/lib/supabase/server";
import { round2 } from "@/lib/utils";
import type { Cliente } from "@/lib/types";

interface FiltrosClientes {
  q?: string;
  canal?: string;
  departamento?: string;
  distrito?: string;
}

export async function getClientes(filtros: FiltrosClientes = {}): Promise<Cliente[]> {
  const supabase = await createClient();
  let query = supabase.from("clientes").select("*").order("nombre");

  if (filtros.canal) query = query.eq("canal", filtros.canal);
  if (filtros.departamento) query = query.eq("departamento", filtros.departamento);
  if (filtros.distrito) query = query.eq("distrito", filtros.distrito);
  if (filtros.q) {
    const term = `%${filtros.q}%`;
    query = query.or(
      `nombre.ilike.${term},nombre_comercial.ilike.${term},codigo_cliente.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Cliente;
}

/** Lista ligera de clientes para el selector de pedidos. */
export async function getClientesParaSelector() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, codigo_cliente, nombre, nombre_comercial, canal, lista_precios, forma_pago, direccion_entrega",
    )
    .eq("activo", true)
    .order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCanales(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("canal");
  const set = new Set<string>();
  for (const r of data ?? []) if (r.canal) set.add(r.canal);
  return [...set].sort();
}

/** Departamentos y distritos distintos (para los filtros de ubicación). */
export async function getUbicacionesClientes(): Promise<{
  departamentos: string[];
  distritos: string[];
}> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("departamento, distrito");
  const dep = new Set<string>();
  const dis = new Set<string>();
  for (const r of data ?? []) {
    if (r.departamento) dep.add(r.departamento);
    if (r.distrito) dis.add(r.distrito);
  }
  return {
    departamentos: [...dep].sort(),
    distritos: [...dis].sort(),
  };
}

/** Fecha del último pedido (no cancelado) por cliente. */
export async function getUltimoPedidoPorCliente(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("cliente_id, fecha")
    .neq("estado", "CANCELADO")
    .order("fecha", { ascending: false });

  const map = new Map<string, string>();
  for (const p of data ?? []) {
    if (p.cliente_id && !map.has(p.cliente_id)) map.set(p.cliente_id, p.fecha);
  }
  return map;
}

/** Distritos con cantidad de clientes (para el reporte de rutas). */
export async function getDistritosConConteo(): Promise<
  { distrito: string; clientes: number }[]
> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("distrito").eq("activo", true);
  const conteo = new Map<string, number>();
  for (const r of data ?? []) {
    if (!r.distrito) continue;
    conteo.set(r.distrito, (conteo.get(r.distrito) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([distrito, clientes]) => ({ distrito, clientes }))
    .sort((a, b) => a.distrito.localeCompare(b.distrito));
}

export interface ClienteRuta {
  id: string;
  codigo_cliente: string;
  nombre: string;
  nombre_comercial: string | null;
  distrito: string | null;
  municipio: string | null;
  direccion_entrega: string | null;
  telefono: string | null;
  contacto_nombre: string | null;
  canal: string | null;
  /** Pedidos por entregar (PENDIENTE o EN_RUTA) de este cliente. */
  pedidosPendientes: number;
  totalPendiente: number;
}

/** Clientes (a visitar) que pertenecen a los distritos indicados, anotados con
 *  sus pedidos por entregar. */
export async function getClientesPorDistritos(
  distritos: string[],
): Promise<ClienteRuta[]> {
  if (distritos.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, codigo_cliente, nombre, nombre_comercial, distrito, municipio, direccion_entrega, telefono, contacto_nombre, canal",
    )
    .eq("activo", true)
    .in("distrito", distritos)
    .order("distrito")
    .order("nombre");
  if (error) throw new Error(error.message);

  const clientes = (data ?? []) as Omit<
    ClienteRuta,
    "pedidosPendientes" | "totalPendiente"
  >[];
  if (clientes.length === 0) return [];

  // Pedidos por entregar de esos clientes.
  const ids = clientes.map((c) => c.id);
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("cliente_id, total")
    .in("cliente_id", ids)
    .in("estado", ["PENDIENTE", "EN_RUTA"]);

  const agg = new Map<string, { n: number; total: number }>();
  for (const p of pedidos ?? []) {
    if (!p.cliente_id) continue;
    const a = agg.get(p.cliente_id) ?? { n: 0, total: 0 };
    a.n += 1;
    a.total += Number(p.total || 0);
    agg.set(p.cliente_id, a);
  }

  return clientes.map((c) => {
    const a = agg.get(c.id);
    return {
      ...c,
      pedidosPendientes: a?.n ?? 0,
      totalPendiente: round2(a?.total ?? 0),
    };
  });
}
