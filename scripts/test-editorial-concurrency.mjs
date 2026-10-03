// Two real PostgreSQL sessions: an evidence edit must not deadlock the scheduler.
import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
const database = `larper_concurrency_${process.pid}`;
const run = (command, args, options = {}) => {
 const result = spawnSync(command, args, {encoding:'utf8', ...options});
 if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
 return result.stdout;
};
run('createdb',[database]);
const env = {...process.env, PGDATABASE:database};
try {
 const migration = readFileSync(new URL('../supabase/migrations/202610030001_atomic_evidence_edits.sql',import.meta.url),'utf8');
 const scheduler = migration.slice(migration.indexOf('create or replace function public.publish_due_stories'));
 const fixture = `
 create table topic_clusters(id uuid primary key,state text,updated_at timestamptz);
 create table stories(id uuid primary key,cluster_id uuid,lifecycle text,publication_format text,scheduled_for timestamptz,published_at timestamptz,last_updated_at timestamptz,reviewed_by uuid);
 create table source_definitions(id uuid,config jsonb);
 create function source_origin_key(uuid,jsonb) returns text language sql as $$select $1::text$$;
 create table raw_signals(id uuid,source_definition_id uuid,trust_tier text,availability text);
 create table cluster_signals(cluster_id uuid,raw_signal_id uuid);
 create table story_revisions(story_id uuid,revision integer,snapshot jsonb,editor_id uuid);
 create table review_events(cluster_id uuid,story_id uuid,reviewer_id uuid,action text,notes text);
 insert into topic_clusters values('00000000-0000-0000-0000-000000000001','reviewing',now());
 insert into stories values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','reviewing','story',now()-interval '1 minute',null,now(),null);
 ${scheduler}`;
 run('psql',['-v','ON_ERROR_STOP=1'],{env,input:fixture});
 const editor = spawn('psql',['-v','ON_ERROR_STOP=1','-At'],{env,stdio:['pipe','pipe','pipe']});
 let errors=''; editor.stderr.on('data',chunk=>errors+=chunk);
 const completed = new Promise((resolve,reject)=>editor.on('exit',code=>code===0?resolve():reject(new Error(errors))));
 const ready = new Promise(resolve=>editor.stdout.on('data',chunk=>{if(chunk.toString().includes('EDIT_LOCKED'))resolve();}));
 editor.stdin.end("begin; select id from topic_clusters for update; select 'EDIT_LOCKED'; select pg_sleep(2); update stories set scheduled_for=null; commit;");
 await ready;
 const count = run('psql',['-At','-v','ON_ERROR_STOP=1','-c','select public.publish_due_stories()'],{env,timeout:1500}).trim();
 if(count!=='0') throw new Error('Scheduler did not skip the locked candidate');
 await completed;
 const state=run('psql',['-At','-c',"select lifecycle||':'||(scheduled_for is null)::text from stories"],{env}).trim();
 if(state!=='reviewing:true') throw new Error(`Unexpected publication after edit: ${state}`);
 console.log('Concurrent evidence edit / scheduled publication passed');
} finally { run('dropdb',['--force',database]); }
