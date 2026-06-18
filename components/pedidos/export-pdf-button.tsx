"use client";

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, ChevronDown, Loader2 } from "lucide-react";
import { getItemsDePedidos } from "@/app/(app)/pedidos/actions";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PedidoConCliente } from "@/lib/types";

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

/** Reporte detallado: un bloque por pedido con su tabla de productos. */
async function generarDetallado(pedidos: PedidoConCliente[], subtitulo?: string) {
  const itemsPorPedido = await getItemsDePedidos(pedidos.map((p) => p.id));

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  dibujarMembrete(doc, "Reporte detallado de pedidos", subtitulo, pedidos.length);

  let y = 90;
  let granTotal = 0;

  for (const p of pedidos) {
    const items = itemsPorPedido[p.id] ?? [];
    granTotal += Number(p.total || 0);

    // Salto de página si no cabe el encabezado del bloque + una fila.
    if (y > alto - 120) {
      doc.addPage();
      y = 50;
    }

    const cliente = p.cliente?.nombre_comercial || p.cliente?.nombre || "—";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`#${p.folio}  ·  ${cliente}`, 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Distrito: ${p.cliente?.distrito || "—"}   ·   ${formatDate(p.fecha)}   ·   Estado: ${
        ESTADO_LABEL[p.estado] ?? p.estado
      }   ·   Total: ${formatCurrency(Number(p.total))}`,
      40,
      y + 13,
    );

    autoTable(doc, {
      startY: y + 22,
      head: [["Código", "Descripción", "Cant.", "P. unit.", "Subtotal"]],
      body:
        items.length > 0
          ? items.map((it) => [
              it.codigo,
              it.descripcion +
                (it.sabor ? ` · ${it.sabor}` : "") +
                (it.presentacion ? ` · ${it.presentacion}` : ""),
              String(it.cantidad),
              formatCurrency(Number(it.precio_unitario)),
              formatCurrency(Number(it.subtotal)),
            ])
          : [["—", "Sin productos", "", "", ""]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        2: { halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });

    y = (doc as DocConTabla).lastAutoTable.finalY + 22;
  }

  // Gran total al final.
  if (y > alto - 60) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Gran total: ${formatCurrency(granTotal)}`, ancho - 40, y, { align: "right" });

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
