import Link from "next/link";
import { Users, Plus, MapPin } from "lucide-react";
import {
  getClientes,
  getCanales,
  getUltimoPedidoPorCliente,
  getUbicacionesClientes,
} from "@/lib/data/clientes";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { FilterSelect } from "@/components/app/filter-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

// Un cliente se considera ACTIVO si tiene un pedido en los últimos N días.
const DIAS_ACTIVO = 60;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    canal?: string;
    actividad?: string;
    departamento?: string;
    distrito?: string;
  }>;
}) {
  const sp = await searchParams;
  const { perfil } = await requireUser();
  const [clientes, canales, ultimoMap, ubicaciones] = await Promise.all([
    getClientes(sp),
    getCanales(),
    getUltimoPedidoPorCliente(),
    getUbicacionesClientes(),
  ]);
  const esAdmin = perfil.rol === "admin";

  // Límite de actividad (fecha ISO yyyy-mm-dd, comparable como string).
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_ACTIVO);
  const limiteStr = limite.toISOString().slice(0, 10);
  const esActivo = (ultimo: string | null) => !!ultimo && ultimo >= limiteStr;

  const anotados = clientes.map((c) => ({ ...c, ultimo: ultimoMap.get(c.id) ?? null }));
  const lista =
    sp.actividad === "activos"
      ? anotados.filter((c) => esActivo(c.ultimo))
      : sp.actividad === "inactivos"
        ? anotados.filter((c) => !esActivo(c.ultimo))
        : anotados;

  return (
    <div>
      <PageHeader title="Clientes" description={`${lista.length} cliente(s)`}>
        {esAdmin && (
          <Link href="/clientes/nuevo">
            <Button>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </Link>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput placeholder="Buscar por nombre, comercial o código..." />
        <FilterSelect
          param="canal"
          allLabel="Todos los canales"
          options={canales.map((c) => ({ value: c, label: c }))}
        />
        <FilterSelect
          param="departamento"
          allLabel="Todo departamento"
          options={ubicaciones.departamentos.map((d) => ({ value: d, label: d }))}
        />
        <FilterSelect
          param="distrito"
          allLabel="Todo distrito"
          options={ubicaciones.distritos.map((d) => ({ value: d, label: d }))}
        />
        <FilterSelect
          param="actividad"
          allLabel="Actividad: todos"
          options={[
            { value: "activos", label: `Activos (≤ ${DIAS_ACTIVO} días)` },
            { value: "inactivos", label: "Inactivos / sin pedidos" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {lista.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes"
            description="No hay clientes que coincidan con el filtro."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead className="text-center">Lista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const activo = esActivo(c.ultimo);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted">
                      {c.codigo_cliente}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium hover:text-brand-700 block truncate"
                      >
                        {c.nombre_comercial || c.nombre}
                      </Link>
                      {c.nombre_comercial && (
                        <span className="text-xs text-muted truncate block">{c.nombre}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.canal ? <Badge>{c.canal}</Badge> : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-muted text-sm">
                      {c.municipio || c.departamento ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 shrink-0" />
                          {[c.distrito, c.municipio].filter(Boolean).join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {c.ultimo ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge tone={activo ? "green" : "gray"}>
                            {activo ? "Activo" : "Inactivo"}
                          </Badge>
                          <span className="text-xs text-muted">
                            Últ: {formatDate(c.ultimo)}
                          </span>
                        </div>
                      ) : (
                        <Badge tone="red">Sin pedidos</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge tone="gray">P{c.lista_precios}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
