/* =====================================================================
   BÖLÜM YOLU (Candy Crush tarzı tek kişilik bulmaca haritası)
   Strateji tahtasının (strateji.js) kısa bölümleri: 1 cümle, süre yok, sınırlı hamle, her bölümün bir hedefi.
   · 9 bölge × 20 bölüm = 180 bölüm (YOL_BOLGE). Seviye A1 → C2; bölgeler yeni mekanik getirir:
     ☕ Kafe (puan) · 🧺 Pazar (🧊 buz) · 🌳 Park (🔴 renk) · 🚉 İstasyon (🔒 kilit) · 📚 Kütüphane (karışık) · 🌃 Gece Şehri (zor karışık)
     · 💼 Ofis B2 (🌫 sis: kelime gizli) · ✈️ Havalimanı C1 (🖋 mürekkep: yayılır) · 🔭 Rasathane C2 (🔀 harfleri karışık kelimeler)
   · 121–180. bölümler 1–120'yi değiştirmez: yeni rastgele sayılar yalnız 7. bölgeden sonra çekilir.
   · Hedefler: puan yap / bir renkten N karo patlat / N buz kır / N kilitli karo patlat. Cümle her zaman doğru olmalı.
   · 🧊 Buz: karo yerinden oynamaz; kendisi ya da yanındaki patlayınca kırılır. 🔒 Kilit: karo oynamaz, patlatılmalı.
   · Dalgalı zorluk (YOL_DALGA): kolay, orta, zor, 💀 zor bölüm; hamle = kelime + 5/4/3/2.
   · Hedef ve yıldız eşikleri her bölümde bilgisayarın "uzman" çözümünden hesaplanır (bölüm her zaman çözülebilir):
     ★ hedef tamam · ★★ uzman puanının (temizleme bonusu hariç) %80'i · ★★★ tamamı.
   · Hamle bitince hedefe yetmiyorsa "NEREDEYSE!": +3 hamle (bölüm denemesi başına 1 kez bedava).
   · Kazanınca CÜMLE CRUSH: kalan her hamle rastgele bir karoyu patlatır (+15).
   · Aynı bölüm her açılışta aynı tahta (tohum: bölüm no). Kayıt: kayit.yol = { acik, yildiz: {no: 1–3}, enIyi: {no: puan} }.
   ===================================================================== */
const YOL_BOLGE = [
  { ad: 'Kafe', i: '☕', lvl: 'A1', renk: '#c9864a', hedefler: ['puan'], yeni: null },
  { ad: 'Pazar', i: '🧺', lvl: 'A1', renk: '#e8a33d', hedefler: ['buz', 'puan', 'buz'], yeni: 'buz' },
  { ad: 'Park', i: '🌳', lvl: 'A2', renk: '#4fae5a', hedefler: ['renk', 'buz', 'renk', 'puan'], yeni: 'renk' },
  { ad: 'İstasyon', i: '🚉', lvl: 'A2', renk: '#4a8fd8', hedefler: ['kilit', 'renk', 'kilit', 'buz'], yeni: 'kilit' },
  { ad: 'Kütüphane', i: '📚', lvl: 'B1', renk: '#8a62d0', hedefler: ['renk', 'kilit', 'buz', 'puan'], yeni: null },
  { ad: 'Gece Şehri', i: '🌃', lvl: 'B1', renk: '#3b4a8a', hedefler: ['kilit', 'buz', 'renk', 'renk', 'puan'], yeni: null },
  { ad: 'Ofis', i: '💼', lvl: 'B2', renk: '#c8573f', hedefler: ['puan', 'renk', 'kilit', 'buz', 'renk'], yeni: 'sis' },
  { ad: 'Havalimanı', i: '✈️', lvl: 'C1', renk: '#2a9d98', hedefler: ['murekkep', 'renk', 'murekkep', 'kilit', 'puan'], yeni: 'murekkep' },
  { ad: 'Rasathane', i: '🔭', lvl: 'C2', renk: '#4b3384', hedefler: ['renk', 'murekkep', 'kilit', 'buz', 'puan'], yeni: 'karisik' },
];
const YOL_HEDEF_TUR = ['puan', 'renk', 'buz', 'kilit', 'murekkep'];
const YOL_BOLUM_BOLGE = 20, YOL_TOPLAM = YOL_BOLGE.length * YOL_BOLUM_BOLGE;
const YOL_DALGA = ['kolay', 'kolay', 'orta', 'orta', 'zor', 'kolay', 'orta', 'orta', 'zor', 'kolay', 'orta', 'orta', 'orta', 'zor', 'kolay', 'orta', 'orta', 'zor', 'kolay', 'boss'];
const YOL_EK_HAMLE = { ilk: 6, kolay: 5, orta: 4, zor: 3, boss: 2 }, YOL_ORAN = { ilk: 0.22, kolay: 0.55, orta: 0.72, zor: 0.85, boss: 0.92 };
const YOL_RENK_AD = ['kırmızı', 'sarı', 'yeşil', 'mavi'], YOL_RENK_I = ['🔴', '🟡', '🟢', '🔵'];
const yolOnluk = x => Math.max(10, Math.round(x / 10) * 10);

/* ---------------- bölüm üretimi (saf: aynı no → aynı bölüm) ---------------- */
const yolOnbellek = new Map();
function yolBolum(no) {
  if (yolOnbellek.has(no)) return yolOnbellek.get(no);
  const bi = Math.min(YOL_BOLGE.length - 1, Math.floor((no - 1) / YOL_BOLUM_BOLGE)), B = YOL_BOLGE[bi], sira = (no - 1) % YOL_BOLUM_BOLGE;
  const r = tohumluRastgele('yol:' + no), zor = no <= 5 ? 'ilk' : YOL_DALGA[sira];   // ilk 5 bölüm: çok kolay ve gösterişli (yeni oyuncu hemen kazanır)
  // cümle: bölgenin seviyesinden kısa bir cümle (3–6 kelime; B1'de 4–7)
  const [en, ek] = no <= 5 ? [3, 4] : bi >= 4 ? [4, 7] : [3, 6], rl = seviyeRakipleri(B.lvl).filter(cumleliMi);
  let s = null;
  for (let d = 0; d < 400 && !s; d++) { const h = cumleler(rl[Math.floor(r() * rl.length)].id); const c = h[Math.floor(r() * h.length)]; if (c && c.w.length >= en && c.w.length <= ek && !c.w.some(w => [...w[0]].length > 11) && !(bi >= 6 && yolCumleKullanildi(no, c.en))) s = c; }
  // hedef türü: bölgenin ilk bölümü yeni mekaniği tanıtır, sonra bölgenin hedef döngüsü
  const tur = sira === 0 && YOL_HEDEF_TUR.indexOf(B.yeni) >= 0 ? B.yeni : B.hedefler[sira % B.hedefler.length];   // sis ve karışık harf hedef değil, engeldir
  const T = strTahta(s, B.lvl, 'yolT:' + no, { rows: 5, bos: 2, tuzak: Math.min(s.w.length, 1 + Math.floor(bi / 2) + (zor === 'boss' ? 1 : 0)) });
  // engeller: bölgeye göre buz ve kilit (hedef kelimelerde yok)
  const adaylar = T.h.map((k, i) => (k && k.k < 0 ? i : -1)).filter(i => i >= 0);
  const karisik = adaylar.sort(() => r() - 0.5), buzN = tur === 'buz' ? 4 + Math.floor(bi / 2) : bi >= 4 && r() < 0.5 ? 2 : 0, kilitN = tur === 'kilit' ? 3 + Math.floor(bi / 2) : bi >= 4 && r() < 0.4 ? 2 : 0;
  karisik.slice(0, buzN).forEach(i => { T.h[i].buz = true; });
  karisik.slice(buzN, buzN + kilitN).forEach(i => { T.h[i].kilit = true; });
  // özel karolar (11. bölümden): bölgeyle çeşit ve sayı artar; dolgu karoların yerine gelir (yazısız)
  const ozelTur = ['yatay', 'dikey'].concat(bi >= 1 ? ['paket'] : [], bi >= 2 ? ['gokkusagi'] : []);
  const ozelN = no < 3 ? 0 : no <= 5 ? 1 : no < 11 ? 0 : bi === 0 ? 1 : Math.min(3, 1 + (r() < 0.5 ? 1 : 0) + (zor === 'boss' ? 1 : 0));   // 3–5. bölümde birer özel karo: ilk büyük patlama
  karisik.slice(buzN + kilitN).filter(i => !T.h[i].cel).slice(0, ozelN).forEach((i, j) => {
    const tur = ozelTur[Math.floor(r() * ozelTur.length)], k = T.h[i];
    k.ozel = tur; k.txt = ''; if (tur === 'gokkusagi') k.ci = -1;
  });
  let hamle = T.n + YOL_EK_HAMLE[zor];
  const hk = Math.floor(r() * T.n), renk = tur === 'renk' ? T.h.find(k => k && k.k === hk).ci : -1;
  // 7. bölgeden (121) sonra: 🌫 sis, 🖋 mürekkep, 🔀 karışık harfler (rastgele sayılar burada çekilir: önceki bölümler değişmez)
  if (bi >= 6) yolYeniEngel(T, bi, sira, tur, zor, r);
  if (T.h.some(k => k && k.sis)) hamle += 1;   // sisi açmak bir hamle ister
  // uzman çözüm: açgözlü, hedefe göre ağırlıklı; hedef ve yıldız eşikleri bundan
  const u = yolUzman(T, hamle, tur, renk), oran = YOL_ORAN[zor];
  const hedef = tur === 'puan' ? { tur, sayi: yolOnluk(u.ham * oran) }
    : tur === 'renk' ? { tur, renk, sayi: Math.max(3, Math.floor(u.renk[renk] * oran)) }
      : tur === 'buz' ? { tur, sayi: Math.max(1, Math.min(buzN, Math.floor(u.buz * oran + 0.5))) }
        : tur === 'murekkep' ? { tur, sayi: Math.max(1, Math.floor(u.murekkep * oran + 0.5)) }
        : { tur, sayi: Math.max(1, Math.min(kilitN, Math.floor(u.kilit * oran + 0.5))) };
  // güvence: uzman çözümü hedefe ulaşamıyorsa (ör. hiç buz kıramadıysa) hedef puana döner — her bölüm çözülebilir
  if (yolHedefSayi(hedef, u) < hedef.sayi) Object.assign(hedef, { tur: 'puan', sayi: yolOnluk(u.ham * oran) });
  const b = { no, bi, B, sira, zor, s, T, hamle, hedef, esik: [yolOnluk(u.ham * 0.8), yolOnluk(u.ham * 1.0)], uzman: u };   // tahta temizleme bonusu (+300) eşiklere katılmaz
  yolOnbellek.set(no, b);
  return b;
}
// 121+: aynı bölgede aynı cümle ya da aynı kalıp (ilk 3 kelime) tekrar etmesin (önceki bölümler değişmesin diye yalnız orada)
const yolKalip = en => en.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
function yolCumleKullanildi(no, en) { const k = yolKalip(en); for (let m = Math.max(121, no - 19); m < no; m++) if (yolKalip(yolBolum(m).s.en) === k) return true; return false; }
function yolYeniEngel(T, bi, sira, tur, zor, r) {
  const serbest = () => T.h.map((k, i) => (k && !k.ozel && !strDonuk(k) && !k.sis && !k.kar ? i : -1)).filter(i => i >= 0);
  const karistir = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 🖋 mürekkep tohumları (dolgu karolarda; yayılarak büyür)
  const murN = tur === 'murekkep' ? 2 + (bi >= 8 ? 1 : 0) + (zor === 'boss' ? 1 : 0) : bi >= 7 && r() < 0.45 ? 1 : 0;
  karistir(serbest().filter(i => T.h[i].k < 0)).slice(0, murN).forEach(i => { T.h[i].mur = true; });
  // 🔀 karışık harfler (C2): biri cümlenin kelimesi olmak üzere 3–4 kelime
  if (bi >= 8) {
    const uygun = i => /^[A-Za-z]{3,}$/.test(T.h[i].txt) && yolKaristir(T.h[i].txt, tohumluRastgele('kd:' + T.h[i].txt)) !== null;
    const hedefK = karistir(serbest().filter(i => T.h[i].k >= 0 && uygun(i))), dolgu = karistir(serbest().filter(i => T.h[i].k < 0 && uygun(i)));
    hedefK.slice(0, sira === 0 ? 1 : 1 + (r() < 0.5 ? 1 : 0)).concat(dolgu.slice(0, 2)).forEach(i => { T.h[i].kar = yolKaristir(T.h[i].txt, r); });
  }
  // 🌫 sis (B2'den): en az biri cümlenin kelimesi
  const sisN = bi === 6 ? 4 + (sira >= 10 ? 1 : 0) : bi === 7 ? 3 : 2 + (r() < 0.5 ? 1 : 0);
  const sh = karistir(serbest().filter(i => T.h[i].k >= 0)), sd = karistir(serbest().filter(i => T.h[i].k < 0));
  sh.slice(0, 1 + (bi === 6 && sira >= 5 ? 1 : 0)).concat(sd).slice(0, sisN).forEach(i => { T.h[i].sis = true; });
}
// harfleri karıştırır (ilk harf büyükse karışıkta da ilk harf büyük); kelimenin kendisi ya da sözlükte bir kelime çıkmaz. Olmuyorsa null.
function yolKaristir(w, r) {
  const h = [...w]; if (h.length < 3 || new Set(h.map(c => c.toLowerCase())).size < 2) return null;
  const buyuk = h[0] !== h[0].toLowerCase(), k = h.map(c => c.toLowerCase());
  for (let d = 0; d < 40; d++) {
    for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
    const o = k.join(''), yer = k.filter((c, i) => c !== w[i].toLowerCase()).length;   // harflerin en az yarısı yer değiştirmeli; gerçek bir kelime çıkmamalı (team → meat olmaz)
    if (o !== w.toLowerCase() && yer * 2 >= k.length && !sozluk()[o]) return buyuk ? o[0].toUpperCase() + o.slice(1) : o;
  }
  return null;
}
function yolKopya(T) { return { cols: T.cols, rows: T.rows, n: T.n, hedef: T.hedef, h: T.h.map(k => k && Object.assign({}, k)) }; }
// bir patlama planının hedef sayıları
function yolIstat(plan) {
  const o = { puan: plan.puan, ham: plan.puan - (plan.temiz ? 300 : 0), temiz: plan.temiz, renk: [0, 0, 0, 0], buz: 0, kilit: 0, murekkep: 0, karo: 0 };
  plan.adimlar.forEach(a => { a.karolar.forEach(k => { if (k.ci >= 0) o.renk[k.ci]++; o.karo++; if (k.kilit) o.kilit++; }); o.buz += a.buz.length; o.murekkep += (a.mur || []).length; });
  return o;
}
// çekiçle kırılan buz / açılan kilit de hedefe sayılır (odul.js: R.ekstra)
function yolV(b, ist, R) { const e = (R && R.ekstra) || {}; return yolHedefSayi(b.hedef, ist) + (b.hedef.tur === 'buz' || b.hedef.tur === 'kilit' || b.hedef.tur === 'murekkep' ? e[b.hedef.tur] || 0 : 0); }
function yolHedefSayi(h, ist) { return h.tur === 'puan' ? ist.puan : h.tur === 'renk' ? ist.renk[h.renk] : ist[h.tur]; }
// hamleler: verilirse uzmanın yaptığı taşımalar [a, b] eklenir (test ve ipucu için)
function yolUzman(T0, hamle, tur, renk, hamleler) {
  const T = yolKopya(T0), ids = T.hedef.map((t, k) => T.h.find(x => x && x.k === k).id);
  const deger = t => {
    const hs = strOzelGenislet(t, strBombaHucreleri(t, ids)).hs; let v = hs.length;   // özel karoların etkisi de hesaba katılır
    if (tur === 'renk') hs.forEach(i => { if (t.h[i].ci === renk) v += 2; });
    if (tur === 'kilit') hs.forEach(i => { if (t.h[i].kilit) v += 3; });
    if (tur === 'buz' || tur === 'murekkep') { const f = tur === 'buz' ? 'buz' : 'mur', g = new Set(); hs.forEach(i => [i].concat(strKomsu(t, i)).forEach(j => { if (t.h[j] && t.h[j][f]) g.add(j); })); v += g.size * 3; }
    return v;
  };
  for (let h = 0; h < hamle; h++) {
    let en = deger(T), best = null;
    for (let a = 0; a < T.h.length; a++) {
      if (!T.h[a] || strDonuk(T.h[a])) continue;
      for (let b = 0; b < T.h.length; b++) { if (a === b) continue; const t = { cols: T.cols, rows: T.rows, h: T.h.slice() }; if (!strTasi(t, a, b)) continue; const v = deger(t); if (v > en) { en = v; best = [a, b]; } }
    }
    if (!best) break;
    strTasi(T, best[0], best[1]); if (hamleler) hamleler.push(best);
    if ((h + 1) % STR_MUR_ARALIK === 0 && T.h.some(k => k && k.mur)) strMurekkepYay(T, h + 1);   // oyuncudaki gibi yayılır
  }
  return yolIstat(strPatlamaPlani(T, ids));
}
function yolHedefYazi(h, kisa) {
  if (h.tur === 'puan') return tt(kisa ? '🎯 {n} puan' : '🎯 {n} puan yap', { n: h.sayi });
  if (h.tur === 'renk') return tt(kisa ? '{i} {n} {r}' : '{i} {n} {r} karo patlat', { i: YOL_RENK_I[h.renk], n: h.sayi, r: tt(YOL_RENK_AD[h.renk]) });
  if (h.tur === 'buz') return tt(kisa ? '🧊 {n} buz' : '🧊 {n} buz kır', { n: h.sayi });
  if (h.tur === 'murekkep') return tt(kisa ? '🖋 {n} mürekkep' : '🖋 {n} mürekkep temizle', { n: h.sayi });
  return tt(kisa ? '🔒 {n} kilit' : '🔒 {n} kilitli karo patlat', { n: h.sayi });
}

/* ---------------- kayıt ---------------- */
function yolKayit() { return kayit.yol; }
function yolYildizToplam() { const y = kayit.yol.yildiz; let t = 0; for (const k in y) t += y[k]; return t; }

/* ---------------- harita ---------------- */
function yolHaritaAc() {
  strKapat();
  if (G.state !== 'menu') demo();
  D = null; Ses.muzik('menu'); Konus.sus();
  const Y = yolKayit(), acik = Math.min(YOL_TOPLAM, Y.acik);
  let ic = `<div class="ust-satir"><button class="geri" id="y-geri">${tt('← Geri')}</button><span class="y-toplam">⭐ ${yolYildizToplam()} / ${YOL_TOPLAM * 3}</span></div>
    <div class="y-cuzdan">${canHtml()}${jetonHtml()}<button class="sec dk-btn" id="y-dukkan">🛒 ${tt('Dükkân')}</button></div>
    <div class="ana-baslik">🗺 ${tt('BÖLÜM YOLU')}</div>${sandikHtml()}${aracHtml()}<div class="y-yol">`;
  YOL_BOLGE.forEach((B, bi) => {
    const ilk = bi * YOL_BOLUM_BOLGE + 1, kilitli = ilk > acik;
    ic += `<div class="y-bolge ${kilitli ? 'kilit' : ''}" style="--b:${B.renk}"><i>${B.i}</i><div><b>${tt(B.ad)}</b><small>${B.lvl} · ${tt('Bölüm {a}–{b}', { a: ilk, b: ilk + YOL_BOLUM_BOLGE - 1 })}${B.yeni ? ' · ' + tt('Yeni: ') + yolMekanikAd(B.yeni) : ''}</small>${seviyeHak(B.lvl) ? '' : `<em class="y-sinav">🎓 ${tt('{s} Seviye Sınavı ile açılır', { s: sinavSeviye(B.lvl) })}</em>`}</div></div>`;
    for (let n = ilk; n < ilk + YOL_BOLUM_BOLGE; n++) {
      const sira = n - ilk, x = [50, 70, 82, 70, 50, 30, 18, 30][sira % 8], y = Y.yildiz[n] || 0, durum = n < acik || y ? 'gecti' : n === acik ? 'simdi' : 'kilit', boss = YOL_DALGA[sira] === 'boss', zor = YOL_DALGA[sira] === 'zor';
      ic += `<div class="y-satir"><button class="y-durak ${durum} ${boss ? 'boss' : zor ? 'zor' : ''}" data-n="${n}" style="left:${x}%;--b:${B.renk}" aria-label="${tt('Bölüm {n}', { n })}${durum === 'kilit' ? ' 🔒' : ''}">
        <b>${durum === 'kilit' ? '🔒' : boss ? '💀' : n}</b>${durum !== 'kilit' ? `<span class="y-yildiz">${[0, 1, 2].map(i => `<i class="${i < y ? 'on' : ''}">★</i>`).join('')}</span>` : ''}</button></div>`;
    }
  });
  ic += '</div>';
  goster(ic, 'genis y-kart', 'yol');
  $('#y-geri').onclick = () => acilisAc();
  $('#y-dukkan').onclick = () => { sesAc(); dukkanAc(); };
  sandikBagla();
  card.querySelectorAll('.y-durak').forEach(b => b.onclick = () => {
    const n = +b.dataset.n;
    if (n > acik) { Ses.cal('geri', { ses: 0.4 }); not(tt('Önce {n}. bölümü geç.', { n: acik })); return; }
    sesAc(); Ses.cal('tik', { ses: 0.5 }); yolBaslangic(n);
  });
  setTimeout(() => { const s = card.querySelector('.y-durak.simdi'); if (s) s.scrollIntoView({ block: 'center' }); }, 30);
}
function yolMekanikAd(m) { return { buz: tt('🧊 Buz'), kilit: tt('🔒 Kilit'), renk: tt('🎨 Renk hedefi'), sis: tt('🌫 Sis'), murekkep: tt('🖋 Mürekkep'), karisik: tt('🔀 Karışık harfler') }[m] || ''; }
const YOL_ACIKLAMA = {
  buz: '🧊 Buzlu karo yerinden oynamaz. Kendisi ya da yanındaki karo patlayınca buz kırılır.',
  kilit: '🔒 Kilitli karo yerinden oynamaz. Onu patlatmak için aynı renk bir grubu ona değdir.',
  renk: '🎨 Hedef bir renk: o renkten istenen kadar karoyu patlat. O renkteki kelimelerin yanına aynı rengi topla.',
  sis: '🌫 Sisli karonun kelimesi görünmez ve kutuya çekilemez. Onu ya da yanındaki bir karoyu taşıyınca sis açılır.',
  murekkep: '🖋 Mürekkep her 2 hamlede yanındaki karoya yayılır ve lekeli karo yerinden oynamaz. Kendisi ya da yanındaki patlayınca temizlenir.',
  karisik: '🔀 Bazı kelimelerin harfleri karışık. Hangi kelime olduğunu bul ve doğru sıraya koy.',
};
const YOL_OZEL_ACIKLAMA = {
  yatay: 'Çizgili karo: aynı renk grubuyla patlayınca bütün satırı patlatır.',
  dikey: 'Çizgili karo: aynı renk grubuyla patlayınca bütün sütunu patlatır.',
  paket: 'Paket karo: aynı renk grubuyla patlayınca çevresindeki 3×3 alanı patlatır.',
  gokkusagi: 'Gökkuşağı: yanındaki karo patlayınca o renkteki bütün karoları patlatır.',
};
// bölüm başlangıç kartı
function yolBaslangic(no) {
  if (!yolBolgeHak(no)) { sinavKapisi(no); return; }   // kilit.js: yeni seviyeli bölge sınavla açılır
  const b = yolBolum(no), y = kayit.yol.yildiz[no] || 0, en = kayit.yol.enIyi[no] || 0;
  const yeniMek = b.sira === 0 && b.B.yeni ? b.B.yeni : null;
  goster(`<div class="y-bas" style="--b:${b.B.renk}"><div class="y-bas-no">${b.zor === 'boss' ? '💀 ' : ''}${tt('BÖLÜM {n}', { n: no })}</div>
      <small>${b.B.i} ${tt(b.B.ad)} · ${b.B.lvl}${b.zor === 'boss' ? ' · ' + tt('ZOR BÖLÜM') : b.zor === 'zor' ? ' · ' + tt('zor') : ''}</small></div>
    <div class="y-hedef">${yolHedefYazi(b.hedef)}</div>
    <div class="y-bilgi"><span>✋ ${tt('{n} hamle', { n: b.hamle })}</span><span>📝 ${tt('{n} kelime', { n: b.T.n })}</span></div>
    ${yeniMek ? `<div class="y-yeni"><b>${tt('YENİ!')}</b> ${tt(YOL_ACIKLAMA[yeniMek])}</div>` : ''}
    ${['sis', 'murekkep', 'karisik'].filter(m => m !== yeniMek && b.T.h.some(k => k && (m === 'sis' ? k.sis : m === 'murekkep' ? k.mur : k.kar))).map(m => `<div class="y-ozel">${tt(YOL_ACIKLAMA[m])}</div>`).join('')}
    ${[...new Set(b.T.h.filter(k => k && k.ozel).map(k => k.ozel))].map(o => `<div class="y-ozel"><i>${OZEL_I[o]}</i> ${tt(YOL_OZEL_ACIKLAMA[o])}</div>`).join('')}
    <div class="y-yildizlar">${[0, 1, 2].map(i => `<i class="${i < y ? 'on' : ''}">★</i>`).join('')}</div>
    ${galibiyetHtml()}
    ${canGerekir(no) ? `<div class="y-can">${canHtml()}<small>${tt('Bölüm 1 can harcar; kazanınca can geri gelir.')}</small></div>` : ''}
    ${en ? `<p class="aciklama kucuk" style="text-align:center">${tt('En iyi skorun: {n}', { n: en })}</p>` : ''}
    <button class="big" id="y-oyna">${tt('OYNA ▶')}</button>
    <div class="row"><button class="sec" id="y-harita">${tt('HARİTA')}</button></div>`, '', 'yolBas');
  $('#y-oyna').onclick = () => { sesAc(); yolOyna(no); };
  $('#y-harita').onclick = yolHaritaAc;
}
function yolOyna(no, o) {
  if (!kayit.strRehber) {   // daha önce strateji alıştırması yapılmadıysa önce o
    strRehberTek(); STR.R.rehber.sonra = () => { strKapat(); yolOyna(no, o); }; return;
  }
  if (!(o && o.davet) && !yolBolgeHak(no)) { strKapat(); sinavKapisi(no); return; }
  const b = yolBolum(no);
  const can = canGerekir(no);
  if (can && !canHarca()) { strKapat(); canBittiAc(no); return; }
  strKapat(); if (G.state !== 'menu') demo();
  D = null; Konus.sus(); Ses.muzik('strateji'); Ses.gerilim(0);
  STR = { mac: 'yol', yol: { no, b, devam: false, davet: (o && o.davet) || null, can, bonus: [] }, lvl: b.B.lvl, tohum: 'yol:' + no, cum: [], tur: 0, ben: [], rakipS: [], rakip: { ad: '', bot: true }, online: false, karar: null, xp0: kayit.xp, R: null, zaman: null };
  ekranlariKapat(); strEkranKur();
  STR.R = { s: b.s, T: yolKopya(b.T), hamle: b.hamle, secim: Array(b.T.n).fill(null), secili: -1, sure: Infinity, t0: Date.now(), bitti: false, sonuc: null };
  STR.yol.bonus = galibiyetUygula(STR.R.T);   // ekonomi.js: 3+ galibiyet serisinde özel karoyla başlar
  strCiz(true);
  if (STR.yol.bonus.length) setTimeout(() => { if (STR && STR.yol) { not(tt('🔥 Galibiyet bonusu: {o}', { o: STR.yol.bonus.map(t => OZEL_I[t]).join(' ') })); Ses.cal('yukselis', { ses: 0.5 }); } }, 700);
  Olay.yay('bolumBasladi', { mod: 'yol', r: 'yol' + no, lvl: b.B.lvl, devam: false, goster: false });
  setTimeout(() => { if (STR && STR.yol && STR.R && !STR.R.bitti) Konus.tr(b.s.tr.replace(/;/g, ',')); }, 500);
}
// strateji ekranının üstünü Bölüm Yolu'na göre yazar (strCiz sonunda)
function yolCiz() {
  const M = STR, R = M.R, b = M.yol.b;
  $('#st-tur').textContent = tt('BÖLÜM {n}', { n: b.no });
  $('#st-sure').textContent = yolHedefYazi(b.hedef, true);
  $('#st-sure').classList.remove('az');
  $('#st-skor').innerHTML = `<span class="y-mini-yildiz">${[0, 1, 2].map(i => `<i class="${i < (kayit.yol.yildiz[b.no] || 0) ? 'on' : ''}">★</i>`).join('')}</span>`;
  // canlı önizleme: seçilen kelimelerle bomba şimdi patlasa
  const sec = R.secim.filter(Boolean);
  let on = '';
  if (sec.length && !R.bitti) {
    const ist = yolIstat(strPatlamaPlani(R.T, sec.map(k => k.id))), v = yolV(b, ist, R), tamam = v >= b.hedef.sayi;
    on = `💣 ${tt('Önizleme')}: <b>${ist.karo}</b> ${tt('karo')} · <span class="${tamam ? 'ok' : ''}">${yolHedefYazi(b.hedef, true).split(' ')[0]} ${Math.min(v, 99999)}/${b.hedef.sayi}${tamam ? ' ✓' : ''}</span>`;
  }
  $('#st-rakip').innerHTML = on || `${tt('Hedef')}: ${yolHedefYazi(b.hedef)}`;
  const ar = $('#st-araclar'); if (ar) ar.innerHTML = R.bitti ? '' : aracCubukHtml();   // güçler (odul.js)
  if (R.arac) $('#st-ipucu').textContent = tt(R.arac === 'cekic' ? '🔨 Yok etmek istediğin karoya dokun.' : '🧲 Yerini değiştirmek istediğin iki karoya sırayla dokun.');
  if (!R.bitti && R.secili < 0 && !sec.length) $('#st-ipucu').textContent = tt('Aynı renkleri kelimelerin yanına topla, sonra kelimeleri sırayla kutulara çek.');
}
// hamle bitti: hedefe yetmiyorsa NEREDEYSE (+3 hamle, bir kez bedava)
function yolHamleBitti() {
  const M = STR, R = M && M.R, canta = kayit.envanter.hamle3 > 0, alir = (kayit.jeton || 0) >= NEREDEYSE_FIYAT;
  if (!M || !M.yol || !R || R.bitti || M.yol.sorma || (M.yol.devam && !canta && !alir)) return;
  const b = M.yol.b, ids = R.T.hedef.map((t, k) => R.T.h.find(x => x && x.k === k).id);
  const v = yolV(b, yolIstat(strPatlamaPlani(R.T, ids)), R);
  if (v >= b.hedef.sayi) return;
  const p = $('#st-panel');
  p.innerHTML = `<div class="st-kart y-neredeyse"><h3>😩 ${tt('NEREDEYSE!')}</h3>
    <p>${tt('Hamlen bitti ama hedefe biraz kaldı:')}</p><div class="y-hedef buyuk">${yolHedefYazi(b.hedef, true).split(' ')[0]} ${v} / ${b.hedef.sayi}</div>
    ${M.yol.devam && !canta ? `<button class="big" id="y-ek">${tt('✋ +3 HAMLE · {f} 🪙', { f: NEREDEYSE_FIYAT })}</button><small class="y-bedava">${tt('Jetonun: {n}', { n: kayit.jeton })}</small>`
      : M.yol.devam ? `<button class="big" id="y-ek">${tt('✋ +3 HAMLE KULLAN')}</button><small class="y-bedava">${tt('Çantanda {n} tane var', { n: kayit.envanter.hamle3 })}</small>`
      : `<button class="big" id="y-ek">${tt('+3 HAMLE 🎁')}</button><small class="y-bedava">${tt('Bu bölümde 1 kez bedava')}</small>`}
    <div class="row"><button class="sec" id="y-boyle">${tt('Böyle devam et')}</button></div></div>`;
  p.classList.add('acik'); Ses.cal('yukselis', { ses: 0.4 });
  Olcum.olay('neredeyse', { yol_no: b.no, v, hedef: b.hedef.sayi });
  $('#y-ek').onclick = () => { if (M.yol.devam) { if (kayit.envanter.hamle3 > 0) { kayit.envanter.hamle3--; kaydet(); } else if (!jetonHarca(NEREDEYSE_FIYAT, 'neredeyse')) return; } M.yol.devam = true; R.hamle += 3; p.classList.remove('acik'); Ses.cal('yukselis', { ses: 0.6 }); strCiz(); };
  $('#y-boyle').onclick = () => { M.yol.devam = true; M.yol.sorma = true; p.classList.remove('acik'); };
}
// bomba sonrası (strTurBitir çağırır)
function yolBitti(dogru) {
  const M = STR, R = M.R, b = M.yol.b;
  if (!dogru) { yolSonuc({ kazandi: false, yanlis: true, puan: 0, v: 0 }); return; }
  const ist = yolIstat(R.plan), v = yolV(b, ist, R), kazandi = v >= b.hedef.sayi;
  if (!kazandi) { yolSonuc({ kazandi, puan: ist.puan, v }); return; }
  // CÜMLE CRUSH: önce tahtada kalan özel karolar patlar, sonra kalan her hamle rastgele bir karoyu patlatır
  let puan = ist.puan, ozelBonus = 0, gec = 0;
  const kalanOzel = R.T.h.filter(k => k && k.ozel && k.ozel !== 'gokkusagi');
  if (kalanOzel.length) {
    const p = strPatlamaPlani(R.T, kalanOzel.map(k => k.id)); ozelBonus = p.puan - (p.temiz ? 300 : 0);
    strPuanUc(tt('CÜMLE CRUSH!'), 0); Ses.cal('zincir', { ses: 0.8 }); gec = 700;
    p.adimlar.forEach((a, n) => setTimeout(() => {
      if (STR !== M) return;
      if (a.ozel && a.ozel.length) strOzelEfekt(R.T, a);
      a.hucreler.forEach(i => { const k = R.T.h[i], el = k && strKaroEl(k.id); if (el) { el.classList.add('pat'); strKivilcim(el, k.ci); } });
      Ses.cal('pop', { ses: 0.7 }); setTimeout(() => { if (STR === M) { R.T.h = a.sonra; strCiz(); } }, 450);
    }, 500 + n * 800));
    gec = 500 + p.adimlar.length * 800;
    puan += ozelBonus;
  }
  const kalan = Math.min(10, R.hamle);
  let karolar = [];
  setTimeout(() => {
    if (STR !== M) return;
    karolar = R.T.h.map((k, i) => k ? i : -1).filter(i => i >= 0).sort(() => Math.random() - 0.5).slice(0, kalan);
    if (karolar.length && !kalanOzel.length) { strPuanUc(tt('CÜMLE CRUSH!'), 0); Ses.cal('zincir', { ses: 0.8 }); }
    karolar.forEach((i, n) => setTimeout(() => {
      if (STR !== M) return;
      const k = R.T.h[i], el = k && strKaroEl(k.id); if (el) { el.classList.add('pat'); strKivilcim(el, k.ci); }
      puan += 15; Ses.cal('pop', { ses: 0.6, hiz: 1 + n * 0.06 });
    }, 600 + n * 220));
    setTimeout(() => { if (STR === M) yolSonuc({ kazandi: true, puan, v, crush: karolar.length, ozelBonus }); }, 600 + karolar.length * 220 + (karolar.length ? 500 : 0));
  }, gec);
  return;
}
function yolSonuc(o) {
  const M = STR, b = M.yol.b, Y = kayit.yol, no = b.no;
  let yildiz = 0, yeniEn = false;
  const dv = M.yol.davet, ileride = dv && no > Y.acik;   // davetle oynanan, henüz açılmamış bölüm: ilerleme değişmez
  if (o.kazandi && ileride) yildiz = 1 + (o.puan >= b.esik[0] ? 1 : 0) + (o.puan >= b.esik[1] ? 1 : 0);
  const ilkKez = !Y.yildiz[no];
  if (o.kazandi && !ileride) {
    yildiz = 1 + (o.puan >= b.esik[0] ? 1 : 0) + (o.puan >= b.esik[1] ? 1 : 0);
    Y.yildiz[no] = Math.max(Y.yildiz[no] || 0, yildiz);
    if (o.puan > (Y.enIyi[no] || 0)) { Y.enIyi[no] = o.puan; yeniEn = true; }
    Y.acik = Math.max(Y.acik, Math.min(YOL_TOPLAM, no + 1));
  }
  // ekonomi.js: jeton (ilk geçiş 10 + 5×yıldız, tekrar 3), kazanınca can geri, galibiyet serisi
  const jeton = o.kazandi ? (ilkKez && !ileride ? 10 + 5 * yildiz : 3) : 0; if (jeton) jetonEkle(jeton);
  if (o.kazandi && M.yol.can) canVer();
  const seriOnce = galibiyetSonuc(o.kazandi);
  const sandik = o.kazandi && !ileride ? sandikKazan(yildiz === 3 || b.zor === 'boss' ? 'altin' : b.zor === 'zor' ? 'gumus' : 'tahta') : null;   // odul.js
  kaydet();
  Olay.yay('bolumBitti', { mod: 'yol', r: 'yol' + no, lvl: b.B.lvl, kazandi: o.kazandi, yildiz, skor: o.puan, istat: {}, enKombo: 0, rekor: yeniEn });
  const xp = kayit.xp - M.xp0, oran = Math.min(1, o.v / b.hedef.sayi), p = $('#st-panel');
  const sonraki = o.kazandi && no < YOL_TOPLAM && !ileride, bolgeBitti = o.kazandi && no % YOL_BOLUM_BOLGE === 0 && no < YOL_TOPLAM;
  const bas = o.kazandi ? (yildiz === 3 ? tt('MÜKEMMEL!') : yildiz === 2 ? tt('HARİKA!') : tt('BÖLÜM GEÇİLDİ!')) : o.yanlis ? tt('CÜMLE YANLIŞ') : oran >= 0.6 ? tt('NEREDEYSE!') : tt('OLMADI');
  p.innerHTML = `<div class="st-kart y-sonuc"><h3 class="${o.kazandi ? 'kaz' : 'kay'}">${bas}</h3>
    ${o.kazandi ? `<div class="y-yildizlar buyuk">${[0, 1, 2].map(i => `<i class="${i < yildiz ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.35}s">★</i>`).join('')}</div>` : ''}
    <div class="y-puan">${o.puan}${yeniEn ? ` <small>${tt('YENİ REKOR!')}</small>` : ''}</div>
    ${o.crush ? `<div class="st-not">💥 ${tt('CÜMLE CRUSH! Kalan {n} hamle patladı', { n: o.crush })}</div>` : ''}
    ${o.ozelBonus ? `<div class="st-not">🌟 ${tt('Kalan özel karolar: +{n}', { n: o.ozelBonus })}</div>` : ''}
    ${!o.kazandi && !o.yanlis ? `<div class="y-ilerle"><span>${yolHedefYazi(b.hedef, true).split(' ')[0]} ${o.v} / ${b.hedef.sayi}</span><u style="width:${Math.round(oran * 100)}%"></u></div><p>${tt(oran >= 0.6 ? 'Çok az kaldı! Renkleri kelimelerin yanına biraz daha topla.' : 'Kelimelerin yanına daha çok aynı renk getir.')}</p>` : ''}
    ${dv ? `<div class="davet-sonuc ${o.puan > dv.puan ? 'gecti' : ''}"><span>${esc(dv.ad)} <b>${dv.puan}</b></span><span>–</span><span>${tt('Sen')} <b>${o.puan}</b></span>
      <strong>${o.puan > dv.puan ? tt('GEÇTİN! 🎉') : o.puan === dv.puan ? tt('BERABERE!') : tt('Az kaldı, tekrar dene!')}</strong></div>` : ''}
    ${o.kazandi ? paylasDugme('y-paylas') : ''}
    ${o.yanlis ? `<div class="st-dogru"><small>${tt('Doğru cümle')}</small>${dinleBtn(b.s.en)} <b>${esc(b.s.en)}</b><small>${esc(b.s.tr)}</small></div>` : ''}
    ${xp > 0 || jeton ? `<div class="sonuc-alt">${xp > 0 ? `+${xp} XP` : ''}${xp > 0 && jeton ? ' · ' : ''}${jeton ? `+${jeton} 🪙` : ''}</div>` : ''}
    ${o.kazandi && kayit.galibiyet >= 2 ? `<div class="st-not galibiyet-not">🔥 ${tt('Galibiyet serisi: {n}', { n: kayit.galibiyet })}${galibiyetBonus(kayit.galibiyet).length > galibiyetBonus(seriOnce).length ? ' · ' + tt('Yeni bonus: {o}', { o: galibiyetBonus(kayit.galibiyet).map(t => OZEL_I[t]).join(' ') }) : ''}</div>` : ''}
    ${!o.kazandi && seriOnce >= 2 ? `<div class="st-not seri-bozuldu">💔 ${tt('{n} galibiyetlik serin bozuldu', { n: seriOnce })}</div>` : ''}
    ${!o.kazandi && M.yol.can ? `<div class="y-can">${canHtml()}</div>` : ''}
    ${sandik ? sandikKazanHtml(sandik) : ''}
    ${M.yol.etkinlik ? `<div class="sonuc-alt etk-kazanc">${etkTema().i} ${tt(etkTema().ad)}: +${M.yol.etkinlik} ${etkTema().jeton}</div>` : ''}
    ${bolgeBitti ? (seviyeHak(YOL_BOLGE[b.bi + 1].lvl) ? `<div class="y-yeni"><b>${tt('YENİ BÖLGE AÇILDI!')}</b> ${YOL_BOLGE[b.bi + 1].i} ${tt(YOL_BOLGE[b.bi + 1].ad)}</div>`
      : `<div class="y-yeni"><b>🎓 ${tt('SIRADA SINAV VAR!')}</b> ${tt('{b} için {s} Seviye Sınavı’nı geç.', { b: YOL_BOLGE[b.bi + 1].i + ' ' + tt(YOL_BOLGE[b.bi + 1].ad), s: sinavSeviye(YOL_BOLGE[b.bi + 1].lvl) })}</div>`) : ''}
    ${sonraki ? `<button class="big" id="y-sonraki">${tt('SONRAKİ BÖLÜM ▶')}</button>` : ileride && o.kazandi ? `<button class="big" id="y-kendi">${tt('KENDİ YOLUNA DÖN · BÖLÜM {n}', { n: Y.acik })}</button>` : `<button class="big" id="y-tekrar">${tt('TEKRAR DENE')}</button>`}
    <div class="row">${sonraki || (ileride && o.kazandi) ? `<button class="sec" id="y-tekrar">${tt('TEKRAR OYNA')}</button>` : ''}<button class="sec" id="y-harita">${tt('HARİTA')}</button></div></div>`;
  p.querySelectorAll('.dinle').forEach(x => x.onclick = e => { e.stopPropagation(); sesAc(); Konus.soyle(x.dataset.en, { hiz: 0.85 }); });
  p.classList.add('acik');
  Ses.cal(o.kazandi ? 'zafer' : 'yenilgi', { ses: o.kazandi ? 0.9 : 0.6 });
  if (o.kazandi) Yerel.titret('basari');
  const s = $('#y-sonraki'); if (s) s.onclick = () => yolBaslangic(no + 1);
  const kd = $('#y-kendi'); if (kd) kd.onclick = () => yolBaslangic(Y.acik);
  const pb = $('#y-paylas'); if (pb) pb.onclick = () => paylas(yolPaylasMetni(no, yildiz, o.puan, dv ? '\n' + tt('{ad} {a} – ben {b}', { ad: dv.ad, a: dv.puan, b: o.puan }) : ''));
  $('#y-tekrar').onclick = () => yolOyna(no, dv ? { davet: dv } : null);
  $('#y-harita').onclick = yolHaritaAc;
}
