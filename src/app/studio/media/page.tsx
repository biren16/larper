import { authorizedStudioRuntime } from "../runtime";
import {searchMediaAction} from "../search-actions";
import {MediaLibrary} from './media-library';
import styles from '../studio.module.css';
export default async function MediaPage() {
 const runtime=await authorizedStudioRuntime("/studio/media");
 const result=await runtime.client.from("media_assets").select("id,src,alt,credit_line,source_url,license_code,commercial_use_allowed,modification_allowed,social_use_allowed").order("created_at",{ascending:false}).limit(100);
 if(result.error) throw new Error(result.error.message);
 return <main id="main-content" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Studio / media</p><h1>Media</h1><p>Find approved covers. Upload a new cover from a story’s Evidence &amp; cover section.</p></div><p>Showing the latest 100 assets</p></header><MediaLibrary search={searchMediaAction} assets={result.data.map(row=>({id:row.id,src:row.src,alt:row.alt,creditLine:row.credit_line,sourceUrl:row.source_url??undefined,licenseCode:row.license_code??undefined,commercialUseAllowed:row.commercial_use_allowed,modificationAllowed:row.modification_allowed,socialUseAllowed:row.social_use_allowed}))} /></main>;
}
