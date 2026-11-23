/* =====================================================================
   ONLINE KAPIŞMA — oda koduyla iki telefon
   · Ev sahibi oda kurar, 4 haneli kod çıkar; arkadaşı kodu yazıp katılır.
   · İkisi aynı 5 cümleyi kendi tahtasında kurar. Önce bitiren kazanır; hata göstergesi dolan kaybeder.
   · Bağlantı: ücretsiz genel MQTT sunucuları (WebSocket). İki sunucuya birden bağlanılır, biri çalışmazsa
     öbürü yeter; aynı mesaj iki yoldan gelirse bir kez işlenir. Sunucular deneme amaçlıdır, garanti vermez.
   · Mesajlar (konu: tetris-english-tr/v1/oda/<kod>):
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
const OD = { rol: null, kod: '', ad: '', lvl: 'A1', rakip: null, mac: null, hazirMac: null, araT: null, araBitis: 0, nabizT: null, baslaT: null };
const temizAd = s => String(s || 'Rakip').replace(/[<>&"\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Rakip';
function odaSifirla() {
  clearInterval(OD.araT); clearInterval(OD.nabizT); clearInterval(OD.baslaT);
  Object.assign(OD, { rol: null, kod: '', rakip: null, mac: null, hazirMac: null, araT: null, nabizT: null, baslaT: null });
}
function onlineSeviye() { const l = kayit.sonLvl; return SEVIYELER.indexOf(l) >= 0 ? l : 'A1'; }
function odaBaglan(kod, rol) {
  odaSifirla();
  OD.rol = rol; OD.kod = kod; OD.ad = temizAd(aktifProfil() ? aktifProfil().ad : 'Oyuncu');
  if (rol === 'ev') OD.lvl = onlineSeviye();
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
  Ag.gonder({ t: 'nabiz', ad: OD.ad, lvl: OD.lvl });
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
    OD.rakip = { cid: o.c, ad: temizAd(o.ad), son: Date.now() };
    Ag.gonder({ t: 'oda', hedef: o.c, ad: OD.ad, lvl: OD.lvl });
    if (yeni) { Ses.cal('yukselis', { ses: 0.5 }); if (ekran === 'oda') lobiGuncelle(); }
    return;
  }
  if (o.t === 'oda') {
    if (OD.rol !== 'misafir' || OD.rakip) return;
    clearInterval(OD.araT); OD.araT = null;
    OD.rakip = { cid: o.c, ad: temizAd(o.ad), son: Date.now() }; OD.lvl = SEVIYELER.indexOf(o.lvl) >= 0 ? o.lvl : 'A1';
    Ses.cal('yukselis', { ses: 0.5 });
    if (ekran === 'oda') lobiGuncelle();
    return;
  }
  if (o.t === 'dolu') { if (OD.rol === 'misafir' && !OD.rakip) { odadanCik(true); onlineAc(tt('Bu oda dolu. Başka bir kod dene ya da kendin oda kur.')); } return; }
  // buradan sonrası yalnız eşleşilen rakipten
  const r = OD.rakip; if (!r || o.c !== r.cid) return;
  r.son = Date.now();
  if (o.t === 'nabiz') { if (OD.rol === 'misafir' && o.lvl && o.lvl !== OD.lvl && SEVIYELER.indexOf(o.lvl) >= 0) { OD.lvl = o.lvl; if (ekran === 'oda') lobiGuncelle(); } return; }
  if (o.t === 'basla') {
    if (OD.rol !== 'misafir' || !Array.isArray(o.cum) || !o.cum.length) return;
    Ag.gonder({ t: 'hazir', mac: o.mac, hedef: o.c });
    if (OD.mac === o.mac) return;
    OD.mac = o.mac; OD.lvl = o.lvl;
    macBaslat(o.mac, o.lvl, o.cum);
    return;
  }
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
  if (D && D.online && !D.online.karar) { onlineKararVer('kazandin', tt(neden === 'ayrildi' ? '{ad} maçtan ayrıldı.' : '{ad} ile bağlantı koptu.', { ad: esc(r.ad) })); return; }
  if (OD.rol === 'ev') { not(tt(neden === 'ayrildi' ? '{ad} odadan ayrıldı.' : '{ad} ile bağlantı koptu.', { ad: r.ad })); if (ekran === 'oda') lobiGuncelle(); }
  else if (ekran === 'oda' || ekran === 'onlineSonuc') { odadanCik(true); onlineAc(tt(neden === 'ayrildi' ? 'Ev sahibi odayı kapattı.' : 'Ev sahibiyle bağlantı koptu.')); }
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
  const mac = Math.random().toString(36).slice(2, 9), cum = onlineCumleler(OD.lvl);
  OD.mac = mac; OD.hazirMac = null;
  const msg = { t: 'basla', hedef: OD.rakip.cid, mac, lvl: OD.lvl, cum };
  Ag.gonder(Object.assign({}, msg));
  let n = 0; clearInterval(OD.baslaT);
  OD.baslaT = setInterval(() => { if (OD.hazirMac === mac || ++n > 8 || OD.mac !== mac || !OD.rakip) { clearInterval(OD.baslaT); OD.baslaT = null; return; } Ag.gonder(Object.assign({}, msg, { hedef: OD.rakip.cid })); }, 1000);
  macBaslat(mac, OD.lvl, cum);
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
  const t = performance.now(); if (t - o.durumT < 500) return;
  const yazi = D.istat.cumle + '|' + G.score + '|' + Math.round(G.gauge * 20);
  if (yazi === o.sonDurum && t - o.durumT < 4000) return;
  o.sonDurum = yazi; o.durumT = t;
  Ag.gonder({ t: 'durum', mac: o.mac, cumle: D.istat.cumle, skor: G.score, yigin: Math.round(G.gauge * 100) / 100 });
}
// bu telefondaki sonuç: 'tamam' (bütün cümleler bitti) ya da 'yenildi' (hata göstergesi doldu)
function onlineBitir(sonuc) {
  const o = D && D.online; if (!o || o.benim) return;
  o.benim = { sonuc, sure: o.t0 ? performance.now() - o.t0 : 1e9, skor: G.score, cumle: D.istat.cumle };
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
  Olay.yay('onlineBitti', { kazandi: k === 'kazandin', neden });
  kayit.istat.online = (kayit.istat.online || 0) + 1;
  if (k === 'kazandin') kayit.istat.onlineGalibiyet = (kayit.istat.onlineGalibiyet || 0) + 1;
  kaydet();
  if (G.state === 'playing' || G.state === 'paused') { G.state = 'over'; if (G.R) G.R.bitti = true; G.surukle = null; Konus.sus(); Ses.kis(false); }
  if (k === 'kazandin') { Ses.kasetDur(0.8); sonra(0.4, () => { Ses.cal('zafer', { ses: 1 }); Ses.spiker(3, { oncelik: true }); }); const I = L.in; [0, 0.3, 0.6].forEach(t => sonra(t, () => firework(rnd(I.x + 30, I.x + I.w - 30), rnd(I.y + 40, I.y + I.h * 0.4), pick(['#ffd23d', '#19f0ff', '#ff3df2'])))); }
  else { Ses.kasetDur(0.8); sonra(0.3, () => Ses.cal('yenilgi', { ses: 0.8 })); }
  banner(tt(k === 'kazandin' ? 'KAZANDIN!' : 'KAYBETTİN'), neden.replace(/&[a-z]+;/g, ''), k === 'kazandin' ? '#ffd98a' : '#ff6b7d', 2);
  sonra(2.2, onlineSonucGoster);
}

/* ---------------- ekranlar ---------------- */
function onlineAc(uyari) {
  if (G.state !== 'menu') demo();
  Ses.muzik('menu'); Konus.sus();
  goster(`<div class="ust-satir"><button class="geri" id="o-geri">${tt('← Geri')}</button></div>
    <div class="ana-baslik">${tt('⚔ ONLINE KAPIŞMA')}</div>
    <p class="aciklama">${tt('Arkadaşınla aynı {n} cümleyi kendi telefonunda kur. Önce bitiren kazanır, hata göstergesi dolan kaybeder.', { n: ONLINE_CUMLE })}</p>
    ${uyari ? `<p class="uyari">${esc(uyari)}</p>` : ''}
    <button class="big" id="o-kur">${tt('ODA KUR')}</button>
    <div class="ayrac">${tt('ya da arkadaşının oda koduyla katıl')}</div>
    <div class="kod-satir"><input id="o-kod" class="giris kod" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="${tt('Kod')}" autocomplete="off"><button class="sec" id="o-katil">${tt('KATIL')}</button></div>
    <p class="aciklama kucuk">${tt('İkiniz de internete bağlı olmalısınız. Bağlantı ücretsiz genel sunucular üzerinden kurulur; bazen bağlanmak birkaç saniye sürebilir.')}</p>`, '', 'online');
  $('#o-geri').onclick = () => acilisAc();
  $('#o-kur').onclick = () => { sesAc(); odaBaglan(String(1000 + Math.floor(Math.random() * 9000)), 'ev'); lobiAc(); };
  const kod = $('#o-kod');
  const katil = () => { const k = kod.value.replace(/\D/g, ''); if (k.length !== 4) { not(tt('4 haneli oda kodunu yaz.')); kod.focus(); return; } sesAc(); odaBaglan(k, 'misafir'); lobiAc(); };
  $('#o-katil').onclick = katil;
  kod.oninput = () => { kod.value = kod.value.replace(/\D/g, '').slice(0, 4); };
  kod.onkeydown = e => { if (e.key === 'Enter') katil(); };
}
function lobiAc() {
  if (G.state !== 'menu') demo();
  Ses.muzik('menu');
  const ev = OD.rol === 'ev';
  goster(`<div class="ana-baslik">${tt('⚔ ONLINE KAPIŞMA')}</div>
    <div class="oda-kod-bas">${tt(ev ? 'ODA KODU' : 'ODA')}</div>
    <div class="oda-kod">${esc(OD.kod)}</div>
    ${ev ? '<p class="aciklama" style="text-align:center">' + tt('Bu kodu arkadaşına söyle. Arkadaşın “Katıl”a basıp kodu yazınca maçı başlatabilirsin.') + '</p>' : ''}
    <div class="oda-bilgi">
      <div><span>${tt('Bağlantı')}</span><b id="oda-ag"></b></div>
      <div><span>${tt('Rakip')}</span><b id="oda-rakip"></b></div>
      <div><span>${tt('Seviye')}</span>${ev ? `<select id="oda-lvl" class="secici">${SEVIYELER.map(l => `<option value="${l}"${l === OD.lvl ? ' selected' : ''}>${l} · ${esc(seviyeAd(l))}</option>`).join('')}</select>` : '<b id="oda-lvl-yazi"></b>'}</div>
    </div>
    ${ev ? '<button class="big" id="oda-basla">' + tt('MAÇI BAŞLAT') + '</button>' : '<p class="aciklama" id="oda-not" style="text-align:center"></p>'}
    <div class="row"><button class="sec" id="oda-cik">${tt('ODADAN ÇIK')}</button></div>`, '', 'oda');
  $('#oda-cik').onclick = () => { odadanCik(); onlineAc(); };
  if (ev) {
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
  const n = $('#oda-not'); if (n) n.textContent = OD.rakip ? tt('{ad} maçı başlatınca oyun kendiliğinden açılır.', { ad: OD.rakip.ad }) : '';
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
    <div class="sonuc-alt kucuk">${tt('Online: {m} maç · {g} galibiyet', { m: kayit.istat.online || 0, g: kayit.istat.onlineGalibiyet || 0 })}${D.hatalar.length ? tt(' · hataların Defterim’e eklendi') : ''}</div>
    ${OD.rol === 'ev' && OD.rakip ? '<button class="big" id="os-tekrar">' + tt('TEKRAR KAPIŞ') + '</button>' : OD.rakip ? `<p class="aciklama" style="text-align:center">${tt('{ad} yeni maç başlatırsa oyun kendiliğinden açılır.', { ad: esc(OD.rakip.ad) })}</p>` : ''}
    <div class="row"><button class="sec" id="os-cik">${tt('ODADAN ÇIK')}</button></div>`, '', 'onlineSonuc');
  const t = $('#os-tekrar'); if (t) t.onclick = () => { D = null; lobiAc(); };
  $('#os-cik').onclick = () => { odadanCik(); onlineAc(); };
}
// sessiz: rakibe haber vermeden (oda bulunamadı / dolu durumunda)
function odadanCik(sessiz) {
  if (OD.kod && !sessiz) { Ag.gonder({ t: 'cikti' }); }
  const ag = Ag; setTimeout(() => { if (!OD.kod) ag.kapat(); }, sessiz ? 0 : 300);
  odaSifirla();
  if (D && D.online) { D = null; if (G.state !== 'menu') G.state = 'over'; }
}
