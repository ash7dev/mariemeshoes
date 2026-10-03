import type { AdminRole } from '@/generated/prisma/client';

export const ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: 'Propriétaire',
  STAFF: 'Équipe',
};
