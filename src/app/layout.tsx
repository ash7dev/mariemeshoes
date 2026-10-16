import type { Metadata, Viewport } from 'next';
import { marcellus, schibsted } from '@/config/fonts';
import { siteConfig } from '@/config/site';
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: { locale: siteConfig.locale, siteName: siteConfig.name },
  // iPhone : « Sur l'écran d'accueil » ouvre le site en plein écran, comme une application.
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: 'default' },
  applicationName: siteConfig.name,
};

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  // Barre fixe et dock mobiles : le contenu s'étend sous l'encoche (safe-area-inset).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${marcellus.variable} ${schibsted.variable} h-full antialiased`}>
      {/* suppressHydrationWarning : les extensions (Grammarly…) ajoutent des attributs au <body> avant React. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
