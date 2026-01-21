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

    try {
        // 2. Llamada a Azure CLU
        const data = await callAzureCLU(text);
        
        // 3. Procesar respuesta
        const intent = data.result.prediction.topIntent;
        const entities = data.result.prediction.entities;

        // DEBUG: Muestra en la consola (F12) qué está recibiendo exactamente
        console.log("Intención:", intent);
        console.log("Entidades:", entities);

        // 4. Generar respuesta del Bot
        generateBotReply(intent, entities);

    } catch (error) {
        console.error(error);
        addMessage("⚠️ Error: Revisa la consola (F12). Probablemente sea la Key o el Endpoint.", "bot");
    }
}

// Función para conectar con la API de Azure
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

    if (!response.ok) throw new Error("Fallo en la petición a Azure: " + response.statusText);
    return await response.json();
}

// ==========================================
// CEREBRO DEL BOT (AQUÍ ESTÁ LA CORRECCIÓN)
// ==========================================
function generateBotReply(intent, entities) {
    let reply = "";

    // EXTRAER DATOS (Ajustado a minúsculas)
    // 1. Buscamos 'plato' en minúscula
    const platosList = entities.filter(e => e.category === "plato").map(e => e.text).join(", ");
    
    // 2. Buscamos 'direccionenvio' en minúscula (según tu indicación)
    // NOTA: Si en Azure lo llamaste 'DireccionEnvio', cambia esto a "DireccionEnvio"
    const direccion = entities.find(e => e.category === "direccionenvio" || e.category === "DireccionEnvio"); 
    
    // 3. Buscamos 'datetimeV2' (Estándar de Azure)
    const fecha = entities.find(e => e.category === "datetimeV2");


    switch (intent) {
        case "RealizarPedido":
            // Si NO ha detectado platos, preguntamos qué quiere
            if (!platosList) {
                reply = "👨‍🍳 ¿Qué te gustaría pedir? Tenemos Pizzas, Hamburguesas y Ensaladas.";
            } else {
                // Si SÍ hay platos, miramos si falta la fecha o la dirección
                if (fecha) {
                    // Validación simple de 48h (Simulada)
                    if (checkDateRule(fecha, 48)) {
                        const destino = direccion ? `a <b>${direccion.text}</b>` : "pero necesito que me digas la dirección de entrega";
                        reply = `✅ ¡Oído cocina! Pedido de <b>${platosList}</b> anotado para el ${fecha.text} ${destino}.`;
                    } else {
                        reply = "⏳ Lo siento, no aceptamos pedidos con más de 48 horas de antelación.";
                    }
                } else {
                    reply = `📝 Tomo nota de: <b>${platosList}</b>. ¿Para qué día y hora deseas recibirlo? (Máximo 48h).`;
                }
            }
            break;

        case "CancelarPedido":
            if (fecha) {
                if (checkDateRule(fecha, 24)) { // Validación cancelación 24h
                     reply = "❌ No es posible cancelar. Debes avisar con al menos 24 horas de antelación.";
                } else {
                     reply = `🗑️ Correcto. Procedemos a cancelar tu pedido previsto para: ${fecha.text}.`;
                }
            } else {
                reply = "Para cancelar necesito saber la fecha del pedido.";
            }
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido se está cocinando y el repartidor saldrá en breve.";
            break;

        case "PedirRecomendacion":
            reply = "⭐ Hoy el chef recomienda nuestra **Hamburguesa Especial** con extra de queso.";
            break;
        
        case "ProporcionarDatos":
            if (direccion) {
                reply = `📍 Dirección actualizada: ${direccion.text}. ¿Necesitas algo más?`;
            } else {
                reply = "Datos recibidos correctamente.";
            }
            break;

        case "Saludar":
             reply = "¡Hola! 👋 ¿Tienes hambre? Pídeme lo que quieras.";
             break;

        default: // 'None' u otros
            reply = "🤔 Disculpa, no te he entendido bien. Solo gestiono pedidos de comida.";
            break;
    }

    addMessage(reply, "bot");
}

// Utilidad para añadir mensajes al HTML
function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    
    // Hora actual bonita
    const now = new Date();
    const timeString = now.getHours() + ":" + (now.getMinutes()<10?'0':'') + now.getMinutes();

    msgDiv.innerHTML = `<p>${text}</p><span class="time">${timeString}</span>`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Utilidad simulada para validar fechas
function checkDateRule(dateEntity, hoursLimit) {
    // Si la frase contiene palabras que implican futuro cercano, damos OK
    const text = dateEntity.text.toLowerCase();
    
    if (hoursLimit === 48) {
        // Regla: No más de 48h
        // Si dice "en 5 días" o "semana que viene", devuelve falso (error)
        if (text.includes("días") || text.includes("semana")) return false; 
        return true; 
    }
    
    if (hoursLimit === 24) {
        // Regla: Cancelar con 24h
        // Si dice "hoy", "ahora" o "ya", es menos de 24h -> devuelve true (error)
        if (text.includes("hoy") || text.includes("ahora") || text.includes("ya")) return true; 
        return false; // OK, hay tiempo
    }
    return true;
}
