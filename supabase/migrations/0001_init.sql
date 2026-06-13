-- ============================================================
-- INNOLATTE · Esquema inicial de la base de datos
-- Pegar este archivo completo en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- ---------- Tipos (enums) ----------
do $$ begin
  create type rol as enum ('admin', 'vendedor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forma_pago as enum ('CONTADO', 'CREDITO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pedido as enum ('PENDIENTE', 'EN_RUTA', 'ENTREGADO', 'CANCELADO');
exception when duplicate_object then null; end $$;

-- ---------- Utilidad: actualizar updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- PERFILES (usuarios del personal)
-- ============================================================
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  rol         rol not null default 'vendedor',
  created_at  timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando se registra un usuario en Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'vendedor')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: ¿el usuario actual es admin? (SECURITY DEFINER evita recursión de RLS)
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ============================================================
-- CLIENTES
-- ============================================================
create table if not exists public.clientes (
  id                 uuid primary key default gen_random_uuid(),
  codigo_cliente     text unique not null,
  nombre             text not null,
  nombre_comercial   text,
  telefono           text,
  correo             text,
  contacto_nombre    text,
  contacto_telefono  text,
  direccion_fiscal   text,
  direccion_entrega  text,
  departamento       text,
  municipio          text,
  distrito           text,
  canal              text,
  lista_precios      int not null default 2,
  forma_pago         forma_pago not null default 'CONTADO',
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_clientes_nombre on public.clientes (lower(nombre));
create index if not exists idx_clientes_canal on public.clientes (canal);

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

-- ============================================================
-- PRODUCTOS
-- ============================================================
create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique not null,
  descripcion   text not null,
  categoria     text,
  familia       text,
  sabor         text,
  presentacion  text,
  peso_kg       numeric(10,3),
  costo         numeric(10,4),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_productos_categoria on public.productos (categoria);
create index if not exists idx_productos_descripcion on public.productos (lower(descripcion));

drop trigger if exists trg_productos_updated on public.productos;
create trigger trg_productos_updated before update on public.productos
  for each row execute function public.set_updated_at();

-- ============================================================
-- PRECIOS POR LISTA (P1..P20)  — una fila por (producto, lista)
-- ============================================================
create table if not exists public.producto_precios (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references public.productos(id) on delete cascade,
  lista        int not null check (lista between 1 and 20),
  precio       numeric(10,2) not null,
  unique (producto_id, lista)
);
create index if not exists idx_precios_producto on public.producto_precios (producto_id);

-- ============================================================
-- PEDIDOS
-- ============================================================
create sequence if not exists public.pedido_folio_seq start 1000;

create table if not exists public.pedidos (
  id                      uuid primary key default gen_random_uuid(),
  folio                   bigint not null default nextval('public.pedido_folio_seq') unique,
  cliente_id              uuid references public.clientes(id) on delete set null,
  fecha                   date not null default current_date,
  canal                   text,
  forma_pago              forma_pago,
  direccion_entrega       text,
  lista_precios_aplicada  int not null default 2,
  estado                  estado_pedido not null default 'PENDIENTE',
  facturado               boolean not null default false,
  subtotal                numeric(12,2) not null default 0,
  total                   numeric(12,2) not null default 0,
  notas                   text,
  creado_por              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_pedidos_cliente on public.pedidos (cliente_id);
create index if not exists idx_pedidos_fecha on public.pedidos (fecha desc);
create index if not exists idx_pedidos_estado on public.pedidos (estado);

drop trigger if exists trg_pedidos_updated on public.pedidos;
create trigger trg_pedidos_updated before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ============================================================
-- LÍNEAS DEL PEDIDO (snapshot inmutable de cada producto)
-- ============================================================
create table if not exists public.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references public.pedidos(id) on delete cascade,
  producto_id      uuid references public.productos(id) on delete set null,
  codigo           text not null,
  descripcion      text not null,
  sabor            text,
  presentacion     text,
  cantidad         int not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null,
  subtotal         numeric(12,2) not null
);
create index if not exists idx_items_pedido on public.pedido_items (pedido_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Regla: todo el personal autenticado puede LEER. Solo admin
-- modifica clientes/productos/precios. Admin y vendedor crean pedidos.
-- ============================================================
alter table public.perfiles          enable row level security;
alter table public.clientes          enable row level security;
alter table public.productos         enable row level security;
alter table public.producto_precios  enable row level security;
alter table public.pedidos           enable row level security;
alter table public.pedido_items      enable row level security;

-- PERFILES
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated using (true);
drop policy if exists perfiles_update_admin on public.perfiles;
create policy perfiles_update_admin on public.perfiles
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- CLIENTES
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated using (true);
drop policy if exists clientes_write_admin on public.clientes;
create policy clientes_write_admin on public.clientes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- PRODUCTOS
drop policy if exists productos_select on public.productos;
create policy productos_select on public.productos
  for select to authenticated using (true);
drop policy if exists productos_write_admin on public.productos;
create policy productos_write_admin on public.productos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- PRECIOS
drop policy if exists precios_select on public.producto_precios;
create policy precios_select on public.producto_precios
  for select to authenticated using (true);
drop policy if exists precios_write_admin on public.producto_precios;
create policy precios_write_admin on public.producto_precios
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- PEDIDOS (admin y vendedor crean/editan; solo admin borra)
drop policy if exists pedidos_select on public.pedidos;
create policy pedidos_select on public.pedidos
  for select to authenticated using (true);
drop policy if exists pedidos_insert on public.pedidos;
create policy pedidos_insert on public.pedidos
  for insert to authenticated with check (true);
drop policy if exists pedidos_update on public.pedidos;
create policy pedidos_update on public.pedidos
  for update to authenticated using (true) with check (true);
drop policy if exists pedidos_delete_admin on public.pedidos;
create policy pedidos_delete_admin on public.pedidos
  for delete to authenticated using (public.es_admin());

-- PEDIDO_ITEMS
drop policy if exists items_select on public.pedido_items;
create policy items_select on public.pedido_items
  for select to authenticated using (true);
drop policy if exists items_insert on public.pedido_items;
create policy items_insert on public.pedido_items
  for insert to authenticated with check (true);
drop policy if exists items_update on public.pedido_items;
create policy items_update on public.pedido_items
  for update to authenticated using (true) with check (true);
drop policy if exists items_delete on public.pedido_items;
create policy items_delete on public.pedido_items
  for delete to authenticated using (true);
