'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from './require-admin';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password-policy';

export type LoginState = {
  error?: string;
  /** Réaffiché après un échec, pour ne pas le ressaisir. */
  email?: string;
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

/** N'autorise qu'une redirection interne à l'admin (pas de redirection ouverte). */
function safeNextPath(next?: string): string {
  if (!next || !/^\/admin(\/|$|\?)/.test(next) || next.startsWith('/admin/login')) return '/admin';
  return next;
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  const typedEmail = String(formData.get('email') ?? '');
  if (!parsed.success) {
    return { error: 'Saisis une adresse e-mail valide et ton mot de passe.', email: typedEmail };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.status === 429) {
      return { error: 'Trop de tentatives. Patiente quelques minutes avant de réessayer.', email };
    }
    // Message volontairement identique que le compte existe ou non.
    return { error: 'E-mail ou mot de passe incorrect.', email };
  }

  let profile: { isActive: boolean } | null;
  try {
    profile = await withDbRetry(() =>
      prisma.adminProfile.findUnique({
        where: { id: data.user.id },
        select: { isActive: true },
      }),
    );
  } catch (cause) {
    // Base momentanément injoignable : on ne laisse pas une session à moitié ouverte.
    console.error('loginAction : profil admin illisible', cause);
    await supabase.auth.signOut({ scope: 'local' });
    return { error: 'Connexion momentanément impossible. Réessaie dans quelques secondes.', email };
  }
  if (!profile?.isActive) {
    await supabase.auth.signOut();
    return { error: 'Ce compte n’a pas accès à l’administration.', email };
  }

  redirect(safeNextPath(next));
}

/** Déconnexion de cet appareil uniquement (les autres sessions restent ouvertes). */
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

/** Téléphone perdu, ordinateur partagé : ferme toutes les sessions, partout. */
export async function logoutEverywhereAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/admin/login');
}

// -----------------------------------------------------------------------------
//  Mon compte : nom affiché, mot de passe
// -----------------------------------------------------------------------------

export type ProfileState = { success?: boolean; error?: string };

/** Nom affiché dans l'admin (« Bonjour … », historique des commandes). */
export async function updateDisplayNameAction(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const admin = await requireAdmin();
  const parsed = z.string().trim().min(1, 'Indique ton nom.').max(120, '120 caractères au maximum.').safeParse(formData.get('fullName') ?? '');
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.adminProfile.update({ where: { id: admin.id }, data: { fullName: parsed.data } });
  } catch (error) {
    console.error('Nom affiché non modifié', error);
    return { error: 'Le nom n’a pas pu être modifié. Réessaie.' };
  }
  revalidatePath('/admin', 'layout');
  return { success: true };
}

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type PasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<PasswordField, string>>;
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Saisis ton mot de passe actuel.'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      .max(MAX_PASSWORD_LENGTH, `${MAX_PASSWORD_LENGTH} caractères au maximum.`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Les deux mots de passe ne correspondent pas.' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choisis un mot de passe différent de l’actuel.' });

export async function changePasswordAction(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await requireAdmin();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword') ?? '',
    newPassword: formData.get('newPassword') ?? '',
    confirmPassword: formData.get('confirmPassword') ?? '',
  });
  if (!parsed.success) {
    const fieldErrors: PasswordState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as PasswordField;
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;
  if (newPassword.toLowerCase().includes(admin.email.split('@')[0].toLowerCase())) {
    return { fieldErrors: { newPassword: 'Le mot de passe ne doit pas contenir ton adresse e-mail.' } };
  }

  const supabase = await createSupabaseServerClient();

  // Revérifie le mot de passe actuel : une session laissée ouverte ne suffit pas
  // pour prendre le contrôle du compte. Ouvre au passage une session récente,
  // exigée par Supabase pour changer de mot de passe.
  const { error: authError } = await supabase.auth.signInWithPassword({ email: admin.email, password: currentPassword });
  if (authError) {
    if (authError.status === 429) return { error: 'Trop de tentatives. Patiente quelques minutes avant de réessayer.' };
    return { fieldErrors: { currentPassword: 'Mot de passe actuel incorrect.' } };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === 'same_password') return { fieldErrors: { newPassword: 'Choisis un mot de passe différent de l’actuel.' } };
    if (error.code === 'weak_password') return { fieldErrors: { newPassword: 'Mot de passe jugé trop faible : allonge-le ou varie les caractères.' } };
    return { error: 'Le mot de passe n’a pas pu être modifié. Réessaie dans un instant.' };
  }

  // Les autres appareils doivent se reconnecter avec le nouveau mot de passe.
  await supabase.auth.signOut({ scope: 'others' });
  return { success: true };
}
