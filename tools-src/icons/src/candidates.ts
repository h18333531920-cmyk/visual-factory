import type { Candidate, Item } from './types';

export const CANDIDATE_PAGE_SIZE = 6;
export const MAX_CANDIDATES = 10;

/** Includes the selected result and reads older snapshots that excluded it. */
export function getCandidates(item: Item): Candidate[] {
  const byId = new Map(item.candidates.map(candidate => [candidate.id, candidate]));
  if (item.candidate) byId.set(item.candidate.id, item.candidate);
  return [...byId.values()].sort((a, b) =>
    a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function cloneCandidateMetadata(candidate:Candidate):Candidate {
  return {...candidate,settings:structuredClone(candidate.settings),strokes:structuredClone(candidate.strokes),generation:candidate.generation?{...candidate.generation}:undefined};
}

function snapshotCandidates(item: Item): Candidate[] {
  if (item.candidate) item.candidate.settings = structuredClone(item.settings);
  // Image data URLs are immutable strings and can be safely reused. Copy only
  // mutable metadata so switching a 10-image history never clones tens of MB.
  return getCandidates(item).map(cloneCandidateMetadata);
}

/** Selection never changes ordering or substitutes another thumbnail in its slot. */
export function selectCandidate(item: Item, id: string): boolean {
  if (item.candidate?.id === id || !getCandidates(item).some(candidate => candidate.id === id)) return false;
  const candidates = snapshotCandidates(item);
  const selected = candidates.find(candidate => candidate.id === id)!;
  item.candidates = candidates;
  item.candidate = selected;
  item.settings = structuredClone(selected.settings);
  return true;
}

/** Remove one version while keeping a valid active candidate and isolated edits. */
export function removeCandidate(item:Item,id:string):Candidate|undefined {
  const candidates=snapshotCandidates(item),index=candidates.findIndex(candidate=>candidate.id===id);
  if(index<0||candidates.length<=1)return undefined;
  const [removed]=candidates.splice(index,1),activeId=item.candidate?.id;
  const selected=activeId===id?candidates[Math.min(index,candidates.length-1)]:candidates.find(candidate=>candidate.id===activeId);
  if(!selected)return undefined;
  item.candidates=candidates;item.candidate=selected;item.settings=structuredClone(selected.settings);
  return removed;
}

/** Page size controls rendering independently of the ten-version retention limit. */
export function getCandidatePage(item: Item, requestedPage?: number) {
  const candidates = getCandidates(item);
  const selectedIndex = Math.max(0, candidates.findIndex(candidate => candidate.id === item.candidate?.id));
  const selectedPage = Math.floor(selectedIndex / CANDIDATE_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(candidates.length / CANDIDATE_PAGE_SIZE));
  const page = Math.max(0, Math.min(pageCount - 1,
    requestedPage !== undefined && Number.isFinite(requestedPage) ? Math.floor(requestedPage) : selectedPage));
  const start = page * CANDIDATE_PAGE_SIZE;
  return { candidates: candidates.slice(start, start + CANDIDATE_PAGE_SIZE),
    total: candidates.length, page, pageCount, selectedPage, start };
}

/** Return evicted versions so the UI can explain the first automatic removal. */
export function addCandidate(item: Item, candidate: Candidate): Candidate[] {
  const candidates = snapshotCandidates(item).filter(previous => previous.id !== candidate.id);
  candidates.push(candidate);
  candidates.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const removed = candidates.slice(0, Math.max(0, candidates.length - MAX_CANDIDATES));
  item.candidates = candidates.slice(-MAX_CANDIDATES);
  item.candidate = candidate;
  item.settings = structuredClone(candidate.settings);
  return removed;
}

type LimitNoticeState = { candidateLimitNoticeShown?: boolean; candidateLimitNoticePending?: boolean };

export function queueCandidateLimitNotice(state: LimitNoticeState, removedCount: number): void {
  if (removedCount > 0 && !state.candidateLimitNoticeShown) state.candidateLimitNoticePending = true;
}

/** Persist both flags with the project snapshot, so reopening does not repeat the notice. */
export function consumeCandidateLimitNotice(state: LimitNoticeState): boolean {
  if (!state.candidateLimitNoticePending || state.candidateLimitNoticeShown) return false;
  state.candidateLimitNoticePending = false;
  state.candidateLimitNoticeShown = true;
  return true;
}

export function candidateUndoKey(item: Item): string {
  return `${item.id}:${item.candidate?.id ?? ''}`;
}

/** A display/export name belongs to a result, never to its generation prompt. */
export function renameCandidate(item:Item,id:string,value:string):boolean {
  const name=value.trim();
  if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name))return false;
  if(!getCandidates(item).some(candidate=>candidate.id===id))return false;
  for(const candidate of item.candidates)if(candidate.id===id)candidate.name=name;
  if(item.candidate?.id===id)item.candidate.name=name;
  return true;
}
