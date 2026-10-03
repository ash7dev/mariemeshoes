'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, ImagePlus, LoaderCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { compressImage, uploadToSignedUrl } from '@/lib/image-compress';
import { ACCEPTED_IMAGE_TYPES, MAX_SOURCE_IMAGE_BYTES, MAX_UPLOAD_BYTES } from '@/lib/supabase/storage';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { Field, Section, Toggle, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { HiddenBadge, PairThumb } from '@/features/collections/components/PairPicker';
import type { CollectionPair } from '@/features/collections/queries';
import { createGalleryUploadAction, deleteGalleryPostAction, discardGalleryImageAction, saveGalleryPostAction } from '../actions';
import type { GalleryPostForEdit } from '../queries';
import { GALLERY_CAPTION_MAX, galleryInputSchema, type GalleryInput } from '../schemas';

type Photo = { path: string; previewUrl: string; width?: number; height?: number };

/**
 * Formulaire minimal d'une photo de galerie : la photo, la paire portée,
 * une légende facultative et la publication.
 */
export default function GalleryForm({ post, options }: { post?: GalleryPostForEdit; options: CollectionPair[] }) {
  const router = useRouter();
  const editing = Boolean(post);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Photo | null>(
    post && post.imageUrl ? { path: post.imagePath, previewUrl: post.imageUrl, width: post.width ?? undefined, height: post.height ?? undefined } : null,
  );
  const [upload, setUpload] = useState<{ state: 'idle' | 'preparing' | 'uploading'; progress: number; error?: string }>({ state: 'idle', progress: 0 });
  const [colorwayId, setColorwayId] = useState(post?.colorwayId ?? '');
  const [caption, setCaption] = useState(post?.caption ?? '');
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? true);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(options.map((o) => [o.colorwayId, o]));
  const chosen = colorwayId ? byId.get(colorwayId) : undefined;
  const q = query.trim().toLowerCase();
  const results = (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options).slice(0, 40);
  const busy = upload.state !== 'idle';

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setUpload({ state: 'idle', progress: 0, error: 'Photo JPEG, PNG ou WebP uniquement.' });
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setUpload({ state: 'idle', progress: 0, error: 'Photo trop lourde (25 Mo au maximum).' });
      return;
    }
    const previous = photo;
    try {
      setUpload({ state: 'preparing', progress: 0 });
      // Photo d'ambiance : ni blanchie ni recadrée, juste allégée.
      const compressed = await compressImage(file, MAX_UPLOAD_BYTES);
      const ticket = await createGalleryUploadAction(compressed.ext);
      if (!ticket.ok) throw new Error(ticket.error);
      setUpload({ state: 'uploading', progress: 0 });
      await uploadToSignedUrl(ticket.signedUrl, compressed.blob, (progress) => setUpload({ state: 'uploading', progress }));
      setPhoto({ path: ticket.path, previewUrl: URL.createObjectURL(compressed.blob), width: compressed.width, height: compressed.height });
      setUpload({ state: 'idle', progress: 1 });
      setErrors((e) => ({ ...e, imagePath: '' }));
      // L'ancienne photo, envoyée mais jamais enregistrée, ne reste pas dans le stockage.
      if (previous && previous.path !== post?.imagePath) void discardGalleryImageAction(previous.path);
    } catch (error) {
      setUpload({ state: 'idle', progress: 0, error: error instanceof Error ? error.message : 'Envoi impossible.' });
    }
  }

  function submit() {
    const input: GalleryInput = { imagePath: photo?.path ?? '', width: photo?.width, height: photo?.height, colorwayId, caption, isPublished };
    const parsed = galleryInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError('Certains champs sont à corriger.');
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await saveGalleryPostAction(input, post?.id);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      router.push(`/admin/galerie?ok=${editing ? 'modifiee' : 'ajoutee'}`);
    });
  }

  function remove() {
    if (!post || !window.confirm('Supprimer cette photo de la galerie ? La paire reste dans le catalogue.')) return;
    startTransition(async () => {
      const result = await deleteGalleryPostAction(post.id);
      if (!result.ok) setFormError(result.error);
      else router.push('/admin/galerie?ok=supprimee');
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-6 pb-32"
    >
      <div className="flex flex-col gap-4">
        <Link href="/admin/galerie" className="flex h-10 items-center gap-2 self-start text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Galerie
        </Link>
        <h1 className="font-display text-[2rem] leading-tight lg:text-[2.5rem]">{editing ? 'Modifier la photo' : 'Nouvelle photo'}</h1>
      </div>

      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#FBE3EE] px-5 py-4 text-sm leading-snug text-accent-ink">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* La photo */}
        <Section id="photo" title="La photo" description="Une photo portée, telle quelle : elle garde son format.">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            id="gallery-file"
            onChange={(event) => {
              void pickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {photo ? (
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-2xl bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou Supabase */}
                <img src={photo.previewUrl} alt="" className={cn('max-h-[28rem] w-full object-contain', busy && 'opacity-50')} />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex h-11 items-center gap-2 self-start rounded-full border border-border bg-surface px-4 text-sm font-semibold hover:border-ink disabled:opacity-60"
              >
                <RefreshCw className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Changer la photo
              </button>
            </div>
          ) : (
            <label
              htmlFor="gallery-file"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void pickFile(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-page px-6 text-center transition-colors hover:border-accent',
                errors.imagePath ? 'border-accent-ink' : 'border-border',
              )}
            >
              <span className="grid size-14 place-items-center rounded-full bg-section text-accent-ink">
                <ImagePlus className="size-6" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">Choisir une photo</span>
              <span className="text-xs text-muted-ink">ou la glisser ici · JPEG, PNG, WebP</span>
            </label>
          )}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-ink" role="status">
              <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
              {upload.state === 'preparing' ? 'Préparation…' : `Envoi ${Math.round(upload.progress * 100)} %`}
            </p>
          )}
          {(upload.error || errors.imagePath) && <p className="text-sm text-accent-ink">{upload.error || errors.imagePath}</p>}
        </Section>

        <div className="flex flex-col gap-6">
          {/* La paire */}
          <Section id="pair" title="La paire portée" description="Le client pourra aller directement à cette paire.">
            {chosen && (
              <div className="flex items-center gap-3 rounded-2xl bg-section/60 p-2.5 pr-4">
                <PairThumb pair={chosen} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{chosen.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-ink">
                    {formatFCFA(chosen.price)}
                    <HiddenBadge reason={chosen.hiddenReason} />
                  </span>
                </span>
                <Check className="size-5 shrink-0 text-accent-ink" strokeWidth={2.2} aria-hidden="true" />
              </div>
            )}
            <div className={cn('overflow-hidden rounded-2xl border bg-page', errors.colorwayId ? 'border-accent-ink' : 'border-border')}>
              <div className="relative border-b border-border">
                <label htmlFor="pair-search" className="sr-only">
                  Rechercher une paire
                </label>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-ink" strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="pair-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Marque, modèle, coloris…"
                  className="h-12 w-full bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <ul role="listbox" aria-label="Paires" className="max-h-72 overflow-y-auto p-1.5">
                {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-ink">Aucune paire ne correspond.</li>}
                {results.map((pair) => {
                  const on = pair.colorwayId === colorwayId;
                  return (
                    <li key={pair.colorwayId} role="option" aria-selected={on}>
                      <button
                        type="button"
                        onClick={() => {
                          setColorwayId(pair.colorwayId);
                          setErrors((e) => ({ ...e, colorwayId: '' }));
                        }}
                        className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors', on ? 'bg-section/60' : 'hover:bg-card')}
                      >
                        <PairThumb pair={pair} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{pair.label}</span>
                        <HiddenBadge reason={pair.hiddenReason} />
                        {on && <Check className="size-4 shrink-0 text-accent-ink" strokeWidth={2.4} aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {errors.colorwayId && <p className="text-sm text-accent-ink">{errors.colorwayId}</p>}
          </Section>

          {/* Légende et publication */}
          <Section id="publish" title="Publication">
            <Field id="caption" label="Légende (facultatif)" error={errors.caption} hint="Une phrase courte. Ex. : La Samba OG pour un mariage à Dakar.">
              <textarea
                id="caption"
                rows={2}
                value={caption}
                maxLength={GALLERY_CAPTION_MAX}
                onChange={(event) => setCaption(event.target.value)}
                className={cn(inputClass, inputState(errors.caption), 'py-3')}
              />
            </Field>
            <Toggle checked={isPublished} onChange={setIsPublished} label="En ligne" description="Désactivé : la photo reste en brouillon, visible ici seulement." />
          </Section>

          {editing && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="flex h-12 items-center justify-center gap-2 self-start rounded-full border border-[#F2C6DA] bg-[#FDF3F7] px-5 text-sm font-semibold text-accent-ink hover:bg-[#FBE3EE] disabled:opacity-60"
            >
              <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
              Supprimer la photo
            </button>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2.5">
          <Link href="/admin/galerie" className="flex h-12 items-center rounded-full border border-border px-5 text-sm font-semibold hover:border-ink">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={pending || busy}
            className="flex h-12 items-center gap-2 rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {editing ? 'Enregistrer' : 'Ajouter à la galerie'}
          </button>
        </div>
      </div>
    </form>
  );
}
