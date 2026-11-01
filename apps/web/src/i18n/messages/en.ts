import type { Messages } from './it';

export const en: Messages = {
  meta: {
    siteName: 'Arthur Style · Hair Spa',
    home: {
      title: 'Arthur Style · Hair Spa — Hair salon in Florence',
      description:
        'Cuts, colour and Hair Spa treatments in the centre of Florence, a short walk from the Duomo. More than twenty years of craft.',
    },
    arturo: {
      title: 'Arturo',
      description:
        'More than twenty years of scissors, colour and listening: the person behind Arthur Style.',
    },
    services: {
      title: 'Services and prices',
      description: 'Cuts, colour, balayage, Hair Spa treatments and styling: indicative times and prices.',
    },
    work: { title: 'Work', description: 'Some of the work done at Arthur Style in Florence.' },
    contact: {
      title: 'Contact and opening hours',
      description: 'Phone, WhatsApp, Instagram, address and opening hours of Arthur Style in Florence.',
    },
    malta: {
      title: 'Coming soon to Malta',
      description: 'Arthur Style is getting ready to open in Malta. Leave your email to hear when.',
    },
    privacy: {
      title: 'Privacy',
      description: 'How Arthur Style handles the personal data of site visitors and clients.',
    },
    cookies: {
      title: 'Cookies',
      description: 'Which cookies the Arthur Style website uses and why: only the necessary ones.',
    },
    legal: {
      title: 'Legal notice',
      description: 'Business details, VAT number and legal notice of Arthur Style in Florence.',
    },
  },
  a11y: {
    skip: 'Skip to content',
    menu: 'Menu',
    mainNav: 'Main navigation',
    footerNav: 'Legal links',
    switchTo: 'Leggi in italiano',
  },
  nav: {
    home: 'Home',
    arturo: 'Arturo',
    services: 'Services',
    work: 'Work',
    contact: 'Contact',
    malta: 'Malta',
    privacy: 'Privacy',
    cookies: 'Cookies',
    legal: 'Legal notice',
  },
  cta: {
    whatsapp: 'Message us on WhatsApp',
    call: 'Call the salon',
    services: 'See services and prices',
    instagram: 'Follow us on Instagram',
    maps: 'Open in Google Maps',
    bookSoon: 'Online booking is coming soon: for now, message us on WhatsApp.',
  },
  home: {
    eyebrow: 'Florence, a short walk from the Duomo',
    title: 'Unhurried hair, by someone who has done it for more than twenty years.',
    lead: 'Cuts, colour and Hair Spa treatments: every appointment starts by listening to what you want, and ends when you recognise yourself in the mirror.',
    servicesTitle: 'What we do',
    servicesLead: 'Part of the price list. The time shown is the time you spend in the chair.',
    workTitle: 'From the salon',
    reviews: (rating: string, count: number) =>
      `${rating} out of 5 on Google, from ${String(count)} reviews.`,
    maltaTitle: 'Soon in Malta too',
    maltaText:
      'Arturo is bringing his work to the island. Leave your email and we will let you know when we open.',
    maltaLink: 'Find out more',
  },
  arturo: {
    title: 'Arturo',
    lead: 'More than twenty years behind the chair, always with the same two rules: listen before cutting, and never promise a colour your hair cannot hold.',
    body: [
      "Arthur Style grew out of Arturo's craft: technique learned over years of work, and the habit of explaining every choice. Cut, colour, highlights and treatments are decided together, looking at the hair you have today.",
      'Hair Spa means taking the time: a proper wash, the right products, a blow-dry that lasts at home too. After Florence, the next stop is Malta.',
    ],
    signatureAlt: "Arturo's signature",
    note: 'Draft text: we will write the full story together with Arturo.',
  },
  services: {
    title: 'Services and prices',
    lead: 'Prices include VAT. "From" means the final price depends on hair length and thickness: we tell you before we start.',
    mockNote: 'Provisional price list, being updated.',
    duration: 'Duration',
    price: 'Price',
    onRequest: 'On consultation',
    filterLabel: 'Filter by category',
    filterAll: 'All',
    filterStatus: (count: number, category: string) =>
      `${String(count)} ${count === 1 ? 'service' : 'services'}: ${category}`,
  },
  work: {
    title: 'Work',
    lead: 'Some of the work done in the salon. You will find much more on Instagram.',
    photos: {
      onde: 'Brown hair with soft waves and warm highlights, seen in profile in the salon',
      piega:
        'Voluminous brown blow-dry curled at the ends, client seen from behind holding two hair products',
    },
  },
  contact: {
    title: 'Contact and opening hours',
    lead: 'Today the quickest way to book is WhatsApp.',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    address: 'Address',
    addressPending: 'street number being confirmed',
    hours: 'Opening hours',
    closed: 'Closed',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  malta: {
    title: 'Coming soon to Malta',
    lead: 'Arthur Style is getting ready to open in Malta. We will announce the area and the date as soon as they are certain: leave your email and you will be among the first to know.',
    name: 'Name',
    email: 'Email',
    consent:
      'I agree to receive one email when Arthur Style opens in Malta. Nothing else, and I can unsubscribe at any time.',
    submit: 'Let me know',
    preview:
      'Preview: sign-up will open soon and no data is sent for now. Meanwhile, follow us on Instagram.',
    errors: {
      name: 'Please enter your name.',
      email: 'Please enter a valid email, for example name@example.com.',
      consent: 'We need your consent to email you.',
    },
  },
  legal: {
    pending: 'Page in preparation. The final text will follow the privacy consultant’s review.',
    vat: 'VAT number to be confirmed',
  },
  notFound: { title: 'Page not found', text: 'The link may be old or mistyped.', back: 'Back to home' },
  footer: { rights: 'Arthur Style · Hair Spa', hours: 'Tue–Fri 9–19 · Sat 9–18' },
};
