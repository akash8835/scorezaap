// Guard: a match whose provider data is stuck at Toss/Preview long past the
// format's normal length must leave the Live list (finished), adopting the
// cricapi reading of the same fixture when one exists.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const fx=JSON.parse(fs.readFileSync('stuck-toss.fixture.json','utf8'));
function sliceFn(name,next){
  const a=src.indexOf('function '+name);
  assert.ok(a>=0,name+' missing');
  const b=src.indexOf(next,a);
  assert.ok(b>a,next+' missing after '+name);
  return src.slice(a,b);
}
const gStart=src.indexOf('          // Provider stuck at the toss');
const gEnd=src.indexOf('          const acc2 =',gStart);
assert.ok(gStart>0&&gEnd>gStart,'guard block not found');
const GUARD=src.slice(gStart,gEnd);
const c=vm.createContext({console:{log:()=>{}},Date,__name:f=>f,__name2:f=>f,__name22:f=>f,__name222:f=>f,__name2222:f=>f,__name22222:f=>f,__name222222:f=>f,__name2222222:f=>f,__name22222222:f=>f});
vm.runInContext(sliceFn('szCricketStuckAfterMs','async function szLiveOverlay'),c);
vm.runInContext(sliceFn('czTeamKey','function czFixtureTeams'),c);
vm.runInContext(sliceFn('czFixtureTeams','function czMatchNo'),c);
vm.runInContext(sliceFn('cbzMiniScorecard','async function cbzMiniScorecardFetch'),c);
vm.runInContext(sliceFn('szMatchStatusConclusive','function szMatchFacts'),c);
c.SZ_MATCH_INPROGRESS_TEXT=/\bbreak\b|stumps|\btoss\b|opt(?:ed)?\s+to\b|trails?\s+by|leads?\s+by|needs?\s+\d+\s+runs?|session|\bday\s+\d|\brain\b|delay(?:ed)?|in\s+progress|yet\s+to\s+bat/i;
c.SZ_MATCH_RESULT_TEXT=/won|wins?\s+by|drawn|draw|tied|\btie\b|no\s+result|abandon|concede|walkover|forfeit|final|full[\s-]?time|\bft\b|complete|finished|ended/i;
let n=0;
async function run({lm,raw,cricRaw=[]}){
  const ctx={lm,raw2:raw,sc2:raw?c.cbzMiniScorecard(raw):null,cricRaw};
  const body=`(async()=>{const {lm,raw2,sc2,cricRaw}=__ctx;for(const lm2 of [lm]){const lm=lm2;${GUARD}}return lm})()`;
  c.__ctx=ctx;
  return vm.runInContext(body,c);
}
(async()=>{
  // thresholds
  assert.equal(c.szCricketStuckAfterMs('T20'),8*36e5);assert.equal(c.szCricketStuckAfterMs('ODI'),14*36e5);
  assert.equal(c.szCricketStuckAfterMs('TEST'),54*36e5);assert.equal(c.szCricketStuckAfterMs(''),8*36e5);n++;
  // 1 the real stuck match: Toss 18h past start, no cricapi duplicate -> stays live, labelled stale
  let m={id:'cbz_173587',status:'live',statusText:'Boland opt to bat',scores:[],matchType:'T20',
    home:{name:'Boland',short:'BOL'},away:{name:'Warriors',short:'WAR'},
    start:new Date(Date.now()-18*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_toss_stuck});
  assert.equal(m.status,'live');assert.equal(m.statusText,'Score feed stuck - awaiting provider update');
  assert.equal(m.scoreDelayed,true);assert.equal(m.feedStuck,true);n++;
  // 2 same stuck match but cricapi has the verified result -> adopt it
  m={id:'cbz_173587',status:'live',statusText:'Boland opt to bat',scores:[],matchType:'T20',
    home:{name:'Boland',short:'BOL'},away:{name:'Warriors',short:'WAR'},
    start:new Date(Date.now()-18*36e5).toISOString(),scoreDelayed:true};
  const alt={status:'finished',statusText:'Match tied (Boland won the Super Over)',
    home:{name:'Warriors'},away:{name:'Boland'},scores:[{inning:'BOL 1',value:'138/5 (20)'},{inning:'WAR 1',value:'138/7 (20)'}]};
  m=await run({lm:m,raw:fx.raw_toss_stuck,cricRaw:[alt]});
  assert.equal(m.status,'finished');assert.equal(m.statusText,'Match tied (Boland won the Super Over)');
  assert.equal(m.scores.length,2);assert.ok(!('scoreDelayed' in m));assert.ok(!m.noResultNotify);n++;
  // 3 live match in progress -> untouched
  m={id:'cbz_9',status:'live',statusText:'BOL 10/0',scores:[{inning:'BOL 1',value:'10/0 (2)'}],matchType:'T20',
    home:{name:'Boland'},away:{name:'Warriors'},start:new Date(Date.now()-1*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_in_progress});
  assert.equal(m.status,'live');assert.equal(m.statusText,'BOL 10/0');n++;
  // 4 Toss but only 2h past start (still within normal length) -> untouched
  m={id:'cbz_10',status:'live',statusText:'Boland opt to bat',scores:[],matchType:'T20',
    home:{name:'Boland'},away:{name:'Warriors'},start:new Date(Date.now()-2*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_toss_stuck});
  assert.equal(m.status,'live');n++;
  // 5 Test at Toss 20h in -> untouched (30h threshold)
  m={id:'cbz_11',status:'live',statusText:'X opt to bat',scores:[],matchType:'TEST',
    home:{name:'X'},away:{name:'Y'},start:new Date(Date.now()-20*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_toss_stuck});
  assert.equal(m.status,'live');n++;
  // 6 fetch failed (raw2 null) -> never flip on missing data
  m={id:'cbz_12',status:'live',statusText:'Boland opt to bat',scores:[],matchType:'T20',
    home:{name:'Boland'},away:{name:'Warriors'},start:new Date(Date.now()-18*36e5).toISOString()};
  m=await run({lm:m,raw:null});
  assert.equal(m.status,'live');n++;
  // 7 Preview state long past start -> flips too
  m={id:'cbz_13',status:'live',statusText:'Match starts soon',scores:[],matchType:'T20',
    home:{name:'Boland'},away:{name:'Warriors'},start:new Date(Date.now()-9*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_preview});
  assert.equal(m.status,'live');assert.equal(m.feedStuck,true);n++;
  // 8 cricapi flag says finished but text is in-progress ("Innings Break") -> placeholder, not adoption
  m={id:'cbz_173587',status:'live',statusText:'Boland opt to bat',scores:[],matchType:'T20',
    home:{name:'Boland',short:'BOL'},away:{name:'Warriors',short:'WAR'},
    start:new Date(Date.now()-18*36e5).toISOString()};
  const lag={status:'finished',statusText:'Innings Break',home:{name:'Warriors'},away:{name:'Boland'},
    scores:[{inning:'BOL 1',value:'138/5 (20)'}]};
  m=await run({lm:m,raw:fx.raw_toss_stuck,cricRaw:[lag]});
  assert.equal(m.status,'live');assert.equal(m.statusText,'Score feed stuck - awaiting provider update');
  assert.equal(m.scores.length,0);assert.equal(m.feedStuck,true);n++;
  // 9 no cricapi reading but a hand-verified manual result exists -> adopt it
  c.SZ_MANUAL_CRICKET_RESULTS.cbz_test_manual={start:new Date(Date.now()-18*36e5).toISOString(),
    statusText:'South Western Districts won by 19 runs',
    scores:[{inning:'SWD 1',value:'169/5 (20)'},{inning:'BOL 1',value:'150/7 (20)'}]};
  m={id:'cbz_test_manual',status:'live',statusText:'Boland opt to field',scores:[],matchType:'T20',
    home:{name:'South Western Districts'},away:{name:'Boland'},
    start:new Date(Date.now()-18*36e5).toISOString(),scoreDelayed:true};
  m=await run({lm:m,raw:fx.raw_toss_stuck});
  assert.equal(m.status,'finished');assert.equal(m.statusText,'South Western Districts won by 19 runs');
  assert.equal(m.scores.length,2);assert.ok(!('scoreDelayed' in m));assert.ok(!m.feedStuck);n++;
  // 10 expired manual entry (start >10d ago) -> ignored, stays stale
  c.SZ_MANUAL_CRICKET_RESULTS.cbz_test_old={start:new Date(Date.now()-30*24*36e5).toISOString(),
    statusText:'X won by 1 run',scores:[{inning:'X 1',value:'100/0 (20)'}]};
  m={id:'cbz_test_old',status:'live',statusText:'Y opt to bat',scores:[],matchType:'T20',
    home:{name:'X'},away:{name:'Y'},start:new Date(Date.now()-30*24*36e5).toISOString()};
  m=await run({lm:m,raw:fx.raw_toss_stuck});
  assert.equal(m.status,'live');assert.equal(m.feedStuck,true);n++;
  console.log(n+' stuck-toss guard tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
