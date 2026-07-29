// ============================================================
//  每日成长 App —— 主逻辑
// ============================================================
'use strict';

const SECTIONS = {
  english: { name: '\u82f1\u8bed\u5b66\u4e60', icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>', color: 'en', daily: 4 },
  editing: { name: '\u526a\u8f91\u5b66\u4e60', icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 2v2h2V6H7zm4 0v2h2V6h-2zm4 0v2h2V6h-2zM5 10v8h14v-8H5z"/></svg>', color: 'ed', daily: 4 },
  ops:     { name: '\u8fd0\u8425\u00b7\u8de8\u5883', icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 3v18h18M7 16l4-7 3 5 4-9"/></svg>', color: 'op', daily: 4 },
  memes:   { name: '\u6296\u97f3\u70ed\u6897', icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 22c6.075 0 10-4.925 10-11 0-4.5-3-8-6-10 0 3-1 5-3 6 0-3-1-6-4-8 1 4-2 6-2 9 0 0-2-1-3-3 0 5 2 9 8 11z"/></svg>', color: 'me', daily: 5 },
};
const SECTION_KEYS = Object.keys(SECTIONS);

// ---------- \u5b58\u50a8 ----------
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const keyCheckin = () => 'dc_checkin_v1';
const keyTasks   = (date, sec) => 'dc_tasks_' + date + '_' + sec;
const keyImportTasks = (date, sec) => 'dc_imp_' + date + '_' + sec;
const keyImports = () => 'dc_imports_v1';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dateMinus(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - days);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function prettyDate() {
  const d = new Date();
  const wk = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d'][d.getDay()];
  return (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65e5 ' + wk;
}

function seedRng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () {
    h += 0x6D2B79F5; let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(pool, n, seed) {
  const rng = seedRng(seed + '|' + pool[0].id);
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function dailyTasks(sec, date) {
  if (sec === 'memes') return pick(DATA.memes, SECTIONS.memes.daily, date + sec);
  const base = pick(DATA[sec], SECTIONS[sec].daily, date + sec);
  const imported = LS.get(keyImportTasks(date, sec), []);
  return base.concat(imported);
}

function isChecked(sec, date) {
  const all = LS.get(keyCheckin(), {});
  return !!(all[date] && all[date][sec]);
}
function checkIn(sec, date) {
  const all = LS.get(keyCheckin(), {});
  all[date] = all[date] || {};
  all[date][sec] = true;
  LS.set(keyCheckin(), all);
}
function todayCheckedCount(date) {
  return SECTION_KEYS.filter(s => isChecked(s, date)).length;
}
function streakOf(sec) {
  const date = todayStr();
  if (!isChecked(sec, date)) return countStreakFrom(sec, dateMinus(date, 1));
  return countStreakFrom(sec, date);
}
function countStreakFrom(sec, date) {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    if (isChecked(sec, date)) { s++; date = dateMinus(date, 1); }
    else break;
  }
  return s;
}

function taskDone(sec, date, id) {
  const m = LS.get(keyTasks(date, sec), {});
  return !!m[id];
}
function toggleTask(sec, date, id) {
  const m = LS.get(keyTasks(date, sec), {});
  m[id] = !m[id];
  LS.set(keyTasks(date, sec), m);
  return m[id];
}

function matchSections(text) {
  const t = text.toLowerCase();
  const hit = [];
  DATA.keywordMap.forEach(km => {
    if (km.keys.some(k => t.includes(k.toLowerCase()))) hit.push(km);
  });
  return hit;
}
function genImportTasks(sec, videoTitle, date) {
  if (sec === 'memes') {
    return [{
      id: 'imp_' + Date.now(),
      type: '\u70ed\u6897\u5206\u6790',
      title: '\u5206\u6790\u300c' + videoTitle.slice(0, 12) + '\u2026\u300d\u7528\u5230\u7684\u6897',
      desc: '\u62c6\u89e3\u5b83\u706b\u7684\u7ed3\u6784/\u97f3\u4e50/\u94a9\u5b50\uff0c\u5224\u65ad\u80fd\u5426\u4e8c\u6b21\u521b\u4f5c\u6216\u6a21\u4eff\uff0c\u8bb0\u4e00\u6761\u53ef\u590d\u7528\u7ed3\u8bba\u3002',
      duration: 15,
      tip: '\u91cd\u70b9\u770b\uff1a\u524d3\u79d2\u3001\u53cd\u8f6c\u70b9\u3001BGM\u3001\u8bc4\u8bba\u533a\u9ad8\u9891\u8bcd\u3002',
      imported: true,
    }];
  }
  const baseIds = dailyTasks(sec, date).map(t => t.id);
  const pool = DATA[sec].filter(t => !baseIds.includes(t.id));
  const chosen = pick(pool.length ? pool : DATA[sec], 1, 'imp' + Date.now() + sec);
  return chosen.map(t => ({ ...t, id: 'imp_' + Date.now() + '_' + t.id, imported: true }));
}

// ============================================================
//  \u6e32\u67d3
// ============================================================
const SVG_ICONS = {
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
  clock:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:3px"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v7l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  tip:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M9 21h6v-2H9v2zm3-19C7.58 2 4 5.58 4 10c0 3.87 3.13 7 7 7v4h2v-4c3.87 0 7-3.13 7-7 0-4.42-3.58-8-8-8z"/></svg>',
  warn:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
  target:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>',
  chevron:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 6l6 6-6 6"/></svg>',
  fire:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:3px"><path d="M12 22c6.075 0 10-4.925 10-11 0-4.5-3-8-6-10 0 3-1 5-3 6 0-3-1-6-4-8 1 4-2 6-2 9 0 0-2-1-3-3 0 5 2 9 8 11z"/></svg>',
  speaker:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
};

let current = new URLSearchParams(window.location.search).get('tab') || 'english';
let engModule = LS.get('dc_eng_module', 'tasks');
let vocabState = { cat: null, idx: 0, flipped: false };

function render() {
  const date = todayStr();
  const done = todayCheckedCount(date);
  document.getElementById('curDate').textContent = prettyDate();
  document.getElementById('progFill').style.width = (done / 4 * 100) + '%';
  document.getElementById('progText').innerHTML = '\u4eca\u65e5\u6253\u5361 <b>' + done + '/4</b> \u677f\u5757 \u00b7 \u5b8c\u6210\u5168\u90e8\u89e3\u9501\u300c\u5168\u52e4\u300d';
  const dyBtn = document.getElementById('dyBtn');
  if (dyBtn) { document.getElementById('dyLabel').textContent = '\u70ed\u95e8'; dyBtn.classList.remove('on'); }
  document.querySelectorAll('.qtab').forEach(q => q.classList.toggle('active', q.dataset.s === current));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.s === current));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.s === current));
  renderSection(current, date);
}

// ============================================================
//  \u5237\u65b0\uff1a\u624b\u52a8\u5237\u65b0 + \u8054\u7f51/\u8fde Wi-Fi \u6bcf\u65e5\u81ea\u52a8\u66f4\u65b0
// ============================================================
function refreshContent(label) {
  render();
  if (navigator.onLine !== false) {
    try { loadHot(); } catch (e) {}
  }
  LS.set('dc_last_refresh_date', todayStr());
  if (label) toast(label);
}
function dailyRefreshIfNeeded() {
  if (LS.get('dc_last_refresh_date', '') !== todayStr()) {
    refreshContent('\u5df2\u66f4\u65b0\u4eca\u65e5\u5185\u5bb9 \ud83d\udd04\uff08\u8fde Wi\u2011Fi\uff09');
  }
}

function renderSection(sec, date) {
  const wrap = document.getElementById('view-' + sec);
  const cfg = SECTIONS[sec];
  const tasks = dailyTasks(sec, date);
  const checked = isChecked(sec, date);
  const streak = streakOf(sec);
  if (sec === 'memes') {
    wrap.innerHTML = memeHTML(sec, date, tasks, checked, streak);
  } else if (sec === 'english') {
    wrap.innerHTML = englishViewHTML(date, streak, cfg, tasks);
  } else {
    wrap.innerHTML = taskListHTML(sec, date, tasks, checked, streak, cfg);
  }
}

function streakHTML(streak) {
  return '<div class="streak"><svg class="icon" viewBox="0 0 24 24" style="fill:var(--warn);width:14px;height:14px"><path d="M12 22c6.075 0 10-4.925 10-11 0-4.5-3-8-6-10 0 3-1 5-3 6 0-3-1-6-4-8 1 4-2 6-2 9 0 0-2-1-3-3 0 5 2 9 8 11z"/></svg> \u8fde\u7eed <b>' + streak + '</b> \u5929</div>';
}

function taskResources(sec, t) {
  const title = (t.title || t.name || '').replace(/\s*[\uff08(].*$/, '').slice(0, 18);
  const type = (t.type || '').trim();
  const bing = (q) => 'https://www.bing.com/search?q=' + encodeURIComponent(q);
  const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const bili = (q) => 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(q);
  const res = [];
  if (sec === 'english') {
    const em = {
      '\u8bcd\u6c47': [{label: '\ud83d\udcd6 \u5251\u6865\u8bcd\u5178', url: 'https://dictionary.cambridge.org'}, {label: '\ud83d\udd24 \u67ef\u6797\u65af\u4f8b\u53e5', url: 'https://www.collinsdictionary.com'}, {label: '\ud83d\udcdd \u4f8b\u53e5\u6a21\u677f', url: bing(title + ' \u4f8b\u53e5 \u7528\u6cd5')}],
      '\u542c\u529b': [{label: '\ud83c\udfa7 VOA \u6162\u901f\u82f1\u8bed', url: 'https://www.voalearningenglish.com'}, {label: '\ud83d\udcfb BBC Learning', url: 'https://www.bbc.co.uk/learningenglish'}, {label: '\ud83d\udd0d \u7cbe\u542c\u65b9\u6cd5', url: bing('\u82f1\u8bed \u7cbe\u542c\u8bad\u7ec3 \u65b9\u6cd5')}],
      '\u53e3\u8bed': [{label: '\ud83d\udde3 \u5f71\u5b50\u8ddf\u8bfb', url: bing('\u82f1\u8bed \u5f71\u5b50\u8ddf\u8bfb \u65b9\u6cd5')}, {label: '\u25b6 YouTube \u53e3\u8bed', url: yt('English speaking shadowing')}, {label: '\ud83d\udcf1 \u5f00\u8a00\u82f1\u8bed', url: bing('\u5f00\u8a00\u82f1\u8bed \u53e3\u8bed')}],
      '\u8bed\u6cd5': [{label: '\ud83d\udcd8 \u8bed\u6cd5\u8be6\u89e3', url: bing(title + ' \u8bed\u6cd5')}, {label: '\u270d \u8bed\u6cd5\u7ec3\u4e60', url: bing('\u82f1\u8bed\u8bed\u6cd5 \u7ec3\u4e60\u9898')}],
      '\u9605\u8bfb': [{label: '\ud83d\udcf0 \u5916\u520a\u9605\u8bfb', url: bing('\u82f1\u8bed\u5916\u520a \u7cbe\u8bfb')}, {label: '\ud83d\udd0d \u9605\u8bfb\u6280\u5de7', url: bing('\u82f1\u8bed\u9605\u8bfb \u6280\u5de7')}],
    };
    res.push(...(em[type] || em['\u8bcd\u6c47']));
    res.push({ label: '\u25b6 \u641c\u6559\u7a0b', url: yt('\u82f1\u8bed ' + title) });
  } else if (sec === 'editing') {
    const kw = ({ '\u8f6c\u573a': '\u8f6c\u573a\u7279\u6548', '\u8c03\u8272': '\u8c03\u8272 LUT', '\u5361\u70b9': '\u5361\u70b9\u89c6\u9891', '\u5b57\u5e55': '\u5b57\u5e55 \u52a8\u753b', '\u7ed3\u6784': '\u77ed\u89c6\u9891\u7ed3\u6784', '\u97f3\u6548': '\u97f3\u6548\u7d20\u6750', '\u8fd0\u955c': '\u8fd0\u955c\u6280\u5de7', '\u5c01\u9762': '\u5c01\u9762\u8bbe\u8ba1', '\u6545\u4e8b': '\u77ed\u89c6\u9891\u6545\u4e8b', '\u5de5\u5177': '\u526a\u6620\u6280\u5de7' })[type] || '\u526a\u8f91';
    res.push({ label: '\ud83c\udfac B\u7ad9\u6559\u7a0b', url: bili(kw) });
    res.push({ label: '\u25b6 YouTube', url: yt('\u526a\u6620 ' + kw) });
    res.push({ label: '\ud83d\udd0d \u641c\u6a21\u7248', url: bing('\u6296\u97f3 ' + kw + ' \u6559\u7a0b') });
  } else if (sec === 'ops') {
    const kw = ({ '\u9009\u54c1': '\u8de8\u5883\u7535\u5546\u9009\u54c1', '\u7ade\u54c1': '\u7ade\u54c1\u5206\u6790', '\u5e73\u53f0': 'TikTok Shop \u8fd0\u8425', 'Listing': '\u4e9a\u9a6c\u900a Listing \u4f18\u5316', '\u5e7f\u544a': '\u5e7f\u544a ACOS \u4f18\u5316', '\u5185\u5bb9': '\u77ed\u89c6\u9891\u5e26\u8d27\u811a\u672c', '\u7528\u6237': '\u7528\u6237\u8bc4\u8bba\u5206\u6790', '\u6570\u636e': '\u7535\u5546\u6570\u636e\u5206\u6790', '\u4f9b\u5e94\u94fe': '\u8de8\u5883\u7535\u5546\u4f9b\u5e94\u94fe', '\u54c1\u724c': '\u8de8\u5883\u54c1\u724c\u6253\u9020' })[type] || '\u8de8\u5883\u8fd0\u8425';
    res.push({ label: '\ud83d\uded2 \u4e9a\u9a6c\u900a\u5356\u5bb6\u4e2d\u5fc3', url: 'https://sellercentral.amazon.com' });
    res.push({ label: '\ud83d\udcfa TikTok Shop \u5b66\u5802', url: 'https://school.uspeedo.com' });
    res.push({ label: '\ud83d\udce7 \u5916\u8d38\u4f8b\u53e5/\u5f00\u53d1\u4fe1\u6a21\u677f', url: bing('\u5916\u8d38\u5f00\u53d1\u4fe1 \u4f8b\u53e5\u6a21\u677f') });
    res.push({ label: '\ud83d\udd0d \u641c\u73a9\u6cd5', url: bing(kw + ' ' + title) });
  } else if (sec === 'memes') {
    res.push({ label: '\ud83d\udd0d \u6296\u97f3\u641c\u540c\u6b3e', url: bing('\u6296\u97f3 ' + title + ' \u7206\u6b3e') });
  }
  return res;
}

function resourcesHTML(sec, t) {
  const res = taskResources(sec, t);
  if (!res.length) return '';
  return '<div class="res"><span class="res-h">\u914d\u5957\u8d44\u6599</span>' + res.map(r => '<a class="res-link" href="' + r.url + '" target="_blank" rel="noopener" data-act="openLink" data-url="' + r.url + '">' + r.label + '</a>').join('') + '</div>';
}

function openTaskDetail(sec, date, id) {
  const t = dailyTasks(sec, date).find(x => x.id === id);
  if (!t) return;
  const done = taskDone(sec, date, id);
  const html = '\n    <button class="btn-ghost" data-act="closeSheet">\u5173\u95ed</button>\n    <div class="detail-head">\n      <span class="t-tag">' + escapeHTML(t.type) + '</span>\n      ' + (t.imported ? '<span class="t-tag imp">\u6765\u81ea\u6296\u97f3</span>' : '') + '\n    </div>\n    <h3 class="detail-title">' + escapeHTML(t.title) + '</h3>\n    <p class="detail-desc">' + escapeHTML(t.desc) + '</p>\n    <div class="detail-meta">' + SVG_ICONS.clock + '\u7ea6 ' + t.duration + ' \u5206\u949f</div>\n    ' + (t.tip ? '<div class="t-tip">' + SVG_ICONS.tip + escapeHTML(t.tip) + '</div>' : '') + '\n    ' + resourcesHTML(sec, t) + '\n    <button class="checkin-btn ' + (done ? 'done' : '') + '" data-act="toggle" data-id="' + t.id + '">' + (done ? '\u2713 \u5df2\u5b8c\u6210' : '\u6807\u8bb0\u5b8c\u6210') + '</button>\n  ';
  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('overlay').classList.add('show');
}

function taskListHTML(sec, date, tasks, checked, streak, cfg, headless) {
  const items = tasks.map(t => {
    const done = taskDone(sec, date, t.id);
    return '\n    <div class="task ' + (done ? 'done' : '') + '" data-task="' + t.id + '">\n      <button class="t-check" data-act="toggle" data-id="' + t.id + '">\u2713</button>\n      <div class="t-body">\n        <span class="t-tag">' + t.type + '</span>\n        <div class="t-title">' + t.title + '</div>\n        <div class="t-desc">' + t.desc + '</div>\n        <div class="t-meta"><span>' + SVG_ICONS.clock + '\u7ea6 ' + t.duration + ' \u5206\u949f</span>' + (t.imported ? '<span>\u6765\u81ea\u6296\u97f3\u89c6\u9891</span>' : '') + '</div>\n        ' + (t.tip ? '<div class="t-tip">' + SVG_ICONS.tip + t.tip + '</div>' : '') + '\n        <div class="t-open">' + SVG_ICONS.chevron + '</div>\n      </div>\n    </div>';
  }).join('');
  return '\n    ' + (headless ? '' : '<div class="sec-head">\n      <h2>' + cfg.icon + ' ' + cfg.name + '</h2>\n      ' + streakHTML(streak) + '\n    </div>') + '\n    <div class="section">' + (items || '<div class="empty"><div class="big">Done</div>\u4eca\u65e5\u4efb\u52a1\u5df2\u5168\u90e8\u5b8c\u6210</div>') + '</div>\n    <div style="padding:0 14px 16px">\n      <button class="checkin-btn ' + (checked ? 'done' : '') + '" data-act="checkin">' + (checked ? '\u2713 \u4eca\u65e5\u5df2\u6253\u5361' : '\u4eca\u65e5\u5b66\u4e60\u4efb\u52a1\u6253\u5361') + '</button>\n    </div>';
}

function englishViewHTML(date, streak, cfg, tasks) {
  const subtab = '\n    <div class="subtabs">\n      <button class="subtab ' + (engModule === 'tasks' ? 'on' : '') + '" data-act="engTasks">\u6bcf\u65e5\u4efb\u52a1</button>\n      <button class="subtab ' + (engModule === 'vocab' ? 'on' : '') + '" data-act="engVocab">\ud83d\udcda \u80cc\u5355\u8bcd</button>\n      <button class="subtab ' + (engModule === 'library' ? 'on' : '') + '" data-act="engLibrary">\ud83d\udcd6 \u9605\u8bfb\u00b7\u64ad\u5ba2</button>\n    </div>';
  let body;
  if (engModule === 'vocab') body = vocabHTML();
  else if (engModule === 'library') body = libraryHTML();
  else body = taskListHTML('english', date, tasks, isChecked('english', date), streak, cfg, true);
  return '\n    <div class="sec-head">\n      <h2>' + cfg.icon + ' ' + cfg.name + '</h2>\n      ' + streakHTML(streak) + '\n    </div>\n    ' + subtab + '\n    ' + body;
}

function currentVocabCat() {
  const cats = DATA.vocab || [];
  return cats.find(c => c.id === vocabState.cat) || cats[0] || { name: '', words: [] };
}
function currentVocabWords() { return currentVocabCat().words; }
function currentVocabWord() {
  const ws = currentVocabWords();
  return ws[Math.min(vocabState.idx, ws.length - 1)] || { w: '', zh: '', ex: '' };
}
function markVocabKnown(catId, w, known) {
  const m = LS.get('dc_vocab_known_' + catId, {});
  m[w] = !!known;
  LS.set('dc_vocab_known_' + catId, m);
}
function vocabHTML() {
  const cats = DATA.vocab || [];
  if (!cats.length) return '<div class="empty"><div class="big">\u7a7a</div>\u6682\u65e0\u8bcd\u5e93</div>';
  const cat = cats.find(c => c.id === vocabState.cat) || cats[0];
  vocabState.cat = cat.id;
  const words = cat.words;
  if (vocabState.idx >= words.length) vocabState.idx = 0;
  const word = words[vocabState.idx];
  const knownMap = LS.get('dc_vocab_known_' + cat.id, {});
  const learned = Object.keys(knownMap).filter(k => knownMap[k]).length;
  const flipped = vocabState.flipped;
  const chips = cats.map(c => '<button class="vchip ' + (c.id === cat.id ? 'on' : '') + '" data-act="vocabCat" data-cat="' + c.id + '">' + (c.icon || '') + ' ' + c.name + '</button>').join('');
  const ph = word.ph ? '<div class="vph">' + escapeHTML(word.ph) + '</div>' : '';
  const ex = word.ex ? '<div class="vex"><span>\u4f8b\u53e5</span>' + escapeHTML(word.ex) + ' <button class="vspeak" data-act="vocabSpeak" data-text="' + escapeHTML(word.ex) + '">' + SVG_ICONS.speaker + '</button></div>' : '';
  const knownBadge = knownMap[word.w] ? '<span class="vknown">\u2713 \u5df2\u638c\u63e1</span>' : '';
  return '\n    <div class="vocab">\n      <div class="vchips">' + chips + '</div>\n      <div class="vprog">\u5df2\u638c\u63e1 <b>' + learned + '</b> / ' + words.length + ' ' + knownBadge + '</div>\n      <div class="vcard ' + (flipped ? 'flipped' : '') + '" data-act="vocabFlip">\n        <div class="vface vfront">\n          <div class="vword">' + escapeHTML(word.w) + ' <button class="vspeak" data-act="vocabSpeak" data-text="' + escapeHTML(word.w) + '">' + SVG_ICONS.speaker + '</button></div>\n          ' + ph + '\n          <div class="vhint">\u8f7b\u70b9\u5361\u7247\u770b\u91ca\u4e49</div>\n        </div>\n        <div class="vface vback">\n          <div class="vzh">' + escapeHTML(word.zh) + '</div>\n          ' + ex + '\n        </div>\n      </div>\n      <div class="vctrls">\n        <button class="vbtn ghost" data-act="vocabPrev">\u4e0a\u4e00\u4e2a</button>\n        <button class="vbtn no" data-act="vocabAnswer" data-known="0">\u4e0d\u8ba4\u8bc6</button>\n        <button class="vbtn yes" data-act="vocabAnswer" data-known="1">\u8ba4\u8bc6</button>\n        <button class="vbtn ghost" data-act="vocabNext">\u4e0b\u4e00\u4e2a</button>\n      </div>\n      <div class="vfoot"><span>\u7b2c ' + (vocabState.idx + 1) + ' / ' + words.length + ' \u8bcd</span></div>\n    </div>';
}

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + week;
}
function weeklyReading() {
  const arr = pick(DATA.readings, 1, 'weekly-' + weekKey());
  return arr[0] || { title: '\u6682\u65e0\u63a8\u8350', source: '', level: '', summary: '', url: '#' };
}
function libraryHTML() {
  const week = weekKey();
  const wr = weeklyReading();
  const wrDone = LS.get('dc_weekly_read_' + week, false);
  const weekCard = '\n    <div class="lib-week ' + (wrDone ? 'done' : '') + '">\n      <div class="lw-head">\n        <span class="lw-badge">\ud83d\udcc5 \u672c\u5468\u9605\u8bfb\u4efb\u52a1 \u00b7 \u8bfb 1 \u7bc7</span>\n        <span class="lw-week">' + week + '</span>\n      </div>\n      <div class="lw-title">' + escapeHTML(wr.title) + '</div>\n      <div class="lw-meta"><span>\ud83d\udcf0 ' + escapeHTML(wr.source || '\u2014') + '</span>' + (wr.level ? '<span class="lw-level">' + escapeHTML(wr.level) + '</span>' : '') + '</div>\n      <div class="lw-sum">' + escapeHTML(wr.summary || '') + '</div>\n      <div class="lw-actions">\n        <a class="res-link" href="' + wr.url + '" target="_blank" rel="noopener" data-act="openLink" data-url="' + wr.url + '">\u53bb\u9605\u8bfb \u2192</a>\n        <button class="mini-btn ' + (wrDone ? 'done' : '') + '" data-act="weeklyRead">' + (wrDone ? '\u2713 \u672c\u5468\u5df2\u8bfb' : '\u6807\u8bb0\u5df2\u8bfb') + '</button>\n      </div>\n    </div>';
  const readList = (DATA.readings || []).map(r => '\n    <div class="fav-item">\n      <div class="fi-title">' + escapeHTML(r.title) + '</div>\n      <div class="fi-tags"><span class="fi-tag">' + escapeHTML(r.source) + '</span><span class="fi-tag">' + escapeHTML(r.level) + '</span></div>\n      <div class="fi-sub">' + escapeHTML(r.summary) + '</div>\n      <a class="res-link" href="' + r.url + '" target="_blank" rel="noopener" data-act="openLink" data-url="' + r.url + '" style="margin-top:8px;display:inline-block">\u9605\u8bfb\u539f\u6587 \u2192</a>\n    </div>').join('');
  const podList = (DATA.podcasts || []).map(p => '\n    <div class="fav-item">\n      <div class="fi-title">' + escapeHTML(p.title) + '</div>\n      <div class="fi-sub">' + escapeHTML(p.desc) + '</div>\n      <a class="res-link" href="' + p.url + '" target="_blank" rel="noopener" data-act="openLink" data-url="' + p.url + '" style="margin-top:8px;display:inline-block">\u6536\u542c \u2192</a>\n    </div>').join('');
  return '\n    <div class="section" style="padding-top:12px">\n      ' + weekCard + '\n      <div class="dy-section-title"><span>\ud83d\udcda \u7cbe\u8bfb\u6587\u7ae0</span><span class="dy-count">' + DATA.readings.length + ' \u7bc7</span></div>\n      <div class="import-list">' + readList + '</div>\n      <div class="dy-section-title"><span>\ud83c\udfa7 \u82f1\u8bed\u64ad\u5ba2</span><span class="dy-count">' + DATA.podcasts.length + ' \u6863</span></div>\n      <div class="import-list">' + podList + '</div>\n    </div>';
}

function memeHTML(sec, date, memes, checked, streak) {
  const cards = memes.map(m => '\n    <div class="meme">\n      <div class="meme-top">\n        <div class="meme-name">' + m.name + '</div>\n        <div class="heat">' + SVG_ICONS.fire + m.heat + '</div>\n      </div>\n      <div class="meme-cat">\u6765\u6e90\uff1a' + m.source + ' \u00b7 \u7c7b\u578b\uff1a' + m.category + '</div>\n      <div class="badges">\n        <span class="badge ' + (m.secondary ? 'yes' : 'no') + '">' + (m.secondary ? '\u53ef\u4e8c\u6b21\u521b\u4f5c' : '\u4e0d\u5b9c\u4e8c\u521b') + '</span>\n        <span class="badge ' + (m.imitate ? 'yes' : 'no') + '">' + (m.imitate ? '\u53ef\u6a21\u4eff\u5f62\u5f0f' : '\u52ff\u6a21\u4eff') + '</span>\n      </div>\n      <p><span class="lab">\u5206\u6790\uff1a</span>' + m.reason + '</p>\n      <div class="copy">' + SVG_ICONS.warn + '\u7248\u6743\u63d0\u9192\uff1a' + m.copyright + '</div>\n      <div class="act">' + SVG_ICONS.target + '\u53ef\u8bd5\uff1a<br>' + m.action + '</div>\n      ' + resourcesHTML('memes', m) + '\n    </div>').join('');
  return '\n    <div class="sec-head">\n      <h2>' + SVG_ICONS.fire + ' \u6296\u97f3\u70ed\u6897\u5206\u6790</h2>\n      ' + streakHTML(streak) + '\n    </div>\n    <div class="section">\n      <div class="empty" style="padding:6px 4px 14px">\u6bcf\u65e5\u62bd\u53d6 ' + memes.length + ' \u4e2a\u70ed\u6897 \u00b7 \u770b\u54ea\u4e9b\u80fd\u4e8c\u521b\u3001\u54ea\u4e9b\u80fd\u6a21\u4eff</div>\n      ' + cards + '\n    </div>\n    <div style="padding:0 14px 16px">\n      <button class="checkin-btn ' + (checked ? 'done' : '') + '" data-act="checkin">' + (checked ? '\u2713 \u4eca\u65e5\u70ed\u6897\u5df2\u5b66' : '\u4eca\u65e5\u70ed\u6897\u5b66\u4e60\u6253\u5361') + '</button>\n    </div>';
}

function openImport() {
  const imports = LS.get(keyImports(), []);
  const listHTML = imports.length ? imports.map(r => '\n    <div class="import-item">\n      <div class="ii-top"><span class="ii-title">' + escapeHTML(r.title) + '</span><span class="ii-sec">' + r.labels.join(' / ') + '</span></div>\n      <div class="ii-sub">' + r.date + ' \u6dfb\u52a0</div>\n      <div class="ii-tasks">\u2192 \u5df2\u5206\u53d1\uff1a' + r.taskTitles.join('\uff1b') + '</div>\n    </div>').join('') : '<div class="empty"><div class="big">+</div>\u8fd8\u6ca1\u6709\u6dfb\u52a0\u770b\u8fc7\u7684\u89c6\u9891<br>\u6dfb\u52a0\u540e App \u4f1a\u6309\u5185\u5bb9\u7ed9\u4f60\u5206\u53d1\u5b66\u4e60\u4efb\u52a1</div>';
  document.getElementById('sheetBody').innerHTML = '\n    <h3>' + SVG_ICONS.download + ' \u5bfc\u5165\u6211\u770b\u8fc7\u7684\u6296\u97f3\u89c6\u9891</h3>\n    <div class="sub">\u7c98\u8d34\u89c6\u9891\u6807\u9898 / \u94fe\u63a5 / \u6807\u7b7e\uff0cApp \u4f1a\u5224\u65ad\u5185\u5bb9\u65b9\u5411\u5e76\u5206\u53d1\u5bf9\u5e94\u5b66\u4e60\u4efb\u52a1\u5230\u5bf9\u5e94\u677f\u5757\u3002</div>\n    <div class="field">\n      <label>\u89c6\u9891\u6807\u9898 / \u63cf\u8ff0</label>\n      <input id="impTitle" placeholder="\u4f8b\u5982\uff1a\u8de8\u5883\u4e9a\u9a6c\u900a\u9009\u54c1 + \u526a\u6620\u5361\u70b9\u6559\u7a0b" />\n    </div>\n    <div class="field">\n      <label>\u6807\u7b7e\uff08\u53ef\u9009\uff0c\u7528\u7a7a\u683c\u5206\u9694\uff09</label>\n      <input id="impTags" placeholder="\u4f8b\u5982\uff1a\u82f1\u8bed \u526a\u8f91 \u8fd0\u8425 \u70ed\u6897" />\n    </div>\n    <div class="row">\n      <button class="btn-ghost" data-act="closeSheet">\u53d6\u6d88</button>\n      <button class="btn-primary" data-act="doImport">\u5206\u6790\u5e76\u5206\u53d1\u4efb\u52a1</button>\n    </div>\n    <div style="margin-top:16px;font-size:13px;font-weight:800;color:var(--text-dim)">\u5df2\u6dfb\u52a0\uff08' + imports.length + '\uff09</div>\n    <div class="import-list">' + listHTML + '</div>\n    <p style="font-size:11px;color:var(--text-dim);margin-top:10px">\u8bf4\u660e\uff1a\u5f53\u524d\u4e3a\u624b\u52a8\u5bfc\u5165\u3002\u65e5\u540e\u63a5\u5165\u6296\u97f3\u5f00\u653e\u63a5\u53e3\u5373\u53ef\u81ea\u52a8\u8bfb\u53d6\u89c2\u770b\u8bb0\u5f55\u3002</p>\n  ';
  document.getElementById('overlay').classList.add('show');
}
function doImport() {
  const title = (document.getElementById('impTitle').value || '').trim();
  const tags = (document.getElementById('impTags').value || '').trim();
  if (!title && !tags) { toast('\u5148\u586b\u70b9\u5185\u5bb9\u5427'); return; }
  const text = title + ' ' + tags;
  const hits = matchSections(text);
  const date = todayStr();
  const taskTitles = [];
  const labels = [];
  if (hits.length === 0) {
    const sec = 'ops';
    const tks = genImportTasks(sec, title || tags, date);
    addImportTasks(sec, tks, date);
    taskTitles.push(...tks.map(t => t.title));
    labels.push('\u8fd0\u8425(\u9ed8\u8ba4)');
  } else {
    hits.forEach(km => {
      const tks = genImportTasks(km.section, title || tags, date);
      addImportTasks(km.section, tks, date);
      taskTitles.push(...tks.map(t => t.title));
      labels.push(km.label);
    });
  }
  const rec = { id: Date.now(), title: title || tags, labels, taskTitles, date };
  const imports = LS.get(keyImports(), []);
  imports.unshift(rec);
  LS.set(keyImports(), imports);
  toast('\u5df2\u5206\u53d1 ' + taskTitles.length + ' \u4e2a\u5b66\u4e60\u4efb\u52a1');
  openImport();
  render();
}
function addImportTasks(sec, tasks, date) {
  const arr = LS.get(keyImportTasks(date, sec), []);
  arr.push(...tasks);
  LS.set(keyImportTasks(date, sec), arr);
}

let hotList = [];
let hotLoaded = false;
function getHotDist() { return LS.get('dc_hot_dist_v1', []); }
function setHotDist(v) { LS.set('dc_hot_dist_v1', v); }
function distributeOne(f) {
  const hits = matchSections(f.title + ' ' + (f.tags || ''));
  let secs = hits.map(h => h.section).filter(se => se !== 'memes');
  if (secs.length === 0) secs = ['ops'];
  const date = todayStr();
  secs.forEach(sec => addImportTasks(sec, genImportTasks(sec, f.title, date), date));
}
function openHot() {
  document.getElementById('sheetBody').innerHTML = renderHotShell();
  document.getElementById('overlay').classList.add('show');
  loadHot();
}
function renderHotShell() {
  return '\n    <h3>' + SVG_ICONS.fire + ' \u6296\u97f3\u70ed\u95e8\u5b66\u4e60\u89c6\u9891</h3>\n    <div class="sub">\u514d\u767b\u5f55 \u00b7 \u5b9e\u65f6\u70ed\u699c\u4e2d\u4e0e\u5b66\u4e60\u76f8\u5173\u7684\u8bdd\u9898 + \u7cbe\u9009\u5b66\u4e60\u4e3b\u9898\u3002\u70b9\u300c\u5728\u6296\u97f3\u770b\u300d\u770b\u771f\u5b9e\u89c6\u9891\uff0c\u70b9\u300c\u5206\u53d1\u4efb\u52a1\u300d\u53d8\u6210\u4eca\u65e5\u7ec3\u4e60\u3002</div>\n    <div class="dy-section-title"><span>\u70ed\u95e8\u5b66\u4e60\u89c6\u9891</span><span class="dy-count" id="hotCount"></span></div>\n    <div id="hotList" class="import-list"><div class="empty"><div class="big">\u2026</div>\u6b63\u5728\u52a0\u8f7d\u70ed\u95e8\u5b66\u4e60\u89c6\u9891</div></div>\n    <button class="dy-connect" data-act="refreshHot" style="margin-top:14px">\u5237\u65b0\u70ed\u95e8</button>\n    <p class="dy-note">\u6296\u97f3\u4e0d\u63d0\u4f9b\u514d\u767b\u5f55\u7684\u89c6\u9891\u5217\u8868\u63a5\u53e3\uff1b\u8fd9\u91cc\u7528\u516c\u5f00\u7684\u6296\u97f3\u70ed\u699c\u8fc7\u6ee4\u51fa\u5b66\u4e60\u76f8\u5173\u8bdd\u9898\uff0c\u5e76\u8865\u5145\u7cbe\u9009\u5b66\u4e60\u4e3b\u9898\u3002\u70b9\u5f00\u5373\u5728\u6296\u97f3\u770b\u771f\u5b9e\u89c6\u9891\u3002</p>';
}
function loadHot() {
  const paint = (items) => {
    hotList = items;
    const dist = new Set(getHotDist());
    const box = document.getElementById('hotList');
    if (box) box.innerHTML = items.length ? items.map(it => hotItemHTML(it, dist.has(it.id))).join('') : '<div class="empty"><div class="big">\u7a7a</div>\u6682\u65f6\u6ca1\u6709\u70ed\u95e8\u5b66\u4e60\u89c6\u9891</div>';
    const c = document.getElementById('hotCount');
    if (c) c.textContent = items.length + ' \u6761';
  };
  if (location.protocol === 'file:') { paint(DATA.douyinHot); return; }
  fetch('/api/douyin/hot')
    .then(r => r.json())
    .then(j => {
      const live = (j && j.items) || [];
      paint(live.concat(DATA.douyinHot));
    })
    .catch(() => paint(DATA.douyinHot));
}
function hotItemHTML(it, distributed) {
  const sec = SECTIONS[it.category] || SECTIONS.ops;
  const url = 'https://www.douyin.com/search/' + encodeURIComponent(it.title);
  return '\n    <div class="fav-item">\n      <div class="fi-top">\n        <div>\n          <div class="fi-title">' + escapeHTML(it.title) + '</div>\n          <div class="fi-tags">\n            <span class="fi-tag" style="background:var(--' + sec.color + ')22;color:var(--' + sec.color + ')">' + sec.name + '</span>\n            <span class="fi-tag">' + SVG_ICONS.fire + it.heat + '</span>\n          </div>\n          <div class="fi-sub">' + escapeHTML(it.why || '') + '</div>\n        </div>\n        <button class="fi-btn ' + (distributed ? 'done' : '') + '" data-act="distHot" data-id="' + it.id + '">' + (distributed ? '\u5df2\u5206\u53d1' : '\u5206\u53d1\u4efb\u52a1') + '</button>\n      </div>\n      <a class="res-link" href="' + url + '" target="_blank" rel="noopener" style="margin-top:8px;display:inline-block">\u5728\u6296\u97f3\u770b\u771f\u5b9e\u89c6\u9891</a>\n    </div>';
}
function distHot(id) {
  const it = hotList.find(x => x.id === id);
  if (!it) return;
  distributeOne({ title: it.title, tags: it.tags });
  const d = getHotDist(); if (!d.includes(id)) d.push(id); setHotDist(d);
  toast('\u5df2\u5206\u53d1\uff1a' + it.title.slice(0, 10));
  openHot(); render();
}

function escapeHTML(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function speak(text) {
  if (!text) return;

  // 策略1: 先尝试 Web Speech API
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    // 检测是否有可用语音
    const voices = window.speechSynthesis.getVoices();
    const hasEnglish = voices.some(v => v.lang.startsWith('en'));
    if (hasEnglish || voices.length === 0) {
      // voices.length===0 表示异步加载中，也先尝试
      u.onerror = function() {
        // Web Speech 失败，用在线 TTS 兜底
        speakOnline(text);
      };
      window.speechSynthesis.speak(u);
      return;
    }
  }

  // 策略2: Web Speech 不可用时，使用在线 TTS
  speakOnline(text);
}

// 在线 TTS：使用 Google TTS 免费接口
var _ttsAudio = null;
function speakOnline(text) {
  // 停止之前的播放
  if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(text);
  var a = new Audio(url);
  a.play().catch(function() {
    toast('语音播放失败，请检查网络');
  });
  _ttsAudio = a;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1800);
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) { current = tab.dataset.s; render(); return; }
  const qtab = e.target.closest('.qtab');
  if (qtab) { current = qtab.dataset.s; render(); return; }
  const hImport = e.target.closest('[data-act="openImport"]');
  if (hImport) { openImport(); return; }
  const hHot = e.target.closest('[data-act="openHot"]');
  if (hHot) { openHot(); return; }
  const refresh = e.target.closest('[data-act="refreshHot"]');
  if (refresh) { loadHot(); toast('\u5df2\u5237\u65b0'); return; }
  const refreshAll = e.target.closest('[data-act="refreshAll"]');
  if (refreshAll) {
    refreshAll.classList.add('spin');
    setTimeout(() => refreshAll.classList.remove('spin'), 600);
    refreshContent('\u5df2\u5237\u65b0\u4eca\u65e5\u5185\u5bb9 \ud83d\udd04');
    return;
  }
  const dist = e.target.closest('[data-act="distHot"]');
  if (dist) { distHot(dist.dataset.id); return; }
  const engT = e.target.closest('[data-act="engTasks"]');
  if (engT) { engModule = 'tasks'; LS.set('dc_eng_module', 'tasks'); render(); return; }
  const engV = e.target.closest('[data-act="engVocab"]');
  if (engV) { engModule = 'vocab'; LS.set('dc_eng_module', 'vocab'); render(); return; }
  const engL = e.target.closest('[data-act="engLibrary"]');
  if (engL) { engModule = 'library'; LS.set('dc_eng_module', 'library'); render(); return; }
  const wread = e.target.closest('[data-act="weeklyRead"]');
  if (wread) { LS.set('dc_weekly_read_' + weekKey(), true); toast('\u5df2\u6807\u8bb0\u672c\u5468\u9605\u8bfb\u5b8c\u6210 \ud83d\udcd6'); render(); return; }
  const lnk = e.target.closest('[data-act="openLink"]');
  if (lnk) { e.preventDefault(); window.open(lnk.dataset.url, '_blank'); return; }
  const vcat = e.target.closest('[data-act="vocabCat"]');
  if (vcat) { vocabState.cat = vcat.dataset.cat; vocabState.idx = 0; vocabState.flipped = false; render(); return; }
  const vspeak = e.target.closest('[data-act="vocabSpeak"]');
  if (vspeak) { speak(vspeak.dataset.text); return; }
  const vflip = e.target.closest('[data-act="vocabFlip"]');
  if (vflip) { vocabState.flipped = !vocabState.flipped; render(); return; }
  const vprev = e.target.closest('[data-act="vocabPrev"]');
  if (vprev) { const n = currentVocabWords().length; vocabState.idx = (vocabState.idx - 1 + n) % n; vocabState.flipped = false; render(); return; }
  const vnext = e.target.closest('[data-act="vocabNext"]');
  if (vnext) { const n = currentVocabWords().length; vocabState.idx = (vocabState.idx + 1) % n; vocabState.flipped = false; render(); return; }
  const vans = e.target.closest('[data-act="vocabAnswer"]');
  if (vans) {
    const known = vans.dataset.known === '1';
    const w = currentVocabWord();
    markVocabKnown(vocabState.cat, w.w, known);
    const n = currentVocabWords().length;
    vocabState.idx = (vocabState.idx + 1) % n;
    vocabState.flipped = false;
    render();
    toast(known ? '\u5df2\u6807\u8bb0\u4e3a\u8ba4\u8bc6 \ud83d\udc4d' : '\u5df2\u52a0\u5165\u590d\u4e60');
    return;
  }
  const close = e.target.closest('[data-act="closeSheet"]');
  if (close) { document.getElementById('overlay').classList.remove('show'); return; }
  const doIm = e.target.closest('[data-act="doImport"]');
  if (doIm) { doImport(); return; }
  const chk = e.target.closest('[data-act="toggle"]');
  if (chk) {
    const sec = current, date = todayStr();
    const on = toggleTask(sec, date, chk.dataset.id);
    const inTask = chk.closest('.task');
    if (inTask) inTask.classList.toggle('done', on);
    else { chk.classList.toggle('done', on); chk.textContent = on ? '\u2713 \u5df2\u5b8c\u6210' : '\u6807\u8bb0\u5b8c\u6210'; }
    render();
    return;
  }
  const taskEl = e.target.closest('.task');
  if (taskEl) {
    if (e.target.closest('.t-check') || e.target.closest('a')) return;
    openTaskDetail(current, todayStr(), taskEl.dataset.task);
    return;
  }
  const ci = e.target.closest('[data-act="checkin"]');
  if (ci) {
    const sec = current, date = todayStr();
    if (isChecked(sec, date)) { toast('\u4eca\u5929\u5df2\u7ecf\u6253\u8fc7\u5361\u5566'); return; }
    checkIn(sec, date);
    ci.classList.add('done');
    ci.textContent = sec === 'memes' ? '\u2713 \u4eca\u65e5\u70ed\u6897\u5df2\u5b66' : '\u2713 \u4eca\u65e5\u5df2\u6253\u5361';
    if (todayCheckedCount(date) === 4) toast('\u4eca\u65e5\u5168\u52e4\uff01\u56db\u677f\u5757\u5168\u6253\u5361');
    else toast('\u6253\u5361\u6210\u529f\uff0c\u7ee7\u7eed\u4fdd\u6301');
    render();
    return;
  }
});
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target.id === 'overlay') e.target.classList.remove('show');
});

window.addEventListener('online', dailyRefreshIfNeeded);
if (navigator.connection && navigator.connection.addEventListener) {
  navigator.connection.addEventListener('change', function () {
    if (navigator.onLine) dailyRefreshIfNeeded();
  });
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) dailyRefreshIfNeeded();
});
dailyRefreshIfNeeded();
render();
