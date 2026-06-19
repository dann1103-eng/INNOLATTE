import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getPedidos } from "@/lib/data/pedidos";
import { getProductos } from "@/lib/data/productos";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { FilterSelect } from "@/components/app/filter-select";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { ExportPdfButton } from "@/components/pedidos/export-pdf-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { PedidoEstadoInline } from "@/components/pedidos/pedido-estado-inline";
import { PedidoFacturadoInline } from "@/components/pedidos/pedido-facturado-inline";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ESTADOS_PEDIDO, CD_SEDES } from "@/lib/types";
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
  searchParams: Promise<{
    q?: string;
    estado?: string;
    facturado?: string;
    cd?: string;
    desde?: string;
    hasta?: string;
    producto?: string;
  }>;
}) {
  const sp = await searchParams;
  await requireUser();
  const [pedidos, productos] = await Promise.all([getPedidos(sp), getProductos()]);

  // Subtítulo del reporte PDF con los filtros activos.
  const partesSub: string[] = [];
  if (sp.desde || sp.hasta)
    partesSub.push(`Fechas: ${sp.desde || "inicio"} a ${sp.hasta || "hoy"}`);
  if (sp.estado) partesSub.push(`Estado: ${sp.estado}`);
  if (sp.facturado) partesSub.push(`Facturado: ${sp.facturado === "si" ? "Sí" : "No"}`);
  if (sp.cd)
    partesSub.push(`CD: ${CD_SEDES.find((s) => s.value === sp.cd)?.label ?? sp.cd}`);
  if (sp.producto) partesSub.push(`Producto: ${sp.producto}`);
  const subtitulo = partesSub.join("  ·  ");

  return (
    <div>
      <PageHeader title="Pedidos" description={`${pedidos.length} pedido(s)`}>
        <ExportPdfButton pedidos={pedidos} subtitulo={subtitulo} />
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
        <FilterSelect
          param="cd"
          allLabel="CD: todos"
          options={CD_SEDES.map((s) => ({ value: s.value, label: s.label }))}
        />
        <FilterSelect
          param="producto"
          allLabel="Todos los productos"
          options={productos.map((p) => ({
            value: p.codigo,
            label: `${p.descripcion} (${p.codigo})`,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-muted">Rango de fechas:</span>
        <DateRangeFilter />
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
                <TableHead>Distrito</TableHead>
                <TableHead>CD</TableHead>
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
                  <TableCell className="text-muted">{p.cliente?.distrito || "—"}</TableCell>
                  <TableCell className="text-muted">
                    {CD_SEDES.find((s) => s.value === p.cd)?.label ?? p.cd}
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(p.fecha)}</TableCell>
                  <TableCell>
                    <PedidoEstadoInline id={p.id} estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PedidoFacturadoInline id={p.id} facturado={p.facturado} />
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
