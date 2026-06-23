# CLAUDE.md — INNOLATTE · Sistema de Toma de Pedidos

App web interna para una empresa de congelados (paletas, yogurt, mezclas). Administra
**clientes**, **catálogo con precios por lista**, **toma de pedidos** con precio
automático, **analítica** y **rutas de entrega**. Responder al usuario en **español**.

## Stack y comandos
- **Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres/Auth/RLS)**.
- jsPDF + jspdf-autotable (PDFs cliente), Zod (validación), exceljs (script de import).
- Comandos: `npm run dev` · `npm run build` · `npm run import:excel -- "<ruta xlsx>"`.
- Verificar SIEMPRE con `npx tsc --noEmit` y `npm run build` antes de hacer commit.
- No hay ESLint configurado; el build hace type-check.

## Convenciones (seguir el patrón existente)
- **Server Components** por defecto; `export const dynamic = "force-dynamic"` en páginas que leen datos.
- **Server Actions** en `app/(app)/<modulo>/actions.ts` (validan con Zod, revalidatePath, chequean rol admin cuando aplica).
- Datos: helpers en `lib/data/*.ts` (clientes, productos, pedidos, analytics, rutas).
- UI: componentes base en `components/ui/*` (estilo shadcn hecho a mano), módulos en `components/<modulo>/*`.
- Filtros de lista = parámetros en la URL (`components/app/filter-select.tsx`, `search-input.tsx`, `date-range-filter.tsx`).
- Moneda **USD**. Los precios admiten **hasta 6 decimales** (para cuadrar sin/con IVA exacto): `round6` para la tubería de precios, `round2` para sumas/reportes agregados. `formatCurrency` muestra mínimo 2 y hasta 6 decimales (omite ceros sobrantes). Helpers en `lib/utils.ts`. Columnas de dinero en BD son `numeric(_,6)` (migración `0004`).
- **Fechas: usar `hoyISO()` y `formatDate()` de `lib/utils.ts`** — calculan/ muestran en zona `America/El_Salvador` (UTC-6). NO usar `new Date().toISOString()` para "hoy" (desfasa de noche).

## Reglas de negocio clave
- **Precios por lista:** cada cliente tiene `lista_precios` (1–20) = la columna P que se le cobra (P2=estándar, P4=distribuidor). Motor: `lib/pricing.ts` → `resolverPrecio(producto, lista)`. Sin fallback silencioso (si falta precio → "sin precio", bloquea la línea).
- **MEZCLAS:** se cotizan desde **P4** (sus precios viven en P4–P8; P1–P3 vacías). Implementado en `resolverPrecio`.
- **IVA 13%:** el catálogo es SIN IVA. El pedido guarda `subtotal` (sin IVA) y `total` (con IVA = subtotal×1.13). El IVA se deriva (`total − subtotal`). Helpers `calcularIva` / `calcularTotalConIva`. Pedidos previos a esta función quedaron sin IVA (se recalcularon a mano una vez).
- **Precio editable por línea** y **override de lista por pedido** en el armador; el servidor recalcula precios (no confía en el navegador) salvo el precio manual.
- **Código de producto** = `CATEGORÍA(3) + FAMILIA(P##) + SABOR(3) + PRESENTACIÓN(2)`, ancho fijo 11 (ej. `CONP01FRE02`). Los códigos cortos se derivan por slicing del código existente (no se guardan aparte). Alta en `/catalogo/nuevo`.
- **Roles:** `admin` (CRUD total) y `vendedor` (toma pedidos, consulta; NO edita precios/clientes/rutas). Aplicado con RLS (`es_admin()`) y chequeos en server actions/UI.

## Modelo de datos (Supabase)
Tablas: `perfiles` (rol), `clientes`, `productos`, `producto_precios` (lista→precio),
`pedidos` (subtotal/total/estado/facturado/lista_precios_aplicada, snapshots del cliente),
`pedido_items` (snapshot inmutable), `rutas` (horario semanal: grupo, dia, cd, distritos[]).
Migraciones en `supabase/migrations/` (`0001_init.sql`, `0002_rutas.sql`).

## Operación / despliegue
- **GitHub:** `https://github.com/dann1103-eng/INNOLATTE` (rama `main`). Commits con email noreply de GitHub (privacidad activada). Hacer commit/push tras cada cambio verificado.
- **Vercel** (auto-deploy de `main`). `vercel.json` fija `framework: nextjs` y un **cron diario** `/api/keepalive` que evita que Supabase free se pause (~7 días inactividad). Proteger con env `CRON_SECRET`.
- **Supabase** proyecto ref `bjddfjsktlzrpqdsdksz`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo local/import), `CRON_SECRET` (Vercel). Secretos en `.env.local` (gitignored) — NUNCA commitearlos.
- **Migraciones nuevas:** no hay forma de correr DDL vía API; el usuario las pega en **Supabase → SQL Editor**. La app debe degradar con gracia si una tabla nueva aún no existe (ej. `getRutas` devuelve `[]`).
- **Promover admin:** `update perfiles set rol='admin' where id=(select id from auth.users where email='...')` (o PATCH REST con service role). Requiere **re-login** del usuario para tomar efecto.
- **Impresión de comprobante:** el detalle de pedido usa `window.print()`; lo que no debe imprimirse lleva la clase `no-print` (sidebar, controles).

## Estado actual
Fase 1 + muchas mejoras completas y en producción. **Fase 2 pendiente:** portal público para
clientes (catálogo sin precios, el cliente arma pedido y el personal cotiza).
