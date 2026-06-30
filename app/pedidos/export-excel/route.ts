import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { getPedidos, type FiltrosPedidos } from "@/lib/data/pedidos";
import { getItemsDePedidos } from "@/app/(app)/pedidos/actions";
import { formatDate } from "@/lib/utils";
import { CD_SEDES } from "@/lib/types";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const TEAL = { argb: "FF0D9484" } as ExcelJS.Color;
const TEAL_LIGHT = { argb: "FFE6F7F5" } as ExcelJS.Color;

function estiloEncabezado(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: TEAL };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FF0D9484" } },
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const sp = request.nextUrl.searchParams;
  const filtros: FiltrosPedidos = {
    q: sp.get("q") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    facturado: sp.get("facturado") ?? undefined,
    desde: sp.get("desde") ?? undefined,
    hasta: sp.get("hasta") ?? undefined,
    producto: sp.get("producto") ?? undefined,
    cd: sp.get("cd") ?? undefined,
  };

  const pedidos = await getPedidos(filtros);
  const itemsPorPedido = await getItemsDePedidos(pedidos.map((p) => p.id));

  const wb = new ExcelJS.Workbook();
  wb.creator = "INNOLATTE";
  wb.created = new Date();

  // ── Hoja 1: Pedidos (cabecera) ──────────────────────────────────────────────
  const hsPedidos = wb.addWorksheet("Pedidos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const colsPedidos: { header: string; key: string; width: number }[] = [
    { header: "Folio", key: "folio", width: 8 },
    { header: "Fecha", key: "fecha", width: 13 },
    { header: "Código cliente", key: "codigo_cliente", width: 14 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Distrito", key: "distrito", width: 16 },
    { header: "CD", key: "cd", width: 16 },
    { header: "Canal", key: "canal", width: 16 },
    { header: "Forma pago", key: "forma_pago", width: 12 },
    { header: "Lista precios", key: "lista", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Facturado", key: "facturado", width: 10 },
    { header: "Subtotal (sin IVA)", key: "subtotal", width: 18 },
    { header: "IVA (13%)", key: "iva", width: 13 },
    { header: "Total (con IVA)", key: "total", width: 16 },
    { header: "Notas", key: "notas", width: 30 },
    { header: "Creado", key: "created_at", width: 18 },
  ];
  hsPedidos.columns = colsPedidos;
  hsPedidos.getRow(1).eachCell((cell) => estiloEncabezado(cell));
  hsPedidos.getRow(1).height = 30;

  for (const p of pedidos) {
    const subtotal = Number(p.subtotal ?? 0);
    const total = Number(p.total ?? 0);
    const iva = total - subtotal;
    const cdLabel = CD_SEDES.find((s) => s.value === p.cd)?.label ?? p.cd;
    const row = hsPedidos.addRow({
      folio: p.folio,
      fecha: formatDate(p.fecha),
      codigo_cliente: p.cliente?.codigo_cliente ?? "",
      cliente: p.cliente?.nombre_comercial || p.cliente?.nombre || "",
      distrito: p.cliente?.distrito ?? "",
      cd: cdLabel,
      canal: p.canal ?? "",
      forma_pago: p.forma_pago === "CREDITO" ? "Crédito" : "Contado",
      lista: `P${p.lista_precios_aplicada}`,
      estado: ESTADO_LABEL[p.estado] ?? p.estado,
      facturado: p.facturado ? "Sí" : "No",
      subtotal,
      iva,
      total,
      notas: p.notas ?? "",
      created_at: p.created_at ? formatDate(p.created_at) : "",
    });
    // Números con 2 decimales.
    ["subtotal", "iva", "total"].forEach((k) => {
      const c = row.getCell(k);
      c.numFmt = '"$"#,##0.00';
    });
    // Filas alternas.
    if (row.number % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: TEAL_LIGHT };
      });
    }
    row.alignment = { vertical: "middle" };
  }

  // Totales al pie.
  const filaFoot = hsPedidos.addRow({});
  const totalGeneral = pedidos.reduce((acc, p) => acc + Number(p.total ?? 0), 0);
  const subtotalGeneral = pedidos.reduce((acc, p) => acc + Number(p.subtotal ?? 0), 0);
  const ivaGeneral = totalGeneral - subtotalGeneral;
  const footSubtotal = filaFoot.getCell("subtotal");
  const footIva = filaFoot.getCell("iva");
  const footTotal = filaFoot.getCell("total");
  footSubtotal.value = subtotalGeneral;
  footIva.value = ivaGeneral;
  footTotal.value = totalGeneral;
  [footSubtotal, footIva, footTotal].forEach((c) => {
    c.font = { bold: true };
    c.numFmt = '"$"#,##0.00';
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });
  const footLabel = filaFoot.getCell("estado");
  footLabel.value = "TOTAL";
  footLabel.font = { bold: true };
  footLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  // ── Hoja 2: Líneas de pedido (items) ────────────────────────────────────────
  const hsItems = wb.addWorksheet("Líneas de pedido", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const colsItems: { header: string; key: string; width: number }[] = [
    { header: "Folio", key: "folio", width: 8 },
    { header: "Fecha", key: "fecha", width: 13 },
    { header: "Código cliente", key: "codigo_cliente", width: 14 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Distrito", key: "distrito", width: 16 },
    { header: "CD", key: "cd", width: 16 },
    { header: "Canal", key: "canal", width: 16 },
    { header: "Estado pedido", key: "estado", width: 12 },
    { header: "Facturado", key: "facturado", width: 10 },
    { header: "Cód. producto", key: "cod_producto", width: 14 },
    { header: "Descripción", key: "descripcion", width: 36 },
    { header: "Sabor", key: "sabor", width: 14 },
    { header: "Presentación", key: "presentacion", width: 14 },
    { header: "Cantidad", key: "cantidad", width: 10 },
    { header: "Precio unitario", key: "precio_unitario", width: 15 },
    { header: "Subtotal línea", key: "subtotal_linea", width: 15 },
  ];
  hsItems.columns = colsItems;
  hsItems.getRow(1).eachCell((cell) => estiloEncabezado(cell));
  hsItems.getRow(1).height = 30;

  let rowNum = 2;
  for (const p of pedidos) {
    const items = itemsPorPedido[p.id] ?? [];
    const cdLabel = CD_SEDES.find((s) => s.value === p.cd)?.label ?? p.cd;
    for (const it of items) {
      const row = hsItems.addRow({
        folio: p.folio,
        fecha: formatDate(p.fecha),
        codigo_cliente: p.cliente?.codigo_cliente ?? "",
        cliente: p.cliente?.nombre_comercial || p.cliente?.nombre || "",
        distrito: p.cliente?.distrito ?? "",
        cd: cdLabel,
        canal: p.canal ?? "",
        estado: ESTADO_LABEL[p.estado] ?? p.estado,
        facturado: p.facturado ? "Sí" : "No",
        cod_producto: it.codigo,
        descripcion: it.descripcion,
        sabor: it.sabor ?? "",
        presentacion: it.presentacion ?? "",
        cantidad: it.cantidad,
        precio_unitario: Number(it.precio_unitario),
        subtotal_linea: Number(it.subtotal),
      });
      ["precio_unitario", "subtotal_linea"].forEach((k) => {
        row.getCell(k).numFmt = '"$"#,##0.000000';
      });
      if (rowNum % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: TEAL_LIGHT };
        });
      }
      row.alignment = { vertical: "middle" };
      rowNum++;
    }
  }

  // ── Serializar y devolver ────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const hoy = new Date().toISOString().slice(0, 10);
  const nombre = `pedidos_${hoy}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
