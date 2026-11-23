import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context = await browser.newContext({viewport:{width:390,height:844}});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid='00000000-0000-4000-8000-000000000001';
const worker='00000000-0000-4000-8000-000000000002';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const yesterday=new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10);
const tomorrow=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
let workspace='pastor', fail=false, created=0, lastPayload=null, saved=0;
const requests=[{id:'example-visitor',kind:'visitor',full_name:'Example Visitor',phone:null,address:null,followup_date:yesterday,assigned_to:worker,completed_at:null,closure_outcome:null},
{id:'example-unassigned',kind:'ministry',full_name:'Example Ministry',phone:null,address:null,followup_date:tomorrow,assigned_to:null,completed_at:null,closure_outcome:null}];
const outreach=[{id:'example-outreach',full_name:'Example Outreach',phone:null,address:null,followup_date:today,assigned_to:worker,completed_at:null,closure_outcome:null}];
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'test-only'].join('.');
await context.addInitScript(({uid,token})=>localStorage.setItem('sb-placeholder-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic-only',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',role:'authenticated',email:'test@example.com'}})),{uid,token});
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='127.0.0.1')return route.continue();
 if(u.hostname!=='placeholder.supabase.co')return route.abort();
 const path=u.pathname;
 let result=[];
 if(path==='/auth/v1/user') result={id:uid,aud:'authenticated',role:'authenticated',email:'test@example.com'};
 else if(path.endsWith('/rpc/staff_workspace'))result=workspace;
 else if(path.endsWith('/profiles'))result={full_name:'Example Pastor',role:'pastor'};
 else if(path.endsWith('/outreach_workers'))result=[{user_id:worker,full_name:'Example Worker'},{user_id:uid,full_name:'Example Lead'}];
 else if(path.endsWith('/rpc/create_ministry_followup')){
   created++;lastPayload=route.request().postDataJSON();
   requests.push({id:lastPayload.p_id,kind:lastPayload.p_kind,full_name:lastPayload.p_name,phone:null,address:null,followup_date:lastPayload.p_due,assigned_to:lastPayload.p_worker,completed_at:null,closure_outcome:null});
   result=null;
 } else if(path.endsWith('/rpc/record_ministry_followup')){
   const body=route.request().postDataJSON();lastPayload=body;saved++;
   requests.find(item=>item.id===body.p_contact).followup_date=body.p_next_due;result=null;
 } else if(path.endsWith('/ministry_followup_requests') || path.endsWith('/outreach_contacts')){
   if(fail)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Synthetic access error'})});
   const list=path.endsWith('/outreach_contacts')?outreach:requests;
   result=list.filter(row=>u.searchParams.get('completed_at')==='is.null'?!row.completed_at:!!row.completed_at);
 }
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
});
try {
 await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3217')+'/admin?view=followup');
 await page.getByRole('heading',{name:'Visitor & ministry follow-up'}).waitFor();
 await page.getByRole('heading',{name:'Example Visitor',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'phone layout overflows');
 await page.getByLabel('Find a person').fill('Missing');
 assert.equal(await page.getByRole('heading',{name:'Example Visitor',exact:true}).count(),0);
 await page.getByLabel('Find a person').fill('');
 await page.getByLabel(/^Source/).selectOption('visitor');
 assert.equal(await page.getByRole('heading',{name:'Example Outreach',exact:true}).count(),0);
 await page.getByLabel(/^Source/).selectOption('all');
 const newForm=page.locator('form').filter({has:page.getByRole('button',{name:'Add follow-up',exact:true})});
 await newForm.getByLabel('Full name',{exact:true}).fill('Example New Visitor');
 await newForm.getByLabel('Next contact date',{exact:true}).fill(today);
 await page.getByRole('button',{name:'Add follow-up',exact:true}).click();
 assert.equal(created,0,'consent required');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Add follow-up',exact:true}).click();
 await page.getByRole('heading',{name:'Example New Visitor',exact:true}).waitFor();
 assert.equal(created,1);assert.equal(lastPayload.p_permission,true);
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Example Visitor',exact:true})});
 await card.getByText('Record a contact or handoff',{exact:true}).click();
 await card.getByLabel('Brief handoff note').fill('Synthetic conversation note');
 await card.getByLabel('Next contact date').fill(tomorrow);
 await card.getByRole('button',{name:'Save follow-up'}).click();
 await page.getByRole('button',{name:'Refresh board',exact:true}).waitFor();
 await expect.poll(()=>saved).toBe(1);assert.equal(lastPayload.p_contact,'example-visitor');
 await expect(page.getByRole('button',{name:'Refresh board',exact:true})).toBeEnabled();
 await page.getByLabel(/^Assignment/).selectOption('unassigned');
 assert.equal(await page.getByRole('heading',{name:'Example Visitor',exact:true}).count(),0);
 await page.getByLabel(/^Assignment/).selectOption('all');
 fail=true;
 await page.getByRole('button',{name:'Refresh board',exact:true}).click();
 await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('heading',{name:'Example Visitor',exact:true}).count(),0,'stale private cards remain');
 assert.equal(await page.getByRole('button',{name:'Add follow-up',exact:true}).isDisabled(),true);
 fail=false;await page.getByRole('button',{name:'Refresh board',exact:true}).click();
 await page.getByRole('heading',{name:'Example Visitor',exact:true}).waitFor();
 if(process.env.SCREENSHOT_PATH)await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'desktop layout overflows');
 if(process.env.SCREENSHOT_PATH)await page.screenshot({path:process.env.SCREENSHOT_PATH.replace('.png','-desktop.png'),fullPage:true});
 workspace='evangelism';await page.reload();
 await page.getByRole('heading',{name:'Visitor & ministry follow-up'}).waitFor();
 await page.getByRole('button',{name:'Refresh board',exact:true}).waitFor();
 assert.equal(await page.getByLabel(/^Assigned worker/).count(),0);
 console.log('PASS: phone layout, name/source/assignment filtering, consent, create, record follow-up, fail-closed refresh, recovery, worker entry point');
} finally {await browser.close();}
