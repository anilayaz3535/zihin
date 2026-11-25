/* =====================================================================
   HAZIR EMOJİLER (online maçlar: HIZ, STRATEJİ ve sonuç ekranları; bilgisayara karşı da)
   · Yalnız 6 hazır emoji (yazı yok: denetlenmesi gereken kullanıcı içeriği oluşmaz).
   · 😊 düğmesi → emoji çubuğu → seçilen emoji kendi avatarının yanında uçar, rakibe gider (ağ mesajı 'emo').
   · Gelen emoji rakibin avatarının yanında uçar. 🔇 bu maç için rakibin emojilerini susturur.
   · Gönderme sınırı 1,5 sn; gelen emojiler en çok 0,8 sn'de bir gösterilir.
   · Bilgisayar rakip ara sıra karşılık verir (oyuncunun emojisine, tur / maç sonuçlarına).
   ===================================================================== */
const EMO = ['👍', '😮', '😂', '🔥', '👏', '😅'];
const EMO_ARALIK = 1500, EMO_AL_ARALIK = 800;
const EM = { son: 0, alSon: 0, sessiz: null, acik: false };
function emoMac() { return STR ? (STR.yol || STR.mac === 'rehber' ? null : STR.mac) : D && D.online ? D.online.mac : null; }   // tek kişilik (Bölüm Yolu, alıştırma) değil
function emoBotMu() { return STR ? !!STR.rakip.bot : !!OD.bot; }
// emoji düğmesinin yeri: HIZ maçında yarış çubuğunun sağı, stratejide rakip satırı, sonuç ekranlarında VS'nin altı
function emoBaglam() {
  if (ekran === 'onlineSonuc' || ekran === 'strSonuc') { const v = card.querySelector('.vs-rozet'); if (v) { const b = v.getBoundingClientRect(); return { x: b.left + b.width / 2 - 20, y: b.bottom + 8 }; } }
  if (ov.classList.contains('show')) return null;
  if (STR && strEl && strEl.style.display !== 'none' && !STR.karar) {
    if ($('#st-panel').classList.contains('acik') && !(STR.R && STR.R.sonuc)) return null;
    const r = $('#st-rakip'); if (!r) return null; const b = r.getBoundingClientRect();
    return { x: Math.min(innerWidth - 48, b.right + 8), y: b.top + b.height / 2 - 20, ust: true };
  }
  if (D && D.online && !D.online.karar && G.state === 'playing' && window.__yarisKonum) { const y = window.__yarisKonum; return { x: Math.min(innerWidth - 46, y.sag[0] + 6), y: y.sag[1] - 20 }; }
  return null;
}
let emoBtn = null, emoBar = null;
function emoKur() {
  if (emoBtn) return;
  emoBtn = document.createElement('button'); emoBtn.id = 'emo-btn'; emoBtn.style.display = 'none'; emoBtn.type = 'button'; emoBtn.textContent = '😊'; emoBtn.setAttribute('aria-label', tt('Emoji gönder'));
  emoBar = document.createElement('div'); emoBar.id = 'emo-bar'; emoBar.setAttribute('role', 'menu');
  emoBar.innerHTML = EMO.map((e, i) => `<button type="button" data-e="${i}" role="menuitem">${e}</button>`).join('') + `<button type="button" data-e="sus" class="emo-sus" aria-label="${tt('Rakibin emojilerini sustur')}">🔇</button>`;
  document.body.appendChild(emoBtn); document.body.appendChild(emoBar);
  emoBtn.addEventListener('click', e => { e.stopPropagation(); sesAc(); EM.acik = !EM.acik; emoYerlestir(); Ses.cal('tik', { ses: 0.35 }); });
  emoBar.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e === 'sus') { EM.sessiz = EM.sessiz === emoMac() ? null : emoMac(); b.classList.toggle('acik', EM.sessiz === emoMac()); not(tt(EM.sessiz ? 'Rakibin emojileri bu maçta gizlendi.' : 'Rakibin emojileri açıldı.')); return; }
    emoGonder(+b.dataset.e); EM.acik = false; emoYerlestir();
  });
  ['pointerdown', 'touchstart'].forEach(ad => emoBtn.addEventListener(ad, e => e.stopPropagation(), { passive: true }));
  document.addEventListener('pointerdown', e => { if (EM.acik && !emoBar.contains(e.target) && e.target !== emoBtn) { EM.acik = false; emoYerlestir(); } }, true);
  setInterval(emoYerlestir, 250);
}
function emoYerlestir() {
  if (!emoBtn) return;
  const b = emoMac() ? emoBaglam() : null;
  emoBtn.style.display = b ? '' : 'none';
  if (b && emoBtn.dataset.dil !== arayuzDili) { emoBtn.dataset.dil = arayuzDili; emoBtn.setAttribute('aria-label', tt('Emoji gönder')); emoBar.querySelector('.emo-sus').setAttribute('aria-label', tt('Rakibin emojilerini sustur')); }
  if (!b) { EM.acik = false; emoBar.classList.remove('acik'); return; }
  emoBtn.style.left = b.x + 'px'; emoBtn.style.top = b.y + 'px';
  emoBtn.classList.toggle('bekle', Date.now() - EM.son < EMO_ARALIK);
  emoBar.classList.toggle('acik', EM.acik);
  if (EM.acik) {
    const w = emoBar.offsetWidth || 300, x = clamp(b.x + 20 - w / 2, 6, innerWidth - w - 6);
    emoBar.style.left = x + 'px'; emoBar.style.top = (b.y + 48 + 52 > innerHeight ? b.y - 52 : b.y + 46) + 'px';
    emoBar.querySelector('.emo-sus').classList.toggle('acik', EM.sessiz === emoMac());
  }
}
function emoGonder(i) {
  if (!(i >= 0 && i < EMO.length)) return false;
  const mac = emoMac(); if (!mac) return false;
  if (Date.now() - EM.son < EMO_ARALIK) { Ses.cal('geri', { ses: 0.3 }); return false; }
  EM.son = Date.now();
  emoGoster('ben', i); Yerel.titret('hafif');
  if (emoBotMu()) emoBotCevap(i);
  else if (OD.kod) Ag.gonder({ t: 'emo', mac, e: i });
  return true;
}
// ağdan (online.js) ya da bilgisayardan
function emoAl(o) {
  const i = +o.e; if (!(i >= 0 && i < EMO.length) || o.mac !== emoMac()) return;
  if (EM.sessiz === emoMac()) return;
  if (Date.now() - EM.alSon < EMO_AL_ARALIK) return;
  EM.alSon = Date.now();
  emoGoster('rakip', i);
}
function emoCapa(kim) {
  if (ekran === 'onlineSonuc' || ekran === 'strSonuc') { const a = card.querySelectorAll('.vs-oy .vs-av'); const e = a[kim === 'ben' ? 0 : 1]; if (e) { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top]; } }
  if (STR && strEl && strEl.style.display !== 'none') { const a = strEl.querySelectorAll('#st-skor .vs-av'); const e = a[kim === 'ben' ? 0 : 1]; if (e) { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.bottom + 4]; } }
  const y = window.__yarisKonum; if (y) return y[kim];
  return [kim === 'ben' ? innerWidth * 0.3 : innerWidth * 0.7, innerHeight * 0.3];
}
function emoGoster(kim, i) {
  const [x, y] = emoCapa(kim), el = document.createElement('div');
  el.className = 'emo-ucan ' + kim; el.innerHTML = `<b>${EMO[i]}</b>${kim === 'rakip' ? `<small>${esc((STR ? STR.rakip.ad : OD.rakip && OD.rakip.ad) || '')}</small>` : ''}`;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 2300);
  Ses.nota(kim === 'ben' ? 4 : 7, 0.35);
}
// bilgisayarın tepkileri
const emoBotOlasilik = () => (window.__emoBotOlasilik != null ? window.__emoBotOlasilik : 0.45);
function emoBotTepki(liste, gecikme) {
  if (!emoBotMu() || Math.random() > emoBotOlasilik()) return;
  const mac = emoMac();
  setTimeout(() => { if (emoMac() === mac) emoAl({ mac, e: liste[Math.floor(Math.random() * liste.length)] }); }, (gecikme || 1) * 1000 + Math.random() * 1200);
}
function emoBotCevap(i) { emoBotTepki(i === 2 ? [2, 0] : i === 3 ? [3, 4] : i === 5 ? [2, 0] : [0, 4, 3], 1); }
emoKur();
