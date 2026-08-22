// ======================================
// PLANES ALIMENTARIOS Y SEGUIMIENTO
// ======================================
//
// Este modulo usa tablas propias y no escribe en pacientes, consultas ni
// archivos salvo cuando el profesional confirma expresamente que desea
// guardar un PDF en la ficha. Si las tablas nuevas todavia no existen, se
// activa un modo de vista previa sin persistencia.

(function iniciarModuloPlanesAlimentarios(){

    "use strict";

    const CATEGORIAS = [
        { clave:"desayuno", etiqueta:"Desayuno" },
        { clave:"media_manana", etiqueta:"Media mañana" },
        { clave:"almuerzo", etiqueta:"Almuerzo" },
        { clave:"merienda", etiqueta:"Merienda" },
        { clave:"cena", etiqueta:"Cena" },
        { clave:"colacion", etiqueta:"Colaciones" },
        { clave:"recomendacion", etiqueta:"Recomendaciones" }
    ];

    const DIFICULTADES = [
        "Falta de tiempo",
        "Hambre o saciedad insuficiente",
        "Costo de los alimentos",
        "No consigue algunos alimentos",
        "No le gustan algunas opciones",
        "Comidas fuera de casa",
        "Organización familiar",
        "Horarios variables"
    ];

    const OPCIONES_VISTA_PREVIA = CATEGORIAS.map((categoria, indice) => ({
        id:`preview-option-${indice + 1}`,
        categoria:categoria.clave,
        titulo:`Opción de ${categoria.etiqueta.toLowerCase()}`,
        contenido:
            categoria.clave === "recomendacion"
                ? "Recomendación redactada previamente por la profesional."
                : "Preparación, porción y reemplazos definidos por la profesional.",
        etiquetas:["ejemplo"],
        activo:true
    }));

    const PLANTILLA_VISTA_PREVIA = {
        id:"preview-template",
        nombre:"Plan flexible de ejemplo",
        descripcion:"Estructura demostrativa sin indicaciones clínicas.",
        objetivo:"",
        contenido:crearContenidoDesdeOpciones(OPCIONES_VISTA_PREVIA),
        activo:true
    };

    const estado = {
        pacienteId:null,
        pacienteNombre:"",
        disponible:false,
        vistaPrevia:false,
        errorDisponibilidad:null,
        pantalla:"planes",
        planes:[],
        plantillas:[],
        opciones:[],
        seguimientos:[],
        pesoReciente:null,
        borrador:null,
        planSeguimiento:null,
        opcionEditando:null,
        cargando:false
    };

    const DatosPlanesAlimentarios = {

        async verificarDisponibilidad(){

            const tablas = [
                "opciones_alimentarias",
                "plantillas_alimentarias",
                "planes_alimentarios",
                "seguimientos_alimentarios"
            ];

            try{
                for(const tabla of tablas){
                    const { error } = await supabaseClient
                        .from(tabla)
                        .select("id")
                        .limit(1);

                    if(error) throw error;
                }

                return { disponible:true, error:null };
            }catch(error){
                return { disponible:false, error };
            }
        },

        async cargarOpciones(){
            const { data, error } = await supabaseClient
                .from("opciones_alimentarias")
                .select("*")
                .eq("activo", true)
                .order("categoria", { ascending:true })
                .order("titulo", { ascending:true });

            if(error) throw error;
            return data || [];
        },

        async cargarPlantillas(){
            const { data, error } = await supabaseClient
                .from("plantillas_alimentarias")
                .select("*")
                .eq("activo", true)
                .order("nombre", { ascending:true });

            if(error) throw error;
            return data || [];
        },

        async cargarPlanes(pacienteId){
            validarUUID(pacienteId, "paciente");

            const { data, error } = await supabaseClient
                .from("planes_alimentarios")
                .select("*")
                .eq("paciente_id", pacienteId)
                .order("created_at", { ascending:false });

            if(error) throw error;
            return data || [];
        },

        async cargarSeguimientos(pacienteId){
            validarUUID(pacienteId, "paciente");

            const { data, error } = await supabaseClient
                .from("seguimientos_alimentarios")
                .select("*")
                .eq("paciente_id", pacienteId)
                .order("fecha", { ascending:false })
                .order("created_at", { ascending:false });

            if(error) throw error;
            return data || [];
        },

        async guardarOpcion(datos, id = null){
            const user = await obtenerUsuarioAutenticado();
            const ahora = new Date().toISOString();

            const payload = {
                medico_id:user.id,
                categoria:datos.categoria,
                titulo:datos.titulo,
                contenido:datos.contenido,
                etiquetas:datos.etiquetas || [],
                activo:true,
                updated_at:ahora
            };

            let consulta;

            if(id){
                validarUUID(id, "opción alimentaria");
                consulta = supabaseClient
                    .from("opciones_alimentarias")
                    .update(payload)
                    .eq("id", id)
                    .eq("medico_id", user.id);
            }else{
                consulta = supabaseClient
                    .from("opciones_alimentarias")
                    .insert(payload);
            }

            const { data, error } = await consulta.select().single();
            if(error) throw error;
            return data;
        },

        async archivarOpcion(id){
            const user = await obtenerUsuarioAutenticado();
            validarUUID(id, "opción alimentaria");

            const { error } = await supabaseClient
                .from("opciones_alimentarias")
                .update({
                    activo:false,
                    updated_at:new Date().toISOString()
                })
                .eq("id", id)
                .eq("medico_id", user.id);

            if(error) throw error;
        },

        async guardarPlantilla(datos){
            const user = await obtenerUsuarioAutenticado();

            const { data, error } = await supabaseClient
                .from("plantillas_alimentarias")
                .insert({
                    medico_id:user.id,
                    nombre:datos.nombre,
                    descripcion:datos.descripcion || null,
                    objetivo:datos.objetivo || null,
                    contenido:normalizarContenido(datos.contenido),
                    activo:true,
                    updated_at:new Date().toISOString()
                })
                .select()
                .single();

            if(error) throw error;
            return data;
        },

        async archivarPlantilla(id){
            const user = await obtenerUsuarioAutenticado();
            validarUUID(id, "plantilla alimentaria");

            const { error } = await supabaseClient
                .from("plantillas_alimentarias")
                .update({
                    activo:false,
                    updated_at:new Date().toISOString()
                })
                .eq("id", id)
                .eq("medico_id", user.id);

            if(error) throw error;
        },

        async guardarPlan(datos, id = null){
            const user = await obtenerUsuarioAutenticado();
            await asegurarPacientePropio(datos.paciente_id, user);

            const payload = {
                medico_id:user.id,
                paciente_id:datos.paciente_id,
                plantilla_id:normalizarUUIDOpcional(datos.plantilla_id),
                serie_id:normalizarUUIDOpcional(datos.serie_id),
                numero_version:Number(datos.numero_version) || 1,
                titulo:datos.titulo,
                objetivo:datos.objetivo || null,
                estado:datos.estado,
                fecha_inicio:datos.fecha_inicio || null,
                fecha_revision:datos.fecha_revision || null,
                peso_inicial:numeroOpcional(datos.peso_inicial),
                seguimiento_tipo:datos.seguimiento_tipo,
                seguimiento_hasta:datos.seguimiento_hasta || null,
                controles_incluidos:Number(datos.controles_incluidos) || 0,
                valor:numeroOpcional(datos.valor),
                estado_pago:datos.estado_pago,
                contenido:normalizarContenido(datos.contenido),
                updated_at:new Date().toISOString()
            };

            let consulta;

            if(id){
                validarUUID(id, "plan alimentario");
                consulta = supabaseClient
                    .from("planes_alimentarios")
                    .update(payload)
                    .eq("id", id)
                    .eq("paciente_id", datos.paciente_id)
                    .eq("medico_id", user.id);
            }else{
                consulta = supabaseClient
                    .from("planes_alimentarios")
                    .insert(payload);
            }

            const { data, error } = await consulta.select().single();
            if(error) throw error;
            return data;
        },

        async guardarSeguimiento(datos){
            const user = await obtenerUsuarioAutenticado();
            await asegurarPacientePropio(datos.paciente_id, user);
            validarUUID(datos.plan_id, "plan alimentario");

            const { data, error } = await supabaseClient
                .from("seguimientos_alimentarios")
                .insert({
                    medico_id:user.id,
                    paciente_id:datos.paciente_id,
                    plan_id:datos.plan_id,
                    fecha:datos.fecha,
                    adherencia:Number(datos.adherencia),
                    peso:numeroOpcional(datos.peso),
                    cintura:numeroOpcional(datos.cintura),
                    dificultades:datos.dificultades || [],
                    resultado:datos.resultado || null,
                    observaciones:datos.observaciones || null,
                    decision:datos.decision,
                    proxima_revision:datos.proxima_revision || null
                })
                .select()
                .single();

            if(error) throw error;
            return data;
        }
    };

    function normalizarUUIDOpcional(valor){
        if(!valor || String(valor).startsWith("preview-")) return null;
        validarUUID(valor, "identificador relacionado");
        return valor;
    }

    function numeroOpcional(valor){
        if(valor === null || valor === undefined || valor === "") return null;
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : null;
    }

    function escapar(valor){
        const div = document.createElement("div");
        div.textContent = valor === null || valor === undefined ? "" : String(valor);
        return div.innerHTML;
    }

    function escaparAtributoLocal(valor){
        return String(valor === null || valor === undefined ? "" : valor)
            .replaceAll("&", "&amp;")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function clonar(valor){
        return JSON.parse(JSON.stringify(valor));
    }

    function obtenerFechaHoy(){
        if(typeof obtenerFechaLocalISO === "function"){
            return obtenerFechaLocalISO();
        }

        return new Date().toLocaleDateString("en-CA");
    }

    function sumarDias(fechaISO, dias){
        if(!fechaISO) return "";
        const fecha = new Date(`${fechaISO}T12:00:00`);
        fecha.setDate(fecha.getDate() + Number(dias || 0));
        return fecha.toLocaleDateString("en-CA");
    }

    function etiquetaCategoria(clave){
        return CATEGORIAS.find(item => item.clave === clave)?.etiqueta || clave;
    }

    function crearContenidoVacio(){
        return {
            version:1,
            secciones:CATEGORIAS.map(categoria => ({
                clave:categoria.clave,
                titulo:categoria.etiqueta,
                items:[]
            }))
        };
    }

    function crearContenidoDesdeOpciones(opciones){
        const contenido = crearContenidoVacio();

        (opciones || []).forEach(opcion => {
            const seccion = contenido.secciones.find(
                item => item.clave === opcion.categoria
            );

            if(!seccion) return;

            seccion.items.push({
                source_id:opcion.id,
                titulo:opcion.titulo,
                contenido:opcion.contenido || ""
            });
        });

        return contenido;
    }

    function normalizarContenido(contenido){
        const normalizado = crearContenidoVacio();
        const secciones = Array.isArray(contenido?.secciones)
            ? contenido.secciones
            : [];

        normalizado.secciones.forEach(seccion => {
            const origen = secciones.find(item => item.clave === seccion.clave);

            seccion.items = Array.isArray(origen?.items)
                ? origen.items.map(item => ({
                    source_id:item.source_id || null,
                    titulo:String(item.titulo || "").trim(),
                    contenido:String(item.contenido || "").trim()
                })).filter(item => item.titulo || item.contenido)
                : [];
        });

        return normalizado;
    }

    function contarItems(contenido){
        return normalizarContenido(contenido).secciones.reduce(
            (total, seccion) => total + seccion.items.length,
            0
        );
    }

    function crearBorradorPlan(plantilla = null){
        const contenido = plantilla
            ? normalizarContenido(clonar(plantilla.contenido))
            : crearContenidoVacio();

        return {
            id:null,
            paciente_id:estado.pacienteId,
            plantilla_id:plantilla?.id || null,
            serie_id:crypto.randomUUID(),
            numero_version:1,
            titulo:plantilla?.nombre || "Plan alimentario personalizado",
            objetivo:plantilla?.objetivo || "",
            estado:"borrador",
            fecha_inicio:obtenerFechaHoy(),
            fecha_revision:sumarDias(obtenerFechaHoy(), 30),
            peso_inicial:estado.pesoReciente ?? "",
            seguimiento_tipo:"sin_seguimiento",
            seguimiento_hasta:"",
            controles_incluidos:0,
            valor:"",
            estado_pago:"no_aplica",
            contenido
        };
    }

    function crearOverlay(){
        const overlay = document.createElement("div");
        overlay.id = "nutritionPlansOverlay";
        overlay.className = "nutrition-plans-overlay";
        overlay.innerHTML = `
            <div class="nutrition-plans-modal" role="dialog" aria-modal="true">
                <header class="nutrition-plans-header">
                    <div>
                        <span class="nutrition-plans-eyebrow">Planificación nutricional</span>
                        <h2>Planes alimentarios</h2>
                        <p>${escapar(estado.pacienteNombre)}</p>
                    </div>
                    <button
                        class="nutrition-icon-button"
                        type="button"
                        aria-label="Cerrar"
                        onclick="NutritionPlansUI.cerrar()">×</button>
                </header>
                <div id="nutritionPlansContent" class="nutrition-plans-content">
                    <div class="nutrition-loading">Preparando el módulo...</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    async function abrir(){
        if(!pacienteActual){
            alert("Primero seleccioná un paciente.");
            return;
        }

        if(document.getElementById("nutritionPlansOverlay")) return;

        if(document.getElementById("modalOverlay")){
            alert("Cerrá la ventana actual antes de abrir los planes alimentarios.");
            return;
        }

        estado.pacienteId = pacienteActual.id;
        estado.pacienteNombre = pacienteActual.nombreCompleto;
        estado.pantalla = "planes";
        estado.cargando = true;

        crearOverlay();

        try{
            await cargarDatos();
        }catch(error){
            console.error("No se pudo cargar el módulo de planes alimentarios.");
            estado.vistaPrevia = true;
            estado.disponible = false;
            estado.errorDisponibilidad = error;
            cargarDatosVistaPrevia();
        }finally{
            estado.cargando = false;
            renderizar();
        }
    }

    function cerrar(){
        document.getElementById("nutritionPlansOverlay")?.remove();
        estado.borrador = null;
        estado.planSeguimiento = null;
        estado.opcionEditando = null;
    }

    async function cargarDatos(){
        const disponibilidad =
            await DatosPlanesAlimentarios.verificarDisponibilidad();

        estado.disponible = disponibilidad.disponible;
        estado.vistaPrevia = !disponibilidad.disponible;
        estado.errorDisponibilidad = disponibilidad.error;

        if(!disponibilidad.disponible){
            cargarDatosVistaPrevia();
            return;
        }

        const [opciones, plantillas, planes, seguimientos, consultas] =
            await Promise.all([
                DatosPlanesAlimentarios.cargarOpciones(),
                DatosPlanesAlimentarios.cargarPlantillas(),
                DatosPlanesAlimentarios.cargarPlanes(estado.pacienteId),
                DatosPlanesAlimentarios.cargarSeguimientos(estado.pacienteId),
                Database.cargarConsultas(estado.pacienteId)
            ]);

        estado.opciones = opciones;
        estado.plantillas = plantillas;
        estado.planes = planes;
        estado.seguimientos = seguimientos;
        estado.pesoReciente =
            consultas.find(consulta => numeroOpcional(consulta.peso) !== null)?.peso ?? null;
    }

    function cargarDatosVistaPrevia(){
        estado.opciones = clonar(OPCIONES_VISTA_PREVIA);
        estado.plantillas = [clonar(PLANTILLA_VISTA_PREVIA)];
        estado.planes = [];
        estado.seguimientos = [];
        estado.pesoReciente = null;
    }

    async function recargarDatosReales(){
        if(!estado.disponible) return;

        const [opciones, plantillas, planes, seguimientos] =
            await Promise.all([
                DatosPlanesAlimentarios.cargarOpciones(),
                DatosPlanesAlimentarios.cargarPlantillas(),
                DatosPlanesAlimentarios.cargarPlanes(estado.pacienteId),
                DatosPlanesAlimentarios.cargarSeguimientos(estado.pacienteId)
            ]);

        estado.opciones = opciones;
        estado.plantillas = plantillas;
        estado.planes = planes;
        estado.seguimientos = seguimientos;
    }

    function renderizar(){
        const contenedor = document.getElementById("nutritionPlansContent");
        if(!contenedor) return;

        if(estado.cargando){
            contenedor.innerHTML =
                '<div class="nutrition-loading">Preparando el módulo...</div>';
            return;
        }

        if(estado.pantalla === "editor"){
            contenedor.innerHTML = renderizarEditorPlan();
            return;
        }

        if(estado.pantalla === "seguimiento"){
            contenedor.innerHTML = renderizarFormularioSeguimiento();
            return;
        }

        contenedor.innerHTML = `
            ${renderizarAvisoVistaPrevia()}
            <nav class="nutrition-tabs" aria-label="Secciones del módulo">
                <button
                    class="${estado.pantalla === "planes" ? "active" : ""}"
                    type="button"
                    onclick="NutritionPlansUI.cambiarPantalla('planes')">
                    Planes del paciente
                </button>
                <button
                    class="${estado.pantalla === "biblioteca" ? "active" : ""}"
                    type="button"
                    onclick="NutritionPlansUI.cambiarPantalla('biblioteca')">
                    Biblioteca profesional
                </button>
            </nav>
            <section class="nutrition-main-view">
                ${estado.pantalla === "biblioteca"
                    ? renderizarBiblioteca()
                    : renderizarListadoPlanes()}
            </section>
        `;
    }

    function renderizarAvisoVistaPrevia(){
        if(!estado.vistaPrevia) return "";

        return `
            <div class="nutrition-preview-notice" role="status">
                <strong>Vista previa segura</strong>
                <span>
                    Las tablas del módulo todavía no están habilitadas. Podés recorrer
                    el constructor, pero no se guardará ni modificará información real.
                </span>
            </div>
        `;
    }

    function cambiarPantalla(pantalla){
        if(!["planes", "biblioteca"].includes(pantalla)) return;
        estado.pantalla = pantalla;
        estado.opcionEditando = null;
        renderizar();
    }

    function renderizarListadoPlanes(){
        const tarjetas = estado.planes.length
            ? estado.planes.map(renderizarTarjetaPlan).join("")
            : `
                <div class="nutrition-empty-state">
                    <div class="nutrition-empty-icon">≋</div>
                    <h3>Todavía no hay planes guardados</h3>
                    <p>
                        Creá un plan desde una plantilla o armalo seleccionando
                        opciones de la biblioteca profesional.
                    </p>
                </div>
            `;

        return `
            <div class="nutrition-view-toolbar">
                <div>
                    <h3>Planes y resultados</h3>
                    <p>Versiones, próximas revisiones y controles de adherencia.</p>
                </div>
                <button
                    class="action-button"
                    type="button"
                    onclick="NutritionPlansUI.nuevoPlan()">
                    + Nuevo plan
                </button>
            </div>
            <div class="nutrition-plan-grid">${tarjetas}</div>
        `;
    }

    function renderizarTarjetaPlan(plan){
        const seguimientos = seguimientosDelPlan(plan.id);
        const ultimo = seguimientos[0] || null;
        const diferenciaPeso = calcularDiferenciaPeso(plan, ultimo);
        const estadoPlan = etiquetaEstadoPlan(plan.estado);
        const proximaRevision = ultimo?.proxima_revision || plan.fecha_revision;
        const vencido = proximaRevision && proximaRevision < obtenerFechaHoy();

        return `
            <article class="nutrition-plan-card ${plan.estado === "activo" ? "is-active" : ""}">
                <div class="nutrition-plan-card-header">
                    <div>
                        <span class="nutrition-status ${escaparAtributoLocal(plan.estado)}">
                            ${escapar(estadoPlan)}
                        </span>
                        <h4>${escapar(plan.titulo)}</h4>
                        <p>Versión ${Number(plan.numero_version) || 1}</p>
                    </div>
                    <span class="nutrition-plan-date">
                        ${plan.fecha_inicio ? formatearFechaLocal(plan.fecha_inicio) : "Sin fecha"}
                    </span>
                </div>

                ${plan.objetivo ? `
                    <p class="nutrition-plan-objective">${escapar(plan.objetivo)}</p>
                ` : ""}

                <div class="nutrition-plan-metrics">
                    <div>
                        <span>Adherencia</span>
                        <strong>${ultimo ? `${ultimo.adherencia}/5` : "Sin medir"}</strong>
                    </div>
                    <div>
                        <span>Controles</span>
                        <strong>${seguimientos.length}${plan.controles_incluidos ? ` / ${plan.controles_incluidos}` : ""}</strong>
                    </div>
                    <div>
                        <span>Resultado</span>
                        <strong>${diferenciaPeso}</strong>
                    </div>
                </div>

                <div class="nutrition-review-row ${vencido ? "is-overdue" : ""}">
                    <span>Próxima revisión</span>
                    <strong>
                        ${proximaRevision
                            ? formatearFechaLocal(proximaRevision)
                            : "No definida"}
                    </strong>
                </div>

                <div class="nutrition-card-actions">
                    <button type="button" onclick="NutritionPlansUI.editarPlan('${plan.id}')">
                        Editar
                    </button>
                    <button type="button" onclick="NutritionPlansUI.duplicarPlan('${plan.id}')">
                        Nueva versión
                    </button>
                    <button type="button" onclick="NutritionPlansUI.abrirSeguimiento('${plan.id}')">
                        Registrar control
                    </button>
                    <button type="button" onclick="NutritionPlansUI.exportarPlan('${plan.id}')">
                        PDF
                    </button>
                </div>
            </article>
        `;
    }

    function seguimientosDelPlan(planId){
        return estado.seguimientos.filter(item => item.plan_id === planId);
    }

    function calcularDiferenciaPeso(plan, seguimiento){
        const inicial = numeroOpcional(plan.peso_inicial);
        const actual = numeroOpcional(seguimiento?.peso);

        if(inicial === null || actual === null) return "Sin datos";

        const diferencia = actual - inicial;
        const signo = diferencia > 0 ? "+" : "";
        return `${signo}${diferencia.toFixed(1)} kg`;
    }

    function etiquetaEstadoPlan(valor){
        return {
            borrador:"Borrador",
            activo:"Activo",
            reemplazado:"Reemplazado",
            finalizado:"Finalizado"
        }[valor] || "Borrador";
    }

    function formatearFechaLocal(fecha){
        if(!fecha) return "";
        const [anio, mes, dia] = String(fecha).split("-");
        return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha;
    }

    function renderizarBiblioteca(){
        const opcionesPorCategoria = CATEGORIAS.map(categoria => {
            const opciones = estado.opciones.filter(
                opcion => opcion.categoria === categoria.clave
            );

            if(!opciones.length) return "";

            return `
                <section class="nutrition-library-group">
                    <h4>${escapar(categoria.etiqueta)}</h4>
                    <div class="nutrition-library-items">
                        ${opciones.map(renderizarOpcionBiblioteca).join("")}
                    </div>
                </section>
            `;
        }).join("");

        const plantillas = estado.plantillas.length
            ? estado.plantillas.map(plantilla => `
                <article class="nutrition-template-card">
                    <div>
                        <h4>${escapar(plantilla.nombre)}</h4>
                        <p>${escapar(plantilla.descripcion || "Sin descripción")}</p>
                        <span>${contarItems(plantilla.contenido)} elementos guardados</span>
                    </div>
                    <div class="nutrition-template-actions">
                        <button
                            type="button"
                            onclick="NutritionPlansUI.nuevoPlan('${plantilla.id}')">
                            Usar plantilla
                        </button>
                        ${!estado.vistaPrevia ? `
                            <button
                                class="is-muted"
                                type="button"
                                onclick="NutritionPlansUI.archivarPlantilla('${plantilla.id}')">
                                Archivar
                            </button>
                        ` : ""}
                    </div>
                </article>
            `).join("")
            : '<p class="nutrition-muted">Todavía no hay plantillas propias.</p>';

        return `
            <div class="nutrition-view-toolbar">
                <div>
                    <h3>Biblioteca profesional</h3>
                    <p>
                        Guardá una vez las opciones que usás habitualmente y
                        reutilizalas en distintos pacientes.
                    </p>
                </div>
                <button
                    class="action-button"
                    type="button"
                    onclick="NutritionPlansUI.editarOpcion()"
                    ${estado.vistaPrevia ? "disabled" : ""}>
                    + Nueva opción
                </button>
            </div>

            ${estado.opcionEditando ? renderizarFormularioOpcion() : ""}

            <section class="nutrition-library-section">
                <div class="nutrition-section-heading">
                    <div>
                        <h3>Plantillas</h3>
                        <p>
                            Podés convertir cualquier plan terminado en una plantilla.
                        </p>
                    </div>
                </div>
                <div class="nutrition-template-grid">${plantillas}</div>
            </section>

            <section class="nutrition-library-section">
                <div class="nutrition-section-heading">
                    <div>
                        <h3>Opciones reutilizables</h3>
                        <p>Comidas, reemplazos y recomendaciones propias.</p>
                    </div>
                </div>
                ${opcionesPorCategoria || `
                    <div class="nutrition-empty-inline">
                        Agregá la primera opción para comenzar a construir tu biblioteca.
                    </div>
                `}
            </section>
        `;
    }

    function renderizarOpcionBiblioteca(opcion){
        return `
            <article class="nutrition-library-item">
                <div>
                    <strong>${escapar(opcion.titulo)}</strong>
                    <p>${escapar(opcion.contenido || "")}</p>
                    ${Array.isArray(opcion.etiquetas) && opcion.etiquetas.length ? `
                        <div class="nutrition-tags">
                            ${opcion.etiquetas.map(etiqueta =>
                                `<span>${escapar(etiqueta)}</span>`
                            ).join("")}
                        </div>
                    ` : ""}
                </div>
                ${!estado.vistaPrevia ? `
                    <div class="nutrition-library-item-actions">
                        <button
                            type="button"
                            onclick="NutritionPlansUI.editarOpcion('${opcion.id}')">
                            Editar
                        </button>
                        <button
                            type="button"
                            onclick="NutritionPlansUI.archivarOpcion('${opcion.id}')">
                            Archivar
                        </button>
                    </div>
                ` : ""}
            </article>
        `;
    }

    function editarOpcion(id = null){
        if(estado.vistaPrevia){
            alert("La biblioteca no se guarda durante la vista previa.");
            return;
        }

        const existente = id
            ? estado.opciones.find(item => item.id === id)
            : null;

        estado.opcionEditando = existente
            ? clonar(existente)
            : {
                id:null,
                categoria:"desayuno",
                titulo:"",
                contenido:"",
                etiquetas:[]
            };

        estado.pantalla = "biblioteca";
        renderizar();
        document.getElementById("nutritionOptionTitle")?.focus();
    }

    function renderizarFormularioOpcion(){
        const opcion = estado.opcionEditando;

        return `
            <form class="nutrition-inline-form" onsubmit="return NutritionPlansUI.guardarOpcion(event)">
                <div class="nutrition-inline-form-header">
                    <div>
                        <h4>${opcion.id ? "Editar opción" : "Nueva opción"}</h4>
                        <p>Este contenido quedará disponible para futuros planes.</p>
                    </div>
                    <button
                        class="nutrition-icon-button small"
                        type="button"
                        onclick="NutritionPlansUI.cancelarEdicionOpcion()">×</button>
                </div>
                <div class="nutrition-form-grid">
                    <label>
                        Categoría
                        <select id="nutritionOptionCategory">
                            ${CATEGORIAS.map(categoria => `
                                <option
                                    value="${categoria.clave}"
                                    ${opcion.categoria === categoria.clave ? "selected" : ""}>
                                    ${escapar(categoria.etiqueta)}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <label>
                        Nombre breve
                        <input
                            id="nutritionOptionTitle"
                            value="${escaparAtributoLocal(opcion.titulo)}"
                            placeholder="Ej.: Desayuno con yogur">
                    </label>
                    <label class="is-full">
                        Contenido
                        <textarea
                            id="nutritionOptionContent"
                            rows="4"
                            placeholder="Porciones, preparación y reemplazos">${escapar(opcion.contenido)}</textarea>
                    </label>
                    <label class="is-full">
                        Etiquetas
                        <input
                            id="nutritionOptionTags"
                            value="${escaparAtributoLocal((opcion.etiquetas || []).join(", "))}"
                            placeholder="Ej.: diabetes, bajo sodio, rápido">
                    </label>
                </div>
                <div class="nutrition-form-actions">
                    <button
                        class="secondary-button"
                        type="button"
                        onclick="NutritionPlansUI.cancelarEdicionOpcion()">
                        Cancelar
                    </button>
                    <button class="action-button" type="submit">
                        Guardar opción
                    </button>
                </div>
            </form>
        `;
    }

    function cancelarEdicionOpcion(){
        estado.opcionEditando = null;
        renderizar();
    }

    async function guardarOpcion(event){
        event?.preventDefault();
        if(estado.vistaPrevia) return false;

        const titulo = document.getElementById("nutritionOptionTitle")?.value.trim();
        const contenido = document.getElementById("nutritionOptionContent")?.value.trim();

        if(!titulo || !contenido){
            alert("Completá el nombre y el contenido de la opción.");
            return false;
        }

        const boton = event?.submitter;
        if(boton){
            boton.disabled = true;
            boton.textContent = "Guardando...";
        }

        try{
            await DatosPlanesAlimentarios.guardarOpcion({
                categoria:document.getElementById("nutritionOptionCategory").value,
                titulo,
                contenido,
                etiquetas:document.getElementById("nutritionOptionTags").value
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean)
            }, estado.opcionEditando?.id || null);

            estado.opcionEditando = null;
            await recargarDatosReales();
            renderizar();
        }catch(error){
            console.error("No se pudo guardar la opción alimentaria.");
            alert("No se pudo guardar la opción. No se modificaron otros datos.");
            if(boton){
                boton.disabled = false;
                boton.textContent = "Guardar opción";
            }
        }

        return false;
    }

    async function archivarOpcion(id){
        if(!confirm("La opción dejará de aparecer en planes nuevos. Los planes existentes no cambiarán. ¿Continuar?")){
            return;
        }

        try{
            await DatosPlanesAlimentarios.archivarOpcion(id);
            await recargarDatosReales();
            renderizar();
        }catch(error){
            console.error("No se pudo archivar la opción alimentaria.");
            alert("No se pudo archivar la opción.");
        }
    }

    async function archivarPlantilla(id){
        if(!confirm("La plantilla dejará de estar disponible para planes nuevos. Los planes existentes no cambiarán. ¿Continuar?")){
            return;
        }

        try{
            await DatosPlanesAlimentarios.archivarPlantilla(id);
            await recargarDatosReales();
            renderizar();
        }catch(error){
            console.error("No se pudo archivar la plantilla alimentaria.");
            alert("No se pudo archivar la plantilla.");
        }
    }

    function nuevoPlan(plantillaId = null){
        const plantilla = plantillaId
            ? estado.plantillas.find(item => item.id === plantillaId)
            : null;

        estado.borrador = crearBorradorPlan(plantilla);
        estado.pantalla = "editor";
        renderizar();
    }

    function editarPlan(id){
        const plan = estado.planes.find(item => item.id === id);
        if(!plan) return;

        estado.borrador = {
            ...clonar(plan),
            contenido:normalizarContenido(plan.contenido)
        };
        estado.pantalla = "editor";
        renderizar();
    }

    function duplicarPlan(id){
        const plan = estado.planes.find(item => item.id === id);
        if(!plan) return;

        estado.borrador = {
            ...clonar(plan),
            id:null,
            serie_id:plan.serie_id || crypto.randomUUID(),
            numero_version:(Number(plan.numero_version) || 1) + 1,
            estado:"borrador",
            fecha_inicio:obtenerFechaHoy(),
            fecha_revision:sumarDias(obtenerFechaHoy(), 30),
            titulo:plan.titulo,
            contenido:normalizarContenido(plan.contenido)
        };
        estado.pantalla = "editor";
        renderizar();
    }

    function volverAPlanes(){
        estado.borrador = null;
        estado.planSeguimiento = null;
        estado.pantalla = "planes";
        renderizar();
    }

    function renderizarEditorPlan(){
        const plan = estado.borrador;
        if(!plan) return "";

        return `
            ${renderizarAvisoVistaPrevia()}
            <div class="nutrition-editor-header">
                <button
                    class="nutrition-back-button"
                    type="button"
                    onclick="NutritionPlansUI.volverAPlanes()">
                    ← Volver
                </button>
                <div>
                    <h3>${plan.id ? "Editar plan" : "Nuevo plan alimentario"}</h3>
                    <p>Seleccioná opciones preseteadas y ajustá sólo lo necesario.</p>
                </div>
                <span class="nutrition-version-badge">Versión ${plan.numero_version}</span>
            </div>

            <div class="nutrition-editor-layout">
                <aside class="nutrition-plan-settings">
                    <h4>Datos del plan</h4>

                    <label>
                        Plantilla base
                        <select
                            id="nutritionPlanTemplate"
                            onchange="NutritionPlansUI.aplicarPlantilla(this.value)">
                            <option value="">Estructura vacía</option>
                            ${estado.plantillas.map(plantilla => `
                                <option
                                    value="${escaparAtributoLocal(plantilla.id)}"
                                    ${plan.plantilla_id === plantilla.id ? "selected" : ""}>
                                    ${escapar(plantilla.nombre)}
                                </option>
                            `).join("")}
                        </select>
                    </label>

                    <label>
                        Título
                        <input
                            id="nutritionPlanTitle"
                            value="${escaparAtributoLocal(plan.titulo)}">
                    </label>

                    <label>
                        Objetivo principal
                        <textarea
                            id="nutritionPlanObjective"
                            rows="3"
                            placeholder="Objetivo acordado con el paciente">${escapar(plan.objetivo)}</textarea>
                    </label>

                    <div class="nutrition-two-columns">
                        <label>
                            Inicio
                            <input
                                id="nutritionPlanStart"
                                type="date"
                                value="${escaparAtributoLocal(plan.fecha_inicio)}">
                        </label>
                        <label>
                            Revisión
                            <input
                                id="nutritionPlanReview"
                                type="date"
                                value="${escaparAtributoLocal(plan.fecha_revision)}">
                        </label>
                    </div>

                    <label>
                        Peso inicial (kg)
                        <input
                            id="nutritionPlanInitialWeight"
                            type="number"
                            min="0"
                            step="0.1"
                            value="${escaparAtributoLocal(plan.peso_inicial)}"
                            placeholder="Opcional">
                    </label>

                    <div class="nutrition-settings-divider"></div>

                    <h4>Servicio y seguimiento</h4>

                    <label>
                        Modalidad
                        <select
                            id="nutritionPlanFollowupType"
                            onchange="NutritionPlansUI.actualizarModalidadSeguimiento(this.value)">
                            ${renderizarOpcionesSeguimiento(plan.seguimiento_tipo)}
                        </select>
                    </label>

                    <div class="nutrition-two-columns">
                        <label>
                            Hasta
                            <input
                                id="nutritionPlanFollowupUntil"
                                type="date"
                                value="${escaparAtributoLocal(plan.seguimiento_hasta)}">
                        </label>
                        <label>
                            Controles incluidos
                            <input
                                id="nutritionPlanIncludedControls"
                                type="number"
                                min="0"
                                max="50"
                                value="${Number(plan.controles_incluidos) || 0}">
                        </label>
                    </div>

                    <div class="nutrition-two-columns">
                        <label>
                            Valor
                            <input
                                id="nutritionPlanValue"
                                type="number"
                                min="0"
                                step="0.01"
                                value="${escaparAtributoLocal(plan.valor)}"
                                placeholder="Opcional">
                        </label>
                        <label>
                            Pago
                            <select id="nutritionPlanPaymentStatus">
                                <option value="no_aplica" ${plan.estado_pago === "no_aplica" ? "selected" : ""}>No aplica</option>
                                <option value="pendiente" ${plan.estado_pago === "pendiente" ? "selected" : ""}>Pendiente</option>
                                <option value="abonado" ${plan.estado_pago === "abonado" ? "selected" : ""}>Abonado</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Estado del plan
                        <select id="nutritionPlanStatus">
                            <option value="borrador" ${plan.estado === "borrador" ? "selected" : ""}>Borrador</option>
                            <option value="activo" ${plan.estado === "activo" ? "selected" : ""}>Activo</option>
                            <option value="reemplazado" ${plan.estado === "reemplazado" ? "selected" : ""}>Reemplazado</option>
                            <option value="finalizado" ${plan.estado === "finalizado" ? "selected" : ""}>Finalizado</option>
                        </select>
                    </label>
                </aside>

                <main class="nutrition-content-builder">
                    <div class="nutrition-builder-intro">
                        <div>
                            <h4>Contenido del plan</h4>
                            <p>
                                Marcá opciones de tu biblioteca o agregá una indicación
                                específica para este paciente.
                            </p>
                        </div>
                        <span>${contarItems(plan.contenido)} elementos</span>
                    </div>

                    ${CATEGORIAS.map(categoria =>
                        renderizarSeccionConstructor(categoria)
                    ).join("")}
                </main>
            </div>

            <div class="nutrition-editor-footer">
                <div>
                    <label class="nutrition-template-checkbox">
                        <input id="nutritionSaveAsTemplate" type="checkbox">
                        Guardar también como nueva plantilla
                    </label>
                    <input
                        id="nutritionNewTemplateName"
                        class="nutrition-template-name"
                        placeholder="Nombre de la nueva plantilla">
                </div>
                <div class="nutrition-editor-actions">
                    <button
                        class="secondary-button"
                        type="button"
                        onclick="NutritionPlansUI.exportarBorrador()"
                        ${estado.vistaPrevia ? "disabled" : ""}>
                        Vista PDF
                    </button>
                    <button
                        class="secondary-button"
                        type="button"
                        onclick="NutritionPlansUI.volverAPlanes()">
                        Cancelar
                    </button>
                    <button
                        id="nutritionSavePlanButton"
                        class="action-button"
                        type="button"
                        onclick="NutritionPlansUI.guardarPlan()"
                        ${estado.vistaPrevia ? "disabled" : ""}>
                        ${plan.id ? "Actualizar plan" : "Guardar plan"}
                    </button>
                </div>
            </div>
        `;
    }

    function renderizarOpcionesSeguimiento(valor){
        const opciones = [
            ["sin_seguimiento", "Sólo plan"],
            ["30_dias", "Plan + seguimiento 30 días"],
            ["60_dias", "Plan + seguimiento 60 días"],
            ["90_dias", "Plan + seguimiento 90 días"],
            ["continuo", "Seguimiento continuo"]
        ];

        return opciones.map(([clave, etiqueta]) => `
            <option value="${clave}" ${valor === clave ? "selected" : ""}>
                ${escapar(etiqueta)}
            </option>
        `).join("");
    }

    function renderizarSeccionConstructor(categoria){
        const seccion = normalizarContenido(estado.borrador.contenido)
            .secciones.find(item => item.clave === categoria.clave);
        const disponibles = estado.opciones.filter(
            opcion => opcion.categoria === categoria.clave
        );

        return `
            <section class="nutrition-builder-section">
                <div class="nutrition-builder-section-header">
                    <div>
                        <h5>${escapar(categoria.etiqueta)}</h5>
                        <span>${seccion.items.length} seleccionadas</span>
                    </div>
                    <button
                        type="button"
                        onclick="NutritionPlansUI.agregarItemPropio('${categoria.clave}')">
                        + Texto propio
                    </button>
                </div>

                ${disponibles.length ? `
                    <div class="nutrition-preset-options">
                        ${disponibles.map(opcion => {
                            const seleccionada = seccion.items.some(
                                item => item.source_id === opcion.id
                            );

                            return `
                                <label class="nutrition-preset-chip ${seleccionada ? "is-selected" : ""}">
                                    <input
                                        type="checkbox"
                                        ${seleccionada ? "checked" : ""}
                                        onchange="NutritionPlansUI.alternarOpcion('${categoria.clave}', '${opcion.id}', this.checked)">
                                    <span>${escapar(opcion.titulo)}</span>
                                </label>
                            `;
                        }).join("")}
                    </div>
                ` : `
                    <p class="nutrition-no-presets">
                        No hay opciones guardadas en esta categoría.
                    </p>
                `}

                <div class="nutrition-selected-items">
                    ${seccion.items.map((item, indice) => `
                        <article class="nutrition-selected-item">
                            <div class="nutrition-selected-item-fields">
                                <input
                                    value="${escaparAtributoLocal(item.titulo)}"
                                    aria-label="Título de la opción"
                                    oninput="NutritionPlansUI.actualizarItem('${categoria.clave}', ${indice}, 'titulo', this.value)">
                                <textarea
                                    rows="2"
                                    aria-label="Contenido de la opción"
                                    oninput="NutritionPlansUI.actualizarItem('${categoria.clave}', ${indice}, 'contenido', this.value)">${escapar(item.contenido)}</textarea>
                            </div>
                            <div class="nutrition-selected-item-actions">
                                <button
                                    type="button"
                                    title="Subir"
                                    aria-label="Subir opción"
                                    onclick="NutritionPlansUI.moverItem('${categoria.clave}', ${indice}, -1)"
                                    ${indice === 0 ? "disabled" : ""}>↑</button>
                                <button
                                    type="button"
                                    title="Bajar"
                                    aria-label="Bajar opción"
                                    onclick="NutritionPlansUI.moverItem('${categoria.clave}', ${indice}, 1)"
                                    ${indice === seccion.items.length - 1 ? "disabled" : ""}>↓</button>
                                <button
                                    class="is-danger"
                                    type="button"
                                    title="Quitar"
                                    aria-label="Quitar opción"
                                    onclick="NutritionPlansUI.quitarItem('${categoria.clave}', ${indice})">×</button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        `;
    }

    function capturarCamposPlan(){
        if(!estado.borrador) return;

        const obtener = id => document.getElementById(id)?.value;

        estado.borrador.titulo = obtener("nutritionPlanTitle") ?? estado.borrador.titulo;
        estado.borrador.objetivo = obtener("nutritionPlanObjective") ?? estado.borrador.objetivo;
        estado.borrador.fecha_inicio = obtener("nutritionPlanStart") ?? estado.borrador.fecha_inicio;
        estado.borrador.fecha_revision = obtener("nutritionPlanReview") ?? estado.borrador.fecha_revision;
        estado.borrador.peso_inicial = obtener("nutritionPlanInitialWeight") ?? estado.borrador.peso_inicial;
        estado.borrador.seguimiento_tipo = obtener("nutritionPlanFollowupType") ?? estado.borrador.seguimiento_tipo;
        estado.borrador.seguimiento_hasta = obtener("nutritionPlanFollowupUntil") ?? estado.borrador.seguimiento_hasta;
        estado.borrador.controles_incluidos = obtener("nutritionPlanIncludedControls") ?? estado.borrador.controles_incluidos;
        estado.borrador.valor = obtener("nutritionPlanValue") ?? estado.borrador.valor;
        estado.borrador.estado_pago = obtener("nutritionPlanPaymentStatus") ?? estado.borrador.estado_pago;
        estado.borrador.estado = obtener("nutritionPlanStatus") ?? estado.borrador.estado;
    }

    function aplicarPlantilla(id){
        capturarCamposPlan();

        if(!id){
            if(contarItems(estado.borrador.contenido) &&
                !confirm("¿Reemplazar el contenido actual por una estructura vacía?")){
                renderizar();
                return;
            }

            estado.borrador.plantilla_id = null;
            estado.borrador.contenido = crearContenidoVacio();
            renderizar();
            return;
        }

        const plantilla = estado.plantillas.find(item => item.id === id);
        if(!plantilla) return;

        if(contarItems(estado.borrador.contenido) &&
            estado.borrador.plantilla_id !== id &&
            !confirm("La plantilla reemplazará las opciones seleccionadas. ¿Continuar?")){
            renderizar();
            return;
        }

        estado.borrador.plantilla_id = plantilla.id;
        estado.borrador.contenido = normalizarContenido(clonar(plantilla.contenido));

        if(!estado.borrador.objetivo && plantilla.objetivo){
            estado.borrador.objetivo = plantilla.objetivo;
        }

        renderizar();
    }

    function obtenerSeccionBorrador(categoria){
        estado.borrador.contenido = normalizarContenido(estado.borrador.contenido);
        return estado.borrador.contenido.secciones.find(
            seccion => seccion.clave === categoria
        );
    }

    function alternarOpcion(categoria, opcionId, seleccionada){
        capturarCamposPlan();
        const seccion = obtenerSeccionBorrador(categoria);
        const opcion = estado.opciones.find(item => item.id === opcionId);
        if(!seccion || !opcion) return;

        if(seleccionada){
            if(!seccion.items.some(item => item.source_id === opcionId)){
                seccion.items.push({
                    source_id:opcion.id,
                    titulo:opcion.titulo,
                    contenido:opcion.contenido || ""
                });
            }
        }else{
            seccion.items = seccion.items.filter(
                item => item.source_id !== opcionId
            );
        }

        renderizar();
    }

    function agregarItemPropio(categoria){
        capturarCamposPlan();
        const seccion = obtenerSeccionBorrador(categoria);
        if(!seccion) return;

        seccion.items.push({
            source_id:null,
            titulo:"Nueva opción",
            contenido:""
        });
        renderizar();

        const secciones = document.querySelectorAll(".nutrition-builder-section");
        const indiceCategoria = CATEGORIAS.findIndex(item => item.clave === categoria);
        const inputs = secciones[indiceCategoria]?.querySelectorAll(
            ".nutrition-selected-item input"
        );
        inputs?.[inputs.length - 1]?.focus();
        inputs?.[inputs.length - 1]?.select();
    }

    function actualizarItem(categoria, indice, campo, valor){
        const seccion = obtenerSeccionBorrador(categoria);
        if(!seccion?.items[indice]) return;
        if(!["titulo", "contenido"].includes(campo)) return;
        seccion.items[indice][campo] = valor;
    }

    function moverItem(categoria, indice, direccion){
        capturarCamposPlan();
        const seccion = obtenerSeccionBorrador(categoria);
        const destino = indice + direccion;

        if(!seccion || destino < 0 || destino >= seccion.items.length) return;

        [seccion.items[indice], seccion.items[destino]] =
            [seccion.items[destino], seccion.items[indice]];
        renderizar();
    }

    function quitarItem(categoria, indice){
        capturarCamposPlan();
        const seccion = obtenerSeccionBorrador(categoria);
        if(!seccion?.items[indice]) return;
        seccion.items.splice(indice, 1);
        renderizar();
    }

    function actualizarModalidadSeguimiento(valor){
        capturarCamposPlan();
        estado.borrador.seguimiento_tipo = valor;

        const configuracion = {
            sin_seguimiento:{ dias:0, controles:0 },
            "30_dias":{ dias:30, controles:1 },
            "60_dias":{ dias:60, controles:2 },
            "90_dias":{ dias:90, controles:3 },
            continuo:{ dias:30, controles:1 }
        }[valor];

        if(configuracion){
            estado.borrador.seguimiento_hasta = configuracion.dias
                ? sumarDias(estado.borrador.fecha_inicio || obtenerFechaHoy(), configuracion.dias)
                : "";
            estado.borrador.controles_incluidos = configuracion.controles;
        }

        renderizar();
    }

    async function guardarPlan(){
        if(estado.vistaPrevia){
            alert("La vista previa no guarda información.");
            return;
        }

        capturarCamposPlan();
        const plan = estado.borrador;

        if(!plan.titulo.trim()){
            alert("Ingresá un título para el plan.");
            return;
        }

        if(!plan.fecha_inicio){
            alert("Ingresá la fecha de inicio.");
            return;
        }

        if(!contarItems(plan.contenido)){
            alert("Seleccioná al menos una opción o recomendación.");
            return;
        }

        const guardarComoPlantilla =
            document.getElementById("nutritionSaveAsTemplate")?.checked;
        const nombrePlantilla =
            document.getElementById("nutritionNewTemplateName")?.value.trim();

        if(guardarComoPlantilla && !nombrePlantilla){
            alert("Ingresá un nombre para la nueva plantilla.");
            return;
        }

        const boton = document.getElementById("nutritionSavePlanButton");
        if(boton){
            boton.disabled = true;
            boton.textContent = "Guardando...";
        }

        try{
            const guardado = await DatosPlanesAlimentarios.guardarPlan({
                ...plan,
                titulo:plan.titulo.trim(),
                objetivo:plan.objetivo.trim(),
                contenido:normalizarContenido(plan.contenido)
            }, plan.id || null);

            if(guardarComoPlantilla){
                await DatosPlanesAlimentarios.guardarPlantilla({
                    nombre:nombrePlantilla,
                    descripcion:`Creada desde ${plan.titulo.trim()}`,
                    objetivo:plan.objetivo.trim(),
                    contenido:normalizarContenido(plan.contenido)
                });
            }

            await recargarDatosReales();
            estado.borrador = null;
            estado.pantalla = "planes";
            renderizar();

            if(guardado?.estado === "activo"){
                alert("El plan quedó activo y listo para iniciar el seguimiento.");
            }
        }catch(error){
            console.error("No se pudo guardar el plan alimentario.");
            alert("No se pudo guardar el plan. No se modificaron los datos clínicos existentes.");
            if(boton){
                boton.disabled = false;
                boton.textContent = plan.id ? "Actualizar plan" : "Guardar plan";
            }
        }
    }

    function abrirSeguimiento(planId){
        const plan = estado.planes.find(item => item.id === planId);
        if(!plan) return;
        estado.planSeguimiento = plan;
        estado.pantalla = "seguimiento";
        renderizar();
    }

    function renderizarFormularioSeguimiento(){
        const plan = estado.planSeguimiento;
        if(!plan) return "";

        const seguimientos = seguimientosDelPlan(plan.id);
        const ultimoPeso = seguimientos.find(
            item => numeroOpcional(item.peso) !== null
        )?.peso ?? "";

        return `
            ${renderizarAvisoVistaPrevia()}
            <div class="nutrition-editor-header">
                <button
                    class="nutrition-back-button"
                    type="button"
                    onclick="NutritionPlansUI.volverAPlanes()">
                    ← Volver
                </button>
                <div>
                    <h3>Registrar seguimiento</h3>
                    <p>${escapar(plan.titulo)} · versión ${plan.numero_version}</p>
                </div>
            </div>

            <form
                class="nutrition-followup-form"
                onsubmit="return NutritionPlansUI.guardarSeguimiento(event)">

                <section class="nutrition-followup-section">
                    <div class="nutrition-section-heading">
                        <div>
                            <h3>Adherencia</h3>
                            <p>¿En qué medida el paciente pudo sostener el plan?</p>
                        </div>
                    </div>

                    <div class="nutrition-adherence-scale">
                        ${[1, 2, 3, 4, 5].map(numero => `
                            <label>
                                <input
                                    type="radio"
                                    name="nutritionAdherence"
                                    value="${numero}"
                                    ${numero === 3 ? "checked" : ""}>
                                <span>${numero}</span>
                                <small>${numero === 1 ? "Muy baja" : numero === 5 ? "Muy alta" : ""}</small>
                            </label>
                        `).join("")}
                    </div>
                </section>

                <section class="nutrition-followup-section">
                    <div class="nutrition-form-grid">
                        <label>
                            Fecha del control
                            <input
                                id="nutritionFollowupDate"
                                type="date"
                                value="${obtenerFechaHoy()}">
                        </label>
                        <label>
                            Peso actual (kg)
                            <input
                                id="nutritionFollowupWeight"
                                type="number"
                                min="0"
                                step="0.1"
                                value="${escaparAtributoLocal(ultimoPeso)}"
                                placeholder="Opcional">
                        </label>
                        <label>
                            Cintura (cm)
                            <input
                                id="nutritionFollowupWaist"
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Opcional">
                        </label>
                        <label>
                            Próxima revisión
                            <input
                                id="nutritionFollowupNextReview"
                                type="date"
                                value="${escaparAtributoLocal(plan.fecha_revision || "")}">
                        </label>
                    </div>
                </section>

                <section class="nutrition-followup-section">
                    <h3>Dificultades encontradas</h3>
                    <div class="nutrition-difficulties">
                        ${DIFICULTADES.map(dificultad => `
                            <label>
                                <input
                                    type="checkbox"
                                    name="nutritionDifficulty"
                                    value="${escaparAtributoLocal(dificultad)}">
                                <span>${escapar(dificultad)}</span>
                            </label>
                        `).join("")}
                    </div>
                </section>

                <section class="nutrition-followup-section">
                    <div class="nutrition-form-grid">
                        <label class="is-full">
                            Resultado observado
                            <textarea
                                id="nutritionFollowupResult"
                                rows="3"
                                placeholder="Cambios en hábitos, síntomas, energía o medidas"></textarea>
                        </label>
                        <label class="is-full">
                            Observaciones profesionales
                            <textarea
                                id="nutritionFollowupNotes"
                                rows="3"
                                placeholder="Aspectos a reforzar o revisar"></textarea>
                        </label>
                        <label class="is-full">
                            Decisión
                            <select id="nutritionFollowupDecision">
                                <option value="mantener">Mantener el plan</option>
                                <option value="ajustar">Ajustar algunas opciones</option>
                                <option value="nueva_version">Crear una nueva versión</option>
                                <option value="finalizar">Finalizar seguimiento</option>
                            </select>
                        </label>
                    </div>
                </section>

                <div class="nutrition-form-actions sticky">
                    <button
                        class="secondary-button"
                        type="button"
                        onclick="NutritionPlansUI.volverAPlanes()">
                        Cancelar
                    </button>
                    <button
                        class="action-button"
                        type="submit"
                        ${estado.vistaPrevia ? "disabled" : ""}>
                        Guardar seguimiento
                    </button>
                </div>
            </form>
        `;
    }

    async function guardarSeguimiento(event){
        event?.preventDefault();
        if(estado.vistaPrevia) return false;

        const plan = estado.planSeguimiento;
        const fecha = document.getElementById("nutritionFollowupDate")?.value;
        const adherencia = document.querySelector(
            'input[name="nutritionAdherence"]:checked'
        )?.value;

        if(!plan || !fecha || !adherencia){
            alert("Completá la fecha y el nivel de adherencia.");
            return false;
        }

        const boton = event?.submitter;
        if(boton){
            boton.disabled = true;
            boton.textContent = "Guardando...";
        }

        const decision =
            document.getElementById("nutritionFollowupDecision").value;

        try{
            await DatosPlanesAlimentarios.guardarSeguimiento({
                paciente_id:estado.pacienteId,
                plan_id:plan.id,
                fecha,
                adherencia,
                peso:document.getElementById("nutritionFollowupWeight").value,
                cintura:document.getElementById("nutritionFollowupWaist").value,
                dificultades:Array.from(document.querySelectorAll(
                    'input[name="nutritionDifficulty"]:checked'
                )).map(input => input.value),
                resultado:document.getElementById("nutritionFollowupResult").value.trim(),
                observaciones:document.getElementById("nutritionFollowupNotes").value.trim(),
                decision,
                proxima_revision:document.getElementById("nutritionFollowupNextReview").value
            });

            await recargarDatosReales();

            if(["ajustar", "nueva_version"].includes(decision) &&
                confirm("El seguimiento quedó guardado. ¿Querés preparar una nueva versión del plan ahora?")){
                estado.planSeguimiento = null;
                duplicarPlan(plan.id);
                return false;
            }

            estado.planSeguimiento = null;
            estado.pantalla = "planes";
            renderizar();
        }catch(error){
            console.error("No se pudo guardar el seguimiento alimentario.");
            alert("No se pudo guardar el seguimiento. No se modificó el plan existente.");
            if(boton){
                boton.disabled = false;
                boton.textContent = "Guardar seguimiento";
            }
        }

        return false;
    }

    async function exportarBorrador(){
        capturarCamposPlan();
        if(!estado.borrador) return;
        await generarPDFPlan(estado.borrador, false);
    }

    async function exportarPlan(id){
        const plan = estado.planes.find(item => item.id === id);
        if(!plan) return;
        await generarPDFPlan(plan, true);
    }

    async function generarPDFPlan(plan, permitirGuardar){
        if(typeof html2pdf !== "function"){
            alert("No se pudo iniciar el generador de PDF.");
            return;
        }

        const contenido = normalizarContenido(plan.contenido);
        const seccionesConDatos = contenido.secciones.filter(
            seccion => seccion.items.length
        );

        if(!seccionesConDatos.length){
            alert("El plan no tiene contenido para exportar.");
            return;
        }

        const perfil = perfilMedicoActual || {};
        const profesional = [perfil.nombre, perfil.apellido]
            .filter(Boolean)
            .join(" ") || "Profesional tratante";
        const contenedor = document.createElement("div");
        contenedor.className = "nutrition-plan-pdf";

        contenedor.innerHTML = `
            <header class="nutrition-plan-pdf-header">
                <div>
                    <strong>ClínicApp</strong>
                    <span>${escapar(profesional)}</span>
                    ${perfil.especialidad ? `<small>${escapar(perfil.especialidad)}</small>` : ""}
                    ${perfil.matricula ? `<small>Matrícula ${escapar(perfil.matricula)}</small>` : ""}
                </div>
                <div>
                    <span>Plan alimentario</span>
                    <small>${formatearFechaLocal(plan.fecha_inicio || obtenerFechaHoy())}</small>
                </div>
            </header>
            <section class="nutrition-plan-pdf-patient">
                <span>Paciente</span>
                <h1>${escapar(estado.pacienteNombre)}</h1>
                <h2>${escapar(plan.titulo || "Plan alimentario")}</h2>
                ${plan.objetivo ? `<p><strong>Objetivo:</strong> ${escapar(plan.objetivo)}</p>` : ""}
            </section>
            <main>
                ${seccionesConDatos.map(seccion => `
                    <section class="nutrition-plan-pdf-section">
                        <h3>${escapar(seccion.titulo || etiquetaCategoria(seccion.clave))}</h3>
                        ${seccion.items.map(item => `
                            <article>
                                <strong>${escapar(item.titulo)}</strong>
                                ${item.contenido ? `<p>${escapar(item.contenido).replaceAll("\n", "<br>")}</p>` : ""}
                            </article>
                        `).join("")}
                    </section>
                `).join("")}
            </main>
            <footer>
                <span>Próxima revisión</span>
                <strong>${plan.fecha_revision ? formatearFechaLocal(plan.fecha_revision) : "A coordinar"}</strong>
            </footer>
        `;

        document.body.appendChild(contenedor);

        try{
            await new Promise(resolve => requestAnimationFrame(
                () => requestAnimationFrame(resolve)
            ));

            const rect = contenedor.getBoundingClientRect();

            if(rect.width === 0 || rect.height === 0){
                throw new Error(
                    `El contenido del PDF no tiene dimensiones: ${rect.width} × ${rect.height}`
                );
            }

            if(!contenedor.innerText.trim()){
                throw new Error("El plan alimentario no contiene texto para exportar.");
            }

            const blob = await html2pdf()
                .set({
                    margin:[10, 12, 14, 12],
                    filename:"plan-alimentario.pdf",
                    image:{ type:"jpeg", quality:0.98 },
                    html2canvas:{
                        scale:2,
                        useCORS:true,
                        allowTaint:false,
                        backgroundColor:"#ffffff",
                        logging:false
                    },
                    jsPDF:{ unit:"mm", format:"a4", orientation:"portrait" },
                    pagebreak:{ mode:["css", "legacy"] }
                })
                .from(contenedor)
                .outputPdf("blob");

            const nombre = crearNombrePDFPlan(plan);
            const archivo = new File([blob], nombre, { type:"application/pdf" });

            if(permitirGuardar && !estado.vistaPrevia){
                const confirmarGuardado = confirm(
                    "¿Querés guardar una copia de este PDF en Archivos y estudios del paciente?\n\n" +
                    "Esta acción agregará un archivo nuevo, sin reemplazar información existente."
                );

                if(confirmarGuardado){
                    await Database.subirArchivo(
                        estado.pacienteId,
                        archivo,
                        `Plan alimentario · ${plan.titulo}`
                    );

                    if(typeof cargarArchivosPaciente === "function"){
                        await cargarArchivosPaciente(estado.pacienteId);
                    }
                }
            }

            if(typeof compartirPDFIndicaciones === "function"){
                await compartirPDFIndicaciones(archivo, nombre);
            }else{
                descargarBlobComoArchivo(blob, nombre);
            }
        }catch(error){
            console.error("No se pudo generar el PDF del plan alimentario.");
            alert("No se pudo generar el PDF.");
        }finally{
            contenedor.remove();
        }
    }

    function crearNombrePDFPlan(plan){
        const paciente = estado.pacienteNombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const fecha = plan.fecha_inicio || obtenerFechaHoy();
        return `Plan-alimentario-${paciente || "Paciente"}-${fecha}.pdf`;
    }

    window.NutritionPlansUI = {
        abrir,
        cerrar,
        cambiarPantalla,
        editarOpcion,
        cancelarEdicionOpcion,
        guardarOpcion,
        archivarOpcion,
        archivarPlantilla,
        nuevoPlan,
        editarPlan,
        duplicarPlan,
        volverAPlanes,
        aplicarPlantilla,
        alternarOpcion,
        agregarItemPropio,
        actualizarItem,
        moverItem,
        quitarItem,
        actualizarModalidadSeguimiento,
        guardarPlan,
        abrirSeguimiento,
        guardarSeguimiento,
        exportarBorrador,
        exportarPlan
    };

    window.abrirModuloPlanesAlimentarios = abrir;

})();
