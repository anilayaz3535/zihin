/* =====================================================================
   ROZETLER (başarımlar)
   Oyun motoruna dokunmaz; olay yolunu dinler. Uzun vadeli hedefler verir: cümle, kelime, seri, kombo…
   · Sayaçlar kayit.istat'a yazılır (cumle, kusursuz, hataBul, enKombo; istat doğrulayıcısı her sayıyı kabul eder).
   · Açılan rozetler kayit.rozet → { 'id': açıldığı zaman } (kayit-sema.js doğrular).
   · Oyun sırasında bilgi kutusu çıkmaz (oyuncu isteği): yeni rozetler bölüm sonunda sonuç ekranında kutlanır.
   · Profil ilk açıldığında (eski oyuncu) hak edilmiş rozetler sessizce açılır.
   ===================================================================== */
const ist = k => kayit.istat[k] || 0;
const ROZETLER = [
  { id: 'cumle1', i: '✏️', ad: 'İlk Cümle', ac: 'İlk cümleni kur', d: () => [ist('cumle'), 1] },
  { id: 'cumle50', i: '📝', ad: 'Cümle Kurucu', ac: '50 cümle kur', d: () => [ist('cumle'), 50] },
  { id: 'cumle250', i: '📚', ad: 'Cümle Mimarı', ac: '250 cümle kur', d: () => [ist('cumle'), 250] },
  { id: 'cumle1000', i: '🏛️', ad: 'Cümle Efsanesi', ac: '1.000 cümle kur', d: () => [ist('cumle'), 1000] },
  { id: 'kusursuz25', i: '💎', ad: 'Hatasız', ac: '25 cümleyi hatasız kur', d: () => [ist('kusursuz'), 25] },
  { id: 'kusursuz100', i: '👑', ad: 'Kusursuz', ac: '100 cümleyi hatasız kur', d: () => [ist('kusursuz'), 100] },
  { id: 'hata25', i: '🔍', ad: 'Hata Dedektifi', ac: '25 hata bul', d: () => [ist('hataBul'), 25] },
  { id: 'hata100', i: '🕵️', ad: 'Keskin Göz', ac: '100 hata bul', d: () => [ist('hataBul'), 100] },
  { id: 'kelime50', i: '🌱', ad: 'Kelime Filizi', ac: '50 kelimeyle tanış', d: () => [Object.keys(kayit.kel).length, 50] },
  { id: 'kelime250', i: '🌿', ad: 'Kelime Bahçesi', ac: '250 kelimeyle tanış', d: () => [Object.keys(kayit.kel).length, 250] },
  { id: 'kelime1000', i: '🌳', ad: 'Kelime Ormanı', ac: '1.000 kelimeyle tanış', d: () => [Object.keys(kayit.kel).length, 1000] },
  { id: 'kombo10', i: '⚡', ad: 'Kombo x10', ac: 'Art arda 10 doğru hamle', d: () => [ist('enKombo'), 10] },
  { id: 'kombo25', i: '🌟', ad: 'Kombo x25', ac: 'Art arda 25 doğru hamle', d: () => [ist('enKombo'), 25] },
  { id: 'seri3', i: '🔥', ad: 'Isınma', ac: '3 gün seri', d: () => [kayit.seri.enUzun, 3] },
  { id: 'seri7', i: '🔥', ad: 'Bir Hafta', ac: '7 gün seri', d: () => [kayit.seri.enUzun, 7] },
  { id: 'seri30', i: '☄️', ad: 'Bir Ay', ac: '30 gün seri', d: () => [kayit.seri.enUzun, 30] },
  { id: 'gorev1', i: '📅', ad: 'Günün Görevi', ac: 'İlk günlük görevi bitir', d: () => [kayit.gorev.toplam, 1] },
  { id: 'gorev7', i: '🗓️', ad: 'Görev Serisi', ac: '7 gün üst üste günlük görev', d: () => [kayit.gorev.enUzun, 7] },
  { id: 'yildiz10', i: '⭐', ad: 'Üç Yıldız', ac: '10 bölümde 3 yıldız al', d: () => [Object.keys(kayit.yildiz).filter(k => kayit.yildiz[k] >= 3).length, 10] },
  { id: 'xp1000', i: '🎓', ad: '1.000 XP', ac: 'Toplam 1.000 XP topla', d: () => [kayit.xp, 1000] },
  { id: 'xp10000', i: '🏅', ad: '10.000 XP', ac: 'Toplam 10.000 XP topla', d: () => [kayit.xp, 10000] },
  { id: 'online1', i: '🤝', ad: 'İlk Maç', ac: 'Bir online maç kazan', d: () => [ist('onlineGalibiyet'), 1] },
  ...['A2', 'B1', 'B2', 'C1', 'C2'].map((l, n) => ({ id: 'sev' + l, i: ['🚲', '🚗', '🚆', '✈️', '🚀'][n], ad: '{l} Seviyesi', ac: '{l} seviyesini aç', l, d: () => [seviyeAcikMi(l) ? 1 : 0, 1] })),
];
function rozetAcikMi(id) { return !!kayit.rozet[id]; }
function rozetSay() { rozetKontrol(false); return ROZETLER.filter(r => rozetAcikMi(r.id)).length; }   // hak edilmiş ama henüz işaretlenmemiş rozetler de sayılır
// hak edilen rozetleri açar; yeni açılanları döner
// yazma: false ise açılan rozetler yalnız bellekte işaretlenir (profil açılırken kayıt yazılmaz; sonraki kayıtta gider)
function rozetKontrol(yazma) {
  if (!aktifProfil()) return [];
  const yeni = [];
  ROZETLER.forEach(r => {
    if (rozetAcikMi(r.id)) return;
    let d; try { d = r.d(); } catch (e) { return; }
    if (d[0] >= d[1]) { kayit.rozet[r.id] = Date.now(); yeni.push(r); }
  });
  if (yeni.length && yazma !== false) kaydet();
  return yeni;
}
const rozetAd = r => tt(r.ad, { l: r.l || '' }), rozetAc = r => tt(r.ac, { l: r.l || '' });

/* ---- olaylar ---- */
const rozetSayar = () => aktifProfil() && bolumModu() !== 'ilk';
Olay.dinle('kayitYuklendi', () => { rozetKontrol(false); });   // eski oyuncu: hak ettikleri sessizce açılır (kutlanmaz)
Olay.dinle('cumleTamam', v => { if (!rozetSayar()) return; kayit.istat.cumle = ist('cumle') + 1; if (v.kusursuz) kayit.istat.kusursuz = ist('kusursuz') + 1; });
Olay.dinle('hataBulundu', () => { if (rozetSayar()) kayit.istat.hataBul = ist('hataBul') + 1; });
Olay.dinle('kombo', v => { if (rozetSayar() && v.n > ist('enKombo')) kayit.istat.enKombo = v.n; });
function rozetBolumSonu() {
  const y = rozetKontrol();
  if (y.length && D) D.yeniRozet = (D.yeniRozet || []).concat(y);
  kaydet();
}
Olay.dinle('bolumBitti', rozetBolumSonu);
Olay.dinle('onlineBitti', rozetBolumSonu);

/* ---- ekranlar ---- */
function rozetSonucHtml(l) {
  if (!l || !l.length) return '';
  return `<div class="rozet-yeni"><div class="ry-bas">${tt(l.length > 1 ? '🏅 {n} YENİ ROZET!' : '🏅 YENİ ROZET!', { n: l.length })}</div>
    <div class="ry-liste">${l.map(r => `<span class="ry"><i>${r.i}</i><b>${esc(rozetAd(r))}</b><small>${esc(rozetAc(r))}</small></span>`).join('')}</div></div>`;
}
function rozetlerAc(geri) {
  rozetKontrol();
  const n = rozetSay();
  let ic = `<div class="ust-satir"><button class="geri" id="r-geri">${tt('← Geri')}</button></div>
    <div class="pen-ust"><h2>${tt('🏅 Rozetler')}</h2><span class="lvl">${n} / ${ROZETLER.length}</span></div><div class="rz-izgara">`;
  ROZETLER.forEach(r => {
    const acik = rozetAcikMi(r.id); let d = [0, 1]; try { d = r.d(); } catch (e) { }
    const oran = Math.max(0, Math.min(1, d[0] / d[1]));
    ic += `<div class="rz-kart ${acik ? 'acik' : 'kilit'}" aria-label="${esc(rozetAd(r))} · ${esc(rozetAc(r))}${acik ? '' : ' · ' + Math.min(d[0], d[1]) + ' / ' + d[1]}">
      <i>${r.i}</i><b>${esc(rozetAd(r))}</b><small>${esc(rozetAc(r))}</small>
      ${acik ? `<em>${tt('✓ açıldı')}</em>` : d[1] > 1 ? `<span class="rz-bar"><u style="width:${Math.round(oran * 100)}%"></u></span><em>${Math.min(d[0], d[1]).toLocaleString(yerel())} / ${d[1].toLocaleString(yerel())}</em>` : `<em>🔒</em>`}</div>`;
  });
  ic += '</div>';
  goster(ic, 'genis', 'rozetler');
  $('#r-geri').onclick = () => (geri || acilisAc)();
}
