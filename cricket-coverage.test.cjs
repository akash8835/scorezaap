const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const names={__name:f=>f,__name2:f=>f,__name2222222:f=>f};
const ctx=vm.createContext({...names,AbortController,setTimeout,clearTimeout,console:{log(){}}});
vm.runInContext(src.slice(src.indexOf('function cbzExtractMatches('),src.indexOf('// Upstream feeds occasionally')),ctx);
const m=id=>({matchInfo:{matchId:id}});
const body=a=>JSON.stringify(a);
(async()=>{
 ctx.fetch=async u=>({ok:true,text:async()=>u.endsWith('/api/home')?body([m(1)]):body([m(1),m(2)])});
 let r=await ctx.cbzFreeList();assert.equal(r.coverageComplete,true);
 ctx.fetch=async u=>({ok:u.endsWith('/api/home'),text:async()=>body([m(1)])});
 r=await ctx.cbzFreeList();assert.equal(r.coverageComplete,false);
 vm.runInContext(src.slice(src.indexOf('function szCbzSliceCandidate('),src.indexOf('async function fetchCricketCbz(')),ctx);
 const old={at:10,matches:[{id:1},{id:2}]};const partial=Object.assign([{id:1}],{coverageComplete:false});
 assert.equal(ctx.szCbzSliceCandidate(old,partial,20),old);
 assert.equal(ctx.szCbzSliceCandidate(null,partial,20).matches.length,1);
 const complete=Object.assign([{id:3}],{coverageComplete:true});
 assert.equal(ctx.szCbzSliceCandidate(old,complete,30).matches[0].id,3); // legitimate full-list contraction
 assert.equal(ctx.szCbzSliceCandidate(old,[],40),old);
 assert(src.includes('szCbzSliceCandidate(cbzSlice, fb, Date.now())'));
 assert(src.includes('result.coverageComplete = live?.coverageComplete !== false'));
 console.log('Cricket coverage: full vs partial sources, prior-slice retention, initial fallback and legitimate contraction passed');
})().catch(e=>{console.error(e);process.exitCode=1});
