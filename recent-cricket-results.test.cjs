const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const rows=[];
for(let i=1;i<=75;i++)rows.push({id:'final-'+i,status:'finished',start:new Date(Date.UTC(2026,10,1)+i*36e5).toISOString()});
rows.push({id:'live',status:'live',start:'2026-11-01T00:00:00Z'},{id:'near',status:'upcoming',start:'2026-11-22T00:00:00Z'},{id:'far',status:'upcoming',start:'2026-11-25T00:00:00Z'});
for(const [start,end,name] of [['  const rank =','  result.coverageComplete','provider'],['      const rank2 =','    }\n    if (!cricket','merged']]){
 const at=src.indexOf(start,name==='provider'?src.indexOf('async function fetchCricketCbz('):src.indexOf('const cricRaw'));
 const until=src.indexOf(end,at);assert(at>0&&until>at);
 const c=vm.createContext({out:structuredClone(rows),cricket:structuredClone(rows),__name2222222:f=>f});
 const body=src.slice(at,until);vm.runInContext(body,c);
 const result=name==='provider'?vm.runInContext('result',c):c.cricket;
 assert.equal(result.length,60);assert.equal(result[0].id,'live');assert.equal(result[1].id,'near');assert.equal(result[2].id,'far');assert.equal(result[3].id,'final-75');assert(!result.some(m=>m.id==='final-1'));
 assert.equal(rows.length,78,'source records remain unchanged');
 console.log(name+': capped feed retains live, nearest upcoming and newest finals');
}
