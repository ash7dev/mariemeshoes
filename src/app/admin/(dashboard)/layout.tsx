import { after } from 'next/server';
import { requireAdmin } from '@/features/auth/require-admin';
import { expireStaleOrders } from '@/features/orders/expiry';
import { ROLE_LABEL } from '@/features/auth/roles';
import { getAdminCounts } from '@/features/admin/queries';
import type { AdminBadges } from '@/features/admin/navigation';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminBottomNav from '@/components/layout/AdminBottomNav';

/** Habillage de l'espace admin (hors /admin/login) : header capsule + barre du bas mobile. */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // En parallèle : la vérification admin ne retarde pas la lecture des compteurs
  // (rien n'est affiché si elle échoue : redirection vers la connexion).
  const [admin, counts] = await Promise.all([requireAdmin(), getAdminCounts()]);

  const badges: AdminBadges = {
    orders: {
      count: counts.ordersToConfirm,
      tone: 'count',
      label: `${counts.ordersToConfirm} à confirmer`,
    },
    products: {
      count: counts.lowStock,
      tone: 'alert',
      label: `${counts.lowStock} pointure${counts.lowStock > 1 ? 's' : ''} en stock bas`,
    },
  };
  const identity = { fullName: admin.fullName, email: admin.email, roleLabel: ROLE_LABEL[admin.role] };
  // Réservations expirées : annulées (et paires remises en stock) au fil des visites de l'admin.
  after(() => expireStaleOrders());

  return (
    <div className="min-h-dvh bg-page">
      <AdminHeader badges={badges} admin={identity} />
      <main className="mx-auto max-w-[90rem] px-4 pt-6 lg:px-16 lg:pt-11">{children}</main>
      <AdminBottomNav badges={badges} admin={identity} />
    </div>
  );
}
