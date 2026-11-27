const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let result={data:null,error:null};
const query=new Proxy({}, {get(_,key){if(key==='then')return (resolve,reject)=>Promise.resolve(result).then(resolve,reject);return ()=>query;}});
const supabase={from:()=>query,rpc:()=>query,auth:{getUser:async()=>({data:{user:{id:'synthetic-user'}},error:null})}};
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/marriages/repository.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,require:()=>({supabase}),AbortController,setTimeout,clearTimeout});
(async()=>{
 const record={case_id:'synthetic-case',payload:{},version:1};
 result={data:null,error:{message:'network'}};
 await assert.rejects(()=>out.saveRecord('hm_care',record,{}),/Save failed/);
 result={data:null,error:null};
 await assert.rejects(()=>out.saveRecord('hm_care',record,{}),/changed or access was revoked/);
 result={data:{...record,version:2},error:null};
 assert.equal((await out.saveRecord('hm_care',record,{})).version,2);
 result={data:null,error:{message:'duplicate'}};
 await assert.rejects(()=>out.saveOwnAnswer('c','u','meaning_1',{text:'synthetic',visibility:'sealed'}),/could not be saved/);
 result={data:null,error:null};
 await assert.rejects(()=>out.saveOwnAnswer('c','u','meaning_1',{text:'synthetic',visibility:'sealed'},{version:1}),/could not be saved/);
 console.log('PASS: save errors, stale/revoked updates, confirmed version and failed answer writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
