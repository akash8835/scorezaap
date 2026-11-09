const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.js','utf8');
let now=1700000000000,calls=0,responder=()=>new Response('{}');
class Clock extends Date {static now(){return now;}}
const c=vm.createContext({Response,Headers,Date:Clock,WeakMap,console,fetch:async(...a)=>{calls++;return responder(...a);}});
vm.runInContext(source.slice(source.indexOf('// Backoff only:'),source.indexOf('async function fetchFootball')),c);
function db() {
 return {until:0,failRead:false,failWrite:false,prepare(sql) {
  return {bind:(...args)=>({
   first:async()=>{if(this.failRead)throw Error('db');return this.until?{value:String(this.until)}:null;},
   run:async()=>{if(this.failWrite)throw Error('db');this.until=Math.max(this.until,Number(args[1]));}
  })};
 }};
}
(async()=>{
 const database=db(),e={DB:database};
 responder=()=>new Response(null,{status:429,headers:{'Retry-After':'90','X-RequestCounter-Reset':'20'}});
 assert.equal((await c.szFdFetch(e,'mock')).status,429);assert.equal(database.until,now+90000);assert.equal(calls,1);
 assert.equal((await c.szFdFetch({DB:database},'mock')).status,503);assert.equal(calls,1);
 now+=90001;responder=()=>new Response('{}');assert.equal((await c.szFdFetch(e,'mock')).status,200);assert.equal(calls,2);
 for(const headers of [{},{'Retry-After':'garbage'},{'Retry-After':'0'},{'Retry-After':'-1'},{'Retry-After':'Infinity'}])assert.equal(c.szFdResetAt(new Headers(headers),now),now+60000);
 assert.equal(c.szFdResetAt(new Headers({'Retry-After':new Date(now+120000).toUTCString()}),now),Math.floor((now+120000)/1000)*1000);
 database.failRead=true;await c.szFdFetch({DB:database},'mock');assert.equal(calls,2);database.failRead=false;
 await c.szFdFetch({},'mock');assert.equal(calls,2);
 database.failWrite=true;responder=()=>new Response(null,{status:429});const e2={DB:database};await c.szFdFetch(e2,'mock');assert.equal(calls,3);await c.szFdFetch(e2,'mock');assert.equal(calls,3);
 // A late success cannot overwrite an exhausted backoff recorded by a concurrent call.
 database.failWrite=false;database.until=0;let release;responder=()=>new Promise(r=>{release=r;});const pending=c.szFdFetch({DB:database},'mock');await new Promise(r=>setImmediate(r));
 responder=()=>new Response(null,{status:429,headers:{'Retry-After':'120'}});await c.szFdFetch({DB:database},'mock');const until=database.until;release(new Response('{}'));await pending;assert.equal(database.until,until);
 // Run the production list loader with mocked providers and no network.
 const start=source.indexOf('async function fetchFootball('),end=source.indexOf('__name(fetchFootball',start);
 Object.assign(c,{FOOT_API:'mock',FOOT_COMPS:['PL','ELC','BL1','SA','PD','FL1','DED','PPL','BSA','CL'],FOOT_ESPN_LEAGUES:[],FOOT_TO_ESPN:{},szFootballReconcile:async()=>{}});
 vm.runInContext(source.slice(start,end),c);
 database.until=0;calls=0;responder=()=>new Response(null,{status:429});const stats={};await assert.rejects(c.fetchFootball({DB:database},stats,[]));assert.equal(calls,1);assert.equal(stats.fdFailed.length,10);assert.equal(stats.backoff,true);
 now+=61000;database.until=0;calls=0;responder=()=>new Response(JSON.stringify({matches:[]}));await assert.rejects(c.fetchFootball({DB:database},{},[]));assert.equal(calls,10);
 // Partial success preserves cached fixtures for failed or skipped competitions.
 database.until=0;calls=0;responder=()=>calls===1?new Response(JSON.stringify({matches:[{id:1,homeTeam:{name:'A'},awayTeam:{name:'B'},score:{},status:'TIMED',competition:{code:'PL'},utcDate:'2030-01-01'}]})):new Response(null,{status:429});
 const prev=[{id:'2',comp:'ELC',status:'upcoming',start:'2030-01-02'}];const st={};const matches=await c.fetchFootball({DB:database},st,prev);assert.equal(calls,2);assert.equal(matches.length,2);assert.equal(st.keptFromCache,1);
 assert.equal((source.match(/szFdFetch\(env2?, `/g)||[]).length,4);
 console.log('football backoff: cooldown, reset parsing, storage failure, concurrent success, fail-fast, coverage and cached-fixture tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
