export const siteConfig = {
  name: 'Mariemeshoes',
  tagline: 'Sneakers for everyone',
  description: 'Sneakers neuves au Sénégal. Paiement Wave ou à la livraison.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  locale: 'fr_SN',
  currency: 'XOF',
  city: 'Dakar, Sénégal',
  /** Numéro WhatsApp de la boutique (E.164, ex. +221771234567) ; vide = boutons WhatsApp masqués. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '',
  socials: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || '',
  },
};
