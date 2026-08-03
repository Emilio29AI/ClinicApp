const supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_KEY
)

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

        const { data, error } = await supabaseClient
            .from("pacientes")
            .select("*")
            .order("apellido");

        if(error){
            console.error(error);
            return [];
        }

        const { data: fechasConsultas, error: fechasError } =
            await supabaseClient
                .from("consultas")
                .select("paciente_id, fecha")
                .order("fecha", { ascending: false });

        if(fechasError){
            console.error(fechasError);
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

    const {data: { user }} = await supabaseClient.auth.getUser();

        if(!user){throw new Error("No hay un médico autenticado.");}

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

        console.error(error);

        alert("No se pudo guardar el paciente: " + error.message);

        return null;

    }

    return data;

    },
    
    async editarPaciente(datos){

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
        .select()
        .single();

    if(error){

        console.error(error);

        alert(
            "No se pudo actualizar el paciente: " +
            error.message
        );

        return null;

    }

    return data;

},

    async eliminarPaciente(id){

    const { error } = await supabaseClient
        .from("pacientes")
        .delete()
        .eq("id", id);

    if(error){
        console.error(error);
        alert(error.message);
        return false;
    }

    return true;

},
    
    async agregarConsulta(datos){

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
                datos.proximoControl

        })
        .select()
        .single();

    if(error){

        console.error(error);

        alert(
            "No se pudo guardar la evolución: " +
            error.message
        );

        return null;

    }

    return data;

},
    
    async cargarConsultas(pacienteId){

        const { data, error } = await supabaseClient

            .from("consultas")

            .select("*")

            .eq("paciente_id", pacienteId)

            .order("fecha", { ascending: false });

        if(error){

            console.error(error);

            return [];

        }

        return data;

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
        console.error("Error al cargar el perfil:", error);
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
        console.error("Error al actualizar el perfil:", error);
        throw error;
    }

    return data;
},

async cargarConsultaPorId(id) {

    const { data, error } = await supabaseClient
        .from("consultas")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {

        console.error(
            "Error al cargar la evolución:",
            error
        );

        alert(
            "No se pudo cargar la evolución: " +
            error.message
        );

        return null;
    }

    return data;
},


async actualizarConsulta(id, datos) {

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
                datos.proximoControl || null

        })
        .eq("id", id)
        .select()
        .single();

    if (error) {

        console.error(
            "Error al actualizar la evolución:",
            error
        );

        alert(
            "No se pudo actualizar la evolución: " +
            error.message
        );

        return null;
    }

    return data;
},

async eliminarConsulta(id) {

    const { error } = await supabaseClient
        .from("consultas")
        .delete()
        .eq("id", id);

    if (error) {

        console.error(
            "Error al eliminar la evolución:",
            error
        );

        alert(
            "No se pudo eliminar la evolución: " +
            error.message
        );

        return false;
    }

    return true;
},

async subirArchivo(pacienteId, archivo, descripcion = ""){

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if(userError || !user){
        throw new Error("No se pudo identificar al médico.");
    }

    const nombreSeguro = archivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");

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


async crearURLArchivo(ruta){

    const { data, error } =
        await supabaseClient.storage
            .from("estudios")
            .createSignedUrl(ruta, 300);

    if(error){
        throw error;
    }

    return data.signedUrl;
},


async eliminarArchivo(id, ruta){

    const { error: storageError } =
        await supabaseClient.storage
            .from("estudios")
            .remove([ruta]);

    if(storageError){
        throw storageError;
    }

    const { error: databaseError } =
        await supabaseClient
            .from("archivos")
            .delete()
            .eq("id", id);

    if(databaseError){
        throw databaseError;
    }

    return true;
}
    

};
