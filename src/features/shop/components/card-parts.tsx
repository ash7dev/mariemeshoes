import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { ShopCard, ShopSwatch } from '../queries';

/** Photo produit (fond blanc), posée telle quelle dans un cadre blanc : voir les cartes. */
export function ProductImage({ src, sizes, className }: { src: string | null; sizes: string; className?: string }) {
  if (!src) {
    return (
      <span className="grid size-full place-items-center text-muted">
        <ImageOff className="size-6" strokeWidth={1.4} aria-hidden="true" />
      </span>
    );
  }
  return <Image src={src} alt="" fill sizes={sizes} className={cn('object-contain', className)} />;
}

/** `onWhite` : badge posé sur le cadre blanc de la photo (fond sable pour rester visible). */
export function Badge({ badge, small = false, onWhite = false, className }: { badge: NonNullable<ShopCard['badge']>; small?: boolean; onWhite?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center whitespace-nowrap rounded-full',
        small ? 'h-6 px-2.5 text-[0.6875rem]' : 'h-7 px-3 text-xs',
        badge.tone === 'promo' ? 'bg-accent font-bold text-white' : cn('font-semibold text-ink', onWhite ? 'bg-card' : 'bg-surface'),
        className,
      )}
    >
      {badge.label}
    </span>
  );
}

/** Prix payé (magenta s'il est remisé) et prix barré. */
export function Price({ card, size = 'md', stacked = false }: { card: ShopCard; size?: 'md' | 'lg'; stacked?: boolean }) {
  return (
    <span className={cn('flex', stacked ? 'flex-col gap-0.5' : 'flex-wrap items-baseline gap-x-2.5 gap-y-0.5')}>
      <span className={cn('whitespace-nowrap font-bold tabular-nums', size === 'lg' ? 'text-[1.625rem]' : 'text-[1.0625rem]', card.struck ? 'text-accent-ink' : 'text-ink')}>
        {formatFCFA(card.price)}
      </span>
      {card.struck && (
        <span className="whitespace-nowrap text-[0.78125rem] text-muted-ink line-through">
          <span className="sr-only">au lieu de </span>
          {formatFCFA(card.struck)}
        </span>
      )}
    </span>
  );
}

/** Coloris du modèle : vignettes rondes, le coloris affiché est cerclé. */
export function Swatches({
  swatches,
  size,
  max = 4,
  ringClass = 'ring-offset-card',
}: {
  swatches: ShopSwatch[];
  size: 'sm' | 'lg';
  max?: number;
  ringClass?: string;
}) {
  if (swatches.length < 2) return null;
  const shown = swatches.slice(0, max);
  const rest = swatches.length - shown.length;
  return (
    <ul aria-label="Coloris" className={cn('flex items-center', size === 'lg' ? 'gap-2.5' : 'gap-1.5')}>
      {shown.map((s) => (
        <li key={s.slug}>
          <Link
            href={`/produits/${s.slug}`}
            aria-label={`Coloris ${s.name}`}
            aria-current={s.current ? 'true' : undefined}
            className={cn(
              'relative block overflow-hidden rounded-full bg-surface',
              size === 'lg' ? 'size-9' : 'size-6',
              s.current ? cn('ring-[1.5px] ring-ink ring-offset-2', ringClass) : 'ring-1 ring-inset ring-border hover:ring-ink',
            )}
          >
            {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes={size === 'lg' ? '36px' : '24px'} className="scale-[1.6] object-contain mix-blend-multiply" />}
          </Link>
        </li>
      ))}
      {rest > 0 && <li className="text-xs text-muted-ink">+{rest}</li>}
    </ul>
  );
}

/** « Plus que 2 en 43 », « Disponible en 43 » ou « Du 38 au 44 ». */
export function stockLine(card: ShopCard, size: number | null): string {
  if (size !== null && card.stockInSize !== null) {
    return card.stockInSize <= 2 ? `Plus que ${card.stockInSize} en ${size}` : `Disponible en ${size}`;
  }
  const { sizes } = card;
  if (sizes.length === 1) return `Disponible en ${sizes[0]}`;
  return `Du ${sizes[0]} au ${sizes[sizes.length - 1]}`;
}
