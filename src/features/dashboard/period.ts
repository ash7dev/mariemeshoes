/**
 * Périodes du tableau de bord, en heure de Dakar (UTC+0, sans heure d'été :
 * les calculs en UTC sont donc exacts).
 */

export const DASHBOARD_PERIODS = ['7j', 'mois', 'annee'] as const;
export type DashboardPeriodKey = (typeof DASHBOARD_PERIODS)[number];

export function parsePeriod(value?: string): DashboardPeriodKey {
  return DASHBOARD_PERIODS.includes(value as DashboardPeriodKey) ? (value as DashboardPeriodKey) : 'mois';
}

export type Bucket = { key: string; label: string; fullLabel: string; isFuture: boolean; isCurrent: boolean };

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  /** « Octobre », « 7 jours », « 2026 » */
  label: string;
  /** « vs septembre à date » */
  compareLabel: string;
  bucket: 'day' | 'month';
  start: Date;
  end: Date;
  /** Période précédente, à date (même durée écoulée) : comparaison honnête. */
  prevStart: Date;
  prevEnd: Date;
  buckets: Bucket[];
};

const DAY = 86_400_000;
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
/** Clé de jour « 2026-10-16 » (identique au to_char SQL). */
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);

export function resolvePeriod(key: DashboardPeriodKey, now = new Date()): DashboardPeriod {
  const today = startOfDay(now);
  const elapsed = now.getTime();

  if (key === '7j') {
    const start = new Date(today.getTime() - 6 * DAY);
    const end = new Date(today.getTime() + DAY);
    return {
      key,
      label: '7 jours',
      compareLabel: 'vs les 7 jours d’avant',
      bucket: 'day',
      start,
      end,
      prevStart: new Date(start.getTime() - 7 * DAY),
      prevEnd: new Date(elapsed - 7 * DAY),
      buckets: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start.getTime() + i * DAY);
        return {
          key: dayKey(d),
          label: WEEKDAYS[d.getUTCDay()],
          fullLabel: `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`,
          isFuture: false,
          isCurrent: i === 6,
        };
      }),
    };
  }

  if (key === 'annee') {
    const year = today.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const prevStart = new Date(Date.UTC(year - 1, 0, 1));
    return {
      key,
      label: String(year),
      compareLabel: `vs ${year - 1} à date`,
      bucket: 'month',
      start,
      end: new Date(Date.UTC(year + 1, 0, 1)),
      prevStart,
      prevEnd: new Date(prevStart.getTime() + (elapsed - start.getTime())),
      buckets: Array.from({ length: 12 }, (_, m) => {
        const d = new Date(Date.UTC(year, m, 1));
        return {
          key: monthKey(d),
          label: MONTHS_SHORT[m],
          fullLabel: `${capitalize(MONTHS[m])} ${year}`,
          isFuture: m > today.getUTCMonth(),
          isCurrent: m === today.getUTCMonth(),
        };
      }),
    };
  }

  // Mois en cours (par défaut)
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const prevStart = new Date(Date.UTC(year, month - 1, 1));
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  return {
    key,
    label: capitalize(MONTHS[month]),
    compareLabel: `vs ${MONTHS[(month + 11) % 12]} à date`,
    bucket: 'day',
    start,
    end,
    prevStart,
    prevEnd: new Date(prevStart.getTime() + (elapsed - start.getTime())),
    buckets: Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY);
      return {
        key: dayKey(d),
        label: String(i + 1),
        fullLabel: `${WEEKDAYS[d.getUTCDay()]} ${i + 1} ${MONTHS_SHORT[month]}`,
        isFuture: d.getTime() > today.getTime(),
        isCurrent: d.getTime() === today.getTime(),
      };
    }),
  };
}
