import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido, PedidoCompleto, PedidoConCliente } from "@/lib/types";

interface FiltrosPedidos {
  q?: string;
  estado?: string;
  facturado?: string;
}

export async function getPedidos(
  filtros: FiltrosPedidos = {},
): Promise<PedidoConCliente[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pedidos")
    .select(
      "*, cliente:clientes(id, codigo_cliente, nombre, nombre_comercial)",
    )
    .order("created_at", { ascending: false });

  if (filtros.estado) query = query.eq("estado", filtros.estado as EstadoPedido);
  if (filtros.facturado === "si") query = query.eq("facturado", true);
  if (filtros.facturado === "no") query = query.eq("facturado", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let pedidos = (data ?? []) as unknown as PedidoConCliente[];

  // Búsqueda por folio o nombre de cliente (filtrado en memoria para soportar joins).
  if (filtros.q) {
    const term = filtros.q.toLowerCase().replace("#", "");
    pedidos = pedidos.filter(
      (p) =>
        String(p.folio).includes(term) ||
        p.cliente?.nombre?.toLowerCase().includes(term) ||
        p.cliente?.nombre_comercial?.toLowerCase().includes(term) ||
        p.cliente?.codigo_cliente?.toLowerCase().includes(term),
    );
  }

  return pedidos;
}

export async function getPedidoCompleto(id: string): Promise<PedidoCompleto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "*, cliente:clientes(id, codigo_cliente, nombre, nombre_comercial), items:pedido_items(*)",
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as PedidoCompleto;
}
