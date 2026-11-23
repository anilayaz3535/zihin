/* =====================================================================
   İLERLEME: XP, GÜNLÜK HEDEF VE SERİ
   Oyun motoruna dokunmaz; olay yolunu (olay.js) dinler.
   · XP: her öğrenme anı XP getirir (XP_KURAL). Kaybedilen bölümde kazanılan XP kalır.
   · Günlük hedef: Rahat 20 / Normal 50 / Ciddi 100 XP (Ayarlar'dan). Gün telefonun yerel saatine göre.
   · Seri: günlük hedefe ulaşılan her gün seriyi 1 artırır. Bir gün kaçarsa seri biter;
     elde "seri dondurma" varsa kaçan gün için o harcanır ve seri sürer.
     Dondurma satılmaz: serinin her 7. gününde 1 tane kazanılır (en çok 2).
   Kayıttaki alanlar (kayit-sema.js doğrular):
     kayit.xp      → toplam XP
     kayit.gunluk  → { hedef: 20|50|100, gunler: { 'YYYY-AA-GG': o günün XP'si } }
     kayit.seri    → { gun, enUzun, sonGun: hedefin tamamlandığı son gün, dondurma, donan: [korunan günler] }
   ===================================================================== */
const HEDEFLER = [{ xp: 20, ad: 'Rahat' }, { xp: 50, ad: 'Normal' }, { xp: 100, ad: 'Ciddi' }];
const XP_KURAL = {
  cumle: 4, kusursuz: 2,          // kurulan cümle, hatasız kurulduysa ek
  hataBulundu: 3,                 // HATAYI BUL turu
  soruTemiz: 2, soru: 1,          // kelime sorusu (ilk denemede / sonradan)
  tanis: 1,                       // yeni kelime kartı
  bolumKazandi: 5, yildiz: 2,     // bölüm sonu: kazanınca + yıldız başına
  onlineKazandi: 5, onlineBitti: 2,
  gorev: 10,                      // Günün Görevi: günün ilk tamamlanışında bonus (gorev.js)
};
const SERI_DONDURMA_EN = 2, SERI_DONDURMA_ARALIK = 7;

/* ---- tarih yardımcıları (saf). Gün anahtarı yerel saatle 'YYYY-AA-GG'; farklar takvim günüyle (yaz saati sorun olmaz) ---- */
const iki = n => (n < 10 ? '0' : '') + n;
function gunAnahtar(t) { const d = new Date(t); return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate()); }
function gunUtc(a) { const p = a.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
function gunFarki(a, b) { return Math.round((gunUtc(b) - gunUtc(a)) / 864e5); }
function gunEkle(a, n) { const d = new Date(gunUtc(a) + n * 864e5); return d.getUTCFullYear() + '-' + iki(d.getUTCMonth() + 1) + '-' + iki(d.getUTCDate()); }
const bugunAnahtar = () => gunAnahtar(Date.now());

/* ---- seri kuralları (saf: yeni seri nesnesi ve olanlar döner) ---- */
// Seriyi bugüne getirir: kaçan günler varsa dondurma harcanır, yetmezse seri biter
function seriBugune(seri, bugun) {
  const s = Object.assign({}, seri, { donan: (seri.donan || []).slice() }), olan = { donduruldu: 0, bitti: false };
  if (!s.sonGun || !s.gun) return { s, olan };
  const fark = gunFarki(s.sonGun, bugun);
  if (fark <= 1) return { s, olan };                     // dün ya da bugün tamamlanmış (saat geri alındıysa da dokunma)
  const kacan = fark - 1;
  if (s.dondurma >= kacan) {
    s.dondurma -= kacan;
    for (let i = 1; i <= kacan; i++) s.donan.push(gunEkle(s.sonGun, i));
    s.sonGun = gunEkle(bugun, -1); olan.donduruldu = kacan;
  } else { olan.bitti = true; olan.biten = s.gun; s.gun = 0; s.sonGun = null; }
  s.donan = s.donan.slice(-30);
  return { s, olan };
}
// Günlük hedef tamamlandı: bugün seriye eklenir (aynı gün ikinci kez sayılmaz)
function seriHedefTamam(seri, bugun) {
  const s = Object.assign({}, seri, { donan: (seri.donan || []).slice() }), olan = { artti: false, yeniDondurma: false };
  if (s.sonGun === bugun) return { s, olan };
  s.gun = (s.gun || 0) + 1; s.sonGun = bugun; s.enUzun = Math.max(s.enUzun || 0, s.gun); olan.artti = true;
  if (s.gun % SERI_DONDURMA_ARALIK === 0 && s.dondurma < SERI_DONDURMA_EN) { s.dondurma++; olan.yeniDondurma = true; }
  return { s, olan };
}

/* ---- profil üzerindeki işlemler ---- */
let ilerlemeOturum = null;      // açık bölümün XP özeti (bolumBasladi → bolumBitti)
function bugunXp() { return kayit.gunluk.gunler[bugunAnahtar()] || 0; }
// Açılışta, profil değişince ve ekranlar açılırken: seri bugüne getirilir, oyuncuya söylenir
function ilerlemeGuncelle(sessiz) {
  if (!aktifProfil()) return;
  const r = seriBugune(kayit.seri, bugunAnahtar());
  if (!r.olan.donduruldu && !r.olan.bitti) return;
  kayit.seri = r.s; kaydet();
  if (sessiz) return;
  if (r.olan.donduruldu) kayitUyar(tt('❄ Seri dondurma kullanıldı ({n} gün). {s} günlük serin korunuyor.', { n: r.olan.donduruldu, s: r.s.gun }));
  else if (r.olan.biten > 1) kayitUyar(tt('{n} günlük serin bitti. Bugün hedefini tamamla, yeni seri başlasın.', { n: r.olan.biten }));
}
// XP ekle: günlük toplam, hedef ve seri güncellenir
function xpEkle(n) {
  if (ilerlemeOturum && ilerlemeOturum.goster) n = Math.ceil(n / 2);   // İngilizce gösterilerek oynanan bölümde XP yarı
  // profil yokken yalnız rehberli ilk cümle XP kazandırır (isim yazılınca yeni profile geçer: profilOlustur(ad, true))
  if (!n || (!aktifProfil() && !(ilerlemeOturum && ilerlemeOturum.mod === 'ilk'))) return;
  ilerlemeGuncelle();
  const bugun = bugunAnahtar(), g = kayit.gunluk, once = g.gunler[bugun] || 0;
  g.gunler[bugun] = once + n; kayit.xp += n;
  const anahtarlar = Object.keys(g.gunler);
  if (anahtarlar.length > 120) anahtarlar.sort().slice(0, anahtarlar.length - 120).forEach(k => delete g.gunler[k]);
  if (ilerlemeOturum) ilerlemeOturum.xp += n;
  if (once < g.hedef && once + n >= g.hedef) hedefTamamlandi(bugun);
}
function hedefTamamlandi(bugun) {
  const r = seriHedefTamam(kayit.seri, bugun); kayit.seri = r.s;
  if (!r.olan.artti) return;
  const ozet = { seri: r.s.gun, yeniDondurma: r.olan.yeniDondurma };
  Olay.yay('hedefTamam', ozet);
  if (ilerlemeOturum) ilerlemeOturum.hedefOldu = ozet;  // bölüm sonunda kutlanır
  else if (window.__acildi) not(tt('🎯 Günlük hedef tamam! 🔥 {n} gün seri', { n: r.s.gun }), 4000);
}
function hedefSec(xp) {
  if (!HEDEFLER.some(h => h.xp === xp)) return;
  kayit.gunluk.hedef = xp;
  if (bugunXp() >= xp) hedefTamamlandi(bugunAnahtar());  // yeni hedef bugün zaten aşıldıysa bugün sayılır
  kaydet();
}
function ilerlemeOzet() {
  const h = kayit.gunluk.hedef, x = bugunXp(), s = kayit.seri;
  return { hedef: h, bugun: x, oran: Math.min(1, x / h), tamam: x >= h, seri: s.gun, enUzun: s.enUzun, dondurma: s.dondurma, toplamXp: kayit.xp };   // xp adı oturumdaki (bu bölümün) XP'sine ait
}

/* ---- olaylar → XP ---- */
Olay.dinle('kayitYuklendi', () => { ilerlemeOturum = null; ilerlemeGuncelle(); });
Olay.dinle('bolumBasladi', v => { ilerlemeGuncelle(); ilerlemeOturum = { mod: v.mod, xp: 0, gunOnce: bugunXp(), hedefOldu: null, goster: !!v.goster }; });
Olay.dinle('cumleTamam', v => xpEkle(XP_KURAL.cumle + (v.kusursuz ? XP_KURAL.kusursuz : 0)));   // cumleBitti hemen sonra kaydeder
Olay.dinle('hataBulundu', () => { xpEkle(XP_KURAL.hataBulundu); kaydet(); });
Olay.dinle('soruBitti', v => { xpEkle(v.temiz ? XP_KURAL.soruTemiz : XP_KURAL.soru); kaydet(); });
Olay.dinle('kelimeTanisildi', () => { xpEkle(XP_KURAL.tanis); kaydet(); });
Olay.dinle('bolumBitti', v => {
  if (v.kazandi && v.mod !== 'test' && v.mod !== 'ilk') xpEkle(XP_KURAL.bolumKazandi + XP_KURAL.yildiz * (v.yildiz || 0));
  if (v.kazandi && v.mod === 'gunluk' && v.gorevIlk) xpEkle(XP_KURAL.gorev);
  kaydet();
  if (D && ilerlemeOturum) D.ilerleme = Object.assign({}, ilerlemeOturum, ilerlemeOzet());
  ilerlemeOturum = null;
});
Olay.dinle('onlineBitti', v => {
  xpEkle(v.kazandi ? XP_KURAL.onlineKazandi : XP_KURAL.onlineBitti); kaydet();
  if (D && ilerlemeOturum) D.ilerleme = Object.assign({}, ilerlemeOturum, ilerlemeOzet());
  ilerlemeOturum = null;
});

/* ---- ekran parçaları (screens.js ve online.js kullanır) ---- */
// İlerleme halkası: oran 0..1 · bitis verilirse ekran açılınca o orana dolar (CSS geçişi)
function halkaHtml(oran, ust, alt, sinif, bitis) {
  return `<span class="halka ${sinif || ''}" style="--p:${oran.toFixed(3)}"${bitis !== undefined ? ` data-p="${bitis.toFixed(3)}"` : ''}><b>${ust}</b><small>${alt}</small></span>`;
}
function halkalariDoldur(kok) { setTimeout(() => (kok || document).querySelectorAll('.halka[data-p]').forEach(e => { e.style.setProperty('--p', e.dataset.p); }), 60); }
function gunlukHtml() {
  const o = ilerlemeOzet();
  return `<button class="gunluk ${o.tamam ? 'tamam' : ''}" id="a-gunluk">${halkaHtml(o.oran, o.bugun, '/' + o.hedef)}
    <span class="g-yazi"><b class="${o.seri ? 'alev' : 'sonuk'}">🔥 ${tt('{n} gün seri', { n: o.seri })}</b><small>${o.tamam ? tt('Bugünün hedefi tamam ✓') : tt('Bugünkü hedefe {n} XP', { n: o.hedef - o.bugun })}</small></span>
    ${o.dondurma ? `<span class="g-don" title="${tt('Seri dondurma')}">❄ ${o.dondurma}</span>` : ''}</button>`;
}
function hedefSecimHtml() {
  const h = kayit.gunluk.hedef;
  return `<div class="bolum">${tt('Günlük hedef')}</div><div class="sekmeler kucuk" id="hedef-sec">${HEDEFLER.map(x => `<button data-hedef="${x.xp}" class="${x.xp === h ? 'secili' : ''}">${tt(x.ad)} · ${x.xp} XP</button>`).join('')}</div>
    <p class="aciklama kucuk">${tt('Hedefe ulaştığın her gün serin 1 artar. Her 7 günde 1 seri dondurma kazanırsın; kaçırdığın bir günü korur.')}</p>`;
}
// Bölüm sonu: kazanılan XP, günlük halkanın dolması, hedef tamamlandıysa kutlama
function sonucXpHtml(p) {
  if (!p) return '';
  const once = Math.min(1, p.gunOnce / p.hedef), h = p.hedefOldu, hedefXp = p.hedef;   // h: bu bölümde hedef tamamlandıysa
  return `<div class="xp-panel ${h ? 'kutla' : ''}">${halkaHtml(once, p.bugun, '/' + hedefXp, 'buyuk', p.oran)}
    <div class="xp-yazi"><b class="xp-art">+${p.xp} XP</b>
    <span>${h ? tt('🎯 GÜNLÜK HEDEF TAMAM!') : p.tamam ? tt('Bugünün hedefi tamam ✓') : tt('Hedefe {n} XP kaldı', { n: hedefXp - p.bugun })}</span>
    <span class="${p.seri ? 'alev' : 'sonuk'}">🔥 ${tt('{n} gün seri', { n: p.seri })}${h && h.seri > 1 ? ' ' + tt('(+1)') : ''}</span>
    ${h && h.yeniDondurma ? `<span class="don">${tt('❄ +1 seri dondurma kazandın')}</span>` : ''}</div></div>`;
}

