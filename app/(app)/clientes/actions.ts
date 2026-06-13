"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const opcional = z.preprocess(
  (v) => (v === "" || v == null ? null : String(v).trim()),
  z.string().nullable(),
);

const ClienteSchema = z.object({
  codigo_cliente: z.string().trim().min(1, "El código de cliente es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  nombre_comercial: opcional,
  telefono: opcional,
  correo: opcional,
  contacto_nombre: opcional,
  contacto_telefono: opcional,
  direccion_fiscal: opcional,
  direccion_entrega: opcional,
  departamento: opcional,
  municipio: opcional,
  distrito: opcional,
  canal: opcional,
  lista_precios: z.preprocess((v) => Number(v), z.number().int().min(1).max(20)),
  forma_pago: z.enum(["CONTADO", "CREDITO"]),
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
    return { supabase, error: "Solo un administrador puede gestionar clientes" };
  return { supabase, error: null };
}

function leer(formData: FormData) {
  return ClienteSchema.safeParse({
    codigo_cliente: formData.get("codigo_cliente"),
    nombre: formData.get("nombre"),
    nombre_comercial: formData.get("nombre_comercial"),
    telefono: formData.get("telefono"),
    correo: formData.get("correo"),
    contacto_nombre: formData.get("contacto_nombre"),
    contacto_telefono: formData.get("contacto_telefono"),
    direccion_fiscal: formData.get("direccion_fiscal"),
    direccion_entrega: formData.get("direccion_entrega"),
    departamento: formData.get("departamento"),
    municipio: formData.get("municipio"),
    distrito: formData.get("distrito"),
    canal: formData.get("canal"),
    lista_precios: formData.get("lista_precios"),
    forma_pago: formData.get("forma_pago"),
    activo: formData.get("activo"),
  });
}

export async function crearCliente(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, error: authErr } = await asegurarAdmin();
  if (authErr) return { ok: false, error: authErr };

  const parsed = leer(formData);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { data, error } = await supabase
    .from("clientes")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya existe un cliente con ese código" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function actualizarCliente(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, error: authErr } = await asegurarAdmin();
  if (authErr) return { ok: false, error: authErr };

  const parsed = leer(formData);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { error } = await supabase.from("clientes").update(parsed.data).eq("id", id);
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya existe un cliente con ese código" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}
