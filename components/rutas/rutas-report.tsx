"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, MapPin, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { ClienteRuta } from "@/lib/data/clientes";

export function RutasReport({
  distritos,
  seleccionados,
  clientes,
}: {
  distritos: { distrito: string; clientes: number }[];
  seleccionados: string[];
  clientes: ClienteRuta[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sel = new Set(seleccionados);

  function actualizar(nuevos: string[]) {
    const params = new URLSearchParams(searchParams);
    if (nuevos.length) params.set("d", nuevos.join(","));
    else params.delete("d");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggle(distrito: string) {
    const nuevos = sel.has(distrito)
      ? seleccionados.filter((d) => d !== distrito)
      : [...seleccionados, distrito];
    actualizar(nuevos);
  }

  function generarPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const ancho = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136);
    doc.text("INNOLATTE", 40, 40);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Ruta de entrega — clientes a visitar", 40, 58);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado: ${formatDate(new Date())}`, ancho - 40, 40, { align: "right" });
    doc.text(`${clientes.length} cliente(s)`, ancho - 40, 54, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const distritosTxt = `Distritos: ${seleccionados.join(", ")}`;
    doc.text(doc.splitTextToSize(distritosTxt, ancho - 80), 40, 76);

    autoTable(doc, {
      startY: 92,
      head: [["Distrito", "Código", "Cliente", "Contacto", "Teléfono", "Dirección de entrega", "Canal"]],
      body: clientes.map((c) => [
        c.distrito || "—",
        c.codigo_cliente,
        c.nombre_comercial || c.nombre,
        c.contacto_nombre || "—",
        c.telefono || "—",
        c.direccion_entrega || "—",
        c.canal || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 5: { cellWidth: 180 } },
    });

    const hoy = new Date().toISOString().slice(0, 10);
    doc.save(`ruta_${hoy}.pdf`);
  }

  return (
    <div className="space-y-6">
      {/* Selector de distritos */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-line">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brand-600" />
            <h2 className="font-semibold">Distritos de la ruta</h2>
            {seleccionados.length > 0 && (
              <Badge tone="brand">{seleccionados.length} seleccionado(s)</Badge>
            )}
          </div>
          {seleccionados.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => actualizar([])}>
              <X className="size-4" />
              Limpiar
            </Button>
          )}
        </div>
        <div className="p-5 flex flex-wrap gap-2">
          {distritos.map((d) => {
            const activo = sel.has(d.distrito);
            return (
              <button
                key={d.distrito}
                type="button"
                onClick={() => toggle(d.distrito)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                  (activo
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-700 border-line hover:bg-slate-50")
                }
              >
                {d.distrito}
                <span className={activo ? "text-brand-100" : "text-muted"}>
                  ({d.clientes})
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Resultado */}
      {seleccionados.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="Elige uno o más distritos"
            description="Selecciona los distritos de la ruta del día para ver los clientes a visitar."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-line">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-600" />
              <h2 className="font-semibold">{clientes.length} cliente(s) a visitar</h2>
            </div>
            <Button onClick={generarPDF} disabled={clientes.length === 0}>
              <FileDown className="size-4" />
              Exportar PDF
            </Button>
          </div>

          {clientes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin clientes"
              description="No hay clientes activos en los distritos seleccionados."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección de entrega</TableHead>
                  <TableHead>Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge tone="gray">{c.distrito}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      {c.nombre_comercial || c.nombre}
                      <span className="block text-xs text-muted font-mono">
                        {c.codigo_cliente}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.contacto_nombre || "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{c.telefono || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">
                      {c.direccion_entrega || "—"}
                    </TableCell>
                    <TableCell>
                      {c.canal ? <Badge tone="blue">{c.canal}</Badge> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
