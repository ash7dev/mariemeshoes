import Link from 'next/link';
import { SearchX } from 'lucide-react';

/** Paire introuvable : lien cassé, coloris retiré ou pas encore publié. */
export default function ProductNotFound() {
  return (
    <section className="mx-4 mt-6 flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-16 text-center lg:mx-auto lg:mt-10 lg:max-w-2xl">
      <span className="grid size-16 place-items-center rounded-full bg-surface text-accent-ink">
        <SearchX className="size-7" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h1 className="font-display text-[1.75rem] leading-tight lg:text-[2.25rem]">Cette paire n’est plus en ligne</h1>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-ink">Elle a peut-être été vendue ou retirée. Les autres paires t’attendent dans la boutique.</p>
      <Link href="/boutique" className="mt-2 flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
        Voir la boutique
      </Link>
    </section>
  );
}
