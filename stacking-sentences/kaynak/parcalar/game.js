/* =====================================================================
   OYUN DURUMU
   Oynanış: 2D karo tahtası. Hedefin (cümlenin kelimeleri ya da kelimenin harfleri) karoları,
   tuzak karolar ve dolgu karolarla karışık durur. Oyuncu karoyu sürükleyip başka bir hücreye bırakır
   (iki karo yer değiştirir). Hedef bir satırda soldan sağa doğru sırayla yan yana gelince patlar.
   Yan yana / alt alta 3+ aynı renk karo toplu patlar, üstteki karolar düşer, yukarıdan yenileri gelir
   (zincirleme kombo). Yanlış karo dizinin sonuna konursa geri seker: hata göstergesi dolar.
   ===================================================================== */
const G = {
  state: 'menu', prev: 'playing', t: 0,
  score: 0, shown: 0, scorePulse: 0,
  R: null, T: null, spawnT: 0,
  shake: 0, flash: 0, flashCol: '#fff', gauge: 0, gaugeShown: 0, dieT: 0,
  combo: 0, comboPulse: 0, ofke: false, jokers: 2, bombs: 0, slows: 1, slowT: 0, rewardIdx: 0,
  sweep: -1, duz: null, promptBox: null,
  hata: 0, bombaDolum: 0, jokerHazir: false, secili: null, imlec: null, surukle: null, ipucu: null
};
const MAXP = { jokers: 3, bombs: 2, slows: 2 };
const HATA_MAX = 10;   // hata göstergesi: her yanlış hamle ve dolan süre bir dilim; dolunca bölüm biter
let D = null;          // açık bölüm oturumu
const ZAM = [];        // oyun saatine bağlı zamanlayıcılar (duraklatınca durur)
function sonra(s, f) { ZAM.push({ t: s, f }); }
const P = [], POP = [], BAN = [], PATLAYAN = [], DUSEN = [];

/* ---------------- dojo oturumu ---------------- */
// Karolar okuma bitince tahtaya yağar. Her okumanın bir numarası var: duraklatıp devam edince ya da
// tekrar dinleyince yeni okuma başlar, eski okumanın zamanlayıcıları artık bekleyişi bitiremez.
/* ---- YÖNERGELER: her tur türünde ne yapılacağı. e: etiket · k: kısa yönerge. Türkçe şeridin üstünde "e · k" yazar.
   Her turun başında önce bu kısa yönerge, hemen ardından turun içeriği okunur (24 Kasım 2026, oyuncu isteği: oyuncu cümleyi
   okumakla uğraşmasın): Türkçe cümle / anlam / kelime; dinleme turlarında İngilizce. Karolar okuma bitince yağar.
   Ayarlar → "Türkçe sesli okuma" kapalıysa Türkçe içerik okunmaz; şeride dokunmak her zaman yeniden okur. ---- */
const YONERGE = {
  kur: { e: 'CÜMLE KUR', k: 'İngilizce kelimeleri sırayla yan yana diz' },
  kurDinle: { e: 'DİNLE VE KUR', k: 'Duyduğun kelimeleri sırayla yan yana diz' },
  tanis: { e: 'YENİ KELİME', k: 'Kelimeyi oku, sonra harflerini sırayla diz' },
  anlam: { e: 'İNGİLİZCESİNİ YAZ', k: 'Harfleri sırayla yan yana diz' },
  ters: { e: 'TÜRKÇESİNİ YAZ', k: 'Harfleri sırayla yan yana diz' },
  dinle: { e: 'DİNLE VE YAZ', k: 'Duyduğun kelimenin harflerini sırayla diz' },
  bosluk: { e: 'BOŞLUĞU DOLDUR', k: 'Eksik kelimenin harflerini sırayla diz' },
  savDuzelt: { e: 'HATAYI BUL', k: 'Doğru kelimeyi yanlışın üstüne kaydır' },
  savFazla: { e: 'HATAYI BUL', k: 'Fazla kelimeye dokun' },
  savSira: { e: 'HATAYI BUL', k: 'Yer değiştirecek iki kelimeyi birbirinin üstüne kaydır' },
  savYazim: { e: 'HATAYI BUL', k: 'Doğru yazılışı yanlışın üstüne kaydır' },
  savEslesme: { e: 'HATAYI BUL', k: 'Doğru anlamı yanlış eşleşmenin üstüne kaydır' }
};
function yonergeAcik() { return kayit.ayar.yonergeSes !== false; }
// yönergeyi ve açıklamaları sesli okur (Türkçe arayüzde Türkçe sesle; İngilizce arayüzde İngilizce)
function yonergeSoyle(metin, o) {
  if (!metin || !yonergeAcik()) return false;
  o = Object.assign({ zorla: true }, o || {});
  const m = o.ham ? metin : tt(metin);   // ham: yazı zaten arayüz dilinde
  return arayuzDili === 'en' ? Konus.soyle(m, Object.assign({ hiz: 0.95 }, o)) : Konus.tr(m, o);
}
function yonergeSuresi(metin) { return 1 + String(metin || '').length * 0.075; }
function turYonergesi(R, anahtar, onEk) { const y = YONERGE[anahtar]; R.yonerge = y; R.yonergeAnahtar = anahtar; return (onEk || '') + tt(y.e) + ' · ' + tt(y.k); }
// okunacak kısa yönerge: şeritteki yazının kendisi ("Hatayı bul. Doğru yazılışı yanlışın üstüne kaydır.")
function yonergeKisa(R) {
  const y = R && R.yonerge; if (!y) return '';
  const dil = arayuzDili === 'en' ? 'en' : 'tr-TR', e = tt(y.e).toLocaleLowerCase(dil);
  return e.charAt(0).toLocaleUpperCase(dil) + e.slice(1) + '. ' + tt(y.k) + '.';
}
// turun başında kendiliğinden okunan: kısa yönerge, ardından turun içeriği (Türkçe cümle / anlam / kelime; dinleme turunda İngilizce).
// Karolar okuma bitince yağar. R.otoIcerik === false: içerik yönergenin kendisi (tekrar okunmaz).
function otoOku(R, maxS) {
  const kisa = yonergeAcik() ? yonergeKisa(R) : '', dinleme = !!R.dinleSes, icerik = R.prompt && R.prompt.ses && R.otoIcerik !== false ? R.prompt.ses : null;
  const f = (birak, bs) => {
    const sonra_ = () => { if (G.R !== R) return; if (!(icerik && icerik(birak, () => { }))) birak(); };
    if (kisa && yonergeSoyle(kisa, { ham: true, basladi: bs, bitti: sonra_ })) return true;
    return icerik ? icerik(birak, bs) : false;
  };
  const icerikS = !icerik ? 0 : dinleme ? (maxS || 6) : 1.5 + String(R.prompt.ana || '').length * 0.085;
  okuBekle(R, f, icerikS + (kisa ? yonergeSuresi(kisa) : 0.5));
}
function okuBekle(R, f, maxS) {
  maxS = maxS || 6;
  R.okuMax = maxS;
  const no = R.okuNo = (R.okuNo || 0) + 1, benim = () => R.okuNo === no;
  let sinirNo = 0;
  const birak = () => { if (!benim()) return; R.bekle = false; R.okunuyor = false; };
  const sinir = s => { const n = ++sinirNo; sonra(s, () => { if (n === sinirNo) birak(); }); };   // en uzun bekleme
  R.bekle = true; R.okunuyor = false;
  const ok = f(birak, () => {
    if (!benim()) return;
    R.okunuyor = true; R.sesBasladi = true;
    // telefonun sesi geç açıldıysa ve karolar henüz yağmadıysa okuma bitene kadar yine bekle
    if (!R.bekle) { if (G.R !== R || R.tahtaHazir || R.bitti) return; R.bekle = true; }
    sinir(maxS);   // en uzun bekleme, okuma gerçekten başladığı andan sayılır
  });
  if (!ok) { R.bekle = false; return; }
  // okuma hiç başlamazsa karolar bu kadar sonra yağar (ses çalışan cihazda biraz daha uzun beklenir)
  const ilk = Konus.baslamaSuresi();
  sonra(ilk, () => { if (benim() && !R.okunuyor) R.bekle = false; });
  sinir(maxS + ilk);
}
// Türkçe kutusuna dokununca / T tuşu: karolar daha yağmadıysa yeniden okunur ve okuma bitene kadar beklenir
function tekrarDinle() {
  const R = G.R; if (!R || !R.prompt || !R.prompt.ses) return;
  if (R.bekle && !R.tahtaHazir && !R.bitti) okuBekle(R, R.prompt.ses, R.okuMax); else R.prompt.ses();
}
function birKez(f) { let ok = false; return () => { if (ok) return; ok = true; f(); }; }
function planYap(r) { const nK = r.usta === 2 ? 6 : r.usta ? 5 : 4, p = []; for (let i = 0; i < nK; i++) { p.push('kur'); if (i < nK - 1) p.push('sav'); } return p; }
// opt: { kelime: paket } · { antrenman: kuyruk } · { st: true } · { online: {...} } · { devam: yarım bölüm kaydı } · { ilkCumle: cümle } (ilk.js) · { gunluk: görev } (gorev.js)
// olaylarda bölümün türü
function bolumModu() { return !D ? null : D.ilkCumle ? 'ilk' : D.online ? 'online' : D.st ? 'test' : D.antrenman ? 'antrenman' : D.gunluk ? 'gunluk' : D.kelime ? 'kelime' : 'bolum'; }
function dojoBaslat(r, opt) {
  opt = opt || {};
  sesAc();
  ZAM.length = 0;
  D = { r, li: seviyeZor(r.lvl), n: Math.min(6, r.n || 0), istat: { cumle: 0, kusursuz: 0, yanlis: 0, dogru: 0, sav: 0, savOk: 0, test: 0, testOk: 0 },
    hatalar: [], kullanilan: {}, tekrarKullanilan: {}, kullanilanHata: {}, hizKat: 1, tur: 0, turYazi: '', ilk: !kayit.rehber && !opt.kelime && !opt.antrenman && !opt.st && !opt.online && !opt.ilkCumle && !opt.gunluk };
  if (opt.kelime) { const kq = kelimeKuyruk(opt.kelime); D.kelime = { kuyruk: kq.kuyruk, i: 0, yeniSet: {}, dogru: {}, hatali: {}, gorulen: [], ogrenilen: [] }; D.paket = opt.kelime; }
  else if (opt.antrenman) D.antrenman = { kuyruk: opt.antrenman, i: 0, hatirlanan: 0 };
  else if (opt.st) D.st = { n: ST_SORU, i: 0, sev: 1, kayit: [], gorulen: {} };
  else if (opt.online) D.online = opt.online;
  else if (opt.gunluk) D.gunluk = { liste: opt.gunluk.liste, plan: opt.gunluk.plan, gun: opt.gunluk.gun, ti: 0, si: 0 };   // Günün Görevi (gorev.js)
  else if (opt.ilkCumle) { D.ilkCumle = opt.ilkCumle; D.plan = ['kur']; D.ti = 0; D.zorunluCumle = opt.ilkCumle; }   // rehberli ilk cümle (ilk.js)
  else { D.plan = planYap(r); D.ti = 0; }
  PARA.length = 0;
  Object.assign(G, { score: 0, shown: 0, paraYolda: 0, sayiyor: false, kasaSeri: 0, paraSay: 0, R: null, sweep: -1, flash: 0, shake: 0, gauge: 0, gaugeShown: 0,
    combo: 0, comboPulse: 0, ofke: false, jokers: 2, bombs: 0, slows: 1, slowT: 0, rewardIdx: 0, duz: null,
    hata: 0, bombaDolum: 0, jokerHazir: false, secili: null, surukle: null, ipucu: null });
  P.length = 0; POP.length = 0; BAN.length = 0; PATLAYAN.length = 0; DUSEN.length = 0;
  tahtaBosalt();
  const y = opt.devam ? yarimUygula(opt.devam) : null;   // yarım bölüm: D ve G kaldığı yerden
  // Kariyer'de oyuncunun seçimi: İngilizce cümle / kelime görünerek mi (puan ve XP yarı) gizli mi oynanır
  D.goster = !opt.antrenman && !opt.st && !opt.online && !opt.ilkCumle && !opt.gunluk && !!(opt.kelime ? kayit.ayar.ingKelime : kayit.ayar.ingCumle);
  updatePowUI();
  ekranlariKapat();
  G.state = 'playing';
  Olay.yay('bolumBasladi', { mod: bolumModu(), r: r.id, lvl: r.lvl, devam: !!y, goster: D.goster });
  Ses.muzik('duello'); Ses.yogunluk(0, true); Ses.cal('gong', { ses: 0.7 });
  if (D.online) { onlineGeriSayim(); return; }
  if (D.ilkCumle) { banner(tt('İLK CÜMLEN'), tt('Dinle ve kur'), '#3dff7a', 1.8); sonra(1.4, sonrakiTur); return; }
  const bas = tt(y ? 'KALDIĞIN YERDEN' : D.kelime ? 'KELİME PAKETİ' : D.antrenman ? 'ANTRENMAN' : D.gunluk ? 'GÜNÜN GÖREVİ' : D.st ? 'SEVİYE TESTİ' : (r.usta === 2 ? 'SEVİYE SINAVI' : r.usta ? 'ARA SINAV' : 'CÜMLE BÖLÜMÜ'));
  banner(bas, (r.lvl ? r.lvl + ' · ' : '') + (r.world || r.ad || '') + (y ? ' · ' + tt(D.kelime ? 'Kelime ' : 'Tur ') + y.turYazi : ''), '#19f0ff', 1.8);
  if (!y) { kayit.istat.dojo = (kayit.istat.dojo || 0) + 1; kaydet(); }
  sonra(1.4, y ? () => turBaslat(yarimTur(y.tur)) : sonrakiTur);
}

/* ---------------- yarım bölüm: her turun başında kaydedilir, profil açılınca kaldığı turdan sürer ----------------
   Kaydedilenler: bölüm / kelime paketi, tur sırası, o turun cümlesi ya da sorusu, skor, kombo, güçler,
   hata göstergesi, CÜMLE BOMBASI dolumu, istatistikler ve hata listesi. Tur yarıda bırakıldıysa o tur baştan oynanır
   (tahta yeniden karışık dizilir). Antrenman, seviye testi ve online maç kaydedilmez (kısa oturumlar).
   Kayıt biçimi aynı kaldı: eski sürümün mezarlık listesi (G.pile) boş yazılır; eski kayıttaki mezarlık
   açılırken hata göstergesine çevrilir. */
const wRef = w => [w.pid, w.i], wAl = a => paketKelimeleri(a[0])[a[1]];
const sRef = s => [s.kaynak, s.i], sAl = a => cumleler(a[0])[a[1]];
function yarimKaydedilir() { return !!D && !D.st && !D.antrenman && !D.online && !D.ilkCumle && (!!D.kelime || !!D.plan); }
function savYaz(m) { const o = savKopya(m); if (m.kelime) o.kelime = wRef(m.kelime); o.tekrar = m.tekrar ? m.tekrar.k : null; return o; }
function savOku(o) { const m = savKopya(o); if (o.kelime) m.kelime = wAl(o.kelime); if (o.tekrar) m.tekrar = srsBul(o.tekrar); return m; }
function yarimKaydet(R) {
  const k = yarimAnahtar(); if (!k || !yarimKaydedilir() || !R) return;
  let tur;
  if (R.tip === 'kur') tur = { tip: 'kur', s: sRef(R.s), dinle: !!R.dinle, tekrar: R.tekrar ? R.tekrar.k : null };
  else if (R.tip === 'sav') tur = { tip: 'sav', m: savYaz(R.m) };
  else if (R.tip === 'test') tur = { tip: 'test', it: Object.assign({}, R.it, { w: wRef(R.it.w), tekrar: R.it.tekrar ? 1 : 0 }) };
  else if (R.tip === 'tanis') tur = { tip: 'tanis', w: wRef(R.w) };
  else return;
  const kq = D.kelime;
  const y = {
    v: 1, t: Date.now(), r: D.r.id, mod: kq ? 'kelime' : 'bolum', ad: kq ? D.r.ad : D.r.world, lvl: D.r.lvl, turYazi: D.turYazi, tur,
    D: { n: D.n, istat: D.istat, kullanilan: D.kullanilan, tekrarKullanilan: D.tekrarKullanilan, kullanilanHata: D.kullanilanHata, hizKat: D.hizKat, tur: D.tur,
      plan: D.plan || null, ti: D.ti || 0, ilk: D.ilk, sonIlk: D.sonIlk || [], enKombo: D.enKombo || 0,
      hatalar: D.hatalar.map(h => h.w ? Object.assign({}, h, { w: wRef(h.w) }) : h) },
    kelime: kq ? { kuyruk: kq.kuyruk.map(it => it.w ? Object.assign({}, it, { w: wRef(it.w) }) : it), i: kq.i, yeniSet: kq.yeniSet, dogru: kq.dogru, hatali: kq.hatali,
      gorulen: kq.gorulen.map(wRef), ogrenilen: kq.ogrenilen.map(wRef), savSira: kq.savSira || 0 } : null,
    G: { score: G.score, combo: G.combo, ofke: G.ofke, jokers: G.jokers, bombs: G.bombs, slows: G.slows, rewardIdx: G.rewardIdx,
      hata: G.hata, bombaDolum: Math.round(G.bombaDolum * 1000) / 1000, pile: [] }
  };
  yarimYaz(y);
}
// dojoBaslat içinde: kayıttaki D ve G değerleri yeni oturuma yazılır
function yarimUygula(y) {
  const d = y.D;
  Object.assign(D, { n: d.n, istat: d.istat, kullanilan: d.kullanilan || {}, tekrarKullanilan: d.tekrarKullanilan || {}, kullanilanHata: d.kullanilanHata || {}, hizKat: d.hizKat || 1, tur: d.tur || 0,
    turYazi: y.turYazi, ilk: !!d.ilk, sonIlk: d.sonIlk || [], enKombo: d.enKombo || 0, hatalar: (d.hatalar || []).map(h => Array.isArray(h.w) ? Object.assign({}, h, { w: wAl(h.w) }) : h) });
  if (y.mod === 'kelime') {
    const k = y.kelime;
    D.kelime = { kuyruk: k.kuyruk.map(it => it.w ? Object.assign({}, it, { w: wAl(it.w) }) : it), i: k.i, yeniSet: k.yeniSet || {}, dogru: k.dogru || {}, hatali: k.hatali || {},
      gorulen: k.gorulen.map(wAl), ogrenilen: k.ogrenilen.map(wAl), savSira: k.savSira || 0 };
  } else { D.plan = d.plan; D.ti = d.ti; }
  const g = y.G;
  // hata göstergesi; eski sürümün kaydında mezarlıktaki her blok bir dilim sayılır (dolu sayılmaz, oyun hemen bitmesin)
  const hata = typeof g.hata === 'number' && isFinite(g.hata) ? g.hata : (Array.isArray(g.pile) ? g.pile.length : 0);
  Object.assign(G, { score: g.score, shown: g.score, combo: g.combo, ofke: !!g.ofke, jokers: g.jokers, bombs: g.bombs, slows: g.slows, rewardIdx: g.rewardIdx || 0,
    hata: clamp(Math.round(hata), 0, HATA_MAX - 1), bombaDolum: clamp(+g.bombaDolum || 0, 0, 1) });
  return y;
}
function yarimTur(t) {
  if (t.tip === 'kur') { D.dinle = !!t.dinle; D.cumleTekrar = t.tekrar ? srsBul(t.tekrar) : null; const R = turKur(sAl(t.s)); D.dinle = false; return R; }
  if (t.tip === 'sav') return turSav(savOku(t.m));
  if (t.tip === 'test') return turTest(Object.assign({}, t.it, { w: wAl(t.it.w), tekrar: !!t.it.tekrar }));
  return turTanis({ w: wAl(t.w) });
}
// Kariyer'den "kaldığın yerden devam"
function yarimSurdur() {
  const y = yarimOku(); if (!y) return false;
  const r = y.mod === 'kelime' ? paketBul(y.r) : rakipBul(y.r);
  try {
    // kayıttaki cümle ve kelimeler bu içerikte hâlâ var mı (bozuk / eski kayıt oyunu kilitlemesin)
    const t = y.tur, var_ = a => Array.isArray(a) && !!(a.length === 2 && (typeof a[1] === 'number'));
    if (!r) throw new Error('bölüm yok');
    if (t.tip === 'kur' ? !(var_(t.s) && sAl(t.s)) : t.tip === 'sav' ? !(t.m && Array.isArray(t.m.tokens)) : t.tip === 'test' ? !(var_(t.it.w) && wAl(t.it.w)) : !(var_(t.w) && wAl(t.w))) throw new Error('tur okunamadı');
    if (y.mod === 'kelime' && (!y.kelime || y.kelime.kuyruk.some(it => it.w && !wAl(it.w)))) throw new Error('kelime kuyruğu okunamadı');
    dojoBaslat(r, y.mod === 'kelime' ? { kelime: r, devam: y } : { devam: y });
    return true;
  } catch (e) { console.error(e); yarimSil(); D = null; G.state = 'over'; return false; }
}
// Kariyer ve profil ekranında gösterilen kısa yazı: "Ev · A1 · Tur 3/7"
function yarimYazi(y) { return y ? esc(y.ad || '') + ' · ' + esc(y.lvl || '') + ' · ' + tt(y.mod === 'kelime' ? 'Kelime ' : 'Tur ') + esc(y.turYazi || '') : ''; }
function sonrakiTur() {
  if (!D || G.state === 'dying' || G.state === 'over' || G.state === 'menu') return;
  G.R = null;
  if (D.kelime) {
    const kq = D.kelime;
    if (kq.i >= kq.kuyruk.length) { dojoBitti(true); return; }
    const it = kq.kuyruk[kq.i++]; D.turYazi = kq.i + '/' + kq.kuyruk.length;
    if (it.tip === 'tanis') { turBaslat(turTanis(it)); return; }
    if (it.tip === 'savunma') { const km = kelimeSavunmaMaddesi(); if (!km) { sonrakiTur(); return; } turBaslat(turSav(km)); return; }
    turBaslat(turTest(it)); return;
  }
  if (D.antrenman) {
    const a = D.antrenman;
    if (a.i >= a.kuyruk.length) { dojoBitti(true); return; }
    const e = a.kuyruk[a.i++]; D.turYazi = a.i + '/' + a.kuyruk.length;
    if (e.tur === 'kelime') {
      const tipA = ['anlam', 'ters', 'anlam']; if (Konus.hazir()) tipA.push('dinle'); if (boslukluMu(e.w)) tipA.push('bosluk');
      turBaslat(turTest({ tip: pick(tipA), w: e.w, tekrar: true })); return;
    }
    if (e.tur === 'cumle') {
      const s = rakipBul(e.r) ? cumleler(e.r)[e.i] : null;
      if (!s) { sonrakiTur(); return; }
      D.zorunluCumle = s; D.zorunluTekrar = e; turBaslat(turKur(cumleSec())); return;
    }
    const m = savKopya(e.m); m.tekrar = e; turBaslat(turSav(m)); return;
  }
  if (D.online) {
    const o = D.online;
    if (o.i >= o.liste.length) { onlineBitir('tamam'); return; }
    const s = sAl(o.liste[o.i++]); D.turYazi = o.i + '/' + o.liste.length;
    D.dinle = false; D.cumleTekrar = null; turBaslat(turKur(s)); return;
  }
  if (D.gunluk) {   // Günün Görevi: günün sabit cümleleri, aralarında hatayı bul turları
    const g = D.gunluk;
    if (g.ti >= g.plan.length) { dojoBitti(true); return; }
    const tip = g.plan[g.ti++]; D.turYazi = g.ti + '/' + g.plan.length;
    if (tip === 'kur') { const s = sAl(g.liste[g.si++]); D.dinle = false; D.cumleTekrar = null; if (s) { kullan(s); turBaslat(turKur(s)); } else sonrakiTur(); return; }
    turBaslat(turSav(savunmaMaddesi())); return;
  }
  if (D.st) {
    if (D.st.kayit.length >= D.st.n) { dojoBitti(true); return; }
    D.st.i = D.st.kayit.length + 1; D.turYazi = D.st.i + '/' + D.st.n;
    turBaslat(turTest(stSoru())); return;
  }
  if (D.ti >= D.plan.length) { dojoBitti(true); return; }
  const tip = D.plan[D.ti++]; D.turYazi = D.ti + '/' + D.plan.length;
  if (tip === 'kur') turBaslat(turKur(cumleSec())); else turBaslat(turSav(savunmaMaddesi()));
}

/* ---------------- cümle seçimi ---------------- */
function havuzKaynagi() {
  if (!D.r.karma) return cumleliMi(D.r) ? D.r.id : (seviyeRakipleri(D.r.lvl).filter(cumleliMi)[0] || C.rivals[0]).id;
  const l = seviyeRakipleri(D.r.lvl).filter(cumleliMi);
  return l.length ? pick(l).id : D.r.id;
}
function kullanildi(s) { return !!D.kullanilan[s.kaynak + ':' + s.i]; }
function kullan(s) { D.kullanilan[s.kaynak + ':' + s.i] = true; }
function cumleSec() {
  D.cumleTekrar = null; D.dinle = false;
  if (D.zorunluCumle) { const z = D.zorunluCumle; D.cumleTekrar = D.zorunluTekrar; D.zorunluCumle = null; return z; }
  // zamanı gelen tekrar cümleleri bölüme karışır (her 3 cümlede 1)
  if (D.istat.cumle % 3 === 1) {
    const hz = srsHazir().filter(e => { const rr = e.tur === 'cumle' && rakipBul(e.r); return rr && seviyeZor(rr.lvl) <= D.li && !D.tekrarKullanilan[e.k]; });
    if (hz.length) { const te = hz[0], ts = cumleler(te.r)[te.i]; if (ts) { D.tekrarKullanilan[te.k] = 1; D.cumleTekrar = te; return ts; } }
  }
  const kaynak = havuzKaynagi(), havuz = cumleler(kaynak);
  let gorulen = kayit.gorulen[kaynak] || [];
  let aday = havuz.filter(s => !kullanildi(s) && gorulen.indexOf(s.i) < 0);
  if (aday.length < 3) { kayit.gorulen[kaynak] = []; gorulen = []; aday = havuz.filter(s => !kullanildi(s)); }
  if (!aday.length) aday = havuz.slice();
  if (D.istat.cumle < 2) { const kisa = aday.filter(s => s.w.length <= 6); if (kisa.length) aday = kisa; }
  const sonIlk = D.sonIlk || [];
  const farkli = aday.filter(s => sonIlk.indexOf(s.w[0][0].toLowerCase()) < 0);
  if (farkli.length) aday = farkli;
  const s = pick(aday);
  sonIlk.push(s.w[0][0].toLowerCase()); if (sonIlk.length > 2) sonIlk.shift(); D.sonIlk = sonIlk;
  kullan(s);
  gorulen.push(s.i); if (gorulen.length > Math.floor(havuz.length * 0.7)) gorulen.shift();
  kayit.gorulen[kaynak] = gorulen;
  // dinle ve kur: arada bir Türkçe gizlenir, İngilizce cümle sesli okunur
  if (!D.ilk && !D.antrenman && Konus.hazir() && D.istat.cumle >= 1 && D.istat.cumle % 4 === 1 && s.w.length <= 12) D.dinle = true;
  return s;
}
function savunmaMaddesi() {
  if (Math.random() < 0.4) {
    const hz = srsHazir().filter(e => e.tur === 'hata' && !D.tekrarKullanilan[e.k]);
    if (hz.length) { const te = hz[0]; D.tekrarKullanilan[te.k] = 1; const tm = savKopya(te.m); tm.tekrar = te; return tm; }
  }
  const li = D.li;
  const hazir = HATALAR.filter((h, i) => !D.kullanilanHata[i] && SEVIYELER.indexOf(h[0]) <= li && SEVIYELER.indexOf(h[0]) >= li - 1);
  if (hazir.length && (D.istat.sav === 0 ? Math.random() < 0.6 : Math.random() < 0.38)) {
    const h = pick(hazir);
    D.kullanilanHata[HATALAR.indexOf(h)] = true;
    const tk = tokenle(h[1]), idx = tk.indexOf(h[2]);
    const dogruTk = tk.slice(); if (h[3]) dogruTk[idx] = h[3]; else dogruTk.splice(idx, 1);
    dogruTk[0] = buyukHarf(dogruTk[0]);
    return { tokens: tk, idx, dogru: h[3], tr: h[4], kural: h[5], dogruCumle: dogruTk.join(' ') + (/\?$/.test(h[1]) ? '?' : '.'), klasik: true };
  }
  const havuz = cumleler(havuzKaynagi()), adaylar = [];
  const enUzun = li >= 4 ? 14 : li >= 3 ? 12 : 9;
  for (let n = 0; n < 40 && adaylar.length < 14; n++) {
    const s = pick(havuz);
    if (kullanildi(s) || s.w.length < 4 || s.w.length > enUzun) continue;
    for (let i = 0; i < s.w.length; i++) for (let j = 1; j <= 2; j++) { const p = hataPuani(s.w[i][0], s.w[i][j], s.c[i], li); if (p > 0) adaylar.push({ s, i, j, p: p + Math.random() * 1.5 }); }
  }
  if (!adaylar.length) { const s0 = pick(havuz); adaylar.push({ s: s0, i: s0.w.length - 1, j: 1, p: 0 }); }
  adaylar.sort((a, b) => b.p - a.p);
  const sec = adaylar[0];
  kullan(sec.s);
  const tokens = sec.s.w.map(o => o[0]);
  let yanlis = sec.s.w[sec.i][sec.j] || tokens[sec.i];
  if (sec.i === 0) yanlis = buyukHarf(yanlis);
  const dogru = tokens[sec.i];
  const kr = kural(tokens, sec.i, dogru, yanlis, sec.s.c[sec.i]);
  tokens[sec.i] = yanlis;
  return { tokens, idx: sec.i, dogru, tr: sec.s.tr, kural: kr, dogruCumle: sec.s.en, klasik: false };
}
function stSoru() {
  const st = D.st, l = SEVIYELER[st.sev];
  let havuz = stHavuz(l).filter(w => !st.gorulen[w.k]);
  if (!havuz.length) havuz = stHavuz(l);
  const w = pick(havuz); st.gorulen[w.k] = 1;
  const z = Math.random(), tip = z < 0.25 && boslukluMu(w) ? 'bosluk' : z < 0.6 ? 'ters' : 'anlam';
  return { tip, w, sev: st.sev, secenek: 4 };
}
function stCevap(it, temiz) { const st = D.st; st.kayit.push({ sev: it.sev, ok: !!temiz }); st.sev = clamp(st.sev + (temiz ? 1 : -1), 0, SEVIYELER.length - 1); }

/* =====================================================================
   TURLAR: kur (cümleyi kur) · sav (hatayı bul ve düzelt) · test (kelime sorusu) · tanis (yeni kelime)
   Her turun hedefi (R.hedef) bir ya da birkaç parçadır; parça = tahtada bir satırda soldan sağa sırayla dizilecek karolar:
     kur → cümlenin kelimeleri (tek parça) · test / tanis → kelimenin harfleri (öbekte her kelime ayrı parça)
   ===================================================================== */
// Harf harf dizilecek metin: her kelime ayrı parça; boşluk, kesme, tire, nokta karo olmaz (parça yazısında yerinde durur)
const HARF_RE = /[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/;
function harfParcalari(metin, dil) {
  const yer = dil === 'tr' ? 'tr-TR' : 'en-US';
  return String(metin || '').split(/\s+/).filter(Boolean).map(k => ({ yazi: k, dizi: [...k].filter(ch => HARF_RE.test(ch)).map(ch => ch.toLocaleUpperCase(yer)) })).filter(p => p.dizi.length);
}
// "Türkçesini harf harf diz" sorusunun cevabı: kısa anlamın ilk seçeneği, ayraç içindeki açıklama olmadan ("o (erkek)" → "o")
function trCevap(w) {
  const a = kisaAnlam(w.tr), ilk = a.split(/\s\/\s|;\s/)[0].replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return harfParcalari(ilk, 'tr').length ? ilk : a;
}
function hedefDizi(R) { const h = R && R.hedef; return h ? h.parcalar[h.pi].dizi : []; }
function turKur(s) {
  const R = { tip: 'kur', s, kaynak: s.kaynak, dinle: !!(D && D.dinle), tekrar: D ? D.cumleTekrar : null, hataKayit: false };
  const kelimeler = s.w.map(o => o[0]);
  R.hedef = { tur: 'kelime', parcalar: [{ yazi: s.en, dizi: kelimeler }], pi: 0 };
  // tuzak karolar: her kelimenin içerikteki iki yanlış seçeneği (am yerine is, reading yerine read…)
  R.cel = [];
  s.w.forEach(o => [o[1], o[2]].forEach(x => { if (x && kelimeler.indexOf(x) < 0 && R.cel.indexOf(x) < 0) R.cel.push(x); }));
  R.prompt = R.dinle
    ? { ust: turYonergesi(R, 'kurDinle', R.tekrar ? tt('TEKRAR · ') : ''), ana: tt('Duyduğun cümleyi kelime kelime kur'), alt: '', dinle: true, ses: (b, bs) => Konus.soyle(s.en, { hiz: 0.78, bitti: b, basladi: bs }) }
    : { ust: turYonergesi(R, 'kur', R.tekrar ? tt('TEKRAR · ') : ''), ana: s.tr, tr: true, ses: (b, bs) => Konus.tr(s.tr.replace(/;/g, ','), { bitti: b, basladi: bs }) };
  R.konu = rakipBul(s.kaynak) ? rakipBul(s.kaynak).world : '';
  R.giris = () => {
    if (R.dinle) {
      R.dinleSes = true; otoOku(R, 7);
      // İngilizce okuma hiç başlamazsa (telefonda İngilizce ses yoksa) Türkçesi hemen gösterilir; yoksa karolar ipucusuz yağıyordu
      sonra(2.2, () => { if (G.R === R && !R.bitti && !R.sesBasladi && !R.prompt.alt) R.prompt.alt = s.tr; });
      sonra(9, () => { if (G.R === R && !R.bitti) R.prompt.alt = s.tr; });
    }
    else otoOku(R);
  };
  R.ilkBekle = 0.6;
  return R;
}
function turSav(m) {
  const R = { tip: 'sav', m, satir: !!m.satir };
  // düzeltme karosu: tahtada bir yerde durur, oyuncu onu yanlış kelimenin üstüne kaydırır.
  // '' → fazla kelime (silinmeli): yanlış karoya dokunulur · sıra hatası: iki sabit karo birbirinin üstüne kaydırılır
  R.duzelt = m.tip === 'sira' ? '' : m.tip === 'eslesme' ? String(m.dogru || '').split(' = ').slice(1).join(' = ') : (m.dogru || '');
  const yk = m.tip === 'eslesme' ? 'savEslesme' : m.tip === 'yazim' ? 'savYazim' : m.tip === 'sira' ? 'savSira' : R.duzelt ? 'savDuzelt' : 'savFazla';
  R.prompt = { ust: turYonergesi(R, yk, m.tekrar ? tt('TEKRAR · ') : ''), ana: m.tr, tr: true, ses: (b, bs) => Konus.tr(m.tr, { bitti: b, basladi: bs }) };
  if (m.tip === 'yazim' || m.tip === 'eslesme') {   // Türkçe şeritteki yazı genel bir soru ("Yazımı yanlış olan kelimeyi bul"): okunmaz; şeride dokununca da yönerge okunur
    R.prompt.tr = false;   // tırnaksız: çevrilecek cümle değil
    R.prompt.ses = (b, bs) => yonergeSoyle(yonergeKisa(R), { ham: true, zorla: true, bitti: b, basladi: bs }); R.otoIcerik = false;
  }
  R.giris = () => { Ses.cal('yukle', { ses: 0.7 }); otoOku(R); banner(tt('HATAYI BUL!'), tt(m.tip === 'eslesme' ? 'Bir eşleşme yanlış' : m.tip === 'yazim' ? 'Bir kelime yanlış yazılmış' : m.tekrar ? 'Tekrar: daha önce kaçırdığın hata' : m.klasik ? 'Türklerin sık yaptığı hata' : 'Cümlede bir kelime yanlış'), '#ff6b7d', 1.3); };
  R.ilkBekle = 1.0;
  return R;
}
function turTest(it) {
  const w = it.w, tip = it.tip, cn = (it.secenek || 3) - 1;
  const R = { tip: 'test', it, w };
  if (tip === 'ters') { R.dogru = kisaAnlam(w.tr); R.secenek = [R.dogru].concat(anlamCeldirici(w, cn)); R.trSecenek = true; }
  else { R.dogru = w.en; R.secenek = [w.en].concat(kelimeCeldirici(w, cn, tip === 'dinle')); }
  // harf harf dizilecek cevap; tuzak harfler yanlış seçeneklerin harflerinden
  const dil = tip === 'ters' ? 'tr' : 'en', cevap = tip === 'ters' ? trCevap(w) : w.en;
  R.hedef = { tur: 'harf', dil, metin: cevap, parcalar: harfParcalari(cevap, dil), pi: 0 };
  R.celHarf = []; R.secenek.slice(1).forEach(x => harfParcalari(x, dil).forEach(p => R.celHarf.push(...p.dizi)));
  const ust = turYonergesi(R, tip, (D.st ? SEVIYELER[it.sev] + ' · ' : '') + (it.tekrar ? tt('TEKRAR · ') : ''));
  if (tip === 'bosluk') {
    const o = kelimeOrnek(w); let bos = false;
    const cumle = tokenleKoru(o.en).map(x => { if (!bos && x.replace(/[.,!?;:"“”]/g, '').toLowerCase() === w.k) { bos = true; return x.replace(/[A-Za-z'’-]+/, '_'.repeat(Math.max(3, w.en.length))); } return x; }).join(' ');
    R.prompt = { ust, ana: cumle, en: true, alt: o.tr, ses: (b, bs) => Konus.tr(o.tr, { bitti: b, basladi: bs }) };
    R.giris = () => { Konus.sus(); otoOku(R); };
  } else if (tip === 'anlam') { R.prompt = { ust, ana: w.tr, alt: w.pos, tr: true, buyuk: true, ses: (b, bs) => Konus.tr(w.tr, { bitti: b, basladi: bs }) }; R.giris = () => otoOku(R); }
  else if (tip === 'ters') { R.prompt = { ust, ana: w.en, alt: w.pos, en: true, buyuk: true, ses: (b, bs) => Konus.soyle(w.en, { hiz: 0.9, bitti: b, basladi: bs }) }; R.giris = () => otoOku(R); }
  else { R.prompt = { ust, ana: tt('Dinle ve kelimeyi diz'), dinle: true, ses: (b, bs) => Konus.soyle(w.en, { hiz: 0.8, bitti: b, basladi: bs }) }; R.dinleSes = true; R.giris = () => otoOku(R, 3); }
  R.prompt.ilerleme = true;   // Türkçe kutusunda dizilen harfler (S H E _ _) görünür
  R.ilkBekle = 0.7;
  return R;
}
// cümleyi boşluklardan böler, noktalamayı kelimenin yanında bırakır (boşluklu cümle yazısı için)
function tokenleKoru(s) { return String(s || '').split(/\s+/).filter(Boolean); }
function turTanis(it) {
  const w = it.w, kq = D.kelime, o = kelimeOrnek(w);
  kelTanis(w); kaydet();
  if (kq) { kq.yeniSet[w.k] = 1; if (kq.ogrenilen.indexOf(w) < 0) kq.ogrenilen.push(w); }
  const R = { tip: 'tanis', w, o, nazik: true };   // tanışma: yanlış harf ceza değil, sıradaki harf gösterilir
  R.hedef = { tur: 'harf', dil: 'en', metin: w.en, parcalar: harfParcalari(w.en, 'en'), pi: 0 };
  R.celHarf = [];
  R.prompt = { ust: turYonergesi(R, 'tanis'), kart: true, en: true, ana: w.en, alt: w.tr + (w.pos ? '  ·  ' + w.pos : ''), ornek: o, ilerleme: true, ses: (b, bs) => Konus.soyle(w.en + (o ? '. ' + o.en : ''), { hiz: 0.85, bitti: b, basladi: bs }) };
  R.giris = () => { Ses.cal('kelime', { ses: 0.6 }); otoOku(R); };
  R.ilkBekle = 1.0;
  return R;
}
function turBaslat(R) {
  yarimKaydet(R);   // her tur başında: profil tekrar açılınca bu turdan devam edilir
  G.R = R; R.hata = 0; R.bitti = false; R.t = 0; R.tahtaHazir = false; R.zMax = 0; R.capa = null; R.sonKaro = null; R.zincir = null;
  G.spawnT = R.ilkBekle || 0.6; G.duz = null; G.sweep = -1; G.secili = null; G.surukle = null; G.ipucu = null; G.jokerHazir = false;
  D.tur++; D.hizKat = Math.max(0.8, D.hizKat * 0.985);
  Olay.yay('turBasladi', { tip: R.tip, no: D.tur });
  tahtaKur(R);
  if (R.giris) R.giris();
}

/* =====================================================================
   TAHTA
   T.h[r][c]: karo ya da null · T.kilitli[r][c]: hücre kullanılmaz (hatalı cümle satırının boş yerleri, geniş karonun kapladığı yer)
   Karo: { id, txt, ci (renk), r, c, x, y (çizim yeri), kilit (hatalı cümle karosu), idx (cümledeki sırası), zincir (dizideki yeri sabit) }
   ===================================================================== */
let KARO_NO = 0;
function karoYap(txt, ci, o) { return Object.assign({ id: ++KARO_NO, txt, ci, r: 0, c: 0, x: 0, y: 0, vy: 0, dus: false, olcek: 1, parla: 0, err: 0, hint: 0, geri: null, anlam: '', anlamT: 0 }, o || {}); }
function tahtaBosalt() { if (G.T) G.T.h.forEach(sat => sat.forEach(k => { if (k && !k.kilit) DUSEN.push(Object.assign(k, { vx: rnd(-60, 60), vy: rnd(-180, -40), dt: 0 })); })); G.T = null; }
function tahtaBoyut(R) {
  if (R.tip === 'sav') return Math.max(6, R.satir ? 6 : R.m.tokens.length);
  return Math.max(6, ...R.hedef.parcalar.map(p => p.dizi.length));   // cümle: kelime sayısı · kelime: en uzun kelimenin harf sayısı
}
function tahtaKur(R) {
  tahtaBosalt();
  const cols = tahtaBoyut(R), rows = tahtaSatir(cols, R);
  const T = { cols, rows, h: [], kilitli: [], dalga: 0, kaskad: false };
  for (let r = 0; r < rows; r++) { T.h.push(new Array(cols).fill(null)); T.kilitli.push(new Array(cols).fill(false)); }
  G.T = T; G.imlec = { r: Math.max(0, rows - 2), c: 0 };
  tahtaYerlesim();
  if (R.tip === 'sav') savSatirlari(R, T);
}
function hucreKoy(T, k, r, c) { T.h[r][c] = k; k.r = r; k.c = c; }
// hatalı cümle tahtanın en altında sabit durur (eşleşmede her çift kendi satırında, tam genişlik)
function savSatirlari(R, T) {
  const m = R.m, n = m.tokens.length;
  R.kilitKarolar = [];
  if (R.satir) {
    m.tokens.forEach((tk, i) => {
      const r = T.rows - n + i, k = karoYap(tk, 0, { kilit: true, idx: i, span: T.cols });
      hucreKoy(T, k, r, 0); for (let c = 1; c < T.cols; c++) T.kilitli[r][c] = true;
      R.kilitKarolar.push(k);
    });
  } else {
    const r = T.rows - 1, c0 = Math.floor((T.cols - n) / 2);
    for (let c = 0; c < T.cols; c++) if (c < c0 || c >= c0 + n) T.kilitli[r][c] = true;
    m.tokens.forEach((tk, i) => { const k = karoYap(tk, 0, { kilit: true, idx: i }); hucreKoy(T, k, r, c0 + i); R.kilitKarolar.push(k); });
  }
  R.kilitKarolar.forEach(k => { const p = hucreMerkez(k.r, k.c, k.span); k.x = p.x; k.y = p.y; k.olcek = 0; k.buyu = true; });
}
function sabitHucre(T, r, c) { const k = T.h[r][c]; return T.kilitli[r][c] || !!(k && (k.kilit || k.zincir)); }
function karolar(T, f) { const o = []; if (T) T.h.forEach(sat => sat.forEach(k => { if (k && (!f || f(k))) o.push(k); })); return o; }
function serbestHucreler(T) { const o = []; for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) if (!T.kilitli[r][c] && !T.h[r][c]) o.push({ r, c }); return o; }

/* ---------------- karo yazıları: gerekli, tuzak, dolgu ---------------- */
const HARF_SIK = { en: 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOIIIIIIINNNNNNNSSSSSSHHHHHHRRRRRRDDDDLLLLCCCUUUMMWWFFGGYYPPBBVK', tr: 'AAAAAAAAAAAEEEEEEEEEİİİİİİİIIIIIINNNNNNNRRRRRRRLLLLLLKKKKKDDDDDMMMMMUUUUYYYYTTTTTSSSSBBBOOOÜÜŞŞZZGGÇÇHHĞVVCÖP' };
const dolguOnbellek = {};
// cümle turlarında dolgu karoları: aynı bölümün başka cümlelerindeki kelimeler (hedef ve tuzaklar hariç)
function kelimeDolgu(R) {
  const id = R.kaynak || (D && D.r && cumleliMi(D.r) ? D.r.id : havuzKaynagi());
  if (!dolguOnbellek[id]) { const o = {}; cumleler(id).forEach(s => s.w.forEach(w => { o[w[0]] = 1; })); dolguOnbellek[id] = Object.keys(o); }
  const yasak = {}; hedefTumu(R).concat(R.cel || []).forEach(x => { yasak[String(x).toLowerCase()] = 1; });
  return dolguOnbellek[id].filter(x => !yasak[x.toLowerCase()]);
}
function hedefTumu(R) { return R.hedef ? [].concat(...R.hedef.parcalar.map(p => p.dizi)) : []; }
function rastgeleMetin(R) {
  if (!R) return pick(HARF_SIK.en);
  if (R.tip === 'kur') { if (R.cel.length && Math.random() < 0.3) return pick(R.cel); if (!R.dolgu) R.dolgu = kelimeDolgu(R); return R.dolgu.length ? pick(R.dolgu) : pick(R.cel.length ? R.cel : hedefTumu(R)); }
  if (R.tip === 'sav') { if (!R.dolgu) R.dolgu = savDolgu(R); return pick(R.dolgu); }
  if (R.celHarf && R.celHarf.length && Math.random() < 0.3) return pick(R.celHarf);
  return pick(HARF_SIK[R.hedef.dil] || HARF_SIK.en);
}
// hatayı bul turunda serbest karolar: düzeltme karosuna benzeyen tuzaklar ve dolgu
function savDolgu(R) {
  const m = R.m, o = [];
  if (m.tip === 'eslesme') {
    const w = m.kelime; if (w) o.push(...anlamCeldirici(w, 6));
    paketKelimeleri(w ? w.pid : D.r.id).forEach(q => { const a = kisaAnlam(q.tr); if (a && o.indexOf(a) < 0 && a !== R.duzelt) o.push(a); });
  } else if (m.tip === 'yazim') {
    for (let i = 0; i < 4; i++) { const y = yanlisYaz(R.duzelt); if (y && o.indexOf(y) < 0) o.push(y); }
    (D.kelime ? paketKelimeleri(D.r.id) : []).forEach(q => { if (q.en.indexOf(' ') < 0 && q.en !== R.duzelt) o.push(q.en); });
  } else {
    const havuz = cumleler(havuzKaynagi());
    for (let i = 0; i < 30 && o.length < 40; i++) { const s = pick(havuz); s.w.forEach(w => { [w[1], w[2], w[0]].forEach(x => { if (x && x !== R.duzelt && m.tokens.indexOf(x) < 0 && o.indexOf(x) < 0) o.push(x); }); }); }
  }
  const t = o.filter(x => x && x !== R.duzelt);
  return t.length ? t : ['…'];
}
// tahtada hedefin tamamlanması için eksik kalan karolar (çok kullanılan kelime/harf kadar kopya); bekleyenler hariç
function eksikGerekenler(R) {
  const T = G.T; if (!R || !T || R.bitti) return [];
  if (R.tip === 'sav') return R.duzelt && !karolar(T, k => !k.kilit && k.txt === R.duzelt).length ? [R.duzelt] : [];
  const need = hedefDizi(R), z = R.zincir, kalan = need.slice(z ? z.k : 0), say = {};
  kalan.forEach(x => { say[x] = (say[x] || 0) + 1; });
  (R.bekleyen || []).forEach(b => { if (say[b.txt]) say[b.txt]--; });
  karolar(T, k => !k.kilit && !k.zincir).forEach(k => { if (say[k.txt]) say[k.txt]--; });
  const o = []; for (const x in say) for (let i = 0; i < say[x]; i++) o.push(x);
  return o;
}
function yeniMetinler(R, n) {
  const o = eksikGerekenler(R).slice(0, n);
  while (o.length < n) o.push(rastgeleMetin(R));
  return karistir(o);
}
// renk: sol iki ve üst iki karoyla 3'lü aynı renk oluşturmayan bir renk (başlangıçta hazır patlama olmasın)
function guvenliRenk(T, r, c) {
  const ayni = (a, b) => a && b && a.ci >= 0 && a.ci === b.ci;
  const yasak = {};
  if (c >= 2 && T.h[r][c - 1] && ayni(T.h[r][c - 1], T.h[r][c - 2])) yasak[T.h[r][c - 1].ci] = 1;
  if (r >= 2 && T.h[r - 1][c] && ayni(T.h[r - 1][c], T.h[r - 2][c])) yasak[T.h[r - 1][c].ci] = 1;
  if (c + 2 < T.cols && T.h[r][c + 1] && ayni(T.h[r][c + 1], T.h[r][c + 2])) yasak[T.h[r][c + 1].ci] = 1;
  if (r + 2 < T.rows && T.h[r + 1][c] && ayni(T.h[r + 1][c], T.h[r + 2][c])) yasak[T.h[r + 1][c].ci] = 1;
  const ok = KARO_RENK.map((x, i) => i).filter(i => !yasak[i]);
  return pick(ok.length ? ok : [0, 1, 2, 3, 4]);
}
// Okuma bitince: karolar yukarıdan tahtaya yağar
function tahtaDoldur(R) {
  const T = G.T; if (!T || R.tahtaHazir) return;
  R.tahtaHazir = true;
  const bos = serbestHucreler(T), N = bos.length;
  let metin = [];
  if (R.tip === 'sav') {
    if (R.duzelt) metin.push(R.duzelt);
    if (!R.dolgu) R.dolgu = savDolgu(R);
    while (metin.length < N) metin.push(pick(R.dolgu));
  } else {
    let need = R.hedef.parcalar[0].dizi.slice();
    if (D.ilkCumle && R.tip === 'kur') { R.dolgu = kelimeDolgu(R); R.cel = []; }   // rehberli ilk cümlede tuzak kelime yok
    // bazı turlarda hedefin bir parçası tahtada henüz yoktur: birkaç saniye sonra yukarıdan iner
    R.bekleyen = [];
    if (!D.ilkCumle && !D.st && !D.online && R.tip !== 'tanis' && need.length >= 4 && Math.random() < 0.45) {
      const i = 1 + ((Math.random() * (need.length - 1)) | 0);
      R.bekleyen.push({ txt: need[i], t: rnd(3.5, 6) }); need.splice(i, 1);
    }
    metin = need.slice();
    if (R.tip === 'kur') { const cel = karistir(R.cel.slice()).slice(0, Math.max(0, Math.floor((N - need.length) * 0.45))); metin.push(...cel); }
    else if (R.celHarf.length) { for (let i = 0; i < Math.floor((N - need.length) * 0.3); i++) metin.push(pick(R.celHarf)); }
    while (metin.length < N) metin.push(rastgeleMetin(R));
    metin = metin.slice(0, N);
  }
  karistir(metin);
  bos.forEach((h, i) => hucreKoy(T, karoYap(metin[i], -1), h.r, h.c));
  if (R.tip !== 'sav') baslangicDuzelt(R, T);
  karolar(T, k => !k.kilit).forEach(k => {
    k.ci = guvenliRenk(T, k.r, k.c);
    const p = hucreMerkez(k.r, k.c); k.x = p.x; k.y = T.y - (T.rows - k.r) * T.ch - rnd(0, T.ch * 0.6) - k.c * T.ch * 0.08; k.vy = 0; k.dus = true;
  });
  zincirYenile(R);
  R.sure = sureHesapla(R); R.sureKalan = R.sure; R.sureUyari = 0;
  T.kaskad = false; T.dalga = 0;
  Ses.cal('dus', { ses: 0.7 });
}
// başlangıçta hazır dizi olmasın; rehberli ilk cümlede ilk kelime sol başta sabit durur (çapa)
function baslangicDuzelt(R, T) {
  const need = hedefDizi(R), n = need.length;
  if (D.ilkCumle) {
    const r = T.rows - 2, bas = karolar(T, k => k.txt === need[0])[0];
    if (bas) { degistir(T, { r: bas.r, c: bas.c }, { r, c: 0 }); R.capa = bas.id; R.zMax = 1; }   // hazır duran ilk kelime oyuncunun hamlesi sayılmaz
    for (let c = 1; c < n; c++) { const k = T.h[r][c]; if (need.indexOf(k.txt) >= 0) { const d = karolar(T, q => need.indexOf(q.txt) < 0 && q.r !== r)[0]; if (d) degistir(T, { r, c }, { r: d.r, c: d.c }); } }
    return;
  }
  for (let deneme = 0; deneme < 30; deneme++) {
    let bozuk = null;
    for (let r = 0; r < T.rows && !bozuk; r++) for (let c = 0; c + 1 < T.cols && !bozuk; c++) {
      const a = T.h[r][c], b = T.h[r][c + 1];
      if (a && b && a.txt === need[0] && b.txt === need[1] && c + n <= T.cols) bozuk = b;
    }
    if (!bozuk) return;
    const d = pick(karolar(T, q => !q.kilit && q !== bozuk && need.indexOf(q.txt) < 0));
    if (!d) return;
    degistir(T, { r: bozuk.r, c: bozuk.c }, { r: d.r, c: d.c });
  }
}
function degistir(T, a, b) { const A = T.h[a.r][a.c], B = T.h[b.r][b.c]; T.h[a.r][a.c] = B; T.h[b.r][b.c] = A; if (A) { A.r = b.r; A.c = b.c; } if (B) { B.r = a.r; B.c = a.c; } }

/* ---------------- dizi (zincir): hedefin satırda soldan sağa dizilmiş başı ----------------
   Etkin dizi: en az 2 karo, ya da oyuncunun kendi koyduğu ilk karo (çapa). En uzun olan; eşitse son oynananı içeren. */
function zincirBul(R) {
  const T = G.T, need = hedefDizi(R), n = need.length; if (!T || !n || !R.tahtaHazir) return null;
  let best = null;
  for (let r = 0; r < T.rows; r++) for (let c0 = 0; c0 + n <= T.cols; c0++) {
    let k = 0;
    while (k < n) { const t = T.h[r][c0 + k]; if (!t || t.kilit || t.txt !== need[k]) break; k++; }
    if (!k) continue;
    const bas = T.h[r][c0];
    if (k < 2 && bas.id !== R.capa) continue;
    let son = false; for (let i = 0; i < k; i++) if (T.h[r][c0 + i].id === R.sonKaro) son = true;
    const puan = k * 1000 + (son ? 100 : 0) + (bas.id === R.capa ? 50 : 0) + r;
    if (!best || puan > best.puan) best = { r, c0, k, puan };
  }
  return best;
}
function zincirYenile(R) {
  const T = G.T; if (!T) return;
  karolar(T).forEach(k => { k.zincir = 0; });
  R.zincir = R && R.hedef && !R.bitti ? zincirBul(R) : null;
  const z = R.zincir; if (z) for (let i = 0; i < z.k; i++) T.h[z.r][z.c0 + i].zincir = i + 1;
}
function hamleSerbest() {
  const R = G.R;
  return G.state === 'playing' && !!R && !R.bitti && R.tahtaHazir && !!G.T && !tahtaMesgul() && !(typeof dzAcik !== 'undefined' && dzAcik);
}

/* ---------------- oyuncunun hamlesi ----------------
   a hücresindeki karo b'ye taşınır, b'deki karo a'ya geçer.
   · Karo etkin dizinin hemen sağındaki boş yere (dizinin sonuna) bırakıldıysa: doğruysa dizi uzar, yanlışsa geri seker (hata).
   · Dizi henüz yokken ilk kelimenin (geçerli bir yerdeki) sağına aday bir karo bırakılırsa da değerlendirilir.
   · Diğer hamleler serbesttir (karıştırma, yer açma); renk eşleşmeleri patlayabilir. */
function hamle(a, b) {
  const R = G.R, T = G.T;
  if (!hamleSerbest() || !a || !b || (a.r === b.r && a.c === b.c)) return false;
  const A = T.h[a.r][a.c], B = T.h[b.r][b.c];
  if (!A) return false;
  G.secili = null;
  if (R.tip === 'sav') return savHamle(A, B, a, b);
  if (A.kilit || !B || B.kilit || T.kilitli[b.r][b.c]) return false;
  const need = hedefDizi(R), n = need.length;
  let z = R.zincir;
  // dizi yokken: ilk kelimenin hemen sağına konan aday karo (gereken kelime / tuzak) değerlendirilir
  if (!z && b.c >= 1) { const sol = T.h[b.r][b.c - 1]; if (sol && sol !== A && !sol.kilit && sol.txt === need[0] && b.c - 1 + n <= T.cols && adayMi(R, A)) z = { r: b.r, c0: b.c - 1, k: 1 }; }
  const icinde = p => z && p.r === z.r && p.c >= z.c0 && p.c < z.c0 + z.k;
  if (z && !icinde(a) && b.r === z.r && b.c === z.c0 + z.k && A.txt !== need[z.k]) {
    if (D.ilkCumle) { ilkUyar(tt('Bu kelime buraya gelmez. Parlayan kelimeyi sürükle.')); geriSek(A, b); return true; }
    yanlisYerlesti(R, A, z, b); return true;
  }
  degistir(T, a, b);
  R.sonKaro = A.id;
  if (A.txt === need[0] && b.c + n <= T.cols) R.capa = A.id;
  zincirYenile(R);
  const k = R.zincir ? R.zincir.k : 0;
  if (k > R.zMax) { const kazanc = k - R.zMax; R.zMax = k; dogruYerlesti(R, kazanc); }
  else Ses.cal('kay', { ses: 0.55 });
  if (R.zincir && R.zincir.k === n) { parcaTamam(R); return true; }
  kaskadBaslat();
  return true;
}
// dizi yokken değerlendirilecek "aday" karo: hedefin bir parçası ya da tuzak (oyuncu cümleyi kurmaya çalışıyor)
function adayMi(R, K) { return hedefTumu(R).indexOf(K.txt) >= 0 || (R.cel || []).indexOf(K.txt) >= 0 || (R.celHarf || []).indexOf(K.txt) >= 0; }
function geriSek(K, hedef) { K.geri = { r: hedef.r, c: hedef.c, t: 0 }; K.err = 0.9; Ses.cal('geri', { ses: 0.6 }); }
// dokunma: seç / seçiliyi buraya taşı · joker · hatayı bul turunda fazla kelimeyi işaretle
function dokun(h) {
  const R = G.R, T = G.T; if (!R || !T || !R.tahtaHazir || R.bitti || G.state !== 'playing') return;
  const K = T.h[h.r][h.c]; if (!K) return;
  if (G.jokerHazir && !K.kilit) { jokerKullan(K); return; }
  if (tahtaMesgul()) return;
  if (R.tip === 'sav' && K.kilit) {
    if (G.secili) { const s = G.secili; G.secili = null; hamle(s, h); return; }
    if (R.m.tip === 'sira') { G.secili = { r: h.r, c: h.c }; Ses.cal('al', { ses: 0.5 }); return; }
    if (!R.duzelt) { savSil(K); return; }
    const p = karoMerkez(K);
    popup(tt('Doğru karoyu sürükleyip yanlışın üstüne bırak'), p.x, p.y - T.ch * 0.8, '#ffcf8a', Math.round(L.bh * 0.5), 1.4);
    return;
  }
  if (G.secili) { const s = G.secili; G.secili = null; if (s.r === h.r && s.c === h.c) return; hamle(s, h); return; }
  if (K.kilit) return;
  G.secili = { r: h.r, c: h.c }; Ses.cal('al', { ses: 0.5 });
}
function karoMerkez(K) { return hucreMerkez(K.r, K.c, K.span); }

/* ---------------- doğru ve yanlış yerleştirme ---------------- */
function dogruYerlesti(R, kazanc) {
  const z = R.zincir, need = hedefDizi(R), T = G.T, harf = R.hedef.tur === 'harf';
  const K = T.h[z.r][z.c0 + z.k - 1], p = karoMerkez(K);
  K.parla = 1.2;
  if (R.nazik) {   // yeni kelime tanışması: puansız, sayaçsız
    ring(p.x, p.y, '#3dff7a', 6, T.cw, 0.45, 3); Ses.cal('kes', { ses: 0.5 }); Ses.nota(z.k, 0.4);
    return;
  }
  for (let i = z.k - kazanc; i < z.k; i++) { D.istat.dogru++; Olay.yay('dogruHamle', { tip: R.tip, kelime: need[i] }); }
  addCombo();
  const m = mult(), pts = addScore(Math.round((harf ? 20 : 50) * (D.li + 1) * m * kazanc), p.x, p.y);
  ring(p.x, p.y, KARO_RENK[K.ci], 8, Math.max(40, T.cw), 0.55, 4); ring(p.x, p.y, '#ffffff', 4, 30, 0.3, 2);
  sparkBurst(p.x, p.y, KARO_RENK[K.ci], 24, 260, 0.6); sparkBurst(p.x, p.y, '#d8ff3a', 10, 180, 0.45, 'dot');
  popup('+' + pts + (m > 1 ? '  x' + m : ''), p.x, p.y - T.ch * 0.7, KARO_RENK[K.ci], Math.round(L.bh * 0.66));
  if (!harf) { const an = anlamBul(need[z.k - 1]); if (an) popup(need[z.k - 1] + ' = ' + an, p.x, p.y + T.ch * 0.75, '#d8ff3a', Math.round(L.bh * 0.5), 1.8, -22); }
  Ses.cal('kes', { ses: 0.75 }); Ses.nota(G.combo, 0.5);
  if (!R.ilkSpiker && R.tip === 'kur' && z.k < need.length) { R.ilkSpiker = true; Ses.spiker(1); }
}
function yanlisYerlesti(R, A, z, b) {
  const need = hedefDizi(R), k = z.k, dogru = need[k], uc = hucreMerkez(b.r, b.c);
  geriSek(A, b);
  const yer = { x: uc.x, y: uc.y, txt: A.txt };
  if (R.nazik) { popup(tt('SIRADAKİ HARF: {h}', { h: dogru }), uc.x, uc.y - G.T.ch * 0.8, '#9ff0c8', Math.round(L.bh * 0.55), 1.4); ipucuGoster(R, 2.5); return; }
  if (R.tip === 'kur') {
    let mesaj, kr;
    const j = need.findIndex((x, i) => i !== k && x === A.txt && i >= k);
    if (j >= 0) { mesaj = tt('SIRA HATASI!'); kr = tt('"{k}" bu cümlede var ama burada değil: {n}. kelime. Buraya "{d}" gelir.', { k: A.txt, n: j + 1, d: dogru }); }
    else {
      const s = R.s, k2 = s.w[k].indexOf(A.txt) > 0 ? k : s.w.findIndex((o, i) => i >= k && (o[1] === A.txt || o[2] === A.txt));
      mesaj = tt('YANLIŞ KELİME!');
      kr = k2 >= 0 ? kural(need, k2, need[k2], A.txt, s.c[k2]) : tt('"{k}" bu cümleye girmez.', { k: A.txt });
    }
    hataYap(yer, mesaj, kr);
    cumleHataKaydi(R, A.txt, dogru, kr);
    return;
  }
  // harf
  const yazi = (need.slice(0, k).join('') + A.txt).toLocaleLowerCase(R.hedef.dil === 'tr' ? 'tr-TR' : 'en-US');
  hataYap(yer, tt('YANLIŞ HARF!'), tt('{n}. harf "{h}" değil.', { n: k + 1, h: A.txt }));
  testHatasi(yazi);
  if (D.st && G.R === R && !R.bitti) testBitir(false);
}

/* ---------------- parça / cümle tamam: dizi patlar ---------------- */
function zincirKarolari(R) { const T = G.T, z = R.zincir, o = []; if (z) for (let i = 0; i < z.k; i++) o.push(T.h[z.r][z.c0 + i]); return o; }
function karoPatlat(K, gecikme, stil) {
  const T = G.T; if (!T || T.h[K.r][K.c] !== K) return;
  T.h[K.r][K.c] = null;
  const p = karoMerkez(K);
  PATLAYAN.push({ k: K, x: p.x, y: p.y, t: -(gecikme || 0), stil: stil || 'pop', w: T.cw * (K.span || 1), h: T.ch });
}
function parcaTamam(R) {
  const T = G.T, z = R.zincir, h = R.hedef, liste = zincirKarolari(R);
  if (R.tip === 'kur') { cumleBitti(liste); return; }
  liste.forEach((K, i) => karoPatlat(K, i * 0.05, 'altin'));
  const ilk = karoMerkez(liste[0]), son = karoMerkez(liste[liste.length - 1]);
  Ses.cal('pop', { ses: 0.7 }); sonra(0.12, () => Ses.cal('bitirici', { ses: 0.5 }));
  if (h.pi < h.parcalar.length - 1) {   // öbeğin sıradaki kelimesi
    popup(h.parcalar[h.pi].yazi + ' ✔', (ilk.x + son.x) / 2, ilk.y - T.ch * 0.6, '#3dff7a', Math.round(L.bh * 0.75), 1.3);
    h.pi++; R.zMax = 0; R.capa = null; R.sonKaro = null;
    zincirYenile(R); kaskadBaslat();
    return;
  }
  R.zincir = null;
  if (R.tip === 'tanis') tanisYerlestir(); else testDogru((ilk.x + son.x) / 2, ilk.y);
  kaskadBaslat();
}

/* ---------------- renk eşleşmesi, yerçekimi, yeni karolar ---------------- */
function renkliMi(k) { return !!k && !k.kilit && !k.zincir && k.ci >= 0; }
function renkGruplari(T) {
  const kosu = [];
  const tara = (uz, al) => {
    for (let a = 0; a < uz[0]; a++) {
      let bas = 0;
      for (let b = 1; b <= uz[1]; b++) {
        const k0 = al(a, bas), k1 = b < uz[1] ? al(a, b) : null;
        if (b < uz[1] && renkliMi(k0) && renkliMi(k1) && k0.ci === k1.ci) continue;
        if (b - bas >= 3 && renkliMi(k0)) { const l = []; for (let i = bas; i < b; i++) l.push(al(a, i)); kosu.push(l); }
        bas = b;
      }
    }
  };
  tara([T.rows, T.cols], (r, c) => T.h[r][c]);
  tara([T.cols, T.rows], (c, r) => T.h[r][c]);
  return kosu;
}
function renkPatlat(T, kosular) {
  const set = new Set(), say = new Map();
  let superRenk = -1;
  kosular.forEach(l => { l.forEach(k => { set.add(k); say.set(k, (say.get(k) || 0) + 1); }); if (l.length >= 5) superRenk = l[0].ci; });
  say.forEach((n, k) => { if (n > 1) superRenk = k.ci; });   // L / T biçimi
  // SÜPER PATLAMA: o renkteki bütün serbest karolar
  if (superRenk >= 0) karolar(T, k => renkliMi(k) && k.ci === superRenk).forEach(k => set.add(k));
  T.dalga++;
  let mx = 0, my = 0;
  [...set].forEach((K, i) => { const p = karoMerkez(K); mx += p.x; my += p.y; karoPatlat(K, i * 0.012, 'renk'); sparkBurst(p.x, p.y, KARO_RENK[K.ci], 10, 240, 0.5); });
  mx /= set.size; my /= set.size;
  const carpan = D ? D.li + 1 : 1, pts = set.size * 20 * T.dalga * carpan;
  if (D) addScore(pts, mx, my);
  G.bombaDolum += set.size * 0.025 + (superRenk >= 0 ? 0.08 : 0);
  const f = Math.round(L.bh * 0.8);
  if (superRenk >= 0) { popup(tt('SÜPER PATLAMA!'), mx, my - f, '#ffd23d', Math.round(f * 1.2), 1.5); Ses.cal('super', { ses: 0.8 }); G.shake = Math.max(G.shake, 7); firework(mx, my, KARO_RENK[superRenk]); }
  if (T.dalga >= 2) { popup(tt('ZİNCİRLEME KOMBO!'), mx, my - f * 0.2, '#3dff7a', f, 1.4); popup(tt('KOMBO x{n}', { n: T.dalga + 1 }), mx, my + f * 0.9, '#ffffff', Math.round(f * 0.9), 1.4); Ses.cal('zincir', { ses: 0.7, hiz: 1 + T.dalga * 0.06 }); }
  else if (superRenk < 0) popup(tt('POP!'), mx, my - f * 0.3, KARO_RENK[[...set][0].ci], f, 1.1);
  popup('+' + pts, mx, my + f * 1.8, '#ffe066', Math.round(f * 0.7), 1.2);
  Ses.cal('pop', { ses: 0.8, hiz: 1 + Math.min(4, T.dalga) * 0.05 });
}
// sütunlarda karolar aşağı düşer; sabit hücreler (hatalı cümle, etkin dizi) zemin gibidir
function yercekimi(T) {
  for (let c = 0; c < T.cols; c++) {
    let r = T.rows - 1;
    while (r >= 0) {
      if (sabitHucre(T, r, c)) { r--; continue; }
      const alt = r; let ust = r; while (ust - 1 >= 0 && !sabitHucre(T, ust - 1, c)) ust--;
      const liste = []; for (let q = alt; q >= ust; q--) if (T.h[q][c]) liste.push(T.h[q][c]);
      for (let q = alt; q >= ust; q--) T.h[q][c] = null;
      liste.forEach((k, i) => { if (k.r !== alt - i) k.dus = true; hucreKoy(T, k, alt - i, c); });
      r = ust - 1;
    }
  }
}
function doldur(T) {
  const bos = serbestHucreler(T); if (!bos.length) return;
  const metin = yeniMetinler(G.R, bos.length), sutun = {};
  bos.sort((a, b) => b.r - a.r).forEach((h, i) => {
    const k = karoYap(metin[i], -1); hucreKoy(T, k, h.r, h.c);
    k.ci = guvenliRenk(T, h.r, h.c);
    const p = hucreMerkez(h.r, h.c); k.x = p.x;
    // üst bölüm: tahtanın üstünden düşer · sabit hücrenin altında kalan bölüm: yerinde belirir
    let acik = true; for (let q = 0; q < h.r; q++) if (sabitHucre(T, q, h.c)) acik = false;
    if (acik) { sutun[h.c] = (sutun[h.c] || 0) + 1; k.y = T.y - sutun[h.c] * T.ch; k.dus = true; }
    else { k.y = p.y; k.olcek = 0; k.buyu = true; }
  });
  Ses.cal('dus', { ses: 0.45 });
}
function kaskadBaslat() { const T = G.T; if (!T) return; T.kaskad = true; }
// engine, tahtadaki hareket bitince çağırır: boşluk varsa düşür ve doldur, renk eşleşmesi varsa patlat, yoksa dur
function kaskadAdim() {
  const T = G.T, R = G.R; if (!T) return;
  if (R) zincirYenile(R);
  if (serbestHucreler(T).length) { yercekimi(T); doldur(T); return; }
  const g = renkKapali(R) ? [] : renkGruplari(T);
  if (g.length) { renkPatlat(T, g); return; }
  T.kaskad = false; T.dalga = 0;
  // hedefin tamamlanması için tahtada eksik kalan karo varsa (öbeğin sıradaki kelimesi, patlayan karo) yukarıdan getirilir
  if (R && !R.bitti && R.tahtaHazir && G.state === 'playing') { const e = eksikGerekenler(R); if (e.length && eksikleriGetir(R, e)) { T.kaskad = true; return; } }
  // düşen ya da yukarıdan gelen karo diziyi uzatmış olabilir: sayılır, dizi tamamsa patlar
  if (R && R.hedef && !R.bitti && R.tahtaHazir && G.state === 'playing') {
    const k = R.zincir ? R.zincir.k : 0;
    if (k > R.zMax) { const kazanc = k - R.zMax; R.zMax = k; dogruYerlesti(R, kazanc); }
    if (R.zincir && R.zincir.k === hedefDizi(R).length) { parcaTamam(R); return; }
  }
  bombaKontrol();
}
// eksik hedef karoları: en üst satırdaki gereksiz karolar küçük bir patlamayla yer açar, yerine eksik karo yukarıdan düşer
function eksikleriGetir(R, eksik) {
  const T = G.T, koru = R.hedef ? hedefDizi(R) : [R.duzelt];
  let n = 0;
  eksik.forEach(txt => {
    const aday = karolar(T, k => !k.kilit && !k.zincir && !k.dus && koru.indexOf(k.txt) < 0);
    if (!aday.length) return;
    const ust = Math.min(...aday.map(k => k.r)), eski = pick(aday.filter(k => k.r === ust));
    karoPatlat(eski, 0, 'kucuk');
    const k = karoYap(txt, -1); hucreKoy(T, k, eski.r, eski.c); k.ci = guvenliRenk(T, eski.r, eski.c);
    const p = karoMerkez(k); k.x = p.x; k.y = T.y - T.ch * (1.2 + n * 0.4); k.dus = true; n++;
  });
  if (n) Ses.cal('dus', { ses: 0.5 });
  return n;
}
function renkKapali(R) { return !R || !D || !!D.ilkCumle; }
// bazı turlarda tahtada eksik başlayan karo birkaç saniye sonra yukarıdan iner
function bekleyenTik(dt) {
  const R = G.R, T = G.T; if (!R || !T || R.bitti || !R.tahtaHazir || !R.bekleyen || !R.bekleyen.length) return;
  const b = R.bekleyen[0]; b.t -= dt;
  if (b.t > 0 || tahtaMesgul()) return;
  R.bekleyen.shift();
  const need = hedefDizi(R);
  const adaylar = karolar(T, k => !k.kilit && !k.zincir && need.indexOf(k.txt) < 0);
  const ust = adaylar.filter(k => k.r === Math.min(...adaylar.map(q => q.r)));
  const eski = pick(ust.length ? ust : adaylar); if (!eski) return;
  karoPatlat(eski, 0, 'kucuk');
  const k = karoYap(b.txt, -1); hucreKoy(T, k, eski.r, eski.c); k.ci = guvenliRenk(T, eski.r, eski.c);
  const p = karoMerkez(k); k.x = p.x; k.y = T.y - T.ch * 1.2; k.dus = true; k.parla = 1.5;
  popup(tt('YENİ KARO!'), p.x, T.y + T.ch * 0.3, '#9ff6ff', Math.round(L.bh * 0.5), 1.1);
  Ses.cal('dus', { ses: 0.6 }); Ses.cal('kelime', { ses: 0.3, hiz: 1.2 });
  kaskadBaslat();   // karo oturunca dizi yeniden denetlenir
}

/* ---------------- süre ---------------- */
// tur süresi: oyuncu isteğiyle 3 katı (ör. 5 kelimelik A1 cümlesi 47 → 141 sn, 6 harfli kelime 26 → 78 sn)
const SURE_KAT = 3;
function sureHesapla(R) {
  if (D.ilkCumle || R.tip === 'tanis') return 0;
  const li = D.li; let s;
  if (R.tip === 'kur') s = 12 + hedefDizi(R).length * clamp(7 - li * 0.5, 4.2, 7);
  else if (R.tip === 'sav') s = 14 + R.m.tokens.length * 1.6;
  else s = 9 + hedefTumu(R).length * clamp(2.8 - li * 0.15, 1.9, 2.8);
  return Math.round(s * (D.hizKat || 1) * SURE_KAT);
}
function sureTik(dt) {
  const R = G.R; if (!R || R.bitti || !R.tahtaHazir || !R.sure || (typeof dzAcik !== 'undefined' && dzAcik)) return;
  R.sureKalan -= dt * (G.slowT > 0 ? 0.45 : 1);
  const s = Math.ceil(R.sureKalan);
  if (s <= 5 && s > 0 && s !== R.sureUyari) { R.sureUyari = s; Ses.cal('saat', { ses: 0.5, hiz: s <= 2 ? 1.25 : 1 }); }
  if (R.sureKalan <= 0) sureDoldu(R);
}
function sureDoldu(R) {
  const T = G.T, yer = { x: T.x + T.cols * T.cw / 2, y: T.y + T.rows * T.ch * 0.35, txt: '' };
  if (R.tip === 'sav') { savKacirdi(R, null, null, true); return; }
  const need = hedefDizi(R), dogru = need[R.zincir ? R.zincir.k : 0];
  if (R.tip === 'kur') { const kr = tt('Sıradaki kelime: "{d}"', { d: dogru }); hataYap(yer, tt('SÜRE DOLDU!'), kr, '#ff9a3c'); cumleHataKaydi(R, '(süre doldu)', dogru, kr); }
  else {
    hataYap(yer, tt('SÜRE DOLDU!'), tt('Sıradaki harf: "{d}"', { d: dogru }), '#ff9a3c'); testHatasi('(süre doldu)');
    if (D.st) { testBitir(false); return; }
  }
  if (G.state !== 'playing') return;   // gösterge doldu
  R.sureKalan = R.sure * 0.5; R.sureUyari = 0;
  ipucuGoster(R, 3.5);
}

/* ---------------- ipucu: sıradaki doğru hamle (koç, süre dolunca, test botu) ---------------- */
function enYakin(liste, h) { let best = null, bd = 1e9; liste.forEach(k => { const d = Math.abs(k.r - h.r) * 1.2 + Math.abs(k.c - h.c); if (d < bd) { bd = d; best = k; } }); return best; }
function konum(k) { return { r: k.r, c: k.c }; }
function ipucuHamle(R) {
  const T = G.T; if (!R || !T || !R.tahtaHazir || R.bitti) return null;
  if (R.tip === 'sav') {
    const m = R.m, hedef = R.kilitKarolar.find(k => k.idx === m.idx); if (!hedef) return null;
    if (m.tip === 'sira') { const k2 = R.kilitKarolar.find(k => k.idx === m.idx2); return k2 ? { a: konum(hedef), b: konum(k2) } : null; }
    if (!R.duzelt) return { dokun: konum(hedef) };
    const A = karolar(T, k => !k.kilit && k.txt === R.duzelt)[0];
    return A ? { a: konum(A), b: konum(hedef) } : null;
  }
  const need = hedefDizi(R), n = need.length, z = R.zincir;
  if (z) {
    const uc = { r: z.r, c: z.c0 + z.k };
    const A = enYakin(karolar(T, k => !k.kilit && !k.zincir && k.txt === need[z.k] && !(k.r === uc.r && k.c === uc.c)), uc);
    return A ? { a: konum(A), b: uc } : null;
  }
  const ilkler = karolar(T, k => !k.kilit && k.txt === need[0]);
  if (!ilkler.length) return null;
  const gecerli = ilkler.filter(k => k.c + n <= T.cols);
  if (gecerli.length && n >= 2) {
    for (const w0 of gecerli) {
      const hedef = { r: w0.r, c: w0.c + 1 }, A = enYakin(karolar(T, k => !k.kilit && k !== w0 && k.txt === need[1]), hedef);
      if (A) return { a: konum(A), b: hedef };
    }
    return null;
  }
  const w0 = gecerli[0] || ilkler[0];
  if (n === 1) return { a: konum(w0), b: { r: w0.r, c: w0.c > 0 ? w0.c - 1 : w0.c + 1 } };
  return { a: konum(w0), b: { r: w0.r, c: Math.min(w0.c, T.cols - n) } };
}
// test botu ve kaybetme denemesi için: dizinin sonuna yanlış karo
function yanlisHamle(R) {
  const T = G.T; if (!R || !T || !R.tahtaHazir || R.bitti) return null;
  if (R.tip === 'sav') {
    const m = R.m, diger = R.kilitKarolar.find(k => k.idx !== m.idx && k.idx !== m.idx2);
    const A = karolar(T, k => !k.kilit)[0];
    return diger && A ? { a: konum(A), b: konum(diger) } : null;
  }
  const z = R.zincir, need = hedefDizi(R); if (!z) return null;
  const uc = { r: z.r, c: z.c0 + z.k }, A = enYakin(karolar(T, k => !k.kilit && !k.zincir && k.txt !== need[z.k] && !(k.r === uc.r && k.c === uc.c)), uc);
  return A ? { a: konum(A), b: uc } : null;
}
function ipucuGoster(R, sure) { const h = ipucuHamle(R); if (h) G.ipucu = { h, t: sure || 3, R }; }

/* =====================================================================
   HATALAR VE DÜZELTME
   ===================================================================== */
function duzeltme(metin, ok, sure) { if (!metin) return; G.duz = { metin, ok: !!ok, t: sure || 4.5, max: sure || 4.5 }; }
function hataKaydet(o) {
  if (!D) return;
  const key = (o.en || '') + '|' + (o.yanlis || '') + '|' + (o.w ? o.w.k : '');
  if (!D.hatalar.some(h => h.key === key)) { o.key = key; D.hatalar.push(o); }
}
// yer: { x, y, txt } · her hata göstergeye bir dilim ekler
function hataYap(yer, mesaj, kuralMetni, renk) {
  const R = G.R;
  R.hata++; D.istat.yanlis++;
  Olay.yay('hata', { tip: R.tip, kelime: yer.txt || '', mesaj, kural: kuralMetni || '' });
  popup(mesaj, yer.x, yer.y - L.bh, renk || '#ff4d5e', Math.round(L.bh * 0.7), 1.5, -30);
  if (kuralMetni) duzeltme(kuralMetni, false);
  breakCombo();
  Ses.cal('yanlis', { ses: 0.9 }); Ses.bogul(420, 0.05, 0.8);
  G.shake = Math.max(G.shake, 6); G.flash = 0.22; G.flashCol = '#ff2040';
  gostergeEkle(1);
}
function gostergeEkle(n) {
  if (!D || D.ilkCumle || D.st) return;   // rehberli ilk cümlede ve seviye testinde gösterge yok
  G.hata = clamp(G.hata + n, 0, HATA_MAX);
  if (n > 0 && G.hata >= HATA_MAX) gameOver();
}
function cumleHataKaydi(R, yanlis, dogru, kr) {
  if (!R.hataKayit) { R.hataKayit = true; if (!D.st && !D.antrenman) srsHata({ tur: 'cumle', r: R.kaynak, i: R.s.i }); else if (D.antrenman) srsHata({ tur: 'cumle', r: R.kaynak, i: R.s.i }); kaydet(); }
  hataKaydet({ tip: 'cumle', en: R.s.en, tr: R.s.tr, yanlis, dogru, kural: kr });
}
function savHataKaydi(m) {
  if (m.tip !== 'eslesme' && m.tip !== 'yazim') srsHata({ tur: 'hata', m });
  kaydet();
  hataKaydet({ tip: 'sav', en: m.dogruCumle, tr: m.tr, yanlis: m.tokens[m.idx], dogru: m.dogru, kural: m.kural });
}
function testHatasi(txt) {
  const R = G.R;
  if (!D.st) { if (D.kelime) D.kelime.hatali[R.w.k] = 1; kelHata(R.w); kaydet(); }
  hataKaydet({ tip: 'kelime', w: R.w, yanlis: txt });
}

/* ---------------- cümle tamam ---------------- */
function cumleBitti(liste) {
  const R = G.R, s = R.s, temiz = R.hata === 0, T = G.T;
  R.bitti = true; D.istat.cumle++; if (temiz) D.istat.kusursuz++;
  Olay.yay('cumleTamam', { kusursuz: temiz, en: s.en });
  if (R.tekrar && temiz) { srsDogru(R.tekrar); if (D.antrenman) D.antrenman.hatirlanan++; }
  kaydet();
  // cümle soldan sağa sırayla patlar: POP! KOMBO
  liste.forEach((K, i) => { karoPatlat(K, i * 0.06, 'altin'); const p = karoMerkez(K); sonra(i * 0.06, () => { sparkBurst(p.x, p.y, '#ffd23d', 16, 300, 0.6); ring(p.x, p.y, '#fff1b8', 6, T.cw, 0.4, 3); }); });
  R.zincir = null; karolar(T).forEach(k => { k.zincir = 0; });
  const a = karoMerkez(liste[0]), b = karoMerkez(liste[liste.length - 1]), mx = (a.x + b.x) / 2, my = a.y;
  G.sweep = 0; addScore(1000 + (temiz ? 500 : 0), mx, my);
  banner(tt(temiz ? 'KUSURSUZ CÜMLE!' : 'CÜMLE TAMAM!'), s.en, '#ffd23d', 2.4);
  popup(tt('POP!'), mx, my - T.ch * 0.9, '#ff6bd5', Math.round(L.bh * 1.2), 1.3);
  popup(tt('KOMBO x{n}', { n: liste.length }), mx, my - T.ch * 0.1, '#ffe066', Math.round(L.bh * 0.85), 1.4);
  popup('+1000' + (temiz ? ' +500' : ''), mx, my + T.ch * 0.8, '#ffe066', Math.round(L.bh * 0.9), 1.8, -30);
  starFan(mx, my);
  G.bombaDolum += 0.2 + (temiz ? 0.1 : 0);
  // tamamlanan cümle göstergeyi bir dilim, hatasız cümle iki dilim boşaltır
  if (G.hata > 0) { gostergeEkle(temiz ? -2 : -1); popup(tt(temiz ? 'KUSURSUZ: GÖSTERGE RAHATLADI' : 'GÖSTERGE RAHATLADI'), L.gauge.x + 70, L.gauge.y + L.gauge.h * 0.6, '#9dffbf', Math.round(L.bh * 0.5), 1.4); }
  Ses.cal('damga', { ses: 0.8 }); Ses.cal('pop', { ses: 0.9 });
  liste.forEach((z, i) => Ses.nota(i, 0.42, 0.1 + i * 0.07));
  Ses.cal('bitirici', { ses: 0.6, gecikme: 0.12 + liste.length * 0.07 });
  Ses.spiker(2, { oncelik: true });
  kaskadBaslat();
  if (D.online) {
    // online: bitiş anı cümlenin tamamlandığı an; İngilizce okumayı beklemek telefonlar arasında süre farkı yaratırdı
    if (D.online.i >= D.online.liste.length) onlineBitir('tamam'); else sonra(1.6, sonrakiTur);
  } else if (dizilisAcikMi() && !D.st) {
    // İngilizce dizilişi kartı (dizilis.js): kutlamadan sonra açılır; oyun kart kapanana kadar bekler (dokununca)
    const devam = birKez(() => sonra(0.3, sonrakiTur));
    sonra(1.3, () => dizilisGoster(s, devam));
  } else {
    const devam = birKez(() => sonra(0.4, sonrakiTur));
    sonra(2.1, devam);
  }
  const srcs = [{ x: L.in.x + 10, y: L.in.y + L.in.h }, { x: L.in.x + L.in.w - 10, y: L.in.y + L.in.h }];
  const cols = ['#ffd23d', '#19f0ff', '#ff3df2', '#3dff7a'];
  [0.05, 0.3, 0.6, 0.9].forEach((t, i) => sonra(t, () => { const p = srcs[i % 2]; rocket(p.x, p.y - 10, rnd(L.in.x + 20, L.in.x + L.in.w - 20), rnd(L.in.y + 10, L.in.y + L.in.h * 0.4), cols[i]); }));
}

/* ---------------- hatayı bul turu ---------------- */
// serbest karo (A) sabit karonun (B) üstüne bırakıldı ya da sabit karolar yer değiştirdi (sıra hatası)
function savHamle(A, B, a, b) {
  const R = G.R, m = R.m, T = G.T;
  if (A.kilit) {
    if (m.tip !== 'sira' || !B || !B.kilit) return false;
    const ikili = [A.idx, B.idx].sort().join(), dogru = [m.idx, m.idx2].sort().join();
    if (ikili === dogru) savustur(null, B); else savKacirdi(R, B, null);
    return true;
  }
  if (B && B.kilit) {
    if (!R.duzelt) { const p = karoMerkez(B); popup(tt(m.tip === 'sira' ? 'Yer değiştirecek iki kelimeyi birbirinin üstüne kaydır' : 'Fazla kelimeye dokun'), p.x, p.y - T.ch * 0.8, '#ffcf8a', Math.round(L.bh * 0.5), 1.4); geriSek(A, b); return true; }
    if (B.idx === m.idx && A.txt === R.duzelt) { savustur(A, B); return true; }
    if (B.idx === m.idx) {   // yeri doğru, düzeltme yanlış: tekrar denenir
      geriSek(A, b); const p = karoMerkez(B);
      hataYap({ x: p.x, y: p.y, txt: A.txt }, tt('YANLIŞ DÜZELTME!'), tt('Yeri doğru ama doğrusu "{k}" değil.', { k: A.txt }));
      return true;
    }
    savKacirdi(R, B, A); return true;
  }
  if (!B || T.kilitli[b.r][b.c]) return false;
  degistir(T, a, b); Ses.cal('kay', { ses: 0.55 }); kaskadBaslat();
  return true;
}
// fazla kelime: yanlış karoya dokunulur
function savSil(K) { const R = G.R; if (K.idx === R.m.idx) savustur(null, K); else savKacirdi(R, K, null); }
// kaçırdın (yanlış yer ya da süre doldu): doğrusu ve kuralı gösterilir, tur biter
function savKacirdi(R, B, A, sureDoldu) {
  const m = R.m, hedef = R.kilitKarolar.find(k => k.idx === m.idx), T = G.T;
  if (B) B.err = 0.9;
  if (A) geriSek(A, { r: B.r, c: B.c });
  if (hedef) hedef.hint = 3;
  const p = B ? karoMerkez(B) : { x: T.x + T.cols * T.cw / 2, y: T.y + T.rows * T.ch * 0.4 };
  hataYap({ x: p.x, y: p.y, txt: B ? B.txt : '' }, tt(sureDoldu ? 'SÜRE DOLDU!' : 'KAÇIRDIN!'), tt('Hatalı olan: "{k}" → {d}. ', { k: m.tokens[m.idx], d: m.dogru ? '"' + m.dogru + '"' : tt('(silinmeli)') }) + (m.kural || ''));
  savHataKaydi(m);
  if (G.R !== R) return;
  R.bitti = true; D.istat.sav++;
  sonra(1.2, () => { if (G.R === R) savDuzelt(R); });
  sonra(3.2, sonrakiTur);
}
// sabit satırda doğrusu gösterilir (yeşil)
function savDuzelt(R) {
  const m = R.m, ks = R.kilitKarolar, hedef = ks.find(k => k.idx === m.idx); if (!hedef) return;
  if (m.tip === 'sira') { const k2 = ks.find(k => k.idx === m.idx2); if (k2) { const t = hedef.txt; hedef.txt = k2.txt; k2.txt = t; k2.dogru = true; k2.parla = 1.2; } hedef.dogru = true; }
  else if (m.dogru) { hedef.txt = m.dogru; hedef.dogru = true; }
  else hedef.sil = true;
  hedef.parla = 1.2;
}
function savustur(A, B) {
  const R = G.R, m = R.m, T = G.T;
  R.bitti = true; D.istat.sav++; D.istat.savOk++; D.istat.dogru++;
  Olay.yay('dogruHamle', { tip: R.tip, kelime: A ? A.txt : B.txt }); Olay.yay('hataBulundu', { kelime: m.tokens[m.idx] });
  addCombo();
  const p = karoMerkez(B);
  const pts = addScore(Math.round(300 * mult()), p.x, p.y);
  if (A) karoPatlat(A, 0, 'altin');
  shards(p.x, p.y, T.cw, T.ch, '#ff3048', 20); sparkBurst(p.x, p.y, '#ffffff', 26, 340, 0.7); ring(p.x, p.y, '#3dff7a', 8, 80, 0.5, 4);
  savDuzelt(R);
  banner(tt('HATAYI BULDUN!'), '+' + pts, '#3dff7a', 1.4);
  duzeltme((m.kural || '') + (m.dogruCumle ? '  ✔ ' + m.dogruCumle : ''), true, 3.2);
  Ses.cal('savustur', { ses: 0.9 }); Ses.cal('pop', { ses: 0.7 }); Ses.nota(G.combo, 0.5);
  const sp = Ses.spiker(3, { oncelik: true });
  const devam2 = birKez(() => sonra(0.4, sonrakiTur));
  sonra(sp ? 1.6 : 1.4, devam2);
  if (m.tekrar) { srsDogru(m.tekrar); if (D.antrenman) D.antrenman.hatirlanan++; kaydet(); }
  kaskadBaslat();
}

/* ---------------- kelime sorusu ve tanışma ---------------- */
function testDogru(x, y) {
  const R = G.R, temiz = R.hata === 0;
  R.cevaplandi = true;
  const pts = temiz ? addScore(Math.round(100 * (D.li + 1) * mult()), x, y) : 0;
  if (pts) popup('+' + pts, x, y - G.T.ch, '#ffe066', Math.round(L.bh * 0.8), 1.4);
  if (temiz && G.hata > 0 && !D.st) { gostergeEkle(-1); popup(tt('GÖSTERGE RAHATLADI'), L.gauge.x + 70, L.gauge.y + L.gauge.h * 0.6, '#9dffbf', Math.round(L.bh * 0.5), 1.4); }   // hatasız soru
  sparkBurst(x, y, '#3dff7a', 30, 320, 0.7); ring(x, y, '#3dff7a', 8, G.T.cw * 2, 0.5, 4);
  testBitir(temiz);
}
function testBitir(temiz) {
  const R = G.R, it = R.it, w = R.w, kq = D.kelime;
  if (R.bitti) return;
  R.bitti = true; R.cevaplandi = true;
  D.istat.test++; if (temiz) D.istat.testOk++;
  Olay.yay('soruBitti', { temiz, kelime: w && w.k });
  if (kq) {
    if (temiz) {
      kq.dogru[w.k] = (kq.dogru[w.k] || 0) + 1;
      if (kq.yeniSet[w.k]) { if (kq.dogru[w.k] >= 2 && !kq.hatali[w.k] && kayit.kel[w.k] && kayit.kel[w.k][0] < 2) kelDogru(w, true); }
      else if (!kq.hatali[w.k]) kelDogru(w, false);
    } else kq.kuyruk.splice(Math.min(kq.kuyruk.length, kq.i + 2), 0, { tip: it.tip === 'ters' ? 'anlam' : it.tip, w, tekrar: true });
    if (kq.gorulen.indexOf(w) < 0) kq.gorulen.push(w);
  } else if (D.antrenman) { if (temiz) { kelDogru(w, true); D.antrenman.hatirlanan++; } }
  else if (D.st) stCevap(it, temiz);
  kaydet();
  // sonuç: kelime = anlam
  R.prompt = Object.assign({}, R.prompt, { ust: tt(temiz ? '✔ DOĞRU' : '✘ DOĞRUSU'), ana: w.en + ' = ' + w.tr, alt: w.pos, sonuc: temiz ? 'ok' : 'hata', buyuk: false, kart: false, dinle: false, tr: false, en: false, ilerleme: false });
  zincirYenile(R);
  const sp3 = temiz && G.combo > 0 && G.combo % 3 === 0 ? Ses.spiker(3) : false;
  if (temiz && G.combo >= 3 && G.combo % 3 === 0) banner('x' + G.combo, tt('Kelime serisi'), '#ffd98a', 1.1);
  sonra(D.st ? (temiz ? 0.9 : 1.4) : sp3 ? 2.8 : temiz ? 1.4 : 2, sonrakiTur);
}
function tanisYerlestir() {
  const R = G.R, T = G.T;
  R.bitti = true;
  Olay.yay('kelimeTanisildi', { kelime: R.w.en });
  popup(tt('YENİ KELİME'), T.x + T.cols * T.cw / 2, T.y + T.ch * 0.5, '#9ff0c8', Math.round(L.bh * 0.75), 1.4);
  Ses.cal('kelime', { ses: 0.5, hiz: 1.335 });
  sonra(0.9, sonrakiTur);
}

/* ---------------- kombo, öfke ve güçler ---------------- */
const KOMBO_KADEME = { 3: ['GÜZEL!', '#bff7dd'], 5: ['HARİKA!', '#9fe0ff'], 8: ['MUHTEŞEM!', '#ffd98a'], 10: ['ATEŞ MODU!', '#ff8a2a'], 15: ['DURDURULAMAZ!', '#ff6b9a'], 20: ['EFSANE!', '#c99bff'], 30: ['TANRISAL!', '#ffffff'] };
const mult = () => G.ofke ? 4 : G.combo >= 8 ? 3 : G.combo >= 5 ? 2 : G.combo >= 3 ? 1.5 : 1;
function addCombo() {
  G.combo++; G.comboPulse = 1; if (D) D.enKombo = Math.max(D.enKombo || 0, G.combo);
  Olay.yay('kombo', { n: G.combo });
  const kd = KOMBO_KADEME[G.combo];
  if (kd) { popup(tt(kd[0]), L.in.x + L.in.w / 2, L.in.y + L.in.h * 0.3, kd[1], Math.round(L.bh * 0.85), 1.3); Ses.cal('yukselis', { ses: 0.55 }); }
  if (G.combo === 10 && !G.ofke && !(D && D.st)) { G.ofke = true; banner(tt('ATEŞ MODU!'), tt('Puanlar x4 · ilk hataya kadar'), '#ff8a2a', 1.6); Ses.cal('ko', { ses: 0.6 }); }
  Ses.yogunluk(G.ofke ? 3 : G.combo >= 6 ? 2 : G.combo >= 3 ? 1 : 0);
  if (G.combo % 6 === 0 && !(D && D.st)) awardPower();
}
function breakCombo() {
  if (G.combo >= 3) popup(tt('SERİ BİTTİ'), L.in.x + L.in.w / 2, L.in.y + L.in.h * 0.3, '#ff7a8a', Math.round(L.bh * 0.55), 1);
  if (G.combo > 0) Olay.yay('komboBitti', { n: G.combo });
  G.combo = 0; G.ofke = false; Ses.yogunluk(0);
}
function awardPower() {
  const order = ['slows', 'jokers', 'bombs'], names = { slows: '+1 YAVAŞLAT', jokers: '+1 JOKER', bombs: '+1 CÜMLE BOMBASI' }, ui = { slows: 'slow', jokers: 'joker', bombs: 'bomb' };
  const cols = { slows: '#7fd4ff', jokers: '#ffd23d', bombs: '#ff9a3c' }, I = L.in;
  for (let i = 0; i < 3; i++) {
    const k = order[(G.rewardIdx + i) % 3];
    if (G[k] < MAXP[k]) { G[k]++; G.rewardIdx = (G.rewardIdx + i + 1) % 3; updatePowUI(ui[k]); popup(tt("{n}'Lİ SERİ! {o}", { n: G.combo, o: tt(names[k]) }), I.x + I.w / 2, I.y + I.h * 0.37, cols[k], Math.round(L.bh * 0.7), 1.6); Ses.sentez('odul', { ses: 0.5 }); return; }
  }
  const sp = addScore(300, I.x + I.w / 2, I.y + I.h * 0.37); popup(tt('SERİ ÖDÜLÜ +300').replace('300', sp), I.x + I.w / 2, I.y + I.h * 0.37, '#ffd23d', Math.round(L.bh * 0.6), 1.3);
}
// CÜMLE BOMBASI dolumu: renk patlamaları ve cümleler doldurur; dolunca bir bomba hazır olur
function bombaKontrol() {
  if (G.bombaDolum < 1) { updatePowUI(); return; }
  if (G.bombs < MAXP.bombs) {
    G.bombs++; G.bombaDolum -= 1; updatePowUI('bomb'); Ses.sentez('odul', { ses: 0.45 });
    if (L.in) popup(tt('CÜMLE BOMBASI HAZIR!'), L.in.x + L.in.w / 2, L.in.y + L.in.h * 0.45, '#ff9a3c', Math.round(L.bh * 0.75), 1.6);
  } else { G.bombaDolum = 1; updatePowUI(); }
}
// alt panel: CÜMLE BOMBASI rozeti (sayı ve dolum halkası) ve 4 güç kutusu. Kazanılan her joker / yavaş bir kutuda durur,
// dokununca kullanılır; boş kutu kesik çizgili görünür. 4'ten fazla güç varsa son kutuda sayısı yazar.
function updatePowUI(got) {
  $('#cB').textContent = G.bombs;
  const bomba = document.querySelector('#pow .bomba');
  if (bomba) { bomba.classList.toggle('empty', G.bombs <= 0); bomba.style.setProperty('--dol', clamp(G.bombaDolum, 0, 1).toFixed(3)); }
  const esya = [];
  for (let i = 0; i < G.jokers; i++) esya.push('joker');
  for (let i = 0; i < G.slows; i++) esya.push('slow');
  const kutular = [...document.querySelectorAll('#pow .slot')];
  kutular.forEach((b, i) => {
    const k = esya[i] || '', n = i === kutular.length - 1 && esya.length > kutular.length ? esya.slice(i).filter(x => x === k).length : 1;
    b.dataset.k = k; b.classList.toggle('dolu', !!k); b.classList.toggle('hazir', k === 'joker' && !!G.jokerHazir);
    const html = k ? `<i>${k === 'joker' ? '🃏' : '⏳'}</i>` + (n > 1 ? `<b>${n}</b>` : '') : '';
    if (b.__h !== html) { b.innerHTML = html; b.__h = html; }
    b.setAttribute('aria-label', tt(k === 'joker' ? 'Joker' : k === 'slow' ? 'Yavaşlat' : 'Boş güç kutusu'));
  });
  if (got) { const b = got === 'bomb' ? bomba : kutular.filter(x => x.dataset.k === got).pop(); if (b) { b.classList.remove('got'); void b.offsetWidth; b.classList.add('got'); } }
}
function denyPow(k, msg) {
  Ses.cal('tik', { ses: 0.5, hiz: 0.6 });
  const b = k === 'bomb' ? document.querySelector('#pow .bomba') : document.querySelector(`#pow .slot[data-k="${k}"]`) || document.querySelector('#pow .slot');
  if (b) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); }
  if (msg) popup(msg, L.in.x + L.in.w / 2, L.in.y + L.in.h * 0.3, '#ff7a8a', Math.round(L.bh * 0.6), 1.1);
}
// 🃏 Joker: bir sonraki dokunulan karonun Türkçesi 2 saniye görünür (yalnız cümle kurarken)
function useJoker() {
  const R = G.R;
  if (G.state !== 'playing' || !R || R.bitti || !R.tahtaHazir) return;
  if (R.tip !== 'kur') { denyPow('joker', R.tip === 'sav' ? '' : tt('KELİME SORULARINDA JOKER YOK')); return; }
  if (G.jokers <= 0) { denyPow('joker', tt('JOKER KALMADI')); return; }
  G.jokerHazir = !G.jokerHazir; updatePowUI();
  if (G.jokerHazir) { popup(tt('JOKER: Türkçesini görmek istediğin karoya dokun'), L.in.x + L.in.w / 2, G.T.y + G.T.ch * 0.4, '#ffd23d', Math.round(L.bh * 0.5), 1.8); Ses.cal('kelime', { ses: 0.4 }); }
}
function jokerKullan(K) {
  G.jokerHazir = false;
  const an = anlamBul(K.txt);
  if (!an) { denyPow('joker', tt('BU KELİME SÖZLÜKTE YOK')); updatePowUI(); return; }
  G.jokers--; K.anlam = an; K.anlamT = 2.2;
  updatePowUI(); Ses.cal('kelime', { ses: 0.5 }); Konus.soyle(K.txt, { hiz: 0.9 });
}
// 💣 CÜMLE BOMBASI: hedefe gerekmeyen bütün serbest karolar patlar, hata göstergesi 2 dilim boşalır
function useBomb() {
  if (G.state !== 'playing' || !D) return;
  if (G.bombs <= 0) { denyPow('bomb', tt('CÜMLE BOMBASI DOLMADI')); return; }
  const R = G.R, T = G.T;
  if (!R || R.bitti || !R.tahtaHazir || tahtaMesgul()) { denyPow('bomb', ''); return; }
  const kalan = {}; (R.tip === 'sav' ? (R.duzelt ? [R.duzelt] : []) : hedefDizi(R).slice(R.zincir ? R.zincir.k : 0)).forEach(x => { kalan[x] = (kalan[x] || 0) + 1; });
  const hedef = karolar(T, k => { if (k.kilit || k.zincir) return false; if (kalan[k.txt]) { kalan[k.txt]--; return false; } return true; });
  G.bombs--; updatePowUI();
  T.dalga = 0;
  hedef.forEach((K, i) => { karoPatlat(K, i * 0.01, 'renk'); const p = karoMerkez(K); if (i % 2 === 0) sparkBurst(p.x, p.y, '#ff9a3c', 12, 320, 0.6); });
  addScore(hedef.length * 10, T.x + T.cols * T.cw / 2, T.y + T.rows * T.ch / 2);
  const once = G.hata; G.hata = Math.max(0, G.hata - 2);
  Ses.cal('bomba', { ses: 0.9 }); Ses.sentez('gok', { ses: 0.4 }); G.shake = Math.max(G.shake, 11); G.flash = 0.3; G.flashCol = '#ff9a3c';
  const cx = T.x + T.cols * T.cw / 2, cy = T.y + T.rows * T.ch / 2;
  smoke(cx, cy, 6); firework(cx, cy, '#ff9a3c');
  popup(tt('CÜMLE BOMBASI! {n} KARO PATLADI', { n: hedef.length }), cx, cy, '#ffb36b', Math.round(L.bh * 0.65), 1.6);
  if (once > G.hata) popup(tt('HATA GÖSTERGESİ -{n}', { n: once - G.hata }), L.gauge.x + 70, L.gauge.y + L.gauge.h * 0.6, '#9dffbf', Math.round(L.bh * 0.5), 1.4);
  kaskadBaslat();
}
// ⏳ Yavaşlat: tur süresi 15 saniye boyunca yavaş akar
function useSlow() {
  if (G.state !== 'playing' || !D) return;
  if (G.slows <= 0) { denyPow('slow', tt('YAVAŞLATMA KALMADI')); return; }
  G.slows--; G.slowT = Math.min(30, G.slowT + 15); updatePowUI();
  Ses.sentez('yuksel', { ses: 0.4, sure: 0.4 });
  popup(tt('ZAMAN YAVAŞLADI · 15 sn'), L.in.x + L.in.w / 2, L.in.y + L.in.h * 0.3, '#7fd4ff', Math.round(L.bh * 0.6), 1.3);
}
/* ---- puan kasası: patlamada altın paralar yukarıdaki puana uçar; her para kasaya "tın" diye düşer,
   sayaç seri hâlinde yükselir, seri bitince kasa "ka-çing" der (puan arttıkça haz artsın) ---- */
const PARA = [];
function paraSac(v, x, y) {
  if (!L.skor || !L.in) return;
  if (x == null) { x = L.in.x + L.in.w / 2; y = L.in.y + L.in.h * 0.45; }
  const n = Math.max(2, Math.min(16, Math.round(2 + Math.sqrt(v) / 3.5)));
  const hx = L.skor.x + L.skor.h * 0.56, hy = L.skor.y + L.skor.h / 2;
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0), r = rnd(40, 130);
    PARA.push({ x, y, cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r - 30, hx, hy, t: -i * 0.05, sure: rnd(0.5, 0.75), deger: v / n, don: rnd(0, 6), u: 0 });
  }
  G.paraYolda = (G.paraYolda || 0) + v;
}
function paraTik(dt) {
  for (let i = PARA.length - 1; i >= 0; i--) {
    const p = PARA[i]; p.t += dt; if (p.t < 0) continue;
    p.u = Math.min(1, p.t / p.sure);
    if (p.u >= 1) {
      PARA.splice(i, 1); G.paraYolda = Math.max(0, (G.paraYolda || 0) - p.deger); G.kasaSeri = (G.kasaSeri || 0) + p.deger; G.scorePulse = 1;
      G.paraSay = (G.paraSay || 0) + 1;
      if (G.t - (G.paraSesT || 0) > 0.04) { G.paraSesT = G.t; Ses.cal('altin', { ses: 0.45, hiz: 1 + Math.min(0.6, G.paraSay * 0.025) }); }
      if (Math.random() < 0.5) sparkBurst(p.hx, p.hy, '#ffe066', 5, 120, 0.35, 'dot');
    }
  }
  // sayaç: kasaya düşen paralar kadar seri hâlinde yükselir
  const hedef = G.score - (G.paraYolda || 0), fark = hedef - G.shown;
  if (fark > 0.5) { G.shown = Math.min(hedef, G.shown + Math.max(80, fark * 6) * dt); G.sayiyor = true; }
  else G.shown = Math.max(G.shown, hedef);
  if (G.sayiyor && !PARA.length && G.shown >= G.score - 0.5) {
    G.shown = G.score; G.sayiyor = false;
    if ((G.kasaSeri || 0) >= 300) { Ses.cal('kasa', { ses: 0.6 }); if (L.skor) sparkBurst(L.skor.x + L.skor.w * 0.7, L.skor.y + L.skor.h / 2, '#ffd23d', 16, 200, 0.5); G.scorePulse = 1.4; }
    G.kasaSeri = 0; G.paraSay = 0;
  }
}
// "İngilizceyi göster" ile oynanan bölümde puan yarı (XP de yarı: ilerleme.js)
function puanKat() { return D && D.goster ? 0.5 : 1; }
function addScore(v, x, y) { v = Math.round(v * puanKat()); G.score += v; if (v > 0) paraSac(v, x, y); if (v >= 100 && L.skor) sparkBurst(L.skor.x + L.skor.w * 0.6, L.skor.y + L.skor.h * 0.62, '#ffd23d', 18, 200, 0.55); return v; }

/* ---------------- kaybetme ---------------- */
function gameOver() {
  if (G.state !== 'playing') return;
  G.state = 'dying'; G.dieT = 0; G.flash = 0.7; G.flashCol = '#ff1030'; G.shake = 14; G.slowT = 0;
  G.surukle = null; G.secili = null;
  if (G.R) G.R.bitti = true;
  karolar(G.T).forEach(k => { const p = karoMerkez(k); sparkBurst(p.x, p.y, '#ff4030', 6, 220, 0.7); });
  if (D && D.online) { onlineBitir('yenildi'); return; }
  Ses.kasetDur(0.8); sonra(0.3, () => Ses.cal('yenilgi', { ses: 1 }));
  banner(tt('YENİLDİN'), tt('Hata göstergesi doldu'), '#ff6b7d', 2);
}

/* ---------------- dojo sonu ---------------- */
function dojoBitti(kazandi) {
  if (!D) return;
  if (D.online) { if (!kazandi) onlineBitir('yenildi'); return; }
  if (yarimKaydedilir()) yarimSil();   // bölüm bitti ya da kaybedildi: yarım kayıt kalmaz
  const normal = !D.antrenman && !D.st && !D.ilkCumle && !D.gunluk;
  let yildiz = 0;
  if (kazandi && D.gunluk) { yildiz = 1 + (D.istat.yanlis <= 3 ? 1 : 0) + (D.istat.yanlis <= 1 ? 1 : 0); D.gorevSonuc = gorevKaydet(D.gunluk.gun, G.score, yildiz); }
  if (kazandi && normal) {
    yildiz = 1 + (D.istat.yanlis <= 3 ? 1 : 0) + (D.istat.yanlis <= 1 ? 1 : 0);
    kayit.istat.zafer = (kayit.istat.zafer || 0) + 1;
    D.ilkZafer = !kayit.yildiz[D.r.id];
    kayit.yildiz[D.r.id] = Math.max(kayit.yildiz[D.r.id] || 0, yildiz);
    if (D.kelime) { const pk = D.paket, sp = pk && sonrakiPaket(pk); D.yeniPaket = sp && !kayit.acik[sp.id] && paketAcikMi(sp) ? sp : null; }
    else { const s = D.r.final ? null : sonrakiRakip(D.r); if (s) { D.yeniDojo = !rakipAcikMi(s) ? s : null; kayit.acik[s.id] = true; } }
  }
  if (D.ilk) kayit.rehber = true;
  if (D.kelime) kayit.kelRehber = true;
  if (!D.ilkCumle && G.score > (kayit.best || 0)) { kayit.best = G.score; D.rekor = true; }
  kaydet();
  D.yildiz = yildiz; D.kazandi = kazandi;
  Olay.yay('bolumBitti', { mod: bolumModu(), r: D.r.id, lvl: D.r.lvl, kazandi, yildiz, skor: G.score, istat: Object.assign({}, D.istat), enKombo: D.enKombo || 0, rekor: !!D.rekor, gorevIlk: !!(D.gorevSonuc && D.gorevSonuc.ilk) });
  if (kazandi) {
    G.state = 'over';
    Ses.kasetDur(0.8); Ses.cal('ko', { ses: 0.7 });
    sonra(0.5, () => { Ses.cal('zafer', { ses: 1 }); Ses.spiker(3, { oncelik: true }); });
    banner(tt(D.st ? 'TEST BİTTİ' : D.antrenman ? 'ANTRENMAN TAMAM' : D.ilkCumle ? 'HARİKA!' : D.gunluk ? 'GÖREV TAMAM!' : 'BÖLÜM TAMAM!'), D.st || D.ilkCumle ? '' : D.antrenman ? tt('{a} / {b} hatırladın', { a: D.antrenman.hatirlanan, b: D.antrenman.kuyruk.length }) : (D.r.world || D.r.ad || ''), '#ffd98a', 2);
    const I = L.in;
    [0, 0.25, 0.5].forEach(t => sonra(t, () => firework(rnd(I.x + 30, I.x + I.w - 30), rnd(I.y + 40, I.y + I.h * 0.4), pick(['#ffd23d', '#19f0ff', '#ff3df2']))));
  }
  G.R = null;
  sonra(kazandi ? 1.8 : 0.4, () => { if (D && D.st) stSonuc(); else if (D && D.ilkCumle) ilkSonuc(); else sonucGoster(); });
}

/* ---------------- vitrin (menü arka planı) ---------------- */
// Menüde arkada duran tahta: bir A1 cümlesinin ilk üç kelimesi dizilmiş, karolar karışık
function vitrinTahta(s) {
  const R = turKur(s); G.R = R;
  R.hedef.parcalar[0].dizi = s.w.map(o => o[0]);
  tahtaKur(R);
  const T = G.T, need = hedefDizi(R), N = T.rows * T.cols;
  let metin = need.concat(R.cel); while (metin.length < N) metin.push(rastgeleMetin(R));
  metin = karistir(metin.slice(0, N));
  let i = 0; for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) hucreKoy(T, karoYap(metin[i++], -1), r, c);
  const r = T.rows - 2;
  for (let k = 0; k < Math.min(3, need.length); k++) { const kk = karolar(T, q => q.txt === need[k] && !(q.r === r && q.c < k))[0]; if (kk) degistir(T, { r: kk.r, c: kk.c }, { r, c: k }); }
  karolar(T).forEach(k => { k.ci = guvenliRenk(T, k.r, k.c); const p = hucreMerkez(k.r, k.c); k.x = p.x; k.y = p.y; });
  R.tahtaHazir = true; R.capa = T.h[r][0].id; zincirYenile(R); R.bitti = true;
  karolar(T).forEach(k => { if (k.r === r && k.c < 3) k.zincir = k.c + 1; });
}
