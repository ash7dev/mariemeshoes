// src/components/layout/AdminHeader.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import AccountMenu from '@/features/auth/components/AccountMenu';
import { ADMIN_NAV_ITEMS, isAdminNavActive, type AdminBadges } from '@/features/admin/navigation';

type AdminHeaderProps = {
  badges: AdminBadges;
  admin: { fullName: string; email: string; roleLabel: string };
};

/**
 * Header admin « capsule » (même ADN que la boutique).
 * Ordinateur : marque, les 6 onglets au centre (actif en pilule aubergine), boutique et compte.
 * Mobile : marque et compte ; la navigation est dans la barre du bas.
 */
export default function AdminHeader({ badges, admin }: AdminHeaderProps) {
  const pathname = usePathname();

  return (
    // Tableau de bord mobile : l'en-tête « wallet » remplace la capsule.
    <header className={cn('sticky top-0 z-40 px-3 pt-2.5 lg:px-8 lg:pt-[18px]', pathname === '/admin' && 'max-lg:hidden')}>
      <div className="mx-auto flex h-[58px] max-w-[90rem] items-center gap-6 rounded-full border border-border bg-surface pl-5 pr-1.5 shadow-[0_14px_30px_-20px_rgba(42,14,30,0.4)] lg:h-[72px] lg:pl-6 lg:pr-2.5">
        <Link href="/admin" aria-label="Tableau de bord" className="flex shrink-0 flex-col gap-1 lg:gap-[5px]">
          <span className="font-display text-xl leading-none lg:text-[1.4375rem]">{siteConfig.name}</span>
          <span className="text-[0.5rem] font-semibold leading-none tracking-[0.32em] text-accent-ink lg:text-[0.53125rem] lg:tracking-[0.34em]">
            ADMINISTRATION
          </span>
        </Link>

        <nav aria-label="Administration" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isAdminNavActive(pathname, item);
              const badge = badges[item.key];
              const showBadge = badge && badge.count > 0;
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-[46px] items-center gap-2 rounded-full pl-4 text-[0.84375rem] font-medium transition-colors duration-150',
                      showBadge ? 'pr-2.5' : 'pr-4',
                      active ? 'bg-deep text-cream' : 'text-muted-ink hover:bg-card hover:text-ink',
                    )}
                  >
                    <Icon className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
                    {item.label}
                    {showBadge && <span className="sr-only">, {badge.label}</span>}
                    {showBadge &&
                      (badge.tone === 'count' ? (
                        <span aria-hidden="true" className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-accent px-1.5 text-[0.71875rem] font-bold tabular-nums text-white">
                          {badge.count > 99 ? '99+' : badge.count}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="flex h-[22px] items-center gap-[5px] rounded-full bg-section px-2 text-[0.6875rem] font-bold text-section-ink">
                          <span className="size-1.5 rounded-full bg-accent" />
                          {badge.count} bas
                        </span>
                      ))}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <Link
            href="/"
            target="_blank"
            aria-label="Voir la boutique"
            title="Voir la boutique"
            className="hidden size-[46px] place-items-center rounded-full text-muted-ink transition-colors hover:bg-card hover:text-ink lg:grid"
          >
            <ExternalLink className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </Link>
          <AccountMenu fullName={admin.fullName} email={admin.email} roleLabel={admin.roleLabel} />
        </div>
      </div>
    </header>
  );
}
