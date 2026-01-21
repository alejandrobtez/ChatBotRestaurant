// ==========================================
// CONFIGURACIÓN DE AZURE (¡EDITA ESTO!)
// ==========================================
const AZURE_KEY = "32UbhIM6gX5akIH7RwNrORR8g54Hulk2mztAwaiONVto1ZDywP7CJQQJ99CAACI8hq2XJ3w3AAAaACOG32Lp"; 
const AZURE_ENDPOINT = "https://restaurantlanguage.cognitiveservices.azure.com/"; 
const PROJECT_NAME = "restaurant"; 
const DEPLOYMENT_NAME = "restaurantV1"; 

// ==========================================
// LÓGICA DEL CHAT
// ==========================================

const inputField = document.getElementById("user-input");
const chatBox = document.getElementById("messages");

// Permitir enviar con la tecla Enter
inputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") sendMessage();
});

async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje del usuario
    addMessage(text, "user");
    inputField.value = "";
    inputField.focus();

    // 2. Mostrar "Escribiendo..." (opcional visual)
    // En un proyecto real aquí pondríamos un spinner

    try {
        // 3. Llamada a Azure CLU
        const data = await callAzureCLU(text);
        
        // 4. Procesar respuesta
        const intent = data.result.prediction.topIntent;
        const entities = data.result.prediction.entities;

        console.log("Intent:", intent); // Debug en consola
        console.log("Entities:", entities); // Debug en consola

        // 5. Generar respuesta del Bot
        generateBotReply(intent, entities);

    } catch (error) {
        console.error(error);
        addMessage("⚠️ Error de conexión. Revisa tu consola (F12) para ver si es la Clave o el CORS.", "bot");
    }
}

// Función para conectar con la API
async function callAzureCLU(text) {
    const url = `${AZURE_ENDPOINT}language/:analyze-conversations?api-version=2022-10-01-preview`;
    
    const payload = {
        kind: "Conversation",
        analysisInput: {
            conversationItem: {
                id: "1",
                participantId: "user",
                text: text
            }
        },
        parameters: {
            projectName: PROJECT_NAME,
            deploymentName: DEPLOYMENT_NAME,
            stringIndexType: "Utf16CodeUnit"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Ocp-Apim-Subscription-Key": AZURE_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Fallo en la petición a Azure");
    return await response.json();
}

// Función: Cerebro del Bot (Reglas de Negocio)
function generateBotReply(intent, entities) {
    let reply = "";

    // Extraer datos útiles
    // Unimos todos los platos en un solo string
    const platosList = entities.filter(e => e.category === "Plato").map(e => e.text).join(", ");
    const fecha = entities.find(e => e.category === "datetimeV2");
    const direccion = entities.find(e => e.category === "DireccionEnvio"); // Ahora incluye ciudad

    switch (intent) {
        case "RealizarPedido":
            if (!platosList) {
                reply = "👨‍🍳 ¿Qué te gustaría pedir? Tenemos Pizzas, Hamburguesas y Ensaladas.";
            } else {
                if (fecha) {
                    // Simulación validación 48h
                    if (checkDateRule(fecha, 48)) {
                        const destino = direccion ? `a <b>${direccion.text}</b>` : "pero necesito la dirección completa";
                        reply = `✅ ¡Oído! Pedido de <b>${platosList}</b> anotado para el ${fecha.text} ${destino}.`;
                    } else {
                        reply = "⏳ Lo siento, no aceptamos pedidos con más de 48 horas de antelación.";
                    }
                } else {
                    reply = `📝 Tomo nota de: <b>${platosList}</b>. ¿Para cuándo y dónde lo quieres?`;
                }
            }
            break;

        case "CancelarPedido":
            if (fecha) {
                // Simulación validación 24h
                if (checkDateRule(fecha, 24)) {
                     reply = "❌ No es posible cancelar. Debes avisar con al menos 24 horas de antelación.";
                } else {
                     reply = `🗑️ Pedido para el ${fecha.text} cancelado correctamente.`;
                }
            } else {
                reply = "Para cancelar necesito saber la fecha del pedido.";
            }
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido está en cocina. ¡Saldrá en breve hacia tu dirección!";
            break;

        case "PedirRecomendacion":
            reply = "⭐ Hoy te recomiendo nuestra **Hamburguesa Especial** con salsa secreta.";
            break;
        
        case "ProporcionarDatos":
            if (direccion) {
                reply = `📍 Dirección guardada: ${direccion.text}. ¿Necesitas algo más?`;
            } else {
                reply = "Datos recibidos. Gracias.";
            }
            break;

        default: // Incluye 'None' y cualquier otro no controlado
            reply = "🤔 Disculpa, solo gestiono pedidos de comida. ¿Quieres ver la carta?";
            break;
    }

    addMessage(reply, "bot");
}

// Utilidad para añadir mensajes al HTML
function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    
    // Hora actual
    const now = new Date();
    const timeString = now.getHours() + ":" + (now.getMinutes()<10?'0':'') + now.getMinutes();

    msgDiv.innerHTML = `<p>${text}</p><span class="time">${timeString}</span>`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll abajo
}

// Utilidad simulada para validar fechas
// (En producción real usaríamos librerías como Moment.js)
function checkDateRule(dateEntity, hoursLimit) {
    // Si la frase contiene palabras que implican futuro cercano, damos OK
    // Si contiene "semana que viene" o cosas lejanas, damos false para probar
    const text = dateEntity.text.toLowerCase();
    
    if (hoursLimit === 48) {
        // Regla: No más de 48h (Simulación)
        // Si dice "en 5 días", devuelve falso
        if (text.includes("días") || text.includes("semana")) return false; 
        return true; 
    }
    
    if (hoursLimit === 24) {
        // Regla: Cancelar con 24h (Simulación)
        // Si es "hoy" o "ahora", es menos de 24h -> error
        if (text.includes("hoy") || text.includes("ahora") || text.includes("ya")) return true; // true = error (menos de 24h)
        return false; // false = OK (hay tiempo suficiente)
    }
    return true;
}