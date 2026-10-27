const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.js','utf8');
const c=vm.createContext({console:{error:s=>c.logged=JSON.parse(s)}});
vm.runInContext(source.slice(0,source.indexOf('// KV quota fix:')),c);
const i=(r,w,o)=>[{runs:r,wkts:w,overs:o}];
let n=0;function check(a,b,expected){assert.equal(c.szOlderCricketInnings(a,b),expected);n++;}
check(i(146,6,17.4),i(156,7,18.1),true);
check(i(167,7,18.4),i(160,7,18.2),false);
check(i(156,7,18.1),i(156,7,18.1),false);
check(i(150,6,17.5),i(150,7,17.5),true);
check(i(159,7,18.1),i(160,7,18.1),true);
check(i(100,4,9.6),i(101,4,10),true);
check(i(160,7,18.4),i(167,7,18.2),false);
check(i(160,7,20),[...i(160,7,20),...i(2,0,0.1)],true);
check([...i(160,7,20),...i(2,0,0.1)],i(160,7,20),false);
check(i(146,6,17.4),[],false);
assert.equal(c.szListCricketInnings({scores:[{inning:'AFG 1',value:'156/7 (18.1)'}]})[0].r,156);n++;
assert.equal(c.szListCricketInnings({scores:[{value:'unavailable'}]}).length,0);n++;
for(const [message,kind] of [['daily free allocation of 10,000 neurons','quota'],['capacity temporarily exceeded','capacity'],['request timed out','timeout'],['secret user prompt','inference_error']]){
 const e={message,code:3036}; c.szLogAiFailure(e);assert.equal(c.logged.kind,kind);assert.equal(c.logged.code,'3036');assert(!JSON.stringify(c.logged).includes(message));n++;
}
assert(source.includes('scorecard = null;\n              scorecardStale = true;'));n++;
console.log(n+' safety assertions passed');
(async()=>{
 const start=source.indexOf('          let scorecardStale = false;');
 const end=source.indexOf('          let graphs = null;',start);
 const reconciliation=source.slice(start,end);
 for(const [detail,list,card,stale,runs] of [
  [i(146,6,17.4),i(156,7,18.1),i(146,6,17.4),true,156],
  [i(160,7,18.2),i(156,7,18.1),i(146,6,17.4),true,160],
  [i(146,6,17.4),i(156,7,18.1),i(167,7,18.4),false,167]
 ]) {
  const match={id:'cbz_test',status:'live',scores:list.map(x=>({inning:'AFG 1',value:`${x.runs}/${x.wkts} (${x.overs})`}))};
  Object.assign(c,{cached:{innings:detail.map(x=>({r:x.runs,w:x.wkts,o:x.overs}))},scorecard:{innings:card,complete:false},id:'cbz_test',liveNow:true,env:{SPORTS_KV:{get:async()=>({matches:[match]})}}});
  const result=await vm.runInContext(`(async()=>{${reconciliation};return {cached,scorecard,scorecardStale};})()`,c);
  assert.equal(result.scorecardStale,stale);assert.equal(result.cached.innings[0].r,runs);assert.equal(result.scorecard===null,stale);
 }
 console.log('3 route integration scenarios passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
