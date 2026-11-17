const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const c=vm.createContext({__name:f=>f,__name2:f=>f,__name22:f=>f,__name222:f=>f,__name2222:f=>f,__name22222:f=>f,__name222222:f=>f,__name2222222:f=>f,__name22222222:f=>f});
vm.runInContext(src.slice(0,src.indexOf('// KV quota fix:')),c);
vm.runInContext(src.slice(src.indexOf('function betterScore'),src.indexOf('function applyHtmlScore')),c);
const match=(status='upcoming')=>({id:'cbz_170713',status,statusText:'Pakistan opt to bowl',scores:[{inning:'SL 1',value:'86/7 (30.1)'}],matchType:'TEST',home:{name:'Sri Lanka',short:'SL'},away:{name:'Pakistan',short:'PAK'}});
const card=(runs=86,wkts=7,overs=30.1,status='Pakistan opt to bowl',complete=false)=>({complete,status,innings:[{team:'Sri Lanka',runs,wkts,overs}]});
let m=match();assert(c.applyMiniScore(m,card()));assert.equal(m.status,'live');assert.equal(m.statusText,'Live now');assert.equal(m.scores[0].value,'86/7 (30.1)');
m=match();c.applyMiniScore(m,card(86,7,30.1,'Day 1: 2nd Session - Pakistan opt to bowl'));assert.equal(m.status,'live');assert(m.statusText.startsWith('Day 1: 2nd Session'));
for(const [r,w,o,expected] of [[0,0,0,'upcoming'],[1,0,0,'live'],[0,1,0,'live'],[0,0,0.1,'live']]){m=match();m.scores=[];c.applyMiniScore(m,card(r,w,o));assert.equal(m.status,expected)}
m=match();c.applyMiniScore(m,{complete:false,status:'Pakistan opt to bowl',innings:[]});assert.equal(m.status,'upcoming');
m=match('finished');c.applyMiniScore(m,card());assert.equal(m.status,'finished');
m=match();c.applyMiniScore(m,card(100,10,40,'Pakistan won',true));assert.equal(m.status,'finished');assert.equal(m.statusText,'Pakistan won');
console.log('Cricket started status: innings evidence, session text, toss-only text, zero-score preview and final precedence passed');
