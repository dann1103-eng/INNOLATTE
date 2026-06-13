import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Cliente } from "@/lib/types";

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export function ClienteSoloLectura({ cliente }: { cliente: Cliente }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Lock className="size-4" />
        Vista de solo lectura. Un administrador puede editar este cliente.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato label="Código" value={<span className="font-mono">{cliente.codigo_cliente}</span>} />
            <Dato label="Razón social" value={cliente.nombre} />
            <Dato label="Nombre comercial" value={cliente.nombre_comercial} />
            <Dato label="Teléfono" value={cliente.telefono} />
            <Dato label="Correo" value={cliente.correo} />
            <Dato label="Contacto" value={cliente.contacto_nombre} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direcciones</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato label="Dirección fiscal (NIT)" value={cliente.direccion_fiscal} />
            <Dato label="Dirección de entrega" value={cliente.direccion_entrega} />
            <Dato label="Departamento" value={cliente.departamento} />
            <Dato label="Municipio" value={cliente.municipio} />
            <Dato label="Distrito" value={cliente.distrito} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comercial</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato label="Canal" value={cliente.canal ? <Badge>{cliente.canal}</Badge> : "—"} />
            <Dato
              label="Lista de precios"
              value={<Badge tone="brand">P{cliente.lista_precios}</Badge>}
            />
            <Dato
              label="Forma de pago"
              value={cliente.forma_pago === "CONTADO" ? "Contado" : "Crédito"}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
