// src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShoeSize, useSizePicker } from '@/features/size/SizeProvider';
import { MOBILE_LINKS, isLinkActive, shouldHideBottomNav } from './nav-config';

/**
 * Dock mobile « scindé » : une capsule rose thé (Accueil, Boutique, Galerie)
 * et, détachée à droite, la sphère magenta de la pointure qui ouvre le sélecteur.
 * Le panier et la recherche sont dans l'en-tête.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const size = useShoeSize();
  const { open, openPicker } = useSizePicker();

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-3 bottom-[max(20px,env(safe-area-inset-bottom))] z-40 flex h-[72px] items-center gap-2.5 lg:hidden"
    >
      <ul className="grid h-full flex-1 grid-cols-3 gap-1 rounded-full border border-[#EBC9D7] bg-section p-[7px] shadow-[0_22px_44px_-18px_rgba(107,58,82,0.5)]">
        {MOBILE_LINKS.map(({ icon: Icon, ...link }) => {
          const active = isLinkActive(pathname, link);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-[3px] rounded-full transition-colors duration-200',
                  active ? 'bg-deep text-cream' : 'text-section-ink hover:text-deep',
                )}
              >
                <Icon className="size-[21px]" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[0.65625rem] font-semibold">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={size ? `Ma pointure : ${size}. Changer` : 'Choisir ma pointure'}
        className={cn(
          'flex size-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full bg-accent text-white transition-transform active:scale-95',
          'shadow-[inset_0_2px_0_rgba(255,255,255,0.32),inset_0_-3px_0_rgba(120,0,66,0.35),0_18px_34px_-12px_rgba(230,0,126,0.75)]',
        )}
      >
        {size ? (
          <span className="font-display text-[1.5625rem] leading-none">{size}</span>
        ) : (
          <Ruler className="size-6" strokeWidth={1.7} aria-hidden="true" />
        )}
        <span className="text-[0.46875rem] font-bold tracking-[0.18em]">POINTURE</span>
      </button>
    </nav>
  );
}
