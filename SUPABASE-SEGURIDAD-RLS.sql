-- ClinicApp: endurecimiento de RLS y Storage.
-- NO fue ejecutado por la revisión local.
-- Ejecutar manualmente en Supabase > SQL Editor después de revisar los nombres
-- de tablas, claves foráneas y bucket. Todo se aplica en una sola transacción.

begin;

alter table public.profiles enable row level security;
alter table public.pacientes enable row level security;
alter table public.consultas enable row level security;
alter table public.archivos enable row level security;
alter table public.turnos enable row level security;

do $$
begin
    if not exists (
        select 1 from storage.buckets where id = 'estudios'
    ) then
        raise exception 'No existe el bucket Storage estudios';
    end if;
end;
$$;

update storage.buckets
set public = false,
    file_size_limit = 15728640,
    allowed_mime_types = array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]::text[]
where id = 'estudios';

-- Las políticas permisivas habilitan el rol autenticado. Las restrictivas se
-- combinan con cualquier política existente y obligan siempre al aislamiento.

drop policy if exists "clinicapp_profiles_base_select" on public.profiles;
create policy "clinicapp_profiles_base_select"
on public.profiles as permissive for select to authenticated
using (true);

drop policy if exists "clinicapp_profiles_owner_select" on public.profiles;
create policy "clinicapp_profiles_owner_select"
on public.profiles as restrictive for select to public
using (id = auth.uid());

drop policy if exists "clinicapp_profiles_base_insert" on public.profiles;
create policy "clinicapp_profiles_base_insert"
on public.profiles as permissive for insert to authenticated
with check (true);

drop policy if exists "clinicapp_profiles_owner_insert" on public.profiles;
create policy "clinicapp_profiles_owner_insert"
on public.profiles as restrictive for insert to public
with check (id = auth.uid());

drop policy if exists "clinicapp_profiles_base_update" on public.profiles;
create policy "clinicapp_profiles_base_update"
on public.profiles as permissive for update to authenticated
using (true) with check (true);

drop policy if exists "clinicapp_profiles_owner_update" on public.profiles;
create policy "clinicapp_profiles_owner_update"
on public.profiles as restrictive for update to public
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "clinicapp_profiles_base_delete" on public.profiles;
create policy "clinicapp_profiles_base_delete"
on public.profiles as permissive for delete to authenticated
using (true);

drop policy if exists "clinicapp_profiles_owner_delete" on public.profiles;
create policy "clinicapp_profiles_owner_delete"
on public.profiles as restrictive for delete to public
using (id = auth.uid());

-- Pacientes: el propietario siempre es medico_id.
drop policy if exists "clinicapp_pacientes_base_select" on public.pacientes;
create policy "clinicapp_pacientes_base_select"
on public.pacientes as permissive for select to authenticated using (true);
drop policy if exists "clinicapp_pacientes_owner_select" on public.pacientes;
create policy "clinicapp_pacientes_owner_select"
on public.pacientes as restrictive for select to public
using (medico_id = auth.uid());

drop policy if exists "clinicapp_pacientes_base_insert" on public.pacientes;
create policy "clinicapp_pacientes_base_insert"
on public.pacientes as permissive for insert to authenticated with check (true);
drop policy if exists "clinicapp_pacientes_owner_insert" on public.pacientes;
create policy "clinicapp_pacientes_owner_insert"
on public.pacientes as restrictive for insert to public
with check (medico_id = auth.uid());

drop policy if exists "clinicapp_pacientes_base_update" on public.pacientes;
create policy "clinicapp_pacientes_base_update"
on public.pacientes as permissive for update to authenticated
using (true) with check (true);
drop policy if exists "clinicapp_pacientes_owner_update" on public.pacientes;
create policy "clinicapp_pacientes_owner_update"
on public.pacientes as restrictive for update to public
using (medico_id = auth.uid()) with check (medico_id = auth.uid());

drop policy if exists "clinicapp_pacientes_base_delete" on public.pacientes;
create policy "clinicapp_pacientes_base_delete"
on public.pacientes as permissive for delete to authenticated using (true);
drop policy if exists "clinicapp_pacientes_owner_delete" on public.pacientes;
create policy "clinicapp_pacientes_owner_delete"
on public.pacientes as restrictive for delete to public
using (medico_id = auth.uid());

-- Consultas: la propiedad se hereda del paciente.
drop policy if exists "clinicapp_consultas_base_all" on public.consultas;
create policy "clinicapp_consultas_base_all"
on public.consultas as permissive for all to authenticated
using (true) with check (true);
drop policy if exists "clinicapp_consultas_owner_all" on public.consultas;
create policy "clinicapp_consultas_owner_all"
on public.consultas as restrictive for all to public
using (
    exists (
        select 1 from public.pacientes p
        where p.id = consultas.paciente_id
          and p.medico_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.pacientes p
        where p.id = consultas.paciente_id
          and p.medico_id = auth.uid()
    )
);

-- Archivos: la propiedad también se hereda del paciente.
drop policy if exists "clinicapp_archivos_base_all" on public.archivos;
create policy "clinicapp_archivos_base_all"
on public.archivos as permissive for all to authenticated
using (true) with check (true);
drop policy if exists "clinicapp_archivos_owner_all" on public.archivos;
create policy "clinicapp_archivos_owner_all"
on public.archivos as restrictive for all to public
using (
    exists (
        select 1 from public.pacientes p
        where p.id = archivos.paciente_id
          and p.medico_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.pacientes p
        where p.id = archivos.paciente_id
          and p.medico_id = auth.uid()
    )
);

-- Turnos: además de medico_id, el paciente y la consulta vinculada deben ser
-- del mismo médico y corresponder entre sí.
drop policy if exists "clinicapp_turnos_base_all" on public.turnos;
create policy "clinicapp_turnos_base_all"
on public.turnos as permissive for all to authenticated
using (true) with check (true);
drop policy if exists "clinicapp_turnos_owner_all" on public.turnos;
create policy "clinicapp_turnos_owner_all"
on public.turnos as restrictive for all to public
using (
    medico_id = auth.uid()
    and exists (
        select 1 from public.pacientes p
        where p.id = turnos.paciente_id
          and p.medico_id = auth.uid()
    )
)
with check (
    medico_id = auth.uid()
    and exists (
        select 1 from public.pacientes p
        where p.id = turnos.paciente_id
          and p.medico_id = auth.uid()
    )
    and (
        consulta_origen_id is null
        or exists (
            select 1 from public.consultas c
            join public.pacientes p on p.id = c.paciente_id
            where c.id = turnos.consulta_origen_id
              and c.paciente_id = turnos.paciente_id
              and p.medico_id = auth.uid()
        )
    )
);

-- Storage privado: ClinicApp guarda objetos como
-- <auth.uid()>/<paciente_uuid>/<uuid>-<nombre-seguro> en el bucket estudios.
drop policy if exists "clinicapp_estudios_base_select" on storage.objects;
create policy "clinicapp_estudios_base_select"
on storage.objects as permissive for select to authenticated
using (bucket_id = 'estudios');
drop policy if exists "clinicapp_estudios_owner_select" on storage.objects;
create policy "clinicapp_estudios_owner_select"
on storage.objects as restrictive for select to public
using (
    bucket_id <> 'estudios'
    or (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinicapp_estudios_base_insert" on storage.objects;
create policy "clinicapp_estudios_base_insert"
on storage.objects as permissive for insert to authenticated
with check (bucket_id = 'estudios');
drop policy if exists "clinicapp_estudios_owner_insert" on storage.objects;
create policy "clinicapp_estudios_owner_insert"
on storage.objects as restrictive for insert to public
with check (
    bucket_id <> 'estudios'
    or (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinicapp_estudios_base_update" on storage.objects;
create policy "clinicapp_estudios_base_update"
on storage.objects as permissive for update to authenticated
using (bucket_id = 'estudios') with check (bucket_id = 'estudios');
drop policy if exists "clinicapp_estudios_owner_update" on storage.objects;
create policy "clinicapp_estudios_owner_update"
on storage.objects as restrictive for update to public
using (
    bucket_id <> 'estudios'
    or (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id <> 'estudios'
    or (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinicapp_estudios_base_delete" on storage.objects;
create policy "clinicapp_estudios_base_delete"
on storage.objects as permissive for delete to authenticated
using (bucket_id = 'estudios');
drop policy if exists "clinicapp_estudios_owner_delete" on storage.objects;
create policy "clinicapp_estudios_owner_delete"
on storage.objects as restrictive for delete to public
using (
    bucket_id <> 'estudios'
    or (storage.foldername(name))[1] = auth.uid()::text
);

commit;
