import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

interface FiltrosClientes {
  q?: string;
  canal?: string;
}

export async function getClientes(filtros: FiltrosClientes = {}): Promise<Cliente[]> {
  const supabase = await createClient();
  let query = supabase.from("clientes").select("*").order("nombre");

  if (filtros.canal) query = query.eq("canal", filtros.canal);
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
}

/** Clientes (a visitar) que pertenecen a los distritos indicados. */
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
  return (data ?? []) as ClienteRuta[];
}
