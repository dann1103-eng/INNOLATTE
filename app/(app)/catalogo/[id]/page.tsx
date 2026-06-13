import { notFound } from "next/navigation";
import { getProductoConPrecios } from "@/lib/data/productos";
import { requireUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import { ProductoForm } from "@/components/catalogo/producto-form";

export const dynamic = "force-dynamic";

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [producto, { perfil }] = await Promise.all([
    getProductoConPrecios(id),
    requireUser(),
  ]);

  if (!producto) notFound();

  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Catálogo", href: "/catalogo" },
          { label: producto.descripcion },
        ]}
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">{producto.descripcion}</h1>
      <ProductoForm producto={producto} esAdmin={perfil.rol === "admin"} />
    </div>
  );
}
