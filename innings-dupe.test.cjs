// Regression: a provider scorecard that lists one innings twice must not
// create a phantom extra row ("NSW 3" copying "NSW 2", cbz_166653 2026-11-13).
// The phantom used to push the genuine other innings ("NSW 1") out through the
// format-limit collapse, so the site lost a real innings for about an hour.
// Exact copies collapse away first; genuinely different readings still resolve
// by the furthest-along rule, and super overs (<=6 balls) are never dropped.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync('index.js', 'utf8');
const stub = 'const __name=__name2=__name22=__name222=__name2222=__name22222=__name222222=__name2222222=__name22222222=(f)=>f;';
const c = vm.createContext({});
const top = src.slice(0, src.indexOf('// KV quota fix:'));
const a = src.indexOf('function betterScore');
const end = src.indexOf('\n', src.lastIndexOf('(applyHtmlScore, "applyHtmlScore");')) + 1;
assert(a > 0 && end > a, 'could not slice betterScore/applyMiniScore');
vm.runInContext(top + stub + src.slice(a, end), c);
let n = 0;

const NSW204 = { team: 'New South Wales', runs: 204, wkts: 10, overs: 47.2 };
const SAUS325 = { team: 'South Australia', runs: 325, wkts: 10, overs: 82.5 };
const NSW410 = { team: 'New South Wales', runs: 410, wkts: 10, overs: 118.5 };
const SAUS50 = { team: 'South Australia', runs: 50, wkts: 2, overs: 11.4 };
const mk = () => ({ status: 'live', matchType: 'TEST',
  home: { name: 'New South Wales', short: 'NSW' }, away: { name: 'South Australia', short: 'SAUS' },
  scores: [
    { inning: 'NSW 1', value: '204/10 (47.2)' },
    { inning: 'SAUS 1', value: '325/10 (82.5)' },
    { inning: 'NSW 2', value: '410/10 (118.5)' },
    { inning: 'SAUS 2', value: '50/2 (11.4)' }] });

// 1 provider repeats NSW's second innings -> no phantom "NSW 3" row is added
{
  const lm = mk();
  c.applyMiniScore(lm, { status: 'Day 3: Stumps', complete: false, innings: [NSW204, SAUS325, NSW410, NSW410, SAUS50] });
  assert.equal(lm.scores.length, 4, JSON.stringify(lm.scores));
  assert.ok(!lm.scores.some((s) => s.inning === 'NSW 3'), JSON.stringify(lm.scores));
  n++;
}

// 2 saved state already carrying the phantom heals on the next good scorecard:
// the exact copy collapses, the genuine first innings survives, the missing
// South Australia innings comes back
{
  const lm = mk();
  lm.scores = [
    { inning: 'NSW 1', value: '204/10 (47.2)' },
    { inning: 'NSW 2', value: '410/10 (118.5)' },
    { inning: 'NSW 3', value: '410/10 (118.5)' },
    { inning: 'SAUS 2', value: '50/2 (11.4)' }];
  c.applyMiniScore(lm, { status: 'Day 3: Stumps', complete: false, innings: [NSW204, SAUS325, NSW410, SAUS50] });
  const clean = c.szCleanCricketScores(lm.scores, 'TEST');
  const flat = JSON.stringify(clean);
  assert.equal(clean.length, 4, flat);
  assert.ok(flat.includes('204/10 (47.2)'), flat);
  assert.ok(flat.includes('325/10 (82.5)'), flat);
  assert.ok(flat.includes('410/10 (118.5)'), flat);
  assert.ok(flat.includes('50/2 (11.4)'), flat);
  assert.ok(!flat.includes('NSW 3'), flat);
  n++;
}

// 3 different readings of one chase (PAKU19, cbz_175660) still collapse to the
// furthest-along row in limited overs
{
  const clean = c.szCleanCricketScores([
    { inning: 'PAKU19 1', value: '80/2 (10)' },
    { inning: 'PAKU19 2', value: '100/2 (12)' }], 'T20');
  assert.deepEqual(clean, [{ inning: 'PAKU19 2', value: '100/2 (12)' }]);
  n++;
}

// 4 a super over (<=6 balls) is never collapsed away even past the limit
{
  const clean = c.szCleanCricketScores([
    { inning: 'IND 1', value: '180/5 (20)' },
    { inning: 'IND 2', value: '8/0 (1)' }], 'T20');
  assert.equal(clean.length, 2, JSON.stringify(clean));
  n++;
}

// 5 saved rows in team-grouped order (the list feed's shape) merged with a
// chronological scorecard: no slot-based relabeling, no phantom, no lost row.
// This is the /api/match detail writer regression behind cbz_166653.
{
  const lm = mk();
  lm.scores = [
    { inning: 'NSW 1', value: '204/10 (47.2)' },
    { inning: 'NSW 2', value: '410/10 (118.5)' },
    { inning: 'SAUS 1', value: '325/10 (82.5)' },
    { inning: 'SAUS 2', value: '50/2 (11.4)' }];
  const changed = c.applyMiniScore(lm, { status: 'Day 3: Stumps', complete: false, innings: [NSW204, SAUS325, NSW410, SAUS50] });
  const flat = JSON.stringify(lm.scores);
  assert.equal(lm.scores.length, 4, flat);
  assert.ok(!flat.includes('NSW 3'), flat);
  assert.ok(flat.includes('325/10 (82.5)'), flat);
  n++;
}

// 6 a genuinely new innings with its own figures is still added
{
  const lm = mk();
  lm.scores = lm.scores.slice(0, 3);
  c.applyMiniScore(lm, { status: 'Day 3', complete: false, innings: [NSW204, SAUS325, NSW410, SAUS50] });
  assert.equal(JSON.stringify(lm.scores[3]), JSON.stringify({ inning: 'SAUS 2', value: '50/2 (11.4)' }));
  n++;
}

console.log('innings-dupe ok:', n, 'checks');
