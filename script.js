// ==========================================
// CONFIGURACIÓN DE AZURE
// ==========================================
const AZURE_KEY = "32UbhIM6gX5akIH7RwNrORR8g54Hulk2mztAwaiONVto1ZDywP7CJQQJ99CAACI8hq2XJ3w3AAAaACOG32Lp"; 
const AZURE_ENDPOINT = "https://restaurantlanguage.cognitiveservices.azure.com/"; 
const PROJECT_NAME = "restaurant"; 
const DEPLOYMENT_NAME = "restaurantV1"; 

// ==========================================
// 2. MEMORIA
// ==========================================
let pedidoActual = {
    platos: [],
    fecha: null,
    direccion: null,
    nombre: null,
    email: null
};

// ==========================================
// 3. EVENTOS Y CONEXIÓN
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

        console.log("--- DEBUG ---");
        console.log("Intención:", intent);
        console.log("Entidades:", entities);

        generateBotReply(intent, entities);

    } catch (error) {
        console.error(error);
        addMessage("⚠️ Error de conexión. Revisa F12.", "bot");
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
// 4. LÓGICA DE NEGOCIO (CEREBRO + REGLAS)
// ==========================================
function generateBotReply(intent, entities) {
    let reply = "";

    // --- FASE 1: EXTRACCIÓN DE DATOS ---
    entities.forEach(entidad => {
        const cat = entidad.category.toLowerCase();
        const text = entidad.text;

        // 1. PLATO
        if (cat === 'plato') pedidoActual.platos.push(text);

        // 2. FECHA
        if (cat.includes('time') || cat.includes('date') || cat === 'datetimev2') {
            pedidoActual.fecha = text;
        }

        // 3. DIRECCIÓN (Busca 'direccion' en cualquier parte)
        if (cat.includes('direccion')) pedidoActual.direccion = text;

        // 4. NOMBRE
        if (cat.includes('person') || cat === 'nombre' || cat === 'personname') pedidoActual.nombre = text;

        // 5. EMAIL
        if (cat === 'email') pedidoActual.email = text;
    });

    // --- FASE 2: GESTIÓN DE RESPUESTAS ---

    switch (intent) {
        // --- CASO CANCELAR (REGLA 24H) ---
        case "CancelarPedido":
            // Si el usuario da una fecha, validamos la regla
            if (pedidoActual.fecha) {
                if (validarReglasDeNegocio(pedidoActual.fecha, 'cancelar')) {
                    reply = `🗑️ Pedido para "${pedidoActual.fecha}" cancelado correctamente.`;
                    resetPedido();
                } else {
                    reply = "⚠️ <b>Error de cancelación:</b> Necesitamos al menos 24 horas de antelación. No podemos cancelar pedidos para hoy o ahora mismo.";
                    pedidoActual.fecha = null; // Borramos la fecha para que la vuelva a decir
                }
            } else {
                reply = "Para cancelar, necesito saber la fecha del pedido. ¿Para cuándo era?";
            }
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido está en curso y llegará a la hora acordada.";
            break;

        case "Saludar":
             if (pedidoActual.platos.length > 0) {
                reply = `Hola de nuevo. Teníamos un pedido pendiente de **${pedidoActual.platos.join(", ")}**. ¿Seguimos?`;
            } else {
                reply = "¡Hola! 👨‍🍳 Soy tu asistente. Recuerda que puedes hacer pedidos con hasta 48h de antelación.";
            }
            break;

        // --- FLUJO PEDIDO (REGLA 48H) ---
        case "RealizarPedido":
        case "ProporcionarDatos":
        default: 
            
            // VALIDACIÓN INMEDIATA DE FECHA (Si acabamos de recibir una)
            if (pedidoActual.fecha) {
                if (!validarReglasDeNegocio(pedidoActual.fecha, 'pedido')) {
                    reply = `⚠️ <b>Fecha no válida:</b> "${pedidoActual.fecha}".<br>Solo aceptamos pedidos con un MÁXIMO de 48 horas de antelación. Por favor, dime una fecha más cercana.`;
                    pedidoActual.fecha = null; // Borramos la fecha inválida
                    addMessage(reply, "bot");
                    return; // Cortamos aquí para que el usuario rectifique
                }
            }

            // CHECKLIST DE DATOS FALTANTES
            if (pedidoActual.platos.length === 0) {
                reply = "🍽️ No tengo ningún plato anotado. ¿Qué quieres pedir? (Ej: Una pizza)";
            } 
            else if (!pedidoActual.fecha) {
                reply = `📝 Anoto: <b>${pedidoActual.platos.join(", ")}</b>. ¿Para qué fecha y hora lo quieres? (Max 48h antelación)`;
            }
            else if (!pedidoActual.direccion) {
                reply = `✅ Fecha válida: ${pedidoActual.fecha}. Necesito la **dirección de entrega**.`;
            }
            else if (!pedidoActual.nombre) {
                reply = `📍 Entrega en: <b>${pedidoActual.direccion}</b>. ¿A **nombre** de quién?`;
            }
            else if (!pedidoActual.email) {
                reply = `Oído, ${pedidoActual.nombre}. Solo falta tu **email** de contacto.`;
            }
            else {
                // RESUMEN FINAL
                reply = `
                    🎉 <b>PEDIDO CONFIRMADO</b><br><br>
                    🍕 <b>Comida:</b> ${pedidoActual.platos.join(", ")}<br>
                    📅 <b>Fecha:</b> ${pedidoActual.fecha}<br>
                    📍 <b>Dirección:</b> ${pedidoActual.direccion}<br>
                    👤 <b>Cliente:</b> ${pedidoActual.nombre}<br>
                    📧 <b>Email:</b> ${pedidoActual.email}<br><br>
                    ¡Gracias! ¿Deseas algo más?
                `;
                resetPedido();
            }
            break;
    }

    addMessage(reply, "bot");
}

// ==========================================
// 5. VALIDARDOR DE REGLAS (Simulación Inteligente)
// ==========================================
function validarReglasDeNegocio(textoFecha, modo) {
    const texto = textoFecha.toLowerCase();

    // REGLA 1: PEDIDOS (Máximo 48 horas de antelación)
    // Si detectamos palabras lejanas -> Falso
    if (modo === 'pedido') {
        if (texto.includes('semana') || texto.includes('mes') || texto.includes('año') || texto.includes('dias')) {
            // Ejemplo: "la semana que viene", "en 5 dias" -> RECHAZAR
            return false; 
        }
        // Asumimos que "mañana", "pasado mañana", "esta noche" son válidos (<48h)
        return true;
    }

    // REGLA 2: CANCELACIÓN (Mínimo 24 horas de aviso)
    // Si quiere cancelar YA -> Falso
    if (modo === 'cancelar') {
        if (texto.includes('hoy') || texto.includes('ahora') || texto.includes('ya') || texto.includes('esta noche') || texto.includes('esta tarde')) {
            // Ejemplo: "cancelar el pedido de hoy" -> RECHAZAR (Es muy tarde para cancelar)
            return false;
        }
        // Asumimos que "mañana" o fechas futuras sí dan tiempo a cancelar
        return true;
    }

    return true;
}

function resetPedido() {
    pedidoActual = { platos: [], fecha: null, direccion: null, nombre: null, email: null };
}

function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

