import { Prisma } from '@/generated/prisma/client';
import { DomainError } from './errors';

/**
 * Règles métier garanties par la base (fonctions SQL des migrations).
 * Chaque exception SQL porte son code en préfixe du message : « [MS001] … ».
 */
const DB_RULES = {
  MS001: 'STOCK_INSUFFICIENT', // reserve_order_stock : pointure indisponible (DETAIL = variant_id)
  MS002: 'INVALID_STOCK_REASON', // release_order_stock : raison autre que CANCELLATION / RETURN
  MS060: 'ADMIN_INACTIVE', // app_admin_id : admin inconnu ou désactivé
} as const;

export type DbRuleCode = keyof typeof DB_RULES;

export class DatabaseRuleError extends DomainError {
  constructor(
    public readonly sqlState: DbRuleCode,
    message: string,
  ) {
    super(message, DB_RULES[sqlState]);
    this.name = 'DatabaseRuleError';
  }
}

const RULE_PATTERN = /\[(MS\d{3})\]\s*([^\n"`\\]*)/;

/** Convertit une erreur Prisma issue d'une règle SQL en DatabaseRuleError ; sinon la renvoie telle quelle. */
export function toDomainError(error: unknown): unknown {
  if (error instanceof DomainError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const match = RULE_PATTERN.exec(message);
  if (match && match[1] in DB_RULES) {
    return new DatabaseRuleError(match[1] as DbRuleCode, match[2].trim());
  }
  return error;
}

/** Violation d'unicité Prisma (P2002), éventuellement sur un champ donné. */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  if (!field) return true;
  const target = error.meta?.target;
  const targets = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  // Prisma 7 + adaptateur pg : le champ n'est pas toujours dans meta.target, mais
  // la contrainte (ex. variants_sku_key) figure dans le message ou dans meta.
  targets.push(error.message, JSON.stringify(error.meta ?? {}));
  return targets.some((t) => t === field || t.includes(field));
}
