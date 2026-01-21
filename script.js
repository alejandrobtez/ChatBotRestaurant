// ==========================================
// CONFIGURACIÓN DE AZURE (¡EDITA ESTO!)
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

        // DEBUG: Chivato en la consola para ver qué llega
        console.log("--- NUEVA RESPUESTA AZURE ---");
        console.log("Intención:", intent);
        console.log("Entidades Brutas:", entities);

        generateBotReply(intent, entities);

    } catch (error) {
        console.error(error);
        addMessage("⚠️ Error de conexión. Pulsa F12 para ver el detalle.", "bot");
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
// 4. LÓGICA DE NEGOCIO (EL CEREBRO)
// ==========================================
function generateBotReply(intent, entities) {
    let reply = "";

    // --- FASE 1: EXTRACCIÓN DE DATOS "A PRUEBA DE BALAS" ---
    
    // Recorremos TODAS las entidades una a una para no fallar
    entities.forEach(entidad => {
        const categoria = entidad.category.toLowerCase(); // Convertimos a minúscula para comparar
        const texto = entidad.text;

        // 1. COMIDA
        if (categoria === 'plato') {
            pedidoActual.platos.push(texto);
            console.log(">>> HE ENCONTRADO PLATO:", texto);
        }

        // 2. FECHA (Cualquier cosa que parezca fecha)
        if (categoria.includes('time') || categoria.includes('date') || categoria === 'datetimev2') {
            pedidoActual.fecha = texto;
            console.log(">>> HE ENCONTRADO FECHA:", texto);
        }

        // 3. DIRECCIÓN (El arreglo definitivo)
        // Si la categoría contiene la palabra "direccion", la aceptamos.
        // Esto cubre: 'DireccionEnvio', 'direccion', 'direccionEntrega', etc.
        if (categoria.includes('direccion')) {
            pedidoActual.direccion = texto;
            console.log(">>> HE ENCONTRADO DIRECCIÓN:", texto);
        }

        // 4. NOMBRE
        if (categoria.includes('person') || categoria === 'nombre' || categoria === 'personname') {
            pedidoActual.nombre = texto;
            console.log(">>> HE ENCONTRADO NOMBRE:", texto);
        }

        // 5. EMAIL
        if (categoria === 'email') {
            pedidoActual.email = texto;
            console.log(">>> HE ENCONTRADO EMAIL:", texto);
        }
    });


    // --- FASE 2: RESPUESTAS ---

    switch (intent) {
        case "CancelarPedido":
            resetPedido();
            reply = "🗑️ Pedido cancelado y datos borrados. Dime qué quieres pedir ahora.";
            break;

        case "ConsultarEstado":
            reply = "🛵 Tu pedido está en curso.";
            break;

        case "Saludar":
            if (pedidoActual.platos.length > 0) {
                reply = `Hola de nuevo. Seguimos con tu pedido de **${pedidoActual.platos.join(", ")}**. Dime lo que falta.`;
            } else {
                reply = "Hola. Soy el asistente de pedidos. Dime qué quieres comer.";
            }
            break;

        // "PedirRecomendacion": Eliminamos ofertas, vamos al grano.
        case "PedirRecomendacion":
            reply = "Nuestra especialidad es la Pizza 4 Quesos y la Hamburguesa Completa. ¿Te anoto alguna?";
            break;

        // FLUJO PRINCIPAL (RealizarPedido, ProporcionarDatos y Default)
        case "RealizarPedido":
        case "ProporcionarDatos":
        default: 
            // Comprobamos qué falta en orden estricto
            
            if (pedidoActual.platos.length === 0) {
                // Aquí quitamos lo de "ver la carta"
                reply = "No tengo ningún plato anotado. ¿Qué quieres pedir? (Ej: Una pizza)";
            } 
            else if (!pedidoActual.fecha) {
                reply = `📝 Tengo anotado: <b>${pedidoActual.platos.join(", ")}</b>. ¿Para qué fecha y hora lo quieres?`;
            }
            else if (!pedidoActual.direccion) {
                reply = `✅ Fecha: ${pedidoActual.fecha}. Necesito la **dirección de entrega**.`;
            }
            else if (!pedidoActual.nombre) {
                // Si llegamos aquí, ES IMPOSIBLE que no tenga dirección, porque la validamos arriba.
                reply = `📍 Entrega en: <b>${pedidoActual.direccion}</b>. ¿A **nombre** de quién?`;
            }
            else if (!pedidoActual.email) {
                reply = `Oído, ${pedidoActual.nombre}. Solo falta tu **email** de contacto.`;
            }
            else {
                // RESUMEN FINAL
                reply = `
                    🎉 <b>PEDIDO TRAMITADO</b><br><br>
                    🍕 <b>Pedido:</b> ${pedidoActual.platos.join(", ")}<br>
                    📅 <b>Fecha:</b> ${pedidoActual.fecha}<br>
                    📍 <b>Dirección:</b> ${pedidoActual.direccion}<br>
                    👤 <b>Cliente:</b> ${pedidoActual.nombre}<br>
                    📧 <b>Email:</b> ${pedidoActual.email}<br><br>
                    ¿Quieres hacer otro pedido?
                `;
                resetPedido();
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
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}


