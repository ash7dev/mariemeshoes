'use server';

import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { prisma } from '@/lib/prisma';
import { notifyAdmins, pushConfigured } from './push';

type ActionResult = { ok: true } | { ok: false; error: string };

/** Abonnement tel que le navigateur le donne (PushSubscription.toJSON()). */
const subscriptionSchema = z.object({
  endpoint: z.url().startsWith('https://').max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Abonne CE navigateur aux alertes de l'admin connecté (le même navigateur change de compte : il suit). */
export async function subscribePushAction(subscription: unknown, userAgent: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!pushConfigured()) return { ok: false, error: 'Les notifications ne sont pas configurées sur le serveur (clés VAPID).' };
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, error: 'Ce navigateur a donné un abonnement invalide.' };
  const { endpoint, keys } = parsed.data;
  const data = { adminId: admin.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent.slice(0, 400) || null };
  await prisma.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, ...data }, update: data });
  return { ok: true };
}

/** Désabonne ce navigateur (seulement s'il appartient à l'admin connecté). */
export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, adminId: admin.id } });
  return { ok: true };
}

/** Notification d'essai sur tous les appareils abonnés de l'admin connecté. */
export async function sendTestPushAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  const { sent } = await notifyAdmins(
    { title: 'Notifications activées', body: 'Tu recevras ici les nouvelles commandes et les alertes de stock.', url: '/admin', tag: 'test' },
    { adminIds: [admin.id] },
  );
  return sent > 0 ? { ok: true } : { ok: false, error: 'Aucun appareil n’a reçu la notification. Réactive-les sur cet appareil.' };
}
