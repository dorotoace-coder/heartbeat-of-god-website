// Requires disposable localhost Auth fixtures; never run against a hosted project.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const authFile=process.env.HM_TEST_AUTH_ENV,usersFile=process.env.HM_TEST_USERS;
if(!authFile||!usersFile)throw Error('Supply local fixture file paths');
const env=Object.fromEntries(fs.readFileSync(authFile,'utf8').trim().split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')]}));
if(env.API_URL!=='http://127.0.0.1:55421')throw Error('Local-only guard');
const users=JSON.parse(fs.readFileSync(usersFile,'utf8')),tokens={};let count=0;
function pass(name){count++;console.log(`PASS ${name}`);}
async function call(who,name,args={},expected=200){const r=await fetch(`${env.API_URL}/rest/v1/rpc/${name}`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{apikey:env.ANON_KEY,Authorization:`Bearer ${tokens[who]??env.ANON_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(args)});assert.equal(r.status,expected,`${name} HTTP status`);return r.status===204?null:await r.json();}
(async()=>{
 for(const [name,u]of Object.entries(users)){const r=await fetch(`${env.API_URL}/auth/v1/token?grant_type=password`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{apikey:env.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:u.email,password:u.password})});assert.equal(r.status,200);tokens[name]=(await r.json()).access_token;}pass('six real local Auth sessions');
 const id=await call('counsellor','hm_create_case',{case_name:'Synthetic API regression',case_lane:'premarital'});
 const codeA=await call('counsellor','hm_issue_invite',{target:id});await call('partnera','hm_claim_invite',{code:codeA},204);
 assert.ok(!(await call('partnera','hm_list_cases')).some(c=>c.id===id));pass('claim grants no access');
 let pending=await call('counsellor','hm_pending_invites',{target:id});await call('counsellor','hm_review_invite',{invite_id:pending[0].id,approve:true,identity_checked:false},400);pass('identity confirmation required');
 await call('counsellor','hm_review_invite',{invite_id:pending[0].id,approve:true,identity_checked:true},204);
 const codeB=await call('counsellor','hm_issue_invite',{target:id});await call('partnerb','hm_claim_invite',{code:codeB},204);pending=await call('counsellor','hm_pending_invites',{target:id});await call('counsellor','hm_review_invite',{invite_id:pending[0].id,approve:true,identity_checked:true},204);
 await call('partnera','hm_claim_invite',{code:codeA},403);pass('invitation replay denied');
 await call('counsellor','hm_issue_invite',{target:id},400);pass('two-participant capacity');
 await call('partnera','hm_save_answer',{target:id,key:'meaning_2',body:'Synthetic sealed',share:'sealed'},403);pass('care consent required');
 await call('partnera','hm_record_consent',{target:id,reason:'care',decision:true,notice:'hm-privacy-v1'},204);
 await call('partnera','hm_save_answer',{target:id,key:'meaning_2',body:'Synthetic sealed',share:'sealed'});
 assert.equal((await call('partnerb','hm_get_answers',{target:id})).length,0);pass('sealed answer absent through real REST API');
 await call('partnera','hm_record_consent',{target:id,reason:'partner_sharing',decision:true,notice:'hm-privacy-v1'},204);
 await call('partnera','hm_save_answer',{target:id,key:'meaning_1',body:'Synthetic shared',share:'shared'});
 assert.equal((await call('partnerb','hm_get_answers',{target:id})).length,1);pass('explicitly shared answer visible');
 await call('partnera','hm_record_consent',{target:id,reason:'partner_sharing',decision:false,notice:'hm-privacy-v1'},204);
 assert.equal((await call('partnerb','hm_get_answers',{target:id})).length,0);pass('withdrawal suppresses future partner reads');
 const care=await call('counsellor','hm_get_record',{target:id,kind:'hm_care'});
 await call('counsellor','hm_save_record',{target:id,kind:'hm_care',expected_version:care.version,body:{background:'Synthetic'}});
 await call('counsellor','hm_save_record',{target:id,kind:'hm_care',expected_version:care.version,body:{}},409);pass('stale write rejected over REST');
 await call('outsider','hm_get_record',{target:id,kind:'hm_care'},403);await call('partnera','hm_get_record',{target:id,kind:'hm_care'},403);pass('unassigned and participant care access denied');
 const sql=`insert into marriages_private.assignments(case_id,user_id,scope) values('${id}','${users.records.id}','records'),('${id}','${users.coordinator.id}','coordinator');`;
 execFileSync('docker',['exec','-i','supabase_db_hbg-marriage-auth','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','pipe']});
 await call('records','hm_get_record',{target:id,kind:'hm_registry'});await call('records','hm_get_record',{target:id,kind:'hm_care'},403);await call('coordinator','hm_get_answers',{target:id},403);pass('staff scope separation over REST');
 await call('records','hm_save_record',{target:id,kind:'hm_registry',expected_version:1,body:{status:'Verified'}},400);pass('invalid registry claim rejected');
 const direct=await fetch(`${env.API_URL}/rest/v1/hm_answers?select=*`,{headers:{apikey:env.ANON_KEY,Authorization:`Bearer ${tokens.partnera}`}});assert.equal(direct.status,403);pass('direct table bypass denied');
 await call('partnera','hm_request_right',{target:id,request_kind:'deletion'});assert.equal((await call('partnerb','hm_rights_requests',{target:id})).length,0);pass('rights request isolated from partner');
 await call('counsellor','hm_retention',{target:id,review_date:'2027-01-01',hold:true,rationale:'Synthetic review'});pass('retention hold persisted');
 const ownExport=await call('partnera','hm_export_own',{target:id});assert.ok(ownExport.answers.every(a=>a.author_id===users.partnera.id));assert.equal(ownExport.answers.length,2);pass('own export excludes other participants');
 await call('counsellor','hm_revoke_participant',{target:id,person:users.partnera.id},204);await call('partnera','hm_get_answers',{target:id},403);pass('revocation effective over REST');
 const audit=await call('counsellor','hm_audit',{target:id});assert.ok(audit.some(a=>a.operation==='read'));assert.ok(audit.some(a=>a.object_name==='consent'));pass('read and consent audit events');
 await call('anonymous','hm_list_cases',{},401);pass('anonymous RPC denied');
 console.log(`${count} authenticated API scenarios passed; synthetic local records only.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
