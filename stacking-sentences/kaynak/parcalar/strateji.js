/* =====================================================================
   STRATEJİ MAÇI (online kapışmanın ikinci modu; bilgisayara karşı da oynanır)
   Bilgi + strateji: önce tahtayı düzenle, sonra doğru kelimeleri seç, en büyük patlamayı yap.
   · Tahta bir kitap sayfası gibi soldan sağa, satır satır okunan bir sıradır; birkaç hücresi boştur.
     Bir karoyu başka bir karonun üstüne bırakınca o hücreye oturur; oradaki karo ve arkasındakiler
     sağa kayar (satır bitince alt satırın başına iner) ve ilk boşluğu doldurur. Karonun eski yeri boşalır.
     Boş hücreye bırakmak kaydırmaz. Her taşıma 1 hamle; hamle sayısı sınırlı (kelime sayısı + 6), süre rahat.
   · Kelime seçimi: cümlenin kelimeleri sırayla alttaki kutulara çekilir; kutuya karonun gölgesi gider,
     karonun kendisi tahtada kalır (seçmek ve geri almak hamle harcamaz).
   · BOMBA: kutular dolunca basılır. Cümle doğruysa seçilen karolar ve onlara yan yana / alt alta değen
     aynı renkli karolar birlikte patlar; kalanlar düşer, 4+ aynı renk birleşirse zincirleme patlar.
     Cümle yanlışsa patlama olmaz, tur puanı 0.
   · Tur: ikisi de doğruysa çok puan alan, biri doğruysa doğru kuran kazanır; ikisi de yanlışsa berabere.
     Maç 3 tur; en çok tur kazanan, eşitse toplam puanı yüksek olan kazanır.
   · Tahta stratejiye göre hazırlanır: iki oyuncuya aynı tohumla aynı tahta; tuzak kelimeler doğrusuyla aynı renkte
     (renge bakarak değil, bilerek seçilir); başlangıçta hedef kelimelerin yanında kendi renginden karo yoktur ve
     hazır üçlü yoktur: patlamayı oyuncu kendisi kurar.
   Ağ mesajları (online.js odası): basla (mod: 'strateji', tohum, cümleler) · stur (tur sonucu: doğru, puan) · cikti
   ===================================================================== */
const STR_TUR = 3, STR_SURE = 180, STR_SUTUN = 6, STR_BOS = 3, STR_KASKAD = 4, STR_RENK_N = 4;
const STR_ARALIK = { A1: [4, 6], A2: [4, 7], B1: [5, 8], B2: [5, 9], C1: [5, 10], C2: [6, 10] };
const STR_BOT_DOGRU = { A1: 0.86, A2: 0.84, B1: 0.8, B2: 0.78, C1: 0.75, C2: 0.72 };
let STR = null;   // açık maç

/* ---------------- saf kurallar (tahta, taşıma, patlama) ---------------- */
const strKucuk = t => String(t).toLowerCase().replace(/[^a-zçğıöşü0-9']/gi, '');
function strCumleler(lvl, r) {
  r = r || Math.random;
  const [en, ek] = STR_ARALIK[lvl] || [4, 8], rl = seviyeRakipleri(lvl).filter(cumleliMi), out = [], gor = {};
  for (let n = 0; n < 600 && out.length < STR_TUR && rl.length; n++) {
    const h = cumleler(rl[Math.floor(r() * rl.length)].id); if (!h.length) continue;
    const s = h[Math.floor(r() * h.length)], k = s.kaynak + ':' + s.i;
    if (gor[k] || s.w.length < en || s.w.length > ek || s.w.some(w => [...w[0]].length > 13)) continue;
    gor[k] = 1; out.push([s.kaynak, s.i]);
  }
  return out;
}
// tahta: { cols, rows, h: [karo | null], hedef: [metin], n } · karo: { id, txt, ci, k (hedefteki sıra, yoksa -1), cel (tuzak) }
// o: { rows, bos, tuzak } (Bölüm Yolu küçük tahta kullanır; verilmezse strateji maçının ölçüleri)
function strTahta(s, lvl, tohum, o) {
  o = o || {};
  const r = tohumluRastgele(tohum), al = a => a[Math.floor(r() * a.length)];
  const karistir_ = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hedef = s.w.map(w => w[0]), n = hedef.length, li = Math.max(0, SEVIYELER.indexOf(lvl));
  const BOS = o.bos || STR_BOS, cols = STR_SUTUN, rows = o.rows || (n >= 8 ? 7 : 6), hucre = cols * rows, karoN = hucre - BOS;
  const kul = new Set(hedef.map(strKucuk)), karolar_ = [];
  let id = 0;
  // hedef kelimeler: renkler dengeli (bir renkte en çok yarısı)
  const hr = karistir_([...Array(Math.ceil(n / STR_RENK_N) + 1)].flatMap(() => [0, 1, 2, 3])).slice(0, n);
  hedef.forEach((t, k) => karolar_.push({ id: ++id, txt: t, ci: hr[k], k, cel: false }));
  // tuzaklar: doğrusuyla aynı renk (bilgi testi); seviye yükseldikçe çoğalır
  const tuzakN = o.tuzak != null ? o.tuzak : Math.min(n, 2 + li), adaylar = [];
  s.w.forEach((w, k) => [w[1], w[2]].forEach(c => { if (c && !kul.has(strKucuk(c))) adaylar.push({ c, k }); }));
  karistir_(adaylar).forEach(a => { if (karolar_.length - n >= tuzakN || kul.has(strKucuk(a.c))) return; kul.add(strKucuk(a.c)); karolar_.push({ id: ++id, txt: a.c, ci: hr[a.k], k: -1, cel: true, of: a.k }); });
  // dolgu kelimeler: aynı seviyenin başka cümlelerinden; renkler toplamı dengeler
  const havuz = [], rl = seviyeRakipleri(lvl).filter(cumleliMi);
  for (let d = 0; d < 80 && havuz.length < 160; d++) { const h = cumleler(al(rl).id); const c = h.length && al(h); if (c) c.w.forEach(w => { const t = w[0], kk = strKucuk(t); if (kk && !kul.has(kk) && [...t].length <= 8 && !/[.,!?]/.test(t)) { kul.add(kk); havuz.push(t === 'I' ? t : t.toLowerCase()); } }); }
  const say = [0, 0, 0, 0]; karolar_.forEach(k => say[k.ci]++);
  while (karolar_.length < karoN) {
    let ci = 0; for (let c = 1; c < STR_RENK_N; c++) if (say[c] < say[ci] || (say[c] === say[ci] && r() < 0.5)) ci = c;
    say[ci]++; karolar_.push({ id: ++id, txt: havuz.length ? havuz.pop() : '…', ci, k: -1, cel: false });
  }
  // yerleştir, sonra stratejiye uygun hale getir: hazır üçlü yok, hedef karonun yanında kendi rengi yok
  const T = { cols, rows, n, hedef, h: karistir_(karolar_.concat(Array(BOS).fill(null))) };
  for (let d = 0; d < 4000; d++) {
    const kotu = strKotuHucreler(T); if (!kotu.length) break;
    const a = al(kotu), b = Math.floor(r() * hucre); [T.h[a], T.h[b]] = [T.h[b], T.h[a]];
  }
  return T;
}
function strKomsu(T, i) { const c = i % T.cols, o = []; if (c > 0) o.push(i - 1); if (c < T.cols - 1) o.push(i + 1); if (i - T.cols >= 0) o.push(i - T.cols); if (i + T.cols < T.h.length) o.push(i + T.cols); return o; }
function strGrup(T, i) {   // i'den başlayıp aynı renkte bağlı hücreler
  const k = T.h[i]; if (!k) return [];
  const g = [i], gor = new Set(g);
  for (let q = 0; q < g.length; q++) strKomsu(T, g[q]).forEach(j => { if (!gor.has(j) && T.h[j] && T.h[j].ci === k.ci) { gor.add(j); g.push(j); } });
  return g;
}
function strKotuHucreler(T) {
  const o = new Set();
  T.h.forEach((k, i) => {
    if (!k) return;
    if (k.k >= 0 && strKomsu(T, i).some(j => T.h[j] && T.h[j].ci === k.ci)) o.add(i);
    const g = strGrup(T, i); if (g.length >= 3) g.forEach(x => o.add(x));
  });
  return [...o];
}
// taşı: karo 'a' hücresinden 'b' hücresine; b doluysa b ve arkasındakiler sağa (satır sonunda alta) kayar, ilk boşluğu doldurur
// buzlu / kilitli karo (Bölüm Yolu) yerinden oynamaz: taşınamaz, üstüne bırakılamaz, kayan sıra onu atlar
const strDonuk = k => !!(k && (k.buz || k.kilit));
function strTasi(T, a, b) {
  if (a === b || !T.h[a] || strDonuk(T.h[a]) || strDonuk(T.h[b])) return false;
  const N = T.h.length, karo = T.h[a]; T.h[a] = null;
  if (T.h[b]) {
    const sira = [b];   // b'den ileri, donuk hücreleri atlayarak ilk boşluğa kadar
    for (let p = b, g = 0; g < N; g++) { p = (p + 1) % N; if (strDonuk(T.h[p])) continue; sira.push(p); if (!T.h[p]) break; }   // ilk boşluk (karonun boşalttığı yer kesin var)
    for (let i = sira.length - 1; i > 0; i--) T.h[sira[i]] = T.h[sira[i - 1]];
  }
  T.h[b] = karo;
  return true;
}
function strHucreBul(T, id) { return T.h.findIndex(k => k && k.id === id); }
// bombanın patlattığı hücreler: seçilen karolar + onlara bağlı aynı renk
function strBombaHucreleri(T, idler) {
  const o = new Set();
  idler.forEach(id => { const i = strHucreBul(T, id); if (i >= 0) strGrup(T, i).forEach(x => o.add(x)); });
  return [...o];
}
function strDus(T) {   // her sütunda karolar aşağı iner
  for (let c = 0; c < T.cols; c++) {
    const col = []; for (let r = T.rows - 1; r >= 0; r--) { const k = T.h[r * T.cols + c]; if (k) col.push(k); }
    for (let r = T.rows - 1, j = 0; r >= 0; r--, j++) T.h[r * T.cols + c] = col[j] || null;
  }
}
// hamle anındaki ödül için: 3+ aynı renk gruplarının boyu (hücre → boy) ve tahtanın "hazır grup" değeri (doğru/yanlış kelimeden bağımsız: bilgi sızdırmaz)
function strGruplar(T) { const m = new Map(); T.h.forEach((k, i) => { if (k && k.ci >= 0 && !m.has(i)) { const g = strGrup(T, i); g.forEach(x => m.set(x, g.length)); } }); m.forEach((v, i) => { if (v < 3) m.delete(i); }); return m; }
const strGrupDeger = m => m.size * 10;
function strKaskadBul(T) { const o = new Set(); T.h.forEach((k, i) => { if (k && !o.has(i)) { const g = strGrup(T, i); if (g.length >= STR_KASKAD) g.forEach(x => o.add(x)); } }); return [...o]; }
// bütün patlamayı hesaplar (animasyon için adımlarıyla): [{ hucreler, puan, zincir }]
/* özel karolar (Bölüm Yolu): ⇆ yatay (satır) · ⇅ dikey (sütun) · 💣 paket (3×3) · 🌈 gökkuşağı (renksiz; yanındaki karo patlayınca o rengin hepsi).
   Çizgili ve paket renklidir, aynı renk grubuyla patlar. İki özel karo aynı patlamaya girerse SÜPER KOMBO: çizgili artı olur, paket 5×5,
   gökkuşağı iki rengi patlatır. Tetiklenen özel karonun patlattıkları da tetikleyebilir (zincir). */
const OZEL_I = { yatay: '⇆', dikey: '⇅', paket: '💣', gokkusagi: '🌈' };
function strOzelEtki(t, i, o, kombo) {
  const cols = t.cols, rows = Math.ceil(t.h.length / cols), r = Math.floor(i / cols), c = i % cols, out = [];
  const satir = y => { for (let x = 0; x < cols; x++) out.push(y * cols + x); }, sutun = x => { for (let y = 0; y < rows; y++) out.push(y * cols + x); };
  if (o.tur === 'yatay') { satir(r); if (kombo) sutun(c); }
  else if (o.tur === 'dikey') { sutun(c); if (kombo) satir(r); }
  else if (o.tur === 'paket') { const d = kombo ? 2 : 1; for (let y = r - d; y <= r + d; y++) for (let x = c - d; x <= c + d; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) out.push(y * cols + x); }
  else if (o.tur === 'gokkusagi') {
    const renkler = [o.renk];
    if (kombo) { const say = [0, 0, 0, 0]; t.h.forEach(k => { if (k && k.ci >= 0 && k.ci !== o.renk) say[k.ci]++; }); renkler.push(say.indexOf(Math.max(...say))); }
    t.h.forEach((k, j) => { if (k && renkler.indexOf(k.ci) >= 0) out.push(j); });
  }
  return out.filter(j => j >= 0 && j < t.h.length);
}
function strOzelGenislet(t, hs) {
  if (!t.h.some(k => k && k.ozel)) return { hs, tetik: [], kombo: false };
  const kos = kombo => {
    const set = new Set(hs), tetik = new Map(); let yeni = true;
    while (yeni) {
      yeni = false;
      t.h.forEach((k, i) => {   // gökkuşağı: yanındaki karo patlıyorsa
        if (!k || k.ozel !== 'gokkusagi' || set.has(i)) return;
        const n = strKomsu(t, i).find(j => set.has(j) && t.h[j] && t.h[j].ci >= 0);
        if (n !== undefined) { set.add(i); tetik.set(i, { tur: 'gokkusagi', renk: t.h[n].ci }); yeni = true; }
      });
      for (const i of [...set]) { const k = t.h[i]; if (k && k.ozel && !tetik.has(i)) { tetik.set(i, { tur: k.ozel }); yeni = true; } }
      for (const [i, o] of tetik) { if (o.uyg) continue; o.uyg = true; strOzelEtki(t, i, o, kombo).forEach(j => { if (t.h[j] && !set.has(j)) { set.add(j); yeni = true; } }); }
    }
    return { hs: [...set], tetik: [...tetik].map(([i, o]) => ({ i, tur: o.tur })), kombo };
  };
  const r = kos(false);
  return r.tetik.length >= 2 ? kos(true) : r;
}
function strPatlamaPlani(T, idler) {
  const t = { cols: T.cols, rows: T.rows, h: T.h.slice() }, adimlar = [];
  let hs = strBombaHucreleri(t, idler), z = 0;
  const kirik = new Set();   // kırılan buzlar (patlayan karonun kendisi ya da yanındaki)
  while (hs.length) {
    const oz = strOzelGenislet(t, hs); hs = oz.hs;
    const buz = []; hs.forEach(i => [i].concat(strKomsu(t, i)).forEach(j => { const k = t.h[j]; if (k && k.buz && !kirik.has(k.id)) { kirik.add(k.id); buz.push(k.id); } }));
    adimlar.push({ hucreler: hs.slice(), puan: Math.round(hs.length * 10 * (1 + z * 0.5)), zincir: z, idler: hs.map(i => t.h[i].id), karolar: hs.map(i => t.h[i]), buz, ozel: oz.tetik, kombo: oz.kombo });
    hs.forEach(i => { t.h[i] = null; }); strDus(t); z++;
    adimlar[adimlar.length - 1].sonra = t.h.slice();
    hs = strKaskadBul(t);
  }
  const kalan = t.h.filter(Boolean).length;
  return { son: t.h, adimlar, puan: adimlar.reduce((a, x) => a + x.puan, 0) + (kalan === 0 ? 300 : 0), temiz: kalan === 0, kalan };
}
function strDogruMu(T, secim) { return secim.length === T.hedef.length && secim.every((k, i) => k && strKucuk(k.txt) === strKucuk(T.hedef[i])); }

/* ---------------- bilgisayar rakip ---------------- */
// Bilgisi seviyeye göre (çoğunlukla doğru seçer), stratejisi açgözlü: her hamlede bombanın en çok büyüdüğü taşımayı yapar.
function strBotOyna(T0, lvl, r) {
  const T = { cols: T0.cols, rows: T0.rows, n: T0.n, hedef: T0.hedef, h: T0.h.slice() };
  const secim = T0.hedef.map((t, k) => T.h.find(x => x && x.k === k));
  let dogru = r() < (STR_BOT_DOGRU[lvl] || 0.8);
  if (!dogru) {
    const tz = T.h.filter(x => x && x.cel);
    if (tz.length) { const z = tz[Math.floor(r() * tz.length)]; secim[z.of >= 0 ? z.of : 0] = z; }
    else if (secim.length > 1) [secim[0], secim[1]] = [secim[1], secim[0]];
    dogru = strDogruMu(T, secim);
  }
  const idler = secim.map(k => k.id), deger = t => strBombaHucreleri(t, idler).length;
  let hak = Math.round((T0.n + 6) * (0.4 + r() * 0.3));   // hamle hakkının bir kısmını kullanır: güçlü ama yenilebilir
  for (; hak > 0; hak--) {
    const once = deger(T), adaylar = [];
    for (let a = 0; a < T.h.length; a++) {
      if (!T.h[a]) continue;
      for (let b = 0; b < T.h.length; b++) {
        if (a === b) continue;
        const t = { cols: T.cols, rows: T.rows, h: T.h.slice() }; strTasi(t, a, b);
        const v = deger(t); if (v > once) adaylar.push({ a, b, v });
      }
    }
    if (!adaylar.length) break;
    adaylar.sort((x, y) => y.v - x.v);
    const sec = adaylar[Math.min(adaylar.length - 1, Math.floor(r() * r() * 5))];
    strTasi(T, sec.a, sec.b);
  }
  return { dogru, puan: dogru ? strPatlamaPlani(T, idler).puan : 0 };
}

/* ---------------- maç ---------------- */
// o: { mac, lvl, tohum, cum: [[kaynak, i]×3], rakip: { ad, bot }, online }
function strMacBaslat(o) {
  const liste = (o.cum || []).filter(a => Array.isArray(a) && sAl(a));
  if (!liste.length) { not(tt('Maç başlatılamadı.')); return; }
  strKapat();
  if (G.state !== 'menu') demo();
  D = null; Konus.sus(); Ses.muzik('strateji'); Ses.gerilim(0);
  STR = { mac: o.mac, lvl: o.lvl, tohum: o.tohum, cum: liste, tur: -1, ben: [], rakipS: [], rakip: o.rakip, online: !!o.online, karar: null, xp0: kayit.xp, R: null, zaman: null };
  ekranlariKapat(); strEkranKur();
  if (!kayit.strRehber) strRehberKur(() => { STR.R = null; strTahtaEl().innerHTML = ''; $('#st-kutular').innerHTML = ''; strKuralGoster(); });   // ilk strateji maçı: önce rehberli alıştırma
  else strKuralGoster();
}
function strAktif() { return !!STR; }
function strTurBaslat() {
  const M = STR; if (!M) return;
  M.tur++;
  const s = sAl(M.cum[M.tur]), T = strTahta(s, M.lvl, M.tohum + ':' + M.tur);
  M.R = { s, T, hamle: T.n + 6, secim: Array(T.n).fill(null), secili: -1, sure: STR_SURE, t0: Date.now(), bitti: false, sonuc: null };
  if (M.rakip.bot) {   // bilgisayar turu kendi tohumuyla oynar, 40–150 sn sonra bitirir
    const r = tohumluRastgele(M.tohum + ':bot:' + M.tur), sn = strBotOyna(T, M.lvl, r), tur = M.tur;
    M.botSonuc = () => { clearTimeout(M.botT); strRakipSonuc({ tur, dogru: sn.dogru, puan: sn.puan }); };
    M.botT = setTimeout(M.botSonuc, (35 + r() * 90) * 1000);
  }
  strCiz(true);
  clearInterval(M.zaman); M.zaman = setInterval(strSaat, 250);
  Ses.cal('dus', { ses: 0.6 });
  setTimeout(() => { if (STR === M && M.R && !M.R.bitti) Konus.tr(M.R.s.tr.replace(/;/g, ',')); }, 500);   // Türkçe cümle okunur
}
function strSaat() {
  const M = STR, R = M && M.R; if (!R || R.bitti) return;
  if (document.hidden && M.rakip.bot) { R.t0 += 250; return; }   // bilgisayara karşı: telefon kilitliyken / uygulama alttayken süre durur
  const kalan = Math.max(0, R.sure - (Date.now() - R.t0) / 1000);
  Ses.gerilim(kalan <= 10 ? 2 : kalan <= 30 ? 1 : 0);   // son saniyelerde müzik gerilir
  const el = $('#st-sure'); if (el) { el.textContent = '⏱ ' + Math.floor(kalan / 60) + ':' + String(Math.floor(kalan % 60)).padStart(2, '0'); el.classList.toggle('az', kalan <= 20); }
  if (kalan <= 10 && Math.ceil(kalan) !== R.sonTik) { R.sonTik = Math.ceil(kalan); if (kalan > 0) Ses.cal('saat', { ses: 0.4 }); }
  if (kalan <= 0) { if (R.secim.every(Boolean)) strBomba(); else strTurBitir(false, 0, tt('Süre doldu, kutular dolmadı.')); }
}
function strKutuDolu() { return STR && STR.R && STR.R.secim.every(Boolean); }

/* ---------------- oyuncu eylemleri ---------------- */
function strTasiOyuncu(a, b) {
  const R = STR && STR.R; if (!R || R.bitti || a === b || !R.T.h[a]) return false;
  if (R.rehber && !rehberIzin('tasi', a, b)) return false;
  if (R.hamle <= 0) { not(tt('Hamle hakkın bitti. Kelimeleri kutulara çek ve bombaya bas.')); Ses.cal('geri', { ses: 0.5 }); return false; }
  const once = strGruplar(R.T), idOnce = new Map(); once.forEach((v, i) => idOnce.set(R.T.h[i].id, v));
  if (!strTasi(R.T, a, b)) { not(tt('Buzlu ve kilitli karolar yerinden oynamaz.')); Ses.cal('geri', { ses: 0.5 }); R.secili = -1; strCiz(); return false; }
  R.hamle--; R.secili = -1;
  Ses.cal('kay', { ses: 0.6 }); Yerel.titret('hafif');
  strCiz();
  strAnlikOdul(R, once, idOnce, b);
  if (R.rehber) rehberIlerle();
  if (STR.yol && R.hamle === 0) yolHamleBitti();
  return true;
}
/* HAMLE ANINDA ÖDÜL: taşıma bir grubu büyüttüyse (3+ aynı renk) grup parlar, "+puan" karodan uçar, grup büyüdükçe yükselen notalar.
   Değer bombanın bu karolar için vereceği taban puandır (karo başı 10); doğru kelimeyi bilmeden hesaplanır. */
function strAnlikOdul(R, once, idOnce, b) {
  const sonra = strGruplar(R.T), fark = strGrupDeger(sonra) - strGrupDeger(once);
  window.__anlik = { fark, enBuyuk: 0 };
  if (fark <= 0) return;
  let enBuyuk = 0; const buyuyen = [];
  sonra.forEach((v, i) => { const id = R.T.h[i].id; if (v > (idOnce.get(id) || 0)) { buyuyen.push(id); if (v > enBuyuk) enBuyuk = v; } });
  window.__anlik.enBuyuk = enBuyuk;
  buyuyen.forEach((id, n) => { const el = strKaroEl(id); if (!el) return; el.classList.remove('buyu'); void el.offsetWidth; el.style.setProperty('--bg', (n * 35) + 'ms'); el.classList.add('buyu'); setTimeout(() => el.classList.remove('buyu'), 900); });
  const tah = strTahtaEl(), c = strOlcu(), k = R.T.h[b], kaynak = k && sonra.has(b) ? b : [...sonra.keys()].find(i => buyuyen.indexOf(R.T.h[i].id) >= 0);
  if (tah && kaynak != null) {
    const u = document.createElement('div'); u.className = 'st-anlik' + (enBuyuk >= 5 ? ' iri' : '');
    u.innerHTML = `+${fark}${enBuyuk >= 7 ? `<small>${tt('Muhteşem!')}</small>` : enBuyuk >= 5 ? `<small>${tt('Harika!')}</small>` : ''}`;
    u.style.left = ((kaynak % R.T.cols) + 0.5) * c + 'px'; u.style.top = (Math.floor(kaynak / R.T.cols) + 0.5) * c + "px";
    tah.appendChild(u); setTimeout(() => u.remove(), 1100);
  }
  const ust = Math.min(6, enBuyuk - 2);   // 3'lü: 1 nota … 8+: 6 nota
  for (let n = 0; n < ust; n++) Ses.nota(2 + n, 0.32, n * 0.06);
  if (enBuyuk >= 5) Yerel.titret('orta');
}
function strSec(i, kutu) {   // hücre i'deki karonun gölgesi kutuya
  const R = STR && STR.R; if (!R || R.bitti || !R.T.h[i]) return;
  const k = R.T.h[i];
  if (k.ozel) { not(tt('Özel karo bir kelime değil; onu patlamanın içine sok.')); Ses.cal('geri', { ses: 0.4 }); return; }
  if (R.rehber) { if (!rehberIzin('sec', k.txt)) return; kutu = rehberAdim().kutu; }
  if (kutu == null || kutu < 0) kutu = R.secim.findIndex(x => !x);
  if (kutu < 0) { not(tt('Kutular dolu. Değiştirmek için bir kutuya dokun.')); return; }
  const eski = R.secim.findIndex(x => x && x.id === k.id); if (eski >= 0) R.secim[eski] = null;
  R.secim[kutu] = k; R.secili = -1;
  Ses.cal('al', { ses: 0.5 }); Yerel.titret('hafif');
  strCiz();
  if (R.rehber) rehberIlerle();
}
function strKutuBosalt(kutu) { const R = STR && STR.R; if (!R || R.bitti || !R.secim[kutu] || R.rehber) return; R.secim[kutu] = null; Ses.cal('geri', { ses: 0.35 }); strCiz(); }
function strBomba() {
  const M = STR, R = M && M.R; if (!R || R.bitti || !R.secim.every(Boolean)) return;
  if (R.rehber && rehberAdim().t !== 'bomba') return;
  R.bitti = true; R.secili = -1;
  const dogru = strDogruMu(R.T, R.secim);
  if (!dogru) {
    Ses.cal('yanlis', { ses: 0.8 }); Yerel.titret('hata');
    strTahtaEl().classList.add('sars'); setTimeout(() => { const t = strTahtaEl(); if (t) t.classList.remove('sars'); }, 500);
    strCiz();
    setTimeout(() => strTurBitir(false, 0, tt('Cümle yanlış: bomba patlamadı.')), 900);
    return;
  }
  const plan = strPatlamaPlani(R.T, R.secim.map(k => k.id)); R.plan = plan;
  Ses.cal('emme', { ses: 0.9 }); Ses.kis(true); Yerel.titret('orta');   // önce içine çekme, müzik kısılır
  strTahtaEl().classList.add('topla');
  let toplam = 0;
  plan.adimlar.forEach((a, n) => setTimeout(() => {
    if (STR !== M) return;
    if (n === 0) { strTahtaEl().classList.remove('topla'); strFlas(); Yerel.titret('basari'); }
    a.hucreler.forEach(i => { const el = strKaroEl(R.T.h[i] && R.T.h[i].id); if (el) { el.classList.add('pat'); strKivilcim(el, R.T.h[i].ci); } });
    if (a.ozel && a.ozel.length) strOzelEfekt(R.T, a);
    if (a.buz.length) { R.T.h.forEach(k => { if (k && a.buz.indexOf(k.id) >= 0) { k.buz = false; const el = strKaroEl(k.id); if (el) el.classList.add('buz-kir'); } }); Ses.cal('kes', { ses: 0.6 }); }
    toplam += a.puan; strPuanUc('+' + a.puan, a.zincir);
    // büyük patlama: patlayan karo arttıkça daha güçlü; zincirlerde yükselen ikinci patlamalar
    if (a.zincir) { Ses.cal('zincirBum', { ses: 0.85, hiz: 1 + a.zincir * 0.15 }); Ses.cal('zincir', { ses: 0.8, hiz: 1 + a.zincir * 0.12 }); }
    else Ses.cal('megaBomba', { ses: Math.min(1.4, 0.7 + a.hucreler.length / 18) });
    if (a.zincir) Yerel.titret('orta');
    setTimeout(() => { if (STR !== M) return; R.T.h = a.sonra; strCiz(); Ses.cal('dus', { ses: 0.4 }); }, 520);
  }, 600 + n * 1100));
  const son = 600 + plan.adimlar.length * 1100;
  setTimeout(() => { if (STR !== M) return; Ses.kis(false); if (plan.temiz) Ses.cal('zafer', { ses: 1 }); }, son);
  setTimeout(() => strTurBitir(true, plan.puan, plan.temiz ? tt('TAHTA TEMİZLENDİ! +300') : ''), son + 500);
}
function strTurBitir(dogru, puan, not_) {
  const M = STR, R = M && M.R; if (!R || R.sonuc) return;
  R.bitti = true; R.sonuc = { dogru, puan, not: not_ || '' };
  if (M.yol) { yolBitti(dogru); return; }   // Bölüm Yolu (yol.js)
  if (R.rehber) { R.rehber.adim = REHBER.findIndex(x => x.t === 'son'); rehberAdimGoster(); return; }
  const tur = M.tur;
  M.ben[tur] = { dogru, puan, secim: R.secim.map(k => k ? k.txt : '…').join(' ') };
  if (M.online) [0, 900, 2200].forEach(ms => setTimeout(() => { if (OD.kod && STR === M) Ag.gonder({ t: 'stur', mac: M.mac, tur, dogru, puan }); }, ms));
  if (M.rakip.bot && !M.rakipS[tur]) { clearTimeout(M.botT); M.botT = setTimeout(M.botSonuc, (3 + Math.random() * 7) * 1000); }   // oyuncu bitirdi: bilgisayar az sonra bitirir
  strTurPaneli();
}
// rakibin tur sonucu (ağdan ya da bilgisayardan)
function strRakipSonuc(o) {
  const M = STR; if (!M || !(o.tur >= 0 && o.tur < STR_TUR) || M.rakipS[o.tur]) return;
  M.rakipS[o.tur] = { dogru: !!o.dogru, puan: Math.max(0, Math.round(+o.puan || 0)) };
  strCiz();
  if (M.R && M.R.sonuc) strTurPaneli();
}
function strTurKazanan(b, r) {   // 1: ben, -1: rakip, 0: berabere
  if (b.dogru && r.dogru) return Math.sign(b.puan - r.puan);
  return b.dogru ? 1 : r.dogru ? -1 : 0;
}
function strSkor() {
  const M = STR; let b = 0, r = 0, pb = 0, pr = 0;
  for (let i = 0; i < STR_TUR; i++) { const x = M.ben[i], y = M.rakipS[i]; if (!x || !y) continue; const k = strTurKazanan(x, y); if (k > 0) b++; else if (k < 0) r++; pb += x.puan; pr += y.puan; }
  return { b, r, pb, pr };
}
function strRakipGitti(neden) {
  const M = STR; if (!M || M.karar) return;
  strKararVer('kazandin', tt(neden === 'ayrildi' ? '{ad} maçtan ayrıldı.' : '{ad} ile bağlantı koptu.', { ad: esc(M.rakip.ad) }));
}
function strMacSonu() {
  const M = STR; if (!M || M.karar) return;
  const s = strSkor();
  if (s.b !== s.r) return strKararVer(s.b > s.r ? 'kazandin' : 'kaybettin', tt('Turlar: {a} – {b}', { a: s.b, b: s.r }));
  if (s.pb !== s.pr) return strKararVer(s.pb > s.pr ? 'kazandin' : 'kaybettin', tt('Turlar berabere; toplam puan: {a} – {b}', { a: s.pb, b: s.pr }));
  strKararVer('berabere', tt('Turlar ve puanlar eşit.'));
}
function strKararVer(k, neden) {
  const M = STR; if (!M || M.karar) return;
  M.karar = { k, neden };
  clearInterval(M.zaman); clearTimeout(M.botT);
  if (M.online) { kayit.istat.online = (kayit.istat.online || 0) + 1; if (k === 'kazandin') kayit.istat.onlineGalibiyet = (kayit.istat.onlineGalibiyet || 0) + 1; }
  Olay.yay('onlineBitti', { kazandi: k === 'kazandin', neden, mod: 'strateji', bot: !!M.rakip.bot });
  kaydet(); Ses.kasetDur(0.8);
  Ses.cal(k === 'kazandin' ? 'zafer' : k === 'berabere' ? 'yukselis' : 'yenilgi', { ses: 0.9 });
  setTimeout(strSonucGoster, 700);
}

/* ---------------- ekran ---------------- */
let strEl = null, strDok = null;
const strTahtaEl = () => strEl && strEl.querySelector('.st-tahta');
const strKaroEl = id => strEl && strEl.querySelector(`.st-k[data-id="${id}"]`);
function strEkranKur() {
  if (!strEl) { strEl = document.createElement('div'); strEl.id = 'str'; document.body.appendChild(strEl); }
  document.body.classList.add('strde');
  strEl.innerHTML = `<div class="st-ust"><button class="st-x" id="st-x" aria-label="${tt('Maçtan çık')}">✕</button>
      <span class="st-tur" id="st-tur"></span><span class="st-sure" id="st-sure">⏱ 3:00</span><span class="st-hak" id="st-hak"></span>
      <span class="st-skor" id="st-skor"></span></div>
    <div class="st-tr" id="st-tr" role="button"></div>
    <div class="st-rakip" id="st-rakip"></div>
    <div class="st-tahta" id="st-tahta"></div>
    <div class="st-kutular" id="st-kutular"></div>
    <div class="st-araclar" id="st-araclar"></div>
    <div class="st-alt"><button class="st-bomba" id="st-bomba" disabled>💣 ${tt('BOMBA')}</button></div>
    <div class="st-ipucu" id="st-ipucu"></div>
    <div class="st-panel" id="st-panel"></div>`;
  $('#st-x').onclick = strCikSor;
  $('#st-bomba').onclick = () => { sesAc(); strBomba(); };
  $('#st-araclar').addEventListener('click', e => { const b = e.target.closest('.arac'); if (b) { sesAc(); aracSec(b.dataset.t); } });   // güçler (odul.js)
  $('#st-tr').onclick = () => { const R = STR && STR.R; if (R) { sesAc(); Konus.tr(R.s.tr, { zorla: true }); } };
  const tah = $('#st-tahta');
  tah.addEventListener('pointerdown', strBas);
  tah.addEventListener('pointermove', strSurukle);
  tah.addEventListener('pointerup', strBirak);
  tah.addEventListener('pointercancel', () => strBirakIptal());
  $('#st-kutular').addEventListener('click', e => {
    const b = e.target.closest('.st-kutu'); if (!b) return; const i = +b.dataset.i, R = STR && STR.R; if (!R) return;
    if (R.secili >= 0) strSec(R.secili, i); else strKutuBosalt(i);
  });
}
function strKapat() {
  if (STR) { clearInterval(STR.zaman); clearTimeout(STR.botT); }
  STR = null; strDok = null;
  if (strEl) { strEl.remove(); strEl = null; }
  document.body.classList.remove('strde');
}
function strOlcu() {
  const R = STR.R, T = R.T, yatay = innerWidth > innerHeight * 1.1;
  strEl.classList.toggle('yatay', yatay);
  if (yatay) return Math.max(28, Math.floor(Math.min((innerWidth * 0.56 - 24) / T.cols, (innerHeight - 24) / T.rows)));   // tahta solda, kontroller sağda
  const w = Math.min(innerWidth - 24, 540), kutuSat = Math.ceil(T.n / 5);
  const hBos = innerHeight - (60 + 72 + 24 + kutuSat * 50 + 76 + 26) - 20;
  return Math.max(30, Math.floor(Math.min(w / T.cols, hBos / T.rows)));
}
// karo yazısı tek satıra sığacak en büyük boy (yazı tipiyle ölçülür); çok uzunsa küçük boyda iki satıra iner
const strOlcCtx = document.createElement('canvas').getContext('2d');
function strYaziBoy(t, c) {
  strOlcCtx.font = `700 100px ${FONT}`;
  const w100 = Math.max(1, strOlcCtx.measureText(t).width) / 100, sig = (c - 12) / w100;
  return Math.round(Math.max(Math.min(c * 0.34, sig), Math.min(13, c * 0.24)));   // daha küçülmez: sığmayan kelime heceden ikiye bölünür
}
function strCiz(yeni) {
  const M = STR, R = M && M.R; if (!R || !strEl) return;
  const T = R.T, c = strOlcu(), tah = strTahtaEl();
  tah.style.width = c * T.cols + 'px'; tah.style.height = c * T.rows + 'px'; tah.style.setProperty('--c', c + 'px');
  $('#st-tur').textContent = R.rehber ? tt('ALIŞTIRMA') : tt('TUR {a}/{b}', { a: M.tur + 1, b: STR_TUR });
  if (R.rehber) $('#st-sure').textContent = '⏱ –';
  $('#st-hak').textContent = '✋ ' + R.hamle; $('#st-hak').classList.toggle('az', R.hamle <= 2);
  const s = strSkor(); $('#st-skor').innerHTML = `<span class="vs-av mini" style="--a:#ffc83d">${harfi(benimAd())}</span><b>${s.b}</b>–<b>${s.r}</b><span class="vs-av mini" style="--a:#ff7a96">${M.rakip.bot ? '🤖' : harfi(M.rakip.ad)}</span>`;
  $('#st-tr').innerHTML = `<small>${tt('Bu cümleyi kur')} 🔊</small>“${esc(R.s.tr)}”`;
  const rs = M.rakipS[M.tur];
  $('#st-rakip').innerHTML = R.rehber ? '' : `${M.rakip.bot ? '🤖' : '👤'} ${esc(M.rakip.ad)}: ${rs ? tt('💣 bombasını attı') : tt('düşünüyor…')}`;
  // karolar: kimlikle eşlenir, yeri değişince CSS geçişiyle kayar
  const var_ = new Map(); tah.querySelectorAll('.st-k').forEach(e => var_.set(+e.dataset.id, e));
  const secimSira = new Map(); R.secim.forEach((k, i) => { if (k) secimSira.set(k.id, i + 1); });
  const durdu = new Set(), gruplar = R.bitti ? new Map() : strGruplar(T);
  T.h.forEach((k, i) => {
    if (!k) return;
    let el = var_.get(k.id);
    if (!el) { el = document.createElement('div'); el.className = 'st-k'; el.dataset.id = k.id; el.innerHTML = '<span lang="en"></span><em></em>'; el.style.cssText = strRenkStil(k.ci); tah.appendChild(el); if (yeni) el.style.animationDelay = (i * 18) + 'ms'; if (yeni) el.classList.add('gel'); }
    durdu.add(k.id);
    el.style.left = (i % T.cols) * c + 'px'; el.style.top = Math.floor(i / T.cols) * c + 'px';
    el.style.width = el.style.height = c + 'px';
    const yazi = k.ozel ? OZEL_I[k.ozel] : k.txt, sp = el.firstChild; if (sp.textContent !== yazi) sp.textContent = yazi; sp.style.fontSize = (k.ozel ? Math.round(c * 0.46) : strYaziBoy(k.txt, c)) + 'px';
    el.classList.toggle('ozel', !!k.ozel); if (k.ozel) el.dataset.ozel = k.ozel;
    const sn = secimSira.get(k.id); el.classList.toggle('secildi', !!sn); el.lastChild.textContent = sn || '';
    el.classList.toggle('secili', R.secili === i);
    el.classList.toggle('buz', !!k.buz); el.classList.toggle('kilit', !!k.kilit);
    const g = gruplar.get(i) || 0; el.classList.toggle('grup', g >= 3); if (g >= 3) el.style.setProperty('--gg', Math.min(g, 8));
    el.dataset.i = i;
  });
  var_.forEach((e, id) => { if (!durdu.has(id) && !e.classList.contains('pat')) e.remove(); else if (!durdu.has(id)) setTimeout(() => e.remove(), 600); });
  // boş hücreler
  tah.querySelectorAll('.st-bos').forEach(e => e.remove());
  T.h.forEach((k, i) => { if (k) return; const e = document.createElement('div'); e.className = 'st-bos'; e.dataset.i = i; Object.assign(e.style, { left: (i % T.cols) * c + 'px', top: Math.floor(i / T.cols) * c + 'px', width: c + 'px', height: c + 'px' }); tah.prepend(e); });
  // kutular: seçilen karonun gölgesi
  $('#st-kutular').innerHTML = R.secim.map((k, i) => `<button class="st-kutu ${k ? 'dolu' : ''}" data-i="${i}" style="${k ? strRenkStil(k.ci) : ''}"><i>${i + 1}</i>${k ? `<span>${esc(k.txt)}</span>` : ''}</button>`).join('');
  const bom = $('#st-bomba'); bom.disabled = R.bitti || !R.secim.every(Boolean); bom.classList.toggle('hazir', !bom.disabled);
  $('#st-ipucu').textContent = R.bitti || R.rehber ? '' : R.secili >= 0 ? tt('Bir hücreye dokun: taşı (1 hamle) · bir kutuya dokun: kelimeyi seç')
    : R.secim.every(Boolean) ? tt('Hazırsan 💣 BOMBA! Hâlâ taşıyabilir ya da kutudaki kelimeyi değiştirebilirsin.')
      : tt('Aynı renkleri kelimelerin yanına topla, sonra kelimeleri sırayla kutulara çek.');
  if (R.rehber) rehberCiz();
  if (M.yol) yolCiz();
}
const STR_RENKLER = ['#f2453d', '#ffbc1f', '#3cbb4a', '#2b91ea'];
// renk tonları (CSS color-mix eski iOS'ta yok): açık, koyu, yarı saydam
function strTon(hex, k) { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
const strRenkStil = ci => { const h = STR_RENKLER[ci] || '#888888'; return `--r:${h};--ra:${strTon(h, 0.3)};--rd:${strTon(h, -0.4)};--rs:${h}73`; };
// sürükle-bırak ve dokun-dokun
function strHucreNokta(x, y) {
  const R = STR && STR.R, tah = strTahtaEl(); if (!R || !tah) return -1;
  const b = tah.getBoundingClientRect(), c = b.width / R.T.cols, col = Math.floor((x - b.left) / c), row = Math.floor((y - b.top) / c);
  return col < 0 || row < 0 || col >= R.T.cols || row >= R.T.rows ? -1 : row * R.T.cols + col;
}
function strKutuNokta(x, y) {
  const els = [...document.querySelectorAll('#st-kutular .st-kutu')];
  const e = els.find(k => { const b = k.getBoundingClientRect(); return x >= b.left - 4 && x <= b.right + 4 && y >= b.top - 6 && y <= b.bottom + 6; });
  if (e) return +e.dataset.i;
  const kb = $('#st-kutular').getBoundingClientRect();   // kutu bölgesine bırakıldıysa ilk boş kutu
  return y >= kb.top - 10 && y <= kb.bottom + 30 ? -2 : -1;
}
function strBas(e) {
  const R = STR && STR.R; if (!R || R.bitti) return;
  sesAc();
  const i = strHucreNokta(e.clientX, e.clientY); if (i < 0) return;
  strDok = { id: e.pointerId, i, x0: e.clientX, y0: e.clientY, surukle: false, el: null };
  try { strTahtaEl().setPointerCapture(e.pointerId); } catch (x) { }
}
function strSurukle(e) {
  const d = strDok, R = STR && STR.R; if (!d || d.id !== e.pointerId || !R || !R.T.h[d.i] || R.arac) return;
  if (!d.surukle && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 9) {
    d.surukle = true; Ses.cal('al', { ses: 0.4 });
    const kaynak = strKaroEl(R.T.h[d.i].id), c = kaynak.offsetWidth;
    d.el = kaynak.cloneNode(true); d.el.classList.add('st-tut'); d.el.style.width = d.el.style.height = c + 'px'; document.body.appendChild(d.el);
    kaynak.classList.add('kalkti');
  }
  if (d.surukle) {
    const c = d.el.offsetWidth; d.el.style.left = (e.clientX - c / 2) + 'px'; d.el.style.top = (e.clientY - c * 0.9) + 'px';
    const h = strHucreNokta(e.clientX, e.clientY);
    strTahtaEl().querySelectorAll('.hedef').forEach(x => x.classList.remove('hedef'));
    if (h >= 0 && h !== d.i) { const t = R.T.h[h] ? strKaroEl(R.T.h[h].id) : strTahtaEl().querySelector(`.st-bos[data-i="${h}"]`); if (t) t.classList.add('hedef'); }
    const kb = strKutuNokta(e.clientX, e.clientY); document.querySelectorAll('.st-kutu').forEach(x => x.classList.toggle('hedef', kb >= 0 ? +x.dataset.i === kb : kb === -2 && !x.classList.contains('dolu') && x === document.querySelector('.st-kutu:not(.dolu)')));
  }
}
function strBirakIptal() {
  const d = strDok; strDok = null; if (!d) return;
  if (d.el) d.el.remove();
  document.querySelectorAll('.kalkti,.hedef').forEach(x => x.classList.remove('kalkti', 'hedef'));
}
function strBirak(e) {
  const d = strDok, R = STR && STR.R; if (!d || d.id !== e.pointerId) return;
  strBirakIptal(); if (!R || R.bitti) return;
  if (R.arac) { aracDokun(d.i); return; }   // güç seçili: çekiç / mıknatıs (odul.js)
  if (d.surukle) {
    const kb = strKutuNokta(e.clientX, e.clientY);
    if (kb !== -1) { strSec(d.i, kb >= 0 ? kb : null); return; }
    const h = strHucreNokta(e.clientX, e.clientY); if (h >= 0 && h !== d.i) strTasiOyuncu(d.i, h); else strCiz();
    return;
  }
  // dokunma: önce karo seç, sonra hücreye (taşı) ya da kutuya (seç) dokun
  if (R.secili < 0) { if (R.T.h[d.i]) { R.secili = d.i; Ses.cal('tik', { ses: 0.35 }); strCiz(); } return; }
  if (R.secili === d.i) { R.secili = -1; strCiz(); return; }
  strTasiOyuncu(R.secili, d.i);
}
function strFlas() {
  const f = document.createElement('div'); f.className = 'st-flas'; strEl.appendChild(f); setTimeout(() => f.remove(), 700);
  const t = strTahtaEl(); t.classList.add('bum'); setTimeout(() => t.classList.remove('bum'), 600);
}
function strKivilcim(el, ci) {
  const tah = strTahtaEl(); if (!tah) return;
  const x = el.offsetLeft + el.offsetWidth / 2, y = el.offsetTop + el.offsetHeight / 2;
  for (let n = 0; n < 7; n++) {
    const p = document.createElement('i'); p.className = 'st-kv'; const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 70;
    p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v}px;background:${STR_RENKLER[ci] || '#fff'}`;
    tah.appendChild(p); setTimeout(() => p.remove(), 700);
  }
}
function strPuanUc(t, z) {
  const p = document.createElement('div'); p.className = 'st-puan'; p.textContent = t + (z ? '  ' + tt('ZİNCİR x{n}', { n: z + 1 }) : '');
  strEl.appendChild(p); setTimeout(() => p.remove(), 1300);
}
function strKuralGoster() {
  const M = STR, p = $('#st-panel');
  p.innerHTML = `<div class="st-kart"><h3>🧠 ${tt('STRATEJİ')} · ${M.lvl}</h3>${vsHtml(oyuncuHtml(benimAd(), { renk: '#ffc83d', alt: tt('Sen') }), oyuncuHtml(M.rakip.ad, { renk: '#ff7a96', bot: M.rakip.bot, alt: M.rakip.bot ? tt('Bilgisayar') : tt('Rakip') }))}
    <ol class="st-kural">
      <li>${tt('<b>Düzenle:</b> karoyu başka karonun üstüne bırak; oradakiler sağa kayar. Her taşıma 1 hamle.')}</li>
      <li>${tt('<b>Topla:</b> aynı renkleri cümlenin kelimelerinin yanına, alt alta ya da yan yana getir.')}</li>
      <li>${tt('<b>Seç:</b> doğru kelimeleri sırayla alttaki kutulara çek. Tuzak kelimeler aynı renkte, dikkat!')}</li>
      <li>${tt('<b>💣 BOMBA:</b> cümle doğruysa kelimeler ve onlara değen aynı renkler birlikte patlar.')}</li>
    </ol>
    <p>${tt('Doğru cümle her zaman yanlış cümleyi yener. İkiniz de doğruysa çok patlatan kazanır. {n} tur.', { n: STR_TUR })}</p>
    <button class="big" id="st-basla">${tt('BAŞLA')}</button></div>`;
  p.classList.add('acik');
  $('#st-basla').onclick = () => { sesAc(); p.classList.remove('acik'); strTurBaslat(); };
}
function strTurPaneli() {
  const M = STR, R = M && M.R; if (!R || !R.sonuc) return;
  Ses.gerilim(0);
  const b = M.ben[M.tur], r = M.rakipS[M.tur], son = M.tur >= STR_TUR - 1, p = $('#st-panel');
  const satir = (ad, x) => x ? `<div class="st-sat ${x.dogru ? 'ok' : 'no'}"><b>${ad}</b><span>${x.dogru ? tt('✓ doğru') : tt('✗ yanlış')}</span><em>${x.puan}</em></div>`
    : `<div class="st-sat bekle"><b>${ad}</b><span>${tt('düşünüyor…')}</span><em>…</em></div>`;
  let bas = tt('Rakibin bekleniyor…'), cls = '';
  if (r) { const k = strTurKazanan(b, r); bas = tt(k > 0 ? 'TURU KAZANDIN!' : k < 0 ? 'TURU KAYBETTİN' : 'BERABERE'); cls = k > 0 ? 'kaz' : k < 0 ? 'kay' : ''; }
  p.innerHTML = `<div class="st-kart"><h3 class="${cls}">${bas}</h3>${R.sonuc.not ? `<div class="st-not">${esc(R.sonuc.not)}</div>` : ''}
    ${satir(esc(OD.ad || tt('Sen')), b)}${satir((M.rakip.bot ? '🤖 ' : '') + esc(M.rakip.ad), r)}
    <div class="st-dogru"><small>${tt('Doğru cümle')}</small>${dinleBtn(R.s.en)} <b>${esc(R.s.en)}</b><small>${esc(R.s.tr)}</small>
      ${b.dogru ? '' : `<small class="st-sen">${tt('Senin seçimin: ')}${esc(b.secim)}</small>`}</div>
    ${r ? `<button class="big" id="st-devam">${tt(son ? 'MAÇ SONUCU' : 'SONRAKİ TUR')}</button>` : ''}</div>`;
  p.querySelectorAll('.dinle').forEach(x => x.onclick = e => { e.stopPropagation(); sesAc(); Konus.soyle(x.dataset.en, { hiz: 0.85 }); });
  p.classList.add('acik');
  if (r && !R.panelSes) { R.panelSes = true; const k = strTurKazanan(b, r); Ses.cal(k > 0 ? 'yukselis' : k < 0 ? 'geri' : 'tik', { ses: 0.6 }); if (M.rakip.bot) emoBotTepki(k > 0 ? [4, 1] : k < 0 ? [3, 2] : [5, 0], 0.8); }
  const d = $('#st-devam'); if (d) d.onclick = () => { p.classList.remove('acik'); if (son) strMacSonu(); else strTurBaslat(); };
}
function strCikSor() {
  const M = STR; if (!M) return;
  if (M.karar || M.mac === 'rehber' || M.yol) { strCik(); return; }
  const p = $('#st-panel');
  p.innerHTML = `<div class="st-kart"><h3>${tt('Maçtan çıkılsın mı?')}</h3><p>${tt(M.rakip.bot ? 'Bu maç kaydedilmez.' : 'Çıkarsan maçı kaybedersin.')}</p>
    <button class="big" id="st-kal">${tt('DEVAM ET')}</button><div class="row"><button class="sec" id="st-cik">${tt('ÇIK')}</button></div></div>`;
  p.classList.add('acik');
  $('#st-kal').onclick = () => { if (M.R && M.R.sonuc) strTurPaneli(); else if (M.tur < 0) strKuralGoster(); else p.classList.remove('acik'); };
  $('#st-cik').onclick = strCik;
}
function strCik() {
  const M = STR; if (!M) return;
  if (M.yol) { strKapat(); yolHaritaAc(); return; }
  const online = M.online, mod = 'strateji';
  if (online && !M.karar) { kayit.istat.online = (kayit.istat.online || 0) + 1; kaydet(); }
  strKapat();
  if (online) { odadanCik(); onlineModAc(mod); } else onlineModAc(mod);
}
function strSonucGoster() {
  const M = STR; if (!M || !M.karar) return;
  const k = M.karar.k, s = strSkor(), xp = kayit.xp - M.xp0, bot = M.rakip.bot, ev = OD.rol === 'ev';
  let turlar = '';
  for (let i = 0; i < STR_TUR; i++) {
    const x = M.ben[i] || { dogru: false, puan: 0 }, y = M.rakipS[i] || { dogru: false, puan: 0 };
    turlar += kiyasSatir(tt('Tur {n}', { n: i + 1 }), x.puan, y.puan, (x.dogru ? '✓ ' : '✗ ') + x.puan, (y.dogru ? '✓ ' : '✗ ') + y.puan);
  }
  strEl.style.display = 'none';
  goster(`<div class="go ${k === 'kazandin' ? 'zafer' : ''}" style="font-size:clamp(34px,10vw,54px)">${tt(k === 'kazandin' ? 'KAZANDIN!' : k === 'berabere' ? 'BERABERE' : 'KAYBETTİN')}</div>
    <div class="sonuc-alt">🧠 ${tt('Strateji')} · ${M.lvl} · ${M.karar.neden}</div>
    ${vsHtml(oyuncuHtml(benimAd(), { renk: '#ffc83d', kaz: k === 'kazandin', alt: tt('{n} tur', { n: s.b }) }), oyuncuHtml(M.rakip.ad, { renk: '#ff7a96', bot, kaz: k === 'kaybettin', alt: tt('{n} tur', { n: s.r }) }))}
    <div class="kiyas-kutu">${turlar}${kiyasSatir(tt('Toplam'), s.pb, s.pr, s.pb, s.pr)}</div>
    ${xp > 0 ? `<div class="sonuc-alt">+${xp} XP</div>` : ''}
    ${bot ? `<button class="big" id="ss-tekrar">${tt('TEKRAR OYNA')}</button>` : ev && OD.rakip ? `<button class="big" id="ss-tekrar">${tt('TEKRAR KAPIŞ')}</button>` : OD.rakip ? `<p class="aciklama" style="text-align:center">${tt('{ad} yeni maç başlatırsa oyun kendiliğinden açılır.', { ad: esc(OD.rakip.ad) })}</p>` : ''}
    ${k === 'kazandin' ? paylasDugme('ss-paylas') : ''}
    <div class="row"><button class="sec" id="ss-cik">${tt(bot ? 'ÇIK' : 'ODADAN ÇIK')}</button></div>`, '', 'strSonuc');
  if (typeof emoYerlestir === 'function') emoYerlestir();   // emoji düğmesi hemen yerine
  const sp = $('#ss-paylas'); if (sp) sp.onclick = () => paylas(`Stacking Sentences · 🧠 ${tt('Strateji')} · ${M.lvl}\n🏆 ${s.b}–${s.r} · 💥 ${s.pb} ${tt('puan')}\n${tt('Sen de bana karşı oyna:')} ${OYUN_URL}`);
  const t = $('#ss-tekrar');
  if (t) t.onclick = () => { const lvl = M.lvl; strKapat(); if (bot) botMacBaslat('strateji', lvl); else { lobiAc(); } };
  $('#ss-cik').onclick = () => { strKapat(); if (bot) onlineModAc('strateji'); else { odadanCik(); onlineModAc('strateji'); } };
}
window.addEventListener('resize', () => { if (STR && STR.R) strCiz(); });
window.addEventListener('keydown', e => { if (STR && e.key === 'Escape' && !ov.classList.contains('show')) { e.preventDefault(); strCikSor(); } });

/* ---------------- rehberli ilk strateji maçı (alıştırma) ----------------
   İlk strateji maçından önce bir kez (kayit.strRehber), ya da strateji ekranındaki "Nasıl oynanır" ile.
   Elle hazırlanmış küçük tahta: "Ben mutluyum." → I am happy. Koç balonu ne yapılacağını söyler (sesli),
   el işareti neyin nereye gideceğini gösterir; her adımda yalnız gösterilen hamle yapılabilir. */
const REHBER_TAHTA = [
  ['the', 0], ['I', 3, 0], ['cat', 1], ['go', 2], ['big', 0], null,
  ['you', 2], ['car', 0], ['run', 3], ['bed', 0], ['am', 1, 1], ['top', 2],
  ['are', 1, -1, 1], ['hot', 0], ['pen', 1], ['happy', 2, 2], ['sit', 1], ['box', 0],
  ['tree', 2], ['cup', 1], ['hat', 0], ['leg', 2], ['egg', 0], ['dog', 3]];
const REHBER = [
  { t: 'bilgi', m: 'Alıştırma: “Ben mutluyum.” cümlesini kuracaksın. Önce karoları düzenle, sonra kelimeleri seç, en sonda bombala.' },
  { t: 'tasi', a: 23, b: 2, m: 'Aynı renkler birlikte patlar. Parlayan mavi karoyu “I”nın yanına sürükle.' },
  { t: 'bilgi', m: 'Gördün mü? Bıraktığın yerdeki karolar sağa kaydı ve boşluğu doldurdu. Şimdi “I” yanındaki ve altındaki mavilerle bir grup oldu.' },
  { t: 'tasi', a: 18, b: 16, m: 'Şimdi parlayan yeşil karoyu “happy”nin yanına getir.' },
  { t: 'sec', id: 'I', kutu: 0, m: 'Tahta hazır! Şimdi cümlenin kelimelerini sırayla kutulara çek. Önce “I”.' },
  { t: 'sec', id: 'am', kutu: 1, m: 'Dikkat: sarı “are” bir tuzak! “Ben mutluyum” = “I am happy”. “am”i çek.' },
  { t: 'sec', id: 'happy', kutu: 2, m: 'Son kelime: “happy”.' },
  { t: 'bomba', m: 'Hepsi hazır. 💣 BOMBA’ya bas!' },
  { t: 'son', m: 'Süper! Seçtiğin kelimeler ve onlara değen aynı renkler birlikte patladı. Ne kadar çok aynı renk toplarsan o kadar çok puan. Ama önce cümle doğru olmalı: doğru cümle her zaman kazanır!' },
];
function rehberAdim() { const R = STR && STR.R; return R && R.rehber ? REHBER[R.rehber.adim] : null; }
function strRehberKur(sonra) {
  const M = STR; if (!M) return;
  const T = { cols: 6, rows: 4, n: 3, hedef: ['I', 'am', 'happy'], h: REHBER_TAHTA.map((x, i) => x && { id: i + 1, txt: x[0], ci: x[1], k: x[2] == null ? -1 : x[2], cel: x[3] != null, of: x[3] }) };
  M.R = { s: { tr: 'Ben mutluyum.', en: 'I am happy.' }, T, hamle: 2, secim: [null, null, null], secili: -1, sure: Infinity, t0: Date.now(), bitti: false, sonuc: null, rehber: { adim: 0, sonra } };
  $('#st-panel').classList.remove('acik');
  strCiz(true); rehberAdimGoster();
}
// ayrı açılış: strateji ekranındaki "Nasıl oynanır"
function strRehberTek() {
  strKapat(); if (G.state !== 'menu') demo();
  D = null; Konus.sus();
  Ses.muzik('strateji'); Ses.gerilim(0);
  STR = { mac: 'rehber', lvl: 'A1', tohum: 'rehber', cum: [], tur: -1, ben: [], rakipS: [], rakip: { ad: tt('Koç'), bot: true }, online: false, karar: null, xp0: kayit.xp, R: null, zaman: null };
  ekranlariKapat(); strEkranKur();
  strRehberKur(() => { strKapat(); onlineModAc('strateji'); });
}
function rehberIzin(tur, x, y) {
  const a = rehberAdim(), ok = a && a.t === tur && (tur === 'tasi' ? x === a.a && y === a.b : x === a.id);
  if (!ok) { Ses.cal('geri', { ses: 0.5 }); const k = strEl && strEl.querySelector('.st-koc'); if (k) { k.classList.remove('salla'); void k.offsetWidth; k.classList.add('salla'); } strCiz(); }
  return ok;
}
function rehberIlerle() {
  const R = STR && STR.R; if (!R || !R.rehber) return;
  R.rehber.adim++; Ses.cal('yukselis', { ses: 0.35 });
  setTimeout(rehberAdimGoster, 350);
}
function rehberAdimGoster() {
  const R = STR && STR.R; if (!R || !R.rehber || !strEl) return;
  const a = REHBER[R.rehber.adim]; if (!a) return;
  let k = strEl.querySelector('.st-koc'); if (!k) { k = document.createElement('div'); k.className = 'st-koc'; strEl.appendChild(k); }
  const son = a.t === 'son', tek = STR.mac === 'rehber';
  k.innerHTML = `<span class="koc-yuz">🧑‍🏫</span><div class="koc-ic"><p>${tt(a.m)}</p>
    <div class="koc-dug">${a.t === 'bilgi' ? `<button class="big kucuk-big" id="rh-ileri">${tt('İLERİ ›')}</button>` : son ? `<button class="big kucuk-big" id="rh-bitti">${tt(tek ? 'TAMAM' : 'MAÇA BAŞLA ›')}</button>` : ''}
    ${son ? '' : `<button class="koc-gec" id="rh-gec">${tt('Geç')}</button>`}</div></div>`;
  const ileri = $('#rh-ileri'); if (ileri) ileri.onclick = () => { sesAc(); rehberIlerle(); };
  const bitir = () => { Konus.sus(); kayit.strRehber = true; kaydet(); const f = R.rehber.sonra; k.remove(); strEl.style.paddingTop = ''; const el = strEl && strEl.querySelector('#st-el'); if (el) el.remove(); R.rehber = null; R.bitti = true; if (f) f(); };
  const b = $('#rh-bitti'); if (b) b.onclick = () => { sesAc(); bitir(); };
  const g = $('#rh-gec'); if (g) g.onclick = () => { sesAc(); bitir(); };
  yonergeSoyle(tt(a.m), { ham: true });
  strEl.style.paddingTop = (k.offsetHeight + 14) + 'px';   // tahta balonun altında kalsın
  strCiz();
}
// vurgular ve el işareti
function rehberCiz() {
  const R = STR && STR.R, a = rehberAdim(); if (!R || !a || !strEl) return;
  strEl.querySelectorAll('.rh-kaynak,.rh-hedef').forEach(e => e.classList.remove('rh-kaynak', 'rh-hedef'));
  let el = strEl.querySelector('#st-el'); if (!el) { el = document.createElement('div'); el.id = 'st-el'; el.textContent = '👆'; strEl.appendChild(el); }
  const tah = strTahtaEl(), merkez = e => { const b = e.getBoundingClientRect(), s = strEl.getBoundingClientRect(); return [b.left - s.left + b.width / 2, b.top - s.top + b.height / 2]; };
  const hucre = i => R.T.h[i] ? strKaroEl(R.T.h[i].id) : tah.querySelector(`.st-bos[data-i="${i}"]`);
  let k = null, h = null;
  if (a.t === 'tasi') { k = hucre(a.a); h = hucre(a.b); }
  else if (a.t === 'sec') { const i = R.T.h.findIndex(x => x && x.txt === a.id); k = hucre(i); h = strEl.querySelector(`.st-kutu[data-i="${a.kutu}"]`); }
  else if (a.t === 'bomba') { k = $('#st-bomba'); }
  if (!k) { el.style.display = 'none'; return; }
  k.classList.add('rh-kaynak'); if (h) h.classList.add('rh-hedef');
  const [x0, y0] = merkez(k), [x1, y1] = h ? merkez(h) : [x0, y0];
  el.style.display = ''; el.className = h ? 'surukle' : 'dokun';
  el.style.setProperty('--x0', x0 + 'px'); el.style.setProperty('--y0', y0 + 'px'); el.style.setProperty('--x1', x1 + 'px'); el.style.setProperty('--y1', y1 + 'px');
}

// özel karo patlaması: ışın (satır / sütun), halka (paket), gökkuşağı parlaması; SÜPER KOMBO yazısı
function strOzelEfekt(T, a) {
  const tah = strTahtaEl(); if (!tah) return;
  const c = tah.offsetWidth / T.cols;
  a.ozel.forEach(o => {
    const r = Math.floor(o.i / T.cols), x = o.i % T.cols, kombo = a.kombo;
    const isin = (yatay) => { const e = document.createElement('i'); e.className = 'st-isin ' + (yatay ? 'y' : 'd'); e.style.cssText = yatay ? `top:${r * c + c / 2}px` : `left:${x * c + c / 2}px`; tah.appendChild(e); setTimeout(() => e.remove(), 650); };
    if (o.tur === 'yatay' || (kombo && o.tur === 'dikey')) isin(true);
    if (o.tur === 'dikey' || (kombo && o.tur === 'yatay')) isin(false);
    if (o.tur === 'paket') { const e = document.createElement('i'); e.className = 'st-halka' + (kombo ? ' buyuk' : ''); e.style.cssText = `left:${x * c + c / 2}px;top:${r * c + c / 2}px;--c:${c}px`; tah.appendChild(e); setTimeout(() => e.remove(), 700); }
    if (o.tur === 'gokkusagi') { tah.classList.add('gokkusagi'); setTimeout(() => tah.classList.remove('gokkusagi'), 700); }
  });
  Ses.cal('super', { ses: 0.8 }); Yerel.titret('orta');
  if (a.kombo) { strPuanUc(tt('SÜPER KOMBO!'), 0); Ses.cal('megaBomba', { ses: 1.2 }); }
}
