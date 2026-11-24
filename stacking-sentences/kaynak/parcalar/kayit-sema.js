/* =====================================================================
   KAYIT ŞEMASI (doğrulama ve onarım)
   Kayıttan okunan her veri burada kontrol edilir; oyun kodu bozuk veri görmez.
   · Saf işlevler: yalnız veri alır, düzeltilmiş veri döndürür (Depo'ya yazmaz).
   · Eksik alan → varsayılan değer (eski kayıtlarda normaldir, uyarı yok).
   · Yanlış türde / anlamsız alan → onarılır ve "bozuk" listesine yazılır
     (data.js ham kaydı yedekler ve oyuncuya bir kez haber verir).
   · Tanımadığımız alanlar korunur (ileride eklenecek alanlar silinmesin).
   Yeni alan eklerken: bosKayit() (data.js) + aşağıdaki ALANLAR + test.
   Kayıt biçimi değişirse: KAYIT_SURUM'u artır, GOCLER'e bir adım ekle.
   ===================================================================== */
const KAYIT_SURUM = 2;
const SEVIYE_KODLARI = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sayiMi = x => typeof x === 'number' && isFinite(x);
const nesneMi = x => !!x && typeof x === 'object' && !Array.isArray(x);
const GUN_ANAHTAR = /^\d{4}-\d{2}-\d{2}$/;
const tamSayi = (x, en, ek) => (sayiMi(x) ? Math.min(ek, Math.max(en, Math.round(x))) : null);

// sürüm göçleri: v → v+1 (her biri ham nesneyi yerinde günceller)
const GOCLER = {
  1: k => { k.v = 2; },   // v2: alanlar doğrulanır; biçim aynı
};

// her alan: (değer, varsayılan, bağlam) → düzeltilmiş değer; bozuksa bağlam.bozuk() çağrılır
const ALANLAR = {
  baslangic: (x, v, c) => (x === null || SEVIYE_KODLARI.indexOf(x) >= 0 ? x : c.bozuk(null)),
  acik: (x, v, c) => {
    if (!nesneMi(x)) return c.bozuk(Object.assign({}, v));
    const o = {}; for (const k in x) if (x[k]) o[k] = true;
    o['A1-1'] = true; return o;
  },
  yildiz: (x, v, c) => {
    if (!nesneMi(x)) return c.bozuk({});
    const o = {}; let b = false;
    for (const k in x) { const y = tamSayi(x[k], 1, 3); if (y === null) b = true; else o[k] = y; }
    return b ? c.bozuk(o) : o;
  },
  kel: (x, v, c) => {    // kelime → [kutu 1..6, vade (dakika), hata sayısı]
    if (!nesneMi(x)) return c.bozuk({});
    const o = {}; let b = false;
    for (const k in x) {
      const s = x[k];
      if (!Array.isArray(s) || !sayiMi(s[0]) || !sayiMi(s[1])) { b = true; continue; }
      o[k] = [tamSayi(s[0], 1, 6), s[1], tamSayi(s[2], 0, 1e6) || 0];
    }
    return b ? c.bozuk(o) : o;
  },
  tekrar: (x, v, c) => {   // hata ve cümle tekrar kutuları (en çok 400)
    if (!Array.isArray(x)) return c.bozuk([]);
    const o = []; let b = false;
    for (const e of x) {
      const tamam = nesneMi(e) && typeof e.k === 'string' && sayiMi(e.kutu) && sayiMi(e.vade) &&
        (e.tur === 'cumle' ? typeof e.r === 'string' && sayiMi(e.i)
          : nesneMi(e.m) && Array.isArray(e.m.tokens) && e.m.tokens.every(t => typeof t === 'string') && sayiMi(e.m.idx));
      if (!tamam) { b = true; continue; }
      e.kutu = tamSayi(e.kutu, 1, 6); e.hata = tamSayi(e.hata, 0, 1e6) || 0; o.push(e);
    }
    if (o.length > 400) o.splice(0, o.length - 400);
    return b ? c.bozuk(o) : o;
  },
  ders: (x, v, c) => (nesneMi(x) ? x : c.bozuk({})),
  gorulen: (x, v, c) => {
    if (!nesneMi(x)) return c.bozuk({});
    const o = {}; let b = false;
    for (const k in x) { if (Array.isArray(x[k])) o[k] = x[k]; else b = true; }
    return b ? c.bozuk(o) : o;
  },
  rehber: (x, v, c) => (typeof x === 'boolean' ? x : c.bozuk(v)),
  kelRehber: (x, v, c) => (typeof x === 'boolean' ? x : c.bozuk(v)),
  tutGor: (x, v, c) => (typeof x === 'boolean' ? x : c.bozuk(v)),
  ayar: (x, v, c) => {
    if (!nesneMi(x)) return c.bozuk(Object.assign({}, v));
    const o = Object.assign({}, x); let b = false;
    for (const k in v) { if (!(k in x)) o[k] = v[k]; else if (typeof x[k] !== 'boolean') { o[k] = v[k]; b = true; } }
    return b ? c.bozuk(o) : o;
  },
  best: (x, v, c) => (sayiMi(x) && x >= 0 ? x : c.bozuk(0)),
  sonLvl: (x, v, c) => (typeof x === 'string' && c.seviyeVar(x) ? x : c.bozuk(v)),
  sonSekme: (x, v, c) => (x === 'cumle' || x === 'kelime' ? x : c.bozuk(v)),
  seviyeTesti: (x, v, c) => (x === null || (nesneMi(x) && SEVIYE_KODLARI.indexOf(x.sonuc) >= 0) ? x : c.bozuk(null)),
  istat: (x, v, c) => {
    if (!nesneMi(x)) return c.bozuk(Object.assign({}, v));
    const o = Object.assign({}, v); let b = false;
    for (const k in x) { if (sayiMi(x[k]) && x[k] >= 0) o[k] = x[k]; else b = true; }
    return b ? c.bozuk(o) : o;
  },
  sonKayit: (x, v, c) => (sayiMi(x) && x >= 0 ? x : c.bozuk(0)),
  xp: (x, v, c) => (sayiMi(x) && x >= 0 ? Math.round(x) : c.bozuk(0)),
  gunluk: (x, v, c) => {   // { hedef: 20|50|100, gunler: { 'YYYY-AA-GG': xp } }
    if (!nesneMi(x)) return c.bozuk({ hedef: v.hedef, gunler: {} });
    let b = false; const o = { hedef: [20, 50, 100].indexOf(x.hedef) >= 0 ? x.hedef : (b = true, v.hedef), gunler: {} };
    if (nesneMi(x.gunler)) { for (const k in x.gunler) { if (GUN_ANAHTAR.test(k) && sayiMi(x.gunler[k]) && x.gunler[k] >= 0) o.gunler[k] = Math.round(x.gunler[k]); else b = true; } }
    else if (x.gunler !== undefined) b = true;
    return b ? c.bozuk(o) : o;
  },
  seri: (x, v, c) => {     // { gun, enUzun, sonGun, dondurma 0..2, donan: [gün] }
    if (!nesneMi(x)) return c.bozuk(Object.assign({}, v, { donan: [] }));
    let b = false; const say = (y, en, ek) => { const z = tamSayi(y, en, ek); if (z === null || z !== y) b = true; return z === null ? en : z; };
    const o = { gun: say(x.gun, 0, 1e5), enUzun: 0, sonGun: null, dondurma: say(x.dondurma, 0, 2), donan: [] };
    o.enUzun = Math.max(say(x.enUzun, 0, 1e5), o.gun);
    if (x.sonGun === null || x.sonGun === undefined) o.sonGun = null; else if (typeof x.sonGun === 'string' && GUN_ANAHTAR.test(x.sonGun)) o.sonGun = x.sonGun; else b = true;
    if (o.gun && !o.sonGun) { o.gun = 0; b = true; }
    if (Array.isArray(x.donan)) o.donan = x.donan.filter(g => typeof g === 'string' && GUN_ANAHTAR.test(g)).slice(-30); else if (x.donan !== undefined) b = true;
    return b ? c.bozuk(o) : o;
  },
  gorev: (x, v, c) => {    // Günün Görevi: { son, seri, enUzun, toplam, gunler: { gün: en iyi skor } }
    if (!nesneMi(x)) return c.bozuk({ son: null, seri: 0, enUzun: 0, toplam: 0, gunler: {} });
    let b = false; const say = y => { const z = tamSayi(y, 0, 1e6); if (z === null || z !== y) b = true; return z === null ? 0 : z; };
    const o = { son: null, seri: say(x.seri), enUzun: 0, toplam: say(x.toplam), gunler: {} };
    o.enUzun = Math.max(say(x.enUzun), o.seri);
    if (x.son === null || x.son === undefined) o.son = null; else if (typeof x.son === 'string' && GUN_ANAHTAR.test(x.son)) o.son = x.son; else b = true;
    if (nesneMi(x.gunler)) { for (const k in x.gunler) { if (GUN_ANAHTAR.test(k) && sayiMi(x.gunler[k]) && x.gunler[k] >= 0) o.gunler[k] = Math.round(x.gunler[k]); else b = true; } }
    else if (x.gunler !== undefined) b = true;
    if (o.seri && !o.son) { o.seri = 0; b = true; }
    return b ? c.bozuk(o) : o;
  },
  strRehber: (x, v, c) => (typeof x === 'boolean' ? x : c.bozuk(v)),
  envanter: (x, v, c) => {   // güçler: { hamle3, cekic, miknatis } (0–999)
    if (!nesneMi(x)) return c.bozuk(Object.assign({}, v));
    let b = false; const o = {};
    for (const k of ['hamle3', 'cekic', 'miknatis']) { const y = x[k] === undefined ? v[k] : tamSayi(x[k], 0, 999); if (y === null || (x[k] !== undefined && y !== x[k])) b = true; o[k] = y === null ? 0 : y; }
    return b ? c.bozuk(o) : o;
  },
  sandik: (x, v, c) => {     // { slot: [{ tur, t, acilis }] } en çok 4
    if (!nesneMi(x) || !Array.isArray(x.slot)) return c.bozuk({ slot: [] });
    let b = false; const slot = [];
    x.slot.forEach(k => { if (nesneMi(k) && ['tahta', 'gumus', 'altin'].indexOf(k.tur) >= 0 && sayiMi(k.t) && (k.acilis === null || sayiMi(k.acilis)) && slot.length < 4) slot.push({ tur: k.tur, t: k.t, acilis: k.acilis }); else b = true; });
    return b ? c.bozuk({ slot }) : { slot };
  },
  cark: (x, v, c) => (nesneMi(x) && (x.son === null || (typeof x.son === 'string' && GUN_ANAHTAR.test(x.son))) ? { son: x.son } : c.bozuk({ son: null })),
  yol: (x, v, c) => {      // Bölüm Yolu: { acik: açık son bölüm, yildiz: { no: 1..3 }, enIyi: { no: puan } }
    if (!nesneMi(x)) return c.bozuk({ acik: 1, yildiz: {}, enIyi: {} });
    let b = false; const o = { acik: 1, yildiz: {}, enIyi: {} };
    const a = tamSayi(x.acik, 1, 100000); if (a === null || a !== x.acik) b = true; o.acik = a || 1;
    if (nesneMi(x.yildiz)) { for (const k in x.yildiz) { const y = tamSayi(x.yildiz[k], 1, 3); if (/^\d+$/.test(k) && y !== null && y === x.yildiz[k]) o.yildiz[k] = y; else b = true; } } else b = true;
    if (nesneMi(x.enIyi)) { for (const k in x.enIyi) { const y = tamSayi(x.enIyi[k], 0, 1e7); if (/^\d+$/.test(k) && y !== null) o.enIyi[k] = y; else b = true; } } else b = true;
    return b ? c.bozuk(o) : o;
  },
  rozet: (x, v, c) => {    // açılan rozetler: { id: zaman }
    if (!nesneMi(x)) return c.bozuk({});
    const o = {}; let b = false;
    for (const k in x) { if (sayiMi(x[k]) && x[k] > 0) o[k] = x[k]; else b = true; }
    return b ? c.bozuk(o) : o;
  },
};

/* Ham kayıt nesnesini doğrular.
   ham: JSON.parse çıktısı · bos: bosKayit() · seviyeVar: seviye kodu geçerli mi
   → { k: düzeltilmiş kayıt, bozuk: ['yildiz', ...], gocTi: eski sürüm } */
function kayitDuzelt(ham, bos, seviyeVar) {
  const bozuk = [];
  if (!nesneMi(ham)) return { k: bos, bozuk: ['tumu'], gocTi: null };
  const k = Object.assign({}, ham);
  let v = sayiMi(k.v) ? k.v : 1; const gocTi = v < KAYIT_SURUM ? v : null;
  if (v > KAYIT_SURUM) v = KAYIT_SURUM;               // daha yeni sürümden: tanıdığımız alanları doğrula, gerisine dokunma
  while (v < KAYIT_SURUM && GOCLER[v]) { GOCLER[v](k); v++; }
  k.v = KAYIT_SURUM;
  for (const ad in ALANLAR) {
    if (!(ad in k) || k[ad] === undefined) { k[ad] = bos[ad]; continue; }
    let b = false;
    const c = { seviyeVar: seviyeVar || (() => true), bozuk: d => { b = true; return d; } };
    k[ad] = ALANLAR[ad](k[ad], bos[ad], c);
    if (b) bozuk.push(ad);
  }
  // ilerleme var ama başlangıç seviyesi kayıpsa: ilk giriş ekranına geri gönderme
  if (!k.baslangic && Object.keys(k.yildiz).length) k.baslangic = 'A1';
  return { k, bozuk, gocTi };
}

/* Profil listesi: { aktif, liste: [{ id, ad, t }], eskiAktarildi } */
const PROFIL_ID = /^[A-Za-z0-9_-]{1,40}$/;
function profillerDuzelt(ham) {
  const bozuk = [];
  if (!nesneMi(ham) || !Array.isArray(ham.liste)) return { p: { aktif: null, liste: [], eskiAktarildi: !!(ham && ham.eskiAktarildi) }, bozuk: ['tumu'] };
  const liste = [], idler = {};
  for (const e of ham.liste) {
    if (!nesneMi(e) || typeof e.id !== 'string' || !PROFIL_ID.test(e.id) || idler[e.id]) { bozuk.push('profil'); continue; }
    let ad = typeof e.ad === 'string' ? e.ad.replace(/\s+/g, ' ').trim().slice(0, 16) : '';
    if (!ad) { ad = 'Profil ' + (liste.length + 1); bozuk.push('ad'); }
    idler[e.id] = 1; liste.push({ id: e.id, ad, t: sayiMi(e.t) ? e.t : 0 });
  }
  let aktif = ham.aktif;
  if (!liste.some(e => e.id === aktif)) { if (aktif !== null && aktif !== undefined) bozuk.push('aktif'); aktif = liste.length ? liste[0].id : null; }
  return { p: Object.assign({}, ham, { aktif, liste, eskiAktarildi: !!ham.eskiAktarildi }), bozuk };
}

/* Yarım bölüm kaydı oyunu açabilecek biçimde mi (içerik kontrolü yarimSurdur'da) */
function yarimGecerli(y) {
  return nesneMi(y) && y.v === 1 && typeof y.r === 'string' && (y.mod === 'kelime' || y.mod === 'bolum') &&
    nesneMi(y.tur) && typeof y.tur.tip === 'string' && nesneMi(y.G) && Array.isArray(y.G.pile) && sayiMi(y.G.score) &&
    nesneMi(y.D) && nesneMi(y.D.istat) && Array.isArray(y.D.hatalar) && (y.mod !== 'kelime' || (nesneMi(y.kelime) && Array.isArray(y.kelime.kuyruk)));
}

