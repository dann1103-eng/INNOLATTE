"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Lock } from "lucide-react";
import { actualizarProducto, type ActionResult } from "@/app/(app)/catalogo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIAS, LISTAS_PRECIOS, type ProductoConPrecios } from "@/lib/types";

const ETIQUETAS_LISTA: Record<number, string> = {
  2: "Estándar",
  4: "Distribuidor",
};

export function ProductoForm({
  producto,
  esAdmin,
}: {
  producto: ProductoConPrecios;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const action = actualizarProducto.bind(null, producto.id);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {
    ok: false,
  });
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setGuardado(true);
      router.refresh();
      const t = setTimeout(() => setGuardado(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const disabled = !esAdmin || pending;

  return (
    <form action={formAction} className="space-y-6">
      {!esAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="size-4" />
          Solo lectura. Un administrador puede editar este producto.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos del producto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Código (no editable)</Label>
            <Input value={producto.codigo} disabled className="font-mono" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              name="descripcion"
              defaultValue={producto.descripcion}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              id="categoria"
              name="categoria"
              defaultValue={producto.categoria ?? ""}
              disabled={disabled}
            >
              <option value="">— Sin categoría —</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="presentacion">Presentación</Label>
            <Input
              id="presentacion"
              name="presentacion"
              defaultValue={producto.presentacion ?? ""}
              disabled={disabled}
              placeholder="105G, 1GAL, 8OZ..."
            />
          </div>
          <div>
            <Label htmlFor="sabor">Sabor</Label>
            <Input
              id="sabor"
              name="sabor"
              defaultValue={producto.sabor ?? ""}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="familia">Familia</Label>
            <Input
              id="familia"
              name="familia"
              defaultValue={producto.familia ?? ""}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input
              id="peso_kg"
              name="peso_kg"
              type="number"
              step="0.001"
              defaultValue={producto.peso_kg ?? ""}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="costo">Costo (USD)</Label>
            <Input
              id="costo"
              name="costo"
              type="number"
              step="0.0001"
              defaultValue={producto.costo ?? ""}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 pt-1">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              defaultChecked={producto.activo}
              disabled={disabled}
              className="size-4 rounded border-line accent-brand-600"
            />
            <Label htmlFor="activo" className="mb-0">
              Producto activo (disponible para pedidos)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listas de precios</CardTitle>
          <p className="text-sm text-muted mt-1">
            Cada cliente paga la columna que le corresponde según su lista. Deja en blanco
            para “sin precio en esa lista”.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {LISTAS_PRECIOS.map((lista) => (
            <div key={lista}>
              <Label htmlFor={`precio_${lista}`} className="flex items-baseline gap-1.5">
                <span className="font-semibold">P{lista}</span>
                {ETIQUETAS_LISTA[lista] && (
                  <span className="text-xs font-normal text-muted">
                    {ETIQUETAS_LISTA[lista]}
                  </span>
                )}
              </Label>
              <Input
                id={`precio_${lista}`}
                name={`precio_${lista}`}
                type="number"
                step="0.000001"
                min="0"
                inputMode="decimal"
                defaultValue={producto.precios[lista] ?? ""}
                disabled={disabled}
                placeholder="—"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {esAdmin && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
          {guardado && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="size-4" /> Guardado
            </span>
          )}
        </div>
      )}
    </form>
  );
}
