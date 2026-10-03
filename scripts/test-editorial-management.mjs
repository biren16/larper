import { readFileSync,readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const database=`larper_management_${process.pid}`;
const run=(cmd,args,opts={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...opts});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout;};
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
run('createdb',[database]); const env={...process.env,PGDATABASE:database};
try {
 const chain=readdirSync(new URL('../supabase/migrations',import.meta.url)).filter(f=>f.endsWith('.sql')).sort().map(f=>read(`supabase/migrations/${f}`).replace(/^create extension if not exists (pg_cron|pg_net).*;$/gm,'')).join('\n');
 run('psql',['-v','ON_ERROR_STOP=1'],{env,input:read('supabase/tests/fresh-platform-stubs.sql.inc')+'\n'+chain+'\n'+read('supabase/seed.sql')+'\ncreate temporary table test_starters(content jsonb); insert into test_starters values($starter$'+read('src/backend/editorial/seven-lane-starters.json')+'$starter$::jsonb);\n'+read('supabase/tests/fresh-editorial-journey.sql.inc')+'\n'+read('supabase/tests/working-drafts-regression.sql.inc')+'\n'+read('supabase/tests/editorial-management.sql')});
 console.log('Management transactions, identity, ageing, public RLS and scheduler passed');
}finally {run('dropdb',['--force',database]);}
