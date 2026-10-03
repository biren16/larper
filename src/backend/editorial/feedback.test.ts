import {expect,it} from 'vitest';
import {editorialFeedback} from './feedback';
it('links publication fields and preserves the underlying diagnostic',()=>{
 expect(editorialFeedback(new Error('whyItMatters is required'))).toMatchObject({error:'Write Why people care before approval.',fieldErrors:{whyItMatters:'Write Why people care before approval.'},diagnostic:'whyItMatters is required'});
 expect(editorialFeedback(new Error('Save draft: EDITORIAL_CONFLICT: version mismatch'))).toMatchObject({conflict:true,error:expect.stringContaining('newer version'),diagnostic:'Save draft: EDITORIAL_CONFLICT: version mismatch'});
});
it.each([['title is too long','title','Shorten'],['slug is invalid','slug','hyphens'],['nicheId is invalid','nicheId','Choose'],['discoveryType is invalid','discoveryType','Choose'],['mode is invalid','mode','Choose']])('explains the remedy for %s',(diagnostic,field,remedy)=>{
 const feedback=editorialFeedback(new Error(diagnostic));
 expect(feedback.fieldErrors[field]).toContain(remedy);
 expect(feedback.error).not.toContain('before approval');
 expect(feedback.diagnostic).toBe(diagnostic);
});
