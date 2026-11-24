import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
// Exercise rendered route states without connecting to any account or database.
function render(workspace,ready,view){
 let call=0;const state=[workspace,ready,'Assignment pending'];
 const hooks={...React,useState:()=>[state[call++],()=>{}],useEffect:()=>{}};
 const page={};
 runInNewContext(output('src/app/admin/page.tsx'),{exports:page,require:(name)=>{
  if(name==='react')return hooks;
  if(name==='next/navigation')return {useSearchParams:()=>({get:()=>view})};
  if(name==='@/lib/supabase')return {supabase:{}};
  if(name.startsWith('@/components/admin/')){
   const marker=name.split('/').at(-1);
   return {__esModule:true,default:()=>React.createElement('div',{'data-component':marker})};
  }
  return require(name);
 }});
 return renderToStaticMarkup(React.createElement(page.default));
}
assert.ok(!render(null,false,'help').includes('data-component="PulseHelp"'),'Help rendered before identity was ready');
for(const workspace of [null,'pastor','media','school','attendance','treasury','evangelism']){
 const html=render(workspace,true,'help');
 assert.ok(html.includes('data-component="PulseHelp"'),`Help missing for ${workspace}`);
 assert.ok(!html.includes('data-component="TreasurySummary"'),'Help opened operational records');
}
assert.ok(render('school',true,'treasury').includes('This section is restricted'));
assert.ok(!render(null,true,'treasury').includes('data-component="TreasurySummary"'));
console.log('PASS: complete menu coverage, source-pack alignment, bounded scripts, identity gate, all-role help access and retained workspace restrictions.');
