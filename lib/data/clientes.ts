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
