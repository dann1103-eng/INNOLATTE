"use client";

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, ChevronDown, Loader2 } from "lucide-react";
import { getItemsDePedidos } from "@/app/(app)/pedidos/actions";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CD_SEDES, type CdSede, type PedidoConCliente } from "@/lib/types";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

/** jsPDF + jspdf-autotable expone finalY en lastAutoTable. */
type DocConTabla = jsPDF & { lastAutoTable: { finalY: number } };

/** Membrete común: logo, título, "Generado", filtros y conteo. */
function dibujarMembrete(
  doc: jsPDF,
  titulo: string,
  subtitulo: string | undefined,
  count: number,
) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setTextColor(13, 148, 136);
  doc.text("INNOLATTE", 40, 40);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 40, 58);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${formatDate(new Date())}`, ancho - 40, 40, { align: "right" });
  if (subtitulo) doc.text(subtitulo, ancho - 40, 54, { align: "right" });
  doc.text(`${count} pedido(s)`, ancho - 40, 68, { align: "right" });
}

/** Reporte resumen (una fila por pedido). Idéntico al formato anterior. */
function generarResumen(pedidos: PedidoConCliente[], subtitulo?: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  dibujarMembrete(doc, "Reporte de pedidos", subtitulo, pedidos.length);

  const total = pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);

  autoTable(doc, {
    startY: 82,
    head: [
      ["Folio", "Fecha", "Cliente", "Distrito", "Canal", "Pago", "Estado", "Fact.", "Total"],
    ],
    body: pedidos.map((p) => [
      `#${p.folio}`,
      formatDate(p.fecha),
      p.cliente?.nombre_comercial || p.cliente?.nombre || "—",
      p.cliente?.distrito || "—",
      p.canal || "—",
      p.forma_pago === "CREDITO" ? "Crédito" : "Contado",
      ESTADO_LABEL[p.estado] ?? p.estado,
      p.facturado ? "Sí" : "No",
      formatCurrency(Number(p.total)),
    ]),
    foot: [["", "", "", "", "", "", "", "Total", formatCurrency(total)]],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    columnStyles: { 8: { halign: "right" }, 7: { halign: "center" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const hoy = new Date().toISOString().slice(0, 10);
  doc.save(`pedidos_${hoy}.pdf`);
}

// Layout de 2 columnas para el PDF detallado.
const COL = {
  margenExt: 28,   // margen exterior de página
  gap: 14,         // espacio entre columnas
  cantW: 30,       // ancho fijo de la columna Cant.
  get ancho() {
    // Ancho de página letter portrait = 612 pt
    return (612 - this.margenExt * 2 - this.gap) / 2;
  },
  x(col: 0 | 1) {
    return this.margenExt + col * (this.ancho + this.gap);
  },
};

type ItemBloque = { descripcion: string; cantidad: number };

/**
 * Dibuja el bloque de un pedido dentro de una columna específica.
 * Devuelve la Y final del bloque en esa columna.
 */
function dibujarBloquePedidoCol(
  doc: jsPDF,
  p: PedidoConCliente,
  items: ItemBloque[],
  x: number,
  y: number,
  alto: number,
  col: 0 | 1,
): number {
  const cliente = p.cliente?.nombre_comercial || p.cliente?.nombre || "—";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  // Trunca nombre si es muy largo para la columna.
  const maxW = COL.ancho - 4;
  doc.text(`#${p.folio} · ${cliente}`, x, y, { maxWidth: maxW });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${p.cliente?.distrito || "—"} · ${formatDate(p.fecha)} · ${ESTADO_LABEL[p.estado] ?? p.estado}`,
    x,
    y + 10,
    { maxWidth: maxW },
  );

  autoTable(doc, {
    startY: y + 18,
    head: [["Descripción", "Cant."]],
    body: items.length > 0
      ? items.map((it) => [it.descripcion, String(it.cantidad)])
      : [["Sin productos", ""]],
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: COL.ancho - COL.cantW },
      1: { halign: "center", cellWidth: COL.cantW },
    },
    margin: { left: x, right: 612 - x - COL.ancho },
    // Evita que autoTable salte de página solo — lo manejamos nosotros.
    pageBreak: "avoid",
  });

  void col; // evita warning unused
  return (doc as DocConTabla).lastAutoTable.finalY + 10;
}

/**
 * Reporte detallado en 2 columnas: más pedidos por página, descripción y
 * cantidad más cercanas. Separado por CD (Planta primero, luego Distribución).
 */
async function generarDetallado(pedidos: PedidoConCliente[], subtitulo?: string) {
  const itemsPorPedido = await getItemsDePedidos(pedidos.map((p) => p.id));

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const alto = doc.internal.pageSize.getHeight();
  const margenInf = 40;
  dibujarMembrete(doc, "Reporte detallado de pedidos", subtitulo, pedidos.length);

  let primeraSeccion = true;

  const orden: CdSede[] = ["PLANTA", "DISTRIBUCION"];
  for (const cd of orden) {
    const grupo = pedidos.filter((p) => p.cd === cd);
    if (grupo.length === 0) continue;

    const label = CD_SEDES.find((s) => s.value === cd)?.label ?? cd;

    if (!primeraSeccion) doc.addPage();
    primeraSeccion = false;

    // Título de sección.
    let yTit = 50;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text(`${label} — ${grupo.length} pedido(s)`, COL.margenExt, yTit);

    // Arrancar las 2 columnas justo debajo del título.
    const yStart = yTit + 18;
    let yCol: [number, number] = [yStart, yStart];
    let col: 0 | 1 = 0;

    for (const p of grupo) {
      const items = (itemsPorPedido[p.id] ?? []).map((it) => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
      }));

      // Estima altura del bloque para decidir si cabe en la columna actual.
      const filas = Math.max(items.length, 1);
      const alturaEstimada = 18 + 14 + filas * 14 + 10; // cabecera + fila header + filas + gap

      // Si no cabe en la columna actual, pasa a la siguiente (o nueva página).
      if (yCol[col] + alturaEstimada > alto - margenInf) {
        const otraCol: 0 | 1 = col === 0 ? 1 : 0;
        if (yCol[otraCol] + alturaEstimada <= alto - margenInf) {
          // Cabe en la otra columna.
          col = otraCol;
        } else {
          // No cabe en ninguna: nueva página, reiniciar columnas.
          doc.addPage();
          yCol = [50, 50];
          col = 0;
        }
      }

      const x = COL.x(col);
      const yFin = dibujarBloquePedidoCol(doc, p, items, x, yCol[col], alto, col);
      yCol[col] = yFin;

      // Alterna columna para el siguiente pedido.
      col = col === 0 ? 1 : 0;
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  doc.save(`pedidos_detallado_${hoy}.pdf`);
}

export function ExportPdfButton({
  pedidos,
  subtitulo,
}: {
  pedidos: PedidoConCliente[];
  subtitulo?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  function exportarResumen() {
    setAbierto(false);
    setError(null);
    generarResumen(pedidos, subtitulo);
  }

  async function exportarDetallado() {
    setAbierto(false);
    setError(null);
    setCargando(true);
    try {
      await generarDetallado(pedidos, subtitulo);
    } catch {
      setError("No se pudo generar el PDF detallado.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        onClick={() => setAbierto((v) => !v)}
        disabled={pedidos.length === 0 || cargando}
      >
        {cargando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileDown className="size-4" />
        )}
        Exportar PDF
        <ChevronDown className="size-4" />
      </Button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-line bg-white p-1 shadow-lg">
          <button
            onClick={exportarResumen}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
          >
            Resumen
          </button>
          <button
            onClick={exportarDetallado}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
          >
            Detallado por cliente
          </button>
        </div>
      )}

      {error && <p className="absolute right-0 mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
