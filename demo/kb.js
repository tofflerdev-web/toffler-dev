/* HEIDI knowledge base: the ONLY facts the demo assistant may use.
   Sources: tofflerdev_intro.pdf and the privacy notice. No prices, dates or promises on purpose.
   k = lowercase keywords (English + Italian) that trigger an answer; short keys match whole words.
   a = the answer, written in Heidi's voice: gentle, clear, professional. */
window.HT_KB = {
  contact: "tofflerdev@proton.me",
  about: "I am Heidi, the Toffler AI assistant. I am an AI, not a person, and a small one, so please double-check anything important with the team.",
  entries: [
    { k: ["hello", "hi", "hey", "good morning", "good afternoon", "ciao", "buongiorno", "buonasera"],
      a: "Hello, and welcome. I am Heidi, the Toffler AI assistant. I can tell you what Toffler does, how this demo works, or how to reach a person. What would you like to know?" },
    { k: ["service", "services", "what do you do", "what does toffler", "offer", "automation", "servizi", "cosa fate", "cosa fai", "cosa offrite"],
      a: "Toffler builds AI integration for organizations: models that sit inside real workflows and connect signal, decision and action, backed by cyber and intelligence expertise. For professionals and local businesses, that means AI automation of everyday work." },
    { k: ["cyber", "security", "intelligence", "signal", "sicurezza"],
      a: "Toffler works across three areas: cyber, intelligence and AI integration. In short: understanding signals, turning them into decisions, and putting AI to work inside the systems and teams that act on them." },
    { k: ["tmg", "music", "audio", "media", "production", "musica"],
      a: "TMG, Toffler Music Group, applies Toffler's signal-processing and AI integration work to media and audio production." },
    { k: ["centro studi", "research", "study", "studies", "human-ai", "ricerca"],
      a: "Centro Studi Toffler is the research arm: forward-looking studies on decision systems and human-AI collaboration." },
    { k: ["price", "pricing", "cost", "quote", "budget", "how much", "preventivo", "prezzo", "prezzi", "costo", "costi", "quanto costa"],
      a: "I do not have prices to share, and I would rather not guess. Every project is different, so please write to tofflerdev@proton.me and a person will reply with a proper answer." },
    { k: ["privacy", "data", "private", "browser", "local", "device", "cookie", "cookies", "safe", "dati", "riservatezza"],
      a: "In AI mode the model runs inside your own browser, so what you type stays on your device. The site sets no cookies. The full privacy notice is available in English and Italian from the footer." },
    { k: ["who are you", "what are you", "your name", "heidi", "are you real", "human", "bot", "chi sei", "come ti chiami"],
      a: "I am Heidi, the AI assistant of toffler.dev. I am not a person, and I am a small model running in this demo, so please double-check anything important with the team." },
    { k: ["contact", "person", "email", "mail", "talk", "call", "phone", "meeting", "contatto", "contatti", "parlare", "scrivere"],
      a: "I would be glad to connect you with a person. Write to tofflerdev@proton.me and the team will get back to you." },
    { k: ["demo", "for whom", "who is it for", "clients", "professional", "studio", "business", "practice", "clienti", "professionisti"],
      a: "This demo shows the kind of assistant Toffler can build for a professional practice or a local business: it answers common questions kindly and clearly, and hands the rest to a person." },
    { k: ["thanks", "thank you", "grazie"],
      a: "You are very welcome. Is there anything else I can help you with?" }
  ],
  fallbackAi: "I do not have a good answer for that, and I would rather not guess. Please write to tofflerdev@proton.me and a person will reply. You can also type help.",
  fallback: "I do not have a good answer for that in my small FAQ, and I would rather not guess. Please write to tofflerdev@proton.me and a person will reply. You can also type help."
};
