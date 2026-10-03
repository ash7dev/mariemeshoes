// src/components/layout/StorefrontShell.tsx
import { SizeProvider } from '@/features/size/SizeProvider';
import SizePicker from '@/features/size/SizePicker';
import AnnouncementBar, { type Announcement } from './AnnouncementBar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import Header from './Header';
import type { BrandLink, CollectionLink } from './nav-config';

type StorefrontShellProps = {
  children: React.ReactNode;
  brands: BrandLink[];
  collections: CollectionLink[];
  announcement: Announcement;
};

/** Habillage commun des pages boutique : bandeau, header, footer, dock mobile, sélecteur de pointure. */
export default function StorefrontShell({ children, brands, collections, announcement }: StorefrontShellProps) {
  return (
    <SizeProvider>
      <AnnouncementBar announcement={announcement} />
      <Header brands={brands} collections={collections} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
      <SizePicker />
    </SizeProvider>
  );
}
