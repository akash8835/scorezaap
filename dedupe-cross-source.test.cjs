// Guard: a cricapi duplicate of a Cricbuzz fixture must be dropped even when
// the provider's start date is corrupted/offset, but only under a narrow
// identity: same team pair + same series + same match number + compatible
// type, dates no more than a full-length Test apart. Distinct fixtures
// (different series, different match numbers, >5 days apart) must survive.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
function sliceFn(name,next){
  const a=src.indexOf('function '+name);
  assert.ok(a>=0,name+' missing');
  const b=src.indexOf(next,a);
  assert.ok(b>a,next+' missing after '+name);
  return src.slice(a,b);
}
const c=vm.createContext({console:{log:()=>{}},Date,__name:f=>f,__name2:f=>f});
vm.runInContext(sliceFn('czTeamKey','function czFixtureTeams'),c);
vm.runInContext(sliceFn('czFixtureTeams','function czMatchNo'),c);
vm.runInContext(sliceFn('czMatchNo','function dedupeCricket'),c);
vm.runInContext(sliceFn('dedupeCricket','__name(dedupeCricket'),c);
const cbz={id:'cbz_175811',title:'Ireland A vs Zimbabwe A, 1st unofficial Test, Ireland A tour of Zimbabwe, 2026',
  home:{name:'Ireland A'},away:{name:'Zimbabwe A'},start:'2026-11-05T08:00:00.000Z',matchType:'TEST',series:'Ireland A tour of Zimbabwe, 2026'};
const cric={id:'db5cceff',title:'Zimbabwe A vs Ireland A, 1st unofficial Test, Ireland A tour of Zimbabwe, 2026',
  home:{name:'Zimbabwe A'},away:{name:'Ireland A'},start:'2026-11-06T07:30:00',matchType:'',series:'Ireland A tour of Zimbabwe, 2026'};
const kept=(list)=>c.dedupeCricket(list).map(m=>m.id).sort().join(',');
let n=0;
// 1 the real 2026-11-07 bug: provider start a day late -> duplicate dropped
assert.equal(kept([cbz,cric]),'cbz_175811');n++;
// 2 same teams + same number, different series/season -> both kept
assert.equal(kept([cbz,{...cric,id:'x2',series:'Zimbabwe A tour of Ireland, 2027',
  title:'Zimbabwe A vs Ireland A, 1st unofficial Test, Zimbabwe A tour of Ireland, 2027',
  start:'2027-06-01T10:00:00',matchType:'TEST'}]),'cbz_175811,x2');n++;
// 3 same series, different match number -> both kept
assert.equal(kept([cbz,{...cric,id:'x3',title:'Zimbabwe A vs Ireland A, 2nd unofficial Test, Ireland A tour of Zimbabwe, 2026',
  start:'2026-11-12T08:00:00',matchType:'TEST'}]),'cbz_175811,x3');n++;
// 4 same series + number, 20 days apart (outside a full Test) -> both kept
assert.equal(kept([cbz,{...cric,id:'x4',start:'2026-11-25T08:00:00'}]),'cbz_175811,x4');n++;
// 5 matchType conflict on both sides -> both kept
assert.equal(kept([cbz,{...cric,id:'x5',matchType:'T20'}]),'cbz_175811,x5');n++;
// 6 distinct same-teams games, no numbers, 24h apart -> both kept
assert.equal(kept([
  {id:'cbz_a',title:'Boland vs Warriors, Super Eights, CSA T20 Challenge 2026',home:{name:'Boland'},away:{name:'Warriors'},start:'2026-11-05T16:00:00Z',matchType:'T20',series:'CSA T20 Challenge 2026'},
  {id:'cric_a',title:'Warriors vs Boland, Super Eights, CSA T20 Challenge 2026',home:{name:'Warriors'},away:{name:'Boland'},start:'2026-11-06T16:00:00Z',matchType:'T20',series:'CSA T20 Challenge 2026'}]),
  'cbz_a,cric_a');n++;
// 7 original 12h rule unchanged: no series on the cricapi side, within 12h -> dropped
assert.equal(kept([cbz,{...cric,id:'x7',start:'2026-11-05T09:00:00',series:null}]),'cbz_175811');n++;
console.log('dedupe-cross-source: ok ('+n+' cases)');
