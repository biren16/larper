import { authorizedStudioRuntime } from "../runtime";
export default async function MediaPage() {
 const runtime=await authorizedStudioRuntime("/studio/media");
 const result=await runtime.client.from("media_assets").select("id,alt,credit_line").order("created_at",{ascending:false}).limit(100);
 if(result.error) throw new Error(result.error.message);
 return <main id="main-content" style={{maxWidth:1200,margin:"auto",padding:24}}><h1>Media</h1><p>Upload approved covers from a story’s Evidence &amp; cover section.</p><ul>{result.data.map(row=><li key={row.id}>{row.alt} · {row.credit_line}</li>)}</ul></main>;
}
