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
var __szRawFetch = globalThis.fetch;
globalThis.fetch = __name222222(function(input, init) {
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
var ESPN_API = "https://site.web.api.espn.com/apis/site/v2/sports";
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
async function szLiveOverlay(c2, f2, espnBlobs) {
  const now = Date.now();
  const started = (m) => m.status === "live" || m.status === "upcoming" && m.start && new Date(m.start).getTime() <= now && now - new Date(m.start).getTime() < 6 * 36e5;
  const jobs = [];
  const cua = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept": "application/json" };
  const liveC = (c2.matches || []).filter((m) => String(m.id).startsWith("cbz_") && m.status !== "finished" && (!m.start || new Date(m.start).getTime() <= now)).slice(0, 12);
  for (const m of liveC) {
    jobs.push((async () => {
      const d = await szFastJson("https://m.cricbuzz.com/api/mcenter/scorecard/" + String(m.id).slice(4), cua, 10, 2500);
      const s = d ? cbzMiniScorecard(d) : null;
      if (s) {
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
        if (!ev) {
          const hn = norm(m.home && m.home.name), an = norm(m.away && m.away.name);
          const hit = (e, n) => (((e.competitions || [])[0] || {}).competitors || []).some((c) => [c.team?.displayName, c.team?.shortDisplayName, c.team?.name].map(norm).some((y) => y && n && (n.includes(y) || y.includes(n))));
          ev = sb.events.find((e) => hit(e, hn) && hit(e, an));
        }
        if (!ev) continue;
        const mm = espnEventToMatch("football", "soccer/" + slug, "", ev, "");
        if (mm.status === "upcoming") continue;
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
            const d = await szFastJson(`${ESPN_API}/${p}/scoreboard`, ua, 15, 2500);
            if (d) out.push(...espnTennisToMatches(p, d));
          }
          if (!out.length) return;
          const rank = { live: 0, upcoming: 1, finished: 2 };
          blob.matches = out.sort((a, b) => rank[a.status] - rank[b.status] || new Date(b.start) - new Date(a.start)).slice(0, 40);
          return;
        }
        const d = await szFastJson(`${ESPN_API}/${spec.path}/scoreboard`, ua, 15, 2500);
        if (!d) return;
        const fresh = spec.kind === "f1" ? espnF1ToMatches(spec.path, d) : (d.events || []).map((e) => espnEventToMatch(spec.key, spec.path, spec.icon, e, d.leagues?.[0]?.name));
        if (fresh && fresh.length) blob.matches = fresh;
      } catch (e) {
      }
    })());
  }
  await Promise.all(jobs);
  return now;
}
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
    if (pk && seen[pk[1]]) { i += key.length; continue; }
    let depth = 0, j = i;
    const lim = Math.min(text.length, i + 20000);
    for (; j < lim; j++) {
      const c = text.charCodeAt(j);
      if (c === 123) depth++;
      else if (c === 125) { depth--; if (depth === 0) break; }
    }
    if (depth === 0) {
      let seg = text.slice(i, j + 1);
      if (escd) seg = seg.replace(/\\\\/g, "\u0001").replace(/\\"/g, '"').replace(/\u0001/g, "\\");
      try { const o = JSON.parse(seg); if (o && o.matchInfo && o.matchInfo.matchId) { seen[o.matchInfo.matchId] = 1; out.push(o); } } catch (e) {}
    }
    i = j + 1;
  }
  return out;
}
async function cbzFreeList() {
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const get = async (u) => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8e3);
      const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "text/html,application/json" }, signal: ctl.signal });
      clearTimeout(t);
      return r.ok ? await r.text() : "";
    } catch (e) {
      return "";
    }
  };
  const [home, ls] = await Promise.all([get("https://m.cricbuzz.com/api/home"), get("https://www.cricbuzz.com/cricket-match/live-scores")]);
  const matches = cbzExtractMatches(home).concat(cbzExtractMatches(ls));
  console.log("cbz free list:", matches.length, "matches");
  return matches.length ? { typeMatches: [{ seriesMatches: [{ matches }] }] } : null;
}
async function fetchCricketCbz(env) {
  let live = await cbzFreeList().catch(() => null);
  let up = null;
  if (!live) {
    live = await cbzFetch(env, "/matches/v1/live").catch(() => null);
    up = await cbzFetch(env, "/matches/v1/upcoming").catch(() => null);
  }
  const out = [];
  const seen = {};
  const eat = /* @__PURE__ */ __name22222((d, liveDefault) => {
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
          const pushInn = /* @__PURE__ */ __name22222((sname, inn) => {
            ["inngs1", "inngs2"].forEach((k, i) => {
              const x = inn && inn[k];
              if (x && x.runs != null) scores.push({ inning: sname + " " + (i + 1), value: x.runs + "/" + (x.wickets != null ? x.wickets : 0) + " (" + x.overs + ")" });
            });
          }, "pushInn");
          pushInn(t1.teamSName || "T1", ms.team1Score);
          pushInn(t2.teamSName || "T2", ms.team2Score);
          const vi = mi.venueInfo || {};
          out.push({
            id: "cbz_" + mid,
            sport: "cricket",
            title: (t1.teamName || "") + " vs " + (t2.teamName || "") + (mi.matchDesc ? ", " + mi.matchDesc : "") + (mi.seriesName ? ", " + mi.seriesName : ""),
            home: { name: t1.teamName || "", short: (t1.teamSName || "").slice(0, 8), logo: t1.imageId ? CBZ_IMG + t1.imageId + "/i.jpg" : null },
            away: { name: t2.teamName || "", short: (t2.teamSName || "").slice(0, 8), logo: t2.imageId ? CBZ_IMG + t2.imageId + "/i.jpg" : null },
            status: isLive ? "live" : isFin ? "finished" : "upcoming",
            statusText: mi.status || null,
            scores,
            venue: vi.ground ? vi.ground + (vi.city ? ", " + vi.city : "") : null,
            start: mi.startDate ? (/* @__PURE__ */ new Date(+mi.startDate)).toISOString() : null,
            matchType: (mi.matchFormat || "").toUpperCase(),
            series: mi.seriesName || null
          });
        }
      }
    }
  }, "eat");
  eat(live, true);
  eat(up, false);
  const rank = /* @__PURE__ */ __name22222((m) => m.status === "live" ? 0 : m.status === "upcoming" ? 1 : 2, "rank");
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
function czTeamKey(t) {
  const n = String(t && t.name || t || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
  return n;
}
function czFixtureTeams(m) {
  return [czTeamKey(m.home), czTeamKey(m.away)].sort().join("|");
}
function czMatchNo(m) {
  const x = /(\d+)(?:st|nd|rd|th)\s+(?:Match|ODI|T20I?|Test|unofficial)/i.exec(String(m.title || ""));
  return x ? x[1] : null;
}
function dedupeCricket(list) {
  const src = (list || []).filter(Boolean);
  const isCbz = (m) => String(m.id).startsWith("cbz_");
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
  const toMs = (v) => v ? Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(String(v)) ? v : v + "Z") : NaN;
  for (const m of src.filter((x) => !isCbz(x))) {
    if (seenIds.has(String(m.id))) continue;
    const tk = czFixtureTeams(m);
    const t = toMs(m.start), no = czMatchNo(m);
    const dup = tk !== "|" && (cbzByTeams.get(tk) || []).some((c) => {
      const cn = czMatchNo(c);
      if (no && cn && no !== cn) return false;
      const ct = toMs(c.start);
      return isNaN(t) || isNaN(ct) ? true : Math.abs(ct - t) < 12 * 36e5;
    });
    if (dup) continue;
    seenIds.add(String(m.id));
    kept.push(m);
  }
  return kept;
}
async function fetchCricket(env) {
  const r = await fetch(`${CRIC_API}/currentMatches?apikey=${env.CRICKETDATA_KEY}&offset=0`);
  const j = await r.json();
  if (!j.data) throw new Error("cricketdata limit or error - keeping stale KV");
  const out = [];
  for (const m of j.data || []) {
    const scores = (m.score || []).map((x) => ({ inning: (x.inning || "").replace(/ Inning.*$/, ""), value: `${x.r}/${x.w} (${x.o})` }));
    out.push({
      id: m.id,
      sport: "cricket",
      title: m.name,
      home: { name: m.teams?.[0] || "", short: (m.teamInfo?.[0]?.shortname || m.teams?.[0] || "").slice(0, 8), logo: m.teamInfo?.[0]?.img },
      away: { name: m.teams?.[1] || "", short: (m.teamInfo?.[1]?.shortname || m.teams?.[1] || "").slice(0, 8), logo: m.teamInfo?.[1]?.img },
      status: m.matchEnded ? "finished" : m.matchStarted ? "live" : "upcoming",
      statusText: m.status,
      scores,
      venue: m.venue,
      start: m.dateTimeGMT,
      matchType: (m.matchType || "").toUpperCase(),
      series: (String(m.name || "").split(",").length > 2 ? String(m.name || "").split(",").slice(2).join(",").trim() : null) || null
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
var FOOT_COMPS = ["PL", "ELC", "BL1", "SA", "PD", "FL1", "DED", "PPL", "BSA", "CL"];
var FOOT_ESPN_LEAGUES = [["uefa.nations", "UEFA Nations League"], ["fifa.friendly", "International Friendly"], ["fifa.worldq.uefa", "World Cup Qualifiers - UEFA"], ["fifa.worldq.afc", "World Cup Qualifiers - AFC"], ["fifa.worldq.conmebol", "World Cup Qualifiers - CONMEBOL"]];
async function fetchFootball(env) {
  const df = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const dt2 = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);
  const h2 = { "X-Auth-Token": env.FOOTBALL_DATA_KEY };
  const out = [];
  const seenIds = {};
  const batches = [FOOT_COMPS.slice(0, 5), FOOT_COMPS.slice(5)];
  for (const batch of batches) {
    const results = await Promise.all(batch.map(
      (c) => fetch(`${FOOT_API}/competitions/${c}/matches?dateFrom=${df}&dateTo=${dt2}`, { headers: h2 }).then((r) => r.ok ? r.json() : null).catch(() => null)
    ));
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
  if (!out.length) throw new Error("football-data empty across competitions");
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
function espnEventToMatch(sport, leagueLabel, icon, e, extraLeague) {
  const c = (e.competitions || [])[0] || {};
  const comps = c.competitors || [];
  const home = comps.find((x) => x.homeAway === "home") || comps[0] || {};
  const away = comps.find((x) => x.homeAway === "away") || comps[1] || {};
  const st = c.status?.type || {};
  const status = st.completed ? "finished" : st.state === "in" ? "live" : "upcoming";
  const t = /* @__PURE__ */ __name222222((x) => x.team || {}, "t");
  return {
    id: `${leagueLabel}:${e.id}`,
    sport,
    title: e.name || `${t(away).displayName || "?"} at ${t(home).displayName || "?"}`,
    home: { name: t(home).displayName, short: t(home).abbreviation, logo: t(home).logo },
    away: { name: t(away).displayName, short: t(away).abbreviation, logo: t(away).logo },
    status,
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
        const nm = /* @__PURE__ */ __name222222((x) => x.athlete?.displayName || x.athlete?.shortName || "?", "nm");
        const short = /* @__PURE__ */ __name222222((x) => {
          const n = nm(x).split(" ");
          return (n[n.length - 1] || "?").slice(0, 10);
        }, "short");
        const sets = comps.map((x) => (x.linescores || []).map((s) => s.value).join(" "));
        const st = c.status?.type || {};
        out.push({
          id: `${label}:${c.id}`,
          sport: "tennis",
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
function espnF1ToMatches(label, d) {
  return (d.events || []).map((e) => {
    const sessions = (e.competitions || []).map((c) => ({ name: c.type?.text || "Session", start: c.date, status: c.status?.type?.shortDetail }));
    const race = sessions[sessions.length - 1] || {};
    const st = e.status?.type || {};
    return {
      id: `${label}:${e.id}`,
      sport: "f1",
      title: e.name,
      home: { name: e.circuit?.fullName || "Circuit", short: "GP" },
      away: { name: "", short: "" },
      status: st.completed ? "finished" : st.state === "in" ? "live" : "upcoming",
      statusText: st.shortDetail || race.status || "",
      scores: [],
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
async function fetchEspnSport(spec) {
  const ua = { "User-Agent": "Mozilla/5.0 (ScoreZaap)" };
  if (spec.kind === "tennis") {
    const out = [];
    for (const p of [spec.path, spec.also]) {
      try {
        const r2 = await fetch(`${ESPN_API}/${p}/scoreboard`, { headers: ua });
        if (r2.ok) out.push(...espnTennisToMatches(p, await r2.json()));
      } catch (e) {
      }
    }
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
async function fetchNews() {
  const items = [];
  await Promise.all(NEWS_FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "ScoreZaap/1.0" } });
      if (!r.ok) return;
      const xml = await r.text();
      const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const b of blocks.slice(0, 12)) {
        const grab = /* @__PURE__ */ __name222222((tag) => {
          const m = b.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
          return m ? html(m[1].trim()) : "";
        }, "grab");
        const title = grab("title"), link = grab("link"), pub = grab("pubDate");
        const srcm = b.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);
        const th = b.match(/<media:thumbnail[^>]*url="([^"]+)"/) || b.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/) || b.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/);
        if (title && link) items.push({
          title,
          link,
          source: srcm ? html(srcm[1].trim()) : f.source,
          published: pub ? new Date(pub).toISOString() : null,
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
async function refresh(kind, env, ctx) {
  const kv = env.SPORTS_KV;
  if (!kv) return;
  if (kind === "football") {
    try {
      const oldBlob = await kv.get("football", "json");
      const matches = await fetchFootball(env);
      if (!oldBlob || JSON.stringify(oldBlob.matches) !== JSON.stringify(matches)) {
        await kv.put("football", JSON.stringify({ at: Date.now(), matches }));
        if (env.DB) ctx.waitUntil(dbUpsertMatches(env, "football", matches));
        await detectTransitions(env, ctx, "football", oldBlob && oldBlob.matches, matches);
      }
    } catch (e) {
      console.log("football refresh failed", e.message);
    }
    return;
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
  for (const spec of ESPN_SPORTS) jobs.push(fetchEspnSport(spec).catch((e) => {
    console.log("espn fail", spec.key, e.message);
    return null;
  }));
  let [cricket, news, ...espn] = await Promise.all(jobs);
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
      for (const lm of cricket.filter((x) => String(x.id).startsWith("cbz_") && x.status !== "finished" && (!x.start || new Date(x.start).getTime() <= Date.now())).slice(0, 8)) {
        try {
          const better = /* @__PURE__ */ __name2222((cur2, idx2, val2) => {
            const pm = /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(val2 || "");
            if (!pm) return false;
            const cRuns = +pm[1], cOv = +pm[3];
            const ex = cur2 && cur2[idx2] && /(\d+)\/(\d+)\s*\((\d+\.?\d*)\)/.exec(cur2[idx2].value || "");
            if (!ex) return true;
            const eRuns = +ex[1], eOv = +ex[3];
            return cOv > eOv || cOv === eOv && cRuns > eRuns;
          }, "better");
          const sc2 = String(lm.id).startsWith("cbz_") ? await cbzMiniScorecardFetch(String(lm.id).slice(4)).catch(() => null) : await kv.get("sc_c_" + lm.id, "json").catch(() => null);
          if (sc2 && Array.isArray(sc2.innings) && sc2.innings.length) {
            applyMiniScore(lm, sc2);
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
      const oldBlob = await kv.get("cricket", "json");
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
async function detectTransitions(env, ctx, sport, oldList, newList) {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return;
  const prev = {};
  for (const m of oldList) prev[String(m.id)] = m.status;
  for (const m of newList) {
    const was = prev[String(m.id)];
    if (!was) continue;
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
function cbzUnescape(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (m, c) => String.fromCharCode(parseInt(c, 16))).replace(/\\(.)/g, (m, c) => c === "n" ? "\n" : c === "t" ? "\t" : c);
}
function cbzExtractJson(html, anchor) {
  const i = html.indexOf(anchor);
  if (i < 0) return null;
  const j = html.indexOf("{", i);
  if (j < 0) return null;
  let depth = 0;
  const end = Math.min(html.length, j + 8e5);
  for (let k = j; k < end; k++) {
    const c = html[k];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (!depth) return html.slice(j, k + 1);
    }
  }
  return null;
}
var CBZ_UA = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" };
async function cbzRankingsHtml(fmt, typ) {
  const cat = { batsmen: "batting", bowlers: "bowling", allrounders: "all-rounder", teams: "teams" }[typ];
  if (!cat) return null;
  try {
    const r = await fetch(`https://www.cricbuzz.com/cricket-stats/icc-rankings/men/${cat}`, { headers: { ...CBZ_UA, "Accept": "text/html" } });
    if (!r.ok) return null;
    const html = await r.text();
    const raw = cbzExtractJson(html, '\\"formatTypesData\\":');
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
async function cbzPlayerHtml(pid) {
  try {
    const r = await fetch(`https://www.cricbuzz.com/profiles/${pid}/x`, { headers: { ...CBZ_UA, "Accept": "text/html" } });
    if (!r.ok) return null;
    const html = await r.text();
    const raw = cbzExtractJson(html, '{\\"id\\":\\"' + pid + '\\"');
    if (!raw) return null;
    const d = JSON.parse(cbzUnescape(raw));
    if (!d || !d.name) return null;
    return d;
  } catch (e) {
    return null;
  }
}
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
      const walk = /* @__PURE__ */ __name222222((o) => {
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
async function cbzScorecard(env, cricketId, title, startIso, live) {
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
  const matchTeams = /* @__PURE__ */ __name222222((e) => {
    const comps2 = ((e.competitions || [])[0] || {}).competitors || [];
    const names = comps2.map((c) => norm(c.team?.displayName) + "|" + norm(c.team?.shortDisplayName) + "|" + norm(c.team?.name));
    const hit = /* @__PURE__ */ __name222222((n) => names.some((x) => x.split("|").some((y) => y && n && (n.includes(y) || y.includes(n)))), "hit");
    return hit(hn) && hit(an);
  }, "matchTeams");
  const ev = (sb.events || []).find(matchTeams);
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
async function espnGenericDetail(env, id) {
  const [leaguePath, eventId] = String(id).split(":");
  if (!leaguePath || !eventId) return null;
  const specKey = leaguePath.split("/")[1];
  const kvKey = "espn_" + (specKey === "atp" || specKey === "wta" ? "tennis" : specKey);
  const list = await readKV(env, kvKey, { matches: [] });
  const m = (list.matches || []).find((x) => x.id === id);
  if (!m) return null;
  const detail = {
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
      if (h && a) detail.bigScore = `${h.score || 0} - ${a.score || 0}`;
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
 <div class="hdrbeam"></div>
 <div id="stripWrap"><span class="striptag"><i></i>LIVE</span><div id="liveStrip"></div></div>
 <div class="searchwrap" id="sWrap"><input id="sIn" type="search" placeholder="Search teams, matches, series..." autocomplete="off"><div id="sRes" style="margin-top:10px"></div></div>
 <div class="tabs" id="tabs">
  <div class="tab on" data-tab="all">All</div>
  <div class="tab" data-tab="cricket">\u{1F3CF} Cricket</div>
  <div class="tab" data-tab="football">\u26BD Football</div>
  <div class="tab" data-tab="nba">\u{1F3C0} NBA</div>
  <div class="tab" data-tab="mlb">\u26BE MLB</div>
  <div class="tab" data-tab="nhl">\u{1F3D2} NHL</div>
  <div class="tab" data-tab="tennis">\u{1F3BE} Tennis</div>
  <div class="tab" data-tab="f1">\u{1F3CE}\uFE0F F1</div>
  <div class="tab" data-tab="news">\u{1F4F0} News</div>
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
<script>
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
const ICONS={cricket:'\u{1F3CF}',football:'\u26BD',nba:'\u{1F3C0}',mlb:'\u26BE',nhl:'\u{1F3D2}',tennis:'\u{1F3BE}',f1:'\u{1F3CE}\uFE0F'};
function teamRow(t,score){const img=t.logo?'<img src="'+esc(t.logo)+'" alt="" onerror="this.remove()" loading="lazy">':'';
 return '<div class="tm"><div class="tn">'+img+'<span>'+esc(t.short||t.name)+'</span></div>'+(score?'<div class="ts" data-ts>'+esc(score)+'</div>':'')+'</div>'}
function matchCard(m,i){
 const st=m.status==='live'?'<span class="pill live">Live</span>':m.status==='finished'?'<span class="pill fin">FT</span>':'<span class="pill up">'+esc(localTime(m.start)||'Soon')+'</span>';
 const icon=ICONS[m.sport]||'\u{1F3DF}\uFE0F';
 const stxt=m.status==='live'&&m.statusText?'<span class="stxt">'+esc(m.statusText)+'</span>':'';
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
 return '<div class="card '+m.sport+' '+m.status+(m.status==='finished'?' fin':'')+'" data-id="'+esc(m.id)+'" data-sport="'+m.sport+'" style="animation-delay:'+Math.min(i*45,400)+'ms"><div class="mt">'+icon+' '+st+stxt+(m.matchType?'<span style="margin-left:'+(stxt?'8px':'auto')+'">'+esc(m.matchType)+'</span>':'')+'</div>'+body+(m.venue&&m.sport!=='f1'?'<div class="venue">\u{1F4CD} '+esc(m.venue)+'</div>':'')+'</div>';
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
 el.innerHTML=html;
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
async function loadScores(){
 try{
  const r=await fetch('/api/scores',{cache:'no-store'});const j=await r.json();
  DATA.cricket=j.cricket||[];DATA.football=j.football||[];DATA.espn=j.espn||{};
  renderStrip();renderScores();
 }catch(e){
  if(!allMatches().length)$('#scores').innerHTML='<div class="empty"><div class="big">\u{1F4E1}</div>Could not reach the scores server.<br><button class="retry" onclick="loadScores()">Retry</button></div>';
 }
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
setInterval(loadScores,15000);setInterval(loadNews,300000);
<\/script>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}<\/script><button id="thbtn" aria-label="Toggle theme"></button>
<style>#thbtn{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));left:auto;right:14px;z-index:60;width:38px;height:38px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--txt);font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}</style>
<script>(function(){var b=document.getElementById('thbtn');function paint(){b.textContent=document.documentElement.dataset.theme==='light'?'\u{1F319}':'\u2600\uFE0F'}paint();b.onclick=function(){var t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;localStorage.sztheme=t;paint()}})();<\/script>
</body>
</html>`;
var SZFOOTER = `<style>
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
@media (max-width:700px){.szfoot .sfgrid{gap:18px 30px}.szfoot .sfbrand{flex:1 1 100%}.szfoot .sfcol{flex:0 0 calc(33% - 20px);min-width:110px}}
</style>
<footer class="szfoot"><div class="sfgrid">
<div class="sfbrand"><div class="sfrow"><div class="sflogo">&#9889;</div><b>Score<span>Zaap</span></b></div><p>Live scores, rankings and Zaap AI - every sport, one tap.</p></div>
<div class="sfcol"><h5>Sports</h5><a href="/?tab=cricket">Cricket</a><a href="/?tab=football">Football</a><a href="/?tab=nba">NBA</a><a href="/?tab=mlb">MLB</a><a href="/?tab=nhl">NHL</a><a href="/?tab=tennis">Tennis</a><a href="/?tab=f1">F1</a></div>
<div class="sfcol"><h5>Explore</h5><a href="/">Live Scores</a><a href="/rankings">ICC Rankings</a><a href="/schedule">Schedule</a><a href="/archives">Archives</a><a href="/?tab=news">News</a><a href="/series/f1/x">F1 Hub</a></div>
<div class="sfcol"><h5>Company</h5><a href="/about">About Us</a><a href="/contact">Contact Us</a><a href="/privacy">Privacy Policy</a></div>
</div><div class="sfbar"><span>&copy; 2026 ScoreZaap. All rights reserved.</span></div></footer>`;
function htmlOut(page, extra) {
  const h = { "Content-Type": "text/html;charset=UTF-8" };
  if (extra) Object.assign(h, extra);
  return new Response(page.replace("</body>", SZFOOTER + "\n</body>"), { headers: h });
}
__name(htmlOut, "htmlOut");
__name2(htmlOut, "htmlOut");
__name22(htmlOut, "htmlOut");
__name222(htmlOut, "htmlOut");
__name2222(htmlOut, "htmlOut");
__name22222(htmlOut, "htmlOut");
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
var PRIVACY_BODY = `<h2>Privacy Policy</h2><p class="lead">The short version: reading scores on ScoreZaap needs no account, no sign-in and no personal data. Last updated: September 2026.</p><div class="infosec"><h4>What we store</h4><p>Your theme, voice and language preferences live in your own browser (localStorage). If you enable push notifications, your browser gives us a subscription endpoint used only to send match alerts you asked for. Match polls store votes anonymously - one vote per poll per browser.</p></div><div class="infosec"><h4>What we never do</h4><p>We do not sell, rent or share personal data with anyone. We do not run account systems, so there is no profile to leak.</p></div><div class="infosec"><h4>Advertising</h4><p>To keep ScoreZaap free, we may show ads served by Google AdSense. Google may use cookies to serve and measure ads. You can control ad personalization in your Google ad settings.</p></div><div class="infosec"><h4>Analytics</h4><p>We look at aggregate, anonymous usage (which sports and pages get visits) to decide what to build next. No individual tracking profiles.</p></div><div class="infosec"><h4>Contact</h4><p>Questions about this policy: ashwatthama710@gmail.com.</p></div>`;
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
  if(d.error){app.innerHTML='<div class="empty"><div class="big">\u{1F3DF}\uFE0F</div>'+esc(d.error)+'</div>';return}
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
 }catch(e){app.innerHTML='<div class="empty"><div class="big">\u26A0\uFE0F</div>Could not load this series.<br><a href="javascript:location.reload()" style="color:var(--lime)">Retry</a></div>'}
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
 document.getElementById('rows').innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
 try{
  const r=await fetch('/api/rankings?format='+FMT+'&type='+TYP);const j=await r.json();
  if(j.error){document.getElementById('rows').innerHTML='<div class="note">Rankings temporarily unavailable. Try again later.</div>';return}
  document.getElementById('upd').textContent='Updated '+esc(j.updated||'');
  document.getElementById('rows').innerHTML=j.rows.map((x,i)=>{
   const tr=x.trend==='Up'?'<span style="color:var(--lime)">\u25B2</span>':(x.trend==='Down'?'<span style="color:var(--red)">\u25BC</span>':'<span style="color:var(--dim)">\u2022</span>');
   return '<div class="row'+(x.rank<=3?' top3':'')+'" style="animation-delay:'+Math.min(i*30,300)+'ms'+(x.id?';cursor:pointer':'')+'"'+(x.id?' onclick="location.href='+String.fromCharCode(39)+'/player/'+x.id+String.fromCharCode(39)+'"':'')+'><div class="rk">'+x.rank+'</div>'+(x.img?'<img class="pimg" src="'+esc(x.img)+'" loading="lazy" onerror="this.remove()">':'')+'<div class="nm">'+esc(x.name)+'<small>'+esc(x.country||'')+'</small></div><div class="tr">'+tr+'</div><div class="rt">'+x.rating+'</div></div>';
  }).join('');
 }catch(e){document.getElementById('rows').innerHTML='<div class="note">Network error. Retry.</div>'}
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
  <button class="back" id="bellBtn" title="Notify me" style="margin-left:auto">\u{1F514}</button>
  <div class="refresh" id="ref" style="margin-left:0"></div>
 </div>
 <div id="app"><div class="skel sk1"></div><div class="skel sk2"></div><div class="skel sk3"></div></div>
</div>
<script>
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
  const note=SCARD?'<div class="note">Scorecard will appear once play begins.</div>':'<div class="note">Full scorecard for this match is not available yet. Innings totals above are live.</div>';
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
async function load(first){
 try{
  if(first){try{const c=sessionStorage.getItem('md_'+SPORT+'_'+MID);if(c){const p=JSON.parse(c);if(Date.now()-p.at<120e3&&p.j&&!p.j.error){DETAIL=p.j.detail;SQUADS=p.j.squads||null;SCARD=p.j.scorecard||null;TIMELINE=p.j.timeline||null;COMM=p.j.commentary||null;STATS=p.j.stats||null;GRAPHS=p.j.graphs||null;ENDED=!isLive(DETAIL);render()}}}catch(e){}}
  const r=await fetch('/api/match?sport='+SPORT+'&id='+encodeURIComponent(MID));
  const j=await r.json();
  if(j.error){$('#app').innerHTML='<div class="err">'+esc(j.error)+'<br><a class="retry" href="/">\u2190 Back to scores</a></div>';return}
  DETAIL=j.detail;SQUADS=j.squads||null;SCARD=j.scorecard||null;TIMELINE=j.timeline||null;COMM=j.commentary||null;STATS=j.stats||null;GRAPHS=j.graphs||null;
  ENDED=!isLive(DETAIL);
  $('#ref').innerHTML=ENDED?'':'<span class="rdot"></span><span class="rtxt">Auto-refreshing</span>';
  render();
 }catch(e){if(!DETAIL)$('#app').innerHTML='<div class="err">Taking too long to load. <a class="retry" href="">Retry</a></div>'}
}
document.addEventListener('click',e=>{
 const tb=e.target.closest('.htab button');if(tb){CTAB=tb.dataset.t;render();return}
 const ch=e.target.closest('.chip');if(ch){CINN=+ch.dataset.inn;render();return}
});
load(true);
setInterval(()=>{if(!ENDED)load(false)},30000);
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
function cbzMiniScorecard(d) {
  const sc = d && Array.isArray(d.scoreCard) ? d.scoreCard : null;
  if (!sc || !sc.length) return null;
  const numk = /* @__PURE__ */ __name2222((k) => +(String(k).split("_")[1] || 0), "numk");
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
function applyMiniScore(lm, s) {
  if (!lm || !s) return false;
  let changed = false;
  if (Array.isArray(s.innings) && s.innings.length) {
    const cur = Array.isArray(lm.scores) ? lm.scores.slice() : [];
    const shortFor = (nm) => {
      const n = String(nm || "").toLowerCase();
      if (lm.home && lm.home.short && String(lm.home.name || "").toLowerCase() === n) return lm.home.short;
      if (lm.away && lm.away.short && String(lm.away.name || "").toLowerCase() === n) return lm.away.short;
      return String(nm || "TM").slice(0, 8);
    };
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
function applyHtmlScore(lm, s, matchType) {
  if (!s || !s.scores || !s.scores.length) return false;
  const defOvers = matchType === "T20" ? "20" : "50";
  const cur = Array.isArray(lm.scores) ? lm.scores.slice() : [];
  let changed = false;
  s.scores.forEach((sc, i) => {
    const innIdx = s.scores.length === 2 ? i === 0 ? 1 : 0 : 0;
    const ov = sc.overs != null ? String(sc.overs) : sc.wkts === 10 || i === 1 || s.finished ? defOvers : null;
    if (ov == null) return;
    let idx = cur.findIndex((c) => c && c.inning && c.inning.indexOf(sc.team) === 0);
    if (idx < 0) idx = innIdx;
    const label = cur[idx] && cur[idx].inning ? cur[idx].inning : sc.team + " " + (idx + 1);
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
 }catch(e){app.innerHTML='<div class="note">Network error. Retry.</div>'}
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
 }catch(e){app.innerHTML='<div class="note">Network error. Retry.</div>'}
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
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://pagead2.googlesyndication.com https://www.googletagservices.com https://googleads.g.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://fundingchoicesmessages.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
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
function ssrEsc(x) {
  return String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
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
function homeSSR(d) {
  const order = { live: 0, upcoming: 1, finished: 2 };
  const now = Date.now();
  const groups = [["Cricket", "cricket", d.cricket], ["Football", "football", d.football], ["NBA", "nba", d.espn && d.espn.nba], ["MLB", "mlb", d.espn && d.espn.mlb], ["NHL", "nhl", d.espn && d.espn.nhl], ["Tennis", "tennis", d.espn && d.espn.tennis], ["Formula 1", "f1", d.espn && d.espn.f1]];
  let h = "";
  for (const [label, sport, list0] of groups) {
    const list = (Array.isArray(list0) ? list0 : []).filter((m) => {
      if (m.status === "finished") {
        const t = new Date(m.end || m.start || 0).getTime();
        return !t || now - t < 48 * 3600e3;
      }
      return true;
    }).sort((a, b) => (order[a.status] != null ? order[a.status] : 1) - (order[b.status] != null ? order[b.status] : 1) || String(a.start || "").localeCompare(String(b.start || ""))).slice(0, 10);
    if (!list.length) continue;
    h += "<h2>" + ssrEsc(label) + "</h2><ul>";
    for (const m of list) {
      const url2 = "/match/" + sport + "/" + encodeURIComponent(m.id);
      const sc = Array.isArray(m.scores) && m.scores.length ? " - " + m.scores.map((s) => ((s.inning ? s.inning + " " : "") + (s.value || "")).trim()).filter(Boolean).join(", ") : "";
      const bits = [m.statusText || m.status, m.matchType, m.venue].filter(Boolean).join(" - ");
      const title = m.title || ((m.home && m.home.name || "") + " vs " + (m.away && m.away.name || ""));
      h += '<li><a href="' + ssrEsc(url2) + '">' + ssrEsc(title) + "</a>" + ssrEsc(sc) + (bits ? ' <span class="dim">' + ssrEsc(bits) + "</span>" : "") + "</li>";
    }
    h += "</ul>";
  }
  return h;
}
function newsSSR(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return "<h2>Latest sports news</h2><ul>" + items.slice(0, 12).map((n2) => n2 && n2.link && n2.title ? '<li><a href="' + ssrEsc(n2.link) + '" rel="noopener">' + ssrEsc(n2.title) + "</a>" + (n2.source ? ' <span class="dim">' + ssrEsc(n2.source) + "</span>" : "") + "</li>" : "").join("") + "</ul>";
}
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.protocol === "http:") return Response.redirect("https://" + url.host + url.pathname + url.search, 301);
    const resp = await this._handle(request, env, ctx, url);
    const h2 = new Headers(resp.headers);
    for (const k of Object.keys(SEC_HEADERS)) h2.set(k, SEC_HEADERS[k]);
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h2 });
  },
  async _handle(request, env, ctx, url) {
    const path = url.pathname;
    if (path === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\nSitemap: https://scorezaap.tech/sitemap.xml\n", { headers: { "content-type": "text/plain;charset=UTF-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (path === "/ads.txt") {
      return new Response("google.com, pub-2184299953562291, DIRECT, f08c47fec0942fa0\n", { headers: { "content-type": "text/plain;charset=UTF-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (path === "/sitemap.xml") {
      const cblob = env.SPORTS_KV ? await env.SPORTS_KV.get("cricket", "json").catch(() => null) : null;
      const fblob = env.SPORTS_KV ? await env.SPORTS_KV.get("football", "json").catch(() => null) : null;
      const urls = ["/", "/rankings", "/schedule", "/archives", "/about", "/contact", "/privacy"];
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
            hr.headers.set("Cache-Control", "public, max-age=5");
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
        const liveCbz = c2.matches.filter((m) => String(m.id).startsWith("cbz_") && m.status !== "finished" && (!m.start || new Date(m.start).getTime() <= Date.now())).slice(0, 6);
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
      const szResp = json({
        cricket: c2.matches,
        football: f2.matches,
        espn: { nba: nba2.matches, mlb: mlb2.matches, nhl: nhl2.matches, tennis: tennis2.matches, f1: f12.matches },
        updated: { cricket: c2.at, football: f2.at, live: liveAt },
        live: [...c2.matches, ...f2.matches].some((m) => m.status === "live")
      }, 200, { "Cache-Control": "public, max-age=5" });
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
      const hay = /* @__PURE__ */ __name222222((m) => [m.title, m.home?.name, m.home?.short, m.away?.name, m.away?.short, m.venue, m.matchType].filter(Boolean).join(" ").toLowerCase(), "hay");
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
      return json(cached, 200, { "Cache-Control": "public, max-age=3600" });
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
          const clean = /* @__PURE__ */ __name222222((x) => x.replace(/(stadium|ground|park|arena|oval|field|cricket club|sports complex|international|national)/gi, "").replace(/\s{2,}/g, " ").trim(), "clean");
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
      const n2 = await readKV(env, "news", { at: 0, items: [] });
      return json({ items: n2.items, updated: n2.at }, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" });
    }
    if (path === "/api/refresh") {
      if (!env.CRON_SECRET || (request.headers.get("x-refresh-token") || url.searchParams.get("token") || "") !== env.CRON_SECRET) return json({ error: "unauthorized" }, 401);
      const kind = url.searchParams.get("kind") || "all";
      ctx.waitUntil(refresh(kind === "football" ? "football" : "all", env));
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
          const [scorecard, comm] = await Promise.all([
            cbzScorecard(env, id, cached.title, cached.date, liveNow).catch(() => null),
            liveNow || cached.ended ? cbzCommentary(env, id, cached.title, cached.date, liveNow).catch(() => null) : null
          ]);
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
              if (lm2 && lm2.status === "live") {
                const better2 = /* @__PURE__ */ __name2222((cur2, idx2, val2) => {
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
          return json({ sport, detail: cached, squads: squads || null, scorecard, commentary: comm ? comm.list : null, graphs });
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
          const commentary2 = (sum.commentary || []).slice(-14).reverse().map((c) => ({ min: c.time && c.time.displayValue || "", text: c.text }));
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
            if (!r.ok) return json({ error: "no detail from upstream" }, 502);
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
              winner: sc.winner && sc.winner !== "DRAW" ? sc.winner : sc.winner === "DRAW" ? "Draw" : null,
              home: m.homeTeam?.name,
              away: m.awayTeam?.name,
              homeCrest: m.homeTeam?.crest,
              awayCrest: m.awayTeam?.crest
            };
            if (env.SPORTS_KV) await env.SPORTS_KV.put(fkey, JSON.stringify(fdetail), { expirationTtl: 60 });
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
        return json({ error: "Zaap is busy right now. Try again in a bit." }, 503);
      }
    }
    if (path === "/rankings") return htmlOut(RANKINGS_PAGE);
    if (path === "/contact") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "Contact Us").replace("__BODY__", CONTACT_BODY));
    if (path === "/about") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "About Us").replace("__BODY__", ABOUT_BODY));
    if (path === "/privacy") return htmlOut(INFO_PAGE.replace(/__TITLE__/g, "Privacy Policy").replace("__BODY__", PRIVACY_BODY));
    if (path.startsWith("/player/")) return htmlOut(PLAYER_PAGE);
    if (path.startsWith("/series/")) return htmlOut(SERIES_PAGE);
    if (path === "/schedule" || path === "/archives") {
      const sp2 = SCHED_PAGE.replace("<title>Schedule \xB7 ScoreZaap</title>", `<title>${path === "/archives" ? "Archives - Results" : "Schedule - Fixtures"} - ScoreZaap</title><link rel="canonical" href="https://scorezaap.tech${path}"><meta name="description" content="${path === "/archives" ? "Recent cricket and football results on ScoreZaap." : "Upcoming cricket and football fixtures and live matches on ScoreZaap."}">`);
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
      const canonLd = `<link rel="canonical" href="https://scorezaap.tech${path}"><meta name="description" content="${escAttr(mdesc)}"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "SportsEvent", name: mtitle, url: "https://scorezaap.tech" + path, startDate: fstart || void 0, eventStatus: "https://schema.org/EventScheduled", location: fvenue ? { "@type": "Place", name: fvenue } : void 0, homeTeam: { "@type": "SportsTeam", name: fhome || mtitle.split(" vs ")[0] || mtitle }, awayTeam: { "@type": "SportsTeam", name: faway || mtitle.split(" vs ")[1] || "" } }).replace(/</g, "\\u003c")}</${"script"}>`;
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
    const boot = JSON.stringify({ cricket: c.matches, football: f.matches, espn: { nba: nba.matches, mlb: mlb.matches, nhl: nhl.matches, tennis: tennis.matches, f1: f1.matches }, news: n, series: seriesItems }).replace(/</g, "<");
    let page = PAGE.replace("/*__BOOT__*/", "window.__BOOT=" + boot + ";");
    try {
      const homeHtml = homeSSR({ cricket: c.matches, football: f.matches, espn: { nba: nba.matches, mlb: mlb.matches, nhl: nhl.matches, tennis: tennis.matches, f1: f1.matches } });
      const newsHtml = newsSSR(n.items);
      if (homeHtml || newsHtml) page = page.replace('<div id="scores"></div>', '<style>.ssr h2{font:700 17px "Space Grotesk",sans-serif;margin:18px 0 8px;color:var(--txt)}.ssr ul{list-style:none;padding:0;margin:0 0 8px}.ssr li{padding:9px 2px;border-bottom:1px solid var(--line);font-size:14px;line-height:1.5;color:var(--txt)}.ssr a{color:var(--txt);text-decoration:none;font-weight:600}.ssr a:hover{color:var(--lime)}.ssr .dim{color:var(--dim);font-size:12.5px}</style><div id="scores"><div class="ssr">' + homeHtml + newsHtml + "</div></div>");
    } catch (e) {
    }
    return htmlOut(page, { "Cache-Control": "public, max-age=20, stale-while-revalidate=40" });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(event.cron.startsWith("*/20") ? "all" : "football", env, ctx));
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map