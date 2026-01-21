#ChatBot Restaurant - Proyecto de IA Tradicional

🔗 **[Prueba el ChatBot aquí](https://alejandrobtez.github.io/chat-restaurante/)** *(¡Recuerda poner tu enlace real aquí!)*

---
Este proyecto **NO usa ChatGPT** ni modelos generativos.

¿La diferencia?
* **IA Generativa (ChatGPT):** Inventa texto palabra por palabra. Es creativa pero puede fallar o inventarse platos que no existen.
* **IA Tradicional (Nuestro Bot):** Clasifica lo que dice el usuario en "cajitas" (Intenciones) y extrae datos clave.
    * Si dices *"Quiero una pizza"*, la IA no inventa una respuesta; simplemente nos avisa: *"El usuario quiere PEDIR (Intent) y el plato es PIZZA (Entity)"*.
    * Esto permite tener un **control total** sobre lo que el bot responde.

---

## 🛠️ Tecnología: Azure Language Studio

Para lograr esto, hemos entrenado un modelo personalizado usando **Microsoft Azure AI Language (Language Studio)**.

El proceso ha sido el siguiente:
1.  **Entrenamiento:** Le hemos enseñado frases de ejemplo (*"Quiero comer", "Traeme una hamburguesa", "Cancela mi pedido"*).
2.  **Etiquetado:** Hemos marcado manualmente qué palabras son importantes (`Plato`, `Fecha`...)
3.  **Despliegue:** Conectamos esa inteligencia a nuestra web mediante una API.

---

## 🤖 ¿Qué es capaz de hacer?

Gracias a esta combinación de IA + Lógica de Programación, el bot:

* **Entiende el lenguaje natural:** Puedes hablarle normal ("Me apetece una pizza") y él te entiende.
* **Tiene Memoria:** Si interrumpes el pedido para preguntar algo, luego se acuerda de dónde estabas.
* **Aplica Reglas de Negocio:**
    * 🕒 **Pedidos:** Solo acepta encargos con un máximo de **48 horas** de antelación.
    * 🚫 **Cancelaciones:** Solo permite anular si avisas con al menos **24 horas** de tiempo.
    * ✅ Si intentas saltarte esas normas, el bot lo detecta y te avisa amablemente.

---

## 🧪 ¡Pruébalo tú mismo!

Intenta engañar al bot o probar sus límites con estas frases:

* *"Quiero una pizza para dentro de 5 días"* -> (Debería decirte que solo acepta 48h).
* *"Cancela el pedido de hoy"* -> (Debería decirte que es demasiado tarde, necesitas 24h).
* *"Quiero una hamburguesa para mañana a las 9 en calle mayor 1, soy Ana y mi mail es ana@gmail.com"* -> (Debería capturarlo todo de golpe).
