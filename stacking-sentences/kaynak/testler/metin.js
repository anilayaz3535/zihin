// Ekrandaki bütün yazıları toplar (dil dosyası değişikliklerinin Türkçe arayüzü bozmadığını görmek için).
// Rastgelelik sabit tohumla, gerçek zamanlı çizim döngüsü kapalı: aynı oyun her seferinde aynı oynanır.
(() => {
  let a = 20261120;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.requestAnimationFrame = () => 0;
  // Saat de oyunun saatine bağlı (sabit bir günden başlar): kelime tekrar zamanları dakikaya bağlı olduğu için
  // gerçek saat kullanılınca test bir dakika sınırını geçtiğinde farklı kelimeler sorulabiliyordu.
  const TABAN = Date.UTC(2026, 10, 20, 9, 0, 0);
  Date.now = () => TABAN + Math.round((typeof G !== 'undefined' && G ? G.t : 0) * 1000);
  // Cihazın sesli okuması 'başladı / bitti' olaylarını gerçek zamanda gönderir; bu da kelimelerin düşme anını ve
  // dolayısıyla rastgele sırayı çalıştırmadan çalıştırmaya değiştiriyordu. Testte okuma sessizce yutulur:
  // kelimeler oyunun saatiyle 'okuma başlamadı' süresi dolunca düşer (oyunun kendi yedek yolu).
  try { const ss = window.speechSynthesis; if (ss) { ss.speak = () => {}; ss.cancel = () => {}; ss.getVoices = () => []; } } catch (e) { }
  window.__ciz = new Set(); window.__notlar = new Set(); window.__koc = new Set(); window.__dzk = new Set();
  const sar = (P, ad) => { const o = P[ad]; P[ad] = function (s, ...r) { window.__ciz.add(String(s)); return o.call(this, s, ...r); }; };
  sar(CanvasRenderingContext2D.prototype, 'fillText'); sar(CanvasRenderingContext2D.prototype, 'strokeText');
  window.__ekran = () => {
    const parcalar = ['card', 'ctrl', 'pow'].map(id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e.innerText : ''; });
    const ar = [...document.querySelectorAll('[aria-label],[placeholder],[title]')].map(e => [e.getAttribute('aria-label'), e.getAttribute('placeholder'), e.getAttribute('title')].filter(Boolean).join('|'));
    return parcalar.join('\n---\n') + '\n---\n' + ar.join(' · ');
  };
  document.addEventListener('DOMContentLoaded', () => {
    const n = document.getElementById('not');
    // rehberli ilk cümlenin koç yazıları (ilk.js)
    // İngilizce dizilişi kartları (dizilis.js)
    if (window.dizilisGoster) { const o = window.dizilisGoster; window.dizilisGoster = (s, f) => { const r = o(s, f); window.__dzk.add(document.getElementById('dizilis').innerText); return r; }; }
    if (window.ilkKocYaz) { const o = window.ilkKocYaz; window.ilkKocYaz = m => { if (m) window.__koc.add(m); return o(m); }; }
    if (n) new MutationObserver(() => { const t = n.textContent.trim(); if (t) window.__notlar.add(t); }).observe(n, { childList: true, subtree: true, characterData: true });
  });
})();
