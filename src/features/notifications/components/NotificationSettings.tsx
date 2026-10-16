'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell, BellOff, BellRing, LoaderCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendTestPushAction, subscribePushAction, unsubscribePushAction } from '../actions';

type State = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

/** Clé publique VAPID (base64url) → octets attendus par pushManager.subscribe. */
function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
}

/**
 * Notifications de l'admin sur CET appareil : nouvelles commandes et alertes de stock.
 * Sur iPhone, elles ne marchent que dans l'application installée (écran d'accueil).
 */
export default function NotificationSettings() {
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !standalone) return setState('ios-install');
    if (!supported) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('denied');
    navigator.serviceWorker
      .getRegistration('/')
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'off'))
      .catch(() => setState('off'));
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMessage(null);
      try {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) throw new Error('Les notifications ne sont pas configurées (clé publique VAPID manquante).');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState(permission === 'denied' ? 'denied' : 'off');
          return;
        }
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
        const result = await subscribePushAction(sub.toJSON(), navigator.userAgent);
        if (!result.ok) throw new Error(result.error);
        setState('on');
        setMessage({ ok: true, text: 'Notifications activées sur cet appareil.' });
      } catch (error) {
        setMessage({ ok: false, text: error instanceof Error ? error.message : 'Activation impossible.' });
      }
    });

  const disable = () =>
    startTransition(async () => {
      setMessage(null);
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
      setMessage({ ok: true, text: 'Notifications désactivées sur cet appareil.' });
    });

  const test = () =>
    startTransition(async () => {
      const result = await sendTestPushAction();
      setMessage(result.ok ? { ok: true, text: 'Notification d’essai envoyée.' } : { ok: false, text: result.error });
    });

  return (
    <section id="notifications" aria-labelledby="notifications-title" className="flex scroll-mt-28 flex-col gap-4 rounded-[32px] border border-border bg-surface p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-card">
          <BellRing className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <h2 id="notifications-title" className="font-display text-[1.375rem]">
          Notifications
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-ink">
        Reçois une alerte sur cet appareil à chaque nouvelle commande, et quand une pointure tombe à une paire ou en rupture. À activer sur chaque téléphone ou
        ordinateur.
      </p>

      {state === 'ios-install' && (
        <p className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm leading-relaxed">
          <Smartphone className="mt-0.5 size-[18px] shrink-0 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
          <span>
            Sur iPhone, installe d’abord l’application : dans Safari, <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>. Ouvre ensuite
            « MS Admin » depuis l’écran d’accueil et reviens ici pour activer les notifications.
          </span>
        </p>
      )}
      {state === 'unsupported' && <p className="rounded-2xl bg-card p-4 text-sm">Ce navigateur ne gère pas les notifications. Essaie Chrome, Edge, Firefox ou Safari récent.</p>}
      {state === 'denied' && (
        <p className="rounded-2xl bg-[#FBE3EE] p-4 text-sm text-accent-ink">
          Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur (icône à gauche de l’adresse), puis recharge la page.
        </p>
      )}

      {(state === 'off' || state === 'on' || state === 'loading') && (
        <div className="flex flex-wrap items-center gap-2.5">
          {state === 'on' ? (
            <>
              <span className="flex h-11 items-center gap-2 rounded-full bg-[#E7F1EA] px-4 text-sm font-semibold text-[#1F6B3A]">
                <Bell className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Activées sur cet appareil
              </span>
              <button type="button" onClick={test} disabled={pending} className="flex h-11 items-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream disabled:opacity-60">
                Envoyer un essai
              </button>
              <button type="button" onClick={disable} disabled={pending} className="flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-ink disabled:opacity-60">
                <BellOff className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Désactiver
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={pending || state === 'loading'}
              className="flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25)] disabled:opacity-60"
            >
              {pending ? <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Bell className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              Activer les notifications
            </button>
          )}
        </div>
      )}

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={cn('text-sm', message.ok ? 'text-[#1F6B3A]' : 'text-accent-ink')}>
          {message.text}
        </p>
      )}
    </section>
  );
}
