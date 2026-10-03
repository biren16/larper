// Run against an empty, disposable PostgreSQL database. Every change is rolled back.
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migrations = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
const platform = read('supabase/tests/fresh-platform-stubs.sql.inc');
const schema = migrations.map(file => read(`supabase/migrations/${file}`).replace(/^create extension if not exists (pg_cron|pg_net).*;$/gm, '-- Hosted extension unavailable in plain PostgreSQL.')).join('\n');
const starters = read('src/backend/editorial/seven-lane-starters.json');
const sql = `${platform}\n${schema}\n${read('supabase/seed.sql')}\ncreate temporary table test_starters(content jsonb);\ninsert into test_starters values($starter$${starters}$starter$::jsonb);\n${read('supabase/tests/fresh-editorial-journey.sql.inc')}\n${read('supabase/tests/working-drafts-regression.sql.inc')}\nrollback;`;
const dir = mkdtempSync(join(tmpdir(), 'larper-schema-'));
try {
 const file = join(dir,'journey.sql'); writeFileSync(file,sql);
 const result = spawnSync('psql',['-v','ON_ERROR_STOP=1','-f',file],{stdio:'inherit'});
 if (result.error) throw result.error;
 process.exitCode = result.status ?? 1;
} finally { rmSync(dir,{recursive:true,force:true}); }
