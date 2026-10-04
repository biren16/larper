import Link from "next/link";
import { authorizedStudioRuntime } from "../runtime";
import { createPrivateStoryAction } from "../actions";
import { PostsManager } from "./posts-manager";
import { normalizePostQuery } from "@/backend/editorial/management";
import type { ManagedPost } from "@/backend/editorial/management";
import styles from "../studio.module.css";
export default async function PostsPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const query=await searchParams;const runtime=await authorizedStudioRuntime("/studio/posts");
 const params=normalizePostQuery(query);const {tab,page}=params;
 const [result,niches]=await Promise.all([runtime.client.rpc("list_editorial_posts",{p_query:params}),runtime.client.from("niches").select("id,name").eq("status","active")]);
 if(result.error||niches.error) throw new Error(result.error?.message??niches.error?.message);
 const data=result.data as unknown as {items:ManagedPost[];total:number};
 const url=(changes:Record<string,string|number>)=>`/studio/posts?${new URLSearchParams(Object.entries({...params,...changes}).map(([k,v])=>[k,String(v)]))}`;
 return <main id="main-content" className={styles.main}><header className={styles.header}><div><p className={styles.kicker}>Your editorial library</p><h1>Posts</h1></div><form action={createPrivateStoryAction}><button type="submit">New story</button></form></header>
 <nav className={styles.tabs} aria-label="Post status">{[["all","All"],["candidate","Inbox"],["draft","Drafts"],["scheduled","Scheduled"],["published","Published"],["trash","Trash"],["needs_review","Needs review"]].map(([value,label])=><Link key={value} href={url({tab:value,page:1})} aria-current={tab===value?"page":undefined}>{label} </Link>)}</nav>
 <form className={styles.postFilters}><input type="hidden" name="tab" value={tab}/><label>Search <input name="search" defaultValue={params.search}/></label><label>Niche <select name="niche" defaultValue={params.niche}><option value="">All niches</option>{niches.data?.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label>Edited from <input type="date" name="from" defaultValue={params.from}/></label><label>Edited through <input type="date" name="to" defaultValue={params.to}/></label><button>Apply filters</button></form>
 <p>{data.total} posts · Page {page} of {Math.max(1,Math.ceil(data.total/20))}</p><PostsManager key={url({})} posts={data.items} niches={niches.data??[]} returnTo={url({})}/>
 <nav aria-label="Pages">{page>1&&<Link href={url({page:page-1})}>Previous </Link>}{page*20<data.total&&<Link href={url({page:page+1})}>Next</Link>}</nav></main>;
}
