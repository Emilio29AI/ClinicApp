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
                    <h2>Nueva evolución</h2>
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

                    Guardar evolución

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
            document.getElementById("evProximoControl").value || null

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
                    <h2>${p.nombreCompleto}</h2>
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