const authSupabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_KEY
);

const loginView =
    document.getElementById("loginView");

const registerView =
    document.getElementById("registerView");


function mostrarRegistro(){

    loginView.classList.add("hidden");

    registerView.classList.remove("hidden");

}


function mostrarLogin(){

    registerView.classList.add("hidden");

    loginView.classList.remove("hidden");

}


function mostrarMensaje(elementoId, mensaje, tipo = "error"){

    const elemento =
        document.getElementById(elementoId);

    elemento.textContent = mensaje;

    elemento.className =
        `auth-message ${tipo}`;

}


async function comprobarSesionExistente(){

    const {
        data: { session }
    } = await authSupabaseClient.auth.getSession();

    if(session){

        window.location.replace("index.html");

    }

}


async function iniciarSesion(){

    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;

    if(!email || !password){

        mostrarMensaje(
            "loginMessage",
            "Completá el email y la contraseña."
        );

        return;

    }

    const boton =
        document.getElementById("loginButton");

    boton.disabled = true;

    boton.textContent = "Ingresando...";

    const { error } =
        await authSupabaseClient.auth.signInWithPassword({

            email,

            password

        });

    if(error){

        mostrarMensaje(
            "loginMessage",
            "No se pudo iniciar sesión. Revisá los datos ingresados."
        );

        boton.disabled = false;

        boton.textContent = "Ingresar";

        return;

    }

    window.location.replace("index.html");

}


async function registrarMedico(){

    const nombre =
        document
            .getElementById("registerNombre")
            .value
            .trim();

    const apellido =
        document
            .getElementById("registerApellido")
            .value
            .trim();

    const email =
        document
            .getElementById("registerEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("registerPassword")
            .value;

    const passwordRepeat =
        document
            .getElementById("registerPasswordRepeat")
            .value;

    if(!nombre || !apellido || !email || !password){

        mostrarMensaje(
            "registerMessage",
            "Completá todos los campos."
        );

        return;

    }

    if(password.length < 8){

        mostrarMensaje(
            "registerMessage",
            "La contraseña debe tener al menos 8 caracteres."
        );

        return;

    }

    if(password !== passwordRepeat){

        mostrarMensaje(
            "registerMessage",
            "Las contraseñas no coinciden."
        );

        return;

    }

    const boton =
        document.getElementById("registerButton");

    boton.disabled = true;

    boton.textContent = "Creando cuenta...";

    const { data, error } =
        await authSupabaseClient.auth.signUp({

            email,

            password,

            options: {

                data: {

                    nombre,

                    apellido

                }

            }

        });

    if(error){

        mostrarMensaje(
            "registerMessage",
            error.message
        );

        boton.disabled = false;

        boton.textContent = "Crear cuenta";

        return;

    }

    if(data.session){

        window.location.replace("index.html");

        return;

    }

    mostrarMensaje(
        "registerMessage",
        "Cuenta creada. Revisá tu email para confirmar el registro.",
        "success"
    );

    boton.disabled = false;

    boton.textContent = "Crear cuenta";

}


document
    .getElementById("loginButton")
    .addEventListener("click", iniciarSesion);


document
    .getElementById("registerButton")
    .addEventListener("click", registrarMedico);


document.addEventListener("keydown", event => {

    if(event.key !== "Enter") return;

    if(!loginView.classList.contains("hidden")){

        iniciarSesion();

    }else{

        registrarMedico();

    }

});


comprobarSesionExistente();