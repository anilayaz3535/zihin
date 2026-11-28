const $ = s => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
const bgC = document.createElement('canvas'), bgx = bgC.getContext('2d');
const FONT = "Fredoka, Poppins, 'Trebuchet MS', sans-serif";   // videodaki gibi yuvarlak, tombul yazı
let W = 0, H = 0, DPR = 1, L = {};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function renkKat(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)), 0, 255); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; }
function mkRng(s) { return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646); }

// Tahta karolarının renkleri (videodaki şeker karolar): aynı renkten 3+ karo yan yana / alt alta gelince toplu patlar (game.js renkGruplari)
const KARO_RENK = ['#f2453d', '#ffbc1f', '#3cbb4a', '#2b91ea', '#b04fd8'];

/* ---------------- yerleşim (kafe teması: Gemini videosundaki düzen) ----------------
   Dikey: üstte ⭐ skor + düzey (sol), sistem düğmeleri (orta), "Hedef Cümleler" halkası (sağ);
   ortada krem Türkçe şerit, süre çubuğu ve gri karo tahtası; solda ince hata göstergesi;
   altta mürdüm panel (#pow): CÜMLE BOMBASI rozeti, 4 güç kutusu (Joker / Yavaş), sarı bölüm ilerleme çubuğu.
   Yatay: solda skor ve düzey, ortada tahta, sağda sistem düğmeleri, halka ve alt panelin öğeleri.
   Arka plandaki kafe resmi CSS'te (extra.css, --kafe); tuval o kısımları boş bırakır.
   Tahtanın sütun/satır sayısı her turda hedefe göre engine.js tahtaYerlesim'de hesaplanır. */
// telefonun güvenli alanı (çentik, kamera adası, ana ekran çubuğu): CSS env(safe-area-inset-*) okunur.
// Tarayıcıda ve çentiksiz ekranda hepsi 0'dır; uygulamada (viewport-fit=cover) HUD ve alt panel bu boşlukları bırakır.
let guvenliProbe = null;
function guvenliAlan() {
  try {
    if (!guvenliProbe) {
      guvenliProbe = document.createElement('div');
      guvenliProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(guvenliProbe);
    }
    const c = getComputedStyle(guvenliProbe), n = v => Math.max(0, Math.round(parseFloat(v) || 0));
    return { t: n(c.paddingTop), r: n(c.paddingRight), b: n(c.paddingBottom), l: n(c.paddingLeft) };
  } catch (e) { return { t: 0, r: 0, b: 0, l: 0 }; }
}
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  const E = guvenliAlan();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  bgC.width = cv.width; bgC.height = cv.height;
  const land = W / H >= 1.1;
  document.body.classList.toggle('land', land);
  document.body.classList.toggle('port', !land);
  const o = { land, fm: 6 };
  const rs = document.documentElement.style;
  const pw2 = document.getElementById('pow');
  o.guvenli = E;
  rs.setProperty('--gb', E.b + 'px');
  if (land) {
    const pad = 10, pL = pad + E.l, pR = pad + E.r, pT = pad + E.t, pB = pad + E.b;
    const pw = Math.round(clamp(Math.min((W - E.l - E.r) * .19, (H - E.t - E.b) * .46), 116, 200));
    const ix = pL + pw + 24, ixR = pR + pw + 24, top = pT + 2;
    o.in = { x: ix, y: top, w: W - ix - ixR, h: H - top - pB };
    const I = o.in;
    o.gauge = { x: ix - 17, y: I.y + I.h * .2, w: 10, h: I.h * .8 - 4 };
    o.skor = { x: pL, y: top, w: pw, h: Math.round(clamp(pw * .36, 44, 62)) };
    o.sev = { x: pL, y: o.skor.y + o.skor.h + 8, w: pw, h: 22 };
    const sysH = 36 + 10, rd = Math.round(clamp(Math.min(pw * .5, H * .2), 58, 84));
    o.hedefP = { x: W - pR - pw + (pw - rd) / 2, y: pT + sysH + 4, w: rd, h: rd };
    const py = o.hedefP.y + rd + 10, ph = H - pB - py;
    Object.assign(pw2.style, { left: (W - pR - pw) + 'px', top: py + 'px', width: pw + 'px', height: ph + 'px', bottom: '', right: '' });
    rs.setProperty('--sh', Math.round(clamp((ph - 20 - 56 - 30 - 24) / 2, 24, 46)) + 'px');
  } else {
    const pad = 8, pT = pad + E.t, pL = pad + E.l, pR = pad + E.r;
    const hudH = Math.round(clamp(H * .072, 50, 64)), botH = Math.round(clamp(H * .13, 96, 116));
    const inY = pT + hudH + 16, inX = pL + 18, inB = H - botH - E.b - 6;   // +16: Türkçe şeridin üstündeki konu sekmesi düzey etiketine değmesin
    o.in = { x: inX, y: inY, w: W - inX - pR, h: inB - inY };
    o.gauge = { x: pL + 1, y: inY + o.in.h * .2, w: 9, h: o.in.h * .8 - 4 };
    const rd = hudH + 6;
    o.skor = { x: pL, y: pT, w: Math.round(clamp(W * .34, 118, 170)), h: Math.round(hudH * .62) };
    o.sev = { x: pL + 6, y: o.skor.y + o.skor.h + 4, w: o.skor.w - 6, h: Math.round(hudH * .3) };
    o.hedefP = { x: W - pR - rd, y: pT - 3, w: rd, h: rd };
    Object.assign(pw2.style, { left: '', top: '', width: '', height: '', bottom: '', right: '' });
    rs.setProperty('--bh', (botH + E.b) + 'px');
    rs.setProperty('--sh', Math.round(clamp(botH - 62, 32, 46)) + 'px');
    rs.setProperty('--rz', Math.round(clamp(botH - 48, 44, 60)) + 'px');   // bomba rozeti: üstündeki iki satırlık yazıyla panele sığsın
    rs.setProperty('--sx', Math.round((o.skor.x + o.skor.w + o.hedefP.x) / 2) + 'px');
    rs.setProperty('--sy', Math.round(pT + (hudH - 36) / 2) + 'px');
  }
  const I = o.in;
  // yazı ölçüleri (açılır yazılar, Türkçe şeridi, uyarılar bunlara göre büyür / küçülür)
  o.stripH = Math.round(clamp(I.h * .07, 26, 44));
  o.bh = Math.round(o.stripH * .86);
  L = o;
  SPR.clear();
  yerlesimYenile();           // açık tahtanın hücre ölçüleri yeni ekrana göre (engine.js)
  renderBG();
}

/* ---------------- drawing helpers ---------------- */
function rr(x, X, Y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + r);
  x.lineTo(X + w, Y + h - r); x.quadraticCurveTo(X + w, Y + h, X + w - r, Y + h); x.lineTo(X + r, Y + h);
  x.quadraticCurveTo(X, Y + h, X, Y + h - r); x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y); x.closePath();
}
// yazıyı koyu kenarlı (videodaki gibi) yazar: önce kalın kenar, sonra dolgu
function kenarliYaz(x, s, X, Y, dolgu, kenar, kal) {
  x.save(); x.lineJoin = 'round'; x.miterLimit = 2; x.lineWidth = kal; x.strokeStyle = kenar; x.strokeText(s, X, Y);
  x.fillStyle = dolgu; x.fillText(s, X, Y); x.restore();
}
// krem şerit / balon: videodaki Türkçe şerit gibi açık krem, kahverengi kenar, hafif gölge
function kremKutu(x, X, Y, w, h, r, kenar) {
  x.save(); x.shadowColor = 'rgba(40,16,8,.35)'; x.shadowBlur = 10; x.shadowOffsetY = 3;
  rr(x, X, Y, w, h, r); const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#f3dfc2');
  x.fillStyle = g; x.fill(); x.restore();
  rr(x, X, Y, w, h, r); x.lineWidth = 2; x.strokeStyle = kenar || '#c99a6b'; x.stroke();
  rr(x, X + 3, Y + 3, w - 6, h - 6, Math.max(2, r - 3)); x.lineWidth = 1; x.strokeStyle = 'rgba(160,110,70,.35)'; x.stroke();
}
// koyu, yarı saydam hap (skor, sayaç): videodaki üst köşe kutuları
function hapKutu(x, X, Y, w, h) {
  rr(x, X, Y, w, h, h / 2); x.fillStyle = 'rgba(52,44,64,.78)'; x.fill();
  x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,240,220,.35)'; x.stroke();
}

/* ---------------- karo resmi ----------------
   Şekerleme görünümlü yuvarlak köşeli karo: renk, parlak üst, gölgeli alt, beyaz yazı.
   Yazı karoya yatay sığmıyorsa (çok sütunlu tahtada uzun kelime) dikey yazılır; tek harf her zaman büyük ve yatay.
   Sınırlı önbellek: en uzun süredir kullanılmayan resimler silinir (telefon tarayıcısının tuval belleği dolmasın). */
const SPR = new Map(), SPR_MAX = 260;
function karoYaziOlc(text, w, h) {
  const m = bgx; m.save(); m.font = `700 100px ${FONT}`; const w100 = Math.max(1, m.measureText(text).width) / 100; m.restore();
  const tek = [...text].length === 1;
  const iw = w - Math.max(5, w * .14), ih = h - Math.max(5, h * .14);
  const fsH = Math.min(h * (tek ? .62 : .44), iw / w100), fsV = Math.min(w * .56, ih / w100);
  const dikey = !tek && fsH < 11 && fsV > fsH * 1.15;
  return { dikey, fs: Math.max(6, Math.floor(dikey ? fsV : fsH)) };
}
// stil: 'n' renkli karo · 'kilit' hatalı cümlenin sabit karosu · 'dogru' düzeltilmiş sabit karo
function karoSprite(text, ci, w, h, stil) {
  w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h)); stil = stil || 'n';
  const key = text + '|' + ci + '|' + w + '|' + h + '|' + stil;
  let s = SPR.get(key); if (s) { SPR.delete(key); SPR.set(key, s); return s; }
  if (SPR.size >= SPR_MAX) { let n = 60; for (const [k, v] of SPR) { SPR.delete(k); v.c.width = v.c.height = 0; if (--n <= 0) break; } }
  const g = Math.ceil(Math.min(w, h) * .22) + 2, depth = Math.max(2, Math.round(h * .08));
  const c = document.createElement('canvas');
  c.width = Math.ceil((w + 2 * g) * DPR); c.height = Math.ceil((h + depth + 2 * g) * DPR);
  const x = c.getContext('2d'); x.scale(DPR, DPR);
  const m = Math.min(w, h), r = m * .34;
  const kilit = stil === 'kilit', dogru = stil === 'dogru';
  const col = kilit ? '#8a7488' : dogru ? '#2fae57' : KARO_RENK[ci % KARO_RENK.length];
  /* JÖLE KARO (28 Kasım 2026): yumuşak gölge ve alt kalınlık, içten aydınlanan gövde, iç kenar ışıltısı,
     üstte geniş parlak yansıma, altta ışığın geçtiği açık hilal, iki kabarcık ışık noktası */
  x.save(); x.shadowColor = 'rgba(30,12,20,.38)'; x.shadowBlur = Math.max(3, h * .12); x.shadowOffsetY = depth * .8;
  rr(x, g, g + depth, w, h, r); x.fillStyle = renkKat(col, .5); x.fill(); x.restore();
  rr(x, g, g, w, h, r); x.save(); x.clip();
  const gv = x.createRadialGradient(g + w * .38, g + h * .3, m * .05, g + w * .5, g + h * .55, Math.max(w, h) * .75);
  gv.addColorStop(0, renkKat(col, 1.45)); gv.addColorStop(.45, renkKat(col, 1.08)); gv.addColorStop(1, renkKat(col, .78));
  x.fillStyle = gv; x.fillRect(g, g, w, h);
  // alt hilal: ışık jöleden geçip altta parlar
  const ah = x.createRadialGradient(g + w * .5, g + h * 1.05, 0, g + w * .5, g + h * 1.05, h * .55);
  ah.addColorStop(0, hexA(renkKat(col, 1.6), kilit ? .15 : .55)); ah.addColorStop(1, hexA(col, 0));
  x.fillStyle = ah; x.fillRect(g, g, w, h);
  // iç kenar ışıltısı
  x.lineWidth = Math.max(2, m * .12); x.strokeStyle = hexA(renkKat(col, 1.5), kilit ? .2 : .45); rr(x, g, g, w, h, r); x.stroke();
  x.restore();
  x.save(); x.lineWidth = Math.max(1, m * .03); x.strokeStyle = kilit ? '#ff8a96' : renkKat(col, .62); rr(x, g, g, w, h, r); x.stroke(); x.restore();
  // üst yansıma: kenarlara yakın, yukarıda yoğun, aşağı doğru sönen geniş parıltı
  x.save(); rr(x, g + w * .1, g + h * .07, w * .8, h * .4, r * .85);
  const pg = x.createLinearGradient(0, g + h * .07, 0, g + h * .47); pg.addColorStop(0, 'rgba(255,255,255,' + (kilit ? .2 : .7) + ')'); pg.addColorStop(.6, 'rgba(255,255,255,' + (kilit ? .06 : .18) + ')'); pg.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = pg; x.fill(); x.restore();
  // kabarcık ışıkları
  x.save(); x.globalAlpha = kilit ? .35 : .95; x.fillStyle = '#ffffff';
  x.beginPath(); x.ellipse(g + Math.max(r * .62, w * .15), g + Math.max(r * .5, h * .2), Math.max(1.8, m * .075), Math.max(1.4, m * .05), -.6, 0, 7); x.fill();
  x.globalAlpha *= .8; x.beginPath(); x.arc(g + Math.max(r * .62, w * .15) + m * .13, g + Math.max(r * .5, h * .2) - m * .02, Math.max(1, m * .028), 0, 7); x.fill(); x.restore();
  // yazı: beyaz, karonun koyu tonunda kalın kenar
  const o = karoYaziOlc(text, w, h);
  x.save(); x.translate(g + w / 2, g + h / 2 + 1);
  if (o.dikey) x.rotate(-Math.PI / 2);
  x.font = `700 ${o.fs}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineWidth = Math.max(2, o.fs * .22); x.strokeStyle = kilit ? 'rgba(60,20,40,.75)' : renkKat(col, .48); x.strokeText(text, 0, o.fs * .04);
  x.fillStyle = '#ffffff'; x.fillText(text, 0, o.fs * .04);
  x.restore();
  s = { c, w, h, g, cw: c.width / DPR, chh: c.height / DPR };
  SPR.set(key, s); return s;
}
// karo resmini merkezi (cx, cy) olacak şekilde çizer
function karoCiz(s, cx, cy, alpha = 1, sx = 1, sy = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(sx, sy);
  ctx.drawImage(s.c, -s.w / 2 - s.g, -s.h / 2 - s.g, s.cw, s.chh);
  ctx.restore();
}

/* ---------------- sabit arka plan ----------------
   Kafe resmi sayfanın arka planında (CSS --kafe). Tuvalin bu katmanında yalnız üstte hafif bir gölge (skor ve halka
   açık pencerelerin önünde okunsun) ve soldaki hata göstergesinin kabı çizilir. */
function renderBG() {
  const g = bgx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  if (!L.in) return;
  const land = L.land;
  let gr = g.createLinearGradient(0, 0, 0, Math.min(H * .22, 150));
  gr.addColorStop(0, 'rgba(40,20,28,.28)'); gr.addColorStop(1, 'rgba(40,20,28,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, Math.min(H * .22, 150));
  // hata göstergesi: krem kenarlı kapsül, içinde 10 dilim
  const Gg = L.gauge;
  g.save(); g.shadowColor = 'rgba(30,10,16,.4)'; g.shadowBlur = 6;
  rr(g, Gg.x - 3, Gg.y - 3, Gg.w + 6, Gg.h + 6, (Gg.w + 6) / 2); g.fillStyle = 'rgba(52,36,58,.85)'; g.fill(); g.restore();
  rr(g, Gg.x - 3, Gg.y - 3, Gg.w + 6, Gg.h + 6, (Gg.w + 6) / 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,236,212,.7)'; g.stroke();
  for (let i = 1; i < HATA_MAX; i++) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(Gg.x + 1, Gg.y + Gg.h * i / HATA_MAX, Gg.w - 2, 1); }
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (land) { g.font = `700 11px ${FONT}`; g.translate(Gg.x - 9, Gg.y + Gg.h * .8); g.rotate(-Math.PI / 2); kenarliYaz(g, tt('HATA'), 0, 0, '#ffd9d9', 'rgba(70,20,30,.85)', 3); }
  else { g.font = `13px sans-serif`; g.fillText('⚠️', Gg.x + Gg.w / 2, Gg.y - 13); }
  g.restore();
}

/* ---------------- particles ---------------- */
function addP(o) { if (P.length < 1600) P.push(o); return o; }
function sparkBurst(x, y, col, n, sp = 260, life = .7, type = 'streak', gr = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (.35 + Math.random() * .75);
    addP({ type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (.6 + Math.random() * .6), max: life, col, s: rnd(1.2, 2.6), gr, drag: .93 });
  }
}
function ring(x, y, col, r0, r1, life = .45, w = 3) { addP({ type: 'ring', x, y, vx: 0, vy: 0, r0, r1, life, max: life, col, s: w, gr: 0, drag: 1 }); }
function shards(x, y, w, h, col, n) {
  for (let i = 0; i < n; i++) addP({ type: 'shard', x: x + rnd(-w / 2, w / 2), y: y + rnd(-h / 2, h / 2), vx: rnd(-220, 220), vy: rnd(-320, -60), life: rnd(.5, .9), max: .9, col, s: rnd(3, 7), rot: rnd(0, 6), vr: rnd(-12, 12), gr: 900, drag: .99 });
}
function rocket(x, y, tx, ty, col) {
  const g = 520, h = Math.max(40, y - ty);
  addP({ type: 'rocket', x, y, vx: (tx - x) / Math.sqrt(2 * h / g), vy: -Math.sqrt(2 * g * h), life: 3, max: 3, col, s: 2.5, gr: g, drag: 1 });
}
function firework(x, y, col) {
  Ses.cal('patlama', { ses: .28, hiz: 1.5 });
  const cols = [col, col, col, '#ffffff'];
  const n = 54;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd(-.05, .05), v = rnd(140, 330);
    addP({ type: 'streak', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.9, 1.5), max: 1.5, col: pick(cols), s: rnd(1.4, 2.4), gr: 150, drag: .975, tw: Math.random() < .4 });
  }
  addP({ type: 'dot', x, y, vx: 0, vy: 0, life: .18, max: .18, col: '#ffffff', s: 26, gr: 0, drag: 1 });
}
function starFan(x, y) {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * .2 + rnd(-.05, .05), v = rnd(520, 760);
    addP({ type: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(1.1, 1.5), max: 1.5, col: '#ffe066', s: rnd(6, 9), rot: 0, vr: rnd(-6, 6), gr: 380, drag: .985 });
  }
}
function smoke(x, y, n) {
  for (let i = 0; i < n; i++) addP({ type: 'smoke', x: x + rnd(-20, 20), y: y + rnd(-10, 10), vx: rnd(-40, 40), vy: rnd(-30, 5), life: rnd(1.4, 2.2), max: 2.2, col: '#9aa3b8', s: rnd(18, 30), gr: -6, drag: .985 });
}
function popup(text, x, y, col, size, life = 1.1, vy = -46) { POP.push({ text, x, y, col, size, life, max: life, vy }); }
function banner(text, sub, col, dur) { BAN.push({ text, sub, col, t: 0, dur }); }

function updateParticles(dt) {
  const f = dt * 60;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= dt;
    if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
    const dr = Math.pow(p.drag, f);
    p.vx *= dr; p.vy = p.vy * dr + p.gr * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.type === 'rocket') {
      if (Math.random() < .9) addP({ type: 'dot', x: p.x + rnd(-1.5, 1.5), y: p.y + 4, vx: rnd(-20, 20), vy: rnd(10, 50), life: rnd(.25, .5), max: .5, col: '#ffd27a', s: rnd(1, 2.2), gr: 60, drag: .96 });
      if (p.vy >= -15) { firework(p.x, p.y, p.col); p.life = 0; }
    } else if (p.type === 'star') {
      addP({ type: 'dot', x: p.x, y: p.y, vx: rnd(-25, 25), vy: rnd(-10, 30), life: rnd(.3, .6), max: .6, col: Math.random() < .5 ? '#ffe066' : '#fff6c8', s: rnd(1, 2.4), gr: 80, drag: .95 });
    }
  }
  for (let i = POP.length - 1; i >= 0; i--) { const p = POP[i]; p.life -= dt; p.y += p.vy * dt; p.vy *= Math.pow(.96, f); if (p.life <= 0) POP.splice(i, 1); }
  for (let i = BAN.length - 1; i >= 0; i--) { BAN[i].t += dt; if (BAN[i].t > BAN[i].dur) BAN.splice(i, 1); }
}
function star(x, cx, cy, r, rot) {
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }
  x.closePath();
}
function drawParticles() {
  ctx.save();
  for (const p of P) if (p.type === 'smoke') {
    const k = p.life / p.max, r = p.s * (1 + (1 - k) * 2.2);
    ctx.globalAlpha = .28 * k; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, 'rgba(170,178,196,1)'); g.addColorStop(1, 'rgba(120,128,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
  }
  // jöle damlacıkları (jole.js): normal karışım, parlak nokta
  for (const p of P) if (p.type === 'damla') {
    const k = p.life / p.max, r = Math.max(1, p.s * (0.6 + 0.4 * k)), uz = Math.min(1.8, 1 + Math.hypot(p.vx, p.vy) / 900);
    ctx.globalAlpha = Math.min(1, k * 1.8);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.scale(uz, 1 / Math.sqrt(uz));
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.32, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const p of P) {
    const k = p.life / p.max;
    switch (p.type) {
      case 'streak': {
        ctx.globalAlpha = Math.min(1, k * 1.4) * (p.tw ? (.5 + .5 * Math.sin(p.life * 40)) : 1);
        ctx.strokeStyle = p.col; ctx.lineWidth = p.s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .045, p.y - p.vy * .045); ctx.stroke(); break;
      }
      case 'dot': case 'rocket': {
        ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.col;
        if (p.s > 8) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * (1.5 - k * .5)); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 1.5, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
        break;
      }
      case 'star': {
        ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 12;
        star(ctx, p.x, p.y, p.s, p.rot); ctx.fill(); ctx.fillStyle = '#fff'; star(ctx, p.x, p.y, p.s * .45, p.rot); ctx.fill(); ctx.shadowBlur = 0; break;
      }
      case 'ring': {
        ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = p.s * k + .5;
        ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r1, p.r0, k), 0, 7); ctx.stroke(); break;
      }
      case 'shard': {
        ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); break;
      }
      case 'flame': {
        const r = p.s * (.4 + k * .6);
        ctx.globalAlpha = k * .9; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, k > .6 ? 'rgba(255,240,170,1)' : 'rgba(255,160,40,1)'); g.addColorStop(.5, 'rgba(255,70,20,.7)'); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); break;
      }
    }
  }
  ctx.restore();
}


function txt(s, x, y, size, col, align = 'left', glow = null, blur = 10) {
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillStyle = col;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
  ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}
function drawPopups() {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of POP) {
    const k = p.life / p.max, a = Math.min(1, k * 2.5), sc = 1 + Math.max(0, (k - .85)) * 3;
    ctx.globalAlpha = a; ctx.font = `700 ${Math.round(p.size * sc)}px ${FONT}`;
    const hw = ctx.measureText(p.text).width / 2 + 6; p.x = clamp(p.x, hw, Math.max(hw, W - hw));
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.text, p.x, p.y);
    ctx.shadowColor = p.col; ctx.shadowBlur = 14; ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();
}
function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > maxW && line) { lines.push(line); line = w; } else line = tst; }
  if (line) lines.push(line); return lines;
}
function drawBanners() {
  const I = L.in;
  for (const b of BAN) {
    const k = b.t / b.dur, a = Math.min(1, b.t * 5, (b.dur - b.t) * 3);
    const bounce = 1 + .35 * Math.exp(-b.t * 7) * Math.cos(b.t * 22);
    const maxW = Math.min(W * .94, I.w * 1.5);
    const y = I.y + I.h * (b.sub && b.col === '#ffd23d' ? .14 : .22);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = Math.round(Math.min(I.w * .13, 50));
    ctx.font = `700 ${fs}px ${FONT}`;
    const tw = ctx.measureText(b.text).width; if (tw > maxW) { fs = Math.floor(fs * maxW / tw); ctx.font = `700 ${fs}px ${FONT}`; }
    ctx.translate(I.x + I.w / 2, y); ctx.scale(bounce, bounce);
    const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.5, b.col); g.addColorStop(1, hexA(b.col, .85));
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,8,0,.7)'; ctx.strokeText(b.text, 0, 0);
    ctx.shadowColor = b.col; ctx.shadowBlur = 26; ctx.fillStyle = g; ctx.fillText(b.text, 0, 0); ctx.fillText(b.text, 0, 0);
    ctx.shadowBlur = 0;
    if (b.sub) {
      const sfs = Math.round(fs * .46); ctx.font = `700 ${sfs}px ${FONT}`;
      const lines = wrap(b.sub, maxW * .9);
      lines.forEach((ln, i) => {
        const yy = fs * .78 + i * sfs * 1.15;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(ln, 0, yy);
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = b.col; ctx.shadowBlur = 10; ctx.fillText(ln, 0, yy); ctx.shadowBlur = 0;
      });
    }
    ctx.restore();
  }
}

