import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { LOW_STOCK_THRESHOLD } from '@/features/admin/queries';
import { getDashboard } from '@/features/dashboard/queries';
import { parsePeriod } from '@/features/dashboard/period';
import { PeriodSwitch } from '@/features/dashboard/components/ui';
import RevenueHero from '@/features/dashboard/components/RevenueHero';
import NextAction from '@/features/dashboard/components/NextAction';
import SizeWall from '@/features/dashboard/components/SizeWall';
import DayJournal from '@/features/dashboard/components/DayJournal';
import OrderHeatmap from '@/features/dashboard/components/OrderHeatmap';
import BrandSales from '@/features/dashboard/components/BrandSales';
import ZoneStats from '@/features/dashboard/components/ZoneStats';
import WalletHeader from '@/features/dashboard/components/mobile/WalletHeader';
import SizeWallMobile from '@/features/dashboard/components/mobile/SizeWallMobile';
import { ActivityList, LowStockBanner, WeekBars } from '@/features/dashboard/components/mobile/MobileSections';
import { AmountsProvider } from '@/features/dashboard/components/mobile/amounts';

export const metadata: Metadata = {
  title: 'Tableau de bord · Administration',
  robots: { index: false, follow: false },
};

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [admin, { periode }] = await Promise.all([requireAdmin(), searchParams]);
  const data = await getDashboard(parsePeriod(periode));
  const firstName = admin.fullName.split(' ')[0];

  return (
    <>
      {/* ═══════════════════ Ordinateur ═══════════════════ */}
      <div className="hidden flex-col gap-5 pb-10 lg:flex">
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-5">
          <div className="flex flex-col gap-2.5">
            <p suppressHydrationWarning className="text-[0.6875rem] tracking-[0.26em] text-accent-ink">
              {today.format(new Date()).toUpperCase()}
            </p>
            <h1 className="font-display text-[2.25rem] leading-none">Bonjour {firstName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSwitch current={data.period.key} currentLabel={data.period.label} />
            <Link
              href="/admin/commandes"
              className="flex h-11 items-center gap-2.5 rounded-full bg-surface px-4 text-[0.8125rem] text-muted-ink ring-1 ring-inset ring-border transition-colors hover:text-ink"
            >
              <Search className="size-4 text-accent-ink" strokeWidth={1.8} aria-hidden="true" />
              Rechercher une commande
            </Link>
            <Link href="/admin/produits/nouveau" className="flex h-11 items-center gap-2 rounded-full bg-deep pl-4 pr-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90">
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              Nouveau produit
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <RevenueHero data={data} />
          <NextAction queue={data.queue} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] items-start gap-5">
          <div className="flex min-w-0 flex-col gap-5">
            <SizeWall wall={data.wall} />
            <OrderHeatmap heatmap={data.heatmap} />
          </div>
          <DayJournal events={data.journal} className="self-stretch" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <BrandSales brands={data.brands} periodLabel={data.period.label} />
          <ZoneStats zones={data.zones} periodLabel={data.period.label} />
        </div>
      </div>

      {/* ═══════════════════ Mobile (structure MAT) ═══════════════════ */}
      <AmountsProvider>
        <div className="-mx-4 -mt-6 flex flex-col lg:hidden">
          <WalletHeader data={data} firstName={firstName} />
          <div className="flex flex-col gap-7 px-4 pb-10 pt-7">
            <section aria-label="À faire" className="flex flex-col gap-3">
              <h2 className="px-1 font-display text-[1.375rem]">À faire</h2>
              <NextAction queue={data.queue} variant="mobile" />
            </section>
            <SizeWallMobile wall={data.wall} lowThreshold={LOW_STOCK_THRESHOLD} />
            <WeekBars week={data.week} />
            <ActivityList orders={data.recent} />
            <LowStockBanner low={data.low} />
          </div>
        </div>
      </AmountsProvider>
    </>
  );
}
