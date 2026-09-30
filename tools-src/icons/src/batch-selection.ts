import type {AppState, BatchDraft} from './types';

/** Remove confirmed draft IDs together, keeping their linked results in sync. */
export function removeBatchDrafts(
  state:Pick<AppState,'batch'|'batchDrafts'|'batchNames'>,
  ids:readonly string[],
  createEmptyDraft:()=>BatchDraft,
):string[] {
  const drafts=state.batchDrafts??[];
  const requested=new Set(ids),removed=drafts.filter(draft=>requested.has(draft.id)).map(draft=>draft.id);
  if(!removed.length)return [];
  const removedIds=new Set(removed);
  // A running result must remain attached until its request finishes. Abort the
  // entire deletion rather than silently deleting only part of the confirmation.
  if(state.batch.some(item=>item.batchDraftId&&removedIds.has(item.batchDraftId)&&['queued','generating','cutting'].includes(item.status)))return [];
  state.batch=state.batch.filter(item=>!item.batchDraftId||!removedIds.has(item.batchDraftId));
  state.batchDrafts=drafts.filter(draft=>!removedIds.has(draft.id));
  if(!state.batchDrafts.length)state.batchDrafts=[createEmptyDraft()];
  state.batchNames=state.batchDrafts.map(draft=>draft.name.trim()).filter(Boolean).join('\n');
  return removed;
}
