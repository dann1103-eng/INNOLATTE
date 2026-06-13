import Link from "next/link";
import {
  ClipboardList,
  Plus,
  ArrowRight,
  CircleDollarSign,
  CalendarRange,
  Radio,
  Tags,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAnalitica, getVentaMes } from "@/lib/data/analytics";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/pedidos/estado-badge";
import { EmptyState } from "@/components/app/empty-state";
import { PeriodFilter } from "@/components/app/period-filter";
import { BarList } from "@/components/app/bar-list";
import { formatCurrency, formatDate, rangoPeriodo } from "@/lib/utils";
import type { EstadoPedido } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  tone?: "brand" | "blue" | "amber" | "green";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
  };
  const inner = (
    <Card className="p-5 hover:shadow-md transition-shadow h-full">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-sm text-muted">{label}</div>
        </div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const supabase = await createClient();
  const rango = rangoPeriodo(periodo);

  // Consulta de ventas/conteo del período seleccionado.
  let ventasQuery = supabase
    .from("pedidos")
    .select("total")
    .neq("estado", "CANCELADO")
    .lte("fecha", rango.hasta);
  if (rango.desde) ventasQuery = ventasQuery.gte("fecha", rango.desde);

  const [ventasRes, recientesRes, pendientesRes, analitica, ventaMes] =
    await Promise.all([
      ventasQuery,
      supabase
        .from("pedidos")
        .select(
          "id, folio, fecha, total, estado, cliente:clientes(nombre, nombre_comercial, distrito)",
        )
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "PENDIENTE"),
      getAnalitica(rango.desde, rango.hasta),
      getVentaMes(),
    ]);

  const totalPeriodo = (ventasRes.data ?? []).reduce(
    (acc, p: { total: number }) => acc + Number(p.total || 0),
    0,
  );
  const pedidosPeriodoCount = ventasRes.data?.length ?? 0;

  const topDeptos = analitica.porDepartamento.slice(0, 5);
  const bottomDeptos = [...analitica.porDepartamento].reverse().slice(0, 5);
  const recientes = (recientesRes.data ?? []) as unknown as {
    id: string;
    folio: number;
    fecha: string;
    total: number;
    estado: EstadoPedido;
    cliente: {
      nombre: string;
      nombre_comercial: string | null;
      distrito: string | null;
    } | null;
  }[];

  return (
    <div>
      <PageHeader title="Inicio" description="Resumen de la operación">
        <PeriodFilter />
        <Link href="/pedidos/nuevo">
          <Button>
            <Plus className="size-4" />
            Nuevo pedido
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={`Ventas (${rango.label})`}
          value={formatCurrency(totalPeriodo)}
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label={`Pedidos (${rango.label})`}
          value={pedidosPeriodoCount}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Venta del mes"
          value={formatCurrency(ventaMes)}
          icon={CalendarRange}
          tone="brand"
        />
        <StatCard
          label="Pendientes"
          value={pendientesRes.count ?? 0}
          icon={ClipboardList}
          href="/pedidos?estado=PENDIENTE"
          tone="amber"
        />
      </div>

      {/* Analítica del período seleccionado */}
      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        <Card>
          <div className="flex items-center gap-2 p-5 border-b border-line">
            <Radio className="size-4 text-brand-600" />
            <h2 className="font-semibold">Ventas por canal ({rango.label})</h2>
          </div>
          <div className="p-5">
            {analitica.ventasPorCanal.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">Sin datos en este período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analitica.ventasPorCanal.map((c) => (
                    <TableRow key={c.canal}>
                      <TableCell>
                        <Badge tone="blue">{c.canal}</Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{c.pedidos}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(c.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 p-5 border-b border-line">
            <Tags className="size-4 text-brand-600" />
            <h2 className="font-semibold">Ventas por categoría ({rango.label})</h2>
          </div>
          <div className="p-5">
            <BarList
              tone="green"
              items={analitica.ventasPorCategoria.map((c) => ({
                label: c.categoria,
                value: c.total,
                valueLabel: formatCurrency(c.total),
              }))}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 p-5 border-b border-line">
            <TrendingUp className="size-4 text-green-600" />
            <h2 className="font-semibold">Top 5 departamentos</h2>
          </div>
          <div className="p-5">
            <BarList
              tone="brand"
              items={topDeptos.map((d) => ({
                label: d.departamento,
                value: d.total,
                valueLabel: formatCurrency(d.total),
                sub: `${d.pedidos} ped.`,
              }))}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 p-5 border-b border-line">
            <TrendingDown className="size-4 text-amber-600" />
            <h2 className="font-semibold">5 departamentos con menos ventas</h2>
          </div>
          <div className="p-5">
            <BarList
              tone="amber"
              items={bottomDeptos.map((d) => ({
                label: d.departamento,
                value: d.total,
                valueLabel: formatCurrency(d.total),
                sub: `${d.pedidos} ped.`,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="font-semibold">Pedidos recientes</h2>
          <Link
            href="/pedidos"
            className="text-sm font-medium text-brand-700 hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>

        {recientes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aún no hay pedidos"
            description="Crea tu primer pedido para verlo aquí."
          >
            <Link href="/pedidos/nuevo">
              <Button>
                <Plus className="size-4" />
                Nuevo pedido
              </Button>
            </Link>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recientes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/pedidos/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      #{p.folio}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {p.cliente?.nombre_comercial || p.cliente?.nombre || "—"}
                  </TableCell>
                  <TableCell className="text-muted">{p.cliente?.distrito || "—"}</TableCell>
                  <TableCell className="text-muted">{formatDate(p.fecha)}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(p.total))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
