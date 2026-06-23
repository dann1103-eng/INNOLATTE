import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPedidos, type FiltrosPedidos } from "@/lib/data/pedidos";

/** Envuelve un valor para CSV (comillas + escape). */
function csv(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  // Protegido: requiere sesión.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const sp = request.nextUrl.searchParams;
  const filtros: FiltrosPedidos = {
    q: sp.get("q") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    facturado: sp.get("facturado") ?? undefined,
    desde: sp.get("desde") ?? undefined,
    hasta: sp.get("hasta") ?? undefined,
    producto: sp.get("producto") ?? undefined,
  };

  const pedidos = await getPedidos(filtros);

  const cabeceras = [
    "Folio",
    "Fecha",
    "Cliente",
    "Codigo cliente",
    "Canal",
    "Forma de pago",
    "Estado",
    "Facturado",
    "Total",
  ];

  const lineas = pedidos.map((p) =>
    [
      p.folio,
      p.fecha,
      p.cliente?.nombre_comercial || p.cliente?.nombre || "",
      p.cliente?.codigo_cliente || "",
      p.canal || "",
      p.forma_pago || "",
      p.estado,
      p.facturado ? "SI" : "NO",
      String(Number(p.total)),
    ]
      .map(csv)
      .join(","),
  );

  // BOM para que Excel reconozca UTF-8 (acentos).
  const contenido = "﻿" + [cabeceras.map(csv).join(","), ...lineas].join("\r\n");

  const hoy = new Date().toISOString().slice(0, 10);
  const sufijo = filtros.producto ? `_${filtros.producto}` : "";
  const nombre = `pedidos${sufijo}_${hoy}.csv`;

  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
