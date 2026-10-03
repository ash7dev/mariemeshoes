import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ClipboardList, Images, PackageCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { getAdminSession } from '@/features/auth/require-admin';
import LoginForm from '@/features/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion · Administration',
  robots: { index: false, follow: false },
};

const TASKS = [
  { icon: ClipboardList, label: 'Commandes et paiements Wave' },
  { icon: PackageCheck, label: 'Stock par pointure' },
  { icon: Images, label: 'Produits, coloris et collections' },
];

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Déjà connectée en tant qu'admin : directement à l'administration.
  if (await getAdminSession()) redirect('/admin');
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh gap-3 bg-card p-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:p-6">
      {/* Panneau de marque (ordinateur) */}
      <section className="relative hidden flex-col justify-between overflow-hidden rounded-[40px] bg-deep p-10 text-cream lg:flex xl:p-14">
        <Link href="/" className="flex flex-col gap-1.5 self-start">
          <span className="font-display text-[1.75rem] leading-none">{siteConfig.name}</span>
          <span className="text-[0.59375rem] font-semibold leading-none tracking-[0.36em] text-accent-soft">
            SNEAKERS FOR EVERYONE
          </span>
        </Link>

        <div className="flex max-w-[34rem] flex-col gap-6">
          <p className="text-[0.71875rem] font-semibold tracking-[0.3em] text-accent-soft">ESPACE ADMINISTRATEUR</p>
          <h1 className="font-display text-[3.25rem] leading-[1.04]">
            Toute la boutique, au même endroit<span className="text-accent">.</span>
          </h1>
          <ul className="mt-2 flex flex-col gap-3">
            {TASKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5 text-[0.9375rem] text-deep-ink">
                <span className="grid size-9 place-items-center rounded-full ring-1 ring-inset ring-cream/20">
                  <Icon className="size-4 text-accent-soft" strokeWidth={1.7} aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p
          aria-hidden="true"
          className="pointer-events-none -mx-1 -mb-[0.3em] select-none whitespace-nowrap font-display text-[clamp(5rem,9vw,8.5rem)] leading-[0.9] text-deep-line"
        >
          {siteConfig.name}
        </p>
      </section>

      {/* Formulaire */}
      <section className="flex flex-col rounded-[32px] bg-page px-5 py-6 sm:px-10 lg:rounded-[40px] lg:px-14 lg:py-10">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 self-start rounded-full pr-3 text-sm text-muted-ink transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Retour à la boutique
        </Link>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-9 py-10">
          {/* Marque (mobile) */}
          <div className="flex flex-col gap-1.5 lg:hidden">
            <span className="font-display text-[1.5rem] leading-none">{siteConfig.name}</span>
            <span className="text-[0.5625rem] font-semibold leading-none tracking-[0.34em] text-accent-ink">ADMINISTRATION</span>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[2.25rem] leading-[1.08]">Connexion</h2>
            <p className="text-[0.9375rem] leading-relaxed text-muted-ink">Accès réservé à l’équipe {siteConfig.name}.</p>
          </div>

          <LoginForm next={next} />
        </div>

        <p className="text-center text-[0.8125rem] leading-relaxed text-muted-ink">
          Mot de passe oublié ? Contacte la propriétaire de la boutique.
        </p>
      </section>
    </main>
  );
}
