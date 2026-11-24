/* =====================================================================
   ONLINE KAPIŞMA — oda koduyla iki telefon
   · Ev sahibi oda kurar, 4 haneli kod çıkar; arkadaşı kodu yazıp katılır.
   · İkisi aynı 5 cümleyi kendi tahtasında kurar. Önce bitiren kazanır; hata göstergesi dolan kaybeder.
   · Bağlantı: ücretsiz genel MQTT sunucuları (WebSocket). İki sunucuya birden bağlanılır, biri çalışmazsa
     öbürü yeter; aynı mesaj iki yoldan gelirse bir kez işlenir. Sunucular deneme amaçlıdır, garanti vermez.
   · İki mod (23 Kasım 2026): HIZ (aynı cümleleri önce kuran kazanır) ve STRATEJİ (strateji.js). Oyuncu seviyesini (A1–C2) seçer.
     Rakip: oda koduyla arkadaş, hızlı eşleşme (aynı mod ve seviyede bekleyen biri; konu …/lobi-<mod>-<seviye>) ya da bilgisayar.
     Hızlı eşleşme: herkes 2 sn'de bir 'bekle' yayınlar; kimliği küçük olan 'teklif' (gizli oda kodu) gönderir, öbürü 'kabul' eder;
     ikisi o odaya geçer ve maç kendiliğinden başlar.
   · Mesajlar (konu: stacking-sentences-tr/v1/oda/<kod>):
       ara (misafir: odaya gelmek istiyorum) · oda / dolu (ev sahibi cevabı) · nabiz (3 sn'de bir, 15 sn sessizlik = koptu)
       basla (ev sahibi: maç kimliği, seviye, cümleler) · hazir (misafir aldı) · durum (cümle, skor, hata göstergesi 'yigin')
       bitti (tamam / yenildi, süre) · cikti (odadan ayrıldı)
   ===================================================================== */
const ONLINE_SUNUCULAR = window.TE_SUNUCULAR || ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
const ONLINE_KONU = 'stacking-sentences-tr/v1/oda/';
const ONLINE_CUMLE = 5;

/* ---------------- küçük MQTT 3.1.1 istemcisi (WebSocket üstünde, yalnız QoS 0) ---------------- */
function mqttBagla(url, istemci, ol) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  let ws = null, tampon = new Uint8Array(0), pingT = null, zaman = null, acik = false, bitti = false, pid = 1;
  const yazi = s => { const b = enc.encode(s), o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; };
  const birles = pp => { let n = 0; pp.forEach(p => { n += p.length; }); const o = new Uint8Array(n); let i = 0; pp.forEach(p => { o.set(p, i); i += p.length; }); return o; };
  const uzunluk = n => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return Uint8Array.from(o); };
  const paket = (bas, ...govde) => { const g = birles(govde); return birles([Uint8Array.of(bas), uzunluk(g.length), g]); };
  const gonder = p => { try { if (ws && ws.readyState === 1) ws.send(p); } catch (e) { } };
  function kapandi() {
    if (bitti) return; bitti = true; acik = false; clearInterval(pingT); clearTimeout(zaman);
    try { if (ws) ws.close(); } catch (e) { }
    ol.kapandi();
  }
  function coz() {
    while (tampon.length >= 2) {
      let carp = 1, n = 0, i = 1, b;
      do { if (i >= tampon.length) return; b = tampon[i++]; n += (b & 127) * carp; carp *= 128; } while ((b & 128) && i < 5);
      if (tampon.length < i + n) return;
      const bas = tampon[0], g = tampon.slice(i, i + n), tip = bas >> 4;
      tampon = tampon.slice(i + n);
      if (tip === 2) {   // CONNACK
        if (g[1] === 0) { acik = true; clearTimeout(zaman); pingT = setInterval(() => gonder(Uint8Array.of(0xC0, 0)), 25000); ol.acildi(); }
        else kapandi();
      } else if (tip === 3) {   // PUBLISH
        const q = (bas >> 1) & 3, tl = (g[0] << 8) | g[1]; let o = 2 + tl;
        const konu = dec.decode(g.subarray(2, o)); if (q) o += 2;
        ol.mesaj(konu, dec.decode(g.subarray(o)));
      }
    }
  }
  try {
    ws = new WebSocket(url, ['mqtt']);
    ws.binaryType = 'arraybuffer';
    zaman = setTimeout(() => { if (!acik) kapandi(); }, 9000);
    ws.onopen = () => gonder(paket(0x10, yazi('MQTT'), Uint8Array.of(4, 2, 0, 60), yazi(istemci)));
    ws.onmessage = e => { const y = new Uint8Array(e.data), t = new Uint8Array(tampon.length + y.length); t.set(tampon); t.set(y, tampon.length); tampon = t; coz(); };
    ws.onerror = kapandi; ws.onclose = kapandi;
  } catch (e) { setTimeout(kapandi, 0); }
  return {
    acik: () => acik,
    abone(konu) { const p = pid++; gonder(paket(0x82, Uint8Array.of(p >> 8, p & 255), yazi(konu), Uint8Array.of(0))); },
    yayinla(konu, metin) { gonder(paket(0x30, yazi(konu), enc.encode(metin))); },
    kapat() { if (bitti) return; bitti = true; acik = false; clearInterval(pingT); clearTimeout(zaman); gonder(Uint8Array.of(0xE0, 0)); try { ws.close(); } catch (e) { } }
  };
}

/* ---------------- ağ: iki sunucu, tek oda konusu, tekrar gelen mesajlar ayıklanır ---------------- */
const Ag = (function () {
  let baglar = [], konu = '', cid = '', seq = 0, gorulen = new Set(), dinle = null, durumF = null, aktif = false;
  function durum() { return baglar.some(b => b.c && b.c.acik()) ? 'acik' : baglar.some(b => b.bekliyor || b.t) ? 'baglaniyor' : 'koptu'; }
  function bildir() { if (durumF) try { durumF(durum()); } catch (e) { console.error(e); } }
  function al(m) {
    let o; try { o = JSON.parse(m); } catch (e) { return; }
    if (!o || typeof o !== 'object' || !o.t || o.c === cid) return;
    const a = o.c + ':' + o.n; if (gorulen.has(a)) return;
    gorulen.add(a); if (gorulen.size > 400) gorulen = new Set(Array.from(gorulen).slice(-200));
    if (dinle) try { dinle(o); } catch (e) { console.error(e); }
  }
  function kur(b) {
    b.bekliyor = true; b.t = null;
    b.c = mqttBagla(b.url, 'te' + cid + Math.random().toString(36).slice(2, 7), {
      acildi() { b.bekliyor = false; b.deneme = 0; b.c.abone(konu); bildir(); },
      mesaj(k, m) { if (k === konu) al(m); },
      kapandi() {
        b.bekliyor = false;
        if (aktif && b.deneme < 8) { b.deneme++; b.t = setTimeout(() => { if (aktif) kur(b); }, Math.min(8000, 1200 * b.deneme)); }
        bildir();
      }
    });
  }
  return {
    baslat(oda, f, d) {
      this.kapat(); aktif = true; konu = ONLINE_KONU + oda; dinle = f; durumF = d; seq = 0; gorulen = new Set();
      cid = Math.random().toString(36).slice(2, 10);
      baglar = ONLINE_SUNUCULAR.map(url => ({ url, deneme: 0 })); baglar.forEach(kur);
    },
    gonder(o) { if (!aktif) return; o.c = cid; o.n = ++seq; const m = JSON.stringify(o); baglar.forEach(b => { if (b.c && b.c.acik()) b.c.yayinla(konu, m); }); },
    kapat() { aktif = false; baglar.forEach(b => { clearTimeout(b.t); if (b.c) b.c.kapat(); }); baglar = []; dinle = null; durumF = null; },
    // telefon kilitten / başka uygulamadan dönünce kopan bağlantılar hemen yeniden kurulur
    uyan() { if (!aktif) return; baglar.forEach(b => { if (!(b.c && b.c.acik()) && !b.bekliyor) { clearTimeout(b.t); b.deneme = 0; kur(b); } }); },
    durum, id: () => cid, aktif: () => aktif
  };
})();

/* ---------------- oda ---------------- */
const OD = { rol: null, kod: '', ad: '', lvl: 'A1', mod: 'hiz', oto: false, bot: false, rakip: null, mac: null, hazirMac: null, araT: null, araBitis: 0, nabizT: null, baslaT: null };
let onlineSonMod = null, onlineSecLvl = null;
const temizAd = s => String(s || 'Rakip').replace(/[<>&"\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Rakip';
// hızlı eşleşmede yabancılar birbirinin yazdığı ismi görmez (mağaza kuralı: denetlenmeyen kullanıcı içeriği yok); bağlantı kimliğinden sabit takma ad
const takmaAd = cid => { let h = 7; for (const ch of String(cid)) h = (h * 31 + ch.charCodeAt(0)) % 9000; return tt('Oyuncu') + ' #' + (1000 + h); };
const rakipAdi = (ad, cid) => OD.oto || OD.eslesme ? takmaAd(cid) : temizAd(ad);
function odaSifirla() {
  clearInterval(OD.araT); clearInterval(OD.nabizT); clearInterval(OD.baslaT);
  Object.assign(OD, { rol: null, kod: '', rakip: null, mac: null, hazirMac: null, araT: null, nabizT: null, baslaT: null, oto: false, eslesme: false, bot: false });
}
function onlineSeviye() { const l = kayit.sonLvl; return SEVIYELER.indexOf(l) >= 0 ? l : 'A1'; }
// o: { mod: 'hiz' | 'strateji', lvl, oto: rakip gelince maç kendiliğinden başlasın (hızlı eşleşme) }
function odaBaglan(kod, rol, o) {
  o = o || {};
  odaSifirla();
  OD.rol = rol; OD.kod = kod; OD.ad = temizAd(aktifProfil() ? aktifProfil().ad : 'Oyuncu');
  OD.mod = o.mod === 'strateji' ? 'strateji' : 'hiz'; OD.oto = !!o.oto; OD.eslesme = !!o.eslesme;
  if (rol === 'ev') OD.lvl = SEVIYELER.indexOf(o.lvl) >= 0 ? o.lvl : onlineSeviye();
  Ag.baslat(kod, onlineMesaj, agDurumu);
  OD.nabizT = setInterval(nabiz, 3000);
}
let agOnceki = '';
document.addEventListener('visibilitychange', () => { if (!document.hidden) Ag.uyan(); });
function agDurumu(d) {
  // bağlantı yeni geri geldiyse rakibe süre tanı (kopan bizdik, rakip değil)
  if (d === 'acik' && agOnceki !== 'acik' && OD.rakip) OD.rakip.son = Date.now();
  agOnceki = d;
  if (ekran === 'oda') lobiGuncelle();
  if (d === 'acik' && OD.rol === 'misafir' && !OD.rakip) odaAra();
  if (d === 'koptu' && D && D.online && !D.online.karar) not(tt('Bağlantı koptu, yeniden bağlanılıyor…'));
}
function nabiz() {
  if (!OD.kod) return;
  Ag.gonder({ t: 'nabiz', ad: OD.ad, lvl: OD.lvl, mod: OD.mod });
  const r = OD.rakip;
  if (r && Date.now() - r.son > 15000 && Ag.durum() === 'acik') rakipGitti('koptu');
}

/* ---------------- mesajlar ---------------- */
function onlineMesaj(o) {
  if (o.hedef && o.hedef !== Ag.id()) return;
  if (o.t === 'ara') {
    if (OD.rol !== 'ev') return;
    const r = OD.rakip;
    if (r && r.cid !== o.c && Date.now() - r.son < 15000) { Ag.gonder({ t: 'dolu', hedef: o.c }); return; }
    const yeni = !r || r.cid !== o.c;
    OD.rakip = { cid: o.c, ad: rakipAdi(o.ad, o.c), son: Date.now() };
    Ag.gonder({ t: 'oda', hedef: o.c, ad: OD.ad, lvl: OD.lvl, mod: OD.mod });
    if (yeni) {
      Ses.cal('yukselis', { ses: 0.5 }); if (ekran === 'oda') lobiGuncelle();
      if (OD.oto) setTimeout(() => { if (OD.rol === 'ev' && OD.rakip && ekran === 'oda' && !OD.mac) macBaslatEv(); }, 1500);   // hızlı eşleşme: maç kendiliğinden
    }
    return;
  }
  if (o.t === 'oda') {
    if (OD.rol !== 'misafir' || OD.rakip) return;
    clearInterval(OD.araT); OD.araT = null;
    OD.rakip = { cid: o.c, ad: rakipAdi(o.ad, o.c), son: Date.now() }; OD.lvl = SEVIYELER.indexOf(o.lvl) >= 0 ? o.lvl : 'A1'; OD.mod = o.mod === 'strateji' ? 'strateji' : 'hiz';
    Ses.cal('yukselis', { ses: 0.5 });
    if (ekran === 'oda') lobiGuncelle();
    return;
  }
  if (o.t === 'dolu') { if (OD.rol === 'misafir' && !OD.rakip) { odadanCik(true); onlineAc(tt('Bu oda dolu. Başka bir kod dene ya da kendin oda kur.')); } return; }
  // buradan sonrası yalnız eşleşilen rakipten
  const r = OD.rakip; if (!r || o.c !== r.cid) return;
  r.son = Date.now();
  if (o.t === 'nabiz') {
    if (OD.rol === 'misafir' && ((o.lvl && o.lvl !== OD.lvl && SEVIYELER.indexOf(o.lvl) >= 0) || (o.mod && o.mod !== OD.mod))) { if (SEVIYELER.indexOf(o.lvl) >= 0) OD.lvl = o.lvl; OD.mod = o.mod === 'strateji' ? 'strateji' : 'hiz'; if (ekran === 'oda') lobiGuncelle(); }
    return;
  }
  if (o.t === 'basla') {
    if (OD.rol !== 'misafir' || !Array.isArray(o.cum) || !o.cum.length) return;
    Ag.gonder({ t: 'hazir', mac: o.mac, hedef: o.c });
    if (OD.mac === o.mac) return;
    OD.mac = o.mac; OD.lvl = o.lvl;
    if (o.mod === 'strateji') { OD.mod = 'strateji'; strMacBaslat({ mac: o.mac, lvl: o.lvl, tohum: String(o.tohum || o.mac), cum: o.cum, rakip: { ad: OD.rakip.ad }, online: true }); return; }
    OD.mod = 'hiz';
    macBaslat(o.mac, o.lvl, o.cum);
    return;
  }
  if (o.t === 'stur') { if (STR && STR.online && STR.mac === o.mac) strRakipSonuc(o); return; }
  if (o.t === 'hazir') { if (OD.rol === 'ev' && o.mac === OD.mac) { OD.hazirMac = o.mac; clearInterval(OD.baslaT); OD.baslaT = null; } return; }
  const M = D && D.online && D.online.mac === o.mac ? D.online : null;
  if (o.t === 'durum') { if (M) Object.assign(M.rakip, { cumle: +o.cumle || 0, skor: +o.skor || 0, yigin: clamp(+o.yigin || 0, 0, 1) }); return; }
  if (o.t === 'bitti') {
    if (!M || M.rakip.sonuc) return;
    Object.assign(M.rakip, { sonuc: o.sonuc === 'tamam' ? 'tamam' : 'yenildi', sure: +o.sure || 0, skor: +o.skor || 0, cumle: +o.cumle || 0 });
    onlineKarar();
    return;
  }
  if (o.t === 'cikti') rakipGitti('ayrildi');
}
function rakipGitti(neden) {
  const r = OD.rakip; if (!r) return;
  OD.rakip = null;
  if (STR && STR.online && !STR.karar) { strRakipGitti(neden); return; }
  if (D && D.online && !D.online.karar) { onlineKararVer('kazandin', tt(neden === 'ayrildi' ? '{ad} maçtan ayrıldı.' : '{ad} ile bağlantı koptu.', { ad: esc(r.ad) })); return; }
  if (OD.rol === 'ev') { not(tt(neden === 'ayrildi' ? '{ad} odadan ayrıldı.' : '{ad} ile bağlantı koptu.', { ad: r.ad })); if (ekran === 'oda') lobiGuncelle(); }
  else if (ekran === 'oda' || ekran === 'onlineSonuc' || ekran === 'strSonuc') { strKapat(); odadanCik(true); onlineAc(tt(neden === 'ayrildi' ? 'Ev sahibi odayı kapattı.' : 'Ev sahibiyle bağlantı koptu.')); }
}
function odaAra() {
  if (OD.araT) return;
  OD.araBitis = Date.now() + 12000;
  const gonder = () => {
    if (OD.rakip) { clearInterval(OD.araT); OD.araT = null; return; }
    if (Date.now() > OD.araBitis) { clearInterval(OD.araT); OD.araT = null; const k = OD.kod; odadanCik(true); onlineAc(tt('“{k}” kodlu açık bir oda bulunamadı. Kodu kontrol et; arkadaşın odayı açık tutsun.', { k })); return; }
    Ag.gonder({ t: 'ara', ad: OD.ad });
  };
  gonder(); OD.araT = setInterval(gonder, 1500);
}

/* ---------------- maç ---------------- */
function onlineCumleler(lvl) {
  const rl = seviyeRakipleri(lvl).filter(cumleliMi), out = [], gor = {};
  const enUzun = { A1: 6, A2: 8, B1: 9, B2: 10, C1: 11, C2: 12 }[lvl] || 9;
  for (let n = 0; n < 400 && out.length < ONLINE_CUMLE; n++) {
    const s = pick(cumleler(pick(rl).id)), k = s && s.kaynak + ':' + s.i;
    if (!s || gor[k] || s.w.length < 3 || s.w.length > enUzun) continue;
    gor[k] = 1; out.push(sRef(s));
  }
  return out;
}
function macBaslatEv() {
  if (OD.rol !== 'ev' || !OD.rakip) return;
  const strat = OD.mod === 'strateji', mac = Math.random().toString(36).slice(2, 9), cum = strat ? strCumleler(OD.lvl) : onlineCumleler(OD.lvl), tohum = Math.random().toString(36).slice(2, 10);
  OD.mac = mac; OD.hazirMac = null;
  const msg = strat ? { t: 'basla', hedef: OD.rakip.cid, mac, lvl: OD.lvl, cum, mod: 'strateji', tohum } : { t: 'basla', hedef: OD.rakip.cid, mac, lvl: OD.lvl, cum, mod: 'hiz' };
  Ag.gonder(Object.assign({}, msg));
  let n = 0; clearInterval(OD.baslaT);
  OD.baslaT = setInterval(() => { if (OD.hazirMac === mac || ++n > 8 || OD.mac !== mac || !OD.rakip) { clearInterval(OD.baslaT); OD.baslaT = null; return; } Ag.gonder(Object.assign({}, msg, { hedef: OD.rakip.cid })); }, 1000);
  if (strat) strMacBaslat({ mac, lvl: OD.lvl, tohum, cum, rakip: { ad: OD.rakip.ad }, online: true });
  else macBaslat(mac, OD.lvl, cum);
}
function macBaslat(mac, lvl, cum) {
  const liste = cum.filter(a => Array.isArray(a) && sAl(a));
  if (!liste.length) { not(tt('Maç başlatılamadı.')); return; }
  if (G.state === 'paused') G.state = 'over';
  Konus.sus();
  dojoBaslat({ id: 'online', lvl, ad: 'Online', world: tt('Online kapışma'), n: 0 },
    { online: { mac, liste, i: 0, t0: 0, benim: null, karar: null, sonDurum: '', durumT: 0, rakip: { ad: OD.rakip ? OD.rakip.ad : 'Rakip', cumle: 0, skor: 0, yigin: 0, sonuc: null } } });
}
// dojoBaslat çağırır: 3 · 2 · 1 · BAŞLA
function onlineGeriSayim() {
  const o = D.online;
  banner(tt('ONLINE KAPIŞMA'), tt('{lvl} · {ad} ile · {n} cümle', { lvl: D.r.lvl, ad: o.rakip.ad, n: o.liste.length }), '#ff6b9a', 1.6);
  ['3', '2', '1'].forEach((t, i) => sonra(1.2 + i * 0.75, () => { banner(t, '', '#ffd23d', 0.7); Ses.cal('tik', { ses: 0.7, hiz: 1.3 }); }));
  sonra(3.45, () => { if (!D || D.online !== o) return; banner(tt('BAŞLA!'), '', '#3dff7a', 0.9); Ses.cal('yukselis', { ses: 0.6 }); o.t0 = performance.now(); sonrakiTur(); });
}
// engine.update her karede çağırır: durum değiştiyse rakibe gönderilir (en çok saniyede ~2 kez)
function onlineTik() {
  const o = D.online; if (!o || o.karar || !o.t0) return;
  if (OD.bot) { botHizTik(o); return; }
  const t = performance.now(); if (t - o.durumT < 500) return;
  const yazi = D.istat.cumle + '|' + G.score + '|' + Math.round(G.gauge * 20);
  if (yazi === o.sonDurum && t - o.durumT < 4000) return;
  o.sonDurum = yazi; o.durumT = t;
  Ag.gonder({ t: 'durum', mac: o.mac, cumle: D.istat.cumle, skor: G.score, yigin: Math.round(G.gauge * 100) / 100 });
}
/* ---------------- bilgisayar rakip ---------------- */
const BOT_ADLAR = ['Robo Ada', 'Robo Can', 'Robo Ece', 'Robo Deniz', 'Robo Mert', 'Robo Su'];
const BOT_KELIME_SN = { A1: 3.0, A2: 3.1, B1: 3.2, B2: 3.4, C1: 3.6, C2: 3.8 };   // HIZ: kelime başına saniye (+ cümle başına okuma payı)
function botMacBaslat(mod, lvl) {
  odadanCik(true); eslesmeDur();
  OD.bot = true; OD.mod = mod === 'strateji' ? 'strateji' : 'hiz'; OD.lvl = SEVIYELER.indexOf(lvl) >= 0 ? lvl : onlineSeviye();
  OD.ad = temizAd(aktifProfil() ? aktifProfil().ad : 'Oyuncu'); OD.rakip = { ad: pick(BOT_ADLAR), bot: true, son: Date.now() };
  const mac = 'bot' + Math.random().toString(36).slice(2, 8);
  if (OD.mod === 'strateji') strMacBaslat({ mac, lvl: OD.lvl, tohum: Math.random().toString(36).slice(2, 10), cum: strCumleler(OD.lvl), rakip: { ad: OD.rakip.ad, bot: true }, online: false });
  else macBaslat(mac, OD.lvl, onlineCumleler(OD.lvl));
}
// HIZ bilgisayarı: her cümleyi seviyesine göre bir sürede bitirir (biraz rastgele); bazen hata yapar
function botHizTik(o) {
  const r = o.rakip;
  if (o.botT0 == null) o.botT0 = G.t;
  const t = (G.t - o.botT0) * 1000;   // oyun saati: oyuncu duraklatınca bilgisayar da bekler
  if (!o.botPlan) {
    let top = 0; const sn = BOT_KELIME_SN[D.r.lvl] || 3.2;
    o.botPlan = o.liste.map(a => { const s = sAl(a); top += ((s ? s.w.length : 6) * sn + 6) * rnd(0.85, 1.2) * 1000; return top; });
  }
  while (r.cumle < o.botPlan.length && t >= o.botPlan[r.cumle]) { r.cumle++; r.skor += Math.round(rnd(300, 900)); if (Math.random() < 0.3) r.yigin = clamp(r.yigin + 0.1, 0, 0.6); }
  if (r.cumle >= o.botPlan.length && !r.sonuc) { r.sonuc = 'tamam'; r.sure = o.botPlan[o.botPlan.length - 1]; onlineKarar(); }
  if (o.benim && !o.karar && o.benim.sonuc === 'tamam') onlineKarar(true);
}
// bu telefondaki sonuç: 'tamam' (bütün cümleler bitti) ya da 'yenildi' (hata göstergesi doldu)
function onlineBitir(sonuc) {
  const o = D && D.online; if (!o || o.benim) return;
  o.benim = { sonuc, sure: OD.bot && o.botT0 != null ? (G.t - o.botT0) * 1000 : o.t0 ? performance.now() - o.t0 : 1e9, skor: G.score, cumle: D.istat.cumle };
  const msg = { t: 'bitti', mac: o.mac, sonuc, sure: Math.round(o.benim.sure), skor: G.score, cumle: D.istat.cumle };
  [0, 800, 1800].forEach(ms => setTimeout(() => { if (OD.kod) Ag.gonder(Object.assign({}, msg)); }, ms));
  if (sonuc === 'tamam' && !o.karar) { G.state = 'over'; if (G.R) G.R.bitti = true; G.surukle = null; banner(tt('BİTİRDİN!'), tt('Rakibin sonucu bekleniyor…'), '#ffd23d', 1.4); }
  onlineKarar();
  if (!o.karar && sonuc === 'tamam') setTimeout(() => { if (D && D.online === o) onlineKarar(true); }, 1600);
}
function onlineKarar(sureDoldu) {
  const o = D && D.online; if (!o || o.karar) return;
  const b = o.benim, r = o.rakip.sonuc ? o.rakip : null, ad = esc(o.rakip.ad);
  if (b && r) {
    if (b.sonuc === 'tamam' && r.sonuc === 'tamam') return b.sure <= r.sure ? onlineKararVer('kazandin', tt('Cümleleri önce sen bitirdin.')) : onlineKararVer('kaybettin', tt('{ad} cümleleri senden önce bitirdi.', { ad }));
    if (b.sonuc === 'tamam') return onlineKararVer('kazandin', tt('Rakibinin hata göstergesi doldu.'));
    if (r.sonuc === 'tamam') return onlineKararVer('kaybettin', tt('Hata göstergen doldu.'));
    return b.sure >= r.sure ? onlineKararVer('kazandin', tt('Rakibinin hata göstergesi senden önce doldu.')) : onlineKararVer('kaybettin', tt('Hata göstergen rakibinden önce doldu.'));
  }
  if (b) { if (b.sonuc === 'yenildi') return onlineKararVer('kaybettin', tt('Hata göstergen doldu.')); if (sureDoldu) return onlineKararVer('kazandin', tt('Cümleleri önce sen bitirdin.')); return; }
  if (r) return r.sonuc === 'tamam' ? onlineKararVer('kaybettin', tt('{ad} cümleleri senden önce bitirdi.', { ad })) : onlineKararVer('kazandin', tt('Rakibinin hata göstergesi doldu.'));
}
function onlineKararVer(k, neden) {
  const o = D.online; if (o.karar) return;
  o.karar = { k, neden };
  Olay.yay('onlineBitti', { kazandi: k === 'kazandin', neden, mod: 'hiz', bot: OD.bot });
  if (!OD.bot) {   // bilgisayara karşı maçlar online istatistiğine sayılmaz (XP verir)
    kayit.istat.online = (kayit.istat.online || 0) + 1;
    if (k === 'kazandin') kayit.istat.onlineGalibiyet = (kayit.istat.onlineGalibiyet || 0) + 1;
  }
  kaydet();
  if (G.state === 'playing' || G.state === 'paused') { G.state = 'over'; if (G.R) G.R.bitti = true; G.surukle = null; Konus.sus(); Ses.kis(false); }
  if (k === 'kazandin') { Ses.kasetDur(0.8); sonra(0.4, () => { Ses.cal('zafer', { ses: 1 }); Ses.spiker(3, { oncelik: true }); }); const I = L.in; [0, 0.3, 0.6].forEach(t => sonra(t, () => firework(rnd(I.x + 30, I.x + I.w - 30), rnd(I.y + 40, I.y + I.h * 0.4), pick(['#ffd23d', '#19f0ff', '#ff3df2'])))); }
  else { Ses.kasetDur(0.8); sonra(0.3, () => Ses.cal('yenilgi', { ses: 0.8 })); }
  banner(tt(k === 'kazandin' ? 'KAZANDIN!' : 'KAYBETTİN'), neden.replace(/&[a-z]+;/g, ''), k === 'kazandin' ? '#ffd98a' : '#ff6b7d', 2);
  sonra(2.2, onlineSonucGoster);
}

/* ---------------- ekranlar ---------------- */
const ONLINE_MOD = {
  hiz: { i: '⚡', ad: 'HIZ', alt: 'Aynı cümleleri önce kuran kazanır', kural: 'İkiniz de aynı {n} cümleyi kendi telefonunda kurarsın. Önce bitiren kazanır; hata göstergesi dolan kaybeder.' },
  strateji: { i: '🧠', ad: 'STRATEJİ', alt: 'Renkleri diz, doğru kelimeleri seç, büyük patlamayı yap', kural: 'Aynı tahta, aynı cümle, sınırlı hamle. Aynı renkleri kelimelerin yanına topla, doğru kelimeleri kutulara çek ve bombala. Doğru cümle her zaman kazanır; ikiniz de doğruysa çok patlatan kazanır. 3 tur.' },
};
// online giriş: önce mod seçimi; bir moddan geri dönülünce (uyarıyla) o modun ekranı
function onlineAc(uyari) {
  if (onlineSonMod) { onlineModAc(onlineSonMod, uyari); return; }
  if (G.state !== 'menu') demo();
  Ses.muzik('menu'); Konus.sus();
  goster(`<div class="ust-satir"><button class="geri" id="o-geri">${tt('← Geri')}</button></div>
    <div class="ana-baslik">${tt('⚔ ONLINE KAPIŞMA')}</div>
    <p class="aciklama">${tt('Bir mod seç. Seviyeni seçip arkadaşınla, rastgele bir rakiple ya da bilgisayarla oyna.')}</p>
    <div class="mod-secim">${Object.keys(ONLINE_MOD).map(m => { const x = ONLINE_MOD[m]; return `<button class="mod-btn ${m}" id="o-${m}"><i>${x.i}</i><span><b>${tt(x.ad)}</b><small>${tt(x.alt)}</small></span></button>`; }).join('')}</div>
    ${uyari ? `<p class="uyari">${esc(uyari)}</p>` : ''}`, '', 'onlineSecim');
  $('#o-geri').onclick = () => acilisAc();
  Object.keys(ONLINE_MOD).forEach(m => { $('#o-' + m).onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); onlineModAc(m); }; });
}
function onlineModAc(mod, uyari) {
  mod = mod === 'strateji' ? 'strateji' : 'hiz'; onlineSonMod = mod;
  if (G.state !== 'menu') demo();
  Ses.muzik('menu'); Konus.sus();
  if (SEVIYELER.indexOf(onlineSecLvl) < 0) onlineSecLvl = sonAcikSeviye();
  const x = ONLINE_MOD[mod], lvl = onlineSecLvl;
  goster(`<div class="ust-satir"><button class="geri" id="o-geri">${tt('← Geri')}</button></div>
    <div class="ana-baslik">${x.i} ${tt(x.ad)}</div>
    <p class="aciklama">${tt(x.kural, { n: ONLINE_CUMLE })}</p>
    ${uyari ? `<p class="uyari">${esc(uyari)}</p>` : ''}
    <div class="bolum">${tt('Seviyen')}</div>
    <div class="sekmeler kucuk lvl-sec" id="o-lvl">${SEVIYELER.map(l => `<button data-l="${l}" class="${l === lvl ? 'secili' : ''}">${l}</button>`).join('')}</div>
    <p class="aciklama kucuk" style="text-align:center">${esc(seviyeAd(lvl))} · ${tt('rakibin de bu seviyeden olur')}</p>
    <button class="big" id="o-hizli">${tt('🎲 HIZLI EŞLEŞ')}</button>
    <button class="sec genis-btn" id="o-bot">${tt('🤖 BİLGİSAYARA KARŞI')}</button>
    <div class="ayrac">${tt('ya da arkadaşınla oda koduyla')}</div>
    <div class="row"><button class="sec" id="o-kur">${tt('ODA KUR')}</button></div>
    <div class="kod-satir"><input id="o-kod" class="giris kod" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="${tt('Kod')}" autocomplete="off"><button class="sec" id="o-katil">${tt('KATIL')}</button></div>
    <p class="aciklama kucuk">${tt('İkiniz de internete bağlı olmalısınız. Bağlantı ücretsiz genel sunucular üzerinden kurulur; bazen bağlanmak birkaç saniye sürebilir.')}</p>`, '', 'online');
  $('#o-geri').onclick = () => { onlineSonMod = null; onlineAc(); };
  card.querySelectorAll('#o-lvl button').forEach(b => b.onclick = () => { onlineSecLvl = b.dataset.l; Ses.cal('tik', { ses: 0.4 }); onlineModAc(mod); });
  $('#o-hizli').onclick = () => { sesAc(); eslesmeBaslat(mod, lvl); };
  $('#o-bot').onclick = () => { sesAc(); botMacBaslat(mod, lvl); };
  $('#o-kur').onclick = () => { sesAc(); odaBaglan(String(1000 + Math.floor(Math.random() * 9000)), 'ev', { mod, lvl }); lobiAc(); };
  const kod = $('#o-kod');
  const katil = () => { const k = kod.value.replace(/\D/g, ''); if (k.length !== 4) { not(tt('4 haneli oda kodunu yaz.')); kod.focus(); return; } sesAc(); odaBaglan(k, 'misafir', { mod }); lobiAc(); };
  $('#o-katil').onclick = katil;
  kod.oninput = () => { kod.value = kod.value.replace(/\D/g, '').slice(0, 4); };
  kod.onkeydown = e => { if (e.key === 'Enter') katil(); };
}

/* ---------------- hızlı eşleşme ---------------- */
const ES = { aktif: false, mod: 'hiz', lvl: 'A1', teklif: null, t0: 0, T: null };
function eslesmeBaslat(mod, lvl) {
  eslesmeDur(); odadanCik(true);
  Object.assign(ES, { aktif: true, mod, lvl, teklif: null, t0: Date.now() });
  OD.ad = temizAd(aktifProfil() ? aktifProfil().ad : 'Oyuncu');
  setTimeout(() => {
    if (!ES.aktif) return;
    Ag.baslat('lobi-' + mod + '-' + lvl, eslesmeMesaj, () => { if (ekran === 'eslesme') eslesmeCiz(); });
    const yay = () => { if (!ES.aktif) return; Ag.gonder({ t: 'bekle', ad: OD.ad }); if (ES.teklif && Date.now() - ES.teklif.t > 4500) ES.teklif = null; if (ekran === 'eslesme') eslesmeCiz(); };
    ES.T = setInterval(yay, 2000); setTimeout(yay, 600);
  }, 350);
  eslesmeAc();
}
function eslesmeDur() { clearInterval(ES.T); ES.T = null; if (ES.aktif) { ES.aktif = false; Ag.kapat(); } ES.teklif = null; }
function eslesmeMesaj(o) {
  if (!ES.aktif || (o.hedef && o.hedef !== Ag.id())) return;
  if (o.t === 'bekle') {            // iki bekleyenden kimliği küçük olan teklif eder (ikisi birden teklif etmesin)
    if (!ES.teklif && Ag.id() < o.c) { const kod = 'q' + Math.random().toString(36).slice(2, 10); ES.teklif = { kod, c: o.c, t: Date.now() }; Ag.gonder({ t: 'teklif', hedef: o.c, kod, ad: OD.ad }); }
    return;
  }
  if (o.t === 'teklif') {
    if (ES.teklif || typeof o.kod !== 'string') return;
    const { mod, lvl } = ES, kod = o.kod.replace(/[^a-z0-9]/gi, '').slice(0, 12);
    clearInterval(ES.T); ES.T = null; ES.aktif = false;
    [0, 350, 800].forEach(ms => setTimeout(() => Ag.gonder({ t: 'kabul', hedef: o.c, kod }), ms));
    setTimeout(() => { odaBaglan(kod, 'misafir', { mod, lvl, eslesme: true }); lobiAc(); }, 1200);
    return;
  }
  if (o.t === 'kabul') {
    if (!ES.teklif || o.kod !== ES.teklif.kod) return;
    const { mod, lvl } = ES, kod = o.kod;
    clearInterval(ES.T); ES.T = null; ES.aktif = false;
    odaBaglan(kod, 'ev', { mod, lvl, oto: true }); lobiAc();
  }
}
function eslesmeAc() {
  const x = ONLINE_MOD[ES.mod];
  goster(`<div class="ana-baslik">${x.i} ${tt(x.ad)} · ${ES.lvl}</div>
    <div class="arama"><span class="arama-halka"></span><b>${tt('Rakip aranıyor…')}</b><small id="es-sure"></small></div>
    <p class="aciklama" id="es-not" style="text-align:center"></p>
    <button class="big" id="es-bot">${tt('🤖 BİLGİSAYARA KARŞI OYNA')}</button>
    <div class="row"><button class="sec" id="es-iptal">${tt('İPTAL')}</button></div>`, '', 'eslesme');
  $('#es-bot').onclick = () => { const { mod, lvl } = ES; eslesmeDur(); botMacBaslat(mod, lvl); };
  $('#es-iptal').onclick = () => { eslesmeDur(); onlineModAc(ES.mod); };
  eslesmeCiz();
}
function eslesmeCiz() {
  if (ekran !== 'eslesme') return;
  const sn = Math.floor((Date.now() - ES.t0) / 1000), d = Ag.durum();
  const s = $('#es-sure'); if (s) s.textContent = (d === 'acik' ? tt('● Bağlı') : tt('… Bağlanıyor')) + ' · ' + sn + ' sn';
  const n = $('#es-not'); if (n) n.textContent = sn >= 20 ? tt('Şu an bu seviyede bekleyen kimse yok. Beklemeye devam edebilir ya da bilgisayara karşı oynayabilirsin.') : tt('Aynı mod ve seviyede bekleyen biri bulununca maç kendiliğinden başlar.');
}
function lobiAc() {
  if (G.state !== 'menu') demo();
  Ses.muzik('menu');
  const ev = OD.rol === 'ev';
  const mx = ONLINE_MOD[OD.mod] || ONLINE_MOD.hiz;
  goster(`<div class="ana-baslik">${mx.i} ${tt(mx.ad)}</div>
    <div class="oda-kod-bas">${tt(ev ? 'ODA KODU' : 'ODA')}</div>
    <div class="oda-kod">${OD.oto ? '🎲' : esc(OD.kod)}</div>
    ${ev && !OD.oto ? '<p class="aciklama" style="text-align:center">' + tt('Bu kodu arkadaşına söyle. Arkadaşın “Katıl”a basıp kodu yazınca maçı başlatabilirsin.') + '</p>' : ''}
    <div class="oda-bilgi">
      <div><span>${tt('Bağlantı')}</span><b id="oda-ag"></b></div>
      <div><span>${tt('Rakip')}</span><b id="oda-rakip"></b></div>
      <div><span>${tt('Seviye')}</span>${ev && !OD.oto ? `<select id="oda-lvl" class="secici">${SEVIYELER.map(l => `<option value="${l}"${l === OD.lvl ? ' selected' : ''}>${l} · ${esc(seviyeAd(l))}</option>`).join('')}</select>` : '<b id="oda-lvl-yazi"></b>'}</div>
    </div>
    ${ev && !OD.oto ? '<button class="big" id="oda-basla">' + tt('MAÇI BAŞLAT') + '</button>' : '<p class="aciklama" id="oda-not" style="text-align:center"></p>'}
    <div class="row"><button class="sec" id="oda-cik">${tt('ODADAN ÇIK')}</button></div>`, '', 'oda');
  $('#oda-cik').onclick = () => { odadanCik(); onlineAc(); };
  if (OD.oto && OD.rol === 'misafir') setTimeout(() => { if (ekran === 'oda' && !OD.rakip) { odadanCik(true); onlineAc(tt('Rakiple bağlantı kurulamadı. Tekrar dene.')); } }, 16000);
  if (ev && !OD.oto) {
    $('#oda-lvl').onchange = e => { OD.lvl = e.target.value; Ag.gonder({ t: 'nabiz', ad: OD.ad, lvl: OD.lvl }); };
    $('#oda-basla').onclick = () => { if (!OD.rakip) { not(tt('Önce arkadaşın odaya gelmeli.')); return; } sesAc(); macBaslatEv(); };
  }
  lobiGuncelle();
}
function lobiGuncelle() {
  if (ekran !== 'oda') return;
  const d = Ag.durum(), ag = $('#oda-ag');
  if (ag) { ag.textContent = tt(d === 'acik' ? '● Bağlı' : d === 'baglaniyor' ? '… Bağlanıyor' : '✖ Bağlanamadı, tekrar deneniyor'); ag.className = 'ag-' + d; }
  const r = $('#oda-rakip');
  if (r) r.textContent = OD.rakip ? '✔ ' + OD.rakip.ad : tt(OD.rol === 'ev' ? 'Bekleniyor…' : 'Oda aranıyor…');
  const b = $('#oda-basla'); if (b) b.disabled = !OD.rakip;
  const ly = $('#oda-lvl-yazi'); if (ly) ly.textContent = OD.lvl + ' · ' + seviyeAd(OD.lvl);
  const n = $('#oda-not'); if (n) n.textContent = OD.oto ? (OD.rakip ? tt('Rakip bulundu: {ad}. Maç başlıyor…', { ad: OD.rakip.ad }) : tt('Rakibe bağlanılıyor…')) : OD.rakip ? tt('{ad} maçı başlatınca oyun kendiliğinden açılır.', { ad: OD.rakip.ad }) : '';
}
function onlineSonucGoster() {
  const o = D && D.online; if (!o || !o.karar) return;
  const b = o.benim || { cumle: D.istat.cumle, skor: G.score }, r = o.rakip, top = o.liste.length, kaz = o.karar.k === 'kazandin';
  const sure = x => x && x.sure && x.sure < 1e8 ? Math.floor(x.sure / 60000) + ':' + String(Math.floor(x.sure / 1000) % 60).padStart(2, '0') : '–';
  const ad = OD.ad || tt('Sen');
  goster(`<div class="go ${kaz ? 'zafer' : ''}" style="font-size:clamp(34px,10vw,54px)">${tt(kaz ? 'KAZANDIN!' : 'KAYBETTİN')}</div>
    <div class="sonuc-alt">${o.karar.neden}</div>
    <table class="mac-tablo"><tr><th></th><th>${esc(ad)}</th><th>${esc(r.ad)}</th></tr>
      <tr><td>${tt('Cümle')}</td><td>${b.cumle} / ${top}</td><td>${r.cumle || 0} / ${top}</td></tr>
      <tr><td>${tt('Skor')}</td><td>${b.skor}</td><td>${r.skor || 0}</td></tr>
      <tr><td>${tt('Süre')}</td><td>${b.sonuc === 'tamam' ? sure(b) : '–'}</td><td>${r.sonuc === 'tamam' ? sure(r) : '–'}</td></tr></table>
    ${D.ilerleme ? `<div class="sonuc-alt">+${D.ilerleme.xp} XP · 🔥 ${tt('{n} gün seri', { n: D.ilerleme.seri })}</div>` : ''}
    <div class="sonuc-alt kucuk">${OD.bot ? '🤖 ' + tt('Bilgisayara karşı · ') : ''}${tt('Online: {m} maç · {g} galibiyet', { m: kayit.istat.online || 0, g: kayit.istat.onlineGalibiyet || 0 })}${D.hatalar.length ? tt(' · hataların Defterim’e eklendi') : ''}</div>
    ${OD.bot ? '<button class="big" id="os-tekrar">' + tt('TEKRAR OYNA') + '</button>' : OD.rol === 'ev' && OD.rakip ? '<button class="big" id="os-tekrar">' + tt('TEKRAR KAPIŞ') + '</button>' : OD.rakip ? `<p class="aciklama" style="text-align:center">${tt('{ad} yeni maç başlatırsa oyun kendiliğinden açılır.', { ad: esc(OD.rakip.ad) })}</p>` : ''}
    <div class="row"><button class="sec" id="os-cik">${tt(OD.bot ? 'ÇIK' : 'ODADAN ÇIK')}</button></div>`, '', 'onlineSonuc');
  const t = $('#os-tekrar'); if (t) t.onclick = () => { if (OD.bot) { botMacBaslat('hiz', D.r.lvl); return; } D = null; lobiAc(); };
  $('#os-cik').onclick = () => { odadanCik(); onlineAc(); };
}
// sessiz: rakibe haber vermeden (oda bulunamadı / dolu durumunda)
function odadanCik(sessiz) {
  if (OD.kod && !sessiz) { Ag.gonder({ t: 'cikti' }); }
  const ag = Ag; setTimeout(() => { if (!OD.kod) ag.kapat(); }, sessiz ? 0 : 300);
  odaSifirla();
  if (D && D.online) { D = null; if (G.state !== 'menu') G.state = 'over'; }
}
