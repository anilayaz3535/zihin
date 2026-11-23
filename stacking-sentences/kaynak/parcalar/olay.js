/* =====================================================================
   OLAY YOLU
   Oyun motoru önemli anları duyurur; seri, XP, rozet, istatistik gibi
   modüller motorun içine girmeden bunları dinler.
     Olay.dinle('cumleTamam', v => { ... })   → bırakmak için dönen işlevi çağır
     Olay.yay('cumleTamam', { kusursuz: true })
   Bir dinleyici hata verirse oyun durmaz: hata yakalanır, sayılır, konsola yazılır.
   Olaylar ve taşıdıkları bilgi (yeni olay eklerken bu listeyi güncelle):
     kayitYuklendi  { profil }                       profil açıldı / değişti / silindi
     bolumBasladi   { mod, r, lvl, devam, goster }  mod: bolum | kelime | antrenman | test | online | ilk (rehberli ilk cümle);
                                                     goster: İngilizce gösterilerek oynanıyor (puan ve XP yarı)
     turBasladi     { tip, no }                      tip: kur | sav | test | tanis
     dogruHamle     { tip, kelime }                  her doğru yerleştirme / bulunan hata / doğru cevap
     hata           { tip, kelime, mesaj, kural }    her hatalı hamle (D.istat.yanlis ile aynı sayıda)
     copeAtildi     { kelime, puan }                 tuzak kelime doğru şekilde çöpe atıldı
     cumleTamam     { kusursuz, en }                 cümle kuruldu
     hataBulundu    { kelime }                       HATAYI BUL turu doğru çözüldü
     soruBitti      { temiz, kelime }                kelime sorusu bitti
     kelimeTanisildi { kelime }                      yeni kelime kartı kutuya bırakıldı
     uniteTamam     { lvl, unite, bolge, seviyeBitti }  bir ünitenin bütün bölümleri ilk kez yıldız aldı (harita.js)
     hedefTamam     { seri, yeniDondurma }           günlük XP hedefi tamamlandı (ilerleme.js duyurur)
     kombo          { n }                            seri bir arttı
     komboBitti     { n }                            seri bozuldu (n: biten serinin uzunluğu)
     bolumBitti     { mod, r, lvl, kazandi, yildiz, skor, istat, enKombo, rekor }
     onlineBitti    { kazandi, neden }
   ===================================================================== */
const Olay = (() => {
  const dinleyen = {};
  let hata = 0;
  function dinle(ad, fn) { (dinleyen[ad] = dinleyen[ad] || []).push(fn); return () => birak(ad, fn); }
  function birak(ad, fn) { const l = dinleyen[ad]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
  function yay(ad, veri) {
    const l = dinleyen[ad]; if (!l || !l.length) return;
    const v = veri || {};
    for (const fn of l.slice()) { try { fn(v, ad); } catch (e) { hata++; console.error('Olay dinleyicisi hatası (' + ad + ')', e); } }
  }
  return { dinle, birak, yay, hataSayisi: () => hata };
})();

