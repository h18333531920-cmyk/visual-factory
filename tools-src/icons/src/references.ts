import type {Item} from './types';
export const REFERENCE_LIMIT=2;
export function referencesFor(item:Pick<Item,'reference'|'references'>):string[]{return item.references??(item.reference?[item.reference]:[]);}
export function setReferences(item:Pick<Item,'reference'|'references'>,references:string[]):void{if(references.length>REFERENCE_LIMIT)throw Error('referenceLimit');item.references=[...references];delete item.reference;}
