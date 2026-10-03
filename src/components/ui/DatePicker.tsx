'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Calendrier maison (jour seul, valeur « AAAA-MM-JJ »).
 * Calculs en UTC : Dakar est à UTC+0 toute l'année, un jour local = un jour UTC.
 */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAYS = [
  { short: 'L', long: 'lundi' },
  { short: 'M', long: 'mardi' },
  { short: 'M', long: 'mercredi' },
  { short: 'J', long: 'jeudi' },
  { short: 'V', long: 'vendredi' },
  { short: 'S', long: 'samedi' },
  { short: 'D', long: 'dimanche' },
];

const DAY_MS = 86_400_000;

function parse(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayUtc(): Date {
  return parse(new Date().toISOString().slice(0, 10))!;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return next;
}

/** « samedi 16 mai 2027 » */
function longLabel(date: Date): string {
  const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7].long;
  return `${weekday} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** « 16 mai 2027 » */
function shortLabel(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Les 6 semaines affichées pour un mois (lundi en premier). */
function monthGrid(month: Date): Date[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Premier jour sélectionnable (« AAAA-MM-JJ »). */
  min?: string;
  placeholder?: string;
  /** Période à surligner (ex. le « Du » quand on choisit le « Au »). */
  rangeStart?: string;
  rangeEnd?: string;
  invalid?: boolean;
  /** Identifiants des messages d'aide / d'erreur (aria-describedby). */
  describedBy?: string;
  clearable?: boolean;
};

export default function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = 'Choisir une date',
  rangeStart,
  rangeEnd,
  invalid,
  describedBy,
  clearable = true,
}: DatePickerProps) {
  const selected = parse(value);
  const minDate = parse(min);
  const start = parse(rangeStart);
  const end = parse(rangeEnd);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState<Date>(() => selected ?? minDate ?? todayUtc());
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const today = todayUtc();

  const isDisabled = (date: Date) => Boolean(minDate && date < minDate);

  const openCalendar = () => {
    const base = selected ?? (minDate && minDate > today ? minDate : today);
    setFocused(base);
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (date: Date) => {
    if (isDisabled(date)) return;
    onChange(toValue(date));
    close();
  };

  // Le jour actif reçoit le focus à chaque déplacement.
  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${toValue(focused)}"]`)?.focus();
  }, [open, focused]);

  // Clic en dehors : fermeture (sans voler le focus).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -((focused.getUTCDay() + 6) % 7)),
      End: () => addDays(focused, 6 - ((focused.getUTCDay() + 6) % 7)),
    };
    if (moves[event.key]) {
      event.preventDefault();
      setFocused(moves[event.key]());
    }
  };

  const days = monthGrid(focused);
  const month = focused.getUTCMonth();
  const canGoBack = !minDate || addMonths(focused, -1) >= new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'flex h-12 items-center rounded-2xl border bg-page transition-colors',
          invalid ? 'border-accent-ink' : open ? 'border-ink' : 'border-border hover:border-muted',
        )}
      >
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          aria-describedby={describedBy}
          onClick={() => (open ? close() : openCalendar())}
          className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl pl-4 pr-2 text-left text-[0.9375rem]"
        >
          <CalendarDays className={cn('size-[18px] shrink-0', selected ? 'text-accent-ink' : 'text-muted-ink')} strokeWidth={1.7} aria-hidden="true" />
          <span className={cn('truncate', !selected && 'text-muted-ink')}>{selected ? shortLabel(selected) : placeholder}</span>
        </button>
        {clearable && selected && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Effacer la date"
            className="mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(event) => event.key === 'Escape' && (event.stopPropagation(), close())}
          className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(20.5rem,calc(100vw-2rem))] rounded-[26px] border border-border bg-surface p-3.5 shadow-[0_30px_60px_-24px_rgba(42,14,30,0.45)]"
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setFocused(addMonths(focused, -1))}
              disabled={!canGoBack}
              aria-label="Mois précédent"
              className="grid size-10 place-items-center rounded-full hover:bg-card disabled:opacity-30"
            >
              <ChevronLeft className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
            <p id={titleId} aria-live="polite" className="font-display text-[1.25rem] capitalize leading-none">
              {MONTHS[month]} {focused.getUTCFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setFocused(addMonths(focused, 1))}
              aria-label="Mois suivant"
              className="grid size-10 place-items-center rounded-full hover:bg-card"
            >
              <ChevronRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div role="grid" aria-labelledby={titleId} ref={gridRef} onKeyDown={onGridKeyDown}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <span key={d.long} role="columnheader" aria-label={d.long} className="grid h-8 place-items-center text-[0.6875rem] font-semibold text-muted-ink">
                  {d.short}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7">
                {days.slice(week * 7, week * 7 + 7).map((date) => {
                  const key = toValue(date);
                  const outside = date.getUTCMonth() !== month;
                  const disabled = isDisabled(date);
                  const isSelected = selected?.getTime() === date.getTime();
                  const isToday = today.getTime() === date.getTime();
                  const inRange = Boolean(start && end && date >= start && date <= end);
                  const isEdge = Boolean((start && date.getTime() === start.getTime()) || (end && date.getTime() === end.getTime()));
                  const isFocus = focused.getTime() === date.getTime();
                  return (
                    <div key={key} role="gridcell" aria-selected={isSelected} className={cn('flex h-10 items-center justify-center', inRange && 'bg-section/70', inRange && date.getTime() === start?.getTime() && 'rounded-l-full', inRange && date.getTime() === end?.getTime() && 'rounded-r-full')}>
                      <button
                        type="button"
                        data-day={key}
                        tabIndex={isFocus ? 0 : -1}
                        disabled={disabled}
                        aria-label={`${longLabel(date)}${isToday ? ', aujourd’hui' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => choose(date)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            choose(date);
                          }
                        }}
                        className={cn(
                          'relative grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1',
                          isSelected
                            ? 'bg-accent font-bold text-white shadow-[0_8px_18px_-8px_rgba(230,0,126,0.8)]'
                            : isEdge
                              ? 'bg-deep font-semibold text-cream'
                              : disabled
                                ? 'cursor-not-allowed text-border line-through'
                                : outside
                                  ? 'text-muted hover:bg-card'
                                  : 'hover:bg-card',
                        )}
                      >
                        {date.getUTCDate()}
                        {isToday && !isSelected && <span aria-hidden="true" className="absolute bottom-1.5 size-1 rounded-full bg-accent" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => choose(today)}
              disabled={isDisabled(today)}
              className="h-9 rounded-full px-3 text-[0.8125rem] font-semibold text-accent-ink hover:bg-card disabled:opacity-40"
            >
              Aujourd’hui
            </button>
            {clearable && selected && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  close();
                }}
                className="h-9 rounded-full px-3 text-[0.8125rem] font-semibold text-muted-ink hover:bg-card hover:text-ink"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
