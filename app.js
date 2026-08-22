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
let graficoEvolucionActual = null;
let metricaGraficoActual = "peso";
let proximosTurnos = [];



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

                ${escaparHTML(p.nombreCompleto)}

            </div>

            <div class="patient-info">

                ${p.edad} años

            </div>

            <div class="patient-info">

                ${escaparHTML(p.obraSocial)}

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

    const fechaSimple =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

    if(fechaSimple){
        return `${fechaSimple[3]}/${fechaSimple[2]}/${fechaSimple[1]}`;
    }

    const fechaCompleta = new Date(fecha);

    if(Number.isNaN(fechaCompleta.getTime())){
        return "-";
    }

    return fechaCompleta.toLocaleDateString("es-AR");

}

function obtenerFechaLocalISO(){

    const ahora = new Date();

    const año = ahora.getFullYear();

    const mes = String(
        ahora.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        ahora.getDate()
    ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;

}


function obtenerProximoTurno(){

    if(!proximosTurnos.length){
        return null;
    }

    const ahora = new Date();

    /*
     * Primero buscamos turnos futuros
     * que tengan fecha y hora definidas.
     */
    const turnosConHora =
        proximosTurnos
            .filter(turno => {

                if(!turno.fecha || !turno.hora){
                    return false;
                }

                const fechaHora =
                    new Date(
                        `${turno.fecha}T${turno.hora}:00`
                    );

                return fechaHora >= ahora;

            })
            .sort((a, b) => {

                const fechaA =
                    new Date(
                        `${a.fecha}T${a.hora}:00`
                    );

                const fechaB =
                    new Date(
                        `${b.fecha}T${b.hora}:00`
                    );

                return fechaA - fechaB;

            });

    if(turnosConHora.length){
        return turnosConHora[0];
    }

    /*
     * Si no existe ninguno con hora,
     * usamos el primer turno futuro sin hora.
     */
    const hoy = obtenerFechaLocalISO();

    return proximosTurnos
        .filter(turno =>
            turno.fecha &&
            turno.fecha >= hoy
        )
        .sort((a, b) =>
            a.fecha.localeCompare(b.fecha)
        )[0] || null;

}

function obtenerTurnosDeHoy(){

    const hoy = obtenerFechaLocalISO();

    return proximosTurnos
        .filter(turno =>
            turno.fecha === hoy
        )
        .sort((a, b) => {

            if(a.hora && b.hora){
                return a.hora.localeCompare(b.hora);
            }

            if(a.hora) return -1;
            if(b.hora) return 1;

            return a.nombreCompleto.localeCompare(
                b.nombreCompleto,
                "es"
            );

        });

}

function obtenerFinDeSemanaISO(){

    const fecha = new Date();

    const diaSemana = fecha.getDay();

    const diasHastaDomingo =
        diaSemana === 0
            ? 0
            : 7 - diaSemana;

    fecha.setDate(
        fecha.getDate() + diasHastaDomingo
    );

    const año = fecha.getFullYear();

    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;

}


function obtenerTurnosDeLaSemana(){

    const hoy = obtenerFechaLocalISO();

    const finDeSemana =
        obtenerFinDeSemanaISO();

    return proximosTurnos
        .filter(turno =>
            turno.fecha &&
            turno.fecha > hoy &&
            turno.fecha <= finDeSemana
        )
        .sort((a, b) => {

            const comparacionFecha =
                a.fecha.localeCompare(b.fecha);

            if(comparacionFecha !== 0){
                return comparacionFecha;
            }

            if(a.hora && b.hora){
                return a.hora.localeCompare(b.hora);
            }

            if(a.hora) return -1;
            if(b.hora) return 1;

            return a.nombreCompleto.localeCompare(
                b.nombreCompleto,
                "es"
            );

        });

}


function formatearDiaAgenda(fechaISO){

    const fecha =
        new Date(`${fechaISO}T12:00:00`);

    const texto =
        fecha.toLocaleDateString(
            "es-AR",
            {
                weekday:"long",
                day:"numeric",
                month:"long"
            }
        );

    return texto.charAt(0).toUpperCase() +
        texto.slice(1);

}

function turnoYaPaso(turno){

    if(!turno.fecha || !turno.hora){
        return false;
    }

    const fechaHoraTurno =
        new Date(
            `${turno.fecha}T${turno.hora}:00`
        );

    return fechaHoraTurno < new Date();

}


function obtenerEtiquetaFechaTurno(fecha){

    const hoy = obtenerFechaLocalISO();

    const mañanaFecha = new Date();

    mañanaFecha.setDate(
        mañanaFecha.getDate() + 1
    );

    const mañana = [
        mañanaFecha.getFullYear(),
        String(
            mañanaFecha.getMonth() + 1
        ).padStart(2, "0"),
        String(
            mañanaFecha.getDate()
        ).padStart(2, "0")
    ].join("-");

    if(fecha === hoy){
        return "Hoy";
    }

    if(fecha === mañana){
        return "Mañana";
    }

    return formatearFecha(fecha);

}


function abrirPacienteDesdeAgenda(pacienteId){

    const paciente =
        pacientes.find(
            item => item.id === pacienteId
        );

    if(!paciente){

        alert(
            "No se pudo encontrar la ficha del paciente."
        );

        return;
    }

    mostrarPaciente(paciente);

}


function crearAccionesTurno(turno){

    return `
        <div class="appointment-actions">
            <button
                class="secondary-button appointment-open-button"
                type="button"
                onclick="abrirPacienteDesdeAgenda('${turno.pacienteId}')">
                Ver paciente
            </button>

            <button
                class="appointment-icon-button"
                type="button"
                title="Editar turno"
                aria-label="Editar turno"
                onclick="abrirModalEditarTurno('${turno.turnoId}')">
                ✎
            </button>

            <button
                class="appointment-icon-button is-danger"
                type="button"
                title="Eliminar turno"
                aria-label="Eliminar turno"
                onclick="eliminarTurnoDesdeAgenda('${turno.turnoId}')">
                ×
            </button>
        </div>
    `;

}


async function recargarAgenda(){

    proximosTurnos = await Database.cargarProximosTurnos();
    mostrarAgendaInicial();

}


function abrirModalNuevoTurno(){
    abrirModalTurno();
}


async function abrirModalEditarTurno(turnoId){

    const turno = await Database.cargarTurnoPorId(turnoId);
    if(!turno) return;

    abrirModalTurno(turno);

}


function abrirModalTurno(turno = null){

    cerrarModalTurno();

    const overlay = document.createElement("div");
    overlay.id = "turnoModalOverlay";
    overlay.className = "modal-overlay";

    const opcionesPacientes = pacientes
        .slice()
        .sort((a, b) =>
            a.nombreCompleto.localeCompare(b.nombreCompleto, "es")
        )
        .map(paciente => `
            <option
                value="${escaparAtributo(paciente.id)}"
                ${turno?.paciente_id === paciente.id ? "selected" : ""}>
                ${escaparHTML(paciente.nombreCompleto)}
            </option>
        `)
        .join("");

    overlay.innerHTML = `
        <div class="modal turno-modal">
            <div class="modal-header">
                <div>
                    <h2>${turno ? "Editar turno" : "Nuevo turno"}</h2>
                    <p>Programá una cita directamente desde la Agenda.</p>
                </div>

                <button
                    class="modal-close-button"
                    type="button"
                    aria-label="Cerrar"
                    onclick="cerrarModalTurno()">
                    ×
                </button>
            </div>

            <div class="turno-form-grid">
                <div class="turno-form-field is-full">
                    <label for="turnoPaciente">Paciente</label>
                    <select id="turnoPaciente" ${turno?.consulta_origen_id ? "disabled" : ""}>
                        <option value="">Seleccionar paciente</option>
                        ${opcionesPacientes}
                    </select>
                    ${turno?.consulta_origen_id ? `<small>El paciente no puede cambiarse porque el turno está vinculado a una consulta.</small>` : ""}
                </div>

                <div class="turno-form-field">
                    <label for="turnoFecha">Fecha</label>
                    <input
                        id="turnoFecha"
                        type="date"
                        value="${escaparAtributo(turno?.fecha || obtenerFechaLocalISO())}">
                </div>

                <div class="turno-form-field">
                    <label for="turnoHora">Hora</label>
                    <input
                        id="turnoHora"
                        type="time"
                        value="${escaparAtributo(turno?.hora ? turno.hora.slice(0, 5) : "")}">
                </div>

                <div class="turno-form-field is-full">
                    <label for="turnoObservaciones">Observaciones</label>
                    <textarea
                        id="turnoObservaciones"
                        rows="3"
                        placeholder="Dato breve relacionado con el turno">${escaparHTML(turno?.observaciones || "")}</textarea>
                </div>
            </div>

            <div class="modal-buttons">
                <button
                    class="secondary-button"
                    type="button"
                    onclick="cerrarModalTurno()">
                    Cancelar
                </button>

                <button
                    id="guardarTurnoButton"
                    class="action-button"
                    type="button"
                    onclick="guardarTurnoDesdeAgenda('${turno?.id || ""}')">
                    ${turno ? "Actualizar turno" : "Guardar turno"}
                </button>
            </div>
        </div>
    `;

    overlay.addEventListener("click", evento => {
        if(evento.target === overlay){
            cerrarModalTurno();
        }
    });

    document.body.appendChild(overlay);

}


function cerrarModalTurno(){
    document.getElementById("turnoModalOverlay")?.remove();
}


async function guardarTurnoDesdeAgenda(turnoId = ""){

    const boton = document.getElementById("guardarTurnoButton");

    if(boton?.disabled) return;

    const pacienteId =
        document.getElementById("turnoPaciente")?.value || "";

    const fecha =
        document.getElementById("turnoFecha")?.value || "";

    const hora =
        document.getElementById("turnoHora")?.value || null;

    const observaciones =
        document.getElementById("turnoObservaciones")?.value.trim() || null;

    if(!pacienteId || !fecha){
        alert("Seleccioná un paciente y una fecha.");
        return;
    }

    if(boton){
        boton.disabled = true;
        boton.textContent = turnoId ? "Actualizando..." : "Guardando...";
    }

    const datos = {
        pacienteId,
        fecha,
        hora,
        observaciones
    };

    try{

        const guardado = turnoId
            ? await Database.actualizarTurno(turnoId, datos)
            : await Database.agregarTurno(datos);

        if(!guardado){
            return;
        }

        cerrarModalTurno();
        await recargarAgenda();

    }catch(error){

        console.error("No se pudo guardar el turno.");
        alert("No se pudo guardar el turno. Intentá nuevamente.");

    }finally{

        const botonActual = document.getElementById("guardarTurnoButton");

        if(botonActual){
            botonActual.disabled = false;
            botonActual.textContent = turnoId
                ? "Actualizar turno"
                : "Guardar turno";
        }

    }

}


async function eliminarTurnoDesdeAgenda(turnoId){

    const turno = proximosTurnos.find(item => item.turnoId === turnoId);
    const nombre = turno?.nombreCompleto || "este paciente";

    if(!confirm(`¿Eliminar el turno de ${nombre}?`)) return;

    const eliminado = await Database.eliminarTurno(turnoId);
    if(!eliminado) return;

    await recargarAgenda();

}


function mostrarAgendaInicial(){

    pacienteActual = null;

    document
        .querySelectorAll(".patient-card")
        .forEach(card => card.classList.remove("active"));

    const proximoTurno = obtenerProximoTurno();
    const turnosHoy = obtenerTurnosDeHoy();
    const turnosSemana = obtenerTurnosDeLaSemana();

    const encabezadoAgenda = `
        <div class="agenda-home-header">
            <div>
                <h1>Agenda</h1>
                <p>Resumen de los próximos turnos.</p>
            </div>

            <button
                class="action-button agenda-new-appointment-button"
                type="button"
                onclick="abrirModalNuevoTurno()">
                + Nuevo turno
            </button>
        </div>
    `;

    if(!proximoTurno){
        patientPanel.innerHTML = `
            <section class="agenda-home">
                ${encabezadoAgenda}

                <div class="agenda-empty">
                    <strong>No hay próximos turnos programados.</strong>
                    <span>
                        Podés crear uno con el botón “Nuevo turno” o desde
                        el campo Próximo turno de una consulta.
                    </span>
                </div>
            </section>
        `;
        return;
    }

    const fechaVisible = obtenerEtiquetaFechaTurno(proximoTurno.fecha);
    const horaVisible = proximoTurno.hora || "Sin hora";

    const turnosHoyHTML = turnosHoy.length
        ? turnosHoy.map(turno => {
            const esProximo = turno.turnoId === proximoTurno.turnoId;
            const yaPaso = turnoYaPaso(turno);

            return `
                <article class="today-appointment-item ${esProximo ? "is-next" : ""} ${yaPaso ? "is-past" : ""}">
                    <div class="today-appointment-time">
                        ${turno.hora ? escaparHTML(turno.hora) : "Sin hora"}
                    </div>

                    <div class="today-appointment-patient">
                        <strong>${escaparHTML(turno.nombreCompleto)}</strong>
                        ${turno.obraSocial ? `<span>${escaparHTML(turno.obraSocial)}</span>` : ""}
                        ${turno.observaciones ? `<small>${escaparHTML(turno.observaciones)}</small>` : ""}
                    </div>

                    ${esProximo ? `<span class="today-appointment-badge">Próximo</span>` : ""}
                    ${crearAccionesTurno(turno)}
                </article>
            `;
        }).join("")
        : `<div class="agenda-list-empty">No hay turnos programados para hoy.</div>`;

    const turnosSemanaAgrupados = turnosSemana.reduce((grupos, turno) => {
        if(!grupos[turno.fecha]) grupos[turno.fecha] = [];
        grupos[turno.fecha].push(turno);
        return grupos;
    }, {});

    const turnosSemanaHTML = turnosSemana.length
        ? Object.entries(turnosSemanaAgrupados).map(([fecha, turnos]) => `
            <div class="week-day-group">
                <h3 class="week-day-title">
                    ${escaparHTML(formatearDiaAgenda(fecha))}
                </h3>

                <div class="week-appointments-list">
                    ${turnos.map(turno => `
                        <article class="week-appointment-item">
                            <div class="week-appointment-time">
                                ${turno.hora ? escaparHTML(turno.hora) : "Sin hora"}
                            </div>

                            <div class="week-appointment-patient">
                                <strong>${escaparHTML(turno.nombreCompleto)}</strong>
                                ${turno.obraSocial ? `<span>${escaparHTML(turno.obraSocial)}</span>` : ""}
                                ${turno.observaciones ? `<small>${escaparHTML(turno.observaciones)}</small>` : ""}
                            </div>

                            ${crearAccionesTurno(turno)}
                        </article>
                    `).join("")}
                </div>
            </div>
        `).join("")
        : `<div class="agenda-list-empty">No hay más turnos programados esta semana.</div>`;

    patientPanel.innerHTML = `
        <section class="agenda-home">
            ${encabezadoAgenda}

            <article class="next-appointment-card">
                <div class="next-appointment-label">Próximo turno</div>

                <div class="next-appointment-content">
                    <div class="next-appointment-time">
                        <strong>${escaparHTML(horaVisible)}</strong>
                        <span>${escaparHTML(fechaVisible)}</span>
                    </div>

                    <div class="next-appointment-patient">
                        <h2>${escaparHTML(proximoTurno.nombreCompleto)}</h2>
                        ${proximoTurno.obraSocial ? `<p>${escaparHTML(proximoTurno.obraSocial)}</p>` : ""}
                        ${proximoTurno.observaciones ? `<small>${escaparHTML(proximoTurno.observaciones)}</small>` : ""}
                    </div>

                    ${crearAccionesTurno(proximoTurno)}
                </div>
            </article>

            <section class="today-appointments">
                <div class="agenda-section-header">
                    <div>
                        <h2>Turnos de hoy</h2>
                        <span>${turnosHoy.length} ${turnosHoy.length === 1 ? "turno" : "turnos"}</span>
                    </div>
                </div>

                <div class="today-appointments-list">
                    ${turnosHoyHTML}
                </div>
            </section>

            <section class="week-appointments">
                <div class="agenda-section-header">
                    <div>
                        <h2>Esta semana</h2>
                        <span>${turnosSemana.length} ${turnosSemana.length === 1 ? "turno" : "turnos"}</span>
                    </div>
                </div>

                <div class="week-appointments-content">
                    ${turnosSemanaHTML}
                </div>
            </section>
        </section>
    `;

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
    const pacienteIdSolicitado = p.id;

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

    <div class="patient-page-navigation">

        <button
            class="secondary-button agenda-back-button"
            type="button"
            onclick="mostrarAgendaInicial()">

            ← Volver a Agenda

        </button>

    </div>

    <div class="patient-header">

        <div>
            <h1>${escaparHTML(p.nombreCompleto)}</h1>

            <div class="patient-summary">

            <span>
                ${escaparHTML(p.obraSocial) || "Sin obra social"}
                ${p.nroAfiliado ? ` · Afiliado: ${escaparHTML(p.nroAfiliado)}` : ""}
            </span>

            ${p.edad !== null && p.edad !== undefined? `<span>${p.edad} años</span>`: ""}

            ${p.dni? `<span>DNI ${escaparHTML(p.dni)}</span>`: ""}

            ${p.telefono? `<span>${escaparHTML(p.telefono)}</span>`: ""}

            ${p.email? `<span>${escaparHTML(p.email)}</span>`: ""}

</div>
        </div>

        <div class="patient-actions">

            <button
                class="secondary-button nutrition-plans-button"
                type="button"
                onclick="abrirModuloPlanesAlimentarios()">

                Planes alimentarios

            </button>

            <button
                class="secondary-button send-instructions-button"
                type="button"
                onclick="abrirModalEnviarIndicaciones()">

                Enviar indicaciones

            </button>

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

<details class="patient-charts-details">

    <summary>

        <span>Gráficos de evolución</span>

        <span class="patient-charts-arrow">⌄</span>

    </summary>

    <div class="patient-charts-content">

        <div class="patient-charts-controls">

            <button
                class="chart-option-button active"
                type="button"
                data-chart-metric="peso">

                Peso

            </button>

            <button
                class="chart-option-button"
                type="button"
                data-chart-metric="imc">

                IMC

            </button>

            <button
    class="chart-option-button"
    type="button"
    data-chart-metric="presion">

    Presión arterial

</button>

<button
    class="chart-option-button"
    type="button"
    data-chart-metric="frecuencia_cardiaca">

    Frecuencia cardíaca

</button>

<button
    class="chart-option-button"
    type="button"
    data-chart-metric="saturacion">

    Saturación

</button>

<button
    class="chart-option-button"
    type="button"
    data-chart-metric="temperatura">

    Temperatura

</button>

<button
    class="chart-export-button"
    type="button"
    onclick="exportarGraficoEvolucion()">

    Descargar gráfico

</button>

        </div>

        <div class="patient-chart-wrapper">

            <canvas id="patientEvolutionChart"></canvas>

            <div
                id="patientChartEmpty"
                class="patient-chart-empty">

                Cargando datos...

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


await cargarArchivosPaciente(pacienteIdSolicitado);

if(pacienteActual?.id !== pacienteIdSolicitado) return;

const consultas = await Database.cargarConsultas(p.id);

if(pacienteActual?.id !== pacienteIdSolicitado) return;

configurarGraficosEvolucion(consultas);

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

                            <span>Próximo turno</span>

                            <strong>
                                ${formatearFecha(c.proximo_control)}
                                ${c.proximo_control_hora? ` · ${c.proximo_control_hora.slice(0, 5)}`: ""}
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

        console.error("No se pudo cargar el perfil profesional.");

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

    if(boton.disabled) return;

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

        console.error("No se pudo actualizar el perfil profesional.");

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

    proximosTurnos =
        await Database.cargarProximosTurnos();

    mostrarListadoPrincipalPacientes();
    mostrarAgendaInicial();

}

async function verDetalleConsulta(id, numeroConsulta){

    const pacienteIdSolicitado = pacienteActual?.id;

    if(!pacienteIdSolicitado) return;

    const consulta = await Database.cargarConsultaPorId(id);

    if(
        !consulta ||
        pacienteActual?.id !== pacienteIdSolicitado ||
        consulta.paciente_id !== pacienteIdSolicitado
    ) return;

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
                        "Próximo turno",
                        consulta.proximo_control
                        ? `${formatearFecha(consulta.proximo_control)}${
                        consulta.proximo_control_hora? ` · ${consulta.proximo_control_hora.slice(0, 5)}`: ""}`: "-"
                    )}

                    <div class="consultation-detail-full">

                        <span>Motivo de consulta</span>

                        <p>${consulta.motivo ? escaparHTML(consulta.motivo) : "-"}</p>

                    </div>

                </div>

            </div>

            <div class="consultation-detail-section">

                <h3>Información clínica</h3>

                <div class="consultation-text-block">

                    <span>Evolución clínica</span>

                   <p>${consulta.evolucion ? escaparHTML(consulta.evolucion) : "-"}</p>

                </div>

                <div class="consultation-text-block">

                    <span>Diagnóstico o impresión clínica</span>

                   <p>${consulta.diagnostico ? escaparHTML(consulta.diagnostico) : "-"}</p>

                </div>

                <div class="consultation-text-block">

                    <span>Conducta y plan</span>

                    <p>${consulta.conducta ? escaparHTML(consulta.conducta) : "-"}</p>

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

    if(!pacienteActual) return;

    if(!confirm("¿Está seguro que desea borrar a este paciente?\n\nEsta acción no se puede deshacer.")) return;

    await Database.eliminarPaciente(
        pacienteActual.id
    );

    pacientes = await Database.cargarPacientes();

    proximosTurnos = await Database.cargarProximosTurnos();

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

    if(consulta.paciente_id !== pacienteActual.id){
        alert("La consulta seleccionada no corresponde al paciente actual.");
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
                    <div class="print-brand">✜ClinicApp</div>
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
                                Próximo turno:
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

    document.body.appendChild(printArea);

const nombrePaciente =
    pacienteActual.nombreCompleto
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();

const nombreArchivo =
    `${nombrePaciente} - Consulta ${numeroConsulta}.pdf`;

if(usarExportacionMovilPDF()){

    try{

        await descargarPDFMovil(
            printArea,
            nombreArchivo
        );

    }finally{

        if(printArea.isConnected){
            printArea.remove();
        }

    }

    return;
}

imprimirConTitulo(
    printArea,
    `${nombrePaciente} - Consulta ${numeroConsulta}`
);

}

async function cargarArchivosPaciente(pacienteId = pacienteActual?.id){

    if(!pacienteId) return;

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
            await Database.cargarArchivos(pacienteId);

        if(pacienteActual?.id !== pacienteId) return;

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
            archivos.map((archivo, indice) => `

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
                            data-file-action="open"
                            data-file-index="${indice}">

                            Ver

                        </button>

                        <button
                            class="secondary-button"
                            type="button"
                            data-file-action="download"
                            data-file-index="${indice}">

                            Descargar

                        </button>

                        <button
                            class="secondary-button"
                            type="button"
                            data-file-action="share"
                            data-file-index="${indice}">

                            Compartir

                        </button>

                        <button
                            class="danger-button"
                            type="button"
                            data-file-action="delete"
                            data-file-index="${indice}">

                            Eliminar

                        </button>

                    </div>

                </article>

            `).join("");

        contenedor.onclick = async evento => {
            const boton = evento.target.closest("[data-file-action]");

            if(!boton || !contenedor.contains(boton) || boton.disabled){
                return;
            }

            const indice = Number(boton.dataset.fileIndex);
            const archivo = archivos[indice];

            if(!archivo?.id) return;

            boton.disabled = true;

            try{
                if(boton.dataset.fileAction === "open"){
                    await abrirArchivoPaciente(archivo.id);
                }else if(boton.dataset.fileAction === "download"){
                    await descargarArchivoPaciente(archivo.id);
                }else if(boton.dataset.fileAction === "share"){
                    await compartirArchivoPaciente(archivo.id);
                }else if(boton.dataset.fileAction === "delete"){
                    await eliminarArchivoPaciente(archivo.id);
                }
            }finally{
                if(boton.isConnected){
                    boton.disabled = false;
                }
            }
        };

    }catch(error){

        console.error("No se pudieron cargar los archivos.");

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


async function abrirArchivoPaciente(archivoId){

    try{

        const url =
            await Database.crearURLArchivo(archivoId);

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    }catch(error){

        console.error("No se pudo abrir el archivo.");

        alert("No se pudo abrir el archivo.");
    }
}


async function descargarArchivoPaciente(archivoId){

    try{

        const { blob, nombre } =
            await Database.descargarArchivo(archivoId);

        descargarBlobComoArchivo(
            blob,
            nombre
        );

    }catch(error){

        console.error("No se pudo descargar el archivo.");

        alert("No se pudo descargar el archivo.");
    }
}


async function compartirArchivoPaciente(archivoId){

    try{

        const { blob, nombre: nombreOriginal } =
            await Database.descargarArchivo(archivoId);

        const nombre = nombreOriginal || "archivo";

        const archivoCompartible = new File(
            [blob],
            nombre,
            {
                type: blob.type || "application/octet-stream"
            }
        );

        const puedeCompartirArchivo =
            typeof navigator.share === "function" &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files:[archivoCompartible] });

        if(puedeCompartirArchivo){

            await navigator.share({
                files:[archivoCompartible],
                title:nombre
            });

            return;
        }

        descargarBlobComoArchivo(blob, nombre);

        alert(
            "Este navegador no permite compartir archivos directamente.\n\n" +
            "El documento fue descargado para que puedas adjuntarlo desde WhatsApp Web, correo u otra aplicación."
        );

    }catch(error){

        if(error?.name === "AbortError"){
            return;
        }

        console.error("No se pudo compartir el archivo.");

        alert(
            "No se pudo compartir el archivo. Podés usar el botón Descargar e intentar adjuntarlo manualmente."
        );
    }
}


function descargarBlobComoArchivo(blob, nombre){

    const nombreSeguro = String(nombre || "archivo")
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) || "archivo";

    const urlTemporal =
        URL.createObjectURL(blob);

    const enlace =
        document.createElement("a");

    enlace.href = urlTemporal;
    enlace.download = nombreSeguro;
    enlace.style.display = "none";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
    }, 1000);
}


async function eliminarArchivoPaciente(id){

    const confirmar = window.confirm(
        "¿Eliminar este archivo?\n\nEsta acción no se puede deshacer."
    );

    if(!confirmar) return;

    try{

        await Database.eliminarArchivo(id);

        await cargarArchivosPaciente();

    }catch(error){

        console.error("No se pudo eliminar el archivo.");

        alert(
            "No se pudo eliminar el archivo. Intentá nuevamente."
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


function imprimirConTitulo(printArea, titulo){

    const tituloOriginal = document.title;
    let finalizado = false;

    const finalizar = () => {

        if(finalizado) return;
        finalizado = true;

        document.title = tituloOriginal;

        if(printArea.isConnected){
            printArea.remove();
        }

    };

    document.title = titulo;

    if(!printArea.isConnected){
        document.body.appendChild(printArea);
    }

    window.addEventListener(
        "afterprint",
        finalizar,
        { once:true }
    );

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    });

}


async function descargarPDFMovil(printArea, nombreArchivo){

    if(typeof html2pdf === "undefined"){

        alert(
            "No se pudo cargar el generador de PDF. Verificá la conexión a Internet."
        );

        return;
    }

    let contenedor = null;

    try{

        contenedor = document.createElement("div");
        contenedor.className = "mobile-pdf-wrapper";

        const contenidoClonado =
            printArea.cloneNode(true);

        contenidoClonado.removeAttribute("id");
        contenidoClonado.classList.add("mobile-pdf-container");

        /*
         * Primero se agrega al documento.
         * Recién después se pueden consultar correctamente
         * los estilos calculados.
         */
        contenedor.appendChild(contenidoClonado);
        document.body.appendChild(contenedor);

        await new Promise(resolve => {

            requestAnimationFrame(() => {

                requestAnimationFrame(() => {

                    setTimeout(resolve, 300);

                });

            });

        });

        const rect =
            contenidoClonado.getBoundingClientRect();

        if(
            rect.width === 0 ||
            rect.height === 0
        ){

            throw new Error(
                `El contenido del PDF no tiene dimensiones: ${rect.width} × ${rect.height}`
            );

        }

        if(
            !contenidoClonado.innerText.trim()
        ){

            throw new Error(
                "El contenido clonado no contiene texto."
            );

        }

        const opciones = {

            margin:[8, 8, 8, 8],

            filename:nombreArchivo,

            image:{
                type:"jpeg",
                quality:0.95
            },

            html2canvas:{
                scale:1.5,
                useCORS:true,
                allowTaint:false,
                backgroundColor:"#ffffff",
                logging:false,
                scrollX:0,
                scrollY:0,
                width:700,
                windowWidth:700
            },

            jsPDF:{
                unit:"mm",
                format:"a4",
                orientation:"portrait",
                compress:true
            },

            pagebreak:{
            mode:["css","legacy"],
            avoid:[".print-evolution",".print-evolution-header",".print-measurements",
            ".print-measurement"]
}

        };

        await html2pdf()
            .set(opciones)
            .from(contenidoClonado)
            .save();

    }catch(error){

        console.error("No se pudo generar el PDF móvil.");

        alert(
            "No se pudo generar el PDF. Intentá nuevamente."
        );

    }finally{

        if(
            contenedor &&
            contenedor.isConnected
        ){
            contenedor.remove();
        }

    }

}

function configurarGraficosEvolucion(consultas){

    const bloqueGraficos =
        document.querySelector(".patient-charts-details");

    const botones =
        document.querySelectorAll("[data-chart-metric]");

    if(!bloqueGraficos || botones.length === 0){
        return;
    }

    metricaGraficoActual = "peso";

    botones.forEach(boton => {

        boton.addEventListener("click", () => {

            metricaGraficoActual =
    boton.dataset.chartMetric;

            botones.forEach(item => {
                item.classList.toggle(
                    "active",
                    item === boton
                );
            });

            renderizarGraficoEvolucion(
                consultas,
                metricaGraficoActual
            );

        });

    });

    bloqueGraficos.addEventListener(
        "toggle",
        () => {

            if(bloqueGraficos.open){

                renderizarGraficoEvolucion(
                    consultas,
                    metricaGraficoActual
                );

            }

        }
    );

}

function renderizarGraficoEvolucion(
    consultas,
    metrica
){

    const canvas =
        document.getElementById(
            "patientEvolutionChart"
        );

    const mensaje =
        document.getElementById(
            "patientChartEmpty"
        );

    if(!canvas || !mensaje){
        return;
    }

    const consultasOrdenadas =
        [...consultas].sort(
            (a, b) =>
                new Date(a.fecha) -
                new Date(b.fecha)
        );

    if(graficoEvolucionActual){

        graficoEvolucionActual.destroy();

        graficoEvolucionActual = null;

    }


    /* =========================================
       PRESIÓN ARTERIAL
    ========================================= */

    if(metrica === "presion"){

        const datosPresion =
            consultasOrdenadas
                .filter(consulta => {

                    const sistolica =
                        Number(
                            consulta.ta_sistolica
                        );

                    const diastolica =
                        Number(
                            consulta.ta_diastolica
                        );

                    return (
                        Number.isFinite(sistolica) &&
                        Number.isFinite(diastolica)
                    );

                })
                .map(consulta => ({

                    fecha:
                        formatearFecha(
                            consulta.fecha
                        ),

                    sistolica:
                        Number(
                            consulta.ta_sistolica
                        ),

                    diastolica:
                        Number(
                            consulta.ta_diastolica
                        )

                }));

        if(datosPresion.length === 0){

            canvas.style.display = "none";
            mensaje.style.display = "flex";

            mensaje.textContent =
                "No hay registros completos de presión arterial para graficar.";

            return;
        }

        canvas.style.display = "block";
        mensaje.style.display = "none";

        graficoEvolucionActual =
            new Chart(
                canvas.getContext("2d"),
                {

                    type: "line",

                    data: {

                        labels:
                            datosPresion.map(
                                item => item.fecha
                            ),

                        datasets: [

                            {
                                label:
                                    "Sistólica",

                                data:
                                    datosPresion.map(
                                        item =>
                                            item.sistolica
                                    ),

                                borderColor:
                                    "#3F6F91",

                                backgroundColor:
                                    "rgba(63, 111, 145, 0.10)",

                                pointBackgroundColor:
                                    "#3F6F91",

                                pointBorderColor:
                                    "#FFFFFF",

                                pointBorderWidth:2,
                                pointRadius:4,
                                pointHoverRadius:6,
                                borderWidth:2,
                                tension:0.25,
                                fill:false
                            },

                            {
                                label:
                                    "Diastólica",

                                data:
                                    datosPresion.map(
                                        item =>
                                            item.diastolica
                                    ),

                                borderColor:
                                    "#79A9C5",

                                backgroundColor:
                                    "rgba(121, 169, 197, 0.10)",

                                pointBackgroundColor:
                                    "#79A9C5",

                                pointBorderColor:
                                    "#FFFFFF",

                                pointBorderWidth:2,
                                pointRadius:4,
                                pointHoverRadius:6,
                                borderWidth:2,
                                tension:0.25,
                                fill:false
                            }

                        ]

                    },

                    options:
    crearOpcionesGraficoEvolucion(
        "mmHg",
        true,
        datosPresion.flatMap(
            item => [
                item.sistolica,
                item.diastolica
            ]
        )
    )

                }
            );

        return;
    }


    /* =========================================
       RESTO DE LAS VARIABLES
    ========================================= */

    const configuraciones = {

        peso: {
            campo:"peso",
            mensaje:"No hay registros de peso para graficar.",
            unidad:"kg"
        },

        imc: {
            campo:"imc",
            mensaje:"No hay registros de IMC para graficar.",
            unidad:""
        },

        frecuencia_cardiaca: {
            campo:"frecuencia_cardiaca",
            mensaje:"No hay registros de frecuencia cardíaca para graficar.",
            unidad:"lpm"
        },

        saturacion: {
            campo:"saturacion",
            mensaje:"No hay registros de saturación para graficar.",
            unidad:"%"
        },

        temperatura: {
            campo:"temperatura",
            mensaje:"No hay registros de temperatura para graficar.",
            unidad:"°C"
        }

    };

    const configuracion =
        configuraciones[metrica];

    if(!configuracion){
        return;
    }

    const datos =
        consultasOrdenadas
            .filter(consulta => {

                const valor =
                    Number(
                        consulta[
                            configuracion.campo
                        ]
                    );

                return Number.isFinite(valor);

            })
            .map(consulta => ({

                fecha:
                    formatearFecha(
                        consulta.fecha
                    ),

                valor:
                    Number(
                        consulta[
                            configuracion.campo
                        ]
                    )

            }));

    if(datos.length === 0){

        canvas.style.display = "none";
        mensaje.style.display = "flex";

        mensaje.textContent =
            configuracion.mensaje;

        return;
    }

    canvas.style.display = "block";
    mensaje.style.display = "none";

    graficoEvolucionActual =
        new Chart(
            canvas.getContext("2d"),
            {

                type:"line",

                data:{

                    labels:
                        datos.map(
                            item => item.fecha
                        ),

                    datasets:[
                        {
                            data:
                                datos.map(
                                    item => item.valor
                                ),

                            borderColor:
                                "#3F6F91",

                            backgroundColor:
                                "rgba(63, 111, 145, 0.12)",

                            pointBackgroundColor:
                                "#3F6F91",

                            pointBorderColor:
                                "#FFFFFF",

                            pointBorderWidth:2,
                            pointRadius:4,
                            pointHoverRadius:6,
                            borderWidth:2,
                            tension:0.25,
                            fill:true
                        }
                    ]

                },

                options:
    crearOpcionesGraficoEvolucion(
        configuracion.unidad,
        false,
        datos.map(item => item.valor)
    )

            }
        );

}

function crearOpcionesGraficoEvolucion(
    unidad,
    mostrarLeyenda,
    valores
){

    const limites =
        calcularLimitesGrafico(
            valores,
            unidad
        );

    return {

        responsive:true,

        maintainAspectRatio:false,

        interaction:{
            mode:"index",
            intersect:false
        },

        plugins:{

            legend:{
                display:mostrarLeyenda,
                position:"top",
                align:"end",

                labels:{
                    color:"#536A78",
                    usePointStyle:true,
                    boxWidth:8,
                    boxHeight:8
                }
            },

            tooltip:{

                callbacks:{

                    label(context){

                        const etiqueta =
                            context.dataset.label
                                ? `${context.dataset.label}: `
                                : "";

                        const valor =
                            context.parsed.y;

                        return unidad
                            ? `${etiqueta}${valor} ${unidad}`
                            : `${etiqueta}${valor}`;

                    }

                }

            }

        },

        scales:{

            x:{

                grid:{
                    display:false
                },

                ticks:{
                    color:"#718391",
                    maxRotation:0
                }

            },

            y:{

                beginAtZero:false,

                suggestedMin:limites.min,

                suggestedMax:limites.max,

                grid:{
                    color:
                        "rgba(111, 142, 163, 0.14)"
                },

                ticks:{

                    color:"#718391",

                    callback(valor){

                        return unidad
                            ? `${valor} ${unidad}`
                            : valor;

                    }

                }

            }

        }

    };

}

function calcularLimitesGrafico(
    valores,
    unidad
){

    const numeros =
        valores.filter(
            valor => Number.isFinite(valor)
        );

    if(numeros.length === 0){

        return {
            min:undefined,
            max:undefined
        };

    }

    const minimo = Math.min(...numeros);
    const maximo = Math.max(...numeros);
    const rango = maximo - minimo;

    const amplitudesMinimas = {

        "kg":10,
        "":5,
        "mmHg":40,
        "lpm":30,
        "%":10,
        "°C":4

    };

    const amplitudMinima =
        amplitudesMinimas[unidad] || 10;

    const amplitud =
        Math.max(
            rango * 1.8,
            amplitudMinima
        );

    const centro =
        (minimo + maximo) / 2;

    let limiteMinimo =
        centro - amplitud / 2;

    let limiteMaximo =
        centro + amplitud / 2;

    if(unidad === "%"){

        limiteMinimo =
            Math.max(0, limiteMinimo);

        limiteMaximo =
            Math.min(100, limiteMaximo);

    }

    return {
        min:limiteMinimo,
        max:limiteMaximo
    };

}

function exportarGraficoEvolucion(){

    if(!graficoEvolucionActual){

        alert("Primero abrí un gráfico con datos.");

        return;
    }

    if(!pacienteActual){

        alert("No hay un paciente seleccionado.");

        return;
    }

    const nombresMetricas = {
        peso:"Peso",
        imc:"IMC",
        presion:"Presion arterial",
        frecuencia_cardiaca:"Frecuencia cardiaca",
        saturacion:"Saturacion",
        temperatura:"Temperatura"
    };

    const nombrePaciente =
        pacienteActual.nombreCompleto
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const nombreMetrica =
        nombresMetricas[metricaGraficoActual] ||
        "Evolucion";

    const enlace =
        document.createElement("a");

    enlace.href =
        graficoEvolucionActual.toBase64Image(
            "image/png",
            1
        );

    enlace.download =
        `${nombrePaciente} - ${nombreMetrica}.png`;

    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();
}


// ----------------------------
// BOTÓN NUEVO PACIENTE
// ----------------------------

document
.getElementById("newPatientButton")
.addEventListener("click", abrirModalNuevoPaciente);

iniciar();
