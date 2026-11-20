'use strict';
/* =========================================================
   Fraktionsakte Generator (FiveM / LSPD)
   Reines Frontend, kein Build, keine Server-Komponente.
   ========================================================= */

const KEY = 'fraktionsakte_v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd (lokal)
const fmtDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('.') : (s || '');

/* ---------- Auswahllisten ---------- */
const TYPEN = ['Straßengang', 'Motorradclub', 'Kartell', 'Mafia', 'Sonstige'];
const STATI = ['Aktiv', 'Beobachtet', 'Inaktiv', 'Aufgelöst'];
const GEFAHR = [
  ['Gering', 'Keine Gewaltdelikte bekannt'],
  ['Erhöht', 'Vereinzelte Straftaten, kaum bewaffnet'],
  ['Mittel', 'Regelmäßige Straftaten, bewaffnet'],
  ['Hoch', 'Gewaltdelikte, Schusswaffengebrauch'],
  ['Kritisch', 'Mord, Geiselnahme oder Angriffe auf Beamte'],
];
const GCOL = ['#2e9e5b', '#8fae25', '#e0932b', '#d4552a', '#a3141c'];
const MSTATUS = ['Aktiv', 'Inhaftiert', 'Untergetaucht', 'Verstorben', 'Unbekannt'];
const VERH = ['Verbündet', 'Neutral', 'Rivalen', 'Feindlich', 'Unbekannt'];
const VCOL = { Verbündet: '#2e9e5b', Neutral: '#6b7686', Rivalen: '#e0932b', Feindlich: '#a3141c', Unbekannt: '#8a8f99' };
const ZUV = ['Hoch', 'Mittel', 'Niedrig', 'Ungeprüft'];
const ZCOL = { Hoch: '#2e9e5b', Mittel: '#e0932b', Niedrig: '#a3141c', Ungeprüft: '#8a8f99' };

/* Neutrales Platzhalter-Wappen (eigenes Logo wird im Editor hochgeladen) */
const PLACEHOLDER_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">' +
  '<path d="M50 4 L92 18 V58 C92 86 72 106 50 116 C28 106 8 86 8 58 V18 Z" fill="#0a1f44" stroke="#b8923a" stroke-width="5"/>' +
  '<path d="M50 28 l7.4 15.6 17 2.2 -12.5 11.8 3.2 16.9 L50 66.8 34.9 74.5 l3.2-16.9 L25.6 45.8l17-2.2z" fill="#b8923a"/>' +
  '</svg>');

/* ---------- Zustand ---------- */
function blank() {
  return {
    dept: 'Los Santos Police Department',
    logo: null,
    auto: true,
    hideRealNames: true,
    showEmptyRanks: false,
    head: { name: '', alias: '', typ: 'Straßengang', status: 'Aktiv', gefahr: 3, seit: '', angelegt: today(), aktualisiert: today() },
    erkennung: {
      farben: { t: '', img: [] }, kleidung: { t: '', img: [] },
      fahrzeug: { t: '', img: [] }, revier: { t: '', img: [] },
    },
    mitglieder: Array.from({ length: 12 }, (_, i) => ({ rang: `${12 - i}er`, name: '', status: '', telefon: '', haft: 'Nein', haftDoc: '', bem: '', foto: null })),
    anwesen: [{ karte: null, ort: '', bilder: [] }],
    fahrzeuge: [{ kz: '', modell: '', halter: '', bem: '' }, { kz: '', modell: '', halter: '', bem: '' }, { kz: '', modell: '', halter: '', bem: '' }],
    waffen: { lang: false, smg: false, pistolen: false },
    beziehungen: [{ fraktion: '', verh: 'Neutral', bem: '' }],
    straftaten: [{ datum: '', doc: '' }],
    informanten: [{ code: '', echt: '', stellung: '', zuv: 'Ungeprüft', fuehrer: '', seit: '' }],
  };
}
let S = load() || blank();
let defaultLogo = window.DEFAULT_LOGO || null;

function load() {
  try { const r = localStorage.getItem(KEY); return r ? Object.assign(blank(), JSON.parse(r)) : null; } catch { return null; }
}
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch { toast('Browser-Speicher voll – bitte „JSON speichern“ nutzen.'); }
  }, 300);
}
const get = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
function set(p, v) {
  const ks = p.split('.'); let o = S;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
}
function touch() {
  if (S.auto) {
    S.head.aktualisiert = today();
    const el = $('[data-p="head.aktualisiert"]'); if (el) el.value = S.head.aktualisiert;
  }
  save();
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------- Formular-Bausteine ---------- */
const F = {
  text: (l, p, ph = '') => `<label class="f"><span>${l}</span><input data-p="${p}" value="${esc(get(p))}" placeholder="${esc(ph)}"></label>`,
  date: (l, p) => `<label class="f"><span>${l}</span><input type="date" data-p="${p}" value="${esc(get(p))}"></label>`,
  area: (l, p, ph = '') => `<label class="f"><span>${l}</span><textarea data-p="${p}" placeholder="${esc(ph)}">${esc(get(p))}</textarea></label>`,
  sel: (l, p, list, blankOpt = false, num = false) => {
    const cur = String(get(p) ?? '');
    const os = (blankOpt ? [['', '—']] : []).concat(list.map(x => (Array.isArray(x) ? x : [x, x])));
    return `<label class="f"><span>${l}</span><select data-p="${p}" ${num ? 'data-num="1"' : ''}>${os.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === cur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  },
  chk: (l, p) => `<label class="chk"><input type="checkbox" data-p="${p}" ${get(p) ? 'checked' : ''}> ${l}</label>`,
  img: (l, p, multi = false) => {
    const v = get(p); const arr = multi ? (v || []) : (v ? [v] : []);
    return `<div class="f imgf" tabindex="0" data-imgf="${p}" data-multi="${multi ? 1 : ''}">
      <span>${l} <small>– Datei wählen oder Feld anklicken &amp; Strg+V</small></span>
      <div class="thumbs">${arr.map((s, i) => `<div class="th"><img src="${s}"><button type="button" data-act="imgdel" data-p="${p}" data-i="${i}">×</button></div>`).join('')}</div>
      <input type="file" accept="image/*" ${multi ? 'multiple' : ''} data-img="${p}" data-multi="${multi ? 1 : ''}">
    </div>`;
  },
};
const det = (id, title, body) => `<details data-sec="${id}"><summary>${title}</summary><div class="body">${body}</div></details>`;
const addBtn = (list, txt) => `<button type="button" class="add" data-act="add" data-list="${list}">+ ${txt}</button>`;
const delBtn = (list, i) => `<button type="button" class="x" data-act="del" data-list="${list}" data-i="${i}" title="Eintrag löschen">×</button>`;

function formHTML() {
  const er = [['farben', 'Farben'], ['kleidung', 'Kleidung'], ['fahrzeug', 'Fraktionsfahrzeug'], ['revier', 'Revier / Gebiet (Straßen, Stadtteil, Kartenausschnitt)']];
  return [
    det('kopf', 'Aktenkopf',
      `<div class="g2">${F.text('Fraktionsname', 'head.name')}${F.text('Kürzel / Alias', 'head.alias')}
       ${F.sel('Typ', 'head.typ', TYPEN)}${F.sel('Status', 'head.status', STATI)}
       ${F.sel('Gefahrenstufe', 'head.gefahr', GEFAHR.map((g, i) => [i + 1, `${i + 1} – ${g[0]}`]), false, true)}${F.text('Gegründet / bekannt seit', 'head.seit')}
       ${F.date('Angelegt am', 'head.angelegt')}${F.date('Zuletzt aktualisiert', 'head.aktualisiert')}</div>
       <p class="hint">„Zuletzt aktualisiert“ setzt sich bei jeder Änderung automatisch auf heute, bis du das Feld selbst änderst.</p>`),
    det('einst', 'Einstellungen / Logo',
      `${F.text('Behörde (Kopfzeile)', 'dept')}
       ${F.img('Logo (PNG mit transparentem Hintergrund empfohlen)', 'logo')}
       ${F.chk('Echte Namen der Informanten im Export schwärzen', 'hideRealNames')}
       ${F.chk('Leere Ränge im Export anzeigen', 'showEmptyRanks')}`),
    det('erk', 'Erkennungsmerkmale',
      er.map(([k, l]) => `<div class="card"><h4>${l}</h4>${F.area('Beschreibung', `erkennung.${k}.t`)}${F.img('Bilder', `erkennung.${k}.img`, true)}</div>`).join('')),
    det('mit', 'Mitglieder',
      S.mitglieder.map((m, i) => `<div class="card"><h4>${esc(m.rang)} ${m.name ? '– ' + esc(m.name) : ''}</h4>
        <div class="g3">${F.text('Rang', `mitglieder.${i}.rang`)}${F.text('Name', `mitglieder.${i}.name`)}${F.sel('Status', `mitglieder.${i}.status`, MSTATUS, true)}</div>
        <div class="g3">${F.text('Telefon', `mitglieder.${i}.telefon`)}${F.sel('Haftbefehl', `mitglieder.${i}.haft`, ['Nein', 'Ja'])}${F.text('DOC-Nr.', `mitglieder.${i}.haftDoc`, 'DOC - XY')}</div>
        ${F.text('Bemerkung', `mitglieder.${i}.bem`)}${F.img('Foto', `mitglieder.${i}.foto`)}</div>`).join('')),
    det('anw', 'Anwesen',
      S.anwesen.map((a, i) => `<div class="card">${delBtn('anwesen', i)}<h4>Anwesen ${i + 1}</h4>${F.text('Ort / PLZ', `anwesen.${i}.ort`)}${F.img('Kartenausschnitt', `anwesen.${i}.karte`)}${F.img('Bilder', `anwesen.${i}.bilder`, true)}</div>`).join('') + addBtn('anwesen', 'Anwesen hinzufügen')),
    det('fzg', 'Fraktionsfahrzeuge',
      S.fahrzeuge.map((f, i) => `<div class="card">${delBtn('fahrzeuge', i)}<div class="g2">${F.text('Kennzeichen', `fahrzeuge.${i}.kz`)}${F.text('Modell', `fahrzeuge.${i}.modell`)}${F.text('Halter', `fahrzeuge.${i}.halter`)}${F.text('Bemerkung', `fahrzeuge.${i}.bem`)}</div></div>`).join('') + addBtn('fahrzeuge', 'Fahrzeug hinzufügen')),
    det('waf', 'Bewaffnung', F.chk('Langwaffen', 'waffen.lang') + F.chk('SMGs', 'waffen.smg') + F.chk('Pistolen', 'waffen.pistolen')),
    det('bez', 'Beziehungen zu anderen Fraktionen',
      S.beziehungen.map((b, i) => `<div class="card">${delBtn('beziehungen', i)}<div class="g2">${F.text('Fraktion', `beziehungen.${i}.fraktion`)}${F.sel('Verhältnis', `beziehungen.${i}.verh`, VERH)}</div>${F.text('Bemerkung', `beziehungen.${i}.bem`)}</div>`).join('') + addBtn('beziehungen', 'Beziehung hinzufügen')),
    det('str', 'Straftaten',
      S.straftaten.map((s, i) => `<div class="card">${delBtn('straftaten', i)}<div class="g2">${F.date('Datum', `straftaten.${i}.datum`)}${F.text('DOC-Nummer', `straftaten.${i}.doc`)}</div></div>`).join('') + addBtn('straftaten', 'Straftat hinzufügen') + '<p class="hint">Im Export werden die neuesten Einträge automatisch oben einsortiert.</p>'),
    det('inf', 'Informanten',
      '<p class="hint">Nur Codenamen verwenden. Echte Namen werden im Export standardmäßig geschwärzt.</p>' +
      S.informanten.map((n, i) => `<div class="card">${delBtn('informanten', i)}<div class="g2">${F.text('Spitz / Codename', `informanten.${i}.code`)}${F.text('Echter Name', `informanten.${i}.echt`)}${F.text('Stellung in der Fraktion', `informanten.${i}.stellung`, 'z. B. 5er')}${F.sel('Zuverlässigkeit', `informanten.${i}.zuv`, ZUV)}${F.text('Geführt von', `informanten.${i}.fuehrer`)}${F.date('Seit', `informanten.${i}.seit`)}</div></div>`).join('') + addBtn('informanten', 'Informant hinzufügen')),
  ].join('');
}

let openSecs = new Set(['kopf', 'einst']);
function renderForm() {
  const ed = $('#editor');
  const st = ed.scrollTop;
  if (ed.children.length) openSecs = new Set([...ed.querySelectorAll('details[open]')].map(d => d.dataset.sec));
  ed.innerHTML = formHTML();
  ed.querySelectorAll('details').forEach(d => { if (openSecs.has(d.dataset.sec)) d.open = true; });
  ed.scrollTop = st;
}

/* ---------- Bilder ---------- */
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function shrink(file, max, alpha) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url);
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    const x = c.getContext('2d');
    if (!alpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
    x.drawImage(im, 0, 0, c.width, c.height);
    return alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
async function addImages(p, multi, files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  for (const f of list) {
    try {
      const d = await shrink(f, p === 'logo' ? 500 : 1100, p === 'logo');
      if (multi) { if (!Array.isArray(get(p))) set(p, []); get(p).push(d); } else set(p, d);
    } catch { toast('Bild konnte nicht gelesen werden.'); }
  }
  touch(); renderForm(); renderPreview();
}
let lastImgF = null;

/* ---------- Editor-Events ---------- */
const ed = $('#editor');
let prevT;
const schedulePreview = () => { clearTimeout(prevT); prevT = setTimeout(renderPreview, 120); };

ed.addEventListener('input', e => {
  const t = e.target; const p = t.dataset.p; if (!p) return;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.num) v = Number(v);
  if (p === 'head.aktualisiert') S.auto = false;
  set(p, v);
  touch(); schedulePreview();
});
ed.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.img) { addImages(t.dataset.img, !!t.dataset.multi, t.files); t.value = ''; }
});
ed.addEventListener('click', e => {
  const f = e.target.closest('.imgf'); if (f) { lastImgF = f; document.querySelectorAll('.imgf.paste').forEach(x => x.classList.remove('paste')); f.classList.add('paste'); }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, list, p } = b.dataset; const i = Number(b.dataset.i);
  if (act === 'add') {
    const tpl = {
      anwesen: { karte: null, ort: '', bilder: [] }, fahrzeuge: { kz: '', modell: '', halter: '', bem: '' },
      beziehungen: { fraktion: '', verh: 'Neutral', bem: '' }, straftaten: { datum: '', doc: '' },
      informanten: { code: '', echt: '', stellung: '', zuv: 'Ungeprüft', fuehrer: '', seit: '' },
    }[list];
    S[list].push(tpl);
  } else if (act === 'del') {
    S[list].splice(i, 1);
  } else if (act === 'imgdel') {
    const v = get(p); if (Array.isArray(v)) v.splice(i, 1); else set(p, null);
  }
  touch(); renderForm(); renderPreview();
});
document.addEventListener('paste', e => {
  if (!lastImgF || !document.contains(lastImgF)) return;
  if (!lastImgF.contains(document.activeElement) && document.activeElement !== lastImgF) return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.some(f => f.type.startsWith('image/'))) return;
  e.preventDefault();
  addImages(lastImgF.dataset.imgf, !!lastImgF.dataset.multi, files);
});

/* ---------- Dokument (Vorschau + Export) ---------- */
const logoSrc = () => S.logo || defaultLogo || PLACEHOLDER_LOGO;
const imgs = arr => (arr && arr.length ? `<div class="ig">${arr.map(s => `<img src="${s}">`).join('')}</div>` : '');
const row = (cols, cells, cls = '') => `<div class="row ${cls}" style="grid-template-columns:${cols}">${cells.map(c => `<div class="c">${c}</div>`).join('')}</div>`;
const dash = v => (v ? esc(v) : '<span class="dim">—</span>');
function section(title, cols, heads, rows, note = '') {
  const body = rows.length ? rows : ['<div class="row empty">Keine Einträge vorhanden</div>'];
  const hdr = heads ? row(cols, heads, 'rh') : '';
  return body.map((r, i) => i === 0
    ? `<div class="unit first"><h3>${title}</h3>${note ? `<div class="note">${note}</div>` : ''}${hdr}${r}</div>`
    : `<div class="unit" data-title="${esc(title)}" data-hdr="${esc(hdr)}">${r}</div>`);
}

function buildDoc() {
  const h = S.head; const name = h.name || 'Unbenannte Fraktion';
  const g = Number(h.gefahr) || 0;
  const U = [];

  /* Kopf */
  const badge = g >= 1 && g <= 5 ? `<span class="badge" style="background:${GCOL[g - 1]}">Stufe ${g} – ${GEFAHR[g - 1][0]}</span>` : '—';
  const kv = (l, v, raw) => `<div class="k">${l}</div><div class="v">${raw ? v : dash(v)}</div>`;
  U.push(`<div class="unit head">
    <div class="hd">
      <div class="logo"><img src="${logoSrc()}"></div>
      <div class="hdt"><div class="dept">${esc(S.dept)}</div><h1>Fraktionsakte</h1><div class="sub">Gangverzeichnis</div></div>
      <div class="stamp">Vertraulich<small>Nur für den Dienstgebrauch</small></div>
    </div>
    <div class="bar"></div>
    <div class="title">${esc(name)}${h.alias ? ` <span>„${esc(h.alias)}“</span>` : ''}</div>
    <div class="kv">
      ${kv('Fraktionsname', h.name)}${kv('Kürzel / Alias', h.alias)}
      ${kv('Typ', h.typ)}${kv('Status', h.status)}
      ${kv('Gefahrenstufe', badge, true)}${kv('Gegründet / bekannt seit', h.seit)}
      ${kv('Angelegt am', fmtDate(h.angelegt))}${kv('Zuletzt aktualisiert', fmtDate(h.aktualisiert))}
    </div>
    <div class="leg">${GEFAHR.map((x, i) => `<div class="lg ${g === i + 1 ? 'on' : ''}" style="--c:${GCOL[i]}"><b>${i + 1} – ${x[0]}</b>${x[1]}</div>`).join('')}</div>
  </div>`);

  /* Erkennungsmerkmale */
  const E = S.erkennung;
  U.push(...section('Erkennungsmerkmale', '', null,
    [['Farben', E.farben], ['Kleidung', E.kleidung], ['Fraktionsfahrzeug', E.fahrzeug], ['Revier / Gebiet', E.revier]]
      .map(([l, o]) => row('150px 1fr', [l, (o.t ? esc(o.t).replace(/\n/g, '<br>') : (o.img.length ? '' : '<span class="dim">—</span>')) + imgs(o.img)], 'kvr')),
    'Woran Einsatzkräfte Mitglieder auf der Straße erkennen.'));

  /* Mitglieder */
  const mc = '64px 58px 1.2fr 0.9fr 0.9fr 1fr 1.3fr';
  const mrows = S.mitglieder
    .filter(m => S.showEmptyRanks || m.name || m.status || m.telefon || m.bem || m.foto || m.haft === 'Ja')
    .map(m => row(mc, [
      m.foto ? `<img class="mf" src="${m.foto}">` : '<div class="mf none">kein Foto</div>',
      `<b>${esc(m.rang)}</b>`, dash(m.name), dash(m.status), dash(m.telefon),
      m.haft === 'Ja' ? `<span class="red">Ja</span>${m.haftDoc ? `<br>${esc(m.haftDoc)}` : ''}` : 'Nein',
      dash(m.bem)]));
  U.push(...section('Mitglieder', mc, ['Foto', 'Rang', 'Name', 'Status', 'Telefon', 'Haftbefehl', 'Bemerkung'], mrows,
    'Alle bekannten Mitglieder, sortiert nach Rang.'));

  /* Anwesen */
  const ac = '210px 130px 1fr';
  U.push(...section('Anwesen', ac, ['Kartenausschnitt', 'Ort / PLZ', 'Bilder'],
    S.anwesen.filter(a => a.karte || a.ort || a.bilder.length)
      .map(a => row(ac, [a.karte ? `<img class="map" src="${a.karte}">` : '<span class="dim">—</span>', dash(a.ort), imgs(a.bilder) || '<span class="dim">—</span>']))));

  /* Fahrzeuge */
  const fc = '120px 1fr 1fr 1fr';
  U.push(...section('Fraktionsfahrzeuge', fc, ['Kennzeichen', 'Modell', 'Halter', 'Bemerkung'],
    S.fahrzeuge.filter(f => f.kz || f.modell || f.halter || f.bem).map(f => row(fc, [`<b>${esc(f.kz)}</b>`, dash(f.modell), dash(f.halter), dash(f.bem)]))));

  /* Bewaffnung */
  const w = S.waffen; const wb = (l, on) => `<span><i class="box">${on ? '✕' : ''}</i>${l}</span>`;
  U.push(`<div class="unit first"><h3>Bewaffnung</h3><div class="wp">${wb('Langwaffen', w.lang)}${wb('SMGs', w.smg)}${wb('Pistolen', w.pistolen)}</div></div>`);

  /* Beziehungen */
  const bc = '1.2fr 120px 1.6fr';
  U.push(...section('Beziehungen zu anderen Fraktionen', bc, ['Fraktion', 'Verhältnis', 'Bemerkung'],
    S.beziehungen.filter(b => b.fraktion || b.bem).map(b => row(bc, [`<b>${esc(b.fraktion)}</b>`, `<span class="pill" style="background:${VCOL[b.verh] || '#6b7686'}">${esc(b.verh)}</span>`, dash(b.bem)]))));

  /* Straftaten */
  const sc = '160px 1fr';
  const st = S.straftaten.filter(s => s.datum || s.doc).slice().sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  U.push(...section(`Straftaten, in denen ${esc(h.name || 'die Fraktion')} involviert war`, sc, ['Datum', 'DOC-Nummer'],
    st.map(s => row(sc, [dash(fmtDate(s.datum)), `<b>${esc(s.doc)}</b>`])), 'Neueste Einträge oben.'));

  /* Informanten */
  const ic = '1fr 1fr 0.8fr 142px 1fr 80px';
  U.push(...section('Informanten', ic, ['Spitz / Codename', 'Echter Name', 'Stellung', 'Zuverlässigkeit', 'Geführt von', 'Seit'],
    S.informanten.filter(n => n.code || n.echt || n.stellung || n.fuehrer).map(n => row(ic, [
      `<b>${esc(n.code)}</b>`,
      n.echt ? (S.hideRealNames ? '<span class="redact">geschwärzt</span>' : esc(n.echt)) : '<span class="dim">—</span>',
      dash(n.stellung), `<span class="pill" style="background:${ZCOL[n.zuv] || '#8a8f99'}">${esc(n.zuv)}</span>`, dash(n.fuehrer), dash(fmtDate(n.seit))])),
    'Alle Informanten in oder rund um diese Fraktion. Nur Codenamen eintragen, nie Klarnamen.'));

  /* Fuß */
  U.push(`<div class="unit"><div class="foot"><span>${esc(S.dept)} – Fraktionsakte ${esc(name)}</span><span>Stand ${fmtDate(h.aktualisiert)}</span></div></div>`);

  return `<div class="doc">${U.join('')}</div>`;
}

function renderPreview() {
  const wrap = $('#docWrap');
  wrap.innerHTML = buildDoc();
  fit();
}
function fit() {
  const wrap = $('#docWrap'); const doc = wrap.firstElementChild; if (!doc) return;
  const avail = $('#preview').clientWidth - 40;
  doc.style.zoom = Math.min(1, Math.max(0.35, avail / 794));
}
window.addEventListener('resize', fit);

/* ---------- Export ---------- */
const slug = s => (s || 'Fraktion').normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '') || 'Fraktion';
const fileBase = () => `Fraktionsakte_${slug(S.head.name)}_${today()}`;

async function stageDoc() {
  const stage = $('#stage'); stage.innerHTML = buildDoc();
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all([...stage.querySelectorAll('img')].map(i => i.decode().catch(() => { })));
  return stage.firstElementChild;
}
function needLibs() {
  if (typeof html2canvas === 'undefined') { toast('html2canvas konnte nicht geladen werden (Internetverbindung?).'); return false; }
  return true;
}
function download(blobOrUrl, name) {
  const a = document.createElement('a');
  a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function busy(fn, msg) {
  const bs = document.querySelectorAll('.actions button'); bs.forEach(b => b.disabled = true); toast(msg);
  try { await fn(); } catch (e) { console.error(e); toast('Export fehlgeschlagen: ' + (e.message || e)); }
  finally { bs.forEach(b => b.disabled = false); $('#stage').innerHTML = ''; }
}

async function exportPng() {
  if (!needLibs()) return;
  await busy(async () => {
    const doc = await stageDoc();
    const c = await html2canvas(doc, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    download(blob, fileBase() + '.png'); toast('PNG erstellt.');
  }, 'PNG wird erstellt …');
}

/* A4-Seitenumbruch: jeder .unit wird einzeln gerendert und ohne Zerschneiden auf Seiten verteilt */
async function buildPages() {
  const doc = await stageDoc();
  const units = [...doc.children];
  const render = el => html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const items = [];
  for (const u of units) {
    const c = await render(u);
    items.push({ c, h: c.height / 2, w: c.width / 2, title: u.dataset.title, hdr: u.dataset.hdr });
  }
  // Kopfzeilen für Fortsetzungen vorab rendern
  const reps = {};
  for (const it of items) {
    if (!it.title || reps[it.title]) continue;
    const tmp = document.createElement('div'); tmp.className = 'unit';
    tmp.innerHTML = `<h3>${it.title} <span style="opacity:.6;font-weight:500">(Fortsetzung)</span></h3>${it.hdr}`;
    $('#stage').firstElementChild.appendChild(tmp);
    const c = await render(tmp);
    reps[it.title] = { c, h: c.height / 2, w: c.width / 2 };
    tmp.remove();
  }
  const PW = 794, PH = 1123, MX = 36, TOP1 = 36, TOPN = 62, BOT = 54, S2 = 2;
  const pages = [[]]; let y = TOP1;
  for (const it of items) {
    const cont = it.title ? reps[it.title] : null;
    if (y + it.h > PH - BOT && pages[pages.length - 1].length) { pages.push([]); y = TOPN; if (cont) { pages[pages.length - 1].push({ it: cont, y }); y += cont.h; } }
    pages[pages.length - 1].push({ it, y }); y += it.h;
  }
  const logo = await loadImg(logoSrc()).catch(() => null);
  const canvases = pages.map((pg, idx) => {
    const c = document.createElement('canvas'); c.width = PW * S2; c.height = PH * S2;
    const x = c.getContext('2d'); x.scale(S2, S2);
    x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    pg.forEach(({ it, y }) => x.drawImage(it.c, MX, y, it.w, it.h));
    x.textBaseline = 'middle';
    if (idx > 0) { // Laufkopf
      if (logo) { const k = 26 / Math.max(logo.width, logo.height); x.drawImage(logo, MX, 18, logo.width * k, logo.height * k); }
      x.fillStyle = '#0a1f44'; x.font = '600 13px "Barlow Condensed", Arial, sans-serif';
      x.textAlign = 'left'; x.fillText(S.dept.toUpperCase(), MX + 36, 31);
      x.textAlign = 'right'; x.fillText(('Fraktionsakte – ' + (S.head.name || '')).toUpperCase(), PW - MX, 31);
      x.fillStyle = '#b8923a'; x.fillRect(MX, 46, PW - 2 * MX, 2);
    }
    x.fillStyle = '#cfd5df'; x.fillRect(MX, PH - 42, PW - 2 * MX, 1);
    x.fillStyle = '#718096'; x.font = '500 10px "Barlow", Arial, sans-serif';
    x.textAlign = 'left'; x.fillText('VERTRAULICH – NUR FÜR DEN DIENSTGEBRAUCH', MX, PH - 28);
    x.textAlign = 'right'; x.fillText(`Seite ${idx + 1} / ${pages.length}`, PW - MX, PH - 28);
    return c;
  });
  return canvases;
}

async function exportPdf() {
  if (!needLibs()) return;
  if (!window.jspdf) { toast('jsPDF konnte nicht geladen werden (Internetverbindung?).'); return; }
  await busy(async () => {
    const pages = await buildPages();
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title: `Fraktionsakte ${S.head.name}`, author: S.dept, subject: 'Fraktionsakte' });
    pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); });
    pdf.save(fileBase() + '.pdf'); toast(`PDF erstellt (${pages.length} Seite${pages.length > 1 ? 'n' : ''}).`);
  }, 'PDF wird erstellt …');
}

/* ---------- Toolbar ---------- */
$('#btnPdf').onclick = exportPdf;
$('#btnPng').onclick = exportPng;
$('#btnNew').onclick = () => {
  if (!confirm('Neue, leere Akte anlegen? Nicht gespeicherte Änderungen gehen verloren (vorher „JSON speichern“).')) return;
  const keep = { dept: S.dept, logo: S.logo, hideRealNames: S.hideRealNames };
  S = Object.assign(blank(), keep); openSecs = new Set(['kopf']); save(); renderForm(); renderPreview();
};
$('#btnSave').onclick = () => download(new Blob([JSON.stringify(S)], { type: 'application/json' }), fileBase() + '.json');
$('#btnLoad').onclick = () => $('#fileJson').click();
$('#fileJson').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { S = Object.assign(blank(), JSON.parse(await f.text())); save(); renderForm(); renderPreview(); toast('Akte geladen.'); }
  catch { toast('Datei ist keine gültige Akte (JSON).'); }
  e.target.value = '';
};

/* ---------- Start ---------- */
renderForm(); renderPreview();
