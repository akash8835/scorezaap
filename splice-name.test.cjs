// Regression: on 2026-11-07 the Cricbuzz list feed carried this series name
// with the full string pasted into the middle of itself ("India A tour of
// NeIndia A tour of New Zealand, 2026w Zealand, 2026" = S[:18] + S + S[18:]),
// and the site mirrored it into match titles and series fields. The repair
// must undo exactly that splice shape and leave every well-formed name alone.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.js','utf8');
const a=src.indexOf('function szRepairSplicedName'),b=src.indexOf('__name(szRepairSplicedName');
assert(a>0&&b>a);
const c=vm.createContext({});
vm.runInContext(src.slice(a,b),c);
const fix=c.szRepairSplicedName;
let n=0;function check(input,expected){assert.equal(fix(input),expected,JSON.stringify(input));n++;}
const S='India A tour of New Zealand, 2026';
check(S.slice(0,18)+S+S.slice(18),S); // the live corruption
check(S.slice(0,5)+S+S.slice(5),S);   // splice at any inside-word offset
check('India A tour of New Zealand, 2026','India A tour of New Zealand, 2026'); // clean name untouched
check('The Ashes, 2026','The Ashes, 2026');
check('West Indies tour of Bangladesh, 2026','West Indies tour of Bangladesh, 2026');
check('Abu Dhabi T10 League 2026','Abu Dhabi T10 League 2026');
check('','');check(null,'');check(undefined,'');
check('short','short');               // below minimum length
check('India A vs New Zealand A, 3rd Unofficial Test','India A vs New Zealand A, 3rd Unofficial Test'); // odd length
console.log(n+' splice-name assertions passed');
