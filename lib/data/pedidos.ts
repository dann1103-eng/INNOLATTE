import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido, PedidoCompleto, PedidoConCliente } from "@/lib/types";

export interface FiltrosPedidos {
  q?: string;
  estado?: string;
  facturado?: string;
  desde?: string;
  hasta?: string;
  producto?: string; // código de producto
}

export async function getPedidos(
  filtros: FiltrosPedidos = {},
): Promise<PedidoConCliente[]> {
  const supabase = await createClient();

  // Filtro por producto: primero obtenemos los pedidos que contienen ese código.
  let idsPorProducto: string[] | null = null;
  if (filtros.producto) {
    const { data: items } = await supabase
      .from("pedido_items")
      .select("pedido_id")
      .eq("codigo", filtros.producto);
    idsPorProducto = [...new Set((items ?? []).map((i) => i.pedido_id))];
    if (idsPorProducto.length === 0) return [];
  }

  let query = supabase
    .from("pedidos")
    .select(
      "*, cliente:clientes(id, codigo_cliente, nombre, nombre_comercial)",
    )
    .order("created_at", { ascending: false });

  if (filtros.estado) query = query.eq("estado", filtros.estado as EstadoPedido);
  if (filtros.facturado === "si") query = query.eq("facturado", true);
  if (filtros.facturado === "no") query = query.eq("facturado", false);
  if (filtros.desde) query = query.gte("fecha", filtros.desde);
  if (filtros.hasta) query = query.lte("fecha", filtros.hasta);
  if (idsPorProducto) query = query.in("id", idsPorProducto);

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
