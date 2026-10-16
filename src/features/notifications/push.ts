import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

/**
 * Notifications push web (standard VAPID, sans service tiers ni clé API) :
 * le serveur signe chaque message avec sa clé privée, le service de push du
 * navigateur (Google, Apple, Mozilla) le remet au téléphone ou à l'ordinateur.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Page ouverte au toucher de la notification. */
  url: string;
  /** Même tag : la notification remplace la précédente au lieu de s'empiler. */
  tag?: string;
};

let configured: boolean | null = null;

/** Clés lues une fois ; sans clés (environnement non configuré), rien n'est envoyé. */
function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn('Notifications push désactivées : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT manquant.');
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return configure();
}

/**
 * Envoie une notification aux admins actifs (tous, ou seulement `adminIds`).
 * Ne lève jamais d'erreur : une alerte ratée ne doit pas casser une commande.
 * Les abonnements que le navigateur déclare expirés (404, 410) sont supprimés.
 */
export async function notifyAdmins(
  payload: PushPayload,
  options: { adminIds?: string[]; excludeAdminIds?: string[]; urgent?: boolean } = {},
): Promise<{ sent: number }> {
  if (!configure()) return { sent: 0 };
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        admin: { isActive: true },
        ...(options.adminIds ? { adminId: { in: options.adminIds } } : {}),
        // L'admin qui vient d'agir (ex. annuler) n'a pas besoin d'être prévenu de son propre geste.
        ...(options.excludeAdminIds?.length ? { NOT: { adminId: { in: options.excludeAdminIds } } } : {}),
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subscriptions.length === 0) return { sent: 0 };

    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          // Une commande vieille de plus d'un jour n'a plus besoin d'alerte.
          TTL: 24 * 3600,
          urgency: options.urgent ? 'high' : 'normal',
        }),
      ),
    );

    const expired: string[] = [];
    const delivered: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') delivered.push(subscriptions[i].id);
      else {
        const status = (result.reason as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) expired.push(subscriptions[i].id);
        else console.error('Notification push non remise', status, (result.reason as Error)?.message);
      }
    });
    await Promise.all([
      expired.length ? prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } }) : null,
      delivered.length ? prisma.pushSubscription.updateMany({ where: { id: { in: delivered } }, data: { lastSentAt: new Date() } }) : null,
    ]);
    return { sent: delivered.length };
  } catch (error) {
    console.error('Envoi des notifications push impossible', error);
    return { sent: 0 };
  }
}
