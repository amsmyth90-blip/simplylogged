// Explicit opt-in live verification. Only creates and mutates labelled test users.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { build } from 'esbuild';

if (process.env.DIARYDOCK_E2E_CONFIRM !== 'two-test-accounts') throw new Error('Explicit two-test-account authorization required.');
env.loadEnvConfig(process.cwd());
const dir = '.qa-web-e2e'; fs.mkdirSync(dir, { recursive: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const base = 'http://127.0.0.1:3005';
const results = [];
const record = (name, pass, detail = '') => { results.push({ name, pass, detail }); fs.writeFileSync(`${dir}/results.json`, JSON.stringify(results,null,2)); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ': '+detail : ''}`); };
const fixturePath = `${dir}/accounts.json`;
let actors = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath,'utf8')) : [];
while (actors.length < 2) {
  const label = actors.length ? 'B' : 'A';
  const actor = { label, email: `hello+web-qa-${Date.now()}-${label.toLowerCase()}@diarydock.com`, password: `QA-${randomUUID()}!aA1` };
  const { data, error } = await admin.auth.admin.createUser({ email: actor.email, password: actor.password, email_confirm: true, user_metadata: { purpose: 'diarydock-web-e2e', name: `DiaryDock QA ${label}` } });
  if (error) throw new Error(`Create QA ${label}: ${error.message}`);
  actor.id = data.user.id; actors.push(actor); fs.writeFileSync(fixturePath, JSON.stringify(actors));
}
for (const actor of actors) {
  const verified = await admin.auth.admin.getUserById(actor.id);
  if (verified.error || verified.data.user?.user_metadata?.purpose !== 'diarydock-web-e2e'
      || verified.data.user.email !== actor.email) throw new Error('Refusing to mutate an account not created by this QA harness.');
  const cookies = new Map();
  actor.client = createServerClient(url,key,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))}});
  const {data,error}=await actor.client.auth.signInWithPassword({email:actor.email,password:actor.password});
  if(error) throw error;
  actor.cookie=()=>[...cookies].map(([name,value])=>`${name}=${value}`).join('; ');
  actor.token=data.session.access_token;
  record(`QA ${actor.label} password sign-in`,true);
}
const [a,b]=actors;
async function request(actor, route, options={}) {
  const response=await fetch(base+route,{...options,redirect:'manual',headers:{Cookie:actor?.cookie()||'',Origin:base,...options.headers},signal:AbortSignal.timeout(60000)});
  const body=await response.text(); let json; try{json=JSON.parse(body);}catch{}
  return {status:response.status,body,json,location:response.headers.get('location')};
}
await build({stdin:{contents:'export {createInitialDiaryDockState} from "@/lib/diarydock-initial-state";export {pickHouseholdState} from "@/lib/diarydock-state-merge";export {WEB_FEATURE_GROUPS} from "@/lib/web-features";',resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',alias:{'@':process.cwd()},outfile:`${dir}/fixtures.mjs`});
const {createInitialDiaryDockState,pickHouseholdState,WEB_FEATURE_GROUPS}=await import(pathToFileURL(path.resolve(`${dir}/fixtures.mjs`)).href);
for(const actor of actors){const boot=await request(actor,'/api/diarydock/bootstrap');actor.boot=boot.json;record(`QA ${actor.label} authenticated bootstrap`,boot.status===200&&boot.json.userId===actor.id,`HTTP ${boot.status}`);}
const state=createInitialDiaryDockState();state.settingsProfile.name='DiaryDock QA A';state.onboarding.householdName='DiaryDock QA test household';
const payload={privateRevision:a.boot.privateRevision,householdRevision:a.boot.householdRevision,privateState:state,householdState:pickHouseholdState(state)};
const save=await request(a,'/api/diarydock/state',{method:'POST',headers:{'Content-Type':'application/json','X-DiaryDock-Account':a.id},body:JSON.stringify(payload)});
record('Desktop save reaches database',save.status===200&&save.json?.status==='OK',`HTTP ${save.status} ${save.json?.error||''}`);
const reload=await request(a,'/api/diarydock/bootstrap');record('Saved profile survives fresh request',reload.json?.privateState?.settingsProfile?.name===state.settingsProfile.name);
const isolated=await request(b,'/api/diarydock/bootstrap');record('QA B cannot see QA A private state',!JSON.stringify(isolated.json).includes('DiaryDock QA A'));
const rls=await b.client.from('app_state').select('id').eq('id',a.id);record('Database ownership prevents cross-account read',!rls.error&&rls.data.length===0,`rows=${rls.data?.length??'none'} error=${rls.error?.message||'none'}`);
const mismatch=await request(b,'/api/diarydock/state',{method:'POST',headers:{'Content-Type':'application/json','X-DiaryDock-Account':a.id},body:JSON.stringify(payload)});record('Cross-account delayed write rejected',mismatch.status===409,`HTTP ${mismatch.status}`);
const stale=await request(a,'/api/diarydock/state',{method:'POST',headers:{'Content-Type':'application/json','X-DiaryDock-Account':a.id},body:JSON.stringify(payload)});record('Stale revision cannot overwrite newer changes',stale.status===409,`HTTP ${stale.status}`);
const anonymous=await request(null,'/api/diarydock/bootstrap');record('Anonymous account data blocked',anonymous.status===401);
if(process.argv.includes('--extended')) {
  const identity=await b.client.auth.getUser();record('Isolation probe uses QA B identity',identity.data.user?.id===b.id);
  const raw=await fetch(`${url}/rest/v1/app_state?id=eq.${a.id}&select=payload`,{headers:{apikey:key,Authorization:`Bearer ${b.token}`}});
  const rows=await raw.json();record('Raw QA B token cannot retrieve QA A marker',!JSON.stringify(rows).includes('DiaryDock QA A'),`HTTP ${raw.status}; only synthetic QA A row queried`);
  const forbidden=await b.client.from('app_state').update({payload:{qa:'unauthorized'}}).eq('id',a.id);record('Direct cross-owner update is denied',forbidden.error?.code==='42501');
  const post=async(route,body)=>request(a,route,{method:'POST',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  let planning=(await request(a,'/api/mobile/kitchen/planning')).json;
  const recipe={contentComplete:true,id:randomUUID(),version:1,name:'QA E2E recipe',time:'10 minutes',servings:2,image:'',ingredients:['1 apple'],instructions:'Slice the apple.',steps:[],favourite:false,source:'diarydock',sourceUrl:null};
  const created=await post('/api/mobile/kitchen/planning',{operation:'SAVE_RECIPE',revision:planning.revision,recipe});record('Recipe create via mobile API',created.status===200,`HTTP ${created.status} ${created.json?.error||''}`);
  const desktop=await request(a,'/api/diarydock/bootstrap');record('Mobile recipe visible to desktop bootstrap',JSON.stringify(desktop.json).includes(recipe.id));
  planning=created.json?.snapshot;
  if(planning){
    const changed=await post('/api/mobile/kitchen/planning',{operation:'TOGGLE_RECIPE_FAVOURITE',revision:planning.revision,recipeId:recipe.id});record('Recipe update persists',changed.json?.snapshot?.recipes.some(r=>r.id===recipe.id&&r.favourite)===true,`HTTP ${changed.status}`);
    const second=await post('/api/mobile/kitchen/planning',{operation:'SAVE_RECIPE',revision:changed.json?.snapshot?.revision,recipe:{...recipe,id:randomUUID(),name:'QA second recipe'}});
    const removed=await post('/api/mobile/kitchen/planning',{operation:'DELETE_RECIPE',revision:second.json?.snapshot?.revision,recipeId:recipe.id});record('Recipe deletion persists when another recipe remains',removed.status===200&&!removed.json?.snapshot?.recipes.some(r=>r.id===recipe.id),`HTTP ${removed.status} ${removed.json?.error||''}`);
  }
  const {PDFDocument}=await import('pdf-lib');const pdf=await PDFDocument.create();pdf.addPage().drawText('DiaryDock synthetic QA document');const bytes=await pdf.save();
  const prepared=await post('/api/documents/uploads/prepare',{documentId:randomUUID(),fileName:'diarydock-qa.pdf',mimeType:'application/pdf',size:bytes.length});record('Document quota and signed upload preparation',prepared.status===200,`HTTP ${prepared.status} ${prepared.json?.error||''}`);
  if(prepared.status===200){
    const p=prepared.json;const upload=await a.client.storage.from(p.bucket).uploadToSignedUrl(p.path,p.token,bytes,{contentType:'application/pdf'});record('Synthetic PDF reaches quarantine',!upload.error,upload.error?.message||'');
    const reminderId=randomUUID();
    const committed=await post('/api/documents/uploads/commit',{reservationId:p.reservationId,metadata:{title:'DiaryDock QA document',category:'Finance',roomName:'Office',actionItems:[],confirmedFields:[],reminder:{id:reminderId,title:'QA document reminder',timeLabel:'Next week'}}});record('Document validation and commit',committed.status===200,`HTTP ${committed.status}; scanner=${committed.json?.securityScanStatus||'unavailable'} ${committed.json?.error||''}`);
    if(committed.status===200){
      const own=await request(a,`/api/mobile/documents/${committed.json.documentId}/file`,{headers:{Authorization:`Bearer ${a.token}`}});record('Owner can retrieve uploaded document',own.status===200,`HTTP ${own.status}`);
      const other=await request(b,`/api/mobile/documents/${committed.json.documentId}/file`,{headers:{Authorization:`Bearer ${b.token}`}});record('Other account blocked from document delivery',other.status===403||other.status===404,`HTTP ${other.status}`);
      const loaded=await request(a,'/api/diarydock/bootstrap');record('Uploaded document appears in desktop records',loaded.json?.documents?.some(d=>d.id===committed.json.documentId)===true);
      record('Linked upload reminder appears in desktop records',loaded.json?.reminders?.some(r=>r.id===reminderId&&r.documentId===committed.json.documentId)===true);
    }
    fs.writeFileSync(`${dir}/upload-fixture.json`,JSON.stringify({owner:a.id,reservationId:p.reservationId,bucket:p.bucket,path:p.path,committed:committed.status===200}));
  }
  const ask=await post('/api/ask',{question:'What is in my DiaryDock?'});record('Ask response',ask.status===200,`HTTP ${ask.status}; usedAI=${ask.json?.usedAI} ${ask.json?.error||''}`);
  const inbound=await request(a,'/api/import/email-address');record('Inbound email configured',inbound.status===200&&inbound.json?.configured===true,`HTTP ${inbound.status}; configured=${inbound.json?.configured}`);
}
if(process.argv.includes('--state-only')) process.exit(results.some(r=>!r.pass)?1:0);
const pages=[...new Set(['/dashboard',...WEB_FEATURE_GROUPS.flatMap(g=>g.links.map(l=>l.href))])];
for(const route of pages){try{const r=await request(a,route);record(`Page ${route}`,r.status===200&&!r.body.includes('NEXT_HTTP_ERROR_FALLBACK;404')&&!r.body.includes('Internal Server Error'),`HTTP ${r.status}`);}catch(e){record(`Page ${route}`,false,e.message);}}
const apiRoutes=[];
function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,item.name);if(item.isDirectory())walk(full);else if(item.name==='route.ts'&&!full.includes('[')&&/export async function GET\(/.test(fs.readFileSync(full,'utf8')))apiRoutes.push('/'+path.relative('app',path.dirname(full)).replaceAll('\\','/'));}}
walk('app/api/mobile');
for(const route of apiRoutes){try{const r=await request(a,route,{headers:{Authorization:`Bearer ${a.token}`}});record(`Mobile API ${route}`,r.status===200,`HTTP ${r.status}${r.json?.error?' '+r.json.error:''}`);}catch(e){record(`Mobile API ${route}`,false,e.message);}}
record('Storage usage API', (await request(a,'/api/storage/summary')).status===200);
console.log(`Completed ${results.length} checks; ${results.filter(r=>!r.pass).length} failed. Test accounts retained for browser checks.`);
process.exitCode = results.some(r=>!r.pass) ? 1 : 0;
