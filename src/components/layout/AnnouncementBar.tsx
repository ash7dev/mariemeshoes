// src/components/layout/AnnouncementBar.tsx
import Link from 'next/link';

const MESSAGES = ['Livraison partout au Sénégal', 'Paiement Wave ou à la livraison', 'Paires 100 % neuves'];

/** Promotion annoncée en tête du bandeau (la plus forte en cours), ou null. */
export type Announcement = { text: string; href: string } | null;

/**
 * Bandeau aubergine au-dessus du header (ordinateur uniquement). Pendant une promotion,
 * elle passe en premier, en rose, avec un lien vers ses paires.
 */
export default function AnnouncementBar({ announcement }: { announcement: Announcement }) {
  return (
    <div className="hidden h-10 items-center justify-center gap-[22px] bg-deep text-[0.71875rem] font-medium uppercase tracking-[0.18em] text-cream lg:flex">
      {announcement && (
        <Link href={announcement.href} className="flex items-center gap-2 font-bold text-accent-soft underline-offset-4 hover:underline">
          {announcement.text}
          <span aria-hidden="true">→</span>
        </Link>
      )}
      {MESSAGES.map((message, index) => (
        <span key={message} className="flex items-center gap-[22px]">
          {(index > 0 || announcement) && <span aria-hidden="true" className="size-[5px] rounded-full bg-accent" />}
          {message}
        </span>
      ))}
    </div>
  );
}
