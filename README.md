# INNOLATTE · Sistema de Toma de Pedidos

App web interna para administrar **clientes**, el **catálogo de productos con precios por
lista (P1–P8)** y la **toma de pedidos** con cálculo de precio automático según el cliente.

Construida con **Next.js 15 + Supabase (Postgres) + Tailwind CSS**.

---

## 🧠 Cómo funcionan los precios (lo más importante)

Cada cliente tiene una **lista de precios** (un número del 1 al 8). Ese número indica qué
columna de precio se le cobra:

- `P2` = precio estándar
- `P4` = precio distribuidor
- `P1, P3, P5…` = precios preferenciales

> Ejemplo: un cliente con **lista 4** paga el precio **P4** de cada producto. La app lo
> resuelve sola al armar el pedido. Si un producto **no tiene precio** en la lista de ese
> cliente, la app lo marca en rojo y **no deja cerrar** esa línea (no inventa un precio).

---

## ✅ Requisitos

- **Node.js 18+** (probado con Node 24). Descarga: https://nodejs.org
- Una cuenta gratuita de **Supabase**: https://supabase.com
- El archivo **`TOMA DE PEDIDOS.xlsx`** (la base de datos original).

---

## 🚀 Puesta en marcha (paso a paso)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea un proyecto nuevo (guarda la contraseña de la BD).
2. Ve a **SQL Editor → New query**, abre el archivo
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), copia **todo**
   su contenido, pégalo y pulsa **Run**. Esto crea todas las tablas, la seguridad por
   roles y los disparadores.

### 3. Configurar las claves (.env.local)
1. En Supabase ve a **Settings → API**.
2. Copia el archivo `.env.example` a `.env.local` y rellena:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co     # "Project URL"
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                  # clave "anon public"
   SUPABASE_SERVICE_ROLE_KEY=eyJ...                      # clave "service_role" (secreta)
   ```

### 4. Crear el primer usuario (administrador)
1. En Supabase ve a **Authentication → Users → Add user** y crea un usuario con correo y
   contraseña (este será el personal que inicia sesión).
2. Conviértelo en **administrador**: ve a **SQL Editor** y ejecuta (cambia el correo):
   ```sql
   update public.perfiles
   set rol = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```
   > Los demás usuarios que crees serán **vendedores** por defecto (pueden tomar pedidos y
   > consultar, pero no editar precios ni clientes).

### 5. Importar el Excel a la base de datos
Con `.env.local` ya configurado, ejecuta (ajusta la ruta a tu archivo):
```bash
npm run import:excel -- "C:/Users/Daniel/Downloads/TOMA DE PEDIDOS.xlsx"
```
Esto carga los **223 clientes** y los **~160 productos** con sus precios P1–P8. Es
**idempotente**: puedes correrlo de nuevo y solo actualiza.

### 6. Arrancar la app en local
```bash
npm run dev
```
Abre **http://localhost:3000**, inicia sesión y listo.

---

## ☁️ Despliegue en la nube (Vercel)

1. Sube este proyecto a un repositorio de GitHub.
2. Entra a https://vercel.com → **Add New → Project** → importa el repo.
3. En **Environment Variables** pega las 3 variables de `.env.local`.
4. **Deploy**. Vercel te dará una URL pública (puedes conectar tu dominio después).

> Supabase y Vercel tienen planes gratuitos suficientes para empezar.

---

## 👥 Roles

| Acción                         | Admin | Vendedor |
|--------------------------------|:-----:|:--------:|
| Tomar / editar pedidos         |  ✅   |    ✅    |
| Consultar clientes y catálogo  |  ✅   |    ✅    |
| Crear / editar clientes        |  ✅   |    ❌    |
| Editar productos y precios     |  ✅   |    ❌    |

La seguridad está aplicada en la base de datos (RLS de Supabase), no solo en la interfaz.

---

## 🗂️ Estructura del proyecto

```
app/(app)/            Páginas internas (dashboard, clientes, catálogo, pedidos)
app/login/            Inicio de sesión
lib/pricing.ts        Motor de precios (lista del cliente -> columna P)
lib/data/             Consultas a la base (clientes, productos, pedidos)
lib/supabase/         Clientes de Supabase (navegador, servidor, middleware)
supabase/migrations/  Esquema SQL (tablas + seguridad)
scripts/import-excel  Importador del Excel
components/            Interfaz (UI base + módulos)
```

---

## ✔️ Cómo verificar que funciona

1. Inicia sesión y ve a **Catálogo**: deben aparecer ~160 productos.
2. Abre un producto: verás la matriz de precios **P1–P8** (editable solo como admin).
3. Ve a **Clientes**: ~223 registros, cada uno con su **lista** (P2, P4, etc.).
4. **Prueba clave de precios:** crea un pedido para un cliente con **lista 4** y otro con
   **lista 2**; el mismo producto mostrará precios distintos (P4 vs P2) automáticamente.
5. Agrega un producto que no tenga precio en la lista del cliente → se marca en rojo y
   bloquea el guardado.
6. Guarda un pedido y ábrelo: el comprobante es **imprimible** (botón Imprimir).

---

## 🔜 Fase 2 (siguiente etapa, fuera de esta entrega)

Portal público para clientes: catálogo **sin precios**, el cliente arma su pedido y el
personal lo cotiza/confirma.
