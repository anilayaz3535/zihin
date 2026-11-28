/* =====================================================================
   EKONOMİ (28 Kasım 2026): JETON · CAN · GALİBİYET SERİSİ · DÜKKÂN
   Amaç: kazanılan ödülün harcanacak yeri olsun (jeton), Bölüm Yolu'nda her deneme değerli olsun (can),
   kaybetmekten kaçınma oyuncuyu "bir tane daha" oynatsın (galibiyet serisi).
   · 🪙 Jeton (kayit.jeton): Bölüm Yolu'nu ilk kez geçince 10 + 5×yıldız, tekrar geçince 3; Günün Görevi 15;
     sandıklar ve çark. Dükkânda harcanır (DUKKAN): güçler, canları doldurma, seri dondurma; NEREDEYSE'de +3 hamle.
   · ❤️ Can (kayit.can = { n, t }): yalnız Bölüm Yolu'nda, 11. bölümden sonra. En çok 5; bölüm başlarken 1 can harcanır,
     kazanınca geri verilir (kaybetmek ya da yarıda çıkmak 1 can). 30 dakikada 1 can dolar (t: bir sonraki canın sayılmaya
     başladığı an). Can bitince öğrenme modları (Kariyer, Günün Görevi, alıştırma) sınırsız kalır: bekleme İngilizce çalışmaya döner.
   · 🔥 Galibiyet serisi (kayit.galibiyet): Bölüm Yolu'nda art arda kazanılan bölüm. 3+ seride bölüm 💣 paket karoyla,
     5+ seride ayrıca 🌈 gökkuşağıyla başlar. Kaybedince ya da yarıda çıkınca sıfırlanır.
   ===================================================================== */
const CAN_EN = 5, CAN_SURE = 30 * 60e3, CAN_UCRETSIZ = 10;
const DUKKAN = [
  { id: 'hamle3', i: '✋', ad: '+3 Hamle', fiyat: 50 },
  { id: 'cekic', i: '🔨', ad: 'Çekiç', fiyat: 70 },
  { id: 'miknatis', i: '🧲', ad: 'Mıknatıs', fiyat: 70 },
  { id: 'can', i: '❤️', ad: 'Canları doldur', fiyat: 90 },
  { id: 'don', i: '❄', ad: 'Seri dondurma', fiyat: 120 },
];
const NEREDEYSE_FIYAT = 50;
const canSimdi = () => (window.__canSaat ? window.__canSaat() : Date.now());   // test: saat

/* ---------------- jeton ---------------- */
function jetonEkle(n) { kayit.jeton = Math.max(0, Math.min(1e6, (kayit.jeton || 0) + Math.round(n))); }
function jetonHarca(n, ne) {
  if ((kayit.jeton || 0) < n) { not(tt('Jetonun yetmiyor. Bölüm kazanarak ve sandık açarak jeton topla.')); Ses.cal('geri', { ses: 0.4 }); return false; }
  kayit.jeton -= n; kaydet(); Olcum.olay('jeton_harcadi', { ne, n }); Ses.cal('al', { ses: 0.6 }); return true;
}
// Günün Görevi bitince jeton
Olay.dinle('bolumBitti', v => { if (v.mod === 'gunluk' && v.kazandi !== false && aktifProfil()) { jetonEkle(15); kaydet(); } });

/* ---------------- can ---------------- */
function canDurum() {   // kaydı günceller (dolan canlar), döner { n, kalan: sonraki cana ms (dolu ise 0) }
  const c = kayit.can, s = canSimdi();
  if (c.n >= CAN_EN) { c.n = CAN_EN; c.t = null; return { n: CAN_EN, kalan: 0 }; }
  if (c.t == null || c.t > s) c.t = s;   // saat geri alınmışsa ya da eksik kayıt: şimdiden say
  const k = Math.floor((s - c.t) / CAN_SURE);
  if (k > 0) { c.n = Math.min(CAN_EN, c.n + k); c.t = c.n >= CAN_EN ? null : c.t + k * CAN_SURE; }
  return { n: c.n, kalan: c.n >= CAN_EN ? 0 : c.t + CAN_SURE - s };
}
const canGerekir = no => no > CAN_UCRETSIZ;
function canHarca() { const d = canDurum(); if (d.n <= 0) return false; if (kayit.can.n === CAN_EN) kayit.can.t = canSimdi(); kayit.can.n--; kaydet(); canBildirim(); return true; }
function canVer() { canDurum(); kayit.can.n = Math.min(CAN_EN, kayit.can.n + 1); if (kayit.can.n >= CAN_EN) kayit.can.t = null; kaydet(); canBildirim(); }
function canDoldur() { kayit.can = { n: CAN_EN, t: null }; kaydet(); canBildirim(); }
// canlar dolunca bildirim (uygulamada, izin varsa)
function canBildirim() { const d = canDurum(); if (window.Yerel && Yerel.canHatirlat) Yerel.canHatirlat(d.n >= CAN_EN ? 0 : canSimdi() + d.kalan + (CAN_EN - d.n - 1) * CAN_SURE); }
const canSure = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function canHtml() {
  const d = canDurum();
  return `<span class="can-rozet ${d.n ? '' : 'bos'}" id="can-rozet">❤️ <b>${d.n}</b>${d.n < CAN_EN ? `<small>${canSure(d.kalan)}</small>` : `<small>${tt('dolu')}</small>`}</span>`;
}
const jetonHtml = () => `<span class="jeton-rozet" id="jeton-rozet">🪙 <b>${kayit.jeton || 0}</b></span>`;
setInterval(() => {   // haritada ve kartlarda can sayacı
  const el = document.getElementById('can-rozet'); if (el) el.outerHTML = canHtml();
  const j = document.getElementById('jeton-rozet'); if (j) j.outerHTML = jetonHtml();
  const cb = document.getElementById('can-bitti-sure'); if (cb) { const d = canDurum(); if (d.n > 0 && ekran === 'canBitti' && canBekleyen) { const n = canBekleyen; canBekleyen = null; yolBaslangic(n); } else cb.textContent = canSure(d.kalan); }
}, 1000);
let canBekleyen = null;
// can kalmadı ekranı: beklerken öğrenme modları sınırsız
function canBittiAc(no) {
  canBekleyen = no; const d = canDurum(); Olcum.olay('can_bitti', { bolum: no });
  goster(`<div class="can-bitti"><div class="can-kalp">💔</div><h3>${tt('Canların bitti')}</h3>
      <p>${tt('Yeni can:')} <b id="can-bitti-sure">${canSure(d.kalan)}</b></p>
      <p class="aciklama">${tt('Beklerken Kariyer’de ve Günün Görevi’nde sınırsız İngilizce çalışabilirsin.')}</p></div>
    <button class="big" id="cb-doldur" ${kayit.jeton >= DUKKAN[3].fiyat ? '' : 'disabled'}>${tt('❤️ CANLARI DOLDUR · {f} 🪙', { f: DUKKAN[3].fiyat })}</button>
    <small class="cb-jeton">${tt('Jetonun: {n}', { n: kayit.jeton || 0 })}</small>
    <div class="row"><button class="sec" id="cb-kariyer">${tt('🎓 KARİYER')}</button><button class="sec" id="cb-harita">${tt('HARİTA')}</button></div>`, '', 'canBitti');
  $('#cb-doldur').onclick = () => { if (jetonHarca(DUKKAN[3].fiyat, 'can')) { canDoldur(); canBekleyen = null; yolBaslangic(no); } };
  $('#cb-kariyer').onclick = () => { canBekleyen = null; sesAc(); haritaAc(); };
  $('#cb-harita').onclick = () => { canBekleyen = null; yolHaritaAc(); };
}

/* ---------------- galibiyet serisi ---------------- */
const galibiyetBonus = g => (g >= 5 ? ['paket', 'gokkusagi'] : g >= 3 ? ['paket'] : []);
// bölümün kopya tahtasına bonus özel karolar (dolgu karoların yerine; tuzaklara, engellere dokunmaz)
function galibiyetUygula(T) {
  const tur = galibiyetBonus(kayit.galibiyet || 0); if (!tur.length) return [];
  const aday = T.h.map((k, i) => (k && k.k < 0 && !k.cel && !k.ozel && !strDonuk(k) && !k.sis && !k.kar ? i : -1)).filter(i => i >= 0);
  const o = [];
  tur.forEach(t => { if (!aday.length) return; const i = aday.splice(Math.floor(Math.random() * aday.length), 1)[0], k = T.h[i]; k.ozel = t; k.txt = ''; k.bonus = true; if (t === 'gokkusagi') k.ci = -1; o.push(t); });
  return o;
}
function galibiyetSonuc(kazandi) { const once = kayit.galibiyet || 0; kayit.galibiyet = kazandi ? once + 1 : 0; return once; }
function galibiyetHtml() {
  const g = kayit.galibiyet || 0, b = galibiyetBonus(g), sonraki = g < 3 ? 3 : g < 5 ? 5 : 0;
  if (!g) return '';
  return `<div class="galibiyet"><b>🔥 ${tt('Galibiyet serisi: {n}', { n: g })}</b><small>${b.length ? tt('Bonus: {o}', { o: b.map(t => OZEL_I[t]).join(' ') }) + ' · ' : ''}${sonraki ? tt('{n} galibiyette yeni bonus', { n: sonraki }) : tt('En büyük bonus!')}</small></div>`;
}

/* ---------------- dükkân ---------------- */
function dukkanAc(geri) {
  const d = canDurum();
  const satir = u => {
    const yok = (u.id === 'can' && d.n >= CAN_EN) || (u.id === 'don' && kayit.seri.dondurma >= SERI_DONDURMA_EN);
    const sahip = ARAC[u.id] ? (kayit.envanter[u.id] || 0) : u.id === 'don' ? kayit.seri.dondurma : null;
    return `<div class="dk-urun"><i>${u.i}</i><span><b>${tt(u.ad)}</b>${sahip != null ? `<small>${tt('Sende: {n}', { n: sahip })}</small>` : u.id === 'can' ? `<small>❤️ ${d.n}/${CAN_EN}</small>` : ''}</span>
      <button class="dk-al" data-id="${u.id}" ${yok || kayit.jeton < u.fiyat ? 'disabled' : ''}>${yok ? tt(u.id === 'can' ? 'Dolu' : 'En çok') : u.fiyat + ' 🪙'}</button></div>`;
  };
  goster(`<div class="ust-satir"><button class="geri" id="dk-geri">${tt('← Geri')}</button>${jetonHtml()}</div>
    <div class="ana-baslik">🛒 ${tt('DÜKKÂN')}</div>
    <div class="dk-liste">${DUKKAN.map(satir).join('')}</div>
    <p class="aciklama" style="text-align:center">${tt('Jeton: Bölüm Yolu’nu geçince, Günün Görevi’ni bitirince, sandıklardan ve çarktan.')}</p>`, '', 'dukkan');
  $('#dk-geri').onclick = () => (geri || yolHaritaAc)();
  card.querySelectorAll('.dk-al').forEach(b => b.onclick = () => {
    const u = DUKKAN.find(x => x.id === b.dataset.id); sesAc();
    if (!jetonHarca(u.fiyat, u.id)) return;
    if (ARAC[u.id]) aracEkle(u.id, 1); else if (u.id === 'can') canDoldur(); else if (u.id === 'don') kayit.seri.dondurma++;
    kaydet(); Yerel.titret('hafif'); not(tt('{u} alındı!', { u: u.i + ' ' + tt(u.ad) })); dukkanAc(geri);
  });
}
