const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const head=src.slice(0,src.indexOf('// KV quota fix:'));
const a=src.indexOf('async function szLiveOverlay'),b=src.indexOf('__name(szLiveOverlay');
const fn=src.slice(a,b);
function mk(script){
  const logs=[],calls=[];
  const c=vm.createContext({console:{error:s=>logs.push(JSON.parse(s))},__name2:(f)=>f,ESPN_API:'x',ESPN_SPORTS:[],Date,
    szFastJson:async(u)=>{calls.push(u);const r=script.shift();return r===undefined?null:r},
    cbzMiniScorecard:d=>d&&d.mini,
    applyMiniScore:(m,s)=>{m.scores=s.innings.map(i=>({inning:i.team,value:`${i.runs}/${i.wkts} (${i.overs})`}));return true}});
  vm.runInContext(head,c);vm.runInContext(fn,c);return {c,logs,calls};
}
const mini=(r,w,o)=>({mini:{innings:[{team:'BAN 1',runs:r,wkts:w,overs:o,batsmen:[]}]}});
const match=(v,extra)=>({id:'cbz_1',status:'live',start:'2020-01-01T00:00:00Z',scores:[{inning:'BAN 1',value:v}],...extra});
(async()=>{
 let n=0;
 // 1 success first try
 let t=mk([mini(60,1,19)]),m=match('36/1 (13.3)');await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores[0].value,'60/1 (19)');assert.ok(!m.scoreDelayed);assert.equal(t.calls.length,1);assert.equal(t.logs.length,0);n++;
 // 2 first fetch fails, retry works
 t=mk([null,mini(60,1,19)]);m=match('36/1 (13.3)');await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores[0].value,'60/1 (19)');assert.ok(!m.scoreDelayed);assert.equal(t.calls.length,2);n++;
 // 3 both fail: snapshot kept, delayed flag, one log with only id
 t=mk([null,null]);m=match('36/1 (13.3)');await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores[0].value,'36/1 (13.3)');assert.equal(m.scoreDelayed,true);assert.deepEqual(t.logs,[{event:'score_overlay_unverified',sport:'cricket',id:'cbz_1'}]);n++;
 // 4 older candidate ignored and flagged
 t=mk([mini(30,1,12),mini(30,1,12)]);m=match('60/1 (19)');await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores[0].value,'60/1 (19)');assert.equal(m.scoreDelayed,true);n++;
 // 5 flag clears on later success
 t=mk([mini(70,2,22)]);m=match('60/1 (19)',{scoreDelayed:true});await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores[0].value,'70/2 (22)');assert.ok(!('scoreDelayed' in m));n++;
 // 6 non-live (upcoming started) not flagged
 t=mk([null,null]);m=match('0/0 (0)',{status:'upcoming'});await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.ok(!m.scoreDelayed);assert.equal(t.logs.length,0);n++;
 // 7 new innings (more innings) is not treated as older
 t=mk([{mini:{innings:[{team:'BAN 1',runs:300,wkts:10,overs:90,batsmen:[]},{team:'WI 1',runs:5,wkts:0,overs:2,batsmen:[]}]}}]);m=match('300/10 (90)');await t.c.szLiveOverlay({matches:[m]},{matches:[]},{});
 assert.equal(m.scores.length,2);assert.ok(!m.scoreDelayed);n++;
 console.log(n+' overlay failure-path tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
