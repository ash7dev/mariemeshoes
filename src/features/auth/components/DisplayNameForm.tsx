'use client';

import { startTransition, useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDisplayNameAction, type ProfileState } from '../actions';

/** Nom affiché dans l'admin. Envoi manuel : la saisie reste en cas d'erreur. */
export default function DisplayNameForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateDisplayNameAction, {});

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="fullName" className="text-sm font-medium text-deep-ink">
        Nom affiché
      </label>
      <div className="flex gap-2">
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          maxLength={120}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? 'fullName-error' : undefined}
          className={cn(
            'h-12 min-w-0 flex-1 rounded-2xl border bg-cream/10 px-4 text-cream outline-none placeholder:text-deep-ink focus:border-accent-soft',
            state.error ? 'border-accent-soft' : 'border-cream/20',
          )}
        />
        <button type="submit" disabled={pending} className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-cream px-5 text-sm font-semibold text-deep disabled:opacity-70">
          {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          OK
        </button>
      </div>
      {state.error && (
        <p id="fullName-error" className="text-sm text-accent-soft">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-deep-ink">
          Nom enregistré.
        </p>
      )}
    </form>
  );
}
