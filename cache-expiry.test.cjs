const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.js','utf8');
const c=vm.createContext({Date});
const start=source.indexOf('async function szPruneExpiredCache');
assert(start>=0,'TTL cache must have bounded expiration cleanup');
vm.runInContext(source.slice(start,source.indexOf('function szQuotaEnv',start)),c);
(async()=>{
 const rows=[{key:'expired',expires_at:999},{key:'boundary',expires_at:1000},{key:'valid',expires_at:1001},{key:'permanent',expires_at:0}];
 for(let i=0;i<120;i++) rows.push({key:'old'+i,expires_at:900});
 let sql,cutoff;
 const env={DB:{prepare(s){sql=s;return {bind(now){cutoff=now;return {async run(){
  const keys=new Set(rows.filter(x=>x.expires_at>0&&x.expires_at<=now).slice(0,100).map(x=>x.key));
  for(let i=rows.length-1;i>=0;i--) if(keys.has(rows[i].key)) rows.splice(i,1);
  return {meta:{changes:keys.size}};
 }}}}}}};
 assert.equal(await c.szPruneExpiredCache(env,1000),100);
 assert.equal(cutoff,1000);assert.match(sql,/DELETE FROM sz_kv_cache WHERE key IN/);assert.match(sql,/expires_at > 0 AND expires_at <= \? LIMIT 100/);
 assert(rows.some(x=>x.key==='valid'));assert(rows.some(x=>x.key==='permanent'));assert.equal(rows.length,24);
 assert.equal(await c.szPruneExpiredCache(env,1000),22);assert.equal(await c.szPruneExpiredCache(env,1000),0);
 assert.equal(await c.szPruneExpiredCache({},1000),0);
 const scheduled=source.slice(source.indexOf('  async scheduled(event, env, ctx)'));
 assert(scheduled.indexOf('await szPruneExpiredCache(env)')<scheduled.indexOf('await dbg("start")'));
 console.log('Bounded cache expiry: expired-only, boundary, valid/permanent preservation, 100-row cap, empty/missing DB and scheduled ordering passed');
})().catch(e=>{console.error(e);process.exitCode=1});
