import { authorizedStudioRuntime } from "../runtime";
import {searchMediaAction} from "../search-actions";
import {MediaLibrary} from './media-library';
export default async function MediaPage() {
 const runtime=await authorizedStudioRuntime("/studio/media");
 const result=await runtime.client.from("media_assets").select("id,src,alt,credit_line,source_url,license_code,commercial_use_allowed,modification_allowed,social_use_allowed").order("created_at",{ascending:false}).limit(100);
 if(result.error) throw new Error(result.error.message);
 return <main id="main-content" style={{maxWidth:1200,margin:"auto",padding:24}}><h1>Media</h1><p>Upload approved covers from a story’s Evidence &amp; cover section. Showing the latest 100 assets.</p><MediaLibrary search={searchMediaAction} assets={result.data.map(row=>({id:row.id,src:row.src,alt:row.alt,creditLine:row.credit_line,sourceUrl:row.source_url??undefined,licenseCode:row.license_code??undefined,commercialUseAllowed:row.commercial_use_allowed,modificationAllowed:row.modification_allowed,socialUseAllowed:row.social_use_allowed}))} /></main>;
}
