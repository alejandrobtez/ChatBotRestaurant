// ==========================================
// CONFIGURACIÓN DE AZURE (¡EDITA ESTO!)
// ==========================================
const AZURE_KEY = "32UbhIM6gX5akIH7RwNrORR8g54Hulk2mztAwaiONVto1ZDywP7CJQQJ99CAACI8hq2XJ3w3AAAaACOG32Lp"; 
const AZURE_ENDPOINT = "https://restaurantlanguage.cognitiveservices.azure.com/"; 
const PROJECT_NAME = "restaurant"; 
const DEPLOYMENT_NAME = "restaurantV1"; 

// ==========================================
// 2. MEMORIA DEL BOT (ESTADO)
// ==========================================
// Aquí guardamos TODO lo que el usuario nos va diciendo
let pedidoActual = {
    platos: [],
    fecha: null,
    direccion: null,
    nombre: null,
    email: null
};

// ==========================================
// 3. INTERFAZ Y EVENTOS
// ==========================================
const inputField = document.getElementById("user-input");
const chatBox = document.getElementById("messages");

inputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") sendMessage();
});

async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    addMessage(text, "user");
    inputField.value = "";
    inputField.focus();

    try {
        // Llamamos a la IA
        const data = await callAzureCLU(text);
        const intent = data.result.prediction.topIntent;
        const entities = data.result.prediction.entities;

        console.log("Intención:", intent);
        console.log("Entidades:", entities);

        // El cerebro decide qué responder
        generateBotReply(intent, entities);

    } catch (error) {
        console.error(error);
        addMessage("⚠️ Error de conexión. Revisa consola (F12).", "bot");
    }
}

async function callAzureCLU(text) {
    const url = `${AZURE_ENDPOINT}language/:analyze-conversations?api-version=2022-10-01-preview`;
    const payload = {
        kind: "Conversation",
        analysisInput: { conversationItem: { id: "1", participantId: "user", text: text } },
        parameters: { projectName: PROJECT_NAME, deploymentName: DEPLOYMENT_NAME, stringIndexType: "Utf16CodeUnit" }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": AZURE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Error Azure: " + response.statusText);
    return await response.json();
}

// ==========================================
// 4. CEREBRO DEL BOT (LÓGICA COMPLETA)
// ==========================================
function generateBotReply(intent, entities) {
    let reply = "";

    // --- PASO 1: ABSORBER INFORMACIÓN (Detectar entidades) ---
    // Da igual el intent, si el usuario dice un dato, lo guardamos.
    
    // Comida
    const nuevosPlatos = entities.filter(e => e.category === "plato").map(e => e.text);
    if (nuevosPlatos.length > 0) pedidoActual.platos = pedidoActual.platos.concat(nuevosPlatos);

    // Fecha (Soporta datetimeV2 y dateTime)
    const nuevaFecha = entities.find(e => e.category === "datetimeV2" || e.category === "dateTime");
    if (nuevaFecha) pedidoActual.fecha = nuevaFecha.text;

    // Dirección
    const nuevaDireccion = entities.find(e => e.category === "direccionenvio" || e.category === "DireccionEnvio");
    if (nuevaDireccion) pedidoActual.direccion = nuevaDireccion.text;

    // Nombre (Puede venir como 'personName', 'PersonName' o 'nombre')
    const nuevoNombre = entities.find(e => e.category === "personName" || e.category === "PersonName" || e.category === "nombre");
    if (nuevoNombre) pedidoActual.nombre = nuevoNombre.text;

    // Email
    const nuevoEmail = entities.find(e => e.category === "email" || e.category === "Email");
    if (nuevoEmail) pedidoActual.email = nuevoEmail.text;


    // --- PASO 2: TOMAR DECISIONES SEGÚN EL INTENT ---

    switch (intent) {
        case "CancelarPedido":
            resetPedido();
            reply = "🗑️ He cancelado tu pedido en curso y borrado tus datos. ¿Deseas empezar de nuevo?";
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido está en preparación en cocina. ¡Llegará pronto!";
            break;

        case "PedirRecomendacion":
            reply = "⭐ Te recomiendo mucho nuestra **Pizza 4 Quesos** o la **Hamburguesa de la Casa**. ¿Te apunto alguna?";
            break;

        case "Saludar":
            reply = "¡Hola! 👋 Soy tu asistente de pedidos. ¿Qué te apetece comer hoy?";
            break;

        // LÓGICA PRINCIPAL (RealizarPedido y ProporcionarDatos se tratan igual aquí para completar el flujo)
        case "RealizarPedido":
        case "ProporcionarDatos":
        default: 
            // Verificamos qué falta para completar el pedido paso a paso
            
            if (pedidoActual.platos.length === 0) {
                reply = "👨‍🍳 ¿Qué te gustaría pedir? (Pizzas, Hamburguesas, Ensaladas...)";
            } 
            else if (!pedidoActual.fecha) {
                reply = `📝 Tengo anotado: <b>${pedidoActual.platos.join(", ")}</b>. ¿Para qué fecha y hora lo quieres?`;
            }
            else if (!pedidoActual.direccion) {
                reply = `✅ Entendido, para el ${pedidoActual.fecha}. ¿A qué **dirección** te lo enviamos?`;
            }
            else if (!pedidoActual.nombre) {
                reply = `📍 Dirección guardada (${pedidoActual.direccion}). ¿A **nombre** de quién pongo el pedido?`;
            }
            else if (!pedidoActual.email) {
                reply = `Perfecto ${pedidoActual.nombre}. Solo me falta tu **email** para enviarte el ticket.`;
            }
            else {
                // ¡TENEMOS TODO! -> RESUMEN FINAL
                reply = `
                    🎉 <b>¡PEDIDO COMPLETADO!</b><br><br>
                    🥗 <b>Comida:</b> ${pedidoActual.platos.join(", ")}<br>
                    📅 <b>Fecha:</b> ${pedidoActual.fecha}<br>
                    📍 <b>Dirección:</b> ${pedidoActual.direccion}<br>
                    👤 <b>Cliente:</b> ${pedidoActual.nombre}<br>
                    📧 <b>Email:</b> ${pedidoActual.email}<br><br>
                    Gracias por tu pedido. ¿Deseas pedir algo más?
                `;
                resetPedido(); // Limpiamos para el siguiente
            }
            break;
    }

    addMessage(reply, "bot");
}

function resetPedido() {
    pedidoActual = { platos: [], fecha: null, direccion: null, nombre: null, email: null };
}

function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    const now = new Date();
    const time = now.getHours() + ":" + (now.getMinutes()<10?'0':'') + now.getMinutes();
    msgDiv.innerHTML = `<p>${text}</p><span class="time">${time}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}
