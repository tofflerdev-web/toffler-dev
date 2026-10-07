/* HT-01 knowledge base: the ONLY facts the demo assistant may use.
   SAMPLE CONTENT: generic on purpose, no product specs, prices or dates.
   Replace the answers with real High Torque information before showing it as more than a demo.
   k = lowercase keywords that trigger the instant (lite mode) answer; a = the answer. */
window.HT_KB = {
  contact: "tofflerdev@proton.me",
  entries: [
    { k: ["hello", "hi ", "hey", "ciao", "good morning", "good afternoon"],
      a: "Hello, I am HT-01, the High Torque demo assistant. Ask me about quotes, lead times, technical support or after-sales, or type help." },
    { k: ["quote", "price", "pricing", "cost", "order", "buy", "purchase", "preventivo", "prezzo"],
      a: "To request a quote, send the product model or drawing, the quantity, the application and the destination country. A sales engineer replies with price and lead time." },
    { k: ["lead time", "delivery", "shipping", "ship", "how long", "when", "consegna", "spedizione"],
      a: "Lead times depend on the product and the quantity. The sales team confirms the exact delivery date in the quote." },
    { k: ["spec", "technical", "torque", "datasheet", "data sheet", "drawing", "cad", "dimension", "voltage", "speed", "load", "application"],
      a: "Tell me the application, the torque or load you need, the speed range, the supply voltage and the mounting. An engineer will match a product and send the datasheet." },
    { k: ["certificat", "certified", "compliance", "standard", "quality", "iso", "ce "],
      a: "Certification documents relevant to your market are supplied by the team together with the quote. Tell me your destination country and I will note it for them." },
    { k: ["warranty", "after-sales", "after sales", "support", "repair", "spare", "service", "assistenza", "garanzia"],
      a: "Warranty terms and after-sales support are confirmed in the quote. For a fault on a delivered unit, send the model, the serial number and a short description." },
    { k: ["sample", "samples", "prototype", "campione"],
      a: "Sample and prototype requests go through the same channel as quotes: describe the application and the quantity and the sales team replies." },
    { k: ["contact", "human", "person", "email", "mail", "talk", "call", "phone", "contatto"],
      a: "To talk to a person, write to tofflerdev@proton.me and mention High Torque. For this demo, your message goes to the toffler.dev team." },
    { k: ["who", "what are you", "demo", "toffler", "built", "made", "how does this work", "browser"],
      a: "I am a demo built by toffler.dev: an assistant that answers common questions and collects requests. The AI mode runs inside your own browser, so the conversation never leaves your device." }
  ],
  fallbackAi: "That is outside the sample FAQ I was given, so I will not guess. Write to tofflerdev@proton.me and a person will answer.",
  fallback: "That is outside the sample FAQ I have in lite mode. Type boot to wake the AI model, or write to tofflerdev@proton.me and a person will answer."
};
