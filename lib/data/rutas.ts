import { createClient } from "@/lib/supabase/server";

export interface Ruta {
  id: string;
  grupo: string;
  dia: string;
  cd: string | null;
  distritos: string[];
  orden: number;
}

/**
 * Lee el horario de rutas. Si la tabla aún no existe (migración 0002 sin
 * correr), devuelve [] para no romper la página.
 */
export async function getRutas(): Promise<Ruta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rutas")
    .select("id, grupo, dia, cd, distritos, orden")
    .order("grupo")
    .order("orden");
  if (error) return [];
  return (data ?? []) as Ruta[];
}

/** Agrupa las rutas por "grupo" (Semana 1 y 3 / Semana 2 y 4). */
export function agruparRutas(rutas: Ruta[]): { grupo: string; dias: Ruta[] }[] {
  const mapa = new Map<string, Ruta[]>();
  for (const r of rutas) {
    const arr = mapa.get(r.grupo) ?? [];
    arr.push(r);
    mapa.set(r.grupo, arr);
  }
  return [...mapa.entries()].map(([grupo, dias]) => ({ grupo, dias }));
}
