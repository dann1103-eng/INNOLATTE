import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/types";

/** Devuelve el usuario y su perfil; redirige a /login si no hay sesión. */
export async function requireUser(): Promise<{ userId: string; perfil: Perfil }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    perfil: (perfil as Perfil) ?? { id: user.id, nombre: user.email ?? null, rol: "vendedor" },
  };
}

/** Redirige si el usuario no es admin. */
export async function requireAdmin(): Promise<{ userId: string; perfil: Perfil }> {
  const sesion = await requireUser();
  if (sesion.perfil.rol !== "admin") redirect("/");
  return sesion;
}
