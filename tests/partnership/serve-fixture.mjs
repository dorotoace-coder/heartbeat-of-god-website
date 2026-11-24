// Isolated synthetic authentication adapter for the local browser test ONLY.
// It never connects to a hosted Supabase project or payment provider.
import http from 'node:http';
import {createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
const secret='partnership-local-fixture-secret-at-least-32-characters';
function token(payload){const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const data=`${enc({alg:'HS256',typ:'JWT'})}.${enc({...payload,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})}`;return `${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;}
const accounts={
 'partner@example.invalid':{id:'00000000-0000-4000-8000-000000000002',workspace:''},
 'pastor@example.invalid':{id:'00000000-0000-4000-8000-000000000003',workspace:'pastor'},
};
const user=(email,account)=>({id:account.id,email,aud:'authenticated',role:'authenticated',app_metadata:{workspace:account.workspace},user_metadata:{full_name:'Example Partner'},created_at:'2026-11-24T12:00:00Z',email_confirmed_at:'2026-11-24T12:00:00Z'});
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://localhost:3237');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 let body='';for await(const chunk of req)body+=chunk;
 try{
 if(req.url.startsWith('/rest/v1/')){const headers={...req.headers};delete headers.host;delete headers['content-length'];const response=await fetch('http://127.0.0.1:3235/'+req.url.slice('/rest/v1/'.length),{method:req.method,headers,...(body?{body}:{})});console.log('Fixture REST',req.method,req.url.split('?')[0],response.status);res.writeHead(response.status,{'content-type':response.headers.get('content-type')||'application/json'});res.end(await response.text());return;}
 res.setHeader('Content-Type','application/json');
 if(req.url.startsWith('/auth/v1/token')){const data=JSON.parse(body);const account=accounts[data.email];if(!account||data.password!=='fixture-only-password'){res.writeHead(400);res.end(JSON.stringify({error:'invalid_grant',error_description:'Fixture credentials required'}));return;}res.end(JSON.stringify({access_token:token({sub:account.id,role:'authenticated',email:data.email,app_metadata:{workspace:account.workspace}}),token_type:'bearer',expires_in:3600,refresh_token:'fixture-refresh',user:user(data.email,account)}));return;}
 if(req.url==='/auth/v1/user'){const auth=req.headers.authorization?.split(' ')[1];const claims=auth?JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString()):{};const account=Object.values(accounts).find(a=>a.id===claims.sub);if(!account){res.writeHead(401);res.end('{}');return;}res.end(JSON.stringify(user(claims.email,account)));return;}
 if(req.url.startsWith('/auth/v1/logout')){res.end('{}');return;}
 res.writeHead(404);res.end('{}');
 }catch{res.writeHead(500);res.end('{"error":"Fixture failed"}');}
});
server.listen(3236,'127.0.0.1',()=>console.log('Synthetic auth/REST fixture ready on 3236'));
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3236',NEXT_PUBLIC_SUPABASE_ANON_KEY:token({role:'anon'}),PARTNERSHIP_ENABLED:'true',PARTNERSHIP_STRIPE_ENABLED:'false'};
for(const key of ['STRIPE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','PARTNERSHIP_STRIPE_WEBHOOK_SECRET'])delete env[key];
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3237'],{env,stdio:'inherit'});
function stop(){next.kill('SIGTERM');server.close();}process.on('SIGINT',stop);process.on('SIGTERM',stop);next.on('exit',()=>server.close());
