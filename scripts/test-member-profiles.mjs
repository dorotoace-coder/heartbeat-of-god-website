import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import{createRequire}from'node:module';import{runInNewContext}from'node:vm';
import ts from'typescript';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
const require=createRequire(import.meta.url);
function load(file,state){let hook=0;const exports={};runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(id)=>{
 if(id==='react')return {...React,useState:(initial)=>[hook<state.length?state[hook++]:initial,()=>{}],useEffect:()=>{}};
 if(id==='next/navigation')return {useRouter:()=>({push:()=>{}})};
 if(id==='next/link')return {__esModule:true,default:(props)=>React.createElement('a',props)};
 if(id==='next/image')return {__esModule:true,default:({priority,...props})=>React.createElement('img',props)};
 if(id.endsWith('.module.css'))return new Proxy({},{get:(_,key)=>String(key)});
 if(id==='@/lib/auth/callback')return {safeCallback:()=>'/admin'};
 if(id==='@/components/ui/MinistryLogo')return {__esModule:true,default:()=>React.createElement('img',{alt:'HBG'})};
 if(id==='@/lib/supabase')return {supabase:{}};
 if(id==='@/components/auth/ForgotPassword')return {__esModule:true,default:()=>React.createElement('button',null,'Forgot password?')};
 return require(id);
}});return renderToStaticMarkup(React.createElement(exports.default));}
for(const mode of ['signin','signup']){
 // Hook order: showPassword, email, fullName, password, loading, error, success, mode.
 const html=load('src/app/login/page.tsx',[false,'','','',false,'','',mode]);
 assert.ok(html.includes('HBG PulseOS'));assert.ok(html.includes('/hbg-logo-premium.png'));
 assert.ok(!/System Uplink|Terminal Access|Register New Unit|Initialize Subsystem|Beacon Status/.test(html));
 assert.ok(html.includes('Email'));assert.ok(html.includes('Password'));
 assert.equal(html.includes('Full name'),mode==='signup',`Full name shown only when creating an account (${mode})`);
}
const profile={full_name:'Synthetic Visitor',email:'person@example.invalid',phone:'',address:'',member_type:'exploring',department_id:'',ministry_emails:false,partnership_invitations:false,reviewed_at:null};
const html=load('src/components/admin/MemberProfile.tsx',[profile,[{id:'synthetic-department',name:'Sanitary Department'}],'Ready',false]);
assert.ok(html.includes('Phone number (optional)'));assert.ok(html.includes('Address (optional)'));assert.ok(html.includes('Sanitary Department'));
assert.ok(!html.includes(' checked=""'),'contact preferences must not be preselected');
assert.ok(html.includes('staff review')||html.includes('Staff review'));assert.ok(html.includes('not a department appointment'));
console.log('PASS branded sign-in/sign-up, real logo, plain-language labels, optional contact fields, department interest, unchecked email choices and staff-review disclosure.');
