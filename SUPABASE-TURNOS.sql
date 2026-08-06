-- Ejecutar completo en Supabase > SQL Editor.

create table if not exists public.turnos (
    id uuid primary key default gen_random_uuid(),
    medico_id uuid not null references auth.users(id) on delete cascade,
    paciente_id uuid not null references public.pacientes(id) on delete cascade,
    fecha date not null,
    hora time without time zone,
    observaciones text,
    consulta_origen_id uuid unique references public.consultas(id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists turnos_medico_fecha_idx
    on public.turnos (medico_id, fecha, hora);

create index if not exists turnos_paciente_idx
    on public.turnos (paciente_id);

alter table public.turnos enable row level security;

drop policy if exists "turnos_select_propios" on public.turnos;
create policy "turnos_select_propios"
on public.turnos for select
to authenticated
using (medico_id = auth.uid());

drop policy if exists "turnos_insert_propios" on public.turnos;
create policy "turnos_insert_propios"
on public.turnos for insert
to authenticated
with check (medico_id = auth.uid());

drop policy if exists "turnos_update_propios" on public.turnos;
create policy "turnos_update_propios"
on public.turnos for update
to authenticated
using (medico_id = auth.uid())
with check (medico_id = auth.uid());

drop policy if exists "turnos_delete_propios" on public.turnos;
create policy "turnos_delete_propios"
on public.turnos for delete
to authenticated
using (medico_id = auth.uid());

-- Migración inicial: copia los próximos turnos ya guardados en consultas.
insert into public.turnos (
    medico_id,
    paciente_id,
    fecha,
    hora,
    consulta_origen_id
)
select
    p.medico_id,
    c.paciente_id,
    c.proximo_control,
    c.proximo_control_hora,
    c.id
from public.consultas c
join public.pacientes p on p.id = c.paciente_id
where c.proximo_control is not null
on conflict (consulta_origen_id) do update set
    paciente_id = excluded.paciente_id,
    fecha = excluded.fecha,
    hora = excluded.hora,
    medico_id = excluded.medico_id;
