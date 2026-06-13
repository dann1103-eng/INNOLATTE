import Link from "next/link";
import { Package, Pencil } from "lucide-react";
import { getProductos, getFacetasCatalogo } from "@/lib/data/productos";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { FilterSelect } from "@/components/app/filter-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; presentacion?: string }>;
}) {
  const sp = await searchParams;
  const { perfil } = await requireUser();
  const [productos, facetas] = await Promise.all([
    getProductos(sp),
    getFacetasCatalogo(),
  ]);

  return (
    <div>
      <PageHeader
        title="Catálogo"
        description={`${productos.length} producto(s) · los precios se editan por lista (P1–P8)`}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput placeholder="Buscar por código, descripción o sabor..." />
        <FilterSelect
          param="categoria"
          allLabel="Todas las categorías"
          options={facetas.categorias.map((c) => ({ value: c, label: c }))}
        />
        <FilterSelect
          param="presentacion"
          allLabel="Toda presentación"
          options={facetas.presentaciones.map((p) => ({ value: p, label: p }))}
        />
      </div>

      <Card className="overflow-hidden">
        {productos.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Sin productos"
            description="No hay productos que coincidan con el filtro. Importa el catálogo o ajusta la búsqueda."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted">{p.codigo}</TableCell>
                  <TableCell className="font-medium max-w-[320px]">
                    <Link href={`/catalogo/${p.id}`} className="hover:text-brand-700">
                      {p.descripcion}
                    </Link>
                    {p.sabor && <span className="ml-2 text-xs text-muted">{p.sabor}</span>}
                  </TableCell>
                  <TableCell>
                    {p.categoria ? <Badge tone="brand">{p.categoria}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-muted">{p.presentacion || "—"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/catalogo/${p.id}`}
                      className="inline-flex items-center text-muted hover:text-brand-700"
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {perfil.rol !== "admin" && (
        <p className="text-xs text-muted mt-3">
          Solo un administrador puede editar productos y precios.
        </p>
      )}
    </div>
  );
}
