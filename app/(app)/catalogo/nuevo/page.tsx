import { requireAdmin } from "@/lib/auth";
import { getCatalogosComponentes } from "@/lib/data/productos";
import { Breadcrumb } from "@/components/app/page-header";
import { NuevoProductoForm } from "@/components/catalogo/nuevo-producto-form";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  await requireAdmin();
  const catalogos = await getCatalogosComponentes();

  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[{ label: "Catálogo", href: "/catalogo" }, { label: "Nuevo producto" }]}
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">Nuevo producto</h1>
      <NuevoProductoForm catalogos={catalogos} />
    </div>
  );
}
