// Guard: Cricbuzz's list feed (fetchCricketCbz) counts the ball that finishes
// an over as ".6" (6.6 = 7 overs, 79.6 = 80). The site must render standard
// notation. Only the exact N.6 shape is normalized: standard N.1-N.5, plain
// integers and malformed values (multi-digit fractions, N.7+, non-numerics)
// pass through untouched - no blind conversion.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
// unit: helper lives in the head region (before the KV quota marker)
const head=src.slice(0,src.indexOf('// KV quota fix:'));
const c=vm.createContext({});
vm.runInContext(head,c);
const f=c.szCbzListOvers;
assert.ok(f,'szCbzListOvers missing');
let n=0;
assert.equal(f('6.6'),'7');n++;
assert.equal(f('79.6'),'80');n++;
assert.equal(f(6.6),'7');n++;
assert.equal(f('0.6'),'1');n++;
assert.equal(f('19.6'),'20');n++;
assert.equal(f('93.1'),'93.1');n++;
assert.strictEqual(f(93.1),93.1);n++;
assert.equal(f('98.4'),'98.4');n++;
assert.equal(f(80),80);n++;
assert.equal(f('80'),'80');n++;
assert.equal(f('7'),'7');n++;
assert.equal(f('6.10'),'6.10');n++;
assert.equal(f('6.7'),'6.7');n++;
assert.equal(f('abc'),'abc');n++;
assert.equal(f(null),null);n++;
assert.equal(f(undefined),undefined);n++;
assert.equal(f(''),'');n++;
// integration: the real 2026-11-07 Ireland A list payload renders normalized
function sliceFn(name,next){
  const a=src.indexOf('async function '+name);
  assert.ok(a>=0,name+' missing');
  const b=src.indexOf(next,a);
  assert.ok(b>a,next+' missing after '+name);
  return src.slice(a,b);
}
const payload={typeMatches:[{seriesMatches:[{seriesAdWrapper:{matches:[
 {matchInfo:{matchId:175811,seriesId:13337,seriesName:'Ireland A tour of Zimbabwe, 2026',matchDesc:'1st unofficial Test',matchFormat:'TEST',startDate:'1793865600000',state:'In Progress',status:'Day 3: 1st Session - Ireland A lead by 198 runs',team1:{teamName:'Ireland A',teamSName:'IREA',imageId:839474},team2:{teamName:'Zimbabwe A',teamSName:'ZIMA',imageId:776201},venueInfo:{ground:'Harare Sports Club',city:'Harare'}},
  matchScore:{team1Score:{inngs1:{inningsId:1,runs:424,wickets:10,overs:93.1},inngs2:{inningsId:3,runs:35,wickets:1,overs:6.6}},team2Score:{inngs1:{inningsId:2,runs:261,wickets:10,overs:79.6}}}},
 {matchInfo:{matchId:999999,seriesId:1,seriesName:'X',matchDesc:'T20',matchFormat:'T20',startDate:'1793865600000',state:'In Progress',status:'Live',team1:{teamName:'A',teamSName:'A'},team2:{teamName:'B',teamSName:'B'},venueInfo:{}},
  matchScore:{team1Score:{inngs1:{inningsId:1,runs:180,wickets:6,overs:19.5}},team2Score:{inngs1:{inningsId:2,runs:40,wickets:2,overs:'6.10'}}}}
]}}]}]};
const c2=vm.createContext({CBZ_IMG:'img/',__name2222222:f=>f,szCbzListOvers:f,
  cbzFreeList:async()=>payload,cbzFetch:async()=>null});
vm.runInContext(sliceFn('fetchCricketCbz','__name(fetchCricketCbz'),c2);
(async()=>{
 const out=await c2.fetchCricketCbz({});
 const m=out.find(x=>x.id==='cbz_175811');
 assert.ok(m,'match missing');
 assert.equal(JSON.stringify(m.scores),JSON.stringify([{inning:'IREA 1',value:'424/10 (93.1)'},{inning:'IREA 2',value:'35/1 (7)'},{inning:'ZIMA 1',value:'261/10 (80)'}]));
 assert.equal(m.statusText,'Day 3: 1st Session - Ireland A lead by 198 runs');
 const m2=out.find(x=>x.id==='cbz_999999');
 assert.equal(m2.scores[0].value,'180/6 (19.5)');
 assert.equal(m2.scores[1].value,'40/2 (6.10)');

// worklist: a stumps match must stay in the cron's mini-scorecard pass even
// when more than eight matches are live - the overlay skips stumps cards, so
// this pass is the only way a stumps card sees the next day start.
assert.ok(c.szCronMiniWorklist,'szCronMiniWorklist missing');
const mk=(id,start,statusText,status='live')=>({id,start,statusText,status});
const nineLive=[];for(let i=0;i<9;i++)nineLive.push(mk('cbz_9'+i,'2026-11-07T0'+(8-i)+':00:00.000Z','Day 1: 2nd Session'));
const stumpsOld=mk('cbz_175811','2026-11-05T08:00:00.000Z','Day 2: Stumps - Zimbabwe A trail by 163 runs');
let w=c.szCronMiniWorklist([stumpsOld,...nineLive],Date.parse('2026-11-07T09:00:00.000Z'));
assert.ok(w.some(m=>m.id==='cbz_175811'),'stumps match dropped from worklist');
assert.equal(w.length,9);n++;
// non-stumps overflow still capped at 8
w=c.szCronMiniWorklist(nineLive.concat([mk('cbz_old','2026-11-01T08:00:00.000Z','Day 3: 1st Session')]),Date.parse('2026-11-07T09:00:00.000Z'));
assert.equal(w.length,8);assert.ok(!w.some(m=>m.id==='cbz_old'));n++;
// finished or not-yet-started stumps matches are not polled
w=c.szCronMiniWorklist([mk('cbz_fin','2026-11-05T08:00:00.000Z','Stumps','finished'),mk('cbz_up','2027-11-09T08:00:00.000Z','Preview','upcoming'),...nineLive],Date.parse('2026-11-07T09:00:00.000Z'));
assert.equal(w.length,8);n++;
 n+=3;
 console.log(n+' overs-notation/worklist tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
