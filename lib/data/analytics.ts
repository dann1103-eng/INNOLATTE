import { createClient } from "@/lib/supabase/server";
import { round2 } from "@/lib/utils";

/** Mapea el prefijo del código de producto a su categoría legible. */
const CATEGORIA_POR_PREFIJO: Record<string, string> = {
  CON: "Congelados",
  YOG: "Yogurt",
  MEZ: "Mezclas",
  TOP: "Topping",
};

export interface VentaCanal {
  canal: string;
  pedidos: number;
  total: number;
}
export interface VentaCategoria {
  categoria: string;
  total: number;
}
export interface VentaDepartamento {
  departamento: string;
  pedidos: number;
  total: number;
}

export interface Analitica {
  ventasPorCanal: VentaCanal[];
  ventasPorCategoria: VentaCategoria[];
  porDepartamento: VentaDepartamento[];
}

type FilaPedido = {
  total: number | null;
  canal: string | null;
  cliente: { departamento: string | null } | null;
  items: { subtotal: number | null; codigo: string | null }[] | null;
};

/**
 * Calcula las agregaciones del dashboard en memoria (pedidos no cancelados
 * dentro del rango). Suficiente para el volumen actual; si crece, mover a una
 * vista/RPC en Postgres.
 */
export async function getAnalitica(
  desde: string | null,
  hasta: string,
): Promise<Analitica> {
  const supabase = await createClient();
  let query = supabase
    .from("pedidos")
    .select(
      "total, canal, estado, cliente:clientes(departamento), items:pedido_items(subtotal, codigo)",
    )
    .neq("estado", "CANCELADO")
    .lte("fecha", hasta);
  if (desde) query = query.gte("fecha", desde);

  const { data } = await query;
  const filas = (data ?? []) as unknown as FilaPedido[];

  const canal = new Map<string, { pedidos: number; total: number }>();
  const categoria = new Map<string, number>();
  const depto = new Map<string, { pedidos: number; total: number }>();

  for (const p of filas) {
    const total = Number(p.total || 0);

    const c = p.canal || "Sin canal";
    const ac = canal.get(c) ?? { pedidos: 0, total: 0 };
    ac.pedidos += 1;
    ac.total += total;
    canal.set(c, ac);

    const d = p.cliente?.departamento || "Sin departamento";
    const ad = depto.get(d) ?? { pedidos: 0, total: 0 };
    ad.pedidos += 1;
    ad.total += total;
    depto.set(d, ad);

    for (const it of p.items ?? []) {
      const prefijo = (it.codigo ?? "").slice(0, 3).toUpperCase();
      const cat = CATEGORIA_POR_PREFIJO[prefijo] ?? "Otros";
      categoria.set(cat, (categoria.get(cat) ?? 0) + Number(it.subtotal || 0));
    }
  }

  const ventasPorCanal = [...canal.entries()]
    .map(([canal, v]) => ({ canal, pedidos: v.pedidos, total: round2(v.total) }))
    .sort((a, b) => b.total - a.total);

  const ventasPorCategoria = [...categoria.entries()]
    .map(([categoria, total]) => ({ categoria, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  const porDepartamento = [...depto.entries()]
    .map(([departamento, v]) => ({ departamento, pedidos: v.pedidos, total: round2(v.total) }))
    .sort((a, b) => b.total - a.total);

  return { ventasPorCanal, ventasPorCategoria, porDepartamento };
}

/** Venta acumulada (total $) del mes en curso, excluyendo cancelados. */
export async function getVentaMes(): Promise<number> {
  const supabase = await createClient();
  const hoy = new Date();
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const hasta = hoy.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("pedidos")
    .select("total")
    .neq("estado", "CANCELADO")
    .gte("fecha", primero)
    .lte("fecha", hasta);

  return round2((data ?? []).reduce((acc, p) => acc + Number(p.total || 0), 0));
}
