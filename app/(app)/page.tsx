import Link from "next/link";
import {
  Users,
  Package,
  ClipboardList,
  Plus,
  ArrowRight,
  CircleDollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/pedidos/estado-badge";
import { EmptyState } from "@/components/app/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [clientesRes, productosRes, pedidosHoyRes, recientesRes, pendientesRes] =
    await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("productos").select("id", { count: "exact", head: true }),
      supabase.from("pedidos").select("total").eq("fecha", hoy).neq("estado", "CANCELADO"),
      supabase
        .from("pedidos")
        .select("id, folio, fecha, total, estado, cliente:clientes(nombre, nombre_comercial)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "PENDIENTE"),
    ]);

  const totalHoy = (pedidosHoyRes.data ?? []).reduce(
    (acc, p: { total: number }) => acc + Number(p.total || 0),
    0,
  );
  const pedidosHoyCount = pedidosHoyRes.data?.length ?? 0;
  const recientes = (recientesRes.data ?? []) as unknown as {
    id: string;
    folio: number;
    fecha: string;
    total: number;
    estado: EstadoPedido;
    cliente: { nombre: string; nombre_comercial: string | null } | null;
  }[];

  return (
    <div>
      <PageHeader title="Inicio" description="Resumen de la operación de hoy">
        <Link href="/pedidos/nuevo">
          <Button>
            <Plus className="size-4" />
            Nuevo pedido
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Ventas de hoy"
          value={formatCurrency(totalHoy)}
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard label="Pedidos de hoy" value={pedidosHoyCount} icon={ClipboardList} tone="blue" />
        <StatCard
          label="Pendientes"
          value={pendientesRes.count ?? 0}
          icon={ClipboardList}
          href="/pedidos?estado=PENDIENTE"
          tone="amber"
        />
        <StatCard
          label="Clientes"
          value={clientesRes.count ?? 0}
          icon={Users}
          href="/clientes"
        />
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
