"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CANALES,
  FORMAS_PAGO,
  LISTAS_PRECIOS,
  type Cliente,
} from "@/lib/types";
import type { ActionResult } from "@/app/(app)/clientes/actions";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const ETIQUETAS_LISTA: Record<number, string> = { 2: "Estándar", 4: "Distribuidor" };

export function ClienteForm({
  action,
  cliente,
  modo,
}: {
  action: Action;
  cliente?: Cliente;
  modo: "crear" | "editar";
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {
    ok: false,
  });
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (state.ok && modo === "editar") {
      setGuardado(true);
      router.refresh();
      const t = setTimeout(() => setGuardado(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state, modo, router]);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="codigo_cliente">Código de cliente *</Label>
            <Input
              id="codigo_cliente"
              name="codigo_cliente"
              defaultValue={cliente?.codigo_cliente ?? ""}
              placeholder="CDDI0001"
              className="font-mono"
              required
            />
          </div>
          <div>
            <Label htmlFor="nombre">Razón social / Nombre *</Label>
            <Input id="nombre" name="nombre" defaultValue={cliente?.nombre ?? ""} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="nombre_comercial">Nombre comercial</Label>
            <Input
              id="nombre_comercial"
              name="nombre_comercial"
              defaultValue={cliente?.nombre_comercial ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={cliente?.telefono ?? ""} />
          </div>
          <div>
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              name="correo"
              type="email"
              defaultValue={cliente?.correo ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto y direcciones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contacto_nombre">Nombre de contacto</Label>
            <Input
              id="contacto_nombre"
              name="contacto_nombre"
              defaultValue={cliente?.contacto_nombre ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="contacto_telefono">Teléfono de contacto</Label>
            <Input
              id="contacto_telefono"
              name="contacto_telefono"
              defaultValue={cliente?.contacto_telefono ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="direccion_fiscal">Dirección fiscal (NIT)</Label>
            <Input
              id="direccion_fiscal"
              name="direccion_fiscal"
              defaultValue={cliente?.direccion_fiscal ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="direccion_entrega">Dirección de entrega</Label>
            <Input
              id="direccion_entrega"
              name="direccion_entrega"
              defaultValue={cliente?.direccion_entrega ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="departamento">Departamento</Label>
            <Input
              id="departamento"
              name="departamento"
              defaultValue={cliente?.departamento ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="municipio">Municipio</Label>
            <Input id="municipio" name="municipio" defaultValue={cliente?.municipio ?? ""} />
          </div>
          <div>
            <Label htmlFor="distrito">Distrito</Label>
            <Input id="distrito" name="distrito" defaultValue={cliente?.distrito ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comercial</CardTitle>
          <p className="text-sm text-muted mt-1">
            La <strong>lista de precios</strong> define qué columna (P) se le cobra a este
            cliente en cada pedido.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="canal">Canal</Label>
            <Select id="canal" name="canal" defaultValue={cliente?.canal ?? ""}>
              <option value="">— Sin canal —</option>
              {CANALES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lista_precios">Lista de precios</Label>
            <Select
              id="lista_precios"
              name="lista_precios"
              defaultValue={String(cliente?.lista_precios ?? 2)}
            >
              {LISTAS_PRECIOS.map((l) => (
                <option key={l} value={l}>
                  P{l}
                  {ETIQUETAS_LISTA[l] ? ` · ${ETIQUETAS_LISTA[l]}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="forma_pago">Forma de pago</Label>
            <Select
              id="forma_pago"
              name="forma_pago"
              defaultValue={cliente?.forma_pago ?? "CONTADO"}
            >
              {FORMAS_PAGO.map((f) => (
                <option key={f} value={f}>
                  {f === "CONTADO" ? "Contado" : "Crédito"}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3 flex items-center gap-2 pt-1">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              defaultChecked={cliente?.activo ?? true}
              className="size-4 rounded border-line accent-brand-600"
            />
            <Label htmlFor="activo" className="mb-0">
              Cliente activo
            </Label>
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {modo === "crear" ? "Crear cliente" : "Guardar cambios"}
        </Button>
        {guardado && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="size-4" /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}
