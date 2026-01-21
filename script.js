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
// Esta variable sobrevive a las interrupciones
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
        const data = await callAzureCLU(text);
        const intent = data.result.prediction.topIntent;
        const entities = data.result.prediction.entities;

        console.log("Intención:", intent);
        console.log("Entidades detectadas:", entities);

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
// 4. CEREBRO DEL BOT (LÓGICA DE INTERRUPCIONES)
// ==========================================
function generateBotReply(intent, entities) {
    let reply = "";

    // --- FASE 1: ABSORCIÓN DE DATOS (Siempre activa) ---
    // El bot "escucha" datos útiles incluso si el usuario está preguntando otra cosa.
    
    // 1. Comida (Busca 'plato')
    const nuevosPlatos = entities.filter(e => e.category.toLowerCase() === "plato").map(e => e.text);
    if (nuevosPlatos.length > 0) pedidoActual.platos = pedidoActual.platos.concat(nuevosPlatos);

    // 2. Fecha (Busca 'datetimev2' o 'datetime')
    const nuevaFecha = entities.find(e => {
        const cat = e.category.toLowerCase();
        return cat === "datetimev2" || cat === "datetime";
    });
    if (nuevaFecha) pedidoActual.fecha = nuevaFecha.text;

    // 3. Dirección (Busca 'direccionenvio')
    const nuevaDireccion = entities.find(e => e.category.toLowerCase() === "direccionenvio");
    if (nuevaDireccion) pedidoActual.direccion = nuevaDireccion.text;

    // 4. Nombre (Busca 'personname' o 'nombre')
    const nuevoNombre = entities.find(e => {
        const cat = e.category.toLowerCase();
        return cat === "personname" || cat === "nombre";
    });
    if (nuevoNombre) pedidoActual.nombre = nuevoNombre.text;

    // 5. Email (Busca 'email')
    const nuevoEmail = entities.find(e => e.category.toLowerCase() === "email");
    if (nuevoEmail) pedidoActual.email = nuevoEmail.text;


    // --- FASE 2: GESTIÓN DE INTENCIONES E INTERRUPCIONES ---

    switch (intent) {
        // --- CASOS DE ACCIÓN DIRECTA (Interrupciones permitidas) ---
        case "CancelarPedido":
            resetPedido();
            reply = "🗑️ Entendido. He cancelado el pedido en curso y borrado todos los datos. ¿En qué más puedo ayudarte?";
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido actual está en cocina. ¡Saldrá muy pronto!";
            // Si hay un pedido a medias, le recordamos suavemente
            if (pedidoActual.platos.length > 0) {
                reply += "<br><br>⚠️ Nota: Veo que estás intentando hacer un nuevo pedido ahora mismo. Dime los datos que faltan cuando quieras continuar.";
            }
            break;

        case "PedirRecomendacion":
            reply = "⭐ Si te gustan los sabores fuertes, prueba nuestra **Pizza Barbacoa**. Si prefieres algo ligero, la **Ensalada César** es genial.";
             // El bot responde a la duda, pero mantiene la memoria intacta para cuando el usuario quiera seguir.
            break;

        case "Saludar":
            // Si saluda pero ya tenemos datos, asumimos que retoma la conversación
            if (pedidoActual.platos.length > 0) {
                reply = `¡Hola de nuevo! 👋 Veo que teníamos un pedido a medias de **${pedidoActual.platos.join(", ")}**. ¿Continuamos?`;
            } else {
                reply = "¡Hola! 👋 Soy tu asistente de pedidos. ¿Qué te apetece comer hoy?";
            }
            break;

        // --- CASO PRINCIPAL: FLUJO DE PEDIDO ---
        // Aquí entramos si la intención es pedir, dar datos, o si el bot no entendió (None) pero hay un pedido activo.
        case "RealizarPedido":
        case "ProporcionarDatos":
        default: 
            // Verificamos el ESTADO del pedido actual
            
            // 1. ¿No hay nada pedido?
            if (pedidoActual.platos.length === 0) {
                if (intent === "None") {
                    reply = "🤔 No te he entendido bien. ¿Quieres ver la carta o hacer un pedido?";
                } else {
                    reply = "👨‍🍳 ¿Qué te gustaría pedir? (Ej: Una pizza, dos hamburguesas...)";
                }
            } 
            // 2. Hay comida, ¿falta FECHA?
            else if (!pedidoActual.fecha) {
                reply = `📝 Tengo anotado: <b>${pedidoActual.platos.join(", ")}</b>. ¿Para qué fecha y hora lo quieres?`;
            }
            // 3. Hay fecha, ¿falta DIRECCIÓN?
            else if (!pedidoActual.direccion) {
                reply = `✅ Entendido, para el ${pedidoActual.fecha}. ¿A qué **dirección** te lo enviamos?`;
            }
            // 4. Hay dirección, ¿falta NOMBRE?
            else if (!pedidoActual.nombre) {
                reply = `📍 Dirección guardada: ${pedidoActual.direccion}. ¿A **nombre** de quién pongo el pedido?`;
            }
            // 5. Hay nombre, ¿falta EMAIL?
            else if (!pedidoActual.email) {
                reply = `Perfecto ${pedidoActual.nombre}. Solo me falta tu **email** para enviarte la confirmación.`;
            }
            // 6. ¡TODO COMPLETO!
            else {
                reply = `
                    🎉 <b>¡PEDIDO CONFIRMADO!</b><br><br>
                    🥗 <b>Comida:</b> ${pedidoActual.platos.join(", ")}<br>
                    📅 <b>Fecha:</b> ${pedidoActual.fecha}<br>
                    📍 <b>Dirección:</b> ${pedidoActual.direccion}<br>
                    👤 <b>Cliente:</b> ${pedidoActual.nombre}<br>
                    📧 <b>Email:</b> ${pedidoActual.email}<br><br>
                    Gracias por tu pedido. ¿Deseas pedir algo más?
                `;
                resetPedido(); // Limpiamos la memoria tras el éxito
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
