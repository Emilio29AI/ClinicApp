// ======================================
// MODAL
// ======================================
let evolucionEditandoId = null;

function abrirModalNuevoPaciente() {

    if (document.getElementById("modalOverlay")) return;

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal modal-large patient-form-modal">

            <div class="patient-form-header">

                <div>
                    <h2>Nuevo paciente</h2>
                    <p>Completá los datos principales de la ficha.</p>
                </div>

                <button
                    class="modal-close-button"
                    type="button"
                    onclick="cerrarModal()"
                    aria-label="Cerrar">

                    ×

                </button>

            </div>

            <div class="patient-form-body">

                <div class="form-grid">

                    <div>
                        <label>Apellido *</label>
                        <input id="apellido">
                    </div>

                    <div>
                        <label>Nombre *</label>
                        <input id="nombre">
                    </div>

                    <div>
                        <label>Fecha de nacimiento</label>
                        <input id="fechaNacimiento" type="date">
                    </div>

                    <div>
                        <label>DNI</label>
                        <input id="dni">
                    </div>

                    <div>
                        <label>Sexo</label>

                        <select id="sexo">

                            <option value="">
                                Seleccionar
                            </option>

                            <option value="Femenino">
                                Femenino
                            </option>

                            <option value="Masculino">
                                Masculino
                            </option>

                            <option value="Otro">
                                Otro
                            </option>

                            <option value="No especifica">
                                No especifica
                            </option>

                        </select>

                    </div>

                    <div>
                        <label>Teléfono</label>
                        <input id="telefono">
                    </div>

                    <div>
                        <label>Email</label>
                        <input id="email" type="email">
                    </div>

                    <div>
                        <label>Obra social</label>
                        <input id="obraSocial">
                    </div>

                    <div>
                        <label>N.º de afiliado</label>
                        <input id="nroAfiliado">
                    </div>

                    <div>
                        <label>Dirección</label>
                        <input id="direccion">
                    </div>

                    <div>
                        <label>Ciudad</label>
                        <input id="ciudad">
                    </div>

                    <div>
                        <label>Provincia</label>
                        <input id="provincia">
                    </div>

                    <div>
                        <label>Código postal</label>
                        <input id="codigoPostal">
                    </div>

                    <div>
                        <label>Contacto de emergencia</label>
                        <input id="contactoEmergencia">
                    </div>

                    <div>
                        <label>Teléfono de emergencia</label>
                        <input id="telefonoEmergencia">
                    </div>

                    <div class="form-full-width">

                        <label>Alertas clínicas</label>

                        <input
                            id="alertasClinicas"
                            placeholder="Ej.: alergia a penicilina, anticoagulado">

                    </div>

                    <div class="form-full-width">

                        <label>Observaciones generales</label>

                        <textarea
                            id="observaciones"
                            placeholder="Antecedentes y observaciones relevantes"></textarea>

                    </div>

                </div>

            </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    type="button"
                    onclick="cerrarModal()">

                    Cancelar

                </button>

                <button
                    class="action-button"
                    type="button"
                    onclick="guardarNuevoPaciente()">

                    Guardar

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

}

function cerrarModal() {

    const modal = document.getElementById("modalOverlay");

    if (modal) modal.remove();

}

// ======================================
// GUARDAR PACIENTE
// ======================================

async function guardarNuevoPaciente() {

    const apellido =
        document.getElementById("apellido").value.trim();

    const nombre =
        document.getElementById("nombre").value.trim();

    if (!apellido || !nombre) {

        alert("Apellido y nombre son obligatorios.");

        return;

    }

    const guardado = await Database.agregarPaciente({

        apellido,

        nombre,

        fechaNacimiento:
            document.getElementById("fechaNacimiento").value || null,

        dni:
            document.getElementById("dni").value.trim(),

        sexo:
            document.getElementById("sexo").value,

        telefono:
            document.getElementById("telefono").value.trim(),

        email:
            document.getElementById("email").value.trim(),

        direccion:
            document.getElementById("direccion").value.trim(),

        ciudad:
            document.getElementById("ciudad").value.trim(),

        provincia:
            document.getElementById("provincia").value.trim(),

        codigoPostal:
            document.getElementById("codigoPostal").value.trim(),

        obraSocial:
            document.getElementById("obraSocial").value.trim(),

        nroAfiliado:
            document.getElementById("nroAfiliado").value.trim(),

        contactoEmergencia:
            document.getElementById("contactoEmergencia").value.trim(),

        telefonoEmergencia:
            document.getElementById("telefonoEmergencia").value.trim(),

        alertasClinicas:
            document.getElementById("alertasClinicas").value.trim(),

        observaciones:
            document.getElementById("observaciones").value.trim()

    });

    if (!guardado) return;

    pacientes = await Database.cargarPacientes();

    mostrarListadoPrincipalPacientes();

    const nuevoPaciente = pacientes.find(p =>
        p.apellido === apellido &&
        p.nombre === nombre
    );

    cerrarModal();

    searchInput.value = "";

    if (nuevoPaciente) {

        await mostrarPaciente(nuevoPaciente);

    }

}

function abrirModalNuevaEvolucion(){

    evolucionEditandoId = null;

    if(document.getElementById("modalOverlay")) return;

    const hoy = new Date().toISOString().split("T")[0];

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal modal-large evolution-modal">

            <div class="evolution-modal-header">

                <div>
                    <h2>Nueva consulta</h2>
                    <p>${escaparHTML(pacienteActual.nombreCompleto)}</p>
                </div>

                <button
                    class="modal-close-button"
                    onclick="cerrarModal()"
                    aria-label="Cerrar">

                    ×

                </button>

            </div>

            <div class="evolution-form-section">

                <h3>Consulta</h3>

                <div class="form-grid">

                    <div>
                        <label>Fecha *</label>
                        <input
                            id="evFecha"
                            type="date"
                            value="${hoy}">
                    </div>

                    <div class="form-span-2">
                        <label>Motivo de consulta *</label>
                        <input
                            id="evMotivo"
                            placeholder="Motivo principal de la consulta">
                    </div>

                    <div class="form-full-width">
                        <label>Evolución clínica</label>
                        <textarea
                            id="evTexto"
                            placeholder="Hallazgos, síntomas, cambios y evolución del paciente"></textarea>
                    </div>

                    <div class="form-full-width">
                        <label>Diagnóstico o impresión clínica</label>
                        <textarea
                            id="evDiagnostico"
                            placeholder="Diagnóstico confirmado o presuntivo"></textarea>
                    </div>

                    <div class="form-full-width">
                        <label>Conducta y plan</label>
                        <textarea
                            id="evConducta"
                            placeholder="Indicaciones, tratamiento, estudios y recomendaciones"></textarea>
                    </div>

                </div>

            </div>

            <details class="evolution-optional-section">

                <summary>Antropometría</summary>

                <div class="form-grid optional-fields">

                    <div>
                        <label>Peso (kg)</label>
                        <input
                            id="evPeso"
                            type="number"
                            min="0"
                            step="0.01"
                            oninput="actualizarIMC()">
                    </div>

                    <div>
                        <label>Talla (cm)</label>
                        <input
                            id="evTalla"
                            type="number"
                            min="0"
                            step="0.1"
                            oninput="actualizarIMC()">
                    </div>

                    <div>
                        <label>IMC</label>
                        <input
                            id="evImc"
                            readonly
                            placeholder="Se calcula automáticamente">
                    </div>

                </div>

            </details>

            <details class="evolution-optional-section">

                <summary>Signos vitales</summary>

                <div class="form-grid optional-fields">

                    <div>
                        <label>TA sistólica</label>
                        <input
                            id="evTaSistolica"
                            type="number"
                            min="0">
                    </div>

                    <div>
                        <label>TA diastólica</label>
                        <input
                            id="evTaDiastolica"
                            type="number"
                            min="0">
                    </div>

                    <div>
                        <label>Frecuencia cardíaca</label>
                        <input
                            id="evFrecuenciaCardiaca"
                            type="number"
                            min="0">
                    </div>

                    <div>
                        <label>Temperatura (°C)</label>
                        <input
                            id="evTemperatura"
                            type="number"
                            min="0"
                            step="0.1">
                    </div>

                    <div>
                        <label>Saturación (%)</label>
                        <input
                            id="evSaturacion"
                            type="number"
                            min="0"
                            max="100">
                    </div>

                </div>

            </details>

            <div class="evolution-form-section">

                <h3>Seguimiento</h3>

                <div class="form-grid">

            <div>
                <label>Próximo control</label>
                <input
                id="evProximoControl"
                type="date">
            </div>

    <div>
        <label>Hora</label>
        <input
            id="evProximoControlHora"
            type="time">
    </div>

</div>

            </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    onclick="cerrarModal()">

                    Cancelar

                </button>

                <button
                    class="action-button"
                    id="guardarEvolucionButton"
                    onclick="guardarEvolucion()">

                    Guardar consulta

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

}

async function abrirEdicionEvolucion(id){

    const consulta =
        await Database.cargarConsultaPorId(id);

    if(!consulta) return;

    const modalDetalle =
        document.getElementById("modalOverlay");

    if(modalDetalle){
        modalDetalle.remove();
    }

    abrirModalNuevaEvolucion();

    evolucionEditandoId = consulta.id;

    const modal =
        document.getElementById("modalOverlay");

    if(!modal) return;

    const titulo =
        modal.querySelector(".evolution-modal-header h2");

    if(titulo){
        titulo.textContent = "Editar evolución";
    }

    document.getElementById("evFecha").value =
        consulta.fecha || "";

    document.getElementById("evMotivo").value =
        consulta.motivo || "";

    document.getElementById("evTexto").value =
        consulta.evolucion || "";

    document.getElementById("evDiagnostico").value =
        consulta.diagnostico || "";

    document.getElementById("evConducta").value =
        consulta.conducta || "";

    document.getElementById("evPeso").value =
        consulta.peso ?? "";

    document.getElementById("evTalla").value =
        consulta.talla ?? "";

    document.getElementById("evImc").value =
        consulta.imc ?? "";

    document.getElementById("evTaSistolica").value =
        consulta.ta_sistolica ?? "";

    document.getElementById("evTaDiastolica").value =
        consulta.ta_diastolica ?? "";

    document.getElementById("evFrecuenciaCardiaca").value =
        consulta.frecuencia_cardiaca ?? "";

    document.getElementById("evTemperatura").value =
        consulta.temperatura ?? "";

    document.getElementById("evSaturacion").value =
        consulta.saturacion ?? "";

    document.getElementById("evProximoControl").value =
        consulta.proximo_control || "";

    document.getElementById("evProximoControlHora").value =
    consulta.proximo_control_hora || "";

    const boton =
        document.getElementById("guardarEvolucionButton");

    boton.textContent = "Actualizar evolución";

    const tieneAntropometria =
        consulta.peso ||
        consulta.talla ||
        consulta.imc;

    const tieneSignosVitales =
        consulta.ta_sistolica ||
        consulta.ta_diastolica ||
        consulta.frecuencia_cardiaca ||
        consulta.temperatura ||
        consulta.saturacion;

    const secciones =
        modal.querySelectorAll(
            ".evolution-optional-section"
        );

    if(tieneAntropometria && secciones[0]){
        secciones[0].open = true;
    }

    if(tieneSignosVitales && secciones[1]){
        secciones[1].open = true;
    }

}

function actualizarIMC(){

    const peso = Number(
        document.getElementById("evPeso")?.value
    );

    const tallaCm = Number(
        document.getElementById("evTalla")?.value
    );

    const campoImc =
        document.getElementById("evImc");

    if(!campoImc) return;

    if(!peso || !tallaCm){

        campoImc.value = "";

        return;

    }

    const tallaMetros = tallaCm / 100;

    campoImc.value = (
        peso / (tallaMetros * tallaMetros)
    ).toFixed(2);

}

async function guardarEvolucion(){

    const fecha =
        document.getElementById("evFecha").value;

    const motivo =
        document.getElementById("evMotivo").value.trim();

    if(!fecha || !motivo){

        alert("La fecha y el motivo son obligatorios.");

        return;
    }

    const boton =
        document.getElementById("guardarEvolucionButton");

    boton.disabled = true;

    boton.textContent =
        evolucionEditandoId
            ? "Actualizando..."
            : "Guardando...";

    const datos = {

        pacienteId: pacienteActual.id,

        fecha,

        motivo,

        evolucion:
            document.getElementById("evTexto").value.trim(),

        diagnostico:
            document.getElementById("evDiagnostico").value.trim(),

        conducta:
            document.getElementById("evConducta").value.trim(),

        peso:
            document.getElementById("evPeso").value || null,

        talla:
            document.getElementById("evTalla").value || null,

        imc:
            document.getElementById("evImc").value || null,

        taSistolica:
            document.getElementById("evTaSistolica").value || null,

        taDiastolica:
            document.getElementById("evTaDiastolica").value || null,

        frecuenciaCardiaca:
            document.getElementById("evFrecuenciaCardiaca").value || null,

        temperatura:
            document.getElementById("evTemperatura").value || null,

        saturacion:
            document.getElementById("evSaturacion").value || null,

        proximoControl:
            document.getElementById("evProximoControl").value || null,

        proximoControlHora:
            document.getElementById("evProximoControlHora").value || null

    };

    let guardado;

    if(evolucionEditandoId){

        guardado =
            await Database.actualizarConsulta(
                evolucionEditandoId,
                datos
            );

    }else{

        guardado =
            await Database.agregarConsulta(datos);

    }

    if(!guardado){

        boton.disabled = false;

        boton.textContent =
            evolucionEditandoId
                ? "Actualizar evolución"
                : "Guardar evolución";

        return;
    }

    evolucionEditandoId = null;

    cerrarModal();

    await mostrarPaciente(pacienteActual);

}

function escaparAtributo(valor){

    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

}

function abrirModalEditarPaciente(){

    if(!pacienteActual) return;

    if(document.getElementById("modalOverlay")) return;

    const p = pacienteActual;

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal modal-large patient-form-modal">

            <div class="patient-form-header">

                <div>
                    <h2>Editar paciente</h2>
                    <p>Actualizá los datos de la ficha del paciente.</p>
                </div>

            <button
            class="modal-close-button"
            type="button"
            onclick="cerrarModal()"
            aria-label="Cerrar">

            ×

            </button>

            </div>

        <div class="patient-form-body">

            <div class="form-grid">

                <div>
                    <label>Apellido *</label>
                    <input
                        id="editApellido"
                        value="${escaparAtributo(p.apellido)}">
                </div>

                <div>
                    <label>Nombre *</label>
                    <input
                        id="editNombre"
                        value="${escaparAtributo(p.nombre)}">
                </div>

                <div>
                    <label>Fecha de nacimiento</label>
                    <input
                        id="editFechaNacimiento"
                        type="date"
                        value="${p.fechaNacimiento || ""}">
                </div>

                <div>
                    <label>DNI</label>
                    <input
                        id="editDni"
                        value="${escaparAtributo(p.dni)}">
                </div>

                <div>
                    <label>Sexo</label>

                    <select id="editSexo">

                        <option value="">Seleccionar</option>

                        <option value="Femenino"
                            ${p.sexo === "Femenino" ? "selected" : ""}>
                            Femenino
                        </option>

                        <option value="Masculino"
                            ${p.sexo === "Masculino" ? "selected" : ""}>
                            Masculino
                        </option>

                        <option value="Otro"
                            ${p.sexo === "Otro" ? "selected" : ""}>
                            Otro
                        </option>

                        <option value="No especifica"
                            ${p.sexo === "No especifica" ? "selected" : ""}>
                            No especifica
                        </option>

                    </select>
                </div>

                <div>
                    <label>Teléfono</label>
                    <input
                        id="editTelefono"
                        value="${escaparAtributo(p.telefono)}">
                </div>

                <div>
                    <label>Email</label>
                    <input
                        id="editEmail"
                        type="email"
                        value="${escaparAtributo(p.email)}">
                </div>

                <div>
                    <label>Obra social</label>
                    <input
                        id="editObraSocial"
                        value="${escaparAtributo(p.obraSocial)}">
                </div>

                <div>
                    <label>N.º de afiliado</label>
                    <input
                        id="editNroAfiliado"
                        value="${escaparAtributo(p.nroAfiliado)}">
                </div>

                <div>
                    <label>Dirección</label>
                    <input
                        id="editDireccion"
                        value="${escaparAtributo(p.direccion)}">
                </div>

                <div>
                    <label>Ciudad</label>
                    <input
                        id="editCiudad"
                        value="${escaparAtributo(p.ciudad)}">
                </div>

                <div>
                    <label>Provincia</label>
                    <input
                        id="editProvincia"
                        value="${escaparAtributo(p.provincia)}">
                </div>

                <div>
                    <label>Código postal</label>
                    <input
                        id="editCodigoPostal"
                        value="${escaparAtributo(p.codigoPostal)}">
                </div>

                <div>
                    <label>Contacto de emergencia</label>
                    <input
                        id="editContactoEmergencia"
                        value="${escaparAtributo(p.contactoEmergencia)}">
                </div>

                <div>
                    <label>Teléfono de emergencia</label>
                    <input
                        id="editTelefonoEmergencia"
                        value="${escaparAtributo(p.telefonoEmergencia)}">
                </div>

                <div class="form-full-width">
                    <label>Alertas clínicas</label>
                    <input id="editAlertasClinicas" value="${escaparAtributo(p.alertasClinicas)}"
                    placeholder="Ej.: alergia a penicilina, anticoagulado">
                </div>

                <div class="form-full-width">

                    <label>Observaciones generales</label>

                    <textarea id="editObservaciones">${escaparHTML(
                        p.observaciones || ""
                    )}</textarea>

                </div>

            </div>
        </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    onclick="cerrarModal()">

                    Cancelar

                </button>

                <button
                    class="action-button"
                    onclick="guardarEdicionPaciente()">

                    Actualizar

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

}

async function guardarEdicionPaciente(){

    const apellido =
        document.getElementById("editApellido").value.trim();

    const nombre =
        document.getElementById("editNombre").value.trim();

    if(!apellido || !nombre){

        alert("Apellido y nombre son obligatorios.");

        return;

    }

    const actualizado = await Database.editarPaciente({

        id: pacienteActual.id,

        apellido,

        nombre,

        fechaNacimiento:
            document.getElementById("editFechaNacimiento").value || null,

        dni:
            document.getElementById("editDni").value.trim(),

        sexo:
            document.getElementById("editSexo").value,

        telefono:
            document.getElementById("editTelefono").value.trim(),

        email:
            document.getElementById("editEmail").value.trim(),

        obraSocial:
            document.getElementById("editObraSocial").value.trim(),

        nroAfiliado:
            document.getElementById("editNroAfiliado").value.trim(),

        direccion:
            document.getElementById("editDireccion").value.trim(),

        ciudad:
            document.getElementById("editCiudad").value.trim(),

        provincia:
            document.getElementById("editProvincia").value.trim(),

        codigoPostal:
            document.getElementById("editCodigoPostal").value.trim(),

        contactoEmergencia:
            document.getElementById("editContactoEmergencia").value.trim(),

        telefonoEmergencia:
            document.getElementById("editTelefonoEmergencia").value.trim(),
        
        alertasClinicas:
            document .getElementById("editAlertasClinicas").value.trim(),

        observaciones:
            document.getElementById("editObservaciones").value.trim()

    });

    if(!actualizado) return;

    cerrarModal();

    pacientes = await Database.cargarPacientes();

    mostrarListadoPrincipalPacientes();

    const pacienteRecargado = pacientes.find(
    p => p.id === actualizado.id
    );

    if(pacienteRecargado){

        pacienteActual = pacienteRecargado;

    await mostrarPaciente(pacienteActual);

    }

}

function abrirFichaCompletaPaciente(){

    if(!pacienteActual) return;

    if(document.getElementById("modalOverlay")) return;

    const p = pacientes.find(paciente => paciente.id === pacienteActual.id) || pacienteActual;
    pacienteActual = p;

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal modal-large patient-file-modal">

            <div class="full-file-header">

                <div>
                    <h2>${escaparHTML(p.nombreCompleto)}</h2>
                    <p>Ficha completa del paciente</p>
                </div>

                <button
                    class="modal-close-button"
                    onclick="cerrarModal()"
                    aria-label="Cerrar">

                    ×

                </button>

            </div>

            <div class="full-file-section">

                <h3>Datos personales</h3>

                <div class="full-file-grid">

                    ${crearDatoFicha("Apellido", p.apellido)}
                    ${crearDatoFicha("Nombre", p.nombre)}
                    ${crearDatoFicha("Fecha de nacimiento", formatearFecha(p.fechaNacimiento))}
                    ${crearDatoFicha("Edad", p.edad !== null && p.edad !== undefined ? `${p.edad} años` : "-")}
                    ${crearDatoFicha("DNI", p.dni)}
                    ${crearDatoFicha("Sexo", p.sexo)}

                </div>

            </div>

            <div class="full-file-section">

                <h3>Contacto</h3>

                <div class="full-file-grid">

                    ${crearDatoFicha("Teléfono", p.telefono)}
                    ${crearDatoFicha("Email", p.email)}
                    ${crearDatoFicha("Dirección", p.direccion)}
                    ${crearDatoFicha("Ciudad", p.ciudad)}
                    ${crearDatoFicha("Provincia", p.provincia)}
                    ${crearDatoFicha("Código postal", p.codigoPostal)}

                </div>

            </div>

            <div class="full-file-section">

                <h3>Cobertura médica</h3>

                <div class="full-file-grid">

                    ${crearDatoFicha("Obra social", p.obraSocial)}
                    ${crearDatoFicha("N.º de afiliado", p.nroAfiliado)}

                </div>

            </div>

            <div class="full-file-section">

                <h3>Contacto de emergencia</h3>

                <div class="full-file-grid">

                    ${crearDatoFicha("Nombre", p.contactoEmergencia)}
                    ${crearDatoFicha("Teléfono", p.telefonoEmergencia)}

                </div>

            </div>

            <div class="full-file-section full-file-alerts-section">
                <h3>Alertas clínicas</h3>
                <div class="full-file-alerts">${p.alertasClinicas? escaparHTML(p.alertasClinicas):
                "Sin alertas clínicas registradas."}
                </div>
            </div>

            <div class="full-file-section full-file-observations-section">

                <h3>Observaciones generales</h3>

                <div class="full-file-observations">
                    ${p.observaciones
                        ? escaparHTML(p.observaciones)
                        : "Sin observaciones registradas."
                    }
                </div>

            </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    onclick="cerrarModal()">

                    Cerrar

                </button>

                <button
                    class="secondary-button export-pdf-button"
                    type="button"
                    onclick="exportarFichaPDF()">

                    Exportar Historia Clinica

                </button>

                <button
                    class="action-button"
                    onclick="cerrarModal(); abrirModalEditarPaciente();">

                    Editar ficha

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

}


function crearDatoFicha(etiqueta, valor){

    return `

        <div class="full-file-item">

            <span>${etiqueta}</span>

            <strong>
                ${valor !== null && valor !== undefined && valor !== ""
                    ? escaparHTML(String(valor))
                    : "-"
                }
            </strong>

        </div>

    `;

}

async function exportarFichaPDF(){

    if(!pacienteActual) return;

    const { data: consultas, error } =
        await supabaseClient
            .from("consultas")
            .select("*")
            .eq("paciente_id", pacienteActual.id)
            .order("fecha", { ascending:false });

    if(error){

        console.error(error);

        alert(
            "No se pudo preparar el PDF: " +
            error.message
        );

        return;
    }

    const perfil =
        perfilMedicoActual || {};

    const nombreProfesional = [
        perfil.nombre,
        perfil.apellido
    ]
        .filter(Boolean)
        .join(" ");

    const evolucionesHTML =
        consultas && consultas.length
            ? consultas.map((consulta, indice) => {

                const tension =
                    consulta.ta_sistolica ||
                    consulta.ta_diastolica
                        ? `${consulta.ta_sistolica || "-"} / ${consulta.ta_diastolica || "-"}`
                        : "-";

                return `

                    <section class="print-evolution">

                        <div class="print-evolution-header">

                            <h3>
                                Consulta ${consultas.length - indice}
                            </h3>

                            <strong>
                                ${formatearFecha(consulta.fecha)}
                            </strong>

                        </div>

                        ${crearCampoPDF(
                            "Motivo de consulta",
                            consulta.motivo
                        )}

                        ${crearCampoPDF(
                            "Evolución clínica",
                            consulta.evolucion
                        )}

                        ${crearCampoPDF(
                            "Diagnóstico o impresión clínica",
                            consulta.diagnostico
                        )}

                        ${crearCampoPDF(
                            "Conducta y plan",
                            consulta.conducta
                        )}

                        <div class="print-measurements">

                            ${crearDatoPDF(
                                "Peso",
                                consulta.peso
                                    ? `${consulta.peso} kg`
                                    : null
                            )}

                            ${crearDatoPDF(
                                "Talla",
                                consulta.talla
                                    ? `${consulta.talla} cm`
                                    : null
                            )}

                            ${crearDatoPDF(
                                "IMC",
                                consulta.imc
                            )}

                            ${crearDatoPDF(
                                "Tensión arterial",
                                tension !== "-"
                                    ? tension
                                    : null
                            )}

                            ${crearDatoPDF(
                                "Frecuencia cardíaca",
                                consulta.frecuencia_cardiaca
                                    ? `${consulta.frecuencia_cardiaca} lpm`
                                    : null
                            )}

                            ${crearDatoPDF(
                                "Temperatura",
                                consulta.temperatura
                                    ? `${consulta.temperatura} °C`
                                    : null
                            )}

                            ${crearDatoPDF(
                                "Saturación",
                                consulta.saturacion
                                    ? `${consulta.saturacion} %`
                                    : null
                            )}

                        </div>

                        ${
                            consulta.proximo_control
                                ? `
                                    <div class="print-next-control">
                                        Próximo control:
                                        <strong>
                                            ${formatearFecha(
                                                consulta.proximo_control
                                            )}
                                        </strong>
                                    </div>
                                `
                                : ""
                        }

                    </section>

                `;

            }).join("")
            : `
                <p class="print-empty">
                    No hay consultas registradas.
                </p>
            `;

    const printArea =
        document.createElement("div");

    printArea.id = "printArea";

    printArea.innerHTML = `

        <article class="print-document">

            <header class="print-header">

                <div>
                    <div class="print-brand">
                    ✜ ClinicApp
                    </div>

                    <div class="print-document-title">
                        Historia clínica
                    </div>
                </div>

                <div class="print-professional">

                    ${
                        nombreProfesional
                            ? `<strong>${escaparHTML(nombreProfesional)}</strong>`
                            : ""
                    }

                    ${
                        perfil.especialidad
                            ? `<span>${escaparHTML(perfil.especialidad)}</span>`
                            : ""
                    }

                    ${
                        perfil.matricula
                            ? `<span>Matrícula: ${escaparHTML(perfil.matricula)}</span>`
                            : ""
                    }

                </div>

            </header>

            <section class="print-patient-header">

                <h1>
                    ${escaparHTML(
                        pacienteActual.nombreCompleto
                    )}
                </h1>

                <div class="print-patient-summary">

                    ${crearDatoResumenPDF(
                        "DNI",
                        pacienteActual.dni
                    )}

                    ${crearDatoResumenPDF(
                        "Edad",
                        pacienteActual.edad !== null &&
                        pacienteActual.edad !== undefined
                            ? `${pacienteActual.edad} años`
                            : null
                    )}

                    ${crearDatoResumenPDF(
                        "Obra social",
                        pacienteActual.obraSocial
                    )}

                    ${crearDatoResumenPDF(
                        "Afiliado",
                        pacienteActual.nroAfiliado
                    )}

                    ${crearDatoResumenPDF(
                        "Teléfono",
                        pacienteActual.telefono
                    )}

                    ${crearDatoResumenPDF(
                        "Email",
                        pacienteActual.email
                    )}

                </div>

            </section>

            ${
                pacienteActual.alertasClinicas
                    ? `
                        <section class="print-alerts">
                            <strong>Alertas clínicas</strong>
                            <p>
                                ${escaparHTML(
                                    pacienteActual.alertasClinicas
                                )}
                            </p>
                        </section>
                    `
                    : ""
            }

            ${
                pacienteActual.observaciones
                    ? `
                        <section class="print-observations">
                            <h2>Observaciones generales</h2>
                            <p>
                                ${escaparHTML(
                                    pacienteActual.observaciones
                                )}
                            </p>
                        </section>
                    `
                    : ""
            }

            <section class="print-history">

                <h2>Historial de consultas</h2>

                ${evolucionesHTML}

            </section>

            <footer class="print-footer">

                <span>
                    Documento generado desde ClinicApp
                </span>

                <span>
                    ${new Date().toLocaleDateString("es-AR")}
                </span>

            </footer>

        </article>

    `;

    if(usarExportacionMovilPDF()){

    const nombrePaciente =
        pacienteActual.nombreCompleto
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    await descargarPDFMovil(
        printArea,
        `Historia clinica - ${nombrePaciente}.pdf`
    );

    return;
}


const nombrePacientePDF =
    pacienteActual.nombreCompleto
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();

imprimirConTitulo(
    printArea,
    `Historia clínica - ${nombrePacientePDF}`
);

}


function crearCampoPDF(etiqueta, valor){

    if(!valor) return "";

    return `

        <div class="print-text-field">

            <span>${etiqueta}</span>

            <p>${escaparHTML(String(valor))}</p>

        </div>

    `;

}


function crearDatoPDF(etiqueta, valor){

    if(
        valor === null ||
        valor === undefined ||
        valor === ""
    ){
        return "";
    }

    return `

        <div class="print-measurement">

            <span>${etiqueta}</span>

            <strong>
                ${escaparHTML(String(valor))}
            </strong>

        </div>

    `;

}


function crearDatoResumenPDF(etiqueta, valor){

    if(
        valor === null ||
        valor === undefined ||
        valor === ""
    ){
        return "";
    }

    return `

        <span>
            <strong>${etiqueta}:</strong>
            ${escaparHTML(String(valor))}
        </span>

    `;

}

function abrirModalAdjuntarArchivo(){

    if(!pacienteActual){
        alert("Primero seleccioná un paciente.");
        return;
    }

    if(document.getElementById("modalOverlay")) return;

const overlay = document.createElement("div");

overlay.id = "modalOverlay";
overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal attachment-modal">

            <div class="patient-form-header">

                <div>
                    <h2>Adjuntar archivo o estudio</h2>

                    <p>
                        ${escaparHTML(pacienteActual.nombreCompleto)}
                    </p>
                </div>

                <button
                    class="modal-close-button"
                    type="button"
                    onclick="cerrarModal()"
                >
                    ×
                </button>

            </div>

            <div class="patient-form-body">

                <div class="form-group">

                    <label for="archivoEstudio">
                        Seleccionar archivo
                    </label>

                    <input
                        id="archivoEstudio"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    >

                    <small class="form-help">
                        PDF, JPG, PNG o WEBP. Máximo 15 MB.
                    </small>

                </div>

                <div class="form-group">

                    <label for="descripcionArchivo">
                        Descripción
                    </label>

                    <textarea
                        id="descripcionArchivo"
                        rows="3"
                        placeholder="Ejemplo: Análisis de sangre, control anual"
                    ></textarea>

                </div>

                <p
                    id="archivoMensaje"
                    class="form-message"
                ></p>

            </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    type="button"
                    onclick="cerrarModal()"
                >
                    Cancelar
                </button>

                <button
                    id="guardarArchivoButton"
                    class="action-button"
                    type="button"
                    onclick="guardarArchivoPaciente()"
                >
                    Adjuntar archivo
                </button>

            </div>

        </div>

    `;
    document.body.appendChild(overlay);
}

async function guardarArchivoPaciente(){

    const input =
        document.getElementById("archivoEstudio");

    const descripcion =
        document
            .getElementById("descripcionArchivo")
            .value
            .trim();

    const mensaje =
        document.getElementById("archivoMensaje");

    const boton =
        document.getElementById("guardarArchivoButton");

    const archivo = input.files[0];

    mensaje.textContent = "";

    if(!archivo){

        mensaje.textContent =
            "Seleccioná un archivo.";

        return;
    }

    const tiposPermitidos = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if(!tiposPermitidos.includes(archivo.type)){

        mensaje.textContent =
            "El archivo debe ser PDF, JPG, PNG o WEBP.";

        return;
    }

    const limite = 15 * 1024 * 1024;

    if(archivo.size > limite){

        mensaje.textContent =
            "El archivo supera el límite de 15 MB.";

        return;
    }

    try{

        boton.disabled = true;
        boton.textContent = "Subiendo...";

        await Database.subirArchivo(
            pacienteActual.id,
            archivo,
            descripcion
        );

        cerrarModal();

        await cargarArchivosPaciente();

    }catch(error){

        console.error(
            "Error al adjuntar archivo:",
            error
        );

        mensaje.textContent =
            "No se pudo adjuntar el archivo: " +
            (error.message || "Error desconocido");

        boton.disabled = false;
        boton.textContent = "Adjuntar archivo";
    }
}
