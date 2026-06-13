import { requireAdmin } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { crearCliente } from "@/app/(app)/clientes/actions";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  await requireAdmin();

  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[{ label: "Clientes", href: "/clientes" }, { label: "Nuevo cliente" }]}
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">Nuevo cliente</h1>
      <ClienteForm action={crearCliente} modo="crear" />
    </div>
  );
}
