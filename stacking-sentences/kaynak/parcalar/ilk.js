/* =====================================================================
   İLK 60 SANİYE: rehberli ilk cümle
   Telefonda hiç profil (ve profillerden önceki eski kayıt) yoksa oyun, isim ve
   seviye sormadan önce kısa bir A1 cümlesiyle açılır:
     karşılama → Türkçesi okunur → karolar tahtaya yağar, koç ve el işareti ne yapılacağını gösterir
     → cümle tamam: ilk XP ve günlük halka → isim (profil) → günlük hedef → seviye seçimi
   Rehberli cümlede ilk kelime sol başta hazır durur; tuzak kelime, süre, hata göstergesi ve renk patlaması yoktur.
   Yanlış kelimeyi dizinin sonuna koymak engellenir (ceza, hata defteri yok), karo yerine geri seker.
   Karolarda Türkçe yazmaz; Türkçe cümle karolar yağmadan önce okunur (oyunun kuralları aynı).
   İçerik ve öğretim kuralları değişmez: cümle ilk bölümün kendi cümlelerinden seçilir.
   Motorla bağlantı (kancalar):
     game.js   dojoBaslat(r, { ilkCumle }), baslangicDuzelt (ilk kelime sol başta, çapa), hamle (yanlış → ilkUyar),
               sureHesapla / gostergeEkle / renkKapali (rehberde kapalı), dojoBitti → ilkSonuc
     engine.js update → ilkTik, tahtaYerlesim (koç baloncuğuna yer)
     kayit.js  profilOlustur(ad, true): rehberli cümlenin XP'si yeni profile geçer
   ===================================================================== */
let ilkDurum = null;   // { adim: yerleşen kelime sayısı, blok, bekleT, ipucu, uyari, uyariT, m }

// Karşılama yalnız telefonda hiç profil ve eski kayıt yokken gösterilir
function ilkGosterilsinMi() { return !profiller.liste.length && !eskiKayitVarMi(); }
// Profil yoksa nereye: ilk kez açılıyorsa karşılama, değilse isim formu
function profilsizAc() { if (ilkGosterilsinMi()) ilkKarsila(); else profilYeniAc(); }

// Rehber cümlesi: ilk bölümün 3 (yoksa 4) kelimelik ilk cümlesi
function ilkCumleSec() {
  const r = seviyeRakipleri('A1')[0], l = r ? cumleler(r.id) : [];
  return l.find(s => s.w.length === 3) || l.find(s => s.w.length === 4) || l.slice().sort((a, b) => a.w.length - b.w.length)[0] || null;
}

/* ---------------- karşılama ---------------- */
function ilkKarsila() {
  if (G.state !== 'menu') demo();
  D = null; ilkDurum = null; ilkKocYaz('');
  Ses.muzik('menu'); Konus.sus();
  goster(`<div class="ilk-karsila">${logoHtml('')}
    <div class="sub">${tt('HOŞ GELDİN!')}</div>
    <p class="aciklama ortali">${tt('İngilizceyi cümle kurarak öğren: Türkçesini duy, İngilizce kelime karolarını tahtada sırayla yan yana diz.')}</p>
    <button class="big" id="ilk-bas">${tt('İLK CÜMLENİ KUR ▶')}</button>
    <p class="aciklama kucuk ortali">${tt('Yaklaşık yarım dakika sürer. Sesin açık olsun.')}</p>
    <div class="skip" id="ilk-gec">${tt('Rehberi geç, profil aç ›')}</div></div>`, '', 'ilkKarsila');
  $('#ilk-bas').onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); ilkBaslat(); };
  $('#ilk-gec').onclick = () => { Ses.cal('tik', { ses: 0.4 }); profilYeniAc(); };
}
function ilkBaslat() {
  const s = ilkCumleSec(); if (!s) { profilYeniAc(); return; }
  ilkDurum = null;
  dojoBaslat({ id: 'ilk-cumle', lvl: 'A1', world: tt('İlk cümlen'), ad: tt('İlk cümlen'), n: 0 }, { ilkCumle: s });
}

/* ---------------- oyun içi koç ---------------- */
function ilkUyar(m) {
  const d = ilkDurum; if (!d) return;
  d.uyari = m; d.uyariT = 2.4; d.ipucu = true;
  Ses.cal('tik', { ses: 0.3 });
}
// Her karede (engine.js update): koçun yazısı; ilk kelimede hemen, sonrakilerde 2,5 sn sonra ya da hatalı denemede el işareti
function ilkTik(dt) {
  if (!D || !D.ilkCumle) { if (ilkDurum) { ilkDurum = null; ilkKocYaz(''); } return; }
  const d = ilkDurum || (ilkDurum = { adim: 0, sonAdim: -1, bekleT: 0, ipucu: false, uyari: '', uyariT: 0 });
  if (G.state !== 'playing') { ilkKocYaz(''); return; }
  d.uyariT = Math.max(0, d.uyariT - dt);
  const R = G.R;
  let m = '';
  if (R && R.tip === 'kur' && !R.bitti) {
    if (R.tahtaHazir) {
      if (d.sonAdim !== d.adim) { d.sonAdim = d.adim; d.bekleT = 0; d.ipucu = false; d.uyariT = 0; }   // yeni kelime: eski uyarı silinir
      d.bekleT += dt;
      const need = hedefDizi(R), k = R.zincir ? R.zincir.k : 1, kelime = need[Math.min(k, need.length - 1)];
      const ipucu = d.adim === 0 || d.ipucu || d.bekleT > 2.5;
      if (ipucu && !G.surukle) { const h = ipucuHamle(R); if (h) G.ipucu = { h, t: 0.3, R }; }
      if (d.adim === 0) m = tt('“{k}” kelimesini tut ve parlayan yere sürükle.', { k: kelime });
      else m = ipucu ? tt('İpucu: “{k}” kelimesini dizinin sağına sürükle.', { k: kelime }) : tt('Sıradaki kelime hangisi? Onu dizinin sağına sürükle.');
    } else if (d.adim === 0) m = tt('Önce Türkçesini dinle. Sonra İngilizcesini kelime kelime kuracaksın.');
  }
  if (d.uyariT > 0 && m) m = d.uyari;
  ilkKocYaz(m);
}
// Koç baloncuğu: tahtanın hemen altında (tahta yerleşimi ona yer ayırır); Türkçe cümleyi ve karoları kapatmaz.
// Ekran okuyucu da duyurur (role="status").
function ilkKocYaz(m) {
  const el = document.getElementById('koc'); if (!el) return;
  if (el.dataset.m !== m) { el.dataset.m = m; el.textContent = m; el.classList.toggle('show', !!m); }
  if (!m) return;
  const T = G.T, alt = T ? T.y + T.rows * T.ch + 8 : L.in.y + L.in.h * 0.8;
  el.style.top = Math.round(alt) + 'px';
  el.style.maxWidth = Math.round(Math.min(L.in.w - 8, W - 16)) + 'px';
}
Olay.dinle('dogruHamle', () => { if (D && D.ilkCumle && ilkDurum) ilkDurum.adim++; });

/* ---------------- cümle tamam: ilk XP, isim ---------------- */
function ilkSonuc() {
  const d = D, s = d && d.ilkCumle; if (!s) { profilsizAc(); return; }
  ilkKocYaz('');
  goster(`<div class="go zafer ilk-baslik">${tt('İLK CÜMLEN TAMAM!')}</div>
    <div class="ilk-cumle">${dinleBtn(s.en)}<span><b>${esc(s.en)}</b><small>${esc(s.tr)}</small></span></div>
    ${sonucXpHtml(d.ilerleme)}
    <p class="aciklama">${tt('İlerlemen kaybolmasın: ismini yaz. Bu telefonda saklanır.')}</p>
    <input id="i-ad" class="giris" maxlength="16" placeholder="${tt('İsmin')}" autocomplete="off" autocapitalize="words" enterkeyhint="done">
    <button class="big" id="i-kaydet">${tt('KAYDET VE DEVAM ▶')}</button>`, '', 'ilkSonuc');
  halkalariDoldur(card);
  const inp = $('#i-ad');
  const tamam = () => {
    const a = profilAdUygun(inp.value); if (a.hata) { not(a.hata); return; }
    sesAc(); profilOlustur(a.ad, true); profilDegisti();
    Ses.cal('kelime', { ses: 0.6 });
    ilkHedefAc(a.ad);
  };
  $('#i-kaydet').onclick = tamam;
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); tamam(); } };
}

/* ---------------- günlük hedef seçimi (sonra seviye seçimi) ---------------- */
const ILK_HEDEF_ACIK = { 20: 'Yarım bölüm kadar · kısa bir mola', 50: 'Günde 1–2 bölüm · önerilen', 100: 'Günde 2–3 bölüm · hızlı ilerle' };
function ilkHedefAc(ad) {
  Olcum.olay('ilk_profil');
  if (G.state !== 'menu') demo();
  D = null;
  goster(`<div class="sub">${tt('Hoş geldin, {ad}!', { ad: esc(ad || '') })}</div>
    <div class="bolum">${tt('GÜNLÜK HEDEFİN')}</div>
    <p class="aciklama">${tt('Hedefine ulaştığın her gün 🔥 serin 1 artar. İstediğin zaman Ayarlar’dan değiştirebilirsin.')}</p>
    ${HEDEFLER.map(h => `<button class="secim${h.xp === 50 ? ' vurgu' : ''}" data-hedef="${h.xp}"><div class="rozet">${h.xp}</div><div><b>${tt(h.ad)} · ${h.xp} XP</b><span>${tt(ILK_HEDEF_ACIK[h.xp])}</span></div></button>`).join('')}`, 'genis', 'ilkHedef');
  card.querySelectorAll('.secim[data-hedef]').forEach(b => b.onclick = () => {
    Ses.cal('tik', { ses: 0.5 }); hedefSec(+b.dataset.hedef);
    ilkGiris();
  });
}
