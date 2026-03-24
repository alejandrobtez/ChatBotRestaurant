# 🤖 ChatBot Restaurant - Traditional AI Project

🔗 **[Try the ChatBot here](https://alejandrobtez.github.io/chat-restaurante/)**

---

This project **DOES NOT use ChatGPT** or generative models. 

### Why the difference?
* **Generative AI (ChatGPT):** Invents text word by word. It is creative but can fail or hallucinate dishes that don't exist.
* **Traditional AI (Our Bot):** Classifies user input into "boxes" (**Intents**) and extracts key data (**Entities**).
    * If you say *"I want a pizza"*, the AI doesn't invent a response; it simply notifies us: *"The user wants to ORDER (Intent) and the dish is PIZZA (Entity)"*.
    * This allows for **total control** over the bot's responses. 🎯

---

## 🛠️ Technology: Azure Language Studio

To achieve this, we trained a custom model using **Microsoft Azure AI Language (Language Studio)**.

The process was as follows:
1. **Training:** We taught the model example phrases (*"I want to eat", "Bring me a burger", "Cancel my order"*). 🧠
2. **Labeling:** We manually tagged important words (`Dish`, `Date`, etc.). 🏷️
3. **Deployment:** We connected this intelligence to our web interface via an API. 🌐

---

## 🤖 Capabilities

Thanks to this combination of AI + Programming Logic, the bot:

* **Understands Natural Language:** You can speak normally ("I feel like having a pizza") and it understands you. 🗣️
* **Has Memory:** If you interrupt the order to ask a question, it remembers where you left off. 🧠
* **Enforces Business Rules:**
    * 🕒 **Orders:** Only accepts orders up to **48 hours** in advance.
    * 🚫 **Cancellations:** Only allows cancellations if requested at least **24 hours** beforehand.
    * ✅ If you try to bypass these rules, the bot detects it and politely informs you.

---

## 🧪 Try it yourself!

Try to trick the bot or test its limits with these phrases:

* *"I want a pizza for 5 days from now"* -> (It should tell you it only accepts 48h).
* *"Cancel today's order"* -> (It should say it's too late; you need 24h).
* *"I want a burger for tomorrow at 9 at 1st Main Street, I'm Ana and my mail is ana@gmail.com"* -> (It should capture everything at once). ✨

---

Project developed by **Alejandro Benítez**.
