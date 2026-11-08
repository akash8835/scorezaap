// Live detail must never regress to an older fallback scorecard.
// Cricbuzz's list feed counts the ball that finishes an over as ".6"
// (6.6 = 7 overs, 79.6 = 80). Normalize only that exact shape; standard
// N.1-N.5 fractions, plain integers and anything malformed pass through.
function szCbzListOvers(o) {
  const m = /^(\d+)\.6$/.exec(String(o == null ? "" : o));
  return m ? String(+m[1] + 1) : o;
}
// The request overlay skips matches at stumps to save overnight work, so this
// cron pass is their only revalidation: it is what lets a stumps card see the
// next day start. Keep every stumps match in the work list even when more
// than eight matches are live, instead of letting it age out of the slice.
function szCronMiniWorklist(matches, now = Date.now()) {
  const pool = (matches || []).filter((x) => String(x.id).startsWith("cbz_") && x.status !== "finished" && (!x.start || new Date(x.start).getTime() <= now))
    .sort((a, b) => String(b.start || "").localeCompare(String(a.start || "")));
  const work = pool.slice(0, 8);
  for (const x of pool.slice(8)) if (/\bstumps\b/i.test(String(x.statusText || ""))) work.push(x);
  return work;
}
function szCricketTeamKey(t, fallback) {
  const k = String(t ?? "").toLowerCase().replace(/\s+\d+$/, "").replace(/[^a-z0-9]+/g, "");
  return k || fallback || "";
}
function szCricketProgress(innings) {
  return (innings || []).map((i, n) => {
    const raw = String(i.overs ?? i.o ?? "");
    const m = /^(\d+)(?:\.(\d))?$/.exec(raw);
    return { team: szCricketTeamKey(i.team ?? i.inning, "row" + n),
      runs: Number(i.runs ?? i.r), wkts: Number(i.wkts ?? i.w),
      balls: m ? Number(m[1]) * 6 + Number(m[2] || 0) : null };
  });
}
function szProgressAhead(a, b) {
  return (a.balls != null ? a.balls : -1) - (b.balls != null ? b.balls : -1) ||
    (Number.isFinite(a.runs) && Number.isFinite(b.runs) ? a.runs - b.runs : 0) ||
    (Number.isFinite(a.wkts) && Number.isFinite(b.wkts) ? a.wkts - b.wkts : 0);
}
// One innings can end up saved under two labels ("PAKU19 2" plus "PAKU19 1"
// for the same chase) when two feed paths label it differently. The frozen
// extra row then makes every fresh scorecard look older than the saved state
// and pins the score (cbz_175660, 2026-11-08). Collapse same-team rows past
// the format's limit (one per side in limited overs, two in Tests), keeping
// the furthest-along reading. A short row of 6 balls or fewer can be a super
// over and is never collapsed away.
function szDedupeCricketProgress(rows, matchType) {
  const allowed = /test/i.test(String(matchType || "")) ? 2 : 1;
  const byTeam = {};
  rows.forEach((r, i) => { (byTeam[r.team] = byTeam[r.team] || []).push(i); });
  const drop = new Set();
  for (const k of Object.keys(byTeam)) {
    const idxs = byTeam[k];
    if (idxs.length <= allowed) continue;
    const short = new Set(idxs.filter((i) => rows[i].balls != null && rows[i].balls <= 6));
    const real = idxs.filter((i) => !short.has(i)).sort((a, b) => szProgressAhead(rows[b], rows[a]));
    const keep = new Set([...short, ...real.slice(0, allowed)]);
    idxs.forEach((i) => { if (!keep.has(i)) drop.add(i); });
  }
  return rows.filter((_, i) => !drop.has(i));
}
function szOlderCricketInnings(candidate, reference, matchType) {
  const a = szDedupeCricketProgress(szCricketProgress(candidate), matchType),
    b = szDedupeCricketProgress(szCricketProgress(reference), matchType);
  if (!a.length || !b.length) return false;
  if (a.length !== b.length) return a.length < b.length;
  const x = a[a.length - 1], y = b[b.length - 1];
  if (x.balls != null && y.balls != null && x.balls !== y.balls) return x.balls < y.balls;
  return Number.isFinite(x.runs) && Number.isFinite(y.runs) && x.runs < y.runs ||
    Number.isFinite(x.wkts) && Number.isFinite(y.wkts) && x.wkts < y.wkts;
}
// The same rule applied to display rows ({inning, value}) so a corrupt saved
// state is cleaned wherever scores are merged or written.
function szCleanCricketScores(scores, matchType) {
  if (!Array.isArray(scores) || scores.length < 2) return scores;
  const rows = scores.map((s, n) => {
    const m = /^(\d+)\/(\d+)\s*\((\d+(?:\.\d)?)\)$/.exec(String(s && s.value || ""));
    const om = /^(\d+)(?:\.(\d))?$/.exec(m ? m[3] : "");
    return { team: szCricketTeamKey(s && s.inning, "row" + n),
      runs: m ? +m[1] : NaN, wkts: m ? +m[2] : NaN,
      balls: om ? +om[1] * 6 + +(om[2] || 0) : null };
  });
  const kept = new Set(szDedupeCricketProgress(rows.map((r, i) => ({ ...r, __i: i })), matchType).map((r) => r.__i));
  if (kept.size === scores.length) return scores;
  return scores.filter((_, i) => kept.has(i));
}
function szListCricketInnings(match) {
  return (match && match.scores || []).map((s) => {
    const m = /^(\d+)\/(\d+)\s*\((\d+(?:\.\d)?)\)$/.exec(String(s.value || ""));
    return m ? { inning: s.inning || "", r: +m[1], w: +m[2], o: m[3] } : null;
  }).filter(Boolean);
}
function szAiFailureKind(error) {
  const text = String(error && error.message || "").toLowerCase();
  if (/daily|allocation|neurons|quota/.test(text)) return "quota";
  if (/capacity|busy/.test(text)) return "capacity";
  if (/timeout|timed out|aborted/.test(text)) return "timeout";
  return "inference_error";
}
function szLogAiFailure(error) {
  // Never log prompts, responses, request bodies, raw error text or credentials.
  console.error(JSON.stringify({ event: "zaap_ai_failure", kind: szAiFailureKind(error),
    code: /^[0-9]{3,5}$/.test(String(error && error.code || "")) ? String(error.code) : null }));
}
// KV quota fix: TTL caches and request bookkeeping use existing D1.
const SZ_STORE_REV = "kv-d1-20261004";
const szWrappedEnvs = new WeakMap();
function szTransientKey(k) {
 return /^(?:cbz_budget_|cbz_rl$|cbz_map$|cbz_fb_at$|tap_v3_|chat_rl_|chat_day_|sc_c_|comm_c|md_c_|md_cb_|md_f_|wx2_|sq_|ovr_|ser_|rank_|player_|fd_|espn_sb_|espn_sum_|espn_gsum_)/.test(k) || k === "cricket_cbz" || k === "series_map";
}
function szSameValue(a,b) {
 if(a===b) return true;
 try {
  const x=JSON.parse(a),y=JSON.parse(b);
  if(x && y && typeof x==="object" && typeof y==="object") {
   delete x.at;delete y.at;
   return JSON.stringify(x)===JSON.stringify(y);
  }
 } catch {}
 return false;
}
function szQuotaEnv(env) {
 if(!env.DB || !env.SPORTS_KV) return env;
 if(szWrappedEnvs.has(env)) return szWrappedEnvs.get(env);
 const kv=env.SPORTS_KV,db=env.DB;
 const proxy={
  async get(key,type) {
   if(!szTransientKey(key)) return kv.get(key,type);
   const row=await db.prepare("SELECT value,expires_at FROM sz_kv_cache WHERE key=?").bind(key).first();
   if(row) {
    if(row.expires_at && row.expires_at <= Date.now()) return null;
    return (type==="json"||type?.type==="json")?JSON.parse(row.value):row.value;
   }
   return kv.get(key,type); // legacy entries remain readable, never bulk-delete
  },
  async put(key,value,opts={}) {
   if(szTransientKey(key)) {
    const expires=opts.expiration ? opts.expiration*1000 : opts.expirationTtl ? Date.now()+opts.expirationTtl*1000 : 0;
    await db.prepare("INSERT INTO sz_kv_cache(key,value,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at").bind(key,value,expires).run();
    return;
   }
   const before=await kv.get(key);
   if(szSameValue(before,value)) return;
   return kv.put(key,value,opts);
  },
  list:kv.list.bind(kv), delete:kv.delete.bind(kv)
 };
 const out={...env,SPORTS_KV:proxy}; szWrappedEnvs.set(env,out);szWrappedEnvs.set(out,out);return out;
}
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __defProp22 = Object.defineProperty;
var __name22 = /* @__PURE__ */ __name2((target, value) => __defProp22(target, "name", { value, configurable: true }), "__name");
var __defProp222 = Object.defineProperty;
var __name222 = /* @__PURE__ */ __name22((target, value) => __defProp222(target, "name", { value, configurable: true }), "__name");
var __defProp2222 = Object.defineProperty;
var __name2222 = /* @__PURE__ */ __name222((target, value) => __defProp2222(target, "name", { value, configurable: true }), "__name");
var __defProp22222 = Object.defineProperty;
var __name22222 = /* @__PURE__ */ __name2222((target, value) => __defProp22222(target, "name", { value, configurable: true }), "__name");
var __defProp222222 = Object.defineProperty;
var __name222222 = /* @__PURE__ */ __name22222((target, value) => __defProp222222(target, "name", { value, configurable: true }), "__name");
var __defProp2222222 = Object.defineProperty;
var __name2222222 = /* @__PURE__ */ __name222222((target, value) => __defProp2222222(target, "name", { value, configurable: true }), "__name");
var __defProp22222222 = Object.defineProperty;
var __name22222222 = /* @__PURE__ */ __name2222222((target, value) => __defProp22222222(target, "name", { value, configurable: true }), "__name");
var __szRawFetch = globalThis.fetch;
globalThis.fetch = __name22222222(function(input, init) {
  if (init && init.signal) return __szRawFetch(input, init);
  var c = new AbortController();
  var t = setTimeout(function() {
    c.abort();
  }, 8e3);
  return __szRawFetch(input, Object.assign({}, init, { signal: c.signal })).finally(function() {
    clearTimeout(t);
  });
}, "fetch");
var CRIC_API = "https://api.cricapi.com/v1";
var FOOT_API = "https://api.football-data.org/v4";
var CBZ_API = "https://cricbuzz-cricket.p.rapidapi.com";
var ESPN_API = "https://site.api.espn.com/apis/site/v2/sports";
var ESPN_TENNIS_API = "https://site.api.espn.com/apis/site/v2/sports";
var ESPN_SPORTS = [
  { key: "nba", path: "basketball/nba", label: "NBA", icon: "\u{1F3C0}", kind: "events" },
  { key: "mlb", path: "baseball/mlb", label: "MLB", icon: "\u26BE", kind: "events" },
  { key: "nhl", path: "hockey/nhl", label: "NHL", icon: "\u{1F3D2}", kind: "events" },
  { key: "tennis", path: "tennis/atp", label: "Tennis", icon: "\u{1F3BE}", kind: "tennis", also: "tennis/wta" },
  { key: "f1", path: "racing/f1", label: "F1", icon: "\u{1F3CE}\uFE0F", kind: "f1" }
];
var FOOT_TO_ESPN = {
  "premier league": "eng.1",
  "championship": "eng.2",
  "bundesliga": "ger.1",
  "serie a": "ita.1",
  "primera division": "esp.1",
  "la liga": "esp.1",
  "ligue 1": "fra.1",
  "eredivisie": "ned.1",
  "primeira liga": "por.1",
  "campeonato brasileiro s\xE9rie a": "bra.1",
  "campeonato brasileiro serie a": "bra.1",
  "uefa champions league": "uefa.champions",
  "european championship": "uefa.euro",
  "fifa world cup": "fifa.world",
  "world cup": "fifa.world"
};
var NEWS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport" },
  { url: "https://www.skysports.com/rss/12040", source: "Sky Sports" },
  { url: "https://www.goal.com/feeds/en/news", source: "Goal.com" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", source: "The Times of India" },
  { url: "https://www.hindustantimes.com/feeds/rss/sports/rssfeed.xml", source: "Hindustan Times" },
  { url: "https://keralakaumudi.com/rss/sports.xml", source: "Kerala Kaumudi" }
];
var LANGS = { hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi", kn: "Kannada", ml: "Malayalam", gu: "Gujarati", pa: "Punjabi", ur: "Urdu", en: "English" };
function html(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").trim();
}
__name(html, "html");
__name2(html, "html");
__name22(html, "html");
__name222(html, "html");
__name2222(html, "html");
__name22222(html, "html");
__name222222(html, "html");
__name2222222(html, "html");
__name22222222(html, "html");
function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
__name(norm, "norm");
__name2(norm, "norm");
__name22(norm, "norm");
__name222(norm, "norm");
__name2222(norm, "norm");
__name22222(norm, "norm");
__name222222(norm, "norm");
__name2222222(norm, "norm");
__name22222222(norm, "norm");
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders } });
}
__name(json, "json");
__name2(json, "json");
__name22(json, "json");
__name222(json, "json");
__name2222(json, "json");
__name22222(json, "json");
__name222222(json, "json");
__name2222222(json, "json");
__name22222222(json, "json");
var SW_JS = `const C='sz-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['/','/manifest.webmanifest','/icon-192.png','/icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
if(u.pathname.startsWith('/api/'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match('/'))));return}
e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})))});
self.addEventListener('push',e=>{e.waitUntil(fetch('/api/notify/latest').then(r=>r.json()).then(n=>self.registration.showNotification(n.title,{body:n.body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:n.url||'/'}})).catch(()=>self.registration.showNotification('ScoreZaap',{body:'A match you follow has an update'})))});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'/';e.waitUntil(clients.matchAll({type:'window'}).then(cs=>{for(const c of cs){if(c.url.includes(location.origin)&&'focus' in c){c.navigate(u);return c.focus()}}return clients.openWindow(u)}))});
`;
var ICONS_B64 = {
  "icon-192": "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",
  "icon-512": "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",
  "icon-180": "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",
  "icon-maskable": "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"
};
function b64ToBytes(b) {
  const bin = atob(b);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
__name(b64ToBytes, "b64ToBytes");
__name2(b64ToBytes, "b64ToBytes");
__name22(b64ToBytes, "b64ToBytes");
__name222(b64ToBytes, "b64ToBytes");
__name2222(b64ToBytes, "b64ToBytes");
__name22222(b64ToBytes, "b64ToBytes");
__name222222(b64ToBytes, "b64ToBytes");
__name2222222(b64ToBytes, "b64ToBytes");
__name22222222(b64ToBytes, "b64ToBytes");
async function szFastJson(url, headers, ttl, ms) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), ms || 2500);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal, cf: { cacheTtl: ttl, cacheEverything: true } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tm);
  }
}
__name(szFastJson, "szFastJson");
__name2(szFastJson, "szFastJson");
// Multi-day matches remain live overnight, but their unchanged stumps scores
// do not need detail parsing on every visitor request. The scheduled match-list
// refresh restores normal overlay polling as soon as the next day starts.
function szCricketNeedsOverlay(m, now = Date.now()) {
  return String(m.id).startsWith("cbz_") && m.status !== "finished" &&
    (!m.start || new Date(m.start).getTime() <= now) &&
    !/\bstumps\b/i.test(String(m.statusText || ""));
}
// Provider data can freeze at the toss stage for a match that is long over.
// Well past the format's full length with no innings recorded and the source
// still saying Toss/Preview, the cron stops treating it as live so a stale
// card cannot sit at the top. Thresholds carry slack for delayed starts:
// T20 ~2h max rain delay + ~4h play (8h), ODI ~5h + ~9h (14h), Tests two
// fully washed days at the toss (54h). Once play begins the state leaves
// Toss, and a rescheduled match arrives with a new start time, so neither
// can trip this; only a source that stopped updating can.
function szCricketStuckAfterMs(matchType) {
  const t = String(matchType || "").toUpperCase();
  if (t === "TEST") return 54 * 36e5;
  if (t === "ODI") return 14 * 36e5;
  return 8 * 36e5;
}
// Hand-verified results for matches no free provider kept covering. An entry
// is added only after the final result is confirmed against two independent
// live sources, and it expires 10 days after the match start so the table
// cannot grow stale. The stuck-feed branch adopts it exactly like a
// conclusive cricapi reading of the same fixture.
var SZ_MANUAL_CRICKET_RESULTS = {
  // SWD vs Boland, Super Eights, CSA T20 Challenge 2026 (Paarl, 7 Nov 2026):
  // Cricbuzz froze at the toss and cricapi does not carry this series.
  // Result verified against SuperSport and MyKhel scorecards.
  cbz_174276: {
    start: "2026-11-07T11:00:00.000Z",
    statusText: "South Western Districts won by 19 runs",
    scores: [
      { inning: "SWD 1", value: "169/5 (20)" },
      { inning: "BOL 1", value: "150/7 (20)" }
    ]
  },
  // Western Province vs Lions, Super Eights, CSA T20 Challenge 2026
  // (Newlands, 7 Nov 2026): Cricbuzz froze at the toss and cricapi does not
  // carry this series. WP innings confirmed by ESPN and CREX (Lions chase
  // tracked to 155/6 off 18.5); final score and result confirmed by
  // Cricprism and Scores24. Toss: Lions chose to field.
  // West Indies A vs England Lions, 1st unofficial ODI, England Lions tour
  // of West Indies 2026 (Warner Park, Basseterre, 7 Nov 2026): Cricbuzz froze
  // mid-chase at 120/5 (18) and still claims "In Progress" a day later;
  // cricapi does not carry this series. Result verified against the official
  // windiescricket.com series page and the cricketworld.com/crictracker
  // scorecards: Lions 240/6 (33.5) chasing a DLS target of 240 in 36 overs.
  cbz_176496: {
    start: "2026-11-07T18:00:00.000Z",
    statusText: "England Lions won by 4 wickets (DLS Method)",
    scores: [
      { inning: "WIA 1", value: "212/8 (40)" },
      { inning: "ENGA 1", value: "240/6 (33.5)" }
    ]
  },
  cbz_174284: {
    start: "2026-11-07T16:00:00.000Z",
    statusText: "Western Province won by 9 runs",
    scores: [
      { inning: "WPR 1", value: "178/9 (20)" },
      { inning: "LIONS 1", value: "169/6 (20)" }
    ]
  }
};
function szManualCricketResult(id) {
  const r = SZ_MANUAL_CRICKET_RESULTS[String(id)];
  if (!r) return null;
  const t0 = Date.parse(r.start || "");
  if (!Number.isFinite(t0) || Date.now() < t0 || Date.now() - t0 > 10 * 24 * 36e5) return null;
  return r;
}
async function szLiveOverlay(c2, f2, espnBlobs) {
  const now = Date.now();
  const started = /* @__PURE__ */ __name2((m) => m.status === "live" || m.status === "upcoming" && m.start && new Date(m.start).getTime() <= now && now - new Date(m.start).getTime() < 6 * 36e5, "started");
  const jobs = [];
  [...c2.matches || [], ...f2.matches || [], ...Object.values(espnBlobs).flatMap((b) => b.matches || [])].forEach((m) => delete m.celebrationVerifiedAt);
  const cua = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept": "application/json" };
  const liveC = (c2.matches || []).filter((m) => szCricketNeedsOverlay(m, now)).sort((a, b) => String(b.start || "").localeCompare(String(a.start || ""))).slice(0, 12);
  for (const m of liveC) {
    jobs.push((async () => {
      const miniUrl = "https://m.cricbuzz.com/api/mcenter/scorecard/" + String(m.id).slice(4);
      let d = await szFastJson(miniUrl, cua, 3, 2500);
      let s = d ? cbzMiniScorecard(d) : null;
      if (!s) {
        d = await szFastJson(miniUrl, cua, 1, 2500);
        s = d ? cbzMiniScorecard(d) : null;
      }
      // Never let an older source reading replace a newer saved score.
      if (s && Array.isArray(s.innings) && szOlderCricketInnings(s.innings, szListCricketInnings(m), m && m.matchType)) s = null;
      if (!s && m.status === "live") {
        m.scoreDelayed = true;
        console.error(JSON.stringify({ event: "score_overlay_unverified", sport: "cricket", id: String(m.id) }));
      }
      if (s) {
        delete m.scoreDelayed;
        m.celebrationVerifiedAt = Date.now();
        m.celebrationInnings = s.innings.map((i, n) => ({ key: i.team + ":" + n, team: i.team, r: i.runs, w: i.wkts, bats: (i.batsmen || []).map((b) => ({ id: b.id || b.name, name: b.name, r: b.r, f: b.f, s: b.s })) }));
        const prevText = m.statusText;
        const prevScores = m.scores;
        if (Array.isArray(s.innings) && s.innings.length) m.scores = [];
        applyMiniScore(m, s);
        if (!Array.isArray(m.scores) || !m.scores.length) m.scores = prevScores;
        if (m.status !== "finished" && prevText && /opt(ed)? to (bat|bowl)|won the toss/i.test(m.statusText || "")) m.statusText = prevText;
      }
    })());
  }
  const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
  const bySlug = {};
  for (const m of (f2.matches || []).filter(started)) {
    const slug = m.espnLeague;
    if (!slug) continue;
    (bySlug[slug] = bySlug[slug] || []).push(m);
  }
  for (const slug of Object.keys(bySlug).slice(0, 8)) {
    jobs.push((async () => {
      const sb = await szFastJson(`${ESPN_API}/soccer/${slug}/scoreboard`, ua, 15, 2500);
      if (!sb || !Array.isArray(sb.events)) return;
      for (const m of bySlug[slug]) {
        let ev = null;
        const pre = "soccer/" + slug + ":";
        if (String(m.id).startsWith(pre)) ev = sb.events.find((e) => String(e.id) === String(m.id).slice(pre.length));
        if (!ev && szFbIds(m)) {
          const h0 = szFbEspnEvent(m, sb.events);
          if (h0 && szFbApplyEspn(m, h0)) m.celebrationVerifiedAt = Date.now();
          continue;
        }
        if (!ev) continue;
        const mm = espnEventToMatch("football", "soccer/" + slug, "", ev, "");
        if (mm.status === "upcoming") continue;
        m.celebrationVerifiedAt = Date.now();
        m.status = mm.status;
        if (mm.statusText) m.statusText = mm.statusText;
        if (String(m.id).startsWith(pre)) {
          m.scores = mm.scores;
        } else {
          const comps = ((ev.competitions || [])[0] || {}).competitors || [];
          const eh = comps.find((x) => x.homeAway === "home") || comps[0] || {};
          const ea = comps.find((x) => x.homeAway === "away") || comps[1] || {};
          const hn = norm(m.home && m.home.name);
          const ehn = [eh.team?.displayName, eh.team?.shortDisplayName, eh.team?.name].map(norm);
          const same = ehn.some((y) => y && hn && (hn.includes(y) || y.includes(hn)));
          const hs = same ? eh.score : ea.score, as = same ? ea.score : eh.score;
          if (hs != null && as != null) m.scores = [{ inning: "", value: `${hs} - ${as}` }];
        }
      }
    })());
  }
  for (const spec of ESPN_SPORTS) {
    const blob = espnBlobs[spec.key];
    if (!blob || !Array.isArray(blob.matches) || !blob.matches.some(started)) continue;
    jobs.push((async () => {
      try {
        if (spec.kind === "tennis") {
          const out = [];
          for (const p of [spec.path, spec.also]) {
            if (!p) continue;
            const d2 = await szFastJson(`${ESPN_API}/${p}/scoreboard`, ua, 15, 2500);
            if (d2) out.push(...espnTennisToMatches(p, d2).map((m) => ({ ...m, celebrationVerifiedAt: Date.now() })));
          }
          if (!out.length) return;
          const rank = { live: 0, upcoming: 1, finished: 2 };
          blob.matches = out.sort((a, b) => rank[a.status] - rank[b.status] || new Date(b.start) - new Date(a.start)).slice(0, 40);
          return;
        }
        const d = await szFastJson(`${ESPN_API}/${spec.path}/scoreboard`, ua, 15, 2500);
        if (!d) return;
        const fresh = spec.kind === "f1" ? espnF1ToMatches(spec.path, d) : (d.events || []).map((e) => espnEventToMatch(spec.key, spec.path, spec.icon, e, d.leagues?.[0]?.name));
        if (fresh && fresh.length) blob.matches = fresh.map((m) => ({ ...m, celebrationVerifiedAt: Date.now() }));
      } catch (e) {
      }
    })());
  }
  await Promise.all(jobs);
  return now;
}
__name(szLiveOverlay, "szLiveOverlay");
__name2(szLiveOverlay, "szLiveOverlay");
async function readKV(env, key, fallback) {
  if (!env.SPORTS_KV) return fallback;
  const v = await env.SPORTS_KV.get(key, "json");
  return v || fallback;
}
__name(readKV, "readKV");
__name2(readKV, "readKV");
__name22(readKV, "readKV");
__name222(readKV, "readKV");
__name2222(readKV, "readKV");
__name22222(readKV, "readKV");
__name222222(readKV, "readKV");
__name2222222(readKV, "readKV");
__name22222222(readKV, "readKV");
var CBZ_IMG = "https://www.cricbuzz.com/a/img/v1/152x152/i1/c";
function cbzExtractMatches(text) {
  const out = [];
  if (!text) return out;
  const escd = text.indexOf('{\\"matchInfo\\":') !== -1;
  const key = escd ? '{\\"matchInfo\\":' : '{"matchInfo":';
  let i = 0, guard = 0;
  const seen = {};
  while ((i = text.indexOf(key, i)) !== -1 && guard++ < 400) {
    const pk = /matchId\\?":(\d+)/.exec(text.slice(i, i + 80));
    if (pk && seen[pk[1]]) {
      i += key.length;
      continue;
    }
    let depth = 0, j = i;
    const lim = Math.min(text.length, i + 2e4);
    for (; j < lim; j++) {
      const c = text.charCodeAt(j);
      if (c === 123) depth++;
      else if (c === 125) {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth === 0) {
      let seg = text.slice(i, j + 1);
      if (escd) seg = seg.replace(/\\\\/g, "").replace(/\\"/g, '"').replace(/\u0001/g, "\\");
      try {
        const o = JSON.parse(seg);
        if (o && o.matchInfo && o.matchInfo.matchId) {
          seen[o.matchInfo.matchId] = 1;
          out.push(o);
        }
      } catch (e) {
      }
    }
    i = j + 1;
  }
  return out;
}
__name(cbzExtractMatches, "cbzExtractMatches");
__name2(cbzExtractMatches, "cbzExtractMatches");
async function cbzFreeList() {
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const get = /* @__PURE__ */ __name2(async (u) => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8e3);
      const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "text/html,application/json" }, signal: ctl.signal });
      clearTimeout(t);
      return r.ok ? await r.text() : "";
    } catch (e) {
      return "";
    }
  }, "get");
  const [home, ls] = await Promise.all([get("https://m.cricbuzz.com/api/home"), get("https://www.cricbuzz.com/cricket-match/live-scores")]);
  const matches = cbzExtractMatches(home).concat(cbzExtractMatches(ls));
  console.log("cbz free list:", matches.length, "matches");
  return matches.length ? { typeMatches: [{ seriesMatches: [{ matches }] }] } : null;
}
__name(cbzFreeList, "cbzFreeList");
__name2(cbzFreeList, "cbzFreeList");
// Upstream feeds occasionally paste a series or match name into the middle of
// itself ("India A tour of NeIndia A tour of New Zealand, 2026w Zealand, 2026"
// = S[:18] + S + S[18:], seen live on the Cricbuzz list feed 2026-11-07). That
// shape is exactly S[:k] + S + S[k:] with the splice inside a word, so the
// string is 2|S| long. When the splice is unambiguous, restore S; genuine
// repeated names splice between words and pass through untouched.
function szRepairSplicedName(s) {
  const str = String(s || "");
  const n = str.length;
  if (n < 24 || n % 2 !== 0) return str;
  const half = n / 2;
  for (let k = 1; k < half; k++) {
    const cand = str.slice(k, k + half);
    if (str.slice(0, k) !== cand.slice(0, k) || str.slice(k + half) !== cand.slice(k)) continue;
    if (/[A-Za-z]/.test(str[k - 1]) && /[A-Za-z]/.test(str[k])) return cand;
  }
  return str;
}
__name(szRepairSplicedName, "szRepairSplicedName");
__name2(szRepairSplicedName, "szRepairSplicedName");
async function fetchCricketCbz(env) {
  let live = await cbzFreeList().catch(() => null);
  let up = null;
  if (!live) {
    live = await cbzFetch(env, "/matches/v1/live").catch(() => null);
    up = await cbzFetch(env, "/matches/v1/upcoming").catch(() => null);
  }
  const out = [];
  const seen = {};
  const eat = /* @__PURE__ */ __name2222222((d, liveDefault) => {
    for (const tm of d && d.typeMatches || []) {
      for (const sm of tm.seriesMatches || []) {
        const wrap = sm.seriesAdWrapper || sm;
        for (const m of wrap.matches || []) {
          const mi = m.matchInfo || {};
          const mid = mi.matchId;
          if (!mid || seen[mid]) continue;
          seen[mid] = 1;
          const t1 = mi.team1 || {}, t2 = mi.team2 || {};
          const st = (mi.state || "").toLowerCase();
          const isLive = st.includes("progress") || st.includes("break") || st.includes("stumps") || st.includes("drinks") || st.includes("rain") || st.includes("delay") || st.includes("toss");
          const isFin = st.includes("complete");
          const scores = [];
          const ms = m.matchScore || {};
          const pushInn = /* @__PURE__ */ __name2222222((sname, inn) => {
            ["inngs1", "inngs2"].forEach((k, i) => {
              const x = inn && inn[k];
              if (x && x.runs != null) scores.push({ inning: sname + " " + (i + 1), value: x.runs + "/" + (x.wickets != null ? x.wickets : 0) + " (" + szCbzListOvers(x.overs) + ")" });
            });
          }, "pushInn");
          pushInn(t1.teamSName || "T1", ms.team1Score);
          pushInn(t2.teamSName || "T2", ms.team2Score);
          const vi = mi.venueInfo || {};
          const seriesName = szRepairSplicedName(mi.seriesName);
          out.push({
            id: "cbz_" + mid,
            sport: "cricket",
            title: (t1.teamName || "") + " vs " + (t2.teamName || "") + (mi.matchDesc ? ", " + mi.matchDesc : "") + (seriesName ? ", " + seriesName : ""),
            home: { name: t1.teamName || "", short: (t1.teamSName || "").slice(0, 8), logo: t1.imageId ? CBZ_IMG + t1.imageId + "/i.jpg" : null },
            away: { name: t2.teamName || "", short: (t2.teamSName || "").slice(0, 8), logo: t2.imageId ? CBZ_IMG + t2.imageId + "/i.jpg" : null },
            status: isLive ? "live" : isFin ? "finished" : "upcoming",
            statusText: mi.status || null,
            scores,
            venue: vi.ground ? vi.ground + (vi.city ? ", " + vi.city : "") : null,
            start: mi.startDate ? (/* @__PURE__ */ new Date(+mi.startDate)).toISOString() : null,
            matchType: (mi.matchFormat || "").toUpperCase(),
            series: seriesName || null
          });
        }
      }
    }
  }, "eat");
  eat(live, true);
  eat(up, false);
  const rank = /* @__PURE__ */ __name2222222((m) => m.status === "live" ? 0 : m.status === "upcoming" ? 1 : 2, "rank");
  out.sort((a, b) => rank(a) - rank(b) || String(a.start || "").localeCompare(String(b.start || "")));
  return out.slice(0, 60);
}
__name(fetchCricketCbz, "fetchCricketCbz");
__name2(fetchCricketCbz, "fetchCricketCbz");
__name22(fetchCricketCbz, "fetchCricketCbz");
__name222(fetchCricketCbz, "fetchCricketCbz");
__name2222(fetchCricketCbz, "fetchCricketCbz");
__name22222(fetchCricketCbz, "fetchCricketCbz");
__name222222(fetchCricketCbz, "fetchCricketCbz");
__name2222222(fetchCricketCbz, "fetchCricketCbz");
__name22222222(fetchCricketCbz, "fetchCricketCbz");
function czTeamKey(t) {
  const n = String(t && t.name || t || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
  return n;
}
__name(czTeamKey, "czTeamKey");
__name2(czTeamKey, "czTeamKey");
function czFixtureTeams(m) {
  return [czTeamKey(m.home), czTeamKey(m.away)].sort().join("|");
}
__name(czFixtureTeams, "czFixtureTeams");
__name2(czFixtureTeams, "czFixtureTeams");
function czMatchNo(m) {
  const x = /(\d+)(?:st|nd|rd|th)\s+(?:Match|ODI|T20I?|Test|unofficial)/i.exec(String(m.title || ""));
  return x ? x[1] : null;
}
__name(czMatchNo, "czMatchNo");
__name2(czMatchNo, "czMatchNo");
function dedupeCricket(list) {
  const src = (list || []).filter(Boolean);
  const isCbz = /* @__PURE__ */ __name2((m) => String(m.id).startsWith("cbz_"), "isCbz");
  const kept = [];
  const seenIds = /* @__PURE__ */ new Set();
  const cbzByTeams = /* @__PURE__ */ new Map();
  for (const m of src.filter(isCbz)) {
    if (seenIds.has(String(m.id))) continue;
    seenIds.add(String(m.id));
    kept.push(m);
    const tk = czFixtureTeams(m);
    if (!cbzByTeams.has(tk)) cbzByTeams.set(tk, []);
    cbzByTeams.get(tk).push(m);
  }
  const toMs = /* @__PURE__ */ __name2((v) => v ? Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(String(v)) ? v : v + "Z") : NaN, "toMs");
  for (const m of src.filter((x) => !isCbz(x))) {
    if (seenIds.has(String(m.id))) continue;
    const tk = czFixtureTeams(m);
    const t = toMs(m.start), no = czMatchNo(m);
    const dup = tk !== "|" && (cbzByTeams.get(tk) || []).some((c) => {
      const cn = czMatchNo(c);
      if (no && cn && no !== cn) return false;
      const ct = toMs(c.start);
      if (isNaN(t) || isNaN(ct)) return true;
      if (Math.abs(ct - t) < 12 * 36e5) return true;
      // Same fixture despite a corrupted/offset provider start date (seen:
      // cricapi dateTimeGMT a day off): identical series + identical match
      // number + compatible match type, dates no more than a full Test apart.
      const seriesOf = (x) => String(x && x.series || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const ms = seriesOf(m), cs = seriesOf(c);
      if (!ms || !cs || ms !== cs) return false;
      if (!no || !cn || no !== cn) return false;
      const mtM = String(m.matchType || "").toUpperCase(), mtC = String(c.matchType || "").toUpperCase();
      if (mtM && mtC && mtM !== mtC) return false;
      return Math.abs(ct - t) <= 5 * 24 * 36e5;
    });
    if (dup) continue;
    seenIds.add(String(m.id));
    kept.push(m);
  }
  return kept;
}
__name(dedupeCricket, "dedupeCricket");
__name2(dedupeCricket, "dedupeCricket");
async function fetchCricket(env) {
  const r = await fetch(`${CRIC_API}/currentMatches?apikey=${env.CRICKETDATA_KEY}&offset=0`);
  const j = await r.json();
  if (!j.data) throw new Error("cricketdata limit or error - keeping stale KV");
  const out = [];
  for (const m of j.data || []) {
    const scores = (m.score || []).map((x) => ({ inning: (x.inning || "").replace(/ Inning.*$/, ""), value: `${x.r}/${x.w} (${x.o})` }));
    const nm = szRepairSplicedName(m.name);
    out.push({
      id: m.id,
      sport: "cricket",
      title: nm,
      home: { name: m.teams?.[0] || "", short: (m.teamInfo?.[0]?.shortname || m.teams?.[0] || "").slice(0, 8), logo: m.teamInfo?.[0]?.img },
      away: { name: m.teams?.[1] || "", short: (m.teamInfo?.[1]?.shortname || m.teams?.[1] || "").slice(0, 8), logo: m.teamInfo?.[1]?.img },
      status: m.matchEnded ? "finished" : m.matchStarted ? "live" : "upcoming",
      statusText: m.status,
      scores,
      venue: m.venue,
      start: m.dateTimeGMT,
      matchType: (m.matchType || "").toUpperCase(),
      series: (String(nm || "").split(",").length > 2 ? String(nm || "").split(",").slice(2).join(",").trim() : null) || null
    });
  }
  const rank = { live: 0, upcoming: 1, finished: 2 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.start) - new Date(b.start));
}
__name(fetchCricket, "fetchCricket");
__name2(fetchCricket, "fetchCricket");
__name22(fetchCricket, "fetchCricket");
__name222(fetchCricket, "fetchCricket");
__name2222(fetchCricket, "fetchCricket");
__name22222(fetchCricket, "fetchCricket");
__name222222(fetchCricket, "fetchCricket");
__name2222222(fetchCricket, "fetchCricket");
__name22222222(fetchCricket, "fetchCricket");
var FOOT_COMPS = ["PL", "ELC", "BL1", "SA", "PD", "FL1", "DED", "PPL", "BSA", "CL"];
var FOOT_ESPN_LEAGUES = [["uefa.nations", "UEFA Nations League"], ["fifa.friendly", "International Friendly"], ["fifa.worldq.uefa", "World Cup Qualifiers - UEFA"], ["fifa.worldq.afc", "World Cup Qualifiers - AFC"], ["fifa.worldq.conmebol", "World Cup Qualifiers - CONMEBOL"]];
var FOOT_COMP_SLUG = { PL: "eng.1", ELC: "eng.2", BL1: "ger.1", SA: "ita.1", PD: "esp.1", FL1: "fra.1", DED: "ned.1", PPL: "por.1", BSA: "bra.1", CL: "uefa.champions" };
// football-data.org team name -> ESPN team id. Verified one by one; unmapped teams are never reconciled.
var FOOT_TEAM_ID = {
 "1. FC Köln": 122,
 "1. FC Union Berlin": 598,
 "1. FSV Mainz 05": 2950,
 "AC Milan": 103,
 "AC Monza": 4007,
 "ACF Fiorentina": 109,
 "ADO Den Haag": 2726,
 "AFC Ajax": 139,
 "AFC Bournemouth": 349,
 "AJ Auxerre": 172,
 "AS Monaco FC": 174,
 "AS Roma": 104,
 "AZ": 140,
 "Académico de Viseu FC": 21607,
 "Angers SCO": 7868,
 "Arsenal FC": 359,
 "Aston Villa FC": 362,
 "Atalanta BC": 105,
 "Athletic Club": 93,
 "Bayer 04 Leverkusen": 131,
 "Birmingham City FC": 392,
 "Blackburn Rovers FC": 365,
 "Bologna FC 1909": 107,
 "Bolton Wanderers FC": 358,
 "Borussia Dortmund": 124,
 "Borussia Mönchengladbach": 268,
 "Botafogo FR": 6086,
 "Brentford FC": 337,
 "Brighton & Hove Albion FC": 331,
 "Bristol City FC": 333,
 "Burnley FC": 379,
 "CA Mineiro": 7632,
 "CA Osasuna": 97,
 "CA Paranaense": 3458,
 "CD Nacional": 3472,
 "CD Santa Clara": 12215,
 "CF Estrela da Amadora": 21610,
 "CR Flamengo": 819,
 "CR Vasco da Gama": 3454,
 "CS Marítimo": 552,
 "Cagliari Calcio": 2925,
 "Cardiff City FC": 347,
 "Casa Pia AC": 21581,
 "Chapecoense AF": 9318,
 "Charlton Athletic FC": 372,
 "Chelsea FC": 363,
 "Club Atlético de Madrid": 1068,
 "Clube do Remo": 4936,
 "Como 1907": 2572,
 "Coritiba FBC": 3456,
 "Coventry City FC": 388,
 "Cruzeiro EC": 2022,
 "Crystal Palace FC": 384,
 "Deportivo Alavés": 96,
 "Derby County FC": 374,
 "EC Bahia": 9967,
 "EC Vitória": 3457,
 "ES Troyes AC": 170,
 "Eintracht Frankfurt": 125,
 "Elche CF": 3751,
 "Everton FC": 368,
 "FC Alverca": 21613,
 "FC Arouca": 15784,
 "FC Augsburg": 3841,
 "FC Barcelona": 83,
 "FC Bayern München": 132,
 "FC Famalicão": 12698,
 "FC Groningen": 145,
 "FC Internazionale Milano": 110,
 "FC Lorient": 273,
 "FC Porto": 437,
 "FC Schalke 04": 133,
 "FC Twente '65": 152,
 "FC Utrecht": 153,
 "FK Bodø/Glimt": 2980,
 "FK Shakhtar Donetsk": 493,
 "Feyenoord Rotterdam": 142,
 "Fluminense FC": 3445,
 "Fortuna Sittard": 143,
 "Frosinone Calcio": 4057,
 "Fulham FC": 370,
 "GD Estoril Praia": 12216,
 "Galatasaray SK": 432,
 "Genoa CFC": 3263,
 "Getafe CF": 2922,
 "Gil Vicente FC": 3699,
 "Go Ahead Eagles": 3706,
 "Grêmio FBPA": 6273,
 "Hamburger SV": 127,
 "Hull City AFC": 306,
 "Ipswich Town FC": 373,
 "Juventus FC": 111,
 "LASK Linz": 4411,
 "Le Havre AC": 3236,
 "Le Mans FC": 2697,
 "Leeds United FC": 357,
 "Levante UD": 1538,
 "Lille OSC": 166,
 "Lincoln City FC": 314,
 "Liverpool FC": 364,
 "Manchester City FC": 382,
 "Manchester United FC": 360,
 "Middlesbrough FC": 369,
 "Millwall FC": 391,
 "Mirassol FC": 9169,
 "Moreirense FC": 3696,
 "Málaga CF": 99,
 "NEC": 147,
 "Newcastle United FC": 361,
 "Norwich City FC": 381,
 "Nottingham Forest FC": 393,
 "OGC Nice": 2502,
 "Olympique Lyonnais": 167,
 "Olympique de Marseille": 176,
 "PEC Zwolle": 2565,
 "PSV": 148,
 "Paris FC": 6851,
 "Paris Saint-Germain FC": 160,
 "Parma Calcio 1913": 115,
 "Portsmouth FC": 385,
 "Preston North End FC": 394,
 "Queens Park Rangers FC": 334,
 "RB Bragantino": 6079,
 "RB Leipzig": 11420,
 "RC Celta de Vigo": 85,
 "RC Deportivo La Coruña": 90,
 "RC Strasbourg Alsace": 180,
 "RCD Espanyol de Barcelona": 88,
 "Racing Club de Lens": 175,
 "Rayo Vallecano de Madrid": 101,
 "Real Betis Balompié": 244,
 "Real Madrid CF": 86,
 "Real Racing Club de Santander": 87,
 "Real Sociedad de Fútbol": 89,
 "Rio Ave FC": 3822,
 "SBV Excelsior": 2566,
 "SC Cambuur-Leeuwarden": 3736,
 "SC Corinthians Paulista": 874,
 "SC Freiburg": 126,
 "SC Heerenveen": 146,
 "SC Internacional": 1936,
 "SK Slavia Praha": 494,
 "SC Paderborn 07": 3307,
 "SE Palmeiras": 2029,
 "SS Lazio": 112,
 "SSC Napoli": 114,
 "SV 07 Elversberg": 10388,
 "SV Werder Bremen": 137,
 "Santos FC": 2674,
 "Sevilla FC": 243,
 "Sheffield United FC": 398,
 "Southampton FC": 376,
 "Sparta Rotterdam": 151,
 "Sport Lisboa e Benfica": 1929,
 "Sporting Clube de Braga": 2994,
 "Sporting Clube de Portugal": 2250,
 "Stade Brestois 29": 6997,
 "Stade Rennais FC 1901": 169,
 "Stoke City FC": 336,
 "Sunderland AFC": 366,
 "Swansea City AFC": 318,
 "São Paulo FC": 2026,
 "TSG 1899 Hoffenheim": 7911,
 "Telstar 1963": 3735,
 "Torino FC": 239,
 "Tottenham Hotspur FC": 367,
 "Toulouse FC": 179,
 "US Lecce": 113,
 "US Sassuolo Calcio": 3997,
 "Udinese Calcio": 118,
 "Valencia CF": 94,
 "Venezia FC": 17530,
 "VfB Stuttgart": 134,
 "Villarreal CF": 102,
 "Vitória SC": 5309,
 "Watford FC": 395,
 "West Bromwich Albion FC": 383,
 "West Ham United FC": 371,
 "Willem II Tilburg": 156,
 "Wolverhampton Wanderers FC": 380,
 "Wrexham AFC": 352,
 "ŠK Slovan Bratislava": 521
};
function szFbIds(m) {
  const h = FOOT_TEAM_ID[m && m.home && m.home.name], a = FOOT_TEAM_ID[m && m.away && m.away.name];
  return h && a ? [String(h), String(a)] : null;
}
function szFbEspnEvent(m, events) {
  const ids = szFbIds(m);
  if (!ids || !m.start) return null;
  const t0 = new Date(m.start).getTime();
  const hits = [];
  for (const e of events || []) {
    const comps = ((e.competitions || [])[0] || {}).competitors || [];
    const eh = comps.find((x) => x.homeAway === "home"), ea = comps.find((x) => x.homeAway === "away");
    if (!eh || !ea || !eh.team || !ea.team) continue;
    if (String(eh.team.id) !== ids[0] || String(ea.team.id) !== ids[1]) continue;
    if (Math.abs(new Date(e.date).getTime() - t0) > 3 * 36e5) continue;
    hits.push({ e, eh, ea });
  }
  return hits.length === 1 ? hits[0] : null;
}
function szFbApplyEspn(m, hit) {
  const st = (hit.e.competitions[0].status || {}).type || {};
  const hs = hit.eh.score, as = hit.ea.score;
  if (hs == null || as == null || hs === "" || as === "" || isNaN(+hs) || isNaN(+as)) return false;
  let status = null;
  if (st.completed || st.state === "post") status = "finished";
  else if (st.state === "in") status = "live";
  if (!status) return false;
  m.status = status;
  m.statusText = st.shortDetail || st.detail || (status === "finished" ? "FT" : "Live");
  m.scores = [{ inning: "", value: `${hs} - ${as}` }];
  m.espnEventId = String(hit.e.id);
  return true;
}
async function szFootballReconcile(matches, stats) {
  const now = Date.now();
  const day = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");
  const cand = matches.filter((m) => m.status !== "finished" && FOOT_COMP_SLUG[m.comp] && m.start && new Date(m.start).getTime() < now && now - new Date(m.start).getTime() < 6 * 864e5);
  stats.candidates = cand.length;
  const need = {};
  for (const m of cand) {
    if (!szFbIds(m)) { stats.unmapped = (stats.unmapped || 0) + 1; continue; }
    const t = new Date(m.start).getTime();
    for (const d of [day(t - 864e5), day(t)]) need[FOOT_COMP_SLUG[m.comp] + "|" + d] = 1;
  }
  const keys = Object.keys(need).slice(0, 40);
  const events = {};
  const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
  stats.espnCalls = keys.length;
  stats.espnOk = 0;
  for (let i = 0; i < keys.length; i += 6) {
    await Promise.all(keys.slice(i, i + 6).map(async (k) => {
      const [slug, d] = k.split("|");
      const j = await szFastJson(`${ESPN_API}/soccer/${slug}/scoreboard?dates=${d}`, ua, 20, 6000);
      if (j && Array.isArray(j.events)) { stats.espnOk++; (events[slug] = events[slug] || []).push(...j.events); }
    }));
  }
  stats.reconciled = 0;
  stats.noMatch = 0;
  for (const m of cand) {
    if (!szFbIds(m)) continue;
    const hit = szFbEspnEvent(m, events[FOOT_COMP_SLUG[m.comp]]);
    if (!hit) { stats.noMatch++; continue; }
    if (szFbApplyEspn(m, hit)) stats.reconciled++;
  }
}
async function fetchFootball(env, stats, prev) {
  stats = stats || {};
  const df = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const dt2 = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);
  const h2 = { "X-Auth-Token": env.FOOTBALL_DATA_KEY };
  const out = [];
  const seenIds = {};
  const batches = [FOOT_COMPS.slice(0, 5), FOOT_COMPS.slice(5)];
  for (const batch of batches) {
    const results = await Promise.all(batch.map(
      (c) => fetch(`${FOOT_API}/competitions/${c}/matches?dateFrom=${df}&dateTo=${dt2}`, { headers: h2 }).then((r) => { stats.fdStatus = stats.fdStatus || {}; stats.fdStatus[c] = r.status; return r.ok ? r.json() : null; }).catch(() => null)
    ));
    batch.forEach((c, ix) => { if (results[ix]) stats.fdOk = (stats.fdOk || 0) + 1; else (stats.fdFailed = stats.fdFailed || []).push(c); });
    for (const j of results) {
      for (const m of j && j.matches || []) {
        if (seenIds[m.id]) continue;
        seenIds[m.id] = 1;
        const sc = m.score || {};
        const ft = sc.fullTime || {};
        out.push({
          id: String(m.id),
          sport: "football",
          title: `${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
          home: { name: m.homeTeam?.name, short: m.homeTeam?.tla || m.homeTeam?.shortName, logo: m.homeTeam?.crest },
          away: { name: m.awayTeam?.name, short: m.awayTeam?.tla || m.awayTeam?.shortName, logo: m.awayTeam?.crest },
          status: m.status === "IN_PLAY" || m.status === "PAUSED" ? "live" : m.status === "FINISHED" ? "finished" : "upcoming",
          statusText: m.status === "PAUSED" ? "Half-time" : m.status.replace(/_/g, " "),
          scores: ft.home !== null && ft.home !== void 0 ? [{ inning: "", value: `${ft.home} - ${ft.away}` }] : [],
          venue: m.venue,
          start: m.utcDate,
          matchType: m.competition?.name,
          comp: m.competition?.code,
          espnLeague: FOOT_TO_ESPN[(m.competition?.name || "").toLowerCase()] || null
        });
      }
    }
  }
  for (const [lg, label] of FOOT_ESPN_LEAGUES) {
    try {
      const r3 = await fetch(`${ESPN_API}/soccer/${lg}/scoreboard`, { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
      if (!r3.ok) continue;
      const sb = await r3.json();
      for (const e of sb.events || []) {
        const mm = espnEventToMatch("football", "soccer/" + lg, "\u26BD", e, label);
        mm.comp = null;
        mm.espnLeague = lg;
        if (seenIds[mm.id]) continue;
        seenIds[mm.id] = 1;
        out.push(mm);
      }
    } catch (e) {
    }
  }
  if (!stats.fdOk) throw new Error("football-data returned no competitions: " + JSON.stringify(stats.fdStatus || {}));
  for (const m of prev || []) {
    if ((stats.fdFailed || []).includes(m.comp) && !seenIds[m.id]) { seenIds[m.id] = 1; out.push(m); stats.keptFromCache = (stats.keptFromCache || 0) + 1; }
  }
  if (!out.length) throw new Error("football-data empty across competitions");
  await szFootballReconcile(out, stats);
  const rank = { live: 0, upcoming: 1, finished: 2 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || (a.status === "finished" ? new Date(b.start) - new Date(a.start) : new Date(a.start) - new Date(b.start)));
}
__name(fetchFootball, "fetchFootball");
__name2(fetchFootball, "fetchFootball");
__name22(fetchFootball, "fetchFootball");
__name222(fetchFootball, "fetchFootball");
__name2222(fetchFootball, "fetchFootball");
__name22222(fetchFootball, "fetchFootball");
__name222222(fetchFootball, "fetchFootball");
__name2222222(fetchFootball, "fetchFootball");
__name22222222(fetchFootball, "fetchFootball");
function espnEventToMatch(sport, leagueLabel, icon, e, extraLeague) {
  const c = (e.competitions || [])[0] || {};
  const comps = c.competitors || [];
  const home = comps.find((x) => x.homeAway === "home") || comps[0] || {};
  const away = comps.find((x) => x.homeAway === "away") || comps[1] || {};
  const st = c.status?.type || {};
  const status = st.completed ? "finished" : st.state === "in" ? "live" : "upcoming";
  const t = /* @__PURE__ */ __name22222222((x) => x.team || {}, "t");
  return {
    id: `${leagueLabel}:${e.id}`,
    sport,
    title: e.name || `${t(away).displayName || "?"} at ${t(home).displayName || "?"}`,
    home: { name: t(home).displayName, short: t(home).abbreviation, logo: t(home).logo },
    away: { name: t(away).displayName, short: t(away).abbreviation, logo: t(away).logo },
    status,
    celebrationWinner: comps.find((x) => x.winner)?.team?.displayName || null,
    statusText: st.shortDetail || st.detail || st.description,
    scores: comps.length >= 2 && status !== "upcoming" ? [{ inning: "", value: `${t(home).abbreviation || ""} ${home.score || 0} - ${away.score || 0} ${t(away).abbreviation || ""}` }] : [],
    venue: c.venue?.fullName,
    start: e.date,
    matchType: extraLeague || leagueLabel.split("/").pop().toUpperCase()
  };
}
__name(espnEventToMatch, "espnEventToMatch");
__name2(espnEventToMatch, "espnEventToMatch");
__name22(espnEventToMatch, "espnEventToMatch");
__name222(espnEventToMatch, "espnEventToMatch");
__name2222(espnEventToMatch, "espnEventToMatch");
__name22222(espnEventToMatch, "espnEventToMatch");
__name222222(espnEventToMatch, "espnEventToMatch");
__name2222222(espnEventToMatch, "espnEventToMatch");
__name22222222(espnEventToMatch, "espnEventToMatch");
function espnTennisToMatches(label, d) {
  const out = [];
  for (const e of d.events || []) {
    for (const g of e.groupings || []) {
      const slug = g.grouping?.slug || "";
      if (!/singles/.test(slug)) continue;
      for (const c of g.competitions || []) {
        const comps = (c.competitors || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        if (comps.length < 2) continue;
        if (comps.some((x) => /TBD|TBA/i.test(x.athlete?.displayName || ""))) continue;
        const nm = /* @__PURE__ */ __name22222222((x) => x.athlete?.displayName || x.athlete?.shortName || "?", "nm");
        const short = /* @__PURE__ */ __name22222222((x) => {
          const n = nm(x).split(" ");
          return (n[n.length - 1] || "?").slice(0, 10);
        }, "short");
        const sets = comps.map((x) => (x.linescores || []).map((s) => s.value).join(" "));
        const st = c.status?.type || {};
        out.push({
          id: `${label}:${c.id}`,
          sport: "tennis",
          celebrationWinner: comps.find((x) => x.winner)?.athlete?.displayName || null,
          title: `${nm(comps[0])} vs ${nm(comps[1])}`,
          home: { name: nm(comps[0]), short: short(comps[0]) },
          away: { name: nm(comps[1]), short: short(comps[1]) },
          status: st.completed ? "finished" : st.state === "in" ? "live" : "upcoming",
          statusText: (c.round?.displayName ? c.round.displayName + " \xB7 " : "") + (st.shortDetail || ""),
          scores: comps[0].linescores ? [{ inning: e.shortName || e.name, value: `${sets[0] || ""} | ${sets[1] || ""}` }] : [],
          venue: c.venue?.fullName || e.name,
          start: c.date || c.startDate,
          matchType: e.shortName || e.name
        });
      }
    }
  }
  return out;
}
__name(espnTennisToMatches, "espnTennisToMatches");
__name2(espnTennisToMatches, "espnTennisToMatches");
__name22(espnTennisToMatches, "espnTennisToMatches");
__name222(espnTennisToMatches, "espnTennisToMatches");
__name2222(espnTennisToMatches, "espnTennisToMatches");
__name22222(espnTennisToMatches, "espnTennisToMatches");
__name222222(espnTennisToMatches, "espnTennisToMatches");
__name2222222(espnTennisToMatches, "espnTennisToMatches");
__name22222222(espnTennisToMatches, "espnTennisToMatches");
function espnF1ToMatches(label, d) {
  return (d.events || []).map((e) => {
    const competitions = e.competitions || [];
    const sessions = competitions.map((c) => ({ name: c.type?.text || "Session", start: c.date, status: c.status?.type?.shortDetail }));
    const race = competitions.find((c) => c.type?.abbreviation === "Race" || String(c.type?.id) === "3") || competitions[competitions.length - 1] || {};
    const st = e.status?.type || {};
    const raceDone = !!race.status?.type?.completed;
    const resultRows = raceDone ? (race.competitors || []).filter((c) => Number.isInteger(Number(c.order)) && (c.athlete?.displayName || c.athlete?.fullName)).sort((a, b) => Number(a.order) - Number(b.order)).slice(0, 5).map((c) => ({ place: Number(c.order), driver: String(c.athlete.displayName || c.athlete.fullName).slice(0, 80) })) : [];
    return {
      id: `${label}:${e.id}`,
      sport: "f1",
      title: e.name,
      home: { name: e.circuit?.fullName || "Circuit", short: "GP" },
      away: { name: "", short: "" },
      status: st.completed ? "finished" : st.state === "in" ? "live" : "upcoming",
      statusText: st.shortDetail || st.detail || race.status?.type?.shortDetail || "",
      scores: [],
      resultRows,
      venue: e.circuit?.fullName,
      start: e.date,
      matchType: "Formula 1",
      sessions
    };
  });
}
__name(espnF1ToMatches, "espnF1ToMatches");
__name2(espnF1ToMatches, "espnF1ToMatches");
__name22(espnF1ToMatches, "espnF1ToMatches");
__name222(espnF1ToMatches, "espnF1ToMatches");
__name2222(espnF1ToMatches, "espnF1ToMatches");
__name22222(espnF1ToMatches, "espnF1ToMatches");
__name222222(espnF1ToMatches, "espnF1ToMatches");
__name2222222(espnF1ToMatches, "espnF1ToMatches");
__name22222222(espnF1ToMatches, "espnF1ToMatches");
async function fetchEspnSport(spec, onTennisSource) {
  const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
  if (spec.kind === "tennis") {
    const out = [];
    const paths = [spec.path, spec.also].filter(Boolean);
    let succeeded = 0, eventCount = 0;
    for (const p of paths) {
      const startedAt = Date.now();
      let status = null;
      try {
        const r2 = await fetch(`${ESPN_TENNIS_API}/${p}/scoreboard`, { headers: ua });
        status = r2.status;
        if (!r2.ok) throw new Error(`ESPN tennis ${p} ${r2.status}`);
        const d = await r2.json();
        if (!Array.isArray(d.events)) throw new Error(`ESPN tennis ${p} missing events`);
        succeeded++;
        eventCount += d.events.length;
        out.push(...espnTennisToMatches(p, d));
        onTennisSource?.({ path: p, ok: true, status, errorName: null, elapsedMs: Date.now() - startedAt });
      } catch (e) {
        onTennisSource?.({ path: p, ok: false, status, errorName: String(e.name || "Error").slice(0, 50), elapsedMs: Date.now() - startedAt });
        console.log("espn tennis source failed", p, String(e.name || "Error").slice(0, 50));
      }
    }
    if (!paths.length || succeeded !== paths.length) throw new Error("ESPN tennis source set incomplete");
    if (!out.length) throw new Error(eventCount ? "ESPN tennis events did not match expected singles format" : "ESPN tennis returned no singles matches");
    const rank = { live: 0, upcoming: 1, finished: 2 };
    return out.sort((a, b) => rank[a.status] - rank[b.status] || new Date(b.start) - new Date(a.start)).slice(0, 40);
  }
  const r = await fetch(`${ESPN_API}/${spec.path}/scoreboard`, { headers: ua });
  if (!r.ok) throw new Error("espn " + spec.path + " " + r.status);
  const d = await r.json();
  if (spec.kind === "f1") return espnF1ToMatches(spec.path, d);
  return (d.events || []).map((e) => espnEventToMatch(spec.key, spec.path, spec.icon, e, d.leagues?.[0]?.name));
}
__name(fetchEspnSport, "fetchEspnSport");
__name2(fetchEspnSport, "fetchEspnSport");
__name22(fetchEspnSport, "fetchEspnSport");
__name222(fetchEspnSport, "fetchEspnSport");
__name2222(fetchEspnSport, "fetchEspnSport");
__name22222(fetchEspnSport, "fetchEspnSport");
__name222222(fetchEspnSport, "fetchEspnSport");
__name2222222(fetchEspnSport, "fetchEspnSport");
__name22222222(fetchEspnSport, "fetchEspnSport");
function szNewsPublishedDate(value) {
  const text = String(value || "").trim().replace(/\bBST\b/gi, "+0100");
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
__name(szNewsPublishedDate, "szNewsPublishedDate");
async function fetchNews() {
  const items = [];
  await Promise.all(NEWS_FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "ScoreZaap/1.0" } });
      if (!r.ok) return;
      const xml = await r.text();
      const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const b of blocks.slice(0, 8)) {
        const grab = /* @__PURE__ */ __name22222222((tag) => {
          const m = b.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
          return m ? html(m[1].trim()) : "";
        }, "grab");
        const title = grab("title"), link = grab("link"), pub = grab("pubDate");
        const published = pub ? szNewsPublishedDate(pub) : null;
        if (pub && !published) continue;
        const rawDesc = grab("description").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
        const articleDesc = /^Plus(?:,|:)/i.test(rawDesc) ? "" : rawDesc;
        const srcm = b.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);
        const th = b.match(/<media:thumbnail[^>]*url="([^"]+)"/) || b.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/) || b.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/);
        if (title && link) items.push({
          title,
          link,
          source: srcm ? html(srcm[1].trim()) : f.source,
          published,
          desc: articleDesc,
          thumb: th ? th[1].replace(/&amp;/g, "&") : null
        });
      }
    } catch (e) {
    }
  }));
  const seen = /* @__PURE__ */ new Set();
  return items.filter((i) => {
    const k = i.title.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0)).slice(0, 30);
}
__name(fetchNews, "fetchNews");
__name2(fetchNews, "fetchNews");
__name22(fetchNews, "fetchNews");
__name222(fetchNews, "fetchNews");
__name2222(fetchNews, "fetchNews");
__name22222(fetchNews, "fetchNews");
__name222222(fetchNews, "fetchNews");
__name2222222(fetchNews, "fetchNews");
__name22222222(fetchNews, "fetchNews");
async function dbBatch(env, stmts) {
  for (let i = 0; i < stmts.length; i += 50) {
    try {
      await env.DB.batch(stmts.slice(i, i + 50));
    } catch (e) {
      console.log("d1 batch failed", e.message);
    }
  }
}
__name(dbBatch, "dbBatch");
__name2(dbBatch, "dbBatch");
__name22(dbBatch, "dbBatch");
__name222(dbBatch, "dbBatch");
__name2222(dbBatch, "dbBatch");
__name22222(dbBatch, "dbBatch");
__name222222(dbBatch, "dbBatch");
__name2222222(dbBatch, "dbBatch");
async function dbUpsertMatches(env, sport, matches) {
  if (!env.DB || !matches || !matches.length) return;
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const stmts = [];
    for (const m of matches.slice(0, 100)) {
      if (!m || m.id == null) continue;
      const home = m.home && m.home.name ? m.home.name : m.home || "";
      const away = m.away && m.away.name ? m.away.name : m.away || "";
      const hs = m.scores && m.scores[0] ? String(m.scores[0].value) : m.homeScore != null ? String(m.homeScore) : "";
      const aw = m.scores && m.scores[1] ? String(m.scores[1].value) : m.awayScore != null ? String(m.awayScore) : "";
      stmts.push(env.DB.prepare("INSERT INTO matches (id, sport, status, home_team, away_team, home_score, away_score, league, starts_at, raw_json, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, home_score=excluded.home_score, away_score=excluded.away_score, league=excluded.league, raw_json=excluded.raw_json, updated_at=excluded.updated_at").bind(String(m.id), sport, String(m.status || ""), String(home), String(away), hs, aw, String(m.series || m.league || ""), String(m.start || ""), JSON.stringify(m), now));
    }
    await dbBatch(env, stmts);
  } catch (e) {
    console.log("d1 matches upsert failed", e.message);
  }
}
__name(dbUpsertMatches, "dbUpsertMatches");
__name2(dbUpsertMatches, "dbUpsertMatches");
__name22(dbUpsertMatches, "dbUpsertMatches");
__name222(dbUpsertMatches, "dbUpsertMatches");
__name2222(dbUpsertMatches, "dbUpsertMatches");
__name22222(dbUpsertMatches, "dbUpsertMatches");
__name222222(dbUpsertMatches, "dbUpsertMatches");
__name2222222(dbUpsertMatches, "dbUpsertMatches");
async function dbUpsertNews(env, items) {
  if (!env.DB || !items || !items.length) return;
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const stmts = [];
    for (const n of items.slice(0, 50)) {
      if (!n || !n.link) continue;
      stmts.push(env.DB.prepare("INSERT INTO news (id, title, url, source, published_at, raw_json, updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, source=excluded.source, published_at=excluded.published_at, raw_json=excluded.raw_json, updated_at=excluded.updated_at").bind(String(n.id || n.link), String(n.title || ""), String(n.link), String(n.source || ""), String(n.published || ""), JSON.stringify(n), now));
    }
    await dbBatch(env, stmts);
  } catch (e) {
    console.log("d1 news upsert failed", e.message);
  }
}
__name(dbUpsertNews, "dbUpsertNews");
__name2(dbUpsertNews, "dbUpsertNews");
__name22(dbUpsertNews, "dbUpsertNews");
__name222(dbUpsertNews, "dbUpsertNews");
__name2222(dbUpsertNews, "dbUpsertNews");
__name22222(dbUpsertNews, "dbUpsertNews");
__name222222(dbUpsertNews, "dbUpsertNews");
__name2222222(dbUpsertNews, "dbUpsertNews");
async function refresh(kind, env, ctx) {
  const kv = env.SPORTS_KV;
  if (!kv) return;
  if (kind === "football") {
    try {
      const oldBlob = await kv.get("football", "json");
      const fbStats = env.__fbStats = {};
      const matches = await fetchFootball(env, fbStats, oldBlob && oldBlob.matches);
      fbStats.changed = !oldBlob || JSON.stringify(oldBlob.matches) !== JSON.stringify(matches);
      if (fbStats.changed) {
        await kv.put("football", JSON.stringify({ at: Date.now(), matches }));
        if (env.DB) ctx.waitUntil(dbUpsertMatches(env, "football", matches));
        await detectTransitions(env, ctx, "football", oldBlob && oldBlob.matches, matches);
      }
    } catch (e) {
      console.log("football refresh failed", e.message);
      env.__fbStats = Object.assign(env.__fbStats || {}, { failed: String(e && e.message || e).slice(0, 200) });
    }
    return env.__fbStats;
  }
  try {
    const sm = await kv.get("series_map", "json");
    if (!sm || Date.now() - sm.at > 24 * 36e5) {
      const r = await fetch(`${CRIC_API}/series?apikey=${env.CRICKETDATA_KEY}&offset=0`);
      const j = await r.json();
      const items = (j.data || []).filter((x) => x.id && x.name).map((x) => ({ id: x.id, name: x.name, end: x.endDate }));
      if (items.length) await kv.put("series_map", JSON.stringify({ at: Date.now(), items }));
    }
  } catch (e) {
    console.log("series_map failed", e.message);
  }
  const jobs = [
    fetchCricket(env).catch((e) => {
      console.log("cricket refresh failed", e.message);
      return null;
    }),
    fetchNews().catch(() => null)
  ];
  let tennisSources = [];
  let tennisFailure = null;
  const tennisStartedAt = Date.now();
  for (const spec of ESPN_SPORTS) jobs.push(fetchEspnSport(spec, spec.key === "tennis" ? (v) => tennisSources.push(v) : undefined).catch((e) => {
    console.log("espn fail", spec.key, e.message);
    if (spec.key === "tennis") tennisFailure = { errorName: String(e.name || "Error").slice(0, 50), elapsedMs: tennisStartedAt == null ? null : Date.now() - tennisStartedAt };
    return null;
  }));
  let [cricket, news, ...espn] = await Promise.all(jobs);
  try {
    const tennisMatches = espn[3];
    const diag = { cron: "scores", at: (/* @__PURE__ */ new Date()).toISOString(), sourceOk: Array.isArray(tennisMatches), matches: Array.isArray(tennisMatches) ? tennisMatches.length : null, sources: tennisSources, failure: tennisFailure };
    await env.DB?.prepare("INSERT INTO sz_automation (id,value,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("cron_debug_tennis", JSON.stringify(diag), (/* @__PURE__ */ new Date()).toISOString()).run();
  } catch (e) {
  }
  try {
    let cbzSlice = kv ? await kv.get("cricket_cbz", "json").catch(() => null) : null;
    const sliceStale = !cbzSlice || !cbzSlice.at || Date.now() - +cbzSlice.at > 5 * 6e4;
    if (sliceStale && kv) {
      const fb = await fetchCricketCbz(env).catch(() => null);
      if (fb && fb.length) {
        cbzSlice = { at: Date.now(), matches: fb };
        await kv.put("cricket_cbz", JSON.stringify(cbzSlice));
        console.log("cricket cbz slice refreshed:", fb.length, "matches");
      }
    }
    const cricRaw = Array.isArray(cricket) ? cricket : [];
    if (cbzSlice && cbzSlice.matches && cbzSlice.matches.length) {
      cricket = dedupeCricket((cbzSlice.matches || []).concat(cricket || []));
      const rank2 = { live: 0, upcoming: 1, finished: 2 };
      cricket.sort((a, b) => (rank2[a.status] != null ? rank2[a.status] : 1) - (rank2[b.status] != null ? rank2[b.status] : 1) || String(a.start || "").localeCompare(String(b.start || "")));
      cricket = cricket.slice(0, 60);
    }
    if (!cricket || !cricket.length) {
      const fbAt = kv ? await kv.get("cbz_fb_at") : null;
      if (!fbAt || Date.now() - +fbAt > 36e5) {
        const fb = await fetchCricketCbz(env).catch(() => null);
        if (fb && fb.length) {
          cricket = fb;
          if (kv) {
            const lastFb = await kv.get("cbz_fb_at");
            if (!lastFb || Date.now() - +lastFb > 36e5) await kv.put("cbz_fb_at", String(Date.now()));
          }
          console.log("cricket fallback via cricbuzz:", fb.length, "matches");
        }
      }
    }
    if (cricket && cricket.length) {
      for (const lm of szCronMiniWorklist(cricket)) {
        try {
          const better = /* @__PURE__ */ __name222222((cur2, idx2, val2) => {
            const pm = /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(val2 || "");
            if (!pm) return false;
            const cRuns = +pm[1], cOv = +pm[3];
            const ex = cur2 && cur2[idx2] && /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(cur2[idx2].value || "");
            if (!ex) return true;
            const eRuns = +ex[1], eOv = +ex[3];
            return cOv > eOv || cOv === eOv && cRuns > eRuns;
          }, "better");
          const raw2 = String(lm.id).startsWith("cbz_") ? await cbzMiniJson(String(lm.id).slice(4), "scorecard").catch(() => null) : null;
          const sc2 = String(lm.id).startsWith("cbz_") ? (raw2 ? cbzMiniScorecard(raw2) : null) : await kv.get("sc_c_" + lm.id, "json").catch(() => null);
          // A hand-verified final also outranks a provider scorecard frozen
          // mid-match: a manual entry exists only after two independent
          // sources confirmed the result, so a provider feed still claiming
          // play is frozen, not live (Cricbuzz froze at 120/5 in cbz_176496
          // for a full day). When the provider recovers and reports the match
          // complete, its own reading wins again below.
          const manualFinal = szManualCricketResult(lm.id);
          if (manualFinal && sc2 && !sc2.complete) {
            lm.status = "finished";
            lm.statusText = manualFinal.statusText;
            lm.scores = manualFinal.scores.map((s) => ({ ...s }));
            delete lm.scoreDelayed;
            delete lm.feedStuck;
            console.log("cricket frozen live feed corrected via verified manual result:", String(lm.id));
            continue;
          }
          if (sc2 && Array.isArray(sc2.innings) && sc2.innings.length) {
            applyMiniScore(lm, sc2);
            continue;
          }
          // Provider stuck at the toss long past the match's normal length:
          // adopt the cricapi reading of the same fixture only when it carries
          // a conclusive result (an in-progress flag like "Innings Break" is
          // not a result). Without a verified result the match is NOT claimed
          // finished - elapsed time never proves completion (postponements,
          // abandoned games). It stays in its source bucket, clearly labelled
          // stale, and keeps polling so it self-corrects when the feed revives.
          const stuckState = String(raw2 && raw2.matchHeader && raw2.matchHeader.state || "");
          const stuckStart = lm.start ? Date.parse(lm.start) : NaN;
          const manual = szManualCricketResult(lm.id);
          // A hand-verified manual result is itself the verification, so it
          // applies as soon as the provider sits at Toss/Preview; every other
          // fixture still needs the full elapsed-time threshold.
          const stuckTooLong = Number.isFinite(stuckStart) && Date.now() - stuckStart > szCricketStuckAfterMs(lm.matchType);
          if (!sc2 && /^(toss|preview)$/i.test(stuckState) && (stuckTooLong || manual)) {
            const alt = cricRaw.find((x) => x && x.status === "finished" && czFixtureTeams(x) === czFixtureTeams(lm) && Array.isArray(x.scores) && x.scores.length && szMatchStatusConclusive("cricket", x.statusText));
            if (alt) {
              lm.status = "finished";
              lm.statusText = alt.statusText || "Match finished";
              lm.scores = alt.scores;
              delete lm.scoreDelayed;
              console.log("cricket stuck-toss corrected via cricapi:", String(lm.id));
            } else if (manual) {
              lm.status = "finished";
              lm.statusText = manual.statusText;
              lm.scores = manual.scores.map((s) => ({ ...s }));
              delete lm.scoreDelayed;
              delete lm.feedStuck;
              console.log("cricket stuck-toss corrected via verified manual result:", String(lm.id));
            } else {
              lm.feedStuck = true;
              lm.scoreDelayed = true;
              lm.statusText = "Score feed stuck - awaiting provider update";
              console.log("cricket stuck-toss feed stale:", String(lm.id));
            }
            continue;
          }
          const acc2 = await kv.get("ovr_" + lm.id, "json").catch(() => null);
          if (acc2 && acc2.overs) {
            let best = null;
            for (const k2 of Object.keys(acc2.overs)) {
              const o2 = acc2.overs[k2];
              if (!best || +o2.over > +best.over) best = o2;
            }
            if (best && best.score != null) {
              const idx = (best.inn || 1) - 1;
              const cur = Array.isArray(lm.scores) ? lm.scores.slice() : [];
              const label = cur[idx] && cur[idx].inning ? cur[idx].inning : ((lm.home && lm.home.short || "TM") + "").slice(0, 8) + " " + (best.inn || 1);
              const val = best.score + "/" + (best.wkts != null ? best.wkts : 0) + " (" + best.over + ")";
              if (better(cur, idx, val)) {
                cur[idx] = { inning: label, value: val };
                lm.scores = cur;
              }
            }
          }
        } catch (e) {
        }
      }
      // A corrupt duplicate innings row in a saved state must not survive
      // the merge; clean every match before comparing and writing.
      for (const nm of cricket) {
        const clean = szCleanCricketScores(nm.scores, nm.matchType);
        if (clean !== nm.scores) nm.scores = clean;
      }
      const oldBlob = await kv.get("cricket", "json");
      // A stale upstream list reading must not move a live score backwards -
      // the same rule the request overlay already applies to detail fetches.
      try {
        const oldById = {};
        for (const om of (oldBlob && oldBlob.matches) || []) oldById[String(om.id)] = om;
        for (const nm of cricket) {
          if (nm.status === "finished") continue;
          if (nm.feedStuck) continue;
          const om = oldById[String(nm.id)];
          if (!om || !Array.isArray(om.scores) || !om.scores.length || !Array.isArray(nm.scores)) continue;
          const nInn = szListCricketInnings(nm), oInn = szListCricketInnings(om);
          if ((oInn.length && !nInn.length) || szOlderCricketInnings(nInn, oInn, nm.matchType || om.matchType)) {
            nm.scores = szCleanCricketScores(om.scores, nm.matchType || om.matchType);
            if (om.statusText) nm.statusText = om.statusText;
          }
        }
      } catch (e) {
      }
      if (!oldBlob || JSON.stringify(oldBlob.matches) !== JSON.stringify(cricket)) {
        await kv.put("cricket", JSON.stringify({ at: Date.now(), matches: cricket }));
        if (env.DB) ctx.waitUntil(dbUpsertMatches(env, "cricket", cricket));
        await detectTransitions(env, ctx, "cricket", oldBlob && oldBlob.matches, cricket);
      }
      try {
        const liveC = (cricket || []).filter((x) => x.status === "live" && String(x.id).startsWith("cbz_")).slice(0, 3);
        let chg2 = false;
        for (const lm4 of liveC) {
          const s2 = await cbzHtmlScore(String(lm4.id).slice(4));
          if (applyHtmlScore(lm4, s2, lm4.matchType)) chg2 = true;
        }
        if (chg2) await kv.put("cricket", JSON.stringify({ at: Date.now(), matches: cricket }));
      } catch (e9) {
      }
    }
  } catch (e) {
  }
  try {
    if (news) {
      const oldNews = await kv.get("news", "json");
      if (!oldNews || JSON.stringify(oldNews.items) !== JSON.stringify(news)) {
        await kv.put("news", JSON.stringify({ at: Date.now(), items: news }));
        if (env.DB) ctx.waitUntil(dbUpsertNews(env, news));
      }
    }
  } catch (e) {
  }
  for (let i = 0; i < ESPN_SPORTS.length; i++) {
    try {
      if (espn[i]) {
        const ekey = "espn_" + ESPN_SPORTS[i].key;
        const oldEspn = await kv.get(ekey, "json");
        if (!oldEspn || JSON.stringify(oldEspn.matches) !== JSON.stringify(espn[i])) {
          await kv.put(ekey, JSON.stringify({ at: Date.now(), matches: espn[i] }));
          if (env.DB) ctx.waitUntil(dbUpsertMatches(env, ESPN_SPORTS[i].key, espn[i]));
        }
      }
    } catch (e) {
    }
  }
}
__name(refresh, "refresh");
__name2(refresh, "refresh");
__name22(refresh, "refresh");
__name222(refresh, "refresh");
__name2222(refresh, "refresh");
__name22222(refresh, "refresh");
__name222222(refresh, "refresh");
__name2222222(refresh, "refresh");
__name22222222(refresh, "refresh");
var VAPID_PUB = "BB0akVmcYCoa7wNtm1h0i2QVJtKci7L4ez_XiJJedwZSu3ZZTw3Sc4VDStHsyLy6_2ueOHbi2TIMD3bFnspkflg";
function b64urlBytes(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64urlBytes, "b64urlBytes");
__name2(b64urlBytes, "b64urlBytes");
__name22(b64urlBytes, "b64urlBytes");
__name222(b64urlBytes, "b64urlBytes");
__name2222(b64urlBytes, "b64urlBytes");
__name22222(b64urlBytes, "b64urlBytes");
__name222222(b64urlBytes, "b64urlBytes");
__name2222222(b64urlBytes, "b64urlBytes");
__name22222222(b64urlBytes, "b64urlBytes");
async function vapidJwt(env, audience) {
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: env.VAPID_D, x: env.VAPID_X, y: env.VAPID_Y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const h = b64urlBytes(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64urlBytes(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1e3) + 12 * 3600, sub: "mailto:admin@scorezaap.ashwatthama710.workers.dev" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(h + "." + p));
  return h + "." + p + "." + b64urlBytes(sig);
}
__name(vapidJwt, "vapidJwt");
__name2(vapidJwt, "vapidJwt");
__name22(vapidJwt, "vapidJwt");
__name222(vapidJwt, "vapidJwt");
__name2222(vapidJwt, "vapidJwt");
__name22222(vapidJwt, "vapidJwt");
__name222222(vapidJwt, "vapidJwt");
__name2222222(vapidJwt, "vapidJwt");
__name22222222(vapidJwt, "vapidJwt");
async function sendPushTickle(env, endpoint) {
  try {
    const aud = new URL(endpoint).origin;
    const jwt = await vapidJwt(env, aud);
    const r = await fetch(endpoint, { method: "POST", headers: { "TTL": "120", "Authorization": "vapid t=" + jwt + ", k=" + VAPID_PUB, "Content-Length": "0" } });
    return r.status;
  } catch (e) {
    return 0;
  }
}
__name(sendPushTickle, "sendPushTickle");
__name2(sendPushTickle, "sendPushTickle");
__name22(sendPushTickle, "sendPushTickle");
__name222(sendPushTickle, "sendPushTickle");
__name2222(sendPushTickle, "sendPushTickle");
__name22222(sendPushTickle, "sendPushTickle");
__name222222(sendPushTickle, "sendPushTickle");
__name2222222(sendPushTickle, "sendPushTickle");
__name22222222(sendPushTickle, "sendPushTickle");
async function subKey(endpoint) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return "push_sub_" + [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
__name(subKey, "subKey");
__name2(subKey, "subKey");
__name22(subKey, "subKey");
__name222(subKey, "subKey");
__name2222(subKey, "subKey");
__name22222(subKey, "subKey");
__name222222(subKey, "subKey");
__name2222222(subKey, "subKey");
__name22222222(subKey, "subKey");
async function notifyMatch(env, ctx, sport, m, kindLabel) {
  if (!env.SPORTS_KV) return;
  const title = (m.home?.short || m.home?.name || "") + " vs " + (m.away?.short || m.away?.name || "");
  const body = kindLabel === "live" ? "Match is LIVE now - tap for ball-by-ball" : "Result: " + (m.statusText || "finished");
  const n = { at: Date.now(), title, body, url: "/match/" + sport + "/" + encodeURIComponent(m.id) };
  await env.SPORTS_KV.put("notify_latest", JSON.stringify(n), { expirationTtl: 3600 });
  const subs = await env.SPORTS_KV.list({ prefix: "push_sub_" });
  const jobs = [];
  for (const k of subs.keys) {
    jobs.push((async () => {
      const sub = await env.SPORTS_KV.get(k.name, "json");
      if (!sub) return;
      if (sub.matchId !== "ALL" && sub.matchId !== String(m.id)) return;
      const st = await sendPushTickle(env, sub.endpoint);
      if (st === 404 || st === 410) await env.SPORTS_KV.delete(k.name);
    })());
  }
  if (ctx) ctx.waitUntil(Promise.all(jobs));
  else await Promise.all(jobs);
}
__name(notifyMatch, "notifyMatch");
__name2(notifyMatch, "notifyMatch");
__name22(notifyMatch, "notifyMatch");
__name222(notifyMatch, "notifyMatch");
__name2222(notifyMatch, "notifyMatch");
__name22222(notifyMatch, "notifyMatch");
__name222222(notifyMatch, "notifyMatch");
__name2222222(notifyMatch, "notifyMatch");
__name22222222(notifyMatch, "notifyMatch");
async function detectTransitions(env, ctx, sport, oldList, newList) {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return;
  const prev = {};
  for (const m of oldList) prev[String(m.id)] = m.status;
  for (const m of newList) {
    const was = prev[String(m.id)];
    if (!was) continue;
    if (m.feedStuck) continue;
    if (was !== "live" && m.status === "live") await notifyMatch(env, ctx, sport, m, "live");
    else if (was !== "finished" && m.status === "finished") await notifyMatch(env, ctx, sport, m, "result");
  }
}
__name(detectTransitions, "detectTransitions");
__name2(detectTransitions, "detectTransitions");
__name22(detectTransitions, "detectTransitions");
__name222(detectTransitions, "detectTransitions");
__name2222(detectTransitions, "detectTransitions");
__name22222(detectTransitions, "detectTransitions");
__name222222(detectTransitions, "detectTransitions");
__name2222222(detectTransitions, "detectTransitions");
__name22222222(detectTransitions, "detectTransitions");
async function cbzBudgetOk(env) {
  if (!env.SPORTS_KV) return false;
  const mk = "cbz_budget_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const n = await env.SPORTS_KV.get(mk, "json") || 0;
  return n < 175 ? mk : null;
}
__name(cbzBudgetOk, "cbzBudgetOk");
__name2(cbzBudgetOk, "cbzBudgetOk");
__name22(cbzBudgetOk, "cbzBudgetOk");
__name222(cbzBudgetOk, "cbzBudgetOk");
__name2222(cbzBudgetOk, "cbzBudgetOk");
__name22222(cbzBudgetOk, "cbzBudgetOk");
__name222222(cbzBudgetOk, "cbzBudgetOk");
__name2222222(cbzBudgetOk, "cbzBudgetOk");
__name22222222(cbzBudgetOk, "cbzBudgetOk");
async function cbzFetch(env, path) {
  const mk = await cbzBudgetOk(env);
  if (!mk) return null;
  const r = await fetch(CBZ_API + path, { headers: { "X-RapidAPI-Key": env.RAPIDAPI_KEY || "", "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com" } });
  try {
    const rem = r.headers.get("x-ratelimit-requests-remaining"), lim = r.headers.get("x-ratelimit-requests-limit");
    if (rem != null && env.SPORTS_KV) await env.SPORTS_KV.put("cbz_rl", JSON.stringify({ at: Date.now(), rem, lim }), { expirationTtl: 86400 });
  } catch (e) {
  }
  if (!r.ok) return null;
  try {
    const mk2 = "cbz_budget_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const n = await env.SPORTS_KV.get(mk2, "json") || 0;
    await env.SPORTS_KV.put(mk2, JSON.stringify(n + 1));
  } catch (e) {
  }
  return r.json();
}
__name(cbzFetch, "cbzFetch");
__name2(cbzFetch, "cbzFetch");
__name22(cbzFetch, "cbzFetch");
__name222(cbzFetch, "cbzFetch");
__name2222(cbzFetch, "cbzFetch");
__name22222(cbzFetch, "cbzFetch");
__name222222(cbzFetch, "cbzFetch");
__name2222222(cbzFetch, "cbzFetch");
__name22222222(cbzFetch, "cbzFetch");
function cbzUnescape(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (m, c) => String.fromCharCode(parseInt(c, 16))).replace(/\\(.)/g, (m, c) => c === "n" ? "\n" : c === "t" ? "	" : c);
}
__name(cbzUnescape, "cbzUnescape");
__name2(cbzUnescape, "cbzUnescape");
function cbzExtractJson(html2, anchor) {
  const i = html2.indexOf(anchor);
  if (i < 0) return null;
  const j = html2.indexOf("{", i);
  if (j < 0) return null;
  let depth = 0;
  const end = Math.min(html2.length, j + 8e5);
  for (let k = j; k < end; k++) {
    const c = html2[k];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (!depth) return html2.slice(j, k + 1);
    }
  }
  return null;
}
__name(cbzExtractJson, "cbzExtractJson");
__name2(cbzExtractJson, "cbzExtractJson");
var CBZ_UA = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" };
async function cbzRankingsHtml(fmt, typ) {
  const cat = { batsmen: "batting", bowlers: "bowling", allrounders: "all-rounder", teams: "teams" }[typ];
  if (!cat) return null;
  try {
    const r = await fetch(`https://www.cricbuzz.com/cricket-stats/icc-rankings/men/${cat}`, { headers: { ...CBZ_UA, "Accept": "text/html" } });
    if (!r.ok) return null;
    const html2 = await r.text();
    const raw = cbzExtractJson(html2, '\\"formatTypesData\\":');
    if (!raw) return null;
    const d = JSON.parse(cbzUnescape(raw));
    const blk = d && d[fmt];
    if (!blk || !Array.isArray(blk.rank) || !blk.rank.length) return null;
    return blk.rank.map((x) => ({
      id: x.id,
      rank: +x.rank,
      name: x.name,
      country: !x.country || x.country === "$undefined" ? null : x.country,
      rating: +(x.rating || x.points || 0),
      trend: !x.trend || x.trend === "$undefined" ? "Flat" : x.trend,
      img: x.faceImageId && x.faceImageId !== "$undefined" ? `https://www.cricbuzz.com/a/img/v1/152x152/i1/c${x.faceImageId}/i.jpg` : null
    }));
  } catch (e) {
    return null;
  }
}
__name(cbzRankingsHtml, "cbzRankingsHtml");
__name2(cbzRankingsHtml, "cbzRankingsHtml");
async function cbzPlayerHtml(pid) {
  try {
    const r = await fetch(`https://www.cricbuzz.com/profiles/${pid}/x`, { headers: { ...CBZ_UA, "Accept": "text/html" } });
    if (!r.ok) return null;
    const html2 = await r.text();
    const raw = cbzExtractJson(html2, '{\\"id\\":\\"' + pid + '\\"');
    if (!raw) return null;
    const d = JSON.parse(cbzUnescape(raw));
    if (!d || !d.name) return null;
    return d;
  } catch (e) {
    return null;
  }
}
__name(cbzPlayerHtml, "cbzPlayerHtml");
__name2(cbzPlayerHtml, "cbzPlayerHtml");
function cbzFingerprint(title) {
  const m = String(title || "").split(",")[0];
  const parts = m.split(/\s+vs\s+/i);
  if (parts.length < 2) return null;
  return parts.slice(0, 2).map(norm).sort().join("|");
}
__name(cbzFingerprint, "cbzFingerprint");
__name2(cbzFingerprint, "cbzFingerprint");
__name22(cbzFingerprint, "cbzFingerprint");
__name222(cbzFingerprint, "cbzFingerprint");
__name2222(cbzFingerprint, "cbzFingerprint");
__name22222(cbzFingerprint, "cbzFingerprint");
__name222222(cbzFingerprint, "cbzFingerprint");
__name2222222(cbzFingerprint, "cbzFingerprint");
__name22222222(cbzFingerprint, "cbzFingerprint");
async function cbzResolveMatchId(env, title, startIso) {
  if (!env.SPORTS_KV) return null;
  const fp = cbzFingerprint(title);
  if (!fp) return null;
  let map = await env.SPORTS_KV.get("cbz_map", "json");
  if (!map || Date.now() - map.at > 24 * 36e5) {
    const lists = [];
    for (const p of ["/matches/v1/live", "/matches/v1/recent", "/matches/v1/upcoming"]) {
      try {
        lists.push(await cbzFetch(env, p));
      } catch (e) {
        lists.push(null);
      }
    }
    const nm = {};
    for (const l of lists) {
      if (!l) continue;
      const walk = /* @__PURE__ */ __name22222222((o) => {
        if (!o) return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (typeof o === "object") {
          if (o.matchInfo) {
            const mi = o.matchInfo;
            const k = [norm(mi.team1?.teamName), norm(mi.team2?.teamName)].sort().join("|");
            (nm[k] = nm[k] || []).push({ id: mi.matchId, start: +(mi.startDate || 0), end: +(mi.endDate || 0) });
          }
          Object.values(o).forEach(walk);
        }
      }, "walk");
      walk(l);
    }
    map = { at: Date.now(), map: nm };
    await env.SPORTS_KV.put("cbz_map", JSON.stringify(map), { expirationTtl: 48 * 3600 });
  }
  const cands = (map.map || {})[fp] || [];
  if (!cands.length) return null;
  const t = startIso ? new Date(startIso.endsWith("Z") ? startIso : startIso + "Z").getTime() : 0;
  cands.sort((a, b) => Math.abs(a.start - t) - Math.abs(b.start - t));
  return cands[0].id;
}
__name(cbzResolveMatchId, "cbzResolveMatchId");
__name2(cbzResolveMatchId, "cbzResolveMatchId");
__name22(cbzResolveMatchId, "cbzResolveMatchId");
__name222(cbzResolveMatchId, "cbzResolveMatchId");
__name2222(cbzResolveMatchId, "cbzResolveMatchId");
__name22222(cbzResolveMatchId, "cbzResolveMatchId");
__name222222(cbzResolveMatchId, "cbzResolveMatchId");
__name2222222(cbzResolveMatchId, "cbzResolveMatchId");
__name22222222(cbzResolveMatchId, "cbzResolveMatchId");
async function cbzScorecard(env, cricketId, title, startIso, live) {
  if (live && String(cricketId).startsWith("cbz_")) {
    const d2 = await szFastJson("https://m.cricbuzz.com/api/mcenter/scorecard/" + String(cricketId).slice(4), { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept": "application/json" }, 10, 2500);
    const fresh = d2 ? cbzMiniScorecard(d2) : null;
    if (fresh && fresh.innings && fresh.innings.length) return { ...fresh, celebrationVerifiedAt: Date.now() };
  }
  const ck = "sc_c_" + cricketId;
  const hit = env.SPORTS_KV ? await env.SPORTS_KV.get(ck, "json") : null;
  if (hit) return hit;
  if (String(cricketId).indexOf("cbz_") === 0) {
    const hs = await cbzMiniScorecardFetch(String(cricketId).slice(4)).catch(() => null);
    if (hs && Array.isArray(hs.innings) && hs.innings.length) {
      try {
        await env.SPORTS_KV.put(ck, JSON.stringify(hs), { expirationTtl: hs.complete ? 7 * 86400 : live ? 300 : 6 * 3600 });
      } catch (e) {
      }
      return hs;
    }
  }
  const cbzId = await cbzResolveMatchId(env, title, startIso);
  if (!cbzId) return null;
  const d = await cbzFetch(env, `/mcenter/v1/${cbzId}/scard`);
  if (!d || !Array.isArray(d.scorecard) || !d.scorecard.length) return null;
  const innings = d.scorecard.map((i) => ({
    team: i.batteamname,
    runs: i.score,
    wkts: i.wickets,
    overs: i.overs,
    rr: i.runrate,
    batsmen: (i.batsman || []).map((b) => ({ id: b.id, name: b.nickname || b.name, out: b.outdec || "not out", r: b.runs, b: b.balls, f: b.fours, s: b.sixes, sr: b.strkrate, c: !!b.iscaptain, k: !!b.iskeeper })),
    bowlers: (i.bowler || []).map((b) => ({ id: b.id, name: b.nickname || b.name, o: b.overs, m: b.maidens, r: b.runs, w: b.wickets, e: b.economy })),
    fow: ((i.fow || {}).fow || []).map((f) => ({ name: f.batsmanname, runs: f.runs, over: f.overnbr })),
    extras: i.extras ? { total: i.extras.total, b: i.extras.byes, lb: i.extras.legbyes, w: i.extras.wides, nb: i.extras.noballs } : null
  }));
  const out = { status: d.status || null, complete: !!d.ismatchcomplete, innings };
  try {
    await env.SPORTS_KV.put(ck, JSON.stringify(out), { expirationTtl: out.complete ? 7 * 86400 : live ? 300 : 6 * 3600 });
  } catch (e) {
  }
  return out;
}
__name(cbzScorecard, "cbzScorecard");
__name2(cbzScorecard, "cbzScorecard");
__name22(cbzScorecard, "cbzScorecard");
__name222(cbzScorecard, "cbzScorecard");
__name2222(cbzScorecard, "cbzScorecard");
__name22222(cbzScorecard, "cbzScorecard");
__name222222(cbzScorecard, "cbzScorecard");
__name2222222(cbzScorecard, "cbzScorecard");
__name22222222(cbzScorecard, "cbzScorecard");
async function cbzCommentary(env, cricketId, title, startIso, live) {
  const ck = "comm_c2_" + cricketId;
  const hit = env.SPORTS_KV ? await env.SPORTS_KV.get(ck, "json") : null;
  if (hit) return hit;
  if (String(cricketId).indexOf("cbz_") === 0) {
    const hc = await cbzMiniCommentary(String(cricketId).slice(4), live).catch(() => null);
    if (hc && hc.list && hc.list.length) {
      try {
        await env.SPORTS_KV.put(ck, JSON.stringify(hc), { expirationTtl: hc.complete ? 7 * 86400 : live ? 300 : 6 * 3600 });
      } catch (e) {
      }
      return hc;
    }
  }
  const cbzId = await cbzResolveMatchId(env, title, startIso);
  if (!cbzId) return null;
  const d = await cbzFetch(env, `/mcenter/v1/${cbzId}/comm`);
  const raw0 = d && Array.isArray(d.comwrapper) ? d.comwrapper : d && Array.isArray(d.commentaryList) ? d.commentaryList : null;
  if (!raw0 || !raw0.length) return null;
  const complete = !!(d.matchheaders && (d.matchheaders.ismatchcomplete || d.matchheaders.state === "Complete")) || !live;
  let raw = raw0;
  const seen = {};
  const list = raw.map((w) => w.commentary || w).filter((c) => c.commtxt).map((c) => ({
    over: c.overnum || c.overNbr ? String(c.overnum || c.overNbr) : "",
    text: String(c.commtxt).replace(/<[^>]*>/g, "").replace(/B\d+\$/g, "").replace(/\s+,/g, ",").replace(/,\s*,+/g, ",").replace(/\s{2,}/g, " ").trim(),
    event: c.eventtype || c.event || "",
    ts: +(c.timestamp || 0)
  })).filter((c) => {
    const k = c.ts + "|" + c.text.slice(0, 40);
    if (seen[k]) return false;
    seen[k] = 1;
    return true;
  }).sort((a, b) => b.ts - a.ts).slice(0, 80).map((c) => ({ over: c.over, text: c.text, event: c.event }));
  const out = { complete, list };
  try {
    await env.SPORTS_KV.put(ck, JSON.stringify(out), { expirationTtl: out.complete ? 7 * 86400 : live ? 300 : 6 * 3600 });
  } catch (e) {
  }
  return out;
}
__name(cbzCommentary, "cbzCommentary");
__name2(cbzCommentary, "cbzCommentary");
__name22(cbzCommentary, "cbzCommentary");
__name222(cbzCommentary, "cbzCommentary");
__name2222(cbzCommentary, "cbzCommentary");
__name22222(cbzCommentary, "cbzCommentary");
__name222222(cbzCommentary, "cbzCommentary");
__name2222222(cbzCommentary, "cbzCommentary");
__name22222222(cbzCommentary, "cbzCommentary");
async function espnSoccerTimeline(env, detail) {
  if (!detail.espnLeague && !detail.competition) return null;
  const slug = detail.espnLeague || FOOT_TO_ESPN[(detail.competition || "").toLowerCase()];
  if (!slug || !env.SPORTS_KV) return null;
  const day = (detail.date || "").slice(0, 10).replace(/-/g, "");
  if (!day) return null;
  const sbKey = `espn_sb_${slug}_${day}`;
  let sb = await env.SPORTS_KV.get(sbKey, "json");
  if (!sb) {
    try {
      const r = await fetch(`${ESPN_API}/soccer/${slug}/scoreboard?dates=${day}`, { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
      if (!r.ok) return null;
      sb = await r.json();
      await env.SPORTS_KV.put(sbKey, JSON.stringify(sb), { expirationTtl: 3600 });
    } catch (e) {
      return null;
    }
  }
  const hn = norm(detail.home), an = norm(detail.away);
  const matchTeams = /* @__PURE__ */ __name22222222((e) => {
    const comps2 = ((e.competitions || [])[0] || {}).competitors || [];
    const names = comps2.map((c) => norm(c.team?.displayName) + "|" + norm(c.team?.shortDisplayName) + "|" + norm(c.team?.name));
    const hit = /* @__PURE__ */ __name22222222((n) => names.some((x) => x.split("|").some((y) => y && n && (n.includes(y) || y.includes(n)))), "hit");
    return hit(hn) && hit(an);
  }, "matchTeams");
  let ev = null;
  if (detail.espnEventId) ev = (sb.events || []).find((e) => String(e.id) === String(detail.espnEventId)) || null;
  if (!ev) {
    const idsH = FOOT_TEAM_ID[detail.home], idsA = FOOT_TEAM_ID[detail.away];
    if (idsH && idsA) {
      const hits = (sb.events || []).filter((e) => {
        const cs = ((e.competitions || [])[0] || {}).competitors || [];
        const eh = cs.find((x) => x.homeAway === "home"), ea = cs.find((x) => x.homeAway === "away");
        return eh && ea && String(eh.team && eh.team.id) === String(idsH) && String(ea.team && ea.team.id) === String(idsA);
      });
      ev = hits.length === 1 ? hits[0] : null;
    } else {
      ev = (sb.events || []).find(matchTeams) || null;
    }
  }
  if (!ev) return null;
  const sumKey = "espn_sum_" + ev.id;
  let sum = await env.SPORTS_KV.get(sumKey, "json");
  const live = detail.status === "IN_PLAY" || detail.status === "PAUSED";
  if (!sum) {
    try {
      const r = await fetch(`${ESPN_API}/soccer/${slug}/summary?event=${ev.id}`, { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
      if (!r.ok) return null;
      sum = await r.json();
      await env.SPORTS_KV.put(sumKey, JSON.stringify(sum), { expirationTtl: live ? 60 : 3600 });
    } catch (e) {
      return null;
    }
  }
  const skip = ["Kickoff", "Start Delay", "End Delay"];
  const timeline = (sum.keyEvents || []).filter((k) => !skip.includes(k.type?.text)).map((k) => ({
    min: k.clock?.displayValue || "",
    type: k.type?.text || "",
    text: k.text || k.shortText || "",
    team: k.team?.displayName || "",
    goal: !!k.scoringPlay
  }));
  const commentary = (sum.commentary || []).slice(-14).reverse().map((c) => ({ min: c.time?.displayValue || "", text: c.text }));
  let stats = null;
  const bx = sum.boxscore && sum.boxscore.teams || [];
  const comps = ((ev.competitions || [])[0] || {}).competitors || [];
  const homeId = (comps.find((c) => c.homeAway === "home") || {}).team && String(comps.find((c) => c.homeAway === "home").team.id);
  if (bx.length === 2 && Array.isArray(bx[0].statistics) && bx[0].statistics.length) {
    const t0home = homeId && String(bx[0].team && bx[0].team.id) === homeId;
    const homeStats = t0home ? bx[0].statistics : bx[1].statistics;
    const awayStats = t0home ? bx[1].statistics : bx[0].statistics;
    const awayMap = {};
    for (const st of awayStats) awayMap[st.name || st.label] = st.displayValue;
    stats = homeStats.map((st) => ({ label: st.label || st.name, home: st.displayValue, away: awayMap[st.name || st.label] != null ? awayMap[st.name || st.label] : "-" })).filter((r) => r.label && !/passes|accurate/i.test(r.label)).slice(0, 14);
    if (!stats.length) stats = null;
  }
  return { timeline, commentary, espnId: ev.id, stats };
}
__name(espnSoccerTimeline, "espnSoccerTimeline");
__name2(espnSoccerTimeline, "espnSoccerTimeline");
__name22(espnSoccerTimeline, "espnSoccerTimeline");
__name222(espnSoccerTimeline, "espnSoccerTimeline");
__name2222(espnSoccerTimeline, "espnSoccerTimeline");
__name22222(espnSoccerTimeline, "espnSoccerTimeline");
__name222222(espnSoccerTimeline, "espnSoccerTimeline");
__name2222222(espnSoccerTimeline, "espnSoccerTimeline");
__name22222222(espnSoccerTimeline, "espnSoccerTimeline");
async function espnGenericDetail(env, id) {
  const [leaguePath, eventId] = String(id).split(":");
  if (!leaguePath || !eventId) return null;
  const specKey = leaguePath.split("/")[1];
  const kvKey = "espn_" + (specKey === "atp" || specKey === "wta" ? "tennis" : specKey);
  const list = await readKV(env, kvKey, { matches: [] });
  let m = (list.matches || []).find((x) => x.id === id);
  const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
  const sb = await szFastJson(`${ESPN_API}/${leaguePath}/scoreboard`, ua, 15, 2500);
  if (sb) {
    const candidates = specKey === "atp" || specKey === "wta" ? espnTennisToMatches(leaguePath, sb) : specKey === "f1" ? espnF1ToMatches(leaguePath, sb) : (sb.events || []).map((e) => espnEventToMatch(specKey, leaguePath, "", e, sb.leagues?.[0]?.name));
    const fm = candidates.find((x) => x.id === id);
    if (fm) m = { ...fm, celebrationVerifiedAt: Date.now() };
  }
  if (!m) return null;
  const detail = {
    celebrationVerifiedAt: m.celebrationVerifiedAt,
    celebrationWinner: m.celebrationWinner,
    title: m.title,
    status: m.statusText || m.status,
    venue: m.venue,
    date: m.start,
    competition: m.matchType,
    sessions: m.sessions || null,
    home: m.home,
    away: m.away,
    scores: m.scores,
    state: m.status
  };
  if (specKey === "nba" || specKey === "mlb" || specKey === "nhl") {
    const live = m.status === "live";
    const sumKey = "espn_gsum_" + eventId;
    let sum = env.SPORTS_KV ? await env.SPORTS_KV.get(sumKey, "json") : null;
    if (!sum) {
      try {
        const r = await fetch(`${ESPN_API}/${leaguePath}/summary?event=${eventId}`, { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
        if (r.ok) {
          sum = await r.json();
          await env.SPORTS_KV.put(sumKey, JSON.stringify(sum), { expirationTtl: live ? 60 : 1800 });
        }
      } catch (e) {
      }
    }
    if (sum) {
      detail.timeline = (sum.keyEvents || []).slice(-20).map((k) => ({ min: k.clock?.displayValue || "", type: k.type?.text || "", text: k.text || k.shortText || "", team: k.team?.displayName || "", goal: !!k.scoringPlay }));
      const comp = (sum.header?.competitions || [])[0] || {};
      detail.status = comp.status?.type?.shortDetail || detail.status;
      const comps = comp.competitors || [];
      const h = comps.find((x) => x.homeAway === "home"), a = comps.find((x) => x.homeAway === "away");
      if (h && a && !m.celebrationVerifiedAt) detail.bigScore = `${h.score || 0} - ${a.score || 0}`;
    }
  }
  return detail;
}
__name(espnGenericDetail, "espnGenericDetail");
__name2(espnGenericDetail, "espnGenericDetail");
__name22(espnGenericDetail, "espnGenericDetail");
__name222(espnGenericDetail, "espnGenericDetail");
__name2222(espnGenericDetail, "espnGenericDetail");
__name22222(espnGenericDetail, "espnGenericDetail");
__name222222(espnGenericDetail, "espnGenericDetail");
__name2222222(espnGenericDetail, "espnGenericDetail");
__name22222222(espnGenericDetail, "espnGenericDetail");
var PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>ScoreZaap - Live Scores, News & Zaap</title><link rel="canonical" href="https://scorezaap.tech/"><meta property="og:type" content="website"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="ScoreZaap - Live Scores, News & Zaap"><meta property="og:description" content="Live cricket, football, NBA, MLB, NHL, tennis and F1 scores with sports news and Zaap, your AI sports buddy."><meta property="og:url" content="https://scorezaap.tech/"><meta property="og:image" content="https://scorezaap.tech/icon-512.png"><meta name="twitter:card" content="summary"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"ScoreZaap","url":"https://scorezaap.tech/"}<\/script>
<meta name="description" content="Live cricket, football, NBA, MLB, NHL, tennis and F1 scores with sports news and Zaap, your AI sports buddy.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8;--amber:#fbbf24;--red:#fb7185}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh;background-image:radial-gradient(600px 300px at 80% -80px,rgba(163,230,53,.07),transparent 70%),radial-gradient(500px 260px at 10% -60px,rgba(56,189,248,.08),transparent 70%);background-attachment:fixed}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(18px + env(safe-area-inset-top)) 2px 10px;display:flex;align-items:center;gap:12px}@media (max-width:640px){header>div:nth-child(2){min-width:0;flex:1 1 auto}header .sub{line-height:1.3;overflow:visible}}
.logo{position:relative;isolation:isolate;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--lime),var(--blue));display:flex;align-items:center;justify-content:center;font-size:24px;animation:heroglow 4s ease-in-out infinite;box-shadow:0 4px 22px rgba(163,230,53,.28)}
@keyframes heroglow{0%,100%{box-shadow:0 4px 22px rgba(163,230,53,.28)}50%{box-shadow:0 4px 30px rgba(56,189,248,.4)}}
.logo::before{content:"";position:absolute;inset:-4px;border-radius:inherit;background:conic-gradient(from 0deg,var(--lime),var(--blue),transparent 62%,var(--lime));z-index:-1;animation:ringspin 6s linear infinite;opacity:.85;will-change:transform}
@keyframes ringspin{to{transform:rotate(1turn)}}
.hdrbeam{height:2px;border-radius:2px;margin:0 2px;background:linear-gradient(90deg,transparent,var(--lime),var(--blue),transparent);background-size:220% 100%;animation:beamslide 5s linear infinite;opacity:.55}
@keyframes beamslide{from{background-position:220% 0}to{background-position:-220% 0}}
@media (prefers-reduced-motion: reduce){.logo::before,.hdrbeam{animation:none}}
.hsearch{display:none;flex:1;max-width:430px;margin:0 2px}
.hsearch .hbox{display:flex;align-items:center;gap:9px;width:100%;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:11px 15px;transition:border-color .2s,box-shadow .2s}
.hsearch .hbox:focus-within{border-color:var(--lime);box-shadow:0 0 0 3px rgba(163,230,53,.15)}
.hsearch svg{color:var(--dim);flex:0 0 auto}
.hsearch input{flex:1;min-width:0;background:none;border:0;outline:none;color:var(--txt);font:500 14.5px Inter}
.hsearch input::placeholder{color:var(--dim)}
#stripWrap{display:none;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(163,230,53,.06),rgba(56,189,248,.05));border:1px solid var(--line);border-radius:16px;padding:8px 10px;margin:4px 0 0}
.striptag{flex:0 0 auto;display:flex;align-items:center;gap:6px;font:800 10.5px Inter;letter-spacing:1.2px;color:var(--red);padding:4px 9px;border-radius:9px;background:rgba(251,113,133,.1)}
.striptag i{width:7px;height:7px;border-radius:50%;background:var(--red);animation:pulse 1.4s infinite}
h1{font:700 27px Space Grotesk;letter-spacing:-.5px}
h1 span{color:var(--lime)}
.sub{font-size:12px;color:var(--dim);margin-top:2px}
.livedot{margin-left:auto;display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--dim);background:var(--card);border:1px solid var(--line);padding:7px 13px;border-radius:20px}
.livedot b{color:var(--lime);font-weight:700}
.livedot i{width:8px;height:8px;border-radius:50%;background:#3b4a5e}
.livedot.on i{background:var(--red);animation:pulse 1.4s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
#liveStrip{display:flex;gap:8px;overflow-x:auto;padding:2px;scrollbar-width:none;flex:1;min-width:0}
#liveStrip::-webkit-scrollbar{display:none}
.schip{flex:0 0 auto;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:14px;padding:9px 14px;font-size:12.5px;font-weight:600;cursor:pointer;transition:transform .15s ease,border-color .2s}
.schip:active{transform:scale(.96);border-color:var(--lime)}
.schip .sd{width:7px;height:7px;border-radius:50%;background:var(--red);animation:pulse 1.4s infinite}
.schip small{color:var(--lime);font-weight:700}
.serchips{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.serchips::-webkit-scrollbar{display:none}
.serchip{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:20px;background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--line);color:var(--txt);font:600 11.5px Inter;text-decoration:none;white-space:nowrap;transition:border-color .2s}
.serchip:active{border-color:var(--lime)}
.tabs{position:sticky;top:0;z-index:20;display:flex;gap:6px;overflow-x:auto;margin-top:12px;padding:14px 0 12px;background:transparent;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:0 0 auto;padding:9px 16px;border-radius:24px;font:600 13px Inter;color:var(--dim);cursor:pointer;border:1px solid var(--line);background:var(--card);transition:all .18s ease;white-space:nowrap}
.tab.on{color:#0b111a;background:var(--lime);border-color:var(--lime);box-shadow:0 2px 14px rgba(163,230,53,.3)}
.tab:active{transform:scale(.95)}
.sect{display:flex;align-items:center;gap:9px;margin:16px 2px 10px;font:600 11.5px Space Grotesk;letter-spacing:1.6px;color:var(--dim);text-transform:uppercase}
.sect::before{content:'';width:8px;height:8px;border-radius:3px;background:var(--lime)}
.sect i{font-style:normal}
.sect::after{content:'';flex:1;height:1px;background:var(--line)}
.card{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:18px;padding:14px 15px;margin-bottom:10px;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s ease,border-color .2s;animation:fadeup .45s ease both}
.card:active{transform:scale(.985);border-color:rgba(163,230,53,.5)}
.card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--blue)}
.card.cricket::before{background:var(--amber)}
.card.nba::before{background:#f97316}
.card.mlb::before{background:#ef4444}
.card.nhl::before{background:#93c5fd}
.card.tennis::before{background:#4ade80}
.card.f1::before{background:#e11d48}
.card.live{box-shadow:0 0 0 1px rgba(163,230,53,.22),0 6px 26px rgba(163,230,53,.07);animation:fadeup .45s ease both,liveglow 2.6s ease-in-out infinite}
@keyframes liveglow{0%,100%{box-shadow:0 0 0 1px rgba(163,230,53,.22),0 6px 26px rgba(163,230,53,.07)}50%{box-shadow:0 0 0 1px rgba(163,230,53,.45),0 6px 30px rgba(163,230,53,.14)}}
@keyframes fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.card .mt{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dim);margin-bottom:9px}
.pill{padding:3.5px 9px;border-radius:20px;font-weight:700;font-size:10px;letter-spacing:.8px;text-transform:uppercase}
.pill.live{background:rgba(163,230,53,.14);color:var(--lime)}
.pill.fin{background:rgba(132,150,173,.15);color:var(--dim)}
.pill.up{background:rgba(56,189,248,.13);color:var(--blue)}
.stxt{color:var(--dim)}
.tm{display:flex;align-items:center;gap:10px;padding:5px 0}
.tn{flex:1;display:flex;align-items:center;gap:9px;font-weight:700;font-size:15.5px;min-width:0}
.tn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tn img{width:27px;height:27px;object-fit:contain;border-radius:50%;background:rgba(255,255,255,.06);padding:2px}
.ts{font:700 19px Space Grotesk;color:var(--lime)}
.ts.flash{animation:scoreflash 1.2s ease}
@keyframes scoreflash{0%{color:#fff;text-shadow:0 0 18px rgba(163,230,53,.9);transform:scale(1.25)}100%{color:var(--lime);text-shadow:none;transform:scale(1)}}
.inn{display:flex;justify-content:space-between;font-size:12.5px;color:var(--dim);padding:2.5px 0}
.inn b{color:var(--txt);font-weight:600}
.venue{font-size:11px;color:var(--dim);margin-top:8px}
.card.fin{opacity:.72}
.skel{background:var(--card);border:1px solid var(--line);border-radius:18px;height:96px;margin-bottom:10px;position:relative;overflow:hidden}
.skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);animation:shimmer 1.3s infinite}
@keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.empty{text-align:center;padding:44px 20px;color:var(--dim)}
.empty .big{font-size:38px;margin-bottom:10px}
.retry{margin-top:14px;background:var(--lime);border:none;border-radius:12px;padding:10px 22px;font-weight:700;cursor:pointer;color:#0b111a}
#news .ncard{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px;margin-bottom:10px;text-decoration:none;color:var(--txt);transition:transform .15s ease,border-color .2s;animation:fadeup .4s ease both}
#news .ncard:active{transform:scale(.985)}
.nbody{flex:1;min-width:0}
#news h3{font-size:13.5px;font-weight:600;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nmeta{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:11px;color:var(--dim)}
.src{color:var(--blue);background:rgba(56,189,248,.1);padding:2.5px 9px;border-radius:12px;font-weight:600}
.nthumb{width:74px;height:74px;border-radius:12px;object-fit:cover;flex:0 0 auto;background:var(--card2)}
.ninit{width:74px;height:74px;border-radius:12px;flex:0 0 auto;background:linear-gradient(135deg,var(--card2),#1d2c42);display:flex;align-items:center;justify-content:center;font:700 26px Space Grotesk;color:var(--lime)}
.updbar{text-align:center;font-size:11px;color:var(--dim);padding:6px 0 2px}
footer{text-align:center;color:var(--dim);font-size:11.5px;padding:28px 0 10px;line-height:1.7}
footer b{color:var(--txt)}
#chatFab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:50;background:linear-gradient(135deg,var(--lime),var(--blue));border:none;border-radius:26px;padding:13px 20px;font:700 14.5px Inter;color:#0b111a;cursor:pointer;box-shadow:0 6px 26px rgba(163,230,53,.4);display:flex;align-items:center;gap:8px;transition:transform .15s}
#chatFab:active{transform:scale(.93)}
#chatPanel{position:fixed;inset:0;z-index:60;display:none}
#chatPanel.open{display:block}
#chatBg{position:absolute;inset:0;background:rgba(3,6,10,.7);backdrop-filter:blur(4px);animation:fadein .25s ease}
@keyframes fadein{from{opacity:0}to{opacity:1}}
#chatBox{position:absolute;left:0;right:0;bottom:0;max-width:680px;margin:0 auto;height:80vh;background:var(--card);border-radius:24px 24px 0 0;border:1px solid var(--line);display:flex;flex-direction:column;animation:slideup .32s cubic-bezier(.2,.9,.3,1)}
@keyframes slideup{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}
#chatHead{display:flex;align-items:center;gap:10px;padding:15px 16px;border-bottom:1px solid var(--line)}
#chatHead b{font:700 16px Space Grotesk}
#chatHead b span{color:var(--lime)}
#langSel{margin-left:auto;background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:10px;padding:6px 8px;font:600 11.5px Inter}
#chatClose{background:var(--card2);border:none;color:var(--dim);width:32px;height:32px;border-radius:10px;font-size:16px;cursor:pointer}
#chatLog{flex:1;overflow-y:auto;padding:16px}
.msg{max-width:84%;padding:10px 14px;border-radius:16px;margin-bottom:9px;font-size:13.5px;line-height:1.55;animation:fadeup .3s ease}
.msg.me{margin-left:auto;background:var(--lime);color:#0b111a;border-bottom-right-radius:5px;font-weight:500}
.msg.zaap{background:var(--card2);border:1px solid var(--line);border-bottom-left-radius:5px}
.msg.think{color:var(--dim)}
.msg.think::after{content:'...';animation:dots 1.2s infinite}
@keyframes dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
#chatInRow{display:flex;gap:9px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
#chatIn{flex:1;background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:12px 14px;color:var(--txt);font:400 14px Inter;outline:none}
#chatIn:focus{border-color:var(--lime)}
#chatGo{background:var(--lime);border:none;border-radius:14px;padding:0 18px;font:700 14px Inter;color:#0b111a;cursor:pointer}
#personaSel{background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:10px;padding:5px 7px;font:600 11.5px Inter;max-width:104px}
#voiceTog{background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:5px 9px;font-size:13px;cursor:pointer;color:var(--txt)}
#voiceTog.off{opacity:.45}
#micBtn{background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:0 13px;font-size:16px;cursor:pointer;color:var(--txt)}
#micBtn.listening{background:var(--red);border-color:var(--red);animation:micpulse 1s infinite}
@keyframes micpulse{50%{opacity:.6}}
#splash{position:fixed;inset:0;z-index:300;background:#070b12;background-image:radial-gradient(700px 340px at 50% 118%,rgba(163,230,53,.09),transparent 70%),radial-gradient(560px 300px at 50% -18%,rgba(56,189,248,.09),transparent 70%);display:grid;place-items:center;overflow:hidden;transition:transform .55s cubic-bezier(.65,0,.35,1),opacity .55s ease;will-change:transform,opacity}
#splash.out{transform:translateY(-101%);opacity:.4}
.sp-sweep{position:absolute;top:0;bottom:0;left:0;width:34%;background:linear-gradient(100deg,transparent,rgba(163,230,53,.10) 45%,rgba(56,189,248,.13) 55%,transparent);transform:translateX(-130%) skewX(-12deg);animation:spSweep 1.15s cubic-bezier(.5,0,.4,1) 1.1s both}
.sp-sweep.s2{background:linear-gradient(100deg,transparent,rgba(56,189,248,.10) 45%,rgba(163,230,53,.12) 55%,transparent);animation-name:spSweepR;animation-delay:4.3s;animation-duration:1s;transform:translateX(430%) skewX(-12deg)}
@keyframes spSweep{to{transform:translateX(430%) skewX(-12deg)}}
@keyframes spSweepR{to{transform:translateX(-130%) skewX(-12deg)}}
.sp-flash{position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(230,255,160,.55),transparent 60%);opacity:0;animation:spFlash .6s ease .82s both}
@keyframes spFlash{0%{opacity:0;transform:scale(.3)}22%{opacity:.9}100%{opacity:0;transform:scale(1.5)}}
.sp-wave{position:absolute;width:130px;height:130px;border-radius:50%;border:2px solid rgba(163,230,53,.7);opacity:0;animation:spWave 1.05s cubic-bezier(.2,.7,.3,1) .85s both}
.sp-wave.w2{border-color:rgba(56,189,248,.55);animation-delay:1.05s}
@keyframes spWave{0%{transform:scale(.3);opacity:.9}100%{transform:scale(3.4);opacity:0}}
.sp-stage{position:relative;text-align:center;z-index:3;padding:24px;animation:spStage 5s cubic-bezier(.2,.8,.2,1) both}
@keyframes spStage{0%,89%{transform:scale(1);opacity:1}100%{transform:scale(1.09);opacity:0}}
.sp-bolt{width:92px;height:92px;margin:0 auto;display:block;animation:spBoltPulse .8s ease 4.25s both}
@keyframes spBoltPulse{0%{transform:scale(1)}40%{transform:scale(1.07)}100%{transform:scale(1)}}
.sp-bolt path{fill:url(#spg);fill-opacity:0;stroke:#a3e635;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;filter:drop-shadow(0 0 16px rgba(163,230,53,.55));animation:spDraw .85s cubic-bezier(.5,0,.3,1) .1s forwards,spFill .5s ease .9s forwards,spGlowPulse .8s ease 4.25s both}
@keyframes spDraw{to{stroke-dashoffset:0}}
@keyframes spFill{to{fill-opacity:1;stroke-opacity:.35}}
@keyframes spGlowPulse{0%,100%{filter:drop-shadow(0 0 16px rgba(163,230,53,.55))}45%{filter:drop-shadow(0 0 34px rgba(163,230,53,.95))}}
.sp-name{display:flex;justify-content:center;gap:.05em;margin:18px 0 9px;font:800 clamp(42px,11vw,64px)/1 'Space Grotesk',sans-serif;letter-spacing:-.04em}
.sp-name span{display:inline-block;opacity:0;transform:translateY(44px) skewX(-10deg) scale(1.14);animation:spPunch .5s cubic-bezier(.16,.9,.3,1.25) forwards}
.sp-name span.lm{color:#a3e635}
.sp-name span:nth-child(1){animation-delay:1.25s}.sp-name span:nth-child(2){animation-delay:1.33s}.sp-name span:nth-child(3){animation-delay:1.41s}.sp-name span:nth-child(4){animation-delay:1.49s}.sp-name span:nth-child(5){animation-delay:1.57s}.sp-name span:nth-child(6){animation-delay:1.65s}.sp-name span:nth-child(7){animation-delay:1.73s}.sp-name span:nth-child(8){animation-delay:1.81s}.sp-name span:nth-child(9){animation-delay:1.89s}
@keyframes spPunch{0%{opacity:0;transform:translateY(44px) skewX(-10deg) scale(1.14)}62%{opacity:1;transform:translateY(-4px) skewX(2deg) scale(1)}100%{opacity:1;transform:none}}
.sp-tag{color:#c7d3e2;font-size:13.5px;letter-spacing:.04em;opacity:0;animation:spRise .55s 1.95s forwards}
.sp-sports{margin-top:12px;font:600 10.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#a3e635;opacity:0;animation:spRise .5s 2.5s forwards}
.sp-sports em{font-style:normal;color:#5d7288}
.sp-tag b{color:#7dd3fc;font-weight:600}
@keyframes spRise{to{opacity:1;transform:none}}
.sp-line{width:min(250px,62vw);height:2px;margin:22px auto 0;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;opacity:0;animation:spRise .3s 3.0s forwards}
.sp-line i{display:block;height:100%;transform-origin:left;background:linear-gradient(90deg,#a3e635,#38bdf8);box-shadow:0 0 12px rgba(163,230,53,.7);transform:scaleX(0);animation:spLoad 1.35s 3.06s cubic-bezier(.65,0,.35,1) both}
@keyframes spLoad{to{transform:scaleX(1)}}
.sp-status{height:18px;margin-top:9px;color:#5d7288;font:600 9.5px/18px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:0;animation:spRise .3s 3.12s forwards}
.sp-skip{position:absolute;right:22px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:4;padding:9px 13px;border:1px solid rgba(255,255,255,.13);border-radius:9px;background:rgba(255,255,255,.035);color:#8ca0b5;font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase}
@media (prefers-reduced-motion:reduce){#splash *{animation-duration:.01ms !important;animation-delay:0s !important}.sp-line i{transform:scaleX(1)}#splash{transition-duration:.2s}}
.sbtn{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--lime);transition:border-color .2s}
.sbtn:active{border-color:var(--lime)}
.searchwrap{display:none;padding:0 0 10px}
.searchwrap.open{display:block}
.searchwrap input{width:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px;color:var(--txt);font:500 14px Inter;outline:none}
.searchwrap input:focus{border-color:var(--lime)}
.sreschips{display:flex;gap:7px;overflow-x:auto;padding:0 0 8px;scrollbar-width:none}.sreschips::-webkit-scrollbar{display:none}

/* ---------- desktop ---------- */
@media (min-width:900px){
 .hsearch{display:block}
 .sbtn{display:none}
 .wrap{max-width:1120px;padding:0 22px 70px}
 h1{font-size:36px}
 .sub{font-size:14px}
 .logo{width:56px;height:56px;font-size:30px;border-radius:18px}
 .tabs{gap:10px}
 .tab{font-size:14.5px;padding:10px 22px}
 .schip{font-size:13.5px;padding:11px 18px}
 #scores{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
#scores.few{grid-template-columns:1fr}
#scores.few .sect{grid-column:1/-1}
.fillcard{grid-column:1/-1;background:linear-gradient(160deg,var(--card),var(--card2));border:1px dashed var(--line);border-radius:20px;padding:26px 20px;text-align:center;margin-top:6px}
.fillcard .fbig{font-size:34px;margin-bottom:8px}
.fillcard b{font:700 15px Space Grotesk;display:block;margin-bottom:6px}
.fillcard p{color:var(--dim);font-size:12.5px;margin-bottom:12px}
.fillcard .serchip{display:inline-block}
 #scores .sect,#scores .serchips,#scores .empty{grid-column:1/-1}
 #scores .card{margin-bottom:0}
 #news{display:grid;grid-template-columns:1fr 1fr;gap:12px}
 #news .ncard{margin-bottom:0}
 .searchwrap input{font-size:15px;padding:14px 18px}
 .card:hover{border-color:var(--lime);transform:translateY(-2px)}
 .serchip:hover,.ncard:hover{border-color:var(--lime)}
}
@media (min-width:1200px){
 .wrap{max-width:1320px}
 #scores{grid-template-columns:repeat(3,1fr)}
 #news{grid-template-columns:repeat(3,1fr)}
}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div id="splash" role="dialog" aria-label="Opening ScoreZaap">
 <div class="sp-sweep"></div>
 <div class="sp-sweep s2"></div>
 <div class="sp-flash"></div>
 <div class="sp-wave"></div><div class="sp-wave w2"></div>
 <div class="sp-stage">
  <svg class="sp-bolt" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a3e635"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><path pathLength="100" d="M37 3 L13 37 h14 l-5 24 L53 25 H37 Z"/></svg>
  <div class="sp-name" aria-label="ScoreZaap"><span>S</span><span>c</span><span>o</span><span>r</span><span>e</span><span class="lm">Z</span><span class="lm">a</span><span class="lm">a</span><span class="lm">p</span></div>
  <div class="sp-tag">Live scores \xB7 <b>every sport</b>, one tap</div>
  <div class="sp-sports">Cricket <em>\xB7</em> Football <em>\xB7</em> NBA <em>\xB7</em> MLB <em>\xB7</em> NHL <em>\xB7</em> Tennis <em>\xB7</em> F1</div>
  <div class="sp-line"><i></i></div>
  <div class="sp-status" id="spStatus">Locking live feeds</div>
 </div>
 <div class="sp-skip">Skip intro</div>
</div>
<script>
(function(){
 var s=document.getElementById('splash');if(!s)return;
 try{var _spU=+localStorage.getItem('zaapSplashUntil')||0;if(Date.now()<_spU){s.remove();return}}catch(e){}
 try{localStorage.setItem('zaapSplashUntil',String(Date.now()+864e5))}catch(e){}
 var done=false;
 function dismiss(){if(done)return;done=true;s.classList.add('out');setTimeout(function(){s.remove()},580)}
 s.addEventListener('click',dismiss);
 var st=document.getElementById('spStatus');
 setTimeout(function(){if(!done&&st)st.textContent='Warming up Zaap'},3700);
 setTimeout(function(){if(!done&&st)st.textContent='Ready'},4300);
 setTimeout(dismiss,2600);
 if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)setTimeout(dismiss,300);
})();
<\/script>
<div class="wrap">
 <header>
  <div class="logo">\u26A1</div>
  <div><h1>Score<span>Zaap</span></h1><div class="sub">Live scores \xB7 every sport, one tap</div></div>
  <div class="hsearch"><div class="hbox"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="sInD" type="search" placeholder="Search teams, matches, series..." autocomplete="off"></div></div>
  <button class="sbtn" id="sBtn" aria-label="Search"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button><div class="livedot" id="liveChip"><i></i><span id="liveTxt">connecting</span></div>
 </header>
 <nav aria-label="Site navigation" style="display:flex;gap:20px;flex-wrap:wrap;padding:10px 2px;font-size:14px;color:var(--blue)"><a href="/" style="color:var(--lime)">Live scores</a><a href="/schedule" style="color:var(--blue)">Schedule</a><a href="/rankings" style="color:var(--blue)">Rankings</a><a href="/blog" style="color:var(--lime)">Blog &amp; guides</a><a href="/news" style="color:var(--blue)">News</a></nav>
 <div class="hdrbeam"></div>
 <div id="stripWrap"><span class="striptag"><i></i>LIVE</span><div id="liveStrip"></div></div>
 <div class="searchwrap" id="sWrap"><input id="sIn" type="search" placeholder="Search teams, matches, series..." autocomplete="off"><div id="sRes" style="margin-top:10px"></div></div>
 <div class="tabs" id="tabs">
  <div class="tab on" data-tab="all">All</div>
  <div class="tab" data-tab="cricket">Cricket</div>
  <div class="tab" data-tab="football">Football</div>
  <div class="tab" data-tab="nba">NBA</div>
  <div class="tab" data-tab="mlb">MLB</div>
  <div class="tab" data-tab="nhl">NHL</div>
  <div class="tab" data-tab="tennis">Tennis</div>
  <div class="tab" data-tab="f1">F1</div>
  <div class="tab" data-tab="news">News</div>
 </div>
 <div id="scores"></div>
 <div id="news" style="display:none"></div>
</div>
<button id="chatFab">\u26A1 Ask Zaap</button>
<div id="chatPanel"><div id="chatBg"></div>
 <div id="chatBox">
  <div id="chatHead"><b>\u26A1 Zaap<span>.</span></b>
   <select id="personaSel" title="Voice"><option value="zaap">Zaap (male)</option><option value="zia">Zia (female)</option></select>
   <button id="voiceTog" title="Voice replies on/off">\u{1F50A}</button>
   <select id="langSel"><option value="">\u{1F310} Auto</option><option value="en">English</option><option value="hi">\u0939\u093F\u0902\u0926\u0940</option><option value="bn">\u09AC\u09BE\u0982\u09B2\u09BE</option><option value="ta">\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD</option><option value="te">\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41</option><option value="mr">\u092E\u0930\u093E\u0920\u0940</option><option value="kn">\u0C95\u0CA8\u0CCD\u0CA8\u0CA1</option><option value="ml">\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02</option><option value="gu">\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0</option><option value="pa">\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40</option></select>
   <button id="chatClose">\u2715</button></div>
  <div id="chatLog"></div>
  <div id="chatInRow"><button id="micBtn" title="Talk to Zaap">\u{1F3A4}</button><input id="chatIn" placeholder="Ask about any match, player, sport..." autocomplete="off"><button id="chatGo">Send</button></div>
 </div>
</div>
<link rel="stylesheet" href="/celebrations.css"><script src="/celebrations.js?v=auto2"><\/script><script>
/*__BOOT__*/
let DATA={cricket:[],football:[],espn:{}},NEWS=[],TAB='all',HIST=[],PREVSC={};
try{const _qt=new URLSearchParams(location.search).get('tab');if(_qt&&['all','cricket','football','nba','mlb','nhl','tennis','f1','news'].includes(_qt)){TAB=_qt;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.dataset.tab===_qt))}}catch(e){}
let SERIES=[];
if(window.__BOOT){DATA.cricket=__BOOT.cricket||[];DATA.football=__BOOT.football||[];DATA.espn=__BOOT.espn||{};NEWS=(__BOOT.news&&__BOOT.news.items)||[]}
if(window.__BOOT)SERIES=__BOOT.series||[];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function ago(t){if(!t)return'';const s=(Date.now()-new Date(t))/1e3;if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function localTime(t){try{return new Date(t).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true})}catch(e){return''}}
const ICONS={};
function teamRow(t,score){const img=t.logo?'<img src="'+esc(t.logo)+'" alt="" onerror="this.remove()" loading="lazy">':'';
 return '<div class="tm"><div class="tn">'+img+'<span>'+esc(t.short||t.name)+'</span></div>'+(score?'<div class="ts" data-ts>'+esc(score)+'</div>':'')+'</div>'}
function matchCard(m,i){
 const st=m.status==='live'?'<span class="pill live">Live</span>':m.status==='finished'?'<span class="pill fin">FT</span>':'<span class="pill up">'+esc(localTime(m.start)||'Soon')+'</span>';
 const icon='';
 const stxt=(m.status==='live'&&m.statusText?'<span class="stxt">'+esc(m.statusText)+'</span>':'')+(m.status==='live'&&m.scoreDelayed?'<span class="stxt" title="Live update from the source is delayed">Score may be delayed</span>':'');
 let body='';
 if(m.sport==='cricket'&&m.scores&&m.scores.length){
   body='<div class="tm"><div class="tn">'+esc(m.home.short)+' <span style="color:var(--dim);font-weight:400">vs</span> '+esc(m.away.short)+'</div></div>'+m.scores.map(s=>'<div class="inn"><span>'+esc(s.inning||'Score')+'</span><b data-ts>'+esc(s.value)+'</b></div>').join('');
 } else if(m.sport==='tennis'&&m.scores&&m.scores.length){
   body='<div class="tm"><div class="tn">'+esc(m.home.short)+' <span style="color:var(--dim);font-weight:400">vs</span> '+esc(m.away.short)+'</div></div><div class="inn"><span>Sets</span><b data-ts>'+esc(m.scores[0].value)+'</b></div>';
 } else if(m.sport==='f1'){
   body='<div class="tm"><div class="tn">'+esc(m.home.name||'Grand Prix')+'</div></div>'+(m.venue?'<div class="inn"><span>'+esc(m.venue)+'</span></div>':'');
 } else {
   const val=m.scores&&m.scores[0]?m.scores[0].value:null;
   const hv=val?val.split(' - ')[0]:null,av=val?val.split(' - ')[1]:null;
   body=teamRow(m.home,hv?hv.replace(/^[A-Z]+ /,''):null)+teamRow(m.away,av?av.replace(/ [A-Z]+$/,''):null);
 }
 return '<div class="card '+m.sport+' '+m.status+(m.status==='finished'?' fin':'')+'" data-id="'+esc(m.id)+'" data-sport="'+m.sport+'" style="animation-delay:'+Math.min(i*45,400)+'ms"><div class="mt">'+icon+' '+st+stxt+(m.matchType?'<span style="margin-left:'+(stxt?'8px':'auto')+'">'+esc(m.matchType)+'</span>':'')+'</div>'+body+(m.venue&&m.sport!=='f1'?'<div class="venue">Venue: '+esc(m.venue)+'</div>':'')+'</div>';
}
function allMatches(){const a=[...DATA.cricket,...DATA.football];for(const k in DATA.espn)a.push(...(DATA.espn[k]||[]));return a}
function flashChanges(list){
 list.forEach(m=>{const key=m.sport+':'+m.id;const val=(m.scores||[]).map(s=>s.value).join('|');
  if(PREVSC[key]&&PREVSC[key]!==val){document.querySelectorAll('.card[data-id="'+CSS.escape(String(m.id))+'"] [data-ts]').forEach(e=>e.classList.add('flash'))}
  PREVSC[key]=val});
}
function renderStrip(){
 const live=allMatches().filter(m=>m.status==='live');
 const el=$('#liveStrip');
 const wrap=$('#stripWrap');
 const chip=$('#liveChip');
 if(live.length){chip.classList.add('on');$('#liveTxt').innerHTML='<b>'+live.length+'</b> LIVE'}else{chip.classList.remove('on');$('#liveTxt').textContent='no live matches'}
 if(!live.length){wrap.style.display='none';return}
 wrap.style.display='flex';
 el.innerHTML=live.map(m=>{
  const sc=(m.scores||[]).map(s=>s.value).join(' \xB7 ');
  return '<div class="schip" data-id="'+esc(m.id)+'" data-sport="'+m.sport+'"><span class="sd"></span>'+(ICONS[m.sport]||'')+' '+esc(m.home.short)+' vs '+esc(m.away.short)+(sc?' <small>'+esc(sc)+'</small>':'')+'</div>';
 }).join('');
}
function stRank(m){return m.status==='live'?0:m.status==='finished'?2:1}
function stTime(m){const t=Date.parse(m.start||'');return isNaN(t)?0:t}
function orderMatches(list,trim){
 const now=Date.now();
 let a=list.filter(m=>!(trim&&m.status==='finished'&&stTime(m)&&now-stTime(m)>48*3600*1000));
 return a.map((m,i)=>({m,i})).sort((x,y)=>{const r=stRank(x.m)-stRank(y.m);if(r)return r;const d=stRank(x.m)===1?stTime(x.m)-stTime(y.m):stTime(y.m)-stTime(x.m);return d||x.i-y.i}).map(o=>o.m);
}
function renderScores(){
 const el=$('#scores');
 if(TAB==='news'){el.style.display='none';$('#news').style.display='';renderNews();return}
 $('#news').style.display='none';el.style.display='';
 let list=orderMatches(TAB==='all'?allMatches():(DATA[TAB]||DATA.espn[TAB]||[]),TAB==='all');
 if(!list.length){el.innerHTML='<div class="empty"><div class="big">'+(ICONS[TAB]||'\u{1F3DF}\uFE0F')+'</div>No matches here right now.<br>Live action lands the moment it starts.</div>';return}
 const groups={};list.forEach(m=>{const gk=TAB==='cricket'?(m.series||m.matchType||'Matches'):(m.matchType||'Matches');(groups[gk]=groups[gk]||[]).push(m)});
 let chips='';
 if(TAB==='cricket')chips='<div class="serchips"><a class="serchip" href="/rankings">\u{1F3C6} ICC Rankings</a><a class="serchip" href="/schedule">\u{1F4C5} Schedule</a><a class="serchip" href="/archives">\u{1F5C2}\uFE0F Archives</a>'+SERIES.map(x=>'<a class="serchip" href="/series/cricket/'+x.id+'">'+esc(x.name)+'</a>').join('')+'</div>';
 if(TAB==='football'){const seen={};list.forEach(m=>{if(m.comp&&m.matchType&&!seen[m.comp])seen[m.comp]=m.matchType});const ks=Object.keys(seen);if(ks.length)chips='<div class="serchips">'+ks.slice(0,8).map(k=>'<a class="serchip" href="/series/football/'+k+'">'+esc(seen[k])+'</a>').join('')+'</div>'}
 if(['nba','mlb','nhl','f1'].includes(TAB))chips='<div class="serchips"><a class="serchip" href="/series/'+TAB+'/x">\u{1F3C6} Standings & season hub</a></div>';

 let html=chips+Object.entries(groups).map(([g,ms])=>'<div class="sect"><i>'+esc(g)+'</i></div>'+ms.map((m,i)=>matchCard(m,i)).join('')).join('');
 el.classList.toggle('few',TAB!=='all'&&list.length<=2);
 if(TAB!=='all'&&list.length<=2){
  html+='<div class="fillcard"><div class="fbig">'+(ICONS[TAB]||'\u{1F3DF}\uFE0F')+'</div><b>That\u2019s all the live '+esc(TAB.toUpperCase())+' action right now</b><p>New matches land here the moment they start - check back closer to match time.</p>'+(['nba','mlb','nhl','f1'].includes(TAB)?'<a class="serchip" href="/series/'+TAB+'/x">\u{1F3C6} '+esc(TAB.toUpperCase())+' standings & season hub</a>':'')+(TAB==='tennis'?'<a class="serchip" href="/" onclick="return false" style="opacity:.6;cursor:default">ATP \xB7 WTA \xB7 Grand Slams covered</a>':'')+'</div>';
 }
 var _first=!el.dataset.rendered;el.innerHTML=html;el.dataset.rendered='1';el.classList.toggle('nofade',!_first);
 flashChanges(list);
}
function renderNews(){
 const el=$('#news');
 if(!NEWS.length){el.innerHTML='<div class="empty"><div class="big">\u{1F4F0}</div>Loading headlines...</div>';return}
 el.innerHTML=NEWS.map((n,i)=>{
   const thumb=n.thumb?'<img class="nthumb" src="'+esc(n.thumb)+'" loading="lazy" onerror="this.remove()">':'<div class="ninit">'+esc((n.source||'S')[0])+'</div>';
   return '<a class="ncard" style="animation-delay:'+Math.min(i*35,350)+'ms" href="'+esc(n.link)+'" target="_blank" rel="noopener"><div class="nbody"><h3>'+esc(n.title)+'</h3><div class="nmeta"><span class="src">'+esc(n.source)+'</span><span>'+ago(n.published)+'</span></div></div>'+thumb+'</a>';
 }).join('');
}
function skeletons(n){return Array(n).fill('<div class="skel"></div>').join('')}
let sTimer=null,sOpen=false;
document.getElementById('sBtn').addEventListener('click',()=>{sOpen=!sOpen;document.getElementById('sWrap').classList.toggle('open',sOpen);if(sOpen)document.getElementById('sIn').focus();else{document.getElementById('sIn').value='';document.getElementById('sRes').innerHTML=''}});
const sInD=document.getElementById('sInD');if(sInD)sInD.addEventListener('input',e=>{const q=e.target.value.trim();if(q.length<2){document.getElementById('sWrap').classList.remove('open');document.getElementById('sRes').innerHTML='';return}document.getElementById('sWrap').classList.add('open');clearTimeout(sTimer);sTimer=setTimeout(()=>doSearch(q),280)});
document.getElementById('sIn').addEventListener('input',e=>{clearTimeout(sTimer);const q=e.target.value.trim();if(q.length<2){document.getElementById('sRes').innerHTML='';return}sTimer=setTimeout(()=>doSearch(q),280)});
async function doSearch(q){
 try{
  const r=await fetch('/api/search?q='+encodeURIComponent(q));const j=await r.json();
  const el=document.getElementById('sRes');if(!document.getElementById('sWrap').classList.contains('open'))return;
  let h='';
  if(j.series&&j.series.length)h+='<div class="sreschips">'+j.series.map(x=>'<a class="serchip" href="/series/'+x.kind+'/'+x.id+'">\u{1F3C6} '+esc(x.name)+'</a>').join('')+'</div>';
  if(j.matches&&j.matches.length)h+=j.matches.map((m,i)=>matchCard(m,i)).join('');
  if(!h)h='<div class="empty">No matches or series found for &quot;'+esc(q)+'&quot;</div>';
  el.innerHTML=h;
 }catch(e){}
}
var SCORE_LOADING=false;
async function loadScores(){
 if(SCORE_LOADING)return;SCORE_LOADING=true;
 try{
  const r=await fetch('/api/scores',{cache:'no-store'});const j=await r.json();
  DATA.cricket=j.cricket||[];DATA.football=j.football||[];DATA.espn=j.espn||{};
  if(window.szCelebrate)szCelebrate.home(allMatches().filter(m=>TAB==='all'||TAB===m.sport));
  renderStrip();renderScores();
 }catch(e){
  if(!allMatches().length)$('#scores').innerHTML='<div class="empty"><div class="big">\u{1F4E1}</div>Could not reach the scores server.<br><button class="retry" onclick="loadScores()">Retry</button></div>';
 }finally{SCORE_LOADING=false}
}
async function loadNews(){try{const r=await fetch('/api/news');const j=await r.json();NEWS=j.items||[];if(TAB==='news')renderNews()}catch(e){}}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');TAB=t.dataset.tab;renderScores()});
// prefetch match detail on touch/hover so the match page opens instantly
document.getElementById('scores').addEventListener('pointerdown',e=>{
 const el=e.target.closest('.card,.schip');if(!el)return;
 fetch('/api/match?sport='+el.dataset.sport+'&id='+encodeURIComponent(el.dataset.id)).then(r=>r.json()).then(j=>{try{sessionStorage.setItem('md_'+el.dataset.sport+'_'+el.dataset.id,JSON.stringify({at:Date.now(),j}))}catch(x){}}).catch(()=>{});
},{passive:true});
function openFromEl(el){if(el)location.href='/match/'+el.dataset.sport+'/'+encodeURIComponent(el.dataset.id)}
document.getElementById('scores').addEventListener('click',e=>openFromEl(e.target.closest('.card')));
document.getElementById('liveStrip').addEventListener('click',e=>openFromEl(e.target.closest('.schip')));
// Zaap chat
$('#chatFab').onclick=()=>{$('#chatPanel').classList.add('open');if(!HIST.length&&!$('#chatLog').children.length){const l=localStorage.zaapLang;addMsg('zaap',l&&l!=='en'?'Namaste! Main Zaap hoon \u26A1 Cricket, football ya koi bhi match - poochho!':'Arre! I am Zaap \u26A1 Ask me anything about cricket, football, or any match live on this page.')}};
$('#chatClose').onclick=()=>$('#chatPanel').classList.remove('open');
$('#chatBg').onclick=()=>$('#chatPanel').classList.remove('open');
$('#langSel').value=localStorage.zaapLang||'';
$('#langSel').onchange=e=>{localStorage.zaapLang=e.target.value};
function addMsg(who,txt,cls){const d=document.createElement('div');d.className='msg '+who+(cls?' '+cls:'');d.textContent=txt;$('#chatLog').appendChild(d);$('#chatLog').scrollTop=1e9;return d}
let LASTLANG='';
function detectLang(t){
 if(/[\u0B80-\u0BFF]/.test(t))return'ta';
 if(/[\u0C00-\u0C7F]/.test(t))return'te';
 if(/[\u0C80-\u0CFF]/.test(t))return'kn';
 if(/[\u0D00-\u0D7F]/.test(t))return'ml';
 if(/[\u0A80-\u0AFF]/.test(t))return'gu';
 if(/[\u0A00-\u0A7F]/.test(t))return'pa';
 if(/[\u0980-\u09FF]/.test(t))return'bn';
 if(/[\u0900-\u097F]/.test(t))return(localStorage.zaapLang==='mr')?'mr':'hi';
 return null;
}
async function sendChat(){const inp=$('#chatIn'),v=inp.value.trim();if(!v)return;inp.value='';addMsg('me',v);HIST.push({role:'user',content:v});
 LASTLANG=localStorage.zaapLang||detectLang(v)||LASTLANG;
 const th=addMsg('zaap','thinking','think');
 try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:HIST,lang:LASTLANG||localStorage.zaapLang||null})});
  const j=await r.json();th.remove();
  if(j.reply){addMsg('zaap',j.reply);HIST.push({role:'assistant',content:j.reply});if(HIST.length>12)HIST=HIST.slice(-12);zaapSpeak(j.reply)}
  else addMsg('zaap',j.error||'Something went wrong. Try again.');
 }catch(e){th.remove();addMsg('zaap','Network hiccup. One more try?')}}
$('#chatGo').onclick=sendChat;
$('#chatIn').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
// Zaap voice: spoken replies + mic input (browser-native, free)
const VLANG={'':'en-IN',en:'en-IN',hi:'hi-IN',bn:'bn-IN',ta:'ta-IN',te:'te-IN',mr:'mr-IN',kn:'kn-IN',ml:'ml-IN',gu:'gu-IN',pa:'pa-IN'};
if(localStorage.zaapVoice===undefined)localStorage.zaapVoice='1';
function paintVoice(){$('#voiceTog').classList.toggle('off',localStorage.zaapVoice!=='1');$('#voiceTog').textContent=localStorage.zaapVoice==='1'?'\u{1F50A}':'\u{1F507}'}
$('#voiceTog').onclick=()=>{localStorage.zaapVoice=localStorage.zaapVoice==='1'?'0':'1';paintVoice();if(localStorage.zaapVoice!=='1'&&window.speechSynthesis)speechSynthesis.cancel()};
paintVoice();
$('#personaSel').value=localStorage.zaapPersona||'zaap';
$('#personaSel').onchange=e=>{localStorage.zaapPersona=e.target.value;if(window.speechSynthesis)speechSynthesis.cancel()};
let VOICES=[];
function loadVoices(){try{VOICES=speechSynthesis.getVoices()||[]}catch(e){VOICES=[]}}
if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function pickVoice(lang,female){
 if(!VOICES.length)loadVoices();
 const pre=(lang||'en').split('-')[0].toLowerCase();
 let cand=VOICES.filter(v=>(v.lang||'').toLowerCase().indexOf(pre)===0);
 if(!cand.length)cand=VOICES.filter(v=>/en-IN|en-GB|en-US/i.test(v.lang||''));
 if(!cand.length)return null;
 const fre=/female|samantha|zira|siri|veena|heera/i, mre=/male|david|mark|daniel|rishi/i;
 const score=v=>{let sc=0;const n=v.name||'';
  if(female?fre.test(n):mre.test(n))sc+=5;
  if(female&&mre.test(n))sc-=5;if(!female&&fre.test(n))sc-=5;
  if(/google/i.test(n))sc+=3;
  if(/natural|neural|online|premium|enhanced/i.test(n))sc+=2;
  if(/compact|espeak|basic/i.test(n))sc-=4;
  if(!v.localService)sc+=1;
  if((v.lang||'').toLowerCase()===lang.toLowerCase())sc+=1;
  return sc};
 cand.sort((a,b)=>score(b)-score(a));
 return cand[0];
}
function zaapSpeak(txt){
 if(localStorage.zaapVoice!=='1'||!window.speechSynthesis)return;
 try{
  speechSynthesis.cancel();
  const clean=String(txt).replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu,'').replace(/s{2,}/g,' ').slice(0,600);
  if(!clean.trim())return;
  const u=new SpeechSynthesisUtterance(clean);
  const lang=VLANG[LASTLANG||localStorage.zaapLang||'']||'en-IN';
  const female=(localStorage.zaapPersona||'zaap')==='zia';
  u.lang=lang;u.rate=1.0;u.pitch=female?1.12:0.92;
  const v=pickVoice(lang,female);if(v)u.voice=v;
  speechSynthesis.speak(u);
 }catch(e){}
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
 const rec=new SR();rec.interimResults=true;rec.maxAlternatives=1;
 rec.onresult=e=>{let fin='',int='';for(const r of e.results){if(r.isFinal)fin+=r[0].transcript;else int+=r[0].transcript}$('#chatIn').value=fin||int;if(fin){rec.stop();sendChat()}};
 rec.onend=()=>$('#micBtn').classList.remove('listening');
 rec.onerror=()=>$('#micBtn').classList.remove('listening');
 $('#micBtn').onclick=()=>{
  if($('#micBtn').classList.contains('listening')){rec.stop();return}
  rec.lang=VLANG[localStorage.zaapLang||LASTLANG||'']||'en-IN';
  try{rec.start();$('#micBtn').classList.add('listening');$('#chatIn').placeholder='Listening...';setTimeout(()=>{$('#chatIn').placeholder='Ask about any match, player, sport...'},4000)}catch(e){}
 };
}else{$('#micBtn').style.display='none'}
// boot: paint instantly from embedded snapshot, then keep refreshing in place
if(allMatches().length){renderStrip();renderScores()}else{$('#scores').innerHTML=skeletons(5)}
if(NEWS.length&&TAB==='news')renderNews();
loadScores();loadNews();
(function(){var act=Date.now();["pointerdown","touchstart","keydown","scroll","mousemove"].forEach(function(ev){window.addEventListener(ev,function(){act=Date.now()},{passive:true})});window.szLastAct=function(){return act};
function nextDelay(){var live=false;try{live=allMatches().some(function(m){return m.status==='live'})}catch(e){}if(!live)return 10000;return Date.now()-act>6e5?20000:2000}
function tick(){if(!document.hidden)loadScores();setTimeout(tick,nextDelay())}setTimeout(tick,nextDelay());})();document.addEventListener("visibilitychange",function(){if(!document.hidden)loadScores()});setInterval(loadNews,300000);
<\/script>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script><button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var SZFOOTER = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"6fa497d519d24d48baa64415c25f05be"}'><\/script><style>
.szfoot{max-width:680px;margin:38px auto 0;border-top:1px solid var(--line);padding:30px 14px 16px;color:var(--dim);font-size:13px;font-family:Inter,system-ui,sans-serif}
@media (min-width:900px){.szfoot{max-width:1120px;padding:30px 22px 16px}}
@media (min-width:1200px){.szfoot{max-width:1320px}}
.szfoot .sfgrid{display:flex;justify-content:space-between;align-items:flex-start;gap:26px;flex-wrap:wrap}
.szfoot .sfbrand{flex:0 1 280px;text-align:center}
.szfoot .sfbrand .sfrow{justify-content:center}
.szfoot .sfbrand p{margin-left:auto;margin-right:auto}
.szfoot .sfcol{flex:0 0 auto}
.szfoot .sfbrand .sfrow{display:flex;align-items:center;gap:10px}
.szfoot .sflogo{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--lime),var(--blue));display:flex;align-items:center;justify-content:center;font-size:18px}
.szfoot .sfbrand b{font:700 19px "Space Grotesk",Inter,sans-serif;color:var(--txt)}
.szfoot .sfbrand b span{color:var(--lime)}
.szfoot .sfbrand p{margin-top:9px;font-size:12.5px;line-height:1.6;max-width:250px}
.szfoot .sfcol h5{font:700 11.5px Inter,sans-serif;letter-spacing:1px;text-transform:uppercase;color:var(--txt);margin:4px 0 10px}
.szfoot .sfcol a{display:block;color:var(--dim);text-decoration:none;padding:3.5px 0;font-size:13px;transition:color .15s}
.szfoot .sfcol a:hover{color:var(--lime)}
.szfoot .sfbar{margin-top:26px;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:6px 18px;font-size:12px;text-align:center}
.szfoot .sfbar a{color:var(--dim);text-decoration:none}
.szfoot .sfbar a:hover{color:var(--lime)}
.szfoot .sfheart{color:#e11d48}
@media (max-width:700px){.szfoot .sfgrid{gap:18px 30px}.szfoot .sfbrand{flex:1 1 100%}.szfoot .sfcol{flex:0 0 calc(33% - 20px);min-width:110px}}
</style>
<footer class="szfoot"><div class="sfgrid">
<div class="sfbrand"><div class="sfrow"><div class="sflogo">&#9889;</div><b>Score<span>Zaap</span></b></div><p>Live scores, rankings and Zaap AI - every sport, one tap.</p></div>
<div class="sfcol"><h5>Sports</h5><a href="/sports/cricket">Cricket</a><a href="/?tab=football">Football</a><a href="/?tab=nba">NBA</a><a href="/?tab=mlb">MLB</a><a href="/?tab=nhl">NHL</a><a href="/?tab=tennis">Tennis</a><a href="/?tab=f1">F1</a></div>
<div class="sfcol"><h5>Explore</h5><a href="/">Live Scores</a><a href="/blog">Blog</a><a href="/news">News</a><a href="/rankings">ICC Rankings</a><a href="/schedule">Schedule</a><a href="/archives">Archives</a><a href="/?tab=news">News</a><a href="/series/f1/x">F1 Hub</a></div>
<div class="sfcol"><h5>Company</h5><a href="/about">About Us</a><a href="/contact">Contact Us</a><a href="/privacy">Privacy Policy</a></div>
</div><div class="sfbar"><span>&copy; 2026 ScoreZaap. All rights reserved.</span><span>Made in India with <span class="sfheart">&#9829;</span></span></div></footer>`;
function szBaseSeo(page) {
  const match = /<title>([^<]*)<\/title>/i.exec(page);
  if (!match) return page;
  const title = match[1];
  const map = { "Contact Us - ScoreZaap": ["/contact", "Contact ScoreZaap about live scores, site issues or corrections to sports guides."], "About Us - ScoreZaap": ["/about", "About ScoreZaap: live cricket, football, tennis and multi-sport scores with original guides."], "Privacy Policy - ScoreZaap": ["/privacy", "Read how ScoreZaap handles website data, analytics and privacy."], "ICC Rankings - ScoreZaap": ["/rankings", "ICC cricket rankings alongside live cricket scores, fixtures and original guides on ScoreZaap."] };
  const info = map[title];
  if (!info) return page;
  let tags = "";
  if (!/rel=["']canonical/.test(page)) tags += '<link rel="canonical" href="https://scorezaap.tech' + info[0] + '">';
  if (!/name=["']description/.test(page)) tags += '<meta name="description" content="' + szBlogEsc(info[1]) + '">';
  if (!/property=["']og:title/.test(page)) tags += '<meta property="og:type" content="website"><meta property="og:title" content="' + szBlogEsc(title) + '"><meta property="og:description" content="' + szBlogEsc(info[1]) + '"><meta property="og:url" content="https://scorezaap.tech' + info[0] + '"><meta name="twitter:card" content="summary">';
  return page.replace("</head>", tags + "</head>");
}
__name(szBaseSeo, "szBaseSeo");
__name2(szBaseSeo, "szBaseSeo");
const SZ_PREMIUM_CSS = "/* ScoreZaap editorial refresh. Presentation only; live data and controls are unchanged. */\n:root{--bg:#0c1420;--card:#121e2c;--card2:#192737;--line:#2b3a4c;--txt:#f1f4f7;--dim:#a1afbe;--lime:#62d5b0;--blue:#80b9ec;--amber:#e8bc75;--red:#f28d91;--green:#62d5b0;color-scheme:dark}\nhtml[data-theme=\"light\"]{--bg:#ffffff;--card:#ffffff;--card2:#f5f6f8;--line:#e3e6ec;--txt:#0e1a2b;--dim:#5a6578;--lime:#0a7a5c;--blue:#1f4f8a;--amber:#9a6a1c;--red:#b8323f;--green:#0a7a5c;color-scheme:light}html[data-theme=\"light\"] .card,html[data-theme=\"light\"] #news .ncard{box-shadow:0 1px 2px rgba(14,26,43,.05),0 6px 18px -8px rgba(14,26,43,.10)}html[data-theme=\"light\"] .bgfx{opacity:.22}html[data-theme=\"light\"] #stripWrap{background:#f7f8fa}\nhtml,body{background:var(--bg)!important;background-image:none!important}body{font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased}\n.logo{border-radius:8px;background:var(--lime);box-shadow:none;color:var(--bg);font-size:25px}\n.wrap{max-width:1240px}header{padding-top:28px;padding-bottom:20px;gap:14px}header h1{font-family:Inter,Arial,sans-serif;font-weight:800;letter-spacing:-1.5px;font-size:32px}header h1 span{color:var(--txt)}.sub{font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-top:6px;color:var(--dim)}\nnav[aria-label=\"Site navigation\"]{gap:28px!important;padding:0 2px 17px!important;flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}nav[aria-label=\"Site navigation\"] a{color:var(--dim)!important;text-decoration:none;white-space:nowrap;font-size:13px;font-weight:600}nav[aria-label=\"Site navigation\"] a:first-child{color:var(--txt)!important}nav[aria-label=\"Site navigation\"] a:hover{color:var(--lime)!important}\n.hsearch{margin-left:auto;max-width:350px}.hsearch .hbox{background:var(--card);border-radius:7px;padding:11px 14px}.hsearch input{font-size:13px}.livedot{background:none;border:0;border-radius:0;padding-right:0;font-size:10px;letter-spacing:.07em}.livedot b{color:var(--txt)}\n#stripWrap{background:var(--card);border-radius:6px;padding:8px 10px;margin-top:16px}.schip{background:transparent;border:0;border-right:1px solid var(--line);border-radius:0;padding:8px 16px;font-size:12px}.schip small{color:var(--txt);font-variant-numeric:tabular-nums}.striptag{border-radius:4px;background:none;font-size:10px;padding-left:4px}\n.score-intro{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:34px 2px 8px}.score-intro h2{font:800 clamp(27px,3.4vw,42px)/1.1 Inter,Arial,sans-serif;letter-spacing:-1.3px}.score-intro p{color:var(--dim);font-size:12px;padding-bottom:3px}.score-intro .kicker{display:block;color:var(--lime);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px}\n.tabs{background:var(--bg);backdrop-filter:none;border-bottom:1px solid var(--line);gap:22px;margin-top:8px;padding:0;min-height:54px;align-items:stretch}.tab{border:0;border-bottom:3px solid transparent;background:transparent;border-radius:0;padding:16px 2px 13px;font-size:12px;font-weight:600;box-shadow:none;transition:color .15s}.tab.on{color:var(--txt);background:none;border-bottom-color:var(--lime);box-shadow:none}.tab:hover{color:var(--txt)}\n.sect{font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;margin:25px 0 13px;color:var(--dim)}.sect:before{width:3px;height:13px;border-radius:0}.sect:after{opacity:.5}\n.card{background:var(--card);border-radius:7px;padding:18px 20px;margin-bottom:12px;box-shadow:none;transition:border-color .15s;min-width:0}.card:before{width:2px;opacity:.5}.card:hover{transform:translateY(-2px);border-color:var(--dim)}.card.fin{opacity:1}.card .mt{font-size:10px;gap:8px;margin-bottom:15px;min-width:0}.pill{font-size:9px;letter-spacing:.08em;padding:4px 7px;border-radius:3px}.pill.live{background:rgba(98,213,176,.12);color:var(--lime)}.pill.fin{background:var(--card2)}.tm{padding:6px 0}.tn{font-size:14px;font-weight:600;gap:10px}.tn img{width:24px;height:24px}.ts{font:700 20px Inter,Arial,sans-serif;color:var(--txt);font-variant-numeric:tabular-nums;letter-spacing:-.7px}.inn{font-size:12px;padding:4px 0;gap:12px;font-variant-numeric:tabular-nums}.inn b{font-weight:700}.venue{font-size:10px;border-top:1px solid var(--line);padding-top:10px;margin-top:12px;line-height:1.5}.stxt{font-size:10px;line-height:1.5}.serchip{border-radius:4px;background:var(--card);font-size:11px}.fillcard,.skel{border-radius:7px;background:var(--card)}\n#news .ncard{border-radius:7px;padding:18px;background:var(--card)}#news h3{font-size:15px;line-height:1.5;font-weight:700}.nthumb,.ninit{border-radius:4px}.src{background:none;border-radius:0;padding:0;color:var(--dim)}\n#chatFab{border-radius:6px;background:var(--txt);color:var(--bg);box-shadow:0 3px 15px #0002;padding:13px 18px;font-size:13px}#chatBox{border-radius:12px 12px 0 0}#chatIn,#chatGo{border-radius:6px}.msg{border-radius:8px}#thbtn{box-shadow:none!important;background:var(--card)!important;border-color:var(--line)!important}\n.szfoot .sflogo{background:var(--lime);border-radius:6px;box-shadow:none}.szfoot a{color:var(--dim)}.szfoot .sfbrand{text-align:left}.szfoot .sfbrand .sfrow{justify-content:flex-start}.szfoot .sfbrand p{margin-left:0}\n.blogwrap{max-width:1240px}.blognav{gap:24px;padding-bottom:22px}.blognav .brand{letter-spacing:-1.2px}.blognav .brand span{color:var(--txt)}.hero h1,.article h1{font-weight:800;letter-spacing:-1.5px}.hero{padding-top:40px}.postcard{border-radius:7px;background:var(--card);padding:24px}.postcard h2{font-size:22px;letter-spacing:-.5px}.eyebrow{font-size:10px;letter-spacing:.15em}.filterbar button,.filterbar input,.article aside,.practical,.editorial{border-radius:6px}.readlink{color:var(--lime)}.article p{line-height:1.85}.article{max-width:740px}.article h2{letter-spacing:-.5px}.szfoot{padding-bottom:90px}\na:focus-visible,button:focus-visible,input:focus-visible,.tab:focus-visible{outline:2px solid var(--lime);outline-offset:4px}\n@media(min-width:900px){.wrap{max-width:1240px;padding:0 32px 50px}#scores{gap:14px}#scores .sect{margin-top:28px}#scores .card{height:100%}#news{gap:16px}}\n@media(max-width:640px){.wrap{padding:0 18px 30px}header{padding-top:22px;padding-bottom:18px;gap:10px}.logo{width:36px;height:36px;font-size:22px;flex-shrink:0}header h1{font-size:26px;letter-spacing:-1.2px}.sub{font-size:8px;letter-spacing:.06em;white-space:normal}.livedot{font-size:9px;gap:4px;white-space:nowrap}.livedot i{width:6px;height:6px}.sbtn{width:32px;height:32px;border-radius:5px;flex-shrink:0}nav[aria-label=\"Site navigation\"]{gap:23px!important;padding-bottom:15px!important}nav[aria-label=\"Site navigation\"] a{font-size:11px}#stripWrap{margin-top:12px;padding:6px}.schip{padding:7px 10px;font-size:10px}.striptag{font-size:9px}.score-intro{padding-top:28px;gap:8px}.score-intro p{font-size:10px;max-width:110px;line-height:1.5;text-align:right}.score-intro h2{font-size:28px}.score-intro .kicker{font-size:9px;margin-bottom:8px}.tabs{gap:20px;min-height:50px}.tab{font-size:11px;padding:15px 1px 12px}.card{padding:17px 18px}.sect{margin-top:22px;font-size:9px;letter-spacing:.1em}.blogwrap{padding:20px}.blognav{gap:16px}.blognav .brand{width:100%;font-size:27px}.blognav a{font-size:12px}.hero{padding:30px 0 24px}.hero h1{font-size:36px}.hero p{font-size:16px}.postcard{padding:20px}#chatFab{right:18px;bottom:18px}#thbtn{bottom:74px!important}}\n#thbtn{box-shadow:none!important;right:18px!important;background:var(--card)!important;border-color:var(--line)!important;font-size:0!important}#thbtn:before{content:'◐';font:20px Arial,sans-serif;color:var(--txt)}\n@media(max-width:640px){nav[aria-label=\"Site navigation\"]{gap:0!important;justify-content:space-between}nav[aria-label=\"Site navigation\"] a{font-size:10.5px}.tabs{scrollbar-width:thin;scrollbar-color:var(--line) var(--bg)}.tabs::-webkit-scrollbar{display:block;height:3px}.tabs::-webkit-scrollbar-thumb{background:var(--line)}.score-intro{position:relative;margin-bottom:17px}.score-intro:after{content:'Swipe tabs for more sports →';position:absolute;right:0;bottom:-17px;color:var(--dim);font-size:9px;letter-spacing:.02em}}\n\n.hero:has(.sharebtn){padding:20px;background:var(--card);border-radius:7px}.hero:has(.sharebtn) .sharebtn{position:static;display:block;margin:0 0 14px auto;max-width:max-content;background:var(--card2);border-color:var(--line);color:var(--txt);border-radius:4px}.hero:has(.sharebtn) .mtitle{line-height:1.5}.htab{scrollbar-width:thin;scrollbar-color:var(--line) var(--bg)}.htab::-webkit-scrollbar{height:3px;display:block}.htab::-webkit-scrollbar-thumb{background:var(--line)}\n\n#scores.nofade .card{animation-name:none}#scores.nofade .card.live{animation:liveglow 2.6s ease-in-out infinite}\n";
function htmlOut(page, extra) {
  page = szBaseSeo(page);
  page = page.replace("</head>", "<style id=\"sz-premium\">" + SZ_PREMIUM_CSS + "</style></head>");
  if (!page.includes('src="/celebrations.js')) page = page.replace("</head>", '<link rel="stylesheet" href="/celebrations.css?v=auto2"><script src="/celebrations.js?v=auto2" defer><\/script></head>');
  const h = { "Content-Type": "text/html;charset=UTF-8" };
  if (extra) Object.assign(h, extra);
  return new Response(page.replace("</body>", SZFOOTER + "<style>" + SZ_PREMIUM_CSS + "</style>\n</body>"), { headers: h });
}
__name(htmlOut, "htmlOut");
__name2(htmlOut, "htmlOut");
__name22(htmlOut, "htmlOut");
__name222(htmlOut, "htmlOut");
__name2222(htmlOut, "htmlOut");
__name22222(htmlOut, "htmlOut");
__name222222(htmlOut, "htmlOut");
__name2222222(htmlOut, "htmlOut");
var INFO_PAGE = `<!DOCTYPE html>
<html lang="en"><head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png"><title>__TITLE__ - ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8;--amber:#fbbf24;--red:#fb7185}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh;background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid{animation:none}}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px;position:relative;z-index:1}
header{padding:calc(18px + env(safe-area-inset-top)) 2px 14px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--txt);text-decoration:none}
.brand{font:700 22px "Space Grotesk",sans-serif;letter-spacing:-.5px}.brand span{color:var(--lime)}
.card{background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:26px 22px;margin-top:8px}
h2{font:700 24px "Space Grotesk",sans-serif;margin-bottom:10px}
.lead{color:var(--dim);font-size:14.5px;line-height:1.65;margin-bottom:18px}
.mailcard{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;text-decoration:none;color:var(--txt);transition:border-color .2s;margin-bottom:20px}
.mailcard:hover{border-color:var(--lime)}
.mailcard svg{color:var(--lime);flex:0 0 auto}
.mailcard b{display:block;font-size:15px}
.mailcard small{color:var(--dim);font-size:12px}
.infosec{margin-bottom:16px}
.infosec h4{font:700 13px Inter;letter-spacing:.6px;text-transform:uppercase;color:var(--lime);margin-bottom:6px}
.infosec p{color:var(--dim);font-size:13.5px;line-height:1.7}
</style></head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
<header><a class="back" href="/">&#8592;</a><div class="brand">Score<span>Zaap</span></div></header>
<div class="card">__BODY__</div>
</div>
</body></html>`;
var CONTACT_BODY = `<h2>Contact Us</h2><p class="lead">Feedback, corrections, partnership ideas - we read everything that lands here.</p><a class="mailcard" href="mailto:ashwatthama710@gmail.com"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/></svg><div><b>ashwatthama710@gmail.com</b><small>We usually reply within a day or two.</small></div></a><div class="infosec"><h4>Corrections</h4><p>Spot a wrong score, stat or spelling? Mail us the match and what looks off - live data moves fast and we fix fast.</p></div><div class="infosec"><h4>Feedback</h4><p>Tell us what you want next: more leagues, more sports, a feature you keep wishing existed. ScoreZaap is built by listening.</p></div><div class="infosec"><h4>Partnerships</h4><p>For data, content or advertising partnership inquiries, write to the same address with "Partnership" in the subject line.</p></div>`;
var ABOUT_BODY = `<h2>About Us</h2><p class="lead">ScoreZaap is live scores for every sport you follow - cricket, football, NBA, MLB, NHL, tennis and F1 - in one fast, free place.</p><div class="infosec"><h4>What is ScoreZaap</h4><p>Real-time scores, match stats, rankings, series standings and sports news, built to be instant on any phone or laptop. No sign-up, no app install - open the site and you are caught up.</p></div><div class="infosec"><h4>Zaap AI</h4><p>ScoreZaap comes with Zaap, a built-in AI companion that answers match and sport questions out loud in 10 languages - and automatically replies in the language you speak to it in. Ask for a score, a player stat or a head-to-head and it narrates from live data.</p></div><div class="infosec"><h4>Who runs it</h4><p>ScoreZaap is designed, built and run independently by Akash Sharma, a developer from India who got tired of juggling five apps to follow five sports.</p></div><div class="infosec"><h4>The mission</h4><p>One tap, every score. Keep it fast, keep it free, keep adding the leagues fans actually ask for.</p></div><div class="infosec"><h4>Get in touch</h4><p>Ideas, corrections or partnership inquiries: <a href="/contact" style="color:var(--lime)">contact us</a> - we read everything.</p></div>`;
var PRIVACY_BODY = `<h2>Privacy Policy</h2><p class="lead">Reading scores does not require an account. Some optional features and service providers process data as described below. Last updated: October 1, 2026.</p><div class="infosec"><h4>Preferences, chat and voice</h4><p>Theme, voice and language preferences are stored in your browser. When you use Zaap chat, up to eight recent messages (up to 500 characters each) are sent to our server and Cloudflare Workers AI to generate a response. The site code does not save chat message bodies in its database. Do not send passwords, payment details or other sensitive information.</p><p>Voice input uses your browser's speech recognition, which may process audio through the browser provider. The resulting text is sent as a chat message. Spoken replies use your browser's speech synthesis. Microphone access is optional and controlled by your browser.</p></div><div class="infosec"><h4>Polls, alerts and service security</h4><p>Poll totals and a hashed IP-based voting identifier are stored to limit repeat voting; voting identifiers expire after 30 days. Chat rate limits use a hashed IP identifier stored for up to five minutes and site-wide daily counts for up to 48 hours. If you enable match alerts, we store your browser's push subscription endpoint and selected match until you unsubscribe. Cloudflare hosts this site and processes network information, including IP addresses, to deliver and protect the service. Provider logging and retention are governed by their own policies.</p></div><div class="infosec"><h4>Advertising and cookies</h4><p>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's advertising cookies enable Google and its partners to serve ads based on visits to this site and other sites on the Internet. Other ad networks may also use cookies when serving ads through Google.</p><p>You can opt out of personalized advertising in <a href="https://adssettings.google.com/" rel="noopener noreferrer" style="color:var(--lime)">Google Ads Settings</a>, and learn about third-party advertising opt-outs at <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer" style="color:var(--lime)">AboutAds</a>. See <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer" style="color:var(--lime)">Google's advertising information</a> for details. Browser settings also let you manage cookies. Where consent is required, advertising must respect your consent choices.</p></div><div class="infosec"><h4>Analytics and providers</h4><p>Cloudflare Web Analytics measures visits and page performance. We use aggregate reports, not a ScoreZaap user-account profile. Service providers process information to run hosting, AI responses, analytics, notifications and advertising; this is different from selling your information.</p><p>Read <a href="https://www.cloudflare.com/privacypolicy/" style="color:var(--lime)">Cloudflare's privacy policy</a> and <a href="https://policies.google.com/privacy" style="color:var(--lime)">Google's privacy policy</a>. Your browser provider's policy covers its speech services.</p></div><div class="infosec"><h4>Contact and choices</h4><p>Disable voice permissions or alerts in your browser and clear local storage to remove preferences. Questions or data requests: <a href="mailto:ashwatthama710@gmail.com" style="color:var(--lime)">ashwatthama710@gmail.com</a>.</p></div>`;
var SERIES_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Series & Standings - ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8;--red:#fb7185}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh;background-image:radial-gradient(600px 300px at 80% -80px,rgba(163,230,53,.07),transparent 70%);background-attachment:fixed}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(16px + env(safe-area-inset-top)) 2px 12px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;color:var(--txt);text-decoration:none}
.brand{font:700 19px Space Grotesk}.brand span{color:var(--lime)}
.hero{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:18px;margin-bottom:14px;position:relative;overflow:hidden;animation:fadeup .45s ease both}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--lime),var(--blue))}
.hero h2{font:700 20px Space Grotesk;display:flex;align-items:center;gap:10px}
.hero h2 img{width:26px;height:26px;object-fit:contain}
.hero .sub{font-size:12px;color:var(--dim);margin-top:4px}
.sect{display:flex;align-items:center;gap:9px;margin:18px 2px 10px;font:600 11.5px Space Grotesk;letter-spacing:1.6px;color:var(--dim);text-transform:uppercase}
.sect::before{content:'';width:8px;height:8px;border-radius:3px;background:var(--lime)}
.sect::after{content:'';flex:1;height:1px;background:var(--line)}
.tbl{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:8px;animation:fadeup .45s ease both}
.tbl h4{font:600 12px Inter;color:var(--dim);padding:11px 14px 0;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{font:600 10px Inter;text-transform:uppercase;letter-spacing:.8px;color:var(--dim);text-align:right;padding:10px 8px 7px;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left;padding-left:14px}
th:nth-child(2),td:nth-child(2){text-align:left}
td{padding:8px;border-bottom:1px solid rgba(30,44,63,.5);text-align:right;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:none}
td .tm{display:flex;align-items:center;gap:8px;font-weight:600}
td .tm img{width:18px;height:18px;border-radius:50%;object-fit:cover;background:var(--card)}
td b{font-weight:800}
.pos{color:var(--dim);font-weight:700}
tr.top td:first-child .pos{color:var(--lime)}
.pts{font-weight:800;color:var(--lime)}
.card{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-bottom:9px;cursor:pointer;animation:fadeup .45s ease both;transition:border-color .2s}
.card:active{border-color:var(--lime)}
.card .t1{font-weight:700;font-size:13.5px}
.card .meta{font-size:11.5px;color:var(--dim);margin-top:3px}
.card .sc{color:var(--lime);font-weight:800;font-size:13px;margin-top:5px}
.badge{display:inline-block;font-size:10px;font-weight:700;padding:2.5px 8px;border-radius:8px;margin-left:7px;vertical-align:middle}
.badge.live{background:rgba(251,113,133,.15);color:var(--red);animation:pulse 1.4s infinite}
.badge.up{background:rgba(56,189,248,.12);color:var(--blue)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.skel{height:70px;border-radius:16px;background:var(--card);margin-bottom:9px;position:relative;overflow:hidden}
.skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent);animation:shimmer 1.2s infinite}
@keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.empty{text-align:center;color:var(--dim);padding:44px 20px;font-size:13px;line-height:1.7}
.empty .big{font-size:38px;margin-bottom:10px}
.note{font-size:11px;color:var(--dim);padding:8px 4px;line-height:1.6}

/* ---------- desktop ---------- */
@media (min-width:900px){
 .wrap{max-width:1080px;padding:0 22px 70px}
 .hero h2{font-size:26px}
 .hero .sub{font-size:13.5px}
 #app{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
 #app .hero,#app .sect,#app .empty{grid-column:1/-1}
 #app .card{margin-bottom:0}
 .tbl{margin-bottom:0}
 .card:hover{border-color:var(--lime)}
}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <header><a class="back" href="/">\u2190</a><div class="brand">Score<span>Zaap</span></div></header>
 <div id="app"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>
</div>
<script>
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dt=d=>{try{const x=new Date(d);return x.toLocaleDateString(undefined,{day:'numeric',month:'short'})+', '+x.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}catch(e){return d||''}};
const parts=location.pathname.split('/');
const KIND=parts[2]||'', SID=decodeURIComponent(parts.slice(3).join('/')||'');
function matchLink(m){return '/match/'+m.sport+'/'+encodeURIComponent(m.id)}
function card(m){
 const badge=m.status==='live'?'<span class="badge live">LIVE</span>':(m.status==='upcoming'?'<span class="badge up">'+esc(dt(m.start))+'</span>':'');
 const sc=(m.scores||[]).map(x=>esc(x.value)).join(' \xB7 ');
 return '<div class="card" onclick="location.href='+String.fromCharCode(39)+matchLink(m)+String.fromCharCode(39)+'"><div class="t1">'+esc(m.home.short||m.home.name)+' vs '+esc(m.away.short||m.away.name)+badge+'</div><div class="meta">'+esc(m.title||'')+'</div>'+(sc?'<div class="sc">'+sc+'</div>':'')+(m.statusText&&m.status!=='upcoming'?'<div class="meta">'+esc(m.statusText)+'</div>':'')+'</div>';
}
function standingsCricket(rows){
 return '<table><tr><th>#</th><th>Team</th><th>M</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>Pts</th></tr>'+rows.map(r=>'<tr class="'+(r.pos<=4?'top':'')+'"><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+(r.img?'<img src="'+esc(r.img)+'" loading="lazy" onerror="this.remove()">':'')+esc(r.short||r.team)+'</div></td><td>'+r.m+'</td><td>'+r.w+'</td><td>'+r.l+'</td><td>'+r.t+'</td><td>'+r.nr+'</td><td class="pts">'+r.pts+'</td></tr>').join('')+'</table>';
}
function standingsFootball(tables){
 return tables.map(t=>'<div class="tbl">'+(t.group?'<h4>'+esc(t.group)+'</h4>':'')+'<table><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>'+t.rows.map(r=>'<tr class="'+(r.pos<=4?'top':'')+'"><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+(r.img?'<img src="'+esc(r.img)+'" loading="lazy" onerror="this.remove()">':'')+esc(r.short||r.team)+'</div></td><td>'+r.m+'</td><td>'+r.w+'</td><td>'+r.d+'</td><td>'+r.l+'</td><td>'+(r.gd>0?'+':'')+r.gd+'</td><td class="pts">'+r.pts+'</td></tr>').join('')+'</table></div>').join('');
}
function standingsMlbNhl(tables,kind){
 const head=kind==='mlb'?'<tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th></tr>':'<tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>Pts</th></tr>';
 return tables.map(t=>'<div class="tbl"><h4>'+esc(t.group)+'</h4><table>'+head+t.rows.map(r=>kind==='mlb'?'<tr><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+esc(r.short||r.team)+'</div></td><td><b>'+r.w+'</b></td><td>'+r.l+'</td><td>'+esc(r.pct||'')+'</td><td>'+esc(r.gb||'')+'</td></tr>':'<tr><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+(r.img?'<img src="'+esc(r.img)+'" loading="lazy" onerror="this.remove()">':'')+esc(r.short||r.team)+'</div></td><td>'+r.m+'</td><td><b>'+r.w+'</b></td><td>'+r.l+'</td><td>'+r.otl+'</td><td class="pts">'+r.pts+'</td></tr>').join('')+'</table></div>').join('');
}
function standingsF1(f1){
 let h='<div class="tbl"><h4>Drivers Championship</h4><table><tr><th>#</th><th>Driver</th><th>Team</th><th>Wins</th><th>Pts</th></tr>'+f1.drv.map(r=>'<tr class="'+(r.pos<=3?'top':'')+'"><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+esc(r.team)+'</div></td><td style="text-align:left;color:var(--dim)">'+esc(r.sub||'')+'</td><td>'+r.w+'</td><td class="pts">'+r.pts+'</td></tr>').join('')+'</table></div>';
 h+='<div class="tbl"><h4>Constructors Championship</h4><table><tr><th>#</th><th>Team</th><th>Wins</th><th>Pts</th></tr>'+f1.con.map(r=>'<tr class="'+(r.pos<=3?'top':'')+'"><td><span class="pos">'+r.pos+'</span></td><td><div class="tm">'+esc(r.team)+'</div></td><td>'+r.w+'</td><td class="pts">'+r.pts+'</td></tr>').join('')+'</table></div>';
 if(f1.cal&&f1.cal.length){const today=new Date().toISOString().slice(0,10);const next=f1.cal.filter(r=>r.date>=today).slice(0,4);if(next.length)h+='<div class="tbl"><h4>Upcoming races</h4><table>'+next.map(r=>'<tr><td>R'+esc(r.round)+'</td><td style="text-align:left"><b>'+esc(r.name)+'</b><div style="color:var(--dim);font-size:11px">'+esc(r.where)+' \xB7 '+esc(r.date)+'</div></td></tr>').join('')+'</table></div>'}
 return h;
}
async function load(){
 const app=document.getElementById('app');
 try{
  const r=await fetch('/api/series?kind='+encodeURIComponent(KIND)+'&id='+encodeURIComponent(SID));
  const d=await r.json();
  if(d.error){app.insertAdjacentHTML('afterbegin','<p class="note">Live update unavailable; saved snapshot below.</p>');return}
  document.title=d.name+' - ScoreZaap';
  let h='<div class="hero"><h2>'+(d.emblem?'<img src="'+esc(d.emblem)+'" onerror="this.remove()">':'')+esc(d.name)+'</h2><div class="sub">'+esc(d.sub||'')+'</div></div>';
  let tables='';
  if(d.standingsType==='cricket'&&d.standings)tables='<div class="tbl"><h4>Points Table</h4>'+standingsCricket(d.standings)+'</div>';
  else if(d.standingsType==='football'&&d.tables&&d.tables.length)tables=standingsFootball(d.tables);
  else if((d.standingsType==='mlb'||d.standingsType==='nhl')&&d.tables&&d.tables.length)tables=standingsMlbNhl(d.tables,d.standingsType);
  else if(d.standingsType==='f1'&&d.f1)tables=standingsF1(d.f1);
  if(tables)h+='<div class="sect"><i>Standings</i></div>'+tables;
  if(d.fixtures&&d.fixtures.length)h+='<div class="sect"><i>Fixtures</i></div>'+d.fixtures.map(card).join('');
  if(d.results&&d.results.length)h+='<div class="sect"><i>Recent results</i></div>'+d.results.map(card).join('');
  if(KIND==='cricket'&&!d.standings)h+='<div class="note">Points table appears when the tournament publishes one. Fixtures and results update live.</div>';
  if(KIND==='nba')h+='<div class="note">NBA standings land here once the season starts; fixtures update every 15 min.</div>';
  app.innerHTML=h;
 }catch(e){app.insertAdjacentHTML('afterbegin','<p class="note">Live update unavailable; saved snapshot below.</p>')}
}
load();
<\/script>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script><button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var RANKINGS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>ICC Rankings - ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8;--red:#fb7185}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(16px + env(safe-area-inset-top)) 2px 12px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;color:var(--txt);text-decoration:none}
.brand{font:700 19px Space Grotesk}.brand span{color:var(--lime)}
h2{font:700 20px Space Grotesk;margin:8px 2px 4px}
.upd{font-size:11.5px;color:var(--dim);margin:0 2px 12px}
.chips{display:flex;gap:8px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}
.chip{border:1px solid var(--line);background:var(--card);color:var(--dim);border-radius:20px;padding:8px 16px;font:600 12.5px Inter;cursor:pointer;white-space:nowrap}
.chip.on{background:var(--lime);border-color:var(--lime);color:#0b111a}
.row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 14px;margin-bottom:8px;animation:fadeup .4s ease both}
@keyframes fadeup{from{opacity:0;transform:translateY(10px)}}
.rk{font:700 16px Space Grotesk;color:var(--dim);width:30px;text-align:center}
.row.top3 .rk{color:var(--lime)}
.pimg{width:38px;height:38px;border-radius:50%;background:var(--card2);object-fit:cover}
.nm{flex:1;font-weight:600;font-size:14px}
.nm small{display:block;color:var(--dim);font-weight:500;font-size:11.5px}
.rt{font:700 15px Space Grotesk;color:var(--blue)}
.tr{font-size:13px;width:20px;text-align:center}
.note{font-size:11px;color:var(--dim);padding:8px 4px;line-height:1.6}
.skel{height:60px;border-radius:14px;background:linear-gradient(100deg,var(--card) 40%,var(--card2) 50%,var(--card) 60%);background-size:200% 100%;animation:sh 1.2s infinite;margin-bottom:8px}
@keyframes sh{to{background-position:-200% 0}}
@media (min-width:900px){
 .wrap{max-width:1020px;padding:0 22px 70px}
 #rows{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 #rows .row{margin-bottom:0}
 .row:hover{border-color:var(--lime)}
}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <header><a class="back" href="/">\u2190</a><div class="brand">Score<span>Zaap</span></div></header>
 <h2>ICC Player Rankings</h2>
 <div class="upd" id="upd">Loading...</div>
 <div class="chips" id="fchips"></div>
 <div class="chips" id="tchips"></div>
 <div id="rows"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>
</div>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script>
<script>
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let FMT='odi',TYP='batsmen';
const FMTS=[['odi','ODI'],['t20','T20I'],['test','Test']];
const TYPS=[['batsmen','Batting'],['bowlers','Bowling'],['allrounders','All-rounders'],['teams','Teams']];
function chips(el,list,cur,fn){document.getElementById(el).innerHTML=list.map(x=>'<div class="chip'+(x[0]===cur?' on':'')+'" onclick="'+fn+'('+String.fromCharCode(39)+x[0]+String.fromCharCode(39)+')">'+x[1]+'</div>').join('')}
function setF(f){FMT=f;load()}
function setT(t){TYP=t;load()}
async function load(){
 chips('fchips',FMTS,FMT,'setF');chips('tchips',TYPS,TYP,'setT');
 const lastGood=document.getElementById('rows').innerHTML;
 try{
  const r=await fetch('/api/rankings?format='+FMT+'&type='+TYP);const j=await r.json();
  if(j.error){document.getElementById('upd').textContent='Live update unavailable; saved snapshot below.';return}
  document.getElementById('upd').textContent='Feed snapshot '+(j.updated||'date unavailable')+(j.sourceNote?' \xB7 '+j.sourceNote:'');
  document.getElementById('rows').innerHTML=j.rows.map((x,i)=>{
   const tr=x.trend==='Up'?'<span style="color:var(--lime)">\u25B2</span>':(x.trend==='Down'?'<span style="color:var(--red)">\u25BC</span>':'<span style="color:var(--dim)">\u2022</span>');
   return '<div class="row'+(x.rank<=3?' top3':'')+'" style="animation-delay:'+Math.min(i*30,300)+'ms'+(x.id?';cursor:pointer':'')+'"'+(x.id?' onclick="location.href='+String.fromCharCode(39)+'/player/'+x.id+String.fromCharCode(39)+'"':'')+'><div class="rk">'+x.rank+'</div>'+(x.img?'<img class="pimg" src="'+esc(x.img)+'" loading="lazy" onerror="this.remove()">':'')+'<div class="nm">'+esc(x.name)+'<small>'+esc(x.country||'')+'</small></div><div class="tr">'+tr+'</div><div class="rt">'+x.rating+'</div></div>';
  }).join('');
 }catch(e){document.getElementById('upd').textContent='Live update unavailable; saved snapshot below.'}
}
load();
<\/script>
<button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var PLAYER_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Player - ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(16px + env(safe-area-inset-top)) 2px 12px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--txt);text-decoration:none}
.brand{font:700 19px Space Grotesk}.brand span{color:var(--lime)}
.hero{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:18px;display:flex;gap:16px;align-items:center;position:relative;overflow:hidden;animation:fadeup .45s ease both}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--lime),var(--blue))}
@keyframes fadeup{from{opacity:0;transform:translateY(10px)}}
.pimg{width:76px;height:76px;border-radius:22px;object-fit:cover;background:var(--card2);border:1px solid var(--line)}
.hero h2{font:700 20px Space Grotesk}
.hero .role{color:var(--lime);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.hero .meta{color:var(--dim);font-size:12px;margin-top:4px}
.ranks{display:flex;gap:8px;margin:14px 0}
.rank{flex:1;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;text-align:center}
.rank b{font:700 20px Space Grotesk;color:var(--lime);display:block}
.rank span{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
.rank small{display:block;font-size:10px;color:var(--dim);margin-top:3px}
.sect{font-size:11px;letter-spacing:1.4px;color:var(--dim);text-transform:uppercase;margin:16px 2px 8px;display:flex;align-items:center;gap:8px}
.sect::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--lime)}
.sect::after{content:'';flex:1;height:1px;background:var(--line)}
.kv{display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid rgba(30,44,63,.5);font-size:13px}
.kv b{color:var(--dim);font-weight:500}
.frow{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:7px;font-size:13px}
.frow b{min-width:70px;color:var(--lime)}
.frow .fmeta{margin-left:auto;color:var(--dim);font-size:11.5px;text-align:right}
.tchips{display:flex;flex-wrap:wrap;gap:7px}
.tchip{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 13px;font-size:12px;color:var(--dim)}
.note{font-size:11px;color:var(--dim);padding:8px 4px}
.skel{height:70px;border-radius:16px;background:linear-gradient(100deg,var(--card) 40%,var(--card2) 50%,var(--card) 60%);background-size:200% 100%;animation:sh 1.2s infinite}
@keyframes sh{to{background-position:-200% 0}}
@media (min-width:900px){.wrap{max-width:860px;padding:0 22px 70px}.hero h2{font-size:24px}}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <header><a class="back" href="/rankings">\u2190</a><div class="brand">Score<span>Zaap</span></div></header>
 <div id="app"><div class="skel"></div><div class="skel"></div></div>
</div>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script>
<script>
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PID=location.pathname.split('/')[2]||'';
function kv(k,v){return v?'<div class="kv"><b>'+k+'</b><span>'+esc(v)+'</span></div>':''}
async function load(){
 try{
  const r=await fetch('/api/player?id='+encodeURIComponent(PID));const p=await r.json();
  if(p.error){document.getElementById('app').innerHTML='<div class="note">'+esc(p.error)+'</div>';return}
  document.title=p.name+' - ScoreZaap';
  const rk=p.rankings||{};
  const ranks=[['Test',rk.test,rk.testBest],['ODI',rk.odi,rk.odiBest],['T20I',rk.t20,rk.t20Best]].filter(x=>x[1]&&+x[1]>0);
  let h='<div class="hero">'+(p.img?'<img class="pimg" src="'+esc(p.img)+'" onerror="this.remove()">':'')+'<div><h2>'+esc(p.name)+'</h2><div class="role">'+esc(p.role||'')+(p.intlTeam?' \xB7 '+esc(p.intlTeam):'')+'</div>'+(p.fullName&&p.fullName!==p.name?'<div class="meta">'+esc(p.fullName)+'</div>':'')+'</div></div>';
  if(ranks.length)h+='<div class="sect">ICC Batting Ranks</div><div class="ranks">'+ranks.map(x=>'<div class="rank"><b>#'+x[1]+'</b><span>'+x[0]+'</span><small>best #'+x[2]+'</small></div>').join('')+'</div>';
  h+='<div class="sect">Profile</div>'+kv('Born',p.dob)+kv('Birthplace',p.birthplace)+kv('Batting',p.bat)+kv('Bowling',p.bowl);
  if(p.recent&&p.recent.length)h+='<div class="sect">Recent Form</div>'+p.recent.map(r=>'<div class="frow"><b>'+esc(r.score)+'</b><span>vs '+esc(r.opp)+'</span><span class="fmeta">'+esc(r.format)+'<br>'+esc(r.date)+'</span></div>').join('');
  if(p.teams&&p.teams.length)h+='<div class="sect">Teams</div><div class="tchips">'+p.teams.map(t=>'<span class="tchip">'+esc(t)+'</span>').join('')+'</div>';
  document.getElementById('app').innerHTML=h;
 }catch(e){document.getElementById('app').innerHTML='<div class="note">Network error. Retry.</div>'}
}
load();
<\/script>
<button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
function escAttr(x) {
  return String(x == null ? "" : x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(escAttr, "escAttr");
__name2(escAttr, "escAttr");
__name22(escAttr, "escAttr");
__name222(escAttr, "escAttr");
__name2222(escAttr, "escAttr");
__name22222(escAttr, "escAttr");
__name222222(escAttr, "escAttr");
__name2222222(escAttr, "escAttr");
__name22222222(escAttr, "escAttr");
var MATCH_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Match \xB7 ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8;--amber:#fbbf24;--green:#4ade80;--red:#fb7185}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh;background-image:radial-gradient(600px 300px at 80% -80px,rgba(163,230,53,.07),transparent 70%),radial-gradient(500px 260px at 10% -60px,rgba(56,189,248,.08),transparent 70%);background-attachment:fixed}
.wrap{max-width:680px;margin:0 auto;padding:0 14px calc(30px + env(safe-area-inset-bottom))}
.topbar{display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 2px 12px;position:sticky;top:0;background:linear-gradient(180deg,var(--bg) 78%,transparent);z-index:5}
.back{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--txt);font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .15s}
.back:active{transform:scale(.9)}
.brand{font:700 18px Space Grotesk}.brand span{color:var(--lime)}
.refresh{margin-left:auto;font-size:11px;color:var(--dim);display:flex;align-items:center;gap:6px}
.rdot{width:7px;height:7px;border-radius:50%;background:var(--lime);animation:pulse 1.6s infinite}@media (max-width:640px){.rtxt{display:none}.topbar .brand{font-size:15px}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
.hero{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:18px 16px;margin-top:4px;position:relative;overflow:hidden}
.hero.cricket{border-top:3px solid var(--amber)}
.hero.football{border-top:3px solid var(--blue)}
.hero.nba{border-top:3px solid #f97316}.hero.mlb{border-top:3px solid #ef4444}.hero.nhl{border-top:3px solid #93c5fd}.hero.tennis{border-top:3px solid #4ade80}.hero.f1{border-top:3px solid #e11d48}
.mtitle{font:700 17px/1.45 Space Grotesk;letter-spacing:-.2px}.pn a,.innteam a{color:inherit;text-decoration:none;border-bottom:1px dotted var(--dim)}.estrip{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}.echip{font-size:11.5px;padding:4px 9px;border:1px solid var(--line);border-radius:999px;color:var(--dim)}.echip b{color:var(--acc);font-weight:700}
.msub{font-size:12px;color:var(--dim);margin-top:5px}
.status{margin-top:12px;font-weight:700;font-size:14.5px;color:var(--green)}
.status.live{color:var(--lime);display:inline-flex;align-items:center;gap:8px}
.status.live::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--lime);animation:pulse 1.2s infinite}
.status.up{color:var(--dim);font-weight:600}
.scoreblock{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:14px;padding:6px 0 2px}
.scoreblock img{width:44px;height:44px;object-fit:contain;border-radius:50%;background:rgba(255,255,255,.05);padding:3px}
.bigscore{font:700 30px Space Grotesk;letter-spacing:-.5px}
.htab{display:flex;gap:0;margin:16px 0 0;border-bottom:1px solid var(--line);overflow-x:auto}
.htab button{background:none;border:none;color:var(--dim);font:600 13.5px Inter;padding:10px 16px 12px;cursor:pointer;position:relative;white-space:nowrap;transition:color .2s}
.htab button.on{color:var(--txt)}
.htab button.on::after{content:'';position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--lime)}
.pane{padding:16px 2px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.chip{border:1px solid var(--line);background:var(--card);color:var(--dim);border-radius:20px;padding:7px 14px;font:600 12.5px Inter;cursor:pointer;transition:all .18s}
.chip.on{background:var(--lime);border-color:var(--lime);color:#0b111a}
.inncard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:4px 16px 12px;margin-bottom:12px}
.innhead{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 10px;border-bottom:1px solid var(--line)}
.innteam{font:700 15px Space Grotesk}
.innscore{font:700 22px Space Grotesk;color:var(--lime)}
.innscore small{font:500 13px Inter;color:var(--dim);margin-left:6px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{font:600 10.5px Inter;text-transform:uppercase;letter-spacing:.8px;color:var(--dim);text-align:right;padding:9px 4px 7px;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left}
td{padding:8.5px 4px;border-bottom:1px solid rgba(30,44,63,.5);text-align:right;font-weight:600}
tr:last-child td{border-bottom:none}
.pn{font-weight:600}
.pn .cap{color:var(--amber);font-weight:700}
.out{font-size:11px;color:var(--dim);font-weight:400;margin-top:1px}
td.num{font-variant-numeric:tabular-nums}
.extrow{display:flex;justify-content:space-between;padding:9px 4px;font-size:12px;color:var(--dim);border-bottom:1px solid rgba(30,44,63,.5)}
.extrow b{color:var(--txt)}
.fowhead{font:600 11px Inter;text-transform:uppercase;letter-spacing:1px;color:var(--dim);padding:13px 4px 6px}
.fowrow{display:flex;gap:8px;flex-wrap:wrap;padding:3px 4px}
.fowchip{background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:5px 10px;font-size:11px}
.fowchip b{color:var(--red)}
.irow{display:flex;justify-content:space-between;gap:14px;padding:12px 2px;border-bottom:1px solid var(--line);font-size:13.5px}
.wxcard{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.wxmain{display:flex;align-items:center;gap:12px}
.wxemoji{font-size:30px}
.wxtemp{font:700 22px Space Grotesk}
.wxdesc{font-size:12px;color:var(--dim)}
.wxstats{font-size:12.5px;color:var(--dim);text-align:right}
.wxnote{font-size:10px;margin-top:3px;color:var(--dim);opacity:.7}
.sharebtn{position:absolute;top:14px;right:14px;background:rgba(163,230,53,.12);border:1px solid rgba(163,230,53,.35);color:var(--lime);border-radius:20px;padding:6px 13px;font:600 12px Inter;cursor:pointer}
.sharebtn:hover{background:rgba(163,230,53,.2)}
.pollcard{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:16px;padding:13px 15px;margin-bottom:12px}
.pollq{font:700 14px Space Grotesk;margin-bottom:9px}
.pollopt{display:block;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:12px;color:var(--txt);font:600 13.5px Inter;padding:10px 13px;margin-bottom:7px;cursor:pointer;transition:border-color .15s}
.pollopt:hover{border-color:var(--lime)}
.pollres{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:7px;font-size:13.5px;font-weight:600;display:flex;justify-content:space-between}
.pollres.mine{border-color:var(--lime)}
.pollbar{position:absolute;left:0;top:0;bottom:0;background:rgba(163,230,53,.14);border-radius:12px}
.polllabel{position:relative}
.pollpct{position:relative;color:var(--lime);font-weight:700}
.polltotal{font-size:11px;color:var(--dim);margin-top:2px}
.irow:last-child{border-bottom:none}
.irow .k{color:var(--dim);flex:0 0 auto}
.irow .v{text-align:right;font-weight:600}
.teamhead{font:700 14px Space Grotesk;letter-spacing:.4px;padding:18px 2px 8px;color:var(--amber)}
.prow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:10px 2px;border-bottom:1px solid var(--line)}
.prow:last-child{border-bottom:none}
.pname{font-size:13.5px;font-weight:600}
.prole{font-size:11px;color:var(--dim);text-align:right}
.note{margin:16px 2px;background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:13px 14px;font-size:12px;color:var(--dim);line-height:1.55}
.note b{color:var(--txt)}
.tl{position:relative;padding-left:22px}
.tl::before{content:'';position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:var(--line)}
.tlev{position:relative;padding:9px 0 9px 6px;animation:fadeup .35s ease both}
.tlev::before{content:'';position:absolute;left:-19px;top:14px;width:9px;height:9px;border-radius:50%;background:var(--dim)}
.tlev.goal::before{background:var(--lime);box-shadow:0 0 10px rgba(163,230,53,.7)}
.tlev.card-ev::before{background:var(--amber)}
.tlmin{font:700 12px Space Grotesk;color:var(--lime);display:inline-block;margin-right:8px}
.tltxt{font-size:13px;line-height:1.5}
.tlteam{font-size:11px;color:var(--dim);margin-top:2px}
.comm{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:4px 14px;margin-top:14px}
.comm .cmin{font:700 11.5px Space Grotesk;color:var(--blue);margin-right:8px}
.comm .crow{padding:8px 0;border-bottom:1px solid rgba(30,44,63,.5);font-size:12.5px;line-height:1.5}
.comm .crow:last-child{border-bottom:none}
.err{text-align:center;padding:70px 20px;color:var(--dim)}
.err a,.retry{color:var(--lime)}
.retry{display:inline-block;margin-top:14px;background:var(--lime);border:none;border-radius:12px;padding:10px 22px;font-weight:700;cursor:pointer;color:#0b111a;text-decoration:none}
.fadeup{animation:fadeup .4s ease both}
@keyframes fadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.skel{background:var(--card);border:1px solid var(--line);border-radius:16px;margin-bottom:12px;position:relative;overflow:hidden}
.skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);animation:shimmer 1.3s infinite}
@keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.sk1{height:150px}.sk2{height:44px}.sk3{height:220px}
@media(min-width:520px){.scoreblock img{width:52px;height:52px}}
.crow .ctx{flex:1}
.cev-4{border-left:3px solid var(--blue)}
.cev-6{border-left:3px solid var(--lime)}
.cev-w{border-left:3px solid var(--red)}
.cev-w .ctx{color:var(--red);font-weight:600}

/* ---------- desktop ---------- */
@media (min-width:900px){
 .wrap{max-width:1040px;padding:0 22px 70px}
 .brand{font-size:22px}
 .pane{padding:4px 6px}
 table{font-size:13.5px}
 .hero h2{font-size:24px}
 .inncard{max-width:none}
}
.stats{display:flex;flex-direction:column;gap:12px;padding:6px 2px}
.srow{display:flex;align-items:center;gap:10px}
.sval{width:44px;font:700 14px Space Grotesk;text-align:center}
.sval.a{color:var(--dim)}
.smid{flex:1}
.slabel{font-size:11.5px;color:var(--dim);text-align:center;margin-bottom:5px}
.sbar{height:6px;border-radius:4px;background:var(--card2);overflow:hidden;display:flex}
.sbar i{display:block;background:linear-gradient(90deg,var(--lime),var(--blue));border-radius:4px}
.gtitle{font:600 12px Space Grotesk;color:var(--dim);margin:14px 2px 8px;text-transform:uppercase;letter-spacing:.6px}
.chart{width:100%;height:auto;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px}
.glegend{display:flex;gap:16px;font-size:11.5px;color:var(--dim);padding:6px 2px}
.glegend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <div class="topbar">
  <a class="back" href="/">\u2190</a>
  <div class="brand">\u26A1 Score<span>Zaap</span></div>
  <button class="back" id="bellBtn" title="Notify me" aria-label="Notify me" style="margin-left:auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>
  <div class="refresh" id="ref" style="margin-left:0"></div>
 </div>
 <div id="app"><div class="skel sk1"></div><div class="skel sk2"></div><div class="skel sk3"></div></div>
</div>
<link rel="stylesheet" href="/celebrations.css"><script src="/celebrations.js?v=auto2"><\/script><script>
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const parts=location.pathname.split('/');
const SPORT=parts[2],MID=decodeURIComponent(parts.slice(3).join('/'));
function b64uToBuf(b){const p='='.repeat((4-b.length%4)%4);const s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
const subKey='push_'+SPORT+'_'+MID;
async function setupBell(){
 const btn=document.getElementById('bellBtn');
 if(!('serviceWorker' in navigator)||!('PushManager' in window)){btn.style.display='none';return}
 if(localStorage.getItem(subKey))btn.textContent='\u{1F515}';
 btn.addEventListener('click',async()=>{
  try{
   if(localStorage.getItem(subKey)){
    const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
    if(sub){await fetch('/api/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe()}
    localStorage.removeItem(subKey);btn.textContent='\u{1F514}';btn.style.transform='scale(1.15)';setTimeout(()=>btn.style.transform='',180);return;
   }
   const perm=await Notification.requestPermission();
   if(perm!=='granted'){btn.textContent='\u{1F6AB}';setTimeout(()=>btn.textContent='\u{1F514}',1500);return}
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBuf('BB0akVmcYCoa7wNtm1h0i2QVJtKci7L4ez_XiJJedwZSu3ZZTw3Sc4VDStHsyLy6_2ueOHbi2TIMD3bFnspkflg')});
   const r=await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint,matchId:MID,sport:SPORT})});
   if(r.ok){localStorage.setItem(subKey,'1');btn.textContent='\u{1F515}'}
  }catch(e){}
 });
}
setupBell();

let DETAIL=null,SQUADS=null,SCARD=null,TIMELINE=null,COMM=null,STATS=null,GRAPHS=null,CTAB=null,CINN=0,ENDED=true;
function dt(t){if(!t)return null;try{const s=String(t);return new Date(s.endsWith('Z')?s:s+'Z').toLocaleString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true})}catch(e){return String(t)}}
function tabs(list){return '<div class="htab">'+list.map(t=>'<button data-t="'+t+'" class="'+(CTAB===t?'on':'')+'">'+t+'</button>').join('')+'</div>'}
function irow(k,v){return v?'<div class="irow"><span class="k">'+k+'</span><span class="v">'+esc(v)+'</span></div>':''}
function isLive(d){if(SPORT==='cricket')return d.started&&!d.ended;return d.state==='live'||d.status==='IN_PLAY'||d.status==='PAUSED'}
function enrichStrip(d){
 try{
  if(SPORT!=='cricket'||!d.started||d.ended||!SCARD||!SCARD.innings||!SCARD.innings.length)return '';
  const inn=SCARD.innings[SCARD.innings.length-1];
  if(!inn||!inn.batsmen||!inn.batsmen.length)return '';
  const balls=o=>{const s=String(o).split('.');return (+s[0])*6+(s[1]?+s[1]:0)};
  const tot=+inn.runs||0,b=balls(inn.overs),items=[];
  if(b>0)items.push(['CRR',(tot*6/b).toFixed(2)]);
  const bat=inn.batsmen.filter(x=>x.out==='batting');
  if(bat.length){
   items.push(['Bat',bat.map(x=>esc(x.name)+' '+x.r+'*('+x.b+')').join(', ')]);
   if(inn.fow&&inn.fow.length){
    const f=inn.fow[inn.fow.length-1],pr=tot-(+f.runs||0),pb=b-balls(f.over);
    if(pr>0&&pb>=0)items.push(['P\u2019ship',pr+' ('+pb+'b)']);
   }
  }
  if(inn.bowlers&&inn.bowlers.length){
   const frac=inn.bowlers.filter(x=>{const s=String(x.o).split('.');return s[1]&&+s[1]>0});
   const cur=frac.length?frac[frac.length-1]:inn.bowlers[inn.bowlers.length-1];
   items.push(['Bowl',esc(cur.name)+' '+cur.o+'-'+cur.m+'-'+cur.r+'-'+cur.w]);
  }
  const g=GRAPHS&&GRAPHS[SCARD.innings.length===2?'innings2':'innings1'];
  if(g&&g.length){const n=Math.min(10,g.length);const last=g.slice(-n).reduce((s,o)=>s+(+o.runs||0),0);items.push(['Last '+n+' ov',String(last)+' runs'])}
  if(!items.length)return '';
  return '<div class="estrip">'+items.map(i=>'<span class="echip"><b>'+i[0]+'</b> '+i[1]+'</span>').join('')+'</div>';
 }catch(e){return ''}
}
function hero(d){
 const live=isLive(d);
 let txt=d.status||'',cls='';
 if(SPORT==='cricket'){cls=d.ended?'':(d.started?'live':'up');txt=d.ended?d.status:(d.started?(d.status||'Live now'):(d.status||'Match yet to begin'))}
 else if(SPORT==='football'){txt=d.status==='IN_PLAY'?'Live now':d.status==='PAUSED'?'Half-time':d.status==='FINISHED'?(d.winner&&d.winner!=='Draw'?d.winner+' won':'Full-time \xB7 Draw'):d.status;cls=live?'live':(d.status==='FINISHED'?'':'up')}
 else{cls=live?'live':(d.state==='finished'?'':'up');txt=d.state==='finished'?(d.status||'Final'):(live?(d.status||'Live'):(d.status||'Upcoming'))}
 let sb='';
 const h=d.homeCrest||(d.home&&d.home.logo),a=d.awayCrest||(d.away&&d.away.logo);
 const score=d.bigScore||d.fullTime||(d.scores&&d.scores[0]?d.scores[0].value:null);
 if((h||a)&&SPORT!=='cricket'){sb='<div class="scoreblock"><img src="'+esc(h||'')+'" onerror="this.remove()"><span class="bigscore">'+esc(score||'vs')+'</span><img src="'+esc(a||'')+'" onerror="this.remove()"></div>'}
 const bits=(d.title||'').split(', ');
 const main=bits.shift();
 return '<div class="hero '+SPORT+' fadeup"><button class="sharebtn" onclick="shareMatch()" title="Share">\u2197\uFE0E Share</button><div class="mtitle">'+esc(main)+'</div>'+(bits.length?'<div class="msub">'+esc(bits.join(', '))+'</div>':'')+sb+enrichStrip(d)+'<div class="status '+cls+'">'+esc(txt)+'</div></div>';
}
function batTable(inn){
 return '<table><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>'+
 inn.batsmen.map(b=>'<tr><td><div class="pn">'+(b.id?'<a href="/player/'+b.id+'">'+esc(b.name)+'</a>':esc(b.name))+(b.c?' <span class="cap">(c)</span>':'')+(b.k?' <span class="cap">\u2020</span>':'')+'</div><div class="out">'+esc(b.out)+'</div></td><td class="num" style="font-weight:800">'+b.r+'</td><td class="num">'+b.b+'</td><td class="num">'+b.f+'</td><td class="num">'+b.s+'</td><td class="num">'+esc(String(b.sr))+'</td></tr>').join('')+'</table>';
}
function bowlTable(inn){
 return '<div class="fowhead">Bowling</div><table><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr>'+
 inn.bowlers.map(b=>'<tr><td class="pn">'+(b.id?'<a href="/player/'+b.id+'">'+esc(b.name)+'</a>':esc(b.name))+'</td><td class="num">'+esc(String(b.o))+'</td><td class="num">'+b.m+'</td><td class="num">'+b.r+'</td><td class="num" style="font-weight:800">'+b.w+'</td><td class="num">'+esc(String(b.e))+'</td></tr>').join('')+'</table>';
}
function fowBlock(inn){
 let h='';
 if(inn.extras)h+='<div class="extrow"><span>Extras'+(inn.extras.b||inn.extras.lb||inn.extras.w||inn.extras.nb?' (b '+inn.extras.b+', lb '+inn.extras.lb+', w '+inn.extras.w+', nb '+inn.extras.nb+')':'')+'</span><b>'+inn.extras.total+'</b></div>';
 if(inn.fow&&inn.fow.length)h+='<div class="fowhead">Fall of wickets</div><div class="fowrow">'+inn.fow.map(f=>'<span class="fowchip"><b>'+esc(String(f.runs))+'</b> \xB7 '+esc(f.name)+' <span style="color:var(--dim)">('+esc(String(f.over))+' ov)</span></span>').join('')+'</div>';
 return h;
}
function cricScorecard(d){
 if(!SCARD||!SCARD.innings||!SCARD.innings.length){
  const note=SCARD?'<div class="note">Scorecard will appear once play begins.</div>':(d.ended?'<div class="note">Full scorecard for this match is not available from the score provider. Final innings totals are shown above.</div>':'<div class="note">Full scorecard for this match is not available yet. Innings totals above are live.</div>');
  const fallback=(d.innings&&d.innings.length)?'<div class="inncard" style="padding:14px 16px">'+d.innings.map(i=>'<div style="padding:7px 0;display:flex;justify-content:space-between"><span style="color:var(--dim);font-size:13px">'+esc(i.inning)+'</span><b class="innscore" style="font-size:18px">'+esc(String(i.r))+'/'+esc(String(i.w))+'<small>'+esc(String(i.o))+' ov</small></b></div>').join('')+'</div>':'';
  return '<div class="pane">'+fallback+note+'</div>';
 }
 if(CINN>=SCARD.innings.length)CINN=0;
 const inn=SCARD.innings[CINN];
 const chips='<div class="chips">'+SCARD.innings.map((i,x)=>'<button class="chip '+(CINN===x?'on':'')+'" data-inn="'+x+'">'+esc(i.team)+'</button>').join('')+'</div>';
 return '<div class="pane fadeup">'+chips+
 '<div class="inncard"><div class="innhead"><span class="innteam"><a href="/team/cricket/'+encodeURIComponent(inn.team)+'">'+esc(inn.team)+'</a></span><span class="innscore">'+inn.runs+'/'+inn.wkts+'<small>'+esc(String(inn.overs))+' ov</small></span></div>'+
 batTable(inn)+bowlTable(inn)+fowBlock(inn)+'</div></div>';
}
function commPane(){
 if(!COMM||!COMM.length)return '<div class="pane"><div class="note">Ball-by-ball commentary lands here once play begins (latest 10 updates, refreshed every 10 min during live games).</div></div>';
 return '<div class="pane fadeup"><div class="comm">'+COMM.map(c=>{
  const ev=(c.event||'').toLowerCase();
  const cls=ev.includes('wicket')?'cev-w':(ev.includes('six')?'cev-6':(ev.includes('four')?'cev-4':''));
  return '<div class="crow '+cls+'"><span class="cmin">'+esc(c.over||'')+'</span><span class="ctx">'+esc(c.text)+'</span></div>';
 }).join('')+'</div></div>';
}
function graphsPane(){
 if(!GRAPHS||(!GRAPHS.innings1.length&&!GRAPHS.innings2.length))return '<div class="pane"><div class="note">Over-by-over graphs build up automatically while a match is live (sampled every 20 min). Finished matches show a fall-of-wickets chart from the scorecard.</div>'+fowChart()+'</div>';
 const all=GRAPHS.innings1.concat(GRAPHS.innings2);
 const maxRuns=Math.max.apply(null,all.map(o=>o.runs).concat([6]));
 const maxScore=Math.max.apply(null,all.map(o=>o.score).concat([50]));
 const W=340,H=150,P=22;
 const bar=(o,i,n,off,col)=>{const bw=(W-P*2)/n-3;const h=Math.max(2,(o.runs/maxRuns)*(H-P*2));const x=P+i*((W-P*2)/n)+off;const y=H-P-h;return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+col+'"><title>Over '+o.over+': '+o.runs+' runs</title></rect>'};
 const n1=GRAPHS.innings1.length,n2=GRAPHS.innings2.length;
 let man='<div class="gtitle">Manhattan - runs per over</div><svg viewBox="0 0 '+W+' '+H+'" class="chart">';
 man+=GRAPHS.innings1.map((o,i)=>bar(o,i,n1,0,'#a3e635')).join('');
 man+=GRAPHS.innings2.map((o,i)=>bar(o,i,n2,0,'#38bdf8')).join('');
 man+='<line x1="'+P+'" y1="'+(H-P)+'" x2="'+(W-P)+'" y2="'+(H-P)+'" stroke="#1e2c3f" stroke-width="1"/></svg>';
 man+='<div class="glegend"><span><i style="background:#a3e635"></i>'+esc((DETAIL&&DETAIL.home&&DETAIL.home.short)||'1st inn')+'</span><span><i style="background:#38bdf8"></i>'+esc((DETAIL&&DETAIL.away&&DETAIL.away.short)||'2nd inn')+'</span></div>';
 const worm=(list,col)=>{if(!list.length)return'';const step=(W-P*2)/Math.max(list.length-1,1);return '<polyline fill="none" stroke="'+col+'" stroke-width="2.5" points="'+list.map((o,i)=>(P+i*step).toFixed(1)+','+(H-P-(o.score/maxScore)*(H-P*2)).toFixed(1)).join(' ')+'"/>'};
 let wm='<div class="gtitle">Worm - cumulative score</div><svg viewBox="0 0 '+W+' '+H+'" class="chart">'+worm(GRAPHS.innings1,'#a3e635')+worm(GRAPHS.innings2,'#38bdf8')+'<line x1="'+P+'" y1="'+(H-P)+'" x2="'+(W-P)+'" y2="'+(H-P)+'" stroke="#1e2c3f" stroke-width="1"/></svg>';
 return '<div class="pane fadeup">'+man+wm+fowChart()+'</div>';
}
function fowChart(){
 if(!SCARD||!SCARD.innings)return '';
 const inns=SCARD.innings.map(i=>({team:i.team,runs:i.runs,fow:(i.fow||[]).map(f=>({runs:f.runs,over:f.over}))})).filter(i=>i.fow&&i.fow.length);
 if(!inns.length)return '';
 const W=340,H=140,P=22;
 const maxR=Math.max.apply(null,inns.map(i=>i.runs).concat([50]));
 const maxO=Math.max.apply(null,inns.map(i=>Math.max.apply(null,i.fow.map(f=>+f.over||0))).concat([20]));
 const cols=['#a3e635','#38bdf8'];
 let c='<div class="gtitle">Fall of wickets</div><svg viewBox="0 0 '+W+' '+H+'" class="chart">';
 inns.forEach((inn,idx)=>{
  c+='<polyline fill="none" stroke="'+cols[idx%2]+'" stroke-width="2" stroke-dasharray="4 3" points="'+inn.fow.map(f=>(P+(+f.over/maxO)*(W-P*2)).toFixed(1)+','+(H-P-(f.runs/maxR)*(H-P*2)).toFixed(1)).join(' ')+'"/>';
  inn.fow.forEach(f=>{c+='<circle cx="'+(P+(+f.over/maxO)*(W-P*2)).toFixed(1)+'" cy="'+(H-P-(f.runs/maxR)*(H-P*2)).toFixed(1)+'" r="4" fill="'+cols[idx%2]+'"><title>'+esc(inn.team)+': '+f.runs+' at '+f.over+' ov</title></circle>'});
 });
 c+='<line x1="'+P+'" y1="'+(H-P)+'" x2="'+(W-P)+'" y2="'+(H-P)+'" stroke="#1e2c3f" stroke-width="1"/></svg>';
 return c;
}
function cricPanes(d){
 if(CTAB==='Scorecard')return cricScorecard(d);
 if(CTAB==='Commentary')return commPane();
 if(CTAB==='Graphs')return graphsPane();
 if(CTAB==='Squads'){
  if(!SQUADS||!SQUADS.length)return '<div class="pane"><div class="note">Squads not available for this match yet.</div></div>';
  return '<div class="pane fadeup">'+SQUADS.map(t=>'<div class="teamhead">'+esc(t.team)+'</div>'+t.players.map(p=>'<div class="prow"><span class="pname">'+esc(p.name)+'</span><span class="prole">'+esc([p.role,p.bat,p.bowl].filter(Boolean).join(' \xB7 '))+'</span></div>').join('')).join('')+'</div>';
 }
 return '<div class="pane fadeup">'+
  irow('Format',d.matchType)+irow('Date',d.date?dt(d.date):null)+'<div id="wx"></div>'+irow('Venue',d.venue)+irow('Toss',d.toss)+irow('Status',d.status)+irow('Winner',d.winner)+'</div>';
}
function evIcon(t){t=(t||'').toLowerCase();if(t.includes('goal')||t.includes('penalty')&&!t.includes('miss'))return'\u26BD';if(t.includes('yellow'))return'\u{1F7E8}';if(t.includes('red'))return'\u{1F7E5}';if(t.includes('sub'))return'\u{1F504}';if(t.includes('half')||t.includes('end')||t.includes('begin')||t.includes('start'))return'\u23F1\uFE0F';return'\u2022'}
function timelinePane(){
 if(!TIMELINE||!TIMELINE.length)return '<div class="pane"><div class="note">No match events yet - goals, cards and key moments land here live during the game.</div></div>';
 return '<div class="pane"><div class="tl">'+TIMELINE.map((e,i)=>'<div class="tlev '+(e.goal?'goal':((e.type||'').includes('Card')?'card-ev':''))+'" style="animation-delay:'+Math.min(i*30,300)+'ms"><span class="tlmin">'+esc(e.min||'')+'</span><span class="tltxt">'+evIcon(e.type)+' '+esc(e.text)+'</span>'+(e.team?'<div class="tlteam">'+esc(e.team)+'</div>':'')+'</div>').join('')+'</div>'+
 (COMM&&COMM.length?'<div class="fowhead" style="padding-left:2px">Latest commentary</div><div class="comm">'+COMM.map(c=>'<div class="crow"><span class="cmin">'+esc(c.min||'')+'</span>'+esc(c.text)+'</div>').join('')+'</div>':'')+'</div>';
}
function statsPane(){
 if(!STATS||!STATS.length)return '<div class="pane"><div class="note">Match stats (possession, shots, corners and more) appear here during and after the game.</div></div>';
 const num=v=>{const n=parseFloat(String(v).replace('%',''));return isNaN(n)?0:n};
 return '<div class="pane fadeup"><div class="stats">'+STATS.map(r=>{
  const hn=num(r.home),an=num(r.away),tot=(hn+an)||1;
  const hp=Math.round(hn/tot*100);
  return '<div class="srow"><div class="sval">'+esc(r.home)+'</div><div class="smid"><div class="slabel">'+esc(r.label)+'</div><div class="sbar"><i style="width:'+hp+'%"></i></div></div><div class="sval a">'+esc(r.away)+'</div></div>';
 }).join('')+'</div></div>';
}
function footPanes(d){
 if(CTAB==='Timeline')return timelinePane();
 if(CTAB==='Stats')return statsPane();
 if(CTAB==='Summary'){
  const fin=d.status==='FINISHED';
  return '<div class="pane fadeup">'+irow('Status',d.status)+irow('Half-time',d.halfTime)+(fin?irow('Full-time',d.fullTime)+irow('Result',d.winner):'')+
  '<div class="note">Goal scorers, cards and minute-by-minute events: see the <b>Timeline</b> tab.</div></div>';
 }
 return '<div class="pane fadeup">'+
  irow('Competition',d.competition)+irow('Stage',d.stage)+(d.matchday?irow('Matchday',d.matchday):'')+irow('Kick-off',d.date?dt(d.date):null)+'<div id="wx"></div>'+irow('Venue',d.venue)+irow('Status',d.status)+'</div>';
}
function espnPanes(d){
 if(CTAB==='Timeline')return timelinePane();
 if(CTAB==='Summary'){
  let h='<div class="pane fadeup">';
  if(d.scores&&d.scores.length)h+=d.scores.map(s=>'<div class="inncard" style="padding:13px 16px;margin-bottom:10px"><div class="innteam" style="font-size:12px;color:var(--dim)">'+esc(s.inning||'Score')+'</div><div class="innscore" style="font-size:19px">'+esc(s.value)+'</div></div>').join('');
  h+=irow('Status',d.status)+'</div>';
  return h;
 }
 let h='<div class="pane fadeup">'+'<div id="wx"></div>'+irow('Competition',d.competition)+irow('Date',d.date?dt(d.date):null)+irow('Venue',d.venue)+irow('Status',d.status);
 if(d.sessions)h+='<div class="fowhead" style="padding-left:2px">Sessions</div>'+d.sessions.map(s=>'<div class="irow"><span class="k">'+esc(s.name)+'</span><span class="v">'+esc(dt(s.start)||s.status||'')+'</span></div>').join('');
 return h+'</div>';
}

function wxDesc(c){if(c===0)return['Clear','\u2600\uFE0F'];if(c<=2)return['Partly cloudy','\u26C5'];if(c===3)return['Overcast','\u2601\uFE0F'];if(c===45||c===48)return['Fog','\u{1F32B}\uFE0F'];if(c>=51&&c<=57)return['Drizzle','\u{1F326}\uFE0F'];if(c>=61&&c<=67)return['Rain','\u{1F327}\uFE0F'];if(c>=71&&c<=77)return['Snow','\u{1F328}\uFE0F'];if(c>=80&&c<=82)return['Showers','\u{1F326}\uFE0F'];if(c>=95)return['Thunderstorm','\u26C8\uFE0F'];return['Cloudy','\u2601\uFE0F']}
async function loadWx(d){
 const el=document.getElementById('wx');if(!el||!d.venue){return}
 try{
  const r=await fetch('/api/weather?venue='+encodeURIComponent(d.venue)+(d.date?'&date='+encodeURIComponent(d.date):''));
  const w=await r.json();
  if(!r.ok||w.error){el.remove();return}
  const m=w.matchTime||w.current, dd=wxDesc(m.code);
  el.outerHTML='<div class="wxcard"><div class="wxmain"><span class="wxemoji">'+dd[1]+'</span><div><div class="wxtemp">'+m.temp+'\xB0C</div><div class="wxdesc">'+dd[0]+(w.place&&w.place.name?' \xB7 '+esc(w.place.name)+(w.place.country?', '+esc(w.place.country):''):'')+'</div></div></div><div class="wxstats">'+(w.current?'\u{1F4A7} '+w.current.humidity+'%':'')+' &nbsp; \u{1F4A8} '+m.wind+' km/h'+(m.pop!=null?' &nbsp; \u2614 '+m.pop+'% rain chance':'')+(w.matchTime?'<div class="wxnote">Forecast for match time</div>':'<div class="wxnote">Current conditions</div>')+'</div></div>';
 }catch(e){el.remove()}
}

const PKEY=SPORT+'_'+location.pathname.split('/').pop();
function pollTeams(d){
 let h,a;
 if(d.home&&d.away){h=d.home.short||d.home.name;a=d.away.short||d.away.name}
 else{const t=(d.title||'').split(',')[0].split(' vs ');if(t.length===2){h=t[0].trim();a=t[1].trim()}}
 if(!h||!a)return null;
 const opts=[{id:'h',label:h},{id:'a',label:a}];
 if(SPORT==='football')opts.push({id:'d',label:'Draw'});
 return opts;
}
async function loadPoll(d){
 const el=document.getElementById('poll');if(!el)return;
 const opts=pollTeams(d);if(!opts){el.remove();return}
 let votes={},total=0;
 try{const r=await fetch('/api/poll?match='+encodeURIComponent(PKEY));const j=await r.json();votes=j.votes||{};total=j.total||0}catch(e){}
 const voted=localStorage.getItem('szv_'+PKEY);
 renderPoll(el,opts,votes,total,voted);
}
function renderPoll(el,opts,votes,total,voted){
 el.innerHTML='<div class="pollcard"><div class="pollq">Who wins?</div>'+opts.map(o=>{
  const n=votes[o.id]||0,pct=total?Math.round(n/total*100):0;
  if(voted)return '<div class="pollres'+(voted===o.id?' mine':'')+'"><div class="pollbar" style="width:'+pct+'%"></div><span class="polllabel">'+esc(o.label)+(voted===o.id?' \u2713':'')+'</span><span class="pollpct">'+pct+'%</span></div>';
  return '<button class="pollopt" data-o="'+o.id+'">'+esc(o.label)+'</button>';
 }).join('')+'<div class="polltotal">'+total+' vote'+(total===1?'':'s')+(voted?'':' \xB7 tap to vote')+'</div></div>';
 if(!voted)el.querySelectorAll('.pollopt').forEach(b=>b.onclick=async()=>{
  el.querySelectorAll('.pollopt').forEach(x=>x.disabled=true);
  try{
   const r=await fetch('/api/poll/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match:PKEY,opt:b.dataset.o})});
   const j=await r.json();
   if(j.ok){localStorage.setItem('szv_'+PKEY,b.dataset.o);renderPoll(el,opts,j.votes||{},j.total||0,b.dataset.o);return}
  }catch(e){}
  el.querySelectorAll('.pollopt').forEach(x=>x.disabled=false);
 });
}

async function shareMatch(){
 const url=location.href,title=document.title;
 if(navigator.share){try{await navigator.share({title:title,url:url});return}catch(e){if(e&&e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(url);const b=document.querySelector('.sharebtn');if(b){b.textContent='Link copied';setTimeout(()=>{b.textContent='\u2197\uFE0E Share'},1600)}}catch(e){prompt('Copy link:',url)}
}
function render(){
 const d=DETAIL;if(!d)return;
 let tabList;
 if(SPORT==='cricket')tabList=['Scorecard','Commentary','Graphs','Info','Squads'];
 else if(SPORT==='football')tabList=['Summary','Timeline','Stats','Info'];
 else tabList=TIMELINE&&TIMELINE.length?['Summary','Timeline','Info']:['Summary','Info'];
 if(!CTAB)CTAB=tabList[0];
 $('#app').innerHTML=hero(d)+'<div id="poll"></div>'+tabs(tabList)+(SPORT==='cricket'?cricPanes(d):SPORT==='football'?footPanes(d):espnPanes(d));
 if(CTAB==='Info')loadWx(d);
 loadPoll(d);
 document.title=(d.title||'Match')+' \xB7 ScoreZaap';
}
var MATCH_LOADING=false;
async function load(first){
 if(MATCH_LOADING)return;MATCH_LOADING=true;
 try{
  if(first){try{const c=sessionStorage.getItem('md_'+SPORT+'_'+MID);if(c){const p=JSON.parse(c);if(Date.now()-p.at<120e3&&p.j&&!p.j.error){DETAIL=p.j.detail;SQUADS=p.j.squads||null;SCARD=p.j.scorecard||null;TIMELINE=p.j.timeline||null;COMM=p.j.commentary||null;STATS=p.j.stats||null;GRAPHS=p.j.graphs||null;ENDED=!isLive(DETAIL);render()}}}catch(e){}}
  const r=await fetch('/api/match?sport='+SPORT+'&id='+encodeURIComponent(MID));
  const j=await r.json();
  if(j.error){$('#app').innerHTML='<div class="err">'+esc(j.error)+'<br><a class="retry" href="/">\u2190 Back to scores</a></div>';return}
  if(window.szCelebrate)szCelebrate.detail(SPORT,MID,j);
  DETAIL=j.detail;SQUADS=j.squads||null;SCARD=j.scorecard||null;TIMELINE=j.timeline||null;COMM=j.commentary||null;STATS=j.stats||null;GRAPHS=j.graphs||null;
  ENDED=!isLive(DETAIL);
  $('#ref').innerHTML=ENDED?'':'<span class="rdot"></span><span class="rtxt">Auto-refreshing</span>';
  render();
 }catch(e){if(!DETAIL)$('#app').innerHTML='<div class="err">Taking too long to load. <a class="retry" href="">Retry</a></div>'}finally{MATCH_LOADING=false}
}
document.addEventListener('click',e=>{
 const tb=e.target.closest('.htab button');if(tb){CTAB=tb.dataset.t;render();return}
 const ch=e.target.closest('.chip');if(ch){CINN=+ch.dataset.inn;render();return}
});
load(true);
(function(){var act=Date.now();["pointerdown","touchstart","keydown","scroll","mousemove"].forEach(function(ev){window.addEventListener(ev,function(){act=Date.now()},{passive:true})});
function tick(){if(!ENDED&&!document.hidden)load(false);setTimeout(tick,Date.now()-act>6e5?20000:4000)}setTimeout(tick,4000);})();document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!ENDED)load(false)});
<\/script>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script><button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
async function cbzHtmlScore(numericId) {
  try {
    const r = await fetch("https://www.cricbuzz.com/live-cricket-scores/" + numericId, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept": "text/html" } });
    if (!r.ok) return null;
    const t = await r.text();
    const tm = /<title>([^<]*)<\/title>/.exec(t);
    if (!tm) return null;
    const title = tm[1].replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
    const seg = title.split("|")[0] || "";
    const scores = [];
    const re = /([A-Z][A-Z0-9]{1,9})\s+(\d+)\/(\d+)(?:\s*\(([\d.]+)\))?/g;
    let m2;
    while ((m2 = re.exec(seg)) && scores.length < 2) scores.push({ team: m2[1], runs: +m2[2], wkts: +m2[3], overs: m2[4] ? +m2[4] : null });
    const rm = /(won by [^|]+|Match drawn|match tied|Match abandoned[^|]*|No result)/i.exec(title);
    const result = rm ? rm[1].trim() : null;
    return { title, scores, finished: !!result, result };
  } catch (e) {
    return null;
  }
}
__name(cbzHtmlScore, "cbzHtmlScore");
__name2(cbzHtmlScore, "cbzHtmlScore");
__name22(cbzHtmlScore, "cbzHtmlScore");
__name222(cbzHtmlScore, "cbzHtmlScore");
__name2222(cbzHtmlScore, "cbzHtmlScore");
__name22222(cbzHtmlScore, "cbzHtmlScore");
__name222222(cbzHtmlScore, "cbzHtmlScore");
__name2222222(cbzHtmlScore, "cbzHtmlScore");
__name22222222(cbzHtmlScore, "cbzHtmlScore");
async function cbzMiniJson(numericId, kind) {
  try {
    const r = await fetch("https://m.cricbuzz.com/api/mcenter/" + kind + "/" + numericId, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept": "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}
__name(cbzMiniJson, "cbzMiniJson");
__name2(cbzMiniJson, "cbzMiniJson");
__name22(cbzMiniJson, "cbzMiniJson");
__name222(cbzMiniJson, "cbzMiniJson");
__name2222(cbzMiniJson, "cbzMiniJson");
__name22222(cbzMiniJson, "cbzMiniJson");
__name222222(cbzMiniJson, "cbzMiniJson");
__name2222222(cbzMiniJson, "cbzMiniJson");
__name22222222(cbzMiniJson, "cbzMiniJson");
function cbzMiniScorecard(d) {
  const sc = d && Array.isArray(d.scoreCard) ? d.scoreCard : null;
  if (!sc || !sc.length) return null;
  const numk = /* @__PURE__ */ __name222222((k) => +(String(k).split("_")[1] || 0), "numk");
  const innings = sc.slice().sort((a, b) => (a.inningsId || 0) - (b.inningsId || 0)).map((inn) => {
    const sd = inn.scoreDetails || {};
    const bd = (inn.batTeamDetails || {}).batsmenData || {};
    const wd = (inn.bowlTeamDetails || {}).bowlersData || {};
    const fowD = inn.wicketsData || {};
    const ex = inn.extrasData || null;
    const batsmen = Object.keys(bd).sort((a, b) => numk(a) - numk(b)).map((k) => bd[k]).map((b) => ({ id: b.batId, name: b.batShortName || b.batName, out: b.outDesc || "not out", r: b.runs, b: b.balls, f: b.fours, s: b.sixes, sr: b.strikeRate, c: !!b.isCaptain, k: !!b.isKeeper }));
    const bowlers = Object.keys(wd).sort((a, b) => numk(a) - numk(b)).map((k) => wd[k]).map((b) => ({ id: b.bowlerId, name: b.bowlShortName || b.bowlName, o: b.overs, m: b.maidens, r: b.runs, w: b.wickets, e: b.economy }));
    const fow = Object.keys(fowD).sort((a, b) => (fowD[a].wktNbr || 0) - (fowD[b].wktNbr || 0)).map((k) => fowD[k]).map((f) => ({ name: f.batName, runs: f.wktRuns, over: f.wktOver }));
    return { team: (inn.batTeamDetails || {}).batTeamName, runs: sd.runs, wkts: sd.wickets, overs: sd.overs, rr: sd.runRate, batsmen, bowlers, fow, extras: ex ? { total: ex.total, b: ex.byes, lb: ex.legByes, w: ex.wides, nb: ex.noBalls } : null };
  }).filter((i) => i.team && i.runs != null);
  if (!innings.length) return null;
  const mh = d.matchHeader || {};
  return { status: d.status || mh.status || null, complete: !!d.isMatchComplete || !!d.matchComplete || !!mh.complete || mh.state === "Complete", innings };
}
__name(cbzMiniScorecard, "cbzMiniScorecard");
__name2(cbzMiniScorecard, "cbzMiniScorecard");
__name22(cbzMiniScorecard, "cbzMiniScorecard");
__name222(cbzMiniScorecard, "cbzMiniScorecard");
__name2222(cbzMiniScorecard, "cbzMiniScorecard");
__name22222(cbzMiniScorecard, "cbzMiniScorecard");
__name222222(cbzMiniScorecard, "cbzMiniScorecard");
__name2222222(cbzMiniScorecard, "cbzMiniScorecard");
__name22222222(cbzMiniScorecard, "cbzMiniScorecard");
async function cbzMiniScorecardFetch(numericId) {
  const d = await cbzMiniJson(numericId, "scorecard");
  return cbzMiniScorecard(d);
}
__name(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name2(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name22(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name2222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name22222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name222222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name2222222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
__name22222222(cbzMiniScorecardFetch, "cbzMiniScorecardFetch");
async function cbzMiniCommentary(numericId, live) {
  const d = await cbzMiniJson(numericId, "comm");
  const mc = d && d.matchCommentary;
  if (!mc || typeof mc !== "object") return null;
  const mh = d.matchHeader || {};
  const complete = !!mh.complete || mh.state === "Complete" || !live;
  const list = Object.keys(mc).map((k) => mc[k]).filter((c) => c && c.commType === "commentary" && c.commText).map((c) => ({
    over: c.ballMetric != null ? String(c.ballMetric) : "",
    text: String(c.commText).replace(/<[^>]*>/g, "").replace(/B\d+\$/g, "").replace(/\s+,/g, ",").replace(/,\s*,+/g, ",").replace(/\s{2,}/g, " ").trim(),
    event: Array.isArray(c.event) ? c.event.filter((e) => e !== "all" && e !== "none").join(",") : String(c.event || ""),
    ts: +(c.timestamp || 0)
  })).filter((c) => c.text).sort((a, b) => b.ts - a.ts).slice(0, 80).map((c) => ({ over: c.over, text: c.text, event: c.event }));
  if (!list.length) return null;
  return { complete, list };
}
__name(cbzMiniCommentary, "cbzMiniCommentary");
__name2(cbzMiniCommentary, "cbzMiniCommentary");
__name22(cbzMiniCommentary, "cbzMiniCommentary");
__name222(cbzMiniCommentary, "cbzMiniCommentary");
__name2222(cbzMiniCommentary, "cbzMiniCommentary");
__name22222(cbzMiniCommentary, "cbzMiniCommentary");
__name222222(cbzMiniCommentary, "cbzMiniCommentary");
__name2222222(cbzMiniCommentary, "cbzMiniCommentary");
__name22222222(cbzMiniCommentary, "cbzMiniCommentary");
function betterScore(cur2, idx2, val2) {
  const pm = /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(val2 || "");
  if (!pm) return false;
  const cRuns = +pm[1], cOv = +pm[3];
  const ex = cur2 && cur2[idx2] && /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(cur2[idx2].value || "");
  if (!ex) return true;
  const eRuns = +ex[1], eOv = +ex[3];
  return cOv > eOv || cOv === eOv && cRuns > eRuns;
}
__name(betterScore, "betterScore");
__name2(betterScore, "betterScore");
__name22(betterScore, "betterScore");
__name222(betterScore, "betterScore");
__name2222(betterScore, "betterScore");
__name22222(betterScore, "betterScore");
__name222222(betterScore, "betterScore");
__name2222222(betterScore, "betterScore");
__name22222222(betterScore, "betterScore");
function applyMiniScore(lm, s) {
  if (!lm || !s) return false;
  let changed = false;
  if (Array.isArray(s.innings) && s.innings.length) {
    const cur = szCleanCricketScores(Array.isArray(lm.scores) ? lm.scores.slice() : [], lm.matchType);
    const shortFor = /* @__PURE__ */ __name2((nm) => {
      const n = String(nm || "").toLowerCase();
      if (lm.home && lm.home.short && String(lm.home.name || "").toLowerCase() === n) return lm.home.short;
      if (lm.away && lm.away.short && String(lm.away.name || "").toLowerCase() === n) return lm.away.short;
      return String(nm || "TM").slice(0, 8);
    }, "shortFor");
    const teamCount = {};
    s.innings.forEach((inn) => {
      const val = (inn.runs != null ? inn.runs : 0) + "/" + (inn.wkts != null ? inn.wkts : 0) + " (" + inn.overs + ")";
      const sh = shortFor(inn.team);
      teamCount[sh] = (teamCount[sh] || 0) + 1;
      const label = sh + " " + teamCount[sh];
      const idx = cur.findIndex((x) => x && x.inning === label);
      if (idx < 0) {
        cur.push({ inning: label, value: val });
        changed = true;
      } else if (betterScore(cur, idx, val)) {
        cur[idx] = { inning: label, value: val };
        changed = true;
      }
    });
    if (changed) lm.scores = cur;
  }
  if (s.complete) {
    if (lm.status !== "finished") {
      lm.status = "finished";
      changed = true;
    }
    if (s.status && lm.statusText !== s.status) {
      lm.statusText = s.status;
      changed = true;
    }
  } else if (s.status && lm.statusText !== s.status && !/^live now$/i.test(s.status)) {
    lm.statusText = s.status;
    changed = true;
  }
  return changed;
}
__name(applyMiniScore, "applyMiniScore");
__name2(applyMiniScore, "applyMiniScore");
__name22(applyMiniScore, "applyMiniScore");
__name222(applyMiniScore, "applyMiniScore");
__name2222(applyMiniScore, "applyMiniScore");
__name22222(applyMiniScore, "applyMiniScore");
__name222222(applyMiniScore, "applyMiniScore");
__name2222222(applyMiniScore, "applyMiniScore");
__name22222222(applyMiniScore, "applyMiniScore");
function applyHtmlScore(lm, s, matchType) {
  if (!s || !s.scores || !s.scores.length) return false;
  const defOvers = matchType === "T20" ? "20" : "50";
  const cur = szCleanCricketScores(Array.isArray(lm.scores) ? lm.scores.slice() : [], matchType);
  let changed = false;
  s.scores.forEach((sc, i) => {
    const innIdx = s.scores.length === 2 ? i === 0 ? 1 : 0 : 0;
    const ov = sc.overs != null ? String(sc.overs) : sc.wkts === 10 || i === 1 || s.finished ? defOvers : null;
    if (ov == null) return;
    let idx = cur.findIndex((c) => c && c.inning && c.inning.indexOf(sc.team) === 0);
    if (idx < 0) idx = innIdx;
    // A new row is labelled by the batting side's own innings count (matching
    // applyMiniScore and the list feed), never by the match slot: the slot is
    // the innings order in the match, so a chasing side in slot 2 would be
    // mislabelled "TEAM 2" and the same chase would display twice.
    const label = cur[idx] && cur[idx].inning ? cur[idx].inning : sc.team + " " + (cur.filter((c) => c && c.inning && c.inning.indexOf(sc.team) === 0).length + 1);
    const val = sc.runs + "/" + sc.wkts + " (" + ov + ")";
    if (betterScore(cur, idx, val)) {
      cur[idx] = { inning: label, value: val };
      changed = true;
    }
  });
  if (changed) lm.scores = cur;
  if (!s.finished && !s.result && lm.statusText && /opt to|toss/i.test(lm.statusText)) {
    lm.statusText = "Live now";
    changed = true;
  }
  if (s.finished && s.result) {
    if (lm.status !== "finished") {
      lm.status = "finished";
      changed = true;
    }
    if (lm.statusText !== s.result) {
      lm.statusText = s.result;
      changed = true;
    }
  } else if (s.result && lm.statusText !== s.result) {
    lm.statusText = s.result;
    changed = true;
  }
  return changed;
}
__name(applyHtmlScore, "applyHtmlScore");
__name2(applyHtmlScore, "applyHtmlScore");
__name22(applyHtmlScore, "applyHtmlScore");
__name222(applyHtmlScore, "applyHtmlScore");
__name2222(applyHtmlScore, "applyHtmlScore");
__name22222(applyHtmlScore, "applyHtmlScore");
__name222222(applyHtmlScore, "applyHtmlScore");
__name2222222(applyHtmlScore, "applyHtmlScore");
__name22222222(applyHtmlScore, "applyHtmlScore");
var TEAM_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Team \xB7 ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(16px + env(safe-area-inset-top)) 2px 12px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--txt);text-decoration:none}
.brand{font:700 19px Space Grotesk}.brand span{color:var(--lime)}
.hero{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:18px;display:flex;gap:16px;align-items:center;position:relative;overflow:hidden;animation:fadeup .45s ease both}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--lime),var(--blue))}
@keyframes fadeup{from{opacity:0;transform:translateY(10px)}}
.pimg{width:76px;height:76px;border-radius:22px;object-fit:cover;background:var(--card2);border:1px solid var(--line)}
.hero h2{font:700 20px Space Grotesk}
.hero .role{color:var(--lime);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.hero .meta{color:var(--dim);font-size:12px;margin-top:4px}
.ranks{display:flex;gap:8px;margin:14px 0}
.rank{flex:1;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;text-align:center}
.rank b{font:700 20px Space Grotesk;color:var(--lime);display:block}
.rank span{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
.rank small{display:block;font-size:10px;color:var(--dim);margin-top:3px}
.sect{font-size:11px;letter-spacing:1.4px;color:var(--dim);text-transform:uppercase;margin:16px 2px 8px;display:flex;align-items:center;gap:8px}
.sect::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--lime)}
.sect::after{content:'';flex:1;height:1px;background:var(--line)}
.kv{display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid rgba(30,44,63,.5);font-size:13px}
.kv b{color:var(--dim);font-weight:500}
.frow{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:7px;font-size:13px}
.frow b{min-width:70px;color:var(--lime)}
.frow .fmeta{margin-left:auto;color:var(--dim);font-size:11.5px;text-align:right}
.tchips{display:flex;flex-wrap:wrap;gap:7px}
.tchip{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 13px;font-size:12px;color:var(--dim)}
.note{font-size:11px;color:var(--dim);padding:8px 4px}
.skel{height:70px;border-radius:16px;background:linear-gradient(100deg,var(--card) 40%,var(--card2) 50%,var(--card) 60%);background-size:200% 100%;animation:sh 1.2s infinite}
@keyframes sh{to{background-position:-200% 0}}
@media (min-width:900px){.wrap{max-width:860px;padding:0 22px 70px}.hero h2{font-size:24px}}

.mrow{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px;color:inherit;text-decoration:none;animation:fadeup .4s}
.mrow:hover{border-color:var(--lime)}
.mt1{font:700 14px Space Grotesk}
.msc{font-size:13px;color:var(--lime);font-weight:700;margin-top:4px}
.mm2{font-size:11.5px;color:var(--dim);margin-top:3px}
.lv{display:inline-block;margin-left:8px;font-size:10px;font-weight:800;color:#fff;background:var(--red);border-radius:8px;padding:2px 7px;vertical-align:2px}
.dayh{font:700 13px Space Grotesk;color:var(--lime);margin:14px 2px 6px;letter-spacing:.4px}
.tabswitch{display:flex;gap:8px;margin:12px 2px}
.tabswitch a{flex:1;text-align:center;padding:9px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--dim);text-decoration:none;font-size:13px;font-weight:600}
.tabswitch a.on{background:var(--lime);color:#0b0f07;border-color:var(--lime)}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <header><a class="back" href="/">\u2190</a><div class="brand">Score<span>Zaap</span></div></header>
 <div id="app"><div class="skel"></div><div class="skel"></div></div>
</div>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script>
<script>

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const seg=location.pathname.split('/').filter(Boolean);
const TSP=seg[1]||'cricket',TN=decodeURIComponent(seg.slice(2).join('/')||'');
function dtm(s){try{const d=new Date(s);return d.toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return s||''}}
async function load(){
 const app=document.getElementById('app');
 try{
  const r=await fetch('/api/scores',{cache:'no-store'});const j=await r.json();
  const lists={cricket:j.cricket||[],football:j.football||[],nba:j.nba||[],mlb:j.mlb||[],nhl:j.nhl||[],tennis:j.tennis||[],f1:j.f1||[]};
  const arr=lists[TSP]||[];
  const q=TN.toLowerCase();
  const ms=arr.filter(m=>{const ns=[m.home&&m.home.name,m.home&&m.home.short,m.away&&m.away.name,m.away&&m.away.short].filter(Boolean).map(x=>String(x).toLowerCase());return ns.indexOf(q)>=0});
  document.title=TN+' - ScoreZaap';
  if(!ms.length){app.innerHTML='<div class="hero"><div><h2>'+esc(TN)+'</h2><div class="meta">No recent or upcoming matches found for this team on ScoreZaap right now.</div></div></div>';return}
  const live=ms.filter(m=>m.status==='live'),up=ms.filter(m=>m.status==='upcoming').sort((a,b)=>new Date(a.start||0)-new Date(b.start||0)),fin=ms.filter(m=>m.status==='finished').sort((a,b)=>new Date(b.start||0)-new Date(a.start||0));
  let h='<div class="hero"><div><h2>'+esc(TN)+'</h2><div class="role">'+esc(TSP)+'</div><div class="meta">'+live.length+' live \xB7 '+up.length+' upcoming \xB7 '+fin.length+' recent</div></div></div>';
  const row=m=>{const sc=(m.scores||[]).map(s=>esc(s.value)).join(' \xB7 ');const t=m.status==='upcoming'?dtm(m.start):(m.statusText||m.status||'');return '<a class="mrow" href="/match/'+TSP+'/'+encodeURIComponent(m.id)+'"><div class="mt1">'+esc(m.home&&(m.home.short||m.home.name)||'')+' vs '+esc(m.away&&(m.away.short||m.away.name)||'')+(m.status==='live'?'<span class="lv">LIVE</span>':'')+'</div>'+(sc?'<div class="msc">'+sc+'</div>':'')+'<div class="mm2">'+esc(t)+(m.venue?' \xB7 '+esc(m.venue):'')+'</div></a>'};
  const sect=(t,l)=>l.length?'<div class="sect">'+t+'</div>'+l.map(row).join(''):'';
  h+=sect('Live now',live)+sect('Upcoming',up)+sect('Recent results',fin.slice(0,20));
  app.innerHTML=h;
 }catch(e){app.insertAdjacentHTML('afterbegin','<p class="note">Live update unavailable; showing the saved snapshot.</p>')}
}
load();

<\/script>
<button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var SCHED_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><script>(function(){if(window.__szf)return;window.__szf=1;var _f=window.fetch;window.fetch=function(u,o){o=o||{};if(o.signal)return _f(u,o);var c=new AbortController();var t=setTimeout(function(){c.abort()},12000);o.signal=c.signal;return _f(u,o).finally(function(){clearTimeout(t)})}})();<\/script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2184299953562291" crossorigin="anonymous"><\/script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#070b12"><link rel="icon" type="image/png" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Schedule \xB7 ScoreZaap</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
html[data-theme="light"]{--bg:#f2f5f9;--card:#ffffff;--card2:#e9eef5;--line:#d4dde8;--txt:#182634;--dim:#5b6c7f;--lime:#4d7c0f;--blue:#0277bd;--amber:#b45309;--red:#dc2645;--green:#15803d}
html[data-theme="light"] .bgfx .base{background:linear-gradient(165deg,rgba(2,119,189,.05),rgba(77,124,15,.04))}
html[data-theme="light"] .bgfx .aur{background:radial-gradient(circle,rgba(2,119,189,.13),transparent 65%)}
html[data-theme="light"] .bgfx .aur.b{background:radial-gradient(circle,rgba(77,124,15,.12),transparent 65%)}
html[data-theme="light"] .bgfx .grid{background-image:linear-gradient(rgba(100,116,139,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.10) 1px,transparent 1px)}
html[data-theme="light"] .bgfx span:nth-of-type(1){opacity:.2}
html[data-theme="light"] .bgfx span:nth-of-type(2){opacity:.18}
html[data-theme="light"] .bgfx span:nth-of-type(3){opacity:.12}
html[data-theme="light"] .bgfx .pt{opacity:.6}
html{background:var(--bg)}
.bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wrap,.pane,#app{position:relative;z-index:1}
.bgfx span{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}
.bgfx span:nth-of-type(1){width:55vw;height:55vw;min-width:340px;min-height:340px;background:var(--lime);opacity:.14;top:-18%;left:-15%;animation:bgdrift1 26s ease-in-out infinite alternate}
.bgfx span:nth-of-type(2){width:48vw;height:48vw;min-width:300px;min-height:300px;background:var(--blue);opacity:.13;bottom:-16%;right:-12%;animation:bgdrift2 32s ease-in-out infinite alternate}
.bgfx span:nth-of-type(3){width:30vw;height:30vw;min-width:200px;min-height:200px;background:var(--lime);opacity:.08;top:38%;left:55%;animation:bgdrift1 40s ease-in-out infinite alternate-reverse}
@keyframes bgdrift1{to{transform:translate(7vw,5vh) scale(1.18)}}
.bgfx .base{position:absolute;inset:0;background:linear-gradient(165deg,rgba(56,189,248,.035),rgba(163,230,53,.028))}
.bgfx .aur{position:absolute;width:90vw;height:90vw;min-width:560px;min-height:560px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,rgba(56,189,248,.07),transparent 65%);top:-30%;right:-25%;animation:bgdrift2 45s ease-in-out infinite alternate;will-change:transform}
.bgfx .aur.b{width:80vw;height:80vw;min-width:480px;min-height:480px;background:radial-gradient(circle,rgba(163,230,53,.06),transparent 65%);top:auto;right:auto;bottom:-30%;left:-22%;animation:bgdrift1 55s ease-in-out infinite alternate-reverse}
@keyframes aurn{to{transform:rotate(1turn)}}
.bgfx .grid{position:absolute;inset:-60px;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:46px 46px;animation:gridpan 24s linear infinite;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%);mask-image:radial-gradient(70% 60% at 50% 40%,#000 30%,transparent 100%)}
@keyframes gridpan{to{transform:translate(46px,46px)}}
.bgfx .pt{position:absolute;width:5px;height:5px;border-radius:50%;background:var(--lime);opacity:.5;filter:blur(.5px);animation:floatpt 18s ease-in-out infinite alternate;will-change:transform}
.bgfx .p1{top:18%;left:12%}
.bgfx .p2{top:64%;left:8%;background:var(--blue);animation-duration:22s;animation-delay:-6s}
.bgfx .p3{top:30%;left:84%;animation-duration:19s;animation-delay:-3s}
.bgfx .p4{top:76%;left:70%;background:var(--blue);animation-duration:25s;animation-delay:-9s}
.bgfx .p5{top:48%;left:40%;background:var(--amber);width:4px;height:4px;animation-duration:21s;animation-delay:-12s}
.bgfx .p6{top:10%;left:55%;animation-duration:16s;animation-delay:-4s}
@keyframes floatpt{from{transform:translate(0,0)}to{transform:translate(3vw,-6vh)}}
@keyframes bgdrift2{to{transform:translate(-6vw,-5vh) scale(1.12)}}
@media (prefers-reduced-motion: reduce){.bgfx span,.bgfx .aur,.bgfx .grid,.bgfx .pt{animation:none}}
:root{--bg:#070b12;--card:#101724;--card2:#16202f;--line:#1e2c3f;--txt:#eaf1fa;--dim:#8496ad;--lime:#a3e635;--blue:#38bdf8}
*{margin:0;padding:0;box-sizing:border-box}
body{color:var(--txt);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.wrap{max-width:680px;margin:0 auto;padding:0 14px 40px}
header{padding:calc(16px + env(safe-area-inset-top)) 2px 12px;display:flex;align-items:center;gap:12px}
.back{width:40px;height:40px;border-radius:14px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--txt);text-decoration:none}
.brand{font:700 19px Space Grotesk}.brand span{color:var(--lime)}
.hero{background:linear-gradient(160deg,var(--card),var(--card2));border:1px solid var(--line);border-radius:20px;padding:18px;display:flex;gap:16px;align-items:center;position:relative;overflow:hidden;animation:fadeup .45s ease both}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--lime),var(--blue))}
@keyframes fadeup{from{opacity:0;transform:translateY(10px)}}
.pimg{width:76px;height:76px;border-radius:22px;object-fit:cover;background:var(--card2);border:1px solid var(--line)}
.hero h2{font:700 20px Space Grotesk}
.hero .role{color:var(--lime);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.hero .meta{color:var(--dim);font-size:12px;margin-top:4px}
.ranks{display:flex;gap:8px;margin:14px 0}
.rank{flex:1;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;text-align:center}
.rank b{font:700 20px Space Grotesk;color:var(--lime);display:block}
.rank span{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
.rank small{display:block;font-size:10px;color:var(--dim);margin-top:3px}
.sect{font-size:11px;letter-spacing:1.4px;color:var(--dim);text-transform:uppercase;margin:16px 2px 8px;display:flex;align-items:center;gap:8px}
.sect::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--lime)}
.sect::after{content:'';flex:1;height:1px;background:var(--line)}
.kv{display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid rgba(30,44,63,.5);font-size:13px}
.kv b{color:var(--dim);font-weight:500}
.frow{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin-bottom:7px;font-size:13px}
.frow b{min-width:70px;color:var(--lime)}
.frow .fmeta{margin-left:auto;color:var(--dim);font-size:11.5px;text-align:right}
.tchips{display:flex;flex-wrap:wrap;gap:7px}
.tchip{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 13px;font-size:12px;color:var(--dim)}
.note{font-size:11px;color:var(--dim);padding:8px 4px}
.skel{height:70px;border-radius:16px;background:linear-gradient(100deg,var(--card) 40%,var(--card2) 50%,var(--card) 60%);background-size:200% 100%;animation:sh 1.2s infinite}
@keyframes sh{to{background-position:-200% 0}}
@media (min-width:900px){.wrap{max-width:860px;padding:0 22px 70px}.hero h2{font-size:24px}}

.mrow{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px;color:inherit;text-decoration:none;animation:fadeup .4s}
.mrow:hover{border-color:var(--lime)}
.mt1{font:700 14px Space Grotesk}
.msc{font-size:13px;color:var(--lime);font-weight:700;margin-top:4px}
.mm2{font-size:11.5px;color:var(--dim);margin-top:3px}
.lv{display:inline-block;margin-left:8px;font-size:10px;font-weight:800;color:#fff;background:var(--red);border-radius:8px;padding:2px 7px;vertical-align:2px}
.dayh{font:700 13px Space Grotesk;color:var(--lime);margin:14px 2px 6px;letter-spacing:.4px}
.tabswitch{display:flex;gap:8px;margin:12px 2px}
.tabswitch a{flex:1;text-align:center;padding:9px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--dim);text-decoration:none;font-size:13px;font-weight:600}
.tabswitch a.on{background:var(--lime);color:#0b0f07;border-color:var(--lime)}
</style>
</head>
<body><div class="bgfx" aria-hidden="true"><i class="base"></i><i class="aur"></i><i class="aur b"></i><i class="grid"></i><span></span><span></span><span></span><u class="pt p1"></u><u class="pt p2"></u><u class="pt p3"></u><u class="pt p4"></u><u class="pt p5"></u><u class="pt p6"></u></div><script>document.documentElement.dataset.theme=localStorage.sztheme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");<\/script>
<div class="wrap">
 <header><a class="back" href="/">\u2190</a><div class="brand">Score<span>Zaap</span></div></header>
 <div id="app"><div class="skel"></div><div class="skel"></div></div>
</div>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script>
<script>

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MODE=location.pathname==='/archives'?'archives':'fixtures';
function dkey(s){const d=new Date(s);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dlabel(k){
 const d=new Date(k+'T12:00:00'),now=new Date();
 const off=Math.round((new Date(k+'T00:00:00')-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/864e5);
 if(off===0)return 'Today';if(off===1)return 'Tomorrow';if(off===-1)return 'Yesterday';
 return d.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'});
}
function tstr(s){try{return new Date(s).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){return''}}
async function load(){
 const app=document.getElementById('app');
 try{
  const r=await fetch('/api/scores',{cache:'no-store'});const j=await r.json();
  let rows=[];
  [['cricket','Cricket'],['football','Football']].forEach(sp=>{(j[sp[0]]||[]).forEach(m=>{rows.push(Object.assign({},m,{sport:sp[0],slab:sp[1]}))})});
  const live=rows.filter(m=>m.status==='live');
  let arr;
  if(MODE==='fixtures'){arr=rows.filter(m=>m.status==='upcoming').sort((a,b)=>new Date(a.start||0)-new Date(b.start||0))}
  else{arr=rows.filter(m=>m.status==='finished').sort((a,b)=>new Date(b.start||0)-new Date(a.start||0)).slice(0,60)}
  document.title=(MODE==='archives'?'Archives - Results':'Schedule - Fixtures')+' - ScoreZaap';
  let h='<div class="hero"><div><h2>'+(MODE==='archives'?'Archives':'Schedule')+'</h2><div class="meta">'+(MODE==='archives'?'Recent cricket and football results':'Upcoming fixtures and live matches')+'</div></div></div>';
  h+='<div class="tabswitch"><a href="/schedule" class="'+(MODE==='fixtures'?'on':'')+'">Fixtures</a><a href="/archives" class="'+(MODE==='archives'?'on':'')+'">Archives</a></div>';
  const row=m=>{const sc=(m.scores||[]).map(s=>esc(s.value)).join(' \xB7 ');const when=m.status==='upcoming'?tstr(m.start):(m.statusText||'');return '<a class="mrow" href="/match/'+m.sport+'/'+encodeURIComponent(m.id)+'"><div class="mt1">'+esc(m.home&&(m.home.short||m.home.name)||'')+' vs '+esc(m.away&&(m.away.short||m.away.name)||'')+' <span style="color:var(--dim);font-size:11px;font-weight:500">'+esc(m.slab)+(m.matchType?' \xB7 '+esc(m.matchType):'')+'</span>'+(m.status==='live'?'<span class="lv">LIVE</span>':'')+'</div>'+(sc?'<div class="msc">'+sc+'</div>':'')+'<div class="mm2">'+esc(when)+(m.venue?' \xB7 '+esc(m.venue):'')+'</div></a>'};
  if(MODE==='fixtures'&&live.length)h+='<div class="sect">Live now</div>'+live.map(row).join('');
  let lastK='';
  arr.forEach(m=>{const k=m.start?dkey(m.start):'tbd';if(k!==lastK){lastK=k;h+='<div class="dayh">'+(k==='tbd'?'Date TBC':esc(dlabel(k)))+'</div>'}h+=row(m)});
  if(!arr.length&&!(MODE==='fixtures'&&live.length))h+='<div class="note">Nothing to show here yet - check back around match time.</div>';
  app.innerHTML=h;
 }catch(e){app.insertAdjacentHTML('afterbegin','<p class="note">Live update unavailable; showing the saved snapshot.</p>')}
}
load();

<\/script>
<button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var SEC_HEADERS = {
  "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://cloudflareinsights.com https://pagead2.googlesyndication.com https://www.googletagservices.com https://googleads.g.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://fundingchoicesmessages.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), payment=(), usb=(), microphone=(self)"
};
async function ipHash(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(ipHash, "ipHash");
__name2(ipHash, "ipHash");
__name22(ipHash, "ipHash");
__name222(ipHash, "ipHash");
__name2222(ipHash, "ipHash");
__name22222(ipHash, "ipHash");
__name222222(ipHash, "ipHash");
function ssrEsc(x) {
  return String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
__name(ssrEsc, "ssrEsc");
__name2(ssrEsc, "ssrEsc");
function matchSSR(sport, j) {
  if (!j || j.error || !j.detail) return "";
  const d = j.detail;
  let h = '<div class="ssr">';
  h += "<h1>" + ssrEsc(d.title) + "</h1>";
  const meta = [];
  if (d.status) meta.push(d.status);
  if (d.matchType) meta.push(d.matchType);
  if (d.competition) meta.push(d.competition);
  if (d.venue) meta.push(d.venue);
  if (d.date) meta.push(d.date);
  if (meta.length) h += "<p>" + ssrEsc(meta.join(" - ")) + "</p>";
  if (d.fullTime) {
    const fin2 = /finish|final|ended|complete|won/i.test(String(d.status || "")) || d.ended === true;
    h += "<p>" + (fin2 ? "Full time: " : "Score: ") + ssrEsc(d.fullTime) + (d.halfTime ? " (half time: " + ssrEsc(d.halfTime) + ")" : "") + "</p>";
  }
  if (d.winner) h += "<p>" + ssrEsc(d.winner) + "</p>";
  if (d.toss) h += "<p>" + ssrEsc(d.toss) + "</p>";
  if (Array.isArray(d.innings) && d.innings.length) {
    h += "<ul>" + d.innings.map((i) => "<li>" + ssrEsc(i.inning) + ": " + ssrEsc(i.r) + "/" + ssrEsc(i.w) + " (" + ssrEsc(i.o) + " overs)</li>").join("") + "</ul>";
  }
  if (Array.isArray(d.scores) && d.scores.length) {
    h += "<ul>" + d.scores.map((s) => "<li>" + ssrEsc(s.inning || s.label || "") + " " + ssrEsc(s.value || "") + "</li>").join("") + "</ul>";
  }
  if (d.started === false && !d.ended) h += "<p>This match has not started yet. Check back for live scores, ball-by-ball commentary and the full scorecard.</p>";
  if (j.scorecard && Array.isArray(j.scorecard.innings)) {
    for (const inn of j.scorecard.innings) {
      h += "<h2>" + ssrEsc(inn.team) + " - " + ssrEsc(inn.runs) + "/" + ssrEsc(inn.wkts) + " (" + ssrEsc(inn.overs) + " overs)</h2>";
      if (Array.isArray(inn.batsmen) && inn.batsmen.length) {
        h += "<table><thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>" + inn.batsmen.map((b) => "<tr><td>" + ssrEsc(b.name) + "</td><td>" + ssrEsc(b.out) + "</td><td>" + ssrEsc(b.r) + "</td><td>" + ssrEsc(b.b) + "</td><td>" + ssrEsc(b.f) + "</td><td>" + ssrEsc(b.s) + "</td><td>" + ssrEsc(b.sr) + "</td></tr>").join("") + "</tbody></table>";
      }
      if (inn.extras && inn.extras.total != null) h += "<p>Extras: " + ssrEsc(inn.extras.total) + "</p>";
      if (Array.isArray(inn.bowlers) && inn.bowlers.length) {
        h += "<table><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>" + inn.bowlers.map((b) => "<tr><td>" + ssrEsc(b.name) + "</td><td>" + ssrEsc(b.o) + "</td><td>" + ssrEsc(b.m) + "</td><td>" + ssrEsc(b.r) + "</td><td>" + ssrEsc(b.w) + "</td><td>" + ssrEsc(b.e) + "</td></tr>").join("") + "</tbody></table>";
      }
    }
  }
  if (Array.isArray(j.squads) && j.squads.length) {
    for (const sq of j.squads) {
      if (sq && sq.team && Array.isArray(sq.players) && sq.players.length) {
        h += "<h2>" + ssrEsc(sq.team) + " squad</h2><p>" + ssrEsc(sq.players.map((p) => p.name).filter(Boolean).join(", ")) + "</p>";
      }
    }
  }
  if (Array.isArray(j.timeline) && j.timeline.length) {
    h += "<h2>Key events</h2><ul>" + j.timeline.map((t) => "<li>" + ssrEsc([t.min, t.type, t.text].filter(Boolean).join(" - ")) + "</li>").join("") + "</ul>";
  }
  if (Array.isArray(j.stats) && j.stats.length) {
    h += "<h2>Team stats</h2><table><tbody>" + j.stats.map((s) => "<tr><td>" + ssrEsc(s.label) + "</td><td>" + ssrEsc(s.home) + "</td><td>" + ssrEsc(s.away) + "</td></tr>").join("") + "</tbody></table>";
  }
  if (Array.isArray(j.commentary) && j.commentary.length) {
    h += "<h2>Commentary</h2><ul>" + j.commentary.slice(0, 30).map((c) => "<li>" + ssrEsc((c.over ? c.over + ": " : c.min ? c.min + " - " : "") + c.text) + "</li>").join("") + "</ul>";
  }
  h += "</div>";
  return h;
}
__name(matchSSR, "matchSSR");
__name2(matchSSR, "matchSSR");
function homeSSR(d) {
  const order = { live: 0, upcoming: 1, finished: 2 };
  const now = Date.now();
  const groups = [["Cricket", "cricket", d.cricket], ["Football", "football", d.football], ["NBA", "nba", d.espn && d.espn.nba], ["MLB", "mlb", d.espn && d.espn.mlb], ["NHL", "nhl", d.espn && d.espn.nhl], ["Tennis", "tennis", d.espn && d.espn.tennis], ["Formula 1", "f1", d.espn && d.espn.f1]];
  let h = "";
  for (const [label, sport, list0] of groups) {
    const list = (Array.isArray(list0) ? list0 : []).filter((m) => {
      if (m.status === "finished") {
        const t = new Date(m.end || m.start || 0).getTime();
        return !t || now - t < 48 * 36e5;
      }
      return true;
    }).sort((a, b) => (order[a.status] != null ? order[a.status] : 1) - (order[b.status] != null ? order[b.status] : 1) || String(a.start || "").localeCompare(String(b.start || ""))).slice(0, 10);
    if (!list.length) continue;
    h += "<h2>" + ssrEsc(label) + "</h2><ul>";
    for (const m of list) {
      const url2 = "/match/" + sport + "/" + encodeURIComponent(m.id);
      const sc = Array.isArray(m.scores) && m.scores.length ? " - " + m.scores.map((s) => ((s.inning ? s.inning + " " : "") + (s.value || "")).trim()).filter(Boolean).join(", ") : "";
      const bits = [m.statusText || m.status, m.matchType, m.venue].filter(Boolean).join(" - ");
      const title = m.title || (m.home && m.home.name || "") + " vs " + (m.away && m.away.name || "");
      h += '<li><a href="' + ssrEsc(url2) + '">' + ssrEsc(title) + "</a>" + ssrEsc(sc) + (bits ? ' <span class="dim">' + ssrEsc(bits) + "</span>" : "") + "</li>";
    }
    h += "</ul>";
  }
  return h;
}
__name(homeSSR, "homeSSR");
__name2(homeSSR, "homeSSR");
function newsSSR(items) {
  items = SZ_NEWS_POSTS.map((p) => ({ title: p.title, link: "/news/" + p.slug, source: "ScoreZaap" }));
  if (!Array.isArray(items) || !items.length) return "";
  return "<h2>Latest sports news</h2><ul>" + items.slice(0, 12).map((n2) => n2 && n2.link && n2.title ? '<li><a href="' + ssrEsc(n2.link) + '" rel="noopener">' + ssrEsc(n2.title) + "</a>" + (n2.source ? ' <span class="dim">' + ssrEsc(n2.source) + "</span>" : "") + "</li>" : "").join("") + "</ul>";
}
__name(newsSSR, "newsSSR");
__name2(newsSSR, "newsSSR");
var SZ_BLOG_POSTS = [{"slug":"how-to-read-a-cricket-scorecard","category":"Cricket","title":"How to read a cricket scorecard","description":"Understand runs, wickets, overs and individual figures through a worked cricket scorecard example.","body":"<section><h2>Read the headline in order</h2><p>In a hypothetical score of 156/4 after 18.2 overs, 156 is the team total, four wickets have fallen, and two valid balls have been bowled after 18 completed overs. The total includes batter runs and extras. It is not the personal score of one player.</p><p>Check the innings, match format and target before deciding who is ahead. The same total can describe very different situations. A chase with few balls left needs a different reading from an innings that still has plenty of time.</p></section><section><h2>Separate batting from bowling</h2><p>A batting row commonly lists runs, balls faced, fours, sixes and strike rate. Runs measure output; balls describe the recorded opportunity used. A star commonly indicates not out, but check the interface labels because providers arrange scorecards differently.</p><p>A bowling row commonly gives overs, maidens, runs conceded and wickets. A run out can reduce the team's wickets remaining without giving a bowler a wicket. Team runs need not equal the sum of bowling runs because some extras are allocated separately.</p></section><section><h2>Look for the innings story</h2><p>Scan the fall of wickets and partnerships. A collapse followed by a recovery can reach the same total as steady batting, but the remaining resources differ. Total, overs, wickets and the current pair make a better quick summary than the total alone.</p><p>On ScoreZaap, start with the match headline and then open the scorecard for detail. If a number changes, check the delivery outcome and innings label before assuming a problem. Live scoring can be corrected. Every number in this guide is a teaching example, not a report of a real fixture.</p></section><section><h2>Reading a chase: CRR and required rate</h2><p>In a one-day chase, two rates sit next to the score. Current run rate (CRR) is the batting side's scoring speed so far: runs divided by overs faced. Required run rate is the speed still needed: runs remaining divided by balls remaining, expressed per over. If the required rate stays above the current rate for long, the chase is slipping; if it drops below, the batting side is ahead of the asking rate.</p><p>A hypothetical 140/2 after 25 overs chasing 280 needs 140 more from 25 overs: required 5.6, current 5.6, an even game. On ScoreZaap, the live match page shows the current run rate beside the score during a chase.</p></section><section><h2>Reading a Test scorecard</h2><p>A Test scorecard lists up to four innings in order. Labels like \"trail by 152 runs\" compare a side's running total with the opponent's completed innings; \"lead by\" is the same comparison in the other direction. Day and session labels (Day 3: 1st Session) describe play, not the result. A side can bat twice in a row only through the follow-on, and an innings can end early through a declaration - both have their own guides.</p></section><section><h2>Common questions</h2><p>Why does 18.2 overs not mean 18.5? The number after the dot counts legal balls in the current over, not tenths. Why did a number change after I read it? Live scoring is corrected routinely; check the delivery outcome and innings label before assuming an error. Where do net run rate and rankings fit? They matter in league tables, not a single match, and live on ScoreZaap's rankings pages.</p></section>","sources":[["https://www.lords.org/mcc/the-laws/the-over","MCC: The over"],["https://www.lords.org/mcc/the-laws/scoring-runs","MCC: Scoring runs"]],"modified":"2026-11-07"}, { "slug": "cricket-overs-and-balls-explained", "category": "Cricket", "title": "Why 19.5 overs is not a decimal", "description": "Convert overs into valid balls and avoid common mistakes when reading a cricket chase.", "body": "<section><h2>The dot counts balls</h2><p>Cricket overs are written as completed overs plus valid balls in the next over. After 19.4 comes 19.5, then 20.0 after the next valid ball. In a hypothetical 20-over innings, 19.5 leaves one valid ball, not half an over.</p><p>Multiply completed overs by six and add the last digit. At 12.3, that is 12 times six plus three: 75 valid balls. For arithmetic expressed in decimal overs, divide 75 by six. That gives 12.5, not 12.3.</p></section><section><h2>Work in balls during a chase</h2><p>Suppose an innings is at 17.4 of a 20-over allocation. It has used 106 valid balls out of 120, leaving 14. Thinking in balls is more precise than casually describing that as about two overs.</p><p>Use the current allocation, not just the match's original format. After a weather interruption, the target and available overs may be revised. A calculation based on the original allocation can give a convincing but incorrect answer.</p></section><section><h2>Why a number can stand still</h2><p>Wides and no-balls do not count as one of an over's six valid balls. Runs can therefore increase without the overs display advancing. Other situations described in the Laws can also affect whether a delivery counts.</p><p>Read the event label beside the number. Two events under the same over-and-ball notation are not necessarily duplicates: one may be an extra before the next valid delivery. On ScoreZaap, read overs together with innings status and the target. A stationary count can mean an interruption rather than a finished innings.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/the-over", "MCC: The over"]] }, { "slug": "cricket-extras-wides-no-balls-byes", "category": "Cricket", "title": "Wides, no-balls, byes and leg byes", "description": "Explain cricket extras and why team totals can differ from individual batting and bowling figures.", "body": "<section><h2>Extras belong in the team total</h2><p>Extras are part of the batting side's score, not a correction to remove later. If a hypothetical side has 140 runs from batters and 12 extras, the team total is 152. Adding only the batting rows leaves an apparent gap until you include extras.</p><p>The scorer records the category after the umpire's decision. Do not classify a delivery from a headline number alone. An event can produce more than one kind of scoring information, and a later correction can change the breakdown.</p></section><section><h2>Wides and no-balls</h2><p>A wide is an umpire's call under the Laws, not simply any ball a viewer thinks was hard to reach. A wide carries a one-run penalty and additional runs may be scored. A no-ball also carries a one-run penalty, with the rest of the outcome depending on the delivery.</p><p>Neither counts as one of the six valid balls in an over. If the score rises but the ball count stays fixed, check the delivery label before assuming the feed is frozen.</p></section><section><h2>Byes and leg byes</h2><p>Byes cover qualifying runs when the ball has not touched the bat or batter. Leg byes concern qualifying runs after contact with the batter rather than the bat. Leg byes have conditions in the Laws, including attempting to play the ball or avoid being hit. Pad contact alone is not enough.</p><p>Byes and leg byes are not charged to a bowler in the same way as runs off the bat and wide or no-ball penalties. Team and bowling totals therefore use different allocation rules. Read ScoreZaap's extras row alongside the individual figures rather than expecting every column sum to match.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/no-ball", "MCC: No ball"], ["https://www.lords.org/mcc/the-laws/wide-ball", "MCC: Wide ball"], ["https://www.lords.org/mcc/the-laws/bye-and-leg-bye", "MCC: Bye and leg bye"]] }, {"slug":"current-and-required-run-rate","category":"Cricket","title":"Current vs required run rate","description":"Calculate scoring pace correctly and understand what a required rate cannot tell you about a chase.","body":"<section><h2>Two rates, two questions</h2><p>Current rate describes scoring so far. Required rate describes the average pace needed over the remaining allocation to reach the stated target. Neither is a prediction that the team will win.</p><p>Convert the overs display into balls before calculating. At 10.3, there have been 63 valid balls, equivalent to 10.5 decimal overs. A hypothetical 84 runs at that point gives a current rate of eight per over, not 84 divided by 10.3.</p></section><section><h2>Calculate what remains</h2><p>For a basic chase, divide runs still needed by remaining balls expressed as overs. A hypothetical side needing 30 from 24 valid balls has four overs left, giving a required rate of 7.5 per over.</p><p>Use the official target shown after an interruption. Do not invent a rain-adjusted target by scaling the first innings yourself. A revised allocation changes the available balls and can change the required rate.</p></section><section><h2>Add wickets and context</h2><p>Two teams can face the same required rate with different chances because their wickets, current batters and bowling opposition differ. The rate cannot capture every part of that situation. Near the end, one boundary can move it sharply because few balls remain.</p><p>A fuller hypothetical summary is 30 needed from 24 with six wickets lost. That describes time and resources instead of quoting only 7.5. On ScoreZaap, combine the rate with target, innings status and scorecard. Keep it separate from a betting probability, and do not treat scoring pace as a guaranteed result.</p></section><section><h2>Rain can change the target itself</h2><p>When overs are lost, officials can set a revised target for the side batting second, using the Duckworth-Lewis-Stern (DLS) method that the ICC formally adopted. From that point the required rate is calculated against the revised target, not the original target set from the first innings. A shortened game, such as a 47-overs match, also starts with a smaller allocation, so the same runs remaining mean a higher required rate than in a 50-over game.</p><p>Do not estimate a rain-adjusted target by scaling the first innings yourself. The official scoreboard carries the revised target once it applies.</p></section><section><h2>Common questions</h2><p>Does a low required rate mean the batting side will win? No - it describes the pace needed, not the chance of getting it; wickets in hand matter. Why did the required rate jump after a quiet over? Because balls remaining shrink while runs needed stay the same. Is net run rate the same thing? No - that compares scoring rates across a tournament and lives in points tables.</p></section>","sources":[["https://www.lords.org/mcc/the-laws/the-over","MCC: The over"],["https://www.lords.org/mcc/the-laws/scoring-runs","MCC: Scoring runs"],["https://www.icc-cricket.com/about/cricket/rules-and-regulations/duckworth-lewis-stern","ICC: Duckworth-Lewis-Stern method"]],"modified":"2026-11-07"}, { "slug": "batting-strike-rate-and-bowling-economy", "category": "Cricket", "title": "Strike rate and economy: read both in context", "description": "Understand two common cricket statistics without confusing a short sample with a lasting performance.", "body": "<section><h2>Batting strike rate</h2><p>The usual formula is runs divided by balls faced, multiplied by 100. A hypothetical 36 from 24 balls gives 150. That describes an equivalent pace per 100 balls, not an innings that actually lasted 100 balls.</p><p>A short cameo can produce a striking figure. Eight runs from two balls gives 400, but it contains much less evidence than an extended innings. Always read runs and balls alongside the rate.</p></section><section><h2>Bowling economy</h2><p>Economy divides runs charged to the bowler by correctly expressed overs. Conceding a hypothetical 21 from 3.3 overs means 21 valid balls, or 3.5 decimal overs. The economy is six. Dividing by 3.3 mistakes the ball display for a decimal.</p><p>Use the bowler's conceded-runs column rather than all team runs during the spell. Extras have allocation rules, so those totals are not interchangeable.</p></section><section><h2>Compare like with like</h2><p>A batter trying to finish a short chase has a different task from one rebuilding after wickets. A bowler delivering late in a limited-overs innings can face different pressure from one operating earlier. A single rate cannot show the role or conditions.</p><p>Read wickets as well as economy. A low rate without dismissals and a higher rate with important wickets describe different contributions. On ScoreZaap, compare the player row with the whole innings and check format and sample size. These worked numbers are illustrative, not current statistics for a named player.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/the-over", "MCC: The over"], ["https://www.lords.org/mcc/the-laws/bye-and-leg-bye", "MCC: Bye and leg bye"]] }, {"slug":"football-stoppage-time-explained","category":"Football","title":"Why stoppage time can run beyond the board","description":"Understand minimum added time and why 90+5 does not guarantee a whistle at 95:00.","body":"<section><h2>The board is a minimum</h2><p>IFAB Law7 requires allowance for time lost in each half. Causes include substitutions, injury assessment or removal, time wasting, disciplinary sanctions, permitted medical breaks, VAR delays, goal celebrations and significant delays to restarts.</p><p>The fourth official shows the minimum additional time decided by the referee. It may be increased but not reduced. A further interruption during that period can therefore extend play beyond the number shown.</p></section><section><h2>Read the minute carefully</h2><p>A hypothetical 90+5 display places play beyond the 90-minute mark. Providers present added minutes differently. That display does not itself prove what the board originally showed or promise that the match is about to finish.</p><p>If play reaches 90+7 after a board showed five, check events during added time rather than immediately assuming an error. The referee remains responsible for ending the half. If a penalty must be taken or retaken, the half is extended until the kick is completed.</p></section><section><h2>Added time is not extra time</h2><p>Stoppage time is part of the relevant half. Extra time is another phase used when the competition requires it. A level score after normal time does not automatically send every match into extra time.</p><p>On ScoreZaap, combine the minute with score, status and latest event. A motionless clock can reflect a pause or delayed update; it does not prove full time. Wait for a confirmed final status before sharing the result. The examples here explain the rule and are not claims about a particular referee's decision.</p></section><section><h2>Reading the clock on a live page</h2><p>A live scoreboard shows added time as a plus number, such as 45+2 in the first half or 90+4 at the end. IFAB Law 7 says the fourth official shows the minimum additional time the referee decided; the referee may increase it but never reduce it. A clock that reads 90+6 is not an error; play continues until the referee ends it.</p></section><section><h2>Common questions</h2><p>Does the board show the exact added time? No - it shows the minimum, and stoppages during added time can extend it further. Can the half end while a team is attacking? The referee ends the half when the added time is used; only an awarded penalty kick is completed first, under the same Law.</p></section>","sources":[["https://www.theifab.com/laws/latest/the-duration-of-the-match/","IFAB: Duration of the match"]],"modified":"2026-11-07"}, { "slug": "offside-position-vs-offside-offence", "category": "Football", "title": "Offside position is not always an offence", "description": "Understand the timing of offside, active involvement and direct-restart exceptions.", "body": "<section><h2>Position is only the starting point</h2><p>Under IFAB Law11, the relevant parts of the head, body or feet must be in the opponents' half and nearer the goal line than both the ball and the second-last opponent for an offside position. Hands and arms do not determine that position. Being level with the second-last opponent is not offside.</p><p>Use the second-last opponent as the reference, not automatically the last outfield defender. The goalkeeper does not have to be the opponent closest to the goal line.</p></section><section><h2>The timing of the pass matters</h2><p>Position is judged at the relevant play or touch by a team-mate, not simply when the receiver reaches the ball. The first point of contact is used for that assessment under the Law. A later screenshot can therefore tell a different story from the moment of the pass.</p><p>A player can run beyond defenders after an onside starting position. Receiving nearer the goal does not by itself make that run offside. Conversely, someone may look clear when receiving but have been beyond the line at the earlier touch.</p></section><section><h2>Involvement and exceptions</h2><p>The Law describes interfering with play, interfering with an opponent and gaining an advantage in specified situations. Touching the ball is not the only possible involvement: obstructing an opponent's line of vision or challenging them can matter. Standing beyond the line alone does not settle the decision.</p><p>There is no offside offence for receiving directly from a goal kick, throw-in or corner kick. A later team-mate's touch can create a new assessment point. ScoreZaap can show the event and revised result, but a scoreboard cannot supply every camera angle needed to judge a review. Wait for the official outcome.</p></section>", "sources": [["https://www.theifab.com/laws/latest/offside/", "IFAB: Offside"]] }, { "slug": "football-match-status-guide", "category": "Football", "title": "Live, halftime and full time: read the status", "description": "Use a football score, clock and status together instead of mistaking a pause for a result.", "body": "<section><h2>One score can describe several states</h2><p>A 1-1 score can belong to a live game, an interval, the end of normal play or a confirmed draw. The number is only part of the information. Start with the fixture and match status before deciding what it means.</p><p>A clock near 45 minutes does not prove halftime, and a clock beyond 90 does not prove full time. Added time is a minimum and the referee decides when the half ends.</p></section><section><h2>A pause is not a final result</h2><p>At halftime, a leading side has not won the match. A delay or temporary suspension is not necessarily an abandonment. Competition rules decide what happens after an abandoned match; the score does not universally become the result.</p><p>Feeds can update score and status separately. If one field seems ahead, read the latest events rather than assuming a stationary score is final. An upstream review or delay cannot be resolved by refreshing the browser faster.</p></section><section><h2>Normal time and knockout phases</h2><p>A level score after normal time may be final or may lead to another phase, depending on the competition. If there is a shootout, keep the match score separate from the shootout tally. Read the labels before repeating a number.</p><p>A reliable quick check is fixture, status, score, then the latest event or timestamp if available. Use ScoreZaap's live view for a match in progress and Archives for past results. Wait for a confirmed final label before sharing a winner. Providers can use different abbreviations, so do not assume one label system applies everywhere.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-duration-of-the-match/", "IFAB: Match duration"]] }, { "slug": "tennis-scoring-points-games-sets", "category": "Tennis", "title": "Tennis scoring: points, games and sets", "description": "Decode love, 15, 30, 40, deuce and set columns without mixing the different levels of a tennis score.", "body": "<section><h2>Points make a game</h2><p>In a standard game, zero is love and the next points are 15, 30 and 40. A fourth point normally wins the game, except when both sides have won three points. At 40-40 the score is deuce.</p><p>In standard advantage scoring, one point after deuce gives advantage. Winning the next point wins the game; losing it returns to deuce. Alternative methods such as no-ad scoring exist, so confirm the event format.</p></section><section><h2>Games make a set</h2><p>The standard set formats in the ITF rules require six games with a two-game margin. A set can end 6-4 or 7-5. In a tie-break set, 6-6 leads to a tie-break. In an advantage set, games continue until the required margin.</p><p>A display such as 6-3 2-4 can show a completed first set and the games in the next. It is not a combined nine-to-seven score. Match the columns to the player names and read the completed sets before focusing on the current game.</p></section><section><h2>Sets make the match</h2><p>The match format determines how many sets are needed to win. A player leading the current set can still trail overall. The final column alone cannot tell you the whole situation.</p><p>A serve marker commonly identifies who is serving, but read the interface labels because presentation differs. Use ScoreZaap's current status and completed sets together. This guide describes standard scoring and noted alternatives, not a claim that every tournament uses the same set or tie-break format.</p></section>", "sources": [["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: 2026 Rules of Tennis"]] }, { "slug": "tennis-tiebreaks-seven-and-ten-points", "category": "Tennis", "title": "Seven-point and ten-point tie-breaks", "description": "Understand the two-point margin, service rhythm and difference between a set tie-break and a match tie-break.", "body": "<section><h2>Seven is a threshold, not a cap</h2><p>In the standard tie-break described by the ITF, points are counted zero, one, two and onward. A side must reach seven with a two-point lead to win the game and set. A 7-6 score is not enough.</p><p>If the margin remains one, play continues. The tie-break can finish 8-6, 10-8 or later. The winning threshold and margin are separate conditions.</p></section><section><h2>Serving follows a different rhythm</h2><p>The side whose turn it is to serve takes the opening point. The other side serves the next two. After that, service alternates in blocks of two points, with the doubles rotation maintained where applicable.</p><p>This explains why the serve marker moves after the first point and then after pairs. Keep the current server separate from the side leading the score. A service change does not necessarily signal an error.</p></section><section><h2>Ten points can mean different phases</h2><p>The ITF permits alternative formats involving ten-point tie-breaks. A match tie-break can replace a deciding set. A final-set ten-point tie-break at six games all comes after a deciding set has reached 6-6. Those are different places in the match.</p><p>Both use the specified two-point margin, but a match tie-break is not a set containing ten ordinary games. A 6-5 tie-break score can have very different stakes depending on whether seven or ten is the threshold. Read ScoreZaap's phase and completed set scores, then check the event conditions if the format is unclear.</p></section>", "sources": [["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: 2026 Rules of Tennis"]] }, { "slug": "tennis-break-set-and-match-point", "category": "Tennis", "title": "Break point, set point and match point", "description": "Distinguish a chance to win a return game from an opportunity to finish the set or the match.", "body": "<section><h2>An opportunity is not an outcome</h2><p>These phrases tell you what the next point could achieve, not what has already happened. A player can have several chances and convert none. A scoreboard is easier to read when opportunity and result stay separate.</p><p>In a standard game, break point is a point on which the receiver could win the game. A hypothetical receiver leading 40-30 could take the server's game next. If the server wins that point, the score returns to deuce.</p></section><section><h2>Set and match points add more layers</h2><p>A set point is an opportunity to win the set next. It can happen on serve or return. In a hypothetical standard set, a server leading 5-4 and 40-30 could finish the set by winning the next point. A game point at 2-2 does not have that consequence.</p><p>A match point can finish the entire match. Completed sets and match format decide whether a set-ending point is also match-ending. A current point score alone cannot answer that.</p></section><section><h2>One point can have several labels</h2><p>A receiver could face a point that wins the return game, the set and the match together. That point can be both break point and match point. The phrases describe different levels of the same opportunity.</p><p>Three break-point chances do not mean three breaks of serve. Conversion is a separate outcome. Saving match points is not a victory until the remaining match has been won. On ScoreZaap, check completed games, sets and final status. These examples assume standard advantage scoring; alternative formats can change the path.</p></section>", "sources": [["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: 2026 Rules of Tennis"]] }, { "slug": "follow-live-scores-with-context", "category": "Sports guides", "title": "Follow live scores without losing the context", "description": "A practical routine for checking fixtures, delays, corrections, time zones and confirmed results.", "body": "<section><h2>Start with the right fixture</h2><p>Read teams or players, competition and scheduled date. Similar names, reserve sides and repeated fixtures can make a familiar-looking score easy to misidentify. When you share a result, include enough detail for someone else to find the same game.</p><p>Check the displayed time zone before planning around a start time. A date near midnight can differ across zones. A postponed match can retain its original listing while its status changes, so a schedule is not a guarantee.</p></section><section><h2>Read the surrounding labels</h2><p>Cricket needs runs, wickets, overs and target together. Football needs score and phase. Tennis separates games from sets. A number copied without its labels can be accurate but misleading.</p><p>A score staying still does not prove the match ended. Rain, reviews, intervals and upstream delays can all explain it. Wait for a confirmed final status rather than guessing from elapsed time.</p></section><section><h2>Handle corrections honestly</h2><p>A scoring event can be revised or an official decision can change an early display. Refreshing only retrieves the provider's current information. It cannot remove a delay at the source. When two feeds disagree, do not average them into a new invented score.</p><p>Use the right view for the question: live match for now, Schedule for next, Archives for past results, and Blog for explanations. ScoreZaap links those views. These guides are explanatory reading, not live commentary, a betting service or a promise of instant updates. Worked examples must not be repeated as real match reports.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/the-over", "MCC: Cricket overs"], ["https://www.theifab.com/laws/latest/the-duration-of-the-match/", "IFAB: Match duration"], ["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: Tennis scoring"]] }, { "slug": "nba-score-clock-and-overtime", "category": "Basketball", "title": "NBA scores: points, periods and overtime", "description": "Read an NBA score together with the period, game clock and overtime status.", "body": "<section><h2>The score is a running total</h2><p>NBA field goals count two points from on or inside the three-point line and three from outside it under the rule's conditions. A successful free throw counts one. The team score is the running total, not the number of baskets made.</p><p>A hypothetical 24-18 first-period score says nothing about the final winner. To understand the situation, read the period and time remaining alongside the points. A lead early in the game is a different snapshot from the same lead near the finish.</p></section><section><h2>The clock is not wall-clock duration</h2><p>NBA regulation periods last twelve minutes. Overtime periods last five. Those lengths describe playing time on the game clock, not how long a viewer will spend watching. Stoppages and intervals extend the real elapsed time.</p><p>When a scoreboard says 2:15, first check the period. Two minutes remaining in the first period and two minutes remaining in the fourth carry different stakes. A stopped clock may reflect a dead-ball situation, not a stuck feed.</p></section><section><h2>Overtime is another phase</h2><p>A tied NBA game goes into overtime under the rules. Do not call a level score after regulation a final draw. Read the overtime label and wait for the final result status before sharing the winner.</p><p>ScoreZaap's basketball view combines score and match state. If a feed revises a basket or the timing display, check the latest event before repeating an older snapshot. These explanations apply to NBA rules; do not assume every basketball competition has the same period lengths or scoring format.</p></section>", "sources": [["https://official.nba.com/rule-no-5-scoring-and-timing/", "NBA: Scoring and timing"]] }, { "slug": "nba-shot-clock-vs-game-clock", "category": "Basketball", "title": "NBA shot clock vs game clock", "description": "Understand why basketball has two clocks and why a reset does not mean time was added to the game.", "body": "<section><h2>Two clocks answer different questions</h2><p>The game clock tracks time remaining in the period. The shot clock limits the time allowed for a possession to produce a qualifying attempt under the NBA rules. A change on one clock does not automatically change the other.</p><p>A hypothetical display of 4:20 on the game clock and eight on the shot clock means there is more period time than possession time. The offence cannot simply hold the ball for the full four minutes.</p></section><section><h2>A shot is more than a throw toward the basket</h2><p>Under NBA Rule7, an attempt must meet the rule's requirements, including leaving the player's hand before the shot-clock period expires and then touching the rim or entering the basket. A release before the buzzer is not by itself the whole test.</p><p>Shot-clock resets depend on the event and the applicable rule. Do not assume every whistle restores a full new possession period. Likewise, an offensive rebound and a change of possession need not produce identical clock behaviour.</p></section><section><h2>Read the reset in context</h2><p>If the shot clock jumps while the game clock stays nearly unchanged, look for the preceding event. The reset governs the possession, not extra time added to the period. A short remaining shot-clock number can explain why a team rushes an otherwise ordinary-looking attack.</p><p>On ScoreZaap, use the event sequence and match phase with the score. If the data feed does not expose a shot clock, do not infer an exact value from the game clock. This is an NBA explainer, not a promise that every basketball league uses identical reset rules or that a live feed includes every timing field.</p></section>", "sources": [["https://official.nba.com/rule-no-7-24-second-clock/", "NBA: Shot clock"]] }, { "slug": "baseball-runs-hits-and-errors", "category": "Baseball", "title": "Baseball box scores: runs, hits and errors", "description": "Understand R, H and E and why hits do not directly equal runs on a baseball scoreboard.", "body": "<section><h2>Runs decide the score</h2><p>In a baseball line score, R, H and E commonly stand for runs, hits and errors. They describe different parts of the game. The score comparison is based on runs, not which side collected more hits.</p><p>A hypothetical side can have eight hits and three runs while its opponent has six hits and four runs. That is not an arithmetic contradiction. A hit records an offensive event; scoring a run depends on what happens as runners advance and the inning unfolds.</p></section><section><h2>Errors involve the official scorer</h2><p>MLB defines an error through the official scorer's judgment about a play an average fielder should have made, or a poor play allowing runners to advance. A batter does not always have to reach base for an error to be charged.</p><p>A dropped foul ball can extend an at-bat and lead to an error classification. Do not label every awkward play an error from a score alone. The official classification matters, and the line score can be corrected.</p></section><section><h2>Read innings before the totals</h2><p>An inning-by-inning line shows when runs were scored; the totals show the whole game. A late rally can explain why a side wins despite trailing for much of the contest. Adding the inning runs gives the run total, not the hit total.</p><p>MLB's scorekeeping guide uses abbreviations such as BB for a walk, K for a strikeout and HR for a home run. Fan notation can vary. On ScoreZaap, read the inning and status alongside runs, then use available match detail for context. A box score is a summary, not a complete account of every play.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/error", "MLB: Error"], ["https://www.mlb.com/glossary/miscellaneous/scorekeeping", "MLB: Scorekeeping"]] }, { "slug": "f1-gap-interval-and-fastest-lap", "category": "Formula 1", "title": "F1 timing: gap, interval and fastest lap", "description": "Read Formula 1 timing columns without confusing race position, neighbouring cars and a single quick lap.", "body": "<section><h2>Identify the reference car</h2><p>Timing columns compare drivers against a reference. An interval describes the time difference to a car ahead; a gap display can use another reference such as the leader. Read the column label and selected view before deciding which two cars a number compares.</p><p>In a hypothetical timing view, a driver could be ten seconds behind the leader but only two behind the car immediately ahead. Those figures can both be correct. They answer different questions rather than contradicting each other.</p></section><section><h2>Positions and lap times are different</h2><p>A fast individual lap does not automatically place a driver at the front of the race. Race position reflects the contest as a whole, while a lap time describes one circuit. Pit stops and the sequence of laps can make those stories diverge.</p><p>Formula1's glossary defines fastest lap as the quickest lap time set during a Grand Prix. It also notes that the championship bonus point used from 2019 to 2024 was removed from 2025. Do not repeat an older points explanation as if it were a current rule.</p></section><section><h2>Watch a trend, not one flash</h2><p>Official F1 live timing describes gap and interval updates on a loop or segment basis. A changing number is therefore not necessarily a complete new lap comparison. A short snapshot can hide where on the circuit each driver is.</p><p>Use several updates to follow whether a gap is growing or shrinking. ScoreZaap's F1 view is a race snapshot, not a claim to reproduce every official live-timing field. Check the session and status before comparing qualifying, practice and race numbers, and do not infer a missing interval from a simple position list.</p></section>", "sources": [["https://www.formula1.com/en/latest/article/f1-glossary-f-j.2g6grJVxT6dFCDpSmgoCQX", "Formula1: Glossary"], ["https://www.formula1.com/en/latest/article/you-speak-we-listen-the-latest-f1-live-timing-improvements.G9HzG04abEZ7wSosVjUfg", "Formula1: Live timing updates"]] }, { "slug": "cricket-follow-on-explained", "category": "Cricket", "title": "The follow-on: why a team bats twice in a row", "description": "Understand the optional follow-on, first-innings leads and the change to normal innings order.", "body": "<section><h2>It changes the order, not the score</h2><p>The follow-on belongs to a two-innings match. It lets the side batting first require its opponent to bat again after the opponent's first innings, rather than the leading side immediately beginning its own second innings. It is an option, not an automatic consequence of trailing.</p><p>The scoreboard can therefore show the same team beginning a new innings straight after its previous one ended. That is not a duplicate innings or a reset of the team's earlier score. Read the innings number as well as the team name.</p></section><section><h2>The lead requirement depends on duration</h2><p>MCC Law14 gives a 200-run threshold in a match of five days or more, 150 for three or four days, 100 for two days, and 75 for one day. These are leads after the relevant first innings, not targets for the next innings.</p><p>The Law also covers a lost first day and the number of days remaining when play starts. Check the actual match conditions before applying a threshold from memory. A shorter multi-day fixture is not automatically governed by the five-day number.</p></section><section><h2>The captain chooses</h2><p>The leading captain must notify the opposing captain and umpires when taking the option, and the notified decision cannot be changed. A large lead alone does not tell you whether the follow-on was enforced.</p><p>Watch the innings label and match status on ScoreZaap. A team following on still has its second innings to play; the first-innings deficit is not already a final losing margin. This guide explains the order of play, not a recommendation about whether a captain should enforce the option in a particular match.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/the-follow-on", "MCC: The follow-on"]] }, { "slug": "cricket-declaration-and-forfeiture", "category": "Cricket", "title": "Declared is not all out: understanding a cricket declaration", "description": "Read declared innings correctly and distinguish ending an innings from forfeiting one before it begins.", "body": "<section><h2>The batting captain can close an innings</h2><p>MCC Law15 allows the captain of the batting side to declare an innings closed when the ball is dead. The declared innings is treated as completed. A team does not have to lose every wicket before its innings can end this way.</p><p>A hypothetical 420/6 declared means the side stopped at that score with six wickets lost. It does not mean six was a special all-out threshold or that the remaining wickets vanished. The label explains why the innings ended.</p></section><section><h2>Time and runs are different resources</h2><p>A declaration can be understood as a decision to stop adding runs and allow the match to move on. The scorecard records the decision; it does not prove the captain's exact thinking about weather, bowling or time remaining.</p><p>Do not call a declaration a win. The opposition's innings and the remaining match conditions still determine the result. A lead, a target and a final margin are different numbers.</p></section><section><h2>Forfeiture happens before an innings starts</h2><p>The same Law allows a captain to forfeit an innings before it begins, which is also considered completed. That is different from batting for a period and then declaring. Read the official innings description instead of guessing from a missing batting row.</p><p>The captain notifies the opposing captain and umpires, and the notified decision cannot be changed. On ScoreZaap, combine the score with the innings label and result status. The illustrative total in this guide is not a claim about a live Test or another named fixture.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/declaration-and-forfeiture", "MCC: Declaration and forfeiture"]] }, { "slug": "cricket-tie-draw-and-win", "category": "Cricket", "title": "Tie, draw and win are different cricket results", "description": "Understand why equal scores are not automatically a tie and a lead is not automatically a victory.", "body": "<section><h2>Wait for the result conditions</h2><p>A current total is a snapshot, not the match result. MCC Law16 sets out when a side wins, when scores produce a tie and when a match is a draw. Match agreements and competition conditions can also affect how the result is determined.</p><p>A team ahead on runs while time remains has a lead. That is not itself proof of victory. In a multi-innings match, the order and completion of innings are essential to the result.</p></section><section><h2>Equal scores need more context</h2><p>Under the general Law, a tie requires the innings to be completed and the scores to be equal. Two live teams temporarily having the same number of runs does not finish the match. The next delivery may change that situation.</p><p>A draw is a different outcome: the match has not been determined as a win or tie under the relevant conditions. It does not mean the scores must be level. This is why a multi-day match can end in a draw with one side leading.</p></section><section><h2>Competition rules can add another stage</h2><p>A limited-overs competition may prescribe a tie-break procedure. Do not assume a particular extra stage from equal scores alone. Read the format, official status and competition conditions before saying how the winner will be decided.</p><p>ScoreZaap's Archives and confirmed result labels are the right place to check the outcome. Avoid translating a live advantage into a final margin. A result quoted to another person should include the fixture and confirmed outcome, not only a pair of innings totals.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/the-result", "MCC: The result"]] }, { "slug": "direct-and-indirect-free-kicks", "category": "Football", "title": "Direct vs indirect free kicks", "description": "Understand the referee signal and why the same shot into the goal can produce different restart outcomes.", "body": "<section><h2>The restart type matters</h2><p>A direct free kick can score directly into the opponents' goal. An indirect free kick cannot score that way without a further touch. Under IFAB Law13, an indirect kick sent directly into the opponents' goal results in a goal kick.</p><p>This is why a free kick's location alone does not tell you whether a direct shot can count. First identify the kind of restart. A dramatic strike can be invalid as a direct goal even if it crosses the line.</p></section><section><h2>Read the raised-arm signal</h2><p>The referee signals an indirect free kick by raising an arm. The Law describes keeping that signal until another player touches the ball, it goes out, or a direct goal is no longer possible. The signal is information about the restart, not simply a card or advantage gesture.</p><p>If the referee fails to signal and the ball is kicked directly into the goal, the Law requires the indirect free kick to be retaken. A scoreboard does not necessarily show the gesture, so a live event label may be the only context available.</p></section><section><h2>An own-goal restart is another trap</h2><p>If either a direct or indirect free kick is sent directly into the kicker's own goal, the restart is a corner kick. Do not apply the opponents' goal rule to the wrong end of the field. A further touch changes the factual situation.</p><p>On ScoreZaap, wait for the confirmed event and score after a disputed restart. A provider may initially show an apparent goal before correcting it. This guide explains the basic distinction; it does not adjudicate a real match from a headline score alone.</p></section>", "sources": [["https://www.theifab.com/laws/latest/free-kicks/", "IFAB: Free kicks"]] }, { "slug": "penalty-kick-vs-penalty-shootout", "category": "Football", "title": "A penalty kick is not a penalty shootout", "description": "Keep the match score separate from shootout tallies and understand the basic penalty-kick procedure.", "body": "<section><h2>A penalty during the match</h2><p>A penalty kick is a restart awarded under the Laws for the relevant direct-free-kick offence by a player inside their own penalty area or in the specified situations in the Law. It is not a separate contest that automatically replaces the match score.</p><p>If the kick produces a valid goal during play, that goal contributes to the match score. A hypothetical 1-0 becoming 1-1 after a penalty is an ordinary change to the running score, not a shootout result.</p></section><section><h2>The kick has a procedure</h2><p>IFAB Law14 requires the ball to be stationary on the penalty mark and the kicker to be identified. Other players have positioning requirements, and the defending goalkeeper has restrictions at the moment the ball is kicked. The referee signals before the kick proceeds.</p><p>The kicker must play the ball forward and cannot touch it again before another player has touched it. Outcomes involving encroachment or other offences depend on the details in the Law. Do not reduce every unusual kick to one universal retake rule.</p></section><section><h2>Shootout tallies belong to another phase</h2><p>A shootout is a method a competition can use to determine a winner. Its tally must be read separately from the match score. A display containing both figures is not asking you to add them into a new regulation score.</p><p>Read ScoreZaap's status and labels before sharing the result. A penalty awarded, a penalty scored and a shootout won describe three different events. Wait for the official decision during a review rather than turning an award into an assumed goal.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-penalty-kick/", "IFAB: The penalty kick"]] }, { "slug": "tennis-first-second-serve-and-let", "category": "Tennis", "title": "First serve, second serve and service let", "description": "Understand faults, double faults and why a let on second serve does not restore the first serve.", "body": "<section><h2>A fault creates a second chance</h2><p>Under the ITF rules, if the first service is a fault, the server serves again from the relevant half of the court. Two consecutive faults lose the point. A first fault is therefore not itself a point awarded to the receiver.</p><p>Read the point score after the completed point, not after every serving attempt. A missed first serve can happen without the game score changing, because the server still has the second service available.</p></section><section><h2>A service let repeats that service</h2><p>A served ball touching the net, strap or band can be a service let when the conditions in the rules are met. The particular service does not count and is taken again. Net contact alone is not enough to classify every serve as a let.</p><p>A service let does not cancel a previous fault. If a player has already missed the first serve and then serves a let, the repeat remains a second serve. It is not a return to two new attempts.</p></section><section><h2>Not every let has the same consequence</h2><p>The general let rule can replay the whole point, while the rules distinguish a service let on second service. For example, an interruption during a rally is not simply the same event as the ball clipping the net on a serve.</p><p>Alternative approved procedures can apply, so check the competition format. On ScoreZaap, use the point score and latest event together. This guide describes the standard rules; it does not claim every tournament uses the same let procedure or that a score feed lists each serving attempt.</p></section>", "sources": [["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: 2026 Rules of Tennis"]] }, { "slug": "tennis-service-order-and-change-of-ends", "category": "Tennis", "title": "Tennis service order and change of ends", "description": "Understand alternating service, doubles rotation and the difference between changing server and changing court ends.", "body": "<section><h2>Standard games alternate service</h2><p>At the end of a standard game, the receiver becomes the server and the server becomes the receiver for the next game. That change does not depend on who won the game. A break of serve wins a return game; it does not give the winner the next service game automatically.</p><p>Keep the serve marker separate from the games won. A player can lead in games while their opponent is serving, and a service change does not mean the set has ended.</p></section><section><h2>Doubles keeps a rotation</h2><p>In doubles, the team serving first chooses which partner starts that set. The other team chooses its server for the second game. The first team's other partner serves the third, and the second team's other partner the fourth; the rotation continues.</p><p>The receiving team also chooses which player receives the opening point in its first receiving game, with the partners alternating receiving positions according to the rules. Do not assume the more familiar player serves every important game.</p></section><section><h2>Ends and service are different changes</h2><p>Under the standard ITF change-of-ends rule, players switch at the end of the first, third and subsequent odd games of a set, with further provisions at set endings. Standard tie-breaks use a points-based change-of-ends pattern; alternatives exist.</p><p>A court-end switch and a server switch answer different questions. Read the game score, serve marker and format together on ScoreZaap. If a competition uses an alternative tie-break or scoring method, check its conditions before applying the standard pattern to every phase.</p></section>", "sources": [["https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf", "ITF: 2026 Rules of Tennis"]] }, { "slug": "baseball-earned-and-unearned-runs", "category": "Baseball", "title": "Earned vs unearned runs in a baseball box score", "description": "Understand why a pitcher's earned-run total can differ from the runs the opposing team scored.", "body": "<section><h2>Team runs and pitcher analysis differ</h2><p>A run counts in the team score whether the scorer classifies it as earned or unearned. The classification helps describe responsibility in the pitching record. It does not remove the run from the game result.</p><p>A hypothetical team can score four runs while a pitcher is charged with fewer earned runs. Read the column label before deciding the box score has failed to add up.</p></section><section><h2>The scorer reconstructs the situation</h2><p>MLB defines an earned run as one scoring against a pitcher without the benefit of an error or passed ball. The official scorer may need to judge whether the run would have scored without the defensive mishap. Unearned runs depend on an error or passed ball in that situation.</p><p>A pitcher leaving the game with runners on base can still be charged with earned runs if those runners later score. The pitcher on the mound at the instant a run crosses home is not always the one responsible for that runner.</p></section><section><h2>ERA does not tell the whole story</h2><p>Unearned runs do not count against a pitcher's ERA, but they still affect the team's chance to win. They can also add pitches and pressure. Calling a run unearned is a scoring classification, not a claim that it had no sporting cost.</p><p>On ScoreZaap, read runs, earned runs and the game result separately when detail is available. Avoid judging one outing from ERA alone or inventing a missing earned-run figure from the team total. Corrections to official scoring can alter the breakdown after an early live display.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/earned-run", "MLB: Earned run"], ["https://www.mlb.com/glossary/standard-stats/unearned-run", "MLB: Unearned run"]] }, { "slug": "cricket-boundary-four-vs-six", "category": "Cricket", "title": "Four vs six: what makes a cricket boundary", "description": "Understand grounded boundaries, a six off the bat and why running does not simply add to the allowance.", "body": "<section><h2>Look at how the ball reaches the boundary</h2><p>Under MCC Law 19, the usual allowance is four for a boundary four and six for a boundary six, unless determined differently under the Law. A six requires the ball to have been struck by the bat and first grounded beyond the boundary without touching the ground inside the field.</p><p>A ball bouncing inside the field before reaching the boundary is therefore not a six merely because its last bounce carries it over the rope. A touch by a fielder does not by itself rule out a six; the grounding conditions still matter.</p></section><section><h2>The rope is part of the boundary</h2><p>A ball touching the boundary marker can count as grounded beyond the boundary. The Law also covers a fielder touching the ball while grounded beyond it. These details explain why apparent saves need checking rather than a conclusion from the camera angle alone.</p><p>In a hypothetical ordinary four after the batters complete two runs, do not simply call the total six. The boundary provisions determine what is scored. Overthrows and completed running have additional rules, so unusual sequences need the actual facts.</p></section><section><h2>Read the confirmed event</h2><p>The boundary changes the team total, but its batting attribution depends on the delivery and contact. A boundary is not automatically four runs credited to the striker in every circumstance.</p><p>ScoreZaap links the changing total with the innings and match status. Wait for a confirmed event if a boundary save is under review. This example explains the general Law, not the outcome of a named live delivery.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/boundaries", "MCC: Boundaries"]] }, { "slug": "cricket-short-run-explained", "category": "Cricket", "title": "What is a short run in cricket?", "description": "Why running between the wickets can produce fewer credited runs than the batters appear to complete.", "body": "<section><h2>A turn must make good the ground</h2><p>MCC Law 18 defines a short run when a batter fails to make good their ground while turning for a further run. Running distance alone does not prove that each run qualifies. The umpire signal tells the scorers that a run must not be recorded.</p><p>For a hypothetical attempt at two runs with one unintentional short run and no other scoring event, the credited running is one rather than two. That is a scoring adjustment, not a wicket simply because the run was short.</p></section><section><h2>The next run can still count</h2><p>The Law says that although a short run shortens the succeeding one, the latter counts if completed. If both batters run short on the same run, that is only one short run, not two separate deductions for that same run.</p><p>Unintentional and deliberate short running are not treated as interchangeable situations. The deliberate case has separate provisions. A score display alone rarely tells you which the umpire has judged.</p></section><section><h2>Boundaries bring extra conditions</h2><p>For unintentional short running followed by a boundary, the Law generally disregards the short run, with exceptions involving an overthrow or a fielder's wilful act. Do not apply the simple two-run example to every boundary sequence.</p><p>On ScoreZaap, a corrected total can reflect the official scoring decision rather than a new shot. Read the event label alongside the total. This guide does not adjudicate a close turn at the crease from a scorecard alone.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/scoring-runs", "MCC: Scoring runs"]] }, { "slug": "lbw-cricket-basic-conditions", "category": "Cricket", "title": "LBW explained: more than a ball hitting the pad", "description": "Read the core leg-before-wicket conditions without assuming every pad contact is out.", "body": "<section><h2>Several conditions must be met</h2><p>MCC Law 36 makes LBW a set of conditions, not a rule that every pad hit loses a wicket. The delivery must not be a no-ball, and the ball must not have touched the bat before interception by the striker's person.</p><p>If it pitches rather than arriving full-pitch, it must pitch between the wickets or on the off side of the striker's wicket. A delivery pitching outside leg stump does not satisfy that pitching condition, even if it later turns towards the stumps.</p></section><section><h2>Impact and the path matter</h2><p>The impact normally has to be between wicket and wicket. When the striker makes no genuine attempt to play the ball with the bat, the Law allows impact outside the off-stump line as well. The ball must also have been going on to hit the wicket.</p><p>These are distinct questions: where it pitched, what it touched first, where it hit the striker and where it would have travelled. Satisfying one does not establish all the others.</p></section><section><h2>A scoreboard cannot decide the appeal</h2><p>A hypothetical pad contact on a legal ball is still only part of the evidence. Television-review procedures and competition conditions add their own operational context; this guide does not invent a review outcome.</p><p>ScoreZaap's wicket count follows the reported decision. Wait for confirmed status when a review is ongoing, rather than counting an appeal as a wicket. LBW names the dismissal; it does not by itself describe how many runs the team scored before that ball.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/leg-before-wicket", "MCC: Leg before wicket"]] }, { "slug": "cricket-run-out-and-completed-runs", "category": "Cricket", "title": "Run out: which batter is out and which runs count?", "description": "Understand a broken wicket, the batter's ground and why the unfinished run is not added.", "body": "<section><h2>The ground and wicket are linked</h2><p>MCC Law 38 concerns a batter out of their ground while the ball is in play and the wicket is fairly broken by a fielder's action, subject to the exceptions in the Law. A run does not have to be attempted for every run-out situation.</p><p>The batter dismissed is the one whose ground is at the end where the wicket is broken. The player closest to the camera or the batter who played the shot is not automatically the one out.</p></section><section><h2>A no-ball does not remove every risk</h2><p>Run out can apply even when no-ball has been called, but the Law contains specified exceptions. Do not reduce a no-ball to a promise that no dismissal is possible. Nor should every wicket broken by the wicketkeeper be labelled run out without checking the circumstances.</p><p>In a hypothetical attempted second run after one was completed, the run in progress when a run-out occurs is not scored. Runs already completed stand, together with applicable penalties, subject to the Law's specific cases.</p></section><section><h2>Read the score and dismissal separately</h2><p>A wicket and the team's running total can change in the same sequence. That is not necessarily a contradictory scorecard. The bowler's wicket figure and the team wicket count also need not rise together for this dismissal.</p><p>Use ScoreZaap's final event label and updated score rather than an assumed extra run. This guide explains the general scoring effect, not a decision about a named close replay or a non-striker leaving early.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/run-out", "MCC: Run out"]] }, { "slug": "football-yellow-red-card-explained", "category": "Football", "title": "Yellow vs red card: caution, dismissal and the score", "description": "Understand disciplinary cards without confusing a sending-off with a goal or match result.", "body": "<section><h2>A card is a disciplinary decision</h2><p>IFAB Law 12 says a yellow card communicates a caution and a red card communicates a sending-off. They are not points on the scoreboard. A hypothetical 0-0 match remains 0-0 merely because a player is cautioned.</p><p>Cards can be shown to players, substitutes, substituted players and team officials. A card icon next to the bench does not automatically mean a player currently on the field has left it. Read who received the sanction.</p></section><section><h2>Two cautions and a direct red differ</h2><p>Two separate cautionable offences require two cautions even if they occur close together. Receiving a second caution in the same match is a sending-off offence. A direct red is another disciplinary route, not proof that two yellow cards happened first.</p><p>The reason matters. Reckless play and excessive force are not interchangeable Law descriptions, and the sanction depends on the offence. Do not invent the reason for a card from a score provider's icon alone.</p></section><section><h2>The match can continue</h2><p>A sending-off is not by itself the final result. The remaining play and the competition's rules still matter. A dismissed on-field player cannot simply be replaced as if it were an ordinary tactical substitution.</p><p>ScoreZaap separates the score, match status and event stream. Use all three before sharing a result. A delayed card after advantage can appear after the original incident, so its timestamp need not be the moment the foul happened.</p></section>", "sources": [["https://www.theifab.com/laws/latest/fouls-and-misconduct/", "IFAB: Fouls and misconduct"], ["https://www.theifab.com/laws/latest/the-players/", "IFAB: The players"]] }, { "slug": "football-advantage-and-delayed-card", "category": "Football", "title": "Football advantage: why play continues after a foul", "description": "Understand the referee's advantage decision and why a card can arrive at the next stoppage.", "body": "<section><h2>Continuation is a decision</h2><p>IFAB Law 5 allows advantage when the non-offending team will benefit, and a return to the offence if the anticipated advantage does not follow at that time or within a few seconds. Continued play is not proof that no offence happened.</p><p>A hypothetical attacker retaining a promising move after a foul may therefore keep playing. It is not an extra goal, a permanent exemption from the Laws or a guarantee that the attack will succeed.</p></section><section><h2>The sanction may come later</h2><p>Law 12 describes disciplinary action at the next stoppage when advantage was played for an offence that would otherwise require a card. It also sets exceptions for an obvious goal-scoring opportunity or a promising attack.</p><p>That means delayed discipline needs the actual offence and outcome. Do not assume every advantage produces a yellow card, or that a later card must relate to a completely new incident. The referee's report supplies the decision, not the running score alone.</p></section><section><h2>Watch events as well as possession</h2><p>A provider may record the foul, advantage and eventual card at different points. Those labels explain the flow of play; the match score changes only with a valid scoring event.</p><p>On ScoreZaap, keep the confirmed event context beside the score. A player running forward after contact does not tell you enough to adjudicate a real advantage decision. This guide describes the rule structure without pretending to be the referee for a live match.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-referee/", "IFAB: The referee"], ["https://www.theifab.com/laws/latest/fouls-and-misconduct/", "IFAB: Fouls and misconduct"]] }, { "slug": "football-substitution-rules-basics", "category": "Football", "title": "Football substitutions: player change vs match event", "description": "Read substitutions correctly and check the competition's limits instead of assuming one universal number.", "body": "<section><h2>The competition sets the permitted number</h2><p>IFAB Law 3 sets a framework for substitutions, including a maximum of five in official competitions, with competition rules determining the number permitted. There are additional provisions for opportunities, extra time and other formats. Do not assume every match uses an identical allowance.</p><p>A player change is a roster event within the match. It does not add a goal or restart the match clock. A hypothetical substitution at 1-0 leaves the score at 1-0 unless another scoring event occurs.</p></section><section><h2>The change follows a procedure</h2><p>The referee must be informed before a substitution. The substitute enters during a stoppage, at the halfway line, after the departing player has left and after the referee's signal. The procedure matters; a bench player does not become an on-field player merely by standing up.</p><p>Law 3 describes the substitution as completed when the substitute enters. Return substitutions exist only in the specified permitted settings. Do not assume a replaced player can re-enter an elite match because a grassroots game allows it.</p></section><section><h2>A substitution does not explain its own motive</h2><p>A live feed naming two players establishes the change, not necessarily an injury, tactical reason or coach's private view. Avoid inventing that story from timing alone.</p><p>ScoreZaap's score and event labels provide different pieces of context. Check the actual competition conditions for limits and additional allowances, and use the confirmed event to identify who left and who entered. This example is not a report of a named fixture.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-players/", "IFAB: The players"]] }, { "slug": "football-goalkeeper-eight-second-rule", "category": "Football", "title": "Goalkeeper eight-second rule: the restart explained", "description": "IFAB's current Law 12 uses a corner kick for holding the ball beyond eight seconds.", "body": "<section><h2>Control starts the count</h2><p>Under IFAB's current Law 12, a goalkeeper controlling the ball with the hands or arms inside the penalty area for more than eight seconds before release concedes a corner kick. The referee decides when control begins and visibly counts the final five seconds with a raised hand.</p><p>Control is a defined situation, not every accidental contact with a hand. The Law describes examples such as holding the ball between the hands or between a hand and a surface, bouncing it, and tossing it in the air.</p></section><section><h2>This is not an automatic penalty</h2><p>The specified restart is a corner kick, not a penalty kick and not an indirect free kick borrowed from an older version of the Law. That distinction matters when reading a current football event feed or an older explanation online.</p><p>The corner is taken from the corner area nearest to the goalkeeper's position when penalised. The goalkeeper also cannot be challenged while controlling the ball with the hands or arms, so the countdown does not invite opponents to kick it away.</p></section><section><h2>Check the version and event</h2><p>Competitions can have their own implementation context, and archived matches must be read under the rules applying then. Do not project a current provision backwards without checking the season.</p><p>A hypothetical 0-0 game stays 0-0 after this offence; a corner is an opportunity, not a goal already scored. ScoreZaap's confirmed event and score should be read together. This guide explains the currently retrieved IFAB Law, not a timing judgment from an unseen live incident.</p></section>", "sources": [["https://www.theifab.com/laws/latest/fouls-and-misconduct/", "IFAB: Fouls and misconduct"]] }, { "slug": "cricket-caught-fair-catch", "category": "Cricket", "title": "Caught in cricket: why holding the ball is not enough", "description": "Understand bat contact, a fair catch and why a no-ball changes the dismissal.", "body": "<section><h2>The delivery and contact come first</h2><p>MCC Law 33 requires a delivery that is not a no-ball to touch the striker's bat without previously contacting a fielder. A fielder must then hold it as a fair catch before it touches the ground. A ball secured after bouncing is not that dismissal.</p><p>Bat contact and contact with the striker's person are not interchangeable evidence. A scoreboard cannot tell you whether a faint edge occurred; use the confirmed decision rather than guessing from a wicket appeal.</p></section><section><h2>Completing the catch matters</h2><p>The Law describes a catch starting with first contact by a fielder and ending when the fielder has complete control over both the ball and their own movement. A momentary touch or a ball popping out is not automatically a completed catch.</p><p>Boundary conditions also matter. An apparent catch near the rope requires the relevant grounding facts. Do not judge it from a still image alone or assume an outstretched hand establishes a legal catch.</p></section><section><h2>Read the dismissal and total together</h2><p>When the striker is caught, completed running from that delivery does not score under Law 33; applicable penalty runs remain. That differs from the scoring effects of a run out.</p><p>ScoreZaap reports the provider's confirmed wicket and score. A hypothetical apparent edge followed by a review is still pending until the decision is reported. This guide describes the Law, not a close-catch ruling for a named match.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/caught", "MCC: Caught"]] }, { "slug": "cricket-bowled-bat-pad-deflection", "category": "Cricket", "title": "Bowled: a bat or pad deflection can still hit the wicket", "description": "Why contact with the striker does not automatically prevent a bowled dismissal.", "body": "<section><h2>A legal delivery must break the wicket</h2><p>MCC Law 32 says the striker is out bowled when a delivery, not being a no-ball, fairly breaks their wicket. It can first touch the striker's bat or person. An inside edge onto the stumps can therefore still be bowled.</p><p>A ball striking the stumps is not enough by itself if the wicket has not been fairly broken. That separate requirement matters when a ball brushes a stump without the necessary consequence.</p></section><section><h2>Another person changes the route</h2><p>If the ball touches another player or an umpire before striking the wicket, Law 32 does not give a bowled dismissal. Other dismissal provisions may be relevant depending on the facts. Do not label every broken wicket bowled from the score alone.</p><p>For a hypothetical legal ball deflected from the striker's pad onto the wicket, pad contact is not an exemption. LBW conditions are not needed to establish bowled when its own requirements are satisfied.</p></section><section><h2>The dismissal has priority</h2><p>The Law gives bowled priority when its conditions are met, even if another dismissal could also be justified. That helps explain the final scorecard label rather than proving the order of every possible appeal.</p><p>On ScoreZaap, wait for the reported decision if the delivery is being checked. A no-ball review can change the apparent wicket state. This explanation concerns the general Law and does not invent the outcome of a live replay.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/bowled", "MCC: Bowled"]] }, { "slug": "cricket-stumped-vs-run-out", "category": "Cricket", "title": "Stumped vs run out: the attempted run matters", "description": "Read a wicketkeeper dismissal with the delivery, ground and running attempt in context.", "body": "<section><h2>Stumped has specific conditions</h2><p>Under MCC Law 39, stumped requires a delivery not called no-ball, the striker out of their ground and no attempted run, with the wicket fairly put down by the wicketkeeper without another fielder's intervention. The Law also contains exceptions.</p><p>A striker stepping forward to play and missing can fit a different situation from a batter attempting a run. Simply seeing the keeper remove the bails does not tell you which conditions apply.</p></section><section><h2>Wide and no-ball are not the same</h2><p>A stumping can occur from a wide; the one-run wide penalty stands when the striker is dismissed that way. A no-ball does not satisfy the stumped requirement. These two extras must not be treated as identical.</p><p>The Law also explains an important endpoint: if the wide penalty itself concludes the match, the stumping cannot then occur. Do not keep adding events after the match has already ended under the relevant conditions.</p></section><section><h2>Check the confirmed label</h2><p>A ball rebounding from the wicketkeeper's person or equipment onto the stumps can count as the keeper putting down the wicket. Leaving the ground to avoid injury has a specific exception.</p><p>ScoreZaap's final dismissal label is useful context beside the total. This guide does not decide whether a particular foot was grounded in an unseen frame. Use the official decision for that close call, not a general description alone.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/stumped", "MCC: Stumped"], ["https://www.lords.org/mcc/the-laws-of-cricket/run-out", "MCC: Run out"]] }, { "slug": "cricket-dead-ball-counts-over", "category": "Cricket", "title": "Dead ball in cricket: does the delivery count?", "description": "Why dead ball does not always mean a replacement delivery or erased runs.", "body": "<section><h2>Dead describes the end of play</h2><p>MCC Law 20 includes a ball becoming dead after a boundary, a dismissal or when finally settled in the wicketkeeper's or bowler's hands. It does not always mean an unusual incident or a delivery that must be repeated.</p><p>The ball comes into play again when the bowler starts the run-up or, without a run-up, begins the bowling action. Once a delivery is dead, revoking a decision cannot make that same delivery live again.</p></section><section><h2>Counting depends on the circumstances</h2><p>The Law distinguishes whether the striker had an opportunity to play. It also lists exceptions, including specified distractions and other offences. A dead-ball label alone does not settle whether the over count advances.</p><p>A hypothetical ordinary boundary ends that passage of play but does not erase the boundary or automatically require a replacement ball. A distraction before a genuine opportunity can involve a different counting outcome.</p></section><section><h2>Separate the signal from the score</h2><p>No-ball and wide calls have their own consequences for counting. Do not apply one shortcut to every dead-ball event. Over and time should not be called until the ball is dead under the relevant provisions.</p><p>On ScoreZaap, read the score, valid-ball count and event label together. An over display staying unchanged can be correct in one case and inappropriate in another. The guide explains the distinction without ruling on a named delivery from incomplete commentary.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/dead-ball", "MCC: Dead ball"]] }, { "slug": "football-corner-kick-direct-goal", "category": "Football", "title": "Corner kick rules: can a corner go straight in?", "description": "Understand a direct goal, the ball becoming live and why a corner is not already a scoring event.", "body": "<section><h2>A goal can come directly from a corner</h2><p>IFAB Law 17 permits a goal directly from a corner kick into the opposing team's goal. If it directly enters the kicker's own goal instead, the restart is a corner for the opponents. The direction matters.</p><p>A corner award itself does not change the score. In a hypothetical 0-0 match, the attacking side receiving a corner still needs a valid goal before the scoreboard becomes 1-0.</p></section><section><h2>The restart has a procedure</h2><p>The ball must be stationary in the relevant corner area. It is in play when kicked and clearly moves; it does not need to leave the corner area first. The corner flag must not be moved.</p><p>Opponents must remain at least 9.15 metres from the corner arc until the ball is in play. After taking the kick, the kicker cannot play it again until another player has touched it.</p></section><section><h2>Not every corner follows a defender touch</h2><p>The usual boundary case involves the whole ball crossing the goal line after last touching a defender, with no goal scored. Current rules also specify corner restarts for certain delay offences. The label alone need not prove a blocked shot.</p><p>ScoreZaap separates the corner event from any later goal. Wait for the confirmed scoring decision if a ball curls directly into the net. This guide covers the basic restart rather than a disputed goal in an unseen match.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-corner-kick/", "IFAB: The corner kick"]] }, { "slug": "football-throw-in-direct-goal", "category": "Football", "title": "Throw-in rules: why a direct throw cannot score", "description": "Understand the touchline restart, foot position and the need for another touch before a goal.", "body": "<section><h2>Directly into the net is not a goal</h2><p>IFAB Law 15 does not allow a goal directly from a throw-in. A throw directly into the opponents' goal produces a goal kick; directly into the thrower's own goal produces a corner kick.</p><p>A long throw is therefore not an exception merely because it travels a long distance. A touch by another player changes the facts, so first establish whether the throw really went in directly.</p></section><section><h2>The throw has a procedure</h2><p>At release, the thrower must face the field, have part of each foot on or behind the touchline and on the ground, and throw with both hands from behind and over the head. The restart is taken where the ball left the field.</p><p>Opponents must stand at least two metres from the point on the touchline where the throw is taken. A ball that enters play and one that never enters it can require different outcomes.</p></section><section><h2>The touchline and score are separate</h2><p>The usual award follows the whole ball crossing the touchline, last touched by the opposing team. Current delay provisions also need checking, rather than assuming every throw-in label describes a ball rolling out.</p><p>A hypothetical throw-in at 2-1 leaves the match at 2-1 unless a valid later goal occurs. Use ScoreZaap's confirmed event and score together. This guide does not decide whether a real thrower's heel was grounded from an unseen camera frame.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-throw-in/", "IFAB: The throw-in"]] }, { "slug": "football-goal-kick-in-play", "category": "Football", "title": "Goal kick rules: when is the ball in play?", "description": "A goal kick need not leave the penalty area before another player can receive it.", "body": "<section><h2>A clear movement starts play</h2><p>IFAB Law 16 says the ball is in play when it is kicked and clearly moves. It does not have to leave the penalty area first. The ball must be stationary and kicked from within the goal area by a defending player.</p><p>A defender receiving a short goal kick inside the penalty area is not automatically committing an offence. Do not apply an old area-exit requirement to the currently retrieved Law.</p></section><section><h2>Opponent positioning still matters</h2><p>Opponents must be outside the penalty area until the ball is in play. The Law separately handles opponents who did not have time to leave and those who touch or challenge before play starts. These cases should not be collapsed into one rule.</p><p>The kicker cannot play the ball again before another player has touched it. A second touch and a legal pass to a team-mate are different situations, even if both happen near the goal area.</p></section><section><h2>A direct goal is possible at one end</h2><p>A goal may be scored directly against the opponents from a goal kick. Directly into the kicker's own goal instead yields a corner for the opponents. A goal kick does not add a goal merely because of its name.</p><p>On ScoreZaap, use the reported restart and confirmed score. A hypothetical short pass at 0-0 is still 0-0. This explanation covers the basic procedure, not every delay sanction or a disputed pressing incident in a named match.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-goal-kick/", "IFAB: The goal kick"]] }, { "slug": "football-dropped-ball-goal-rule", "category": "Football", "title": "Dropped ball: why one player cannot score alone", "description": "Understand when the restart becomes live and why multiple touches by one player are not enough for a goal.", "body": "<section><h2>The ground starts play</h2><p>IFAB Law 8 says a dropped ball is in play when it touches the ground. All players except the recipient must stay at least four metres away until then. A premature kick before ground contact is not ordinary live play.</p><p>After it becomes live, an opponent respecting the required distance can play it. The named recipient is not guaranteed exclusive possession indefinitely, so the restart should not be interpreted as an uncontested goal opportunity.</p></section><section><h2>Two players must touch before a goal</h2><p>If a dropped ball goes into a goal without touching at least two players, the Law prescribes a restart instead of a goal. Into the opponents' goal means a goal kick; into the team's own goal means a corner kick.</p><p>A hypothetical recipient dribbling with several touches and then shooting directly into the net still involves only one player. Count distinct players, not the number of foot contacts.</p></section><section><h2>A further touch changes the facts</h2><p>A pass to another player or a touch by an opponent can satisfy the two-player element. Other Laws still apply: satisfying this requirement is not a guarantee that every later shot counts.</p><p>ScoreZaap's confirmed goal and restart labels matter more than an apparent ball entering the net. This guide explains the scoring restriction and live-ball moment without prescribing the recipient in every situation or inventing a decision for a real incident.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-start-and-restart-of-play/", "IFAB: The start and restart of play"]] }, { "slug": "cricket-over-valid-deliveries", "category": "Cricket", "title": "Six valid balls: when a cricket over is complete", "description": "Understand the over call, invalid deliveries and why six attempts do not always finish an over.", "body": "<section><h2>Count valid balls, not every attempt</h2><p>MCC Law 17 provides six valid balls in an over, bowled from each end alternately. A wide or no-ball is not counted as one of those six. Certain dead-ball circumstances also affect counting.</p><p>In a hypothetical over with six valid balls and one wide delivery, seven deliveries have been attempted but the over still contains six valid balls. The extra does not create a seven-ball regulation over.</p></section><section><h2>The umpire calls over</h2><p>The umpire calls over after six valid balls and when the ball is dead. A display reaching a neat decimal-looking number is not what gives a delivery its status. Overs notation counts balls rather than tenths.</p><p>The Law also covers an umpire miscount: the over as counted by the umpire stands. Do not silently invent a correction in a real fixture because a viewer counted differently from the official record.</p></section><section><h2>The end changes, not the innings</h2><p>Completing an over normally changes the bowling end. It does not automatically close the innings or reset the batting score. The format and remaining overs determine the larger innings context.</p><p>Use ScoreZaap's total, over count and innings label together. The illustrative wide is not a claim about a current match. For an unusual interruption, check the official event record and competition conditions rather than assuming every dead-ball call has the same effect.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/the-over", "MCC: The over"]] }, { "slug": "cricket-bowler-changing-during-over", "category": "Cricket", "title": "Can a bowler change during an over?", "description": "MCC Law 17 covers an incapacitated or suspended bowler and the rules for the replacement.", "body": "<section><h2>An unfinished over has a special case</h2><p>MCC Law 17 allows another bowler to complete an over if the original bowler is incapacitated or suspended during it. The umpire calls and signals dead ball when the bowler is incapacitated while running up or during the over.</p><p>That is different from an ordinary captain's change after a completed over. A partial bowling figure beside a player can reflect this special situation, not necessarily a broken scorecard.</p></section><section><h2>The replacement has restrictions</h2><p>The replacement must not have bowled any part of the previous over, and cannot bowl any part of the next one. A bowler may change ends, but cannot bowl consecutive overs or parts of each of two consecutive overs in the same innings.</p><p>For a hypothetical injured bowler after two valid balls, the remaining valid balls can be delivered by an eligible replacement. The team total does not reset, and the batter's innings does not restart.</p></section><section><h2>Do not infer the reason from statistics</h2><p>Two bowlers sharing an over does not prove a particular diagnosis or disciplinary story. The official event description supplies the reason. A fractional over figure is a count, not an explanation of what happened.</p><p>ScoreZaap's bowling rows and commentary provide different context. Read them together and use the Law for the replacement framework. This guide does not claim an injury occurred in a named fixture or choose which player should complete a real over.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws-of-cricket/the-over", "MCC: The over"]] }, { "slug": "football-goal-line-whole-ball", "category": "Football", "title": "When does a football goal count? The whole-ball rule", "description": "A ball touching or partly crossing the goal line is not enough to establish a goal.", "body": "<section><h2>The entire ball must cross</h2><p>IFAB Law 10 says a goal is scored when the whole ball passes over the goal line between the posts and under the crossbar, provided the scoring team has committed no offence. A ball partly over the line does not meet that requirement.</p><p>The goal frame and the line describe a three-dimensional boundary. A camera angle can make partial crossing look complete, so a screenshot alone may be insufficient to judge a close incident.</p></section><section><h2>Entering the net is not every condition</h2><p>A ball in the net can still be followed by a decision that no goal counts because of an offence or a restart restriction. A direct goalkeeper throw into the opponents' goal, for example, yields a goal kick under Law 10.</p><p>A hypothetical apparent goal at 1-1 is not safely 2-1 until the event is confirmed. A score feed can briefly show a goal before an official correction. Treat the match state as updateable, not a permanent verdict at first sight.</p></section><section><h2>The final score decides the basic outcome</h2><p>The side with more goals wins; equal goals or no goals produce a draw under the basic Law. Competition rules can prescribe a further winner-determining method where required. Do not assume all equal scores end the competition.</p><p>ScoreZaap separates live totals from confirmed results. This guide explains what a goal requires, without adjudicating a real goal-line review or inventing a scorer from an unexplained total change.</p></section>", "sources": [["https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/", "IFAB: Determining the outcome"]] }, { "slug": "football-offside-restart-exceptions", "category": "Football", "title": "No offside directly from a throw-in, corner or goal kick", "description": "Understand the narrow restart exceptions without assuming offside is disabled for the whole move.", "body": "<section><h2>Three direct receipts are exempt</h2><p>IFAB Law 11 states there is no offside offence when a player receives the ball directly from a goal kick, throw-in or corner kick. Directly is the important limit: it describes the receipt from that restart.</p><p>A hypothetical attacker beyond the defenders receiving a team-mate's throw-in is not penalised merely for that position on the direct receipt. Other offences can still occur, so the exception is not immunity from the rest of the Laws.</p></section><section><h2>A later touch can create a new question</h2><p>After another team-mate touches or plays the ball, the usual offside assessment can apply to the next phase. A corner does not switch off offside for every pass that follows.</p><p>The corner taker can also be in an offside position in a later phase after taking the kick. The restart's original label is not enough to establish the status at a subsequent touch.</p></section><section><h2>A free kick is not on the list</h2><p>Do not add free kicks or kick-offs to these three direct-receipt exceptions. Apply the relevant Law and actual position at the team-mate's touch rather than a broad claim that all restarts are exempt.</p><p>ScoreZaap's event labels give context, but a basic scorecard cannot locate every player at each touch. Wait for the confirmed decision in a real match. This guide explains the narrow exception, not a ruling from incomplete match data.</p></section>", "sources": [["https://www.theifab.com/laws/latest/offside/", "IFAB: Offside"]] }, { "slug": "baseball-home-run-runs-count", "category": "Baseball", "title": "A home run is one hit, but can score several runs", "description": "Read a home run total separately from the team runs added on the play.", "body": "<section><h2>The hitter completes the bases</h2><p>MLB defines a home run as a fair hit on which the batter scores without being put out or benefiting from an error. Most travel over the outfield fence in fair territory, but inside-the-park home runs also exist.</p><p>A home run is one hit in the hitter's record. It can produce more than one team run because runners already on base score too. The team run total is not simply a count of home-run swings.</p></section><section><h2>The base situation changes the yield</h2><p>In a hypothetical solo home run, only the batter scores: one run. With two runners already on base, that home run can score three. With the bases loaded, it can score four, commonly called a grand slam.</p><p>Those are worked examples, not reports of a current game. Do not add the hitter's one hit as another run after already counting everyone who scored. Hits and runs are different box-score columns.</p></section><section><h2>Not every ball over a fence is fair</h2><p>The fair-territory condition matters. The MLB glossary also describes cases involving the foul pole or a fielder contact before the ball clears the wall. Unusual plays need the actual ruling rather than a distance estimate.</p><p>On ScoreZaap, a score rise of four alone does not prove a grand slam. Read a confirmed event description before naming the play. The live score shows the team total; the source account explains how those runs arrived.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/home-run", "MLB: Home run"]] }, { "slug": "baseball-rbi-vs-run-scored", "category": "Baseball", "title": "RBI vs run scored: two different baseball statistics", "description": "Why a hitter can drive in a run without scoring one, or score without an RBI.", "body": "<section><h2>An RBI is a credited contribution</h2><p>MLB's glossary describes an RBI as credit in most cases where a plate appearance results in a run. A run scored belongs to the player who completes the bases. The same player need not receive both statistics on a play.</p><p>In a hypothetical single driving a runner home, the hitter can receive an RBI while the runner receives the run scored. That is not two team runs: the columns describe different contributions to one scoring play.</p></section><section><h2>A hit is not always required</h2><p>A bases-loaded walk or hit by pitch can produce an RBI. A batter can also receive one when making an out if a run scores, subject to the exceptions. RBIs are not simply the number of run-scoring hits.</p><p>MLB notes exceptions including a run scoring because of an error or a ground-ball double play. Do not assign the credit solely because a run appeared during the batter's plate appearance.</p></section><section><h2>Keep individual totals out of the team sum</h2><p>Adding RBIs to runs scored would count contributions again rather than reconstruct the scoreboard. A team's final run total is already the score, not a base number awaiting the addition of player credits.</p><p>ScoreZaap's team score and box-score statistics answer different questions. Wait for the official scoring attribution before describing a real play as an RBI. This guide uses a labelled hypothetical single, not invented commentary for a named game.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/runs-batted-in", "MLB: Runs batted in"]] }, { "slug": "baseball-walk-base-on-balls", "category": "Baseball", "title": "What does BB mean in baseball? Walks explained", "description": "Read a base on balls without confusing it with a hit or an automatic team run.", "body": "<section><h2>Four balls can award first base</h2><p>MLB calls a walk a base on balls, abbreviated BB. The glossary describes a batter refraining from swinging at four pitches outside the strike zone and being awarded first base.</p><p>A walk is not a hit merely because the batter reaches a base. A hypothetical walk with the bases empty adds a runner, not an automatic run to the team score. The player must still advance around the bases to score.</p></section><section><h2>The base situation matters</h2><p>A bases-loaded walk can force a run in and produce an RBI, as described in MLB's RBI glossary. That scoring effect depends on the occupied bases, not just the BB label.</p><p>An intentional walk also counts as a walk for the record. The statistic does not by itself prove the pitcher accidentally lost control or identify the team's tactical reason.</p></section><section><h2>Separate reaching base from scoring</h2><p>A scorecard may show a walk while the team total remains unchanged. That is normal when no run scores on the play. Conversely, a bases-loaded walk can change the score without increasing the hit count.</p><p>Use ScoreZaap's event context beside the runs and hits columns. This guide explains the abbreviation and basic credit, not every strike-zone ruling or a prediction about what a pitcher will throw next. The examples are not claimed live events.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/walk", "MLB: Walk"], ["https://www.mlb.com/glossary/standard-stats/runs-batted-in", "MLB: Runs batted in"]] }, { "slug": "baseball-strikeout-uncaught-third-strike", "category": "Baseball", "title": "Strikeout vs out: the uncaught third-strike exception", "description": "Why a recorded K can occasionally appear even when the batter reaches first base.", "body": "<section><h2>Three strikes create a strikeout</h2><p>MLB's glossary defines a strikeout through three swinging or called strikes and records it as K. A backwards K indicates a called third strike without a swing.</p><p>A foul ball ordinarily cannot be the third and final strike; a caught foul tip can be. Those are different contacts despite both sounding like a ball touched by the bat.</p></section><section><h2>A third strike may not complete an out</h2><p>If the catcher does not cleanly catch the third strike, the batter may attempt first base when it is unoccupied or when there are two outs. Even if the batter reaches safely, both pitcher and batter receive a strikeout in the scorebook.</p><p>A hypothetical strikeout followed by the batter reaching first is therefore not automatically a scoring error. The statistical K and the completed-out count describe different facts in this exception.</p></section><section><h2>The inning context is essential</h2><p>First-base occupancy and the number of outs matter to the opportunity to run. Do not present every dropped third strike as an unrestricted free attempt at first. The actual play can include a throw and a subsequent out.</p><p>ScoreZaap's team score alone does not prove how a strikeout ended. Read the event or official scoring record before naming the exception in a real match. This guide describes MLB's basic explanation without inventing a play-by-play sequence.</p></section>", "sources": [["https://www.mlb.com/glossary/standard-stats/strikeout", "MLB: Strikeout"]] }, { "slug": "cricket-hit-wicket-no-ball", "category": "Cricket", "title": "Hit wicket: timing and no-ball exceptions", "description": "A batter breaking their own wicket is not always dismissed hit wicket.", "body": "<section><h2>The batting action matters</h2><p>MCC Law 35 covers the striker breaking their wicket with bat or person after the bowler enters the delivery stride, while the ball is in play. It includes preparing for or receiving a delivery and setting off immediately for the first run after playing or playing at it.</p><p>Imagine a striker stepping back to play a legal delivery and knocking a bail off with a foot. The relevant question is whether the action meets those conditions, rather than whether the ball itself touched the stumps.</p></section><section><h2>Later running is different</h2><p>The Law excludes breaking the wicket during running other than setting off immediately for that first run. Trying to avoid being run out or stumped, or trying to avoid a throw, is also excluded from hit wicket.</p><p>If the striker puts down the wicket before the bowler enters the delivery stride, the specified response is dead ball. The same visible fallen bail can therefore have different meaning depending on when it happens.</p></section><section><h2>No-ball changes the dismissal</h2><p>A no-ball is another listed exception: the striker is not out hit wicket from that delivery. The Law does not give the same exclusion for a wide. When hit wicket is awarded, the one-run wide penalty and applicable five-run penalties can stand.</p><p>Read the final dismissal label alongside the extra and valid-ball count. Those fields help explain why an apparent wicket is removed after a no-ball check. A photograph of fallen bails alone cannot establish the final decision.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/hit-wicket", "MCC: Hit wicket"]] }, { "slug": "cricket-hit-ball-twice-guard-wicket", "category": "Cricket", "title": "Hit the ball twice: protecting the wicket is a limited exception", "description": "Why a deliberate second strike may be legal for defence but not for scoring.", "body": "<section><h2>Not every second contact is an offence</h2><p>MCC Law 34 concerns the striker wilfully striking the ball again before it has touched a fielder, while the ball remains in play. The initial contact can be with the bat or the striker's person. This is not a shortcut that makes every accidental two-contact shot a dismissal.</p><p>A deliberate second stroke solely to guard the wicket has a specific exception. Before a fielder touches the ball, the striker may use the bat or body, but not a hand that is not holding the bat, for that limited purpose.</p></section><section><h2>Defence does not permit stopping a catch</h2><p>The exception does not allow the striker to prevent a catch by making a second strike in defence of the wicket. Law 34 points to the obstruction provisions for that case. No-ball status also needs separate attention; it does not simply erase every second-strike rule.</p><p>Consider a ball rolling back towards the stumps after a shot. A lawful defensive tap is different from deliberately hitting it again to add distance and run. The purpose and sequence matter.</p></section><section><h2>Lawful defence is not another scoring shot</h2><p>For a lawful second strike, the Law sets a dead-ball procedure and disallows running scores, with specified treatment of no-ball and penalty awards. Do not treat a ball sent to the rope after that defensive tap as an ordinary four.</p><p>The bowler does not receive wicket credit for a hit-the-ball-twice dismissal. The team wicket total and the bowler's personal wicket count can therefore change differently without the scorecard being wrong.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/hit-the-ball-twice", "MCC: Hit the ball twice"]] }, { "slug": "cricket-timed-out-ready-not-arrival", "category": "Cricket", "title": "Timed out: being ready matters more than reaching the pitch", "description": "Understand MCC's three-minute rule and why competition conditions must also be checked.", "body": "<section><h2>The clock follows a wicket or retirement</h2><p>Under the retrieved MCC Law 40, the incoming batter must be ready to receive, or the other batter ready to receive the next ball, within three minutes of a dismissal or retirement unless Time has been called. The wording is about readiness, not merely arrival near the wicket.</p><p>A hypothetical batter walking onto the field before three minutes but still unable to receive is not automatically safe because they crossed the boundary. The relevant requirement concerns the next delivery.</p></section><section><h2>Do not apply one number to every competition</h2><p>This guide describes the MCC Law as retrieved. A competition can have its own playing conditions, so check those before applying this three-minute figure to a particular international or domestic match.</p><p>The distinction matters when commentary mentions a different limit. Do not call the commentary false solely because a general Laws guide gives three minutes. First establish which playing conditions govern the game.</p></section><section><h2>The wicket does not belong to the bowler</h2><p>MCC says the bowler does not get credit for timed out. The side can therefore lose a wicket without a bowler adding one to their figures. For extended delays with no incoming batter, the Law points to a separate match-award procedure.</p><p>A live score alone cannot prove when readiness was achieved or whether Time had been called. Use the reported dismissal and the match's governing conditions, rather than timing an edited television clip.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/timed-out", "MCC: Timed out"]] }, { "slug": "cricket-obstructing-field-accidental-contact", "category": "Cricket", "title": "Obstructing the field: accidental contact is not enough", "description": "Read intention, injury avoidance and catch interference before interpreting this dismissal.", "body": "<section><h2>The Law concerns wilful obstruction</h2><p>MCC Law 37 allows either batter to be dismissed for wilfully attempting to obstruct or distract the fielding side by word or action while the ball is in play, subject to its exceptions. It also has a rule for the striker deliberately using a hand not holding the bat when receiving the delivery.</p><p>A ball merely touching a running batter does not, by itself, establish that the batter acted wilfully. The action and circumstances need judging, not just the resulting deflection.</p></section><section><h2>Accident and injury avoidance have exceptions</h2><p>The Law excludes accidental obstruction and obstruction to avoid injury. A lawful second strike to protect the striker's wicket is also addressed, but catch interference has further conditions.</p><p>When wilful obstruction prevents a catch from a legal delivery, the striker can be dismissed even if the other batter caused the obstruction. This is why identifying who acted does not always identify who is out.</p></section><section><h2>No-ball is not blanket protection</h2><p>The obstruction Law can apply even when no-ball is called. Catch-related no-ball cases have their own detail, including the lawful defensive second-strike exception. Avoid assuming every apparent obstruction is ignored on a no-ball.</p><p>Returning the live ball to a fielder without a fielder's consent can also fall under this Law. The bowler gets no wicket credit for obstruction. Use the final decision and scoring record for a named incident; this guide is not evidence of a batter's intention.</p></section>", "sources": [["https://www.lords.org/mcc/the-laws/obstructing-the-field", "MCC: Obstructing the field"]] }, { "slug": "football-penalty-rebound-post-vs-save", "category": "Football", "title": "Penalty rebounds: the post and goalkeeper are different", "description": "Why the original kicker can follow a save but not immediately follow a post rebound.", "body": "<section><h2>Another player must touch first</h2><p>IFAB Law 14 says the penalty taker must not play the ball again until it has touched another player. A goalpost or crossbar is not a player. A goalkeeper is.</p><p>For a hypothetical ordinary in-match penalty that hits the post and returns directly to the kicker, an immediate second kick breaks this requirement. If the goalkeeper touches the ball first, that particular restriction is satisfied, although other rules can still affect the play.</p></section><section><h2>A rebound does not always end live play</h2><p>During normal match play, a saved penalty or one rebounding from the frame can leave a playable ball. The score has not changed just because the penalty was taken. A later valid finish is the scoring event.</p><p>Do not transfer this expectation to a penalty shootout. A shootout and a penalty within the match have different procedures; this guide focuses on the Law 14 in-match situation.</p></section><section><h2>An end-of-half extension is narrower</h2><p>When additional time is allowed only to take and complete a penalty, Law 14 defines when that kick ends. A touch by a player other than the defending goalkeeper, including the kicker, completes it. That is not an unlimited opportunity for a follow-up attack.</p><p>On a live score page, check whether the event is a penalty award, a saved attempt or a confirmed goal. Those labels describe separate stages. The hypothetical rebound examples here are explanations, not claims about a particular match.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-penalty-kick/", "IFAB: The penalty kick"]] }, { "slug": "football-penalty-feint-run-up", "category": "Football", "title": "Penalty feints: the run-up and completed run-up differ", "description": "Understand which deception IFAB allows and which brings a caution.", "body": "<section><h2>A pause is not one universal offence</h2><p>IFAB Law 14 permits feinting during the run-up. It separately prohibits feinting to kick once the run-up has been completed. The point in the sequence matters; a slow or unusual approach is not enough by itself to establish the offence.</p><p>For a hypothetical taker changing pace while approaching, first identify whether the feint occurred during the run-up or after it ended. A short highlight can omit the detail needed to decide.</p></section><section><h2>The prohibited feint has consequences</h2><p>For the prohibited completed-run-up feint, the retrieved Law prescribes an indirect free kick and a caution to the kicker, regardless of whether the ball enters the goal. A ball in the net is therefore not conclusive proof of a valid penalty goal.</p><p>The kick must also go forward. A backheel is permitted if the ball moves forward, so the movement of the ball matters more than the name of the technique.</p></section><section><h2>Separate technique from the final ruling</h2><p>The penalty taker must be identified, and the referee signals for the kick after the players take the required positions. An unusual routine does not remove those steps.</p><p>Use the confirmed decision on ScoreZaap rather than adding a goal from an apparent finish during a review. This guide covers run-up feinting, not every encroachment, goalkeeper offence or accidental double-contact case. Each needs its own facts and governing provision.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-penalty-kick/", "IFAB: The penalty kick"]] }, { "slug": "football-ball-hits-referee-live-or-dead", "category": "Football", "title": "Ball hits the referee: when does play stop?", "description": "Not every deflection from an official requires a dropped ball.", "body": "<section><h2>Contact alone does not stop play</h2><p>IFAB Law 9 says the ball normally remains in play when it touches a match official. The exception requires the ball to remain on the field and one of three effects: a promising attack starts, it goes directly into goal, or the team in possession changes.</p><p>A hypothetical harmless deflection with the same team retaining possession and no promising attack is not automatically a dropped ball simply because the referee was touched.</p></section><section><h2>The effect changes the restart</h2><p>When one of those specified effects occurs, play restarts with a dropped ball. An official-contact deflection directly into goal is therefore not an ordinary goal to add to the scoreboard.</p><p>If the ball instead leaves the field after hitting the official, the remain-on-the-field condition is absent. IFAB's examples explain that the usual throw-in, goal-kick or corner restart applies based on the players' last touch and exit location.</p></section><section><h2>Other rebounds can remain live</h2><p>A rebound from a post, crossbar or corner flag that stays on the field remains in play under Law 9. Those contacts are different from the specified official-contact effects.</p><p>The ball is also out of play when it wholly crosses a boundary or the referee stops play. That whistle matters: an apparent finish after play has already stopped cannot simply be counted because the ball entered the net. Watch the reported restart alongside the score.</p></section>", "sources": [["https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/", "IFAB: The ball in and out of play"]] }, { "slug": "football-var-check-vs-review-final-decision", "category": "Football", "title": "VAR check vs review: who makes the final decision?", "description": "A video check does not itself change a goal or prove a referee mistake.", "body": "<section><h2>A check is not a new score</h2><p>The retrieved IFAB VAR protocol describes assistance for reviewable decisions and incidents. A check of an apparent goal is part of that process, not a separate goal to add or proof that the initial decision is wrong.</p><p>The referee must make an initial decision. Allowing play to continue can itself be that decision; the protocol does not permit simply giving no decision and asking VAR to supply one.</p></section><section><h2>The referee owns the ruling</h2><p>Only the referee can initiate a review. VAR and other match officials can recommend one. The referee makes the final decision either from VAR information or after an on-field review.</p><p>A referee going to the monitor is therefore not a guarantee that a goal will be cancelled. They still have to decide after examining the relevant evidence. The score should reflect the final reported ruling, not the act of walking to the screen.</p></section><section><h2>There is no fixed review deadline</h2><p>IFAB says there is no time limit for the review process because accuracy matters more than speed. A long check alone cannot prove an error or a predetermined outcome.</p><p>Competition use and reviewable categories must be checked against the current protocol. This guide explains the decision process without claiming every foul can be reviewed, promising a review length or interpreting unseen replay angles. On ScoreZaap, treat the pending event as pending until the confirmed decision arrives.</p></section>", "sources": [["https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/", "IFAB: VAR protocol"]] }, { "slug": "nhl-periods-game-clock", "category": "Hockey", "title": "NHL periods and the clock: three periods of actual play", "description": "Read period labels and distinguish playing time from elapsed wall-clock time.", "body": "<section><h2>Regulation has three periods</h2><p>NHL Rule 77.1 allows three 20-minute periods of actual play, with an intermission between periods. That is 60 minutes of regulation playing time, not a promise that the entire event ends one hour after the opening face-off.</p><p>A scoreboard showing second period with 12:00 remaining describes the current period's clock. It does not mean 12 minutes remain until a guaranteed final result. Another regulation period is still ahead.</p></section><section><h2>Breaks are separate from the playing clock</h2><p>Rule 77.2 ordinarily lists an 18-minute intermission, or another duration designated by the League. An intermission label is therefore different from active play and should not be treated as a running match clock.</p><p>A displayed clock can stay still during a stoppage without the score feed being broken. Check whether the game is in play, stopped or between periods before drawing that conclusion.</p></section><section><h2>Tied regulation can lead to more play</h2><p>Regular-season overtime and playoff overtime follow different procedures under Rule 84. A tied score at the end of the third does not establish a final draw in those NHL formats.</p><p>Read ScoreZaap's period, clock and match status together. The examples here explain labels; they are not reported events or a measured promise about how quickly a provider refreshes the clock.</p></section>", "sources": [["https://media.nhl.com/site/asset/public/ext/2026-27/2026-27Rules.pdf", "NHL Official Rules 2026-2027"]] }, { "slug": "nhl-regular-season-overtime-playoffs", "category": "Hockey", "title": "NHL overtime: regular season vs playoffs", "description": "Five-minute regular-season overtime and repeated playoff periods are not interchangeable.", "body": "<section><h2>Regular-season overtime is sudden death</h2><p>NHL Rule 84.1 provides overtime of no more than five minutes after tied regulation, normally with three skaters and a goalkeeper per team. The first scoring team wins and gets an additional standings point. Both sides already receive one point for reaching that tied-regulation stage.</p><p>A hypothetical 5-5 game can end 6-5 from an overtime goal. That is a goal in live overtime play, not a shootout conversion. Penalty situations can alter player strength, so three skaters is not an unconditional count for every moment.</p></section><section><h2>A shootout follows a still-tied regular-season overtime</h2><p>Rule 84.4 sends a regular-season game to a shootout if it remains tied after the five-minute overtime. It is a separate deciding procedure, not another ordinary period of open play.</p><p>The displayed final score and the shootout tally answer different questions. Check the finish label before interpreting an extra goal in the team total as a normal scored goal by an individual.</p></section><section><h2>Playoffs use a different format</h2><p>Under Rule 84.5, tied Stanley Cup Playoff games continue with 20-minute overtime periods until a team scores. The retrieved rule does not use the regular-season five-minute-then-shootout route for that playoff format.</p><p>ScoreZaap's OT label needs competition context. This guide is about the NHL 2026-27 rulebook, not a claim that every hockey league uses identical timing or player-strength rules.</p></section>", "sources": [["https://media.nhl.com/site/asset/public/ext/2026-27/2026-27Rules.pdf", "NHL Official Rules 2026-2027"]] }, { "slug": "nhl-minor-penalty-power-play-goal", "category": "Hockey", "title": "NHL minor penalties: when does a power-play goal end one?", "description": "Short-handed status and the penalty type matter before a player returns.", "body": "<section><h2>A minor normally costs two minutes</h2><p>NHL Rule 16.1 sends a player other than the goalkeeper off for two minutes, with no substitute during that penalty. This can put their team below the opponent's numerical strength.</p><p>A penalty label does not always tell you the strength on the ice by itself. Coincidental penalties can leave neither team short-handed relative to the other.</p></section><section><h2>The goal must meet the release conditions</h2><p>Under Rule 16.2, an opponent's goal can end a minor or bench minor when the scored-against team is short-handed because of that penalty. The qualifying penalty with the least time left terminates, subject to the coincidental-penalty provisions.</p><p>A hypothetical opponent scoring during a single qualifying minor can restore equal strength before the two minutes expire. Do not assume every goal ends every type of penalty, or clears several penalties at once.</p></section><section><h2>A penalty-shot goal is different</h2><p>Rule 16.2 explicitly says a goal on a penalty shot does not release the penalised player under this automatic-termination rule. A penalty-shot finish and an ordinary power-play goal are separate situations.</p><p>On ScoreZaap, read the confirmed goal, penalty clock and player-strength context together. The team score alone is not enough to decide who returns from the penalty bench. This guide describes the retrieved NHLrule, not a ruling on an unseen incident.</p></section>", "sources": [["https://media.nhl.com/site/asset/public/ext/2026-27/2026-27Rules.pdf", "NHL Official Rules 2026-2027"]] }, { "slug": "nhl-shootout-final-score-player-goals", "category": "Hockey", "title": "NHL shootouts: why the final score adds only one goal", "description": "Shootout conversions are not all added to the team score or a player's goal total.", "body": "<section><h2>The deciding procedure follows tied overtime</h2><p>NHL Rule 84.4 uses a shootout after a tied five-minute regular-season overtime. Teams alternate attempts, starting with three each unless the result is decided earlier, then continue if necessary.</p><p>A shootout attempt is not an open-play overtime attack. The finish label is important when reading a result that otherwise looks like an ordinary one-goal win.</p></section><section><h2>Only one goal is added to the winning team score</h2><p>Regardless of the number of shootout conversions, Rule 84.4 records the winning team with one more goal than its opponent based on the tied score at the end of overtime.</p><p>Imagine regulation and overtime end 2-2 and one team wins the shootout 3-1. The game result becomes 3-2, not 5-3. The 3-1 shootout tally is a separate measure of successful attempts.</p></section><section><h2>Personal statistics do not mirror that extra team goal</h2><p>The rule says the player scoring the shootout winner is not credited with an extra personal goal. The losing goalkeeper is not charged with that additional goal against either.</p><p>A player-goals column staying unchanged despite a shootout win is therefore not automatically a data error. Use ScoreZaap's result status and any available deciding-method context, rather than adding shootout conversions to ordinary scoring statistics yourself.</p></section>", "sources": [["https://media.nhl.com/site/asset/public/ext/2026-27/2026-27Rules.pdf", "NHL Official Rules 2026-2027"]] }, { "slug": "asian-games-compound-archery-scoring", "category": "Asian Games", "title": "Asian Games archery: compound scores and shoot-offs", "description": "Read team totals, mixed-team scores and tied finals without confusing arrow points with set points.", "body": "<section><h2>Start with the discipline and event</h2><p>At the Asian Games, a compound team result such as 238-234 is an accumulated arrow score. It is not the same kind of score as a recurve match decided on set points. The event name matters before the numbers make sense.</p><p>World Archery explains that compound individual matches use 15 arrows, team matches use 24, and mixed teams use 16. Each arrow can score up to ten, so the normal maximum is 240 for a three-person team and 160 for a mixed team.</p></section><section><h2>Why 238 can decide a gold medal</h2><p>India's women beat China 238-234 in the September 30 Asian Games compound team final. That is a four-point difference over the match, not four sets. The men's team won a separate final 238-237.</p><p>Using a hypothetical example, a team ending on 237 from 24 arrows is three points below the possible 240. That arithmetic says nothing about the sequence of arrows or whether a particular athlete missed the ten ring.</p></section><section><h2>Keep the shoot-off separate</h2><p>India and South Korea tied 157-157 in the compound mixed team final. The official report records the deciding shoot-off as 20-19. The regulation score and shoot-off score describe separate stages; adding them into 177-176 would hide the tie-breaking method.</p><p>World Archery explains recurve using a set system: the individual winner reaches six set points, while teams reach five. Do not apply those thresholds to the cumulative compound totals. Check the bowstyle and event label every time.</p></section>", "sources": [["https://www.worldarchery.sport/news/202393/how-it-works-beginners-guide-2026-hyundai-archery-world-cup", "World Archery: scoring formats"], ["https://www.olympics.com/en/news/asian-games-2026-archery-compound-india-gold-la-2028-olympics-quota", "Olympics.com: Asian Games archery finals"]] }, { "slug": "asian-games-relay-time-team-medal", "category": "Asian Games", "title": "Asian Games athletics: read a 4x400m relay result", "description": "Four legs, one team time and one event medal. Understand the relay clock without treating it as an individual 400m result.", "body": "<section><h2>Four runners share one race</h2><p>A 4x400m relay has four athletes running 400 metres each while passing a baton. The team covers 1600 metres in total. Its published finishing time is the combined race time, not the fastest runner's individual 400m time.</p><p>Olympics.com's relay explainer describes the last runner as the anchor. A result showing the team's athlete names tells you who took part; it does not automatically provide each runner's split time.</p></section><section><h2>Read minutes, seconds and hundredths</h2><p>India won the women's Asian Games final on September 29 in 3:29.69. Read that as three minutes, 29.69 seconds. Bahrain finished in 3:30.21, so the winning margin was 0.52 seconds.</p><p>The 3:29.69 belongs to Kiran Pahal, Poovamma Machettira, Prachi Choudhary and Vithya Ramraj as a relay team. Dividing by four can give an arithmetic average, but it does not reveal their measured individual splits or account for rolling starts.</p></section><section><h2>Do not mix different relay events</h2><p>India's men won bronze in a separate 4x400m final in 3:01.61. Women's, men's and mixed-team events have separate results and medals. One relay gold adds one gold to the country's event tally, rather than four because four athletes ran.</p><p>Use the official final result and any penalties, not merely a live clock, to identify the medal order. This guide does not infer a national record, personal best or selection from the finishing time.</p></section>", "sources": [["https://www.olympics.com/en/news/athletics-relay-races-rules-history-world-records-olympics", "Olympics.com: relay basics"], ["https://www.olympics.com/en/news/asian-games-2026-athletics-india-women-4x400m-relay-gold-results", "Olympics.com: Asian Games relay results"]] }, { "slug": "asian-games-sport-dates-fixture-times", "category": "Asian Games", "title": "Asian Games schedule: sport dates are not fixture times", "description": "Use the official sport windows, then check a specific session or match before planning to watch.", "body": `<section><h2>A sport window contains many sessions</h2><p>The official Asian Games 2026 overview lists cricket from September 17 to October 3 and football from September 14 to October 3. Those windows describe when a sport is on the programme. They do not promise an India match on every date or tell you the time of a final.</p><p>A sport can also have several disciplines. Basketball and 3x3 basketball have different date ranges; tennis and soft tennis are separate rows; cycling is split into road, track, BMX and mountain-bike events.</p></section><section><h2>Read the calendar in Japan</h2><p>ScoreZaap's sport schedule uses Japan local calendar dates from the official overview. For an individual start time, check whether the source gives Japan time, India time or another timezone before converting. An early-morning Japan session can fall on the previous calendar date somewhere else.</p><p>The linked overview states that its information was correct as of August 28, 2026 and could change. A date window is useful for finding the sport, but it is not a substitute for a current day's order of play or start list.</p></section><section><h2>Follow the right section</h2><p>Use <a href="/asian-games/schedule">Sports &amp; schedule</a> for the programme, <a href="/asian-games/medals">Medals &amp; results</a> for checked event finishes, and <a href="/asian-games">Asian Games news</a> for original reports. The medal-results page labels its coverage as selected events, not a complete live country tally.</p><p>Team-event medals count by event. A three-person archery team winning one final contributes one country gold, not three. The athletes' personal medal counts answer a different question.</p></section>`, "sources": [["https://www.olympics.com/en/news/asian-games-2026-sports-schedule-la28-watch-live", "Olympics.com: sport-by-sport programme"], ["https://www.aichi-nagoya2026.org/sports/", "AINAGOC: sports programme"]] }];
var SZ_BLOG_CSS = `:root{color-scheme:dark;--bg:#070b12;--card:#101927;--line:#223047;--txt:#e8eef8;--dim:#a7b3c6;--lime:#a3e635;--blue:#38bdf8}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 15% 0%,#163128 0,transparent 40%),var(--bg);color:var(--txt);font-family:Inter,system-ui,sans-serif;line-height:1.7}a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--lime);outline-offset:5px}.blogwrap{max-width:1120px;margin:auto;padding:24px}.blognav{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:20px}.blognav .brand{font-size:26px;font-weight:800;letter-spacing:-1px;color:var(--txt);margin-right:auto}.brand span{color:var(--lime)}.blognav a{color:var(--txt);font-size:14px}.blognav a[aria-current]{color:var(--lime)}.eyebrow{color:var(--lime);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px}.hero{padding:54px 0 30px;max-width:820px}.hero h1{font-size:clamp(34px,5vw,62px);line-height:1.1;letter-spacing:-2px;margin:14px 0 20px}.hero p{color:var(--dim);font-size:18px;max-width:660px}.filterbar{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 28px;align-items:center}.filterbar button{cursor:pointer;color:var(--txt);background:var(--card);border:1px solid var(--line);border-radius:20px;padding:9px 16px;font:inherit;font-size:13px}.filterbar button.active{background:var(--lime);color:#142006;border-color:var(--lime)}.filterbar input{flex:1;min-width:180px;background:var(--card);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:12px;font:inherit;font-size:14px}.bloggrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.postcard{display:flex;flex-direction:column;padding:24px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(155deg,#162335,#0d1521);transition:border-color .2s}.postcard:hover{border-color:var(--lime)}.postcard h2{font-size:21px;line-height:1.3;margin:15px 0 12px}.postcard h2 a{color:var(--txt)}.postcard p{color:var(--dim);font-size:14px;flex:1}.postcard .meta{font-size:12px;color:var(--dim);margin:16px 0}.readlink{font-size:14px;color:var(--lime);font-weight:700}.article{max-width:760px;margin:38px auto}.crumbs{font-size:13px;color:var(--dim)}.article h1{font-size:clamp(32px,5vw,50px);letter-spacing:-1.4px;line-height:1.15;margin:18px 0}.article .dek{font-size:19px;color:var(--dim)}.article .meta{font-size:13px;color:var(--dim);padding:18px 0;border-bottom:1px solid var(--line)}.article h2{font-size:24px;line-height:1.3;margin-top:36px}.article p{font-size:17px}.article aside,.practical{padding:22px;border:1px solid var(--line);background:var(--card);border-radius:16px;margin:28px 0}.article aside h2,.practical h2{margin-top:0}.article li{margin:7px 0}.article a{overflow-wrap:anywhere}.related{margin:50px 0}.related h2{font-size:26px}.editorial{padding:24px;margin:32px 0;border:1px solid var(--line);border-radius:16px;color:var(--dim)}[hidden]{display:none!important}.empty{padding:24px;color:var(--dim)}@media(max-width:850px){.bloggrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.blogwrap{padding:18px}.bloggrid{grid-template-columns:1fr}.blognav{gap:14px}.blognav .brand{width:100%}.hero{padding-top:34px}.hero h1{letter-spacing:-1px}.article p{font-size:16px}}`;
function szBlogEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(szBlogEsc, "szBlogEsc");
function szBlogDateLabel(iso) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const parts = String(iso).split("-");
  return months[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
}
__name(szBlogDateLabel, "szBlogDateLabel");
__name2(szBlogEsc, "szBlogEsc");
function szBlogLd(o) {
  return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "<\/script>";
}
__name(szBlogLd, "szBlogLd");
__name2(szBlogLd, "szBlogLd");
function szBlogCard(p) {
  return '<article class="postcard" data-category="' + szBlogEsc(p.category) + '" data-search="' + szBlogEsc((p.title + " " + p.description).toLowerCase()) + '"><span class="eyebrow">' + szBlogEsc(p.category) + '</span><h2><a href="/blog/' + p.slug + '">' + szBlogEsc(p.title) + "</a></h2><p>" + szBlogEsc(p.description) + '</p><div class="meta">' + Math.max(2, Math.ceil(p.body.replace(/<[^>]*>/g, " ").split(/\s+/).length / 200)) + ' min read \xB7 September 30, 2026</div><a class="readlink" href="/blog/' + p.slug + '">Read guide &#8594;</a></article>';
}
__name(szBlogCard, "szBlogCard");
__name2(szBlogCard, "szBlogCard");
function szBlogPage(slug) {
  const p = SZ_BLOG_POSTS.find((p2) => p2.slug === slug);
  if (slug && !p) return null;
  const title = p ? p.title + " - ScoreZaap" : "Sports Rules & Live Score Guides - ScoreZaap";
  const desc = p ? p.description : "Original sports rules and live score guides: cricket scorecards, run rates, football cards, offside, tennis scoring, NBA clocks, baseball and F1.";
  const url = "https://scorezaap.tech/blog" + (p ? "/" + p.slug : "");
  const nav = '<nav class="blognav" aria-label="Main navigation"><a class="brand" href="/">&#9889; Score<span>Zaap</span></a><a href="/">Live scores</a><a href="/schedule">Schedule</a><a href="/rankings">Rankings</a><a href="/blog" aria-current="page">Blog</a><a href="/news">News</a></nav>';
  let content;
  if (p) {
    const related = SZ_BLOG_POSTS.filter((x) => x.slug !== p.slug && x.category === p.category).slice(0, 3);
    if (related.length < 3) related.push(...SZ_BLOG_POSTS.filter((x) => x.slug !== p.slug && !related.includes(x)).slice(0, 3 - related.length));
    content = '<article class="article"><div class="crumbs"><a href="/">Home</a> / <a href="/blog">Blog</a> / ' + szBlogEsc(p.category) + "</div><h1>" + szBlogEsc(p.title) + '</h1><p class="dek">' + szBlogEsc(desc) + '</p><div class="meta">By ScoreZaap \xB7 <time datetime="' + (p.modified || "2026-09-30") + '">' + szBlogDateLabel(p.modified || "2026-09-30") + '</time> \xB7 ' + Math.max(2, Math.ceil(p.body.replace(/<[^>]*>/g, " ").split(/\s+/).length / 200)) + " min read</div>" + p.body + "<aside><h2>Rule references</h2><p>The explanation is original. Rule details were checked against these primary sources; event-specific playing conditions can differ.</p><ul>" + p.sources.map(([u, n]) => '<li><a href="' + szBlogEsc(u) + '" rel="noopener">' + szBlogEsc(n) + "</a></li>").join("") + '</ul></aside><p><a href="/?tab=' + ({ Cricket: "cricket", Football: "football", Tennis: "tennis" }[p.category] || "all") + '">Follow live scores on ScoreZaap &#8594;</a></p></article><section class="related"><h2>Keep reading</h2><div class="bloggrid">' + related.map(szBlogCard).join("") + "</div></section>";
  } else {
    content = '<section class="hero"><div class="eyebrow">THE SCOREZAAP BLOG</div><h1>Know the game.<br>Read every score.</h1><p>Original guides to the numbers, rules and moments behind cricket, football, tennis, basketball, baseball and Formula 1. Start with a question. Leave with a clearer view of the match.</p><p style="font-size:14px">' + SZ_BLOG_POSTS.length + ' original guides \xB7 Examples explained, not invented match reports</p></section><div class="filterbar" role="group" aria-label="Filter guides">' + ["All", "Cricket", "Football", "Tennis", "Basketball", "Baseball", "Hockey", "Formula 1", "Asian Games", "Sports guides"].map((x, i) => '<button type="button" data-filter="' + x + '" class="' + (i ? "" : "active") + '" aria-pressed="' + !i + '">' + x + "</button>").join("") + '<input id="blogsearch" type="search" aria-label="Search guides" placeholder="Search guides..."></div><section aria-label="Sports guides" class="bloggrid">' + SZ_BLOG_POSTS.map(szBlogCard).join("") + '</section><p id="blogempty" class="empty" hidden>No guides match that search. Try another word or choose All.</p><section class="editorial"><h2>How we write</h2><p>These are original, evergreen explainers with worked examples and links to primary rulebooks. They are not copied news, betting tips or reports of matches we did not watch. We label teaching examples and distinguish general rules from event-specific conditions.</p><p>Found a mistake? <a href="/contact">Contact ScoreZaap</a>. For live match information, use <a href="/">Live scores</a>, <a href="/schedule">Schedule</a> and <a href="/archives">Archives</a>.</p></section><script>(function(){var f="All",q="";function run(){var count=0;document.querySelectorAll(".postcard").forEach(function(c){var ok=(f==="All"||c.dataset.category===f)&&c.dataset.search.includes(q);c.hidden=!ok;if(ok)count++});document.getElementById("blogempty").hidden=!!count}document.querySelectorAll("[data-filter]").forEach(function(b){b.onclick=function(){f=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(function(x){x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",x===b)});run()}});document.getElementById("blogsearch").oninput=function(e){q=e.target.value.trim().toLowerCase();run()}})();<\/script>';
  }
  const schema = p ? { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: desc, datePublished: p.published || "2026-09-30", dateModified: p.modified || p.published || "2026-09-30", author: { "@type": "Organization", name: "ScoreZaap", url: "https://scorezaap.tech/about" }, publisher: { "@type": "Organization", name: "ScoreZaap", url: "https://scorezaap.tech/" }, mainEntityOfPage: url, url, articleSection: p.category, inLanguage: "en" } : { "@context": "https://schema.org", "@type": "CollectionPage", name: "ScoreZaap Blog", url, description: desc, mainEntity: { "@type": "ItemList", itemListElement: SZ_BLOG_POSTS.map((p2, i) => ({ "@type": "ListItem", position: i + 1, name: p2.title, url: "https://scorezaap.tech/blog/" + p2.slug })) } };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://scorezaap.tech/" }, { "@type": "ListItem", position: 2, name: "Blog", item: "https://scorezaap.tech/blog" }, ...p ? [{ "@type": "ListItem", position: 3, name: p.title, item: url }] : []] };
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + szBlogEsc(title) + '</title><meta name="description" content="' + szBlogEsc(desc) + '"><meta name="keywords" content="' + szBlogEsc(p ? p.title + ", " + p.category + ", sports rules guide" : "sports guides, Asian Games sports, cricket rules, football rules") + '"><link rel="canonical" href="' + url + '"><meta property="og:type" content="' + (p ? "article" : "website") + '"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="' + szBlogEsc(title) + '"><meta property="og:description" content="' + szBlogEsc(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="https://scorezaap.tech/icon-512.png"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#070b12"><link rel="icon" href="/icon-192.png"><style>' + SZ_BLOG_CSS + "</style>" + szBlogLd(schema) + szBlogLd(crumbs) + '</head><body><main class="blogwrap">' + nav + content + "</main></body></html>";
}
__name(szBlogPage, "szBlogPage");
__name2(szBlogPage, "szBlogPage");
var SZ_DAILY_RESULT_SOURCES = [
  { sport: 'cricket', label: 'Cricket', key: 'cricket' },
  { sport: 'football', label: 'Football', key: 'football' },
  { sport: 'nba', label: 'NBA basketball', key: 'espn_nba' },
  { sport: 'mlb', label: 'MLB baseball', key: 'espn_mlb' },
  { sport: 'nhl', label: 'NHL hockey', key: 'espn_nhl' },
  { sport: 'tennis', label: 'Tennis', key: 'espn_tennis' },
  { sport: 'f1', label: 'Formula 1', key: 'espn_f1' }
];
async function szDailyEnsureSchema(env) {
  if (!env.DB) throw new Error('D1 unavailable for daily archive');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sz_daily_posts (slug TEXT PRIMARY KEY, published_date TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL, results_json TEXT NOT NULL, published_at TEXT NOT NULL, source_updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS sz_daily_posts_date_idx ON sz_daily_posts(published_date DESC)`).run();
}
__name(szDailyEnsureSchema, 'szDailyEnsureSchema');
function szDailyDate(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
__name(szDailyDate, 'szDailyDate');
function szDailyDateLabel(day) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'long' }).format(new Date(day + 'T12:00:00+05:30'));
}
__name(szDailyDateLabel, 'szDailyDateLabel');
function szDailyTimeLabel(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
__name(szDailyTimeLabel, 'szDailyTimeLabel');
async function szDailyGetPost(env, slug) {
  if (!env.DB || !/^sports-results-\d{4}-\d{2}-\d{2}$/.test(String(slug))) return null;
  try {
    const row = await env.DB.prepare(`SELECT slug,published_date,title,description,results_json,published_at,source_updated_at FROM sz_daily_posts WHERE slug=? LIMIT 1`).bind(slug).first();
    return row || null;
  } catch (e) { return null; }
}
__name(szDailyGetPost, 'szDailyGetPost');
async function szDailyListPosts(env, limit = 20, offset = 0) {
  if (!env.DB) return [];
  try {
    const n = Math.max(1, Math.min(50, Math.trunc(Number(limit) || 20)));
    const o = Math.max(0, Math.trunc(Number(offset) || 0));
    const r = await env.DB.prepare(`SELECT slug,published_date,title,description,published_at FROM sz_daily_posts ORDER BY published_date DESC LIMIT ? OFFSET ?`).bind(n, o).all();
    return Array.isArray(r?.results) ? r.results : [];
  } catch (e) { return []; }
}
__name(szDailyListPosts, 'szDailyListPosts');
async function szDailyPostCount(env) {
  if (!env.DB) return 0;
  try {
    const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sz_daily_posts`).first();
    return Math.max(0, Number(r?.n) || 0);
  } catch (e) { return 0; }
}
__name(szDailyPostCount, 'szDailyPostCount');
async function szDailySitemapPosts(env) {
  if (!env.DB) return [];
  try {
    const r = await env.DB.prepare(`SELECT slug FROM sz_daily_posts ORDER BY published_date DESC LIMIT 5000`).all();
    return Array.isArray(r?.results) ? r.results.filter((x) => /^sports-results-\d{4}-\d{2}-\d{2}$/.test(String(x.slug || ''))) : [];
  } catch (e) { return []; }
}
__name(szDailySitemapPosts, 'szDailySitemapPosts');
function szDailySlug(day) { return 'sports-results-' + day; }
__name(szDailySlug, 'szDailySlug');
async function szDailyPublish(env, nowMs = Date.now()) {
  await szDailyEnsureSchema(env);
  const day = szDailyDate(nowMs);
  const slug = szDailySlug(day);
  const prior = await szDailyGetPost(env, slug);
  if (prior) return { ...prior, created: false };
  if (!env.SPORTS_KV) throw new Error('Score snapshots unavailable');
  const sources = [];
  const sourceMatches = [];
  const stale = [];
  for (const spec of SZ_DAILY_RESULT_SOURCES) {
    const blob = await readKV(env, spec.key, { at: 0, matches: [] }).catch(() => null);
    const at = Number(blob?.at || 0);
    const age = nowMs - at;
    if (!Number.isFinite(at) || at <= 0 || age < -5 * 6e4 || age > 2 * 36e5 || !Array.isArray(blob?.matches)) {
      stale.push(spec.label);
      continue;
    }
    sources.push({ sport: spec.sport, label: spec.label, snapshot_at: new Date(at).toISOString() });
    for (const m of blob.matches) sourceMatches.push({ spec, match: m, snapshotAt: at });
  }
  if (sources.length < 3) throw new Error('Fewer than three fresh score feeds; daily roundup deferred');
  const priorPosts = await env.DB.prepare(`SELECT results_json FROM sz_daily_posts ORDER BY published_date DESC LIMIT 7`).all().catch(() => ({ results: [] }));
  const seen = new Set();
  for (const p of Array.isArray(priorPosts?.results) ? priorPosts.results : []) {
    try { for (const x of JSON.parse(p.results_json || '{}').results || []) if (x.id) seen.add(String(x.id)); } catch (e) {}
  }
  const earliest = nowMs - 72 * 36e5;
  const results = [];
  const localSeen = new Set();
  for (const { spec, match: m, snapshotAt } of sourceMatches) {
    const id = String(m?.id || '');
    const startAt = Date.parse(m?.start || '');
    if (!id || seen.has(id) || localSeen.has(id) || String(m?.status || '').toLowerCase() !== 'finished' || !Number.isFinite(startAt) || startAt < earliest || startAt > nowMs + 5 * 6e4) continue;
    if (!szMatchStatusConclusive(spec.sport, m.statusText)) continue;
    const scores = Array.isArray(m.scores) ? m.scores.map((s) => [s?.inning ? String(s.inning).slice(0, 40) + ': ' : '', String(s?.value || '').slice(0, 100)].join('')).filter((s) => s.replace(/^[^:]+:\s*/, '').trim()) : [];
    if (!scores.length && m.homeScore != null && m.awayScore != null) scores.push(String(m.homeScore).slice(0, 32) + ' - ' + String(m.awayScore).slice(0, 32));
    if (!scores.length) continue;
    localSeen.add(id);
    results.push({ id: id.slice(0, 140), sport: spec.sport, sport_label: spec.label, title: String(m.title || '').slice(0, 240), competition: String(m.series || m.matchType || '').slice(0, 140), status_text: String(m.statusText || 'Finished').slice(0, 180), start: new Date(startAt).toISOString(), scores: scores.slice(0, 4), snapshot_at: new Date(snapshotAt).toISOString() });
  }
  results.sort((a, b) => Date.parse(b.start) - Date.parse(a.start) || a.sport.localeCompare(b.sport));
  const labels = sources.map((x) => x.label);
  const dateLabel = szDailyDateLabel(day);
  const title = 'Sports Results Roundup: ' + dateLabel + ' | ScoreZaap';
  const sports = [...new Set(results.map((x) => x.sport_label))];
  const description = results.length ? ('Final scores from ' + results.length + ' recent matches across ' + (sports.length ? sports.join(', ') : labels.join(', ')) + ', taken from fresh ScoreZaap score snapshots.').slice(0, 158) : ('A fresh multi-sport ScoreZaap snapshot for ' + dateLabel + ' found no new completed results to add.').slice(0, 158);
  const publishedAt = new Date(nowMs).toISOString();
  const sourceUpdatedAt = new Date(Math.max(...sources.map((x) => Date.parse(x.snapshot_at)))).toISOString();
  const payload = { results, sources, excluded_stale_feeds: stale };
  await env.DB.prepare(`INSERT OR IGNORE INTO sz_daily_posts (slug,published_date,title,description,results_json,published_at,source_updated_at) VALUES (?,?,?,?,?,?,?)`).bind(slug, day, title, description, JSON.stringify(payload), publishedAt, sourceUpdatedAt).run();
  const row = await szDailyGetPost(env, slug);
  if (!row) throw new Error('Daily result post was not persisted');
  return { ...row, created: row.published_at === publishedAt };
}
__name(szDailyPublish, 'szDailyPublish');
function szDailyPostPage(post) {
  let data;
  try { data = JSON.parse(post.results_json || '{}'); } catch (e) { return null; }
  const results = Array.isArray(data.results) ? data.results : [];
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const day = String(post.published_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^sports-results-\d{4}-\d{2}-\d{2}$/.test(String(post.slug || ''))) return null;
  const published = Date.parse(post.published_at || day);
  if (!Number.isFinite(published)) return null;
  const title = String(post.title || '').slice(0, 150);
  const description = String(post.description || '').slice(0, 158);
  const url = 'https://scorezaap.tech/blog/' + post.slug;
  const groups = new Map();
  for (const item of results) {
    if (!item || !SZ_DAILY_RESULT_SOURCES.some((x) => x.sport === item.sport) || !item.id || !item.title) continue;
    const label = String(item.sport_label || item.sport).slice(0, 40);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  let body = '<section><h2>How this roundup was made</h2><p>This edition lists newly observed matches marked finished in fresh ScoreZaap score snapshots, with event starts limited to the previous 72 hours. Results already published in recent roundups are not repeated. It repeats recorded scores and status; it does not add match commentary or infer facts beyond those records. The feed is a snapshot and providers may correct scores.</p><p>Fresh feed snapshots included: ' + (sources.length ? sources.map((x) => szBlogEsc(x.label) + ' (' + szBlogEsc(szDailyTimeLabel(x.snapshot_at)) + ')').join('; ') : 'none') + '.</p></section>';
  if (!groups.size) {
    body += '<section><h2>No new final scores in this snapshot</h2><p>No new completed results were available to add from the fresh ScoreZaap score feeds at publication time. Earlier results are kept in their own dated posts rather than repeated here.</p></section>';
  } else {
    for (const [label, items] of groups) {
      body += '<section><h2>' + szBlogEsc(label) + ' results</h2><ul>' + items.map((x) => {
        const matchUrl = '/match/' + encodeURIComponent(x.sport) + '/' + encodeURIComponent(x.id);
        const score = x.scores.map((s) => szBlogEsc(s)).join(' · ');
        const detail = [x.competition, x.status_text].filter(Boolean).map((s) => szBlogEsc(s)).join(' · ');
        return '<li><a href="' + szBlogEsc(matchUrl) + '">' + szBlogEsc(x.title) + '</a><p><strong>' + score + '</strong>' + (detail ? ' <span>· ' + detail + '</span>' : '') + '</p><time datetime="' + szBlogEsc(x.start) + '">' + szBlogEsc(szDailyTimeLabel(x.start)) + ' IST</time></li>';
      }).join('') + '</ul></section>';
    }
  }
  if (Array.isArray(data.excluded_stale_feeds) && data.excluded_stale_feeds.length) body += '<section><h2>Feed coverage</h2><p>These feeds did not have a sufficiently recent snapshot and were left out: ' + data.excluded_stale_feeds.map(szBlogEsc).join(', ') + '.</p></section>';
  body += '<p><a href="/">See the live ScoreZaap scoreboards</a></p>';
  const dateLabel = szDailyDateLabel(day);
  const schema = { ['@context']: 'https://schema.org', ['@type']: 'BlogPosting', headline: title, description, datePublished: new Date(published).toISOString(), dateModified: new Date(published).toISOString(), author: { ['@type']: 'Organization', name: 'ScoreZaap', url: 'https://scorezaap.tech/about' }, publisher: { ['@type']: 'Organization', name: 'ScoreZaap', url: 'https://scorezaap.tech/' }, mainEntityOfPage: url, url, articleSection: 'Sports Results', inLanguage: 'en', keywords: 'daily sports results, ' + [...new Set(sources.map((x) => String(x.label).toLowerCase()))].join(', ') };
  const crumbs = { ['@context']: 'https://schema.org', ['@type']: 'BreadcrumbList', itemListElement: [{ ['@type']: 'ListItem', position: 1, name: 'Home', item: 'https://scorezaap.tech/' }, { ['@type']: 'ListItem', position: 2, name: 'Blog', item: 'https://scorezaap.tech/blog' }, { ['@type']: 'ListItem', position: 3, name: title, item: url }] };
  const nav = '<nav class="blognav" aria-label="Main navigation"><a class="brand" href="/">&#9889; Score<span>Zaap</span></a><a href="/">Live scores</a><a href="/schedule">Schedule</a><a href="/rankings">Rankings</a><a href="/blog" aria-current="page">Blog</a><a href="/news">News</a></nav>';
  const estimate = Math.max(2, Math.ceil(body.replace(/<[^>]*>/g, ' ').split(/\s+/).length / 200));
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + szBlogEsc(title) + '</title><meta name="description" content="' + szBlogEsc(description) + '"><meta name="keywords" content="' + szBlogEsc(schema.keywords) + '"><link rel="canonical" href="' + url + '"><meta property="og:type" content="article"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="' + szBlogEsc(title) + '"><meta property="og:description" content="' + szBlogEsc(description) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="https://scorezaap.tech/icon-512.png"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#070b12"><link rel="icon" href="/icon-192.png"><style>' + SZ_BLOG_CSS + '</style>' + szBlogLd(schema) + szBlogLd(crumbs) + '</head><body><main class="blogwrap">' + nav + '<article class="article"><div class="crumbs"><a href="/">Home</a> / <a href="/blog">Blog</a> / Sports Results</div><h1>' + szBlogEsc(title) + '</h1><p class="dek">' + szBlogEsc(description) + '</p><div class="meta">By ScoreZaap · <time datetime="' + day + '">' + szBlogEsc(dateLabel) + '</time> · ' + estimate + ' min read</div>' + body + '</article><section class="related"><h2>Daily results archive</h2><p><a href="/blog">Browse all daily results and sports guides</a></p></section></main></body></html>';
}
__name(szDailyPostPage, 'szDailyPostPage');
function szDailyArchiveHtml(posts, page, total, pageSize) {
  if (!posts.length && !total) return '';
  const cards = posts.map((p) => '<article class="daily-archive-card"><span class="eyebrow">DAILY SPORTS RESULTS</span><h2><a href="/blog/' + szBlogEsc(p.slug) + '">' + szBlogEsc(p.title) + '</a></h2><p>' + szBlogEsc(p.description) + '</p><div class="meta"><time datetime="' + szBlogEsc(p.published_date) + '">' + szBlogEsc(szDailyDateLabel(p.published_date)) + '</time></div></article>').join('');
  const pages = Math.ceil(total / pageSize);
  const nav = pages > 1 ? '<nav aria-label="Daily results archive pages">' + (page > 1 ? '<a href="/blog?daily_page=' + (page - 1) + '">Newer posts</a> ' : '') + 'Page ' + page + ' of ' + pages + (page < pages ? ' <a href="/blog?daily_page=' + (page + 1) + '">Older posts</a>' : '') + '</nav>' : '';
  return '<style>.daily-archive-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.daily-archive-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}.daily-archive-card h2{margin:6px 0;font-size:20px}.daily-archive-card p{color:var(--dim);margin:8px 0}.daily-archive-card .meta{color:var(--dim);font-size:13px}</style><section class="daily-results-archive"><div class="hero"><div class="eyebrow">DAILY ARCHIVE</div><h2>Sports results, one roundup per day</h2><p>Fresh, dated results from ScoreZaap score snapshots. Older roundups stay available here.</p></div><div class="daily-archive-grid">' + cards + '</div>' + nav + '</section>';
}
__name(szDailyArchiveHtml, 'szDailyArchiveHtml');

var SZ_MATCH_POST_SOURCES = [
  { sport: 'cricket', label: 'Cricket', key: 'cricket' },
  { sport: 'football', label: 'Football', key: 'football' },
  { sport: 'nba', label: 'NBA basketball', key: 'espn_nba' },
  { sport: 'mlb', label: 'MLB baseball', key: 'espn_mlb' },
  { sport: 'nhl', label: 'NHL hockey', key: 'espn_nhl' },
  { sport: 'tennis', label: 'Tennis', key: 'espn_tennis' },
  { sport: 'f1', label: 'Formula 1', key: 'espn_f1' }
];
async function szMatchEnsureSchema(env) {
  if (!env.DB) throw new Error('D1 unavailable for match article archive');
  await szAutoSchema(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sz_match_posts (match_id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sport TEXT NOT NULL, published_date TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, result_json TEXT NOT NULL, published_at TEXT NOT NULL, source_updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS sz_match_posts_date_idx ON sz_match_posts(published_date DESC, published_at DESC)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sz_match_watch (match_id TEXT PRIMARY KEY, sport TEXT NOT NULL, status TEXT NOT NULL, event_start TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
}
__name(szMatchEnsureSchema, 'szMatchEnsureSchema');
function szMatchSlug(day, id) {
  const hex = Array.from(new TextEncoder().encode(String(id))).map((x) => x.toString(16).padStart(2, '0')).join('');
  return 'match-result-' + day + '-' + hex;
}
__name(szMatchSlug, 'szMatchSlug');
function szMatchDate(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
__name(szMatchDate, 'szMatchDate');
function szMatchDateLabel(day) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'long' }).format(new Date(day + 'T12:00:00+05:30'));
}
__name(szMatchDateLabel, 'szMatchDateLabel');
function szMatchDateTime(iso) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d) : '';
}
__name(szMatchDateTime, 'szMatchDateTime');
// A finished flag alone is not proof of a result: cricket feeds can flip a
// match to finished during an innings break or a data glitch, which once made
// this job publish a mid-match score as the final. Require result-like wording
// for cricket, and never publish break/toss/session text for any sport.
var SZ_MATCH_INPROGRESS_TEXT = /\bbreak\b|stumps|\btoss\b|opt(?:ed)?\s+to\b|trails?\s+by|leads?\s+by|needs?\s+\d+\s+runs?|session|\bday\s+\d|\brain\b|delay(?:ed)?|in\s+progress|yet\s+to\s+bat/i;
var SZ_MATCH_RESULT_TEXT = /won|wins?\s+by|drawn|draw|tied|\btie\b|no\s+result|abandon|concede|walkover|forfeit|final|full[\s-]?time|\bft\b|complete|finished|ended/i;
function szMatchStatusConclusive(sport, statusText) {
  const t = String(statusText || '').trim();
  if (SZ_MATCH_INPROGRESS_TEXT.test(t)) return false;
  if (!t) return sport !== 'cricket';
  if (sport === 'cricket') return SZ_MATCH_RESULT_TEXT.test(t);
  return true;
}
__name(szMatchStatusConclusive, 'szMatchStatusConclusive');
function szMatchFacts(spec, match, snapshotAt, nowMs) {
  const id = String(match?.id || '');
  const startAt = Date.parse(match?.start || '');
  if (!id || id.length > 140 || String(match?.status || '').toLowerCase() !== 'finished' || !Number.isFinite(startAt) || startAt > nowMs + 5 * 6e4) return null;
  const title = String(match.title || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (title.length < 6) return null;
  const scores = Array.isArray(match.scores) ? match.scores.map((s) => ({ inning: String(s?.inning || '').slice(0, 50), value: String(s?.value || '').replace(/\s+/g, ' ').trim().slice(0, 120) })).filter((s) => s.value && !/^(?:-|—|n\/a|none)$/i.test(s.value)) : [];
  if (!scores.length && match.homeScore != null && match.awayScore != null) scores.push({ inning: '', value: String(match.homeScore).slice(0, 60) + ' - ' + String(match.awayScore).slice(0, 60) });
  if (!scores.length && Array.isArray(match.resultRows)) scores.push(...match.resultRows.filter((r) => Number.isInteger(Number(r?.place)) && r?.driver).slice(0, 5).map((r) => ({ inning: 'P' + Number(r.place), value: String(r.driver).replace(/\s+/g, ' ').trim().slice(0, 80) })));
  if (!scores.length) return null;
  if (!szMatchStatusConclusive(spec.sport, match.statusText)) return null;
  const finalStatus = String(match.statusText || 'Finished').replace(/\s+/g, ' ').trim().slice(0, 180);
  const snapshotMs = Number(snapshotAt);
  if (!Number.isFinite(snapshotMs) || nowMs - snapshotMs > 60 * 6e4 || snapshotMs > nowMs + 5 * 6e4) return null;
  return { id, key: spec.sport + ':' + id, sport: spec.sport, sport_label: spec.label, title, competition: String(match.series || match.matchType || '').replace(/\s+/g, ' ').trim().slice(0, 140), final_status: finalStatus, scores, start: new Date(startAt).toISOString(), source_snapshot: new Date(snapshotMs).toISOString(), venue: String(match.venue || '').replace(/\s+/g, ' ').trim().slice(0, 140) };
}
__name(szMatchFacts, 'szMatchFacts');
async function szMatchGetPost(env, id) {
  try { return await env.DB.prepare(`SELECT match_id,slug,sport,published_date,title,description,result_json,published_at,source_updated_at FROM sz_match_posts WHERE match_id=? LIMIT 1`).bind(String(id)).first(); }
  catch (e) { return null; }
}
__name(szMatchGetPost, 'szMatchGetPost');
async function szMatchGetPostBySlug(env, slug) {
  if (!/^match-result-\d{4}-\d{2}-\d{2}-[0-9a-f]{2,280}$/.test(String(slug))) return null;
  try { return await env.DB.prepare(`SELECT match_id,slug,sport,published_date,title,description,result_json,published_at,source_updated_at FROM sz_match_posts WHERE slug=? LIMIT 1`).bind(String(slug)).first(); }
  catch (e) { return null; }
}
__name(szMatchGetPostBySlug, 'szMatchGetPostBySlug');
async function szMatchCreatePost(env, facts, nowMs) {
  const day = szMatchDate(nowMs);
  const slug = szMatchSlug(day, facts.key);
  const titleBase = (facts.title + ' Result').replace(/\s+/g, ' ').trim().slice(0, 112);
  const title = titleBase + ' - ' + szMatchDateLabel(day) + ' | ScoreZaap';
  const scoreText = facts.scores.map((x) => [x.inning, x.value].filter(Boolean).join(': ')).join('; ');
  const description = (facts.sport_label + ' final: ' + scoreText + '. ' + facts.final_status + '. Recorded from ScoreZaap’s fresh scoreboard snapshot.').slice(0, 158);
  const result = { ...facts };
  const publishedAt = new Date(nowMs).toISOString();
  const insert = await env.DB.prepare(`INSERT OR IGNORE INTO sz_match_posts (match_id,slug,sport,published_date,title,description,result_json,published_at,source_updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(facts.key, slug, facts.sport, day, title, description, JSON.stringify(result), publishedAt, facts.source_snapshot).run();
  const row = await szMatchGetPost(env, facts.key);
  if (!row) throw new Error('Match article did not persist');
  return { ...row, created: Number(insert?.meta?.changes || 0) > 0 };
}
__name(szMatchCreatePost, 'szMatchCreatePost');
async function szMatchReconcilePost(env, facts, post) {
  let old;
  try { old = JSON.parse(post.result_json || '{}'); } catch (e) { return false; }
  if (String(old.final_status || '') === String(facts.final_status || '') && JSON.stringify(old.scores || []) === JSON.stringify(facts.scores || [])) return false;
  const scoreText = facts.scores.map((x) => [x.inning, x.value].filter(Boolean).join(': ')).join('; ');
  const description = (facts.sport_label + ' final: ' + scoreText + '. ' + facts.final_status + '. Recorded from ScoreZaap’s fresh scoreboard snapshot.').slice(0, 158);
  await env.DB.prepare(`UPDATE sz_match_posts SET description=?, result_json=?, source_updated_at=? WHERE match_id=?`).bind(description, JSON.stringify({ ...facts }), facts.source_snapshot, facts.key).run();
  console.log('match article reconciled', facts.key);
  return true;
}
__name(szMatchReconcilePost, 'szMatchReconcilePost');

function szMatchArticlePage(post) {
  let facts;
  try { facts = JSON.parse(post.result_json || '{}'); } catch (e) { return null; }
  if (!/^match-result-\d{4}-\d{2}-\d{2}-[0-9a-f]{2,280}$/.test(String(post.slug || '')) || facts.key !== post.match_id || facts.key !== facts.sport + ':' + facts.id || !SZ_MATCH_POST_SOURCES.some((x) => x.sport === facts.sport)) return null;
  const day = String(post.published_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const url = 'https://scorezaap.tech/blog/' + post.slug;
  const dateLabel = szMatchDateLabel(day);
  const scoreRows = Array.isArray(facts.scores) ? facts.scores.filter((s) => s && s.value).slice(0, 4) : [];
  if (!scoreRows.length) return null;
  const scoreMarkup = scoreRows.map((x) => '<li>' + (x.inning ? '<strong>' + szBlogEsc(x.inning) + ':</strong> ' : '') + '<strong>' + szBlogEsc(x.value) + '</strong></li>').join('');
  const body = '<section><h2>Recorded result</h2><p>This post records the match as finished in the ScoreZaap ' + szBlogEsc(facts.sport_label) + ' scoreboard snapshot. It repeats the recorded status and score only; it adds no match commentary or inferred facts. Providers may correct a result later.</p><ul>' + scoreMarkup + '</ul><p><strong>Final status:</strong> ' + szBlogEsc(facts.final_status || 'Finished') + '</p>' + (facts.competition ? '<p><strong>Competition:</strong> ' + szBlogEsc(facts.competition) + '</p>' : '') + (facts.venue ? '<p><strong>Venue:</strong> ' + szBlogEsc(facts.venue) + '</p>' : '') + '<p><strong>Match started:</strong> ' + szBlogEsc(szMatchDateTime(facts.start)) + ' IST<br><strong>Score snapshot:</strong> ' + szBlogEsc(szMatchDateTime(facts.source_snapshot)) + ' IST</p></section><section><h2>Source</h2><p>ScoreZaap ' + szBlogEsc(facts.sport_label) + ' scoreboard record, match ID ' + szBlogEsc(facts.id) + '. <a href="/">Open current scoreboards</a>.</p></section>';
  const schema = { ['@context']: 'https://schema.org', ['@type']: 'BlogPosting', headline: String(post.title).slice(0, 150), description: String(post.description).slice(0, 158), datePublished: new Date(post.published_at).toISOString(), dateModified: new Date(post.published_at).toISOString(), author: { ['@type']: 'Organization', name: 'ScoreZaap', url: 'https://scorezaap.tech/about' }, publisher: { ['@type']: 'Organization', name: 'ScoreZaap', url: 'https://scorezaap.tech/' }, mainEntityOfPage: url, url, articleSection: facts.sport_label, inLanguage: 'en', keywords: facts.sport_label.toLowerCase() + ' final score, match result' };
  const crumbs = { ['@context']: 'https://schema.org', ['@type']: 'BreadcrumbList', itemListElement: [{ ['@type']: 'ListItem', position: 1, name: 'Home', item: 'https://scorezaap.tech/' }, { ['@type']: 'ListItem', position: 2, name: 'Blog', item: 'https://scorezaap.tech/blog' }, { ['@type']: 'ListItem', position: 3, name: String(post.title), item: url }] };
  const nav = '<nav class="blognav" aria-label="Main navigation"><a class="brand" href="/">&#9889; Score<span>Zaap</span></a><a href="/">Live scores</a><a href="/schedule">Schedule</a><a href="/rankings">Rankings</a><a href="/blog" aria-current="page">Blog</a><a href="/news">News</a></nav>';
  const minutes = Math.max(2, Math.ceil(body.replace(/<[^>]*>/g, ' ').split(/\s+/).length / 200));
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + szBlogEsc(schema.headline) + '</title><meta name="description" content="' + szBlogEsc(schema.description) + '"><meta name="keywords" content="' + szBlogEsc(schema.keywords) + '"><link rel="canonical" href="' + url + '"><meta property="og:type" content="article"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="' + szBlogEsc(schema.headline) + '"><meta property="og:description" content="' + szBlogEsc(schema.description) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="https://scorezaap.tech/icon-512.png"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#070b12"><link rel="icon" href="/icon-192.png"><style>' + SZ_BLOG_CSS + '</style>' + szBlogLd(schema) + szBlogLd(crumbs) + '</head><body><main class="blogwrap">' + nav + '<article class="article"><div class="crumbs"><a href="/">Home</a> / <a href="/blog">Blog</a> / ' + szBlogEsc(facts.sport_label) + '</div><h1>' + szBlogEsc(schema.headline) + '</h1><p class="dek">' + szBlogEsc(schema.description) + '</p><div class="meta">By ScoreZaap · <time datetime="' + day + '">' + szBlogEsc(dateLabel) + '</time> · ' + minutes + ' min read</div>' + body + '</article><section class="related"><h2>Daily results roundup</h2><p><a href="/blog">See the daily roundup and results archive</a></p></section></main></body></html>';
}
__name(szMatchArticlePage, 'szMatchArticlePage');
async function szMatchCount(env) {
  try { const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sz_match_posts`).first(); return Math.max(0, Number(r?.n) || 0); }
  catch (e) { return 0; }
}
__name(szMatchCount, 'szMatchCount');
async function szMatchListPosts(env, limit = 20, offset = 0) {
  try {
    const n = Math.max(1, Math.min(50, Math.trunc(Number(limit) || 20)));
    const o = Math.max(0, Math.trunc(Number(offset) || 0));
    const r = await env.DB.prepare(`SELECT match_id,slug,sport,published_date,title,description,published_at FROM sz_match_posts ORDER BY published_at DESC LIMIT ? OFFSET ?`).bind(n, o).all();
    return Array.isArray(r?.results) ? r.results : [];
  } catch (e) { return []; }
}
__name(szMatchListPosts, 'szMatchListPosts');
async function szMatchSitemapPosts(env) {
  try {
    const r = await env.DB.prepare(`SELECT slug FROM sz_match_posts ORDER BY published_at DESC LIMIT 5000`).all();
    return Array.isArray(r?.results) ? r.results.filter((x) => /^match-result-\d{4}-\d{2}-\d{2}-[0-9a-f]{2,280}$/.test(String(x.slug || ''))) : [];
  } catch (e) { return []; }
}
__name(szMatchSitemapPosts, 'szMatchSitemapPosts');
async function szMatchWatchCandidates(env, nowMs, initial) {
  await szMatchEnsureSchema(env);
  const feeds = [];
  const matches = [];
  const sourceStale = [];
  for (const spec of SZ_MATCH_POST_SOURCES) {
    const blob = await readKV(env, spec.key, { at: 0, matches: [] }).catch(() => null);
    const at = Number(blob?.at || 0);
    if (!Array.isArray(blob?.matches) || !at || nowMs - at > 2 * 36e5 || at > nowMs + 5 * 6e4) { sourceStale.push(spec.sport); continue; }
    feeds.push({ spec, at, matches: blob.matches });
    for (const match of blob.matches) matches.push({ spec, match, at });
  }
  const statesRes = await env.DB.prepare(`SELECT match_id,sport,status,event_start FROM sz_match_watch LIMIT 5000`).all();
  const states = new Map((Array.isArray(statesRes?.results) ? statesRes.results : []).map((x) => [String(x.match_id), x]));
  const initialMeta = await szAutoGet(env, 'match_post_watch_v1');
  const bootstrap = !initialMeta && states.size === 0;
  const valid = [];
  for (const entry of matches) {
    const id = String(entry.match?.id || '');
    if (!id || id.length > 140) continue;
    const status = String(entry.match?.status || '').toLowerCase();
    const start = Date.parse(entry.match?.start || '');
    if (!Number.isFinite(start) || start > nowMs + 5 * 6e4) continue;
    const key = entry.spec.sport + ':' + id;
    const before = states.get(key);
    const watchCandidate = status === 'finished' && ((!before && start >= nowMs - 24 * 36e5) || (before && before.status !== 'finished'));
    const facts = watchCandidate ? szMatchFacts(entry.spec, entry.match, entry.at, nowMs) : null;
    valid.push({ id, key, spec: entry.spec, status, start, entry, before, watchCandidate, candidate: !!facts, facts });
  }
  return { valid, states, feeds, sourceStale, bootstrap };
}
__name(szMatchWatchCandidates, 'szMatchWatchCandidates');
async function szMatchPersistStates(env, rows, nowMs) {
  const seen = new Set();
  const now = new Date(nowMs).toISOString();
  const stmts = [];
  for (const row of rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    stmts.push(env.DB.prepare(`INSERT INTO sz_match_watch (match_id,sport,status,event_start,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(match_id) DO UPDATE SET sport=excluded.sport,status=excluded.status,event_start=excluded.event_start,updated_at=excluded.updated_at WHERE status<>excluded.status`).bind(row.key, row.spec.sport, row.status, new Date(row.start).toISOString(), now));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}
__name(szMatchPersistStates, 'szMatchPersistStates');
async function szMatchRun(env, nowMs = Date.now()) {
  const work = await szMatchWatchCandidates(env, nowMs, false);
  const { valid, states, sourceStale, bootstrap } = work;
  const result = { created: 0, sampleSlug: null, staleFeeds: sourceStale, pending: 0, initialized: false };
  if (bootstrap) {
    const sample = valid.filter((x) => x.candidate && x.facts).sort((a, b) => b.start - a.start)[0];
    if (sample) {
      const post = await szMatchCreatePost(env, sample.facts, nowMs);
      if (post.created) { result.created = 1; result.sampleSlug = post.slug; }
    }
    await szMatchPersistStates(env, valid, nowMs);
    await szAutoPut(env, 'match_post_watch_v1', { initialized_at: new Date(nowMs).toISOString(), sampled_match: result.sampleSlug });
    result.initialized = true;
    return result;
  }
  const pending = valid.filter((x) => x.candidate && x.facts).sort((a, b) => a.start - b.start);
  result.pending = pending.length;
  const process = pending.slice(0, 12);
  const completed = new Set();
  for (const item of process) {
    try {
      const post = await szMatchCreatePost(env, item.facts, nowMs);
      completed.add(item.key);
      if (post.created) result.created++;
      if (!post.created) {
        try { if (await szMatchReconcilePost(env, item.facts, post)) result.reconciled = (result.reconciled || 0) + 1; }
        catch (e) { console.log('match article reconcile failed', String(e.message || e).slice(0, 120)); }
      }
      if (!result.sampleSlug && post.created) result.sampleSlug = post.slug;
    } catch (e) { console.log('match article write failed', String(e.message || e).slice(0, 120)); }
  }
  // Verify recorded posts against the latest finished readings and repair any
  // published from a bad snapshot (watch transitions alone miss recoveries).
  for (const item of valid) {
    if (item.status !== 'finished' || completed.has(item.key)) continue;
    const facts = szMatchFacts(item.spec, item.entry.match, item.entry.at, nowMs);
    if (!facts) continue;
    try {
      const post = await szMatchGetPost(env, facts.key);
      if (post && (await szMatchReconcilePost(env, facts, post))) result.reconciled = (result.reconciled || 0) + 1;
    } catch (e) { console.log('match article reconcile failed', String(e.message || e).slice(0, 120)); }
  }
  const updateRows = valid.filter((x) => (!x.before || x.before.status !== x.status) && (!x.watchCandidate || completed.has(x.key)));
  await szMatchPersistStates(env, updateRows, nowMs);
  await szAutoPut(env, 'match_post_watch_v1', { initialized_at: new Date(nowMs).toISOString(), last_run: new Date(nowMs).toISOString() });
  return result;
}
__name(szMatchRun, 'szMatchRun');
function szMatchArchiveHtml(posts, page, total, pageSize) {
  if (!posts.length && !total) return '';
  const cards = posts.map((p) => '<article class="daily-archive-card"><span class="eyebrow">' + szBlogEsc(String(p.sport || 'sports').toUpperCase()) + ' MATCH RESULT</span><h2><a href="/blog/' + szBlogEsc(p.slug) + '">' + szBlogEsc(p.title) + '</a></h2><p>' + szBlogEsc(p.description) + '</p><div class="meta"><time datetime="' + szBlogEsc(p.published_date) + '">' + szBlogEsc(szMatchDateLabel(p.published_date)) + '</time></div></article>').join('');
  const pages = Math.ceil(total / pageSize);
  const nav = pages > 1 ? '<nav aria-label="Match results archive pages">' + (page > 1 ? '<a href="/blog?match_page=' + (page - 1) + '">Newer match posts</a> ' : '') + 'Page ' + page + ' of ' + pages + (page < pages ? ' <a href="/blog?match_page=' + (page + 1) + '">Older match posts</a>' : '') + '</nav>' : '';
  return '<section class="match-results-archive"><div class="hero"><div class="eyebrow">MATCH-BY-MATCH ARCHIVE</div><h2>One results post per match</h2><p>Results recorded as finished by fresh ScoreZaap score feeds. Each match gets one permanent dated post.</p></div><div class="daily-archive-grid">' + cards + '</div>' + nav + '</section>';
}
__name(szMatchArchiveHtml, 'szMatchArchiveHtml');

var SZ_SPORTS = { cricket: ["Cricket", "cricket"], football: ["Football", "football"], nba: ["NBA basketball", "espn_nba"], mlb: ["MLB baseball", "espn_mlb"], nhl: ["NHL hockey", "espn_nhl"], tennis: ["Tennis", "espn_tennis"], f1: ["Formula 1", "espn_f1"] };
async function szSportPage(sport, env) {
  const info = SZ_SPORTS[sport];
  if (!info) return null;
  const blob = await readKV(env, info[1], { matches: [] });
  const matches = Array.isArray(blob.matches) ? blob.matches : [];
  const title = info[0] + " Live Scores, Fixtures & Results - ScoreZaap";
  const desc = "Follow " + info[0] + " live scores, fixtures, results and sports news on ScoreZaap. " + { cricket: "Read scorecards, overs and run rates.", football: "Follow goals, match status and football results.", nba: "Read NBA scores, periods and overtime.", mlb: "Follow MLB scores and baseball results.", nhl: "Follow NHL scores and hockey results.", tennis: "Read tennis scores, sets and tie-breaks.", f1: "Follow Formula 1 results and race timing." }[sport];
  const url = "https://scorezaap.tech/sports/" + sport;
  const lists = matches.slice(0, 50).map((m) => {
    const names = m.title || (m.home?.name || "") + " vs " + (m.away?.name || "");
    const href = "/match/" + sport + "/" + encodeURIComponent(m.id);
    return '<li style="padding:14px 0;border-bottom:1px solid var(--line)"><a href="' + href + '">' + szBlogEsc(names) + '</a><br><span style="color:var(--dim)">' + szBlogEsc(m.statusText || m.status || "") + "</span></li>";
  }).join("");
  const category = { cricket: "Cricket", football: "Football", tennis: "Tennis", nba: "Basketball", mlb: "Baseball", nhl: "Hockey", f1: "Formula 1" }[sport];
  const latest = SZ_NEWS_POSTS.filter((p) => p.category === category).slice(0, 3);
  const newsLinks = latest.length ? '<section class="related"><h2>Latest ' + info[0] + ' news</h2><div class="bloggrid">' + latest.map(szNewsCard).join("") + "</div></section>" : "";
  const guides = SZ_BLOG_POSTS.filter((p) => p.category === category).slice(0, 3);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><meta name="description" content="' + desc + '"><link rel="canonical" href="' + url + '"><meta property="og:title" content="' + title + '"><meta property="og:description" content="' + desc + '"><meta property="og:url" content="' + url + '"><meta name="twitter:card" content="summary"><style>' + SZ_BLOG_CSS + "</style>" + szBlogLd({ "@context": "https://schema.org", "@type": "CollectionPage", name: title, url, description: desc }) + '</head><body><main class="blogwrap"><nav class="blognav" aria-label="Main navigation"><a href="/" class="brand">Score<span>Zaap</span></a><a href="/">Live scores</a><a href="/schedule">Schedule</a><a href="/blog">Blog</a><a href="/news">News</a></nav><section class="hero"><div class="eyebrow">' + info[0] + "</div><h1>" + info[0] + ' scores</h1><p>Fixtures, match status and results in one view. The list below is a snapshot; use the live view for automatic updates.</p><a class="readlink" href="/?tab=' + sport + '">Open live ' + info[0] + " scores &#8594;</a></section><section><h2>Matches</h2>" + (lists ? '<ul style="list-style:none;padding:0">' + lists + "</ul>" : "<p>No matches are available in this snapshot. Check the live view or return later.</p>") + '</section><section class="related"><h2>Explore every sport</h2><p>' + Object.entries(SZ_SPORTS).map(([k, v]) => '<a href="/sports/' + k + '" style="display:inline-block;margin:8px 18px 8px 0">' + v[0] + "</a>").join("") + "</p></section>" + (guides.length ? '<section class="related"><h2>Understand the score</h2><div class="bloggrid">' + guides.map(szBlogCard).join("") + "</div></section>" : "") + newsLinks + "</main></body></html>";
}
__name(szSportPage, "szSportPage");
__name2(szSportPage, "szSportPage");
var SZ_NEWS_POSTS = [{ "slug": "uefa-club-benefits-nations-league-payment", "category": "Football", "title": "UEFA announces about \u20AC31.5m in Nations League club payments", "description": "The payments cover player release for the 2024/25 competition under the Club Benefits Programme.", "body": "<p>UEFA says it will distribute approximately \u20AC31.5 million this week to clubs that released players for the 2024/25 Nations League. The announcement is part of the current Club Benefits Programme cycle.</p><p>The September 29 announcement says the programme benefits 611 clubs across UEFA member associations, including amateur clubs. The payment is the first under that cycle and forms part of a \u20AC104 million allocation for the 2024/25 and 2026/27 Nations League and the EURO 2028 qualifying competition.</p><p>UEFA lists \u20AC3,845 for each eligible player appearance on a national-team match sheet in Nations League and European Qualifiers fixtures. It separately describes a per-player, per-day mechanism for the EURO 2028 final tournament. Those are different bases for the programme's payments.</p><p>This is an announced distribution, not a claim that ScoreZaap has inspected every club's bank receipt. The amount does not describe ticket revenue or a reward for winning a match. This original summary credits UEFA's notice and keeps the programme facts separate from current football scores.</p>", "sources": [["https://www.uefa.com/news-media/news/02a9-21b4beff9982-a952de4f7c24-1000--uefa-to-distribute-31-5m-to-clubs-for-releasing-players-/", "UEFA: Club Benefits Programme distribution"]], "published": "2026-09-30T21:55:00+05:30" }, { "slug": "padres-cubs-wild-card-game-one", "category": "Baseball", "title": "Padres defeat Cubs 8-0 in Wild Card opener", "description": "MLB reports early home runs and Michael King's no-hit bid into the seventh inning.", "body": "<p>San Diego defeated Chicago 8-0 in Game 1 of their National League Wild Card Series at Petco Park on September 29, according to MLB's report published September 30.</p><p>Fernando Tatis Jr. and Manny Machado hit first-inning home runs. MLB says Michael King carried a no-hit bid into the seventh before Nico Hoerner recorded a one-out single. The bid ended before becoming a completed no-hitter.</p><p>That distinction is important in a playoff summary: pitching deep without a hit is not the same as finishing the game without allowing one. The final 8-0 score establishes the team result, not a no-hitter by itself.</p><p>Winning Game 1 puts the Padres ahead in the series; it does not confirm that the series is already won. ScoreZaap has written this original summary from the linked MLB report and has not added a Game 2 score or invented quotations. The live baseball view covers available current games.</p>", "sources": [["https://www.mlb.com/news/padres-win-nl-wild-card-game-1-2026", "MLB: Padres Wild Card opener"]], "published": "2026-09-30T21:55:00+05:30" }, { "slug": "khachanov-auger-aliassime-beijing-result", "category": "Tennis", "title": "Khachanov defeats Auger-Aliassime in Beijing", "description": "ATP reports a 6-3, 6-3 first-round win over the China Open second seed.", "body": "<p>Karen Khachanov beat Felix Auger-Aliassime 6-3, 6-3 in the China Open first round in Beijing on September 30. The ATP Tour reports that the win takes Khachanov into the second round of the ATP 500 event.</p><p>The tour identifies Auger-Aliassime as the second seed and says Khachanov did not face a break point during the match. That describes opportunities in this completed match, not a guarantee about Khachanov's next appearance.</p><p>The ATP says it was Khachanov's second victory over the Canadian during the month, following their US Open meeting. It records their tour head-to-head at 4-2 after the Beijing result. That head-to-head is separate from the 6-3, 6-3 set score.</p><p>ScoreZaap has written this summary from the tour's report in its own words. No next-round result is assumed, and no interview is attributed to ScoreZaap. Check the source for the full match account; use the tennis live view for fixtures still in progress.</p>", "sources": [["https://www.atptour.com/en/news/khachanov-auger-aliassime-beijing-2026-wednesday", "ATP: Khachanov Beijing win"]], "published": "2026-09-30T21:55:00+05:30" }, { "slug": "white-sox-astros-wild-card-game-one", "category": "Baseball", "title": "White Sox beat Astros 6-3 in Wild Card opener", "description": "AP on NBC Sports reports Chicago's Game 1 victory in Houston.", "body": "<p>The Chicago White Sox defeated the Houston Astros 6-3 in Game 1 of their American League Wild Card Series, according to an Associated Press report on NBC Sports published September 30.</p><p>The report says Colson Montgomery hit a solo home run and Sam Antonacci drove in two runs. Chicago led 3-0 after two innings and held on for the completed-game win in Houston on September 29.</p><p>The series is best of three. Winning the opener is not the same as having already won the series; the AP account lists Game 2 for Wednesday. This summary does not announce an advancement or invent the later game's score.</p><p>ScoreZaap has rewritten the confirmed result in original wording and credits the AP report below. The live baseball view is for current fixtures, while the Blog explains box-score totals. The 6-3 final is the team score, not a tally that should be increased by adding individual RBIs a second time.</p>", "sources": [["https://www.nbcsports.com/mlb/news/white-sox-strike-first-in-al-wild-card-beating-astros-6-3-in-game-1", "NBC Sports / AP: White Sox Game 1 win"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "panthers-hurricanes-overtime-opening-win", "category": "Hockey", "title": "Panthers beat Hurricanes 1-0 in overtime", "description": "NHL.com reports Forsling's late overtime goal and Markstrom's 15-save shutout.", "body": "<p>Florida beat Carolina 1-0 in overtime in their season opener, according to NHL.com's September 30 report. The game was played in Raleigh on September 29.</p><p>The league account says Gustav Forsling scored with 4.3 seconds remaining in overtime. Jacob Markstrom made 15 saves for the shutout. A goaltender's save count and the final goal tally are different measures of the same game.</p><p>The report also notes Aleksander Barkov's return after missing the preceding season and Brady Tkachuk's Florida debut. Those are participation facts in the league account, not a prediction about either player's full-season performance.</p><p>An overtime victory is a completed result, but it does not decide the standings at the end of a season. ScoreZaap has written this summary in its own words from the linked NHL report, without copying its interviews or declaring Florida a future champion. Follow available NHL fixtures in the live view.</p>", "sources": [["https://www.nhl.com/news/florida-panthers-look-like-contenders-again-in-opening-win", "NHL.com: Florida opening win"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "nations-league-third-matchday-window", "category": "Football", "title": "Nations League enters its third-matchday window", "description": "UEFA lists September 30 to October 3 for Matchday 3, with September 30 an exceptional date.", "body": "<p>UEFA's published guide lists September 30 to October 3 as the third-matchday window for the 2026/27 Nations League. It says September 30 may be used exceptionally rather than being a regular day of the Week of Football.</p><p>The extended international window runs from September 24 to October 6. UEFA says teams will generally play four Nations League games in close succession during that period. Matchday 4 is listed for October 4 to 6.</p><p>These are competition date windows, not an assertion that every country plays on September 30 or that a particular fixture has already finished. Individual opponents and kick-off times require the actual match schedule.</p><p>The guide places the quarter-finals in March 2027 and says the finals' host and dates were not yet confirmed in that account. ScoreZaap does not fill those blanks with guesses. This original update links UEFA's guide and the football live view rather than inventing a current result.</p>", "sources": [["https://www.uefa.com/uefanationsleague/news/0298-1d6ef1acfaef-b54fcf1da859-1000--2026-27-uefa-nations-league-all-you-need-to-know/", "UEFA: 2026/27 Nations League guide"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "alcaraz-michelsen-tokyo-opening-match-schedule", "category": "Tennis", "title": "Alcaraz scheduled to face Michelsen in Tokyo opener", "description": "ATP lists the Thursday match not before 4 p.m. Japan time, subject to order-of-play changes.", "body": "<p>Carlos Alcaraz is scheduled to face Alex Michelsen in his opening match at the Japan Open in Tokyo on Thursday, October 1. The ATP Tour's September 30 schedule report places it on Colosseum, not before 4 p.m. Japan Standard Time.</p><p>Not before is an earliest scheduled start, not a promise that the first serve will be at that exact minute. Earlier matches, weather or an amended order of play can affect the actual start.</p><p>The ATP identifies Alcaraz as the top seed and defending Tokyo champion. Those are tournament-context facts, not a prediction that he will win the opening match or retain the title.</p><p>ScoreZaap has written this original schedule summary from the linked tour report. It states the published venue-local time rather than silently converting it into a reader's timezone. Check the official order of play for changes and use the tennis live view when the match is underway.</p>", "sources": [["https://www.atptour.com/en/news/alcaraz-tokyo-2026-schedule-thursday", "ATP: Alcaraz Tokyo opening schedule"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "musetti-withdraws-tokyo-finger-injury", "category": "Tennis", "title": "Musetti withdraws from Tokyo after finger injury", "description": "ATP reports the withdrawal; a Shanghai return is an aim, not a confirmed clearance.", "body": "<p>Lorenzo Musetti has withdrawn from the Japan Open in Tokyo after a finger injury sustained during practice, according to the ATP Tour's September 30 report.</p><p>The tour describes a small fracture in his right ring finger and cites Musetti's own published statement. ScoreZaap is reporting that attributed information, not offering a separate medical assessment or an interview.</p><p>The ATP report says Musetti hoped to recover in time for the Shanghai Masters, scheduled from October 7 to 18. That hope is not a confirmed fitness clearance or proof that he will appear in the draw. His Tokyo withdrawal and possible next event are different levels of certainty.</p><p>Tokyo is an ATP 500 event. This original summary keeps the confirmed withdrawal separate from future availability and does not infer a replacement player from incomplete information. Use the linked ATP report for the announcement and the tennis live view for available match scores.</p>", "sources": [["https://www.atptour.com/en/news/musetti-tokyo-2026-withdrawal", "ATP: Musetti Tokyo withdrawal"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "kohli-second-icc-odi-ranking-september-30", "category": "Cricket", "title": "Kohli moves to second in latest ICC ODI batting rankings", "description": "The September 30 update places Kohli on 796 rating points behind Gill on 816.", "body": "<p>Virat Kohli rose one place to second in the ICC men's ODI batting rankings in the September 30 update. The ICC reports his rating at 796, behind Shubman Gill's 816.</p><p>The update follows Kohli's unbeaten 139 against West Indies in the first ODI. It places Daryl Mitchell on 794 and Rohit Sharma fourth on 719. These figures describe that published rankings update, not a live calculation after each ball of another match.</p><p>The ICC also reports a move for Keshav Maharaj to third in the ODI bowling rankings on 667 points. Batting and bowling are separate tables; a batting rank should not be compared directly with a bowler's position as if they were one list.</p><p>Rankings are dated snapshots and may change at a later update. ScoreZaap has written this summary from the linked ICC announcement, without claiming a future number-one ranking for Kohli or forecasting results. Check the official report for the full set of changes.</p>", "sources": [["https://www.icc-cricket.com/news/kohli-closes-in-on-top-spot-in-icc-odi-batter-rankings", "ICC: September 30 rankings update"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "india-sri-lanka-asian-games-semi-final-preview", "category": "Asian Games", "title": "India prepare for Sri Lanka Asian Games semi-final", "description": "ICC reports an October 1 semi-final in Nagoya after rain disrupted the quarter-finals.", "body": "<p>India are preparing to face Sri Lanka in the men's Asian Games cricket semi-final in Nagoya on Thursday, October 1, according to the ICC's September 30 preview. The report focuses on unfamiliar conditions and the disruption caused by rain.</p><p>The ICC says India reached the last four through their higher ranking after the quarter-final against Afghanistan was abandoned without a ball being bowled. That is an advancement under the tournament process, not a completed on-field victory over Afghanistan.</p><p>The report describes all four quarter-finals as washed out. Sanju Samson discussed the preparation for the semi-final at a pre-match press conference. This summary does not reproduce his quotations or invent an interview conducted by ScoreZaap.</p><p>A scheduled semi-final is not a guaranteed weather forecast or a confirmed result. ScoreZaap will distinguish the fixture announcement from later match information. The linked ICC report is the source for the tournament context; the live cricket view is for available current scores.</p>", "sources": [["https://www.icc-cricket.com/news/samson-unfazed-by-unknown-conditions-ahead-of-asian-games-sf", "ICC: Asian Games semi-final preview"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "justin-greaves-misses-guwahati-odi", "category": "Cricket", "title": "Justin Greaves misses Guwahati ODI with calf injury", "description": "ICC reports the West Indies opener is out of the second ODI; third-match availability remains uncertain.", "body": "<p>Justin Greaves was ruled out of West Indies' second ODI against India in Guwahati with a calf injury, according to the ICC's September 30 report. The announcement follows his century in the opening game in Thiruvananthapuram.</p><p>The ICC says Greaves sustained the injury during that first innings, in which he made 101 from 108 deliveries. It reports that he did not take part in the subsequent West Indies fielding effort.</p><p>His absence from the second ODI is confirmed in the report. Availability for the third ODI on October 3 is described as being in doubt, not as a confirmed recovery or a definite absence. ScoreZaap is not predicting his return date.</p><p>The news changes the selection context but does not establish a final result for the Guwahati match. Use the cricket live view for the ongoing contest. This original summary attributes the injury and availability information to the ICC and does not add a medical diagnosis.</p>", "sources": [["https://www.icc-cricket.com/news/west-indies-standout-ruled-out-of-guwahati-odi", "ICC: Greaves ruled out"]], "published": "2026-09-30T21:45:00+05:30" }, { "slug": "rohit-sharma-12000-odi-runs", "category": "Cricket", "title": "Rohit Sharma reaches 12,000 men's ODI runs", "description": "ICC confirms Rohit Sharma reached the milestone during India's second ODI against West Indies in Guwahati.", "body": "<p>Rohit Sharma has passed 12,000 runs in men's One Day Internationals, according to an ICC report published on September 30. The milestone came during India's second ODI against West Indies in Guwahati. The ICC says he reached it with a single off Roston Chase in the 16th over.</p><p>The ICC identifies Rohit as the third Indian to reach the mark, after Sachin Tendulkar and Virat Kohli, and the seventh batter overall. That places the achievement in a career context rather than describing only his contribution to this innings.</p><p>For readers following the live game, a career milestone and a match result answer different questions. Crossing 12,000 does not decide the chase. The target, wickets and deliveries remaining still describe the immediate contest. This article records the confirmed milestone and does not claim a final result from a match still being followed.</p><p>The ICC's list of the other batters in the club includes Ricky Ponting, Kumar Sangakkara, Sanath Jayasuriya and Mahela Jayawardena alongside Tendulkar and Kohli. It is a men's ODI aggregate, not a total across Tests, T20Is and domestic cricket.</p><p>This is an original ScoreZaap summary of the linked ICC report, not firsthand stadium reporting. For the current score, open the live match page; for the milestone account, the primary source below is the reference.</p>", "sources": [["https://www.icc-cricket.com/news/rohit-sharma-enters-elite-odi-run-club", "ICC: Rohit Sharma milestone"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "west-indies-record-405-guwahati", "category": "Cricket", "title": "West Indies set men's ODI team record with 405/7", "description": "ICC reports a West Indies record total in Guwahati, with centuries from Campbell, Hope and Jangoo.", "body": "<p>West Indies completed their innings at 405/7 in the second ODI against India in Guwahati on September 30. The ICC reports that this is their highest total in men's ODI cricket and their first innings above 400 in the format.</p><p>John Campbell scored 101, Shai Hope 104 and Amir Jangoo 114. Those three centuries explain the scale of the batting total without requiring a claim about the final match outcome. The ICC says the new team record overtook 389 against England in 2019.</p><p>The target implied by that completed innings is 406. That is a chase requirement, not an Indian score or a prediction. A record first innings can still be followed by a live chase, and this article does not declare a winner from the first half of the game.</p><p>The same ICC report records individual milestones: Hope reached 20 ODI centuries, while Kuldeep Yadav reached 200 ODI wickets during a spell that finished 2/65. The ICC describes Kuldeep as the fastest Indian spinner to that wicket mark.</p><p>The wider significance is that the team total and individual records belong to different statistical categories. ScoreZaap's live view supplies the changing match state; this original summary preserves the completed-innings facts. It is based on the linked ICC report, not copied commentary or a claim that ScoreZaap reported from the venue.</p>", "sources": [["https://www.icc-cricket.com/news/records-galore-as-india-west-indies-vie-for-the-odi-series", "ICC: Guwahati ODI records"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "bangladesh-women-australia-odi-squad", "category": "Cricket", "title": "Bangladesh name 16-player squad for Australia ODIs", "description": "Nigar Sultana Joty will captain Bangladesh for three ICC Women's Championship matches in Brisbane.", "body": "<p>Bangladesh have named a 16-player squad for their three-match women's ODI series against Australia, according to the ICC's September 30 announcement. Nigar Sultana Joty is captain and Nahida Akter is vice-captain.</p><p>The matches are part of the ICC Women's Championship. The ICC lists all three at Allan Border Field in Brisbane, on October 9, 11 and 14. Those are the published fixture dates, not a claim about local broadcast availability or a guaranteed unchanged schedule.</p><p>The announcement identifies the leadership and squad selected for the tour. Selection is not the same as a confirmed playing eleven for each match: the team sheet and any later changes must be checked closer to the fixture. Readers should not treat every named squad member as already selected to start.</p><p>For fans comparing the tour with other cricket, the competition label matters. These are women's ODIs in the Championship, not a T20 series or a men's international schedule. The venue and dates help distinguish this tour from similarly named fixtures.</p><p>This article is ScoreZaap's own summary of the ICC announcement. The linked primary report includes the full squad. Use the schedule view for available fixture listings and check the official announcement for any later changes; ScoreZaap has not independently confirmed travel plans or player availability beyond that report.</p>", "sources": [["https://www.icc-cricket.com/tournaments/icc-womens-championship/news/bangladesh-name-squad-for-historic-australia-odi-series", "ICC: Bangladesh squad announcement"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "world-cup-2027-ticket-ballot-announced", "category": "Cricket", "title": "ICC announces October 1 opening for World Cup ticket ballot", "description": "The 2027 men's Cricket World Cup ticket ballot will take entries from October1, the ICC says.", "body": "<p>The ICC says registration for the men's Cricket World Cup 2027 ticket ballot will open on October 1, 2026. Its September 30 announcement places the opening alongside the tournament's official match-schedule announcement in Cape Town.</p><p>Ballot entry is free, according to the ICC, and the process is not first come, first served. The stated entry window runs from October 1 to November 21, 2026, with valid entries considered equally regardless of when they arrive within that period.</p><p>That distinction matters for fans: a ballot is not a confirmed ticket purchase. Entering does not prove that seats have been allocated, and free registration does not mean every eventual ticket is free. Readers should use the official process for the actual terms rather than interpreting this summary as a booking offer.</p><p>The announcement says the schedule launch will take place at the Zeitz Museum of Contemporary Art Africa in Cape Town. This article reports the announced opening and window; it does not invent fixtures or ticket prices ahead of the official release.</p><p>ScoreZaap has written this summary from the linked ICC notice and is not handling registrations or collecting payment information. Check the official announcement for the live registration route and subsequent updates. No action on a fan's behalf has been taken through this article.</p>", "sources": [["https://www.icc-cricket.com/tournaments/icc-cricket-world-cup-2027/news/ticket-ballot-to-go-live-for-men-s-cricket-world-cup-2027", "ICC: World Cup ticket ballot announcement"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "spain-england-nations-league-wins", "category": "Football", "title": "Spain beat Croatia as England win in Prague", "description": "AFP and Reuters reports confirm Spain's 4-1 win and England's 2-0 victory in Nations League matches.", "body": "<p>Spain defeated Croatia 4-1 in Seville, while England won 2-0 away to Czech Republic in Prague in the September 29 Nations League games. AFP and a Reuters report published by CNA give the same final scores.</p><p>Lamine Yamal scored twice for Spain. England's goals came from Anthony Gordon and Harry Kane after the hosts were reduced to ten players. These are completed match outcomes, not predictions for the next round.</p><p>AFP reports that Spain had six points from two Group A3 games after the result. England's victory was their first of the group campaign. A group position is a snapshot after those fixtures and can change with subsequent matches.</p><p>The scorelines describe different games at different venues. Combining them into one result, or treating a two-goal scorer as the whole team total, would lose the basic context. Readers checking archives should match the opponent, competition and date.</p><p>This is an original ScoreZaap summary based on the two linked reports. It does not reproduce their match commentary or claim reporters at either stadium. Use the football live view for ongoing fixtures and the source reports for the completed-match account.</p>", "sources": [["https://www.afp.com/en/spain-brush-aside-croatia-nations-league-england-down-czechs", "AFP: Nations League results"], ["https://www.channelnewsasia.com/sport/lamine-nets-double-spain-win-again-and-england-beat-10-man-czechs-6419801", "CNA / Reuters: Spain and England wins"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "djokovic-beijing-return-win-borges", "category": "Tennis", "title": "Djokovic wins on return to Beijing", "description": "ATP reports a 6-3, 7-6(2) victory over Nuno Borges at the China Open.", "body": "<p>Novak Djokovic defeated Nuno Borges 6-3, 7-6(2) in his opening match at the China Open in Beijing on September 30, according to the ATP Tour's match report. The ATP lists the match duration as one hour and 51 minutes.</p><p>The result takes Djokovic into the next round. The second set was decided by a tie-break; the notation in brackets records Borges' points in that tie-break, not a third set score.</p><p>The ATP says this was Djokovic's first appearance at the event since 2015 and records his Beijing match record as 30 wins without a defeat after the victory. Those are event-specific figures, not an unbeaten claim across his entire tour season.</p><p>The report also notes a medical timeout during the second set. This summary does not diagnose a condition or infer availability for future matches from that timeout. The confirmed fact is the completed result reported by the tour.</p><p>ScoreZaap has written this account in its own words from the linked ATP report. For changing tennis scores, use the live view. For help reading the final-set notation, the Blog's scoring and tie-break guides explain the different layers of a tennis scoreboard.</p>", "sources": [["http://www.atptour.com/en/news/djokovic-borges-beijing-2026-wednesday", "ATP Tour: Djokovic defeats Borges"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "drummond-knicks-newcomer", "category": "Basketball", "title": "Andre Drummond joins the Knicks' returning core", "description": "An AP report on NBA.com describes the veteran center's place in New York's new-season roster.", "body": "<p>Andre Drummond is joining a largely returning Knicks roster, according to an Associated Press report published on NBA.com on September 30. The account identifies the veteran center as the notable newcomer to the team's established group.</p><p>The report says Drummond was signed after Mitchell Robinson left for Boston. It also lists returning reserves Landry Shamet, Jose Alvarado and Jordan Clarkson. Those are roster facts in the source, not a prediction about the final rotation.</p><p>For fans following a new season, signing a player and deciding his exact game role are different developments. This article does not claim a guaranteed starting place, minutes allocation or a future performance total for Drummond.</p><p>The AP report presents rebounding and veteran experience as part of the basketball context around the move. ScoreZaap is summarising that account, not adding an invented interview or making a statistical forecast from a career average.</p><p>The linked NBA.com article carries the full AP report. This original summary keeps the roster development separate from live results. Use the NBA live view for matches once they are available and the Blog for reading periods, scores and overtime.</p>", "sources": [["https://www.nba.com/news/andre-drummond-joins-knicks-media-day", "NBA.com / AP: Drummond joins Knicks"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "bruins-rangers-season-opener-shutout", "category": "Hockey", "title": "Bruins shut out Rangers 3-0 in season opener", "description": "NHL.com reports three late Boston goals and 24 saves by Jeremy Swayman.", "body": "<p>Boston beat the New York Rangers 3-0 at TD Garden in the season opener for both teams, according to NHL.com's report published on September 30. The game took place on Tuesday, September 29.</p><p>The league report says the Bruins scored three times in a span of one minute and 15 seconds late in the third period. Fraser Minten, JJ Peterka and Mark Kastelic supplied the goals, with Kastelic's coming into an empty net.</p><p>Jeremy Swayman made 24 saves for the shutout. The saves and the 3-0 final describe different sides of the performance: the team score records the goals, while the goaltender's total records stopped shots.</p><p>The account is a completed-game report, not a forecast for Boston's season. One opening result cannot establish a final standings position or a guarantee about the next fixture. ScoreZaap keeps that distinction clear rather than extending the win into an unsupported trend.</p><p>This article is an original summary of the linked NHL.com report and does not claim an independent rink-side interview. Follow available hockey fixtures in the NHL live view, and use the official report for the full sequence of the late goals.</p>", "sources": [["https://www.nhl.com/news/new-york-rangers-boston-bruins-game-recap-september-29-2026", "NHL.com: Rangers at Bruins recap"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "yankees-red-sox-wild-card-game-one", "category": "Baseball", "title": "Yankees beat Red Sox 9-0 in Wild Card opener", "description": "MLB reports ten strikeouts by Cam Schlittler and a six-RBI game by Ben Rice.", "body": "<p>The Yankees won Game 1 of their American League Wild Card Series against Boston 9-0 at Yankee Stadium, according to MLB's report published on September 30. The result came in Tuesday's opening game of the series.</p><p>Cam Schlittler struck out ten across six and one-third scoreless innings. Ben Rice hit two home runs, including a grand slam, and finished with six runs batted in. Those individual contributions are part of the completed-game account, not numbers from a later fixture.</p><p>A nine-run win in Game 1 is not the same as winning the whole series. Readers should keep the game result and series state separate, especially when another game is still to be played. This summary does not declare an advancement that the source has not reported.</p><p>Runs batted in and runs scored also answer different questions. Rice's six RBIs describe runs credited through his batting contribution; they are not an instruction to add six more to the already stated 9-0 result.</p><p>ScoreZaap has written this summary from the linked MLB report without copying its commentary or quotations. The baseball live view is for current games, while the Blog's box-score guide explains runs, hits and errors for readers following the postseason.</p>", "sources": [["https://www.mlb.com/news/yankees-win-al-wild-card-game-1-2026", "MLB: Yankees Wild Card Game 1 report"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "ocon-haas-departure-end-2026", "category": "Formula 1", "title": "Ocon to leave Haas at the end of 2026", "description": "Formula1.com, Reuters and BBC report the driver's planned departure; no next team is confirmed here.", "body": "<p>Esteban Ocon will leave Haas at the end of the 2026 season, according to Formula1.com and corroborating reports from Reuters, published by Sportstar, and BBC Sport on September 30.</p><p>The reports describe an end-of-season departure, not an immediate withdrawal from the current campaign. Reuters says Haas confirmed the split in a separate statement. This summary does not turn that announcement into a claim that a replacement has already been chosen.</p><p>Ocon joined Haas in 2025 after driving for Alpine. His next team is not established by the announcement cited here. A confirmed exit and speculation about a future seat are different categories of information, and ScoreZaap is reporting only the confirmed departure.</p><p>The driver-market development is separate from a race result. A team announcement does not change a previously completed Grand Prix result or establish what will happen at the next event. ScoreZaap will distinguish later confirmed announcements from speculation.</p><p>This is an original sourced summary, without invented quotations or an interview attributed to ScoreZaap. Further driver-market announcements may change the outlook, but this article does not predict them. Use the official and corroborating reports below to check the announcement.</p>", "sources": [["https://www.formula1.com/en/latest/article/ocon-confirms-he-will-leave-haas-at-end-of-2026-season.cJjg9W9Om5ZW6Mn9GZ75v", "Formula1.com: Ocon departure"], ["https://sportstar.thehindu.com/motorsport/esteban-ocon-leaves-haas-end-of-f1-season-confirmation/article71528181.ece", "Sportstar / Reuters: Haas departure"], ["https://www.bbc.com/sport/formula1/articles/c9e8e5k21ge5o", "BBC Sport: Haas split"]], "published": "2026-09-30T21:27:00+05:30" }, { "slug": "ghana-gambia-defeat-queiroz-response", "category": "Football", "title": "Ghana FA reports Queiroz response after Gambia defeat", "description": "The association reports a 4-2 loss after Ghana led 2-0 in Accra.", "body": "<p>Ghana lost 4-2 to The Gambia after taking a 2-0 lead at the Accra Sports Stadium, according to the Ghana Football Association's published post-match account. The report describes the game as having taken place on Tuesday.</p><p>The association says Ernest Nuamah and Felix Afena-Gyan scored Ghana's first-half goals, before The Gambia equalised before the break. The final score is the completed result, not a running tally after those opening goals.</p><p>The report says coach Carlos Queiroz took responsibility and apologised to supporters. ScoreZaap is summarising that attributed response rather than reproducing the press-conference transcript or claiming an independent interview.</p><p>The article also discusses player availability, but this summary does not turn those comments into a diagnosis for every player or a prediction for Ghana's next match. The official account below is the source. Use the football live view for current fixtures and confirmed results, rather than treating a coach's response as a new match event.</p>", "sources": [["https://www.ghanafa.org/we-are-deeply-sad-and-sorry-queiroz-apologises-to-fans-after-the-gambia-defeat", "Ghana FA: post-match response"]], "published": "2026-09-30T21:57:00+05:30" }, { "slug": "mcgrath-captain-bangladesh-odis-molineux-injury", "category": "Cricket", "title": "McGrath to captain Australia against Bangladesh", "description": "Cricket Australia says Molineux will miss the ODI series with a hip injury.", "body": "<p>Tahlia McGrath will lead Australia in the women's ODI series against Bangladesh after Sophie Molineux was ruled out with a hip injury, according to Cricket Australia's September 30 report.</p><p>The announcement came after the squad release. It explains why a captain initially named in a squad is not necessarily available for the final series. Cricket Australia says reinforcements would be added after the current Women's National Cricket League round.</p><p>The three ODIs are listed for October 9, 11 and 14 at Allan Border Field in Brisbane. The same report says Australia hoped Molineux could recover for the following T20I series against New Zealand. That is an aim, not confirmed clearance to play.</p><p>ScoreZaap is summarising the official account in original wording, without adding a medical prognosis or treating a future fixture as a finished match. This development complements Bangladesh's squad announcement already covered in News. Use the source report for updates and the cricket live view for available match scores.</p>", "sources": [["https://www.cricket.com.au/news/4583909/australia-womens-t20-odi-squads-bangladesh-new-zealand-sophie-molineux-mcgrath-gardner-captain-lucy-hamilton-injury-darcie-brown-grace-harris", "Cricket Australia: McGrath to lead Bangladesh ODIs"]], "published": "2026-09-30T21:57:00+05:30" }, { "slug": "cummins-odi-return-marsh-captain", "category": "Cricket", "title": "Cummins returns to ODI side while Marsh keeps captaincy", "description": "Cricket Australia reports the lineup for the third ODI against South Africa in Potchefstroom.", "body": "<p>Pat Cummins returned to Australia's selected ODI side for the third match against South Africa in Potchefstroom, while Mitchell Marsh remained the match captain. Cricket Australia's September 30 report identifies the arrangement and the playing eleven.</p><p>The report says this was Cummins' first ODI appearance since November 2024. It also says Australia still regarded him as their official captain in the format. Being in the side and leading that particular match are therefore separate facts.</p><p>Mitchell Starc was also selected, while Ollie Peake was recalled to bat at number four. South Africa rested Temba Bavuma, with Aiden Markram captaining and choosing to bowl after winning the toss.</p><p>This article records the announced teams and toss, not a completed result. ScoreZaap has rewritten the facts from Cricket Australia's report without copying its interviews or adding a prediction. The cricket live view is for the changing match state; the official report supplies the lineup context.</p>", "sources": [["https://www.cricket.com.au/news/4584247/toss-teams-third-odi-south-africa-v-australia-potchefstroom-ellis-injury-cummins-return-mitch-marsh-captain", "Cricket Australia: third ODI teams"]], "published": "2026-09-30T21:57:00+05:30" }, { "slug": "thailand-vietnam-asean-cup-final-place", "category": "Football", "title": "Thailand beat Vietnam 2-0 to secure ASEAN Cup final place", "description": "FIFA reports goals from Sarach Yooyen and Chaiyaphon Otton in Bandung.", "body": "<p>Thailand beat Vietnam 2-0 in Bandung on September 29 to secure a place in the FIFA ASEAN Cup final with a group match remaining, according to FIFA's match report. The result also ended Vietnam's 27-match unbeaten run.</p><p>Sarach Yooyen opened the scoring in the tenth minute. The Thai captain's long-range finish gave his team the early advantage, and substitute Chaiyaphon Otton added the second in third-minute stoppage time at the end of the match.</p><p>FIFA says Vietnam had a first-half effort disallowed after a VAR review. That effort is not included in the completed 2-0 score. The report records Thailand's second win in two tournament matches.</p><p>The official account says Thailand's next group opponent is the Philippines. It also says Vietnam need a draw against Pakistan to reach the bronze final. Those are the reported next-stage conditions, not results from matches already played.</p>", "sources": [["https://www.fifa.com/en/articles/thailand-vietnam-report-highlights-quotes", "FIFA: Thailand v Vietnam report, September 29"]], "published": "2026-09-30T22:02:00+05:30" }, { "slug": "azerbaijan-fifa-u15-world-cup-preparations", "category": "Football", "title": "Azerbaijan prepares for first FIFA U-15 World Cup and Festival", "description": "FIFA says about 4,000 boys from 190 member associations are expected in late October.", "body": "<p>Azerbaijan is preparing to host the first FIFA U-15 World Cup and Festival in late October 2026, according to FIFA's September 29 update. The organisation says the boys' competition will involve about 4,000 children from 190 member associations.</p><p>The update follows FIFA president Gianni Infantino's meeting with Azerbaijan president Ilham Aliyev in Baku. FIFA says the visit included the Hovsan Competition Complex, where most matches are due to take place.</p><p>The host team's opening group match against Timor Leste is listed for October 24 at Baku's Crystal Hall, following the opening ceremony. The same venue is scheduled to host the six tier finals on October 30.</p><p>This is a preparations and schedule update, not a match result or ticket sale notice. FIFA's announcement distinguishes the U-15 event this year from the U-20 World Cup to be co-hosted by Azerbaijan and Uzbekistan in 2027.</p>", "sources": [["https://inside.fifa.com/organisation/president/news/ilham-aliyev-infantino-meeting-azerbaijan-u15-world-cup", "FIFA: Azerbaijan preparations, September 29"]], "published": "2026-09-30T22:02:00+05:30" }, { "slug": "shubman-gill-double-century-west-indies-guwahati", "category": "Cricket", "title": "Shubman Gill passes 200 in Guwahati ODI chase", "description": "BCCI confirms Gill's double-ton milestone; ScoreZaap's completed scorecard lists 223 not out, with the earlier live snapshot preserved.", "published": "2026-09-30T22:04:00+05:30", "body": `<h2>Completion update: 10:23 PM IST</h2><p>ScoreZaap's scorecard check at 10:23 PM IST marked the match completed with India winning by eight wickets. It listed Gill not out on 223 from 133 balls, with 26 fours and eight sixes. This completion update is attributed to ScoreZaap's provider-backed scorecard, not an official BCCI final-result report. The original live snapshot below is preserved so its earlier figures are not mistaken for the final innings.</p><p>Shubman Gill has passed 200 against West Indies in the second ODI in Guwahati. BCCI's official video page, titled "Shubman Gill rises to occasion with his 2nd Double Ton", confirms the milestone.</p><h2>Live snapshot: 10:03 PM IST, September 30</h2><p>ScoreZaap's live scorecard, checked at 10:03 PM IST, showed Gill batting on 215 from 128 balls, with 25 fours and eight sixes. It showed India on 388/2 after 42 overs, needing 18 runs from 48 balls against West Indies' 405/7.</p><p>Those exact figures are a time-stamped ScoreZaap scorecard snapshot, not an official BCCI score report or Gill's final innings. The match was still marked ongoing at that check. No winner or final score is being declared here.</p><p>This is ScoreZaap's original summary. The double-century milestone has an official BCCI cross-check; the changing innings figures may move after publication. <a href="/match/cricket/cbz_151543">Open the live India v West Indies scorecard</a> for the latest available state.</p>`, "sources": [["https://www.bcci.tv/videos/s-shubman-gill-rises-to-occasion-with-his-2nd-double-ton-s68h9", "BCCI: Gill second double ton, September 30"], ["https://scorezaap.tech/match/cricket/cbz_151543", "ScoreZaap live scorecard: snapshot checked 10:03 PM IST"]], "modified": "2026-09-30T22:27:00+05:30" }, { "slug": "rohit-sharma-century-west-indies-guwahati", "category": "Cricket", "title": "Rohit Sharma scores a century in Guwahati ODI chase", "description": "BCCI marks Rohit's hundred; ScoreZaap's 10:06 PM IST scorecard check records 101 from 75 balls.", "published": "2026-09-30T22:08:00+05:30", "body": `<p>Rohit Sharma made a century in India's second ODI against West Indies in Guwahati on September 30. BCCI's official video page, "Rohit Sharma's Joyous Hundred Celebration", provides an official cross-check for the hundred.</p><h2>Innings record checked at 10:06 PM IST</h2><p>ScoreZaap's live scorecard, checked at 10:06 PM IST, listed Rohit on 101 from 75 balls, with 10 fours and six sixes. His dismissal was recorded as lbw to Jayden Seales. These exact innings figures and dismissal wording are attributed to that ScoreZaap scorecard snapshot, not presented as a separate official BCCI score report.</p><p>The hundred came during a match in which Rohit also passed 12,000 men's ODI runs. The ICC's official milestone report identifies him as the third Indian and seventh batter overall to reach that career mark. <a href="/news/rohit-sharma-12000-odi-runs">Read our separate 12,000-run milestone summary</a>.</p><p>At the scorecard check, the match was still marked ongoing. This article does not declare the chase result or a final India total. It is an original ScoreZaap summary, with the official hundred and career-milestone cross-checks linked below. <a href="/match/cricket/cbz_151543">Open the live scorecard</a> for the changing match state.</p>`, "sources": [["https://www.bcci.tv/videos/s-rohit-sharmas-joyous-hundred-celebration-ubmbg", "BCCI: Rohit hundred celebration, September 30"], ["https://www.icc-cricket.com/news/rohit-sharma-enters-elite-odi-run-club", "ICC: Rohit 12,000 ODI runs"], ["https://scorezaap.tech/match/cricket/cbz_151543", "ScoreZaap scorecard, checked 10:06 PM IST"]] }, { "slug": "canucks-oilers-overtime-opening-6-5", "category": "Hockey", "title": "Canucks beat Oilers 6-5 in overtime opener", "description": "NHL reports Paul Cotter scored the winner at 1:59 of overtime.", "body": "<p>Vancouver beat Edmonton 6-5 in overtime at Rogers Place on September 29, according to NHL's September 30 recap. Paul Cotter scored the deciding goal 1:59 into the extra period after the Canucks had lost a three-goal lead in the third.</p><p>Vancouver moved from 2-2 to 5-2 with goals from Jonathan Lekkerimaki, Max Sasson and Elias Pettersson in the first 5:15 of the third period. Edmonton responded with two goals from Vasily Podkolzin and another from Evan Bouchard, whose third goal of the night completed his hat trick.</p><p>Podkolzin's equaliser came with 43 seconds left in regulation, sending the contest to overtime. Cotter then forced a turnover, exchanged passes with Sasson and finished the winner. He scored twice in the game, including Vancouver's short-handed opening goal.</p><p>The result gave Manny Malhotra a win in his Canucks coaching debut. NHL lists the return meeting in Vancouver for Thursday. The final 6-5 result is distinct from the earlier 5-2 lead; no later game result is implied.</p>", "sources": [["https://www.nhl.com/news/vancouver-canucks-edmonton-oilers-game-recap-september-29-2026", "NHL: Canucks v Oilers recap"]], "published": "2026-09-30T22:25:00+05:30" }, { "slug": "beijing-struff-bu-gea-opening-results", "category": "Tennis", "title": "Struff, Bu and Gea join Beijing opening-round winners", "description": "ATP's September 30 results list records three further singles victories.", "body": "<p>Jan-Lennard Struff beat Thiago Agustin Tirante 6-1,6-4 in Beijing's round of 32 on September 30, according to ATP's official results list. The straight-set result is among the opening-day wins beyond the Djokovic and Khachanov matches already covered by ScoreZaap.</p><p>Wild card Yunchaokete Bu needed three sets to beat Juan Manuel Cerundolo 6-2,5-7,6-4. The middle-set loss did not end Bu's tournament; the third-set win completed his progression to the next round.</p><p>Qualifier Arthur Gea beat wild card Zhizhen Zhang 6-4,6-3. Those entry labels describe how players entered this draw, not a prediction of their chances or a new ranking.</p><p>ATP also lists Alexander Bublik and Juncheng Shang beating Francisco Cerundolo and Arthur Rinderknech 3-6,6-4,10-7 in doubles. The final 10-7 is the match-tiebreak score, not an ordinary third set played to ten games. This summary records the published results without inventing rallies or quotations.</p>", "sources": [["https://www.atptour.com/en/news/beijing-2026-results", "ATP: Beijing September30 results"]], "published": "2026-09-30T22:25:00+05:30" }, { "slug": "malaysia-indonesia-asean-cup-scoreless-draw", "category": "Football", "title": "Malaysia and ten-man Indonesia draw 0-0 in ASEAN Cup", "description": "FIFA reports a first-half red card for Thom Haye in Jakarta.", "body": "<p>Malaysia and Indonesia drew 0-0 at the Gelora Bung Karno in Jakarta on September 28, according to FIFA's match report. Both had won their opening group matches before the scoreless meeting.</p><p>Indonesia's Thom Haye received a straight red card after a VAR review of his challenge on Arif Aiman in the first half. Playing with ten did not prevent Indonesia from creating chances: FIFA records a Dean James effort saved by Syihan Hazmi and a Kevin Diks shot into the side netting.</p><p>Late in the match, Maarten Paes made a save and Justin Hubner cleared off the goal line as Malaysia sought a winner. Those defensive interventions preserved the draw; they are not goals to add to the completed score.</p><p>The split points left both teams one point ahead of Singapore, with final group fixtures ahead. FIFA lists Malaysia against Singapore and Indonesia against Bangladesh on Thursday. The upcoming fixtures do not establish either team's final group position.</p>", "sources": [["https://www.fifa.com/en/tournaments/mens/asean-cup/2026/articles/malaysia-indonesia-report-highlights-quotes", "FIFA: Malaysia v Indonesia, September28"]], "published": "2026-09-30T22:25:00+05:30" }, { "slug": "egypt-morocco-senegal-afcon-qualifying-results", "category": "Football", "title": "Egypt score five as Morocco and Senegal win AFCON qualifiers", "description": "CAF reports a Marmoush double in Juba and Algeria's comeback draw in Burundi.", "body": "<p>Egypt beat South Sudan 5-0 in Juba on September 29, according to CAF's official qualifying roundup. Omar Marmoush scored twice as Egypt moved to four points from their opening two Group B matches after the earlier draw with Angola.</p><p>Mostafa Zico gave Egypt a 36th-minute lead. Marmoush scored in the 49th and 83rd minutes, with Ibrahim Adel making it 3-0 between those goals. Substitute Hamza Abdelkarim added the fifth in second-half stoppage time.</p><p>Elsewhere, Morocco beat Lesotho 2-0 through Brahim Diaz and Azzedine Ounahi. CAF says the result left Morocco on six points after two Group A matches, with four goals scored and none conceded across those opening fixtures. Senegal beat Ethiopia 1-0 through Ibrahim Mbaye's 11th-minute goal, moving to four points in Group J.</p><p>Algeria recovered from a two-goal deficit to draw 2-2 away to Burundi in Group I. Mohamed El Amine Belloumi reduced the deficit before Adil Boulbina equalised in the 63rd minute. Mozambique beat Sudan 4-1, with Chamito scoring twice, while Comoros beat Namibia 1-0 through Benjaloud Youssouf.</p><p>These are completed results from CAF's September 29 account. The early group points are not final qualification decisions. This original ScoreZaap roundup does not reproduce the source's photographs or claim interviews with the teams.</p>", "sources": [["https://www.cafonline.com/afcon2025/news/egypt-hit-five-as-morocco-and-senegal-win-while-algeria-fight-back-in-afcon-2027-qualifiers/", "CAF: September 29 qualifying roundup"]], "published": "2026-09-30T22:30:00+05:30" }, { "slug": "braves-phillies-riley-wild-card-game-one", "category": "Baseball", "title": "Riley homer lifts Braves past Phillies 5-3 in Wild Card opener", "description": "MLB reports a three-run eighth-inning home run off Jhoan Duran in Atlanta.", "body": "<p>Atlanta beat Philadelphia 5-3 in Game 1 of the National League Wild Card Series on September 29 at Truist Park. MLB's official report credits Austin Riley's three-run homer off Jhoan Duran with two outs in the eighth inning as the decisive swing.</p><p>The Phillies had led 3-2 after J.T. Realmuto's two-run triple in the seventh. Riley's home run changed that one-run deficit into Atlanta's two-run winning margin. The final score is distinct from either of those earlier game states.</p><p>Chris Sale recorded nine strikeouts over 6 1/3 innings in the Braves' start. MLB says he was charged with three runs; two scored on Realmuto's triple after Didier Fuentes entered from the bullpen. A pitcher can be charged for inherited runners even after leaving the mound.</p><p>The victory put Atlanta ahead in the best-of-three series, not through to the next round. MLB's report shifts attention to Game 2, but this article does not add a result for that game or treat a historical series-win percentage as a prediction.</p><p>This is original ScoreZaap summary writing from the linked MLB account. No player quotation or agency image has been copied. Read the baseball hub for available current scores, and the blog's RBI and earned-run guides for scoring context.</p>", "sources": [["https://www.mlb.com/braves/news/braves-win-nl-wild-card-series-game-1-2026?t=nl-wild-card-series-a-coverage", "MLB: Braves Game 1 report"]], "published": "2026-09-30T22:30:00+05:30" }, { "slug": "sepang-bahrain-grand-prix-tyre-compounds-2026", "category": "Formula 1", "title": "C2, C3 and C4 tyres selected for F1 return to Sepang", "description": "F1's September 30 report names the compounds for the rescheduled Bahrain Grand Prix in Malaysia.", "published": "2026-09-30T22:31:00+05:30", "body": "<p>Pirelli has selected C2, C3 and C4 as the hard, medium and soft tyres for the rescheduled Bahrain Grand Prix at Malaysia's Sepang International Circuit, according to Formula 1's September 30 announcement. The event marks F1's return to Malaysia after nine years.</p><p>The published allocation lists two sets of hard tyres, three medium and eight soft for each driver, plus intermediate and full-wet tyres if conditions require them. An extra soft set is reserved for drivers reaching Q3.</p><p>F1's account highlights thermal management and the lack of relevant data for the current cars at Sepang. It says Friday practice will be important for drivers learning the circuit and teams assessing balance and tyre behaviour. Those are preparation challenges, not a prediction that a particular driver or strategy will win.</p><p>The circuit guide explains the unusual event name: Malaysia stepped in after the Bahrain Grand Prix was moved from its original April slot. The weekend therefore takes place at Sepang, not Bahrain's Sakhir circuit. This original summary keeps that distinction rather than silently changing the official race name.</p>", "sources": [["https://www.formula1.com/en/latest/article/what-tyres-will-the-teams-and-drivers-have-for-the-2026-bahrain-grand-prix-in-malaysia.4vcrMxYY9DWg7PwyiNMrEV", "Formula1: tyre allocation announcement"], ["https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-sepang-international-circuit.2KTLvyxBXmwVftSJxmYeZ2", "Formula1: Sepang circuit and event context"]] }, { "slug": "tunisia-eswatini-u23-afcon-first-leg-wins", "category": "Football", "title": "Tunisia and Eswatini take first-leg leads in U-23 qualifiers", "description": "CAF reports two Omar Ben Ali goals for Tunisia and an Eswatini away win in Malawi.", "body": "<p>Tunisia beat Benin 2-0 at the Stade Olympique de Sousse in the first round of the U-23 Africa Cup of Nations Egypt 2027 qualifiers, according to CAF's September 29 account. Omar Ben Ali scored both goals after a goalless first half.</p><p>Ben Ali converted a penalty in the 57 th minute and added another in the 97 th. CAF says Benin had an effort disallowed for a foul in the build-up shortly before the second goal. That disallowed effort is not part of the completed 2-0 score.</p><p>Eswatini also secured an away advantage by beating Malawi 1-0 in Lilongwe. Sibonelo Vlakati scored the only goal in the 73 rdminute. These are first-leg leads, not completed aggregate victories or qualification for the finals.</p><p>CAF lists the Tunisia-Benin return for October 5 in Lome, with the aggregate winner due to face Gabon in round two. Eswatini-Malawi is listed for October 6, with that winner due to meet Algeria. The same account says 42 nations are competing for seven places alongside hosts Egypt.</p>", "sources": [["https://www.cafonline.com/caf-u-23-africa-cup-of-nations/news/tunisia-take-control-as-eswatini-claim-away-win-in-u-23-afcon-qualifiers/", "CAF: U-23 first-leg report, September29"]], "published": "2026-09-30T22:34:00+05:30" }, { "slug": "guinea-bissau-nigeria-three-goal-afcon-win", "category": "Football", "title": "Guinea-Bissau beat Nigeria 3-0 in AFCON qualifier", "description": "CAF reports goals from Franculino, Mama Balde and Alvaro Djalo.", "body": "<p>Guinea-Bissau beat Nigeria 3-0 in the September 29 AFCON 2027 qualifiers, according to CAF's official roundup. The result left Guinea-Bissau with six points from their opening two Group L matches.</p><p>Franculino opened the scoring after 15 minutes. Mama Balde added the second during the second half and Alvaro Djalo completed the score in the fifth minute of stoppage time. Nigeria had won their opener against Madagascar but could not repeat that recovery.</p><p>CAF says Tanzania is automatically qualified as a co-host, so only the highest-placed side among Guinea-Bissau, Nigeria and Madagascar qualifies alongside Tanzania from this group. A strong two-match start therefore gives Guinea-Bissau an advantage but is not itself a confirmed finals berth.</p><p>This original summary focuses on the confirmed Nigeria result and qualifying context. Ghana's separate loss to The Gambia is already covered in ScoreZaap News. No future match result, coach quotation or copied match photograph has been added.</p>", "sources": [["https://www.cafonline.com/afcon2025/news/nigeria-and-ghana-stunned-as-afcon-qualifying-delivers-major-shocks/", "CAF: qualifying roundup, September29"]], "published": "2026-09-30T22:34:00+05:30" }, { "slug": "pakistan-asian-games-washout-progress", "category": "Asian Games", "title": "Pakistan reach Asian Games semi-finals after washout", "description": "PCB says higher ICC ranking decided advancement after no play against Hong Kong.", "body": "<p>Pakistan advanced to the men's Asian Games cricket semi-finals after their quarter-final against Hong Kong was abandoned without a ball being bowled in Nisshin on September 28. PCB's official release attributes the abandonment to persistent rain.</p><p>The Sahibzada Farhan-led team progressed because of its higher ICC ranking under the tournament playing conditions. This was advancement without play, not a victory by runs or wickets and not an innings with a score to reconstruct.</p><p>PCB's release listed both semi-finals for October 1 at the same venue. At the time of that announcement, Pakistan's next opponent was still described as the winner of the scheduled Bangladesh-Malaysia quarter-final. This article does not turn that older pending-opponent wording into a new confirmed result.</p><p>The distinction matters when checking knockout brackets after bad weather: a team can move forward while the scorecard correctly says no play. For changing fixture details use the current tournament source, rather than treating this September 28 release as a live schedule.</p>", "sources": [["https://www.pcb.com.pk/news-detail/pakistan-qualify-for-asian-games-semi-finals-after-rain-washes-out-hong-kong-quarter-final.html", "PCB: Pakistan advancement, September28"]], "published": "2026-09-30T22:34:00+05:30" }, { "slug": "india-compound-archery-golds-asian-games-2026", "category": "Asian Games", "title": "India win two compound archery golds at Asian Games", "description": "Olympics.com reports women's team and mixed team victories, plus an LA 2028 quota.", "body": "<p>India won gold in both the women's compound team and compound mixed team archery events at the Asian Games on September 30, according to Olympics.com's official live report.</p><p>Jyothi Surekha Vennam, Prithika Pradeep and Chikitha Taniparthi beat China 238-234 in the women's team final. Olympics.com says the 238-point finish equalled the women's compound team world record set by South Korea in 2014. India had led 119-116 halfway through the final.</p><p>Chikitha also partnered Sahil Jadhav in the mixed team final against South Korea. That match finished 157-157 before a shoot-off, in which both Indian archers scored 10 while South Korea's final arrow scored nine. The shoot-off decided the winner; it is separate from the tied 157-point regulation score.</p><p>Olympics.com says the mixed team victory secured a quota place for India at LA 2028, where compound mixed team archery will make its Olympic debut. A country quota is not the same as naming the athletes who will eventually compete at the Olympics.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-live-scores-updates-results-india-september-30", "Olympics.com: September30 live report"]], "published": "2026-09-30T22:36:00+05:30" }, { "slug": "india-womens-relay-asian-games-gold-2026", "category": "Asian Games", "title": "India women win 4x400m relay gold in Nagoya", "description": "Official reports record 3:29.69 for India ahead of Bahrain and China.", "body": "<p>India won the women's 4x400m relay at the Asian Games in Nagoya on September 29. Olympics.com lists Kiran Pahal, Poovamma Machettira, Prachi Choudhary and Vithya Ramraj in the winning team, which clocked 3:29.69.</p><p>Bahrain took silver in 3:30.21 and China bronze in 3:31.02, according to the same official account. World Athletics' event report also confirms India's 3:29.69 gold-medal performance.</p><p>India added bronze in the men's 4x400m relay, with Dharmveer Choudhary, Manu Thekkinalil, Jay Kumar and Vishal Thennarasu Kayalvizhi recording 3:01.61.</p><p>World Athletics says Gulveer Singh finished with three individual medals, including silver in the 1500m and 10,000m and bronze in the 5000m.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-athletics-india-women-4x400m-relay-gold-results", "Olympics.com: relay results"], ["https://worldathletics.org/news/report/zhang-yavi-pathirage-asian-games-2026-nagoya", "World Athletics: Asian Games report"]], "published": "2026-09-30T22:36:00+05:30" }, { "slug": "india-mens-compound-team-gold-completes-sweep", "category": "Asian Games", "title": "India men win compound archery gold to complete team sweep", "description": "Sahil Jadhav, Ganesh Mani Ratnam Thirumuru and Kushal Dalal beat China 238-237.", "body": "<p>India added the men's compound team gold at the Asian Games on September 30, completing victories in all three compound team events that day. Olympics.com's official report records a 238-237 win over China.</p><p>Sahil Jadhav, Ganesh Mani Ratnam Thirumuru and Kushal Dalal formed the winning men's team. After trailing 60-58 at the opening end, India scored the maximum 180 from its remaining 18 arrows. China still led 179-178 before the final end, but India closed with six successive tens.</p><p>The men's final followed India's women's team gold and mixed team gold. Those are three separate event medals, not one medal multiplied by the number of archers. Individual compound titles were not part of this team-event sweep.</p><p>The mixed team result also secured a country quota for India at LA 2028. That qualification fact applies to the mixed event, not to every archer who won a team gold. The official report makes clear that eventual Olympic participation depends on national team selection.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-archery-compound-india-gold-la-2028-olympics-quota", "Olympics.com: compound team finals"]], "published": "2026-09-30T23:05:00+05:30" }, { "slug": "neeru-dhanda-kynan-chenai-trap-mixed-gold", "category": "Asian Games", "title": "Neeru Dhanda and Kynan Chenai win Asian Games trap mixed gold", "description": "India finish on 34 targets, ahead of Qatar on 32 and China on 23 in the official report.", "body": "<p>Neeru Dhanda and Kynan Chenai won the Asian Games mixed team trap final on September 30. Olympics.com records India on 34targets, Qatar on 32 for silver and China on 23for bronze.</p><p>The Indian pair had qualified fourth for the four-team final with 136, behind China, Qatar and Iran. Qualification and final figures are separate stages, so the 136 is not added to India's 34 in the medal final.</p><p>Olympics.com describes the winning final score as an Asian record. The result followed Neeru's women's individual trap gold a day earlier and her women's trap team silver, giving her two golds and a silver at these Games.</p><p>India's winning pair represents one gold in the country's event medal tally. The athletes' personal medals can each reflect that team result, but a country table counts the event once. ScoreZaap's medal page keeps the official country snapshot separate from individual event reports.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-shooting-trap-mixed-team-gold-medal-report", "Olympics.com: trap mixed team final"]], "published": "2026-09-30T23:05:00+05:30" }, { "slug": "india-pakistan-asian-games-hockey-semi-final-october-one", "category": "Asian Games", "title": "India vs Pakistan hockey semi-final set for October 1", "description": "Olympics.com lists the Asian Games men's semi-final at 1:00 PM IST in Kakamigahara.", "body": "<p>India and Pakistan are scheduled to meet in the Asian Games men's hockey semi-final on Thursday, October 1. Olympics.com lists a 1:00 PM IST start at the Gifu Prefectural Green Stadium in Kakamigahara, Japan.</p><p>The winner advances to the gold-medal match. This is a preview of a scheduled game, not a result or a claim that either side has already reached the final. Readers should check the current official schedule before making viewing plans.</p><p>India enter as the reigning Asian Games champions following their Hangzhou 2023 gold. Olympics.com describes India as four-time winners and Pakistan as eight-time winners. Those are historical men's hockey titles, separate from the current Games medal table.</p><p>The source lists Sony LIV streaming and Sony Sports television coverage in India. Availability, language options and any subscription conditions should be checked with the broadcaster; this article does not promise free access. The 1:00 PM time is explicitly India time, not Japan local time.</p>", "sources": [["https://www.olympics.com/en/news/india-vs-pakistan-asian-games-2026-hockey-semi-final-live-streaming-telecast", "Olympics.com: men's hockey semi-final schedule"]], "published": "2026-09-30T23:24:00+05:30" }, { "slug": "priya-kapil-asian-games-boxing-bronze-lovlina-final", "category": "Asian Games", "title": "Priya and Kapil take boxing bronze; Lovlina reaches final", "description": "Olympics.com confirms two semi-final defeats and Lovlina Borgohain's 3-2 win in the women's 75kg event.", "body": "<p>Priya Ghanghas and Kapil Pokhariya won Asian Games boxing bronze medals after losing their semi-finals in Aichi on September 29, according to Olympics.com. In this competition, both losing semi-finalists receive bronze.</p><p>Priya lost the women's 60kg bout to China's Yang Chengyu by a 4-1 split decision. Kapil lost the men's 90kg semi-final to Uzbekistan's Turabek Khabibullaev, also by a 4-1 split decision. The decision numbers describe judges' verdicts, not goals or a boxing round score.</p><p>Lovlina Borgohain won her women's 75kg semi-final against Kazakhstan's Natalya Bogdanova by a 3-2 split decision. That victory earned a place in the gold-medal bout, but it does not make the final medal colour gold yet.</p><p>Olympics.com names China's Bao Ziyi as Lovlina's scheduled final opponent. This report separates confirmed bronze medals and a confirmed semi-final win from the still-pending final. It does not predict the winner or add athlete medal counts to an unverified live country total.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-boxing-priya-ghanghas-kapil-pokhariya-bronze-medal", "Olympics.com: boxing semi-final results"]], "published": "2026-09-30T23:24:00+05:30" }, { "slug": "india-women-hockey-asian-games-final-korea-win", "category": "Asian Games", "title": "India women beat South Korea 2-0 to reach hockey final", "description": "Ishika Chaudhary and Salima Tete score as India set up a gold-medal match against China.", "body": "<p>India reached the Asian Games women's hockey final with a 2-0 win over South Korea on September 30. Olympics.com's official report credits Ishika Chaudhary in the 44th minute and captain Salima Tete in the 48th.</p><p>The first half ended without a goal. Ishika broke the deadlock from a penalty-corner variation near the end of the third quarter, before Salima doubled India's lead in the final quarter. The result is a completed semi-final win, not a final gold medal.</p><p>India are scheduled to face reigning champions China in the final. Olympics.com reports that China advanced after a shootout against Japan in the other semi-final. That deciding method belongs to China's match and should not be attached to India's 2-0 result.</p><p>The source says the Games champions earn an early Olympic berth. India's qualification opportunity is therefore still tied to winning the final; this semi-final victory alone is not confirmation of that berth. The country medal-table snapshot and match report answer different questions.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-hockey-women-semi-final-india-vs-south-korea-match-report", "Olympics.com: women's hockey semi-final result"]], "published": "2026-09-30T23:26:00+05:30" }, { "slug": "chikitha-asian-games-compound-quarter-final-exit", "category": "Asian Games", "title": "Chikitha exits Asian Games compound archery quarter-final", "description": "Olympics.com reports a 144-143 defeat to Indonesia\u2019s Nurisa Dian Ashrifah in the women\u2019s individual event.", "body": "<p>India\u2019s Chikitha Taniparthi lost her women\u2019s compound individual quarter-final 144-143 to Indonesia\u2019s Nurisa Dian Ashrifah at the Asian Games on October 1, according to Olympics.com\u2019s morning live report.</p><p>The result ends Chikitha\u2019s campaign in this individual event. It is a one-point match margin, not a medal-table total or a set-score result. The morning schedule had listed her later rounds only if she qualified; the quarter-final defeat means those conditional entries should not be read as confirmed appearances.</p><p>This report covers the completed quarter-final only. India\u2019s men\u2019s compound programme and other sports have their own results and schedule. The previous day\u2019s team successes do not predict the outcome of an individual match, and this result does not change a country medal total by itself.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-live-scores-updates-results-india-october-1", "Olympics.com: October 1 live report, completed archery quarter-final"], ["https://www.olympics.com/en/news/asian-games-2026-india-schedule-today-october-1-thursday", "Olympics.com: conditional individual-round schedule"]], "published": "2026-10-01T07:46:00+05:30" }, { "slug": "india-sepaktakraw-vietnam-quadrant-group-win", "category": "Asian Games", "title": "India beat Vietnam in men\u2019s quadrant sepaktakraw group match", "description": "Olympics.com reports a 2-0 win, with games of 15-12 and 15-9, in Group A.", "body": "<p>India\u2019s men\u2019s quadrant sepaktakraw team beat Vietnam 2-0 in Group A at the Asian Games on October 1, according to Olympics.com\u2019s morning live report. The individual game scores were 15-12 and 15-9.</p><p>The report describes it as India\u2019s second consecutive group win. This is a completed group-stage result, not a final or a confirmed medal. A 2-0 match result and the two game scores describe different layers of the same contest.</p><p>Olympics.com\u2019s October 1 schedule lists India\u2019s remaining group match against Myanmar at 10:30 AM Indian Standard Time. That fixture is still separate from the completed Vietnam result; this report does not predict its winner or assume qualification from a result that has not been checked.</p>", "sources": [["https://www.olympics.com/en/news/asian-games-2026-live-scores-updates-results-india-october-1", "Olympics.com: completed men\u2019s quadrant Vietnam result"], ["https://www.olympics.com/en/news/asian-games-2026-india-schedule-today-october-1-thursday", "Olympics.com: Myanmar fixture, Indian Standard Time"]], "published": "2026-10-01T07:46:00+05:30" }];
var SZ_NEWS_IMAGES = { "shubman-gill-double-century-west-indies-guwahati": { "url": "https://scorezaap.tech/news-images/gill-double.png", "alt": "Shubman Gill: 200-plus double-century milestone against West Indies in Guwahati, September 30, 2026. Original ScoreZaap graphic.", "width": 1200, "height": 630 }, "rohit-sharma-century-west-indies-guwahati": { "url": "https://scorezaap.tech/news-images/rohit-hundred.png", "alt": "Rohit Sharma: century milestone against West Indies in Guwahati, September 30, 2026. Original ScoreZaap graphic.", "width": 1200, "height": 630 } };
function szNewsFigure(p) {
  const i = SZ_NEWS_IMAGES[p.slug];
  return i ? '<figure style="margin:24px 0"><img src="' + i.url + '" alt="' + szBlogEsc(i.alt) + '" width="1200" height="630" style="display:block;width:100%;height:auto;border-radius:14px"><figcaption style="font-size:13px;color:#a7b3c6;margin-top:10px">Original ScoreZaap graphic. Milestone checked against the linked BCCI video; not a player photograph or final match result.</figcaption></figure>' : "";
}
__name(szNewsFigure, "szNewsFigure");
__name2(szNewsFigure, "szNewsFigure");
function szNewsSportLink(p) {
  if (p.category === "Asian Games") return "/asian-games";
  const s = { Cricket: "cricket", Football: "football", Tennis: "tennis", Basketball: "nba", Hockey: "nhl", Baseball: "mlb", "Formula 1": "f1" }[p.category];
  return s ? "/sports/" + s : "/";
}
__name(szNewsSportLink, "szNewsSportLink");
__name2(szNewsSportLink, "szNewsSportLink");
function szNewsDate(p) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(p.published));
}
__name(szNewsDate, "szNewsDate");
__name2(szNewsDate, "szNewsDate");
function szNewsSorted() {
  return SZ_NEWS_POSTS.slice().sort((a, b) => new Date(b.published) - new Date(a.published));
}
__name(szNewsSorted, "szNewsSorted");
__name2(szNewsSorted, "szNewsSorted");
function szNewsCard(p) {
  return szBlogCard({ ...p, body: p.body }).replaceAll("/blog/" + p.slug, "/news/" + p.slug).replace("Read guide", "Read news").replace("September 30, 2026", szNewsDate(p));
}
__name(szNewsCard, "szNewsCard");
__name2(szNewsCard, "szNewsCard");
var SZ_ASIAN_SCHEDULE = [["Aquatics - Water polo", "20 September\u20133 October", "Nagoya City General Gymnasium [Rainbow Pool], Nagoya"], ["Archery", "26 September\u20133 October", "Okazaki Chuo Sogo Park Multipurpose Square, Okazaki"], ["Athletics", "23\u201329 September", "Nagoya City Mizuho Park Athletic Stadium, Nagoya, and Aichi Prefectural Government and Nagoya City Halls Loop Course, Nagoya"], ["Badminton", "20\u201329 September", "Ichinomiya City Municipal Gymnasium, Ichinomiya"], ["Baseball/softball - Baseball", "21\u201327 September", "Okazaki Chuo Sogo Park Baseball Stadium, Okazaki, and Toyohashi Municipal Baseball Stadium, Toyohashi"], ["Baseball/softball - Softball", "26 September\u20133 October", "Anjo Softball Ground, Anjo"], ["Basketball - Basketball", "10\u201326 September", "Aichi International Arena, Nagoya"], ["Basketball - 3X3 Basketball", "21\u201325 September", "Kinjo Futo Station Square Venue, Nagoya"], ["Boxing", "21 September\u20132 October", "Nishio Gymnasium, Nishio"], ["Breaking", "2\u20133 October", "Aichi Sky Expo, Tokoname"], ["Paddlesport - Canoe sprint", "23\u201326 September", "Miyoshi Lake Canoe Course, Miyoshi"], ["Paddlesport - Canoe slalom", "29 September\u20132 October", "Yahagigawa Canoe Slalom Course, Toyota"], ["Combat sports - Jiu-jitsu", "1\u20133 October", "Aichi Prefectural Martial Arts Hall, Nagoya"], ["Combat sports - Kurash", "27\u201329 September", "Aichi Prefectural Martial Arts Hall, Nagoya"], ["Combat sports - Mixed Martial Arts", "20\u201322 September", "Nagoya City Inae Sports Center, Nagoya"], ["Cricket (T20)", "17 September\u20133 October", "Korogi Athletic Park, Nisshin"], ["Cycling - Road", "20\u201323 September", "Shinshiro Cycling Road Course, Shinshiro"], ["Cycling - Mountain Bike", "24\u201325 September", "Obata Ryokuchi Park, Nagoya/Owariasahi"], ["Cycling - BMX Racing", "28 September", "Nagoya Velodrome BMX Race Course, Nagoya"], ["Cycling - BMX Freestyle", "26\u201327 September", "Aichi Sky Expo, Tokoname"], ["Esports", "23 September\u20132 October", "Aichi Sky Expo, Tokoname"], ["Fencing", "22\u201327 September", "Aichi Sky Expo, Tokoname"], ["Golf", "30 September\u20133 October", "Kasugai Country Club East Course, Kasugai"], ["Gymnastics - Artistic", "21\u201325 September", "Nagoya City General Gymnasium [Rainbow Hall], Nagoya"], ["Gymnastics - Rhythmic", "1\u20133 October", "Nagoya City General Gymnasium [Rainbow Hall], Nagoya"], ["Gymnastics - Trampoline", "27 September", "Nagoya City General Gymnasium [Rainbow Hall], Nagoya"], ["Handball", "19\u201329 September", "Kasugai City Gymnasium, Kasugai, and ENTRIO, Inazawa"], ["Judo", "30 September\u20133 October", "Aichi International Arena, Nagoya"], ["Kabaddi", "21\u201326 September", "Tokai Citizen Gymnasium, Tokai"], ["Karate", "20\u201323 September", "Toyohashi Gymnasium, Toyohashi"], ["Modern Pentathlon", "16\u201320 September", "Anjo Sports Park, Anjo"], ["Padel", "28 September\u20133 October", "Nagoya City Higashi Sports Center, Nagoya"], ["Rowing", "20\u201324 September", "Nagaragawa International Regatta Course, Aisai"], ["Rugby sevens", "1\u20133 October", "Nagoya City Mizuho Park Rugby Field, Nagoya"], ["Sailing", "26 September\u20133 October", "Kaiyoh Yacht Harbor, Gamagori"], ["Sepaktakraw", "20 September\u20133 October", "Nagoya City Mizuho Park Gymnasium, Nagoya"], ["Shooting", "20 September\u20131 October", "Aichi Prefectural General Shooting Gallery, Toyota"], ["Skateboarding", "24\u201327 September", "Aichi Sky Expo, Tokoname"], ["Climbing", "29 September\u20133 October", "Nagoya International Exhibition Hall [Portmesse Nagoya], Nagoya"], ["Squash", "23 September\u20132 October", "Nagoya Kinjo-Futo Arena, Nagoya"], ["Surfing", "25\u201328 September", "Pacific Long Beach, Tahara"], ["Table tennis", "20\u201328 September", "Sky Hall Toyota, Toyota"], ["Taekwondo", "1\u20133 October", "Toyohashi Gymnasium, Toyohashi"], ["Tennis - Tennis", "27 September\u20133 October", "Nagoya City Higashiyama Park Tennis Center, Nagoya"], ["Tennis - Soft Tennis", "18\u201323 September", "Nagoya City Higashiyama Park Tennis Center, Nagoya"], ["Teqball", "17\u201320 September", "Nagoya City Higashi Sports Center, Nagoya"], ["Triathlon", "20\u201321 September", "Gamagori City Triathlon Venue, Gamagori"], ["Volleyball - Volleyball", "16\u201322 September and 27 September\u20133 October", "Okazaki Chuo Sogo Park Gymnasium, Okazaki, and Park Arena Komaki, Komaki"], ["Volleyball - Beach Volleyball", "20 September\u20133 October", "Hekinan Ryokuchi Beach Court, Hekinan"], ["Weightlifting", "23\u201329 September", "Nagoya City Trade and Industry Center, Nagoya"], ["Wrestling", "30 September\u20133 October", "Nagoya City Inae Sports Center, Nagoya"], ["Wushu", "20\u201324 September", "Aichi Prefectural Martial Arts Hall, Nagoya"], ["Aquatics - Swimming", "20\u201325 September", "Tokyo Aquatics Centre, Tokyo"], ["Aquatics - Diving", "26\u201330 September", "Tokyo Aquatics Centre, Tokyo"], ["Equestrian", "21 September\u20134 October", "Equestrian Park, Tokyo"], ["Aquatics - Artistic Swimming", "26\u201328 September", "\u201CToBiO\u201D Furuhashi Hironoshin Memorial Hamamatsu Swimming Center, Hamamatsu"], ["Cycling - Track", "29 September\u20132 October", "Izu Velodrome, Izu"], ["Hockey", "18 September\u20133 October", "Gifu Prefectural Green Stadium, Gifu"], ["Football", "14 September\u20133 October", "seven different stadiums"]];
var SZ_ASIAN_TALLY = [["1", "CHN", "People's Republic of China", "151", "67", "59", "277"], ["2", "JPN", "Japan", "50", "77", "73", "200"], ["3", "KOR", "Republic of Korea", "24", "30", "49", "103"], ["4", "UZB", "Uzbekistan", "16", "19", "19", "54"], ["5", "THA", "Thailand", "12", "10", "12", "34"], ["6", "IRI", "Islamic Republic of Iran", "11", "16", "12", "39"], ["7", "BRN", "Bahrain", "11", "5", "5", "21"], ["8", "IND", "India", "10", "21", "29", "60"], ["9", "KAZ", "Kazakhstan", "9", "16", "31", "56"], ["10", "PRK", "Democratic People's Republic of Korea", "7", "6", "7", "20"], ["11", "MAS", "Malaysia", "6", "5", "12", "23"], ["12", "HKG", "Hong Kong, China", "5", "12", "18", "35"], ["13", "INA", "Indonesia", "4", "7", "20", "31"], ["14", "KUW", "Kuwait", "4", "1", "4", "9"], ["15", "TPE", "Chinese Taipei", "3", "10", "26", "39"], ["16", "QAT", "Qatar", "3", "6", "4", "13"], ["17", "PHI", "Philippines", "3", "3", "12", "18"], ["18", "SGP", "Singapore", "2", "6", "3", "11"], ["19", "TJK", "Tajikistan", "2", "3", "5", "10"], ["20", "VIE", "Vietnam", "2", "1", "18", "21"], ["21", "MAC", "Macao, China", "1", "4", "1", "6"], ["22", "JOR", "Jordan", "1", "1", "2", "4"], ["23", "MYA", "Myanmar", "1", "1", "1", "3"], ["= 24", "SRI", "Sri Lanka", "1", "1", "0", "2"], ["= 24", "UAE", "United Arab Emirates", "1", "1", "0", "2"], ["26", "MGL", "Mongolia", "1", "0", "4", "5"], ["27", "KGZ", "Kyrgyzstan", "0", "2", "6", "8"], ["28", "KSA", "Saudi Arabia", "0", "2", "5", "7"], ["29", "IRQ", "Iraq", "0", "2", "2", "4"], ["30", "TKM", "Turkmenistan", "0", "2", "0", "2"], ["31", "AFG", "Afghanistan", "0", "1", "2", "3"], ["= 32", "LBN", "Lebanon", "0", "1", "1", "2"], ["= 32", "OMA", "Oman", "0", "1", "1", "2"], ["34", "PAK", "Pakistan", "0", "0", "5", "5"], ["35", "CAM", "Cambodia", "0", "0", "4", "4"], ["36", "NEP", "Nepal", "0", "0", "2", "2"], ["= 37", "BAN", "Bangladesh", "0", "0", "1", "1"], ["= 37", "BRU", "Brunei Darussalam", "0", "0", "1", "1"], ["= 37", "LAO", "Lao People's Democratic Republic", "0", "0", "1", "1"], ["= 37", "SYR", "Syrian Arab Republic", "0", "0", "1", "1"]];
function szAsianTally() {
  return '<section><h2>Official medal standings</h2><p>Snapshot checked September 30, 2026 at 11:02 PM IST. India: <strong>10 gold, 21 silver, 29 bronze, 60 total; rank 8.</strong> This table is a checked snapshot, not an automatic live feed. Rankings and counts can change.</p><p><a href="https://results.asiangames2026.org/#/medals">Check the organising committee&#39;s current medal table</a></p><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:520px"><thead><tr><th>Rank</th><th>Country / territory</th><th>Gold</th><th>Silver</th><th>Bronze</th><th>Total</th></tr></thead><tbody>' + SZ_ASIAN_TALLY.map((r) => "<tr" + (r[1] === "IND" ? ' style="background:#193c2c"' : "") + ">" + [r[0], r[2], ...r.slice(3)].map((c) => '<td style="padding:12px 8px;border-bottom:1px solid #2b3544">' + szBlogEsc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div></section>";
}
__name(szAsianTally, "szAsianTally");
__name2(szAsianTally, "szAsianTally");
var SZ_ASIAN_MEDALS = [["Archery", "Women's compound team", "Gold", "Jyothi Surekha Vennam, Prithika Pradeep, Chikitha Taniparthi", "238-234 vs China", "September 30"], ["Archery", "Compound mixed team", "Gold", "Chikitha Taniparthi, Sahil Jadhav", "157-157; shoot-off 20-19 vs South Korea", "September 30"], ["Archery", "Men's compound team", "Gold", "Sahil Jadhav, Ganesh Mani Ratnam Thirumuru, Kushal Dalal", "238-237 vs China", "September 30"], ["Shooting", "Trap mixed team", "Gold", "Neeru Dhanda, Kynan Chenai", "34 targets; Qatar silver on 32", "September 30"], ["Athletics", "Women's 4x400m relay", "Gold", "Kiran Pahal, Poovamma Machettira, Prachi Choudhary, Vithya Ramraj", "3:29.69", "September 29"], ["Athletics", "Men's 4x400m relay", "Bronze", "Dharmveer Choudhary, Manu Thekkinalil, Jay Kumar, Vishal Thennarasu Kayalvizhi", "3:01.61", "September 29"]];
function szAsianInfo(kind) {
  const schedule = kind === "schedule";
  const title = schedule ? "Asian Games 2026 Sports & Schedule" : "Asian Games 2026 Medal Table & India Results";
  const desc = schedule ? "Sport-by-sport Asian Games 2026 dates and venues, based on the official Olympics.com schedule." : "Asian Games 2026 official medal-table snapshot and verified India event results. Gold, silver, bronze totals and source links.";
  const url = "https://scorezaap.tech/asian-games/" + kind;
  let body = schedule ? '<p>Competition dates below are local calendar dates in Japan. Source schedule: correct as of August 28, 2026, subject to changes. These are sport windows, not individual fixture times. Dates were checked on September 30.</p><p><a href="https://www.olympics.com/en/news/asian-games-2026-sports-schedule-la28-watch-live">Check the official schedule and updates</a></p><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:600px"><thead><tr><th>Sport / discipline</th><th>Competition dates</th><th>Venue</th></tr></thead><tbody>' + SZ_ASIAN_SCHEDULE.map((r) => "<tr>" + r.map((c) => '<td style="padding:12px 10px;border-bottom:1px solid #2b3544;line-height:1.5">' + szBlogEsc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>" : szAsianTally() + '<h2>Selected India medal results</h2><p>Checked September 30, 2026. These are selected confirmed India medal events, not the full medal tally or all countries. Team medals count as one event medal, not one medal per athlete.</p><p><a href="https://www.olympics.com/en/news/20th-asian-games-aichi-nagoya-2026-medal-table-live-updates">Official country medal standings &#8594;</a></p><div class="bloggrid">' + SZ_ASIAN_MEDALS.map((r) => '<section class="postcard"><div class="eyebrow">' + szBlogEsc(r[0]) + " \xB7 " + szBlogEsc(r[2]) + "</div><h2>" + szBlogEsc(r[1]) + "</h2><p>" + szBlogEsc(r[3]) + "</p><p>" + szBlogEsc(r[4]) + "</p><p>" + szBlogEsc(r[5]) + ", 2026</p></section>").join("") + '</div><aside><h2>Official result sources</h2><ul><li><a href="https://www.olympics.com/en/news/asian-games-2026-archery-compound-india-gold-la-2028-olympics-quota">Compound archery team finals</a></li><li><a href="https://www.olympics.com/en/news/asian-games-2026-shooting-trap-mixed-team-gold-medal-report">Trap mixed team final</a></li><li><a href="https://www.olympics.com/en/news/asian-games-2026-athletics-india-women-4x400m-relay-gold-results">Athletics relay results</a></li></ul></aside>';
  let page = szNewsPage("__asian__");
  const start = page.indexOf('<section class="hero">'), end = page.lastIndexOf("</main>");
  page = page.slice(0, start) + '<section class="hero"><div class="eyebrow">ASIAN GAMES</div><h1>' + title + "</h1><p>" + desc + "</p></section>" + body + page.slice(end);
  page = page.replace(/<title>[\s\S]*?<\/title>/, "<title>" + title + " - ScoreZaap</title>").replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + desc + '">').replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + url + '">').replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + title + '">').replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + desc + '">').replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + url + '">').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  return page.replace("</head>", szBlogLd({ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: desc, url, about: { "@type": "SportsEvent", name: "Asian Games 2026", startDate: "2026-09-19", endDate: "2026-10-04", eventStatus: "https://schema.org/EventScheduled", location: { "@type": "Place", name: "Aichi-Nagoya, Japan", address: "Aichi Prefecture and Nagoya, Japan" } } }) + "</head>");
}
__name(szAsianInfo, "szAsianInfo");
__name2(szAsianInfo, "szAsianInfo");
function szAsianPosts() {
  return szNewsSorted().filter((p) => p.slug.includes("asian-games"));
}
__name(szAsianPosts, "szAsianPosts");
__name2(szAsianPosts, "szAsianPosts");
function szAsianFeature(compact = false) {
  const items = szAsianPosts().slice(0, compact ? 2 : 3);
  return '<section aria-label="Featured Asian Games news" style="margin:20px 0 28px;padding:24px;border:1px solid #91d734;border-radius:18px;background:linear-gradient(125deg,#143326,#0b1320);color:#edf5f0"><div style="font-size:12px;letter-spacing:2px;color:#b5f14d">FEATURED COVERAGE</div><h2 style="font-size:28px;line-height:1.2;margin:10px 0">Asian Games 2026</h2><p style="color:#b7c7bf;font-size:15px;line-height:1.6">India medals, cricket and more. Original news checked against official sources.</p><ul style="padding-left:19px;margin:15px 0">' + items.map((p) => '<li style="margin:10px 0;line-height:1.5"><a style="color:#fff;text-decoration:none;font-weight:600" href="/news/' + p.slug + '">' + szBlogEsc(p.title) + "</a></li>").join("") + '</ul><a href="/asian-games" style="display:inline-block;color:#b5f14d;font-weight:700;text-decoration:none;padding:8px 0">All Asian Games news &#8594;</a><div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px"><a style="color:#b5f14d" href="/asian-games/medals">Medals &amp; results</a><a style="color:#b5f14d" href="/asian-games/schedule">Sports &amp; schedule</a></div></section>';
}
__name(szAsianFeature, "szAsianFeature");
__name2(szAsianFeature, "szAsianFeature");
function szNewsPage(slug) {
  const asian = slug === "__asian__";
  if (asian) slug = "";
  const list = asian ? szAsianPosts() : szNewsSorted();
  const p = SZ_NEWS_POSTS.find((x) => x.slug === slug);
  if (slug && !p) return null;
  const title = p ? p.title + " - ScoreZaap News" : asian ? "Asian Games 2026 News: India Medals, Cricket & Results - ScoreZaap" : "Sports News: Original Reports & Updates - ScoreZaap";
  const desc = p ? p.description : asian ? "Asian Games 2026 news: India medals, archery, athletics and cricket. Original ScoreZaap reports verified against official sources." : "Original ScoreZaap sports news summaries, verified against primary sources and linked for readers to check.";
  const url = asian ? "https://scorezaap.tech/asian-games" : "https://scorezaap.tech/news" + (p ? "/" + p.slug : "");
  const nav = '<nav class="blognav" aria-label="Main navigation"><a class="brand" href="/">Score<span>Zaap</span></a><a href="/">Live scores</a><a href="/blog">Blog</a><a href="/news" aria-current="page">News</a></nav>';
  const asianGuides = '<section class="related"><h2>Asian Games sport guides</h2><div class="bloggrid">' + SZ_BLOG_POSTS.filter((p2) => p2.category === "Asian Games").map(szBlogCard).join("") + "</div></section>";
  const asianNav = '<nav aria-label="Asian Games sections" style="display:flex;gap:14px;flex-wrap:wrap;margin:18px 0 24px"><a href="/asian-games">News</a><a href="/asian-games/medals">Medals &amp; results</a><a href="/asian-games/schedule">Sports &amp; schedule</a></nav>';
  const content = p ? '<article class="article"><div class="crumbs"><a href="/">Home</a> / <a href="/news">News</a> / ' + szBlogEsc(p.category) + "</div><h1>" + szBlogEsc(p.title) + '</h1><p class="dek">' + szBlogEsc(desc) + '</p><div class="meta">By ScoreZaap \xB7 <time datetime="' + p.published + '">' + szBlogEsc(szNewsDate(p)) + "</time> \xB7 Original sourced summary</div>" + szNewsFigure(p) + p.body + "<aside><h2>Primary source</h2><p>Facts checked against the report below. This is original summary writing, not firsthand reporting. Match information and future schedules can change after publication.</p><ul>" + p.sources.map(([u, n]) => '<li><a href="' + szBlogEsc(u) + '" rel="noopener">' + szBlogEsc(n) + "</a></li>").join("") + '</ul><p><a href="/contact">Report a correction</a></p></aside><p><a href="' + szNewsSportLink(p) + '">Browse ' + szBlogEsc(p.category) + (p.category === "Asian Games" ? " news" : " scores") + ' &#8594;</a></p></article><section class="related"><h2>More news</h2><div class="bloggrid">' + szNewsSorted().filter((x) => x !== p).slice(0, 6).map(szNewsCard).join("") + "</div></section>" : (asian ? asianNav : "") + '<section class="hero"><div class="eyebrow">' + (asian ? "ASIAN GAMES 2026" : "SCOREZAAP NEWS") + "</div><h1>" + (asian ? "Asian Games.<br>India and beyond." : "The news.<br>In our own words.") + "</h1><p>" + (asian ? "Asian Games news, medals and cricket, with official sources you can check." : "Verified sports developments, written originally by ScoreZaap, with primary sources you can check.") + '</p><p style="font-size:14px">' + list.length + ' original news summaries \xB7 Updated in checked batches, not an automated wire</p></section><section class="bloggrid" aria-label="News articles">' + list.map(szNewsCard).join("") + "</section>" + (asian ? asianGuides : "") + '<section class="editorial"><h2>Our news standard</h2><p>We verify real events, write original summaries, credit primary sources and separate completed facts from a changing live match. We do not copy publisher prose, invent quotations or claim firsthand reporting. Each article records its publication date.</p><p>For changing scores, use <a href="/">Live scores</a>. For explanations, read <a href="/blog">the Blog</a>. <a href="/contact">Send a correction</a> if a fact needs checking.</p></section>';
  const ld = p ? { "@context": "https://schema.org", "@type": "NewsArticle", headline: p.title, description: desc, datePublished: p.published, dateModified: p.modified || p.published, author: { "@type": "Organization", name: "ScoreZaap", url: "https://scorezaap.tech/about" }, publisher: { "@type": "Organization", name: "ScoreZaap", url: "https://scorezaap.tech/" }, url, mainEntityOfPage: url, articleSection: p.category, inLanguage: "en", ...SZ_NEWS_IMAGES[p.slug] ? { image: { "@type": "ImageObject", url: SZ_NEWS_IMAGES[p.slug].url, width: 1200, height: 630, caption: SZ_NEWS_IMAGES[p.slug].alt } } : {} } : { "@context": "https://schema.org", "@type": "CollectionPage", name: "ScoreZaap News", description: desc, url, mainEntity: { "@type": "ItemList", itemListElement: list.map((p2, i) => ({ "@type": "ListItem", position: i + 1, name: p2.title, url: "https://scorezaap.tech/news/" + p2.slug })) } };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://scorezaap.tech/" }, { "@type": "ListItem", position: 2, name: "News", item: "https://scorezaap.tech/news" }, ...p ? [{ "@type": "ListItem", position: 3, name: p.title, item: url }] : []] };
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + szBlogEsc(title) + '</title><meta name="description" content="' + szBlogEsc(desc) + '"><meta name="keywords" content="' + szBlogEsc(p ? p.title + ", " + p.category + " news, ScoreZaap sports news" : asian ? "Asian Games 2026 news, India Asian Games medals, Asian Games cricket, archery, athletics, ScoreZaap" : "sports news, cricket news, football news, Asian Games 2026, ScoreZaap") + '"><link rel="canonical" href="' + url + '"><meta property="og:type" content="' + (p ? "article" : "website") + '"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="' + szBlogEsc(title) + '"><meta property="og:description" content="' + szBlogEsc(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + (p && SZ_NEWS_IMAGES[p.slug] ? SZ_NEWS_IMAGES[p.slug].url : "https://scorezaap.tech/icon-512.png") + '">' + (p && SZ_NEWS_IMAGES[p.slug] ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="' + szBlogEsc(SZ_NEWS_IMAGES[p.slug].alt) + '"><meta name="twitter:image" content="' + SZ_NEWS_IMAGES[p.slug].url + '">' : "") + '<meta name="twitter:card" content="summary"><link rel="icon" href="/icon-192.png"><style>' + SZ_BLOG_CSS + "</style>" + szBlogLd(ld) + szBlogLd(crumbs) + '</head><body><main class="blogwrap">' + nav + content + "</main></body></html>";
}
__name(szNewsPage, "szNewsPage");
__name2(szNewsPage, "szNewsPage");
var SZ_CELEBRATION_JS = "(function(){\n'use strict';\nvar states=new Map(),hideTimer,queue=[],busy=false;\ntry{localStorage.removeItem('szCelebrations')}catch(e){}\nfunction number(x){return typeof x==='number'&&Number.isFinite(x)?x:null}\nfunction crosses(a,b,step){return a!=null&&b!=null&&b>=a&&Math.floor(b/step)>Math.floor(a/step)}\nfunction pair(s){var m=String(s||'').match(/(?:^|\\s)(\\d+)\\s*-\\s*(\\d+)(?:\\s|$)/);if(!m)return null;return [+m[1],+m[2]]}\nfunction resultWinner(text){var m=String(text||'').match(/^(.+?)\\s+(?:has\\s+)?won(?:\\s|$)/i);return m?m[1]:null}\nfunction compare(old,cur){\n var out=[];if(!old||!old.live||!(cur.live||cur.finished))return out;\n function add(t){out.push(t)}\n if(cur.sport==='cricket'){\n  (cur.innings||[]).forEach(function(i){var p=(old.innings||[]).find(function(x){return x.key===i.key});if(!p||i.r<p.r||i.w<p.w)return;\n   if(i.w>p.w)add('WICKET \xB7 '+i.team);\n   if(crosses(p.r,i.r,100))add(i.team+' \xB7 '+Math.floor(i.r/100)*100+' runs');\n   (i.bats||[]).forEach(function(b){var a=(p.bats||[]).find(function(x){return x.id===b.id});if(!a||b.r<a.r||b.f<a.f||b.s<a.s)return;\n    if(b.s>a.s)add('SIX \xB7 '+b.name+(b.s-a.s>1?' \xD7'+(b.s-a.s):''));\n    if(b.f>a.f)add('FOUR \xB7 '+b.name+(b.f-a.f>1?' \xD7'+(b.f-a.f):''));\n    if(crosses(a.r,b.r,50))add(b.name+' \xB7 '+Math.floor(b.r/50)*50+' runs');\n   });\n  });\n }else if(['football','nba','mlb','nhl'].includes(cur.sport)&&old.pair&&cur.pair){\n  if(cur.pair.some(function(v,i){return v<old.pair[i]}))return [];\n  cur.pair.forEach(function(v,i){var delta=v-old.pair[i];if(delta<=0)return;var team=cur.teams[i]||'Team';\n   if(cur.sport==='football'||cur.sport==='nhl')add('GOAL \xB7 '+team+(delta>1?' \xB7 '+delta+' goals since update':''));\n   else if(cur.sport==='mlb')add(team+' \xB7 '+delta+' run'+(delta===1?'':'s')+' added');\n   else {add(team+' \xB7 +'+delta+' points');if(crosses(old.pair[i],v,50))add(team+' \xB7 '+Math.floor(v/50)*50+' points')}\n  });\n }\n if(cur.finished&&!old.finished){var winner=cur.winner;if(!winner&&cur.pair&&cur.pair[0]!==cur.pair[1]&&['football','nba','mlb','nhl'].includes(cur.sport))winner=cur.teams[cur.pair[0]>cur.pair[1]?0:1];add(winner?'WIN \xB7 '+winner:cur.sport==='f1'?'RACE COMPLETE':'MATCH COMPLETE')}\n return out;\n}\nfunction accept(key,cur,now){\n now=now||Date.now();var old=states.get(key);var eligible=cur&&cur.fresh&&now-cur.at>=-5000&&now-cur.at<=30000;\n if(document.hidden||!eligible){states.delete(key);return []}\n if(old&&now-old.at<=30000){var p=old.cur;var regression=p.pair&&cur.pair&&cur.pair.some(function(v,i){return v<p.pair[i]});(cur.innings||[]).forEach(function(i){var a=(p.innings||[]).find(function(x){return x.key===i.key});if(!a)return;if(i.r<a.r||i.w<a.w)regression=true;(i.bats||[]).forEach(function(b){var ab=(a.bats||[]).find(function(x){return x.id===b.id});if(ab&&(b.r<ab.r||b.f<ab.f||b.s<ab.s))regression=true})});if(regression){states.set(key,{cur:p,at:now});return []}}\n states.set(key,{cur:cur,at:now});if(!old||now-old.at>30000)return [];\n return compare(old.cur,cur);\n}\nfunction showNext(){\n if(busy||!queue.length||document.hidden)return;busy=true;var e=queue.shift();\n var box=document.getElementById('szCelebrate');if(!box){box=document.createElement('div');box.id='szCelebrate';box.setAttribute('role','status');box.setAttribute('aria-live','polite');var strong=document.createElement('strong');strong.className='sz-event';box.appendChild(strong);var sub=document.createElement('small');sub.textContent='ScoreZaap \xB7 latest score update';box.appendChild(sub);var close=document.createElement('button');close.textContent='\xD7';close.setAttribute('aria-label','Dismiss celebration');close.onclick=function(){finish()};box.appendChild(close);document.body.appendChild(box)}\n box.querySelector('.sz-event').textContent=e;box.classList.remove('sz-on');void box.offsetWidth;box.classList.add('sz-on');\n clearTimeout(hideTimer);hideTimer=setTimeout(finish,3200);\n}\nfunction finish(){var b=document.getElementById('szCelebrate');if(b)b.classList.remove('sz-on');clearTimeout(hideTimer);busy=false;setTimeout(showNext,120)}\nfunction emit(events){queue=queue.concat(events.slice(0,4)).slice(-6);showNext()}\nfunction scoreSnapshot(m){var ins=(m.scores||[]).map(function(s,i){var z=String(s.value||'').match(/^(\\d+)\\/(\\d+)/);return z?{key:String(s.inning||i),team:s.inning||'Team',r:+z[1],w:+z[2],bats:[]}:null}).filter(Boolean);return {sport:m.sport,live:m.status==='live',finished:m.status==='finished',fresh:!!m.celebrationVerifiedAt,at:m.celebrationVerifiedAt,innings:m.celebrationInnings||ins,winner:m.celebrationWinner||resultWinner(m.statusText),pair:pair(m.scores&&m.scores[0]&&m.scores[0].value),teams:[m.home&&m.home.short,m.away&&m.away.short]}}\nfunction detailSnapshot(sport,j){var d=j.detail||{},sc=j.scorecard||{};return {sport:sport,live:sport==='cricket'?!!d.started&&!d.ended:d.state==='live'||d.status==='IN_PLAY',finished:sport==='cricket'?!!d.ended:d.state==='finished'||d.status==='FINISHED',fresh:sport==='cricket'?!!sc.celebrationVerifiedAt:!!d.celebrationVerifiedAt,at:sport==='cricket'?sc.celebrationVerifiedAt:d.celebrationVerifiedAt,winner:d.celebrationWinner||resultWinner(d.status),innings:(sc.innings||[]).map(function(i,n){return {key:i.team+':'+n,team:i.team,r:number(i.runs),w:number(i.wkts),bats:(i.batsmen||[]).map(function(b){return {id:b.id||b.name,name:b.name,r:number(b.r),f:number(b.f),s:number(b.s)}})}}),pair:pair(d.celebrationVerifiedAt&&d.scores&&d.scores[0]?d.scores[0].value:d.fullTime||d.bigScore||d.scores&&d.scores[0]&&d.scores[0].value),teams:[typeof d.home==='string'?d.home:d.home&&d.home.short,typeof d.away==='string'?d.away:d.away&&d.away.short]}}\nwindow.szCelebrate={home:function(list){list.forEach(function(m){emit(accept(m.sport+':'+m.id,scoreSnapshot(m)))})},detail:function(sport,id,j){emit(accept(sport+':'+id,detailSnapshot(sport,j)))},compare:compare,accept:accept,scoreSnapshot:scoreSnapshot,detailSnapshot:detailSnapshot};\ndocument.addEventListener('visibilitychange',function(){states.clear();queue=[];finish()});\n})();\n";
var SZ_CELEBRATION_CSS = "#szCelebrate{box-sizing:border-box;position:fixed;z-index:110;top:calc(20px + env(safe-area-inset-top));left:50%;transform:translate(-50%,-16px) scale(.95);opacity:0;pointer-events:none;width:min(440px,calc(100% - 28px));padding:25px 42px 22px 24px;background:linear-gradient(135deg,#163f30,#122c48);border:1px solid #a3e635;border-radius:20px;color:#e8eef8;box-shadow:0 12px 50px #0008;transition:transform .3s,opacity .3s;font-family:Inter,system-ui,sans-serif;text-align:center}#szCelebrate.sz-on{opacity:1;transform:translate(-50%,0) scale(1);pointer-events:auto;animation:szPulse .8s ease-out}#szCelebrate strong{display:block;font-size:24px;line-height:1.3;color:#b9f55a;overflow-wrap:anywhere}#szCelebrate small{display:block;margin-top:9px;color:#b9c6d9;font-size:12px}#szCelebrate button{position:absolute;right:12px;top:8px;border:0;background:transparent;color:#e8eef8;font-size:25px;cursor:pointer}@keyframes szPulse{0%{box-shadow:0 0 0 0 #a3e63555}100%{box-shadow:0 0 0 26px #a3e63500}}@media(prefers-reduced-motion:reduce){#szCelebrate,#szCelebrate.sz-on{transition:none;animation:none;transform:translate(-50%,0)}}\n";
var SZ_NEWS_IMAGE_GILL_DOUBLE = "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";
var SZ_NEWS_IMAGE_ROHIT_HUNDRED = "iVBORw0KGgoAAAANSUhEUgAABLAAAAJ2CAMAAAB4notuAAAAwFBMVEXo7vi59Vq49Fq18Fnl7Pbh6PLa4euw4mjL0t2/xtKazVOouqmns8abs4+lscOirb+eqbqbpreWorWJpHyPm66Mm5qKlaaDj6CAi5t+ip19iJdvi2Z4hZV3gpF1gZRfg0Vyf5FxfIxue45je2dpdYdlcYFdb29canVaZndUYXJMX1pNWmhKVmhCUlg+TFkwSF06SFg3RFYxQ0UwPU8rPEAqOUgmNUQjMUEfLT4dKjsaKDkYJjcVIzUUIjMSIDIHCxIIOVCIAAA3PklEQVR42u2d63LaPLtA3QYoMBpOw0BzKgkDEyiEL4RwMAbv+7+r7bMlWwaTkJS+XetHC7YsyQKtSI9lY/wfAMBfgkETAADCAgBAWACAsAAAEBYAAMICAIQFAICwAAAQFgAgLAAAhAUAgLAAAGEBACAsAACEBQAICwAAYQEAICwAQFgAAAgLAABhAQDCAgBAWAAACAsAEBYAAMICAEBYAICwAAAQFgAgrNP5HwDAx/l8YdHGAPDHpGW8Q1c2AMDHOV1Zxom6oo0B4MzS+gxhoSsA+MPKMk7wFS0LAJ+jrDMLC18BwB83lpHXV7QpAHyiss4oLHwFABdgLANfAcDfYiwDXwHA32Isg3g7AFyGsP53HmHRlABwCUMsA18BwN9iLIQFAP8dYeErALgUYyEsAPjPCAtfAcDFGAthAQDCAgBAWACAsPAVAFy6sRAWACAsAACEBQAIC2EBAMICAEBYAICwEBYAICwAAIQFAAgLYQEAwgIAQFgAgLAAABAWAADCAgCEBQDwXxGW2atWr75f/ahWe8/b857F728ptny2AAjr3cLqXUk6uUJYAHC5wuopOkFYAHC5wnq7+lphXVl8tgAI653C8gZY33tv1m79u1c9t7BS7rp65aMFQFjvFVbV1UgvfPdc/azzefVHcj0+WQCE9TFh/dbs2P2+rV5dXVWrvY2/YeteTHQ23D4ro7OqbfWqV9+qSpreWyI30yvn223gRX966F6Z7IVDLt22oIC9U4BT7hvfCgCE5Thhn57BxbEt30XSxcTqq+yTdTVKFKe56ilZ7n1fVS1FTkFub5nb/AI21TBPvhYA/7awbn1B9F5NZbN87bAapwt19Cz5pBolUtJU09n9WNsaYQUa022TC8gaCQLAvyOs19gR0eQvFEz192b31ruqRht6b9arp4+rN43VEml6SV/FAfdXR5Bvm7315g/JelnbggJ667DYDV8MgH9ZWIp1rm59I2w9Z1T9JVNmL9zgSWT7IwpG9cIZorX53QvSeDtev7uZRWO2AwH3XmowJm/rxce9XRGzB0BY6kr3H97QyV+CIK1A8DZ8X8c+udrF47C9nMaMI2OhXTY/0r567VV/XH1XZ4/pbX4B63juWuWLAfBvC8u9lzARYe8l15DKA6HXyGY9xWtyGvn1Lghy7eLsNlUlYPUja1sqy+97vhkA/7awHKzXSFpv4QBJHs3IG968ZM8pr1WTi9qD9EFYXwo/7RNJf2RsU4Tlj/oIYgEgLE9at9GVuFOEVT0irF56hfvvMPQV7P2RsQ1hASCsLNZRqOmUKWFVSZMaJAUBd2VBwm0c+orkpNvGlBAAYSn0euHiqMBEv+3MoPsmNkccdK8qaZJR8TfdBcJqvOi9GspJt42gOwDCSsjje7X3/GZZb70fkZWUZQ3bw8saIof4aaL7dl7d1epW9ZtmJX3sHm/9gzTCUrexrAEAYaVHOxmBp+pvc+d4LFo4+r233qUWjlbVeeNV79XcbV57VS9830s/D6sXeWizDVZU/LD124KN33sbFo4CIKy0sK7e0gGpI7fmJEZOMW+aQLwnLKsar1QN5aTbxq05AAhLjWFVNTcd2+q9zqkNys3PcmZXuYRlv/4I3PQ7DrDrtnHzMwDCUnnr3Xo/QnEVP9bFxcr9eBn5oF5wULX3+83OFJa3VtV7CE0sJ902Hi8DgLD+GnpcGQRAWAgLABAWwgJAWAgLABAWwgIAhIWwABDWPyYsAEBYAAAICwAQFsICAIQFAICwAABhISwAQFgAAAgLABAWwgIAhAUAgLAAAGEhLABAWAAACAsAEBbCAgCEBQCAsAAAYSEsAEBYAAAICwAQFgAAwgIAQFgAgLAAABAWAMCXCutBXPv/iU6w5UYMgi1C1Brtu9E6kdZlJuLXB9gIMfNfDaRX7TB7n7G7dTe5btaa7V/TtXeUzPV7KhsnVYpRytFh1hr75Lbl+Lpdr7eHcd45GktqhFHHKbI7NuPD9ZUFQFi5hRUKRe6DHrW+mepXd872dY7s22IYvvCzdV8N0ibZdMJ37VzCOlrZDGEp5eiYiofkplV4SH0WG+doY0VM6sGupnS4trIACCu/sNp7tQ86O/bmctp19mwS/cqsiYYY5ch+EIxFTNGMXolpuo92RW243G6Xs3432tYKZfeeykZJVRXoylG482qnsG4PX1bWetoU9ZWdu7FCxs6W6Xq3nrREbWofrCwAwsorrG496KpyH/SHCOEgJ940Fq1R1hglMWCpbf0pZL8tgldik+qjC5H2xCFhHa+sXljacmR2db++Oha1oEK5GitgXhPXlm/qTiC8zMoCIKy8wvo1DEYNqT5oD4WYq5s6YuhMlBbHs18L8eJnMe3706ihLzq1j06F2J0irOOV1QtLW47M7JA6upG4czRWdEwznCOu66J/sLIACCu3sDbBqCHdB816YtPSlVUnDEoF3bEWCsyqhxGe2DodsZqGr/ppk0z8YVd+YR2trF5Y2nLUKew4e+evWFjHGyuKf42kzL3hW2ZlARBWbmE5f+5bO20ftK8ToyInpTstbCijleuwo05FM77Q1hdusGhbazp9131l1fyervbRuRB96xRhHa2sXljactQysy8l7FvRlDBHY0WGXMmlvxyqLADCyi8ssyEm+j44FHV5077p9lxntvesTreau2AWNFSCWI4hXpzs7ab/yleC2kf3HSEaD+PFPrewjlVWLyxtOUqMq5PdVJNwEpyrsTRvTP9SZWZlARBWfmHZI2/UoOmDIz/0E26a+T23K27knHYNfyboiGypzInmbr8cuzOquVdGUG6EG+NZ+8sN6r8WOYV1rLLpZQ1eKElXjsSTeMpsqWU018vVWOEAsyVlUfOyz6wsAMI6QVjbpuuV48L65U96xqK2UeM/d37ijjpOGrluW7jpvVd9nbDs/eyh5b0b5RTWkcpmCEtXjkQn+0LCuiU6O0lYxxoLYQHC+lxhOUppWsenhGbd7+1roUaoF77A2t5cSSlgV3eXjy+8V2Jq2xmzoPXzQ03EAfvDwjpS2YcDCwYS5Ug7FL0obNqiHS9Vz9FYTAkBYX2ysKymo6KjQfdJOOfrJiI+bbc/zkXdVCM/9f3cO3Bfr+/mYRA6o4+6y5ZyCutwZR8Or3CSy4kZqxc+JcyOtCA0V2NFcS+C7oCwPkdY7pW/7dFlDV3ptpml2t/b7iRIvbfFXQIx8odk1+6rln1IWI4BWjmFdbiyR4Qll2NL+pjpU287orW2VWEdaawohDeW5swsawCEdUZh7VpidGzh6Eq+z09RyqYmFlbdXyka0xTja//4kfvq4bCw+vH45JiwDlb2mLD6moX621p9l+mrlZ0U1uHGCuiKFgtHAWF9jrCcKUyje+TWnKGoxU8ZaCoLBO7EYCpaiTUDv8R13ReBMzNshAGujD5qNoOK5BDWwcoeEZZcTsTUv2qQwuqK5tJOCetwY0lzz104q+TWHEBYZxXW3r2EJt3Pu03d/OykuJOCMsocaub24FEqMCSEf6exVYsnkWoffe6MXpamtZq0pfHJUWEdqqxeWNpypOy1NxrurlVf5WuskJF78/PGu/lZvt6gqywAwjpNWO7ddsknpogH+fEyiqTa6jhl3xRykNlnEc8cO0I0o3Ij+n6pwRNX4pDPUWEdqmx6WUPfzignqn2jZuqaaB7n0bJzN1ZE9HiZxix16g88XgYQ1keEtW8L5Zl0reQD/PrynG8s1D4+DAdTigdEGNZydv/SCmu/GF23G7VGZyjp7riwDlRWLyxtObGY9I+cyRbWocaSQnv+A/xGiQf4tXiAHyAsHpH8boaHbnwGAIR1SbTVRRoAgLAAAGEhLABAWAAACAsAEBbCAgCEBQCAsAAAYQEAICwAAIQFAAgLAABhAQAgLABAWAAACAsAEBbCAgCEBQCAsAAAYSEsAEBYAAAICwAQFsICAIQFAICwAABhISwAQFgAAAgLABAWwgIAhAUAgLAAAGEhLABAWAAACAsAEBbCAgCEBQCAsAAAYQEAICwAAIQFAAgLAABh6bg3AoofT/U1dQEAhPUFwto/PzYr5VKhWCpXau378XyHsAD+28IyjQRu92/eTbaXLqz1fTlV9UpntEFYAP+QsMJO3px9rbDa4bZyroJGJX29nxAWwL8nLIemebnCamdVGmEB/JvCMirrSxVW10BYAAhLRVyosCYGwgJAWAe6/zmFdXCSd1xY+wrCAkBY6UnhRQpLGmCJwWxt7VaLyX2jhLAA/iFhLd3By2Y+kJYLFFaXKKxOVMhEHnfNbsoIC+BfEpaLJeJtk/QRi0GrUioWiqVK4362PyysWbdSKpTKtcflOYUVGfU+uWfaHJ1el83LeNBtVCpl56zc06rfHFuF5mVVLI81zTmolYvFcn0YX2Gddbxym0/mR4sFQFhpYdnLQrRtmEi+G6rxo/K9mS2slzhtsWtmay0rht7JqHMxTDDPP9rLrIu90pRcas+zs1qEQn90d/2Udu0fo9VhpaDl5rH9S4NTiwVAWMeFZced+yExgimnO9lTVs++L2StkfiYsExNjY8JK7suWnM4k+HuLiOrSeTLpLBMoSxjczMYFuVN7f1pxQIgrBzCqkfblEGBfaPtZK2drmfvk2s7K/szCSvu6uOcwjpUlwxzGIawtMKaxgpKCGubuHjZtu3HRJ7d04oFQFgnCWskp+1k9LHaTtOz04kfzySsbTwhXeUT1qG6ZJrDaOqyWpaMLGE1kxmMx6kB1PNJxQIgrJOmhAsp6WPm6odOumfrIjTWuWNYRulmkUNYB+uSbQ5pABdXuGZkCStNuXRgKW6eYgEQ1nFhLQzdFbuXgnG8jx2SRDxc+6CwlFBRuT182Z0sLGno6JijUOkMp4v1dm8uJt2SZhWaPqtjwtKxPKVYAIR1VFjSsgY5hCVFaCpPS2s1lrxRtnQ9W0zW1rytmex8UFgP6efKdCfmYWFl1sVeVYbKPZNmPCGeabMqdqYrazUbNgdJYRXvF9ZqoMTZizfOpsdiukXzFAuAsA4Ka2/KC0cr0tBlKolkn+rGT5qe/ZCcSZYzhOVxwjqsdVF3fU0kFzrlq4smRhY1wI0uq4p6bVISVslflDCUfTVLbGqdUiwAwsoUVjrQIweI4pByLbrE1kpNY+6Vi2Q+sQC35xFWxtVKo3S/zRDWgbpo+JmKOElZldd2lrACa1uST4MB1b6UY7738/33nAMgrIrsq10cY4kXN66irllYJ3t2KerYndSk86PC2ousMPdMK6xDddHwFB2nEdY0SzNGeZ+aPJfDIWojx9mliwVAWDmFVR4ooeyZNiZcT4bd7zVzn0FKdR9+Hta2kfWg1IlOWIfqomGUPSRMj5BiYf1MD0Y7qVSlU4oFQFj5hNVOdJo4CiNHWAbJrfeay3BPqWjyx584uh+Ujk5j89XFZznsCPcOyYxreve6BVxJYU3SwzjN1dNTigVAWHlHWOOMfimvJZ0mBzH3mhVc408Qlm1v7sraetc1wjpUFzfoNMh6wFZqSJiaEUoNE2mmmy74USOs48UCIKzcMSxlMBGvCHiWti6SKyLjnh1fspt8irCcUda0WznU2/PVxZntljObIC2sdbawrPSmzYERVo5iARBWbmEpzxttanvTKhnbiTpmwf50YXnjrMlPkVjk8JCSxMG6SDczp3lJ+WaXKay4lPgi5j696ZRiARBWprCcKY21kB8fU1y8X1hF3bzx/MLyplbTjhzQqtn2KXVZlowThJV+FuDP9K6bQw47pVgAhHVIWO5Eq639EYpTp4RfKCzXWY+F9HW8fHVpGH9EWLmKBUBYR4Rl7+u6+3BPDbp/rbByr6dP1WVTkNadzjbeHG70+cLKVywAwjomLHtVSq+FPHlZw1cLK15eXjpJWPE6h0oUIX/6fGHlKxYAYR0VlnxzcRR3P3Xh6MnC6nxMWPFNN6dNCX9qYnMPny+sfMUCIKzjwtqW0o/mlG7NiUPxB27NOVlY3fw3prSG6adyxnfriZOE1dYUW/t8YeUrFgBhHReW/Ki+KGLVTF+GkyLxFfujwrrLvwqpYpQek+uhRunbYXLVpZke2C0Kny+sfMUCIKwcwjI1Qyzp8TLdfcprTx8WVhwkq4zX+yPCclxQU54mMy0duB3mUF3i22jCxy3Ld1Z/mrDyFQuAsHIIS346wVjWhPQAv/XhB/idLKyXA48T1gjLe2xf52m2MPfm/Em6sFk0TxLWIPlIP6v5Fcsa8hULgLDyCMvUPLB3dtIjkk8W1q50qrByP1/+UF0W8kNJN7vlsPwl67DyFQuAsPIIS35E3kQz7DJSP2j1YWGlf5PnXcKKH32Vsy6VP7NwNFexAAgrl7DWut9EaJ/yM18nCyt1s8p7hFUY2yfW5TmdR/sLhJWrWACElUtY0iNS4iHWXv8LMU3LPoew7HHhw8IqyPdr56tLeuA4+IKV7vmKBUBY+YQl/dCDtFJ0ovmp+qFtn0dY9qyST1ijWsaTDsrPp9cl+UNdxaH9JcLKUywAwsonLDmkJD20LvnQufK9+lM1HxKWk7QryqXC8d9iMEftSuoaQOVpZ79HWIqGxdz+ImHlKBYAYX2UxWPTfapvsVRp3M/2f66NzMmgU6+US0WjWCqLztMHniu8H3cqpUKxLG6+9NF5f6hYgH9JWAAACAsAEBYAAMICAEBYAICwAAAQFgAgLIQFAAgLAABhAQDCQlgAgLAAABAWACAshAUACAsAAGEBAMJCWACAsAAAEBYAICyEBQAICwAAYQEAwkJYAICwAAAQFgAgLIQFAAgLAABhAQDCAgBAWAAACAsAEBYAAMICAEBYAICwAAAQFgAgLIQFAAgLAABhAQDCQlgAgLAAABAWACAshAUACAsAAGEBAML6y4S1+d27rVarVw4/qtXb3u/1ZeUHAAjLY/f7tvotRfX29+4y8gOAv1hY+1dn9HL1TcP+Hbm99rRZuVz1Xv98fgDwtwpr/9brVTOF8A5hvVW/HaT6+mfzA4C/U1hvvw+56l3CMm+/fzvC91vzz+UHAH+hsNbHXfUeYT3/yJHnt6vnP5UfAPyFwrK+5eQkYe17ebPt7f9EfgCAsKJMq99yU7W+Pj8AQFhRuOkEvziGMb86PwBAWO8ZD+UZE507PwBAWBEn+sUxzP5L8wMAhBXS+3Yyva/MDwAQVsjr99MF8/316/IDAIQVsq1+ewc/zK/KL//gsMo3EeC/LqzbDIP0nteWtXntZfjn9qvyQ1gACOvwBO6qFz1MYa+/fzlrEnfu/BAWAMKK0A54fij20N/DXP2a/BAWwH9IWN+rt73X3ruF9awdD72pid60Y6LfX5EfwgL4jwjre7Xae7VS/fYkYVVzqeN37iHRufNDWAD/AWG5rtrq++0pwnrNaQ6th14/Pz+EBfCXC+tHtfdsHui3pwjr9iMiuv38/BAWwN8trKP99gRhba8+MtW72n52fggLAGEdjiX1cpfQ++z8EBYAwjocSnrTpVznCk6dOz+EBYCwonDY1cfWV11Zn5sfwgJAWBHPJ4S+b3OsVzh3fggLAGG9K5CUJ+2580NYAAjrcMgp6x7BHEGnc+eHsAAQVshOe4dMxnNett+OBp3OnR/CAkBYhwc5V1mpfxwdPp07P4QFgLAOH1U9af7Y+8z8EBYAwkJYAAjr7xPWaco4rqNz54ewABAWwgJAWH+fsK4+Lpirz8wPYQEgrBDztF8I1N7YLC9aOHd+CAsAYUW8fTvp7hjtfTfync3nzg9hASCsCO2yqeyVUEeTnzs/hAWAsI7MyU4UzO/Pyw9hASCswwdlC+btWIjq3PkhLACEdUQwb2cW1hvCAkBYCAthASAshAWAsBDWO4WlXT//Dt74ngIgLIQFgLAQFsICQFgICwBhISyEBYCwvlhYJ65M731efggLAGFF/CW35iAsAIT119z8jLAAENbJj4P5febHy/zOqRWEBYCwTn7gXu/MD/A7mh/CAkBYMWd4pPH3z8wPYQEgrMMquLgfoUBYAAgrSwW3Walv3yesD+SHsAAQ1sljnLzjJ35IFQBhISyEBYCwXk/6ZcCro8umzp0fwgJAWBGW1hkbfeKN1kbWZ+aHsAAQ1pFZ2esJw7Hq5+aHsAAQ1uHDeu9Pe+78EBYAwor4fcI6hNsc992cOz+EBYCwDgedqvmnj8mQ07nzQ1gACOtI0Em7wvItV8jp3PkhLACE9Y5AUr6U584PYQEgrIht7jmcdga3/ez8EBYAwoq5zbkQ4TVnOP3c+SEsAIR1WBx570B+/fz8EBYAwjpijnyxqepX5IewABBWhHbp1FVirPN2lXvR1LnzQ1gAf7eweu9/JtQm55Doh3pT849vH1tf9ZH8EBYAwort8V07JurtwgS73tUpP4dz7vwQFgDCirnVJ/3Re15b1ua1l/HEz0w7nDs/hAWAsCLMH+/J6YeZVb1z54ewABDWsUncYb4/Z9fv3PkhLACE9aEMe2euYM9GWAAIK4+w9if/ME314JKJc+eHsAAQVox1omGqRx4Dc+78EBYAwooxTzJM9WiA/Nz5ISwAhPW+MVGe8dC580NYAAhLijvlzvU2V7zp3PkhLACEJfH7Kk8OV7nv+Dt3fggLAGHFbG6PLqD6Xt3kr+e580NYAAhL4vVI5Kl64v1+584PYQEgLFkxvcyJ3FXvHXo5d34IC+AvE9bnsvt9qxkXVW9/W5eRHwAgLIX1795ttfrjyuFHtXrb+/12WfkBAMICAISFsAAAYQEAICwAQFgICwAQFgAAwgIAhIWwAABhAQAgLABAWAgLABAWAADCAgCEBQCAsAAAEBYAICwAAIQFAICwAABhAQAgLABAWAgLABAWAADCAgCEhbAAAGEBACAsAEBYCAsAEBYAAML6KHPD+Cn/DwAIaz1olEuFUqU1shAWAFyysLbdohFSesytrJlh3FygsL6iWgDwp4S1rBgyI/sCzYCwABCWi+n6qvw4W+8286dmEWEBwOUKq+X46mYfvtt0xwgLAC5UWI4KjId31RFhAcAXC6ttGJW9ZvvmQZSKpUp36b+dGMajveyUnU2DnbvhJY56mbb9aBjT4MCBYYyjIxbOEcZ4XzZKliSUplyQl27eLhfLjRfn7X4knJedtSoqWViJmtnmo/O+WK50n/fJarn1bJdLxXL9aZ9xHtosAeAyhVU2jCfN5lEp6PbFQdTRJ8E2YeUV1pN3+XFs30uFOIacJYU18i9TFsa2WffzLC+zhJWs2bwcVWSSEtauE76rLPTnocsSAC5TWCunm67Sm4fSZcNh0NFb0eKHnzmF1SwYvrDWRaMSDmbil5GwmmHOxVUjzFRkCCtZs33sK42wWvHb8lp7HrqTBYDLFJYzQStpQkYFo9CcLK31c6tgFNd+R3e6+sw0Z8I5YpsMFumF5ajo2QyHVfMo5VNSWIbRebFWY0c9FaM0XFqLn4UgfUpYqZo5e0qDxdZazh7FNFmtsWu+ycaad50MG7b+PNInCwCXKSynA5fTW5uBdPzhx2PQ0f3Rx74SyCmHsKL9zsCnHU5By7uUsPycF4VoKtjxS00LK1WzWZBSVnBUrFPVph+8GjkTzoX+PNInCwB/kbCsolELX+9L3msnXSU20jCfsMpxNL9iFL2x1tQw7lM1qMR+GaqCSworXTOzaDR2GcIyC0ZpE7x25poD7XloThYA/qIp4cwNgLsE8Wq/o/+MDfOYT1idOMuR7wvHG8lJl5SzIxU/NG6vg0uJSWFpauaUV2o+TjcaYT0H88BgdtjWnocmSwC4TGFpg+5j5V4dbwg2iSdLz8Eg6biwpPVdu7KnglXBaKXHeI/xTDTwjhWoJiksTc3s57obRS9UBtuksJzU3SgsZxh17XnosgSAixSWdlnDuYQlx4PuDePZ+/fl3MJyUs+G7XIY/0JYAP9dYbU1s6BnZTaX1EqGsCbByzu9sNZFZ5K3L6cLO0lYmppFli36SyGOTgkT53EgSwC4MGG5t+Ykr4yZxeSlvGPCGgYhKtuLnOuEZbeM4nqseRjEScLS1CyibhhrOxV0N+O8B9rzOJQlAFyWsNyeXLiPb37+Ofb7fjvcZHZnemHNo6UK3rbgBp+hkSEsd/1BTb5w+B5hpWs2uvdDV94yhUWiWsIwWvtwgBUua0ieR/pkAeBShWWWvcfLvKx3m0X4eJl5wRHQcLHdrSadkht70nX0rTN+mQa2sEqGIWbmdtY2soTlDL1KheSahpOFlarZ0Ch1p+vdeuJ4p2glquUtHJ2a6sLRlHhTJwsAlyos7QP85LtVsoRlV6R7YG7CxMVWlrBG7t71B4WVqpn8vpuqlu7WnNR5pE4WAC5WWNpHJI9L8ZZdRkefFmIzWCLw1XiQJaxdWZqsvVtYyZptb6LKt3epamlvfk6eR+pkAeByheX+CEXd+xGK9jh6Cow1bJSLxXJ9uM3u6C+tcjF8jstuWCkVy52FnSks936b+ceFlayZvXkUbt07UfRJrpb28TLJ80hlCQAXLKwvYV8OHsEAAAjr0oU11D95CwAQ1qVhjorSY0cBAGFdrLD8q3X3fLAACOsvEVaFARYAwvorhFUod00+VwCE9ZcE3QEAYSEsAEBYAAAICwAQFsICAIQFAICwAABhISwAQFgAAAgLABAWAADCAgBAWACAsAAAEBYAAMICAIQFAICwAABhISwAQFgAAAgLABAWwgIAhAUAgLAAAGEhLABAWAAACAsAEBbCAgCEBQBwgcL6HwDAIRAWACAspoQAQAwLAABhAQDCQlgAgLAAABAWACAsAACEBQCAsAAAYQEAICwAAIQFAAgLAABhAQDCQlgAgLAAABAWACAshAUACAsAAGEBAMJCWACAsAAAEBYAICyEBQAICwDgYoW1HdbLxWK5PjTfWdeKMcqTTBgD3eaioS13M2pVSsVy8zncsOyUi6XGLJFsNxSlQqnSGK7O/xnkPK+Q+aNw2rHSXeprnNptL9z9lcc133ZAWLkZl4yA0mD/CR27YgzfI6xmWKuf/vuZX83CUEm1roTJynnqOfxEYS2jZpzoapzabQ+L/oYW33ZAWHkZOH39cb6xVpNOyZhfjrA67dHcXE8dIXmZmyWj/GwtGkZhpo7ait25ac7HbfHHhVXpThbb1VPJKC41NU7utp8Mo/lsbl+6Xb7tgLByMisYIhSG2flUYWWQIawAq2J4Krr3+/k+eBtOswzj6ZR6fqawojoVjW52jaPdq1I4dgRAWHnLEUbZ/GhdP1NY9k+j5P5XNjr+BNYoSDGfoWHsLk1YTpOK7BpHu38a5R1fc0BYJwlrYaTnaUVjFkZdLLffjb0ZmuFvbRh3zlDsqeHFj1dRx1623fiyP0BT9j7FIabTpoQhN150amX41bDNgmwRR1iJkPVz0w1kD6ywYnPnfbm9VGuSSOckW7jJOmt7P6yUipWJnT5cl/mi5exN1bjpGSmjxuFup13v+ZYDwjpNWE6PXx4WVtsfKJQN11T2vmQ8u9uC+PE86LqdkvRe2ftRYe0qXvlTw1j4G8rGjTShNYyWJaXed4LiKmZQsWJUFVlYarooWcVs+HHysZ06PCvzlLD25UM1Dnc7Pps+10rFcpeLhICw8gqr60+4DghrZFS812VvYPBilJyJzM/2ZGGtxhVvl9t1jfJ4tRmXjJo32UnufVfQ3WMzqxnlle89K8ylLfV+p+hSczALJ1f3RvFmvl09lY1mWLGRaY7LRtlSpoRqOjfZZL16LBjlQne+nVWM8l5zuCbz8Ub3N6Awz65xuPvZMO4LvkDnfNsBYeWjFY4QOvEVdlVY64KxcrvZz3LREcuDUY8PXpX8lBWj5A0TRkbR0u19p7AWbo2K7VXQzYOtNV8XAUt/WUPRX+20Lhr+bG5e9AaOFV8O9rzg1SGqSSJdWP+m4U/TnILndurwdObFpabWzt7OgRqHu8fOOK483m6GJWJZgLDOJyynYz65fXnadvurMB6lo+u+gir+dS97Hc2C1L0fEZZReTokLHs/bpa9dDdeqoodhp+evH8bYdyoLtckkS6s/8AobL0XJT/8pB6ezrytqfSqbFSs7BpHu11hzX3Ln3KhE4ApYYjQCqvrbi0VrZHTra2iP/aYNsvFSBOxCAoH975jSrietQueIrMmWH5Fx62CF+J2rFtw8Mp+8IoOAtuPnpejmiTShdtHob2Dy4Pq4enMNaezdibCflBKW+N499Tw589uiKvN1x0QVi6UoLteWBOnt84N4YyfKk43K/maC+lK/TsUVmrv+4XlyaK4zg5hhzwX3P4frY43/MldVPTIq3f0NpEurH9aWPLh6czTix42FT/kZutrLO1eBK3jDkQFX3dAWLlQljUkhLXwhbUtGotHd5hTMdY/vdnNs2G0Z+ud24c1wkrv/ZCwNoYxlRYJbAv6xVF1VzZtdbqYOcJKpMsWlnx4OvNURUxHSKH/NTWWd++KobBqCAsQVt5y5IWjgbBKQXB5EkxqHNHUXBN1jZHf5W/CLlbRCSu990PCWhtedaRlmKvMYNzAu4YpO0Ufw0qkyxaWfHg685HGV3EQL1VjdbdgSggI6z235tRMVViBaPYiENa9USuW9q7AGgVvAvkz6GsT7ZQwuTeK079PWPd+f7/R3+gSaa3kymVZVOeL4WW+hX+VMKpJIl22sOTD05knhLUVRkm66JCscWL3Uxx0H/N1B4SVE//mZ3O/nraKvrDujeJgtXl2fOULa+a8cGdDZiFYJjk2jPulNf9Z1AorubdjVBa7k4U1rwxeVrvNczu4dLnR3vw8rtxMFxtrMSx7E0f7zruh2FpOf1b8ihnlsb+QaivXJJEuW1jK4anMVWFZIlxIG8xl1RondzsiC5Y1VPZ83QFh5SV+vEyh6c1dzHLwXJdAWHsnwTDowJ1w7OWtOKjphJXcOyu8Z6X7PApw1/2lBuHDWpQ8RlEqf/s+CvgX/Iq1g6XqL0pNEumyhaUcnspcFdZzHJMva2qc2r0Mmrm85NsOCCs/24H7AL+SuAknLOtOuVCqPy/DC/P14FLiTTh7sW6cBJW7bUt7lTCx156IUuFkYe1nPyvlQrHcmoZbvNsV68+JVPei7D7ArxvW/aXtPoxQ3C+Cis2bpUJ0M2BYk0S6bGGph6cyPywstcbp3eZNpVis3Jt82QFh/T1neiSG9RHe+bgFAEBYCAsAYSEshAWAsBAWACAshAWAsBAWACAsAACEBQAIC2EBAMICAEBYAICwAAAQFgAAwgIAhAUAgLAAABAWACAsAACEBQAIC2EBAMICAEBYAICwEBYAICwAAIQFAAgLYQHAvyqsrhDt4OWuIYT3Y/JtMY/+PUBLLC6ltZpieYaUTls41FoP8Ymvhp1mrXk92ened8Uwu6DFtdOczv5ppy7EzBZik0yha2B1W/7TihkcqlSeRGoVcmUH8IXCCr0zFQgrYOxv2A9rwYbWXPP+kLDWDTfZ0H7xkiMsQFhnElY7/EreOS//cWG5LWHOO6K29jb8EuJ6ttlt5oN6W/P+kLCmor3aO//3xYP3K2YICxDWWYQ1rLXcnmWbtVbfF1Z2f/oXhGXbm5qYuv+Po6GWvR5o3h8S1ihoyq6fVV4uQFjvTQkI60uENb4TL373HPZ1I6z99LpZa/7y5WQO2/V6+9fL3ptAuri/rWyNOs7WJzPsZfObRq092qcPj9hPb5q11s1s7x/wctN0XaDkExelvtblkSgzUWiiMHfTSz1yT1pYjordnbumeJB3J98nhSXVfiTSbJJV8Rt4M7lu1RrdaYawpNPaCrEPJDJKt7O9GbRqrcHGN0zcpmpTKImCsJyoBb9kOxbduAqJlGo2ygcF8KXCmvn9sCOWOmFZd35/q7ldatsOet9CFtYm2Npa+b1s6L/tpw6P+/ZNlI97wMCPGyn5SEUpr7V5qGUmCk0U5gprWvN2zYQwNQIya57Cnb3KACf5PiEsufZZwlKq4jdwuKWvFZZ8WilhKee8anlvmneBsII2VZtCTRR/BfwXHW806FchkVLNRv3AAb5UWLtG3bLtpejYOmH1RWuytpYDUVu5f4NbM3O3er5eyFPCa9GYmttpU3T8MYzozrfrod8rlcMj+qI2Wu3WsxvfIeJ6sUvmIxelFKvLQy0zUWiisKWbX/3FzhKWOe/6JzIULaWpku8TwlJb4SkxJfSFpVTFb+D+cL62VqOamOmEJZ9WSljKOXedNrLMSV0EwgraVG0KNVHAxPnkXZaivo2qkEipZqOeKsCXCsvpAFO3O451wlqJ+jLww8D9Z5yOYc2FP6dcCK/ThV/jjtut1MNDlkKO7DRFa5fORy6qr5m/KXkoZSYKTRa2dGTSXNhaYfnUB6Z/dFcpMfleFVaiFbTCUquiyGks7nTCkk8rJSx55zzw1jQUlt+malMkEgU4A8qVL+SHqAqJlKls5FMF+FphzcW1vW/VNjphjcK4zdz9OzyUtRMKaxj8hXb+8A68vjINNg+Sh8cR6Y7SLceafOSilGJ1eShlJgpNFrZwRgvLjLYI6HjWuBM3yu7ke1VYiVbQCkutiiKnlT98SwpLPq2UsOSdQ+cz9GJNrUBY46CV1I9PSRSf2MjfGA/yEimT2SinCvC1wrLbtfXc7Y0aYf2KgzBNZ4hQE+2nl60qrF/h1/bJG4I0g81jN7iiHh7yS+kvzaCTqvnIRSnF6vJQykwUmiysI9rrrLZwU1rLoai5NXpIjKgeDo6wEq2gFZZaFb+B99Oblre6q6YTlnxaKWHJO+/ixSlDpU3lpkgkioNzbc9FzX1UhUTKZIsqpwrwxcIaiXHf7VgaYV3HX9WG+612RyG167ksrGuv/0TBkPBavNeREodH4Z6Rrc7SNPnIRUmv/WDwUs1DKTNRaLKwhrjZHRKWN/HpnBzDStReKyy1Ksm/CDphLQ8JSz3nYNYcXSUMaqU2hZIoZNdwP8l+sM2rQiJlRotOlBEjIKwvEtZKtBsNK2OElViHs54O2/4IJDXCGgUjrKU8wtIt40kOepa6fOSipNehsBIjrKUywhoeKGzWyjJWJKCZENapVwkTtc87wpqJ2mi53dvmcWFZobD6GmGlRlhLzclnjLAcKw0Ca2WOsNQWTXxQAF8qLDd607dtfQxL80d04EVz2lkxLKkjaQ9PhZWWunzkotKvkzEsufOq2acKW2cZSxaWM2u0msGKgYDk+7PEsAZBnovjwtp7tfLyTAsrFcNaak4+I4blzgZ3z+E9pfoYlpoNMSz4o8KaCP8Se1pY6oWtgKn35W7714rSVwmljqQ93N36nO6W2otP0+jebPW1mofaedVC04Wt23pjSVPC+s4+caV7zquEzylheXns744LyxlcToMS0sJKXSVchic/VeqouUro5Ty7C+d5uquEqWy4Sgh/Ulh22FF167Bqw+XOXE7vJs5kYPCy2pmztnfR6Jf4tdn7eTSmW+s5WocldyTlcKkgfz3S3UI6QM1HLkopVpdHomerhaYLc4x1vbMz1mG5QXc/G9ci17PN3gzuHUy+V9dhqa1weB3WXbQOayLqU3M7v84Rw3Lk1pxt19OmTlipdVjLqJWkptCuw/Jqe10Lhm9Z67DUbORTBbggYe1+SY8wCC/8t9Z+d/dXuq8TK93ljqQcHs+urlOLz+1EPnJRSrG6PBKdVy1UU1hgrIx1WEJ0/M0nPa1BbQW9sJSqeA1sBUcNcwhr3fQLuNMJK7nSPWhTtSm0K93d7c7GrnItIJFSzWbNSne4VGE53fquVWu0H2ZWcONbvT30+7P3qCdvSePIvdVvaOp6mXx4zH563ai17uTb+xL5yEWpxWrySJapFqopzDeWVli1Zjd6/JW9HHYa8vOwlPeJewmVVtALS6mK38DmwKnp9SxH0N2xyK9mrTU0dVcJg5v/+hv1KmGyKZREEp14ziffSyilVLJRThWAJ44CAMICAEBYAICwEBYAICwAAIQFAAgLYQEAwgIAQFgAgLAQFgAgLAAAhAUACAthAQDCAgBAWACAsBAWACAsAACEBQAIC2EBAMICAEBYAICwEBYA/DeFtRy06/VO4ieb1uIukSy9JXv3ftpt1FrX481p59yKfhfwU38CfSH94vyRs7LtTaIqlhAt/9dDG+IzKvQONOdw9LSkVNlpGy36IVyasMbBb4M25mcTlvsLyR437xbW6FKENVF+KNATlph8SFgr8esThKXmirDgPyqsqRAPC2s764j68lx/5qf+D7K/DN7ZD2eiu/siYR3lurFPCKtea+0uXVjvHpohLLhoYW0b4sl7sbuOfqv8w8LqB3m+k1WjtfnMpj3FD2YtkdYSrYH/Y9kIC+CrhTUW7WAEsa65v27u9J31Q1Msgu/yftyutYY795vrb/H2N+qdmdfRBu16o/usEdZU7o6/mrV2f+UNvbr1enu0s+24IHt+16y1/N2BQ9u1RTJ3+Y1z5OquUe++SGVI9YxzzjpGPoew2lIlEwPQWUpY63rTioUlnVOkn9WvRv1mZW/6zXo3eS4jf847lcpUGjXKxD8JuX1m1816u7/0xqBPsVLcc4hzlT4NTU2UhlCmhPLnIDcnwAUJ61ccLbp2Bw4Lcd10vvihsPp+KEoW1rUfaXIjO0G8aZwU1lh0TSkI5OEO34bBy50dFxTsbiylAJjf7eTc5TfBkaIm9W+pnlHOmcfI5xBUW6pkon3qVkpYznmMI2HJ5xS6xi+rtfZKaZhq9SO1xGUqjapksrCl9pn6L1snCCtVE6UhZGEpn4PcnAAXJKyOiAYqQzF0v9CiPd+G3+IXUR9vNpO6kIQlOvPt+pf3pjNd7TbTet1MCMtqi/r108yT1qIm+ktrNXEmPXNRG63NacNzZFDQstacrnerYeyKUXhZTs5dfuMe+bJdPohm5BK5ntEpZB4jn0NwVnElE3qqJydarrA29eY2EJZyTqFrRGdhLdui6VRj2fUsJZ9LMHmTylQaNcrEOwm5fbpi5Lyc3umEpQ26a2qiNIQkLOVzmHvNOfabE+CChNUSi9gUXt+pr+NvfN8f34xlYTXc+NK23rTj42bJeMhm0HD/ived/jmIlwX0XSO6nc3XilfQIBhV3IggbDUTXSXKPZLnZN6bhah5E5duPPGU6xmdQuYx8jn41R5kLaOYKZPbUFiO20eBsJRzCl3jDapmfjUW4iFxLoFapDI1jRqehNw+3fo+rlc+YaVqojSEJCzlc1CaE+CiR1hd6Rvf9jViysK69va3a27X67fqIrjMnwjg7hfTfl20d04B0WSvLfwISVOYUUEdUQuWVfjiXMYBdzl3+U1YxYnvCjtRz2h/5jHyOfjVliqp0q+ZOmGZDccEnrCUcwpdc+PH1jt++m7iXAK1SGUqjRpu6trJ9hmLu5l5mrBSNVEaQhKW8jkozQlwQcK6C2JEcQzrQfrGt4IeVJeD7lHfWjak0IzmitOm5fwZbwkrHs1ZQSdcRwXFS6/mfsC9Ho74lNzlN4uga87iIYpcz+gUMo+RzyE4T2FpW2ffuLZ1wnLGSk++sJRziuLlfgt6tti7tlDOJVCLVKZcoWjTg51sn/20I0RruDlBWKmaKA0hCUv5HJTmBLggYWmuEh4ZYcV9qy8eFtu988c6Q1jemC17hNX3t8nTtyjgbidyl98cH2H1UxkkRlj9nCOsebBGNCWsbaNuZo+wUppQzkU3wtIIK9iktI+9nY8aLdP1jXfuVu10YelHWEo5jLDgUoVl1oNwcbAOSxXWgyaGFfetrt9JbzKFdeOMA7JjWH0/RjOUDniS3im5y280MawHNYbVT2WQiGElhZUVwxqIjV5YzhBrmB3DSmlCOZeV31JKDCtTWGr7+CV7p+Dl8SwkYd3lE1ZWDEsqhxgWXKqw3Gvl/YW1fQlWuqvCehH1SfIqYdy3HsRgbS0f0lPC4cPzcrtd9N35xTJ1lbAZXCX0MnJ2DxZbczG6SwbcldzlN/4FtFVfvUo4ka4S9lMZKMekhbXMuErYSq9zCIRlNet16SphU7lKmNKEci6WaK72SpkHhCW3T3e82FqLtqsaqy4m5mbaiIUV5HpcWFJDKFcJpc9hLl90BbgkYSXuJVSFFS3IaeuENfd21vopYfXlW5jHWeuw/IymQfFt9ypZfC9hR81dfnNoHVZbyjnzmLSw5EpKLOIAX1JY3hG2rV+HldKEci7O6MZbMTWW1mFlCktunyAQ1tpGxf6KY1hhrkeFlbEOSyonbM5r1mHB5QnLXvZb9Xp7uLE1wvKXPG/cr3paWPZLt964nk9TwjKnv9r1WuvON4q7hLo9CFe619ojS+mRi36r1uyMVu6DEWRhKbnLb7JXunv1jHPOOkYjLLmScgxulSmsXUtEK93Dc8oUlnou67uGp5aozEPCktpnOezUG+0nb3a5H7VqrdFeElaY6zFhZa10j8sJm9NCWHCBwsozbexfUMtk33mXXc/33a3Xbv/nvlaLi/ooAWGdV1ij8dJajevi5cL73LF60k9pCPgHhDXwJ2j9S+9zx+pJP6Uh4B8Q1mboPo10vL/0PnesnvRTGgL+AWEBACAsAEBYCAsAEBYAAMICAISFsAAAYQEAnFlYGAsALsZXCAsAEBYAAMICAISFsQDg0n2FsADgPyQsjAUAF+IrhAUA/yVhYSwAuAxf5RMWxgKAz/fVWYTFEAsALmKAlUtYGAsALsFX+YSFsQDgAnyVU1gYCwD+vK/yCovIOwB8oq7y+Sq3sDAWAPxpX+UXlmsslAUAn6CrvL46QVgoCwD+qK5OE5avLKQFAGeT1Sm6OlVYobIAAM7CaQI6VVhICwD+iKzeKywAgD8CwgIAhAUAgLAAAGEBACAsAACEBQAICwAAYQEAICwAQFgAAAgLAABhAQDCAgBAWAAACAsAEBYAAMICAEBYAICwAAAQFgAAwgIAhAUAgLAAABAWACAsAACEBQCAsAAAYQEAfBb/D3F6vDK2ye/1AAAAAElFTkSuQmCC";
function szAuditEsc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(szAuditEsc, "szAuditEsc");
async function szAuditRead(env, key, fallback) {
  try {
    return env.SPORTS_KV ? await env.SPORTS_KV.get(key, "json") || fallback : fallback;
  } catch {
    return fallback;
  }
}
__name(szAuditRead, "szAuditRead");
function szAuditRank(data) {
  if (!data || !Array.isArray(data.rows)) return data;
  if (data.format !== "odi" || data.type !== "batsmen" || data.updated !== "2026-09-30") return data;
  return { ...data, sourceNote: "September 30 snapshot: Rohit's rating corrected to 719 against the dated ICC announcement. Other feed values are not independently confirmed.", sourceUrl: "https://www.icc-cricket.com/news/kohli-closes-in-on-top-spot-in-icc-odi-batter-rankings", rows: data.rows.map((r) => String(r.id) === "576" && Number(r.rating) === 753 ? { ...r, rating: 719 } : r) };
}
__name(szAuditRank, "szAuditRank");
function szAuditCards(rows) {
  return rows.slice(0, 60).map((m) => '<a class="mrow" href="/match/' + encodeURIComponent(m.sport || "cricket") + "/" + encodeURIComponent(String(m.id || "")) + '"><div class="mt1">' + szAuditEsc(m.title || (m.home?.name || "") + " vs " + (m.away?.name || "")) + '</div><div class="msc">' + szAuditEsc((m.scores || []).map((x) => x.value).join(" \xB7 ")) + '</div><div class="mm2">' + szAuditEsc(m.statusText || m.status || "") + (m.start ? " \xB7 " + szAuditEsc(m.start) + " (source time)" : "") + "</div></a>").join("");
}
__name(szAuditCards, "szAuditCards");
async function szAuditSchedule(env, path) {
  const [c, f] = await Promise.all([szAuditRead(env, "cricket", { matches: [] }), szAuditRead(env, "football", { matches: [] })]);
  const rows = [...(c.matches || []).map((m) => ({ ...m, sport: "cricket" })), ...(f.matches || []).map((m) => ({ ...m, sport: "football" }))];
  const archive = path === "/archives";
  const chosen = rows.filter((m) => archive ? m.status === "finished" : m.status !== "finished").sort((a, b) => archive ? Date.parse(b.start || 0) - Date.parse(a.start || 0) : Date.parse(a.start || 0) - Date.parse(b.start || 0));
  const h = '<section aria-label="' + (archive ? "Results" : "Fixtures") + '"><h1>' + (archive ? "Archives" : "Schedule") + "</h1><p>" + (archive ? "Recent cricket and football results" : "Upcoming fixtures and matches in progress") + '. This is the latest saved feed snapshot, not a guarantee of a live result. Times below use the source timestamp; the live view converts them to your local time.</p><p><a href="/schedule">Fixtures</a> \xB7 <a href="/archives">Results</a> \xB7 <a href="/blog/follow-live-scores-with-context">Read scores with context</a></p>' + (chosen.length ? szAuditCards(chosen) : '<p>No saved fixtures are available right now. <a href="/">Open live scores</a> or try again later.</p>') + "</section>";
  return SCHED_PAGE.replace('<div id="app"><div class="skel"></div><div class="skel"></div></div>', '<div id="app"><div style="grid-column:1/-1">' + h + "</div></div>");
}
__name(szAuditSchedule, "szAuditSchedule");
async function szAuditRankPage(env) {
  const d = szAuditRank(await szAuditRead(env, "rank_odi_batsmen", null));
  const note = '<p>Rankings are dated feed snapshots, not live points recalculated after every ball. Batting, bowling and all-rounder lists measure different performances. Use the format and category controls to compare like with like.</p><p><a href="/news/kohli-second-icc-odi-ranking-september-30">September 30 ranking report</a> \xB7 <a href="/sports/cricket">Cricket coverage</a></p>';
  const rows = d?.rows?.length ? d.rows.slice(0, 100).map((r) => '<div class="row"><div class="rk">' + szAuditEsc(r.rank) + '</div><div class="nm">' + szAuditEsc(r.name) + "<small>" + szAuditEsc(r.country) + '</small></div><div class="rt">' + szAuditEsc(r.rating) + "</div></div>").join("") : "<p>No saved rankings are available. Please try again later.</p>";
  return RANKINGS_PAGE.replace('<div class="upd" id="upd">Loading...</div>', '<div class="upd" id="upd">' + (d ? "Feed snapshot " + szAuditEsc(d.updated || "date unavailable") : "Snapshot unavailable") + "</div>" + note + (d?.sourceNote ? "<p>" + szAuditEsc(d.sourceNote) + ' <a href="' + d.sourceUrl + '">ICC source</a></p>' : "")).replace('<div id="rows"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>', '<div id="rows">' + rows + "</div>");
}
__name(szAuditRankPage, "szAuditRankPage");
async function szAuditF1Page(env) {
  const [st, list] = await Promise.all([szAuditRead(env, "ser_f1", null), szAuditRead(env, "espn_f1", { matches: [] })]);
  const table = /* @__PURE__ */ __name((title, rows) => '<div class="tbl"><h2>' + title + "</h2><table><tr><th>Position</th><th>Name</th><th>Team</th><th>Wins</th><th>Points</th></tr>" + rows.slice(0, 100).map((r) => "<tr><td>" + szAuditEsc(r.pos) + "</td><td>" + szAuditEsc(r.name || r.team) + "</td><td>" + szAuditEsc(r.sub || "") + "</td><td>" + szAuditEsc(r.w ?? r.wins) + "</td><td>" + szAuditEsc(r.pts) + "</td></tr>").join("") + "</table></div>", "table");
  const h = '<section><h1>Formula 1 season hub</h1><p>Saved championship standings and race fixtures. Points reflect the data provider snapshot and may be delayed or corrected. Race-session fixtures and the Grand Prix race date are different events.</p><p><a href="/blog/f1-gap-interval-and-fastest-lap">Understand F1 timing</a> \xB7 <a href="/sports/f1">F1 scores and news</a></p>' + (st ? table("Drivers championship", st.drv || []) + table("Constructors championship", st.con || []) : "<p>Standings are temporarily unavailable. The live view will retry.</p>") + "<h2>Race fixtures and results</h2>" + szAuditCards((list.matches || []).map((m) => ({ ...m, sport: "f1" }))) + "</section>";
  return SERIES_PAGE.replace('<div id="app"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>', '<div id="app"><div style="grid-column:1/-1">' + h + "</div></div>");
}
__name(szAuditF1Page, "szAuditF1Page");
var SZ_COMMONS_API = "https://commons.wikimedia.org/w/api.php";
var SZ_SPORT_RULES = [
  ["cricket", /\b(cricket|ipl|bcci|icc|test match|odi|t20|wicket|batter|batsman|bowler|innings|ranji|irani cup|asia cup)\b/i, "cricket match"],
  ["tennis", /\b(tennis|atp|wta|grand slam|wimbledon|us open|roland garros|australian open|davis cup)\b/i, "tennis match"],
  ["f1", /\b(formula 1|formula one|f1|grand prix|verstappen|hamilton|leclerc|norris)\b/i, "Formula One race car"],
  ["basketball", /\b(nba|basketball|wnba|lakers|celtics|warriors)\b/i, "basketball game"],
  ["baseball", /\b(mlb|baseball|dodgers|yankees|world series|ohtani|post-?season|home run)\b/i, "baseball game"],
  ["hockey", /\b(nhl|ice hockey|stanley cup)\b/i, "ice hockey game"],
  ["nfl", /\b(nfl|american football|quarterback|touchdown|vikings|dolphins|super bowl)\b/i, "American football game"],
  ["hockey-field", /\b(hockey)\b/i, "field hockey match"],
  ["football", /\b(football|soccer|premier league|la liga|serie a|bundesliga|champions league|fifa|uefa|goal|striker|man city|manchester|chelsea|arsenal|liverpool|barcelona|real madrid)\b/i, "association football match"],
  ["boxing", /\b(boxing|boxer|bout)\b/i, "boxing match"],
  ["wrestling", /\b(wrestl)/i, "wrestling match"],
  ["archery", /\b(archery|archer|compound|recurve)\b/i, "archery competition"],
  ["badminton", /\b(badminton|bwf|shuttler)\b/i, "badminton match"],
  ["athletics", /\b(athletics|sprint|marathon|javelin|long jump|track and field)\b/i, "athletics competition"],
  ["golf", /\b(golf|pga|masters)\b/i, "golf tournament"],
  ["rugby", /\b(rugby)\b/i, "rugby match"],
  ["kabaddi", /\b(kabaddi)\b/i, "kabaddi match"]
];
function szSport(t) {
  const hits = SZ_SPORT_RULES.filter(([k, re]) => re.test(t));
  let keys = hits.map((h2) => h2[0]);
  if (keys.includes("nfl")) keys = keys.filter((k) => k !== "football");
  if (keys.includes("hockey")) keys = keys.filter((k) => k !== "hockey-field");
  if (keys.length !== 1) return null;
  const h = hits.find((x) => x[0] === keys[0]);
  return { key: h[0], query: h[2] };
}
__name(szSport, "szSport");
function szSingles(text) {
  const out = [];
  const words = text.split(/\s+/);
  words.forEach((w, i) => {
    const c = w.replace(/[^A-Za-z'’-]/g, "").replace(/['’]s$/, "");
    if (i > 0 && /^[A-Z][a-z]{4,}$/.test(c) && !SZ_NAME_STOP.has(c) && !out.includes(c)) out.push(c);
  });
  return out.slice(0, 2);
}
__name(szSingles, "szSingles");
var SZ_NAME_STOP = /* @__PURE__ */ new Set(["The", "A", "An", "In", "On", "At", "For", "To", "Of", "And", "But", "With", "After", "Before", "How", "Why", "What", "When", "Who", "As", "By", "From", "Over", "Is", "Are", "Has", "Have", "Will", "Could", "Would", "New", "First", "Last", "Day", "Asian", "Games", "League", "Cup", "Premier", "Champions", "World", "Series", "Test", "Match", "Final", "Semi", "Round", "Group", "India", "Indian", "England", "Australia", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Man", "Three", "Two", "One", "Six", "Four", "Five", "Report", "Live", "Update", "Watch", "Video"]);
function szCandidates(text) {
  const out = [];
  const re = /\b([A-Z][a-zA-Z'’.-]{2,}(?:\s+(?:de|van|von|al|bin|di|da|le|la|del)?\s*[A-Z][a-zA-Z'’.-]{2,}){1,2})\b/g;
  let m;
  while (m = re.exec(text)) {
    const words = m[1].split(/\s+/).filter((w) => !/^(de|van|von|al|bin|di|da|le|la|del)$/i.test(w));
    const clean = m[1].replace(/['’]s$/, "");
    if (words.length < 2 || SZ_NAME_STOP.has(words[0])) continue;
    if (words.some((w) => SZ_NAME_STOP.has(w) && words.length === 2)) continue;
    if (!out.includes(clean)) out.push(clean);
  }
  return out.slice(0, 3);
}
__name(szCandidates, "szCandidates");
var SZ_LICENCE_OK = /^(cc0|public domain|pd[- ]|cc[- ]by(-sa)?[- ][234]\.\d|cc[- ]by(-sa)?[- ]\d\.\d)/i;
function szStrip(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
__name(szStrip, "szStrip");
function szVerifyCommons(p, must, any) {
  const ii = p.imageinfo && p.imageinfo[0];
  if (!ii) return null;
  const x = ii.extmetadata || {};
  const v = /* @__PURE__ */ __name((k) => szStrip(x[k] && x[k].value), "v");
  const lic = v("LicenseShortName");
  const artist = v("Artist").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (!SZ_LICENCE_OK.test(lic) || /\b(nc|nd)\b|non-?commercial|no-?deriv/i.test(lic)) return null;
  if (!artist || artist.length > 120 || /unknown|anonymous|^n\/?a$|^\?$/i.test(artist)) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(ii.mime || "") || !ii.thumburl || (ii.width || 0) < 600 || !(ii.thumbwidth > 0) || !(ii.thumbheight > 0)) return null;
  if (v("Restrictions") || /non-?free|fair use|copyrighted/i.test(v("UsageTerms") + " " + v("Categories"))) return null;
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(ii.thumburl) || !/^https:\/\/commons\.wikimedia\.org\//.test(ii.descriptionurl)) return null;
  const licUrl = v("LicenseUrl");
  const isCC = /^cc/i.test(lic);
  if (isCC && !/^https:\/\/creativecommons\.org\//.test(licUrl)) return null;
  const hay = (p.title + " " + v("ObjectName") + " " + v("ImageDescription") + " " + v("Categories")).toLowerCase();
  if (must && !must.every((t) => hay.includes(t.toLowerCase()))) return null;
  if (any && any.length && !any.some((t) => hay.includes(t.toLowerCase()))) return null;
  return { url: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight, file: p.title, page: ii.descriptionurl, artist: artist.slice(0, 100), licence: lic, licenceUrl: isCC ? licUrl : "", desc: v("ImageDescription").slice(0, 140) };
}
__name(szVerifyCommons, "szVerifyCommons");
async function szCommonsSearch(q, must, limit, any) {
  const u = SZ_COMMONS_API + "?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap") + "&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=800&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|ImageDescription|ObjectName|Categories|Restrictions|UsageTerms&origin=*";
  const r = await fetch(u, { headers: { "User-Agent": "ScoreZaap/1.0 (https://scorezaap.tech; news photo credits)" } });
  if (!r.ok) return [];
  const d = await r.json();
  const pages = Object.values(d.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const out = [];
  for (const p of pages) {
    const v = szVerifyCommons(p, must, any);
    if (v) out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}
__name(szCommonsSearch, "szCommonsSearch");
var SZ_SUMMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
function szWordRuns(a, b, n) {
  const A = a.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean), B = " " + b.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).join(" ") + " ";
  for (let i = 0; i + n <= A.length; i++) if (B.includes(" " + A.slice(i, i + n).join(" ") + " ")) return true;
  return false;
}
__name(szWordRuns, "szWordRuns");
function szValidSummary(sum, src) {
  if (!sum || sum.length < 40 || sum.length > 420) return false;
  const sents = sum.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sents.length < 1 || sents.length > 4) return false;
  if (/[<>{}\[\]]|https?:|\n/.test(sum)) return false;
  if (szWordRuns(sum, src, 7)) return false;
  const srcL = src.toLowerCase();
  const nums = sum.match(/\d[\d.,:%-]*/g) || [];
  if (nums.some((n) => !srcL.includes(n.replace(/[.,]$/, "")))) return false;
  const caps = sum.replace(/(^|[.!?]\s+)\S+/g, "$1").match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g) || [];
  if (caps.some((c) => !srcL.includes(c.toLowerCase()))) return false;
  return true;
}
__name(szValidSummary, "szValidSummary");
async function szSummarize(env, n) {
  const src = (n.title + ". " + (n.desc && n.desc.toLowerCase() !== n.title.toLowerCase() ? n.desc : "")).trim();
  if (!env.AI) return "";
  const sys = 'You write short neutral news summaries for a sports site. Use ONLY facts stated in the headline and snippet. Keep every concrete fact that appears there: who, what happened, numbers, scores, results, injuries, dates and teams. Restate the meaning exactly: never negate, soften or reverse it, and never add names, numbers, places, causes or opinions that are not given. Write 2 or 3 plain sentences in your own words; do not copy a phrase of more than six words in a row. Do not write vague filler such as "a player" when the headline names the person. If the snippet only repeats the headline, write 2 sentences that restate the headline in different words. Output the summary text only.';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await env.AI.run(SZ_SUMMARY_MODEL, { messages: [{ role: "system", content: sys }, { role: "user", content: "Headline: " + n.title + "\nPublisher snippet: " + (n.desc || "(none)") + "\nPublisher: " + n.source }], max_tokens: 160, temperature: attempt ? 0.1 : 0.3 });
      const out = String(r?.response || "").replace(/^\s*(summary:?)\s*/i, "").trim();
      if (szValidSummary(out, src)) return out;
    } catch (e) {
    }
  }
  return "";
}
__name(szSummarize, "szSummarize");
async function szFindPhoto(n, sportCache) {
  const text = n.title + " " + (n.desc || "");
  const sp = szSport(text);
  const sw = sp ? sp.query.split(" ")[0].toLowerCase() : "";
  const sportWords = sp ? { nfl: ["football", "nfl"], football: ["football", "soccer"], f1: ["formula"], hockey: ["hockey"], "hockey-field": ["hockey"] }[sp.key] || [sw] : [];
  let calls = 0;
  for (const c of szCandidates(n.title)) {
    if (calls++ >= 2) break;
    const must = c.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const r = await szCommonsSearch(c, must, 1, sp ? sportWords : null);
    if (r[0]) return { ...r[0], kind: "subject", label: c };
  }
  if (sp) for (const c of szSingles(n.title)) {
    if (calls++ >= 3) break;
    const r = await szCommonsSearch(c + " " + sp.query, [c.toLowerCase()], 1);
    const ok = r.find((x) => sportWords.some((w) => (x.file + " " + x.desc).toLowerCase().includes(w)));
    if (ok) return { ...ok, kind: "sport", label: sp.query };
  }
  if (sp) {
    let list = sportCache[sp.key];
    if (!list) {
      list = await szCommonsSearch(sp.query, null, 8, sportWords);
      sportCache[sp.key] = list;
    }
    if (list.length) {
      let h = 0;
      for (const ch of n.link) h = h * 31 + ch.charCodeAt(0) >>> 0;
      return { ...list[h % list.length], kind: "sport", label: sp.query };
    }
  }
  return null;
}
__name(szFindPhoto, "szFindPhoto");
async function szOembed(link) {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:") return null;
    const r = await fetch(link, { headers: { "User-Agent": "ScoreZaap/1.0", "Accept": "text/html" }, signal: AbortSignal.timeout(6e3) });
    if (!r.ok) return null;
    const html2 = (await r.text()).slice(0, 15e4);
    const m = html2.match(/<link[^>]+type=["']application\/json\+oembed["'][^>]*>/i);
    if (!m) return null;
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) return null;
    const e = new URL(href.replace(/&amp;/g, "&"), link);
    const reg = /* @__PURE__ */ __name((h2) => h2.split(".").slice(-2).join("."), "reg");
    if (e.protocol !== "https:" || reg(e.hostname) !== reg(u.hostname)) return null;
    const j = await (await fetch(e.href, { headers: { "User-Agent": "ScoreZaap/1.0" }, signal: AbortSignal.timeout(6e3) })).json();
    const img = j.type === "photo" && j.url ? j.url : j.thumbnail_url;
    if (!img || !/^https:\/\//.test(img) || !(j.provider_name || j.author_name)) return null;
    const w = Number(j.type === "photo" ? j.width : j.thumbnail_width) || 0, h = Number(j.type === "photo" ? j.height : j.thumbnail_height) || 0;
    return { url: img, w: w || 800, h: h || 450, artist: String(j.provider_name || j.author_name).slice(0, 100), licence: "", licenceUrl: "", file: "", page: link, kind: "oembed", label: "" };
  } catch (e) {
    return null;
  }
}
__name(szOembed, "szOembed");
async function szEnrichRun(env) {
  try {
    await szAutoSchema(env);
    const feed = await szAutoGet(env, "headlines");
    if (!feed?.items?.length) return;
    const store = await szAutoGet(env, "enrich") || { items: {}, sports: {} };
    const sports = store.sports || {};
    const now = Date.now();
    const sportCache = {};
    for (const [k, v] of Object.entries(sports)) if (now - v.t < 24 * 36e5) sportCache[k] = v.list;
    let done = 0;
    const stats = { summaries: 0, photos: 0, errors: [] };
    for (const n of feed.items) {
      const sourceText = (n.title + ". " + (n.desc && n.desc.toLowerCase() !== n.title.toLowerCase() ? n.desc : "")).trim();
      if (store.items[n.link] && store.items[n.link].v === 3 && szValidSummary(store.items[n.link].summary, sourceText)) continue;
      if (done >= 2) break;
      done++;
      const e = { v: 3, t: now, summary: "", photo: null };
      try {
        e.summary = await szSummarize(env, n);
      } catch (x) {
        stats.errors.push("summary " + String(x.message).slice(0, 80));
      }
      try {
        e.photo = await szOembed(n.link) || await szFindPhoto(n, sportCache);
      } catch (x) {
        stats.errors.push("photo " + String(x.message).slice(0, 80));
      }
      store.items[n.link] = e;
    }
    for (const [k, list] of Object.entries(sportCache)) sports[k] = { t: sports[k] && sportCache[k] === sports[k].list ? sports[k].t : now, list };
    store.sports = sports;
    const keep = new Set(feed.items.map((i) => i.link));
    for (const k of Object.keys(store.items)) if (!keep.has(k)) delete store.items[k];
    await szAutoPut(env, "enrich", store);
    const h = await szAutoGet(env, "health") || {};
    h.enrich_last = (/* @__PURE__ */ new Date()).toISOString();
    h.enriched_items = Object.keys(store.items).length;
    h.enriched_with_summary = Object.values(store.items).filter((x) => x.summary).length;
    h.enriched_with_photo = Object.values(store.items).filter((x) => x.photo).length;
    h.enrich_errors = stats.errors.slice(0, 3);
    await szAutoPut(env, "health", h);
  } catch (e) {
    console.log("ScoreZaap enrich failed", String(e.message));
  }
}
__name(szEnrichRun, "szEnrichRun");
function szItemCredit(n, e) {
  const p = e && e.photo;
  let parts = [];
  if (p) {
    if (p.kind === "oembed") parts.push("Image: " + szBlogEsc(p.artist) + `, via the publisher's official embed data, from <a href="` + szBlogEsc(p.page) + '" rel="noopener nofollow">the original article</a>.');
    else parts.push("Photo: " + szBlogEsc(p.artist) + ", " + (p.licenceUrl ? '<a href="' + szBlogEsc(p.licenceUrl) + '" rel="noopener nofollow license">' + szBlogEsc(p.licence) + "</a>" : szBlogEsc(p.licence)) + ', via <a href="' + szBlogEsc(p.page) + '" rel="noopener nofollow">Wikimedia Commons</a>. ' + (p.kind === "subject" ? "File photo of " + szBlogEsc(p.label) + ", not from this event." : "Illustrative " + szBlogEsc(p.label.replace(/ (match|game|competition|tournament|race car)$/, "")) + " photo, not from this event."));
  }
  if (e && e.summary) parts.push("Summary written automatically from the publisher headline and snippet.");
  parts.push("Source: " + szBlogEsc(n.source) + ' \xB7 <a href="' + szBlogEsc(n.link) + '" rel="noopener nofollow">Read the publisher report</a>');
  return parts.join(" ");
}
__name(szItemCredit, "szItemCredit");
var SZ_AUTO_VERSION = "2026-10-03-v3";
async function szAutoSchema(env) {
  if (!env.DB) throw new Error("D1 unavailable");
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS sz_automation (id TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
}
__name(szAutoSchema, "szAutoSchema");
async function szAutoGet(env, id) {
  try {
    const r = await env.DB.prepare("SELECT value FROM sz_automation WHERE id=?").bind(id).first();
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
__name(szAutoGet, "szAutoGet");
async function szAutoPut(env, id, value) {
  await env.DB.prepare("INSERT INTO sz_automation (id,value,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(id, JSON.stringify(value), (/* @__PURE__ */ new Date()).toISOString()).run();
}
__name(szAutoPut, "szAutoPut");
function szAutoItems(items) {
  const seen = /* @__PURE__ */ new Set();
  const now = Date.now();
  return (items || []).filter((n) => {
    try {
      const u = new URL(n.link);
      const t = Date.parse(n.published);
      const key = n.title.toLowerCase().replace(/\W+/g, " ");
      if (u.protocol !== "https:" || u.username || u.password || !n.source || n.title.length < 8 || n.title.length > 400 || !Number.isFinite(t) || t > now + 3e5 || now - t > 7 * 864e5 || seen.has(key)) return false;
      seen.add(key);
      return true;
    } catch {
      return false;
    }
  }).slice(0, 30).map((n) => ({ title: String(n.title).replace(/<[^>]*>/g, ""), link: n.link, source: String(n.source).replace(/<[^>]*>/g, ""), published: n.published, desc: String(n.desc || "").replace(/<[^>]*>/g, " ").trim().slice(0, 500) }));
}
__name(szAutoItems, "szAutoItems");

async function szMark(env,s){try{await env.DB.prepare("INSERT INTO sz_automation (id,value,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("cron_mark",JSON.stringify({s,at:new Date().toISOString()}),new Date().toISOString()).run()}catch(e){}}
async function szAutoRun(env) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let h = { version: SZ_AUTO_VERSION, last_attempt: now, news_interval_minutes: 20, blog_interval: "daily, only with fresh data", errors: [] };
  try {
    let items0 = null;
    try {
      const rawNews = await fetchNews();
      const items = szAutoItems(rawNews);
      if (!items.length) throw new Error("No valid recent headlines");
      await szAutoPut(env, "headlines", { items, checked: now });
      items0 = items;
    } catch (e) { h.errors.push("news: " + String(e.message).slice(0, 160)); }
    const old = await szAutoGet(env, "health");
    h = { ...old, ...h };
    try {
      const items = items0;
      if (!items) throw new Error("headlines not refreshed");
      h.news_last_success = now;
      h.news_items = items.length;
      h.news_newest = items[0].published;
    } catch (e) {
      h.errors.push("news: " + String(e.message).slice(0, 160));
    }
    try {
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
      const oldBook = await szAutoGet(env, "notebook");
      if (!oldBook || oldBook.day !== day) {
        const blocks = [];
        let total = 0;
        for (const [sport, key] of [["cricket", "cricket"], ["football", "football"], ["nba", "espn_nba"], ["mlb", "espn_mlb"], ["nhl", "espn_nhl"], ["tennis", "espn_tennis"], ["f1", "espn_f1"]]) {
          const b = await readKV(env, key, { at: 0, matches: [] });
          if (!b.at || Date.now() - Number(b.at) > 2 * 36e5 || Number(b.at) > Date.now() + 3e5) continue;
          const rows = (b.matches || []).filter((m) => m.id && ["live", "finished", "upcoming"].includes(m.status) && m.start && Math.abs(Date.parse(m.start) - Date.now()) < 36 * 36e5).slice(0, 6);
          if (!rows.length) continue;
          total += rows.length;
          blocks.push({ sport, checked: new Date(Number(b.at)).toISOString(), matches: rows.map((m) => ({ id: String(m.id), title: String(m.title || [m.home?.name || m.home, m.away?.name || m.away].filter(Boolean).join(" vs ")).slice(0, 250), status: m.status, start: m.start, score: (m.scores || []).map((s) => s.value).join(" | ") || [m.homeScore, m.awayScore].filter((v) => v != null).join(" - ") })) });
        }
        if (total < 3) throw new Error("No recent dated scoreboard snapshots; notebook retained");
        await szAutoPut(env, "notebook", { day, published: now, blocks, total });
        h.blog_last_success = now;
        h.blog_matches = total;
      }
    } catch (e) {
      h.errors.push("blog: " + String(e.message).slice(0, 160));
    }
    try {
      const dailyPost = await szDailyPublish(env, Date.now());
      h.daily_article_last_success = dailyPost.published_at;
      h.daily_article_slug = dailyPost.slug;
      h.daily_article_state = dailyPost.created ? "published" : "already_published_today";
      try { h.daily_article_results = JSON.parse(dailyPost.results_json || "{}").results?.length || 0; } catch (e) { h.daily_article_results = 0; }
    } catch (e) {
      h.errors.push("daily blog: " + String(e.message || e).slice(0, 160));
    }
    try {
      const matchRun = await szMatchRun(env, Date.now());
      h.match_article_last_success = new Date().toISOString();
      h.match_article_posts_created = matchRun.created;
      h.match_article_reconciled = matchRun.reconciled || 0;
      h.match_article_sample_slug = matchRun.sampleSlug;
      h.match_article_pending = matchRun.pending;
      h.match_article_state = matchRun.initialized ? "baseline_initialized" : matchRun.pending ? "published_or_queued" : "checked";
      h.match_article_stale_feeds = matchRun.staleFeeds;
    } catch (e) {
      h.errors.push("match blog: " + String(e.message || e).slice(0, 160));
    }
    if (h.news_newest && Date.now() - Date.parse(h.news_newest) > 48 * 36e5) h.errors.push("Latest publisher headline is over 48 hours old");
    if (h.blog_last_success && Date.now() - Date.parse(h.blog_last_success) > 36 * 36e5) h.errors.push("Notebook is over 36 hours old");
    h.last_completed = now;
    await szAutoPut(env, "health", h);
  } catch (e) {
    console.log("ScoreZaap automation failed", String(e.message));
  }
}
__name(szAutoRun, "szAutoRun");
function szHeadlineBlock(data, enr) {
  if (!data?.items?.length) return '<section class="hero"><h2>Latest source headlines</h2><p>Waiting for verified source feeds. Original reports below remain available.</p></section>';
  enr = enr || {};
  return '<section class="hero" aria-label="Latest source headlines"><h2>Latest source headlines</h2><ul>' + data.items.slice(0, 20).map((n) => {
    const e = enr[n.link];
    const p = e && e.photo;
    return '<li style="padding:16px 0;list-style:none">' + (p ? '<figure style="margin:0 0 10px"><img src="' + szBlogEsc(p.url) + '" width="' + Number(p.w) + '" height="' + Number(p.h) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="' + szBlogEsc(p.kind === "subject" ? "File photo: " + p.label : p.kind === "sport" ? "Illustrative " + p.label.replace(/ (match|game|competition|tournament|race car)$/, "") + " photo" : "Publisher image") + '" style="display:block;width:100%;max-width:580px;height:auto;max-height:380px;object-fit:cover;border-radius:14px"></figure>' : "") + '<a href="' + szBlogEsc(n.link) + '" rel="noopener nofollow" style="font-weight:700">' + szBlogEsc(n.title) + '</a><small style="display:block">' + szBlogEsc(n.published) + "</small>" + (e && e.summary ? '<p style="margin:8px 0 0;max-width:640px">' + szBlogEsc(e.summary) + "</p>" : "") + '<footer style="font-size:12px;margin-top:8px;max-width:640px">' + szItemCredit(n, e) + "</footer></li>";
  }).join("") + "</ul></section>";
}
__name(szHeadlineBlock, "szHeadlineBlock");
function szNotebookPage(book) {
  if (!book) return null;
  const p = { slug: "scoreboard-notebook", category: "Live scores", title: "Scoreboard notebook: read the latest match snapshots", description: "A daily, data-backed look at match status, scores and fixtures across sports.", body: "<section><h2>A snapshot, not a prediction</h2><p>Updated " + szBlogEsc(book.published) + " UTC from " + book.total + " dated match records. This notebook is generated from structured score data, not AI-written match reporting. A live score can change; a scheduled fixture is not a confirmed result.</p></section>" + book.blocks.map((b) => "<section><h2>" + szBlogEsc(SZ_SPORTS[b.sport]?.[0] || b.sport) + "</h2><p>Source snapshot: " + szBlogEsc(b.checked) + " UTC.</p><ul>" + b.matches.map((m) => '<li><a href="/match/' + encodeURIComponent(b.sport) + "/" + encodeURIComponent(m.id) + '">' + szBlogEsc(m.title) + "</a> \xB7 " + szBlogEsc(m.status) + (m.status === "upcoming" ? " \xB7 Starts " + szBlogEsc(m.start) : m.score ? " \xB7 " + szBlogEsc(m.score) : " \xB7 Score unavailable") + "</li>").join("") + "</ul><p>" + (b.sport === "cricket" ? "Read runs, wickets and overs together. For example, 19.5 overs means 19 completed overs plus five valid balls, not 19.5 decimal overs. A score alone does not establish a win; check the result and innings status." : b.sport === "football" ? "Read the match clock with the status. A halftime score is not the final result, and added time can extend beyond the minimum displayed." : b.sport === "tennis" ? "Separate points, games and sets. A player leading one set has not necessarily won the match; the competition format and final status decide that." : "Keep the score and event status together. Period, inning, session and overtime labels can change how a scoreboard should be read.") + '</p><p><a href="/sports/' + b.sport + '">Open the current ' + szBlogEsc(SZ_SPORTS[b.sport]?.[0] || b.sport) + " board</a></p></section>").join("") + "<section><h2>What this page cannot establish</h2><p>These records do not establish injuries, selection changes, quotations or why a team won. Check the linked match page for updates and primary organisers for those details. We keep the last good notebook when no recent data is available instead of inventing a new report.</p></section>", sources: [["https://scorezaap.tech/", "ScoreZaap dated API scoreboards (Cricbuzz and ESPN sources)"]] };
  const temp = SZ_BLOG_POSTS;
  SZ_BLOG_POSTS = [p, ...temp];
  let page;
  try {
    page = szBlogPage(p.slug);
  } finally {
    SZ_BLOG_POSTS = temp;
  }
  return page.replaceAll("September 30, 2026", szBlogEsc(book.day)).replaceAll("2026-09-30", book.published.slice(0, 10)).replace("Rule references", "Data references").replace("Rule details were checked against these primary sources; event-specific playing conditions can differ.", "The match records came from the timestamped scoreboards linked above; this is automated data analysis, not firsthand reporting.");
}
__name(szNotebookPage, "szNotebookPage");
var index_default = {
  async fetch(request, env, ctx) {
    env = szQuotaEnv(env);
    const url = new URL(request.url);
    if (url.hostname === "scorezaap.ashwatthama710.workers.dev") return Response.redirect("https://scorezaap.tech" + url.pathname + url.search, 301);
    if (url.protocol === "http:") return Response.redirect("https://" + url.host + url.pathname + url.search, 301);
    const resp = await this._handle(request, env, ctx, url);
    const h2 = new Headers(resp.headers);
    h2.set("X-SZ-Storage", SZ_STORE_REV);
    for (const k of Object.keys(SEC_HEADERS)) h2.set(k, SEC_HEADERS[k]);
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h2 });
  },
  async _handle(request, env, ctx, url) {
    const path = url.pathname;
    if (path === "/api/automation-health") {
      const h = await szAutoGet(env, "health");
      const age = h?.last_completed ? Date.now() - Date.parse(h.last_completed) : Infinity;
      const dbgs = {};
      for (const k of ["news", "enrich", "scores", "football", "tennis"]) {
        const v = await szAutoGet(env, "cron_debug_" + k);
        if (v) dbgs[k] = v;
      }
      const fbd = dbgs.football, fbAge = fbd && fbd.at ? Date.now() - Date.parse(fbd.at) : Infinity;
      const fbBad = !fbd || fbd.stage === "error" || !!(fbd.info && fbd.info.failed) || fbAge > 65 * 6e4;
      return json({ version: SZ_AUTO_VERSION, ...h, cron_debug: dbgs, football_ok: !fbBad, state: age > 45 * 6e4 ? "stalled" : h?.errors?.length || fbBad ? "degraded" : "ok", ...age > 45 * 6e4 ? { note: "News job has not completed for 45+ minutes; check for Cloudflare CPU-limit kills" } : {} }, age > 45 * 6e4 ? 503 : 200, { "Cache-Control": "no-store" });
    }
    if (path === "/blog/scoreboard-notebook") {
      const page2 = szNotebookPage(await szAutoGet(env, "notebook"));
      return page2 ? htmlOut(page2, { "Cache-Control": "public, max-age=60" }) : new Response("Notebook awaiting fresh score data", { status: 503 });
    }
    if (path.startsWith("/blog/sports-results-")) {
      const dailyPost = await szDailyGetPost(env, path.slice(6));
      const dailyPage = dailyPost ? szDailyPostPage(dailyPost) : null;
      if (dailyPage) return htmlOut(dailyPage, { "Cache-Control": "public, max-age=300" });
    }
    if (path.startsWith("/blog/match-result-")) {
      const matchPost = /^\/blog\/(match-result-\d{4}-\d{2}-\d{2}-[0-9a-f]{2,280})$/.exec(path);
      const row = matchPost ? await szMatchGetPostBySlug(env, matchPost[1]) : null;
      const page = row ? szMatchArticlePage(row) : null;
      if (page) return htmlOut(page, { "Cache-Control": "public, max-age=300" });
    }
    if (path === "/news-images/gill-double.png" || path === "/news-images/rohit-hundred.png") {
      const b64 = path.includes("gill-double") ? SZ_NEWS_IMAGE_GILL_DOUBLE : SZ_NEWS_IMAGE_ROHIT_HUNDRED;
      return new Response(Uint8Array.from(atob(b64), (c2) => c2.charCodeAt(0)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
    }
    if (path === "/celebrations.js") return new Response(SZ_CELEBRATION_JS, { headers: { "Content-Type": "application/javascript;charset=UTF-8", "Cache-Control": "public, max-age=300" } });
    if (path === "/celebrations.css") return new Response(SZ_CELEBRATION_CSS, { headers: { "Content-Type": "text/css;charset=UTF-8", "Cache-Control": "public, max-age=300" } });
    if (path === "/news/" || /^\/news\/[^/]+\/$/.test(path)) return Response.redirect("https://" + url.host + path.replace(/\/$/, ""), 301);
    if (path === "/asian-games/") return Response.redirect("https://" + url.host + "/asian-games", 301);
    if (path === "/asian-games/medals" || path === "/asian-games/schedule") return htmlOut(szAsianInfo(path.split("/").pop()), { "Cache-Control": "public, max-age=60" });
    if (path === "/asian-games") return htmlOut(szNewsPage("__asian__"), { "Cache-Control": "public, max-age=60" });
    if (path === "/news" || path.startsWith("/news/")) {
      let page2 = szNewsPage(path === "/news" ? "" : path.slice(6));
      if (path === "/news" && page2) {
        const block = szHeadlineBlock(await szAutoGet(env, "headlines"), (await szAutoGet(env, "enrich"))?.items);
        page2 = page2.replace(/<main[^>]*>/, (m) => m + block);
      }
      return page2 ? htmlOut(page2, { "Cache-Control": "public, max-age=60" }) : new Response('<!doctype html><html><head><title>News not found - ScoreZaap</title><meta name="robots" content="noindex"></head><body><h1>News not found</h1><a href="/news">Browse news</a></body></html>', { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/news-sitemap.xml") {
      const recent = SZ_NEWS_POSTS.filter((p) => Date.now() - new Date(p.published).getTime() < 2 * 864e5);
      const x = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' + recent.map((p) => "<url><loc>https://scorezaap.tech/news/" + p.slug + "</loc><news:news><news:publication><news:name>ScoreZaap</news:name><news:language>en</news:language></news:publication><news:publication_date>" + p.published + "</news:publication_date><news:title>" + szBlogEsc(p.title) + "</news:title></news:news></url>").join("") + "</urlset>";
      return new Response(x, { headers: { "Content-Type": "application/xml;charset=UTF-8", "Cache-Control": "public, max-age=300" } });
    }
    if (path.startsWith("/sports/")) {
      const page2 = await szSportPage(path.slice(8), env);
      return page2 ? htmlOut(page2, { "Cache-Control": "public, max-age=20" }) : new Response("Sport not found", { status: 404 });
    }
    if (path === "/llms.txt") return new Response("# ScoreZaap\n\nLive multi-sport scores and original rules explainers. Score data is a live snapshot, can be delayed or corrected, and should be read with match status. Do not infer historical traffic or guaranteed update latency.\n\n- https://scorezaap.tech/ : live scores\n- https://scorezaap.tech/blog : original sports guides with primary references\n- https://scorezaap.tech/schedule : fixtures\n- https://scorezaap.tech/archives : results\n- https://scorezaap.tech/sitemap.xml : discoverable pages\n", { headers: { "Content-Type": "text/plain;charset=UTF-8" } });
    if (path === "/blog/" || /^\/blog\/[^/]+\/$/.test(path)) return Response.redirect("https://" + url.host + path.replace(/\/$/, ""), 301);
    if (path === "/blog" || path.startsWith("/blog/")) {
      let page2 = szBlogPage(path === "/blog" ? "" : path.slice(6));
      if (path === "/blog" && page2) {
        const pageNo = Math.max(1, Math.min(5000, Number.parseInt(url.searchParams.get("daily_page") || "1", 10) || 1));
        const matchPage = Math.max(1, Math.min(5000, Number.parseInt(url.searchParams.get("match_page") || "1", 10) || 1));
        const pageSize = 20;
        const matchTotal = await szMatchCount(env);
        const matchPosts = await szMatchListPosts(env, pageSize, (matchPage - 1) * pageSize);
        const matchArchive = szMatchArchiveHtml(matchPosts, matchPage, matchTotal, pageSize);
        if (matchArchive) page2 = page2.replace("</nav>", "</nav>" + matchArchive);
        const dailyTotal = await szDailyPostCount(env);
        const dailyPosts = await szDailyListPosts(env, pageSize, (pageNo - 1) * pageSize);
        const archive = szDailyArchiveHtml(dailyPosts, pageNo, dailyTotal, pageSize);
        if (archive) page2 = page2.replace("</nav>", "</nav>" + archive);
      }
      if (path === "/blog" && page2 && await szAutoGet(env, "notebook")) page2 = page2.replace(/<main[^>]*>/, (m) => m + '<section class="hero"><h2>Daily scoreboard notebook</h2><p>One evolving daily notebook, based only on recent match records. No invented reports.</p><a href="/blog/scoreboard-notebook">Read the latest notebook</a></section>');
      return page2 ? htmlOut(page2, { "Cache-Control": "public, max-age=300" }) : new Response('<!doctype html><html lang="en"><head><title>Guide not found - ScoreZaap</title><meta name="robots" content="noindex"></head><body><h1>Guide not found</h1><a href="/blog">Browse sports guides</a></body></html>', { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\nSitemap: https://scorezaap.tech/sitemap.xml\nSitemap: https://scorezaap.tech/news-sitemap.xml\n", { headers: { "content-type": "text/plain;charset=UTF-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (path === "/ads.txt") {
      return new Response("google.com, pub-2184299953562291, DIRECT, f08c47fec0942fa0\n", { headers: { "content-type": "text/plain;charset=UTF-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (path === "/sitemap.xml") {
      const cblob = env.SPORTS_KV ? await env.SPORTS_KV.get("cricket", "json").catch(() => null) : null;
      const fblob = env.SPORTS_KV ? await env.SPORTS_KV.get("football", "json").catch(() => null) : null;
      const urls = ["/", "/rankings", "/schedule", "/archives", "/about", "/contact", "/privacy", "/blog", "/asian-games", "/asian-games/medals", "/asian-games/schedule", ...Object.keys(SZ_SPORTS).map((s) => "/sports/" + s), ...SZ_BLOG_POSTS.map((p) => "/blog/" + p.slug), "/news", ...SZ_NEWS_POSTS.map((p) => "/news/" + p.slug)];
      if (await szAutoGet(env, "notebook")) urls.push("/blog/scoreboard-notebook");
      const dailyPosts = await szDailySitemapPosts(env);
      for (const dailyPost of dailyPosts) urls.push("/blog/" + dailyPost.slug);
      const matchPosts = await szMatchSitemapPosts(env);
      for (const matchPost of matchPosts) urls.push("/blog/" + matchPost.slug);
      const ser = {};
      for (const m of cblob && Array.isArray(cblob.matches) ? cblob.matches : []) {
        urls.push("/match/cricket/" + encodeURIComponent(m.id));
        if (m.series) ser[m.series] = 1;
      }
      for (const m of fblob && Array.isArray(fblob.matches) ? fblob.matches : []) urls.push("/match/football/" + encodeURIComponent(m.id));
      const seenT = {};
      for (const [blob2, sp3] of [[cblob, "cricket"], [fblob, "football"]]) {
        for (const m of blob2 && Array.isArray(blob2.matches) ? blob2.matches : []) {
          for (const t of [m.home && m.home.name, m.away && m.away.name]) {
            if (t && !seenT[t] && urls.length < 90) {
              seenT[t] = 1;
              urls.push("/team/" + sp3 + "/" + encodeURIComponent(t));
            }
          }
        }
      }
      for (const s of Object.keys(ser).slice(0, 30)) urls.push("/series/cricket/byname/" + encodeURIComponent(s));
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => "  <url><loc>https://scorezaap.tech" + u.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</loc></url>").join("\n") + "\n</urlset>\n";
      return new Response(xml, { headers: { "content-type": "application/xml;charset=UTF-8", "Cache-Control": "public, max-age=1800" } });
    }
    if (path === "/api/scores") {
      const szCache = typeof caches !== "undefined" ? caches.default : null;
      const szKey = new Request("https://scorezaap.tech/__edge/api-scores-v2");
      if (szCache) {
        try {
          const hitR = await szCache.match(szKey);
          if (hitR) {
            const hr = new Response(hitR.body, hitR);
            hr.headers.set("Cache-Control", "public, max-age=2");
            hr.headers.delete("Age");
            hr.headers.set("X-SZ-Edge", "hit");
            return hr;
          }
        } catch (e) {
        }
      }
      const [c2, f2, nba2, mlb2, nhl2, tennis2, f12] = await Promise.all([
        readKV(env, "cricket", { at: 0, matches: [] }),
        readKV(env, "football", { at: 0, matches: [] }),
        readKV(env, "espn_nba", { matches: [] }),
        readKV(env, "espn_mlb", { matches: [] }),
        readKV(env, "espn_nhl", { matches: [] }),
        readKV(env, "espn_tennis", { matches: [] }),
        readKV(env, "espn_f1", { matches: [] })
      ]);
      try {
        const liveCbz = c2.matches.filter((m) => szCricketNeedsOverlay(m)).sort((a, b) => String(b.start || "").localeCompare(String(a.start || ""))).slice(0, 6);
        for (const m of liveCbz) {
          const tapKey = "tap_v3_" + m.id;
          const lastTap = env.SPORTS_KV ? await env.SPORTS_KV.get(tapKey) : null;
          if (!lastTap || Date.now() - +lastTap > 5 * 6e4) {
            if (env.SPORTS_KV) await env.SPORTS_KV.put(tapKey, String(Date.now()), { expirationTtl: 86400 });
            ctx.waitUntil((async () => {
              try {
                const numericId = String(m.id).slice(4);
                const mini = await cbzMiniScorecardFetch(numericId);
                const html2 = mini ? null : await cbzHtmlScore(numericId);
                if (!mini && (!html2 || !html2.scores.length)) return;
                const cl2 = await env.SPORTS_KV.get("cricket", "json");
                const lm3 = cl2 && Array.isArray(cl2.matches) ? cl2.matches.find((x) => x.id === m.id) : null;
                if (!lm3) return;
                const changed = mini ? applyMiniScore(lm3, mini) : applyHtmlScore(lm3, html2, lm3.matchType);
                if (changed) await env.SPORTS_KV.put("cricket", JSON.stringify(cl2));
              } catch (e3) {
              }
            })());
          }
        }
      } catch (e) {
      }
      try {
        c2.matches = dedupeCricket(c2.matches);
      } catch (e) {
      }
      let liveAt = null;
      try {
        liveAt = await szLiveOverlay(c2, f2, { nba: nba2, mlb: mlb2, nhl: nhl2, tennis: tennis2, f1: f12 });
      } catch (e) {
      }
      try {
        const verified = new Map((c2.matches || []).filter((m) => m.celebrationVerifiedAt).map((m) => [String(m.id), m]));
        const latest = verified.size && env.SPORTS_KV ? await env.SPORTS_KV.get("cricket", "json") : null;
        if (latest && latest.at === c2.at && Array.isArray(latest.matches)) {
          let changed = false;
          const matches = latest.matches.map((m) => {
            const fresh = verified.get(String(m.id));
            if (!fresh) return m;
            const next = { ...m };
            for (const key of ["status", "statusText", "scores"]) {
              if (JSON.stringify(next[key]) !== JSON.stringify(fresh[key])) {
                next[key] = fresh[key];
                changed = true;
              }
            }
            return next;
          });
          if (changed) {
            const next = { ...latest, at: Date.now(), matches };
            await env.SPORTS_KV.put("cricket", JSON.stringify(next));
            c2.at = next.at;
          }
        }
      } catch (e) {
      }
      const szResp = json({
        cricket: c2.matches,
        football: f2.matches,
        espn: { nba: nba2.matches, mlb: mlb2.matches, nhl: nhl2.matches, tennis: tennis2.matches, f1: f12.matches },
        updated: { cricket: c2.at, football: f2.at, live: liveAt },
        live: [...c2.matches, ...f2.matches].some((m) => m.status === "live")
      }, 200, { "Cache-Control": "public, max-age=2" });
      if (szCache) {
        try {
          ctx.waitUntil(szCache.put(szKey, szResp.clone()).catch(() => null));
        } catch (e) {
        }
      }
      return szResp;
    }
    async function seriesData(env2, kind, id) {
      const kv = env2.SPORTS_KV;
      if (kind === "cricket") {
        if (!id) return { error: "missing series id" };
        if (id.startsWith("byname/")) {
          const nm = decodeURIComponent(id.slice(7));
          const cacheKey = "ser_name_" + norm(nm);
          let resolved = kv ? await kv.get(cacheKey) : null;
          if (!resolved) {
            try {
              const r = await fetch(`${CRIC_API}/series?apikey=${env2.CRICKETDATA_KEY}&offset=0&search=` + encodeURIComponent(nm.split(" ").slice(0, 3).join(" ")));
              const j = await r.json();
              const items = j.data || [];
              const want = norm(nm);
              const hit = items.find((x) => norm(x.name) === want) || items.find((x) => want.includes(norm(x.name)) || norm(x.name).includes(want)) || items[0];
              if (hit && hit.id) {
                resolved = hit.id;
                if (kv) await kv.put(cacheKey, resolved, { expirationTtl: 24 * 3600 });
              }
            } catch (e) {
            }
          }
          if (!resolved) return { error: "series lookup unavailable right now" };
          id = resolved;
        }
        let info = kv ? await kv.get("ser_info_" + id, "json") : null;
        if (!info) {
          const r = await fetch(`${CRIC_API}/series_info?apikey=${env2.CRICKETDATA_KEY}&id=${id}`);
          const j = await r.json();
          if (!j.data || !j.data.info) return { error: "series not found" };
          const d = j.data;
          info = {
            name: d.info.name,
            dates: (d.info.startdate || "") + " - " + (d.info.enddate || ""),
            matches: (d.matchList || []).map((m) => ({
              id: m.id,
              sport: "cricket",
              title: m.name,
              home: { name: m.teams?.[0] || "", short: (m.teamInfo?.[0]?.shortname || m.teams?.[0] || "").slice(0, 10), logo: m.teamInfo?.[0]?.img },
              away: { name: m.teams?.[1] || "", short: (m.teamInfo?.[1]?.shortname || m.teams?.[1] || "").slice(0, 10), logo: m.teamInfo?.[1]?.img },
              status: m.matchEnded ? "finished" : m.matchStarted ? "live" : "upcoming",
              statusText: m.status,
              scores: (m.score || []).map((x) => ({ inning: (x.inning || "").replace(/ Inning.*$/, ""), value: `${x.r}/${x.w} (${x.o})` })),
              venue: m.venue,
              start: m.dateTimeGMT
            }))
          };
          if (kv) await kv.put("ser_info_" + id, JSON.stringify(info), { expirationTtl: 6 * 3600 });
        }
        let pts = kv ? await kv.get("ser_pts_" + id, "json") : null;
        if (!pts) {
          try {
            const r = await fetch(`${CRIC_API}/series_points?apikey=${env2.CRICKETDATA_KEY}&id=${id}`);
            const j = await r.json();
            if (Array.isArray(j.data) && j.data.length) {
              pts = j.data.map((t) => ({ team: t.teamname, short: t.shortname || t.teamname, img: t.img, m: t.matches, w: t.wins, l: t.loss, t: t.ties, nr: t.nr, pts: t.wins * 2 + t.ties + t.nr })).sort((a, b) => b.pts - a.pts || b.w - a.w).map((t, i) => ({ pos: i + 1, ...t }));
              if (kv) await kv.put("ser_pts_" + id, JSON.stringify(pts), { expirationTtl: 12 * 3600 });
            }
          } catch (e) {
          }
        }
        const rank = { live: 0, upcoming: 1, finished: 2 };
        const ms = (info.matches || []).sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.start) - new Date(b.start));
        return { kind, name: info.name, sub: info.dates, standingsType: "cricket", standings: pts || null, fixtures: ms.filter((m) => m.status !== "finished").slice(0, 12), results: ms.filter((m) => m.status === "finished").slice(-10).reverse() };
      }
      if (kind === "football") {
        if (!id) return { error: "missing competition code" };
        let cached = kv ? await kv.get("ser_f_" + id, "json") : null;
        if (!cached) {
          const h = { "X-Auth-Token": env2.FOOTBALL_DATA_KEY || "" };
          const [st, mt] = await Promise.all([
            fetch(`${FOOT_API}/competitions/${id}/standings`, { headers: h }).then((r) => r.ok ? r.json() : null),
            fetch(`${FOOT_API}/competitions/${id}/matches`, { headers: h }).then((r) => r.ok ? r.json() : null)
          ]);
          if (!st && !mt) return { error: "competition not available" };
          const tables = (st?.standings || []).filter((x) => x.type === "TOTAL").map((x) => ({
            group: x.group || null,
            rows: x.table.map((t) => ({ pos: t.position, team: t.team?.name, short: t.team?.tla || t.team?.shortName, img: t.team?.crest, m: t.playedGames, w: t.won, d: t.draw, l: t.lost, gf: t.goalsFor, ga: t.goalsAgainst, gd: t.goalDifference, pts: t.points }))
          }));
          const matches = (mt?.matches || []).map((m) => {
            const sc = m.score || {};
            const ft = sc.fullTime || {};
            return {
              id: String(m.id),
              sport: "football",
              title: `${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
              home: { name: m.homeTeam?.name, short: m.homeTeam?.tla, logo: m.homeTeam?.crest },
              away: { name: m.awayTeam?.name, short: m.awayTeam?.tla, logo: m.awayTeam?.crest },
              status: m.status === "IN_PLAY" || m.status === "PAUSED" ? "live" : m.status === "FINISHED" ? "finished" : "upcoming",
              statusText: m.status === "PAUSED" ? "Half-time" : m.status.replace(/_/g, " "),
              scores: ft.home !== null && ft.home !== void 0 ? [{ inning: "", value: `${ft.home} - ${ft.away}` }] : [],
              start: m.utcDate,
              matchday: m.matchday
            };
          });
          cached = { name: st?.competition?.name || mt?.competition?.name || id, emblem: st?.competition?.emblem || mt?.competition?.emblem, tables, matches };
          if (kv) await kv.put("ser_f_" + id, JSON.stringify(cached), { expirationTtl: 6 * 3600 });
        }
        const rank = { live: 0, upcoming: 1, finished: 2 };
        cached = { ...cached, matches: (cached.matches || []).map((x) => ({ ...x })) };
        try {
          // keep league pages consistent with the reconciled Football list
          const flist = await readKV(env2, "football", { matches: [] });
          const byId = {};
          for (const x of flist.matches || []) byId[x.id] = x;
          const rest = [];
          for (const x of cached.matches) {
            const lm = byId[x.id];
            if (lm && lm.espnEventId && lm.status !== "upcoming" && x.status !== "finished") {
              x.status = lm.status; x.statusText = lm.statusText; x.scores = lm.scores; x.espnEventId = lm.espnEventId;
            } else if (!lm && x.status !== "finished") {
              rest.push(x);
            }
          }
          if (rest.length) {
            rest.forEach((x) => { x.comp = id; });
            await szFootballReconcile(rest.slice(0, 20), {});
          }
        } catch (e) {
        }
        const ms = (cached.matches || []).sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.start) - new Date(b.start));
        return { kind, name: cached.name, emblem: cached.emblem, sub: "Season standings & fixtures", standingsType: "football", tables: cached.tables, fixtures: ms.filter((m) => m.status !== "finished").slice(0, 12), results: ms.filter((m) => m.status === "finished").slice(-10).reverse() };
      }
      if (kind === "mlb") {
        let st = kv ? await kv.get("ser_mlb", "json") : null;
        if (!st) {
          const r = await fetch("https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026", { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
          const j = await r.json();
          st = (j.records || []).map((rec) => ({
            group: rec.division?.name || "MLB",
            rows: (rec.teamRecords || []).map((t) => ({ pos: t.divisionRank, team: t.team?.name, short: t.team?.abbreviation || t.team?.teamCode?.toUpperCase(), m: t.gamesPlayed, w: t.wins, l: t.losses, pct: t.winningPercentage, gb: t.gamesBack }))
          }));
          if (kv && st.length) await kv.put("ser_mlb", JSON.stringify(st), { expirationTtl: 6 * 3600 });
        }
        const list = await readKV(env2, "espn_mlb", { matches: [] });
        return { kind, name: "Major League Baseball", sub: "2026 season", standingsType: "mlb", tables: st, fixtures: list.matches.filter((m) => m.status !== "finished").slice(0, 12), results: list.matches.filter((m) => m.status === "finished").slice(-10).reverse() };
      }
      if (kind === "nhl") {
        let st = kv ? await kv.get("ser_nhl", "json") : null;
        if (!st) {
          const r = await fetch("https://api-web.nhle.com/v1/standings/now", { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
          const j = await r.json();
          const groups = {};
          for (const t of j.standings || []) {
            const g = t.divisionName || "NHL";
            (groups[g] = groups[g] || []).push({ pos: t.divisionSequence, team: t.teamName?.default, short: t.teamAbbrev?.default, img: t.teamLogo, m: t.gamesPlayed, w: t.wins, l: t.losses, otl: t.otLosses, pts: t.points });
          }
          st = Object.entries(groups).map(([group, rows]) => ({ group, rows: rows.sort((a, b) => (a.pos || 99) - (b.pos || 99)) }));
          if (kv && st.length) await kv.put("ser_nhl", JSON.stringify(st), { expirationTtl: 6 * 3600 });
        }
        const list = await readKV(env2, "espn_nhl", { matches: [] });
        return { kind, name: "National Hockey League", sub: "Standings & fixtures", standingsType: "nhl", tables: st, fixtures: list.matches.filter((m) => m.status !== "finished").slice(0, 12), results: list.matches.filter((m) => m.status === "finished").slice(-10).reverse() };
      }
      if (kind === "f1") {
        let st = kv ? await kv.get("ser_f1", "json") : null;
        if (!st) {
          const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
          const [d, c2, races] = await Promise.all([
            fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings/", { headers: ua }).then((r) => r.ok ? r.json() : null),
            fetch("https://api.jolpi.ca/ergast/f1/current/constructorStandings/", { headers: ua }).then((r) => r.ok ? r.json() : null),
            fetch("https://api.jolpi.ca/ergast/f1/current.json", { headers: ua }).then((r) => r.ok ? r.json() : null)
          ]);
          const drv = (((d?.MRData?.StandingsTable?.StandingsLists || [])[0] || {}).DriverStandings || []).map((x) => ({ pos: x.position, team: `${x.Driver?.givenName || ""} ${x.Driver?.familyName || ""}`.trim(), short: x.Driver?.code || (x.Driver?.familyName || "").slice(0, 3).toUpperCase(), sub: (x.Constructors || [])[0]?.name, w: x.wins, pts: x.points }));
          const con = (((c2?.MRData?.StandingsTable?.StandingsLists || [])[0] || {}).ConstructorStandings || []).map((x) => ({ pos: x.position, team: x.Constructor?.name, short: (x.Constructor?.name || "").slice(0, 3).toUpperCase(), w: x.wins, pts: x.points }));
          const cal = (races?.MRData?.RaceTable?.Races || []).map((x) => ({ round: x.round, name: x.raceName, circuit: x.Circuit?.circuitName, where: `${x.Circuit?.Location?.locality || ""}, ${x.Circuit?.Location?.country || ""}`, date: x.date, time: x.time }));
          st = { drv, con, cal };
          if (kv) await kv.put("ser_f1", JSON.stringify(st), { expirationTtl: 12 * 3600 });
        }
        const list = await readKV(env2, "espn_f1", { matches: [] });
        return { kind, name: "Formula 1", sub: "2026 World Championship", standingsType: "f1", f1: st, fixtures: list.matches.filter((m) => m.status !== "finished").slice(0, 8), results: list.matches.filter((m) => m.status === "finished").slice(-6).reverse() };
      }
      return { error: "unknown series kind" };
    }
    __name(seriesData, "seriesData");
    __name2(seriesData, "seriesData");
    __name22(seriesData, "seriesData");
    __name222(seriesData, "seriesData");
    __name2222(seriesData, "seriesData");
    __name22222(seriesData, "seriesData");
    __name222222(seriesData, "seriesData");
    __name2222222(seriesData, "seriesData");
    __name22222222(seriesData, "seriesData");
    if (path === "/api/push/subscribe" && request.method === "POST") {
      try {
        const b = await request.json();
        if (!b || !b.endpoint || !b.matchId) return json({ error: "bad subscription" }, 400);
        const k = await subKey(b.endpoint);
        await env.SPORTS_KV.put(k, JSON.stringify({ endpoint: b.endpoint, matchId: String(b.matchId), sport: b.sport || "", at: Date.now() }));
        return json({ ok: true });
      } catch (e) {
        return json({ error: "bad request" }, 400);
      }
    }
    if (path === "/api/push/unsubscribe" && request.method === "POST") {
      try {
        const b = await request.json();
        if (b && b.endpoint) await env.SPORTS_KV.delete(await subKey(b.endpoint));
        return json({ ok: true });
      } catch (e) {
        return json({ error: "bad request" }, 400);
      }
    }
    if (path === "/api/notify/latest") {
      const n2 = await readKV(env, "notify_latest", null);
      if (!n2) return json({ title: "ScoreZaap", body: "A match you follow has an update", url: "/" });
      return json(n2, 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/push/key") return json({ key: VAPID_PUB });
    if (path === "/manifest.webmanifest") {
      return json({
        name: "ScoreZaap - Live Scores, News & Zaap",
        short_name: "ScoreZaap",
        description: "Live cricket, football, NBA, MLB, NHL, tennis and F1 scores.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#070b12",
        theme_color: "#a3e635",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }, 200, { "Cache-Control": "public, max-age=86400" });
    }
    if (path === "/favicon.ico") {
      return new Response(b64ToBytes(ICONS_B64["icon-192"]), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
    if (path.startsWith("/icon-") && path.endsWith(".png")) {
      const key = path.slice(1, -4);
      if (ICONS_B64[key]) return new Response(b64ToBytes(ICONS_B64[key]), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
      return new Response("not found", { status: 404 });
    }
    if (path === "/sw.js") {
      return new Response(SW_JS, { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } });
    }
    if (path === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      if (q.length < 2) return json({ matches: [], series: [] });
      const [c2, f2, nba2, mlb2, nhl2, tennis2, f12] = await Promise.all([
        readKV(env, "cricket", { matches: [] }),
        readKV(env, "football", { matches: [] }),
        readKV(env, "espn_nba", { matches: [] }),
        readKV(env, "espn_mlb", { matches: [] }),
        readKV(env, "espn_nhl", { matches: [] }),
        readKV(env, "espn_tennis", { matches: [] }),
        readKV(env, "espn_f1", { matches: [] })
      ]);
      const all = [...c2.matches, ...f2.matches, ...nba2.matches, ...mlb2.matches, ...nhl2.matches, ...tennis2.matches, ...f12.matches];
      const hay = /* @__PURE__ */ __name22222222((m) => [m.title, m.home?.name, m.home?.short, m.away?.name, m.away?.short, m.venue, m.matchType].filter(Boolean).join(" ").toLowerCase(), "hay");
      const rank = { live: 0, upcoming: 1, finished: 2 };
      const matches = all.filter((m) => hay(m).includes(q)).sort((a, b) => (rank[a.status] != null ? rank[a.status] : 3) - (rank[b.status] != null ? rank[b.status] : 3) || new Date(a.start) - new Date(b.start)).slice(0, 25);
      const ser = [];
      const seenS = {};
      for (const m of c2.matches) {
        const tail = String(m.title || "").split(",").pop().trim();
        if (tail && tail.length > 6 && tail.toLowerCase().includes(q) && !seenS[tail]) {
          seenS[tail] = 1;
          ser.push({ kind: "cricket", id: "byname/" + encodeURIComponent(tail), name: tail });
        }
      }
      const seenC = {};
      for (const m of f2.matches) {
        if (m.comp && m.matchType && m.matchType.toLowerCase().includes(q) && !seenC[m.comp]) {
          seenC[m.comp] = 1;
          ser.push({ kind: "football", id: m.comp, name: m.matchType });
        }
      }
      for (const k of ["nba", "mlb", "nhl", "f1"]) {
        const label = { nba: "NBA Basketball", mlb: "MLB Baseball", nhl: "NHL Hockey", f1: "Formula 1" }[k];
        if (label.toLowerCase().includes(q)) ser.push({ kind: k, id: "x", name: label + " standings" });
      }
      return json({ matches, series: ser.slice(0, 6) }, 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/rankings") {
      const fmt = (url.searchParams.get("format") || "odi").toLowerCase();
      const typ = (url.searchParams.get("type") || "batsmen").toLowerCase();
      if (!["odi", "t20", "test"].includes(fmt) || !["batsmen", "bowlers", "allrounders", "teams"].includes(typ)) return json({ error: "bad params" }, 400);
      const ck = "rank_" + fmt + "_" + typ;
      let cached = env.SPORTS_KV ? await env.SPORTS_KV.get(ck, "json") : null;
      if (!cached) {
        const htmlRows = await cbzRankingsHtml(fmt, typ);
        if (htmlRows && htmlRows.length) {
          cached = { format: fmt, type: typ, updated: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), rows: htmlRows };
          if (env.SPORTS_KV) await env.SPORTS_KV.put(ck, JSON.stringify(cached), { expirationTtl: 24 * 3600 });
          return json(cached, 200, { "Cache-Control": "public, max-age=3600" });
        }
        const d = await cbzFetch(env, `/stats/v1/rankings/${typ}?formatType=${fmt}`);
        if (!d || !Array.isArray(d.rank)) return json({ error: "rankings unavailable" }, 502);
        cached = { format: fmt, type: typ, updated: d.rank[0] && d.rank[0].lastUpdatedOn, rows: d.rank.map((r) => ({ id: r.id, rank: +r.rank, name: r.name, country: r.country, rating: +(r.rating || r.points || 0), trend: r.trend || "Flat", img: r.faceImageId ? `https://www.cricbuzz.com/a/img/v1/152x152/i1/c${r.faceImageId}/i.jpg` : null })) };
        if (env.SPORTS_KV) await env.SPORTS_KV.put(ck, JSON.stringify(cached), { expirationTtl: 24 * 3600 });
      }
      return json(szAuditRank(cached), 200, { "Cache-Control": "public, max-age=3600" });
    }
    if (path === "/api/player") {
      const pid = (url.searchParams.get("id") || "").replace(/[^0-9]/g, "");
      if (!pid) return json({ error: "bad params" }, 400);
      const ck = "player_" + pid;
      let cached = env.SPORTS_KV ? await env.SPORTS_KV.get(ck, "json") : null;
      if (!cached) {
        const d = await cbzPlayerHtml(pid) || await cbzFetch(env, `/stats/v1/player/${pid}`);
        if (!d || !d.name) return json({ error: "player unavailable" }, 502);
        const rk = d.rankings && d.rankings.bat ? d.rankings.bat : {};
        const recent = d.recentBatting && Array.isArray(d.recentBatting.rows) ? d.recentBatting.rows.slice(0, 8).map((r) => ({ score: r.values[1], opp: r.values[2], format: r.values[3], date: r.values[4] })) : [];
        cached = {
          id: pid,
          name: d.name,
          fullName: d.fullName,
          role: d.role,
          bat: d.bat,
          bowl: d.bowl,
          dob: d.DoBFormat,
          birthplace: d.birthPlace,
          intlTeam: d.intlTeam,
          teams: String(d.teams || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8),
          img: d.faceImageId ? `https://www.cricbuzz.com/a/img/v1/152x152/i1/c${d.faceImageId}/i.jpg` : null,
          rankings: { test: rk.testRank, odi: rk.odiRank, t20: rk.t20Rank, testBest: rk.testBestRank, odiBest: rk.odiBestRank, t20Best: rk.t20BestRank },
          recent
        };
        if (env.SPORTS_KV) await env.SPORTS_KV.put(ck, JSON.stringify(cached), { expirationTtl: 24 * 3600 });
      }
      return json(cached, 200, { "Cache-Control": "public, max-age=3600" });
    }
    if (path === "/api/weather") {
      const venue = (url.searchParams.get("venue") || "").slice(0, 120).trim();
      const date = (url.searchParams.get("date") || "").slice(0, 40);
      if (!venue) return json({ error: "venue required" }, 400);
      const ck = "wx2_" + venue.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      let cached = env.SPORTS_KV ? await env.SPORTS_KV.get(ck, "json") : null;
      if (!cached) {
        try {
          const clean = /* @__PURE__ */ __name22222222((x) => x.replace(/(stadium|ground|park|arena|oval|field|cricket club|sports complex|international|national)/gi, "").replace(/\s{2,}/g, " ").trim(), "clean");
          const cands = [];
          const parts = venue.split(",").map((x) => x.trim()).filter(Boolean);
          if (parts.length > 1) {
            cands.push(clean(parts[0]) + ", " + parts[parts.length - 1]);
            cands.push(clean(venue));
            cands.push(clean(parts[0]));
            cands.push(parts[parts.length - 1]);
          } else {
            cands.push(clean(venue), venue);
          }
          let geo = null;
          for (const cand of cands) {
            if (!cand) continue;
            const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cand)}&count=1`, { headers: { "User-Agent": "ScoreZaap/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null);
            if (g && g.results && g.results.length) {
              geo = g.results[0];
              break;
            }
          }
          if (!geo) return json({ error: "venue not found" }, 404);
          const fx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=auto&forecast_days=16`, { headers: { "User-Agent": "ScoreZaap/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null);
          if (!fx || !fx.current) return json({ error: "forecast unavailable" }, 502);
          const out = {
            place: { name: geo.name, country: geo.country || "", admin1: geo.admin1 || "" },
            current: { temp: Math.round(fx.current.temperature_2m), humidity: fx.current.relative_humidity_2m, precip: fx.current.precipitation, wind: Math.round(fx.current.wind_speed_10m), code: fx.current.weather_code }
          };
          if (date && fx.hourly && Array.isArray(fx.hourly.time)) {
            const target = new Date(date).getTime();
            if (!isNaN(target)) {
              let best = -1, bestD = Infinity;
              fx.hourly.time.forEach((t, i) => {
                const dd = Math.abs(new Date(t).getTime() - target);
                if (dd < bestD) {
                  bestD = dd;
                  best = i;
                }
              });
              if (best >= 0 && bestD <= 24 * 3600 * 1e3) {
                out.matchTime = { temp: Math.round(fx.hourly.temperature_2m[best]), pop: fx.hourly.precipitation_probability ? fx.hourly.precipitation_probability[best] : null, wind: Math.round(fx.hourly.wind_speed_10m[best]), code: fx.hourly.weather_code[best], at: fx.hourly.time[best] };
              }
            }
          }
          cached = out;
          if (env.SPORTS_KV) await env.SPORTS_KV.put(ck, JSON.stringify(cached), { expirationTtl: 2 * 3600 });
        } catch (e) {
          return json({ error: "weather fetch failed" }, 502);
        }
      }
      return json(cached, 200, { "Cache-Control": "public, max-age=1800" });
    }
    if (path === "/api/poll") {
      const mk = (url.searchParams.get("match") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
      if (!mk) return json({ error: "match required" }, 400);
      const v = env.SPORTS_KV ? await env.SPORTS_KV.get("poll_" + mk, "json") : null;
      const votes = v && v.votes ? v.votes : {};
      const total = Object.values(votes).reduce((a, b) => a + (+b || 0), 0);
      return json({ votes, total }, 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/poll/vote" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400);
      }
      const mk = String(body.match || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
      const opt = String(body.opt || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
      if (!mk || !opt) return json({ error: "bad params" }, 400);
      if (!env.SPORTS_KV) return json({ error: "unavailable" }, 503);
      const key = "poll_" + mk;
      const vk = "poll_v_" + (await ipHash(mk + "|" + (request.headers.get("cf-connecting-ip") || "anon"))).slice(0, 20);
      if (await env.SPORTS_KV.get(vk)) {
        const cur2 = await env.SPORTS_KV.get(key, "json") || { votes: {} };
        return json({ ok: true, alreadyVoted: true, votes: cur2.votes, total: Object.values(cur2.votes).reduce((a2, b2) => a2 + (+b2 || 0), 0) });
      }
      await env.SPORTS_KV.put(vk, opt, { expirationTtl: 30 * 86400 });
      const cur = await env.SPORTS_KV.get(key, "json") || { votes: {} };
      cur.votes[opt] = (cur.votes[opt] || 0) + 1;
      await env.SPORTS_KV.put(key, JSON.stringify(cur));
      const total = Object.values(cur.votes).reduce((a, b) => a + (+b || 0), 0);
      return json({ ok: true, votes: cur.votes, total });
    }
    if (path === "/api/series") {
      const kind = url.searchParams.get("kind");
      const id = url.searchParams.get("id");
      try {
        const d = await seriesData(env, kind, id);
        if (d.error) return json(d, 404);
        return json(d, 200, { "Cache-Control": "no-store" });
      } catch (e) {
        return json({ error: "series fetch failed" }, 502);
      }
    }
    if (path === "/api/news") {
      const headlines = await szAutoGet(env, "headlines");
      const enr = (await szAutoGet(env, "enrich"))?.items || {};
      const original = szNewsSorted().map((p) => ({ title: p.title, desc: p.description, link: "https://scorezaap.tech/news/" + p.slug, source: "ScoreZaap", published: p.published }));
      const items = [...original, ...(headlines?.items || []).map((n2) => {
        const e = enr[n2.link];
        const rawDesc = String(n2.desc || "");
        const publisherDesc = /^Plus(?:,|:)/i.test(rawDesc) ? "" : rawDesc;
        const summarySource = (n2.title + ". " + (publisherDesc && publisherDesc.toLowerCase() !== n2.title.toLowerCase() ? publisherDesc : "")).trim();
        const summary = e?.summary && szValidSummary(e.summary, summarySource) ? e.summary : "";
        return { title: n2.title, desc: summary || publisherDesc, summary, link: n2.link, source: n2.source, published: n2.published, image: e?.photo ? { url: e.photo.url, kind: e.photo.kind, credit: e.photo.artist, licence: e.photo.licence, page: e.photo.page } : null };
      })].sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
      return json({ items, updated: items[0]?.published, checked: headlines?.checked }, 200, { "Cache-Control": "public, max-age=60" });
    }
    if (path === "/api/refresh") {
      if (!env.CRON_SECRET || (request.headers.get("x-refresh-token") || url.searchParams.get("token") || "") !== env.CRON_SECRET) return json({ error: "unauthorized" }, 401);
      const kind = url.searchParams.get("kind") || "all";
      ctx.waitUntil(refresh(kind === "football" ? "football" : "all", env, ctx));
      return json({ ok: true, kind });
    }
    if (path === "/api/match") {
      const sport = url.searchParams.get("sport");
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "bad params" }, 400);
      try {
        if (sport === "cricket") {
          const key = "md_c_" + id;
          let cached = env.SPORTS_KV ? await env.SPORTS_KV.get(key, "json") : null;
          if (!cached && id.startsWith("cbz_")) {
            const list = env.SPORTS_KV ? await env.SPORTS_KV.get("cricket", "json") : null;
            const lm = list && Array.isArray(list.matches) ? list.matches.find((m) => m.id === id) : null;
            const d = await cbzFetch(env, `/mcenter/v1/${id.slice(4)}/hscard`).catch(() => null);
            const inn = d && Array.isArray(d.scorecard) ? d.scorecard : [];
            cached = {
              title: lm ? lm.title : inn.map((x) => x.batteamname).join(" / ") || "Match",
              status: lm && lm.statusText || d && d.status || (lm ? lm.status : ""),
              venue: lm ? lm.venue : null,
              date: lm ? lm.start : null,
              matchType: lm ? lm.matchType : null,
              toss: null,
              winner: d && d.ismatchcomplete ? lm && lm.statusText : null,
              started: !!(inn.length || lm && lm.status !== "upcoming"),
              ended: !!(d && d.ismatchcomplete) || !!(lm && lm.status === "finished"),
              innings: inn.map((x) => ({ inning: x.batteamname, r: x.score, w: x.wickets, o: x.overs }))
            };
            // Finished in the list with a verified result but no provider
            // scorecard: still show the final innings lines on the detail page.
            if (!cached.innings.length && lm && lm.status === "finished" && Array.isArray(lm.scores)) {
              cached.innings = lm.scores.map((s) => {
                const pm = /^(\d+)\/(\d+)\s*\((\d+\.?\d*)\)$/.exec(String(s && s.value || ""));
                return pm ? { inning: s.inning || "", r: +pm[1], w: +pm[2], o: +pm[3] } : null;
              }).filter(Boolean);
            }
            // Provider scorecard frozen mid-match while the list already
            // carries the verified final: show the final innings lines, not
            // the stale in-progress ones.
            if (lm && lm.status === "finished" && Array.isArray(lm.scores) && !(d && d.ismatchcomplete)) {
              const fin = lm.scores.map((s) => {
                const pm = /^(\d+)\/(\d+)\s*\((\d+\.?\d*)\)$/.exec(String(s && s.value || ""));
                return pm ? { inning: s.inning || "", r: +pm[1], w: +pm[2], o: +pm[3] } : null;
              }).filter(Boolean);
              if (fin.length) {
                cached.innings = fin;
                cached.status = lm.statusText || cached.status;
                cached.winner = cached.winner || lm.statusText || null;
              }
            }
            if (cached && (!cached.innings || !cached.innings.length)) {
              const s3 = await cbzHtmlScore(id.slice(4)).catch(() => null);
              if (s3 && s3.scores && s3.scores.length) {
                cached.started = true;
                cached.ended = s3.finished;
                if (s3.result) {
                  cached.status = s3.result;
                  if (s3.finished) cached.winner = s3.result;
                } else cached.status = "Live now";
                cached.innings = (s3.scores.length === 2 ? [s3.scores[1], s3.scores[0]] : s3.scores).map((sc) => ({ inning: sc.team, r: sc.runs, w: sc.wkts, o: sc.overs != null ? sc.overs : cached.matchType === "T20" ? "20" : "50" }));
              }
            }
            if (env.SPORTS_KV) await env.SPORTS_KV.put(key, JSON.stringify(cached), { expirationTtl: cached.ended ? 86400 : 120 });
          }
          if (!cached) {
            if (!env.CRICKETDATA_KEY) return json({ error: "cricket key pending" }, 503);
            let d = null;
            try {
              const r = await fetch(`${CRIC_API}/match_info?apikey=${env.CRICKETDATA_KEY}&id=${id}`);
              const j = await r.json();
              d = j.data || null;
            } catch (e) {
            }
            if (d) {
              cached = {
                title: d.name,
                status: d.status,
                venue: d.venue,
                date: d.dateTimeGMT,
                matchType: (d.matchType || "").toUpperCase(),
                toss: d.tossWinner ? `${d.tossWinner} won the toss, chose to ${d.tossChoice}` : null,
                winner: d.matchWinner || null,
                started: !!d.matchStarted,
                ended: !!d.matchEnded,
                innings: (d.score || []).map((x) => ({ inning: (x.inning || "").replace(/ Inning.*$/, ""), r: x.r, w: x.w, o: x.o }))
              };
              if (env.SPORTS_KV) {
                await env.SPORTS_KV.put(key, JSON.stringify(cached), { expirationTtl: cached.ended ? 86400 : 300 });
                await env.SPORTS_KV.put("md_cb_" + id, JSON.stringify(cached), { expirationTtl: 30 * 86400 });
              }
            } else {
              cached = env.SPORTS_KV ? await env.SPORTS_KV.get("md_cb_" + id, "json") : null;
              if (!cached) return json({ error: "no detail from upstream" }, 502);
            }
          }
          let squads = env.SPORTS_KV ? await env.SPORTS_KV.get("sq_" + id, "json") : null;
          if (!squads) {
            try {
              const sr = await fetch(`${CRIC_API}/match_squad?apikey=${env.CRICKETDATA_KEY}&id=${id}`);
              const sj = await sr.json();
              if (Array.isArray(sj.data)) {
                squads = sj.data.map((t) => ({ team: t.teamName, players: (t.players || []).map((p) => ({ name: p.name, role: p.role || null, bat: p.battingStyle || null, bowl: p.bowlingStyle || null })) }));
                if (squads && env.SPORTS_KV) await env.SPORTS_KV.put("sq_" + id, JSON.stringify(squads), { expirationTtl: 86400 });
              }
            } catch (e) {
            }
          }
          const liveNow = cached.started && !cached.ended;
          let [scorecard, comm] = await Promise.all([
            cbzScorecard(env, id, cached.title, cached.date, liveNow).catch(() => null),
            liveNow || cached.ended ? cbzCommentary(env, id, cached.title, cached.date, liveNow).catch(() => null) : null
          ]);
          let scorecardStale = false;
          if (liveNow && scorecard && Array.isArray(scorecard.innings)) {
            let reference = cached.innings || [];
            const latestList = env.SPORTS_KV ? await env.SPORTS_KV.get("cricket", "json").catch(() => null) : null;
            const latestMatch = latestList && Array.isArray(latestList.matches) ? latestList.matches.find((m) => m.id === id) : null;
            const listInnings = szListCricketInnings(latestMatch);
            if (latestMatch && latestMatch.status === "live" && (!reference.length || szOlderCricketInnings(reference, listInnings, cached.matchType))) reference = listInnings;
            if (szOlderCricketInnings(scorecard.innings, reference, cached.matchType)) {
              // Keep known newer totals; do not combine old batting/bowling figures with them.
              cached = { ...cached, innings: reference };
              scorecard = null;
              scorecardStale = true;
            }
          }
          if (scorecard && Array.isArray(scorecard.innings) && scorecard.innings.length) {
            cached = { ...cached, status: scorecard.status || cached.status, ended: !!scorecard.complete, started: true, innings: scorecard.innings.map((i) => ({ inning: i.team, r: i.runs, w: i.wkts, o: i.overs })) };
          }
          let graphs = null;
          try {
            const acc = env.SPORTS_KV ? await env.SPORTS_KV.get("ovr_" + id, "json") : null;
            if (acc && acc.overs && Object.keys(acc.overs).length >= 4) {
              const list = Object.values(acc.overs).sort((a, b) => a.inn - b.inn || a.over - b.over);
              graphs = { innings1: list.filter((o) => o.inn === 1), innings2: list.filter((o) => o.inn === 2) };
            }
          } catch (e) {
          }
          try {
            if (env.SPORTS_KV && scorecard && Array.isArray(scorecard.innings) && scorecard.innings.length) {
              const cl = await env.SPORTS_KV.get("cricket", "json").catch(() => null);
              const lm2 = cl && Array.isArray(cl.matches) ? cl.matches.find((m) => m.id === id) : null;
              if (lm2 && lm2.status === "finished" && Array.isArray(lm2.scores) && lm2.scores.length) {
  const finalInnings = lm2.scores.map((s) => {
    const pm = /^(\d+)\/(\d+)\s*\((\d+\.?\d*)\)$/.exec(String(s.value || ""));
    return pm ? { inning: s.inning || "", r: +pm[1], w: +pm[2], o: +pm[3] } : null;
  }).filter(Boolean);
  if (finalInnings.length) {
    cached = { ...cached, status: lm2.statusText || cached.status, ended: true, started: true, innings: finalInnings };
    if (scorecard && Array.isArray(scorecard.innings)) {
      scorecard.innings = scorecard.innings.map((i, idx) => {
        const f = finalInnings[idx];
        return f ? { ...i, runs: f.r, wkts: f.w, overs: f.o } : i;
      });
      scorecard.complete = true;
      scorecard.status = lm2.statusText || scorecard.status;
    }
  }
}
if (lm2 && lm2.status === "live") {
                const better2 = /* @__PURE__ */ __name222222((cur2, idx2, val2) => {
                  const pm = /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(val2 || "");
                  if (!pm) return false;
                  const cRuns = +pm[1], cOv = +pm[3];
                  const ex = cur2 && cur2[idx2] && /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(cur2[idx2].value || "");
                  if (!ex) return true;
                  const eRuns = +ex[1], eOv = +ex[3];
                  return cOv > eOv || cOv === eOv && cRuns > eRuns;
                }, "better2");
                const cur = Array.isArray(lm2.scores) ? lm2.scores.slice() : [];
                let changed = false;
                scorecard.innings.forEach((inn, i) => {
                  const th = norm(lm2.home && lm2.home.name || ""), tt = norm(inn.team || "");
                  const isHome = th && tt && (tt.includes(th) || th.includes(tt));
                  const short = (((isHome ? lm2.home && lm2.home.short : lm2.away && lm2.away.short) || inn.team || "TM") + "").slice(0, 8);
                  const val = (inn.runs != null ? inn.runs : 0) + "/" + (inn.wkts != null ? inn.wkts : 0) + " (" + inn.overs + ")";
                  if (better2(cur, i, val)) {
                    cur[i] = { inning: short + " " + (i + 1), value: val };
                    changed = true;
                  }
                });
                if (changed) {
                  lm2.scores = cur;
                  await env.SPORTS_KV.put("cricket", JSON.stringify(cl));
                }
              }
            }
          } catch (e) {
          }
          return json({ sport, detail: cached, squads: squads || null, scorecard, scorecardStale, commentary: comm ? comm.list : null, graphs });
        }
        if (sport === "football" && id.startsWith("soccer/")) {
          const colon = id.indexOf(":");
          const slug = id.slice(7, colon), evId = id.slice(colon + 1);
          if (!/^[a-z0-9.]+$/i.test(slug) || !/^\d+$/.test(evId)) return json({ error: "bad params" }, 400);
          const fl = env.SPORTS_KV ? await env.SPORTS_KV.get("football", "json").catch(() => null) : null;
          const lm3 = fl && Array.isArray(fl.matches) ? fl.matches.find((x) => x.id === id) : null;
          const r4 = await fetch(`${ESPN_API}/soccer/${slug}/summary?event=${evId}`, { headers: { "User-Agent": "Mozilla/5.0 (ScoreZaap)" } });
          if (!r4.ok) return json({ error: "no detail from upstream" }, 502);
          const sum = await r4.json();
          const comp0 = (sum.header && sum.header.competitions || [])[0] || {};
          const comps = comp0.competitors || [];
          const hm = comps.find((x) => x.homeAway === "home") || comps[0] || {};
          const aw = comps.find((x) => x.homeAway === "away") || comps[1] || {};
          const stt = comp0.status && comp0.status.type || {};
          const live2 = stt.state === "in";
          const fdetail2 = {
            celebrationVerifiedAt: Date.now(),
            title: lm3 && lm3.title || sum.header && sum.header.name || `${aw.team && aw.team.displayName || "?"} at ${hm.team && hm.team.displayName || "?"}`,
            status: stt.completed ? "FINISHED" : live2 ? "IN_PLAY" : "TIMED",
            venue: comp0.venue && comp0.venue.fullName || lm3 && lm3.venue || null,
            date: lm3 && lm3.start || comp0.date || null,
            competition: lm3 && lm3.matchType || null,
            emblem: null,
            stage: null,
            matchday: null,
            halfTime: null,
            fullTime: stt.completed || live2 ? `${hm.score || 0} - ${aw.score || 0}` : null,
            winner: null,
            home: hm.team && hm.team.displayName || lm3 && lm3.home && lm3.home.name,
            away: aw.team && aw.team.displayName || lm3 && lm3.away && lm3.away.name,
            homeCrest: hm.team && hm.team.logo || null,
            awayCrest: aw.team && aw.team.logo || null
          };
          const skip2 = ["Kickoff", "Start Delay", "End Delay"];
          const timeline2 = (sum.keyEvents || []).filter((k) => !skip2.includes(k.type && k.type.text)).map((k) => ({ min: k.clock && k.clock.displayValue || "", type: k.type && k.type.text || "", text: k.text || k.shortText || "", team: k.team && k.team.displayName || "", goal: !!k.scoringPlay }));
          const commentary2 = (sum.commentary || []).slice(-14).reverse().map((c2) => ({ min: c2.time && c2.time.displayValue || "", text: c2.text }));
          let stats2 = null;
          const bx2 = sum.boxscore && sum.boxscore.teams || [];
          const homeId2 = hm.team && String(hm.team.id);
          if (bx2.length === 2 && Array.isArray(bx2[0].statistics) && bx2[0].statistics.length) {
            const t0h = homeId2 && String(bx2[0].team && bx2[0].team.id) === homeId2;
            const homeStats = t0h ? bx2[0].statistics : bx2[1].statistics;
            const awayStats = t0h ? bx2[1].statistics : bx2[0].statistics;
            const awayMap = {};
            for (const st3 of awayStats) awayMap[st3.name || st3.label] = st3.displayValue;
            stats2 = homeStats.map((st3) => ({ label: st3.label || st3.name, home: st3.displayValue, away: awayMap[st3.name || st3.label] != null ? awayMap[st3.name || st3.label] : "-" })).filter((r5) => r5.label && !/passes|accurate/i.test(r5.label)).slice(0, 14);
            if (!stats2.length) stats2 = null;
          }
          return json({ sport, detail: fdetail2, timeline: timeline2.length ? timeline2 : null, commentary: commentary2.length ? commentary2 : null, stats: stats2 });
        }
        if (sport === "football") {
          const fkey = "md_f_" + id;
          const fcached = env.SPORTS_KV ? await env.SPORTS_KV.get(fkey, "json") : null;
          let fdetail = fcached;
          if (!fdetail) {
            const r = await fetch(`${FOOT_API}/matches/${id}`, { headers: { "X-Auth-Token": env.FOOTBALL_DATA_KEY || "" } });
            if (!r.ok) {
              // provider rate limit or outage: fall back to the cached list entry instead of an error page
              const flb = env.SPORTS_KV ? await env.SPORTS_KV.get("football", "json").catch(() => null) : null;
              const lmb = flb && Array.isArray(flb.matches) ? flb.matches.find((x) => x.id === String(id)) : null;
              if (!lmb) return json({ error: "no detail from upstream" }, 502);
              const sv = lmb.scores && lmb.scores[0] ? lmb.scores[0].value : null;
              const pr = sv ? String(sv).split("-").map((x) => parseInt(x, 10)) : [];
              const fin = lmb.status === "finished";
              const fb2 = {
                title: lmb.title, status: fin ? "FINISHED" : lmb.status === "live" ? "IN_PLAY" : "TIMED", venue: lmb.venue || null, date: lmb.start,
                competition: lmb.matchType, emblem: null, stage: "", matchday: null, halfTime: null,
                fullTime: lmb.status !== "upcoming" ? sv : null,
                winner: fin && pr.length === 2 && !pr.some(isNaN) ? (pr[0] > pr[1] ? lmb.home.name : pr[1] > pr[0] ? lmb.away.name : "Draw") : null,
                home: lmb.home.name, away: lmb.away.name, homeCrest: lmb.home.logo, awayCrest: lmb.away.logo, espnLeague: lmb.espnLeague || null
              };
              const tlb = await espnSoccerTimeline(env, { ...fb2, espnEventId: lmb.espnEventId }).catch(() => null);
              return json({ sport, detail: fb2, timeline: tlb ? tlb.timeline : null, commentary: tlb ? tlb.commentary : null, stats: tlb ? tlb.stats : null });
            }
            const m = await r.json();
            const sc = m.score || {};
            fdetail = {
              title: `${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
              status: m.status,
              venue: m.venue,
              date: m.utcDate,
              competition: m.competition?.name,
              emblem: m.competition?.emblem,
              stage: (m.stage || "").replace(/_/g, " "),
              matchday: m.matchday,
              halfTime: sc.halfTime && sc.halfTime.home !== null ? `${sc.halfTime.home} - ${sc.halfTime.away}` : null,
              fullTime: sc.fullTime && sc.fullTime.home !== null ? `${sc.fullTime.home} - ${sc.fullTime.away}` : null,
              winner: sc.winner === "HOME_TEAM" ? m.homeTeam?.name || "Home" : sc.winner === "AWAY_TEAM" ? m.awayTeam?.name || "Away" : sc.winner === "DRAW" ? "Draw" : sc.winner || null,
              home: m.homeTeam?.name,
              away: m.awayTeam?.name,
              homeCrest: m.homeTeam?.crest,
              awayCrest: m.awayTeam?.crest
            };
            if (env.SPORTS_KV) await env.SPORTS_KV.put(fkey, JSON.stringify(fdetail), { expirationTtl: 60 });
          }
          try {
            const fl0 = env.SPORTS_KV ? await env.SPORTS_KV.get("football", "json") : null;
            const lm0 = fl0 && Array.isArray(fl0.matches) ? fl0.matches.find((x) => x.id === id && x.espnEventId) : null;
            if (lm0 && (lm0.status === "finished" || lm0.status === "live") && lm0.scores && lm0.scores[0]) {
              const sv = lm0.scores[0].value, pr = String(sv).split("-").map((x) => parseInt(x, 10));
              fdetail = { ...fdetail, status: lm0.status === "finished" ? "FINISHED" : "IN_PLAY", fullTime: sv, espnEventId: lm0.espnEventId };
              if (lm0.status === "finished" && pr.length === 2 && !pr.some(isNaN)) fdetail.winner = pr[0] > pr[1] ? fdetail.home : pr[1] > pr[0] ? fdetail.away : "Draw";
              else if (lm0.status === "live") fdetail.winner = null;
            }
          } catch (e) {
          }
          const tl = await espnSoccerTimeline(env, fdetail).catch(() => null);
          return json({ sport, detail: fdetail, timeline: tl ? tl.timeline : null, commentary: tl ? tl.commentary : null, stats: tl ? tl.stats : null });
        }
        const gd = await espnGenericDetail(env, id);
        if (!gd) return json({ error: "match not found (list refreshes every 15 min)" }, 404);
        return json({ sport, detail: gd, timeline: gd.timeline || null });
      } catch (e) {
        return json({ error: "detail fetch failed" }, 502);
      }
    }
    if (path === "/api/chat" && request.method === "POST") {
      if (!env.AI) return json({ error: "Chat is warming up. Try again soon." }, 503);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "bad request" }, 400);
      }
      const userMsgs = (body.messages || []).slice(-8).filter((m) => m && m.role && m.content).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 500) }));
      if (!userMsgs.length) return json({ error: "say something first" }, 400);
      if (env.SPORTS_KV) {
        const iph = (await ipHash(request.headers.get("cf-connecting-ip") || "anon")).slice(0, 16);
        const rlk = "chat_rl_" + iph, now = Date.now();
        const win = await env.SPORTS_KV.get(rlk, "json");
        const cnt = win && now - win.t < 6e4 ? win.n : 0;
        if (cnt >= 8) return json({ error: "Slow down a little - try again in a minute." }, 429);
        ctx.waitUntil(env.SPORTS_KV.put(rlk, JSON.stringify({ t: win && now - win.t < 6e4 ? win.t : now, n: cnt + 1 }), { expirationTtl: 300 }));
        const dayk = "chat_day_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const dn = +(await env.SPORTS_KV.get(dayk) || 0);
        if (dn >= 300) return json({ error: "Zaap is resting for today. Back tomorrow." }, 429);
        ctx.waitUntil(env.SPORTS_KV.put(dayk, String(dn + 1), { expirationTtl: 48 * 3600 }));
      }
      const al = (request.headers.get("Accept-Language") || "").toLowerCase();
      let langCode = body.lang && LANGS[body.lang] ? body.lang : (al.split(",")[0] || "en").split("-")[0];
      const langName = LANGS[langCode] || "English";
      const [c2, f2, nba2, tennis2] = await Promise.all([
        readKV(env, "cricket", { matches: [] }),
        readKV(env, "football", { matches: [] }),
        readKV(env, "espn_nba", { matches: [] }),
        readKV(env, "espn_tennis", { matches: [] })
      ]);
      const snapshot = [...c2.matches, ...f2.matches, ...nba2.matches, ...tennis2.matches].slice(0, 14).map((m) => {
        const sc = (m.scores || []).map((s) => s.value).join(", ");
        return `- ${m.title} [${m.sport}, ${m.status}${sc ? ", " + sc : ""}] ${m.statusText || ""}${m.venue ? " @ " + m.venue : ""}`;
      }).join("\n") || "- no matches loaded yet";
      let liveSc = "";
      const liveCric = (c2.matches || []).find((m) => m.status === "live");
      if (liveCric && env.SPORTS_KV) {
        const sc = await env.SPORTS_KV.get("sc_c_" + liveCric.id, "json");
        if (sc && sc.innings) liveSc = "\nFull scorecard of live match " + liveCric.title + ":\n" + sc.innings.map((i) => `${i.team}: ${i.runs}/${i.wkts} (${i.overs} ov). Batting: ` + (i.batsmen || []).slice(0, 6).map((b) => `${b.name} ${b.r}(${b.b})`).join(", ") + ". Bowling: " + (i.bowlers || []).slice(0, 3).map((b) => `${b.name} ${b.w}/${b.r}`).join(", ")).join("\n");
      }
      const messages = [
        { role: "system", content: `You are Zaap, the witty in-house sports expert of ScoreZaap, a live scores and sports news site for Indian fans. Answer sports questions, explain rules simply, discuss teams and players, and narrate matches on the site using ONLY the real data fields below - never invent scores, wickets, scorers or events you cannot see. If the data for something is missing, say so plainly and say what IS available. Keep answers short (2-5 sentences) and energetic, no fluff.
The user's language: ${langName}. ALWAYS reply in ${langName}${langName === "English" ? "" : " (natural, conversational; Hinglish-style mixing is fine for Hindi)"}, regardless of the language the user writes in.
Current matches on the site:
${snapshot}${liveSc}` },
        ...userMsgs
      ];
      try {
        const ai = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages, max_tokens: 400 });
        return json({ reply: (ai.response || "").trim() || "No words. Try again?" });
      } catch (e) {
        szLogAiFailure(e);
        return json({ error: "Zaap is busy right now. Try again in a bit." }, 503);
      }
    }
    if (path === "/rankings") return htmlOut(await szAuditRankPage(env));
    if (path === "/contact") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "Contact Us").replace("__BODY__", CONTACT_BODY));
    if (path === "/about") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "About Us").replace("__BODY__", ABOUT_BODY));
    if (path === "/privacy") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "Privacy Policy").replace("__BODY__", PRIVACY_BODY));
    if (path.startsWith("/player/")) return htmlOut(PLAYER_PAGE);
    if (path === "/series/f1/x") return htmlOut(await szAuditF1Page(env));
    if (path.startsWith("/series/")) return htmlOut(SERIES_PAGE);
    if (path === "/schedule" || path === "/archives") {
      const sp2 = (await szAuditSchedule(env, path)).replace("<title>Schedule \xB7 ScoreZaap</title>", `<title>${path === "/archives" ? "Archives - Results" : "Schedule - Fixtures"} - ScoreZaap</title><link rel="canonical" href="https://scorezaap.tech${path}"><meta name="description" content="${path === "/archives" ? "Recent cricket and football results on ScoreZaap." : "Upcoming cricket and football fixtures and live matches on ScoreZaap."}">`);
      return htmlOut(sp2);
    }
    if (path.startsWith("/team/")) {
      const seg2 = path.split("/").filter(Boolean);
      const tname = decodeURIComponent(seg2[2] || "").slice(0, 60);
      const tp2 = TEAM_PAGE.replace("<title>Team \xB7 ScoreZaap</title>", `<title>${escAttr(tname)} - Team - ScoreZaap</title><link rel="canonical" href="https://scorezaap.tech${escAttr(path)}"><meta name="description" content="${escAttr(tname)} matches, fixtures and results on ScoreZaap.">`);
      return htmlOut(tp2);
    }
    if (path.startsWith("/match/") && path.split("/").filter(Boolean).length === 2 && /^cbz_[A-Za-z0-9]+$/.test(path.split("/").filter(Boolean)[1] || "")) {
      return Response.redirect("https://" + url.host + "/match/cricket/" + encodeURIComponent(path.split("/").filter(Boolean)[1]), 301);
    }
    if (path.startsWith("/match/")) {
      const seg = path.split("/").filter(Boolean);
      const sport = seg[1] || "", mid = decodeURIComponent(seg.slice(2).join("/") || "");
      let mtitle = "Live score", mdesc = "Live scores, ball-by-ball commentary and match stats on ScoreZaap.";
      let fstart = null, fvenue = null, fhome = "", faway = "";
      try {
        let found = null;
        const snapKey = sport === "cricket" ? "cricket" : sport === "football" ? "football" : "espn_" + sport;
        const snap = env.SPORTS_KV ? await env.SPORTS_KV.get(snapKey, "json") : null;
        if (snap && Array.isArray(snap.matches)) found = snap.matches.find((m) => String(m.id) === mid);
        if (!found && sport === "cricket") {
          const bk = env.SPORTS_KV ? await env.SPORTS_KV.get("md_cb_" + mid, "json") : null;
          if (bk) found = { title: bk.name || bk.title, venue: bk.venue, start: bk.dateTimeGMT, status: bk.status };
        }
        if (found && found.title) {
          mtitle = found.title;
          fstart = found.start || null;
          fvenue = found.venue || null;
          fhome = found.home && found.home.name || "";
          faway = found.away && found.away.name || "";
          const bits = [];
          if (found.statusText || found.status) bits.push(found.statusText || found.status);
          if (found.venue) bits.push(found.venue);
          if (bits.length) mdesc = bits.join(" - ") + ". Live on ScoreZaap.";
        }
      } catch (e) {
      }
      const ogTags = `<meta property="og:type" content="website"><meta property="og:site_name" content="ScoreZaap"><meta property="og:title" content="${escAttr(mtitle + " - ScoreZaap")}"><meta property="og:description" content="${escAttr(mdesc)}"><meta property="og:url" content="https://scorezaap.tech${path}"><meta property="og:image" content="https://scorezaap.tech/icon-512.png"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escAttr(mtitle + " - ScoreZaap")}"><meta name="twitter:description" content="${escAttr(mdesc)}">`;
      const canonLd = `<link rel="canonical" href="https://scorezaap.tech${path}"><meta name="description" content="${escAttr(mdesc)}"><script type="application/ld+json">${JSON.stringify(fstart ? { "@context": "https://schema.org", "@type": "SportsEvent", name: mtitle, url: "https://scorezaap.tech" + path, startDate: fstart, eventStatus: "https://schema.org/EventScheduled", location: { "@type": "Place", name: fvenue || "Venue to be confirmed", address: fvenue || "To be confirmed" }, homeTeam: { "@type": "SportsTeam", name: fhome || mtitle.split(" vs ")[0] || mtitle }, awayTeam: { "@type": "SportsTeam", name: faway || mtitle.split(" vs ")[1] || "" } } : { "@context": "https://schema.org", "@type": "WebPage", name: mtitle, url: "https://scorezaap.tech" + path }).replace(/</g, "\\u003c")}</${"script"}>`;
      let page2 = MATCH_PAGE.replace("<title>Match \xB7 ScoreZaap</title>", `<title>${escAttr(mtitle)} - ScoreZaap</title>${ogTags}${canonLd}`);
      try {
        const apiUrl2 = new URL(request.url);
        apiUrl2.pathname = "/api/match";
        apiUrl2.search = "?sport=" + encodeURIComponent(sport) + "&id=" + encodeURIComponent(mid);
        const apiResp2 = await this._handle(request, env, ctx, apiUrl2);
        const mj2 = await apiResp2.json();
        const ssr2 = matchSSR(sport, mj2);
        if (ssr2) page2 = page2.replace('<div id="app"><div class="skel sk1"></div><div class="skel sk2"></div><div class="skel sk3"></div></div>', '<style>.ssr h1{font:700 22px "Space Grotesk",sans-serif;margin:14px 0 6px}.ssr h2{font:700 16px "Space Grotesk",sans-serif;margin:18px 0 6px}.ssr p{margin:6px 0;color:var(--dim);font-size:14px}.ssr ul{list-style:none;padding:0;margin:8px 0}.ssr li{padding:4px 0;border-bottom:1px solid var(--line);font-size:14px}.ssr table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0}.ssr th,.ssr td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--line)}.ssr th{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px}</style><div id="app">' + ssr2 + "</div>");
      } catch (e) {
      }
      return htmlOut(page2);
    }
    if (path.length > 1 && path.endsWith("/")) return Response.redirect("https://" + url.host + path.replace(/\/+$/, "") + url.search, 301);
    if (path !== "/" && path !== "/index.html") {
      return new Response('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found - ScoreZaap</title><style>body{font-family:system-ui,sans-serif;background:#0b1020;color:#e8ecf5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center}a{color:#4ade80}</style></head><body><div><h1>404</h1><p>This page does not exist.</p><p><a href="/">Go to ScoreZaap live scores</a></p></div></body></html>', { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=300" } });
    }
    const [c, f, n, nba, mlb, nhl, tennis, f1] = await Promise.all([
      readKV(env, "cricket", { at: 0, matches: [] }),
      readKV(env, "football", { at: 0, matches: [] }),
      readKV(env, "news", { at: 0, items: [] }),
      readKV(env, "espn_nba", { matches: [] }),
      readKV(env, "espn_mlb", { matches: [] }),
      readKV(env, "espn_nhl", { matches: [] }),
      readKV(env, "espn_tennis", { matches: [] }),
      readKV(env, "espn_f1", { matches: [] })
    ]);
    const seenSer = {};
    for (const m of c.matches) {
      const tail = String(m.title || "").split(",").pop().trim();
      if (tail && tail.length > 6 && !seenSer[tail]) seenSer[tail] = { id: "byname/" + encodeURIComponent(tail), name: tail };
    }
    const seriesItems = Object.values(seenSer).slice(0, 6);
    const boot = JSON.stringify({ cricket: c.matches, football: f.matches, espn: { nba: nba.matches, mlb: mlb.matches, nhl: nhl.matches, tennis: tennis.matches, f1: f1.matches }, news: { items: szNewsSorted().map((p) => ({ title: p.title, desc: p.description, link: "https://scorezaap.tech/news/" + p.slug, source: "ScoreZaap", published: p.published })) }, series: seriesItems }).replace(/</g, "<");
    let page = PAGE.replace("/*__BOOT__*/", "window.__BOOT=" + boot + ";");
    page = page.replace('<div class="tabs" id="tabs">', '<section class="score-intro" aria-label="Scoreboard"><div><span class="kicker">ScoreZaap / Match centre</span><h2>The scoreboard.</h2></div><p>Live scores. Every sport.</p></section><div class="tabs" id="tabs">');
    try {
      const homeHtml = homeSSR({ cricket: c.matches, football: f.matches, espn: { nba: nba.matches, mlb: mlb.matches, nhl: nhl.matches, tennis: tennis.matches, f1: f1.matches } });
      const newsHtml = newsSSR(n.items);
      if (homeHtml || newsHtml) page = page.replace('<div id="scores"></div>', '<style>.ssr h2{font:700 17px "Space Grotesk",sans-serif;margin:18px 0 8px;color:var(--txt)}.ssr ul{list-style:none;padding:0;margin:0 0 8px}.ssr li{padding:9px 2px;border-bottom:1px solid var(--line);font-size:14px;line-height:1.5;color:var(--txt)}.ssr a{color:var(--txt);text-decoration:none;font-weight:600}.ssr a:hover{color:var(--lime)}.ssr .dim{color:var(--dim);font-size:12.5px}</style><div id="scores"><div class="ssr">' + homeHtml + newsHtml + "</div></div>");
    } catch (e) {
    }
    return htmlOut(page, { "Cache-Control": "public, max-age=20, stale-while-revalidate=40" });
  },
  async scheduled(event, env, ctx) {
    env = szQuotaEnv(env);
    const cron = event.cron, t0 = Date.now();
    const footballCron = cron === "1,21,41 * * * *";
    const slot = Math.round(new Date(event.scheduledTime).getUTCMinutes() / 5) % 4;
    const name = footballCron ? "football" : slot === 0 ? "scores" : slot === 2 ? "news" : "enrich";
    const dbg = /* @__PURE__ */ __name(async (stage, err, info) => {
      try {
        await env.DB.prepare("INSERT INTO sz_automation (id,value,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("cron_debug_" + name, JSON.stringify({ cron, slot, stage, at: (/* @__PURE__ */ new Date()).toISOString(), ms: Date.now() - t0, err: err ? String(err.message || err).slice(0, 300) : null, ...info && typeof info === "object" ? { info } : {} }), (/* @__PURE__ */ new Date()).toISOString()).run();
      } catch (e) {
      }
    }, "dbg");
    const job = footballCron ? () => refresh("football", env, ctx) : slot === 0 ? () => refresh("all", env, ctx) : slot === 2 ? () => szAutoRun(env) : () => szEnrichRun(env);
    ctx.waitUntil((async () => {
      await dbg("start");
      try {
        const info = await job();
        await dbg("done", null, info);
      } catch (e) {
        await dbg("error", e);
      }
    })());
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
export { fetchEspnSport, ESPN_SPORTS, fetchNews, szNewsPublishedDate, szAutoItems };

