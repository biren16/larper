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
 it('searches registry titles with literal wildcard escaping and excludes trash/current candidate',async()=>{
  const query={select:vi.fn(),is:vi.fn(),in:vi.fn(),neq:vi.fn(),ilike:vi.fn(),order:vi.fn(),limit:vi.fn()};
  for(const method of ['select','is','in','neq','ilike','order'] as const)query[method].mockReturnValue(query);
  query.limit.mockResolvedValue({data:[{id:'other',title:'A 50% draft'}],error:null});
  runtime.mockResolvedValue({client:{from:()=>query}});
  expect(await searchCandidatesAction('50%','current')).toEqual([{id:'other',title:'A 50% draft'}]);
  expect(query.ilike).toHaveBeenCalledWith('title','%50\\%%');
  expect(query.is).toHaveBeenCalledWith('trashed_at',null);
  expect(query.neq).toHaveBeenCalledWith('id','current');
  expect(query.limit).toHaveBeenCalledWith(50);
 });
});
