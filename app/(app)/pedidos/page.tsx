import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getPedidos } from "@/lib/data/pedidos";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { FilterSelect } from "@/components/app/filter-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { EstadoBadge } from "@/components/pedidos/estado-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ESTADOS_PEDIDO } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; facturado?: string }>;
}) {
  const sp = await searchParams;
  await requireUser();
  const pedidos = await getPedidos(sp);

  return (
    <div>
      <PageHeader title="Pedidos" description={`${pedidos.length} pedido(s)`}>
        <Link href="/pedidos/nuevo">
          <Button>
            <Plus className="size-4" />
            Nuevo pedido
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput placeholder="Buscar por folio o cliente..." />
        <FilterSelect
          param="estado"
          allLabel="Todos los estados"
          options={ESTADOS_PEDIDO.map((e) => ({ value: e.value, label: e.label }))}
        />
        <FilterSelect
          param="facturado"
          allLabel="Facturado: todos"
          options={[
            { value: "si", label: "Facturados" },
            { value: "no", label: "No facturados" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin pedidos"
            description="No hay pedidos que coincidan con el filtro."
          >
            <Link href="/pedidos/nuevo">
              <Button>
                <Plus className="size-4" />
                Crear pedido
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
                <TableHead className="text-center">Facturado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/pedidos/${p.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      #{p.folio}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {p.cliente?.nombre_comercial || p.cliente?.nombre || "—"}
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(p.fecha)}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-center">
                    {p.facturado ? (
                      <Badge tone="green">Sí</Badge>
                    ) : (
                      <Badge tone="gray">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
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
