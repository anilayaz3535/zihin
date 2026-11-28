/* =====================================================================
   KAYIT KATMANI
   Profiller, ilerleme (kayit) ve yarım bölüm kaydı. Kalıcı hafızaya (Depo)
   yalnız bu dosya yazar; okunan her veri kayit-sema.js ile doğrulanır.
   Oyun motoru ve ekranlar kayda bu işlevlerle ulaşır:
     kaydet, profilleriYukle, profilOlustur, profilSec, profilSil, profilOzet,
     yarimOku, yarimYaz, yarimSil, kayitUyar, kayitUyarilariGoster
   ===================================================================== */
/* ---------------- profiller ve kayıt (yalnız bu telefonda / tarayıcıda) ----------------
   te_profiller_v1   → { aktif: id, liste: [{ id, ad, t }] }
   te_profil_<id>    → o profilin bütün ilerlemesi (kayit)
   te_yarim_<id>     → o profilin yarıda kalan bölümü (game.js · yarimKaydet)
   te_kayit_v1       → profillerden önceki tek kayıt; ilk açılan profile aktarılır, yedek olarak silinmez */
const KAYIT = 'te_kayit_v1', PROFILLER = 'te_profiller_v1', PROFIL_ON = 'te_profil_', YARIM_ON = 'te_yarim_';
function bosKayit() {
  return { v: 1, baslangic: null, acik: { 'A1-1': true }, yildiz: {}, kel: {}, tekrar: [], ders: {}, gorulen: {}, rehber: false, kelRehber: false,
    // ayar.ing*: İngilizceyi göster / gizle seçimi (Cümleler ve Kelimeler sekmesi; *Secildi: oyuncuya soruldu mu)
    ayar: { muzik: true, efekt: true, ses: true, trSes: true, dizilis: true, ingCumle: false, ingKelime: false, ingCumleSecildi: false, ingKelimeSecildi: false, yonergeSes: true, titresim: true, hatirlat: false }, best: 0, tutGor: false, sonLvl: 'A1', sonSekme: 'cumle', seviyeTesti: null,
    istat: { dojo: 0, zafer: 0, online: 0, onlineGalibiyet: 0 }, sonKayit: 0,
    xp: 0, gunluk: { hedef: 50, gunler: {} }, seri: { gun: 0, enUzun: 0, sonGun: null, dondurma: 0, donan: [] },   // ilerleme.js
    gorev: { son: null, seri: 0, enUzun: 0, toplam: 0, gunler: {} },   // Günün Görevi (gorev.js)
    rozet: {}, strRehber: false, yol: { acik: 1, yildiz: {}, enIyi: {} },
    envanter: { hamle3: 1, cekic: 1, miknatis: 1 }, sandik: { slot: [] }, cark: { son: null }, jeton: 50, can: { n: 5, t: null }, galibiyet: 0, acilan: null,
    etkinlik: { hafta: '', puan: 0, alinan: [], tamam: 0 } };   // etkinlik.js   // odul.js (başlangıçta birer güç hediye)                                     // rozet.js · strRehber: strateji alıştırması görüldü (strateji.js)
}
/* ---------------- kayıt okuma: doğrula (kayit-sema.js), bozuksa yedekle, oyuncuya bir kez söyle ---------------- */
const YEDEK_ON = 'te_yedek:';                     // te_yedek:<anahtar>:<zaman> → bozuk bulunan ham kayıt
const kayitUyarilari = [];                        // açılışta bir kez gösterilir (kayitUyarilariGoster)
function kayitUyar(m) {
  if (window.__acildi && typeof not === 'function') { not(m, 7000); return; }   // oyun açıksa hemen söyle
  if (kayitUyarilari.indexOf(m) < 0) kayitUyarilari.push(m);
}
// bozuk ham veri silinmez, yedeklenir (her anahtar için en çok 3 yedek)
function kayitYedekle(anahtar, ham) {
  try {
    const on = YEDEK_ON + anahtar + ':';
    const eski = Depo.anahtarlar().filter(k => k.indexOf(on) === 0).sort();
    if (eski.length && Depo.al(eski[eski.length - 1]) === String(ham)) return;   // aynısı zaten yedekli
    while (eski.length >= 3) Depo.sil(eski.shift());
    Depo.yaz(on + Date.now(), String(ham));
  } catch (e) { }
}
// kayıt yoksa null; okunamazsa (yedeklenir) null; parça parça bozuksa onarılmış kayıt
function kayitOku(anahtar) {
  const ham = Depo.al(anahtar);
  if (ham === null || ham === undefined || ham === '' || ham === 'null') return null;
  let j; try { j = JSON.parse(ham); } catch (e) { j = undefined; }
  const s = kayitDuzelt(j, bosKayit(), l => !!SEVIYE[l]);
  if (!s.bozuk.length) return s.k;
  kayitYedekle(anahtar, ham);
  if (s.bozuk[0] === 'tumu') { kayitUyar(tt('Kaydın okunamadı. Eski hali yedeklendi; oyun temiz bir kayıtla açıldı.')); return null; }
  kayitUyar(tt('Kaydının bir kısmı bozuktu ve düzeltildi. Eski hali yedeklendi.'));
  return s.k;
}
let profiller = { aktif: null, liste: [] }, kayit = bosKayit();
// açılışta (tarayıcı) ya da kalıcı hafıza hazır olunca (uygulama, boot) çağrılır
function profilleriYukle() {
  kayitUyarilari.length = 0;
  const ham = Depo.al(PROFILLER);
  let p = { aktif: null, liste: [] }, bozuk = [];
  if (ham && ham !== 'null') {
    let j; try { j = JSON.parse(ham); } catch (e) { j = undefined; }
    const s = profillerDuzelt(j); p = s.p; bozuk = s.bozuk;
    if (bozuk.length) kayitYedekle(PROFILLER, ham);
  }
  let degisti = bozuk.length > 0;
  // liste kaybolduysa ya da okunamadıysa: telefonda duran profil kayıtlarını geri bağla
  if (!ham || bozuk[0] === 'tumu') {
    const n = profilKurtar(p);
    if (n) { degisti = true; kayitUyar(tt('Profil listesi okunamadı; {n} profil kurtarıldı. İsimlerini Profil ekranından değiştirebilirsin.', { n })); }
    else if (bozuk[0] === 'tumu') kayitUyar(tt('Profil listesi okunamadı. Eski hali yedeklendi.'));
  } else if (bozuk.length) kayitUyar(tt('Profil listesinde bozuk bir kısım düzeltildi.'));
  profiller = p;
  kayit = (aktifProfil() && kayitOku(PROFIL_ON + profiller.aktif)) || bosKayit();
  if (degisti) profilleriKaydet();
  Olay.yay('kayitYuklendi', { profil: profiller.aktif });
}
function profilKurtar(p) {
  let n = 0;
  for (const k of Depo.anahtarlar().sort()) {
    if (k.indexOf(PROFIL_ON) !== 0) continue;
    const id = k.slice(PROFIL_ON.length);
    if (!PROFIL_ID.test(id) || p.liste.some(e => e.id === id) || !kayitOku(k)) continue;   // okunamayan kayıt geri bağlanmaz
    p.liste.push({ id, ad: tt('Profil {n}', { n: p.liste.length + 1 }), t: 0 }); n++;
  }
  if (n) { p.eskiAktarildi = true; if (!p.aktif) p.aktif = p.liste[0].id; }
  return n;
}
function profilleriKaydet() { try { return Depo.yaz(PROFILLER, JSON.stringify(profiller)); } catch (e) { return false; } }
function aktifProfil() { return profiller.liste.find(p => p.id === profiller.aktif) || null; }
function kayitUyarilariGoster() { if (kayitUyarilari.length) { not(kayitUyarilari.join(' '), 7000); kayitUyarilari.length = 0; } }
// her değişiklikte aktif profile yazılır (otomatik kayıt); yer kalmadıysa false döner ve bir kez uyarılır
let kayitYazilamadi = false;
function kaydet() {
  const p = aktifProfil(); if (!p) return false;
  kayit.sonKayit = Date.now();
  let ok = false; try { ok = Depo.yaz(PROFIL_ON + p.id, JSON.stringify(kayit)); } catch (e) { }
  if (!ok && !kayitYazilamadi) { kayitYazilamadi = true; if (typeof not === 'function') not(tt('Kayıt yazılamadı: telefonda yer kalmamış olabilir. Yer açınca oyun yeniden kaydeder.'), 6000); }
  if (ok) kayitYazilamadi = false;
  return ok;
}
function eskiKayitVarMi() { return !profiller.eskiAktarildi && !!kayitOku(KAYIT); }
function profilAdUygun(ad) {
  ad = String(ad || '').replace(/\s+/g, ' ').trim();
  if (!ad) return { hata: tt('Bir isim yaz.') };
  if (ad.length > 16) return { hata: tt('İsim en çok 16 harf olabilir.') };
  if (profiller.liste.some(p => p.ad.toLocaleLowerCase('tr-TR') === ad.toLocaleLowerCase('tr-TR'))) return { hata: tt('Bu isimde bir profil zaten var.') };
  return { ad };
}
// devral: profil yokken oynanan rehberli ilk cümlenin ilerlemesi (XP, ayarlar) yeni profile geçer (ilk.js)
function profilOlustur(ad, devral) {
  kaydet();
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let k = null;
  if (!profiller.eskiAktarildi) { k = kayitOku(KAYIT); profiller.eskiAktarildi = true; }   // profillerden önceki ilerleme ilk profile geçer
  profiller.liste.push({ id, ad, t: Date.now() });
  profiller.aktif = id; profilleriKaydet();
  kayit = k || (devral ? kayit : bosKayit()); kaydet();
  Olay.yay('kayitYuklendi', { profil: id });
  return id;
}
function profilSec(id) {
  if (!profiller.liste.some(p => p.id === id)) return;
  kaydet();
  profiller.aktif = id; profilleriKaydet();
  kayit = kayitOku(PROFIL_ON + id) || bosKayit();
  Olay.yay('kayitYuklendi', { profil: id });
}
function profilSil(id) {
  Depo.sil(PROFIL_ON + id); Depo.sil(YARIM_ON + id);
  profiller.liste = profiller.liste.filter(p => p.id !== id);
  if (profiller.aktif === id) { profiller.aktif = profiller.liste.length ? profiller.liste[0].id : null; kayit = (profiller.aktif && kayitOku(PROFIL_ON + profiller.aktif)) || bosKayit(); Olay.yay('kayitYuklendi', { profil: profiller.aktif }); }
  profilleriKaydet();
}
// profil listesinde gösterilen kısa özet (başka profillerin kaydı da okunur)
function profilOzet(id) {
  const k = id === profiller.aktif ? kayit : (kayitOku(PROFIL_ON + id) || bosKayit());
  let y = 0; for (const x in k.yildiz) y += k.yildiz[x];
  let kel = 0; for (const w in k.kel) if (k.kel[w][0] >= 2) kel++;
  return { lvl: k.sonLvl || 'A1', yildiz: y, kelime: kel, best: k.best || 0, online: k.istat.online || 0, galibiyet: k.istat.onlineGalibiyet || 0, sonKayit: k.sonKayit || 0 };
}

/* ---------------- yarım bölüm (içeriği game.js · yarimKaydet hazırlar) ---------------- */
function yarimAnahtar() { const p = aktifProfil(); return p ? YARIM_ON + p.id : null; }
function yarimOku() {
  const k = yarimAnahtar(); if (!k) return null;
  const ham = Depo.al(k); if (!ham) return null;
  let y = null; try { y = JSON.parse(ham); } catch (e) { }
  if (yarimGecerli(y)) return y;
  Depo.sil(k); kayitUyar(tt('Yarım bölüm açılamadı; bölümü baştan başlatabilirsin.'));   // okunamayan yarım kayıt oyunu kilitlemesin
  return null;
}
function yarimYaz(y) { const k = yarimAnahtar(); if (!k) return false; try { return Depo.yaz(k, JSON.stringify(y)); } catch (e) { return false; } }
function yarimSil() { const k = yarimAnahtar(); if (k) Depo.sil(k); }

// kayıtlar öğretim katmanı (SEVIYE) hazır olunca okunur; uygulamada boot() kalıcı hafıza açılınca okur
if (!Depo.uygulamaMi()) profilleriYukle();

/* ---------------- ölçüm kimliği ve izni (olcum.js) ----------------
   Cihaz başına rastgele, isimsiz bir kimlik (kişiyle bağı yok) ve "anonim kullanım verisi" izni (profilden bağımsız). */
const OLCUM_KIMLIK = 'te_olcum_kimlik', OLCUM_IZIN = 'te_olcum_izin';
function olcumKimlik() {
  let k = Depo.al(OLCUM_KIMLIK);
  if (!k || !/^[a-z0-9]{12,32}$/.test(k)) { k = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 20).replace(/[^a-z0-9]/g, 'x'); Depo.yaz(OLCUM_KIMLIK, k); }
  return k;
}
function olcumIzinli() { return Depo.al(OLCUM_IZIN) !== '0'; }
function olcumIzinYaz(acik) { Depo.yaz(OLCUM_IZIN, acik ? '1' : '0'); }
