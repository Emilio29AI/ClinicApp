const supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_KEY
)

const UUID_SEGURO =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validarUUID(valor, nombre = "identificador"){
    if(typeof valor !== "string" || !UUID_SEGURO.test(valor)){
        throw new Error(`El ${nombre} no es válido.`);
    }

    return valor;
}

async function obtenerUsuarioAutenticado(){
    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if(error || !user){
        throw new Error("No hay un médico autenticado.");
    }

    return user;
}

function registrarErrorSeguro(contexto, error){
    const codigo = typeof error?.code === "string"
        ? ` (${error.code})`
        : "";

    console.error(`${contexto}${codigo}`);
}

async function asegurarPacientePropio(pacienteId, user){
    validarUUID(pacienteId, "paciente");

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select("id")
        .eq("id", pacienteId)
        .eq("medico_id", user.id)
        .maybeSingle();

    if(error || !data){
        throw new Error("El paciente no existe o no pertenece al médico autenticado.");
    }

    return data;
}

async function obtenerConsultaPropia(consultaId, user){
    validarUUID(consultaId, "consulta");

    const { data, error } = await supabaseClient
        .from("consultas")
        .select("id, paciente_id")
        .eq("id", consultaId)
        .maybeSingle();

    if(error || !data){
        throw new Error("La consulta no existe o no pertenece al médico autenticado.");
    }

    await asegurarPacientePropio(data.paciente_id, user);

    return data;
}

async function obtenerArchivoPropio(archivoId, user){
    validarUUID(archivoId, "archivo");

    const { data, error } = await supabaseClient
        .from("archivos")
        .select("id, paciente_id, nombre, tipo, url")
        .eq("id", archivoId)
        .maybeSingle();

    if(error || !data){
        throw new Error("El archivo no existe o no pertenece al médico autenticado.");
    }

    await asegurarPacientePropio(data.paciente_id, user);

    const prefijoEsperado = `${user.id}/${data.paciente_id}/`;

    if(
        typeof data.url !== "string" ||
        !data.url.startsWith(prefijoEsperado) ||
        data.url.includes("..")
    ){
        throw new Error("La ruta del archivo no es válida.");
    }

    return data;
}

async function validarContenidoArchivo(archivo){
    const tiposPermitidos = {
        "application/pdf": ["pdf"],
        "image/jpeg": ["jpg", "jpeg"],
        "image/png": ["png"],
        "image/webp": ["webp"]
    };

    if(!(archivo instanceof File)){
        throw new Error("El archivo seleccionado no es válido.");
    }

    if(!tiposPermitidos[archivo.type]){
        throw new Error("El tipo de archivo no está permitido.");
    }

    if(archivo.size <= 0 || archivo.size > 15 * 1024 * 1024){
        throw new Error("El archivo debe tener contenido y no superar 15 MB.");
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "";

    if(!tiposPermitidos[archivo.type].includes(extension)){
        throw new Error("La extensión del archivo no coincide con su tipo.");
    }

    const bytes = new Uint8Array(
        await archivo.slice(0, 12).arrayBuffer()
    );

    const coincide = archivo.type === "application/pdf"
        ? [0x25, 0x50, 0x44, 0x46, 0x2d]
            .every((valor, indice) => bytes[indice] === valor)
        : archivo.type === "image/jpeg"
            ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
            : archivo.type === "image/png"
                ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
                    .every((valor, indice) => bytes[indice] === valor)
                : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
                    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

    if(!coincide){
        throw new Error("El contenido del archivo no coincide con el formato declarado.");
    }
}

function calcularEdad(fechaNacimiento){

    if(!fechaNacimiento) return "-";

    const hoy = new Date();
    const [anio, mes, dia] = fechaNacimiento
        .split("-")
        .map(Number);

    const nacimiento = new Date(anio, mes - 1, dia);

    if(Number.isNaN(nacimiento.getTime())) return "-";

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const m = hoy.getMonth() - nacimiento.getMonth();

    if(m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())){
        edad--;
    }

    return edad;

}


const Database = {

    pacientes: [],

    async cargarPacientes(){

        let user;

        try{
            user = await obtenerUsuarioAutenticado();
        }catch(error){
            return [];
        }

        const { data, error } = await supabaseClient
            .from("pacientes")
            .select("*")
            .eq("medico_id", user.id)
            .order("apellido");

        if(error){
            registrarErrorSeguro("No se pudieron cargar los pacientes.", error);
            return [];
        }

        const { data: fechasConsultas, error: fechasError } =
            await supabaseClient
                .from("consultas")
                .select("paciente_id, fecha, pacientes!inner(medico_id)")
                .eq("pacientes.medico_id", user.id)
                .order("fecha", { ascending: false });

        if(fechasError){
            registrarErrorSeguro("No se pudieron cargar las fechas de consulta.", fechasError);
        }

        const ultimaConsultaPorPaciente = new Map();

        (fechasConsultas || []).forEach(consulta => {

            if(!ultimaConsultaPorPaciente.has(consulta.paciente_id)){
                ultimaConsultaPorPaciente.set(
                    consulta.paciente_id,
                    consulta.fecha
                );
            }

        });

        this.pacientes = data.map(p => {

        return {

    id: p.id,

    medicoId: p.medico_id,

    apellido: p.apellido || "",

    nombre: p.nombre || "",

    nombreCompleto:
        `${p.apellido || ""}, ${p.nombre || ""}`,

    fechaNacimiento: p.fecha_nacimiento,

    edad: calcularEdad(p.fecha_nacimiento),

    dni: p.dni || "",

    sexo: p.sexo || "",

    telefono: p.telefono || "",

    email: p.email || "",

    direccion: p.direccion || "",

    ciudad: p.ciudad || "",

    provincia: p.provincia || "",

    codigoPostal: p.codigo_postal || "",

    obraSocial: p.obra_social || "",

    nroAfiliado: p.nro_afiliado || "",

    contactoEmergencia:
        p.contacto_emergencia || "",

    telefonoEmergencia:
        p.telefono_emergencia || "",

    alertasClinicas:
        p.alertas_clinicas || "",
   
    observaciones:
        p.observaciones || "",

    createdAt: p.created_at,

    updatedAt: p.updated_at,

    ultimaConsulta:
        ultimaConsultaPorPaciente.get(p.id) || null

};

});

        return this.pacientes;

    },

    async agregarPaciente(datos) {

    const user = await obtenerUsuarioAutenticado();

    const { data, error } = await supabaseClient
        .from("pacientes")
        .insert({

            medico_id: user.id,

            apellido: datos.apellido,

            nombre: datos.nombre,

            fecha_nacimiento: datos.fechaNacimiento,

            dni: datos.dni || null,

            sexo: datos.sexo || null,

            telefono: datos.telefono || null,

            email: datos.email || null,

            direccion: datos.direccion || null,

            ciudad: datos.ciudad || null,

            provincia: datos.provincia || null,

            codigo_postal: datos.codigoPostal || null,

            obra_social: datos.obraSocial || null,

            nro_afiliado: datos.nroAfiliado || null,

            contacto_emergencia:
                datos.contactoEmergencia || null,

            telefono_emergencia:
                datos.telefonoEmergencia || null,

            alertas_clinicas:
                datos.alertasClinicas || null,

            observaciones:
                datos.observaciones || null

        })
        .select()
        .single();

    if (error) {

        registrarErrorSeguro("No se pudo guardar el paciente.", error);

        alert("No se pudo guardar el paciente.");

        return null;

    }

    return data;

    },
    
    async editarPaciente(datos){

    validarUUID(datos.id, "paciente");
    const user = await obtenerUsuarioAutenticado();

    const { data, error } = await supabaseClient
        .from("pacientes")
        .update({

            apellido: datos.apellido,

            nombre: datos.nombre,

            fecha_nacimiento: datos.fechaNacimiento,

            dni: datos.dni || null,

            sexo: datos.sexo || null,

            telefono: datos.telefono || null,

            email: datos.email || null,

            direccion: datos.direccion || null,

            ciudad: datos.ciudad || null,

            provincia: datos.provincia || null,

            codigo_postal: datos.codigoPostal || null,

            obra_social: datos.obraSocial || null,

            nro_afiliado: datos.nroAfiliado || null,

            contacto_emergencia:
                datos.contactoEmergencia || null,

            telefono_emergencia:
                datos.telefonoEmergencia || null,

            alertas_clinicas:
                datos.alertasClinicas || null,

            observaciones:
                datos.observaciones || null,

            updated_at: new Date().toISOString()

        })
        .eq("id", datos.id)
        .eq("medico_id", user.id)
        .select()
        .single();

    if(error){

        registrarErrorSeguro("No se pudo actualizar el paciente.", error);

        alert(
            "No se pudo actualizar el paciente."
        );

        return null;

    }

    return data;

},

    async eliminarPaciente(id){

    validarUUID(id, "paciente");
    const user = await obtenerUsuarioAutenticado();

    const { error } = await supabaseClient
        .from("pacientes")
        .delete()
        .eq("id", id)
        .eq("medico_id", user.id);

    if(error){
        registrarErrorSeguro("No se pudo eliminar el paciente.", error);
        alert("No se pudo eliminar el paciente.");
        return false;
    }

    return true;

},
    
    async agregarConsulta(datos){

    const user = await obtenerUsuarioAutenticado();
    await asegurarPacientePropio(datos.pacienteId, user);

    const disponibilidad =
        await this.validarDisponibilidadTurno({
            fecha: datos.proximoControl,
            hora: datos.proximoControlHora
        });

    if(!disponibilidad.disponible){
        alert(disponibilidad.mensaje);
        return null;
    }

    const { data, error } = await supabaseClient
        .from("consultas")
        .insert({

            paciente_id: datos.pacienteId,

            fecha: datos.fecha,

            motivo: datos.motivo,

            evolucion: datos.evolucion || null,

            diagnostico: datos.diagnostico || null,

            conducta: datos.conducta || null,

            peso: datos.peso,

            talla: datos.talla,

            imc: datos.imc,

            ta_sistolica: datos.taSistolica,

            ta_diastolica: datos.taDiastolica,

            frecuencia_cardiaca:
                datos.frecuenciaCardiaca,

            temperatura: datos.temperatura,

            saturacion: datos.saturacion,

            proximo_control:
                datos.proximoControl,
            
            proximo_control_hora:
                datos.proximoControlHora || null

                

        })
        .select()
        .single();

    if(error){

        registrarErrorSeguro("No se pudo guardar la consulta.", error);

        alert(
            "No se pudo guardar la evolución."
        );

        return null;

    }

    await this.sincronizarTurnoDesdeConsulta(data);

    return data;

},
    
    async cargarConsultas(pacienteId){

        const user = await obtenerUsuarioAutenticado();
        await asegurarPacientePropio(pacienteId, user);

        const { data, error } = await supabaseClient

            .from("consultas")

            .select("*")

            .eq("paciente_id", pacienteId)

            .order("fecha", { ascending: false });

        if(error){

            registrarErrorSeguro("No se pudieron cargar las consultas.", error);

            return [];

        }

        return data;

    },

    async cargarProximosTurnos(){

        const user = await obtenerUsuarioAutenticado();

        const hoy = new Date().toLocaleDateString("en-CA");

        const { data, error } = await supabaseClient
            .from("turnos")
            .select(`
                id,
                paciente_id,
                fecha,
                hora,
                observaciones,
                consulta_origen_id,
                pacientes (
                    id,
                    apellido,
                    nombre,
                    telefono,
                    obra_social
                )
            `)
            .eq("medico_id", user.id)
            .gte("fecha", hoy)
            .order("fecha", { ascending:true })
            .order("hora", {
                ascending:true,
                nullsFirst:false
            });

        if(error){
            registrarErrorSeguro("No se pudieron cargar los próximos turnos.", error);
            return [];
        }

        return (data || []).map(turno => ({
            turnoId: turno.id,
            consultaId: turno.consulta_origen_id || null,
            pacienteId: turno.paciente_id,
            fecha: turno.fecha,
            hora: turno.hora ? turno.hora.slice(0, 5) : null,
            observaciones: turno.observaciones || "",
            apellido: turno.pacientes?.apellido || "",
            nombre: turno.pacientes?.nombre || "",
            nombreCompleto: [
                turno.pacientes?.apellido,
                turno.pacientes?.nombre
            ].filter(Boolean).join(", "),
            telefono: turno.pacientes?.telefono || "",
            obraSocial: turno.pacientes?.obra_social || ""
        }));

    },  

    async cargarPerfilMedico() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        throw new Error("No hay un médico autenticado.");
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            nombre,
            apellido,
            email,
            telefono,
            matricula,
            especialidad
        `)
        .eq("id", user.id)
        .single();

    if (error) {
        registrarErrorSeguro("No se pudo cargar el perfil.", error);
        throw error;
    }

    return data;
},


async actualizarPerfilMedico(datos) {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        throw new Error("No hay un médico autenticado.");
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .update({

            nombre: datos.nombre,
            apellido: datos.apellido,
            telefono: datos.telefono || null,
            matricula: datos.matricula || null,
            especialidad: datos.especialidad || null,
            updated_at: new Date().toISOString()

        })
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
        registrarErrorSeguro("No se pudo actualizar el perfil.", error);
        throw error;
    }

    return data;
},


    async validarDisponibilidadTurno({
        fecha,
        hora,
        turnoIdExcluir = null,
        consultaOrigenIdExcluir = null
    }){

        if(!fecha || !hora){
            return { disponible:true };
        }

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if(userError || !user){
            return {
                disponible:false,
                error:true,
                mensaje:"No se pudo identificar al médico para validar el horario."
            };
        }

        const DURACION_CONSULTA_MINUTOS = 30;
        const MARGEN_ENTRE_TURNOS_MINUTOS = 5;
        const BLOQUE_TOTAL_MINUTOS =
            DURACION_CONSULTA_MINUTOS + MARGEN_ENTRE_TURNOS_MINUTOS;

        const convertirHoraAMinutos = valor => {
            const [horas, minutos] = String(valor).slice(0, 5).split(":").map(Number);
            return (horas * 60) + minutos;
        };

        let consulta = supabaseClient
            .from("turnos")
            .select(`
                id,
                fecha,
                hora,
                consulta_origen_id,
                pacientes (
                    apellido,
                    nombre
                )
            `)
            .eq("medico_id", user.id)
            .eq("fecha", fecha)
            .not("hora", "is", null);

        const { data, error } = await consulta;

        if(error){
            registrarErrorSeguro("No se pudo validar la disponibilidad del turno.", error);
            return {
                disponible:false,
                error:true,
                mensaje:"No se pudo comprobar la disponibilidad del horario."
            };
        }

        const inicioNuevo = convertirHoraAMinutos(hora);
        const finNuevo = inicioNuevo + BLOQUE_TOTAL_MINUTOS;

        const turnosComparables = (data || []).filter(turno => {
            if(turnoIdExcluir && turno.id === turnoIdExcluir){
                return false;
            }

            if(
                consultaOrigenIdExcluir &&
                turno.consulta_origen_id === consultaOrigenIdExcluir
            ){
                return false;
            }

            return true;
        });

        const conflicto = turnosComparables.find(turno => {
            const inicioExistente = convertirHoraAMinutos(turno.hora);
            const finExistente = inicioExistente + BLOQUE_TOTAL_MINUTOS;

            return inicioNuevo < finExistente &&
                finNuevo > inicioExistente;
        });

        if(!conflicto){
            return { disponible:true };
        }

        const inicioExistente = convertirHoraAMinutos(conflicto.hora);
        const proximoDisponibleMinutos = inicioExistente + BLOQUE_TOTAL_MINUTOS;
        const horasDisponibles = String(Math.floor(proximoDisponibleMinutos / 60) % 24).padStart(2, "0");
        const minutosDisponibles = String(proximoDisponibleMinutos % 60).padStart(2, "0");
        const nombrePaciente = [
            conflicto.pacientes?.apellido,
            conflicto.pacientes?.nombre
        ].filter(Boolean).join(", ") || "otro paciente";
        const horaConflicto = String(conflicto.hora).slice(0, 5);

        return {
            disponible:false,
            conflicto,
            mensaje:
                `Ese horario no está disponible.\n\n` +
                `El turno de ${nombrePaciente} comienza a las ${horaConflicto} ` +
                `y bloquea ${BLOQUE_TOTAL_MINUTOS} minutos.\n` +
                `El siguiente horario disponible después de ese turno es ${horasDisponibles}:${minutosDisponibles}.`
        };

    },

    async agregarTurno(datos){

        const user = await obtenerUsuarioAutenticado();
        await asegurarPacientePropio(datos.pacienteId, user);

        if(datos.consultaOrigenId){
            const consulta = await obtenerConsultaPropia(
                datos.consultaOrigenId,
                user
            );

            if(consulta.paciente_id !== datos.pacienteId){
                throw new Error("La consulta no corresponde al paciente indicado.");
            }
        }

        const disponibilidad =
            await this.validarDisponibilidadTurno({
                fecha: datos.fecha,
                hora: datos.hora
            });

        if(!disponibilidad.disponible){
            alert(disponibilidad.mensaje);
            return null;
        }

        const { data, error } = await supabaseClient
            .from("turnos")
            .insert({
                medico_id: user.id,
                paciente_id: datos.pacienteId,
                fecha: datos.fecha,
                hora: datos.hora || null,
                observaciones: datos.observaciones || null,
                consulta_origen_id: datos.consultaOrigenId || null
            })
            .select()
            .single();

        if(error){
            registrarErrorSeguro("No se pudo guardar el turno.", error);
            alert("No se pudo guardar el turno.");
            return null;
        }

        return data;

    },

    async cargarTurnoPorId(id){

        validarUUID(id, "turno");
        const user = await obtenerUsuarioAutenticado();

        const { data, error } = await supabaseClient
            .from("turnos")
            .select("*")
            .eq("id", id)
            .eq("medico_id", user.id)
            .single();

        if(error){
            registrarErrorSeguro("No se pudo cargar el turno.", error);
            alert("No se pudo cargar el turno.");
            return null;
        }

        return data;

    },

    async actualizarTurno(id, datos){

        validarUUID(id, "turno");
        const user = await obtenerUsuarioAutenticado();
        await asegurarPacientePropio(datos.pacienteId, user);

        const turnoActual = await this.cargarTurnoPorId(id);
        if(!turnoActual) return null;

        const disponibilidad =
            await this.validarDisponibilidadTurno({
                fecha: datos.fecha,
                hora: datos.hora,
                turnoIdExcluir: id
            });

        if(!disponibilidad.disponible){
            alert(disponibilidad.mensaje);
            return null;
        }

        const { data, error } = await supabaseClient
            .from("turnos")
            .update({
                paciente_id: datos.pacienteId,
                fecha: datos.fecha,
                hora: datos.hora || null,
                observaciones: datos.observaciones || null
            })
            .eq("id", id)
            .eq("medico_id", user.id)
            .select()
            .single();

        if(error){
            registrarErrorSeguro("No se pudo actualizar el turno.", error);
            alert("No se pudo actualizar el turno.");
            return null;
        }

        if(turnoActual.consulta_origen_id){
            const { error: consultaError } = await supabaseClient
                .from("consultas")
                .update({
                    proximo_control: datos.fecha,
                    proximo_control_hora: datos.hora || null
                })
                .eq("id", turnoActual.consulta_origen_id)
                .eq("paciente_id", turnoActual.paciente_id);

            if(consultaError){
                registrarErrorSeguro("No se pudo sincronizar la consulta.", consultaError);
                alert("El turno se actualizó, pero no se pudo sincronizar la consulta de origen.");
            }
        }

        return data;

    },

    async eliminarTurno(id){

        validarUUID(id, "turno");
        const user = await obtenerUsuarioAutenticado();

        const turnoActual = await this.cargarTurnoPorId(id);
        if(!turnoActual) return false;

        if(turnoActual.consulta_origen_id){
            const { error: consultaError } = await supabaseClient
                .from("consultas")
                .update({
                    proximo_control: null,
                    proximo_control_hora: null
                })
                .eq("id", turnoActual.consulta_origen_id)
                .eq("paciente_id", turnoActual.paciente_id);

            if(consultaError){
                registrarErrorSeguro("No se pudo limpiar la consulta de origen.", consultaError);
                alert("No se pudo desvincular el turno de la consulta.");
                return false;
            }
        }

        const { error } = await supabaseClient
            .from("turnos")
            .delete()
            .eq("id", id)
            .eq("medico_id", user.id);

        if(error){
            registrarErrorSeguro("No se pudo eliminar el turno.", error);
            alert("No se pudo eliminar el turno.");
            return false;
        }

        return true;

    },

    async sincronizarTurnoDesdeConsulta(consulta){

        if(!consulta?.id) return;

        const user = await obtenerUsuarioAutenticado();
        await obtenerConsultaPropia(consulta.id, user);
        await asegurarPacientePropio(consulta.paciente_id, user);

        if(!consulta.proximo_control){
            const { error } = await supabaseClient
                .from("turnos")
                .delete()
                .eq("consulta_origen_id", consulta.id)
                .eq("medico_id", user.id);

            if(error){
                registrarErrorSeguro("No se pudo eliminar el turno vinculado.", error);
            }
            return;
        }

        const { error } = await supabaseClient
            .from("turnos")
            .upsert({
                medico_id: user.id,
                paciente_id: consulta.paciente_id,
                fecha: consulta.proximo_control,
                hora: consulta.proximo_control_hora || null,
                consulta_origen_id: consulta.id
            }, {
                onConflict: "consulta_origen_id"
            });

        if(error){
            registrarErrorSeguro("No se pudo sincronizar el próximo turno.", error);
            alert("La consulta se guardó, pero no se pudo actualizar la Agenda.");
        }

    },

async cargarConsultaPorId(id) {

    const user = await obtenerUsuarioAutenticado();
    const consultaPropia = await obtenerConsultaPropia(id, user);

    const { data, error } = await supabaseClient
        .from("consultas")
        .select("*")
        .eq("id", id)
        .eq("paciente_id", consultaPropia.paciente_id)
        .single();

    if (error) {

        registrarErrorSeguro("No se pudo cargar la evolución.", error);

        alert(
            "No se pudo cargar la evolución."
        );

        return null;
    }

    return data;
},


async actualizarConsulta(id, datos) {

    const user = await obtenerUsuarioAutenticado();
    const consultaPropia = await obtenerConsultaPropia(id, user);

    const disponibilidad =
        await this.validarDisponibilidadTurno({
            fecha: datos.proximoControl,
            hora: datos.proximoControlHora,
            consultaOrigenIdExcluir: id
        });

    if(!disponibilidad.disponible){
        alert(disponibilidad.mensaje);
        return null;
    }

    const { data, error } = await supabaseClient
        .from("consultas")
        .update({

            fecha: datos.fecha,

            motivo: datos.motivo,

            evolucion: datos.evolucion || null,

            diagnostico: datos.diagnostico || null,

            conducta: datos.conducta || null,

            peso: datos.peso || null,

            talla: datos.talla || null,

            imc: datos.imc || null,

            ta_sistolica: datos.taSistolica || null,

            ta_diastolica: datos.taDiastolica || null,

            frecuencia_cardiaca:
                datos.frecuenciaCardiaca || null,

            temperatura:
                datos.temperatura || null,

            saturacion:
                datos.saturacion || null,

            proximo_control:
                datos.proximoControl || null,

            proximo_control_hora:
                datos.proximoControlHora || null

        })
        .eq("id", id)
        .eq("paciente_id", consultaPropia.paciente_id)
        .select()
        .single();

    if (error) {

        registrarErrorSeguro("No se pudo actualizar la evolución.", error);

        alert(
            "No se pudo actualizar la evolución."
        );

        return null;
    }

    await this.sincronizarTurnoDesdeConsulta(data);

    return data;
},

async eliminarConsulta(id) {

    const user = await obtenerUsuarioAutenticado();
    const consultaPropia = await obtenerConsultaPropia(id, user);

    const { error } = await supabaseClient
        .from("consultas")
        .delete()
        .eq("id", id)
        .eq("paciente_id", consultaPropia.paciente_id);

    if (error) {

        registrarErrorSeguro("No se pudo eliminar la evolución.", error);

        alert(
            "No se pudo eliminar la evolución."
        );

        return false;
    }

    return true;
},

async subirArchivo(pacienteId, archivo, descripcion = ""){

    const user = await obtenerUsuarioAutenticado();
    await asegurarPacientePropio(pacienteId, user);
    await validarContenidoArchivo(archivo);

    const extension = archivo.name.split(".").pop().toLowerCase();
    const baseSegura = archivo.name
        .slice(0, -(extension.length + 1))
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100) || "archivo";

    const nombreSeguro = `${baseSegura}.${extension}`;

    const ruta =
        `${user.id}/${pacienteId}/${crypto.randomUUID()}-${nombreSeguro}`;

    const { error: uploadError } =
        await supabaseClient.storage
            .from("estudios")
            .upload(ruta, archivo, {
                contentType: archivo.type,
                upsert: false
            });

    if(uploadError){
        throw uploadError;
    }

    const { data, error: insertError } =
        await supabaseClient
            .from("archivos")
            .insert({
                paciente_id: pacienteId,
                consulta_id: null,
                nombre: archivo.name,
                tipo: archivo.type || "application/octet-stream",
                url: ruta,
                descripcion: descripcion.trim() || null
            })
            .select()
            .single();

    if(insertError){

        await supabaseClient.storage
            .from("estudios")
            .remove([ruta]);

        throw insertError;
    }

    return data;
},


async cargarArchivos(pacienteId){

    const user = await obtenerUsuarioAutenticado();
    await asegurarPacientePropio(pacienteId, user);

    const { data, error } =
        await supabaseClient
            .from("archivos")
            .select("*")
            .eq("paciente_id", pacienteId)
            .order("created_at", {
                ascending: false
            });

    if(error){
        throw error;
    }

    return data || [];
},


async crearURLArchivo(archivoId){

    const user = await obtenerUsuarioAutenticado();
    const archivo = await obtenerArchivoPropio(archivoId, user);

    const { data, error } =
        await supabaseClient.storage
            .from("estudios")
            .createSignedUrl(archivo.url, 300);

    if(error){
        throw error;
    }

    return data.signedUrl;
},


async descargarArchivo(archivoId){

    const user = await obtenerUsuarioAutenticado();
    const archivo = await obtenerArchivoPropio(archivoId, user);

    const { data, error } =
        await supabaseClient.storage
            .from("estudios")
            .download(archivo.url);

    if(error){
        throw error;
    }

    return {
        blob: data,
        nombre: archivo.nombre,
        tipo: archivo.tipo
    };
},


async eliminarArchivo(id){

    const user = await obtenerUsuarioAutenticado();
    const archivo = await obtenerArchivoPropio(id, user);

    const { error: storageError } =
        await supabaseClient.storage
            .from("estudios")
            .remove([archivo.url]);

    if(storageError){
        throw storageError;
    }

    const { error: databaseError } =
        await supabaseClient
            .from("archivos")
            .delete()
            .eq("id", archivo.id)
            .eq("paciente_id", archivo.paciente_id);

    if(databaseError){
        throw databaseError;
    }

    return true;
}
    

};
