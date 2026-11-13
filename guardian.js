// Independently scheduled guardian: remains alive when the ScoreZaap app fails.
// Uses no LLM tokens for routine health checks.
import {notify,VERSION} from './autopilot.js';
export const CHECKS=[['homepage','/'],['scores','/api/scores'],['news','/api/news'],['sitemap','/sitemap.xml'],['automation','/api/automation-health']];
export function validResponse(kind,status,text){
  if(status!==200)return false;
  if(kind==='homepage')return /ScoreZaap/.test(text)&&text.includes('id="scores"');
  if(kind==='sitemap')return text.includes('<urlset')&&text.includes('scorezaap.tech');
  let j;try{j=JSON.parse(text)}catch{return false}
  if(kind==='scores')return ['cricket','football','nba','mlb','nhl','tennis','f1'].some(s=>Array.isArray(j[s])&&j[s].length>0);
  if(kind==='news')return Array.isArray(j.items)&&j.items.length>0;
  if(kind==='automation')return j.state==='ok';
  return false;
}
async function store(env,value){await env.DB.prepare('INSERT INTO sz_autopilot(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind('guardian',JSON.stringify(value),Date.now()).run()}
export async function check(env,fetcher=fetch){
  if(env.AUTOPILOT_DISABLED==='true')return {state:'disabled'};
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS sz_autopilot(id TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL)').run();
  const oldRow=await env.DB.prepare('SELECT value FROM sz_autopilot WHERE id=?').bind('guardian').first();
  const old=oldRow?JSON.parse(oldRow.value):{};
  const failed=[];
  // Sequential and bounded: 5 reads/hour, no scraping or logged-in polling.
  for(const [kind,path] of CHECKS){
    try{
      const r=await fetcher('https://scorezaap.tech'+path,{headers:{'User-Agent':'ScoreZaap-Guardian/1.0'},signal:AbortSignal.timeout(12000)});
      if(!validResponse(kind,r.status,await r.text()))failed.push(kind);
    }catch{failed.push(kind)}
  }
  const state={version:VERSION,at:new Date().toISOString(),state:failed.length?'degraded':'ok',failed,consecutive:failed.length?(old.consecutive||0)+1:0,incident:old.incident||null};
  if(env.CRON_SECRET){
    try{
      // Existing bounded internal repair planner, not arbitrary code execution.
      const r=await fetcher('https://scorezaap.tech/api/autopilot/run',{method:'POST',headers:{'x-refresh-token':env.CRON_SECRET},signal:AbortSignal.timeout(25000)});
      state.repair=r.ok?'checked':'unavailable';if(!r.ok)failed.push('autopilot');
      if(new Date().getUTCHours()===5){
        const daily=await fetcher('https://scorezaap.tech/api/autopilot/run?mode=daily',{method:'POST',headers:{'x-refresh-token':env.CRON_SECRET},signal:AbortSignal.timeout(25000)});
        state.daily=daily.ok?'requested':'unavailable';
      }
    }catch{state.repair='unavailable';failed.push('autopilot')}
  }
  state.state=failed.length?'degraded':'ok';
  if(failed.length&&!state.consecutive)state.consecutive=(old.consecutive||0)+1;
  // Confirm broad outage or repeated degraded checks before major-issue email.
  const major=failed.includes('homepage')&&failed.includes('scores') || state.consecutive>=2;
  const key=failed.join('|');
  if(major&&key!==old.incident?.key){
    const incident={key,jobs:failed,at:state.at};
    const mail=await notify(env,incident);state.mail=mail;
    if(mail.state==='accepted')state.incident=incident;
  }else if(!failed.length&&old.incident){
    const mail=await notify(env,old.incident,true);state.mail=mail;
    if(mail.state==='accepted')state.incident=null;
  }
  await store(env,state);return state;
}
export default {
  async scheduled(event,env,ctx){ctx.waitUntil(check(env).catch(()=>console.error('guardian_check_failed')))},
  async fetch(request,env){
    const url=new URL(request.url);
    if(!env.CRON_SECRET||request.headers.get('x-refresh-token')!==env.CRON_SECRET)return new Response('Not found',{status:404});
    if(url.pathname==='/run'&&request.method==='POST')return Response.json(await check(env));
    if(url.pathname==='/status'){
      const row=await env.DB.prepare('SELECT value FROM sz_autopilot WHERE id=?').bind('guardian').first();
      return new Response(row?.value||'{}',{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
    return new Response('Not found',{status:404});
  }
};
