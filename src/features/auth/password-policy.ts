/** Règles de mot de passe admin, partagées par le formulaire et la Server Action. */
export const MIN_PASSWORD_LENGTH = 12;
/** bcrypt (Supabase) ignore tout ce qui dépasse 72 octets. */
export const MAX_PASSWORD_LENGTH = 72;
