"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileDown, ChevronDown, FileSpreadsheet } from "lucide-react";
import { ExportPdfButton } from "@/components/pedidos/export-pdf-button";
import { PedidoEstadoInline } from "@/components/pedidos/pedido-estado-inline";
import { PedidoFacturadoInline } from "@/components/pedidos/pedido-facturado-inline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CD_SEDES, type PedidoConCliente } from "@/lib/types";

/**
 * Lista de pedidos con selección por fila (checkbox) para elegir cuáles se
 * incluyen en el PDF. Si no hay ninguno marcado, se exportan todos.
 */
export function PedidosTabla({
  pedidos,
  subtitulo,
}: {
  pedidos: PedidoConCliente[];
  subtitulo?: string;
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [menuExcel, setMenuExcel] = useState(false);
  const refExcel = useRef<HTMLDivElement>(null);

  const haySeleccion = seleccionados.size > 0;
  const todosMarcados = pedidos.length > 0 && seleccionados.size === pedidos.length;

  function toggleTodos(valor: boolean) {
    setSeleccionados(valor ? new Set(pedidos.map((p) => p.id)) : new Set());
  }

  function toggleUno(id: string, valor: boolean) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (valor) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Pedidos que van al PDF: los marcados, o todos si no hay ninguno marcado.
  const pedidosParaPdf = useMemo(
    () => (haySeleccion ? pedidos.filter((p) => seleccionados.has(p.id)) : pedidos),
    [pedidos, seleccionados, haySeleccion],
  );

  // Construye la URL del Excel pasando los mismos filtros que están en la URL actual.
  function urlExcel() {
    const params = new URLSearchParams(window.location.search);
    return `/pedidos/export-excel?${params.toString()}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm text-muted">
          {haySeleccion
            ? `${seleccionados.size} de ${pedidos.length} seleccionado(s) para el PDF`
            : "Marca los pedidos para incluirlos en el PDF (o expórtalos todos)"}
        </span>
        <div className="flex items-center gap-2">
          <ExportPdfButton pedidos={pedidosParaPdf} subtitulo={subtitulo} />
          {/* Botón Excel */}
          <div className="relative" ref={refExcel}>
            <Button
              variant="secondary"
              onClick={() => setMenuExcel((v) => !v)}
              disabled={pedidos.length === 0}
            >
              <FileSpreadsheet className="size-4" />
              Exportar Excel
              <ChevronDown className="size-4" />
            </Button>
            {menuExcel && (
              <div
                className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-line bg-white p-1 shadow-lg"
                onMouseLeave={() => setMenuExcel(false)}
              >
                <a
                  href={urlExcel()}
                  download
                  onClick={() => setMenuExcel(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <FileDown className="size-4 text-green-600" />
                  <span>
                    <span className="font-medium block">Datos completos (.xlsx)</span>
                    <span className="text-xs text-muted">Cabecera + líneas, listo para tabla dinámica</span>
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={(e) => toggleTodos(e.target.checked)}
                  className="size-4 rounded border-line accent-brand-600"
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Distrito</TableHead>
              <TableHead>CD</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Facturado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((p) => {
              const marcado = seleccionados.has(p.id);
              return (
                <TableRow key={p.id} data-state={marcado ? "selected" : undefined}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={(e) => toggleUno(p.id, e.target.checked)}
                      className="size-4 rounded border-line accent-brand-600"
                      aria-label={`Seleccionar pedido #${p.folio}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/pedidos/${p.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      #{p.folio}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {p.cliente?.nombre_comercial || p.cliente?.nombre || "—"}
                  </TableCell>
                  <TableCell className="text-muted">{p.cliente?.distrito || "—"}</TableCell>
                  <TableCell className="text-muted">
                    {CD_SEDES.find((s) => s.value === p.cd)?.label ?? p.cd}
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(p.fecha)}</TableCell>
                  <TableCell>
                    <PedidoEstadoInline id={p.id} estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PedidoFacturadoInline id={p.id} facturado={p.facturado} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(Number(p.total))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
