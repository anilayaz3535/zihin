window.__log = []; window.__stalls = [];
window.__botInstall = function () {
  const origTB = turBaslat;
  window.turBaslat = function (R) {
    const info = { t: +G.t.toFixed(2), tip: R.tip, sub: R.it ? R.it.tip : (R.m ? (R.m.tip || (R.m.klasik ? 'klasik' : 'cumle')) : (R.dinle ? 'dinle' : '')), txt: R.s ? R.s.en : R.m ? R.m.tokens.join(' ') : R.w ? R.w.en : '' };
    window.__log.push(info);
    return origTB(R);
  };
};
// Bot, oyuncu gibi tahtada karo taşır (oyunun hamle / dokun işlevleriyle, dokunmayla aynı yol).
// Doğru hamleyi oyunun ipucu işlevi verir; errRate olasılığıyla dizinin sonuna yanlış karo koyar.
window.__botStep = function (errRate) {
  if (G.state !== 'playing') return;
  // İngilizce dizilişi kartı: oyuncu gibi 1 sn okuyup kapatır (testin kendisi kartı denetleyecekse window.__dzElle = true)
  if (typeof dzAcik !== 'undefined' && dzAcik && !window.__dzElle) { window.__dzT = (window.__dzT || 0) + 0.05; if (window.__dzT >= 1) { window.__dzT = 0; dzAcik.kapat(); } return; }
  const R = G.R; if (!R || R.bitti || !R.tahtaHazir || !hamleSerbest()) return;
  window.__botT = (window.__botT || 0) + 0.05; if (window.__botT < 0.3) return; window.__botT = 0;
  const h = (Math.random() < errRate && yanlisHamle(R)) || ipucuHamle(R);
  if (!h) return;   // eksik karo birazdan yukarıdan inecek
  if (h.dokun) dokun(h.dokun); else hamle(h.a, h.b);
};
// fast-forward simulated time with bot playing
window.__ff = function (sec, errRate, stopWhen) {
  const dt = 0.05; let idle = 0, hamlesiz = 0, doneIdle = 0, lastR = G.R;
  for (let s = 0; s < sec; s += dt) {
    update(dt); draw();
    window.__botStep(errRate);
    if (G.state === 'playing') {
      const R = G.R;
      if (R !== lastR) { idle = 0; hamlesiz = 0; doneIdle = 0; lastR = R; }
      if (R && !R.bitti && !R.tahtaHazir) { idle += dt; if (idle > 12) { window.__stalls.push({ t: G.t, why: 'no-board', tip: R.tip, bekle: R.bekle, okunuyor: R.okunuyor, spawnT: G.spawnT }); idle = -1e9; } }
      else idle = 0;
      if (R && !R.bitti && R.tahtaHazir && !(typeof dzAcik !== 'undefined' && dzAcik) && !ipucuHamle(R) && !(R.bekleyen && R.bekleyen.length)) { hamlesiz += dt; if (hamlesiz > 10) { window.__stalls.push({ t: G.t, why: 'no-move', tip: R.tip, hedef: R.hedef ? hedefDizi(R).join(' ') : '', zincir: R.zincir }); hamlesiz = -1e9; } }
      else if (hamlesiz > 0) hamlesiz = 0;
      if (R && R.bitti) { doneIdle += dt; if (doneIdle > 10) { window.__stalls.push({ t: G.t, why: 'no-next-round', tip: R.tip, zam: ZAM.length }); doneIdle = -1e9; } }
      if (!R) { doneIdle += dt; if (doneIdle > 10) { window.__stalls.push({ t: G.t, why: 'no-R', zam: ZAM.length }); doneIdle = -1e9; } }
    }
    if (stopWhen && stopWhen()) return { done: true, t: G.t };
  }
  return { done: false, t: G.t };
};
