/* =====================================================================
   ÖLÇÜM (isimsiz oyun verisi): hangi bölüm kaç denemede geçiliyor, oyuncular ertesi gün geri geliyor mu, nerede bırakılıyor.
   · Kişisel veri gönderilmez: isim, cümle, yazı yok. Cihaz başına rastgele bir kimlik (olcumKimlik, kayit.js) ve oyun olayları.
   · Servis: PostHog (Avrupa sunucusu). OLCUM_ANAHTAR boşsa hiçbir şey gönderilmez (yalnız bellekte tutulur: window.__olcum).
   · Ayarlar → "Anonim kullanım verisi" kapatılırsa gönderilmez.
   · Olaylar 20 sn'de bir ya da 20 olay birikince toplu gönderilir; uygulama arka plana giderken de (sendBeacon).
   Olay listesi ve önerilen grafikler: MAGAZA/OLCUM-REHBERI.md
   ===================================================================== */
const OLCUM_ANAHTAR = window.TE_OLCUM_ANAHTAR || '';            // PostHog proje anahtarı (phc_…); herkese açık anahtardır
const OLCUM_ADRES = window.TE_OLCUM_ADRES || 'https://eu.i.posthog.com/batch/';
const Olcum = (() => {
  const kuyruk = [], oturum = Math.random().toString(36).slice(2, 12);
  window.__olcum = [];
  let t0 = Date.now(), sonGonder = 0;
  function ortak() {
    const c = window.Capacitor, p = c && c.getPlatform ? c.getPlatform() : 'web';
    return { platform: p, dil: arayuzDili, surum: OYUN_SURUM, oturum, $lib: 'stacking-sentences' };
  }
  function olay(ad, o) {
    if (!olcumIzinli()) return;
    const e = { event: ad, timestamp: new Date().toISOString(), properties: Object.assign({ distinct_id: olcumKimlik() }, ortak(), o || {}) };
    window.__olcum.push(e); if (window.__olcum.length > 300) window.__olcum.shift();
    if (!OLCUM_ANAHTAR) return;
    kuyruk.push(e);
    if (kuyruk.length >= 20) gonder();
  }
  function gonder(beacon) {
    if (!OLCUM_ANAHTAR || !kuyruk.length || !olcumIzinli()) return;
    const paket = JSON.stringify({ api_key: OLCUM_ANAHTAR, batch: kuyruk.splice(0, 50) });
    sonGonder = Date.now();
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon(OLCUM_ADRES, new Blob([paket], { type: 'application/json' })); return; }
      fetch(OLCUM_ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: paket, keepalive: true }).catch(() => { });
    } catch (e) { }
  }
  setInterval(() => gonder(), 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { olay('oturum_ara', { sure_sn: Math.round((Date.now() - t0) / 1000) }); gonder(true); } else t0 = Date.now();
  });
  return { olay, gonder, kuyruk: () => kuyruk.length };
})();
const OYUN_SURUM = '1.0';

/* ---- olaylar (oyunun kendi olay yolundan; motor değişmez) ---- */
Olay.dinle('kayitYuklendi', () => Olcum.olay('profil_acildi', { xp: kayit.xp, seri: kayit.seri.gun, yol_acik: kayit.yol.acik }));
Olay.dinle('bolumBasladi', v => Olcum.olay('bolum_basladi', { mod: v.mod, bolum: v.r, seviye: v.lvl, devam: !!v.devam }));
Olay.dinle('bolumBitti', v => {
  const o = { mod: v.mod, bolum: v.r, seviye: v.lvl, kazandi: !!v.kazandi, yildiz: v.yildiz || 0, skor: v.skor || 0 };
  if (v.mod === 'yol' && STR && STR.yol) {
    const y = STR.yol, R = STR.R || {}, no = y.no;
    y.olcumDeneme = (yolDeneme[no] = (yolDeneme[no] || 0) + 1);
    Object.assign(o, { yol_no: no, deneme: y.olcumDeneme, kalan_hamle: R.hamle || 0, neredeyse: !!y.devam, davet: !!y.davet, zorluk: y.b.zor, hedef: y.b.hedef.tur,
      sure_sn: R.t0 ? Math.round((Date.now() - R.t0) / 1000) : 0 });
  }
  Olcum.olay('bolum_bitti', o);
});
const yolDeneme = {};   // bu oturumda bölüm başına deneme sayısı
Olay.dinle('onlineBitti', v => Olcum.olay('online_bitti', { mod: v.mod || 'hiz', kazandi: !!v.kazandi, bot: !!v.bot }));
Olay.dinle('hedefTamam', v => Olcum.olay('gunluk_hedef', { seri: v.seri }));
Olay.dinle('uniteTamam', v => Olcum.olay('unite_tamam', { seviye: v.lvl, unite: v.unite }));
// ekranlar: hangi ekranda bırakılıyor (screens.js goster çağırır)
let olcumEkran = null;
function olcumEkranAcildi(ad) { if (ad && ad !== olcumEkran) { olcumEkran = ad; Olcum.olay('ekran', { ad }); } }
