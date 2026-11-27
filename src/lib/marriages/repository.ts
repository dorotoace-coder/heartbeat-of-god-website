import { supabase } from '@/lib/supabase';
import type { Answer } from './questions';
export type RecordTable = 'hm_care'|'hm_registry'|'hm_logistics';
export type StoredRecord = {case_id:string;payload:Record<string,unknown>;version:number};
export type CaseSummary = {id:string;display_name:string;lane:string};
export type Access = {case_id:string;scope:'counsellor'|'records'|'coordinator'|'participant'};
export type StoredAnswer = {case_id:string;author_id:string;question_key:string;answer:string;visibility:'sealed'|'shared';version:number};
async function bounded<T>(work:(signal:AbortSignal)=>PromiseLike<T>):Promise<T> {
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try{return await work(controller.signal);} finally{clearTimeout(timeout);}
}
export async function loadWorkspace() {
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)throw new Error('Sign in to open this workspace.');
 const [cases,access]=await Promise.all([
 bounded(signal=>supabase.from('hm_cases').select('id,display_name,lane').order('created_at',{ascending:false}).abortSignal(signal)),
 bounded(signal=>supabase.rpc('hm_my_access').abortSignal(signal))]);
 if(cases.error||access.error)throw new Error('The marriage workspace is unavailable. No records have been loaded.');
 return {userId:user.id,cases:cases.data as CaseSummary[],access:access.data as Access[]};
}
export async function loadRecord(table:RecordTable,caseId:string):Promise<StoredRecord> {
 const result=await bounded(signal=>supabase.from(table).select('case_id,payload,version').eq('case_id',caseId).abortSignal(signal).single());
 if(result.error||!result.data)throw new Error('This record could not be opened. Check your assignment or try again.');
 return result.data as StoredRecord;
}
export async function saveRecord(table:RecordTable,record:StoredRecord,payload:Record<string,unknown>):Promise<StoredRecord> {
 const result=await bounded(signal=>supabase.from(table).update({payload}).eq('case_id',record.case_id).eq('version',record.version).select('case_id,payload,version').abortSignal(signal).maybeSingle());
 if(result.error)throw new Error('Save failed. Your draft is still here. Check required fields and try again.');
 if(!result.data)throw new Error('The record changed or access was revoked. Reopen it before saving again.');
 return result.data as StoredRecord;
}
export async function loadAnswers(caseId:string):Promise<StoredAnswer[]> {
 const result=await bounded(signal=>supabase.from('hm_answers').select('case_id,author_id,question_key,answer,visibility,version').eq('case_id',caseId).abortSignal(signal));
 if(result.error)throw new Error('Answers could not be loaded.');return result.data as StoredAnswer[];
}
export async function saveOwnAnswer(caseId:string,userId:string,key:string,answer:Answer,previous?:StoredAnswer):Promise<StoredAnswer> {
 const payload={answer:answer.text,visibility:answer.visibility};
 const result=previous
 ? await bounded(signal=>supabase.from('hm_answers').update(payload).eq('case_id',caseId).eq('author_id',userId).eq('question_key',key).eq('version',previous.version).select().abortSignal(signal).maybeSingle())
 : await bounded(signal=>supabase.from('hm_answers').insert({...payload,case_id:caseId,author_id:userId,question_key:key}).select().abortSignal(signal).single());
 if(result.error||!result.data)throw new Error('An answer could not be saved or changed elsewhere. Earlier answers may have saved. Reopen the questionnaire to reconcile before retrying.');
 return result.data as StoredAnswer;
}
export async function createCase(name:string,lane:string):Promise<void> {
 const result=await bounded(signal=>supabase.rpc('hm_create_case',{case_name:name,case_lane:lane}).abortSignal(signal));
 if(result.error)throw new Error('Case creation failed or is not permitted for your account.');
}
