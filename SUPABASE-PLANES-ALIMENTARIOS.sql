-- ClinicApp: módulo de planes alimentarios y seguimiento.
--
-- ESTADO: APLICADO EN MEDICAAPP EL 2026-08-22.
-- Respaldo conservado: clinicapp_backup_20260822_111302.
-- Migración principal: add_nutrition_plans_and_followups.
--
-- Este script es deliberadamente aditivo:
--   * crea cuatro tablas nuevas;
--   * no altera pacientes, consultas, archivos, turnos ni profiles;
--   * no actualiza, elimina ni migra filas existentes;
--   * no contiene datos clínicos de ejemplo;
--   * se ejecuta dentro de una transacción y falla por completo si alguno de
--     los objetos ya existe.
--
-- Controles realizados antes y después de su ejecución:
--   1. realizar un respaldo del proyecto;
--   2. verificar que public.pacientes(id, medico_id) conserva esos nombres;
--   3. probar RLS y permisos en una transacción reversible;
--   4. ejecutar los asesores de seguridad y rendimiento de Supabase.

begin;

create table public.opciones_alimentarias (
    id uuid primary key default gen_random_uuid(),
    medico_id uuid not null references auth.users(id) on delete cascade,
    categoria text not null check (
        categoria in (
            'desayuno',
            'media_manana',
            'almuerzo',
            'merienda',
            'cena',
            'colacion',
            'recomendacion'
        )
    ),
    titulo text not null check (char_length(trim(titulo)) between 1 and 160),
    contenido text not null check (char_length(trim(contenido)) between 1 and 6000),
    etiquetas text[] not null default array[]::text[],
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.plantillas_alimentarias (
    id uuid primary key default gen_random_uuid(),
    medico_id uuid not null references auth.users(id) on delete cascade,
    nombre text not null check (char_length(trim(nombre)) between 1 and 160),
    descripcion text check (descripcion is null or char_length(descripcion) <= 1000),
    objetivo text check (objetivo is null or char_length(objetivo) <= 2000),
    contenido jsonb not null default '{"version":1,"secciones":[]}'::jsonb
        check (jsonb_typeof(contenido) = 'object'),
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.planes_alimentarios (
    id uuid primary key default gen_random_uuid(),
    medico_id uuid not null references auth.users(id) on delete cascade,
    paciente_id uuid not null references public.pacientes(id) on delete cascade,
    plantilla_id uuid references public.plantillas_alimentarias(id) on delete set null,
    -- Las versiones de un mismo plan comparten serie_id. No se usa una clave
    -- foránea autorreferencial para evitar políticas RLS recursivas.
    serie_id uuid not null default gen_random_uuid(),
    numero_version integer not null default 1 check (numero_version > 0),
    titulo text not null check (char_length(trim(titulo)) between 1 and 200),
    objetivo text check (objetivo is null or char_length(objetivo) <= 3000),
    estado text not null default 'borrador' check (
        estado in ('borrador', 'activo', 'reemplazado', 'finalizado')
    ),
    fecha_inicio date not null,
    fecha_revision date,
    peso_inicial numeric(6,2) check (peso_inicial is null or peso_inicial > 0),
    seguimiento_tipo text not null default 'sin_seguimiento' check (
        seguimiento_tipo in (
            'sin_seguimiento',
            '30_dias',
            '60_dias',
            '90_dias',
            'continuo'
        )
    ),
    seguimiento_hasta date,
    controles_incluidos smallint not null default 0 check (
        controles_incluidos between 0 and 50
    ),
    valor numeric(12,2) check (valor is null or valor >= 0),
    estado_pago text not null default 'no_aplica' check (
        estado_pago in ('no_aplica', 'pendiente', 'abonado')
    ),
    contenido jsonb not null default '{"version":1,"secciones":[]}'::jsonb
        check (jsonb_typeof(contenido) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (fecha_revision is null or fecha_revision >= fecha_inicio),
    check (seguimiento_hasta is null or seguimiento_hasta >= fecha_inicio)
);

create table public.seguimientos_alimentarios (
    id uuid primary key default gen_random_uuid(),
    medico_id uuid not null references auth.users(id) on delete cascade,
    paciente_id uuid not null references public.pacientes(id) on delete cascade,
    plan_id uuid not null references public.planes_alimentarios(id) on delete cascade,
    fecha date not null,
    adherencia smallint not null check (adherencia between 1 and 5),
    peso numeric(6,2) check (peso is null or peso > 0),
    cintura numeric(6,2) check (cintura is null or cintura > 0),
    dificultades text[] not null default array[]::text[],
    resultado text check (resultado is null or char_length(resultado) <= 5000),
    observaciones text check (observaciones is null or char_length(observaciones) <= 5000),
    decision text not null check (
        decision in ('mantener', 'ajustar', 'nueva_version', 'finalizar')
    ),
    proxima_revision date,
    created_at timestamptz not null default now()
);

create index opciones_alimentarias_medico_categoria_idx
on public.opciones_alimentarias (medico_id, categoria)
where activo = true;

create index plantillas_alimentarias_medico_nombre_idx
on public.plantillas_alimentarias (medico_id, nombre)
where activo = true;

create index planes_alimentarios_paciente_fecha_idx
on public.planes_alimentarios (paciente_id, created_at desc);

create index planes_alimentarios_serie_version_idx
on public.planes_alimentarios (serie_id, numero_version desc);

create index planes_alimentarios_medico_estado_idx
on public.planes_alimentarios (medico_id, estado);

create index planes_alimentarios_plantilla_idx
on public.planes_alimentarios (plantilla_id)
where plantilla_id is not null;

create index seguimientos_alimentarios_plan_fecha_idx
on public.seguimientos_alimentarios (plan_id, fecha desc);

create index seguimientos_alimentarios_paciente_fecha_idx
on public.seguimientos_alimentarios (paciente_id, fecha desc);

create index seguimientos_alimentarios_medico_idx
on public.seguimientos_alimentarios (medico_id);

alter table public.opciones_alimentarias enable row level security;
alter table public.plantillas_alimentarias enable row level security;
alter table public.planes_alimentarios enable row level security;
alter table public.seguimientos_alimentarios enable row level security;

-- La aplicación web sólo necesita lectura, alta y actualización. No se otorga
-- DELETE al rol authenticated: las opciones y plantillas se archivan mediante
-- activo=false y los registros clínicos conservan su historial.
revoke all on table public.opciones_alimentarias from public, anon, authenticated;
revoke all on table public.plantillas_alimentarias from public, anon, authenticated;
revoke all on table public.planes_alimentarios from public, anon, authenticated;
revoke all on table public.seguimientos_alimentarios from public, anon, authenticated;

grant select, insert, update on table public.opciones_alimentarias to authenticated;
grant select, insert, update on table public.plantillas_alimentarias to authenticated;
grant select, insert, update on table public.planes_alimentarios to authenticated;
grant select, insert on table public.seguimientos_alimentarios to authenticated;

grant all on table public.opciones_alimentarias to service_role;
grant all on table public.plantillas_alimentarias to service_role;
grant all on table public.planes_alimentarios to service_role;
grant all on table public.seguimientos_alimentarios to service_role;

create policy "opciones_alimentarias_select_propias"
on public.opciones_alimentarias
for select
to authenticated
using ((select auth.uid()) = medico_id);

create policy "opciones_alimentarias_insert_propias"
on public.opciones_alimentarias
for insert
to authenticated
with check ((select auth.uid()) = medico_id);

create policy "opciones_alimentarias_update_propias"
on public.opciones_alimentarias
for update
to authenticated
using ((select auth.uid()) = medico_id)
with check ((select auth.uid()) = medico_id);

create policy "plantillas_alimentarias_select_propias"
on public.plantillas_alimentarias
for select
to authenticated
using ((select auth.uid()) = medico_id);

create policy "plantillas_alimentarias_insert_propias"
on public.plantillas_alimentarias
for insert
to authenticated
with check ((select auth.uid()) = medico_id);

create policy "plantillas_alimentarias_update_propias"
on public.plantillas_alimentarias
for update
to authenticated
using ((select auth.uid()) = medico_id)
with check ((select auth.uid()) = medico_id);

create policy "planes_alimentarios_select_propios"
on public.planes_alimentarios
for select
to authenticated
using (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.pacientes p
        where p.id = planes_alimentarios.paciente_id
          and p.medico_id = (select auth.uid())
    )
);

create policy "planes_alimentarios_insert_propios"
on public.planes_alimentarios
for insert
to authenticated
with check (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.pacientes p
        where p.id = planes_alimentarios.paciente_id
          and p.medico_id = (select auth.uid())
    )
    and (
        plantilla_id is null
        or exists (
            select 1
            from public.plantillas_alimentarias t
            where t.id = planes_alimentarios.plantilla_id
              and t.medico_id = (select auth.uid())
        )
    )
);

create policy "planes_alimentarios_update_propios"
on public.planes_alimentarios
for update
to authenticated
using (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.pacientes p
        where p.id = planes_alimentarios.paciente_id
          and p.medico_id = (select auth.uid())
    )
)
with check (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.pacientes p
        where p.id = planes_alimentarios.paciente_id
          and p.medico_id = (select auth.uid())
    )
    and (
        plantilla_id is null
        or exists (
            select 1
            from public.plantillas_alimentarias t
            where t.id = planes_alimentarios.plantilla_id
              and t.medico_id = (select auth.uid())
        )
    )
);

create policy "seguimientos_alimentarios_select_propios"
on public.seguimientos_alimentarios
for select
to authenticated
using (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.planes_alimentarios plan
        where plan.id = seguimientos_alimentarios.plan_id
          and plan.paciente_id = seguimientos_alimentarios.paciente_id
          and plan.medico_id = (select auth.uid())
    )
);

create policy "seguimientos_alimentarios_insert_propios"
on public.seguimientos_alimentarios
for insert
to authenticated
with check (
    (select auth.uid()) = medico_id
    and exists (
        select 1
        from public.planes_alimentarios plan
        where plan.id = seguimientos_alimentarios.plan_id
          and plan.paciente_id = seguimientos_alimentarios.paciente_id
          and plan.medico_id = (select auth.uid())
    )
    and exists (
        select 1
        from public.pacientes p
        where p.id = seguimientos_alimentarios.paciente_id
          and p.medico_id = (select auth.uid())
    )
);

commit;
