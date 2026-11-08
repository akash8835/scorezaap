// Guard: a hand-verified result must survive every provider writer. Cricbuzz
// completed cbz_175811 with "Ireland A won by 216 runs" while the innings it
// carries give 212, and because a finished match leaves the cron worklist,
// each list refresh re-asserted the wrong margin over the verified one.
// szApplyManualCricketResults runs after every list assembly (cron refresh,
// /api/scores, match detail) so the writer and its order no longer matter.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync('index.js', 'utf8');
function slice(start, next) {
  const a = src.indexOf(start);
  assert.ok(a >= 0, start + ' missing');
  const b = src.indexOf(next, a);
  assert.ok(b > a, next + ' missing after ' + start);
  return src.slice(a, b);
}
const c = vm.createContext({ console: { log: () => {} }, Date, JSON });
vm.runInContext(slice('var SZ_MANUAL_CRICKET_RESULTS', 'async function szLiveOverlay'), c);
assert.equal(typeof c.szApplyManualCricketResults, 'function', 'helper missing');
assert.equal(typeof c.szManualCricketResult, 'function', 'lookup missing');

// Every call site assembles the list first, then applies the helper.
for (const marker of [
  'szApplyManualCricketResults(cricket);',
  'szApplyManualCricketResults(c2.matches);',
  'szApplyManualCricketResults(cl.matches);'
]) assert.ok(src.includes(marker), 'call site missing: ' + marker);

let n = 0;
// Deterministic entry that never expires, added on top of the real table.
c.SZ_MANUAL_CRICKET_RESULTS.cbz_t1 = {
  start: new Date(Date.now() - 2 * 24 * 36e5).toISOString(),
  statusText: 'A won by 5 runs',
  scores: [{ inning: 'A 1', value: '100/10 (20)' }, { inning: 'B 1', value: '95/10 (19)' }]
};

// 1. The regression itself: provider completed with a wrong margin; the
// verified margin wins and the provider's innings order does not matter.
let m = {
  id: 'cbz_t1', status: 'finished', statusText: 'A won by 9 runs',
  scores: [{ inning: 'B 1', value: '95/10 (19)' }, { inning: 'A 1', value: '100/10 (20)' }]
};
assert.equal(c.szApplyManualCricketResults([m]), true);
assert.equal(m.status, 'finished');
assert.equal(m.statusText, 'A won by 5 runs');
assert.equal(JSON.stringify(m.scores), JSON.stringify([{ inning: 'A 1', value: '100/10 (20)' }, { inning: 'B 1', value: '95/10 (19)' }]));
n++;

// 2. A provider feed still claiming play is corrected too.
m = { id: 'cbz_t1', status: 'live', statusText: 'A lead by 5 runs', scores: [{ inning: 'A 1', value: '100/10 (20)' }], scoreDelayed: true };
assert.equal(c.szApplyManualCricketResults([m]), true);
assert.equal(m.status, 'finished');
assert.equal(m.statusText, 'A won by 5 runs');
assert.equal(m.scoreDelayed, undefined);
n++;

// 3. Already-correct data is left untouched (no spurious change flag).
m = { id: 'cbz_t1', status: 'finished', statusText: 'A won by 5 runs', scores: [{ inning: 'A 1', value: '100/10 (20)' }, { inning: 'B 1', value: '95/10 (19)' }] };
assert.equal(c.szApplyManualCricketResults([m]), false);
assert.equal(m.statusText, 'A won by 5 runs');
n++;

// 4. Matches without a manual entry are never touched.
m = { id: 'cbz_t2', status: 'finished', statusText: 'C won by 1 run', scores: [] };
assert.equal(c.szApplyManualCricketResults([m]), false);
assert.equal(m.statusText, 'C won by 1 run');
assert.equal(c.szApplyManualCricketResults(null), false);
assert.equal(c.szApplyManualCricketResults([null]), false);
n++;

// 5. The real cbz_175811 entry is internally consistent: the margin named in
// its status text equals the innings arithmetic (730 - 518 = 212), so a
// future edit cannot reintroduce a mismatch.
const real = c.SZ_MANUAL_CRICKET_RESULTS.cbz_175811;
assert.ok(real, 'real entry missing');
const runs = {};
for (const s of real.scores) {
  const pm = /^(\d+)\//.exec(s.value);
  assert.ok(pm, 'unparseable score ' + s.value);
  const team = s.inning.split(' ')[0];
  runs[team] = (runs[team] || 0) + +pm[1];
}
const margin = Math.abs(runs.IREA - runs.ZIMA);
const mm = /won by (\d+) runs/.exec(real.statusText);
assert.ok(mm, 'status text margin missing');
assert.equal(+mm[1], margin, 'status text margin contradicts innings');
assert.equal(margin, 212);
n++;

// 6. Expiry rules: a past "until" retires an entry inside the 10-day window;
// a future "until" extends it; a "correction" entry never expires, because it
// records that the provider's own result was verified wrong and known-wrong
// data must not win later (the cbz_175811 case: Cricbuzz still broadcasts the
// wrong 216 margin weeks later).
c.SZ_MANUAL_CRICKET_RESULTS.cbz_t2exp = {
  start: new Date(Date.now() - 2 * 24 * 36e5).toISOString(),
  until: new Date(Date.now() - 36e5).toISOString(),
  statusText: 'X won by 1 run', scores: []
};
assert.equal(c.szManualCricketResult('cbz_t2exp'), null);
c.SZ_MANUAL_CRICKET_RESULTS.cbz_t3exp = {
  start: new Date(Date.now() - 20 * 24 * 36e5).toISOString(),
  until: new Date(Date.now() + 7 * 24 * 36e5).toISOString(),
  statusText: 'Y won by 2 runs', scores: []
};
assert.equal(c.szManualCricketResult('cbz_t3exp').statusText, 'Y won by 2 runs');
c.SZ_MANUAL_CRICKET_RESULTS.cbz_t4cor = {
  start: new Date(Date.now() - 400 * 24 * 36e5).toISOString(),
  correction: true,
  statusText: 'Z won by 3 runs', scores: []
};
assert.equal(c.szManualCricketResult('cbz_t4cor').statusText, 'Z won by 3 runs', 'correction must not expire');
// A plain entry past the default window still expires.
c.SZ_MANUAL_CRICKET_RESULTS.cbz_t5old = {
  start: new Date(Date.now() - 20 * 24 * 36e5).toISOString(),
  statusText: 'W won by 4 runs', scores: []
};
assert.equal(c.szManualCricketResult('cbz_t5old'), null);
// The real entry is a non-expiring correction with its provenance recorded.
assert.equal(real.correction, true, 'cbz_175811 must be a correction entry');
assert.equal(real.until, undefined, 'correction needs no arbitrary date');
assert.ok(c.szManualCricketResult('cbz_175811'), 'real entry must be live');
n++;

console.log('manual-result-precedence ok:', n, 'groups');
