/* =====================================================================
   GÜNÜN GÖREVİ
   Her gün yeni, kısa bir görev: oyuncunun açık olan en yüksek seviyesinden 5 cümle (kısadan uzuna)
   ve aralarında 2 HATAYI BUL turu. Cümleler günün tarihinden üretilir: aynı gün aynı seviyede
   her açılışta aynı görev gelir (tekrar oynanabilir, en iyi skor saklanır).
   · Günün ilk tamamlanışı +XP bonusu verir (XP_KURAL.gorev, ilerleme.js).
   · Görev serisi: üst üste tamamlanan günler (günlük hedef serisinden ayrı).
   · Yarım kayıt yazılmaz (kısa oturum); kariyer yıldızlarına ve kilitlerine dokunmaz.
   Kayıt: kayit.gorev → { son: 'YYYY-AA-GG', seri, enUzun, toplam, gunler: { gün: en iyi skor } } (kayit-sema.js doğrular)
   ===================================================================== */
const GOREV_PLAN = ['kur', 'kur', 'sav', 'kur', 'kur', 'sav', 'kur'];
const GOREV_CUMLE = GOREV_PLAN.filter(x => x === 'kur').length;

// tarih + seviyeden tohumlanan rastgele sayı üreteci (aynı gün aynı görev)
function tohumluRastgele(metin) {
  let h = 2166136261;
  for (const ch of String(metin)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6D2B79F5) | 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gorevSeviye() { return sonAcikSeviye(); }
function gorevHazirla(gun, lvl) {
  const r = tohumluRastgele(gun + ':' + lvl);
  const kaynaklar = seviyeRakipleri(lvl).filter(cumleliMi), liste = [], alinan = {};
  for (let n = 0; kaynaklar.length && liste.length < GOREV_CUMLE && n < 400; n++) {
    const h = cumleler(kaynaklar[Math.floor(r() * kaynaklar.length)].id);
    if (!h.length) continue;
    const s = h[Math.floor(r() * h.length)], k = s.kaynak + ':' + s.i;
    if (alinan[k] || s.w.length < 3 || s.w.length > 11) continue;
    alinan[k] = 1; liste.push([s.kaynak, s.i]);
  }
  liste.sort((a, b) => cumleler(a[0])[a[1]].w.length - cumleler(b[0])[b[1]].w.length);   // ısınarak başla
  return { gun, lvl, liste, plan: GOREV_PLAN.slice() };
}
function gorevBugunTamam() { return kayit.gorev.son === bugunAnahtar(); }
// seri bugün sürüyor mu (dün ya da bugün tamamlandıysa)
function gorevSeri() { const g = kayit.gorev; return g.son && gunFarki(g.son, bugunAnahtar()) <= 1 ? g.seri : 0; }
function gorevBaslat() {
  sesAc();
  const lvl = gorevSeviye(), g = gorevHazirla(bugunAnahtar(), lvl);
  if (!g.liste.length) { not(tt('Bugünün görevi hazırlanamadı.')); return; }
  dojoBaslat({ id: 'gunluk', lvl, ad: tt('Günün Görevi'), world: tt('Günün Görevi'), rule: tt('Her gün yeni 5 cümle'), n: 0, karma: true }, { gunluk: g });
}
// dojoBitti (game.js) çağırır: görev kazanıldı
function gorevKaydet(gun, skor, yildiz) {
  const g = kayit.gorev, ilk = g.son !== gun;
  if (ilk) {
    const fark = g.son ? gunFarki(g.son, gun) : 99;
    g.seri = fark === 1 ? g.seri + 1 : fark <= 0 ? Math.max(1, g.seri) : 1;
    g.son = gun; g.toplam++; g.enUzun = Math.max(g.enUzun, g.seri);
  }
  const once = g.gunler[gun] || 0;
  g.gunler[gun] = Math.max(once, skor);
  const k = Object.keys(g.gunler); if (k.length > 60) k.sort().slice(0, k.length - 60).forEach(x => delete g.gunler[x]);
  kaydet();
  return { ilk, seri: g.seri, skor, enIyi: g.gunler[gun], rekor: !ilk && skor > once, yildiz };
}

/* ---- ekran parçaları ---- */
// son 7 gün: tamamlanan günler dolu nokta
function gorevHaftaHtml() {
  const b = bugunAnahtar(), g = kayit.gorev.gunler; let o = '';
  for (let i = 6; i >= 0; i--) { const gun = gunEkle(b, -i); o += `<i class="${g[gun] !== undefined ? 'dolu' : ''}${i === 0 ? ' bugun' : ''}"></i>`; }
  return `<span class="gorev-hafta" aria-hidden="true">${o}</span>`;
}
function gorevHtml() {
  const tamam = gorevBugunTamam(), seri = gorevSeri(), en = kayit.gorev.gunler[bugunAnahtar()] || 0;
  return `<button class="gorev-btn ${tamam ? 'tamam' : 'hazir'}" id="a-gorev"><i>📅</i>
    <span class="gb-ic"><b>${tt('GÜNÜN GÖREVİ')}</b><small>${tamam ? tt('Bugün tamam ✓ · en iyi {s}', { s: en }) : tt('{n} cümle · +{x} XP bonus', { n: GOREV_CUMLE, x: XP_KURAL.gorev })}</small>${gorevHaftaHtml()}</span>
    <em class="${seri ? 'alev' : 'sonuk'}">🔥 ${seri}</em></button>`;
}
// sonuç ekranı paneli
function gorevSonucHtml(s) {
  if (!s) return '';
  return `<div class="gorev-sonuc">${gorevHaftaHtml()}<b>${tt('📅 Görev serisi: {n} gün', { n: s.seri })}</b>
    <span>${s.ilk ? tt('Bugünün görevi tamam! +{x} XP bonus', { x: XP_KURAL.gorev }) : s.rekor ? tt('Bugünün yeni en iyi skoru!') : tt('Bugünün en iyi skoru: {s}', { s: s.enIyi })}</span>
    <small>${tt('Yarın yeni cümlelerle yeni görev gelir.')}</small></div>`;
}
