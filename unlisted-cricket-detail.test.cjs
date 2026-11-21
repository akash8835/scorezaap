const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const names={};for(let n=0;n<12;n++)names['__name'+'2'.repeat(n)]=f=>f;
const c=vm.createContext({...names,Date,console,szCricketInningsBreak:s=>/innings break/i.test(s||'')});
let a=src.indexOf('function cbzMiniScorecard(d)'),b=src.indexOf('async function cbzMiniScorecardFetch',a);
vm.runInContext(src.slice(a,b),c);
const raw={status:'Visitors won by 4 wickets (DLS Method)',isMatchComplete:true,matchHeader:{team1:{name:'Visitors'},team2:{name:'Hosts'},matchStartTimestamp:1795235400000,matchFormat:'T20',venue:{name:'Oval',city:'Sydney'}},scoreCard:[{inningsId:1,batTeamDetails:{batTeamName:'Hosts'},scoreDetails:{runs:142,wickets:7,overs:20}},{inningsId:2,batTeamDetails:{batTeamName:'Visitors'},scoreDetails:{runs:120,wickets:6,overs:14.5}}]};
const sc=c.cbzMiniScorecard(raw);assert(sc.complete);assert.equal(sc.detail.matchType,'T20');assert.equal(sc.detail.title,'Visitors vs Hosts');
// Exercise the actual stale-card comparison and merge from the request handler.
a=src.indexOf('          let scorecardStale = false;');b=src.indexOf('          let graphs = null;',a);const block=src.slice(a,b);
const progress=src.slice(src.indexOf('function szCricketTeamKey('),src.indexOf('// The same rule applied to display rows'));
// Progress helpers precede the innings-break function in this source.
if(progress)vm.runInContext(progress,c);
c.szListCricketInnings=m=>m?.innings||[];
async function run(detail,scorecard,list=null){c.input={detail,scorecard,list};return vm.runInContext(`(async()=>{let cached=input.detail,scorecard=input.scorecard;const liveNow=cached.started&&!cached.ended;const id='cbz_test',env={SPORTS_KV:{get:async()=>input.list}};${block}return {cached,scorecard,scorecardStale}})()`,c)}
(async()=>{
 let r=await run({title:'Match',date:null,matchType:null,started:true,ended:false,innings:[{inning:'Hosts',r:142,w:7,o:'50'},{inning:'Visitors',r:120,w:6,o:14.5}]},sc);
 assert(r.scorecard&&!r.scorecardStale,'guessed fallback must not reject verified full card');assert(r.cached.ended);assert.equal(r.cached.innings[0].o,20);assert.equal(r.cached.title,'Visitors vs Hosts');assert.equal(r.cached.winner,raw.status);assert.equal(r.cached.venue,'Oval, Sydney');
 r=await run({title:'Known match',date:'2026-11-21T04:30:00Z',matchType:'T20',started:true,ended:false,innings:[{inning:'Hosts',r:100,w:2,o:12}]},{complete:false,status:'Live',innings:[{team:'Hosts',runs:80,wkts:2,overs:10}]});
 assert.equal(r.scorecard,null,'genuinely older card must still be hidden');assert(r.scorecardStale);assert.equal(r.cached.innings[0].r,100);
 const partial=c.cbzMiniScorecard({scoreCard:[{batTeamDetails:{batTeamName:'Hosts'},scoreDetails:{runs:10,wickets:0,overs:1}}]});assert.equal(partial.detail.title,null);assert.equal(partial.detail.date,null);
 assert(!src.includes('sc.overs != null ? sc.overs : cached.matchType === "T20" ? "20" : "50"'),'missing HTML overs cannot be invented');
 console.log('Unlisted cricket detail: identity recovery, real final over count, DLS result, stale-card protection and absent metadata passed');
})().catch(e=>{console.error(e);process.exitCode=1});
