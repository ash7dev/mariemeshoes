'use client';

import { startTransition, useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { Field, describe, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { saveStoreInfoAction } from '../actions';
import type { StoreSettingsData } from '../queries';
import type { FormResult } from '../schemas';
import { ResultMessage, SettingsCard } from './settings-ui';

/** Nom, contacts et réseaux : affichés dans la boutique (footer, boutons WhatsApp). */
export default function StoreInfoForm({ settings }: { settings: StoreSettingsData }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(saveStoreInfoAction, { status: 'idle' });
  const errors = state.status === 'error' ? state.fieldErrors : {};

  return (
    <SettingsCard id="boutique" title="Boutique" description="Contacts et réseaux affichés dans la boutique : footer, boutons WhatsApp, fiche produit.">
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

        <Field id="storeName" label="Nom de la boutique" error={errors.storeName}>
          <input id="storeName" name="storeName" defaultValue={settings.storeName} maxLength={80} className={cn(inputClass, inputState(errors.storeName), 'h-12')} {...describe('storeName', errors.storeName)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="whatsappNumber" label="Numéro WhatsApp" optional error={errors.whatsappNumber} hint="Les clients t’écrivent en un clic. Ex. 77 123 45 67.">
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              inputMode="tel"
              defaultValue={settings.whatsappNumber ? formatSenegalPhone(settings.whatsappNumber) : ''}
              className={cn(inputClass, inputState(errors.whatsappNumber), 'h-12 tabular-nums')}
              {...describe('whatsappNumber', errors.whatsappNumber, 'hint')}
            />
          </Field>
          <Field id="contactPhone" label="Téléphone (appels)" optional error={errors.contactPhone} hint="Si différent du WhatsApp.">
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              inputMode="tel"
              defaultValue={settings.contactPhone ? formatSenegalPhone(settings.contactPhone) : ''}
              className={cn(inputClass, inputState(errors.contactPhone), 'h-12 tabular-nums')}
              {...describe('contactPhone', errors.contactPhone, 'hint')}
            />
          </Field>
        </div>

        <Field id="contactEmail" label="E-mail de contact" optional error={errors.contactEmail}>
          <input id="contactEmail" name="contactEmail" type="email" inputMode="email" autoCapitalize="none" defaultValue={settings.contactEmail ?? ''} className={cn(inputClass, inputState(errors.contactEmail), 'h-12')} {...describe('contactEmail', errors.contactEmail)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="instagramUrl" label="Instagram" optional error={errors.instagramUrl} hint="@identifiant ou lien du profil.">
            <input id="instagramUrl" name="instagramUrl" autoCapitalize="none" spellCheck={false} defaultValue={settings.instagramUrl ?? ''} placeholder="@mariemeshoes" className={cn(inputClass, inputState(errors.instagramUrl), 'h-12')} {...describe('instagramUrl', errors.instagramUrl, 'hint')} />
          </Field>
          <Field id="tiktokUrl" label="TikTok" optional error={errors.tiktokUrl} hint="@identifiant ou lien du profil.">
            <input id="tiktokUrl" name="tiktokUrl" autoCapitalize="none" spellCheck={false} defaultValue={settings.tiktokUrl ?? ''} placeholder="@mariemeshoes" className={cn(inputClass, inputState(errors.tiktokUrl), 'h-12')} {...describe('tiktokUrl', errors.tiktokUrl, 'hint')} />
          </Field>
        </div>

        <button type="submit" disabled={pending} className="flex h-12 items-center justify-center gap-2 self-end rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-70">
          {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Enregistrer
        </button>
      </form>
    </SettingsCard>
  );
}
