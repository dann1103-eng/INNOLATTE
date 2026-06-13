import Link from "next/link";
import { Users, Plus, MapPin } from "lucide-react";
import { getClientes, getCanales } from "@/lib/data/clientes";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { FilterSelect } from "@/components/app/filter-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; canal?: string }>;
}) {
  const sp = await searchParams;
  const { perfil } = await requireUser();
  const [clientes, canales] = await Promise.all([getClientes(sp), getCanales()]);
  const esAdmin = perfil.rol === "admin";

  return (
    <div>
      <PageHeader title="Clientes" description={`${clientes.length} cliente(s)`}>
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
      </div>

      <Card className="overflow-hidden">
        {clientes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes"
            description="No hay clientes que coincidan. Importa la base de datos o crea uno nuevo."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Lista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-muted">
                    {c.codigo_cliente}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
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
                        {[c.municipio, c.departamento].filter(Boolean).join(", ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge tone="gray">P{c.lista_precios}</Badge>
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
