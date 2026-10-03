import type { Metadata } from 'next';
import { marcellus, schibsted } from '@/config/fonts';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: { locale: siteConfig.locale, siteName: siteConfig.name },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${marcellus.variable} ${schibsted.variable} h-full antialiased`}>
      {/* suppressHydrationWarning : les extensions (Grammarly…) ajoutent des attributs au <body> avant React. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
