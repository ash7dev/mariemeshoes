/**
 * Recadre UNE FOIS les photos de coloris déjà en ligne, comme le fait désormais
 * l'admin à l'envoi (src/lib/image-compress.ts) : la paire, une marge blanche de 8 %
 * de son plus grand côté, format 4:3, fond blanc, WebP.
 *
 *   node scripts/trim-product-images.mjs           → simulation : liste ce qui serait recadré
 *   node scripts/trim-product-images.mjs --apply   → recadre, envoie et met à jour la base
 *
 * Chaque photo recadrée est envoyée sous un NOUVEAU chemin (les anciennes URL sont
 * en cache un an chez les visiteurs) ; la ligne colorway_images pointe ensuite dessus.
 * Les anciens fichiers restent dans le bucket (rien n'est supprimé).
 * Lit .env.local : DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY.
 */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';

process.loadEnvFile('.env.local');

const APPLY = process.argv.includes('--apply');
const BUCKET = 'products';
const MARGIN = 0.08;
const RATIO = 4 / 3;
const MAX_EDGE = 2000;
/** Écart toléré avec le blanc pour le rognage (bruit JPEG, fond #F8F8F8…). */
const THRESHOLD = 18;

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!base || !secret || !databaseUrl) {
  console.error('Variables manquantes dans .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DIRECT_URL).');
  process.exit(1);
}

const publicUrl = (path) => `${base}/storage/v1/object/public/${BUCKET}/${path}`;

/** Photo recadrée (WebP), ou null si elle est déjà bien cadrée. */
async function trim(input) {
  const source = sharp(input).rotate().flatten({ background: '#ffffff' });
  const { width: srcW, height: srcH } = await source.metadata();
  const { data, info } = await source.clone().trim({ background: '#ffffff', threshold: THRESHOLD }).toBuffer({ resolveWithObject: true });

  const margin = Math.round(Math.max(info.width, info.height) * MARGIN);
  let w = info.width + margin * 2;
  let h = info.height + margin * 2;
  if (w / h < RATIO) w = Math.round(h * RATIO);
  else h = Math.round(w / RATIO);
  if (w >= srcW * 0.95 && h >= srcH * 0.95) return null;

  const left = Math.floor((w - info.width) / 2);
  const top = Math.floor((h - info.height) / 2);
  const { data: out, info: outInfo } = await sharp(data)
    .extend({ left, right: w - info.width - left, top, bottom: h - info.height - top, background: '#ffffff' })
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: out, width: outInfo.width, height: outInfo.height, before: `${srcW}×${srcH}`, subject: `${info.width}×${info.height}` };
}

async function upload(path, buffer) {
  const response = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, apikey: secret, 'content-type': 'image/webp', 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
    body: buffer,
  });
  if (!response.ok) throw new Error(`Envoi refusé (${response.status}) : ${await response.text()}`);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const { rows } = await client.query(`SELECT id, url FROM colorway_images WHERE url LIKE 'colorways/%' ORDER BY created_at`);
  console.log(`${rows.length} photo(s) à examiner${APPLY ? '' : ' (simulation, ajoute --apply pour appliquer)'}.`);
  let done = 0;
  for (const row of rows) {
    try {
      const response = await fetch(publicUrl(row.url));
      if (!response.ok) throw new Error(`téléchargement impossible (${response.status})`);
      const result = await trim(Buffer.from(await response.arrayBuffer()));
      if (!result) {
        console.log(`  = ${row.url} : déjà bien cadrée`);
        continue;
      }
      console.log(`  ✂ ${row.url} : ${result.before} → ${result.width}×${result.height} (paire ${result.subject})`);
      if (!APPLY) continue;
      const path = `colorways/${new Date().getUTCFullYear()}/${randomUUID()}.webp`;
      await upload(path, result.buffer);
      await client.query('UPDATE colorway_images SET url = $1, width = $2, height = $3 WHERE id = $4', [path, result.width, result.height, row.id]);
      done++;
    } catch (error) {
      console.error(`  ! ${row.url} : ${error.message}`);
    }
  }
  if (APPLY) console.log(`${done} photo(s) recadrée(s). Les anciens fichiers sont toujours dans le bucket.`);
} finally {
  await client.end();
}
