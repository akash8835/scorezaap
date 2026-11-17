const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8'),c=vm.createContext({Date,JSON,console,__name:f=>f,__name2:f=>f,__name22:f=>f,__name222:f=>f,__name2222:f=>f,__name22222:f=>f,__name222222:f=>f,__name2222222:f=>f,__name22222222:f=>f});
vm.runInContext(src.slice(0,src.indexOf('// KV quota fix:')),c);
vm.runInContext(src.slice(src.indexOf('var SZ_MANUAL_CRICKET_RESULTS'),src.indexOf('async function szLiveOverlay')),c);
vm.runInContext(src.slice(src.indexOf('function cbzMiniScorecard('),src.indexOf('async function cbzMiniScorecardFetch')),c);
vm.runInContext(src.slice(src.indexOf('function betterScore'),src.indexOf('function applyHtmlScore')),c);
const raw={status:'Innings Break',isMatchComplete:false,matchComplete:false,matchHeader:{complete:true,state:'Innings Break',status:'Innings Break'},scoreCard:[{inningsId:1,batTeamDetails:{batTeamName:'Royal Desert Champions'},scoreDetails:{runs:131,wickets:1,overs:10}}]};
let s=c.cbzMiniScorecard(raw);assert.equal(s.complete,false,'innings break is not match completion');
for(const status of ['Innings Break','INNINGS BREAK','Innings break - awaiting chase']){
 const d=JSON.parse(JSON.stringify(raw));d.status=status;d.matchHeader.status=status;d.matchHeader.state=status;d.isMatchComplete=true;assert.equal(c.cbzMiniScorecard(d).complete,false);
}
for(const status of ['Yas Lions won by 5 wkts','Match drawn','Match abandoned']){
 const d=JSON.parse(JSON.stringify(raw));d.status=status;d.matchHeader.status=status;d.matchHeader.state='Complete';assert.equal(c.cbzMiniScorecard(d).complete,true);
}
let m={id:'cbz_break',status:'finished',statusText:'Innings Break',home:{name:'Royal Desert Champions',short:'RDC'},away:{name:'UAE Bulls',short:'UBL'},scores:[]};
assert(c.szApplyManualCricketResults([m]));assert.equal(m.status,'live');
m.start=new Date(Date.now()-3600000).toISOString();assert.equal(c.szCronMiniWorklist([m]).length,1);
m.status='finished';assert.equal(c.szCronMiniWorklist([m]).length,1);c.applyMiniScore(m,s);assert.equal(m.status,'live');
m={id:'cbz_final',status:'finished',statusText:'Yas Lions won by 5 wkts',scores:[],home:{name:'A',short:'A'},away:{name:'B',short:'B'}};c.applyMiniScore(m,s);assert.equal(m.status,'finished','real final is never reopened');
const fn=src.slice(src.indexOf('async function cbzScorecard('),src.indexOf('__name(cbzScorecard,'));vm.runInContext(fn,c);
let fetches=0;c.szFastJson=async()=>{fetches++;return raw};c.cbzMiniScorecardFetch=async()=>{fetches++;return s};
(async()=>{const stale={...s,complete:true};const env={SPORTS_KV:{get:async()=>stale,put:async()=>{}}};const out=await c.cbzScorecard(env,'cbz_break','A vs B','',false);assert.equal(out.complete,false);assert(fetches>0,'poisoned complete cache must be bypassed');console.log('Cricket innings-break: conflicting flags, true finals, saved flag recovery and poisoned cache bypass passed')})().catch(e=>{console.error(e);process.exit(1)});
