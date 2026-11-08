// Guard: a provider scorecard frozen mid-match (still claiming "In Progress")
// must not keep a match live when a hand-verified final result exists for the
// fixture. The manual entry is the verification, so it applies immediately;
// when the provider recovers and reports the match complete, its own reading
// wins instead.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
function sliceFn(name,next){
  const a=src.indexOf('function '+name);
  assert.ok(a>=0,name+' missing');
  const b=src.indexOf(next,a);
  assert.ok(b>a,next+' missing after '+name);
  return src.slice(a,b);
}
const gStart=src.indexOf('          // A hand-verified final also outranks');
const gEnd=src.indexOf('          if (sc2 && Array.isArray(sc2.innings)',gStart);
assert.ok(gStart>0&&gEnd>gStart,'frozen-live block not found');
const GUARD=src.slice(gStart,gEnd);
const c=vm.createContext({console:{log:()=>{}},Date,__name:f=>f,__name2:f=>f,__name22:f=>f,__name222:f=>f,__name2222:f=>f,__name22222:f=>f,__name222222:f=>f,__name2222222:f=>f,__name22222222:f=>f});
vm.runInContext(sliceFn('szCricketStuckAfterMs','async function szLiveOverlay'),c);
let n=0;
async function run({lm,sc2}){
  const ctx={lm,sc2};
  const body=`(async()=>{const {lm,sc2}=__ctx;for(const lm2 of [lm]){const lm=lm2;${GUARD}}return lm})()`;
  c.__ctx=ctx;
  return vm.runInContext(body,c);
}
(async()=>{
  // 1 the real frozen match: provider says in progress at 120/5 (18), manual
  // entry carries the verified final -> finished with the verified lines
  let m={id:'cbz_176496',status:'live',statusText:'England Lions need 93 runs - Match reduced to 40 overs due to rain',
    scores:[{inning:'WIA 1',value:'212/8 (40)'},{inning:'ENGA 1',value:'120/5 (18)'}],matchType:'ODI',
    home:{name:'West Indies A',short:'WIA'},away:{name:'England Lions',short:'ENGA'},
    start:'2026-11-07T18:00:00.000Z',scoreDelayed:true,feedStuck:true};
  const frozen={complete:false,status:'England Lions need 93 runs - Match reduced to 40 overs due to rain',
    innings:[{team:'West Indies A',runs:212,wkts:8,overs:'40'},{team:'England Lions',runs:120,wkts:5,overs:'18'}]};
  m=await run({lm:m,sc2:frozen});
  assert.equal(m.status,'finished');
  assert.equal(m.statusText,'England Lions won by 4 wickets (DLS Method)');
  assert.equal(JSON.stringify(m.scores),JSON.stringify([{inning:'WIA 1',value:'212/8 (40)'},{inning:'ENGA 1',value:'240/6 (33.5)'}]));
  assert.ok(!('scoreDelayed' in m));assert.ok(!m.feedStuck);n++;
  // 2 same frozen feed but no manual entry -> untouched, stays live
  m={id:'cbz_noentry',status:'live',statusText:'X need 93 runs',
    scores:[{inning:'X 1',value:'212/8 (40)'},{inning:'Y 1',value:'120/5 (18)'}],matchType:'ODI',
    home:{name:'X'},away:{name:'Y'},start:new Date(Date.now()-5*36e5).toISOString()};
  m=await run({lm:m,sc2:frozen});
  assert.equal(m.status,'live');assert.equal(m.statusText,'X need 93 runs');n++;
  // 3 provider recovered and reports complete -> manual entry does NOT fire,
  // the provider's own reading below wins
  m={id:'cbz_176496',status:'live',statusText:'England Lions need 93 runs',
    scores:[{inning:'WIA 1',value:'212/8 (40)'},{inning:'ENGA 1',value:'120/5 (18)'}],matchType:'ODI',
    home:{name:'West Indies A',short:'WIA'},away:{name:'England Lions',short:'ENGA'},
    start:'2026-11-07T18:00:00.000Z'};
  m=await run({lm:m,sc2:{complete:true,status:'England Lions won by 4 wickets (DLS Method)',innings:frozen.innings}});
  assert.equal(m.status,'live');assert.equal(m.scores[1].value,'120/5 (18)');n++;
  // 4 expired manual entry (start >10d ago) -> ignored
  c.SZ_MANUAL_CRICKET_RESULTS.cbz_old_frozen={start:new Date(Date.now()-30*24*36e5).toISOString(),
    statusText:'X won by 1 run',scores:[{inning:'X 1',value:'100/0 (20)'}]};
  m={id:'cbz_old_frozen',status:'live',statusText:'Y need 10 runs',
    scores:[{inning:'Y 1',value:'90/4 (15)'}],matchType:'T20',
    home:{name:'X'},away:{name:'Y'},start:new Date(Date.now()-30*24*36e5).toISOString()};
  m=await run({lm:m,sc2:{complete:false,status:'Y need 10 runs',innings:[{team:'Y',runs:90,wkts:4,overs:'15'}]}});
  assert.equal(m.status,'live');n++;
  console.log(n+' frozen-live guard tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
