/**
 * Dictionnaire complet des indicatifs téléphoniques d'Afrique
 */
export const AFRICAN_COUNTRY_CODES: Record<string, { code: string; name: string; digits: number }> = {
  // Afrique de l'Ouest
  SN: { code: '+221', name: 'Sénégal', digits: 9 },
  CI: { code: '+225', name: 'Côte d\'Ivoire', digits: 10 },
  ML: { code: '+223', name: 'Mali', digits: 8 },
  GN: { code: '+224', name: 'Guinée', digits: 9 },
  BF: { code: '+226', name: 'Burkina Faso', digits: 8 },
  BJ: { code: '+229', name: 'Bénin', digits: 8 },
  TG: { code: '+228', name: 'Togo', digits: 8 },
  NE: { code: '+227', name: 'Niger', digits: 8 },
  MR: { code: '+222', name: 'Mauritanie', digits: 8 },
  GH: { code: '+233', name: 'Ghana', digits: 9 },
  NG: { code: '+234', name: 'Nigeria', digits: 10 },
  GM: { code: '+220', name: 'Gambie', digits: 7 },
  GW: { code: '+245', name: 'Guinée-Bissau', digits: 7 },
  SL: { code: '+232', name: 'Sierra Leone', digits: 8 },
  LR: { code: '+231', name: 'Libéria', digits: 8 },
  CV: { code: '+238', name: 'Cap-Vert', digits: 7 },

  // Afrique Centrale
  CM: { code: '+237', name: 'Cameroun', digits: 9 },
  GA: { code: '+241', name: 'Gabon', digits: 8 },
  CG: { code: '+242', name: 'Congo', digits: 9 },
  CD: { code: '+243', name: 'RD Congo', digits: 9 },
  TD: { code: '+235', name: 'Tchad', digits: 8 },
  CF: { code: '+236', name: 'RCA', digits: 8 },
  GQ: { code: '+240', name: 'Guinée Équatoriale', digits: 9 },
  AO: { code: '+244', name: 'Angola', digits: 9 },

  // Afrique du Nord
  MA: { code: '+212', name: 'Maroc', digits: 9 },
  DZ: { code: '+213', name: 'Algérie', digits: 9 },
  TN: { code: '+216', name: 'Tunisie', digits: 8 },
  EG: { code: '+20', name: 'Égypte', digits: 10 },
  LY: { code: '+218', name: 'Libye', digits: 9 },
  SD: { code: '+249', name: 'Soudan', digits: 9 },

  // Afrique de l'Est & Océan Indien
  KE: { code: '+254', name: 'Kenya', digits: 9 },
  TZ: { code: '+255', name: 'Tanzanie', digits: 9 },
  UG: { code: '+256', name: 'Ouganda', digits: 9 },
  RW: { code: '+250', name: 'Rwanda', digits: 9 },
  BI: { code: '+257', name: 'Burundi', digits: 8 },
  ET: { code: '+251', name: 'Éthiopie', digits: 9 },
  MG: { code: '+261', name: 'Madagascar', digits: 9 },
  MU: { code: '+230', name: 'Maurice', digits: 8 },

  // Afrique Australe
  ZA: { code: '+27', name: 'Afrique du Sud', digits: 9 },
};

/**
 * Normalise n'importe quel numéro africain au format E.164 (ex: +221770000000)
 */
export function normalizeAfricanPhone(phone: string, defaultPrefix: string = '+221'): string {
  if (!phone) return '';

  let cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Vérifier si le numéro commence sans "+" par un indicatif connu
  for (const country of Object.values(AFRICAN_COUNTRY_CODES)) {
    const rawCode = country.code.replace('+', '');
    if (cleaned.startsWith(rawCode) && cleaned.length >= rawCode.length + 6) {
      return '+' + cleaned;
    }
  }

  // Si c'est un numéro local (ex: 770000000), ajouter le prefix par défaut (ex: +221)
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = cleaned.substring(1);
  }

  return defaultPrefix + cleaned;
}

/**
 * Valide si un numéro correspond à un format international valide en Afrique (+2XX / +20 / +27)
 */
export function isValidAfricanPhone(phone: string): boolean {
  const normalized = normalizeAfricanPhone(phone);
  return /^\+(2[0-9]{2}|20|27)[0-9]{6,11}$/.test(normalized);
}

/**
 * Détecte le pays africain à partir d'un numéro normalisé
 */
export function detectAfricanCountry(phone: string) {
  const normalized = normalizeAfricanPhone(phone);
  for (const [iso, info] of Object.entries(AFRICAN_COUNTRY_CODES)) {
    if (normalized.startsWith(info.code)) {
      return { iso, ...info };
    }
  }
  return null;
}

export function normalizeSenegalPhone(phone: string): string {
  return normalizeAfricanPhone(phone, '+221');
}

/** +221771059210 → « 77 105 92 10 » (affichage) ; tout autre format est rendu tel quel. */
export function formatSenegalPhone(e164: string): string {
  const m = e164.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/**
 * Numéro sénégalais strict, au format exigé par la base (^\+221[0-9]{9}$).
 * Mobiles 70/71/75/76/77/78 et fixes 33, avec ou sans +221 / 00221 / 221.
 * Renvoie null si le numéro n'est pas sénégalais ou mal formé.
 * Exemple : "77 123 45 67" → "+221771234567"
 */
export function parseSenegalPhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-.()]/g, '').replace(/^(\+|00)/, '');
  const local = digits.length === 12 && digits.startsWith('221') ? digits.slice(3) : digits;
  return /^(7[015678]|33)[0-9]{7}$/.test(local) ? `+221${local}` : null;
}

