import { readFileSync,readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const database=`larper_retention_${process.pid}`;
const run=(cmd,args,opts={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...opts});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout;};
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
run('createdb',[database]); const env={...process.env,PGDATABASE:database};
try {
 const chain=readdirSync(new URL('../supabase/migrations',import.meta.url)).filter(f=>f.endsWith('.sql') && (!process.env.RELEASE_ONE || f <= '202610030002_editorial_working_snapshots.sql' || f === '202610030005_working_draft_retention.sql')).sort().map(f=>read(`supabase/migrations/${f}`).replace(/^create extension if not exists (pg_cron|pg_net).*;$/gm,'')).join('\n');
 run('psql',['-v','ON_ERROR_STOP=1'],{env,input:read('supabase/tests/fresh-platform-stubs.sql.inc')+'\n'+chain+'\n'+read('supabase/seed.sql')+'\ncommit;\n'+read('supabase/tests/working-draft-retention.sql.inc')+(process.env.RELEASE_ONE?'':'\n'+read('supabase/tests/duplicate-draft-retention.sql.inc'))});
 console.log('Working draft retention, unedited expiry and observation preservation passed');
}finally {run('dropdb',['--force',database]);}
