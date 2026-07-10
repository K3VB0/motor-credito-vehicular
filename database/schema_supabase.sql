-- Base de datos para Motor de Credito Vehicular
-- Ejecutar en Supabase SQL Editor o con psql/supabase db push.

create extension if not exists "pgcrypto";

-- Perfil de aplicacion, uno a uno con auth.users.
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text,
  rol text not null default 'asesor',
  creado_en timestamptz not null default now(),
  constraint perfiles_rol_valido check (rol in ('admin', 'asesor', 'cliente'))
);

-- El perfil se crea solo cuando el usuario se registra (signUp manda 'nombre').
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.perfiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.crear_perfil_nuevo_usuario();

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nombres text not null,
  apellidos text not null,
  dni text not null,
  email text,
  telefono text,
  direccion text,
  ingresos_mes numeric(14,2),
  empleador text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint clientes_dni_unico unique (dni),
  constraint clientes_dni_formato check (dni ~ '^[0-9]{8}$'),
  constraint clientes_ingresos_no_negativos check (ingresos_mes is null or ingresos_mes >= 0)
);

create table if not exists public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  marca text not null,
  modelo text not null,
  anio integer not null,
  version text,
  color text,
  placa text,
  precio_venta numeric(14,2) not null,
  moneda text not null default 'PEN',
  disponible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint vehiculos_anio_rango check (anio between 1990 and 2099),
  constraint vehiculos_precio_no_negativo check (precio_venta >= 0),
  constraint vehiculos_moneda_valida check (moneda in ('PEN', 'USD'))
);

create unique index if not exists vehiculos_placa_unica
  on public.vehiculos (placa)
  where placa is not null and placa <> '';

create table if not exists public.simulaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  moneda text not null default 'PEN',
  precio_venta numeric(14,2) not null,
  pct_cuota_inicial numeric(12,8) not null default 0,
  cuota_inicial numeric(14,2) not null default 0,
  capital_total numeric(14,2) not null default 0,
  plazo_meses integer not null,
  tipo_tasa text not null,
  valor_tasa numeric(12,8) not null default 0,
  capitalizacion integer not null default 12,
  gracia_total integer not null default 0,
  gracia_parcial integer not null default 0,
  pct_balon numeric(12,8) not null default 0,
  cuota_balon numeric(14,2) not null default 0,
  cuota_ordinaria numeric(14,2) not null default 0,
  tea numeric(12,8) not null default 0,
  tep numeric(12,8) not null default 0,
  tcea numeric(12,8) not null default 0,
  van numeric(14,2) not null default 0,
  tir_mensual numeric(12,8) not null default 0,
  total_interes numeric(14,2) not null default 0,
  total_pagado numeric(14,2) not null default 0,
  costes_iniciales numeric(14,2) not null default 0,
  cuota_final numeric(14,2) not null default 0,
  pct_seg_desgravamen numeric(12,8) not null default 0,
  pct_seg_riesgo numeric(12,8) not null default 0,
  gps numeric(14,2) not null default 0,
  portes numeric(14,2) not null default 0,
  gastos_adm numeric(14,2) not null default 0,
  cok numeric(12,8) not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint simulaciones_moneda_valida check (moneda in ('PEN', 'USD')),
  constraint simulaciones_tipo_tasa_valida check (tipo_tasa in ('TEA', 'TNA')),
  constraint simulaciones_plazo_valido check (plazo_meses > 0),
  constraint simulaciones_gracia_valida check (gracia_total >= 0 and gracia_parcial >= 0 and gracia_total + gracia_parcial < plazo_meses)
);

create table if not exists public.cronograma (
  id uuid primary key default gen_random_uuid(),
  simulacion_id uuid not null references public.simulaciones(id) on delete cascade,
  numero_cuota integer not null,
  tipo_pg text,
  saldo_inicial numeric(16,6) not null default 0,
  interes numeric(16,6) not null default 0,
  amortizacion numeric(16,6) not null default 0,
  cuota numeric(16,6) not null default 0,
  saldo_final numeric(16,6) not null default 0,
  saldo_inicial_cf numeric(16,6) not null default 0,
  interes_cf numeric(16,6) not null default 0,
  amort_cf numeric(16,6) not null default 0,
  seg_des_cf numeric(16,6) not null default 0,
  saldo_final_cf numeric(16,6) not null default 0,
  seg_des numeric(16,6) not null default 0,
  seg_rie numeric(16,6) not null default 0,
  gps numeric(16,6) not null default 0,
  portes numeric(16,6) not null default 0,
  gastos_adm numeric(16,6) not null default 0,
  creado_en timestamptz not null default now(),
  constraint cronograma_cuota_unica unique (simulacion_id, numero_cuota),
  constraint cronograma_tipo_pg_valido check (tipo_pg in ('', 'T', 'P', 'S') or tipo_pg is null)
);

create index if not exists clientes_usuario_idx on public.clientes(usuario_id);
create index if not exists vehiculos_usuario_idx on public.vehiculos(usuario_id);
create index if not exists simulaciones_usuario_idx on public.simulaciones(usuario_id);
create index if not exists simulaciones_cliente_idx on public.simulaciones(cliente_id);
create index if not exists simulaciones_vehiculo_idx on public.simulaciones(vehiculo_id);
create index if not exists cronograma_simulacion_idx on public.cronograma(simulacion_id);

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists set_clientes_actualizado_en on public.clientes;
create trigger set_clientes_actualizado_en
before update on public.clientes
for each row execute function public.set_actualizado_en();

drop trigger if exists set_vehiculos_actualizado_en on public.vehiculos;
create trigger set_vehiculos_actualizado_en
before update on public.vehiculos
for each row execute function public.set_actualizado_en();

drop trigger if exists set_simulaciones_actualizado_en on public.simulaciones;
create trigger set_simulaciones_actualizado_en
before update on public.simulaciones
for each row execute function public.set_actualizado_en();

alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.simulaciones enable row level security;
alter table public.cronograma enable row level security;

drop policy if exists "perfiles_select_propio" on public.perfiles;
create policy "perfiles_select_propio"
on public.perfiles for select
using (auth.uid() = id);

drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio"
on public.perfiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "clientes_select_propios" on public.clientes;
create policy "clientes_select_propios"
on public.clientes for select
using (auth.uid() = usuario_id);

drop policy if exists "clientes_insert_propios" on public.clientes;
create policy "clientes_insert_propios"
on public.clientes for insert
with check (auth.uid() = usuario_id);

drop policy if exists "clientes_update_propios" on public.clientes;
create policy "clientes_update_propios"
on public.clientes for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "clientes_delete_propios" on public.clientes;
create policy "clientes_delete_propios"
on public.clientes for delete
using (auth.uid() = usuario_id);

drop policy if exists "vehiculos_select_propios" on public.vehiculos;
create policy "vehiculos_select_propios"
on public.vehiculos for select
using (auth.uid() = usuario_id);

drop policy if exists "vehiculos_insert_propios" on public.vehiculos;
create policy "vehiculos_insert_propios"
on public.vehiculos for insert
with check (auth.uid() = usuario_id);

drop policy if exists "vehiculos_update_propios" on public.vehiculos;
create policy "vehiculos_update_propios"
on public.vehiculos for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "vehiculos_delete_propios" on public.vehiculos;
create policy "vehiculos_delete_propios"
on public.vehiculos for delete
using (auth.uid() = usuario_id);

drop policy if exists "simulaciones_select_propias" on public.simulaciones;
create policy "simulaciones_select_propias"
on public.simulaciones for select
using (auth.uid() = usuario_id);

drop policy if exists "simulaciones_insert_propias" on public.simulaciones;
create policy "simulaciones_insert_propias"
on public.simulaciones for insert
with check (auth.uid() = usuario_id);

drop policy if exists "simulaciones_update_propias" on public.simulaciones;
create policy "simulaciones_update_propias"
on public.simulaciones for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "simulaciones_delete_propias" on public.simulaciones;
create policy "simulaciones_delete_propias"
on public.simulaciones for delete
using (auth.uid() = usuario_id);

drop policy if exists "cronograma_select_por_simulacion_propia" on public.cronograma;
create policy "cronograma_select_por_simulacion_propia"
on public.cronograma for select
using (
  exists (
    select 1
    from public.simulaciones s
    where s.id = cronograma.simulacion_id
      and s.usuario_id = auth.uid()
  )
);

drop policy if exists "cronograma_insert_por_simulacion_propia" on public.cronograma;
create policy "cronograma_insert_por_simulacion_propia"
on public.cronograma for insert
with check (
  exists (
    select 1
    from public.simulaciones s
    where s.id = cronograma.simulacion_id
      and s.usuario_id = auth.uid()
  )
);

drop policy if exists "cronograma_update_por_simulacion_propia" on public.cronograma;
create policy "cronograma_update_por_simulacion_propia"
on public.cronograma for update
using (
  exists (
    select 1
    from public.simulaciones s
    where s.id = cronograma.simulacion_id
      and s.usuario_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.simulaciones s
    where s.id = cronograma.simulacion_id
      and s.usuario_id = auth.uid()
  )
);

drop policy if exists "cronograma_delete_por_simulacion_propia" on public.cronograma;
create policy "cronograma_delete_por_simulacion_propia"
on public.cronograma for delete
using (
  exists (
    select 1
    from public.simulaciones s
    where s.id = cronograma.simulacion_id
      and s.usuario_id = auth.uid()
  )
);
