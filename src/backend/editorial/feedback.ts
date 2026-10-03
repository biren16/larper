const labels:Record<string,string>={nicheId:'Niche',slug:'Slug',title:'Title',hook:'Hook',summary:'What happened?',whyItMatters:'Why people care',lore:'The lore',beginnerContext:'If you’re new',conversationLine:'Conversation line',freshnessLabel:'Freshness label',evidenceSummary:'Evidence summary',regions:'Regions',mediaId:'Story image',discoveryType:'Discovery type',mode:'Mode'};
export function editorialFeedback(cause:unknown) {
 const diagnostic=cause instanceof Error?cause.message:'Something went wrong';
 const conflict=diagnostic.includes('EDITORIAL_CONFLICT');
 let field=/^([a-zA-Z]+) (?:is required|is invalid|is too long)/.exec(diagnostic)?.[1];
 let error=diagnostic;
 if(field && labels[field]) {
  if(diagnostic.includes("is too long")) error=`Shorten ${labels[field]} and try again.`;
  else if(diagnostic.includes("is invalid")) error=field === "slug" ? "Use lowercase words separated by hyphens for the slug." : `Choose a valid ${labels[field]} and try again.`;
  else error=`Write ${labels[field]} before approval.`;
 }
 if(/slug/i.test(diagnostic) && !field){field='slug';error='Use lowercase words separated by hyphens for the slug.';}
 if(/At least one region/.test(diagnostic)){field='regions';error='Choose at least one region.';}
 if(/Confirm that the sources/.test(diagnostic)){field='independentSourcesConfirmed';error='Open the source receipts and confirm independent original reporting.';}
 if(/two independent available sources/.test(diagnostic)){field='evidenceSummary';error='Link two available independent original sources before approval.';}
 if(/at least one credible source/.test(diagnostic)){field='evidenceSummary';error='Link at least one primary source or credible publication before approval.';}
 if(conflict) error='A newer version was saved. Your writing is retained; compare with the latest version before retrying.';
 return {error,diagnostic,conflict,fieldErrors:field?{[field]:error}:{},blockers:[error]};
}
