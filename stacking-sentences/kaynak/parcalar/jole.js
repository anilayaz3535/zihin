/* =====================================================================
   JÖLE (28 Kasım 2026): karolar jöle / slime gibi esner
   · Her karonun bir yay durumu var (k.jel): hareket ettiği yöne doğru uzar (s, açı a), durunca titreyerek oturur;
     düşünce yassılıp seker (q: alttan dikey ezilme). Yay az sönümlü: birkaç kez sallanıp durur.
   · Sürüklenen karo parmağı jöle gibi biraz geriden izler, hızına göre uzar ve hafifçe eğilir; bırakılınca bulunduğu
     yerden yeni hücresine esneyerek akar.
   · Patlarken önce ezilir, sonra kabarcık gibi büyüyüp söner; renkli jöle damlacıkları saçılır.
   · Görsel etki yalnız çizimdedir: hücre, hamle ve kurallar değişmez. Hareketi azalt ayarı (prefers-reduced-motion) açıksa esneme kapalı.
   ===================================================================== */
const JEL = { K: 380, D: 15, uzama: 0.00019, enUzun: 0.3, egim: 0.00009 };
const jelAz = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
function jelDurum(o) { return o.jel || (o.jel = { s: 0, v: 0, a: 0, q: 0, qv: 0, px: null, py: null }); }
// yay: hıza göre uzama hedefi; ezilme yalnız darbeyle
function jelAdim(j, x, y, dt) {
  if (dt <= 0) return;
  if (j.px == null) { j.px = x; j.py = y; }
  const vx = (x - j.px) / dt, vy = (y - j.py) / dt, hiz = Math.hypot(vx, vy);
  j.px = x; j.py = y;
  const hedef = jelAz ? 0 : Math.min(JEL.enUzun, hiz * JEL.uzama);
  if (hiz > 40) j.a = Math.atan2(vy, vx);
  j.v += (JEL.K * (hedef - j.s) - JEL.D * j.v) * dt; j.s += j.v * dt;
  j.qv += (-JEL.K * 1.1 * j.q - JEL.D * j.qv) * dt; j.q += j.qv * dt;
  if (Math.abs(j.s) < 0.002 && Math.abs(j.v) < 0.02) { j.s = 0; j.v = 0; }
  if (Math.abs(j.q) < 0.002 && Math.abs(j.qv) < 0.02) { j.q = 0; j.qv = 0; }
  j.s = clamp(j.s, -0.35, 0.4); j.q = clamp(j.q, -0.35, 0.4);
}
// darbe: + yassılır (düşüş), − uzar (kaldırma)
function jelDarbe(o, g) { if (jelAz) return; const j = jelDurum(o); j.qv += g; }
const jelHareketli = j => !!j && (Math.abs(j.s) + Math.abs(j.v) + Math.abs(j.q) + Math.abs(j.qv) > 0.01);
// tahtadaki karolar (engine.js tahtaTik her karo için çağırır)
function jelKaro(k, dt) { jelAdim(jelDurum(k), k.x, k.y, dt); }
// sürüklenen karo: parmağı yayla izler
function jelSurukleTik(dt) {
  const s = G.surukle; if (!s) return;
  if (s.rx == null) { s.rx = s.x; s.ry = s.y; jelDarbe(s, -7); }
  const f = jelAz ? 1 : Math.min(1, dt * 20);
  s.rx += (s.x - s.rx) * f; s.ry += (s.y - s.ry) * f;
  jelAdim(jelDurum(s), s.rx, s.ry, dt);
}
// jöle dönüşümüyle çizim: (cx, cy) merkez; uzama açı yönünde, ezilme alttan
function karoCizJel(sp, cx, cy, alpha, olcek, j, egim) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const h = sp.h * olcek, q = j ? j.q : 0;
  ctx.translate(cx, cy + h * q * 0.5);   // alttan ezilme: alt kenar yerinde kalır
  if (egim) ctx.rotate(egim);
  if (j && j.s) { ctx.rotate(j.a); ctx.scale(1 + j.s, 1 - j.s * 0.7); ctx.rotate(-j.a); }
  ctx.scale(olcek * (1 + q * 0.85), olcek * (1 - q));
  ctx.drawImage(sp.c, -sp.w / 2 - sp.g, -sp.h / 2 - sp.g, sp.cw, sp.chh);
  ctx.restore();
}
// patlama: renkli jöle damlacıkları ve yumuşak halka
function jelSicrat(x, y, col, boy) {
  const n = Math.round(clamp(boy / 6, 5, 11));
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, v = rnd(140, 340);
    addP({ type: 'damla', x: x + rnd(-boy * 0.2, boy * 0.2), y: y + rnd(-boy * 0.15, boy * 0.15), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.45, 0.8), max: 0.8, col, s: rnd(boy * 0.06, boy * 0.12), gr: 900, drag: 0.97 });
  }
  ring(x, y, hexA(col, 0.7), boy * 0.3, boy * 0.85, 0.35, 4);
}
