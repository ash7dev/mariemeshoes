import type { Metadata } from 'next';

/** L'admin s'installe comme sa propre application (icône « ADMIN »), distincte de la boutique. */
export const metadata: Metadata = {
  manifest: '/manifest-admin.webmanifest',
  appleWebApp: { capable: true, title: 'MS Admin', statusBarStyle: 'default' },
  icons: { apple: '/icons/admin-apple-180.png' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
