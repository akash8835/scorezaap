// Sabah must reach the existing ESPN reconciliation when the primary feed
// is stale. IDs verified against the current Champions League scoreboard.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.js','utf8');
const start=source.indexOf('var FOOT_TEAM_ID ='),end=source.indexOf('async function szFootballReconcile',start);
const c=vm.createContext({Date});vm.runInContext(source.slice(start,end),c);
const match={home:{name:'Sabah FK'},away:{name:'FC Barcelona'},start:'2026-11-25T18:15:00Z',status:'live',scores:[{inning:'',value:'0 - 1'}]};
const event={id:'401915378',date:match.start,competitions:[{status:{type:{state:'in',shortDetail:"65'"}},competitors:[{homeAway:'home',team:{id:'21922'},score:'1'},{homeAway:'away',team:{id:'83'},score:'4'}]}]};
const hit=c.szFbEspnEvent(match,[event]);assert.ok(hit,'verified Sabah fixture must match');
assert.equal(c.szFbApplyEspn(match,hit),true);assert.equal(match.scores[0].value,'1 - 4');assert.equal(match.statusText,"65'");
assert.equal(c.szFbEspnEvent({...match,home:{name:'Unknown Sabah'}},[event]),null);
assert.equal(c.szFbEspnEvent({...match,start:'2026-11-20T18:15:00Z'},[event]),null);
assert.equal(c.szFbEspnEvent(match,[event,event]),null);
console.log('Sabah verified ESPN ID mapping, scores, minute and identity/time/ambiguity guards passed');
