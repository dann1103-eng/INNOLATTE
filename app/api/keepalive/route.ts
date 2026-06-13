import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Ping diario para mantener activo el proyecto de Supabase (plan free se pausa
 * tras ~7 días sin actividad). Lo invoca un Vercel Cron (ver vercel.json).
 *
 * Hace una consulta liviana (count) — cualquier petición a la API cuenta como
 * actividad. Opcionalmente se protege con CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ ok: false, error: "Faltan variables de entorno" }, { status: 500 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  // Consulta mínima: solo cuenta filas (head). Mantiene viva la base.
  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true });

  return Response.json({
    ok: !error,
    pinged: true,
    count: count ?? null,
    ts: new Date().toISOString(),
  });
}
