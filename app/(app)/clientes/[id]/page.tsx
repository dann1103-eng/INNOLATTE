import { notFound } from "next/navigation";
import { getCliente } from "@/lib/data/clientes";
import { requireUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { ClienteSoloLectura } from "@/components/clientes/cliente-solo-lectura";
import { actualizarCliente } from "@/app/(app)/clientes/actions";

export const dynamic = "force-dynamic";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cliente, { perfil }] = await Promise.all([getCliente(id), requireUser()]);
  if (!cliente) notFound();

  const titulo = cliente.nombre_comercial || cliente.nombre;

  return (
    <div className="max-w-3xl">
      <Breadcrumb items={[{ label: "Clientes", href: "/clientes" }, { label: titulo }]} />
      <h1 className="text-2xl font-bold tracking-tight mb-6">{titulo}</h1>

      {perfil.rol === "admin" ? (
        <ClienteForm
          action={actualizarCliente.bind(null, id)}
          cliente={cliente}
          modo="editar"
        />
      ) : (
        <ClienteSoloLectura cliente={cliente} />
      )}
    </div>
  );
}
