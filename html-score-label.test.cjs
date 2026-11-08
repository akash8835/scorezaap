// Regression: the HTML title fallback labelled a brand-new innings row by the
// match slot (idx+1), so a chasing side in the second slot was stored as
// "TEAM 2" while the mini-scorecard path stored the same chase as "TEAM 1".
// The duplicate froze mid-chase, made every fresh 2-innings scorecard look
// older than the saved 3-row state, and pinned "Score may be delayed" on.
// New rows must use the batting side's own innings count (applyMiniScore's
// scheme); Test double innings and super overs keep their existing rows.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const a=src.indexOf('function betterScore');
const end=src.indexOf('\n',src.lastIndexOf('(applyHtmlScore, "applyHtmlScore");'))+1;
assert(a>0&&end>a,'could not slice betterScore/applyHtmlScore');
const stub='const __name=__name2=__name22=__name222=__name2222=__name22222=__name222222=__name2222222=__name22222222=(f)=>f;';
const c=vm.createContext({});
const top=src.slice(0,src.indexOf('// KV quota fix:'));
vm.runInContext(top+stub+src.slice(a,end),c);
let n=0;
// 1 chase starting while only innings 1 is stored -> "BRHW 1", never "BRHW 2"
{
 const lm={status:'live',matchType:'T20',scores:[{inning:'HBHW 1',value:'116/9 (20)'}]};
 const s={scores:[{team:'BRHW',runs:89,wkts:5,overs:14.1},{team:'HBHW',runs:116,wkts:9,overs:20}],finished:false,result:null};
 c.applyHtmlScore(lm,s,'T20');
 assert.equal(lm.scores.length,2);
 assert.equal(lm.scores[1].inning,'BRHW 1');
 assert.equal(lm.scores[1].value,'89/5 (14.1)');
 n++;
}
// 2 existing per-team row is found by prefix and updated, no duplicate
{
 const lm={status:'live',matchType:'T20',scores:[{inning:'HBHW 1',value:'116/9 (20)'},{inning:'BRHW 1',value:'89/5 (14.1)'}]};
 const s={scores:[{team:'BRHW',runs:104,wkts:6,overs:15.4},{team:'HBHW',runs:116,wkts:9,overs:20}],finished:false,result:null};
 c.applyHtmlScore(lm,s,'T20');
 assert.equal(lm.scores.length,2);
 assert.equal(lm.scores[1].inning,'BRHW 1');
 assert.equal(lm.scores[1].value,'104/6 (15.4)');
 n++;
}
// 3 Test: a fresh innings of an already-seen team is not merged backwards
// into that team's earlier innings (existing guard behaviour preserved)
{
 const lm={status:'live',matchType:'TEST',scores:[{inning:'IND 1',value:'300/10 (90)'},{inning:'ENG 1',value:'250/10 (80)'}]};
 const s={scores:[{team:'ENG',runs:10,wkts:0,overs:2}],finished:false,result:null};
 c.applyHtmlScore(lm,s,'TEST');
 assert.equal(lm.scores.length,2);
 assert.equal(lm.scores[1].value,'250/10 (80)');
 n++;
}
// 4 finished result still lands on the match
{
 const lm={status:'live',matchType:'T20',scores:[{inning:'HBHW 1',value:'116/9 (20)'},{inning:'BRHW 1',value:'104/6 (15.4)'}]};
 const s={scores:[{team:'BRHW',runs:117,wkts:6,overs:18.2},{team:'HBHW',runs:116,wkts:9,overs:20}],finished:true,result:'Brisbane Heat Women won by 4 wickets'};
 c.applyHtmlScore(lm,s,'T20');
 assert.equal(lm.status,'finished');
 assert.equal(lm.statusText,'Brisbane Heat Women won by 4 wickets');
 assert.equal(lm.scores.length,2);
 assert.equal(lm.scores[1].inning,'BRHW 1');
 assert.equal(lm.scores[1].value,'117/6 (18.2)');
 n++;
}
console.log(n+' html-score label tests passed');
