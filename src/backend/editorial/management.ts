export interface ManagedPost {
 id:string; title:string; nicheId:string|null; status:string; lastEditedAt:string; editorialVersion:number;
 scheduledFor?:string|null; mediaId?:string|null; privateEdits?:boolean; needsReview?:string|null; slug?:string|null;
}
export interface PostQuery { tab?:string; search?:string; niche?:string; from?:string; to?:string; page?:number; pageSize?:number }
export async function runBulkManagement<T extends {id:string}>(posts:T[],mutate:(post:T)=>Promise<{revision:number;candidateId?:string}>) {
 const results=[];
 for(const post of posts) {
  try {results.push({id:post.id,ok:true as const,...await mutate(post)});}
  catch(error) {const message=error instanceof Error?error.message:"Operation failed";results.push({id:post.id,ok:false as const,error:message,conflict:message.includes("EDITORIAL_CONFLICT")});}
 }
 return results;
}
export function differenceFields(before:Record<string,unknown>,after:Record<string,unknown>) {
 return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(field=>JSON.stringify(before[field])!==JSON.stringify(after[field]))
 .map(field=>({field,before:before[field],after:after[field]}));
}

export function normalizePostQuery(query:Record<string,string|undefined>) {
 const date=(value:string|undefined)=>{if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return "";const parsed=new Date(`${value}T00:00:00Z`);return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value?value:"";};
 return {tab:["all","candidate","draft","scheduled","published","trash","needs_review"].includes(query.tab??"")?query.tab!:"all",page:Math.max(1,Math.min(100000,Math.floor(Number(query.page))||1)),search:(query.search??"").slice(0,200),niche:query.niche??"",from:date(query.from),to:date(query.to)};
}
