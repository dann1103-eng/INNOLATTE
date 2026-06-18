# Pedidos: PDF detallado y edición de estado/facturado en línea

**Fecha:** 2026-06-18
**Módulo:** `app/(app)/pedidos`

## Contexto y motivación

Dos solicitudes del usuario sobre la sección de Pedidos:

1. **PDF detallado por cliente.** Hoy solo existe un reporte PDF de tabla resumen
   (una fila por pedido, sin productos). El usuario necesita un segundo formato que
   liste, por cada pedido, **qué productos lleva** (con el nombre del cliente), para
   imprimirlo y preparar las entregas sin depender de la computadora. Cita textual:
   *"que me permita descargar todos los pedidos con el detalle nombre de cliente y
   que lleva su pedido, porque no puedo andar con la compu preparándolos, entonces me
   sale más fácil imprimirlo"*.

2. **Editar estado y facturado desde la lista.** Hoy para cambiar el estado
   (PENDIENTE / EN_RUTA / ENTREGADO / CANCELADO) o el flag `facturado` hay que entrar
   al detalle de cada pedido. El usuario quiere poder hacerlo directamente desde la
   vista de lista, sin abrir pedido por pedido.

## Decisiones tomadas (brainstorming)

- **PDF detallado:** estructura **un bloque por pedido** (no agrupado por cliente).
  Cada pedido = un bloque con encabezado + su tabla de productos.
- **Reporte resumen:** se mantiene **igual que hoy** (orden: más reciente primero,
  misma tabla). No se cambia su orden ni columnas.
- **Permisos de edición en línea:** **cualquier usuario autenticado**, igual que hoy
  en el detalle. Las acciones de servidor existentes no chequean rol admin; se mantiene
  esa paridad (RLS gobierna a nivel de base de datos).

## Estado actual del código (hechos verificados)

- `app/(app)/pedidos/page.tsx` (Server Component) carga `getPedidos(sp)` y arma un
  `subtitulo` con los filtros activos; renderiza la tabla y un único
  `<ExportPdfButton pedidos subtitulo />`.
- `lib/data/pedidos.ts` → `getPedidos(filtros)` devuelve `PedidoConCliente[]`
  (cabecera + cliente parcial). **No** carga `pedido_items`. Orden: `created_at` desc.
- `components/pedidos/export-pdf-button.tsx` (Client Component) genera el PDF resumen
  con jsPDF + jspdf-autotable a partir de `pedidos`.
- `app/(app)/pedidos/actions.ts` ya expone `actualizarEstado(id, estado)` y
  `marcarFacturado(id, facturado)` (sin chequeo de rol; hacen `revalidatePath`).
- `components/pedidos/pedido-acciones.tsx` (detalle) ya usa esas acciones con
  `useTransition` + `router.refresh()`; sirve de patrón para los controles en línea.
- Tipos en `lib/types.ts`: `PedidoItem`, `PedidoConCliente`, `ESTADOS_PEDIDO`.
- `components/ui/`: hay `Select`, `Button`, `Badge`. **No** hay primitivo de menú
  desplegable; el menú del botón de exportar se implementa dentro del propio Client
  Component (sin dependencias nuevas).

## Diseño

### Parte A — Dos formatos de PDF

**UI.** El botón único "Exportar PDF" se convierte en un **botón con menú** dentro de
`export-pdf-button.tsx` (sigue siendo Client Component):

- `Exportar PDF ▾` abre un menú con dos opciones:
  1. **Resumen** → genera el reporte de tabla actual (función existente, sin cambios
     de salida).
  2. **Detallado por cliente** → genera el nuevo PDF por bloques.
- El menú se implementa con estado local (`useState` abierto/cerrado), cierre al
  hacer click fuera (listener en `document`) y al elegir una opción. Sin librerías.
- El botón se deshabilita si `pedidos.length === 0` (igual que hoy).

**Datos.** `getPedidos` no trae items y la tabla no los necesita, así que **no** se
cargan en cada render de la página. En su lugar:

- Nueva server action en `app/(app)/pedidos/actions.ts`:
  `getItemsDePedidos(ids: string[]): Promise<Record<string, PedidoItem[]>>`.
  - Lee `pedido_items` con `.in("pedido_id", ids)` y agrupa por `pedido_id`.
  - Si `ids` está vacío, devuelve `{}` sin consultar.
  - Respeta RLS (usa el cliente de servidor autenticado).
- `export-pdf-button.tsx` ya recibe `pedidos` (con su orden y filtros aplicados). Al
  elegir "Detallado": llama `getItemsDePedidos(pedidos.map(p => p.id))`, fusiona los
  items con cada pedido **preservando el orden de `pedidos`** y arma el PDF.
- Estado de carga: mientras se piden los items, deshabilitar el menú / mostrar
  indicador. Si la action falla, mostrar un mensaje breve (alert o texto inline) y no
  generar el PDF.

**Layout del PDF detallado** (jsPDF, orientación **portrait**, `unit: pt`,
`format: letter`):

- **Membrete** (reutilizar el del resumen, extraído a un helper compartido en el mismo
  archivo): "INNOLATTE", título **"Reporte detallado de pedidos"**, `Generado: <fecha>`
  con `formatDate(new Date())`, el `subtitulo` de filtros y el conteo de pedidos.
- **Por cada pedido** (en el orden de `pedidos`):
  - Línea de encabezado del bloque:
    `#<folio>  ·  <cliente: nombre_comercial || nombre>  ·  Distrito: <distrito>  ·
    <fecha>  ·  Estado: <label>  ·  Total: <formatCurrency(total)>`.
    (Incluye los detalles que ya se muestran: fecha, total, distrito, estado.)
  - `autoTable` con sus items: columnas **Código · Descripción · Cant. · P. unit. ·
    Subtotal**. La descripción combina `descripcion` + `sabor`/`presentacion` cuando
    existan. Si un pedido no tiene items (caso borde), mostrar una fila "Sin productos".
  - Encadenar `startY` usando `doc.lastAutoTable.finalY`; manejar **salto de página**:
    si no cabe el encabezado del siguiente bloque, `doc.addPage()` y reiniciar `startY`.
- **Cierre:** **gran total** = suma de `total` de todos los pedidos, al final.
- Nombre de archivo: `pedidos_detallado_<YYYY-MM-DD>.pdf` (el resumen mantiene
  `pedidos_<fecha>.pdf`). Usar fecha en zona local como ya se hace.

**Refactor mínimo.** Extraer el dibujado del membrete y el mapeo de estado
(`ESTADO_LABEL`) a helpers reutilizables dentro de `export-pdf-button.tsx` para que las
dos funciones (`generarResumen`, `generarDetallado`) los compartan. No se toca la
salida del resumen.

### Parte B — Editar estado y facturado desde la lista

En `app/(app)/pedidos/page.tsx`, las celdas **Estado** y **Facturado** de cada fila
pasan de estáticas a controles editables (Client Components nuevos). El resto de la
tabla (Server Component) no cambia.

- **`components/pedidos/pedido-estado-inline.tsx`** (`"use client"`):
  - Props: `{ id: string; estado: EstadoPedido }`.
  - `<select>` compacto (estilo acorde a la tabla) con las opciones de `ESTADOS_PEDIDO`.
  - `onChange` → `useTransition` → `actualizarEstado(id, nuevo)`; al terminar
    `router.refresh()`. Deshabilitado mientras `pending`; mini spinner.
  - En error: revertir visualmente (refrescar) y avisar de forma discreta.
- **`components/pedidos/pedido-facturado-inline.tsx`** (`"use client"`):
  - Props: `{ id: string; facturado: boolean }`.
  - Checkbox (mismo estilo que el del detalle) → `marcarFacturado(id, valor)` en
    transición + `router.refresh()`. Deshabilitado mientras `pending`.
- **Backend:** sin cambios. Se reutilizan `actualizarEstado` y `marcarFacturado`, que
  ya hacen `revalidatePath("/pedidos")` y `revalidatePath("/pedidos/<id>")`.

## Aislamiento / interfaces

- `getItemsDePedidos(ids)` → única responsabilidad: traer y agrupar items por pedido.
  Interfaz clara (entrada: ids; salida: mapa). Testeable de forma aislada.
- `export-pdf-button.tsx` → genera PDFs; depende de `pedidos` (props) y de
  `getItemsDePedidos` (solo para el detallado).
- `pedido-estado-inline` / `pedido-facturado-inline` → cada uno encapsula un control y
  su llamada a una acción de servidor; no comparten estado.

## Manejo de errores y casos borde

- `pedidos` vacío → botón de exportar deshabilitado (ambos formatos).
- Pedido sin items en el detallado → fila "Sin productos" en su bloque.
- Fallo de `getItemsDePedidos` → no se genera PDF; mensaje breve al usuario.
- Fallo de `actualizarEstado` / `marcarFacturado` → `router.refresh()` revierte el
  control al valor real; aviso discreto.
- PDF largo (muchos pedidos) → saltos de página por bloque para no cortar tablas.

## Verificación

- `npx tsc --noEmit` y `npm run build` deben pasar (el build hace type-check; no hay
  ESLint).
- Prueba manual:
  - Exportar **Resumen**: idéntico al actual.
  - Exportar **Detallado**: un bloque por pedido con sus productos, datos de cabecera
    (cliente, distrito, fecha, estado, total) y gran total; respeta filtros y orden.
  - Cambiar **estado** y **facturado** desde la lista: persiste y se refleja al
    refrescar; el detalle del pedido muestra el mismo valor.

## Archivos afectados

| Archivo | Cambio |
|--------|--------|
| `app/(app)/pedidos/actions.ts` | + `getItemsDePedidos(ids)` |
| `components/pedidos/export-pdf-button.tsx` | menú de 2 opciones + generador detallado + helpers compartidos |
| `components/pedidos/pedido-estado-inline.tsx` | **nuevo** — select de estado en línea |
| `components/pedidos/pedido-facturado-inline.tsx` | **nuevo** — checkbox de facturado en línea |
| `app/(app)/pedidos/page.tsx` | usar los controles en línea en las celdas Estado/Facturado |

## Fuera de alcance (YAGNI)

- No se cambia el orden ni las columnas del reporte resumen.
- No se agrupa el detallado por cliente (es un bloque por pedido).
- No se agregan chequeos de rol nuevos (se mantiene la paridad con el detalle).
- No se cambia el modelo de datos ni las migraciones.
