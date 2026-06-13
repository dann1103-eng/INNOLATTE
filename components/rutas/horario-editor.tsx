"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";
import {
  agregarDistritoRuta,
  quitarDistritoRuta,
} from "@/app/(app)/rutas/actions";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { Ruta } from "@/lib/data/rutas";

export function HorarioEditor({
  grupos,
  distritos,
}: {
  grupos: { grupo: string; dias: Ruta[] }[];
  distritos: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Guardando…
        </p>
      )}

      {grupos.map((g) => (
        <Card key={g.grupo} className="overflow-hidden">
          <div className="bg-brand-600 text-white px-5 py-3 font-semibold">
            Ruta de entrega — {g.grupo}
          </div>
          <div className="overflow-x-auto">
            <div className="flex divide-x divide-line min-w-max">
              {g.dias.map((ruta) => {
                const disponibles = distritos.filter(
                  (d) => !ruta.distritos.includes(d),
                );
                return (
                  <div key={ruta.id} className="w-52 shrink-0 p-3">
                    <div className="text-center mb-3">
                      <div className="text-sm font-bold uppercase">{ruta.dia}</div>
                      {ruta.cd && (
                        <div className="text-xs text-muted">{ruta.cd}</div>
                      )}
                    </div>

                    <div className="space-y-1.5 mb-3 min-h-[40px]">
                      {ruta.distritos.length === 0 ? (
                        <p className="text-xs text-muted text-center py-2">
                          Sin distritos
                        </p>
                      ) : (
                        ruta.distritos.map((d) => (
                          <div
                            key={d}
                            className="flex items-center justify-between gap-1 rounded-md bg-slate-50 border border-line px-2 py-1 text-xs"
                          >
                            <span className="truncate">{d}</span>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                ejecutar(() => quitarDistritoRuta(ruta.id, d))
                              }
                              className="text-muted hover:text-red-600 shrink-0"
                              aria-label={`Quitar ${d}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="relative">
                      <Plus className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted z-10" />
                      <Select
                        aria-label={`Agregar distrito a ${ruta.dia}`}
                        value=""
                        disabled={pending || disponibles.length === 0}
                        onChange={(e) => {
                          if (e.target.value)
                            ejecutar(() =>
                              agregarDistritoRuta(ruta.id, e.target.value),
                            );
                        }}
                        className="h-8 pl-7 text-xs"
                      >
                        <option value="">Agregar…</option>
                        {disponibles.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
