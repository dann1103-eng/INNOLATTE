import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getRutas, agruparRutas } from "@/lib/data/rutas";
import { getUbicacionesClientes } from "@/lib/data/clientes";
import { Breadcrumb } from "@/components/app/page-header";
import { HorarioEditor } from "@/components/rutas/horario-editor";
import { EmptyState } from "@/components/app/empty-state";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HorarioRutasPage() {
  await requireAdmin();
  const [rutas, ubicaciones] = await Promise.all([
    getRutas(),
    getUbicacionesClientes(),
  ]);
  const grupos = agruparRutas(rutas);

  return (
    <div>
      <Breadcrumb
        items={[{ label: "Rutas", href: "/rutas" }, { label: "Editar horario" }]}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Horario de rutas</h1>
        <Link
          href="/rutas"
          className="text-sm font-medium text-brand-700 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-6">
        <Info className="size-4 shrink-0 mt-0.5" />
        Agrega o quita distritos de cada día. Los cambios se guardan al instante y se
        reflejan en los botones de ruta del reporte.
      </div>

      {grupos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Info}
            title="Tabla de rutas no disponible"
            description="Corre la migración 0002_rutas.sql en Supabase para activar la edición del horario."
          />
        </Card>
      ) : (
        <HorarioEditor grupos={grupos} distritos={ubicaciones.distritos} />
      )}
    </div>
  );
}
