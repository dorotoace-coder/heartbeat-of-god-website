import { supabase } from '@/lib/supabase';
import type { Answer } from './questions';
export type RecordTable = 'hm_care'|'hm_registry'|'hm_logistics';
export type StoredRecord = {case_id:string;payload:Record<string,unknown>;version:number};
export type CaseSummary = {id:string;display_name:string;lane:string;status:string;track:'discernment'|'preparation';next_action:string;next_due:string|null;none_reason:string;version:number};
export type Access = {case_id:string;scope:'counsellor'|'records'|'coordinator'|'participant'};
export type StoredAnswer = {case_id:string;author_id:string;question_key:string;answer:string;visibility:'sealed'|'shared';version:number};
async function bounded<T>(work:(signal:AbortSignal)=>PromiseLike<T>):Promise<T> {
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try{return await work(controller.signal);} finally{clearTimeout(timeout);}
}
export async function loadWorkspace() {
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)throw new Error('Sign in to open this workspace.');
 const [cases,access,capability]=await Promise.all([
 bounded(signal=>supabase.rpc('hm_list_cases').abortSignal(signal)),
 bounded(signal=>supabase.rpc('hm_my_access').abortSignal(signal)),
 bounded(signal=>supabase.rpc('hm_can_create').abortSignal(signal))]);
 if(cases.error||access.error||capability.error)throw new Error('The marriage workspace is unavailable. No records have been loaded.');
 return {userId:user.id,canCreate:capability.data===true,cases:cases.data as CaseSummary[],access:access.data as Access[]};
}
export async function loadRecord(table:RecordTable,caseId:string):Promise<StoredRecord> {
 const result=await bounded(signal=>supabase.rpc('hm_get_record',{target:caseId,kind:table}).abortSignal(signal));
 if(result.error||!result.data)throw new Error('This record could not be opened. Check your assignment or try again.');
 return result.data as StoredRecord;
}
export async function saveRecord(table:RecordTable,record:StoredRecord,payload:Record<string,unknown>):Promise<StoredRecord> {
 const result=await bounded(signal=>supabase.rpc('hm_save_record',{target:record.case_id,kind:table,expected_version:record.version,body:payload}).abortSignal(signal));
 if(result.error?.code==='PT409')throw new Error('The record changed. Reopen it before saving again.');
 if(result.error)throw new Error('Save failed. Your draft is still here. Check required fields and try again.');
 if(!result.data)throw new Error('The record changed or access was revoked. Reopen it before saving again.');
 return result.data as StoredRecord;
}
export async function loadAnswers(caseId:string):Promise<StoredAnswer[]> {
 const result=await bounded(signal=>supabase.rpc('hm_get_answers',{target:caseId}).abortSignal(signal));
 if(result.error)throw new Error('Answers could not be loaded.');return result.data as StoredAnswer[];
}
export async function saveOwnAnswer(caseId:string,_userId:string,key:string,answer:Answer,previous?:StoredAnswer):Promise<StoredAnswer> {
 const result=await bounded(signal=>supabase.rpc('hm_save_answer',{target:caseId,key,body:answer.text,share:answer.visibility,expected_version:previous?.version??null}).abortSignal(signal));
 if(result.error||!result.data)throw new Error('An answer could not be saved or changed elsewhere. Earlier answers may have saved. Reopen the questionnaire to reconcile before retrying.');
 return result.data as StoredAnswer;
}
export async function createCase(name:string,lane:string):Promise<void> {
 const result=await bounded(signal=>supabase.rpc('hm_create_case',{case_name:name,case_lane:lane}).abortSignal(signal));
 if(result.error)throw new Error('Case creation failed or is not permitted for your account.');
}

export async function marriageRpc<T>(name:string,args:Record<string,unknown>):Promise<T> {
 const result=await bounded(signal=>supabase.rpc(name,args).abortSignal(signal));
 if(result.error)throw new Error('This action could not complete. Check your permissions and the information provided, then try again.');
 return result.data as T;
}
