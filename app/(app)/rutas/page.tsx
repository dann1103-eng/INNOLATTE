import { requireUser } from "@/lib/auth";
import { getDistritosConConteo, getClientesPorDistritos } from "@/lib/data/clientes";
import { PageHeader } from "@/components/app/page-header";
import { RutasReport } from "@/components/rutas/rutas-report";

export const dynamic = "force-dynamic";

export default async function RutasPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const seleccionados = (sp.d ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [distritos, clientes] = await Promise.all([
    getDistritosConConteo(),
    getClientesPorDistritos(seleccionados),
  ]);

  return (
    <div>
      <PageHeader
        title="Rutas de entrega"
        description="Selecciona los distritos de la ruta para obtener los clientes a visitar."
      />
      <RutasReport
        distritos={distritos}
        seleccionados={seleccionados}
        clientes={clientes}
      />
    </div>
  );
}
