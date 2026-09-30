import type {BatchDraft, GenerationInput, Item} from './types';

/** A failed preflight cannot have created a supplier task. Preserve true pending receipts. */
export function repairUnsubmittedFailure(item:Item):void {
 if(item.status==='unresolved'&&item.generationJob?.submitted===false){item.status='failed';item.error='unsubmittedError';}
}

export function generationInput(item:Pick<Item,'name'|'description'|'combineForms'>):GenerationInput {
  return {name:item.name.trim(),description:item.description.trim(),...(item.combineForms!==undefined?{combineForms:item.combineForms}:{})};
}

export function sameGenerationInput(a:GenerationInput,b:GenerationInput):boolean {
  return a.name.trim()===b.name.trim()&&a.description.trim()===b.description.trim()&&!!a.combineForms===!!b.combineForms;
}

/** Pending changes are relative to the last successful result, not the last attempt. */
export function isBatchDraftModified(draft:BatchDraft,item?:Item):boolean {
  return !!item?.candidate&&!!item.lastGeneratedInput&&!sameGenerationInput(item.lastGeneratedInput,generationInput(draft));
}

export type BatchPlanEntry={draft:BatchDraft;item?:Item;intent:NonNullable<Item['generationIntent']>};

/** The review and submission use the same ordered list, independent of export selection. */
export function planBatchGeneration(drafts:BatchDraft[],items:Item[],limit:number,includeUnchanged=false):BatchPlanEntry[]{
  const entries:BatchPlanEntry[]=[],claimed=new Set<string>();
  const working=(item:Item)=>['queued','generating','cutting'].includes(item.status);
  const unlinked=items.filter(item=>!item.batchDraftId&&!working(item));
  let plannedNew=0;
  for(const draft of drafts.filter(draft=>draft.name.trim())){
    let item=items.find(item=>item.batchDraftId===draft.id);
    if(item&&working(item))continue;
    if(!item){
      if(items.length+plannedNew<limit)plannedNew++;
      else{item=unlinked.find(candidate=>!claimed.has(candidate.id));if(!item)continue;}
      if(item)claimed.add(item.id);
      entries.push({draft,item,intent:item?.candidate?'replace':'initial'});continue;
    }
    const previous=item.lastGeneratedInput,changed=!previous||!sameGenerationInput(previous,generationInput(draft));
    if(!item.candidate)entries.push({draft,item,intent:'initial'});
    else if(changed)entries.push({draft,item,intent:'replace'});
    else if(includeUnchanged)entries.push({draft,item,intent:'regenerate'});
  }
  return entries;
}

/** Older prototypes did not store submitted text; establish a baseline before editing. */
export function restoreGenerationInput(item:Item):void {
  if(item.lastGeneratedInput||!item.candidate)return;
  const latest=[...item.candidates,item.candidate].sort((a,b)=>b.createdAt-a.createdAt)[0];
  item.lastGeneratedInput=generationInput({name:latest.name,description:item.description});
}

export function generationAction(item:Item):'generate'|'regenerate'|'regenerating' {
  if(['queued','generating','cutting'].includes(item.status))return 'regenerating';
  const input=generationInput(item),previous=item.lastGeneratedInput;
  return item.candidate&&previous&&sameGenerationInput(input,previous)
    ?'regenerate':'generate';
}

/** Batch cards distinguish an explicit retry from a changed/new list item. */
export function batchProgressKey(item:Item):'queue'|'batchGenerating'|'batchRegenerating'|undefined {
  if(!['queued','generating','cutting'].includes(item.status))return undefined;
  if(item.generationIntent==='regenerate')return 'batchRegenerating';
  return item.status==='queued'?'queue':'batchGenerating';
}
