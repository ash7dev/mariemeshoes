import { Marcellus, Schibsted_Grotesk } from 'next/font/google';

/** Titres. Une seule graisse disponible (400). Utilitaire Tailwind : font-display. */
export const marcellus = Marcellus({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-marcellus',
});

/** Interface : texte, prix FCFA, pointures, boutons. Utilitaire Tailwind : font-sans. */
export const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-schibsted',
});
