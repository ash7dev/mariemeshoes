'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { changePasswordAction, type PasswordState } from '../actions';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password-policy';

const field =
  'h-14 w-full rounded-2xl border bg-surface px-4 pr-14 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 hover:border-muted focus:border-accent focus:shadow-[0_0_0_4px_rgb(230_0_126/0.12)]';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

/** Changement de mot de passe : revérifie l'actuel, puis déconnecte les autres appareils. */
export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  const [visible, setVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const fields: Array<{ name: FieldName; label: string; autoComplete: string; hint?: string }> = [
    { name: 'currentPassword', label: 'Mot de passe actuel', autoComplete: 'current-password' },
    {
      name: 'newPassword',
      label: 'Nouveau mot de passe',
      autoComplete: 'new-password',
      hint: `Au moins ${MIN_PASSWORD_LENGTH} caractères. Une phrase courte et personnelle est idéale.`,
    },
    { name: 'confirmPassword', label: 'Confirmer le nouveau mot de passe', autoComplete: 'new-password' },
  ];

  const strength = Math.min(newPassword.length / (MIN_PASSWORD_LENGTH + 4), 1);

  return (
    // key : un succès vide le formulaire (nouveau montage des champs).
    <form key={state.success ? 'done' : 'form'} action={formAction} className="flex flex-col gap-5" noValidate>
      {state.success && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-[#E3F1E6] px-4 py-3.5 text-sm leading-snug text-[#1F6B3A]">
          <CheckCircle2 className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Mot de passe modifié. Tes autres appareils ont été déconnectés.
        </div>
      )}
      {state.error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#FBE3EE] px-4 py-3.5 text-sm leading-snug text-accent-ink">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {state.error}
        </div>
      )}

      {fields.map(({ name, label, autoComplete, hint }) => {
        const error = state.fieldErrors?.[name];
        return (
          <div key={name} className="flex flex-col gap-2">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            <div className="relative">
              <input
                id={name}
                name={name}
                type={visible ? 'text' : 'password'}
                required
                autoComplete={autoComplete}
                maxLength={MAX_PASSWORD_LENGTH}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
                onChange={name === 'newPassword' ? (e) => setNewPassword(e.target.value) : undefined}
                className={cn(field, error ? 'border-accent-ink' : 'border-border')}
              />
              {name === 'currentPassword' && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                  aria-pressed={visible}
                  className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted-ink transition-colors hover:bg-card hover:text-ink"
                >
                  {visible ? <EyeOff className="size-[18px]" strokeWidth={1.7} aria-hidden="true" /> : <Eye className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />}
                </button>
              )}
            </div>

            {name === 'newPassword' && (
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className={cn('h-full origin-left rounded-full transition-[transform,background-color] duration-200', newPassword.length >= MIN_PASSWORD_LENGTH ? 'bg-[#1F6B3A]' : 'bg-accent')}
                  style={{ transform: `scaleX(${strength})` }}
                />
              </div>
            )}

            {error ? (
              <p id={`${name}-error`} className="text-sm text-accent-ink">
                {error}
              </p>
            ) : (
              hint && (
                <p id={`${name}-hint`} className="text-sm text-muted-ink">
                  {hint}
                </p>
              )
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex h-14 items-center justify-center gap-2.5 rounded-full bg-deep px-7 text-[0.9375rem] font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-85 sm:self-start"
      >
        {isPending && <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />}
        {isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}
