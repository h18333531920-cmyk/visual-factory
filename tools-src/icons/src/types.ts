import type { ImageSettings, MaskStroke } from './image-engine';
export type JobStatus = 'idle'|'queued'|'generating'|'cutting'|'ready'|'failed'|'unresolved'|'cancelled';
export interface GenerationInput {name:string; description:string; combineForms?:boolean;}
export interface BatchDraft {id:string; name:string; description:string; expanded:boolean; combineForms?:boolean;}
export interface Candidate {
 id:string; source:string; name:string; createdAt:number; settings:ImageSettings; strokes:MaskStroke[];
 originalSource?:string; processing?:'local-light-background-v1'|'veimagex-product-v1'|'koukoutu-background-v1'; sourceGenerationJobId?:string;
 provenance:'sample'|'upload'|'ai'; sampleId?:string;
 generation?:{jobId:string;model:string;provider:string;promptVersion:string;providerRequestId?:string};
}
export interface Item {
 id:string; name:string; description:string; model:string; composition:string;
 batchDraftId?:string;
 combineForms?:boolean;
 generationIntent?:'initial'|'regenerate'|'replace';
 localProcessing?:boolean; reference?:string; references?:string[]; rawGeneratedSource?:string; localCutoutPreview?:string; rawGenerationInput?:GenerationInput; rawGenerationJobId?:string; status:JobStatus; error?:string; candidate?:Candidate; settings:ImageSettings;
 candidates:Candidate[]; selected:boolean; review:'draft'|'pending'|'approved'|'rejected'; reason?:string;
 createdAt:number; attempt:number; demo:'normal'|'failure'|'unknown';
 lastGeneratedInput?:GenerationInput;
 generationJob?:{id:string;input:GenerationInput;submitted:boolean};
}
export interface AppState {
 version:1; mode:'single'|'batch'; single:Item; batchNames:string; batch:Item[];
 batchDrafts?:BatchDraft[];
 globalBackground?:{bgColor:string;transparent:boolean};
 batchSettings:ImageSettings; history:Item[];
 candidateLimitNoticeShown?:boolean; candidateLimitNoticePending?:boolean;
}
