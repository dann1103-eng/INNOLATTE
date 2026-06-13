"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PedidoConCliente } from "@/lib/types";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export function ExportPdfButton({
  pedidos,
  subtitulo,
}: {
  pedidos: PedidoConCliente[];
  subtitulo?: string;
}) {
  function generar() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const ancho = doc.internal.pageSize.getWidth();

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136);
    doc.text("INNOLATTE", 40, 40);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Reporte de pedidos", 40, 58);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const fechaGen = formatDate(new Date());
    doc.text(`Generado: ${fechaGen}`, ancho - 40, 40, { align: "right" });
    if (subtitulo) doc.text(subtitulo, ancho - 40, 54, { align: "right" });
    doc.text(`${pedidos.length} pedido(s)`, ancho - 40, 68, { align: "right" });

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

  return (
    <Button variant="secondary" onClick={generar} disabled={pedidos.length === 0}>
      <FileDown className="size-4" />
      Exportar PDF
    </Button>
  );
}
