import Link from 'next/link';
import { ArrowRight, Truck } from 'lucide-react';
import { promotionHeadline, type PublicPromotion } from '@/features/promotions/public';
import { timerLabel } from '@/features/shop/collection-timer';
import CollectionTimer from '@/features/shop/components/CollectionTimer';
import ProductCard from '@/features/shop/components/ProductCard';
import ProductCardMini from '@/features/shop/components/ProductCardMini';
import type { HomePromo } from '../queries';

/** Cartes à côté du panneau de la promotion (ordinateur : 3, mobile : 4 en grille de 2). */
const DESKTOP_CARDS = 3;

function Timer({ endsAt, className }: { endsAt: string | null; className?: string }) {
  if (!endsAt) return null;
  return (
    <span className={className}>
      <CollectionTimer endsAt={endsAt} initial={timerLabel(endsAt, Date.now())} />
    </span>
  );
}

/**
 * Promotions en cours sur l'accueil : pour chaque remise, un panneau magenta (combien,
 * sur quoi, jusqu'à quand) et les paires qu'elle touche ; la livraison offerte en bandeau.
 * Rien ne s'affiche quand aucune promotion n'est en cours.
 */
export default function HomePromos({ promos, freeDelivery, size }: { promos: HomePromo[]; freeDelivery: PublicPromotion | null; size: number | null }) {
  if (promos.length === 0 && !freeDelivery) return null;

  return (
    <section id="promos" aria-label="Promotions en cours" className="flex scroll-mt-32 flex-col gap-4 lg:gap-6">
      {freeDelivery && (
        <p className="flex items-center gap-3.5 rounded-[26px] bg-section py-2.5 pl-2.5 pr-5 text-deep lg:rounded-full lg:pr-7">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-accent-ink lg:size-12">
            <Truck className="size-5" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
            <strong className="font-display text-lg leading-tight lg:text-[1.375rem]">{promotionHeadline(freeDelivery)}</strong>
            <span className="text-[0.8125rem] text-section-ink">
              {freeDelivery.scope === 'sur toute la boutique' ? 'Sur toute la boutique' : freeDelivery.scope.replace(/^sur/, 'Sur')}
              {freeDelivery.endsAt && ' · '}
              <Timer endsAt={freeDelivery.endsAt} />
            </span>
          </span>
        </p>
      )}

      {promos.map((promo) => {
        const more = promo.count > promo.cards.length || promo.count > DESKTOP_CARDS;
        const cta = promo.href ?? (more ? '/boutique' : null);
        return (
          <article key={promo.id} aria-labelledby={`promo-${promo.id}`} className="flex flex-col gap-3 lg:grid lg:grid-cols-4 lg:gap-6">
            <div className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-[30px] bg-accent-ink p-6 text-white lg:min-h-[26rem] lg:rounded-[32px] lg:p-7">
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-6 font-display text-[9rem] leading-none text-white/10">
                %
              </span>
              <div className="relative flex flex-col gap-2.5">
                <span className="text-[0.65625rem] font-bold uppercase tracking-[0.22em] text-white/85 lg:text-[0.6875rem]">Promotion en cours</span>
                <Timer endsAt={promo.endsAt} className="self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold" />
              </div>
              <div className="relative flex flex-col gap-2">
                <span className="font-display text-[4.25rem] leading-[0.85] lg:text-[5.5rem]">{promo.label}</span>
                <h2 id={`promo-${promo.id}`} className="font-display text-2xl leading-tight lg:text-[1.75rem]">
                  {promo.name}
                </h2>
                <p className="text-sm text-white/85">
                  {promo.scope.charAt(0).toUpperCase() + promo.scope.slice(1)} · {promo.count} paire{promo.count > 1 ? 's' : ''}
                </p>
                {promo.description && <p className="line-clamp-3 text-sm leading-relaxed text-white/85">{promo.description}</p>}
              </div>
              {cta && (
                <Link href={cta} className="relative flex h-12 items-center justify-center gap-2 self-start rounded-full bg-white px-5 text-sm font-bold text-accent-ink transition-transform hover:scale-[1.03]">
                  {promo.href ? 'Voir la promo' : 'Voir la boutique'}
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </div>

            <ul className="hidden lg:contents">
              {promo.cards.slice(0, DESKTOP_CARDS).map((card) => (
                <li key={card.id}>
                  <ProductCard card={card} size={size} compact />
                </li>
              ))}
            </ul>
            <ul className="grid grid-cols-2 gap-3 lg:hidden">
              {promo.cards.map((card) => (
                <li key={card.id}>
                  <ProductCardMini card={card} size={size} />
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
