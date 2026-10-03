'use client';

import { startTransition, useActionState } from 'react';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field, describe, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { saveWaveAction } from '../actions';
import type { StoreSettingsData } from '../queries';
import type { FormResult } from '../schemas';
import { ResultMessage, SettingsCard } from './settings-ui';

/** Paiement Wave : ce que le client voit pour payer (code marchand, lien de paiement). */
export default function WavePaymentForm({ settings }: { settings: StoreSettingsData }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(saveWaveAction, { status: 'idle' });
  const errors = state.status === 'error' ? state.fieldErrors : {};

  return (
    <SettingsCard
      id="wave"
      title="Paiement Wave"
      description="Affiché au client qui choisit Wave. Tu vérifies ensuite chaque paiement dans Wave Business, depuis la fiche de la commande."
    >
      <form
        noValidate
        // Envoi manuel : React 19 vide un <form action> après l'envoi ; ici, la saisie reste en cas d'erreur.
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => action(data));
        }}
        className="flex flex-col gap-5"
      >
        {state.status === 'saved' && <ResultMessage ok>{state.message}</ResultMessage>}
        {state.status === 'error' && state.formError && <ResultMessage ok={false}>{state.formError}</ResultMessage>}

        <Field id="waveMerchantCode" label="Code marchand Wave" optional error={errors.waveMerchantCode} hint="Le code que le client saisit dans son application Wave.">
          <input
            id="waveMerchantCode"
            name="waveMerchantCode"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={settings.waveMerchantCode ?? ''}
            className={cn(inputClass, inputState(errors.waveMerchantCode), 'h-12 font-mono tracking-wide')}
            {...describe('waveMerchantCode', errors.waveMerchantCode, 'hint')}
          />
        </Field>
        <Field id="wavePaymentLink" label="Lien de paiement Wave" optional error={errors.wavePaymentLink} hint="Wave Business → Recevoir un paiement → Lien. Commence par https://pay.wave.com/">
          <div className="flex gap-2">
            <input
              id="wavePaymentLink"
              name="wavePaymentLink"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={settings.wavePaymentLink ?? ''}
              placeholder="https://pay.wave.com/m/…"
              className={cn(inputClass, inputState(errors.wavePaymentLink), 'h-12')}
              {...describe('wavePaymentLink', errors.wavePaymentLink, 'hint')}
            />
            {settings.wavePaymentLink && (
              <a
                href={settings.wavePaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tester le lien de paiement"
                title="Tester le lien"
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border hover:border-ink"
              >
                <ExternalLink className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
              </a>
            )}
          </div>
        </Field>

        <button type="submit" disabled={pending} className="flex h-12 items-center justify-center gap-2 self-end rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-70">
          {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Enregistrer
        </button>
      </form>
    </SettingsCard>
  );
}
