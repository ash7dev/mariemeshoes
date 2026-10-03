/**
 * Lien de conversation WhatsApp (wa.me) à partir d'un numéro E.164 (+221…).
 * Renvoie null si aucun numéro n'est configuré : le bouton est alors masqué.
 */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const digits = phone?.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export const WHATSAPP_DEFAULT_MESSAGE = "Bonjour Mariemeshoes, j'ai une question sur une paire.";

/** Question sur une pointure précise depuis la fiche produit. */
export function whatsappSizeMessage(productName: string, colorwayName: string, size?: number): string {
  const pair = `${productName} ${colorwayName}`;
  return size
    ? `Bonjour Mariemeshoes, la ${pair} est-elle disponible en ${size} ?`
    : `Bonjour Mariemeshoes, j'ai une question sur la ${pair}.`;
}

/** Suivi d'une commande par sa référence (MS-2610-00001). */
export function whatsappOrderMessage(reference: string): string {
  return `Bonjour Mariemeshoes, je vous contacte au sujet de ma commande ${reference}.`;
}
