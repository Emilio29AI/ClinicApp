# Implementación de Agenda y turnos

## Antes de abrir la app

1. Abrir Supabase.
2. Entrar en **SQL Editor**.
3. Ejecutar completo `SUPABASE-TURNOS.sql`.
4. Recargar la aplicación con Ctrl + F5.

## Funcionamiento

- El texto visible **Próximo control** fue cambiado a **Próximo turno**.
- Guardar o editar una consulta con Próximo turno crea o actualiza su registro vinculado en `turnos`.
- Borrar la fecha de Próximo turno en una consulta elimina el turno vinculado.
- Un turno creado desde Agenda se guarda directamente en `turnos`; no crea una consulta clínica vacía.
- Editar o eliminar desde Agenda también actualiza la consulta de origen cuando el turno nació desde una consulta.
- La ficha del paciente ahora incluye el botón **← Agenda**.

## Prueba recomendada

1. Confirmar que los turnos anteriores aparecen luego de ejecutar el SQL.
2. Crear un turno con **+ Nuevo turno**.
3. Editarlo desde el ícono de lápiz.
4. Eliminarlo con el ícono ×.
5. Crear una consulta con Próximo turno y comprobar que aparece en Agenda.
6. Editar ese turno desde Agenda y comprobar que cambia también dentro de la consulta.
