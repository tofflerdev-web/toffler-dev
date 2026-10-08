/* HEIDI knowledge base: the ONLY facts the demo assistant may use. Bilingual: English by default, Italian when the visitor writes Italian.
   Sources: tofflerdev_intro.pdf and the privacy notice. No prices, dates or promises on purpose.
   k  = lowercase keywords (English + Italian) that trigger an answer; short keys match whole words.
   social = a greeting or thanks: it only answers when no real topic matched ("ciao, cosa fate?" answers the question).
   a  = the English answer, it = the Italian answer. Both say the same facts, in Heidi's voice: gentle, clear, professional. */
window.HT_KB = {
  contact: "tofflerdev@proton.me",
  about: "I am Heidi, the Toffler AI assistant. I am an AI, not a person, and a small one, so please double-check anything important with the team.",
  aboutIt: "Sono Heidi, l'assistente AI di Toffler. Sono un'AI, non una persona, e sono piccola: per le cose importanti ricontrolla sempre con il team.",
  entries: [
    { social: true, k: ["hello", "hi", "hey", "good morning", "good afternoon", "ciao", "buongiorno", "buonasera", "salve"],
      a: "Hello, and welcome. I am Heidi, the Toffler AI assistant. I can tell you what Toffler does, how this demo works, or how to reach a person. What would you like to know?",
      it: "Ciao e benvenuto. Sono Heidi, l'assistente AI di Toffler. Posso spiegarti cosa fa Toffler, come funziona questa demo o come contattare una persona. Cosa vuoi sapere?" },
    { k: ["service", "services", "what do you do", "what does toffler", "offer", "automation", "servizi", "servizio", "cosa fate", "cosa fai", "cosa offrite", "cosa offri", "di cosa vi occupate", "automazione", "intelligenza artificiale"],
      a: "Toffler builds AI integration for organizations: models that sit inside real workflows and connect signal, decision and action, backed by cyber and intelligence expertise. For professionals and local businesses, that means AI automation of everyday work.",
      it: "Toffler costruisce integrazione di intelligenza artificiale per le organizzazioni: modelli inseriti nei flussi di lavoro reali, che collegano segnali, decisioni e azioni, con competenze di cyber e intelligence. Per professionisti e piccole attività significa automatizzare con l'AI il lavoro di ogni giorno." },
    { k: ["cyber", "security", "intelligence", "signal", "sicurezza"],
      a: "Toffler works across three areas: cyber, intelligence and AI integration. In short: understanding signals, turning them into decisions, and putting AI to work inside the systems and teams that act on them.",
      it: "Toffler lavora in tre aree: cyber, intelligence e integrazione dell'AI. In breve: capire i segnali, trasformarli in decisioni e mettere l'AI al lavoro nei sistemi e nei team che agiscono." },
    { k: ["tmg", "music", "audio", "media", "production", "musica", "produzione"],
      a: "TMG, Toffler Music Group, applies Toffler's signal-processing and AI integration work to media and audio production.",
      it: "TMG, Toffler Music Group, applica il lavoro di Toffler sull'elaborazione dei segnali e sull'integrazione dell'AI alla produzione audio e multimediale." },
    { k: ["centro studi", "research", "study", "studies", "human-ai", "ricerca"],
      a: "Centro Studi Toffler is the research arm: forward-looking studies on decision systems and human-AI collaboration.",
      it: "Il Centro Studi Toffler è l'area di ricerca: studi sul futuro dei sistemi decisionali e della collaborazione tra persone e AI." },
    { k: ["price", "pricing", "cost", "quote", "budget", "how much", "preventivo", "prezzo", "prezzi", "costo", "costi", "quanto costa", "tariffe"],
      a: "I do not have prices to share, and I would rather not guess. Every project is different, so please write to tofflerdev@proton.me and a person will reply with a proper answer.",
      it: "Non ho prezzi da condividere e preferisco non improvvisare. Ogni progetto è diverso: scrivi a tofflerdev@proton.me e una persona ti risponderà con precisione." },
    { k: ["privacy", "data", "private", "browser", "local", "device", "cookie", "cookies", "safe", "dati", "riservatezza", "sicuro"],
      a: "In AI mode the model runs inside your own browser, so what you type stays on your device. The site sets no cookies. The full privacy notice is available in English and Italian from the footer.",
      it: "In modalità AI il modello gira dentro il tuo browser, quindi ciò che scrivi resta sul tuo dispositivo. Il sito non usa cookie. L'informativa privacy completa, in italiano e in inglese, è nel piè di pagina." },
    { k: ["who are you", "what are you", "your name", "heidi", "are you real", "human", "bot", "chi sei", "come ti chiami", "sei un robot", "sei una persona", "sei umana"],
      a: "I am Heidi, the AI assistant of toffler.dev. I am not a person, and I am a small model running in this demo, so please double-check anything important with the team.",
      it: "Sono Heidi, l'assistente AI di toffler.dev. Non sono una persona e sono un modello piccolo in questa demo: per le cose importanti conferma sempre con il team." },
    { k: ["contact", "person", "email", "mail", "talk", "call", "phone", "meeting", "contatto", "contatti", "parlare", "scrivere", "telefono", "telefonare", "persona"],
      a: "I would be glad to connect you with a person. Write to tofflerdev@proton.me and the team will get back to you.",
      it: "Ti metto volentieri in contatto con una persona. Scrivi a tofflerdev@proton.me e il team ti risponderà." },
    { k: ["demo", "for whom", "who is it for", "clients", "professional", "studio", "business", "practice", "dimostrazione", "come funziona", "a chi serve", "clienti", "professionisti", "attività"],
      a: "This demo shows the kind of assistant Toffler can build for a professional practice or a local business: it answers common questions kindly and clearly, and hands the rest to a person.",
      it: "Questa demo mostra il tipo di assistente che Toffler può costruire per uno studio professionale o una piccola attività: risponde con gentilezza e chiarezza alle domande più comuni e passa il resto a una persona." },
    { social: true, k: ["thanks", "thank you", "grazie"],
      a: "You are very welcome. Is there anything else I can help you with?",
      it: "Prego! C'è altro in cui posso aiutarti?" }
  ],
  fallbackAi: "I do not have a good answer for that, and I would rather not guess. Please write to tofflerdev@proton.me and a person will reply. You can also type help.",
  fallbackAiIt: "Non ho una buona risposta a questo e preferisco non improvvisare. Scrivi a tofflerdev@proton.me e una persona ti risponderà. Puoi anche digitare aiuto.",
  fallback: "I do not have a good answer for that in my small FAQ, and I would rather not guess. Please write to tofflerdev@proton.me and a person will reply. You can also type help.",
  fallbackIt: "Non ho una buona risposta a questo nel mio piccolo elenco di domande e preferisco non improvvisare. Scrivi a tofflerdev@proton.me e una persona ti risponderà. Puoi anche digitare aiuto."
};
