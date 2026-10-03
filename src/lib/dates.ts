/** Dates de l'admin, toujours en heure de Dakar (UTC+0, sans heure d'été). */
export const TIME_ZONE = 'Africa/Dakar';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
const full = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

const dayKey = (date: Date) => new Intl.DateTimeFormat('fr-CA', { timeZone: TIME_ZONE }).format(date);

/**
 * « à l'instant », « il y a 12 min », « il y a 3 h », « hier à 14:30 », « 12 sept. à 09:05 ».
 * Pour une file de commandes : on voit d'un coup d'œil depuis combien de temps un client attend.
 */
export function formatRelative(value: Date | string, now = new Date()): string {
  const date = new Date(value);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 6 * 60 && dayKey(date) === dayKey(now)) return `il y a ${Math.floor(minutes / 60)} h`;
  if (dayKey(date) === dayKey(now)) return `aujourd’hui à ${time.format(date)}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(date) === dayKey(yesterday)) return `hier à ${time.format(date)}`;
  return `${dayMonth.format(date)} à ${time.format(date)}`;
}

/** « mardi 30 septembre à 14:30 » */
export function formatFullDate(value: Date | string): string {
  return full.format(new Date(value));
}

/** Nombre d'heures écoulées (alerte « client en attente depuis longtemps »). */
export function hoursSince(value: Date | string, now = new Date()): number {
  return (now.getTime() - new Date(value).getTime()) / 3_600_000;
}
