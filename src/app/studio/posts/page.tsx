import Link from "next/link";
import { authorizedStudioRuntime } from "../runtime";
import { createPrivateStoryAction } from "../actions";
export default async function PostsPage() {
 const runtime=await authorizedStudioRuntime("/studio/posts");
 const result=await runtime.client.from("topic_clusters").select("id,title,state").order("updated_at",{ascending:false}).limit(100);
 if(result.error) throw new Error(result.error.message);
 return <main id="main-content" style={{maxWidth:1200,margin:"auto",padding:24}}><h1>Posts</h1><form action={createPrivateStoryAction}><button type="submit">New story</button></form><ul>{result.data.map(row=><li key={row.id}><Link href={`/studio/candidates/${row.id}`}>{row.title}</Link> · {row.state}</li>)}</ul></main>;
}
