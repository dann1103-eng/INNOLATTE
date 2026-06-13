"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: boolean; error?: string };

async function asegurarAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "admin")
    return { supabase, error: "Solo un administrador puede editar las rutas" };
  return { supabase, error: null };
}

async function setDistritos(
  rutaId: string,
  transform: (actuales: string[]) => string[],
): Promise<Resultado> {
  const { supabase, error: authErr } = await asegurarAdmin();
  if (authErr) return { ok: false, error: authErr };

  const { data: ruta, error } = await supabase
    .from("rutas")
    .select("distritos")
    .eq("id", rutaId)
    .single();
  if (error || !ruta) return { ok: false, error: "Ruta no encontrada" };

  const nuevos = transform((ruta.distritos as string[]) ?? []);
  const { error: updErr } = await supabase
    .from("rutas")
    .update({ distritos: nuevos })
    .eq("id", rutaId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/rutas");
  revalidatePath("/rutas/horario");
  return { ok: true };
}

export async function agregarDistritoRuta(
  rutaId: string,
  distrito: string,
): Promise<Resultado> {
  const d = distrito.trim();
  if (!d) return { ok: false, error: "Distrito vacío" };
  return setDistritos(rutaId, (act) =>
    act.includes(d) ? act : [...act, d].sort(),
  );
}

export async function quitarDistritoRuta(
  rutaId: string,
  distrito: string,
): Promise<Resultado> {
  return setDistritos(rutaId, (act) => act.filter((x) => x !== distrito));
}
