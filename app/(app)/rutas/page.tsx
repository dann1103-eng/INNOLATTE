import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDistritosConConteo, getClientesPorDistritos } from "@/lib/data/clientes";
import { getRutas, agruparRutas } from "@/lib/data/rutas";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { RutasReport } from "@/components/rutas/rutas-report";

export const dynamic = "force-dynamic";

export default async function RutasPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { perfil } = await requireUser();
  const sp = await searchParams;
  const seleccionados = (sp.d ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [distritos, clientes, rutas] = await Promise.all([
    getDistritosConConteo(),
    getClientesPorDistritos(seleccionados),
    getRutas(),
  ]);

  return (
    <div>
      <PageHeader
        title="Rutas de entrega"
        description="Selecciona los distritos de la ruta para obtener los clientes a visitar."
      >
        {perfil.rol === "admin" && (
          <Link href="/rutas/horario">
            <Button variant="secondary">
              <Pencil className="size-4" />
              Editar horario
            </Button>
          </Link>
        )}
      </PageHeader>
      <RutasReport
        distritos={distritos}
        seleccionados={seleccionados}
        clientes={clientes}
        grupos={agruparRutas(rutas)}
      />
    </div>
  );
}
