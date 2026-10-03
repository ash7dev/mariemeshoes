// src/components/layout/Footer.tsx
import Link from 'next/link';
import { Lock, MessageCircle, Plus } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings/queries';
import { FOOTER_COLUMNS, LEGAL_LINKS } from './nav-config';

const PAYMENT_BADGES = ['Wave', 'Paiement à la livraison', 'Prix en FCFA'];

/**
 * Footer aubergine aux coins arrondis : appel WhatsApp, liens, moyens de paiement,
 * et le nom de la boutique en filigrane géant.
 * Mobile : colonnes en accordéon, marge basse pour le dock.
 * Contacts et réseaux : Paramètres de l'admin (secours : variables d'environnement).
 */
export default async function Footer() {
  const settings = await getStoreSettings();
  const whatsappHref = whatsappLink(settings.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 overflow-hidden rounded-t-[32px] bg-deep px-5 pb-[132px] pt-[38px] text-cream lg:mt-24 lg:rounded-t-[44px] lg:px-20 lg:pb-0 lg:pt-[72px]">
      <div className="mx-auto max-w-[80rem]">
        <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] lg:gap-20">
          {/* Appel */}
          <div className="flex flex-col gap-[18px]">
            <h2 className="font-display text-[1.875rem] leading-[1.1] lg:text-[2.75rem] lg:leading-[1.08]">
              Une question sur une pointure ?
            </h2>
            <p className="hidden text-base leading-relaxed text-deep-ink lg:block">
              On te répond directement sur WhatsApp, avant et après ta commande.
            </p>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-white transition-transform active:scale-[0.98] lg:mt-1.5 lg:self-start"
              >
                <MessageCircle className="size-[19px]" strokeWidth={1.7} aria-hidden="true" />
                Écrire sur WhatsApp
              </a>
            ) : (
              <Link
                href="/guide-des-pointures"
                className="flex h-[52px] items-center justify-center rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-white lg:mt-1.5 lg:self-start"
              >
                Guide des pointures
              </Link>
            )}
          </div>

          {/* Liens — ordinateur : colonnes */}
          <div className="hidden grid-cols-3 gap-8 lg:grid">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3.5">
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent-soft">{column.title}</h3>
                <ul className="flex flex-col gap-3.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-[0.9375rem] text-cream transition-colors hover:text-accent-soft">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {column.title === 'Mariemeshoes' &&
                    socials.map((social) => (
                      <li key={social.label}>
                        <a href={social.href} target="_blank" rel="noopener noreferrer" className="text-[0.9375rem] text-cream transition-colors hover:text-accent-soft">
                          {social.label}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Liens — mobile : accordéons */}
          <div className="mt-7 flex flex-col border-b border-cream/15 lg:hidden">
            {FOOTER_COLUMNS.map((column) => (
              <details key={column.title} className="group border-t border-cream/15">
                <summary className="flex h-[58px] cursor-pointer list-none items-center justify-between text-base font-medium [&::-webkit-details-marker]:hidden">
                  {column.title}
                  <Plus className="size-[18px] text-accent-soft transition-transform duration-200 group-open:rotate-45" strokeWidth={1.8} aria-hidden="true" />
                </summary>
                <ul className="flex flex-col gap-3 pb-5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-[0.9375rem] text-deep-ink hover:text-cream">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>

        {/* Paiement */}
        <ul className="mt-6 flex flex-wrap gap-2 lg:mt-11 lg:gap-2.5">
          {PAYMENT_BADGES.map((badge) => (
            <li key={badge} className="flex h-8 items-center rounded-full border border-cream/20 px-3.5 text-xs font-medium lg:h-[34px] lg:px-4 lg:text-[0.78125rem]">
              {badge}
            </li>
          ))}
        </ul>

        {/* Filigrane */}
        <p aria-hidden="true" className="mt-[26px] whitespace-nowrap font-display text-[3.875rem] leading-[0.85] text-deep-line lg:mt-9 lg:text-[11.625rem] lg:leading-[0.82] lg:tracking-[-0.01em]">
          {settings.storeName}
        </p>

        {/* Bas de page */}
        <div className="mt-[18px] flex flex-col gap-3 text-[0.8125rem] text-deep-ink lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:border-t lg:border-cream/10">
          <span>
            © {year} {settings.storeName} · {siteConfig.city}
          </span>
          <ul className="flex items-center gap-5 lg:gap-7">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-cream">
                  {link.label}
                </Link>
              </li>
            ))}
            {/* Accès discret à l'administration */}
            <li className="ml-auto lg:ml-0">
              <Link
                href="/admin/login"
                aria-label="Espace administrateur"
                title="Espace administrateur"
                prefetch={false}
                className="grid size-8 place-items-center rounded-full text-deep-ink/45 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <Lock className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
