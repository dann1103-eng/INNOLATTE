-- ============================================================
-- INNOLATTE · Horario de rutas (editable)
-- Pegar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists public.rutas (
  id         uuid primary key default gen_random_uuid(),
  grupo      text not null,                 -- 'Semana 1 y 3' | 'Semana 2 y 4'
  dia        text not null,                 -- 'Lunes' .. 'Sábado'
  cd         text,                          -- centro de distribución (ej. 'CD 1')
  distritos  text[] not null default '{}',
  orden      int not null default 0,        -- para ordenar los días
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo, dia)
);

drop trigger if exists trg_rutas_updated on public.rutas;
create trigger trg_rutas_updated before update on public.rutas
  for each row execute function public.set_updated_at();

alter table public.rutas enable row level security;

drop policy if exists rutas_select on public.rutas;
create policy rutas_select on public.rutas
  for select to authenticated using (true);

drop policy if exists rutas_write_admin on public.rutas;
create policy rutas_write_admin on public.rutas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------- Seed del horario actual (solo si la tabla está vacía) ----------
insert into public.rutas (grupo, dia, cd, orden, distritos)
select * from (values
  ('Semana 1 y 3', 'Lunes',     'CD 1', 1, array['SOYAPANGO','ILOPANGO','SAN SALVADOR','CIUDAD DELGADO']),
  ('Semana 1 y 3', 'Martes',    'CD 7', 2, array['SAN MARCOS','OLOCUILTA','SAN LUIS TALPA','SANTIAGO NONUALCO','ZACATECOLUCA']),
  ('Semana 1 y 3', 'Miércoles', 'CD 5', 3, array['NEJAPA','QUEZALTEPEQUE','APOPA','AGUILARES','CIUDAD DELGADO']),
  ('Semana 1 y 3', 'Jueves',    'CD 4', 4, array['ANTIGUO CUSCATLÁN','SAN SALVADOR','MEJICANOS']),
  ('Semana 1 y 3', 'Viernes',   'CD 6', 5, array[]::text[]),
  ('Semana 1 y 3', 'Sábado',    'CD 6', 6, array[]::text[]),
  ('Semana 2 y 4', 'Lunes',     'CD 1', 1, array['SOYAPANGO','ILOPANGO','SAN SALVADOR','TONACATEPEQUE']),
  ('Semana 2 y 4', 'Martes',    'CD 2', 2, array['SAN JUAN OPICO','NEJAPA','COJUTEPEQUE','APASTEPEQUE','SAN VICENTE','ILOBASCO']),
  ('Semana 2 y 4', 'Miércoles', 'CD 5', 3, array['SAN JUAN OPICO','NEJAPA','QUEZALTEPEQUE','APOPA','AGUILARES','SUCHITOTO']),
  ('Semana 2 y 4', 'Jueves',    'CD 3', 4, array['COLÓN','SANTA TECLA','ZARAGOZA','LA LIBERTAD']),
  ('Semana 2 y 4', 'Viernes',   'CD 4', 5, array['ANTIGUO CUSCATLÁN','SAN SALVADOR','MEJICANOS']),
  ('Semana 2 y 4', 'Sábado',    'CD 6', 6, array[]::text[])
) as v(grupo, dia, cd, orden, distritos)
where not exists (select 1 from public.rutas);
