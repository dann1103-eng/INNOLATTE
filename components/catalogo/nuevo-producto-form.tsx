"use client";

import { useActionState, useState } from "react";
import { Loader2, Wand2, RotateCcw } from "lucide-react";
import { crearProducto, type ActionResult } from "@/app/(app)/catalogo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LISTAS_PRECIOS, ETIQUETAS_LISTA } from "@/lib/types";
import type { ComponenteCatalogo } from "@/lib/data/productos";

interface Catalogos {
  categorias: ComponenteCatalogo[];
  familias: ComponenteCatalogo[];
  sabores: ComponenteCatalogo[];
  presentaciones: ComponenteCatalogo[];
}

const NUEVO = "__new__";

function ComponentPicker({
  label,
  opciones,
  sel,
  setSel,
  nuevoNom,
  setNuevoNom,
  nuevoCod,
  setNuevoCod,
  codeLen,
}: {
  label: string;
  opciones: ComponenteCatalogo[];
  sel: string;
  setSel: (v: string) => void;
  nuevoNom: string;
  setNuevoNom: (v: string) => void;
  nuevoCod: string;
  setNuevoCod: (v: string) => void;
  codeLen: number;
}) {
  const esNuevo = sel === NUEVO;
  return (
    <div>
      <Label>{label}</Label>
      <Select value={sel} onChange={(e) => setSel(e.target.value)}>
        <option value="">— Elegir —</option>
        {opciones.map((o) => (
          <option key={o.nombre} value={o.nombre}>
            {o.nombre} ({o.codigo})
          </option>
        ))}
        <option value={NUEVO}>➕ Nuevo…</option>
      </Select>
      {esNuevo && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input
            className="col-span-2"
            placeholder="Nombre"
            value={nuevoNom}
            onChange={(e) => setNuevoNom(e.target.value.toUpperCase())}
          />
          <Input
            placeholder={`Cód. (${codeLen})`}
            maxLength={codeLen}
            value={nuevoCod}
            onChange={(e) => setNuevoCod(e.target.value.toUpperCase().replace(/\s/g, ""))}
            className="font-mono"
          />
        </div>
      )}
    </div>
  );
}

function resolver(
  sel: string,
  opciones: ComponenteCatalogo[],
  nuevoNom: string,
  nuevoCod: string,
): ComponenteCatalogo {
  if (sel === NUEVO) return { nombre: nuevoNom.trim(), codigo: nuevoCod.trim() };
  const o = opciones.find((x) => x.nombre === sel);
  return o ?? { nombre: "", codigo: "" };
}

export function NuevoProductoForm({ catalogos }: { catalogos: Catalogos }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    crearProducto,
    { ok: false },
  );

  // Estado de los 4 componentes.
  const [catSel, setCatSel] = useState("");
  const [catNom, setCatNom] = useState("");
  const [catCod, setCatCod] = useState("");
  const [famSel, setFamSel] = useState("");
  const [famNom, setFamNom] = useState("");
  const [famCod, setFamCod] = useState("");
  const [sabSel, setSabSel] = useState("");
  const [sabNom, setSabNom] = useState("");
  const [sabCod, setSabCod] = useState("");
  const [presSel, setPresSel] = useState("");
  const [presNom, setPresNom] = useState("");
  const [presCod, setPresCod] = useState("");

  const cat = resolver(catSel, catalogos.categorias, catNom, catCod);
  const fam = resolver(famSel, catalogos.familias, famNom, famCod);
  const sab = resolver(sabSel, catalogos.sabores, sabNom, sabCod);
  const pres = resolver(presSel, catalogos.presentaciones, presNom, presCod);

  const codigoAuto = (cat.codigo + fam.codigo + sab.codigo + pres.codigo).toUpperCase();
  const descAuto = [cat.codigo, fam.nombre, sab.nombre, pres.nombre]
    .filter(Boolean)
    .join(" ");

  const [codigoOverride, setCodigoOverride] = useState<string | null>(null);
  const [descOverride, setDescOverride] = useState<string | null>(null);
  const codigo = codigoOverride ?? codigoAuto;
  const descripcion = descOverride ?? descAuto;

  const completo = cat.codigo && fam.codigo && sab.codigo && pres.codigo;

  return (
    <form action={formAction} className="space-y-6">
      {/* Campos enviados al servidor */}
      <input type="hidden" name="codigo" value={codigo} />
      <input type="hidden" name="categoria" value={cat.nombre} />
      <input type="hidden" name="familia" value={fam.nombre} />
      <input type="hidden" name="sabor" value={sab.nombre} />
      <input type="hidden" name="presentacion" value={pres.nombre} />

      <Card>
        <CardHeader>
          <CardTitle>Componentes del producto</CardTitle>
          <p className="text-sm text-muted mt-1">
            El código se arma con la categoría, familia, sabor y presentación. Si alguno no
            existe, elige “➕ Nuevo…” y escribe su nombre y código corto.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ComponentPicker
            label="Categoría"
            opciones={catalogos.categorias}
            sel={catSel}
            setSel={setCatSel}
            nuevoNom={catNom}
            setNuevoNom={setCatNom}
            nuevoCod={catCod}
            setNuevoCod={setCatCod}
            codeLen={3}
          />
          <ComponentPicker
            label="Familia"
            opciones={catalogos.familias}
            sel={famSel}
            setSel={setFamSel}
            nuevoNom={famNom}
            setNuevoNom={setFamNom}
            nuevoCod={famCod}
            setNuevoCod={setFamCod}
            codeLen={3}
          />
          <ComponentPicker
            label="Sabor"
            opciones={catalogos.sabores}
            sel={sabSel}
            setSel={setSabSel}
            nuevoNom={sabNom}
            setNuevoNom={setSabNom}
            nuevoCod={sabCod}
            setNuevoCod={setSabCod}
            codeLen={3}
          />
          <ComponentPicker
            label="Presentación"
            opciones={catalogos.presentaciones}
            sel={presSel}
            setSel={setPresSel}
            nuevoNom={presNom}
            setNuevoNom={setPresNom}
            nuevoCod={presCod}
            setNuevoCod={setPresCod}
            codeLen={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-brand-600" />
            Código y descripción
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="codigo-vista">Código (autogenerado, editable)</Label>
            <div className="flex gap-2">
              <Input
                id="codigo-vista"
                value={codigo}
                onChange={(e) =>
                  setCodigoOverride(e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                className="font-mono"
                placeholder="Se arma solo…"
              />
              {codigoOverride !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCodigoOverride(null)}
                  title="Volver al automático"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="desc-vista">Descripción</Label>
            <div className="flex gap-2">
              <Input
                id="desc-vista"
                name="descripcion"
                value={descripcion}
                onChange={(e) => setDescOverride(e.target.value)}
                placeholder="Se arma sola…"
              />
              {descOverride !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDescOverride(null)}
                  title="Volver a la automática"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input id="peso_kg" name="peso_kg" type="number" step="0.001" />
          </div>
          <div>
            <Label htmlFor="costo">Costo (USD)</Label>
            <Input id="costo" name="costo" type="number" step="0.0001" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              defaultChecked
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
          <CardTitle>Precios por lista</CardTitle>
          <p className="text-sm text-muted mt-1">
            Captura los precios que apliquen. Deja en blanco los que no.
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !completo}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Crear producto
        </Button>
        {!completo && (
          <span className="text-sm text-muted">
            Completa categoría, familia, sabor y presentación.
          </span>
        )}
      </div>
    </form>
  );
}
