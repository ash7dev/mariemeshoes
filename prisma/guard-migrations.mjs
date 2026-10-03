#!/usr/bin/env node
// =============================================================================
//  Garde-fou des migrations Prisma.
//
//  Prisma ne connaît ni les CHECK, ni les index partiels / d'expression, ni les
//  triggers et fonctions. Lors d'une future `prisma migrate dev`, il peut générer
//  des DROP INDEX visant ces objets. Ce script échoue si une migration :
//    1. supprime un objet protégé (déclaré dans un fichier marqué `-- @protected`
//       ou entre `-- @protected-begin` / `-- @protected-end`) ;
//    2. désactive la RLS ou un trigger ;
//    3. crée une table sans activer la RLS dans le même fichier.
//
//  Suppression volontaire : ajouter `-- @allow-drop <nom>` dans la migration.
//  Usage : node prisma/guard-migrations.mjs   (lancé par db:migrate et db:deploy)
// =============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const unquote = (name) => name.replace(/"/g, '').replace(/^public\./, '').toLowerCase();

const CREATE_PATTERNS = [
  /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w.]+"?)/gi,
  /ADD\s+CONSTRAINT\s+("?[\w.]+"?)/gi,
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+("?[\w.]+"?)/gi,
  /CREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+("?[\w.]+"?)/gi,
  /CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w.]+"?)/gi,
  /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w.]+"?)/gi,
];

const DROP_PATTERN =
  /DROP\s+(INDEX|TRIGGER|FUNCTION|CONSTRAINT|SEQUENCE|EXTENSION|EVENT\s+TRIGGER)\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?("?[\w.]+"?)/gi;

const FORBIDDEN_PATTERNS = [
  [/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'désactive la RLS'],
  [/NO\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i, 'retire FORCE RLS'],
  [/DISABLE\s+TRIGGER/i, 'désactive un trigger'],
  [/session_replication_role/i, 'contourne les triggers (session_replication_role)'],
];

function protectedSections(sql) {
  if (/^--\s*@protected\s*$/m.test(sql)) return [sql];
  const sections = [];
  const re = /--\s*@protected-begin([\s\S]*?)--\s*@protected-end/g;
  for (const m of sql.matchAll(re)) sections.push(m[1]);
  return sections;
}

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((d) => statSync(join(MIGRATIONS_DIR, d)).isDirectory())
  .sort()
  .map((dir) => ({ dir, sql: readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8') }));

const protectedNames = new Map(); // nom → migration d'origine
const errors = [];

for (const { dir, sql } of migrations) {
  const allowed = new Set([...sql.matchAll(/--\s*@allow-drop\s+([\w.]+)/g)].map((m) => unquote(m[1])));

  // 1. Suppressions d'objets protégés par une migration ANTÉRIEURE
  for (const m of sql.matchAll(DROP_PATTERN)) {
    const name = unquote(m[2]);
    if (protectedNames.has(name) && !allowed.has(name)) {
      errors.push(
        `${dir} : DROP ${m[1].toUpperCase()} ${name} vise un objet protégé (créé par ${protectedNames.get(name)}). ` +
          `Retirez cette ligne, ou ajoutez « -- @allow-drop ${name} » si c'est voulu.`,
      );
    }
  }

  // 2. Contournements interdits
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(sql)) errors.push(`${dir} : la migration ${label}.`);
  }

  // 3. Toute nouvelle table reçoit la RLS dans la même migration
  //    (les tables de la migration init la reçoivent dans la migration security).
  if (!dir.endsWith('_init')) {
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w.]+"?)/gi)) {
      const table = unquote(m[1]);
      const rls = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?"?${table}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      if (!rls.test(sql)) {
        errors.push(`${dir} : la table ${table} est créée sans « ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY ».`);
      }
    }
  }

  // Enregistre les objets protégés créés par cette migration
  for (const section of protectedSections(sql)) {
    for (const pattern of CREATE_PATTERNS) {
      for (const m of section.matchAll(pattern)) protectedNames.set(unquote(m[1]), dir);
    }
  }
}

if (errors.length > 0) {
  console.error(`✖ Garde-fou migrations : ${errors.length} problème(s)\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`✔ Garde-fou migrations : ${migrations.length} migration(s), ${protectedNames.size} objet(s) protégé(s), aucun problème.`);
