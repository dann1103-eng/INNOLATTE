"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { round6 } from "@/lib/utils";

const opcional = (s: z.ZodString) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), s.nullable());

const ProductoSchema = z.object({
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  categoria: opcional(z.string()),
  familia: opcional(z.string()),
  sabor: opcional(z.string()),
  presentacion: opcional(z.string()),
  peso_kg: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().nonnegative().nullable(),
  ),
  costo: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().nonnegative().nullable(),
  ),
  activo: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export type ActionResult = { ok: boolean; error?: string };

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
    return { supabase, error: "Solo un administrador puede editar el catálogo" };
  return { supabase, error: null };
}

export async function actualizarProducto(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, error: authErr } = await asegurarAdmin();
  if (authErr) return { ok: false, error: authErr };

  const parsed = ProductoSchema.safeParse({
    descripcion: formData.get("descripcion"),
    categoria: formData.get("categoria"),
    familia: formData.get("familia"),
    sabor: formData.get("sabor"),
    presentacion: formData.get("presentacion"),
    peso_kg: formData.get("peso_kg"),
    costo: formData.get("costo"),
    activo: formData.get("activo"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { error } = await supabase.from("productos").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Precios: campos con nombre "precio_<lista>"
  const filas: { producto_id: string; lista: number; precio: number }[] = [];
  const listasABorrar: number[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^precio_(\d{1,2})$/.exec(key);
    if (!m) continue;
    const lista = Number(m[1]);
    const raw = String(value).trim();
    if (raw === "") {
      listasABorrar.push(lista);
      continue;
    }
    const precio = Number(raw);
    if (!isFinite(precio) || precio < 0) continue;
    filas.push({ producto_id: id, lista, precio: round6(precio) });
  }

  if (filas.length > 0) {
    const { error: upErr } = await supabase
      .from("producto_precios")
      .upsert(filas, { onConflict: "producto_id,lista" });
    if (upErr) return { ok: false, error: upErr.message };
  }
  if (listasABorrar.length > 0) {
    await supabase
      .from("producto_precios")
      .delete()
      .eq("producto_id", id)
      .in("lista", listasABorrar);
  }

  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${id}`);
  return { ok: true };
}

const CrearProductoSchema = ProductoSchema.extend({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .transform((s) => s.toUpperCase()),
});

/** Extrae las filas de precios (campos precio_<lista>) de un formulario. */
function extraerPrecios(formData: FormData, productoId: string) {
  const filas: { producto_id: string; lista: number; precio: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^precio_(\d{1,2})$/.exec(key);
    if (!m) continue;
    const raw = String(value).trim();
    if (raw === "") continue;
    const precio = Number(raw);
    if (!isFinite(precio) || precio < 0) continue;
    filas.push({ producto_id: productoId, lista: Number(m[1]), precio: round6(precio) });
  }
  return filas;
}

export async function crearProducto(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, error: authErr } = await asegurarAdmin();
  if (authErr) return { ok: false, error: authErr };

  const parsed = CrearProductoSchema.safeParse({
    codigo: formData.get("codigo"),
    descripcion: formData.get("descripcion"),
    categoria: formData.get("categoria"),
    familia: formData.get("familia"),
    sabor: formData.get("sabor"),
    presentacion: formData.get("presentacion"),
    peso_kg: formData.get("peso_kg"),
    costo: formData.get("costo"),
    activo: formData.get("activo"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { data, error } = await supabase
    .from("productos")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: `Ya existe un producto con el código ${parsed.data.codigo}` };
    return { ok: false, error: error.message };
  }

  const filas = extraerPrecios(formData, data.id);
  if (filas.length > 0) {
    const { error: precErr } = await supabase.from("producto_precios").insert(filas);
    if (precErr) return { ok: false, error: precErr.message };
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo/${data.id}`);
}
