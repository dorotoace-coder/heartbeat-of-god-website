import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const output = file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const library={};runInNewContext(output('src/lib/help/guides.ts'),{exports:library,require});
const guideIds=new Set(library.pulseGuides.map(guide=>guide.id));
// Ensure every navigation workspace remains represented when menus evolve.
const nav=readFileSync('src/components/admin/PastorDashboard.tsx','utf8').split('const navigation = [')[1].split('] as const')[0];
for(const [,id] of nav.matchAll(/\["([a-z]+)",/g)){
 if(id==='help')continue;
 assert.ok(guideIds.has(id==='members'?'intake':id),`Missing workspace guide: ${id}`);
}
const pack=library.videoSourcePack();
assert.equal(pack,readFileSync('public/help/pulse-os-tutorial-source.txt','utf8'),'Download pack drifted; rerun exporter');
assert.ok(!pack.includes('service_role'));
assert.ok(library.pulseGuides.filter(guide=>guide.narration).every(guide=>guide.seconds<=90));
// Every advertised clip must have real local media, a poster, captions and a transcript.
const videos={};runInNewContext(output('src/lib/help/videos.ts'),{exports:videos,require});
assert.equal(videos.pulseVideos.length,8);
assert.equal(new Set(videos.pulseVideos.map(video=>video.id)).size,8);
for(const video of videos.pulseVideos){
 assert.ok(library.pulseGuides.find(guide=>guide.id===video.id)?.narration);
 assert.ok(video.seconds>0 && video.seconds<=90);
 for(const asset of [video.src,video.poster,video.captions]){
  assert.ok(existsSync(`public${asset}`),`Missing clip asset ${asset}`);
  assert.ok(statSync(`public${asset}`).size>100);
 }
 assert.ok(readFileSync(`public${video.captions}`,'utf8').startsWith('WEBVTT'));
}
const helpSource=readFileSync('src/components/admin/PulseHelp.tsx','utf8');
assert.ok(helpSource.includes('controls playsInline preload="none"'));
assert.ok(helpSource.includes('kind="captions"'));
assert.ok(!helpSource.includes('autoPlay'));
// Render the video tab to verify the shipped player markup, transcripts and lazy loading.
const helpModule={};let helpHook=0;
const helpReact={...React,useState:()=>[["","treasury","video"][helpHook++],()=>{}]};
runInNewContext(output('src/components/admin/PulseHelp.tsx'),{exports:helpModule,require:(name)=>{
 if(name==='react')return helpReact;
 if(name==='@/lib/help/guides')return library;
 if(name==='@/lib/help/videos')return videos;
 if(name==='next/image')return {__esModule:true,default:(props)=>React.createElement('img',props)};
 if(name==='next/link')return {__esModule:true,default:(props)=>React.createElement('a',props)};
 return require(name);
}});
const videoMarkup=renderToStaticMarkup(React.createElement(helpModule.default));
assert.equal((videoMarkup.match(/<video /g)||[]).length,8);
assert.equal((videoMarkup.match(/<track /g)||[]).length,8);
assert.equal((videoMarkup.match(/Read the transcript/g)||[]).length,8);
assert.ok(!videoMarkup.includes('not playable videos'));
// Exercise rendered route states without connecting to any account or database.
function render(workspace,ready,view){
 let call=0;const state=[workspace,ready,'Assignment pending'];
 const hooks={...React,useState:()=>[state[call++],()=>{}],useEffect:()=>{}};
 // Routing lives in StaffWorkspace; the admin page only wraps it in Suspense.
 const page={};
 runInNewContext(output('src/components/admin/StaffWorkspace.tsx'),{exports:page,require:(name)=>{
  if(name==='react')return hooks;
  if(name==='next/navigation')return {useSearchParams:()=>({get:()=>view})};
  if(name==='@/lib/supabase')return {supabase:{}};
  if(name.startsWith('@/components/')||name.startsWith('./')){
   const marker=name.split('/').at(-1);
   return {__esModule:true,default:()=>React.createElement('div',{'data-component':marker})};
  }
  return require(name);
 }});
 return renderToStaticMarkup(React.createElement(page.default,{marriagesEnabled:false}));
}
// The admin page must keep delegating to StaffWorkspace, or the checks below test the wrong file.
const adminPage=readFileSync('src/app/admin/page.tsx','utf8');
assert.ok(/import StaffWorkspace from '@\/components\/admin\/StaffWorkspace'/.test(adminPage)&&adminPage.includes('<StaffWorkspace '),'Admin page no longer renders StaffWorkspace');
assert.ok(!render(null,false,'help').includes('data-component="PulseHelp"'),'Help rendered before identity was ready');
for(const workspace of [null,'pastor','media','school','attendance','treasury','evangelism']){
 const html=render(workspace,true,'help');
 assert.ok(html.includes('data-component="PulseHelp"'),`Help missing for ${workspace}`);
 assert.ok(!html.includes('data-component="TreasurySummary"'),'Help opened operational records');
}
assert.ok(render('school',true,'treasury').includes('This section is restricted'));
assert.ok(!render(null,true,'treasury').includes('data-component="TreasurySummary"'));
console.log('PASS: complete menu coverage, source-pack alignment, bounded scripts, identity gate, all-role help access and retained workspace restrictions.');

// General home must never open staff tools or render before identity verification.
for (const view of [null, 'treasury', 'media', 'departments']) {
 const html = render(null, true, view);
 assert.ok(html.includes('data-component="MemberHome"'));
 for (const name of ['TreasurySummary','PrivateMediaVault','PastorDashboard']) assert.ok(!html.includes(`data-component="${name}"`));
 assert.ok(!render(null,false,view).includes('data-component="MemberHome"'));
}
const home = {};
runInNewContext(output('src/components/admin/MemberHome.tsx'), {exports:home,require:(name)=>{
 if(name==='next/link')return {__esModule:true,default:(props)=>React.createElement('a',props)};
 if(name==='@/lib/supabase')return {supabase:{}};
 if(name==='@/components/ui/MinistryLogo')return {__esModule:true,default:()=>React.createElement('img',{alt:'HBG'})};
 return require(name);
}});
const homeHtml=renderToStaticMarkup(React.createElement(home.default,{name:'<Test> Person',restricted:true}));
assert.ok(homeHtml.includes('Welcome, &lt;Test&gt;'));
for(const href of ['/admin?view=help','/admin?view=training','/partnership','/departments']) assert.ok(homeHtml.includes(`href="${href}"`));
assert.ok(!homeHtml.includes('href="/admin?view=treasury"'));
assert.ok(homeHtml.includes('authorised staff assignment'));
assert.ok(homeHtml.includes('shadow-['));
console.log('PASS: member home identity gate, restricted-route isolation, safe navigation, escaped name and raised-card rendering.');

for (const workspace of [null,'media','pastor']) {
 assert.ok(render(workspace,true,'profile').includes('data-component="MemberProfile"'));
 assert.ok(!render(workspace,false,'profile').includes('data-component="MemberProfile"'));
}
console.log('PASS own-profile entry is available across roles only after identity readiness.');
