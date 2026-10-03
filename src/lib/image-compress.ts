'use client';

/**
 * Compression côté navigateur, AVANT l'envoi : une photo de téléphone de 6 Mo
 * devient un WebP d'environ 200–400 Ko en 2000 px, soit un envoi rapide même en
 * 4G, et une boutique qui charge vite. L'orientation EXIF est appliquée
 * (photos prises en portrait).
 */

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  /** Extension du fichier envoyé : WebP si le navigateur sait l'encoder, sinon JPEG. */
  ext: 'webp' | 'jpg';
  /** La photo a été recadrée sur la paire (false : déjà bien cadrée, ou recadrage désactivé). */
  trimmed: boolean;
};

const MAX_EDGE = 2000;
const QUALITIES = [0.86, 0.78, 0.7];

/**
 * Point blanc de la correction de niveaux : tout ce qui est au-dessus devient blanc pur.
 * Le fond gris très clair des photos (#EFEFEF ≈ 239) passe à #FFFFFF : la photo se
 * confond avec les cadres blancs de la boutique (cartes, arche, disque, visionneuse).
 */
const WHITE_POINT = 238;

/** Correction de niveaux : étire [0, WHITE_POINT] sur [0, 255] (le fond gris clair devient blanc). */
function whitenBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round((v * 255) / WHITE_POINT);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
  context.putImageData(image, 0, 0);
}

/** Recadrage : marge blanche autour de la paire (part du plus grand côté) et format de sortie. */
const TRIM_MARGIN = 0.08;
const TRIM_RATIO = 4 / 3;
/** Un pixel est « de la paire » s'il est assez opaque et pas quasi blanc. */
const TRIM_WHITE = 240;
const TRIM_ALPHA = 16;

/**
 * Cadre de la paire : première et dernière ligne / colonne contenant assez de pixels
 * non blancs (quelques pixels isolés, poussière ou bruit JPEG, ne comptent pas).
 */
function findSubject(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height);
  const cols = new Uint32Array(width);
  const rows = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > TRIM_ALPHA && Math.min(data[i], data[i + 1], data[i + 2]) < TRIM_WHITE) {
        cols[x]++;
        rows[y]++;
      }
    }
  }
  const colHits = Math.max(2, Math.round(height * 0.004));
  const rowHits = Math.max(2, Math.round(width * 0.004));
  const left = cols.findIndex((n) => n >= colHits);
  const top = rows.findIndex((n) => n >= rowHits);
  if (left < 0 || top < 0) return null;
  const right = width - 1 - [...cols].reverse().findIndex((n) => n >= colHits);
  const bottom = height - 1 - [...rows].reverse().findIndex((n) => n >= rowHits);
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/**
 * Recadre sur la paire : marge régulière, format 4:3, fond blanc. Toutes les paires
 * ont ainsi la même taille dans les cartes, quelle que soit la prise de vue.
 * Renvoie le canvas d'origine si la photo est déjà bien cadrée.
 */
function trimToSubject(source: HTMLCanvasElement, context: CanvasRenderingContext2D): HTMLCanvasElement {
  const subject = findSubject(context, source.width, source.height);
  if (!subject) return source;
  const margin = Math.round(Math.max(subject.w, subject.h) * TRIM_MARGIN);
  let w = subject.w + margin * 2;
  let h = subject.h + margin * 2;
  if (w / h < TRIM_RATIO) w = h * TRIM_RATIO;
  else h = w / TRIM_RATIO;
  if (w >= source.width * 0.95 && h >= source.height * 0.95) return source;

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = 'high';
  const dw = subject.w * scale;
  const dh = subject.h * scale;
  ctx.drawImage(source, subject.x, subject.y, subject.w, subject.h, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  return out;
}

export type CompressOptions = {
  /** Ramène le fond gris clair au blanc pur (photos de sneakers). */
  whiten?: boolean;
  /** Recadre sur la paire avec une marge régulière (photos sur fond blanc). */
  trim?: boolean;
};

export async function compressImage(file: File, maxBytes: number, options: CompressOptions = {}): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error('Image illisible : utilisez une photo JPEG, PNG ou WebP.');
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Votre navigateur ne permet pas de préparer l’image.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (options.whiten) whitenBackground(context, width, height);
  const final = options.trim ? trimToSubject(canvas, context) : canvas;
  const finalContext = final === canvas ? context : final.getContext('2d')!;

  // Safari (iPhone, iPad, Mac) sait afficher le WebP mais pas l'encoder : toBlob
  // renvoie alors du PNG. Dans ce cas, on passe au JPEG, encodé partout.
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => final.toBlob(resolve, type, quality));
  const probe = await encode('image/webp', QUALITIES[0]);
  const webp = probe?.type === 'image/webp';
  const type = webp ? 'image/webp' : 'image/jpeg';
  const ext = webp ? 'webp' : 'jpg';
  // Le JPEG n'a pas de transparence : un PNG détouré aurait un fond noir.
  // On glisse un fond blanc DERRIÈRE l'image (le WebP, lui, garde la transparence).
  if (!webp) {
    finalContext.globalCompositeOperation = 'destination-over';
    finalContext.fillStyle = '#FFFFFF';
    finalContext.fillRect(0, 0, final.width, final.height);
    finalContext.globalCompositeOperation = 'source-over';
  }

  for (const [i, quality] of QUALITIES.entries()) {
    const blob = i === 0 && webp ? probe : await encode(type, quality);
    if (!blob || blob.type !== type) break;
    if (blob.size <= maxBytes) return { blob, width: final.width, height: final.height, ext, trimmed: final !== canvas };
  }
  throw new Error('Image trop lourde, même compressée.');
}

/**
 * Raison d'un refus du stockage, en clair. Supabase répond
 * { statusCode, error, message } : on traduit les cas connus et on garde
 * toujours le code et le message d'origine pour le diagnostic.
 */
function uploadRefusal(status: number, body: string): string {
  let detail = '';
  try {
    const json = JSON.parse(body) as { message?: string; error?: string };
    detail = json.message || json.error || '';
  } catch {
    detail = body.slice(0, 160);
  }
  const d = detail.toLowerCase();
  const why =
    d.includes('mime') || d.includes('content type')
      ? 'format refusé par le stockage'
      : d.includes('size') || d.includes('too large') || status === 413
        ? 'photo trop lourde pour le stockage'
        : d.includes('row-level security') || d.includes('unauthorized') || status === 403
          ? 'permission refusée par le stockage (droits admin)'
          : d.includes('exp') || d.includes('jwt') || d.includes('signature')
            ? 'autorisation d’envoi expirée, réessayez'
            : d.includes('exists') || d.includes('duplicate') || status === 409
              ? 'une photo porte déjà ce nom, réessayez'
              : d.includes('bucket') || status === 404
                ? 'espace de stockage introuvable'
                : 'refus du stockage';
  return `Envoi refusé (${status}) : ${why}${detail ? ` — « ${detail} »` : ''}`;
}

/**
 * Envoi vers une URL signée Supabase Storage, avec progression.
 * (fetch ne sait pas suivre la progression d'un envoi : XMLHttpRequest, si.)
 */
export function uploadToSignedUrl(
  signedUrl: string,
  blob: Blob,
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('content-type', blob.type);
    // Chemin unique (uuid) : le fichier ne change jamais, cache d'un an.
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      console.error('Envoi refusé par le stockage', xhr.status, xhr.responseText);
      reject(new Error(uploadRefusal(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi.'));
    xhr.onabort = () => reject(new DOMException('Envoi annulé', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(blob);
  });
}
