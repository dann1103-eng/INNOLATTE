# PDF detallado de pedidos y edición inline — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a la sección de Pedidos un segundo formato de PDF (detallado, un bloque por pedido con sus productos) y permitir editar estado/facturado desde la lista sin abrir cada pedido.

**Architecture:** El reporte resumen actual no cambia; el botón "Exportar PDF" pasa a un menú con dos opciones (Resumen / Detallado). El detallado pide los items vía una nueva server action `getItemsDePedidos` y los arma en el navegador con jsPDF. En la tabla, las celdas Estado y Facturado pasan a Client Components que llaman a las server actions ya existentes (`actualizarEstado`, `marcarFacturado`).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase, jsPDF + jspdf-autotable, Tailwind v4.

**Verificación:** Este proyecto NO tiene framework de tests. La verificación de cada tarea es `npx tsc --noEmit` (type-check), `npm run build` al final, y prueba manual en `npm run dev`. Convención del repo (ver CLAUDE.md).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|--------|------------------|
| `app/(app)/pedidos/actions.ts` (modificar) | + `getItemsDePedidos(ids)`: trae items agrupados por pedido |
| `components/pedidos/export-pdf-button.tsx` (reescribir) | Botón con menú; genera PDF resumen y PDF detallado |
| `components/pedidos/pedido-estado-inline.tsx` (crear) | Select de estado editable en la fila |
| `components/pedidos/pedido-facturado-inline.tsx` (crear) | Checkbox de facturado editable en la fila |
| `app/(app)/pedidos/page.tsx` (modificar) | Usa los controles inline en las celdas Estado/Facturado |

---

## Task 1: Server action `getItemsDePedidos`

**Files:**
- Modify: `app/(app)/pedidos/actions.ts`

- [ ] **Step 1: Añadir el tipo `PedidoItem` al import de tipos**

En la línea de import de tipos (actualmente `import type { EstadoPedido } from "@/lib/types";`), cambiar a:

```ts
import type { EstadoPedido, PedidoItem } from "@/lib/types";
```

- [ ] **Step 2: Añadir la función al final del archivo**

Agregar al final de `app/(app)/pedidos/actions.ts`:

```ts
/**
 * Devuelve los items de varios pedidos agrupados por pedido_id.
 * Usado por el PDF detallado (la tabla de la lista no carga items).
 * Respeta RLS (cliente de servidor autenticado).
 */
export async function getItemsDePedidos(
  ids: string[],
): Promise<Record<string, PedidoItem[]>> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedido_items")
    .select("*")
    .in("pedido_id", ids);
  if (error) throw new Error(error.message);

  const mapa: Record<string, PedidoItem[]> = {};
  for (const it of (data ?? []) as PedidoItem[]) {
    (mapa[it.pedido_id] ??= []).push(it);
  }
  return mapa;
}
```

> Nota: `actions.ts` tiene `"use server"`, así que todo export debe ser `async` — `getItemsDePedidos` lo es.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/pedidos/actions.ts"
git commit -m "Agregar getItemsDePedidos para el PDF detallado de pedidos"
```

---

## Task 2: Botón Exportar PDF con menú + generador detallado

**Files:**
- Rewrite: `components/pedidos/export-pdf-button.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Sobrescribir `components/pedidos/export-pdf-button.tsx` con:

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin errores. (Si `lastAutoTable` da error de tipo, el cast `DocConTabla` ya lo cubre.)

- [ ] **Step 3: Commit**

```bash
git add "components/pedidos/export-pdf-button.tsx"
git commit -m "Exportar PDF con menu: reporte resumen y detallado por pedido"
```

---

## Task 3: Control de estado inline

**Files:**
- Create: `components/pedidos/pedido-estado-inline.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstado } from "@/app/(app)/pedidos/actions";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/types";

/** Select de estado editable directamente en la fila de la lista. */
export function PedidoEstadoInline({
  id,
  estado,
}: {
  id: string;
  estado: EstadoPedido;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevo: EstadoPedido) {
    if (nuevo === estado) return;
    setError(null);
    startTransition(async () => {
      const res = await actualizarEstado(id, nuevo);
      if (!res.ok) setError(res.error ?? "Error");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={estado}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value as EstadoPedido)}
        className="h-8 rounded-md border border-line bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
      >
        {ESTADOS_PEDIDO.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-red-600 text-xs" title={error}>
          !
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin errores (el componente aún no se usa; eso es normal).

---

## Task 4: Control de facturado inline

**Files:**
- Create: `components/pedidos/pedido-facturado-inline.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarFacturado } from "@/app/(app)/pedidos/actions";

/** Checkbox de facturado editable directamente en la fila de la lista. */
export function PedidoFacturadoInline({
  id,
  facturado,
}: {
  id: string;
  facturado: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(valor: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await marcarFacturado(id, valor);
      if (!res.ok) setError(res.error ?? "Error");
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="checkbox"
        checked={facturado}
        disabled={pending}
        onChange={(e) => toggle(e.target.checked)}
        className="size-4 rounded border-line accent-brand-600 disabled:opacity-60"
        aria-label="Facturado"
      />
      {error && (
        <span className="text-red-600 text-xs" title={error}>
          !
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin errores.

---

## Task 5: Conectar los controles inline en la lista de pedidos

**Files:**
- Modify: `app/(app)/pedidos/page.tsx`

- [ ] **Step 1: Ajustar imports**

En `app/(app)/pedidos/page.tsx`:

- Eliminar el import de `EstadoBadge`:
  `import { EstadoBadge } from "@/components/pedidos/estado-badge";`
  (El componente `estado-badge.tsx` NO se borra: lo sigue usando el detalle `[id]/page.tsx`.)
- Eliminar el import de `Badge` (`import { Badge } from "@/components/ui/badge";`) — tras el cambio ya no se usa en esta página.
- Añadir:

```tsx
import { PedidoEstadoInline } from "@/components/pedidos/pedido-estado-inline";
import { PedidoFacturadoInline } from "@/components/pedidos/pedido-facturado-inline";
```

- [ ] **Step 2: Reemplazar las celdas Estado y Facturado**

Buscar este bloque dentro del `.map`:

```tsx
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-center">
                    {p.facturado ? (
                      <Badge tone="green">Sí</Badge>
                    ) : (
                      <Badge tone="gray">No</Badge>
                    )}
                  </TableCell>
```

Reemplazarlo por:

```tsx
                  <TableCell>
                    <PedidoEstadoInline id={p.id} estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PedidoFacturadoInline id={p.id} facturado={p.facturado} />
                  </TableCell>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin errores y sin imports sin usar.

- [ ] **Step 4: Build completo**

Run: `npm run build`
Expected: build exitoso (hace el type-check de producción).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/pedidos/page.tsx" "components/pedidos/pedido-estado-inline.tsx" "components/pedidos/pedido-facturado-inline.tsx"
git commit -m "Editar estado y facturado desde la lista de pedidos"
```

---

## Task 6: Verificación manual

- [ ] **Step 1: Levantar el dev server**

Run: `npm run dev` y abrir `/pedidos`.

- [ ] **Step 2: Probar PDF Resumen**

Click en "Exportar PDF" → "Resumen". Debe descargar `pedidos_<fecha>.pdf` idéntico al anterior (tabla con Folio, Fecha, Cliente, Distrito, Canal, Pago, Estado, Fact., Total + Total general).

- [ ] **Step 3: Probar PDF Detallado**

Click en "Exportar PDF" → "Detallado por cliente". Debe descargar `pedidos_detallado_<fecha>.pdf` con un bloque por pedido (encabezado `#folio · cliente`, línea con Distrito · Fecha · Estado · Total, y tabla de productos), respetando los filtros activos y el orden de la lista, con "Gran total" al final.

- [ ] **Step 4: Probar filtros + PDF**

Aplicar un filtro (estado, fechas o producto) y exportar ambos PDFs: deben reflejar solo los pedidos filtrados y mostrar el subtítulo de filtros en el membrete.

- [ ] **Step 5: Probar edición inline**

En una fila, cambiar el **Estado** con el select → debe persistir (refrescar la página y verificar; abrir el detalle del pedido y confirmar el mismo valor). Marcar/desmarcar **Facturado** → debe persistir igual.

- [ ] **Step 6: Caso borde sin pedidos**

Filtrar de modo que no haya resultados → el botón "Exportar PDF" debe quedar deshabilitado.

---

## Notas

- No se modifica el modelo de datos ni migraciones.
- `actualizarEstado` y `marcarFacturado` ya hacían `revalidatePath("/pedidos")`, por eso el `router.refresh()` muestra el valor persistido.
- `distrito` viene en `p.cliente.distrito` (lo selecciona `getPedidos`), así que el PDF detallado lo tiene disponible sin consultas extra.
