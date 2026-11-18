import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {run} from './autopilot.js';
function db(){const rows=new Map();return {rows,prepare(sql){let b=[];return {bind(...x){b=x;return this},async first(){return rows.has(b[0])?{value:rows.get(b[0]).value}:null},async run(){if(sql.startsWith('CREATE'))return {meta:{changes:0}};if(sql.startsWith('DELETE')){rows.delete('lock');return {meta:{changes:1}}}if(b[0]==='lock'&&rows.has('lock')&&rows.get('lock').at>=b[3])return {meta:{changes:0}};rows.set(b[0],{value:b[1],at:b[2]});return {meta:{changes:1}}}}}}}
const now=Date.now(),DB=db(),healthy={at:new Date(now).toISOString(),stage:'done'},a={readDebug:async()=>healthy,repair:async()=>{throw Error('unexpected repair')}};
DB.rows.set('daily',{value:JSON.stringify({day:'2026-11-18',at:new Date(now-11*60000).toISOString(),state:'reserved',model:'test'}),at:now-11*60000});
let calls=0;const env={DB,AI:{async run(){calls++;return {response:'{"palette":"base","density":"standard"}'}}}};
await run(env,a,'check',now);
let daily=JSON.parse(DB.rows.get('daily').value);assert.equal(daily.state,'fallback','abandoned reservation settles without another inference');assert.equal(daily.reason,'model_run_incomplete');assert.equal(calls,0);assert.deepEqual(daily.choice,{palette:'base',density:'standard'});
DB.rows.set('daily',{value:JSON.stringify({day:'2026-11-18',at:new Date(now-60000).toISOString(),state:'reserved'}),at:now-60000});await run(env,a,'check',now);assert.equal(JSON.parse(DB.rows.get('daily').value).state,'reserved','active reservation untouched');
DB.rows.clear();let lateResolve;
const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;let cleared=0;
globalThis.setTimeout=(f,ms,...args)=>realSet(f,ms===15000?1:ms,...args);globalThis.clearTimeout=id=>{cleared++;return realClear(id)};
try{
 const result=await run({...env,AI:{run(){calls++;return new Promise(resolve=>{lateResolve=resolve})}}},a,'daily',now);
 assert.equal(result.state,'fallback');assert.equal(result.reason,'model_request_timeout');assert.equal(result.timeout_ms,15000);assert(!DB.rows.has('lock'));assert(cleared>0);
 lateResolve({response:'{"palette":"gold","density":"standard"}'});await Promise.resolve();assert.equal(JSON.parse(DB.rows.get('daily').value).state,'fallback');
 await run(env,a,'daily',now+1000);assert.equal(calls,1,'timeout never allows another call that day');
}finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear}
const src=readFileSync('index.js','utf8');assert(src.includes('ctx.waitUntil(execution.catch(() => {}));'),'planner execution survives caller disconnect');
console.log('Daily deadline, interrupted-reservation settlement, active protection, late result rejection, lock release, once/day and lifecycle guard passed');
