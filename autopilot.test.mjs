import {strict as assert} from 'node:assert';
import {classify,season,safeChoice,seasonalCss,run,notify} from './autopilot.js';
const now=Date.parse('2026-11-13T09:00:00Z');
const healthy=Object.fromEntries(['scores','football','news','enrich'].map(j=>[j,{at:new Date(now).toISOString(),stage:'done'}]));
assert.deepEqual(classify(healthy,now),[]);
assert.deepEqual(classify({...healthy,news:{at:new Date(now-76*60000).toISOString(),stage:'done'}},now),['news']);
assert.deepEqual(classify({...healthy,news:{at:'invalid'}},now),['news']);
assert.deepEqual(classify({...healthy,football:{...healthy.football,info:{failed:true}}},now),['football']);
assert.equal(season(new Date('2026-12-19T18:29:00Z')),'standard');
assert.equal(season(new Date('2026-12-19T18:30:00Z')),'year-end');
assert.equal(season(new Date('2027-01-03T18:29:00Z')),'new-year');
assert.equal(season(new Date('2027-01-03T18:30:00Z')),'standard');
assert.equal(seasonalCss(new Date('2026-11-13')), '');
assert.ok(seasonalCss(new Date('2026-12-25')).includes('#075985'));
for(const v of ['rm -rf /','<script>','{"palette":"url(evil)","density":"standard"}','{"palette":"winter","density":"evil"}'])assert.equal(safeChoice(v),null);
assert.deepEqual(safeChoice('{"palette":"winter","density":"standard"}'),{palette:'winter',density:'standard'});
function db(){const rows=new Map();return {rows,prepare(sql){let b=[];return {bind(...x){b=x;return this},async first(){return rows.has(b[0])?{value:rows.get(b[0]).value}:null},async run(){
 if(sql.startsWith('CREATE'))return {meta:{changes:0}};
 if(sql.startsWith('DELETE')){rows.delete('lock');return {meta:{changes:1}}}
 if(b[0]==='lock'&&rows.has('lock')&&rows.get('lock').at>=b[3])return {meta:{changes:0}};
 rows.set(b[0],{value:b[1],at:b[2]});return {meta:{changes:1}};
 }}}}}
const DB=db();let repaired=[],modelCalls=0,mail=[];
const env={DB,AUTOPILOT_ALERTS_ENABLED:'true',AUTOPILOT_EMAIL_TO:'owner@example.test',AUTOPILOT_EMAIL_CC:'copy@example.test',AUTOPILOT_EMAIL_FROM:'alerts@example.test',AI:{async run(model,args){modelCalls++;assert.equal(model,'@cf/ibm-granite/granite-4.0-h-micro');assert.equal(args.max_tokens,128);return {response:'{"palette":"winter","density":"standard"}'}}},AUTOPILOT_EMAIL:{async send(v){mail.push(v);return {messageId:'message-1'}}}};
let debug=healthy;
const a={readDebug:async job=>debug[job],repair:async job=>repaired.push(job)};
assert.equal((await run(env,a,'check',now)).state,'ok');
debug={...healthy,news:null,football:null};
await run(env,a,'check',now+1000);assert.equal(repaired.length,1);assert.equal(mail.length,0);
await run(env,a,'check',now+2000);assert.equal(repaired.length,2);assert.equal(mail.length,1);assert.equal(mail[0].to,'owner@example.test');assert.equal(mail[0].cc,'copy@example.test');
await run(env,a,'check',now+3000);assert.equal(repaired.length,2);assert.equal(mail.length,1); // cooldown, dedup
// Later independent healthy check emits recovery, not the retry itself.
debug=healthy;await run(env,a,'check',now+4000);assert.equal(mail.length,2);assert.ok(mail[1].subject.includes('recovered'));
await run(env,a,'daily',now+5000);await run(env,a,'daily',now+6000);assert.equal(modelCalls,1);
assert.equal((await run({...env,AUTOPILOT_DISABLED:'true'},a)).state,'disabled');
assert.equal((await notify({AUTOPILOT_ALERTS_ENABLED:'true'}, {jobs:['news']})).state,'blocked');
const mailBeforeHold=mail.length;
assert.equal((await notify({...env,AUTOPILOT_ALERTS_ENABLED:undefined},{jobs:['news']})).state,'held');
assert.equal(mail.length,mailBeforeHold); // No scheduled send before readiness is explicitly enabled.
const fail={...env,AI:{async run(){throw Error('quota')}}};await run(fail,a,'daily',now+86400000);assert.equal(JSON.parse(DB.rows.get('daily').value).state,'fallback');
console.log('Autopilot: classification, calendar, schema validation, lock/cooldown, bounded repairs, dedup/recovery, mail recipients, model cap/fallback and kill switch passed');

assert.equal(JSON.parse(DB.rows.get('daily').value).reason,'model_request_failed');
const cases=[
 [undefined,'ai_binding_missing'],
 [{async run(){return {response:'not JSON'}}},'model_response_invalid'],
 [{async run(){return {response:'{"palette":"evil","density":"standard"}'}}},'model_response_invalid'],
 [{async run(){throw Error('private provider text must not be stored')}},'model_request_failed']
];
for(let i=0;i<cases.length;i++){
 const [AI,reason]=cases[i];const result=await run({...env,AI},a,'daily',now+(i+2)*86400000);
 assert.equal(result.state,'fallback');assert.equal(result.reason,reason);
 assert.deepEqual(result.choice,{palette:'base',density:'standard'});
 assert.ok(!JSON.stringify(result).includes('private provider text'));
}
console.log('Supported model ID, 128-token cap, missing binding/request/output diagnostics and private-error redaction passed');

const capped=await run({...env,AI:{async run(){return {response:'private truncated output',usage:{completion_tokens:128}}}}},a,'daily',now+9*86400000);
assert.equal(capped.reason,'model_response_invalid');
assert.equal(capped.response_type,'string');assert.equal(capped.response_chars,24);
assert.equal(capped.output_tokens,128);assert.equal(capped.output_cap_reached,true);
assert.ok(!JSON.stringify(capped).includes('private truncated output'));
console.log('Bounded response shape/count diagnostics, token-cap detection and raw-output redaction passed');
