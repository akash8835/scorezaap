const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const c=vm.createContext({Date});
vm.runInContext(src.slice(src.indexOf('function szCricketNeedsOverlay'),src.indexOf('async function szLiveOverlay')),c);
const m={id:'cbz_1',status:'live',start:'2026-11-04T03:00:00Z',statusText:'Day 3: Stumps - lead by 10 runs'};
const now=Date.parse('2026-11-04T21:00:00Z');
assert.equal(c.szCricketNeedsOverlay(m,now),false);
assert.equal(m.status,'live'); // Keep match visible and its saved score unchanged.
for(const text of ['Day 4: 1st Session','Day 4: Lunch','Day 4: Tea','Live'])
 assert.equal(c.szCricketNeedsOverlay({...m,statusText:text},now),true);
assert.equal(c.szCricketNeedsOverlay({...m,status:'finished',statusText:'Complete'},now),false);
assert.equal(c.szCricketNeedsOverlay({...m,start:'2026-11-05T03:00:00Z',statusText:'Upcoming'},now),false);
vm.runInContext(src.slice(src.indexOf('var FOOT_TEAM_ID'),src.indexOf('async function szFootballReconcile')),c);
const e=JSON.parse(fs.readFileSync('slavia-espn.fixture.json','utf8'));
const fixture={home:{name:'SK Slavia Praha'},away:{name:'Arsenal FC'},start:'2026-11-04T20:00:00Z'};
let hit=c.szFbEspnEvent(fixture,[e]);assert.ok(hit);assert.equal(c.szFbApplyEspn(fixture,hit),true);assert.equal(fixture.scores[0].value,'0 - 2');
assert.equal(c.szFbEspnEvent({...fixture,start:'2026-11-07T20:00:00Z'},[e]),null);
assert.equal(c.szFbEspnEvent({...fixture,home:{name:'Arsenal FC'},away:{name:'SK Slavia Praha'}},[e]),null);
assert.equal(c.szFbEspnEvent(fixture,[e,e]),null);
console.log('Resource guard and Slavia identity tests passed');
