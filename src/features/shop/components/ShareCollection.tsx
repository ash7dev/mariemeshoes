'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Partage d'une collection : WhatsApp (message prêt) et copie du lien. */
export default function ShareCollection({ name, url, className }: { name: string; url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${name} chez Mariemeshoes : ${url}`)}`;

  return (
    <div className={cn('flex gap-2.5', className)}>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full border border-[#6B3A52] px-5 text-sm font-semibold transition-colors hover:border-cream lg:h-[58px] lg:flex-none"
      >
        <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        Partager sur WhatsApp
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            window.prompt('Copie le lien de la collection :', url);
          }
        }}
        aria-label={copied ? 'Lien copié' : 'Copier le lien de la collection'}
        className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#6B3A52] px-4 text-sm font-semibold transition-colors hover:border-cream lg:h-[58px] lg:px-5"
      >
        {copied ? <Check className="size-[18px] text-accent-soft" strokeWidth={2.2} aria-hidden="true" /> : <Link2 className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />}
        <span className={cn(!copied && 'hidden lg:inline')} aria-live="polite">
          {copied ? 'Lien copié' : 'Copier le lien'}
        </span>
      </button>
    </div>
  );
}
