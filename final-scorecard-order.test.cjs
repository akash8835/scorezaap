// Final feed totals must not be copied by position into detailed provider
// rows: QL1,QL2,NSW1,NSW2 differs from QL1,NSW1,QL2,NSW2.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const a=src.indexOf('  const finalInnings = lm2.scores.map');
const b=src.indexOf('\nif (lm2 && lm2.status === "live")',a);
assert(a>0&&b>a);
const block=src.slice(a,b).replace(/\n}\s*$/,'');
const original=[
 {team:'Queensland',runs:278,wkts:10,overs:111.1,batsmen:[{r:47}],bowlers:[]},
 {team:'New South Wales',runs:303,wkts:10,overs:107,batsmen:[{r:92}],bowlers:[]},
 {team:'Queensland',runs:306,wkts:6,overs:78.2,batsmen:[{r:130}],bowlers:[]},
 {team:'New South Wales',runs:152,wkts:8,overs:56.5,batsmen:[{r:26}],bowlers:[]}];
const context={cached:{},lm2:{statusText:'Match drawn',scores:[
 {inning:'QL 1',value:'278/10 (111.1)'},{inning:'QL 2',value:'306/6 (78.2)'},
 {inning:'NSW 1',value:'303/10 (107)'},{inning:'NSW 2',value:'152/8 (56.5)'}]},scorecard:{innings:structuredClone(original)}};
vm.runInNewContext('{'+block+'}',context);
assert.deepEqual(context.scorecard.innings,original);
assert.equal(context.cached.ended,true);
assert.equal(context.scorecard.complete,true);
assert.equal(context.scorecard.status,'Match drawn');
// Even newer final summary totals cannot be combined with older batsmen.
context.lm2.scores[3].value='160/8 (58)';
vm.runInNewContext('{'+block+'}',context);
assert.deepEqual(context.scorecard.innings,original);
assert.equal(context.cached.innings[3].r,160);
console.log('final scorecard provider rows preserved in grouped and newer final feeds');
