import type { Metadata } from 'next';
import { LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { logoutAction, logoutEverywhereAction } from '@/features/auth/actions';
import { ROLE_LABEL } from '@/features/auth/roles';
import ChangePasswordForm from '@/features/auth/components/ChangePasswordForm';
import DisplayNameForm from '@/features/auth/components/DisplayNameForm';
import NotificationSettings from '@/features/notifications/components/NotificationSettings';

export const metadata: Metadata = {
  title: 'Mon compte · Administration',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-col gap-6 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Mon compte</h1>
        <p className="text-sm text-muted-ink">Ton identité, ton mot de passe, tes appareils et tes notifications.</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-5">
        <div className="flex flex-col gap-4">
          {/* Identité */}
          <section aria-labelledby="identity-title" className="flex flex-col gap-5 rounded-[32px] bg-deep p-7 text-cream">
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-cream font-display text-[1.5rem] text-deep">
              {admin.fullName.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 id="identity-title" className="font-display text-[1.75rem] leading-tight">
                {admin.fullName}
              </h2>
              <p className="break-all text-[0.9375rem] text-deep-ink">{admin.email}</p>
            </div>
            <p className="flex h-8 items-center gap-2 self-start rounded-full px-3.5 text-xs font-medium ring-1 ring-inset ring-cream/25">
              <ShieldCheck className="size-3.5 text-accent-soft" strokeWidth={1.8} aria-hidden="true" />
              {ROLE_LABEL[admin.role]}
            </p>
            <DisplayNameForm key={admin.fullName} fullName={admin.fullName} />
          </section>

          {/* Appareils */}
          <section aria-labelledby="devices-title" className="flex flex-col gap-4 rounded-[32px] border border-border bg-surface p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-card">
                <MonitorSmartphone className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <h2 id="devices-title" className="font-display text-[1.375rem]">
                Appareils connectés
              </h2>
            </div>
            <p className="text-[0.9375rem] leading-relaxed text-muted-ink">
              Ta session reste ouverte sur chaque appareil jusqu’à ce que tu te déconnectes. Téléphone perdu ou ordinateur partagé : ferme toutes les sessions d’un coup.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={logoutAction}>
                <button type="submit" className="flex h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition-colors hover:border-ink">
                  <LogOut className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  Me déconnecter ici
                </button>
              </form>
              <form action={logoutEverywhereAction}>
                <button type="submit" className="flex h-12 items-center gap-2 rounded-full border border-accent-ink/40 px-5 text-sm font-medium text-accent-ink transition-colors hover:bg-[#FBE3EE]">
                  Déconnecter tous mes appareils
                </button>
              </form>
            </div>
          </section>

          <NotificationSettings />
        </div>

        {/* Mot de passe */}
        <section aria-labelledby="password-title" className="flex flex-col gap-6 rounded-[32px] border border-border bg-surface p-7 lg:p-10">
          <div className="flex flex-col gap-2">
            <h2 id="password-title" className="font-display text-[1.75rem]">
              Mot de passe
            </h2>
            <p className="text-[0.9375rem] leading-relaxed text-muted-ink">
              Après le changement, tes autres appareils devront se reconnecter avec le nouveau mot de passe.
            </p>
          </div>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
