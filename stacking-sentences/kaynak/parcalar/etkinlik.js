/* =====================================================================
   HAFTALIK ETKİNLİK
   · Her hafta (pazartesi 00:00 – pazar 23:59, telefonun saatiyle) yeni bir tema (ETK_TEMA, hafta numarasıyla döner).
   · Oyunun her yerinden etkinlik puanı: Bölüm Yolu (3 + yıldız), Günün Görevi (6), kariyer bölümü / kelime paketi (4),
     online / bilgisayar maçı (kazanınca 4, kaybedince 2).
   · 10 basamaklı ödül yolu (ETK_YOL): ulaşılan basamağın ödülü dokunarak alınır; son basamak altın sandık + rozet.
   · Hafta bitince puan ve alınan ödüller sıfırlanır; tamamlanan etkinlik sayısı kalır (rozet).
   Kayıt: kayit.etkinlik = { hafta: 'YYYY-Wnn', puan, alinan: [basamak], tamam }.
   ===================================================================== */
const ETK_TEMA = [
  { ad: 'Çilek Festivali', i: '🍓', jeton: '🍓', r1: '#ff7a96', r2: '#e83b5c' },
  { ad: 'Uzay Haftası', i: '🚀', jeton: '⭐', r1: '#7f8cff', r2: '#3b3fa8' },
  { ad: 'Yaz Kampı', i: '🏖', jeton: '🐚', r1: '#5cc8ff', r2: '#ff9f1c' },
  { ad: 'Kış Masalı', i: '❄', jeton: '⛄', r1: '#c9f0ff', r2: '#5a8fd8' },
];
const ETK_YOL = [
  { p: 5, o: { t: 'hamle3', n: 1 } }, { p: 12, o: { t: 'xp', n: 25 } }, { p: 20, o: { t: 'cekic', n: 1 } },
  { p: 30, o: { t: 'sandik', n: 'tahta' } }, { p: 42, o: { t: 'miknatis', n: 2 } }, { p: 56, o: { t: 'xp', n: 60 } },
  { p: 72, o: { t: 'sandik', n: 'gumus' } }, { p: 90, o: { t: 'cekic', n: 2 } }, { p: 110, o: { t: 'don', n: 1 } },
  { p: 135, o: { t: 'sandik', n: 'altin' }, son: true },
];
// ISO hafta anahtarı (yerel gün): 'YYYY-Wnn'
function etkHafta(t) {
  const d = new Date(t || Date.now()), g = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), gun = g.getUTCDay() || 7;
  g.setUTCDate(g.getUTCDate() + 4 - gun);
  const yil = g.getUTCFullYear(), no = Math.ceil(((g - Date.UTC(yil, 0, 1)) / 864e5 + 1) / 7);
  return { anahtar: yil + '-W' + String(no).padStart(2, '0'), no };
}
function etkTema() { return ETK_TEMA[etkHafta().no % ETK_TEMA.length]; }
function etkKalan() {   // haftanın bitişine (pazar 24:00, yerel)
  const d = new Date(Date.now()), gun = d.getDay() || 7, bitis = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - gun), 0, 0, 0);
  return bitis - d;
}
function etkGuncelle() {   // hafta değiştiyse sıfırla
  const E = kayit.etkinlik, h = etkHafta().anahtar;
  if (E.hafta !== h) { E.hafta = h; E.puan = 0; E.alinan = []; }
  return E;
}
function etkPuanEkle(n) {
  if (!aktifProfil() || !n) return;
  const E = etkGuncelle(), once = E.puan; E.puan += n;
  const yeni = ETK_YOL.filter(b => once < b.p && E.puan >= b.p).length;
  if (D) D.etkinlik = (D.etkinlik || 0) + n;
  if (STR && STR.yol) STR.yol.etkinlik = (STR.yol.etkinlik || 0) + n;
  if (yeni && !D && !STR && window.__acildi) not(tt('{i} Etkinlik ödülü hazır!', { i: etkTema().i }));
  kaydet();
}
Olay.dinle('bolumBitti', v => {
  if (!v.kazandi) return;
  if (v.mod === 'yol') etkPuanEkle(3 + (v.yildiz || 0));
  else if (v.mod === 'gunluk') etkPuanEkle(6);
  else if (v.mod === 'bolum' || v.mod === 'kelime') etkPuanEkle(4);
});
Olay.dinle('onlineBitti', v => etkPuanEkle(v.kazandi ? 4 : 2));
function etkHazirSay() { const E = etkGuncelle(); return ETK_YOL.filter((b, i) => E.puan >= b.p && E.alinan.indexOf(i) < 0).length; }
const etkKalanYaz = () => { const ms = etkKalan(), g = Math.floor(ms / 864e5), s = Math.floor(ms % 864e5 / 36e5), d = Math.floor(ms % 36e5 / 6e4); return g ? tt('{g}g {s}sa', { g, s }) : s ? tt('{s}sa {d}dk', { s, d }) : tt('{d}dk', { d }); };
function etkOdulYazi(o) {
  if (o.t === 'sandik') return SANDIK[o.n].i + ' ' + tt(SANDIK[o.n].ad);
  if (o.t === 'xp') return '⭐ ' + o.n + ' XP';
  if (o.t === 'don') return '❄ ' + tt('Seri dondurma');
  return ARAC[o.t].i + (o.n > 1 ? ' ×' + o.n : '') + ' ' + tt(ARAC[o.t].ad);
}
// ana menüdeki şerit
function etkMenuHtml() {
  const E = etkGuncelle(), T = etkTema(), son = ETK_YOL[ETK_YOL.length - 1].p, hazir = etkHazirSay();
  return `<button class="etk-serit ${hazir ? 'hazir' : ''}" id="a-etk" style="--e1:${T.r1};--e2:${T.r2}"><i>${T.i}</i>
    <span><b>${tt(T.ad)}</b><small>⏱ ${etkKalanYaz()} · ${T.jeton} ${E.puan}/${son}${hazir ? ' · ' + tt('{n} ödül hazır!', { n: hazir }) : ''}</small><u><s style="width:${Math.min(100, Math.round(E.puan / son * 100))}%"></s></u></span></button>`;
}
function etkAc() {
  const E = etkGuncelle(), T = etkTema();
  let yol = '';
  ETK_YOL.forEach((b, i) => {
    const ulasti = E.puan >= b.p, aldi = E.alinan.indexOf(i) >= 0;
    yol += `<div class="etk-basamak ${aldi ? 'alindi' : ulasti ? 'hazir' : ''} ${b.son ? 'son' : ''}"><span class="etk-p">${T.jeton} ${b.p}</span>
      <span class="etk-o">${etkOdulYazi(b.o)}${b.son ? ' + 🏆' : ''}</span>
      ${aldi ? '<em>✓</em>' : ulasti ? `<button class="sec etk-al" data-i="${i}">${tt('AL')}</button>` : '<em>🔒</em>'}</div>`;
  });
  goster(`<div class="ust-satir"><button class="geri" id="e-geri">${tt('← Geri')}</button><span class="y-toplam">⏱ ${etkKalanYaz()}</span></div>
    <div class="etk-bas" style="--e1:${T.r1};--e2:${T.r2}"><i>${T.i}</i><b>${tt(T.ad)}</b><small>${tt('Bu hafta topladığın: {j} {n}', { j: T.jeton, n: E.puan })}</small></div>
    <div class="etk-nasil">${tt('Nasıl toplanır:')} <span>🗺 ${tt('Bölüm Yolu')} +3…+6</span><span>📅 ${tt('Günün Görevi')} +6</span><span>🏆 ${tt('Kariyer')} +4</span><span>🏁 ${tt('Online')} +2/+4</span></div>
    <div class="etk-yol">${yol}</div>
    <p class="aciklama kucuk" style="text-align:center">${tt('Etkinlik pazar gece biter; yeni haftada yeni tema başlar.')}</p>`, '', 'etkinlik');
  $('#e-geri').onclick = () => acilisAc();
  card.querySelectorAll('.etk-al').forEach(b => b.onclick = () => etkAl(+b.dataset.i));
}
function etkAl(i) {
  const E = etkGuncelle(), b = ETK_YOL[i]; if (!b || E.puan < b.p || E.alinan.indexOf(i) >= 0) return;
  if (b.o.t === 'sandik' && kayit.sandik.slot.length >= SANDIK_YUVA) { not(tt('Sandık yuvaların dolu. Önce bir sandık aç.')); return; }
  E.alinan.push(i);
  const yazilar = [odulVer(b.o)];
  if (b.son) { E.tamam = (E.tamam || 0) + 1; xpEkle(100); yazilar.push('⭐ 100 XP', '🏆 ' + tt('Etkinlik tamam!')); }
  kaydet(); sesAc(); Ses.cal(b.son ? 'zafer' : 'yukselis', { ses: 0.8 }); Yerel.titret('basari');
  odulPenceresi(etkTema().i, tt(b.son ? 'ETKİNLİK ŞAMPİYONU!' : 'Etkinlik ödülü'), yazilar, etkAc);
}
