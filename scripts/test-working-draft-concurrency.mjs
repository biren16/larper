// Disposable PostgreSQL: preserve the pre-migration snapshots and exercise two real writers.
import { readFileSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
const database=`larper_working_${process.pid}`;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const run=(command,args,options={})=>{const r=spawnSync(command,args,{encoding:'utf8',...options});if(r.status!==0)throw new Error(r.stderr);return r.stdout;};
run('createdb',[database]); const env={...process.env,PGDATABASE:database};
try {
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
 const old=files.filter(f=>f<'202610030002_editorial_working_snapshots.sql').map(f=>read(`supabase/migrations/${f}`).replace(/^create extension if not exists (pg_cron|pg_net).*;$/gm,'')).join('\n');
 const sql=`${read('supabase/tests/fresh-platform-stubs.sql.inc')}\n${old}\n${read('supabase/seed.sql')}\ncreate temporary table before_stories as select id,to_jsonb(s) snapshot from stories s;\n${files.filter(f=>f>='202610030002_editorial_working_snapshots.sql').map(f=>read(`supabase/migrations/${f}`)).join('\n')}\ndo $$ begin if exists(select 1 from before_stories b join stories s using(id) where b.snapshot<>to_jsonb(s)) then raise exception 'Backfill modified stories'; end if; end $$;\ninsert into topic_clusters(id,title,state) values('00000000-0000-0000-0000-000000000091','Concurrent draft','reviewing'); commit;`;
 run('psql',['-v','ON_ERROR_STOP=1'],{env,input:sql});
 const first=spawn('psql',['-v','ON_ERROR_STOP=1','-At'],{env,stdio:['pipe','pipe','pipe']});
 let errors='';first.stderr.on('data',chunk=>errors+=chunk);
 const done=new Promise((resolve,reject)=>first.on('exit',code=>code===0?resolve():reject(new Error(errors))));
 const ready=new Promise(resolve=>first.stdout.on('data',chunk=>{if(chunk.toString().includes('FIRST_SAVED'))resolve();}));
 first.stdin.end(`begin;select * from save_editorial_working_draft('00000000-0000-0000-0000-000000000091',null,'{"title":"First writer"}',0);select 'FIRST_SAVED';select pg_sleep(1);commit;`);
 await ready;
 const second=spawnSync('psql',['-v','ON_ERROR_STOP=1','-At','-c',`select * from save_editorial_working_draft('00000000-0000-0000-0000-000000000091',null,'{"title":"Stale writer"}',0)`],{env,encoding:'utf8'});
 await done;
 if(second.status===0 || !second.stderr.includes('EDITORIAL_CONFLICT'))throw new Error('Concurrent stale writer was not rejected: '+second.stderr);
 const value=run('psql',['-At','-c',`select content->>'title' from editorial_working_drafts where candidate_id='00000000-0000-0000-0000-000000000091'`],{env}).trim();
 if(value!=='First writer')throw new Error('Concurrent writer overwrote saved content');
 console.log('Working draft backfill preservation and two-session conflict passed');
} finally {run('dropdb',['--force',database]);}
