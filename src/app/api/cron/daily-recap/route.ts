import { notifyDailyRecap } from '@/features/notifications/events';
import { expireStaleOrders } from '@/features/orders/expiry';

/**
 * Tâche planifiée du soir (vercel.json : 20 h, heure de Dakar = UTC) : annule les
 * réservations expirées, puis envoie aux admins le récap des ventes du jour.
 * Vercel appelle cette route avec « Authorization: Bearer <CRON_SECRET> ».
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Non autorisé', { status: 401 });
  }
  const expired = await expireStaleOrders({ force: true });
  await notifyDailyRecap();
  return Response.json({ ok: true, expired });
}
