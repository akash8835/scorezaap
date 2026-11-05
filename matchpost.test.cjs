const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.js','utf8');
const start=source.indexOf('var SZ_MATCH_INPROGRESS_TEXT');
const end=source.indexOf('function szMatchFacts',start);
assert(start>0&&end>start);
const stub=(t,n)=>t;const c=vm.createContext({__name:stub,__name2:stub,__name22:stub});
vm.runInContext(source.slice(start,end),c);
let n=0;
for(const [sport,text,expected] of [
 ['cricket','Innings Break',false],
 ['cricket','Day 2: Stumps - India lead by 40 runs',false],
 ['cricket','Adelaide Strikers Women need 121 runs in 69 balls',false],
 ['cricket','Australia opt to bat',false],
 ['cricket','Brisbane Heat Women won by 14 runs',true],
 ['cricket','Match drawn',true],
 ['cricket','No Result',true],
 ['cricket','Match tied',true],
 ['cricket','',false],
 ['football','FT',true],
 ['football','Full Time',true],
 ['football','Halftime',true],
 ['football','In progress - delayed',false],
 ['nba','Final',true],
 ['f1','Completed',true]
]){assert.equal(c.szMatchStatusConclusive(sport,text),expected,`${sport}:${text}`);n++;}
console.log(n+' conclusive-status assertions passed');
