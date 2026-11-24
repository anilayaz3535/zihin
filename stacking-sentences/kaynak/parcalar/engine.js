/* =====================================================================
   TAHTA YERLEŞİMİ
   Kuyunun üstünde Türkçe hedef kutusu, altında süre çubuğu, onun altında karo tahtası.
   Sütun sayısı hedefe göre (game.js tahtaBoyut: cümlenin kelime / kelimenin harf sayısı, en az 6): hedefin
   tamamı bir satıra yatay sığar. Çok sütunlu tahtada karolar daralır, uzun kelime karonun içinde dikey yazılır.
   ===================================================================== */
// Tahtanın kullanabileceği alan: Türkçe kutusu ve süre çubuğunun altı (rehberli ilk cümlede koç baloncuğuna da yer kalır)
const SURE_H = 10;
function tahtaAlani(R) {
  const I = L.in, ph = promptYuksekligi(R), koc = D && D.ilkCumle ? Math.round(clamp(L.stripH * 1.5, 44, 60)) : 0;
  const top = I.y + 5 + ph + 6 + SURE_H + 8;
  return { ph, top, bw: I.w - 8, bh: I.y + I.h - 5 - top - koc };
}
function hucreBoyu(cols, rows, A) { const cw = A.bw / cols; let ch = A.bh / rows; if (cols <= 6) ch = Math.min(ch, cw * 1.3); return { cw, ch }; }
// Satır sayısı: hedefin (ve tuzakların) en uzun kelimesi karoda en büyük yazıyla okunacak şekilde seçilir;
// yazı yeterince büyükse (12 px) çok satır tercih edilir. Çok sütunlu tahtada karolar uzar, kelime dikey yazılır.
function tahtaSatir(cols, R) {
  const A = tahtaAlani(R), enAz = R && R.tip === 'sav' && R.satir ? R.m.tokens.length + 2 : 3, enCok = Math.max(enAz, L.land ? 5 : 7);
  const yazilar = !R ? [] : R.tip === 'sav' ? (R.satir ? [] : R.m.tokens).concat(R.duzelt ? [R.duzelt] : []) : hedefTumu(R).concat(R.cel || []);
  let best = enCok, bestP = -1;
  for (let r = enAz; r <= enCok; r++) {
    const { cw, ch } = hucreBoyu(cols, r, A), p = Math.max(2, Math.min(cw, ch) * 0.07);
    let min = 99; yazilar.forEach(x => { min = Math.min(min, karoYaziOlc(x, cw - p, ch - p).fs); });
    const puan = Math.min(min, 12) * 100 + r;   // önce okunurluk, eşitse çok satır
    if (puan > bestP) { bestP = puan; best = r; }
  }
  return best;
}
function tahtaYerlesim() {
  const T = G.T; if (!T || !L.in) return;
  const I = L.in, A = tahtaAlani(G.R);
  L.promptAlan = { x: I.x + 4, y: I.y + 5, w: I.w - 8, h: A.ph };
  L.sureAlan = { x: I.x + 8, y: L.promptAlan.y + A.ph + 6, w: I.w - 16, h: SURE_H };
  const { cw, ch } = hucreBoyu(T.cols, T.rows, A);
  T.cw = cw; T.ch = ch; T.x = I.x + 4; T.y = A.top + Math.max(0, (A.bh - ch * T.rows) * 0.3);
  karolar(T).forEach(k => { const p = hucreMerkez(k.r, k.c, k.span); k.x = p.x; if (!k.dus) k.y = p.y; });
}
function yerlesimYenile() { if (G.T) tahtaYerlesim(); }
function hucreMerkez(r, c, span) { const T = G.T; return { x: T.x + (c + (span || 1) / 2) * T.cw, y: T.y + (r + 0.5) * T.ch }; }
function hucreBul(x, y) {
  const T = G.T; if (!T || !T.cw) return null;
  const c = Math.floor((x - T.x) / T.cw), r = Math.floor((y - T.y) / T.ch);
  if (r < 0 || r >= T.rows || c < 0 || c >= T.cols) return null;
  if (T.kilitli[r][c]) { for (let q = c; q >= 0; q--) { const k = T.h[r][q]; if (k && k.span && q + k.span > c) return { r, c: q }; } return null; }
  return { r, c };
}
// tahtada süren hareket: düşen / beliren karo ya da patlama varken yeni hamle ve sıradaki kaskad adımı bekler
function tahtaMesgul() { const T = G.T; return !T || T.kaskad || !!T.hareket || PATLAYAN.some(p => p.t < 0.18); }

/* =====================================================================
   GÜNCELLEME
   ===================================================================== */
function update(dt) {
  G.t += dt;
  const I = L.in;
  if (G.state !== 'paused' && G.state !== 'menu') {
    const liste = ZAM.splice(0), calis = [];
    for (const z of liste) { z.t -= dt; if (z.t <= 0) calis.push(z.f); else ZAM.push(z); }
    calis.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  }
  if (D && D.online) onlineTik();
  ilkTik(dt);                                         // rehberli ilk cümlenin koçu (ilk.js)
  if (G.state === 'playing') {
    G.slowT = Math.max(0, G.slowT - dt);
    const R = G.R;
    if (R && !R.bitti) {
      R.t += dt;
      if (!R.tahtaHazir && !R.bekle) { G.spawnT -= dt; if (G.spawnT <= 0) tahtaDoldur(R); }
      sureTik(dt); bekleyenTik(dt);
    }
  } else if (G.state === 'dying') {
    G.dieT += dt;
    if (Math.random() < dt * 8) sparkBurst(rnd(I.x, I.x + I.w), rnd(I.y + I.h * 0.3, I.y + I.h), '#ff5030', 12, 240, 0.7);
    if (G.dieT > 1.7) { G.state = 'over'; dojoBitti(false); }
  }
  if (G.state !== 'paused') {
    tahtaTik(dt);
    if (G.ipucu) { G.ipucu.t -= dt; if (G.ipucu.t <= 0 || G.ipucu.R !== G.R) G.ipucu = null; }
    if (G.duz) { G.duz.t -= dt; if (G.duz.t <= 0) G.duz = null; }
    if (G.sweep >= 0) { G.sweep += dt * 1.3; if (G.sweep > 1.6) G.sweep = -1; }
    paraTik(dt);                                      // puan kasası: uçan paralar ve seri hâlinde yükselen sayaç (game.js)
    G.scorePulse = Math.max(0, G.scorePulse - dt * 2.5); G.comboPulse = Math.max(0, G.comboPulse - dt * 3);
    G.shake *= Math.pow(0.0009, dt); if (G.shake < 0.2) G.shake = 0;
    G.flash = Math.max(0, G.flash - dt * 1.2);
    G.gauge = clamp(G.hata / HATA_MAX, 0, 1);
    G.gaugeShown += (G.gauge - G.gaugeShown) * Math.min(1, dt * 5);
    if (G.ofke && Math.random() < dt * 30) addP({ type: 'flame', x: rnd(I.x, I.x + I.w), y: I.y + I.h + rnd(-4, 4), vx: rnd(-10, 10), vy: rnd(-90, -40), life: rnd(0.4, 0.8), max: 0.8, col: '#ff8a2a', s: rnd(6, 12), gr: -30, drag: 0.97 });
    if (Math.random() < dt * 3) addP({ type: 'dot', x: rnd(0, W), y: H + 4, vx: rnd(-8, 8), vy: rnd(-40, -18), life: rnd(4, 7), max: 7, col: Math.random() < 0.6 ? '#ffe3a3' : '#fff6e0', s: rnd(0.8, 1.8), gr: 0, drag: 1 });
    updateParticles(dt);
  }
  altCubukGuncelle();
}
// karoların hareketi: yer değiştirme kayarak, düşüş yerçekimiyle, yeni karo büyüyerek; hareket bitince kaskad adımı
function tahtaTik(dt) {
  for (let i = PATLAYAN.length - 1; i >= 0; i--) { PATLAYAN[i].t += dt; if (PATLAYAN[i].t > 0.5) PATLAYAN.splice(i, 1); }
  for (let i = DUSEN.length - 1; i >= 0; i--) { const k = DUSEN[i]; k.vy += 1800 * dt; k.y += k.vy * dt; k.x += k.vx * dt; k.dt += dt; if (k.y > H + 80 || k.dt > 2) DUSEN.splice(i, 1); }
  const T = G.T; if (!T || !T.cw) return;
  let hareket = false;
  for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
    const k = T.h[r][c]; if (!k) continue;
    const p = hucreMerkez(r, c, k.span);
    if (k.geri) {
      // yanlış yere bırakılan karo hedefe uzanır, sonra yerine geri seker
      const g = k.geri; g.t += dt;
      const q = hucreMerkez(g.r, g.c), hedef = g.t < 0.12 ? { x: lerp(p.x, q.x, 0.55), y: lerp(p.y, q.y, 0.55) } : p;
      k.x += (hedef.x - k.x) * Math.min(1, dt * 22); k.y += (hedef.y - k.y) * Math.min(1, dt * 22);
      if (g.t > 0.42) { k.geri = null; k.x = p.x; k.y = p.y; }
    } else if (k.dus) {
      k.vy += 2600 * dt; k.y += k.vy * dt; k.x += (p.x - k.x) * Math.min(1, dt * 18);
      if (k.y >= p.y) { k.y = p.y; k.vy = 0; k.dus = false; k.ez = 1; }
      else hareket = true;
    } else {
      const dx = p.x - k.x, dy = p.y - k.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.6) { k.x += dx * Math.min(1, dt * 16); k.y += dy * Math.min(1, dt * 16); } else { k.x = p.x; k.y = p.y; }
    }
    if (k.buyu) { k.olcek = Math.min(1, k.olcek + dt * 5); if (k.olcek >= 1) k.buyu = false; else hareket = true; }
    k.ez = Math.max(0, (k.ez || 0) - dt * 5); k.parla = Math.max(0, k.parla - dt); k.err = Math.max(0, k.err - dt * 1.2); k.hint = Math.max(0, k.hint - dt);
    if (k.anlamT > 0) k.anlamT -= dt;
  }
  T.hareket = hareket;
  if (T.kaskad && !hareket && !PATLAYAN.some(p => p.t < 0.18) && G.state !== 'menu') kaskadAdim();
}

/* =====================================================================
   ÇİZİM
   ===================================================================== */
function draw() {
  const t = G.t;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);                          // arkada kafe resmi (CSS)
  const menude = G.state === 'menu';
  if (document.body.classList.contains('menude') !== menude) document.body.classList.toggle('menude', menude);   // menüde alt panel ve sistem düğmeleri gizli (CSS)
  if (G.shake) ctx.translate(rnd(-1, 1) * G.shake, rnd(-1, 1) * G.shake);
  if (!menude) ctx.drawImage(bgC, 0, 0, W, H);
  drawTahta(t);
  if (!menude) drawPrompt(t); else G.promptBox = null;
  drawSure(t);
  drawStatus(t);
  drawDuz(t);
  drawSurukle(t);
  drawIpucu(t);
  if (!menude) { drawHUD(t); drawPara(t); }
  drawParticles();
  drawPopups();
  drawBanners();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const danger = clamp((G.gaugeShown - 0.55) / 0.45, 0, 1);
  if (danger > 0 && G.state !== 'menu') {
    const a = danger * (0.22 + 0.14 * Math.sin(t * 9));
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,0,30,0)'); g.addColorStop(1, `rgba(255,0,30,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (G.ofke) {
    const a = 0.25 + 0.15 * Math.sin(t * 10);
    ctx.save(); ctx.strokeStyle = `rgba(255,138,42,${a})`; ctx.lineWidth = 10; ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 30; ctx.strokeRect(5, 5, W - 10, H - 10); ctx.restore();
  }
  if (G.flash > 0) { ctx.globalAlpha = Math.min(0.55, G.flash); ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function karoBoyut(T, k) { const p = Math.max(2, Math.min(T.cw, T.ch) * 0.07); return { w: T.cw * (k.span || 1) - p, h: T.ch - p }; }
function karoStil(k) { return k.kilit ? (k.dogru ? 'dogru' : 'kilit') : 'n'; }
function drawTahta(t) {
  const T = G.T; if (!T || !T.cw) return;
  const R = G.R, I = L.in, bw = T.cols * T.cw, bh = T.rows * T.ch;
  ctx.save();
  // çerçeve (videodaki gri-mavi tahta) ve hücre yuvaları
  const bosluk = Math.max(1.5, Math.min(T.cw, T.ch) * 0.05), kr = Math.min(T.cw, T.ch) * 0.2, cp = Math.max(4, Math.min(8, Math.min(T.cw, T.ch) * 0.12));
  ctx.save(); ctx.shadowColor = 'rgba(30,12,20,.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  rr(ctx, T.x - cp, T.y - cp, bw + 2 * cp, bh + 2 * cp, kr + cp);
  const fg = ctx.createLinearGradient(0, T.y - cp, 0, T.y + bh + cp); fg.addColorStop(0, '#6d7387'); fg.addColorStop(1, '#565c6f');
  ctx.fillStyle = fg; ctx.fill(); ctx.restore();
  rr(ctx, T.x - cp, T.y - cp, bw + 2 * cp, bh + 2 * cp, kr + cp); ctx.lineWidth = 2.5; ctx.strokeStyle = '#9097aa'; ctx.stroke();
  rr(ctx, T.x - cp + 3, T.y - cp + 3, bw + 2 * cp - 6, bh + 2 * cp - 6, kr + cp - 3); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(30,32,46,.45)'; ctx.stroke();
  for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
    if (T.kilitli[r][c]) continue;
    const hx = T.x + c * T.cw + bosluk, hy = T.y + r * T.ch + bosluk, hw = T.cw - 2 * bosluk, hh = T.ch - 2 * bosluk;
    rr(ctx, hx, hy, hw, hh, kr * 0.8); ctx.fillStyle = '#464b5c'; ctx.fill();
    rr(ctx, hx, hy, hw, hh * 0.35, kr * 0.8); ctx.fillStyle = 'rgba(20,22,32,.22)'; ctx.fill();
  }
  // etkin dizi: arkasında altın şerit, sonundaki boş yer kesik çizgili (sıradaki karo buraya)
  const z = R && !R.bitti && R.tahtaHazir ? R.zincir : null;
  if (z) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const a = 0.22 + 0.08 * Math.sin(t * 5);
    rr(ctx, T.x + z.c0 * T.cw, T.y + z.r * T.ch, z.k * T.cw, T.ch, kr); ctx.fillStyle = `rgba(255,200,60,${a})`; ctx.fill();
    ctx.restore();
    const n = hedefDizi(R).length;
    if (z.k < n) {
      const x = T.x + (z.c0 + z.k) * T.cw, y = T.y + z.r * T.ch;
      ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,230,120,${0.65 + 0.35 * Math.sin(t * 6)})`;
      rr(ctx, x + 2, y + 2, T.cw - 4, T.ch - 4, kr * 0.8); ctx.stroke(); ctx.restore();
    }
  }
  // karolar (tahtanın üstünden düşenler tahtanın kenarında belirir)
  ctx.save(); ctx.beginPath(); ctx.rect(T.x - 6, T.y - 6, bw + 12, bh + 12); ctx.clip();
  const surukK = G.surukle ? G.surukle.k : null;
  for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
    const k = T.h[r][c]; if (!k || k === surukK || k.ci < 0 && !k.kilit) continue;
    karoCizTahta(T, k, t);
  }
  ctx.restore();
  // seçili karo, klavye imleci, sürükleme hedefi
  const cerceve = (h, col, kal, dash) => { if (!h) return; ctx.save(); if (dash) ctx.setLineDash(dash); ctx.lineWidth = kal; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; const k = T.h[h.r] && T.h[h.r][h.c], sp = k && k.span ? k.span : 1; rr(ctx, T.x + h.c * T.cw + 1.5, T.y + h.r * T.ch + 1.5, T.cw * sp - 3, T.ch - 3, kr); ctx.stroke(); ctx.restore(); };
  if (G.secili) cerceve(G.secili, `rgba(255,255,255,${0.7 + 0.3 * Math.sin(t * 9)})`, 3);
  if (G.surukle) cerceve(hucreBul(G.surukle.x, G.surukle.y), '#ffffff', 2.5, [6, 4]);
  if (G.imlec && klavyeKullanildi && G.state === 'playing') cerceve(G.imlec, '#ffd23d', 2.5, [4, 3]);
  // patlayan karolar
  for (const p of PATLAYAN) {
    const kb = karoBoyut(T, p.k), sp = karoSprite(p.k.txt, Math.max(0, p.k.ci), kb.w, kb.h, karoStil(p.k));
    if (p.t < 0) { karoCiz(sp, p.x, p.y); continue; }
    const k = p.t / 0.32; if (k > 1) continue;
    const sc = p.stil === 'kucuk' ? 1 - k * 0.6 : 1 + k * (p.stil === 'altin' ? 0.55 : 0.35);
    karoCiz(sp, p.x, p.y, 1 - k, sc, sc);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * 0.9;
    const col = p.stil === 'altin' ? '#ffd23d' : KARO_RENK[Math.max(0, p.k.ci) % KARO_RENK.length];
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(p.w, p.h) * (0.5 + k));
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.4, hexA(col, 0.6)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(p.w, p.h) * (0.5 + k), 0, 7); ctx.fill(); ctx.restore();
  }
  // önceki turdan dökülen karolar
  if (DUSEN.length) {
    ctx.save(); ctx.beginPath(); ctx.rect(I.x, I.y, I.w, I.h); ctx.clip();
    for (const k of DUSEN) { if (k.ci < 0) continue; const s = karoBoyut(T, k), sp = karoSprite(k.txt, k.ci, s.w, s.h, 'n'); karoCiz(sp, k.x, k.y, Math.max(0, 1 - k.dt * 0.8)); }
    ctx.restore();
  }
  ctx.restore();
}
function karoCizTahta(T, k, t) {
  const s = karoBoyut(T, k), sp = karoSprite(k.txt, Math.max(0, k.ci), s.w, s.h, karoStil(k));
  const ez = k.ez || 0, sx = k.olcek * (1 + ez * 0.12), sy = k.olcek * (1 - ez * 0.12);
  const a = k.sil ? 0.3 : 1;
  karoCiz(sp, k.x, k.y, a, sx, sy);
  const kr = Math.min(s.w, s.h) * 0.22, x0 = k.x - s.w / 2, y0 = k.y - s.h / 2;
  const kenar = (col, kal, alfa) => { ctx.save(); ctx.globalAlpha = alfa; ctx.lineWidth = kal; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; rr(ctx, x0, y0, s.w, s.h, kr); ctx.stroke(); ctx.restore(); };
  if (k.zincir) {
    kenar('#ffd23d', 2.5, 0.85 + 0.15 * Math.sin(t * 6 + k.c));
    const f = Math.round(clamp(Math.min(s.w, s.h) * 0.26, 8, 13));
    ctx.save(); ctx.font = `700 ${f}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.beginPath(); ctx.arc(x0 + f * 0.7, y0 + f * 0.7, f * 0.62, 0, 7); ctx.fillStyle = '#ffd23d'; ctx.fill();
    ctx.fillStyle = '#3a2400'; ctx.fillText(String(k.zincir), x0 + f * 0.7, y0 + f * 0.72); ctx.restore();
  }
  if (k.sil) { ctx.save(); ctx.strokeStyle = '#ff6b7d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 4, k.y); ctx.lineTo(x0 + s.w - 4, k.y); ctx.stroke(); ctx.restore(); }
  if (k.err > 0) kenar('#ff3048', 3, Math.min(1, k.err));
  if (k.hint > 0) kenar('#3dff7a', 3, Math.min(1, k.hint) * (0.6 + 0.4 * Math.sin(t * 12)));
  if (k.parla > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; karoCiz(sp, k.x, k.y, Math.min(0.8, k.parla), sx, sy); ctx.restore(); }
  if (k.anlamT > 0 && k.anlam) {
    // joker: karonun Türkçesi
    const f = Math.round(clamp(L.bh * 0.5, 11, 16));
    ctx.save(); ctx.font = `700 ${f}px ${FONT}`; const tw = ctx.measureText(k.anlam).width + 14, h = f * 1.6;
    const bx = clamp(k.x - tw / 2, L.in.x + 2, L.in.x + L.in.w - tw - 2), by = y0 - h - 6;
    ctx.globalAlpha = Math.min(1, k.anlamT * 3);
    kremKutu(ctx, bx, by, tw, h, 8, '#d9a23a');
    ctx.fillStyle = '#5b3a24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k.anlam, bx + tw / 2, by + h / 2 + 1); ctx.restore();
  }
}
// sürüklenen karo parmağın altında, biraz büyük ve gölgeli
function drawSurukle() {
  const s = G.surukle, T = G.T; if (!s || !T) return;
  const k = s.k, b = karoBoyut(T, k), sp = karoSprite(k.txt, Math.max(0, k.ci), b.w, b.h, karoStil(k));
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  karoCiz(sp, s.x, s.y - Math.min(18, T.ch * 0.25), 0.96, 1.14, 1.14); ctx.restore();
}
// ipucu: parlayan karodan hedef yere kayan el
function drawIpucu(t) {
  const ip = G.ipucu, T = G.T; if (!ip || !T || G.state !== 'playing' || G.surukle) return;
  const h = ip.h, a = h.a || h.dokun, A = a && T.h[a.r] && T.h[a.r][a.c];
  if (!A) return;
  const pa = karoMerkez(A), pb = h.b ? hucreMerkez(h.b.r, h.b.c) : pa;
  const s = karoBoyut(T, A);
  ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 10); ctx.lineWidth = 3.5; ctx.strokeStyle = '#7dff8f'; ctx.shadowColor = '#3cbb4a'; ctx.shadowBlur = 14;
  rr(ctx, pa.x - s.w / 2, pa.y - s.h / 2, s.w, s.h, Math.min(s.w, s.h) * 0.22); ctx.stroke(); ctx.restore();
  const dongu = (t * 0.8) % 1, k = clamp((dongu - 0.15) / 0.6, 0, 1), e = k * k * (3 - 2 * k);
  const x = lerp(pa.x, pb.x, e), y = lerp(pa.y, pb.y, e);
  const f = Math.round(clamp(Math.min(T.cw, T.ch) * 0.75, 22, 40));
  ctx.save(); ctx.globalAlpha = dongu > 0.85 ? (1 - dongu) / 0.15 : 1;
  ctx.font = `${f}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fillText('👆', x - f * 0.3, y - f * 0.05); ctx.restore();
}
function hoparlorCiz(sx, sy, k, aktif, t, col = '#ffd23d') {
  ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx - k, sy - k * 0.45); ctx.lineTo(sx - k * 0.4, sy - k * 0.45); ctx.lineTo(sx + k * 0.2, sy - k); ctx.lineTo(sx + k * 0.2, sy + k); ctx.lineTo(sx - k * 0.4, sy + k * 0.45); ctx.lineTo(sx - k, sy + k * 0.45); ctx.closePath(); ctx.fill();
  const wv = aktif ? 0.5 + 0.5 * Math.sin(t * 10) : 1;
  ctx.globalAlpha = wv; ctx.beginPath(); ctx.arc(sx + k * 0.3, sy, k * 0.6, -0.9, 0.9); ctx.stroke();
  ctx.globalAlpha = aktif ? 1 - wv * 0.6 : 0.7; ctx.beginPath(); ctx.arc(sx + k * 0.3, sy, k * 1.05, -0.9, 0.9); ctx.stroke(); ctx.restore();
}

/* ---------------- Türkçe hedef kutusu (kuyunun en üstünde) ---------------- */
// "İngilizce cümleyi göster" seçiliyse cümle kurma turunda İngilizce cümle Türkçenin altında görünür
// (dizilen kelimeler yeşil, sıradaki turuncu ve altı çizili). Kelime turlarında harf kutularında soluk harfler görünür (ilerlemeCiz).
function ingCumleGoster(R) { return !!(D && D.goster && R && R.tip === 'kur' && R.hedef && R.hedef.tur === 'kelime'); }
function ingSatirlari(R, ic, f) {
  const dizi = hedefDizi(R), sat = [[]]; let w = 0;
  ctx.font = `700 ${f}px ${FONT}`; const bos = ctx.measureText(' ').width;
  dizi.forEach((t, i) => {
    const tw = ctx.measureText(t).width;
    if (w > 0 && w + bos + tw > ic) { sat.push([]); w = 0; }
    if (w > 0) w += bos;
    sat[sat.length - 1].push(i); w += tw;
  });
  return sat;
}
function promptDuzen(R, p, bw, k) {
  const sH = L.stripH;
  const usF = Math.round(clamp(sH * 0.38, 10, 15) * k), anaF = Math.round(clamp(sH * (p.buyuk ? 0.8 : p.kart ? 0.85 : 0.52), 12, p.buyuk || p.kart ? 30 : 19) * k), altF = Math.round(clamp(sH * 0.42, 11, 16) * k);
  const ic = bw - (p.ses ? anaF * 4.4 : anaF * 1.2);
  ctx.font = `700 ${anaF}px ${FONT}`;
  const anaL = wrap(p.tr && !p.sonuc && !p.dinle ? '“' + p.ana + '”' : p.ana, ic);
  ctx.font = `600 ${altF}px ${FONT}`;
  const altL = p.alt ? wrap(p.alt, ic) : [];
  let ornL = [], ornTrL = [];
  if (p.kart && p.ornek) { ornL = wrap(p.ornek.en, ic); ornTrL = wrap(p.ornek.tr, ic); }
  const ilerH = p.ilerleme && R.hedef ? Math.round(altF * 1.8) : 0;
  const ingF = Math.round(clamp(sH * 0.46, 11, 17) * k), ingL = ingCumleGoster(R) ? ingSatirlari(R, ic, ingF) : [];
  ctx.font = `600 ${usF}px ${FONT}`;
  const usL = wrap(p.ust || '', bw - 20).slice(0, 2);   // yönerge okunurken de görünür (şerit kenarı okuma sırasında parlar)
  const h = 8 + usF * 1.3 * usL.length + anaL.length * anaF * 1.15 + altL.length * altF * 1.2 + (ornL.length ? 6 + ornL.length * altF * 1.2 + ornTrL.length * altF * 1.15 : 0) + (ilerH ? ilerH + 4 : 0) + (ingL.length ? 8 + ingL.length * ingF * 1.3 : 0) + 8;
  return { usF, usL, anaF, altF, ic, anaL, altL, ornL, ornTrL, ilerH, ingF, ingL, h };
}
// turun başında kutunun yüksekliği ayrılır (tahta tur boyunca yerinden oynamaz); yazı sonradan uzarsa küçülerek sığar
function promptYuksekligi(R) {
  const I = L.in, sH = L.stripH;
  if (!R || !R.prompt) return Math.round(sH * 2);
  const p = R.dinle && R.s ? Object.assign({}, R.prompt, { alt: R.s.tr }) : R.prompt;
  const maxH = I.h * (p.kart ? 0.42 : 0.28);
  ctx.save(); let d;
  for (let k = 1; ; k -= 0.06) { d = promptDuzen(R, p, I.w - 8, k); if (d.h <= maxH || k <= 0.64) break; }
  ctx.restore();
  return Math.round(clamp(d.h, sH * 2, maxH));
}
function drawPrompt(t) {
  const R = G.R, A = L.promptAlan; if (!R || !R.prompt || !A || !G.T) { G.promptBox = null; return; }
  const p = R.prompt, I = L.in;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  let k = 1, d;
  for (;;) { d = promptDuzen(R, p, A.w, k); if (d.h <= A.h || k <= 0.6) break; k -= 0.05; }
  const { usF, usL, anaF, altF, anaL, altL, ornL, ornTrL, ilerH, ingF, ingL } = d;
  const bx = A.x, by = A.y, bw = A.w, h = A.h;
  G.promptBox = { x: bx, y: by, w: bw, h };
  // krem Türkçe şerit (videodaki gibi); kenar rengi turun türünü ve sonucu gösterir
  const kenar = p.sonuc === 'ok' ? '#2fae57' : p.sonuc === 'hata' ? '#e0473e' : R.tip === 'sav' ? '#e0675e' : p.kart ? '#2fae57' : Konus.konusuyor ? '#e39a2d' : '#c99a6b';
  kremKutu(ctx, bx, by, bw, h, 12, kenar);
  if (Konus.konusuyor) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8); rr(ctx, bx - 2, by - 2, bw + 4, h + 4, 14); ctx.lineWidth = 3; ctx.strokeStyle = '#ffbc1f'; ctx.stroke(); ctx.restore(); }
  // şeridin iki ucunda süs noktaları
  ctx.fillStyle = 'rgba(170,120,80,.55)';
  [bx + 7, bx + bw - 7].forEach(x => { ctx.beginPath(); ctx.arc(x, by + h / 2, 2.2, 0, 7); ctx.fill(); });
  let y = by + Math.max(0, (h - d.h) / 2) + 8 + usF * 0.65;
  ctx.font = `600 ${usF}px ${FONT}`; ctx.fillStyle = p.sonuc === 'ok' ? '#1f8a45' : p.sonuc === 'hata' ? '#c0392b' : R.tip === 'sav' ? '#b5473e' : '#9a6a45';
  // yönerge (iki satıra kadar); en uzun satır yine sığmazsa küçülür
  usL.forEach((ln, n) => {
    if (n) y += usF * 1.3;
    ctx.font = `600 ${usF}px ${FONT}`; const uw = ctx.measureText(ln).width;
    if (uw > bw - 16) ctx.font = `600 ${Math.max(8, Math.floor(usF * (bw - 16) / uw))}px ${FONT}`;
    ctx.fillText(ln, I.x + I.w / 2, y);
  });
  y += usF * 0.65;
  ctx.font = `700 ${anaF}px ${FONT}`;
  anaL.forEach(ln => {
    y += anaF * 0.58;
    ctx.fillStyle = p.sonuc === 'ok' ? '#1f8a45' : p.sonuc === 'hata' ? '#c0392b' : (p.en || p.kart) ? '#6a2f6e' : '#5b3a24';
    ctx.fillText(ln, I.x + I.w / 2, y);
    y += anaF * 0.57;
  });
  ctx.font = `600 ${altF}px ${FONT}`;
  altL.forEach(ln => { y += altF * 0.6; ctx.fillStyle = p.kart ? '#b0651a' : '#7a5a42'; ctx.fillText(ln, I.x + I.w / 2, y); y += altF * 0.6; });
  if (ingL.length) {
    y += 4;
    ctx.save(); ctx.strokeStyle = 'rgba(160,110,70,.4)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + bw * 0.22, y); ctx.lineTo(bx + bw * 0.78, y); ctx.stroke(); ctx.restore();
    y += 4;
    const dizi = hedefDizi(R), kk = R.bitti ? dizi.length : (R.zincir ? R.zincir.k : 0);
    ctx.font = `700 ${ingF}px ${FONT}`; const bos = ctx.measureText(' ').width;
    ingL.forEach(sat => {
      y += ingF * 0.65;
      const tw = sat.reduce((a, i, j) => a + ctx.measureText(dizi[i]).width + (j ? bos : 0), 0);
      let x = I.x + I.w / 2 - tw / 2; ctx.textAlign = 'left';
      sat.forEach((i, j) => {
        if (j) x += bos;
        const t = dizi[i], w = ctx.measureText(t).width;
        ctx.fillStyle = i < kk ? '#1f8a45' : i === kk ? '#d9700a' : '#6a2f6e';
        ctx.fillText(t, x, y);
        if (i === kk) ctx.fillRect(x, y + ingF * 0.52, w, 2);
        x += w;
      });
      ctx.textAlign = 'center'; y += ingF * 0.65;
    });
  }
  if (ornL.length) {
    y += 6;
    ornL.forEach(ln => { y += altF * 0.6; vurguluYaz(ln, p.ana, I.x + I.w / 2, y, altF); y += altF * 0.6; });
    ctx.font = `italic 600 ${altF}px ${FONT}`;
    ornTrL.forEach(ln => { y += altF * 0.58; ctx.fillStyle = '#9a6a45'; ctx.fillText(ln, I.x + I.w / 2, y); y += altF * 0.57; });
  }
  if (ilerH && R.hedef) { y += 4; ilerlemeCiz(R, I.x + I.w / 2, y + ilerH / 2, bw - 24, ilerH); }
  if (p.ses) hoparlorCiz(bx + bw - anaF * 0.95, by + h / 2, clamp(anaF * 0.42, 7, 12), Konus.konusuyor, t, '#a0622f');
  // konu sekmesi (sol üst): kahverengi küçük etiket
  const tf = Math.round(usF * 0.9);
  if (R.konu && R.tip === 'kur') {
    ctx.font = `600 ${tf}px ${FONT}`; ctx.textAlign = 'left';
    const lab = tt('KONU: ') + R.konu.toLocaleUpperCase('tr-TR'), tw = Math.min(ctx.measureText(lab).width + 14, bw * 0.55);
    rr(ctx, bx + 10, by - tf - 6, tw, tf + 8, 6); ctx.fillStyle = '#8a5a35'; ctx.fill(); ctx.strokeStyle = '#f3dcc0'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 10, by - tf - 7, tw - 4, tf + 10); ctx.clip(); ctx.fillStyle = '#fff4e0'; ctx.fillText(lab, bx + 17, by - tf / 2 - 2); ctx.restore();
  }
  ctx.restore();
}
// harf harf dizilen cevabın ilerlemesi: dizilen harfler dolu, kalanlar boş kutu; öbekte kelimeler arasında boşluk
function ilerlemeCiz(R, cx, cy, maxW, h) {
  const hd = R.hedef, z = R.zincir, parcalar = hd.parcalar;
  const top = parcalar.reduce((a, p) => a + p.dizi.length, 0) + (parcalar.length - 1) * 0.6;
  const kut = Math.min(h * 0.95, maxW / top), gap = Math.max(1, kut * 0.12);
  let x = cx - top * kut / 2;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${Math.round(kut * 0.68)}px ${FONT}`;
  parcalar.forEach((p, pi) => {
    p.dizi.forEach((ch, i) => {
      const dolu = R.bitti || pi < hd.pi || (pi === hd.pi && z && i < z.k), sira = pi === hd.pi && i === (z ? z.k : 0) && !R.bitti;
      rr(ctx, x + gap / 2, cy - kut / 2, kut - gap, kut, kut * 0.24);
      ctx.fillStyle = dolu ? '#3cbb4a' : 'rgba(140,96,60,.1)'; ctx.fill();
      ctx.strokeStyle = dolu ? '#24863a' : sira ? '#ffa31a' : 'rgba(150,108,72,.55)'; ctx.lineWidth = sira ? 2 : 1.3; ctx.stroke();
      if (dolu) { ctx.fillStyle = '#ffffff'; ctx.fillText(ch, x + kut / 2, cy + 1); }
      else if (D && D.goster) { ctx.fillStyle = sira ? 'rgba(217,112,10,.9)' : 'rgba(138,90,53,.5)'; ctx.fillText(ch, x + kut / 2, cy + 1); }   // "göster" seçili: dizilecek harf soluk görünür
      x += kut;
    });
    x += kut * 0.6;
  });
  ctx.restore();
}
function vurguluYaz(ln, kelime, cx, y, fs) {
  ctx.save(); ctx.font = `600 ${fs}px ${FONT}`; ctx.textAlign = 'left';
  const parcalar = ln.split(' '), k = String(kelime || '').toLowerCase();
  const tw = ctx.measureText(ln).width; let x = cx - tw / 2;
  parcalar.forEach((pr, i) => {
    const temiz = pr.replace(/[.,!?;:"“”]/g, '').toLowerCase(), v = temiz === k;
    ctx.font = `${v ? 700 : 600} ${fs}px ${FONT}`; ctx.fillStyle = v ? '#1f9d55' : '#5b3a24';
    const s = pr + (i < parcalar.length - 1 ? ' ' : '');
    ctx.fillText(s, x, y); x += ctx.measureText(s).width;
  });
  ctx.restore();
}
// süre çubuğu (Türkçe şeridin altında): yeşil → sarı → kırmızı; yavaşlatma açıkken mavi
function drawSure(t) {
  const R = G.R, A = L.sureAlan; if (!R || !A || !G.T || G.state === 'menu') return;
  ctx.save();
  rr(ctx, A.x, A.y, A.w, A.h, A.h / 2); ctx.fillStyle = 'rgba(58,36,46,.62)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,236,212,.65)'; ctx.stroke();
  if (R.sure && R.tahtaHazir) {
    const k = clamp(R.sureKalan / R.sure, 0, 1), yavas = G.slowT > 0;
    const col = yavas ? '#4dc3ff' : k > 0.5 ? '#3cbb4a' : k > 0.25 ? '#ffbc1f' : '#f2453d';
    if (k > 0) {
      const fw = Math.max(A.h, A.w * k);
      rr(ctx, A.x, A.y, fw, A.h, A.h / 2); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = k < 0.25 ? 8 + 5 * Math.sin(t * 12) : 0; ctx.fill(); ctx.shadowBlur = 0;
      rr(ctx, A.x + 2, A.y + 1.5, Math.max(0, fw - 4), A.h * 0.36, A.h * 0.2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
    }
    const f = Math.round(A.h * 1.05), yazi = (yavas ? tt('YAVAŞ {n} sn', { n: Math.ceil(G.slowT) }) + ' · ' : '') + '⏱ ' + Math.max(0, Math.ceil(R.sureKalan));
    ctx.font = `700 ${f}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(yazi).width + 14;
    kremKutu(ctx, A.x + A.w - tw, A.y - 3, tw, A.h + 6, (A.h + 6) / 2, '#c99a6b');
    ctx.fillStyle = '#5b3a24'; ctx.fillText(yazi, A.x + A.w - 7, A.y + A.h / 2 + 1);
  }
  ctx.restore();
}
function drawDuz(t) {
  const d = G.duz, T = G.T; if (!d || G.state === 'menu' || !T) return;
  const I = L.in, fs = Math.round(clamp(L.bh * 0.5, 12, 16)), a = Math.min(1, d.t * 2, (d.max - d.t) * 6 + 0.2);
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  ctx.font = `600 ${fs}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const lines = wrap(d.metin, I.w - 34), lh = fs * 1.25, h = lines.length * lh + fs * 1.5 + 12;
  const x = I.x + 8, y = T.y + 4, w = I.w - 16;
  kremKutu(ctx, x, y, w, h, 12, d.ok ? '#2fae57' : '#e0473e');
  ctx.font = `700 ${Math.round(fs * 0.85)}px ${FONT}`; ctx.fillStyle = d.ok ? '#1f8a45' : '#c0392b';
  ctx.fillText(tt(d.ok ? '✔ DOĞRUSU' : '✘ DÜZELTME'), x + 12, y + fs * 0.85);
  ctx.font = `600 ${fs}px ${FONT}`; ctx.fillStyle = '#5b3a24';
  lines.forEach((l, i) => ctx.fillText(l, x + 12, y + fs * 1.6 + lh * (i + 0.5) + 2));
  ctx.restore();
}
function drawStatus(t) {
  if (!(G.state === 'playing' || G.state === 'paused') || !L.promptAlan) return;
  const A = L.promptAlan, fs = Math.round(clamp(L.bh * 0.46, 11, 16));
  // online: yarış çubuğu (Türkçe şeridin altında solda): sen ve rakip, avatarlar bitirilen cümle kadar ilerler; rakibin hata göstergesi ince çizgi
  if (D && D.online && D.online.rakip) {
    const o = D.online, r = o.rakip, top = o.liste.length, f2 = Math.round(clamp(fs * 0.78, 10, 13));
    const satH = f2 + 6, h = satH * 2 + 8, w = Math.min(A.w * 0.66, 260), ux = A.x + 6, uy = A.y + A.h - h * 0.35;
    ctx.save();
    rr(ctx, ux, uy, w, h, 10); ctx.fillStyle = 'rgba(52,30,58,.94)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,236,212,.6)'; ctx.stroke();
    const satir = (n, ad, ilerle, renk, harf, son, yigin) => {
      const y = uy + 4 + satH * n + satH / 2, adW = Math.round(w * 0.3), tx = ux + 8 + adW, tw = w - adW - 44;
      ctx.font = `700 ${f2}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff6e8';
      let a = ad; while (a.length > 2 && ctx.measureText(a).width > adW - 6) a = a.slice(0, -2) + '…';
      ctx.fillText(a, ux + 8, y + 1);
      rr(ctx, tx, y - 3, tw, 6, 3); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
      if (ilerle > 0) { rr(ctx, tx, y - 3, Math.max(6, tw * ilerle), 6, 3); ctx.fillStyle = renk; ctx.fill(); }
      if (yigin > 0) { ctx.fillStyle = yigin > 0.7 ? '#ff2a3a' : '#ff8a2a'; ctx.fillRect(tx, y + 4, tw * clamp(yigin, 0, 1), 1.5); }
      const ax = tx + tw * ilerle, ar = satH * 0.48;   // avatar çubukta ilerler
      ctx.beginPath(); ctx.arc(ax, y, ar, 0, Math.PI * 2); ctx.fillStyle = renk; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.font = `700 ${Math.round(ar * 1.15)}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#3a1f2e'; ctx.fillText(harf, ax, y + 1);
      ctx.font = `700 ${f2}px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = son ? (son === 'tamam' ? '#7dff8e' : '#ff8a9a') : '#ffd451';
      ctx.fillText(son === 'tamam' ? '✔' : son === 'yenildi' ? '✖' : '', ux + w - 30, y + 1);
      ctx.fillStyle = '#ffd451'; ctx.fillText(Math.min(top, Math.round(ilerle * top)) + '/' + top, ux + w - 7, y + 1);
    };
    const benAd = (aktifProfil() && aktifProfil().ad) || tt('Sen');
    satir(0, tt('Sen'), clamp((o.benim ? o.benim.cumle : D.istat.cumle) / top, 0, 1), '#ffc83d', String(benAd).charAt(0).toLocaleUpperCase('tr-TR'), o.benim && o.benim.sonuc, 0);
    satir(1, r.ad, clamp((r.cumle || 0) / top, 0, 1), '#ff7a96', OD.bot ? '🤖' : String(r.ad).charAt(0).toLocaleUpperCase('tr-TR'), r.sonuc, r.yigin || 0);
    ctx.restore();
  }
  if (G.combo >= 2) {
    const m = mult(), col = G.ofke ? '#ff8a2a' : m >= 3 ? '#ff5fa2' : m >= 2 ? '#ffc83d' : m > 1 ? '#5fd36a' : '#ffe3a3';
    const label = tt(G.ofke ? 'ATEŞ · ' : 'KOMBO ') + G.combo + (m > 1 ? ' · x' + m : ''), sc = 1 + G.comboPulse * 0.3;
    ctx.save(); ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width + 20, h = fs * 1.5;
    ctx.translate(A.x + A.w - 8 - tw / 2, A.y - h * 0.45); ctx.scale(sc, sc);
    rr(ctx, -tw / 2, -h / 2, tw, h, h / 2); ctx.fillStyle = 'rgba(70,40,76,.95)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    kenarliYaz(ctx, label, 0, 1, '#ffffff', 'rgba(40,16,30,.8)', 3);
    ctx.restore();
  }
}
// üstte: ⭐ skor hapı ve altında düzey; sağda "Hedef Cümleler" halkası (videodaki gibi); solda hata göstergesi
function drawHUD(t) {
  ctx.save(); ctx.textBaseline = 'middle';
  const land = L.land;
  const fitTxt = (s, maxW, size, w = 700) => { ctx.font = `${w} ${size}px ${FONT}`; const m = ctx.measureText(s).width; return m > maxW ? Math.floor(size * maxW / m) : size; };
  // skor: solda yıldız, yanında koyu hap
  const sk = L.skor, R0 = sk.h * 0.56, scx = sk.x + R0, scy = sk.y + sk.h / 2;
  const hx = scx + R0 * 0.35, hh = sk.h * 0.78;
  hapKutu(ctx, hx, scy - hh / 2, sk.x + sk.w - hx, hh);
  ctx.save(); ctx.shadowColor = 'rgba(60,20,0,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  star(ctx, scx, scy, R0, 0); const sg = ctx.createLinearGradient(0, scy - R0, 0, scy + R0); sg.addColorStop(0, '#ffe66b'); sg.addColorStop(1, '#ffad14');
  ctx.fillStyle = sg; ctx.fill(); ctx.restore();
  star(ctx, scx, scy, R0, 0); ctx.lineWidth = 2; ctx.strokeStyle = '#c96a00'; ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(scx - R0 * 0.22, scy - R0 * 0.3, R0 * 0.18, R0 * 0.1, -0.6, 0, 7); ctx.fill(); ctx.restore();
  const lx = hx + R0 * 0.85, sagX = sk.x + sk.w - Math.max(8, hh * 0.35);
  const etF = Math.round(hh * 0.3); ctx.font = `600 ${etF}px ${FONT}`; ctx.textAlign = 'left';
  const kaz = G.sayiyor && G.kasaSeri >= 1 ? '+' + Math.round(G.kasaSeri) : '';
  const et = kaz || tt('SKOR:');
  if (kaz) ctx.font = `700 ${Math.round(hh * 0.36)}px ${FONT}`;
  const ew = ctx.measureText(et).width;
  kenarliYaz(ctx, et, lx, scy + 1, kaz ? '#ffe066' : '#f3dcc0', kaz ? 'rgba(110,50,0,.85)' : 'rgba(30,16,26,.6)', kaz ? 3 : 2.5);
  ctx.save(); const sc = 1 + G.scorePulse * 0.12, sayi = String(Math.round(G.shown));
  const nf = fitTxt(sayi, Math.max(10, sagX - lx - ew - 6), Math.round(hh * 0.58));
  ctx.translate(sagX, scy + 1); ctx.scale(sc, sc); ctx.font = `700 ${nf}px ${FONT}`; ctx.textAlign = 'right';
  if (G.sayiyor) { ctx.shadowColor = 'rgba(255,200,40,.9)'; ctx.shadowBlur = 10; }
  kenarliYaz(ctx, sayi, 0, 0, G.sayiyor || G.scorePulse > 0.1 ? '#ffe066' : '#ffffff', 'rgba(30,16,26,.75)', 3);
  ctx.restore();
  // düzey ve tur: skorun altında küçük etiket
  const sv = L.sev;
  const lvl = D ? D.r.lvl : (kayit.sonLvl || 'A1'), tur = D ? tt(D.kelime ? 'KELİME ' : D.st ? 'SORU ' : D.antrenman ? 'TEKRAR ' : D.online ? 'CÜMLE ' : 'TUR ') + (D.turYazi || '') : tt('HAZIR');
  const dz = tt('DÜZEY') + ' ' + lvl + '  ·  ' + tur + (D && D.goster ? '  ·  👁' : ''), df = fitTxt(dz, sv.w - 16, Math.round(sv.h * 0.68), 600);
  ctx.font = `600 ${df}px ${FONT}`; const dw = ctx.measureText(dz).width + 16;
  rr(ctx, sv.x, sv.y, dw, sv.h, sv.h / 2); ctx.fillStyle = 'rgba(52,44,64,.7)'; ctx.fill();
  ctx.textAlign = 'left'; kenarliYaz(ctx, dz, sv.x + 8, sv.y + sv.h / 2 + 1, '#ffe7c2', 'rgba(30,16,26,.5)', 2);
  // Hedef halkası: renkli dilimli çember, ortada "HEDEF / Cümleler" ve 3/7
  const hp = L.hedefP, rx = hp.x + hp.w / 2, ry = hp.y + hp.h / 2, rad = hp.w / 2 - 3, kal = Math.max(5, rad * 0.17);
  const m = /^(\d+)\/(\d+)$/.exec(D && D.turYazi || ''), oran = m ? (+m[1] - (G.R && !G.R.bitti ? 1 : 0)) / Math.max(1, +m[2]) : 0;
  ctx.save(); ctx.shadowColor = 'rgba(30,12,20,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.arc(rx, ry, rad, 0, 7); ctx.fillStyle = 'rgba(56,46,70,.9)'; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(rx, ry, rad, 0, 7); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,220,.75)'; ctx.stroke();
  const dil = ['#ffbc1f', '#ff7a3c', '#f2453d', '#2b91ea'], ra = rad - kal / 2 - 2, bas = -Math.PI / 2;
  ctx.lineWidth = kal; ctx.lineCap = 'butt';
  for (let i = 0; i < 4; i++) {
    const a0 = bas + i * Math.PI / 2 + 0.05, a1 = bas + (i + 1) * Math.PI / 2 - 0.05;
    ctx.globalAlpha = 0.28; ctx.strokeStyle = dil[i]; ctx.beginPath(); ctx.arc(rx, ry, ra, a0, a1); ctx.stroke();
    const dolu = clamp(oran * 4 - i, 0, 1);
    if (dolu > 0) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(rx, ry, ra, a0, a0 + (a1 - a0) * dolu); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'center';
  const alt = !D ? tt('Cümleler') : D.kelime ? tt('Kelimeler') : D.st ? tt('Sorular') : D.antrenman ? tt('Tekrarlar') : tt('Cümleler');
  const ic = (ra - kal / 2) * 1.75, say = m ? m[1] + '/' + m[2] : '–';
  ctx.font = `700 ${fitTxt(tt('HEDEF'), ic * 0.78, Math.round(rad * 0.27))}px ${FONT}`; kenarliYaz(ctx, tt('HEDEF'), rx, ry - rad * 0.34, '#ffd98a', 'rgba(30,16,26,.7)', 2.5);
  ctx.font = `600 ${fitTxt(alt + ':', ic * 0.95, Math.round(rad * 0.25), 600)}px ${FONT}`; kenarliYaz(ctx, alt + ':', rx, ry - rad * 0.06, '#ffffff', 'rgba(30,16,26,.7)', 2.5);
  ctx.font = `700 ${fitTxt(say, ic * 0.85, Math.round(rad * 0.42))}px ${FONT}`; kenarliYaz(ctx, say, rx, ry + rad * 0.34, '#ffffff', 'rgba(30,16,26,.8)', 3);
  // hata göstergesi (solda)
  const Gg = L.gauge, r = G.gaugeShown, fh = Gg.h * r;
  if (fh > 0) {
    const col = r < 0.5 ? '#ffbc1f' : r < 0.78 ? '#ff7a3c' : '#f2453d';
    const g = ctx.createLinearGradient(0, Gg.y + Gg.h, 0, Gg.y + Gg.h - fh); g.addColorStop(0, '#ffb21e'); g.addColorStop(1, col);
    ctx.save(); rr(ctx, Gg.x, Gg.y + Gg.h - fh, Gg.w, fh, Gg.w / 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  const ny = Gg.y + Gg.h - fh;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(Gg.x + Gg.w + 3, ny); ctx.lineTo(Gg.x + Gg.w + 10, ny - 5); ctx.lineTo(Gg.x + Gg.w + 10, ny + 5); ctx.closePath();
  ctx.save(); ctx.shadowColor = 'rgba(30,12,20,.6)'; ctx.shadowBlur = 4; ctx.fill(); ctx.restore();
  ctx.restore();
}
// altın paralar: patlamadan yukarıdaki puana kavisle uçar, dönerek parlar
function drawPara(t) {
  if (!PARA.length) return;
  const r = Math.round(clamp(L.stripH * 0.22, 6, 9));
  ctx.save();
  for (const p of PARA) {
    if (p.t < 0) continue;
    const u = p.u, e = u * u * (3 - 2 * u), a = 1 - e;
    const x = a * a * p.x + 2 * a * e * p.cx + e * e * p.hx, y = a * a * p.y + 2 * a * e * p.cy + e * e * p.hy;
    const sx = Math.max(0.25, Math.abs(Math.cos(p.don + p.t * 11))), rr2 = r * (1 - 0.25 * e);
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    ctx.shadowColor = 'rgba(255,200,40,.8)'; ctx.shadowBlur = 8;
    const g = ctx.createRadialGradient(-rr2 * 0.3, -rr2 * 0.35, 1, 0, 0, rr2);
    g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#d98a00');
    ctx.beginPath(); ctx.arc(0, 0, rr2, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = '#a85f00'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rr2 * 0.6, 0, 7); ctx.strokeStyle = 'rgba(168,95,0,.55)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// alttaki sarı çubuk: bölümün (paketin, testin) ilerlemesi; bitmiş turlar ve şu anki turda dizilen kısım
let altCubukSon = -1;
function bolumOrani() {
  if (!D || !G.R) return 0;
  const m = /^(\d+)\/(\d+)$/.exec(D.turYazi || ''); if (!m) return 0;
  const R = G.R, top = Math.max(1, +m[2]);
  let k = 0;
  if (R.bitti) k = 1;
  else if (R.hedef && R.zincir) {
    const hd = R.hedef, tum = hd.parcalar.reduce((a, p) => a + p.dizi.length, 0);
    const once = hd.parcalar.slice(0, hd.pi).reduce((a, p) => a + p.dizi.length, 0);
    k = tum ? clamp((once + R.zincir.k) / tum, 0, 1) * 0.95 : 0;
  }
  return clamp((+m[1] - 1 + k) / top, 0, 1);
}
function altCubukGuncelle() {
  const u = document.getElementById('bIl'), y = document.getElementById('bIlY'); if (!u || !y) return;
  const o = G.state === 'menu' || !D ? 0 : bolumOrani(), v = Math.round(o * 200) / 2;
  const ad = !D ? 'BÖLÜM İLERLEMESİ' : D.kelime ? 'PAKET İLERLEMESİ' : D.st ? 'TEST İLERLEMESİ' : D.antrenman ? 'TEKRAR İLERLEMESİ' : D.online ? 'MAÇ İLERLEMESİ' : 'BÖLÜM İLERLEMESİ';
  const yazi = tt(ad) + ' · ' + (arayuzDili === 'en' ? Math.round(v) + '%' : '%' + Math.round(v));
  if (v === altCubukSon && y.textContent === yazi) return; altCubukSon = v;
  u.style.width = v + '%'; y.textContent = yazi;
}

/* =====================================================================
   GİRDİ
   Dokunma: karoyu tut ve sürükle → bırakılan hücredeki karoyla yer değiştirir; kısa fiske → komşu karo.
   Dokun-dokun: bir karoya dokun (seçilir), sonra başka bir karoya dokun. Türkçe kutusuna dokun → tekrar dinle.
   Klavye: ← → ↑ ↓ imleç · Enter / Boşluk seç ve bırak · J joker · B cümle bombası · Y yavaş · T tekrar dinle · P duraklat
   ===================================================================== */
let klavyeKullanildi = false;
function press(k) {
  sesAc();
  if (k === 'joker') return useJoker();
  if (k === 'bomb') return useBomb();
  if (k === 'slow') return useSlow();
}
// güç kutularının içeriği oyun boyunca değişir (joker / yavaş / boş): basılınca o anki data-k okunur
document.querySelectorAll('#pow button').forEach(b => {
  const start = e => {
    e.preventDefault(); b.classList.add('on');
    if (b.setPointerCapture && e.pointerId !== undefined) try { b.setPointerCapture(e.pointerId); } catch (er) { }
    const k = b.dataset.k;
    if (k) press(k); else { sesAc(); Ses.cal('tik', { ses: 0.35, hiz: 0.7 }); }
  };
  const end = () => { b.classList.remove('on'); };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
function imlecTasi(dr, dc) {
  const T = G.T; if (!T) return;
  klavyeKullanildi = true;
  const h = G.imlec || { r: 0, c: 0 };
  let r = clamp(h.r + dr, 0, T.rows - 1), c = clamp(h.c + dc, 0, T.cols - 1);
  // kullanılmayan hücreler atlanır
  for (let g = 0; g < T.cols && T.kilitli[r][c]; g++) c = clamp(c + (dc || 1), 0, T.cols - 1);
  if (T.kilitli[r][c]) { const b = hucreBul(T.x + (c + 0.5) * T.cw, T.y + (r + 0.5) * T.ch); if (b) c = b.c; }
  G.imlec = { r, c }; Ses.cal('tik', { ses: 0.25 });
}
window.addEventListener('keydown', e => {
  const k = e.key;
  if (panelAcik()) { if (k === 'Escape') panelGeri(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(k)) e.preventDefault();
  if (tutOpen) { if (e.repeat) return; if (k === 'ArrowRight' || k === 'Enter' || k === ' ') tutStep(1); else if (k === 'ArrowLeft') tutStep(-1); else if (k === 'Escape') tutFinish(); return; }
  if (G.state === 'menu' || G.state === 'over') return;
  if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); return; }
  if (G.state === 'paused') { if ((k === 'Enter' || k === ' ') && !e.repeat) togglePause(); return; }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') imlecTasi(0, -1);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') imlecTasi(0, 1);
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') imlecTasi(-1, 0);
  else if (k === 'ArrowDown' || k === 's' || k === 'S') imlecTasi(1, 0);
  else if ((k === 'Enter' || k === ' ') && !e.repeat) { klavyeKullanildi = true; if (G.imlec) dokun(G.imlec); }
  else if ((k === 'j' || k === 'J' || k === '1') && !e.repeat) press('joker');
  else if ((k === 'b' || k === 'B' || k === '2') && !e.repeat) press('bomb');
  else if ((k === 'y' || k === 'Y' || k === '3') && !e.repeat) press('slow');
  else if ((k === 't' || k === 'T') && !e.repeat) tekrarDinle();
});
// sürüklenebilir karo: serbest karolar; sıra hatası turunda hatalı cümlenin karoları da
function suruklenebilir(h) {
  const R = G.R, T = G.T; if (!h || !R || !T || G.state !== 'playing' || !R.tahtaHazir || R.bitti) return null;
  const k = T.h[h.r][h.c]; if (!k) return null;
  if (k.kilit) return R.tip === 'sav' && R.m.tip === 'sira' ? k : null;
  return k;
}
let dok = null;
cv.addEventListener('pointerdown', e => {
  sesAc();
  if (dok) return;   // tek parmak
  dok = { id: e.pointerId, x0: e.clientX, y0: e.clientY, h: hucreBul(e.clientX, e.clientY), surukle: false };
  klavyeKullanildi = false;
  try { cv.setPointerCapture(e.pointerId); } catch (er) { }
});
cv.addEventListener('pointermove', e => {
  if (!dok || e.pointerId !== dok.id) return;
  const x = e.clientX, y = e.clientY;
  if (!dok.surukle) {
    if (Math.hypot(x - dok.x0, y - dok.y0) < 9 || G.jokerHazir) return;
    const k = suruklenebilir(dok.h); if (!k) return;
    dok.surukle = true; G.secili = null; G.surukle = { k, x, y }; Ses.cal('al', { ses: 0.45 });
  }
  G.surukle.x = x; G.surukle.y = y;
});
function birak(e, iptal) {
  if (!dok || (e && e.pointerId !== dok.id)) return;
  const d = dok; dok = null; const s = G.surukle; G.surukle = null;
  if (iptal) return;
  const x = e.clientX, y = e.clientY;
  if (d.surukle && s) {
    const k = s.k, T = G.T; if (!T || !T.h[k.r] || T.h[k.r][k.c] !== k) return;
    const a = { r: k.r, c: k.c }, dx = x - d.x0, dy = y - d.y0;
    let b = hucreBul(x, y);
    if ((!b || (b.r === a.r && b.c === a.c)) && Math.hypot(dx, dy) > Math.min(T.cw, T.ch) * 0.3) {
      // kısa fiske: kaydırma yönündeki komşu karo
      const r = a.r + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0), c = a.c + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
      b = r >= 0 && r < T.rows && c >= 0 && c < T.cols ? hucreBul(T.x + (c + 0.5) * T.cw, T.y + (r + 0.5) * T.ch) : null;
    }
    k.x = x; k.y = y - Math.min(18, T.ch * 0.25);   // bırakılan yerden kayarak oturur
    if (b && (b.r !== a.r || b.c !== a.c) && !hamle(a, b)) Ses.cal('geri', { ses: 0.35 });
    return;
  }
  if (G.state !== 'playing' || Math.hypot(x - d.x0, y - d.y0) > 16) return;
  const pb = G.promptBox;
  if (pb && x >= pb.x && x <= pb.x + pb.w && y >= pb.y - 4 && y <= pb.y + pb.h + 4 && G.R && G.R.prompt && G.R.prompt.ses) { tekrarDinle(); return; }
  const h = hucreBul(x, y); if (h) { G.imlec = h; dokun(h); }
}
cv.addEventListener('pointerup', e => birak(e));
cv.addEventListener('pointercancel', e => birak(e, true));
