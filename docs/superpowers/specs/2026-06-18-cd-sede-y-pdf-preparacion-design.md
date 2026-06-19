# CD (sede que prepara) + PDF detallado como lista de preparación

**Fecha:** 2026-06-18
**Módulos:** `clientes`, `pedidos`

## Contexto y motivación

Feedback del usuario (dueño del negocio de congelados INNOLATTE):

1. **El PDF detallado por cliente no debe llevar precios.** Es una lista de
   preparación para imprimir; el personal solo necesita saber **qué lleva cada pedido**
   (productos y cantidades), no el dinero. Cita: *"no es necesario ponerle los precios
   sino solo lo que llevan"*.

2. **Nueva variable "CD" por cliente** = la sede que procesa/prepara el pedido:
   - **CD Planta** → planta de **Metapán** (prepara solo los pedidos de esa zona).
   - **CD Distribución** → sede de **Santa Ana** (todos los demás departamentos/distritos).
   El usuario quiere: (a) que el CD sea un campo del cliente, (b) poder **filtrar por CD**
   en la pestaña de Pedidos, (c) que el **PDF detallado separe la información por CD**
   (porque en Metapán solo preparan lo suyo), y (d) que el CD sea **modificable al armar
   un pedido**, igual que se puede cambiar la lista de precios (P) para un pedido puntual.

## Decisiones tomadas (brainstorming)

- **PDF detallado sin dinero:** se quitan columnas de precio de los productos
  (P. unit., Subtotal), el Total de la cabecera de cada bloque y el gran total.
- **Separación por CD:** el PDF detallado **siempre** se separa en secciones por CD
  (CD Planta primero, salto de página, luego CD Distribución), y además **respeta el
  filtro CD** activo (si filtras por una sede, solo sale esa).
- **Asignación de CD:** campo **editable** en el cliente. Backfill de los existentes por
  municipio (Metapán → `PLANTA`, resto → `DISTRIBUCION`), ajustable a mano después.
- **Override por pedido:** el CD se puede cambiar al armar el pedido (solo para ese
  pedido), igual que la lista P. Por eso el CD se guarda en el pedido (snapshot/override).
- **Etiquetas en pantalla/PDF:** "CD Planta" y "CD Distribución".
- **Reporte Resumen:** sin cambios (sin columna CD por ahora); solo hereda el filtro CD.

## Estado actual del código (hechos verificados)

- Esquema en `supabase/migrations/0001_init.sql`. Enums existentes: `rol`, `forma_pago`,
  `estado_pedido` (patrón `do $$ ... exception when duplicate_object`). `clientes` tiene
  `municipio`, `distrito`, `canal`, `lista_precios`. `pedidos` snapshotea `canal`,
  `forma_pago`, `direccion_entrega`, `lista_precios_aplicada` del cliente al crear.
- `lib/types.ts`: interfaces `Cliente`, `Pedido`, `PedidoConCliente` (extiende `Pedido`,
  con `cliente` parcial que ya incluye `distrito`), constantes como `ESTADOS_PEDIDO`,
  `LISTAS_PRECIOS`, `ETIQUETAS_LISTA`, `CANALES`, `FORMAS_PAGO`.
- `app/(app)/clientes/actions.ts`: `crearCliente`/`actualizarCliente` (solo admin),
  Zod `ClienteSchema` + `leer(formData)`. `components/clientes/cliente-form.tsx` arma el
  formulario (tarjeta "Comercial" tiene Canal, Lista, Forma de pago, Activo).
  `components/clientes/cliente-solo-lectura.tsx` es la vista para no-admin.
- `components/pedidos/order-builder.tsx`: `ClienteSelector` (incluye `lista_precios`),
  `PedidoInicial`, override de lista con estado `listaManual` (default
  `cliente.lista_precios`), `Select` "Lista de precios para este pedido", payload con
  `lista`. Se reinicia `listaManual` al cambiar de cliente.
- `app/(app)/pedidos/actions.ts`: `PedidoSchema` (con `lista` opcional override),
  `resolverPedido` (lee `cliente.lista_precios`, etc.), inserta/actualiza con
  `lista_precios_aplicada: r.lista`. `actualizarEstado`/`marcarFacturado` ya existen.
- `lib/data/pedidos.ts`: `getPedidos(filtros)` filtra `estado`/`facturado`/`desde`/`hasta`
  en DB, `producto` por pre-resolución de ids, `q` en memoria. Selecciona
  `cliente:clientes(id, codigo_cliente, nombre, nombre_comercial, distrito)`.
- `app/(app)/pedidos/page.tsx`: arma `subtitulo` de filtros, usa `FilterSelect`
  (`components/app/filter-select.tsx`, filtro por parámetro de URL), tabla con columnas
  Folio/Cliente/Distrito/Fecha/Estado/Facturado/Total, y `ExportPdfButton`.
- `components/pedidos/export-pdf-button.tsx`: menú con "Resumen" y "Detallado por
  cliente"; el detallado arma bloque por pedido vía `getItemsDePedidos`.
- `app/(app)/pedidos/[id]/page.tsx`: comprobante con grid Canal/Pago/Lista.

## Diseño

### A. Migración `supabase/migrations/0003_cd_sede.sql`

```sql
-- Enum de sede (sigue el patrón de los enums existentes).
do $$ begin
  create type cd_sede as enum ('PLANTA', 'DISTRIBUCION');
exception when duplicate_object then null; end $$;

-- Columna en clientes (default DISTRIBUCION para filas existentes).
alter table public.clientes
  add column if not exists cd cd_sede not null default 'DISTRIBUCION';

-- Backfill: clientes de Metapán -> PLANTA.
update public.clientes set cd = 'PLANTA'
  where municipio ilike '%metap%';

-- Columna en pedidos (snapshot/override; default para filas existentes).
alter table public.pedidos
  add column if not exists cd cd_sede not null default 'DISTRIBUCION';

-- Backfill: cada pedido toma el CD de su cliente.
update public.pedidos p set cd = c.cd
  from public.clientes c where p.cliente_id = c.id;

create index if not exists idx_clientes_cd on public.clientes (cd);
create index if not exists idx_pedidos_cd on public.pedidos (cd);
```

> No hay RLS nueva: `clientes` y `pedidos` ya tienen políticas; la columna las hereda.
> La migración debe correrse en Supabase **antes** de desplegar (las consultas que
> seleccionan `cd` fallarían si la columna no existe).

### B. Tipos (`lib/types.ts`)

- `export type CdSede = "PLANTA" | "DISTRIBUCION";`
- `export const CD_SEDES: { value: CdSede; label: string }[] = [{ value: "PLANTA", label: "CD Planta" }, { value: "DISTRIBUCION", label: "CD Distribución" }];`
- Añadir `cd: CdSede` a `Cliente` y a `Pedido` (por herencia, `PedidoConCliente` lo tiene).

### C. Cliente: campo CD editable

- `cliente-form.tsx`: en la tarjeta "Comercial", un `Select` **CD** (`name="cd"`,
  opciones de `CD_SEDES`, `defaultValue={cliente?.cd ?? "DISTRIBUCION"}`).
- `clientes/actions.ts`: añadir `cd: z.enum(["PLANTA", "DISTRIBUCION"])` al `ClienteSchema`
  y `cd: formData.get("cd")` en `leer()`. (Sin default explícito: el form siempre envía un
  valor; si faltara, Zod lo rechaza — aceptable porque el `Select` siempre tiene valor.)
- `cliente-solo-lectura.tsx` y el detalle del cliente: mostrar el CD (etiqueta de
  `CD_SEDES`) junto a los demás datos comerciales.

### D. Pedido: override de CD (espejo de la lista P)

- `order-builder.tsx`:
  - `ClienteSelector` gana `cd: CdSede`.
  - Estado `cdManual: CdSede | null` (default `null`); CD efectivo =
    `cdManual ?? cliente.cd`. Se reinicia a `null` al cambiar de cliente (mismo `useEffect`
    que `listaManual`).
  - `Select` **"CD para este pedido"** junto al de lista, opciones `CD_SEDES`, marcando la
    del cliente como "(predeterminada)"; aviso "Cambio solo para este pedido" cuando
    difiere.
  - El `payload` incluye `cd: cdEfectivo`.
- `pedidos/actions.ts`:
  - `PedidoSchema` gana `cd: z.enum(["PLANTA", "DISTRIBUCION"]).optional()`.
  - `resolverPedido` selecciona también `cliente.cd` y devuelve el CD resuelto =
    `input.cd ?? cliente.cd`.
  - `crearPedido` y `actualizarPedido` guardan `cd` en la fila de pedido.
- Las páginas que renderizan `OrderBuilder` (`pedidos/nuevo/page.tsx`,
  `pedidos/[id]/editar/page.tsx`) deben incluir `cd` en el selector de clientes y, al
  editar, en `PedidoInicial` (que gana `cd: CdSede`).
- `pedidos/[id]/page.tsx`: mostrar el CD (etiqueta) en el grid Canal/Pago/Lista del
  comprobante.

### E. Filtro CD en la lista de pedidos

- `lib/data/pedidos.ts`: `FiltrosPedidos` gana `cd?: string`; si viene, `query.eq("cd", cd)`
  (columna de `pedidos`, filtro en DB como `estado`).
- `app/(app)/pedidos/page.tsx`:
  - Nuevo `FilterSelect param="cd"` con `allLabel="CD: todos"` y opciones de `CD_SEDES`.
  - Añadir el CD al `subtitulo` del PDF cuando esté activo.
  - Nueva columna **CD** en la tabla (etiqueta de `CD_SEDES`).
  - `searchParams` gana `cd?: string` y se pasa a `getPedidos`.

### F. PDF detallado: sin dinero y separado por CD

En `components/pedidos/export-pdf-button.tsx`, `generarDetallado`:

- **Quitar dinero:** tabla de items con columnas **Código · Descripción · Cant.**
  (sin P. unit. ni Subtotal). Cabecera de bloque:
  `#folio · cliente · Distrito · fecha · Estado` (sin Total). Sin gran total al final.
- **Separar por CD:** partir `pedidos` en dos grupos por `p.cd` preservando el orden.
  Para cada CD presente (PLANTA primero, luego DISTRIBUCION):
  - Si no es la primera sección, `doc.addPage()` para empezar en página nueva.
  - Título de sección grande con la etiqueta ("CD Planta" / "CD Distribución") y el conteo
    de pedidos de esa sección.
  - Debajo, los bloques por pedido (como hoy, pero sin dinero), con su manejo de salto de
    página y el caso "Sin productos".
  - Si el filtro CD está activo, solo existirá una sección (no hay lógica extra: el grupo
    vacío simplemente no se dibuja).
- El membrete (`dibujarMembrete`) no cambia; el subtítulo ya incluye el CD filtrado.
- **Reporte Resumen (`generarResumen`): sin cambios.**

## Aislamiento / interfaces

- La migración es autocontenida e idempotente (`if not exists`, enum con guardia).
- `CdSede`/`CD_SEDES` centralizan valores y etiquetas; todo el resto los reutiliza.
- El override de CD reusa exactamente el patrón del override de lista (mismo lugar, mismo
  ciclo de vida de estado), minimizando superficie nueva.
- `generarDetallado` agrupa por CD en memoria; sin dependencias nuevas.

## Manejo de errores y casos borde

- Cliente eliminado (pedido con `cliente_id` null): `pedidos.cd` ya está snapshoteado, así
  que el filtro y la separación del PDF siguen funcionando aunque falte el cliente.
- Sección de CD vacía: no se dibuja (no genera página en blanco).
- Pedido sin items: fila "Sin productos" (como hoy).
- El `Select` de CD siempre envía valor; Zod rechaza valores inválidos.
- Override de CD: el servidor recalcula `cd = input.cd ?? cliente.cd` (no confía en el
  navegador), consistente con el manejo de la lista.

## Verificación

- `npx tsc --noEmit` y `npm run build` deben pasar.
- Manual:
  - Correr la migración en Supabase; confirmar que clientes de Metapán quedaron en
    CD Planta y los pedidos tomaron el CD de su cliente.
  - Editar un cliente y cambiar su CD; crear un pedido y cambiar el CD solo para ese
    pedido; verificar que persiste (detalle del pedido muestra el CD correcto).
  - Filtrar pedidos por CD; exportar **Detallado**: dos secciones (Planta / Distribución)
    en páginas separadas, sin precios ni totales; con filtro CD activo, una sola sección.
  - Exportar **Resumen**: igual que antes.

## Archivos afectados

| Archivo | Cambio |
|--------|--------|
| `supabase/migrations/0003_cd_sede.sql` | **nuevo** — enum + columnas + backfill + índices |
| `lib/types.ts` | `CdSede`, `CD_SEDES`, campo `cd` en `Cliente` y `Pedido` |
| `components/clientes/cliente-form.tsx` | Select CD en tarjeta Comercial |
| `app/(app)/clientes/actions.ts` | `cd` en Zod schema y en `leer()` |
| `components/clientes/cliente-solo-lectura.tsx` | mostrar CD |
| `app/(app)/clientes/[id]/page.tsx` | mostrar CD (si aplica en la vista) |
| `components/pedidos/order-builder.tsx` | override CD (Select + estado + payload) |
| `app/(app)/pedidos/actions.ts` | `cd` en schema, `resolverPedido`, insert/update |
| `app/(app)/pedidos/nuevo/page.tsx` · `[id]/editar/page.tsx` | pasar `cd` al builder |
| `lib/data/pedidos.ts` | filtro `cd` |
| `app/(app)/pedidos/page.tsx` | FilterSelect CD + columna + subtítulo + searchParams |
| `components/pedidos/export-pdf-button.tsx` | detallado sin dinero + secciones por CD |
| `app/(app)/pedidos/[id]/page.tsx` | mostrar CD en el comprobante |

## Fuera de alcance (YAGNI)

- Columna CD en el reporte Resumen (PDF).
- Derivar el CD automáticamente del municipio en tiempo real (se decide con backfill +
  edición manual; el campo es la fuente de verdad).
- Cambios de RLS o de roles.
