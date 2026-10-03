"use server";
import {authorizedStudioRuntime} from './runtime';
function pattern(value:string) {return `%${value.trim().slice(0,100).replace(/[\\%_]/g,'\\$&')}%`;}
export async function searchCandidatesAction(query:string,excludeId:string) {
 const runtime=await authorizedStudioRuntime('/studio/posts');
 const result=await runtime.client.rpc('search_editorial_merge_candidates',{p_query:query.trim().slice(0,100),p_exclude_id:excludeId,p_limit:50});
 if(result.error) throw new Error('Candidate search failed. Please try again.');
 return result.data;
}
export async function searchMediaAction(query:string) {
 const runtime=await authorizedStudioRuntime('/studio/media');
 const escaped=pattern(query).replaceAll('"','\\"');
 const result=await runtime.client.from('media_assets').select('id,src,alt,width,height,credit_line,source_url,license_code,commercial_use_allowed,modification_allowed,social_use_allowed').eq('commercial_use_allowed',true).or(`alt.ilike."${escaped}",credit_line.ilike."${escaped}",license_code.ilike."${escaped}"`).order('created_at',{ascending:false}).limit(50);
 if(result.error) throw new Error('Media search failed. Please try again.');
 return result.data.map(row=>({id:row.id,src:row.src,alt:row.alt,width:row.width,height:row.height,creditLine:row.credit_line,sourceUrl:row.source_url??undefined,licenseCode:row.license_code??undefined,commercialUseAllowed:row.commercial_use_allowed,modificationAllowed:row.modification_allowed,socialUseAllowed:row.social_use_allowed}));
}
