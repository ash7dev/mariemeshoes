/** Le compte à rebours ne s'affiche que dans les derniers jours (avant, « jusqu'au 31 décembre » suffit). */
export const COUNTDOWN_DAYS = 14;

const DAY = 86_400_000;
const lastDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

/**
 * « Jusqu'au 31 décembre », puis, dans les 14 derniers jours, un compte à rebours :
 * jours et heures, puis heures et minutes le dernier jour. `endsAt` : fin exclue (ISO).
 */
export function timerLabel(endsAt: string, now: number): string {
  const end = new Date(endsAt).getTime();
  const left = end - now;
  if (left <= 0) return 'Terminée';
  if (left > COUNTDOWN_DAYS * DAY) return `Jusqu’au ${lastDay.format(new Date(end - 1))}`;
  const days = Math.floor(left / DAY);
  const hours = Math.floor((left % DAY) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  return days > 0 ? `Se termine dans ${days} j ${hours} h` : `Se termine dans ${hours} h ${String(minutes).padStart(2, '0')} min`;
}
