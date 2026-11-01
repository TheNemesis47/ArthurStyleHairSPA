/**
 * Testi italiani (lingua principale). L'inglese (en.ts) deve avere esattamente la stessa forma: lo garantisce il tipo.
 * Solo fatti noti (docs/01): oltre vent'anni di esperienza, Hair Spa, centro di Firenze vicino al Duomo,
 * 4,7 su Google con 140 recensioni, trasferimento a Malta in programma. Il resto è da validare con Arturo.
 */
export const it = {
  meta: {
    siteName: 'Arthur Style · Hair Spa',
    home: {
      title: 'Arthur Style · Hair Spa — Parrucchiere a Firenze',
      description:
        "Taglio, colore e trattamenti Hair Spa nel centro di Firenze, a due passi dal Duomo. Oltre vent'anni di mestiere.",
    },
    arturo: {
      title: 'Arturo',
      description: "Oltre vent'anni di forbici, colore e ascolto: chi c'è dietro Arthur Style.",
    },
    services: {
      title: 'Servizi e prezzi',
      description:
        'Tagli, colore, balayage, trattamenti Hair Spa e acconciature: durate e prezzi indicativi.',
    },
    work: { title: 'Lavori', description: 'Alcuni lavori usciti dal salone di Arthur Style a Firenze.' },
    contact: {
      title: 'Contatti e orari',
      description: 'Telefono, WhatsApp, Instagram, indirizzo e orari di Arthur Style a Firenze.',
    },
    malta: {
      title: 'Prossimamente a Malta',
      description: 'Arthur Style si prepara ad aprire a Malta. Lascia la tua email per sapere quando.',
    },
    privacy: {
      title: 'Privacy',
      description: 'Come Arthur Style tratta i dati personali di chi visita il sito e prenota.',
    },
    cookies: {
      title: 'Cookie',
      description: 'Quali cookie usa il sito di Arthur Style e perché: solo quelli necessari.',
    },
    legal: {
      title: 'Note legali',
      description: 'Dati dell’attività, partita IVA e note legali di Arthur Style a Firenze.',
    },
  },
  a11y: {
    skip: 'Vai al contenuto',
    menu: 'Menu',
    mainNav: 'Navigazione principale',
    footerNav: 'Link legali',
    switchTo: 'Read in English',
  },
  nav: {
    home: 'Home',
    arturo: 'Arturo',
    services: 'Servizi',
    work: 'Lavori',
    contact: 'Contatti',
    malta: 'Malta',
    privacy: 'Privacy',
    cookies: 'Cookie',
    legal: 'Note legali',
  },
  cta: {
    whatsapp: 'Scrivici su WhatsApp',
    call: 'Chiama il salone',
    services: 'Vedi servizi e prezzi',
    instagram: 'Seguici su Instagram',
    maps: 'Apri in Google Maps',
    bookSoon: 'La prenotazione online arriva a breve: per ora scrivici su WhatsApp.',
  },
  home: {
    eyebrow: 'Firenze, a due passi dal Duomo',
    title: "Capelli fatti con calma, da chi lo fa da più di vent'anni.",
    lead: 'Taglio, colore e trattamenti Hair Spa: ogni appuntamento inizia ascoltando cosa vuoi, e finisce quando ti riconosci allo specchio.',
    servicesTitle: 'Cosa facciamo',
    servicesLead: 'Una parte del listino. Il tempo indicato è quello che passi in poltrona.',
    workTitle: 'Dal salone',
    reviews: (rating: string, count: number) => `${rating} su 5 su Google, da ${String(count)} recensioni.`,
    maltaTitle: 'Presto anche a Malta',
    maltaText: "Arturo porta il suo lavoro sull'isola. Lascia la tua email e ti avvisiamo all'apertura.",
    maltaLink: 'Scopri di più',
  },
  arturo: {
    title: 'Arturo',
    lead: "Più di vent'anni dietro la poltrona, sempre con le stesse due regole: ascoltare prima di tagliare, e non promettere un colore che i tuoi capelli non possono reggere.",
    body: [
      "Arthur Style nasce dal mestiere di Arturo: la tecnica imparata in anni di lavoro, e l'abitudine di spiegare ogni scelta. Taglio, colore, schiariture e trattamenti si decidono insieme, guardando i capelli che hai oggi.",
      'Hair Spa vuol dire prendersi il tempo: un lavaggio fatto bene, i prodotti giusti, una piega che dura anche a casa. Dopo Firenze, la prossima tappa è Malta.',
    ],
    signatureAlt: 'Firma di Arturo',
    note: 'Testo provvisorio: la storia completa la scriviamo insieme ad Arturo.',
  },
  services: {
    title: 'Servizi e prezzi',
    lead: 'Prezzi IVA inclusa. "Da" significa che il prezzo finale dipende da lunghezza e quantità dei capelli: te lo diciamo prima di iniziare.',
    mockNote: 'Listino provvisorio, in aggiornamento.',
    duration: 'Durata',
    price: 'Prezzo',
    onRequest: 'Su consulenza',
    filterLabel: 'Filtra per categoria',
    filterAll: 'Tutti',
    filterStatus: (count: number, category: string) =>
      `${String(count)} ${count === 1 ? 'servizio' : 'servizi'}: ${category}`,
  },
  work: {
    title: 'Lavori',
    lead: 'Alcuni lavori usciti dal salone. Ne trovi molti di più su Instagram.',
    photos: {
      onde: 'Castano con onde morbide e riflessi caldi, visto di profilo in salone',
      piega: 'Piega castana voluminosa sulle punte, cliente di spalle con due prodotti per capelli',
    },
  },
  contact: {
    title: 'Contatti e orari',
    lead: 'Il modo più veloce per prenotare, oggi, è WhatsApp.',
    phone: 'Telefono',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    address: 'Indirizzo',
    addressPending: 'civico in verifica',
    hours: 'Orari',
    closed: 'Chiuso',
    days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
  },
  malta: {
    title: 'Prossimamente a Malta',
    lead: 'Arthur Style si prepara ad aprire a Malta. Zona e data le annunciamo appena sono certe: lascia la tua email e sarai tra i primi a saperlo.',
    name: 'Nome',
    email: 'Email',
    consent:
      "Acconsento a ricevere un'email quando apre Arthur Style a Malta. Niente altro, e posso cancellarmi quando voglio.",
    submit: 'Avvisami',
    preview:
      "Anteprima: l'iscrizione sarà attiva a breve e per ora non viene inviato nessun dato. Nel frattempo seguici su Instagram.",
    errors: {
      name: 'Scrivi il tuo nome.',
      email: "Scrivi un'email valida, per esempio nome@esempio.it.",
      consent: 'Serve il consenso per poterti scrivere.',
    },
  },
  legal: {
    pending: 'Pagina in preparazione. Il testo definitivo arriva con la revisione del consulente privacy.',
    vat: 'P.IVA in definizione',
  },
  notFound: {
    title: 'Pagina non trovata',
    text: 'Il link potrebbe essere vecchio o sbagliato.',
    back: 'Torna alla home',
  },
  footer: { rights: 'Arthur Style · Hair Spa', hours: 'Mar–ven 9–19 · sab 9–18' },
};

export type Messages = typeof it;
