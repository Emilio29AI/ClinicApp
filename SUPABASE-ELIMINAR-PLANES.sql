-- ClinicApp: habilitar borrado definitivo de un plan propio.
-- Aplicado el 2026-09-18: allow_owned_nutrition_plan_deletion.
-- Cambio aditivo de permisos/RLS. No modifica ni elimina filas existentes.
-- Conserva RLS y el resto de políticas. La FK existente elimina únicamente
-- los seguimientos del plan borrado; pacientes, PDFs y otras versiones no cambian.
begin;

create policy "planes_alimentarios_delete_propios"
on public.planes_alimentarios
for delete
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

grant delete on public.planes_alimentarios to authenticated;

commit;
