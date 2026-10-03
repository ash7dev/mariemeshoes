'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ImageOff, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setGalleryPublishedAction } from '../actions';
import type { AdminGalleryPost } from '../queries';

/** Photos de la galerie en colonnes (format d'origine), avec publication rapide. */
export default function GalleryAdminGrid({ posts }: { posts: AdminGalleryPost[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (post: AdminGalleryPost) =>
    startTransition(async () => {
      const result = await setGalleryPublishedAction(post.id, !post.isPublished);
      setError(result.ok ? null : result.error);
      if (result.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-2xl bg-[#FBE3EE] px-5 py-3 text-sm text-accent-ink">
          {error}
        </p>
      )}
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {posts.map((post) => (
          <li key={post.id} className="mb-3 break-inside-avoid overflow-hidden rounded-[22px] border border-border bg-surface sm:mb-4">
            <Link href={`/admin/galerie/${post.id}`} className="relative block bg-card">
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- grille admin, format d'origine
                <img
                  src={post.imageUrl}
                  alt=""
                  loading="lazy"
                  width={post.width ?? undefined}
                  height={post.height ?? undefined}
                  className={cn('h-auto w-full', !post.isPublished && 'opacity-60')}
                />
              ) : (
                <span className="grid aspect-[4/5] place-items-center text-muted-ink">
                  <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
                </span>
              )}
              <span
                className={cn(
                  'absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
                  post.isPublished ? (post.pairHidden ? 'bg-[#FBE3EE] text-accent-ink' : 'bg-deep text-cream') : 'bg-surface text-muted-ink',
                )}
              >
                {post.isPublished ? (post.pairHidden ? 'Paire hors ligne' : 'En ligne') : 'Brouillon'}
              </span>
            </Link>
            <div className="flex flex-col gap-2 p-3">
              <p className="line-clamp-2 text-[0.8125rem] font-medium leading-snug">{post.pairLabel}</p>
              {post.caption && <p className="line-clamp-2 text-xs text-muted-ink">{post.caption}</p>}
              <div className="flex gap-1.5">
                <Link
                  href={`/admin/galerie/${post.id}`}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-card text-xs font-semibold hover:bg-border"
                >
                  <Pencil className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(post)}
                  disabled={pending}
                  aria-label={post.isPublished ? 'Retirer de la galerie' : 'Mettre en ligne'}
                  title={post.isPublished ? 'Retirer de la galerie' : 'Mettre en ligne'}
                  className="grid size-9 place-items-center rounded-full bg-card hover:bg-border disabled:opacity-60"
                >
                  {post.isPublished ? <EyeOff className="size-4" strokeWidth={1.8} aria-hidden="true" /> : <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
