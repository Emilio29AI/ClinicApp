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

    if(boton.disabled) return;

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

    if(boton.disabled) return;

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
            "No se pudo crear la cuenta. Revisá los datos o intentá nuevamente más tarde."
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


if(loginView && registerView){

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
}

async function solicitarRecuperacionPassword(){

    const emailInput =
        document.querySelector('input[type="email"]');

    const email =
        emailInput?.value.trim() || "";

    if(!email){

        alert("Ingresá tu correo electrónico primero.");

        emailInput?.focus();

        return;
    }

    const boton =
        document.querySelector(".forgot-password-link");

    if(boton?.disabled) return;

    try{

        if(boton){
            boton.disabled = true;
            boton.textContent = "Enviando...";
        }

        const redirectTo =
            new URL(
                "restablecer-password.html",
                window.location.href
            ).href;

        const { error } =
            await authSupabaseClient.auth.resetPasswordForEmail(
                email,
                { redirectTo }
            );

        if(error){
            throw error;
        }

        alert(
            "Solicitud enviada. Revisá también la carpeta de correo no deseado."
        );

    }catch(error){

        console.error("No se pudo completar la recuperación de contraseña.");

        alert(
            "No se pudo enviar el correo. Intentá nuevamente más tarde."
        );

    }finally{

        if(boton){
            boton.disabled = false;
            boton.textContent =
                "¿Olvidaste tu contraseña?";
        }

    }

}

async function guardarNuevaPassword(event){

    event.preventDefault();

    const password =
        document
            .getElementById("newPassword")
            .value;

    const confirmPassword =
        document
            .getElementById("confirmPassword")
            .value;

    const message =
        document.getElementById(
            "resetPasswordMessage"
        );

    const button =
        document.getElementById(
            "resetPasswordButton"
        );

    if(button.disabled) return;

    message.textContent = "";

    if(password.length < 8){

        message.textContent =
            "La contraseña debe tener al menos 8 caracteres.";

        return;
    }

    if(password !== confirmPassword){

        message.textContent =
            "Las contraseñas no coinciden.";

        return;
    }

    button.disabled = true;
    button.textContent = "Guardando...";

    const { error } =
        await authSupabaseClient.auth.updateUser({
            password
        });

    if(error){

        console.error("No se pudo actualizar la contraseña.");

        message.textContent =
            "No se pudo actualizar la contraseña. Solicitá un nuevo enlace e intentá nuevamente.";

        button.disabled = false;
        button.textContent =
            "Guardar nueva contraseña";

        return;
    }

    message.textContent =
        "Contraseña actualizada correctamente.";

    await authSupabaseClient.auth.signOut();

    setTimeout(() => {

        window.location.href = "login.html";

    }, 1500);

}

