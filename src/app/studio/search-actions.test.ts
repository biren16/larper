import {describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>vi.fn());
vi.mock('./runtime',()=>({authorizedStudioRuntime:runtime}));
import {searchCandidatesAction,searchMediaAction} from './search-actions';
describe('private Studio registry search',()=>{
 it('requires the authenticated editorial runtime for both search paths',async()=>{
  runtime.mockRejectedValue(new Error('Forbidden'));
  await expect(searchCandidatesAction('draft','current')).rejects.toThrow('Forbidden');
  await expect(searchMediaAction('cover')).rejects.toThrow('Forbidden');
 });
 it('searches the current working title across the full registry with a literal query and exclusions',async()=>{
  const rpc=vi.fn(async()=>({data:[{id:'other',title:'Renamed 50% working story'}],error:null}));
  runtime.mockResolvedValue({client:{rpc}});
  expect(await searchCandidatesAction('Renamed 50%','current')).toEqual([{id:'other',title:'Renamed 50% working story'}]);
  expect(rpc).toHaveBeenCalledWith('search_editorial_merge_candidates',{p_query:'Renamed 50%',p_exclude_id:'current',p_limit:50});
 });
});
