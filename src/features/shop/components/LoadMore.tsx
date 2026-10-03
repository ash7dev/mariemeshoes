import Link from 'next/link';
import { shopHref, type ShopParams } from '../params';

/** « Voir plus » : la page suivante ajoute des modèles sous ceux déjà vus (lien partageable). */
export default function LoadMore({ params, shown, total, hasMore }: { params: ShopParams; shown: number; total: number; hasMore: boolean }) {
  if (total === 0) return null;
  const progress = Math.min(100, Math.round((shown / total) * 100));

  return (
    <section aria-label="Pagination" className="flex flex-col items-center gap-4 pb-6 pt-14 lg:pt-[72px]">
      <p className="text-sm text-muted-ink">
        Tu as vu {shown} modèle{shown > 1 ? 's' : ''} sur {total}
      </p>
      <span aria-hidden="true" className="relative block h-1 w-[260px] overflow-hidden rounded-full bg-border">
        <span className="absolute inset-y-0 left-0 rounded-full bg-deep" style={{ width: `${progress}%` }} />
      </span>
      {hasMore && (
        <Link
          href={shopHref(params, { page: params.page + 1 })}
          scroll={false}
          className="mt-2 flex h-[54px] w-full items-center justify-center rounded-full border-[1.5px] border-ink px-[34px] text-[0.9375rem] font-semibold transition-colors hover:bg-ink hover:text-cream lg:w-auto"
        >
          Voir plus de paires
        </Link>
      )}
    </section>
  );
}
