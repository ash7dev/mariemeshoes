'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Crop, ImagePlus, LoaderCircle, RotateCcw, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage, uploadToSignedUrl } from '@/lib/image-compress';
import { ACCEPTED_IMAGE_TYPES, MAX_COLORWAY_IMAGES, MAX_SOURCE_IMAGE_BYTES, MAX_UPLOAD_BYTES } from '@/lib/supabase/storage';
import { createColorwayImageUploadAction, discardColorwayImageAction } from '../actions';

export type ImageItem = {
  key: string;
  status: 'preparing' | 'uploading' | 'done' | 'error';
  progress: number;
  previewUrl: string;
  alt: string;
  path?: string;
  width?: number;
  height?: number;
  /** Recadrée sur la paire à l'envoi (affiché sur l'aperçu). */
  trimmed?: boolean;
  error?: string;
  /** Fichier d'origine, conservé pour « Réessayer ». */
  file?: File;
  /** Photo déjà enregistrée (modification) : retirée du stockage seulement après l'enregistrement. */
  persisted?: boolean;
};

type ImageManagerProps = {
  /** Préfixe unique (un gestionnaire par coloris sur la même page). */
  idPrefix: string;
  images: ImageItem[];
  onChange: (update: (images: ImageItem[]) => ImageItem[]) => void;
  error?: string;
  /** « Air Force 1 Triple White » : exemple de description. */
  pairName: string;
};

const MAX_PARALLEL_UPLOADS = 3;

/**
 * Photos d'un coloris : glisser-déposer ou sélection multiple, compression WebP dans
 * le navigateur (fond gris clair ramené au blanc), envoi direct vers Supabase avec
 * progression, réessai, suppression, réorganisation (glisser ou flèches), photo
 * principale, description. L'aperçu reproduit le rendu boutique (fond sable + multiply).
 */
export default function ImageManager({ idPrefix, images, onChange, error, pairName }: ImageManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [whiten, setWhiten] = useState(true);
  const [trim, setTrim] = useState(true);
  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(0);
  const queue = useRef<ImageItem[]>([]);
  const imagesRef = useRef(images);
  const whitenRef = useRef(whiten);
  const trimRef = useRef(trim);

  useEffect(() => {
    imagesRef.current = images;
    whitenRef.current = whiten;
    trimRef.current = trim;
  });

  const update = (key: string, patch: Partial<ImageItem>) =>
    onChange((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  // Libère les aperçus en mémoire et annule les envois en quittant la page.
  useEffect(() => {
    const active = controllers.current;
    return () => {
      for (const item of imagesRef.current) if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
      for (const controller of active.values()) controller.abort();
    };
  }, []);

  async function processItem(item: ImageItem) {
    const controller = new AbortController();
    controllers.current.set(item.key, controller);
    try {
      update(item.key, { status: 'preparing', progress: 0, error: undefined });
      const compressed = await compressImage(item.file!, MAX_UPLOAD_BYTES, { whiten: whitenRef.current, trim: trimRef.current });

      // Aperçu = image réellement envoyée (fond blanchi), pas le fichier d'origine.
      const previewUrl = URL.createObjectURL(compressed.blob);
      URL.revokeObjectURL(item.previewUrl);

      const ticket = await createColorwayImageUploadAction(compressed.ext);
      if (!ticket.ok) throw new Error(ticket.error);

      update(item.key, { status: 'uploading', previewUrl, width: compressed.width, height: compressed.height, trimmed: compressed.trimmed });
      await uploadToSignedUrl(ticket.signedUrl, compressed.blob, (ratio) => update(item.key, { progress: ratio }), controller.signal);
      update(item.key, { status: 'done', progress: 1, path: ticket.path });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      update(item.key, { status: 'error', error: cause instanceof Error ? cause.message : 'Envoi impossible.' });
    } finally {
      controllers.current.delete(item.key);
    }
  }

  // File d'attente : 3 envois en parallèle, pour ne pas saturer une connexion mobile.
  function pump() {
    while (running.current < MAX_PARALLEL_UPLOADS && queue.current.length > 0) {
      const next = queue.current.shift()!;
      running.current++;
      processItem(next).finally(() => {
        running.current--;
        pump();
      });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const room = MAX_COLORWAY_IMAGES - imagesRef.current.length;
    const rejected: string[] = [];
    const accepted: ImageItem[] = [];

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        rejected.push(`${file.name} : format non pris en charge (JPEG, PNG ou WebP).`);
      } else if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        rejected.push(`${file.name} : fichier trop lourd (25 Mo maximum).`);
      } else if (accepted.length >= room) {
        rejected.push(`${file.name} : ${MAX_COLORWAY_IMAGES} photos au maximum par coloris.`);
      } else {
        accepted.push({ key: crypto.randomUUID(), status: 'preparing', progress: 0, previewUrl: URL.createObjectURL(file), alt: '', file });
      }
    }

    setNotice(rejected.length ? rejected.join(' ') : null);
    if (accepted.length === 0) return;
    onChange((list) => [...list, ...accepted]);
    queue.current.push(...accepted);
    pump();
  }

  function retry(item: ImageItem) {
    if (!item.file) return;
    queue.current.push(item);
    update(item.key, { status: 'preparing', progress: 0, error: undefined });
    pump();
  }

  function remove(item: ImageItem) {
    controllers.current.get(item.key)?.abort();
    queue.current = queue.current.filter((queued) => queued.key !== item.key);
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    onChange((list) => list.filter((entry) => entry.key !== item.key));
    // Envoyée pendant cette session mais plus utilisée : supprimée tout de suite du stockage.
    if (item.path && !item.persisted) void discardColorwayImageAction(item.path);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= imagesRef.current.length || from === to) return;
    onChange((list) => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const inputId = `${idPrefix}-images`;
  const busy = images.filter((image) => image.status === 'preparing' || image.status === 'uploading').length;
  const full = images.length >= MAX_COLORWAY_IMAGES;

  return (
    <div className="flex flex-col gap-4">
      {!full && (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            if (!event.dataTransfer.files.length) return;
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 text-center transition-colors duration-150',
            images.length ? 'py-6' : 'py-10',
            dragOver ? 'border-accent bg-section/50' : error ? 'border-accent-ink/60 bg-[#FBE3EE]/50' : 'border-border bg-page hover:border-accent',
          )}
        >
          <span className="grid size-14 place-items-center rounded-full bg-deep text-cream transition-transform duration-200 group-hover:scale-105">
            <ImagePlus className="size-6" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[0.9375rem] font-medium">
              <span className="hidden sm:inline">Glisse tes photos ici ou </span>
              <span className="text-accent-ink underline decoration-accent/40 underline-offset-4">choisis des fichiers</span>
            </span>
            <span className="text-[0.8125rem] text-muted-ink">
              Format carré · chaussure entière et centrée · pointe vers la gauche · profil en premier
            </span>
          </span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            className="sr-only"
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      )}

      <label className="flex items-center gap-2.5 self-start text-sm">
        <input type="checkbox" checked={whiten} onChange={(event) => setWhiten(event.target.checked)} className="size-4 accent-[#E6007E]" />
        Blanchir le fond (gris clair → blanc pur) pour les prochaines photos
      </label>
      <label className="flex items-center gap-2.5 self-start text-sm">
        <input type="checkbox" checked={trim} onChange={(event) => setTrim(event.target.checked)} className="size-4 accent-[#E6007E]" />
        Recadrer sur la paire (même taille dans toutes les cartes)
      </label>

      {error && (
        <p id={`${inputId}-error`} className="text-sm text-accent-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-section px-4 py-3 text-sm text-section-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {notice}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {busy > 0 ? `${busy} photo${busy > 1 ? 's' : ''} en cours d’envoi` : ''}
      </p>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.key}
              draggable={image.status === 'done'}
              onDragStart={(event) => {
                setDraggedKey(image.key);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => draggedKey && event.preventDefault()}
              onDrop={(event) => {
                if (!draggedKey) return;
                event.preventDefault();
                move(images.findIndex((i) => i.key === draggedKey), index);
                setDraggedKey(null);
              }}
              onDragEnd={() => setDraggedKey(null)}
              className={cn(
                'flex flex-col gap-2 rounded-[22px] border bg-page p-2 transition-[opacity,border-color] duration-150',
                index === 0 ? 'border-accent' : 'border-border',
                draggedKey === image.key && 'opacity-40',
              )}
            >
              {/* Aperçu dans les conditions de la boutique : photo telle quelle sur blanc. */}
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou Supabase */}
                <img
                  src={image.previewUrl}
                  alt=""
                  className={cn('size-full object-contain', image.status !== 'done' && 'opacity-60')}
                />

                {index === 0 && image.status === 'done' && (
                  <span className="absolute left-2 top-2 flex h-7 items-center gap-1 rounded-full bg-deep px-2.5 text-[0.6875rem] font-medium text-cream">
                    <Star className="size-3 fill-current" aria-hidden="true" />
                    Principale
                  </span>
                )}

                {image.trimmed && image.status === 'done' && (
                  <span className="absolute bottom-2 right-2 flex h-6 items-center gap-1 rounded-full bg-[#E7F1EA] px-2 text-[0.6875rem] font-semibold text-[#1F6B3A]">
                    <Crop className="size-3" strokeWidth={2} aria-hidden="true" />
                    Recadrée
                  </span>
                )}

                {(image.status === 'preparing' || image.status === 'uploading') && (
                  <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-xl bg-surface/90 px-3 py-2 backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 text-xs">
                      <LoaderCircle className="size-3.5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
                      {image.status === 'preparing' ? 'Préparation…' : `Envoi ${Math.round(image.progress * 100)} %`}
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-border">
                      <span
                        className="block h-full origin-left rounded-full bg-accent transition-transform duration-150"
                        style={{ transform: `scaleX(${image.status === 'preparing' ? 0.04 : image.progress})` }}
                      />
                    </span>
                  </div>
                )}

                {image.status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#FBE3EE]/95 p-3 text-center">
                    <AlertCircle className="size-5 text-accent-ink" strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-xs leading-snug text-accent-ink">{image.error}</span>
                    {image.file && (
                      <button
                        type="button"
                        onClick={() => retry(image)}
                        className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-medium"
                      >
                        <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden="true" />
                        Réessayer
                      </button>
                    )}
                  </div>
                )}
              </div>

              <label htmlFor={`${idPrefix}-alt-${image.key}`} className="sr-only">
                Description de la photo {index + 1}
              </label>
              <input
                id={`${idPrefix}-alt-${image.key}`}
                value={image.alt}
                maxLength={200}
                onChange={(event) => update(image.key, { alt: event.target.value })}
                placeholder={pairName ? `Ex. ${pairName}, vue de profil` : 'Description (facultatif)'}
                className="h-10 w-full rounded-xl border border-transparent bg-card px-3 text-[0.8125rem] outline-none placeholder:text-muted focus:border-accent focus:bg-surface"
              />

              <div className="flex items-center gap-1">
                <IconButton label="Déplacer vers la gauche" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
                <IconButton label="Déplacer vers la droite" disabled={index === images.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
                {index > 0 && image.status === 'done' && (
                  <IconButton label="Choisir comme photo principale" onClick={() => move(index, 0)}>
                    <Star className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                )}
                <IconButton label="Retirer la photo" onClick={() => remove(image)} className="ml-auto text-accent-ink hover:bg-[#FBE3EE]">
                  <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-9 place-items-center rounded-xl text-muted-ink transition-colors duration-150 hover:bg-card hover:text-ink disabled:pointer-events-none disabled:opacity-30',
        className,
      )}
    >
      {children}
    </button>
  );
}
