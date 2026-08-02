// ==========================================
// MEDICA APP
// APP.JS
// ==========================================


// ----------------------------
// REFERENCIAS
// ----------------------------

const today = document.getElementById("today");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const patientPanel = document.getElementById("patientPanel");
const LIMITE_PACIENTES_RECIENTES = 4;

let pacientes = [];
let pacienteActual = null;
let perfilMedicoActual = null;
let mostrandoTodosPacientes = false;



// ----------------------------
// FECHA
// ----------------------------

function cargarFecha() {

    today.textContent = new Date().toLocaleDateString("es-AR", {

        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"

    });

}


// ----------------------------
// LISTADO
// ----------------------------

function renderPacientes(lista) {

    results.innerHTML = "";

    if (lista.length === 0) {

        results.innerHTML = `
            <div style="padding:25px;color:#777;">
                No se encontraron pacientes.
            </div>
        `;

        return;

    }

    lista.forEach(p => {

        const card = document.createElement("div");

        card.className = pacienteActual && pacienteActual.id === p.id
            ? "patient-card active"
            : "patient-card";

        card.dataset.patientId = p.id;

        card.innerHTML = `

            <div class="patient-name">

                ${p.nombreCompleto}

            </div>

            <div class="patient-info">

                ${p.edad} años

            </div>

            <div class="patient-info">

                ${p.obraSocial}

            </div>

            <div class="patient-info" style="margin-top:10px;">

                Última consulta:
                ${p.ultimaConsulta
    ? new Date(p.ultimaConsulta).toLocaleDateString("es-AR")
    : "-"}

            </div>

        `;

        card.addEventListener("click", () => {

            mostrarPaciente(p);

        });

        results.appendChild(card);

    });

}

function formatearFecha(fecha){

    if(!fecha) return "-";

    const partes = fecha.split("-");

    if(partes.length === 3){
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return new Date(fecha).toLocaleDateString("es-AR");

}


function escaparHTML(texto){

    if(!texto) return "";

    const div = document.createElement("div");

    div.textContent = texto;

    return div.innerHTML;

}


// ----------------------------
// PANEL DERECHO
// ----------------------------

function limitarTexto(texto, limite){

    const valor = String(texto || "").trim();

    if(valor.length <= limite){
        return valor;
    }

    return valor.slice(0, limite).trim() + "…";

}


function crearMetricaEvolucion(etiqueta, valor){

    if(
        valor === null ||
        valor === undefined ||
        valor === ""
    ){
        return "";
    }

    return `

        <div class="evolution-metric">

            <span>${etiqueta}</span>

            <strong>
                ${escaparHTML(String(valor))}
            </strong>

        </div>

    `;

}

async function mostrarPaciente(p){

    pacienteActual = p;

    document
    .querySelectorAll(".patient-card")
    .forEach(card => {

        card.classList.toggle(
            "active",
            card.dataset.patientId === p.id
        );

    });

    const edad = p.edad;

    patientPanel.innerHTML = `

    <div class="patient-header">

        <div>
            <h1>${p.nombreCompleto}</h1>

            <div class="patient-summary">

            <span>
                ${p.obraSocial || "Sin obra social"}
                ${p.nroAfiliado ? ` · Afiliado: ${p.nroAfiliado}` : ""}
            </span>

            ${p.edad !== null && p.edad !== undefined? `<span>${p.edad} años</span>`: ""}

            ${p.dni? `<span>DNI ${escaparHTML(p.dni)}</span>`: ""}

            ${p.telefono? `<span>${escaparHTML(p.telefono)}</span>`: ""}

            ${p.email? `<span>${escaparHTML(p.email)}</span>`: ""}

</div>
        </div>

        <div class="patient-actions">

            <button
                class="secondary-button"
                onclick="abrirFichaCompletaPaciente()">

                Ver ficha completa

            </button>

            <button
                class="secondary-button"
                onclick="abrirModalEditarPaciente()">

                Editar

            </button>

            <button
                class="danger-button"
                onclick="eliminarPaciente()">

                Eliminar

            </button>

        </div>

    </div>

    <div class="clinical-alerts ${p.alertasClinicas ? "has-alerts" : ""}">
    <span>Alertas clínicas: </span>

    <strong>
        ${
            p.alertasClinicas
                ? escaparHTML(p.alertasClinicas)
                : "Sin alertas clínicas registradas."
        }
    </strong>
</div>

<details class="patient-files-details">

    <summary>

        <span>Archivos y estudios</span>

        <span class="patient-files-summary-right">

            <span id="patientFilesCount">
                Cargando...
            </span>

            <span class="patient-files-arrow">⌄</span>

        </span>

    </summary>

    <div class="patient-files-content">

        <div class="patient-files-toolbar">

            <button
                class="secondary-button attach-file-button"
                type="button"
                onclick="abrirModalAdjuntarArchivo()">

                + Adjuntar archivo

            </button>

        </div>

        <div id="patientFiles">

            <div class="timeline-empty">
                Cargando archivos...
            </div>

        </div>

    </div>

</details>

<div class="section">

    <h2>Consultas</h2>

        <button
            class="action-button"
            id="newEvolutionButton">

            + Nueva consulta

        </button>

    </div>

    <div id="timeline">

        <div class="timeline-empty">
            Cargando evoluciones...
        </div>

    </div>

`;

document
.getElementById("newEvolutionButton")
.addEventListener("click", abrirModalNuevaEvolucion);


await cargarArchivosPaciente();

const consultas = await Database.cargarConsultas(p.id);

const timeline = document.getElementById("timeline");

if(consultas.length === 0){

    timeline.innerHTML = `
        <div class="timeline-empty">
            Todavía no hay evoluciones registradas.
        </div>
    `;

}else{

    timeline.innerHTML = consultas.map((c, i) => {

    const ta = c.ta_sistolica || c.ta_diastolica
        ? `${c.ta_sistolica || "-"} / ${c.ta_diastolica || "-"}`
        : null;

    return `

        <article class="evolution-card">

            <div class="evolution-header">

                <div>

                    <div class="evolution-date">
                        ${formatearFecha(c.fecha)}
                    </div>

                    <div class="evolution-number">
                        Consulta #${consultas.length - i}
                    </div>

                </div>

                <button
                    class="secondary-button evolution-detail-button"
                    type="button"
                    onclick="verDetalleConsulta('${c.id}', ${consultas.length - i})">
                    
                    Ver detalles

                </button>

            </div>

            <div class="evolution-main">

                <div class="evolution-primary">

                    <span>Motivo de consulta</span>

                    <strong>
                        ${c.motivo
                            ? escaparHTML(c.motivo)
                            : "Sin motivo registrado"
                        }
                    </strong>

                </div>

                ${
                    c.diagnostico
                        ? `
                            <div class="evolution-diagnosis">

                                <span>Diagnóstico / impresión clínica</span>

                                <strong>
                                    ${escaparHTML(c.diagnostico)}
                                </strong>

                            </div>
                        `
                        : ""
                }

                </div>

            <div class="evolution-metrics">

                ${crearMetricaEvolucion(
                    "Peso",
                    c.peso ? `${c.peso} kg` : null
                )}

                ${crearMetricaEvolucion(
                    "IMC",
                    c.imc || null
                )}

                ${crearMetricaEvolucion(
                    "Tensión arterial",
                    ta
                )}

                ${crearMetricaEvolucion(
                    "Frecuencia cardíaca",
                    c.frecuencia_cardiaca
                        ? `${c.frecuencia_cardiaca} lpm`
                        : null
                )}

                ${crearMetricaEvolucion(
                    "Saturación",
                    c.saturacion
                        ? `${c.saturacion} %`
                        : null
                )}

                ${crearMetricaEvolucion(
                    "Temperatura",
                    c.temperatura
                        ? `${c.temperatura} °C`
                        : null
                )}

            </div>

            ${
                c.proximo_control
                    ? `
                        <div class="evolution-next-control">

                            <span>Próximo control</span>

                            <strong>
                                ${formatearFecha(c.proximo_control)}
                            </strong>

                        </div>
                    `
                    : ""
            }

        </article>

    `;

}).join("");

}

}

function obtenerFechaActividadPaciente(paciente){

    const fecha =
        paciente.ultimaConsulta ||
        paciente.createdAt ||
        paciente.updatedAt;

    if(!fecha){
        return 0;
    }

    const timestamp =
        new Date(fecha).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


function ordenarPacientesPorActividad(lista){

    return [...lista].sort((a, b) => {

        const fechaA =
            obtenerFechaActividadPaciente(a);

        const fechaB =
            obtenerFechaActividadPaciente(b);

        if(fechaB !== fechaA){
            return fechaB - fechaA;
        }

        return (a.apellido || "").localeCompare(
            b.apellido || "",
            "es",
            { sensitivity: "base" }
        );

    });

}


function actualizarEncabezadoListaPacientes(texto){

    const titulo =
        document.querySelector(".sidebar-title");

    if(titulo){
        titulo.textContent = texto;
    }

}


function actualizarBotonListaPacientes(){

    const boton =
        document.getElementById(
            "togglePatientListButton"
        );

    if(!boton) return;

    boton.textContent =
        mostrandoTodosPacientes
            ? "Mostrar pacientes recientes"
            : "Ver todos los pacientes";

    boton.hidden =
        pacientes.length <=
        LIMITE_PACIENTES_RECIENTES;

}


function mostrarListadoPrincipalPacientes(){

    const buscador =
        document.getElementById("searchInput");

    if(buscador && buscador.value.trim()){
        buscador.value = "";
    }

    const ordenados =
        ordenarPacientesPorActividad(pacientes);

    if(mostrandoTodosPacientes){

        actualizarEncabezadoListaPacientes(
            `Todos los pacientes (${pacientes.length})`
        );

        renderPacientes(ordenados);

    }else{

        actualizarEncabezadoListaPacientes(
            "Pacientes recientes"
        );

        renderPacientes(
            ordenados.slice(
                0,
                LIMITE_PACIENTES_RECIENTES
            )
        );

    }

    actualizarBotonListaPacientes();

}

function alternarListadoPacientes(){

    mostrandoTodosPacientes =
        !mostrandoTodosPacientes;

    mostrarListadoPrincipalPacientes();

}

// ----------------------------
// BUSCADOR
// ----------------------------

searchInput.addEventListener("input", () => {

    const texto =
        searchInput.value
            .toLowerCase()
            .trim();

    if(!texto){

        mostrarListadoPrincipalPacientes();

        return;
    }

    const filtrados = pacientes.filter(p => {

        const nombre =
            (p.nombre || "").toLowerCase();

        const apellido =
            (p.apellido || "").toLowerCase();

        const nombreCompleto =
            (p.nombreCompleto || "").toLowerCase();

        const dni =
            (p.dni || "").toLowerCase();

        const telefono =
            (p.telefono || "").toLowerCase();

        const email =
            (p.email || "").toLowerCase();

        const obraSocial =
            (p.obraSocial || "").toLowerCase();

        const nroAfiliado =
            (p.nroAfiliado || "").toLowerCase();

        return (
            nombre.includes(texto) ||
            apellido.includes(texto) ||
            nombreCompleto.includes(texto) ||
            dni.includes(texto) ||
            telefono.includes(texto) ||
            email.includes(texto) ||
            obraSocial.includes(texto) ||
            nroAfiliado.includes(texto)
        );

    });

    actualizarEncabezadoListaPacientes(
        `${filtrados.length} ${
            filtrados.length === 1
                ? "resultado"
                : "resultados"
        }`
    );

    renderPacientes(
        ordenarPacientesPorActividad(filtrados)
    );

});


// ----------------------------
// INICIO
// ----------------------------

async function cargarPerfilMedico() {

    try {

        perfilMedicoActual =
            await Database.cargarPerfilMedico();

        mostrarPerfilMedicoEnCabecera();

    } catch (error) {

        console.error(error);

        document.getElementById(
            "doctorProfileName"
        ).textContent = "Mi perfil";

    }

}


function mostrarPerfilMedicoEnCabecera() {

    if (!perfilMedicoActual) return;

    const nombreCompleto = [
        perfilMedicoActual.nombre,
        perfilMedicoActual.apellido
    ]
        .filter(Boolean)
        .join(" ");

    document.getElementById(
        "doctorProfileName"
    ).textContent = nombreCompleto || "Mi perfil";

    document.getElementById(
        "doctorProfileSpecialty"
    ).textContent =
        perfilMedicoActual.especialidad || "";

}


function abrirPerfilMedico() {

    if (!perfilMedicoActual) return;

    const modalAnterior =
        document.getElementById("doctorProfileModal");

    if (modalAnterior) {
        modalAnterior.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id = "doctorProfileModal";
    overlay.className = "modal-overlay";

    overlay.innerHTML = `

        <div class="modal doctor-profile-modal">

            <div class="doctor-profile-modal-header">

                <div>
                    <h2>Perfil profesional</h2>
                    <p>
                        Estos datos identifican al médico dentro de la aplicación.
                    </p>
                </div>

                <button
                    class="modal-close-button"
                    type="button"
                    onclick="cerrarPerfilMedico()">

                    ×

                </button>

            </div>

            <div class="form-grid">

                <div class="form-group">

                    <label for="doctorNombre">
                        Nombre
                    </label>

                    <input
                        id="doctorNombre"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.nombre
                        )}">

                </div>

                <div class="form-group">

                    <label for="doctorApellido">
                        Apellido
                    </label>

                    <input
                        id="doctorApellido"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.apellido
                        )}">

                </div>

                <div class="form-group">

                    <label for="doctorEmail">
                        Email
                    </label>

                    <input
                        id="doctorEmail"
                        type="email"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.email
                        )}"
                        disabled>

                </div>

                <div class="form-group">

                    <label for="doctorTelefono">
                        Teléfono
                    </label>

                    <input
                        id="doctorTelefono"
                        type="tel"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.telefono
                        )}">

                </div>

                <div class="form-group">

                    <label for="doctorMatricula">
                        Matrícula
                    </label>

                    <input
                        id="doctorMatricula"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.matricula
                        )}">

                </div>

                <div class="form-group">

                    <label for="doctorEspecialidad">
                        Especialidad
                    </label>

                    <input
                        id="doctorEspecialidad"
                        value="${escaparAtributoPerfil(
                            perfilMedicoActual.especialidad
                        )}">

                </div>

            </div>

            <div
                id="doctorProfileMessage"
                class="auth-message">
            </div>

            <div class="modal-buttons">

                <button
                    class="secondary-button"
                    type="button"
                    onclick="cerrarPerfilMedico()">

                    Cancelar

                </button>

                <button
                    id="saveDoctorProfileButton"
                    class="action-button"
                    type="button"
                    onclick="guardarPerfilMedico()">

                    Guardar cambios

                </button>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);

}


function cerrarPerfilMedico() {

    const modal =
        document.getElementById("doctorProfileModal");

    if (modal) {
        modal.remove();
    }

}


async function guardarPerfilMedico() {

    const nombre =
        document.getElementById("doctorNombre").value.trim();

    const apellido =
        document.getElementById("doctorApellido").value.trim();

    const telefono =
        document.getElementById("doctorTelefono").value.trim();

    const matricula =
        document.getElementById("doctorMatricula").value.trim();

    const especialidad =
        document.getElementById("doctorEspecialidad").value.trim();

    const mensaje =
        document.getElementById("doctorProfileMessage");

    if (!nombre || !apellido) {

        mensaje.textContent =
            "Nombre y apellido son obligatorios.";

        mensaje.className =
            "auth-message error";

        return;
    }

    const boton =
        document.getElementById("saveDoctorProfileButton");

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {

        perfilMedicoActual =
            await Database.actualizarPerfilMedico({

                nombre,
                apellido,
                telefono,
                matricula,
                especialidad

            });

        mostrarPerfilMedicoEnCabecera();

        mensaje.textContent =
            "Perfil actualizado correctamente.";

        mensaje.className =
            "auth-message success";

        boton.textContent = "Guardado";

        setTimeout(() => {

            cerrarPerfilMedico();

        }, 700);

    } catch (error) {

        console.error(error);

        mensaje.textContent =
            "No se pudo actualizar el perfil.";

        mensaje.className =
            "auth-message error";

        boton.disabled = false;
        boton.textContent = "Guardar cambios";

    }

}


function escaparAtributoPerfil(valor) {

    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

}

document
    .getElementById("logoutButton")
    .addEventListener("click", async () => {

        await supabaseClient.auth.signOut();

        window.location.replace("login.html");

    });

document
    .getElementById("doctorProfileButton")
    .addEventListener("click", abrirPerfilMedico);

const togglePatientListButton =
    document.getElementById("togglePatientListButton");

if(togglePatientListButton){

    togglePatientListButton.addEventListener("click", () => {

        mostrandoTodosPacientes =
            !mostrandoTodosPacientes;

        mostrarListadoPrincipalPacientes();

    });

}

async function iniciar(){

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if(error || !user){

        window.location.replace("login.html");

        return;

    }

    await cargarPerfilMedico();

    cargarFecha();

    pacientes =
        await Database.cargarPacientes();

    mostrarListadoPrincipalPacientes();

}

async function verDetalleConsulta(id, numeroConsulta){

    const consultas =
        await Database.cargarConsultas(pacienteActual.id);

    const consulta = consultas.find(c => c.id === id);

    if(!consulta) return;

    if(document.getElementById("modalOverlay")) return;

    const overlay = document.createElement("div");

    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";

    const tensionArterial =
        consulta.ta_sistolica || consulta.ta_diastolica
            ? `${consulta.ta_sistolica || "-"} / ${consulta.ta_diastolica || "-"} mmHg`
            : "-";

    overlay.innerHTML = `

        <div class="modal modal-large consultation-detail-modal">

            <div class="evolution-modal-header">

                <div>

                    <h2>Consulta Nº${numeroConsulta}</h2>

                    <p>
                        ${escaparHTML(pacienteActual.nombreCompleto)}
                        ·
                        ${formatearFecha(consulta.fecha)}
                    </p>

                </div>

                <button
                    class="modal-close-button"
                    onclick="cerrarModal()"
                    aria-label="Cerrar">

                    ×

                </button>

            </div>

            <div class="consultation-detail-section">

                <h3>Consulta</h3>

                <div class="consultation-detail-grid">

                    ${crearDatoConsulta(
                        "Fecha",
                        formatearFecha(consulta.fecha)
                    )}

                    ${crearDatoConsulta(
                        "Próximo control",
                        formatearFecha(consulta.proximo_control)
                    )}

                    <div class="consultation-detail-full">

                        <span>Motivo de consulta</span>

                        <p>
                            ${consulta.motivo
                                ? escaparHTML(consulta.motivo)
                                : "-"
                            }
                        </p>

                    </div>

                </div>

            </div>

            <div class="consultation-detail-section">

                <h3>Información clínica</h3>

                <div class="consultation-text-block">

                    <span>Evolución clínica</span>

                    <p>
                        ${consulta.evolucion
                            ? escaparHTML(consulta.evolucion)
                            : "-"
                        }
                    </p>

                </div>

                <div class="consultation-text-block">

                    <span>Diagnóstico o impresión clínica</span>

                    <p>
                        ${consulta.diagnostico
                            ? escaparHTML(consulta.diagnostico)
                            : "-"
                        }
                    </p>

                </div>

                <div class="consultation-text-block">

                    <span>Conducta y plan</span>

                    <p>
                        ${consulta.conducta
                            ? escaparHTML(consulta.conducta)
                            : "-"
                        }
                    </p>

                </div>

            </div>

            <div class="consultation-detail-columns">

                <div class="consultation-detail-section">

                    <h3>Antropometría</h3>

                    <div class="consultation-detail-grid">

                        ${crearDatoConsulta(
                            "Peso",
                            consulta.peso
                                ? `${consulta.peso} kg`
                                : "-"
                        )}

                        ${crearDatoConsulta(
                            "Talla",
                            consulta.talla
                                ? `${consulta.talla} cm`
                                : "-"
                        )}

                        ${crearDatoConsulta(
                            "IMC",
                            consulta.imc || "-"
                        )}

                    </div>

                </div>

                <div class="consultation-detail-section">

                    <h3>Signos vitales</h3>

                    <div class="consultation-detail-grid">

                        ${crearDatoConsulta(
                            "Tensión arterial",
                            tensionArterial
                        )}

                        ${crearDatoConsulta(
                            "Frecuencia cardíaca",
                            consulta.frecuencia_cardiaca
                                ? `${consulta.frecuencia_cardiaca} lpm`
                                : "-"
                        )}

                        ${crearDatoConsulta(
                            "Temperatura",
                            consulta.temperatura
                                ? `${consulta.temperatura} °C`
                                : "-"
                        )}

                        ${crearDatoConsulta(
                            "Saturación",
                            consulta.saturacion
                                ? `${consulta.saturacion} %`
                                : "-"
                        )}

                    </div>

                </div>

            </div>

    <div class="modal-buttons">
        <button
        class="secondary-button"
        type="button"
        onclick="this.closest('.modal-overlay').remove()">

        Cerrar

        </button>

        <button
            class="secondary-button export-pdf-button"
            type="button"
            onclick="exportarEvolucionPDF('${consulta.id}', ${numeroConsulta})">
            
            Exportar
            
        </button>

        <button
        class="action-button"
        type="button"
        onclick="abrirEdicionEvolucion('${consulta.id}')">

        Editar

        </button>

        <button
        class="danger-button"
        type="button"
        onclick="eliminarEvolucion('${consulta.id}')">

        Eliminar consulta

        </button>

    </div>

        </div>

    `;

    document.body.appendChild(overlay);

}

async function eliminarEvolucion(id) {

    const confirmado = confirm(
        "¿Está seguro que desea eliminar esta evolución?\n\n" +
        "Esta acción no se puede deshacer."
    );

    if (!confirmado) return;

    const eliminado =
        await Database.eliminarConsulta(id);

    if (!eliminado) return;

    const modal =
        document.getElementById("modalOverlay");

    if (modal) {
        modal.remove();
    }

    await mostrarPaciente(pacienteActual);
}

function crearDatoConsulta(etiqueta, valor){

    return `

        <div class="consultation-detail-item">

            <span>${etiqueta}</span>

            <strong>
                ${
                    valor !== null &&
                    valor !== undefined &&
                    valor !== ""
                        ? escaparHTML(String(valor))
                        : "-"
                }
            </strong>

        </div>

    `;

}

async function eliminarPaciente(){

    if(!confirm("¿Está seguro que desea borrar a este paciente?\n\nEsta acción no se puede deshacer.")) return;

    await Database.eliminarPaciente(
        pacienteActual.id
    );

    pacientes = await Database.cargarPacientes();

    mostrarListadoPrincipalPacientes();

    patientPanel.innerHTML = "";

}

async function exportarEvolucionPDF(id, numeroConsulta){

    const consulta = await Database.cargarConsultaPorId(id);

    if(!consulta){
        alert("No se pudo cargar la evolución.");
        return;
    }

    if(!pacienteActual){
        alert("No hay un paciente seleccionado.");
        return;
    }

    const perfil = perfilMedicoActual || {};

    const profesional = [
        perfil.nombre,
        perfil.apellido
    ]
        .filter(Boolean)
        .join(" ");

    const tension =
        consulta.ta_sistolica || consulta.ta_diastolica
            ? `${consulta.ta_sistolica || "-"} / ${consulta.ta_diastolica || "-"}`
            : null;

    const printArea = document.createElement("div");

    printArea.id = "printArea";

    printArea.innerHTML = `

        <article class="print-document">

            <header class="print-header">

                <div>
                    <div class="print-brand">ClinicApp</div>
                    <div class="print-document-title">
                        Consulta
                    </div>
                </div>

                <div class="print-professional">

                    ${
                        profesional
                            ? `<strong>${escaparHTML(profesional)}</strong>`
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
                    ${escaparHTML(pacienteActual.nombreCompleto)}
                </h1>

                <div class="print-patient-summary">

                    ${crearDatoResumenPDF("DNI", pacienteActual.dni)}

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

                </div>

            </section>

            <section class="print-evolution">

                <div class="print-evolution-header">

                    <h3>Consulta Nº${numeroConsulta}</h3>

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
                        tension
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

    const tituloOriginal = document.title;

    const nombrePacientePDF =
    pacienteActual.nombreCompleto
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    document.title =
    `${nombrePacientePDF} - Consulta ${numeroConsulta}`;

    document.body.appendChild(printArea);

    window.addEventListener(
    "afterprint",
    () => {

        printArea.remove();

        document.title = tituloOriginal;

    },
    { once:true }
);

requestAnimationFrame(() => {
    window.print();
});

}

async function cargarArchivosPaciente(){

    if(!pacienteActual) return;

    const contenedor =
        document.getElementById("patientFiles");

    if(!contenedor) return;

    contenedor.innerHTML = `
        <div class="timeline-empty">
            Cargando archivos...
        </div>
    `;

    try{

        const archivos =
            await Database.cargarArchivos(
                pacienteActual.id
            );

        const contador =
            document.getElementById("patientFilesCount");

        if(contador){contador.textContent =archivos.length === 1
            ? "1 archivo"
            : `${archivos.length} archivos`;
        }

        if(archivos.length === 0){

            const contador =
            document.getElementById("patientFilesCount");

            if(contador){
                contador.textContent = "0 archivos";
            }
            contenedor.innerHTML = `
            <div class="timeline-empty">
            Todavía no hay archivos adjuntos.
            </div>
            `;
        return;
        }

        

        contenedor.innerHTML =
            archivos.map(archivo => `

                <article class="patient-file-card">

                    <div class="patient-file-icon">
                        ${obtenerIconoArchivo(archivo.tipo)}
                    </div>

                    <div class="patient-file-info">

                        <strong>
                            ${escaparHTML(archivo.nombre)}
                        </strong>

                        ${
                            archivo.descripcion
                                ? `
                                    <p>
                                        ${escaparHTML(
                                            archivo.descripcion
                                        )}
                                    </p>
                                `
                                : ""
                        }

                        <span>
                            ${formatearFecha(archivo.created_at)}
                        </span>

                    </div>

                    <div class="patient-file-actions">

                        <button
                            class="secondary-button"
                            type="button"
                            onclick="abrirArchivoPaciente('${archivo.url}')">

                            Ver

                        </button>

                        <button
                            class="danger-button"
                            type="button"
                            onclick="eliminarArchivoPaciente(
                                '${archivo.id}',
                                '${archivo.url}'
                            )">

                            Eliminar

                        </button>

                    </div>

                </article>

            `).join("");

    }catch(error){

        console.error(
            "Error al cargar archivos:",
            error
        );

        contenedor.innerHTML = `
            <div class="timeline-empty">
                No se pudieron cargar los archivos.
            </div>
        `;
    }
}


function obtenerIconoArchivo(tipo){

    if(tipo === "application/pdf"){
        return "PDF";
    }

    if(tipo?.startsWith("image/")){
        return "IMG";
    }

    return "DOC";
}


async function abrirArchivoPaciente(ruta){

    try{

        const url =
            await Database.crearURLArchivo(ruta);

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    }catch(error){

        console.error(
            "Error al abrir archivo:",
            error
        );

        alert("No se pudo abrir el archivo.");
    }
}


async function eliminarArchivoPaciente(id, ruta){

    const confirmar = window.confirm(
        "¿Eliminar este archivo?\n\nEsta acción no se puede deshacer."
    );

    if(!confirmar) return;

    try{

        await Database.eliminarArchivo(
            id,
            ruta
        );

        await cargarArchivosPaciente();

    }catch(error){

        console.error(
            "Error al eliminar archivo:",
            error
        );

        alert(
            "No se pudo eliminar el archivo: " +
            (error.message || "Error desconocido")
        );
    }
}

function usarExportacionMovilPDF(){

    const pantallaMovil =
        window.matchMedia("(max-width: 768px)").matches;

    const instaladaComoApp =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    return pantallaMovil || instaladaComoApp;
}


async function descargarPDFMovil(printArea, nombreArchivo){

const opciones = {
        margin: [8, 8, 8, 8],
        filename: nombreArchivo,
        image: {
            type: "jpeg",
            quality: 0.98
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        },
        pagebreak: {
            mode: ["css", "legacy"]
        }
    };

    try{

        await html2pdf()
            .set(opciones)
            .from(contenedor)
            .save();

    }catch(error){

        console.error(
            "Error al generar PDF móvil:",
            error
        );

        alert("No se pudo generar el PDF.");

    }finally{

        contenedor.remove();

        window.scrollTo(0, scrollAnterior);

    }

}


// ----------------------------
// BOTÓN NUEVO PACIENTE
// ----------------------------

document
.getElementById("newPatientButton")
.addEventListener("click", abrirModalNuevoPaciente);

iniciar();