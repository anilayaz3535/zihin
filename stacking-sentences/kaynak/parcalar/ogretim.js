/* =====================================================================
   ÖĞRETİM KATMANI (eski adı data.js)
   İngilizce içerik (icerik.js, siralama.js, hatalar.js) ve öğretim kuralları:
   seviyeler, cümle bölümleri, kelime paketleri, çeldiriciler, hata kuralları,
   aralıklı tekrar, dersler, Türkçe mantığı, seviye testi, kısa sözlük.
   Kayda doğrudan yazmaz (kayit.js); ilerlemeyi global `kayit` nesnesinde tutar.
   Ekranı ve oyun motorunu bilmez.
   ===================================================================== */
const C = window.NE_ICERIK || { seviyeler: [], rivals: [], sentences: {}, packs: [], words: {}, dersler: {}, kodlar: {} };
const HATALAR = window.NE_HATALAR || [];
function karistir(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function tokenle(s) { return s.replace(/[.,!?;:"“”]/g, ' ').split(/\s+/).filter(Boolean); }
function buyukHarf(s) { return s ? s.charAt(0).toLocaleUpperCase('en-US') + s.slice(1) : s; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- seviyeler ve dojolar ---------------- */
const SEVIYELER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SEVIYE = {}; (C.seviyeler || []).forEach(s => { SEVIYE[s.code] = s; });
function seviyeZor(l) { const s = SEVIYE[l]; return s ? s.zor : Math.max(0, SEVIYELER.indexOf(l)); }
function seviyeYol(l) { const s = SEVIYE[l]; return s ? s.yol : 'genel'; }
function seviyeAd(l) { const s = SEVIYE[l]; return s ? s.ad : l; }
const RAKIP_DIZIN = {}; C.rivals.forEach((r, i) => { r.sira = i; RAKIP_DIZIN[r.id] = r; });
const seviyeOnbellek = {};
function seviyeRakipleri(l) { return seviyeOnbellek[l] || (seviyeOnbellek[l] = C.rivals.filter(r => r.lvl === l)); }
function rakipBul(id) { return RAKIP_DIZIN[id] || null; }
function sonrakiRakip(r) {
  const l = seviyeRakipleri(r.lvl), i = l.indexOf(r);
  if (i >= 0 && i + 1 < l.length) return l[i + 1];
  const si = SEVIYELER.indexOf(r.lvl);
  if (si >= 0 && si + 1 < SEVIYELER.length) return seviyeRakipleri(SEVIYELER[si + 1])[0] || null;
  return null;
}
function rakipAcikMi(r) {
  if (!r) return false;
  if (kayit.acik[r.id]) return true;
  return seviyeYol(r.lvl) !== 'genel' && seviyeRakipleri(r.lvl)[0] === r;
}
function seviyeAcikMi(l) { return seviyeRakipleri(l).some(rakipAcikMi); }
function cumleliMi(r) { return !r.karma && (C.sentences[r.id] || []).length > 0; }
const cumleOnbellek = {};
// cümle: [Türkçe, İngilizce, "çeldirici1|çeldirici2~..." (her kelime için), "kategori,kodları"]
function cumleler(id) {
  if (cumleOnbellek[id]) return cumleOnbellek[id];
  const ham = C.sentences[id] || [];
  const out = ham.map((s, i) => {
    const t = tokenle(s[1]), d = s[2].split('~'), c = s[3] ? s[3].split(',') : [];
    return { i, kaynak: id, tr: s[0], en: s[1], dz: s[4] || '', w: t.map((x, k) => { const o = (d[k] || '').split('|'); return [x, o[0] || '', o[1] || '']; }), c: c.length === t.length ? c : t.map(() => 'W') };
  });
  cumleOnbellek[id] = out;
  return out;
}

/* ---------------- kelime paketleri ---------------- */
const PAKET_DIZIN = {}; (C.packs || []).forEach((p, i) => { p.sira = i; PAKET_DIZIN[p.id] = p; });
const paketOnbellek = {}, seviyePaketOnbellek = {};
function paketBul(id) { return PAKET_DIZIN[id] || null; }
function seviyePaketleri(l) { return seviyePaketOnbellek[l] || (seviyePaketOnbellek[l] = (C.packs || []).filter(p => p.lvl === l)); }
// kelime: [İngilizce, Türkçe, tür, "çeldirici1|çeldirici2", örnek ("dojo:sıra" ya da "en§tr")]
function paketKelimeleri(id) {
  if (paketOnbellek[id]) return paketOnbellek[id];
  const out = ((C.words || {})[id] || []).map((q, i) => {
    // "duş almak · ifade", "öğrenmek · fiil öbeği": sondaki tür etiketi anlamdan ayrılıp türe yazılır.
    // Etiket anlamın içinde kalırsa "Türkçesini bul" sorusunda çeldirici çıkmıyor ya da doğru cevabı ele veriyordu.
    let tr = q[1] || '', pos = q[2] || '';
    const j = tr.lastIndexOf(' · ');
    if (j > 0) { const et = tr.slice(j + 3).trim(); tr = tr.slice(0, j).trim(); if (et && (!pos || et.indexOf(pos) >= 0)) pos = et; }
    return { en: q[0], tr, pos, d: q[3] ? q[3].split('|') : [], ornekRef: q[4] || '', pid: id, i, k: q[0].toLowerCase() };
  });
  paketOnbellek[id] = out;
  return out;
}
let SOZLUK = null;
function sozluk() {
  if (SOZLUK) return SOZLUK;
  SOZLUK = {};
  (C.packs || []).forEach(p => paketKelimeleri(p.id).forEach(w => { if (!SOZLUK[w.k]) SOZLUK[w.k] = w; }));
  return SOZLUK;
}
function kelimeOrnek(w) {
  if (w.ornekC !== undefined) return w.ornekC;
  const r = w.ornekRef; let o = null;
  if (r) {
    const j = r.indexOf('§');
    if (j >= 0) o = { en: r.slice(0, j), tr: r.slice(j + 1) };
    else { const p = r.lastIndexOf(':'), rid = r.slice(0, p), s = (C.sentences[rid] || [])[+r.slice(p + 1)]; if (s) o = { en: s[1], tr: s[0] }; }
  }
  w.ornekC = o;
  return o;
}
function kisaAnlam(tr) {
  const a = String(tr || '');
  if (a.length <= 22) return a;
  const p = a.split(/\s\/\s|;\s|,\s/);
  return p[0].length >= 2 && p[0].length < a.length ? p[0] : a;
}
function anlamParcalari(tr) { return String(tr || '').toLowerCase().split(/[\s\/,;()]+/).filter(x => x.length > 2); }

/* ---- kelime hafızası: her kelime [kutu, vade (dakika), hata] · 10 dk, 1, 3, 7, 21 gün ---- */
const KUTU_DK = [0, 10, 1440, 4320, 10080, 30240];
function dakika() { return Math.floor(Date.now() / 60000); }
function kelTanis(w) { if (!kayit.kel[w.k]) kayit.kel[w.k] = [1, dakika() + KUTU_DK[1], 0]; }
function kelDogru(w, zorla) {
  const s = kayit.kel[w.k];
  if (!s) { kayit.kel[w.k] = [1, dakika() + KUTU_DK[1], 0]; return; }
  if (zorla || s[1] <= dakika()) { s[0] = Math.min(6, s[0] + 1); s[1] = s[0] >= 6 ? 0 : dakika() + KUTU_DK[s[0]]; }
}
function kelHata(w) { const s = kayit.kel[w.k] || [1, 0, 0]; s[0] = 1; s[1] = dakika() + KUTU_DK[1]; s[2] = (s[2] || 0) + 1; kayit.kel[w.k] = s; }
function kelHazir() {
  const sz = sozluk(), d = dakika(), out = [];
  for (const k in kayit.kel) { const s = kayit.kel[k]; if (s[0] < 6 && s[1] <= d && sz[k]) out.push(sz[k]); }
  out.sort((a, b) => kayit.kel[a.k][1] - kayit.kel[b.k][1]);
  return out;
}
function kelBekleyen(n) {
  const sz = sozluk(), out = [];
  for (const k in kayit.kel) { const s = kayit.kel[k]; if (s[0] < 6 && sz[k]) out.push(sz[k]); }
  out.sort((a, b) => kayit.kel[a.k][0] - kayit.kel[b.k][0] || kayit.kel[a.k][1] - kayit.kel[b.k][1]);
  return out.slice(0, n);
}
function kelSayilar() { let t = 0, o = 0, u = 0; for (const k in kayit.kel) { const s = kayit.kel[k]; t++; if (s[0] >= 2) o++; if (s[0] >= 6) u++; } return { tanis: t, ogrenildi: o, usta: u }; }
function paketIlerleme(p) {
  const l = paketKelimeleri(p.id); let o = 0, t = 0;
  for (let i = 0; i < l.length; i++) { const s = kayit.kel[l[i].k]; if (s) { t++; if (s[0] >= 2) o++; } }
  return { ogrenilen: o, tanisilan: t, toplam: l.length };
}
function paketAcikMi(p) {
  if (!p) return false;
  if (kayit.acik[p.id]) return true;
  const l = seviyePaketleri(p.lvl), i = l.indexOf(p);
  if (i === 0) return seviyeYol(p.lvl) !== 'genel' || seviyeAcikMi(p.lvl);
  const o = l[i - 1];
  if (o && kayit.yildiz[o.id] && paketIlerleme(o).ogrenilen * 2 >= paketKelimeleri(o.id).length) { kayit.acik[p.id] = true; return true; }
  return false;
}
function sonrakiPaket(p) { const l = seviyePaketleri(p.lvl), i = l.indexOf(p); return i >= 0 && i + 1 < l.length ? l[i + 1] : null; }

/* ---- çeldiriciler ---- */
function levenshtein(a, b) {
  const m = a.length, n = b.length, d = []; let i, j;
  for (i = 0; i <= m; i++) d[i] = [i];
  for (j = 0; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function kelimeCeldirici(w, n, sesli) {
  const out = [], gor = {}; gor[w.k] = 1;
  function ekle(x) { if (!x) return; const l = x.toLowerCase(); if (gor[l] || out.length >= n) return; gor[l] = 1; out.push(x); }
  const paket = paketKelimeleri(w.pid);
  if (sesli) {
    const aday = paket.concat(w.d.map(x => ({ en: x, k: x.toLowerCase() }))).filter(q => q.k !== w.k && q.k.indexOf(' ') < 0);
    aday.sort((a, b) => levenshtein(a.k, w.k) - levenshtein(b.k, w.k));
    for (let i = 0; i < aday.length && out.length < n; i++) ekle(aday[i].en);
  }
  w.d.forEach(ekle);
  const k = karistir(paket.slice());
  for (let j = 0; j < k.length && out.length < n; j++) ekle(k[j].en);
  return out;
}
function anlamCeldirici(w, n) {
  const out = [], dogru = kisaAnlam(w.tr), par = anlamParcalari(w.tr), gor = {};
  gor[dogru.toLowerCase()] = 1;
  const havuz = karistir(paketKelimeleri(w.pid).slice());
  havuz.sort((a, b) => (a.pos === w.pos ? 0 : 1) - (b.pos === w.pos ? 0 : 1));
  for (let i = 0; i < havuz.length && out.length < n; i++) {
    const q = havuz[i]; if (q.k === w.k) continue;
    const a = kisaAnlam(q.tr), l = a.toLowerCase();
    if (gor[l]) continue;
    if (anlamParcalari(q.tr).some(x => par.indexOf(x) >= 0)) continue;
    gor[l] = 1; out.push(a);
  }
  return out;
}
// Türklerin sık yaptığı yazım hataları; sonuç gerçek bir kelime olmamalı
const YAZIM_KURAL = [
  s => s.replace(/([bcdfgklmnprstz])\1/, '$1'),
  s => { const m = /[aeiou]([bcdfgklmnprt])[aeiou]/.exec(s); return m ? s.slice(0, m.index + 1) + m[1] + s.slice(m.index + 1) : s; },
  s => s.replace(/ie/, 'ei'), s => s.replace(/ei/, 'ie'), s => s.replace(/ea/, 'ee'), s => s.replace(/ou/, 'o'),
  s => s.replace(/tion$/, 'sion'), s => s.replace(/sion$/, 'tion'), s => s.replace(/ph/, 'f'), s => s.replace(/^kn/, 'n'), s => s.replace(/^wr/, 'r'),
  s => s.replace(/ght/, 't'), s => s.replace(/y$/, 'i'), s => s.replace(/c(?=[aou])/, 'k'), s => s.replace(/able$/, 'ible'), s => s.replace(/ible$/, 'able'),
  s => s.replace(/ence$/, 'ance'), s => s.replace(/ance$/, 'ence'), s => s.replace(/er$/, 'ar'), s => s.replace(/w/, 'v'), s => s.replace(/th/, 't'),
  s => { if (s.length < 5) return s; const i = 1 + Math.floor(Math.random() * (s.length - 3)); return s.slice(0, i) + s.charAt(i + 1) + s.charAt(i) + s.slice(i + 2); }
];
function yanlisYaz(en) {
  const w = en.toLowerCase();
  if (!/^[a-z]{4,}$/.test(w)) return null;
  const sz = sozluk(), k = karistir(YAZIM_KURAL.slice());
  for (let i = 0; i < k.length; i++) { const r = k[i](w); if (r !== w && r.length >= 3 && !sz[r]) return /^[A-Z]/.test(en) ? buyukHarf(r) : r; }
  return null;
}

/* ---- kelime dojosu kuyruğu: tanış → kes → hafıza ---- */
function boslukluMu(w) { const o = kelimeOrnek(w); return !!o && tokenle(o.en).some(t => t.toLowerCase() === w.k); }
function testTipi(w, sira) {
  const tipler = ['anlam', 'ters'];
  if (Konus.hazir()) tipler.push('dinle');
  if (kelimeOrnek(w) && boslukluMu(w)) { tipler.push('bosluk'); tipler.push('bosluk'); }
  return tipler[(sira + w.i) % tipler.length];
}
function ikinciTip(w, sira) {
  if (boslukluMu(w) && sira % 2 === 0) return 'bosluk';
  if (Konus.hazir() && sira % 3 === 1) return 'dinle';
  return 'ters';
}
function kelimeKuyruk(p) {
  const l = paketKelimeleri(p.id);
  const yeniSay = kayit.kelRehber ? 6 : 4;
  const yeni = l.filter(w => !kayit.kel[w.k]).slice(0, yeniSay);
  const eski = l.filter(w => { const s = kayit.kel[w.k]; return s && s[0] < 6; }).sort((a, b) => { const x = kayit.kel[a.k], y = kayit.kel[b.k]; return (x[1] - y[1]) || (x[0] - y[0]); });
  let tekrar = eski.slice(0, yeni.length ? 3 : 9);
  const hz = kelHazir().filter(w => w.pid !== p.id && SEVIYELER.indexOf(paketBul(w.pid).lvl) <= Math.max(0, SEVIYELER.indexOf(p.lvl))).slice(0, yeni.length ? 2 : 3);
  tekrar = tekrar.concat(hz);
  if (!yeni.length && tekrar.length < 4) tekrar = tekrar.concat(karistir(l.filter(w => tekrar.indexOf(w) < 0)).slice(0, 8 - tekrar.length));
  // Bir kelime kartında gösterildikten hemen sonra sorulmaz: arada en az iki başka madde olur.
  const q = [], bekle = []; let testSay = 0, ri = 0;
  const tekrarSira = karistir(tekrar.slice());
  function ekle(it) { q.push(it); testSay++; if (testSay % 4 === 0) q.push({ tip: 'savunma' }); }
  function doldur(zorla) {
    for (let i = 0; i < bekle.length; i++) if (bekle[i].min <= q.length) { const b = bekle.splice(i, 1)[0]; ekle({ tip: b.tip, w: b.w }); return true; }
    if (ri < tekrarSira.length) { const w = tekrarSira[ri++]; ekle({ tip: testTipi(w, ri), w }); return true; }
    if (zorla && bekle.length) { bekle.sort((a, b) => a.min - b.min); const b2 = bekle.shift(); ekle({ tip: b2.tip, w: b2.w }); return true; }
    return false;
  }
  yeni.forEach((w, i) => {
    q.push({ tip: 'tanis', w });
    bekle.push({ w, tip: 'anlam', min: q.length + 2 });
    bekle.push({ w, tip: ikinciTip(w, i), min: q.length + 7 });
    if (i > 0) doldur(false);
  });
  while (bekle.length || ri < tekrarSira.length) doldur(true);
  if (!q.length || q[q.length - 1].tip !== 'savunma') q.push({ tip: 'savunma' });
  return { kuyruk: q, yeni };
}
/* ---- kelime savunması: yanlış eşleşme ya da yanlış yazım ---- */
function kelimeSavunmaMaddesi() {
  const kq = D.kelime, paket = paketKelimeleri(D.r.id);
  const havuz = kq.gorulen.slice();
  if (havuz.length < 3) paket.forEach(w => { if (havuz.length < 6 && kayit.kel[w.k] && havuz.indexOf(w) < 0) havuz.push(w); });
  if (havuz.length < 3) return null;
  kq.savSira = (kq.savSira || 0) + 1;
  if (kq.savSira % 2 === 0) {
    const adaylar = karistir(havuz.filter(w => /^[a-zA-Z]{5,}$/.test(w.en)));
    for (let i = 0; i < adaylar.length; i++) {
      const yan = yanlisYaz(adaylar[i].en);
      if (!yan) continue;
      const digerleri = karistir(havuz.filter(w => w !== adaylar[i] && w.en.indexOf(' ') < 0)).slice(0, 3);
      if (digerleri.length < 2) break;
      const tokens = digerleri.map(w => w.en), idx = Math.floor(Math.random() * (tokens.length + 1));
      tokens.splice(idx, 0, yan);
      return { tip: 'yazim', kelime: adaylar[i], tokens, idx, dogru: adaylar[i].en, tr: 'Yazımı yanlış olan kelimeyi bul', kural: 'Doğru yazım: ' + adaylar[i].en + ' (' + kisaAnlam(adaylar[i].tr) + ')', dogruCumle: adaylar[i].en };
    }
  }
  const uc = karistir(havuz.slice()).slice(0, 3);
  const hedef = uc[Math.floor(Math.random() * uc.length)];
  const yanlisAnlam = anlamCeldirici(hedef, 1)[0];
  if (!yanlisAnlam) return null;
  const idx2 = uc.indexOf(hedef);
  const t2 = uc.map(w => w.en + ' = ' + kisaAnlam(w.tr));
  t2[idx2] = hedef.en + ' = ' + yanlisAnlam;
  return { tip: 'eslesme', kelime: hedef, tokens: t2, idx: idx2, dogru: hedef.en + ' = ' + kisaAnlam(hedef.tr), tr: 'Hangi eşleşme yanlış?', kural: hedef.en + ' = ' + hedef.tr + (hedef.pos ? ' (' + hedef.pos + ')' : ''), dogruCumle: hedef.en, satir: true };
}

/* ---------------- hafıza motoru: cümle ve hata tekrarları (5 kutu) ---------------- */
const KUTU_ARALIK = [0, 10 * 60e3, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];
function savKopya(m) { return { tip: m.tip || 'hata', tokens: m.tokens.slice(), idx: m.idx, idx2: m.idx2, dogru: m.dogru, tr: m.tr, kural: m.kural, dogruCumle: m.dogruCumle, klasik: !!m.klasik, satir: !!m.satir }; }
function srsAnahtar(m) { return m.tur === 'cumle' ? 'c:' + m.r + ':' + m.i : 'h:' + m.m.tokens.join(' ') + '|' + m.m.idx; }
function srsBul(k) { for (let i = 0; i < kayit.tekrar.length; i++) if (kayit.tekrar[i].k === k) return kayit.tekrar[i]; return null; }
function srsHata(m) {
  const k = srsAnahtar(m), simdi = Date.now();
  let e = srsBul(k);
  if (!e) {
    e = { k, tur: m.tur, kutu: 1, vade: 0, hata: 0, t: simdi };
    if (m.tur === 'cumle') { e.r = m.r; e.i = m.i; } else e.m = savKopya(m.m);
    kayit.tekrar.push(e);
  }
  e.kutu = 1; e.vade = simdi + KUTU_ARALIK[1]; e.hata = (e.hata || 0) + 1; e.son = simdi;
  if (kayit.tekrar.length > 400) {
    kayit.tekrar.sort((a, b) => (b.kutu === 6 ? 1 : 0) - (a.kutu === 6 ? 1 : 0) || a.son - b.son);
    kayit.tekrar.splice(0, kayit.tekrar.length - 400);
  }
}
function srsDogru(e) { if (!e) return; e.kutu = Math.min(6, e.kutu + 1); e.vade = e.kutu >= 6 ? 0 : Date.now() + KUTU_ARALIK[e.kutu]; e.son = Date.now(); }
function srsHazir() { const simdi = Date.now(); return kayit.tekrar.filter(e => e.kutu < 6 && e.vade <= simdi); }
function sureYaz(ms) { const dk = Math.ceil(ms / 60e3); if (dk < 60) return tt('{n} dk', { n: dk }); const sa = Math.round(dk / 60); if (sa < 24) return tt('{n} saat', { n: sa }); return tt('{n} gün', { n: Math.round(sa / 24) }); }

/* ---------------- hata kuralları (kesilen yanlış kelime için açıklama) ---------------- */
const BE = ['am', 'is', 'are', 'was', 'were'];
const ZAMIR = [
  { k: ['i', 'me', 'my', 'mine'], tr: { i: 'ben', me: 'beni / bana', my: 'benim', mine: 'benimki' } },
  { k: ['you', 'your', 'yours'], tr: { you: 'sen / siz', your: 'senin / sizin', yours: 'seninki' } },
  { k: ['he', 'him', 'his'], tr: { he: 'o (erkek)', him: 'onu / ona', his: 'onun' } },
  { k: ['she', 'her', 'hers'], tr: { she: 'o (kız)', her: 'onu / onun', hers: 'onunki' } },
  { k: ['it', 'its'], tr: { it: 'o (şey)', its: 'onun' } },
  { k: ['we', 'us', 'our', 'ours'], tr: { we: 'biz', us: 'bizi / bize', our: 'bizim', ours: 'bizimki' } },
  { k: ['they', 'them', 'their', 'theirs'], tr: { they: 'onlar', them: 'onları / onlara', their: 'onların', theirs: 'onlarınki' } }
];
const OZNE = { i: 1, you: 1, he: 1, she: 1, it: 1, we: 1, they: 1 };
const NESNE = { me: 1, him: 1, us: 1, them: 1 };
const IYELIK = { my: 1, your: 1, his: 1, its: 1, our: 1, their: 1 };
const YALIN_ONCE = ['do', 'does', 'did', "don't", "doesn't", "didn't", 'can', "can't", 'could', 'will', "won't", 'would', 'should', 'must', 'may', 'might', 'to', 'let', 'make', 'help'];
function zamirGrubu(w) { for (let i = 0; i < ZAMIR.length; i++) if (ZAMIR[i].k.indexOf(w) >= 0) return ZAMIR[i]; return null; }
function fiilIliskisi(dogru, yanlis) {
  const d = dogru.toLowerCase(), y = yanlis.toLowerCase();
  if (/ing$/.test(d) && !/ing$/.test(y) && d.length > 4) return 'ing';
  if (/ing$/.test(y) && !/ing$/.test(d) && y.length > 4) return 'ingsiz';
  if (d === y + 's' || d === y + 'es' || (/ies$/.test(d) && d.slice(0, -3) + 'y' === y)) return 's';
  if (y === d + 's' || y === d + 'es' || (/ies$/.test(y) && y.slice(0, -3) + 'y' === d)) return 'yalin';
  if (/ed$/.test(d) && (d.slice(0, -2) === y || d.slice(0, -1) === y || d.slice(0, -3) === y)) return 'gecmis';
  return null;
}
function kural(tokens, idx, dogru, yanlis, kat) {
  const d = dogru.toLowerCase(), y = yanlis.toLowerCase();
  const once = idx > 0 ? tokens[idx - 1] : '', oncek = once.toLowerCase();
  const sonraki = idx + 1 < tokens.length ? tokens[idx + 1] : '';
  if (BE.indexOf(d) >= 0 && BE.indexOf(y) >= 0) {
    const ozne = idx === 0 || /^(where|what|when|why|how|who)$/i.test(once) ? sonraki : once;
    const oz = ozne.toLowerCase(), gecmis = d === 'was' || d === 'were';
    const genel = gecmis ? 'I / he / she / it → was · we / you / they → were' : 'I → am · he / she / it → is · we / you / they → are';
    const tekil = { am: 1, is: 1, was: 1 }, gecmisler = { was: 1, were: 1 };
    if ((!!tekil[d] === !!tekil[y]) && (!!gecmisler[d] !== !!gecmisler[y])) return 'Türkçedeki zamana bak: ' + (gecmis ? 'geçmiş zaman → ' : 'şimdiki / geniş zaman → ') + d + '.';
    if (oz === 'there') return 'There + tekil isim → ' + (gecmis ? 'was' : 'is') + ' · çoğul isim → ' + (gecmis ? 'were' : 'are') + '.';
    if (OZNE[oz]) return buyukHarf(ozne) + ' ile ' + d + ' kullanılır. (' + genel + ')';
    return (d === 'is' || d === 'was' ? 'Tekil özne' : 'Çoğul özne') + ' ile ' + d + ' kullanılır. (' + genel + ')';
  }
  const zg = zamirGrubu(d);
  if (zg && zg === zamirGrubu(y)) {
    if ((d === 'it' || d === 'you') && IYELIK[y]) return d + ' = ' + zg.tr[d] + ', ' + y + ' = ' + zg.tr[y] + '. Burada iyelik değil, zamirin kendisi gerekir: ' + d + '.';
    const rol = OZNE[d] ? 'özne (kim?)' : NESNE[d] ? 'nesne (kimi? kime?)' : IYELIK[d] ? 'iyelik (kimin?)' : 'bu biçim';
    return (d === 'i' ? 'I' : d) + ' = ' + zg.tr[d] + ', ' + (y === 'i' ? 'I' : y) + ' = ' + (zg.tr[y] || y) + '. Burada ' + rol + ' gerekir.';
  }
  if (zg && zamirGrubu(y)) return 'Türkçedeki kişiye bak: ' + d + ' = ' + zg.tr[d] + '.';
  if ((d === 'a' && y === 'an') || (d === 'an' && y === 'a')) return d === 'an' ? 'Sesli harfle başlayan kelimeden önce an: an ' + sonraki + '.' : 'Ünsüzle başlayan kelimeden önce a: a ' + sonraki + '.';
  if (d === 'the' && (y === 'then' || y === 'them')) return 'the = belirli tanımlık. ' + (y === 'then' ? 'then = sonra.' : 'them = onları / onlara.');
  if ((d === 'a' || d === 'an') && y === 'the') return 'Türkçede "bir" anlamı var: a / an kullanılır.';
  if (d === 'the' && (y === 'a' || y === 'an')) return 'Belirli bir şeyden söz ediliyor: the.';
  const fiilTuru = !kat || /^(I|S|P|V|U|X|M|K)$/.test(kat);
  if ((d === 'do' && y === 'does') || (d === 'does' && y === 'do') || (d === 'have' && y === 'has') || (d === 'has' && y === 'have')) {
    const ikili = d === 'do' || d === 'does' ? ['do', 'does'] : ['have', 'has'];
    return 'I / you / we / they ile ' + ikili[0] + ', he / she / it ile ' + ikili[1] + ' kullanılır: ' + d + '.';
  }
  if (/^(can|must|should|will|may|might|could|would)$/.test(d) && y === d + 's') return d + ' hiçbir zaman -s almaz: ' + d + '.';
  if (kat === 'G') {
    if (/^(this|that)$/.test(d) && /^(these|those)$/.test(y)) return 'this / that tekil isimle, these / those çoğul isimle kullanılır: ' + d + '.';
    if (/^(these|those)$/.test(d) && /^(this|that)$/.test(y)) return 'Çoğul isimle these / those kullanılır: ' + d + '.';
    return 'this / these = bu, bunlar (yakın) · that / those = şu, şunlar (uzak): ' + d + '.';
  }
  const FK = /^(new|news|glass|glasses|cloth|clothes|good|goods|custom|customs|manner|manners|mean|means|wood|woods|arm|arms|outdoor|outdoors|indoor|indoors)$/;
  const farkliKelime = FK.test(d) && FK.test(y);
  const fiilYeri = YALIN_ONCE.indexOf(oncek) >= 0 || OZNE[oncek] || /^(i|you|we|they)$/.test(oncek);
  if (!fiilTuru && fiilYeri && (y === d + 's' || y === d + 'es')) return (YALIN_ONCE.indexOf(oncek) >= 0 ? once + ' kelimesinden sonra fiil yalın gelir: ' : 'I / you / we / they ile fiil -s almaz: ') + d + '.';
  if (!fiilTuru && fiilYeri && (d === y + 's' || d === y + 'es') && /^(he|she|it)$/.test(oncek)) return 'He / she / it ile geniş zamanda fiil -s alır: ' + d + '.';
  if (!fiilTuru && !farkliKelime && !fiilYeri && (d === y + 's' || d === y + 'es' || (/ies$/.test(d) && d.slice(0, -3) + 'y' === y))) return 'Burada çoğul gerekir (Türkçedeki -ler / -lar): ' + d + '.';
  if (!fiilTuru && !farkliKelime && !fiilYeri && (y === d + 's' || y === d + 'es' || (/ies$/.test(y) && y.slice(0, -3) + 'y' === d))) return 'Burada tekil gerekir: ' + d + '.';
  if (kat === 'C') {
    if (/est$/.test(d) || d === 'most') return 'En üstünlük: the + -est / the most → ' + d + '.';
    if (/er$/.test(d) || d === 'more') return 'Karşılaştırma: -er / more + than → ' + d + '.';
    if (d === 'than') return 'Karşılaştırmada "-den / -dan" = than.';
    if (d === 'as') return 'as ... as kalıbı ("... kadar"): as.';
  }
  if (kat === 'Q') return 'Soru kelimesi: Türkçedeki soruya bak → ' + d + '.';
  if (kat === 'T') return 'Zaman kelimesi: ' + d + '.';
  const once2 = idx > 1 ? tokens[idx - 2].toLowerCase() : '';
  if (kat === 'V') {
    if (/^(have|has|had|haven't|hasn't|hadn't|i've|we've|you've|they've)$/.test(oncek) || /^(have|has|had)$/.test(once2)) return 'have / has + fiilin 3. hâli (V3): ' + d + '.';
    if (BE.indexOf(oncek) >= 0 || /^(be|been|being)$/.test(oncek)) return 'Edilgen yapı: be + fiilin 3. hâli (V3) → ' + d + '.';
  }
  if (kat === 'P') {
    if (YALIN_ONCE.indexOf(oncek) >= 0) return once + ' kelimesinden sonra fiil yalın gelir: ' + d + '.';
    return 'Geçmiş zaman (-di): ' + d + '. "' + y + '" bu zamana uymaz.';
  }
  const fi = fiilTuru ? fiilIliskisi(dogru, yanlis) : null;
  if (fi === 'ing') {
    if (oncek === 'was' || oncek === 'were') return 'was / were + fiil-ing: o sırada süren iş → ' + d + '.';
    if (BE.indexOf(oncek) >= 0 || oncek === "i'm" || /'re$|'s$/.test(oncek)) return 'am / is / are + fiil-ing: şu an olan iş → ' + d + '.';
    if (/^(like|love|enjoy|hate|finish|stop|avoid|mind|keep)s?$/.test(oncek) || /^(liked|loved|enjoyed|finished|stopped|avoided)$/.test(oncek)) return once + ' kelimesinden sonra fiil -ing alır: ' + once + ' ' + d + '.';
    return 'Burada fiilin -ing hâli gerekir: ' + d + '.';
  }
  if (fi === 'ingsiz') { if (YALIN_ONCE.indexOf(oncek) >= 0) return once + ' kelimesinden sonra fiil yalın gelir: ' + d + '.'; return 'am / is / are olmadan -ing kullanılmaz: ' + d + '.'; }
  if (fi === 's') return 'He / she / it ve tekil isimlerle geniş zamanda fiil -s alır: ' + d + '.';
  if (fi === 'yalin') { if (YALIN_ONCE.indexOf(oncek) >= 0) return once + ' kelimesinden sonra fiil yalın gelir: ' + d + '.'; return 'I / you / we / they ile fiil -s almaz: ' + d + '.'; }
  if (fi === 'gecmis' || kat === 'P') {
    if (YALIN_ONCE.indexOf(y) < 0 && levenshtein(d, y) <= 3 && kat === 'P') return 'Geçmiş zaman: ' + d + '. (' + y + ' bu cümleye uymaz.)';
    return 'Geçmiş zaman (-di / -miş): ' + d + '.';
  }
  if (oncek && YALIN_ONCE.indexOf(oncek) >= 0 && kat === 'P') return once + ' kelimesinden sonra fiil yalın gelir: ' + d + '.';
  if (kat === 'E') return 'Bu kalıpta edat olarak ' + d + ' kullanılır.';
  if (kat === 'X') return 'Türkçedeki zamana bak: ' + d + ' kullanılır.';
  const dk = kat && C.kodlar && C.kodlar[kat], dt = dk && C.dersler && C.dersler[dk];
  if (dt && /^(R|L|N|Y|K|J|O|H|D|DY|KL|U|F|M|C)$/.test(kat)) return dt.title.replace(/[{}]/g, '') + ': ' + dt.short.replace(/[{}]/g, '') + ' → ' + d + '.';
  if (levenshtein(d, y) <= 2 && d.length >= 3) return '"' + y + '" ile "' + d + '" birbirine çok benziyor. Cümlenin anlamına uyan: ' + d + '.';
  return 'Cümlenin anlamına uyan kelime: ' + d + '.';
}
function hataPuani(dogru, yanlis, kat, li) {
  const d = dogru.toLowerCase(), y = yanlis.toLowerCase();
  li = li || 0;
  if (BE.indexOf(d) >= 0 && BE.indexOf(y) >= 0) {
    const tekil = { am: 1, is: 1, was: 1 }, gecmis = { was: 1, were: 1 };
    if ((!!tekil[d] === !!tekil[y]) && (!!gecmis[d] !== !!gecmis[y])) return li >= 1 ? 5 : 3;
    const p0 = li === 0 ? 5 : li === 1 ? 2 : 1;
    return y === 'am' && d !== 'am' ? p0 - 1.5 : p0;
  }
  if (li >= 2 && (kat === 'C' || kat === 'V')) return 6;
  if (li >= 3 && /^(R|L|N|Y|K|J|O|H|D|DY|KL|U|F|M)$/.test(kat) && d !== y) return levenshtein(d, y) <= 3 || /^(R|L|K|M)$/.test(kat) ? 6 : 4;
  if (li >= 1 && (kat === 'P' || kat === 'X')) return 5;
  if (/^(I|S|P|V|U|X|M|K)$/.test(kat) && fiilIliskisi(dogru, yanlis)) return 5;
  if (kat === 'W' && (d === y + 's' || y === d + 's')) return 4;
  if (kat === 'G') return 4;
  if (kat === 'C') return 3;
  const zg = zamirGrubu(d); if (zg && zg === zamirGrubu(y)) return 4;
  if ((d === 'a' && y === 'an') || (d === 'an' && y === 'a')) return 4;
  if (d === 'the' && (y === 'then' || y === 'them')) return 3;
  if (kat === 'P' || kat === 'X') return 3;
  if (levenshtein(d, y) <= 2 && d.length >= 4) return 3;
  if (kat === 'W' && d.length >= 3) return 1;
  return 0;
}

/* ---------------- Türkçe mantığıyla gör (siralama.js) ---------------- */
function siraVeri(en) { const S = window.NE_SIRA; if (!S) return null; return S[en.toLowerCase().replace(/[.,!?;:"“”]/g, '').replace(/\s+/g, ' ').trim()] || null; }
const TM_RENK = ['#ffd98a', '#9ff0c8', '#8fd8ff', '#ffb3c8', '#c9b8ff', '#ffe14d', '#b6e35a', '#f7c873', '#80cbc4', '#ce93d8'];
function siraHtml(en) {
  const v = siraVeri(en);
  if (!v) return '';
  const t = tokenle(en), gr = []; let p = 0;
  v.c.forEach((g, i) => { gr.push({ en: t.slice(p, p + g[0]).join(' '), tr: g[1], b: g[2] || 0, i }); p += g[0]; });
  if (p !== t.length) return '';
  function cip(g, tr, dogal) {
    const ortuk = tr && g.b === 1, yok = tr && g.b === 2;
    const yazi2 = tr ? (yok ? '(' + g.tr + ')' : ortuk && dogal ? '(' + g.tr + ')' : g.tr) : g.en;
    return '<span class="tm-cip' + (ortuk || yok ? ' soluk' : '') + '" style="--c:' + TM_RENK[g.i % TM_RENK.length] + '">' + esc(yazi2) + '</span>';
  }
  const dogal = v.o.map(i => gr[i]).filter(g => g && g.b !== 2);
  return '<div class="tm"><div class="tm-baslik">Türkçe mantığıyla</div>' +
    '<div class="tm-satir"><i>Türkçe</i>' + dogal.map(g => cip(g, true, true)).join('') + '</div>' +
    '<div class="tm-satir"><i>İngilizce sırası</i>' + gr.map(g => cip(g, true, false)).join('') + '</div>' +
    '<div class="tm-satir"><i>İngilizce</i>' + gr.map(g => cip(g, false)).join('') + '</div></div>';
}
function tmDugme(en) { const h = siraHtml(en); return h ? '<button class="tm-ac">Türkçe mantığıyla gör</button><div class="tm-kutu" style="display:none">' + h + '</div>' : ''; }
function tmBagla(kap) {
  kap.querySelectorAll('.tm-ac').forEach(b => { b.onclick = () => { const k = b.nextSibling; const ac = k.style.display === 'none'; k.style.display = ac ? 'block' : 'none'; b.textContent = ac ? 'Gizle' : 'Türkçe mantığıyla gör'; }; });
}
function dersMetni(m) { return esc(m).replace(/\{([^}]*)\}/g, '<em>$1</em>'); }
function dersVarMi(r) { return !!r && !r.karma && cumleliMi(r) && ((r.ders && r.ders.length) || r.rule); }

/* ---------------- seviye testi: uyarlanır, 14 soru ---------------- */
const ST_SORU = 14, ST_AD = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İyi', C1: 'İleri', C2: 'Usta' };
function stHavuz(l) { const o = []; seviyePaketleri(l).forEach(p => paketKelimeleri(p.id).forEach(w => { if (w.d && w.d.length >= 1 && w.en.indexOf(' ') < 0) o.push(w); })); return o; }
function stTahmin(k) {
  let en = -Infinity, t = 0;
  for (let c = 0; c < SEVIYELER.length; c++) {
    let ll = 0;
    k.forEach(x => { const p = x.sev <= c ? 0.9 : x.sev === c + 1 ? 0.45 : 0.25; ll += Math.log(x.ok ? p : 1 - p); });
    if (ll > en + 1e-9) { en = ll; t = c; }
  }
  return t;
}
// seçilen ya da bulunan seviyeyi uygula: o seviyeye kadar her şey açılır, hiçbir şey kilitlenmez
function seviyeUygula(l) {
  const li = SEVIYELER.indexOf(l);
  if (!kayit.baslangic || SEVIYELER.indexOf(kayit.baslangic) < li) kayit.baslangic = l;
  C.rivals.forEach(r => { const ri = SEVIYELER.indexOf(r.lvl); if (ri >= 0 && ri < li) kayit.acik[r.id] = true; });
  (C.packs || []).forEach(p => { const pi = SEVIYELER.indexOf(p.lvl); if (pi >= 0 && pi < li) kayit.acik[p.id] = true; });
  kayit.acik[seviyeRakipleri(l)[0].id] = true;
  kayit.sonLvl = l;
  kaydet();
}

/* ---------------- kısa sözlük: joker ve mezarlık için (paketlerde olmayan işlev kelimeleri) ---------------- */
const ISLEV = {
  am: '-ım (be)', is: '-dır (be)', are: '-dır (be, çoğul)', was: '-dı (be, geçmiş)', were: '-dı (be, geçmiş, çoğul)', be: 'olmak', been: 'olmuş (V3)', being: 'olma',
  the: 'belirli tanımlık', a: 'bir', an: 'bir (sesliden önce)', to: '-e / -mek', of: '-in / -nın', in: 'içinde / -de', on: 'üstünde / -de', at: '-de (nokta)',
  for: 'için / -dır', with: 'ile', from: '-den', by: 'tarafından / ile', and: 've', but: 'ama', or: 'veya', not: 'değil', no: 'hayır / hiç',
  do: 'yardımcı fiil (geniş)', does: 'yardımcı fiil (o)', did: 'yardımcı fiil (geçmiş)', have: 'sahip olmak / -miş', has: 'sahip (o) / -miş', had: '-mişti',
  will: '-ecek', would: '-erdi', can: '-ebilir', could: '-ebilirdi', should: '-meli', must: '-meli (zorunlu)', may: '-ebilir (izin)', might: '-ebilir (olasılık)',
  this: 'bu', that: 'şu / ki', these: 'bunlar', those: 'şunlar', there: 'orada / var', here: 'burada', what: 'ne', where: 'nerede', when: 'ne zaman / -dığında',
  why: 'neden', how: 'nasıl', who: 'kim / -an', which: 'hangi / ki', whose: 'kimin', if: 'eğer', than: '-den (kıyas)', as: 'gibi / kadar', so: 'bu yüzden / o kadar',
  very: 'çok', too: 'de / fazla', also: 'ayrıca', some: 'biraz / bazı', any: 'hiç / herhangi', many: 'çok (sayılan)', much: 'çok (sayılamayan)', more: 'daha',
  most: 'en', every: 'her', all: 'hepsi', about: 'hakkında', into: 'içine', up: 'yukarı', out: 'dışarı', off: 'kapalı / -den uzak', over: 'üstünde / bitti',
  after: 'sonra', before: 'önce', because: 'çünkü', since: '-den beri', until: '-e kadar', while: 'iken', although: '-e rağmen', yet: 'henüz', just: 'az önce / sadece', never: 'asla', always: 'her zaman'
};
function anlamBul(t) {
  const k = String(t || '').toLowerCase();
  const w = sozluk()[k]; if (w) return kisaAnlam(w.tr);
  if (ISLEV[k]) return ISLEV[k];
  const zg = zamirGrubu(k); if (zg) return zg.tr[k];
  return '';
}
