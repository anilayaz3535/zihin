/* =====================================================================
   KİLİTLER (28 Kasım 2026): SEVİYE SINAVI KAPISI · KADEMELİ AÇILAN ÖZELLİKLER
   · Seviye hak edilir: bir seviye (A2 … C2) ancak bir önceki seviyenin SEVİYE SINAVI (Kariyer'deki "<seviye>-U" bölümü,
     karışık cümleler + hatayı bul) geçilince açılır. Kariyer zaten böyleydi; artık Bölüm Yolu ve Online da buna uyar:
       – Bölüm Yolu: yeni seviyeli bölgeye (Park A2, Kütüphane B1, Ofis B2, Havalimanı C1, Rasathane C2) girmek için sınav kapısı
         (ekran 'yolSinav'); sınav haritadan doğrudan açılır, geçince Kariyer'de de o seviye açılır, sonuçtan Bölüm Yolu'na dönülür.
       – Online: yalnız hak edilen seviyeler seçilebilir (arkadaşın odası ve hızlı eşleşmenin düşük seviyesi bundan etkilenmez).
     Seviye testiyle (Kariyer → Seviyeni ölç / ilk giriş) bulunan seviye de hak edilmiş sayılır (seviyeUygula onu açar).
     Davet linkiyle oynanan bölüm kapıya takılmaz (ilerleme değişmez).
   · Kademeli açılma: ana menü ilk gün sade (Kariyer + Online, küçük Bölüm Yolu bağlantısı); diğer özellikler ilerledikçe "YENİ!" rozetiyle açılır (OZELLIK).
     kayit.acilan: görülen özellikler (null: henüz hiç bakılmadı → o an açık olanlar görülmüş sayılır, eski oyuncuda rozet yağmuru olmaz).
   · Test kancası: window.__hepsiAcik = true → bütün seviyeler ve özellikler açık (eski testler kilitlere takılmasın).
   ===================================================================== */
const hepsiAcik = () => !!window.__hepsiAcik;
function seviyeHak(l) { const i = SEVIYELER.indexOf(l); return i <= 0 || hepsiAcik() || seviyeAcikMi(l); }
function sinavSeviye(l) { const i = SEVIYELER.indexOf(l); return i > 0 ? SEVIYELER[i - 1] : null; }   // l'yi açan sınavın seviyesi
function sinavRakip(l) { const s = sinavSeviye(l); return s ? rakipBul(s + '-U') : null; }
function yolBolgeSira(no) { return Math.min(YOL_BOLGE.length - 1, Math.floor((no - 1) / YOL_BOLUM_BOLGE)); }
function yolBolgeHak(no) { return seviyeHak(YOL_BOLGE[yolBolgeSira(no)].lvl); }

/* ---------------- sınav kapısı (Bölüm Yolu) ---------------- */
let sinavDonus = null;   // { no, id }: sınav Bölüm Yolu'ndan açıldıysa sonuçtan oraya dönülür
function sinavKapisi(no) {
  const B = YOL_BOLGE[yolBolgeSira(no)], s = sinavSeviye(B.lvl), r = sinavRakip(B.lvl);
  if (!r) { yolHaritaAc(); return; }
  Olcum.olay('sinav_kapisi', { lvl: B.lvl, bolum: no });
  goster(`<div class="y-bas" style="--b:${B.renk}"><div class="y-bas-no">🎓 ${tt('{l} SEVİYE SINAVI', { l: s })}</div>
      <small>${B.i} ${tt(B.ad)} · ${B.lvl}</small></div>
    <div class="sinav-kapi"><p>${tt('{b} bölgesi {l} seviyesinde. Açmak için {s} seviyesini hak etmelisin.', { b: tt(B.ad), l: B.lvl, s })}</p>
      <ul><li>${tt('{s} seviyesinden karışık cümleler kuracak, aralarında hataları bulacaksın.', { s })}</li>
        <li>${tt('Hata göstergesi dolarsa sınavı geçemezsin; istediğin kadar yeniden girebilirsin.')}</li>
        <li>${tt('Geçersen {l} açılır: Bölüm Yolu’nda {b}, Kariyer’de {l} dersleri, Online’da {l} maçları.', { l: B.lvl, b: tt(B.ad) })}</li></ul></div>
    <button class="big" id="sk-gir">${tt('🎓 SINAVA GİR')}</button>
    <div class="row"><button class="sec" id="sk-hazirlan">${tt('📚 {s} ile hazırlan', { s })}</button><button class="sec" id="sk-harita">${tt('HARİTA')}</button></div>`, '', 'yolSinav');
  $('#sk-gir').onclick = () => { sesAc(); sinavDonus = { no, id: r.id }; cumleDojo(r); };
  $('#sk-hazirlan').onclick = () => { sesAc(); sinavDonus = null; haritaAc(s); };
  $('#sk-harita').onclick = () => { sinavDonus = null; yolHaritaAc(); };
}
// sonuç ekranı (screens.js sonucGoster): Bölüm Yolu'ndan açılan sınavın dönüş düğmesi
function sinavDonusHtml(d) {
  const s = sinavDonus; if (!s || !d || !d.r || d.r.id !== s.id) return '';
  const B = YOL_BOLGE[yolBolgeSira(s.no)];
  return d.kazandi ? `<button class="big" id="s-yol">🗺 ${tt('{b} AÇILDI · BÖLÜM YOLU', { b: tt(B.ad).toLocaleUpperCase(arayuzDili === 'en' ? 'en' : 'tr') })}</button>`
    : `<button class="big" id="s-yol">🗺 ${tt('BÖLÜM YOLUNA DÖN')}</button>`;
}
function sinavDonusBagla(d) {
  const b = $('#s-yol'); if (!b) return;
  const s = sinavDonus;
  b.onclick = () => { sinavDonus = null; sesAc(); if (d.kazandi && yolBolgeHak(s.no)) yolBaslangic(s.no); else yolHaritaAc(); };
}

/* ---------------- kademeli açılan özellikler (ana menü) ---------------- */
const yolGecilen = () => Math.max(0, Math.min(YOL_TOPLAM, kayit.yol.acik) - 1);
const kariyerGecilen = () => Object.keys(kayit.yildiz).length;
const OZELLIK = [   // Kariyer ve Online baştan açık; ilerleme = Kariyer bölümleri + Bölüm Yolu bölümleri
  { id: 'gorev', i: '📅', ad: 'Günün Görevi', ne: () => yolGecilen() + kariyerGecilen(), hedef: 1, sart: 'Bir bölüm geç' },
  { id: 'cark', i: '🎡', ad: 'Günlük çark', ne: () => yolGecilen() + kariyerGecilen(), hedef: 3, sart: '3 bölüm geç' },
  { id: 'rozet', i: '🏅', ad: 'Rozetler', ne: () => rozetSay(), hedef: 1, sart: 'İlk rozetini kazan' },
  { id: 'etk', i: '🏆', ad: 'Haftalık etkinlik', ne: () => yolGecilen() + kariyerGecilen(), hedef: 6, sart: '6 bölüm geç' },
  { id: 'sandik', i: '🎁', ad: 'Sandıklar', ne: () => (kayit.sandik.slot.length ? 1 : yolGecilen()), hedef: 1, sart: 'Bölüm Yolu’nda bir bölüm geç' },
];
function ozellikAcik(id) { if (hepsiAcik()) return true; const o = OZELLIK.find(x => x.id === id); return !o || o.ne() >= o.hedef; }
// açılışta: kaydı hazırlar, yeni açılanları döner (YENİ! rozeti için)
function ozellikYeniler() {
  const acik = OZELLIK.filter(o => ozellikAcik(o.id)).map(o => o.id);
  if (!Array.isArray(kayit.acilan)) { kayit.acilan = acik; return []; }   // yalnız bellekte: menüyü açmak kayıt yazmasın (sonraki kayıtta gider)
  return acik.filter(id => kayit.acilan.indexOf(id) < 0);
}
function ozellikGoruldu(id) { if (Array.isArray(kayit.acilan) && kayit.acilan.indexOf(id) < 0) { kayit.acilan.push(id); kaydet(); } }
// sıradaki kilitli özellik: ana menüde tek satır ipucu
function ozellikSiradakiHtml() {
  const o = OZELLIK.find(x => !ozellikAcik(x.id)); if (!o) return '';
  const n = Math.min(o.ne(), o.hedef);
  return `<div class="siradaki-ozellik">🔒 ${tt('Sıradaki: {i} {ad}', { i: o.i, ad: tt(o.ad) })}<small>${tt(o.sart)}${o.hedef > 1 ? ` · ${n}/${o.hedef}` : ''}</small></div>`;
}

/* ---------------- İngilizce cümle varsayılan görünür (28 Kasım 2026) ----------------
   Eski kayıtlarda "gizle" seçili olabilir: bir kez "göster"e geçirilir (oyuncu sonra Kariyer'den yeniden gizleyebilir). */
Olay.dinle('kayitYuklendi', () => {
  const a = kayit && kayit.ayar; if (!a || a.ingGecis) return;
  a.ingCumle = true; a.ingCumleSecildi = true; a.ingGecis = true;   // yalnız bellekte; sonraki kayıtta yazılır
});
