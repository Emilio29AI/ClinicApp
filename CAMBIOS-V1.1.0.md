# MedicaApp V1.1.0

- Corregido el flujo de restablecimiento de contraseña.
- Política de contraseña unificada en 8 caracteres.
- Protección consistente de datos insertados en HTML.
- Eliminados registros de consola con información clínica.
- Carga inicial reducida de N+1 consultas a dos consultas.
- Protección contra respuestas tardías al cambiar de paciente.
- Carga directa del detalle de una consulta.
- Cálculo de edad corregido para fechas locales.
- Exportación PDF móvil simplificada y sin reglas contradictorias.
- Eliminados archivos vacíos y CSS sin uso.
- Service worker con caché versionada de recursos estáticos.
- Las solicitudes y respuestas de Supabase no se almacenan en caché.
