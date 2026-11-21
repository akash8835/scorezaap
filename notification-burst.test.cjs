const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
function build(source){
 const c=vm.createContext({Date,WeakMap});
 vm.runInContext(source.slice(source.indexOf('const SZ_STORE_REV'),source.indexOf('var __defProp =')),c);
 const names={};for(let i=0;i<10;i++)names['__name'+'2'.repeat(i)]=f=>f;Object.assign(c,names);
 vm.runInContext(source.slice(source.indexOf('async function notifyMatch('),source.indexOf('async function cbzBudgetOk(')),c);
 return c;
}
async function exercise(source){
 const c=build(source),values=new Map(),writes=[],pushes=[];let kvNotify=0;
 const kv={get:async(k,type)=>k==='push_sub_saved'?{endpoint:'https://push.test/one',matchId:'ALL'}:values.get(k)||null,put:async(k,v)=>{writes.push(k);if(k==='notify_latest'&&++kvNotify>1)throw Error('KV PUT failed: 429 Too Many Requests');values.set(k,v)},list:async()=>({keys:[{name:'push_sub_saved'}]}),delete:async()=>{throw Error('no user data may be deleted')}};
 const db={prepare:sql=>({bind:(...args)=>({first:async()=>values.get(args[0])||null,run:async()=>{values.set(args[0],{value:args[1],expires_at:args[2]});return {success:true}}})})};
 const env=c.szQuotaEnv({DB:db,SPORTS_KV:kv});c.sendPushTickle=async(e,url)=>{pushes.push(url);return 201};
 const oldList=[{id:'a',status:'live'},{id:'b',status:'live'}];
 const newList=oldList.map(m=>({...m,status:'finished',statusText:'Won by 1 goal',home:{short:'H'},away:{short:'A'}}));
 await c.detectTransitions(env,null,'football',oldList,newList);
 const latest=await env.SPORTS_KV.get('notify_latest','json');
 assert(latest.url.endsWith('/b'));assert.equal(pushes.length,2,'keep notifications for both transitions');
 assert(!writes.includes('push_sub_saved'),'subscription never rewritten');
 assert(values.get('notify_latest').expires_at>Date.now(),'notification keeps one-hour TTL');
 return writes;
}
(async()=>{
 const old=src.replace(' || k === "notify_latest"','');
 await assert.rejects(exercise(old),/429/,'reproduce the previous multi-transition same-key failure');
 const writes=await exercise(src);assert(!writes.includes('notify_latest'),'transient notification bypasses KV write rate limit');
 const c=build(src);assert(!c.szTransientKey('push_sub_saved'));assert(!c.szTransientKey('poll_saved'));assert(c.szTransientKey('notify_latest'));
 console.log('Notification burst: reproduced old same-key 429; both pushes preserved, latest record and TTL stored in D1, subscriptions/polls untouched');
})().catch(e=>{console.error(e);process.exitCode=1});
