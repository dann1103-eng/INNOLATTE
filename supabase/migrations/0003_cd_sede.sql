-- ============================================================
-- INNOLATTE · CD (sede que prepara el pedido)
-- Pegar este archivo completo en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================
-- Agrega la variable "CD" (centro de distribución / sede):
--   PLANTA       -> planta de Metapán (prepara solo los pedidos de esa zona)
--   DISTRIBUCION -> sede de Santa Ana (todos los demás)
-- Es un campo del cliente (su CD por defecto) y se snapshotea en cada pedido,
-- donde puede sobreescribirse para ese pedido (igual que la lista de precios).
-- ============================================================

-- Enum de sede (sigue el patrón de los enums existentes).
do $$ begin
  create type cd_sede as enum ('PLANTA', 'DISTRIBUCION');
exception when duplicate_object then null; end $$;

-- ---------- CLIENTES ----------
alter table public.clientes
  add column if not exists cd cd_sede not null default 'DISTRIBUCION';

-- Backfill: los clientes de Metapán pasan a CD Planta. El resto queda en
-- DISTRIBUCION (el default). Ajustable a mano después.
update public.clientes set cd = 'PLANTA'
  where municipio ilike '%metap%';

create index if not exists idx_clientes_cd on public.clientes (cd);

-- ---------- PEDIDOS ----------
alter table public.pedidos
  add column if not exists cd cd_sede not null default 'DISTRIBUCION';

-- Backfill: cada pedido existente toma el CD de su cliente.
update public.pedidos p set cd = c.cd
  from public.clientes c where p.cliente_id = c.id;

create index if not exists idx_pedidos_cd on public.pedidos (cd);
