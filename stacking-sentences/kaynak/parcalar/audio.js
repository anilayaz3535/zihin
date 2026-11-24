/* =====================================================================
   SES
   · muzik  : sakin, sıcak lo-fi döngü (23 Kasım 2026, oyuncunun tarifiyle üretildi): yumuşak Rhodes piyano akorları
              (Fmaj9 · Em7 · Dm9 · Cmaj9), ahşap marimba ezgisi, yumuşak bas, sert olmayan hafif ritim, plak hışırtısı ve
              cızırtısı, hafif kaset salınımı; 75 BPM, 8 ölçü (25.6 sn), 22.05 kHz mono, dikişsiz döngü
              (oyun boyunca döner; menüde kısık ve boğuk).
   · spiker : erkek spiker sesi kaldırıldı (23 Kasım 2026, oyuncu isteği); Ses.spiker() hep false döner.
   · efektler: dosyasız, tarayıcıda üretilen sesler. Tahta oynanışı için:
       al (karoyu tut) · kay (yer değiştir) · geri (yanlış karo geri seker) · dus (karolar yağar)
       pop (baloncuk patlaması: dizi ve renk eşleşmesi) · zincir (zincirleme kombo) · super (süper patlama)
       bomba (CÜMLE BOMBASI) · saat (süre bitiyor) · altin (para kasaya düştü) · kasa (puan sayacı doldu: ka-çing)
   ===================================================================== */
const Ses = (function () {
  const ACx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, ana, muzikG, efektG, kisG, filtre;
  const tampon = {};
  let istenen = null, muzikK = null, muzikKG = null, kaset = false, gurultu = null;
  let yogunlukSev = 0;

  function rampa(p, h, s) {
    if (!ctx) return;
    const t = ctx.currentTime;
    try { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(h, t + s); }
    catch (e) { p.value = h; }
  }

  function baslat() {
    if (ctx || !ACx) return;
    try { ctx = new ACx(); } catch (e) { ctx = null; return; }
    ana = ctx.createGain();
    try {
      const sk = ctx.createDynamicsCompressor();
      sk.threshold.value = -13; sk.knee.value = 10; sk.ratio.value = 6;
      sk.attack.value = 0.004; sk.release.value = 0.22;
      ana.connect(sk); sk.connect(ctx.destination);
    } catch (e) { ana.connect(ctx.destination); }

    kisG = ctx.createGain(); kisG.connect(ana);
    filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 18500; filtre.Q.value = 0.7;
    filtre.connect(kisG);

    muzikG = ctx.createGain(); muzikG.gain.value = kayit.ayar.muzik ? 0.76 : 0; muzikG.connect(filtre);
    efektG = ctx.createGain(); efektG.gain.value = kayit.ayar.efekt ? 0.8 : 0; efektG.connect(ana);

    try {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { }

    ['muzik'].forEach(ad => yukle(ad, () => {
      if (ad === 'muzik' && istenen && !PARCA[istenen]) muzik(istenen);
    }));
    if (PARCA[istenen]) muzik(istenen);   // canlı müzik dosya beklemez
  }

  function yukle(ad, bitti) {
    const gom = window.SES_VERI && window.SES_VERI[ad];
    const coz = ab => {
      try {
        const p = ctx.decodeAudioData(ab, buf => { tampon[ad] = buf; bitti(); }, () => bitti());
        if (p && p.catch) p.catch(() => { });
      } catch (e) { bitti(); }
    };
    if (gom) {
      try {
        const ik = atob(gom), u = new Uint8Array(ik.length);
        for (let k = 0; k < ik.length; k++) u[k] = ik.charCodeAt(k);
        coz(u.buffer);
      } catch (e) { bitti(); }
      return;
    }
    const x = new XMLHttpRequest();
    x.open('GET', 'ses/' + ad + (ad === 'muzik' ? '.wav' : '.mp3'), true);
    x.responseType = 'arraybuffer';
    x.onload = () => { if (!x.response || (x.status && x.status >= 400)) { bitti(); return; } coz(x.response); };
    x.onerror = () => bitti();
    try { x.send(); } catch (e) { bitti(); }
  }

  /* ---- canlı müzik (online HIZ ve STRATEJİ): dosyasız, tarayıcıda çalınırken üretilir; oyunun gerilimine göre katman ekler ----
     gerilim 0: temel · 1: başa baş / son 30 sn · 2: son cümle / son 10 sn. Müzik ses ayarı ve kısmalar (konuşma, bomba) geçerlidir. */
  const mid = n => 440 * Math.pow(2, (n - 69) / 12);
  let sira = null;
  function mNota(t, f, d, v, tip, lp, atak) {
    const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = tip || 'triangle'; o.frequency.setValueAtTime(f, t);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + (atak || 0.006)); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(gn); } else o.connect(gn);
    gn.connect(sira.g); o.start(t); o.stop(t + d + 0.05);
  }
  function mGurultu(t, d, v, fc, tip, q) {
    const sr = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    sr.buffer = gurultuTampon(); fl.type = tip || 'highpass'; fl.frequency.value = fc; if (q) fl.Q.value = q;
    gn.gain.setValueAtTime(Math.max(0.0002, v), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    sr.connect(fl); fl.connect(gn); gn.connect(sira.g); sr.start(t, Math.random() * 0.5); sr.stop(t + d + 0.03);
  }
  function mKick(t, v) {
    const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(gn); gn.connect(sira.g); o.start(t); o.stop(t + 0.35);
  }
  const PARCA = {
    // ⚡ HIZ: 128 BPM, Am – F – C – G; dört vuruş davul, el çırpma, sekizlik bas, arpej; gerilimle 16'lık zil ve melodi
    hiz: { bpm: 128, akor: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], cal(s, n, t) {
      const st = n % 16, ak = this.akor[Math.floor(n / 16) % 4], g = s.gerilim;
      if (st % 4 === 0) mKick(t, 0.55);
      if (st === 4 || st === 12) { mGurultu(t, 0.14, 0.16, 1500, 'bandpass', 0.8); mNota(t, 210, 0.08, 0.06, 'triangle'); }
      if (st % 2 === 1) mGurultu(t, 0.045, 0.05, 7500);
      else if (g >= 1) mGurultu(t, 0.03, 0.03, 9000);
      if (st % 2 === 0) mNota(t, mid(ak[0] - 24 + (st === 6 || st === 14 ? 12 : 0)), 0.16, 0.16, 'sawtooth', 420);
      const arp = [0, 1, 2, 1][st % 4]; mNota(t, mid(ak[arp] + 12 + (g >= 2 && st % 8 >= 4 ? 12 : 0)), 0.11, g >= 1 ? 0.055 : 0.035, 'square', 2600);
      if (st === 0) ak.forEach(m => mNota(t, mid(m), 1.7, 0.022, 'sawtooth', 900, 0.25));
      if (g >= 2 && [0, 3, 6, 10, 12].indexOf(st) >= 0) mNota(t, mid(ak[[2, 1, 2, 0, 1][[0, 3, 6, 10, 12].indexOf(st)]] + 24), 0.18, 0.05, 'triangle');
    } },
    // 🧠 STRATEJİ: 96 BPM, Dm7 – B♭maj7 – Gm7 – A7; marimba ostinatosu, sıcak pad, yumuşak ritim; gerilimle saat tiki ve 16'lık zil
    strateji: { bpm: 96, kazanc: 1.7, akor: [[62, 65, 69, 72], [58, 62, 65, 69], [55, 58, 62, 65], [57, 61, 64, 67]], cal(s, n, t) {
      const st = n % 16, ak = this.akor[Math.floor(n / 16) % 4], g = s.gerilim;
      if (st === 0 || st === 10) mKick(t, 0.32);
      if (st === 4 || st === 12) mGurultu(t, 0.05, 0.07, 3200, 'bandpass', 3);
      if (st % 2 === 0) { const m = ak[[0, 2, 1, 3, 0, 2, 1, 2][st / 2]] + 12; mNota(t, mid(m), 0.32, 0.075, 'sine'); mNota(t, mid(m) * 4, 0.06, 0.012, 'sine'); if (g >= 2) mNota(t, mid(m + 12), 0.2, 0.03, 'sine'); }
      if (st === 0) { ak.forEach(m => mNota(t, mid(m - 12), 2.4, 0.018, 'sawtooth', g >= 2 ? 1800 : 800, 0.5)); mNota(t, mid(ak[0] - 24), 0.9, 0.18, 'triangle', 500); }
      if (st === 8) mNota(t, mid(ak[2] - 24), 0.6, 0.13, 'triangle', 500);
      if (g >= 1) { mGurultu(t, 0.025, st % 4 === 2 ? 0.035 : 0.018, 8000); if (st % 4 === 0) mNota(t, 1760, 0.03, 0.03, 'sine'); }
    } },
  };
  function siraTik() {
    const s = sira; if (!s || !ctx) return;
    if (ctx.state !== 'running') { s.t = ctx.currentTime + 0.05; return; }
    if (s.t < ctx.currentTime - 0.2) s.t = ctx.currentTime + 0.05;   // sekme arka plandaydıysa birikeni çalma
    const dt = 60 / s.P.bpm / 4;
    while (s.t < ctx.currentTime + 0.15) { try { s.P.cal(s, s.n, s.t); } catch (e) { } s.n++; s.t += dt; }
  }
  function siraBaslat(ad) {
    if (sira && sira.ad === ad) return;
    siraDur(0.4);
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(muzikG);
    sira = { ad, P: PARCA[ad], n: 0, t: ctx.currentTime + 0.12, g, gerilim: 0 };
    rampa(g.gain, 0.9 * (PARCA[ad].kazanc || 1), 1.2);
    sira.T = setInterval(siraTik, 25);
  }
  function siraDur(sure) {
    const s = sira; if (!s) return;
    sira = null; clearInterval(s.T); rampa(s.g.gain, 0, sure || 0.5);
    setTimeout(() => { try { s.g.disconnect(); } catch (e) { } }, (sure || 0.5) * 1000 + 400);
  }
  function gerilim(n) { if (sira) sira.gerilim = Math.max(0, Math.min(2, n | 0)); }

  // dinleme / denetim için: canlı müziği ve efektleri çevrimdışı ses bağlamında kaydeder (oyun kullanmaz; test ve önizleme)
  // plan: [[saniye, gerilim], …] · efektler: [[saniye, efekt, ses], …] → mono Float32Array (44.1 kHz)
  async function onizle(ad, sn, plan, efektler) {
    const eski = { ctx, muzikG, efektG, sira, gurultu };
    const oc = new OfflineAudioContext(1, Math.round(44100 * sn), 44100);
    try {
      ctx = oc; gurultu = null;
      const sk = oc.createDynamicsCompressor(); sk.threshold.value = -13; sk.knee.value = 10; sk.ratio.value = 6; sk.attack.value = 0.004; sk.release.value = 0.22; sk.connect(oc.destination);
      muzikG = oc.createGain(); muzikG.gain.value = 0.76; muzikG.connect(sk);
      efektG = oc.createGain(); efektG.gain.value = 0.8; efektG.connect(sk);
      if (ad) {
        const g = oc.createGain(); g.gain.value = 0.9 * (PARCA[ad].kazanc || 1); g.connect(muzikG);
        sira = { ad, P: PARCA[ad], n: 0, t: 0.05, g, gerilim: 0 };
        const dt = 60 / sira.P.bpm / 4;
        while (sira.t < sn - 0.3) { (plan || []).forEach(([z, gr]) => { if (sira.t >= z) sira.gerilim = gr; }); sira.P.cal(sira, sira.n, sira.t); sira.n++; sira.t += dt; }
      }
      (efektler || []).forEach(([z, e, v]) => EF[e]((v == null ? 1 : v) * 1.2, z, 1));
      const buf = await oc.startRendering();
      return buf.getChannelData(0);
    } finally { ctx = eski.ctx; muzikG = eski.muzikG; efektG = eski.efektG; sira = eski.sira; gurultu = eski.gurultu; }
  }

  // tur: 'menu' (kısık, boğuk) · 'duello' (oyun, tam) · 'hiz' / 'strateji' (canlı müzik) · null (sus)
  function muzik(tur) {
    istenen = tur;
    if (!ctx) return;
    if (PARCA[tur]) {
      if (muzikK) rampa(muzikKG.gain, 0, 0.8);   // lo-fi döngü susar (çalmaya devam eder, menüde geri gelir)
      if (kaset) { kaset = false; if (muzikK) { try { muzikK.stop(); } catch (e) { } muzikK = null; } }
      const p = filtre.frequency, t = ctx.currentTime;
      try { p.cancelScheduledValues(t); p.setValueAtTime(Math.max(60, p.value), t); p.exponentialRampToValueAtTime(18500, t + 0.5); } catch (e) { }
      siraBaslat(tur);
      return;
    }
    siraDur(0.8);
    if (!tur) {
      if (muzikK) {
        const k = muzikK, g = muzikKG; muzikK = null;
        rampa(g.gain, 0, 0.6);
        setTimeout(() => { try { k.stop(); } catch (e) { } }, 700);
      }
      return;
    }
    if (kaset) { kaset = false; if (muzikK) { try { muzikK.stop(); } catch (e) { } muzikK = null; } }
    if (!muzikK && tampon.muzik) {
      muzikKG = ctx.createGain(); muzikKG.gain.value = 0; muzikKG.connect(muzikG);
      muzikK = ctx.createBufferSource(); muzikK.buffer = tampon.muzik; muzikK.loop = true; muzikK.connect(muzikKG);
      muzikK.start(ctx.currentTime + 0.05);
    }
    if (!muzikK) return;
    const hedefGain = tur === 'menu' ? 0.42 : (0.86 + yogunlukSev * 0.035);
    rampa(muzikKG.gain, hedefGain, 0.8);
    const p = filtre.frequency, t = ctx.currentTime;
    try {
      p.cancelScheduledValues(t); p.setValueAtTime(Math.max(60, p.value), t);
      p.exponentialRampToValueAtTime(tur === 'menu' ? 1450 : 18500, t + 0.8);
    } catch (e) { }
  }

  function yogunluk(sev, ani) {
    yogunlukSev = Math.max(0, Math.min(3, sev || 0));
    if (!ctx || !muzikKG || istenen !== 'duello' || kaset) return;
    const hedef = 0.86 + yogunlukSev * 0.035;
    if (ani) { try { muzikKG.gain.value = hedef; } catch (e) { } }
    else rampa(muzikKG.gain, hedef, 0.35);
  }

  function bogul(f, sure, geri) {
    if (!ctx || kaset || istenen !== 'duello') return;
    const p = filtre.frequency, t = ctx.currentTime;
    try {
      p.cancelScheduledValues(t); p.setValueAtTime(Math.max(60, p.value), t);
      p.exponentialRampToValueAtTime(Math.max(60, f), t + (sure || 0.08));
      if (geri) p.exponentialRampToValueAtTime(18500, t + (sure || 0.08) + geri);
    } catch (e) { }
  }

  // oyun sonu: müzik yavaşlayıp susar
  function kasetDur(sure) {
    if (sira) siraDur(sure || 0.7);
    if (!ctx || !muzikK || kaset) return;
    kaset = true; sure = sure || 0.7;
    const t = ctx.currentTime;
    try { const pr = muzikK.playbackRate; pr.cancelScheduledValues(t); pr.setValueAtTime(1, t); pr.exponentialRampToValueAtTime(0.08, t + sure); } catch (e) { }
    try { const gg = muzikKG.gain; gg.cancelScheduledValues(t); gg.setValueAtTime(gg.value, t); gg.linearRampToValueAtTime(0, t + sure + 0.05); } catch (e) { }
    const k = muzikK;
    setTimeout(() => { if (muzikK === k) { try { k.stop(); } catch (e) { } muzikK = null; } }, sure * 1000 + 150);
  }

  // erkek spiker sesi kaldırıldı (oyuncu isteği): oyundaki çağrılar zararsız kalsın diye hep false döner
  function spiker() { return false; }

  // ---- efektler (dosyasız, videodaki sıcak & parlak katmanlar) ----
  function gurultuTampon() {
    if (gurultu) return gurultu;
    const n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (gurultu = b);
  }

  function ton(f, d, tip, v, f2, gec) {
    const t0 = ctx.currentTime + (gec || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tip || 'triangle';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(efektG);
    o.start(t0); o.stop(t0 + d + 0.03);
  }

  function hisir(d, v, fc, gec, tip) {
    const t0 = ctx.currentTime + (gec || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = gurultuTampon();
    f.type = tip || 'lowpass'; f.frequency.value = fc;
    g.gain.setValueAtTime(Math.max(0.0002, v), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    s.connect(f); f.connect(g); g.connect(efektG);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + d + 0.03);
  }

  const EF = {
    kes: (v, g, h) => {
      [587.33, 783.99, 1174.66].forEach((f, i) => {
        ton(f * h, 0.14, 'triangle', 0.115 * v, null, g + i * 0.042);
        ton(f * 2 * h, 0.075, 'sine', 0.045 * v, null, g + i * 0.042 + 0.01);
      });
    },
    savur: (v, g) => { hisir(0.16, 0.07 * v, 2100, g, 'bandpass'); ton(820, 0.12, 'sine', 0.095 * v, 340, g); },
    yanlis: (v, g) => { ton(170, 0.28, 'triangle', 0.14 * v, 80, g); hisir(0.14, 0.07 * v, 520, g); },
    darbe: (v, g) => { ton(110, 0.2, 'sine', 0.22 * v, 42, g); hisir(0.1, 0.1 * v, 350, g); },
    patlama: (v, g) => { hisir(0.55, 0.16 * v, 850, g); ton(82, 0.28, 'sine', 0.19 * v, 36, g); },
    damga: (v, g) => {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => ton(f, 0.22, 'triangle', 0.095 * v, null, g + i * 0.055));
      [523.25, 783.99, 1046.5].forEach(f => ton(f, 0.65, 'sine', 0.08 * v, null, g + 0.36));
    },
    yukselis: (v, g) => [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => ton(f, 0.16, 'triangle', 0.105 * v, null, g + i * 0.065)),
    bitirici: (v, g) => [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => ton(f, 0.18, 'triangle', 0.095 * v, null, g + i * 0.05)),
    savustur: (v, g) => { [880, 1174.66, 1760].forEach((f, i) => ton(f, 0.15, 'triangle', 0.095 * v, null, g + i * 0.042)); hisir(0.12, 0.055 * v, 3400, g, 'bandpass'); },
    gong: (v, g) => [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => ton(f, 0.18, 'sine', 0.095 * v, null, g + i * 0.075)),
    kelime: (v, g, h) => ton(440 * h, 0.13, 'triangle', 0.11 * v, 880 * h, g),
    tik: (v, g, h) => ton(660 * h, 0.04, 'sine', 0.06 * v, null, g),
    ko: (v, g) => { hisir(0.28, 0.11 * v, 1400, g); ton(260, 0.22, 'triangle', 0.1 * v, 115, g); },
    zafer: (v, g) => {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => ton(f, 0.24, 'triangle', 0.095 * v, null, g + i * 0.065));
      [523.25, 783.99, 1046.5, 1567.98].forEach(f => ton(f, 0.9, 'sine', 0.08 * v, null, g + 0.48));
    },
    yenilgi: (v, g) => { [440, 349.23, 261.63, 196].forEach((f, i) => ton(f, 0.3, 'triangle', 0.11 * v, f * 0.97, g + i * 0.18)); hisir(0.9, 0.09 * v, 450, g + 0.1); },
    yukle: (v, g) => ton(240, 0.28, 'triangle', 0.08 * v, 740, g),
    atilma: (v, g) => ton(280, 0.11, 'sine', 0.07 * v, 540, g),
    nota: (v, g, h) => { ton(523.25 * h, 0.15, 'triangle', 0.115 * v, null, g); ton(1046.5 * h, 0.08, 'sine', 0.045 * v, null, g); },

    // ---- karo tahtası (videodaki yumuşak hareket ve coşkulu patlamalar) ----
    al: (v, g, h) => {
      ton(560 * h, 0.055, 'sine', 0.095 * v, 820 * h, g);
      ton(1120 * h, 0.035, 'triangle', 0.035 * v, null, g + 0.008);
    },
    kay: (v, g, h) => {
      ton(340 * h, 0.075, 'sine', 0.085 * v, 520 * h, g);
      ton(680 * h, 0.04, 'triangle', 0.025 * v, 920 * h, g + 0.015);
    },
    geri: (v, g, h) => {
      ton(260 * h, 0.11, 'sine', 0.12 * v, 150 * h, g);
      ton(210 * h, 0.12, 'triangle', 0.08 * v, 290 * h, g + 0.11);
    },
    dus: (v, g, h) => {
      for (let i = 0; i < 3; i++) {
        const gg = g + i * 0.048;
        ton((390 + i * 75) * h, 0.055, 'sine', 0.055 * v, 195 * h, gg);
      }
    },
    pop: (v, g, h) => {
      ton(380 * h, 0.085, 'sine', 0.17 * v, 1340 * h, g);
      ton(760 * h, 0.095, 'triangle', 0.1 * v, 1760 * h, g + 0.012);
      ton(1520 * h, 0.06, 'sine', 0.045 * v, 2280 * h, g + 0.02);
      hisir(0.075, 0.055 * v, 2600, g, 'bandpass');
    },
    zincir: (v, g, h) => {
      [0, 4, 7, 12, 16, 19].forEach((y, i) => {
        const freq = 587.33 * h * Math.pow(2, y / 12);
        ton(freq, 0.16, 'triangle', 0.095 * v, null, g + i * 0.042);
        ton(freq * 1.5, 0.095, 'sine', 0.05 * v, null, g + i * 0.042 + 0.018);
      });
      hisir(0.24, 0.065 * v, 2400, g, 'bandpass');
    },
    super: (v, g) => {
      ton(98, 0.38, 'sine', 0.21 * v, 42, g);
      ton(58, 0.5, 'sine', 0.18 * v, 26, g + 0.01);   // daha güçlü alt bas
      hisir(0.68, 0.15 * v, 1250, g);
      [0, 4, 7, 12, 16, 19, 24].forEach((y, i) => {
        const freq = 523.25 * Math.pow(2, y / 12);
        ton(freq, 0.24, 'triangle', 0.08 * v, null, g + 0.045 + i * 0.048);
        ton(freq * 2, 0.13, 'sine', 0.04 * v, null, g + 0.065 + i * 0.048);
      });
    },
    bomba: (v, g) => {
      ton(80, 0.48, 'sine', 0.24 * v, 32, g);
      ton(52, 0.6, 'sine', 0.2 * v, 24, g + 0.01);   // daha güçlü alt bas
      hisir(0.82, 0.17 * v, 980, g);
      [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => ton(f, 0.18, 'triangle', 0.07 * v, null, g + 0.16 + i * 0.05));
    },
    // strateji bombası: önce içine çekme, sonra alt bası güçlü büyük patlama (patlayan karo arttıkça ses büyür)
    emme: (v, g) => {
      const t0 = ctx.currentTime + g, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gg = ctx.createGain();
      s.buffer = gurultuTampon(); f.type = 'bandpass'; f.Q.value = 2.5;
      f.frequency.setValueAtTime(260, t0); f.frequency.exponentialRampToValueAtTime(4200, t0 + 0.5);
      gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(0.26 * v, t0 + 0.47); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.56);
      s.connect(f); f.connect(gg); gg.connect(efektG); s.start(t0, Math.random() * 0.3); s.stop(t0 + 0.6);
      ton(110, 0.52, 'sawtooth', 0.035 * v, 880, g);
    },
    megaBomba: (v, g) => {
      ton(120, 0.95, 'sine', 0.4 * v, 26, g);
      ton(64, 1.2, 'sine', 0.3 * v, 22, g + 0.02);
      ton(240, 0.25, 'square', 0.06 * v, 60, g);
      hisir(1.4, 0.3 * v, 1700, g);
      hisir(0.4, 0.2 * v, 5200, g, 'highpass');
      hisir(0.9, 0.12 * v, 420, g + 0.05);
      [0, 7, 12, 16, 19, 24, 28, 31].forEach((y, i) => { const f = 392 * Math.pow(2, y / 12); ton(f, 0.32, 'triangle', 0.07 * v, null, g + 0.14 + i * 0.045); ton(f * 2, 0.16, 'sine', 0.035 * v, null, g + 0.16 + i * 0.045); });
    },
    zincirBum: (v, g, h) => {
      ton(90 * h, 0.5, 'sine', 0.3 * v, 30, g);
      hisir(0.6, 0.18 * v, 2200, g);
      [0, 4, 7, 12, 16].forEach((y, i) => ton(659.25 * h * Math.pow(2, y / 12), 0.2, 'square', 0.035 * v, null, g + 0.05 + i * 0.04));
    },
    saat: (v, g, h) => { ton(1200 * h, 0.035, 'sine', 0.06 * v, null, g); ton(600 * h, 0.05, 'triangle', 0.06 * v, null, g + 0.01); },
    altin: (v, g, h) => {
      ton(2349.32 * h, 0.11, 'sine', 0.065 * v, null, g);
      ton(3520 * h, 0.07, 'sine', 0.032 * v, null, g + 0.005);
    },
    kasa: (v, g) => {
      ton(260, 0.05, 'triangle', 0.055 * v, 150, g);
      [1318.5, 1975.5, 2637, 3520].forEach((f, i) => ton(f, 0.65 - i * 0.1, 'sine', (0.065 - i * 0.01) * v, null, g + 0.07));
    }
  };

  const GAM = [0, 2, 4, 7, 9];
  function nota(adim, ses, gecikme) {
    const a = ((adim % 10) + 10) % 10, yari = 12 * Math.floor(a / 5) + GAM[a % 5];
    cal('nota', { hiz: Math.pow(2, yari / 12), ses: ses == null ? 0.5 : ses, gecikme });
  }

  function cal(ad, o) {
    if (!ctx || !EF[ad]) return;
    o = o || {};
    try { EF[ad]((o.ses == null ? 1 : o.ses) * 1.2, o.gecikme || 0, o.hiz || 1); } catch (e) { }
  }

  function zarf(gn, t, a, h, s, d) {
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, h), t + a);
    gn.gain.setValueAtTime(Math.max(0.0002, h), t + a + s);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + a + s + d);
  }

  function sentez(tur, o) {
    if (!ctx) return;
    o = o || {};
    try {
      const t = ctx.currentTime + (o.gecikme || 0), v = o.ses == null ? 0.55 : o.ses, cik = ctx.createGain();
      cik.connect(efektG);
      let gn, src, f, osc;
      if (tur === 'gok') {
        src = ctx.createBufferSource(); src.buffer = gurultuTampon(); src.start(t, Math.random() * 0.3); src.stop(t + 1.3);
        f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(140, t + 1.0);
        gn = ctx.createGain(); zarf(gn, t, 0.005, v * 0.9, 0.04, 1.1); src.connect(f); f.connect(gn); gn.connect(cik);
      } else if (tur === 'gum') {
        osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(38, t + 0.32);
        gn = ctx.createGain(); zarf(gn, t, 0.004, v * 0.9, 0.02, 0.35); osc.connect(gn); gn.connect(cik); osc.start(t); osc.stop(t + 0.45);
      } else if (tur === 'odul') {
        [0, 4, 7, 12, 16].forEach((yari, i) => {
          const oo = ctx.createOscillator(); oo.type = 'triangle'; oo.frequency.value = 523.25 * Math.pow(2, yari / 12);
          const gg = ctx.createGain(); zarf(gg, t + i * 0.055, 0.005, v * 0.32, 0.03, 0.32);
          oo.connect(gg); gg.connect(cik); oo.start(t + i * 0.055); oo.stop(t + i * 0.055 + 0.45);
        });
      } else if (tur === 'yuksel') {
        osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(780, t + (o.sure || 0.45));
        f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + (o.sure || 0.45)); f.Q.value = 4;
        gn = ctx.createGain(); zarf(gn, t, (o.sure || 0.45) * 0.75, v * 0.22, 0.02, 0.12); osc.connect(f); f.connect(gn); gn.connect(cik); osc.start(t); osc.stop(t + (o.sure || 0.45) + 0.2);
      }
      setTimeout(() => { try { cik.disconnect(); } catch (e) { } }, 2200 + (o.gecikme || 0) * 1000);
    } catch (e) { }
  }

  function ayarla() {
    if (!ctx) return;
    rampa(muzikG.gain, kayit.ayar.muzik ? 0.76 : 0, 0.3);
    rampa(efektG.gain, kayit.ayar.efekt ? 0.8 : 0, 0.1);
  }

  function kis(evet) { if (ctx) rampa(kisG.gain, evet ? 0.28 : 1, evet ? 0.2 : 0.6); }
  function uyan() { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume) { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } }
  function uyu() { if (ctx && ctx.state === 'running' && ctx.suspend) { try { ctx.suspend(); } catch (e) { } } }

  return { onizle, baslat, muzik, gerilim, parca: () => (sira ? sira.ad : null), yogunluk, cal, ayarla, kis, uyan, uyu, sentez, bogul, kasetDur, nota, spiker, hazir: ad => !!tampon[ad], acik: () => !!ctx, durum: () => ctx ? ctx.state : 'yok' };
})();

/* =====================================================================
   SESLİ OKUMA — cihazın kendi okuma sesi (Web Speech)
   Türkçe: cihazda listelenen Türkçe ses varsa o, yoksa dil 'tr-TR' verilerek okunur (motor kendi Türkçe sesini seçer).
   Telefonda okuma ancak bir dokunuştan sonra açılır; ilk dokunuşta sessiz bir okumayla kilit açılır.
   Chrome'un takılma huyları için: duraklamışsa sürdür, iptalden hemen sonra okutma (kısa bekle), sözceyi çöpe atılmasın diye sakla.
   ===================================================================== */
const Konus = (function () {
  // Uygulamada (Capacitor) telefonun yerel okuma motoru: Android WebView'de Web Speech yoktur, iOS'ta da yerel motor daha güvenilir
  const yerli = (() => { const c = window.Capacitor; return (c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() && c.Plugins && c.Plugins.TextToSpeech) || null; })();
  const var_ = !!yerli || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
  let ses = null, sesTr = null, sesSay = 0, tok = 0, kisT = null, acildi = false, sonDil = 'tr';
  const tut = [], calisti = { tr: false, en: false };
  function sec() {
    if (!var_ || yerli) return;
    let v = []; try { v = speechSynthesis.getVoices() || []; } catch (e) { }
    sesSay = v.length;
    let en = v.filter(x => /^en[-_]US/i.test(x.lang));
    if (!en.length) en = v.filter(x => /^en/i.test(x.lang));
    const tercih = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Ava', 'Allison', 'Alex'];
    ses = null;
    for (let i = 0; i < tercih.length && !ses; i++) for (let j = 0; j < en.length; j++) if (en[j].name.indexOf(tercih[i]) >= 0) { ses = en[j]; break; }
    if (!ses && en.length) ses = en[0];
    const tr = v.filter(x => /^tr([-_]|$)/i.test(x.lang) || /türk|turk/i.test(x.name));
    const trTercih = ['Yelda', 'Google T', 'Emel', 'Tolga', 'Cem', 'Filiz'];
    sesTr = null;
    for (let a = 0; a < trTercih.length && !sesTr; a++) for (let b = 0; b < tr.length; b++) if (tr[b].name.indexOf(trTercih[a]) >= 0) { sesTr = tr[b]; break; }
    if (!sesTr && tr.length) sesTr = tr.find(x => x.localService) || tr[0];
  }
  if (var_ && !yerli) { sec(); try { speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', sec) : (speechSynthesis.onvoiceschanged = sec); } catch (e) { } setTimeout(sec, 500); setTimeout(sec, 2000); }
  function ac() {
    if (!var_ || yerli) return;
    if (!sesSay) sec();
    try { speechSynthesis.cancel(); if (speechSynthesis.paused) speechSynthesis.resume(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'tr-TR'; tut.push(u); speechSynthesis.speak(u); acildi = true; } catch (e) { }
  }
  function kisBitir(t) { if (t === tok) { Konus.konusuyor = false; Ses.kis(false); } }
  function basla(sure) { const t = ++tok; Konus.konusuyor = true; Ses.kis(true); clearTimeout(kisT); kisT = setTimeout(() => kisBitir(t), sure); return t; }
  function soyle(metin, o) {
    o = o || {};
    const tr = o.dil === 'tr';
    if (!metin || !(o.zorla || (tr ? kayit.ayar.trSes !== false : kayit.ayar.ses))) return false;
    if (!var_) return false;
    if (yerli) return yerliSoyle(metin, o, tr);
    if (!sesSay) sec();
    try {
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = tr ? (sesTr ? sesTr.lang.replace('_', '-') : 'tr-TR') : (ses ? ses.lang.replace('_', '-') : 'en-US');
      u.rate = o.hiz || (tr ? 1 : 0.9);
      const v = tr ? sesTr : ses; if (v) u.voice = v;
      const t2 = basla(2500 + metin.length * 120);
      let bitti = false;
      const son = () => { if (bitti) return; bitti = true; kisBitir(t2); const f = o.bitti; o.bitti = null; if (f) { try { f(); } catch (e) { } } const i = tut.indexOf(u); if (i >= 0) tut.splice(i, 1); };
      u.onend = son; u.onerror = son;
      const dil = tr ? 'tr' : 'en'; sonDil = dil;
      u.onstart = () => { calisti[dil] = true; if (o.basladi) { try { o.basladi(); } catch (e) { } } };
      tut.push(u); if (tut.length > 12) tut.shift();
      const konusuyordu = speechSynthesis.speaking || speechSynthesis.pending;
      if (!o.sira && konusuyordu) { speechSynthesis.cancel(); setTimeout(() => { try { if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { son(); } }, 90); }
      else { if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(u); }
      return true;
    } catch (e) { return false; }
  }
  // yerel okuma: her okuma bir söz (Promise) döner; yeni okuma (sırada değilse) eskisini keser, kesilen okumanın 'bitti'si hemen çağrılır (Web Speech'teki gibi)
  let yerliSira = Promise.resolve();
  const yerliAcik = new Set();          // okunan ve sırada bekleyen okumaların bitiş işlevleri
  function yerliKes() { const l = [...yerliAcik]; yerliAcik.clear(); l.forEach(f => f()); }
  function yerliSoyle(metin, o, tr) {
    const dil = tr ? 'tr' : 'en'; sonDil = dil;
    const t2 = basla(2500 + metin.length * 120);
    let bitti = false;
    const son = () => { if (bitti) return; bitti = true; yerliAcik.delete(son); kisBitir(t2); const f = o.bitti; o.bitti = null; if (f) { try { f(); } catch (e) { } } };
    const oku = () => {
      if (bitti) return Promise.resolve();
      calisti[dil] = true;
      if (o.basladi) { try { o.basladi(); } catch (e) { } }
      return Promise.resolve(yerli.speak({ text: metin, lang: tr ? 'tr-TR' : 'en-US', rate: o.hiz || (tr ? 1 : 0.9), pitch: 1, volume: 1, category: 'ambient' })).then(son, son);
    };
    if (o.sira) { yerliAcik.add(son); yerliSira = yerliSira.then(oku, oku); }
    else { yerliKes(); yerliAcik.add(son); yerliSira = Promise.resolve(yerli.stop()).catch(() => { }).then(oku); }
    return true;
  }
  function tr(metin, o) { o = o || {}; o.dil = 'tr'; return soyle(metin, o); }
  function trVar() { return var_ && kayit.ayar.trSes !== false; }
  function hazir() { return var_ && !!kayit.ayar.ses; }
  function sus() { if (yerli) { try { yerli.stop(); } catch (x) { } yerliKes(); } else if (var_) { try { speechSynthesis.cancel(); } catch (e) { } } tok++; Konus.konusuyor = false; Ses.kis(false); }
  function bilgi() { if (yerli) return { var: true, say: 2, en: 'en-US', tr: 'tr-TR', acildi: true, yerli: true }; if (var_ && !sesSay) sec(); return { var: var_, say: sesSay, en: ses ? ses.name + ' (' + ses.lang + ')' : '', tr: sesTr ? sesTr.name + ' (' + sesTr.lang + ')' : '', acildi }; }
  function baslamaSuresi() { return calisti[sonDil] ? 4 : (sonDil === 'tr' ? sesTr : ses) ? 3 : 1.8; }
  return { ac, soyle, tr, trVar, hazir, sus, bilgi, baslamaSuresi, konusuyor: false };
})();
let sesBasladi = false, konusKilit = 0;
function sesAc() { if (sesBasladi) { Ses.uyan(); return; } sesBasladi = true; Ses.baslat(); }
['touchend', 'click', 'keydown'].forEach(ad => document.addEventListener(ad, () => {
  sesAc(); Ses.uyan();
  if (konusKilit < 2 && !Konus.konusuyor) { konusKilit++; Konus.ac(); }
}, { capture: true, passive: true }));
