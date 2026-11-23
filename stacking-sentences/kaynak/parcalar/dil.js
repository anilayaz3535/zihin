/* =====================================================================
   ARAYÜZ DİLİ
   Menü, düğme, bildirim ve oyun içi uyarı yazıları buradan çevrilir.
   İngilizce öğretim içeriği (cümleler, kelimeler, anlamlar, hata kuralları,
   dersler, "Türkçe mantığıyla" açıklamaları) burada DEĞİL: ona dokunulmaz,
   her arayüz dilinde aynen gösterilir.
   · Anahtar Türkçe metnin kendisidir: tt('OYUNU KAYDET') → Türkçede aynen çıkar.
   · Yer tutucu: tt('BOMBA! {n} KELİME PATLADI', { n: 3 }).
   · Yeni dil: DIL_SOZLUK'e bir sözlük (ör. de: {...}) ekle, DILLER'e yaz.
     Karşılığı olmayan metin Türkçe kalır; oyun bozulmaz.
   · Çeviriler dil-en.js dosyasında.
   ===================================================================== */
const MARKA = { ad: 'Stacking Sentences', a: 'STACKING', b: 'SENTENCES' };
const DILLER = [{ kod: 'tr', ad: 'Türkçe' }, { kod: 'en', ad: 'English' }];
const DIL_SOZLUK = {};
const DIL_ANAHTAR = 'te_dil';
let arayuzDili = 'tr';
function tt(s, p) {
  const sz = DIL_SOZLUK[arayuzDili];
  let r = (sz && sz[s]) || s;
  if (p) r = r.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined && p[k] !== null ? p[k] : m));
  return r;
}
function dilOku() { const k = Depo.al(DIL_ANAHTAR); arayuzDili = DILLER.some(d => d.kod === k) ? k : 'tr'; document.documentElement.lang = arayuzDili; }
function dilSec(kod) {
  Depo.yaz(DIL_ANAHTAR, kod); dilOku(); sabitYazilar();
  if (typeof L !== 'undefined' && L.in) { SPR.clear(); renderBG(); yerlesimYenile(); }   // tuvale çizili yazılar
}
// index.html'deki sabit yazılar: data-t (yazı) ve data-ta (aria-label) taşıyan öğeler
function sabitYazilar() {
  document.querySelectorAll('[data-t]').forEach(e => { if (!e.dataset.t) e.dataset.t = e.textContent; e.textContent = tt(e.dataset.t); });
  document.querySelectorAll('[data-ta]').forEach(e => { if (!e.dataset.ta) e.dataset.ta = e.getAttribute('aria-label') || ''; e.setAttribute('aria-label', tt(e.dataset.ta)); });
  document.title = MARKA.ad;
}
// sayı ve tarih biçimi arayüz diline göre (isimler ve içerik Türkçe kurallarla kalır)
function yerel() { return arayuzDili === 'en' ? 'en-US' : 'tr-TR'; }
function logoHtml(cls) { return `<div class="logo${cls ? ' ' + cls : ''}"><span class="a">${MARKA.a}</span> <span class="b">${MARKA.b}</span></div>`; }
function dilSecimHtml() {
  return `<div class="bolum">${tt('Arayüz dili')}</div><div class="sekmeler kucuk" id="dil-sec">${DILLER.map(d => `<button data-dil="${d.kod}" class="${d.kod === arayuzDili ? 'secili' : ''}">${d.ad}</button>`).join('')}</div>
    <p class="aciklama kucuk">${tt('Menü ve düğme yazıları değişir. İngilizce öğretim içeriği ve Türkçe anlamlar aynı kalır.')}</p>`;
}
// nasıl oynanır örnek kutularındaki kısa yazılar (etiketler arası metin) çevrilir
function demoCevir(html) {
  if (arayuzDili === 'tr') return html;
  return html.replace(/>([^<>]+)</g, (m, s) => { const k = s.trim(); if (!k) return m; const c = tt(k); return c === k ? m : '>' + s.replace(k, c) + '<'; });
}
dilOku();

