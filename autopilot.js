// ScoreZaap standalone operations. No model output is executable code.
export const VERSION = '2026-11-13.1';
const HOUR = 3600000;
export const JOBS = ['scores', 'football', 'news', 'enrich'];
export function classify(debug, now = Date.now()) {
  return JOBS.filter(key => {
    const d = debug[key];
    const at = Date.parse(d?.at || '');
    return !Number.isFinite(at) || now - at > 75 * 60000 ||
      (d.stage === 'error' && now - at > 10 * 60000) || !!d.info?.failed;
  });
}
export function season(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const m = +p.find(x=>x.type==='month').value, d = +p.find(x=>x.type==='day').value;
  // Calendar-safe seasonal windows. No guessed moving religious holidays.
  if (m===12 && d>=20 && d<=31) return 'year-end';
  if (m===1 && d<=3) return 'new-year';
  return 'standard';
}
export function safeChoice(raw) {
  const value = typeof raw==='string' ? raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'') : '';
  let j;try{j=JSON.parse(value)}catch{return null}
  if (!j || !['base','winter','gold'].includes(j.palette) || !['comfortable','standard'].includes(j.density)) return null;
  return {palette:j.palette,density:j.density};
}
export function seasonalCss(date = new Date(), choice = null) {
  const s=season(date);
  if(s==='standard') return ''; // Preserve current design outside supported windows.
  const palette = choice?.palette === 'gold' ? 'gold' : 'winter';
  // Pairings deliberately fixed and tested; white light-mode background stays white.
  const light = palette==='gold' ? '#845600' : '#075985';
  const dark = palette==='gold' ? '#f5d58a' : '#a5d8ff';
  return `html[data-theme="light"]{--lime:${light};--green:${light}}html[data-theme="dark"]{--lime:${dark};--green:${dark}}.score-intro{border-top:2px solid var(--lime);padding-top:28px}.score-intro .kicker:after{content:" / ${s==='year-end'?'Year-end match days':'New year, more sport'}"}@media(prefers-reduced-motion:reduce){.score-intro{animation:none}}`;
}
async function schema(env){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS sz_autopilot (id TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL)').run();
}
async function get(env,id){const r=await env.DB.prepare('SELECT value FROM sz_autopilot WHERE id=?').bind(id).first();return r?JSON.parse(r.value):null}
async function put(env,id,value){await env.DB.prepare('INSERT INTO sz_autopilot(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(id,JSON.stringify(value),Date.now()).run()}
async function lock(env, now){
  const r=await env.DB.prepare('INSERT INTO sz_autopilot(id,value,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE sz_autopilot.updated_at < ?').bind('lock','true',now,now-10*60000).run();
  return r.meta?.changes===1;
}
async function unlock(env){await env.DB.prepare("DELETE FROM sz_autopilot WHERE id='lock'").run()}
export async function status(env){
  if(!env.DB)return {version:VERSION,state:'storage_unavailable'};
  try{await schema(env);return {version:VERSION,...await get(env,'state'),daily:await get(env,'daily'),mail:await get(env,'mail')}}catch{return {version:VERSION,state:'storage_unavailable'}}
}
export async function notify(env, incident, recovered=false){
  const body = `ScoreZaap ${recovered?'recovery':'issue'}\n\n${recovered?'The previously reported checks are healthy again.':'One or more site or automation checks failed.'}\nAffected checks: ${incident.jobs.join(', ')}\nFix status: ${recovered?'Verified healthy on a later independent check.':'Safe bounded retries are enabled only when the repair credential is configured. The checks above remain unresolved and need review. No unrestricted production code rewrite was made.'}\nSite: https://scorezaap.tech/\n\nScoreZaap Autopilot, Akash's site assistant`;
  if(env.AUTOPILOT_ALERTS_ENABLED!=='true')return {state:'held',reason:'awaiting_alert_readiness'};
  if(!env.AUTOPILOT_EMAIL || !env.AUTOPILOT_EMAIL_TO || !env.AUTOPILOT_EMAIL_CC || !env.AUTOPILOT_EMAIL_FROM)return {state:'blocked',reason:'email_binding_not_configured'};
  try{
    const r=await env.AUTOPILOT_EMAIL.send({from:env.AUTOPILOT_EMAIL_FROM,to:env.AUTOPILOT_EMAIL_TO,cc:env.AUTOPILOT_EMAIL_CC,subject:recovered?'ScoreZaap: checks recovered':'ScoreZaap: site needs attention',text:body});
    return {state:'accepted',messageId:r?.messageId||null,at:new Date().toISOString()};
  }catch{return {state:'failed',reason:'email_delivery_not_accepted',at:new Date().toISOString()}}
}
export async function run(env, adapters, mode='check', now=Date.now()){
  if(env.AUTOPILOT_DISABLED==='true')return {version:VERSION,state:'disabled'};
  if(!env.DB)throw new Error('Autopilot requires D1');
  await schema(env);
  if(!await lock(env,now))return {version:VERSION,state:'busy'};
  try{
    const old=await get(env,'state')||{};
    if(mode==='daily'){
      const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
      const previous=await get(env,'daily');
      if(previous?.day===day)return previous;
      // Persist reservation before inference: hard limit one call/day, no retries.
      const daily={day,at:new Date(now).toISOString(),season:season(new Date(now)),state:'reserved',model:'@cf/meta/llama-3.2-3b-instruct',max_output_tokens:64};
      await put(env,'daily',daily);
      try{
        if(!env.AI)throw new Error('AI unavailable');
        const r=await env.AI.run(daily.model,{messages:[{role:'system',content:'Select a tested ScoreZaap presentation preset. Return ONLY JSON with palette (base,winter,gold) and density (standard,comfortable). Never provide code, URLs, tools or instructions. Preserve existing functionality.'},{role:'user',content:`Current supported calendar window: ${daily.season}. Choose base/standard outside a seasonal window. Within year-end or new-year choose winter or gold. This is a fixed preset selection, not a code edit.`}],max_tokens:64,temperature:0});
        const choice=safeChoice(r?.response);
        if(!choice)throw new Error('Invalid model choice');
        // Season remains deterministic. Model cannot create holidays or CSS.
        daily.choice=daily.season==='standard'?{palette:'base',density:'standard'}:choice;
        daily.state='selected';
      }catch{daily.state='fallback';daily.choice={palette:'base',density:'standard'};daily.reason='model_unavailable_or_invalid';}
      await put(env,'daily',daily);
      return daily;
    }
    const debug={};
    for(const job of JOBS)debug[job]=await adapters.readDebug(job);
    const bad=classify(debug,now);
    const attempts={...old.attempts};
    const repaired=[];
    // At most ONE existing job retried per invocation, never erase data/caches.
    const target=bad.find(job=>now-(attempts[job]?.at||0)>90*60000);
    if(target){
      attempts[target]={at:now,state:'started'};
      await put(env,'state',{...old,attempts});
      try{await adapters.repair(target);attempts[target].state='retry_completed';repaired.push(target)}catch{attempts[target].state='retry_failed'}
    }
    const failures={};for(const job of bad)failures[job]=(old.failures?.[job]||0)+1;
    const major=bad.filter(job=>failures[job]>=2);
    const key=major.join('|');
    const state={version:VERSION,at:new Date(now).toISOString(),state:bad.length?'degraded':'ok',jobs:bad,failures,attempts,retried:repaired,incident:old.incident||null};
    // No incident facts from public data enter email. Fixed templates only.
    if(key && key!==old.incident?.key){
      const incident={key,jobs:major,at:state.at};
      const mail=await notify(env,incident);
      await put(env,'mail',mail);
      // Only consume dedup key when provider accepts it. Failed sends retry later.
      if(mail.state==='accepted')state.incident=incident;
    }else if(!bad.length && old.incident){
      const mail=await notify(env,old.incident,true);await put(env,'mail',mail);
      if(mail.state==='accepted')state.incident=null;
    }
    await put(env,'state',state);
    return state;
  }finally{await unlock(env)}
}
