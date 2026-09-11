#!/usr/bin/env node
/* Applies schema.sql without needing the psql CLI installed — this project
   already depends on @neondatabase/serverless (see lib/db.js), so that's
   enough. Useful on a machine where Homebrew/psql isn't an option (e.g. an
   OS version modern Homebrew has dropped).

   Usage:
     node scripts/apply-schema.mjs "postgres://user:pass@host/db"
   or with DATABASE_URL already exported in the shell:
     node scripts/apply-schema.mjs

   Runs each statement in schema.sql separately over Neon's HTTP driver.
   Safe to re-run: every statement in schema.sql is idempotent
   (`if not exists`, `on conflict do nothing`). */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error('Usage: node scripts/apply-schema.mjs "postgres://...connection-string..."');
  console.error('(or export DATABASE_URL first and omit the argument)');
  process.exit(1);
}

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema.sql');
const text = readFileSync(schemaPath, 'utf8');

// Strip -- comments (whole-line and trailing) before splitting on `;` — a
// trailing comment containing a semicolon would otherwise fracture a
// statement. schema.sql has no `--` inside any string literal, so this is
// safe for this specific file without a real SQL tokenizer.
const statements = text
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const sql = neon(url);

for (const [i, stmt] of statements.entries()) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...\n`);
  try {
    await sql(stmt);
  } catch (e) {
    console.error(`Failed on statement ${i + 1}:`, e.message);
    process.exit(1);
  }
}

console.log(`Done — ${statements.length} statements applied.`);
