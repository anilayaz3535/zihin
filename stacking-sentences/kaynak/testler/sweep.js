// Bütün içeriği tahtada kurar ve ölçer: her cümle ve her kelime sorusu için tahta (sütun = hedefin uzunluğu, en az 6),
// karo yazılarının okunurluğu, Türkçe kutusunun sığması, öğretim verisinin (çeldiriciler, seçenekler, hata maddeleri) sağlamlığı.
window.__sweep = function (parca = 0, toplam = 1) {   // büyük taramayı parçalara bölerek çalıştırır (tarayıcı hafızası için)
  const benim = (x, i) => i % toplam === parca;
  const out = { sentences: 0, words: 0, issues: {}, samples: {}, enUzun: { cumle: 0, harf: 0, sutun: 0 } };
  const add = (k, v) => { out.issues[k] = (out.issues[k] || 0) + 1; (out.samples[k] = out.samples[k] || []).length < 6 && out.samples[k].push(v); };
  G.state = 'playing';
  D = { r: C.rivals[0], li: 0, n: 0, istat: { cumle: 0, kusursuz: 0, yanlis: 0, dogru: 0, sav: 0, savOk: 0, test: 0, testOk: 0 }, hatalar: [], kullanilan: {}, tekrarKullanilan: {}, kullanilanHata: {}, hizKat: 1, tur: 0 };
  // tahta ölçüsü: sütun sayısı hedefe yetiyor mu, en küçük karo yazısı, Türkçe kutusu sığıyor mu
  const olc = (R, etiket, metin) => {
    G.R = R; tahtaKur(R);
    const T = G.T, I = L.in;
    out.enUzun.sutun = Math.max(out.enUzun.sutun, T.cols);
    if (R.hedef) R.hedef.parcalar.forEach(p => { if (p.dizi.length > T.cols) add('tahta-tasma', etiket + ' ' + metin); });
    if (T.y + T.rows * T.ch > I.y + I.h + 1) add('tahta-kuyudan-tasma', etiket + ' ' + metin);
    let enKucuk = 99;
    (R.hedef ? [].concat(...R.hedef.parcalar.map(p => p.dizi)) : []).concat(R.cel || []).forEach(x => { const b = karoBoyut(T, { span: 1 }); enKucuk = Math.min(enKucuk, karoYaziOlc(x, b.w, b.h).fs); });
    if (enKucuk < 8) add('karo-yazi-kucuk(<8)', etiket + ' ' + enKucuk + ' ' + metin);
    const p = R.dinle && R.s ? Object.assign({}, R.prompt, { alt: R.s.tr }) : R.prompt;
    ctx.save(); const d = promptDuzen(R, p, I.w - 8, 0.6); ctx.restore();
    if (d.h > L.promptAlan.h + 0.5) add('prompt-sigmiyor-' + etiket, Math.round(d.h - L.promptAlan.h) + 'px ' + metin);
    drawPrompt(0); drawTahta(0);
    return T;
  };
  for (const r of C.rivals.filter(benim)) {
    if (r.karma) continue;
    const list = cumleler(r.id);
    if (!list.length) add('rival-no-sentences', r.id);
    D.r = r; D.li = seviyeZor(r.lvl);
    for (const s of list) {
      out.sentences++;
      out.enUzun.cumle = Math.max(out.enUzun.cumle, s.w.length);
      if (s.w.length !== tokenle(s.en).length) add('token-mismatch', s.en);
      if (s.w.some(o => o[1] === o[0] || o[2] === o[0])) add('distractor-equals-word', s.en);
      if (s.w.some(o => !o[1] && !o[2])) add('word-no-distractor', s.en + ' :: ' + s.w.filter(o => !o[1] && !o[2]).map(o => o[0]).join(','));
      for (const d of [false, true]) {
        D.dinle = d;
        const R = turKur(s); R.hata = 0; R.bitti = false;
        const T = olc(R, d ? 'dinle' : 'cumle', d ? s.en : s.tr);
        if (T.cols !== Math.max(6, s.w.length)) add('cumle-sutun-yanlis', T.cols + ' ' + s.en);
      }
      D.dinle = false;
    }
  }
  // packs / words
  for (const p of C.packs.filter(benim)) {
    const ws = paketKelimeleri(p.id);
    D.r = p; D.li = seviyeZor(p.lvl);
    D.kelime = { kuyruk: [], i: 0, yeniSet: {}, dogru: {}, hatali: {}, gorulen: [], ogrenilen: [] };
    for (const w of ws) {
      out.words++;
      const o = kelimeOrnek(w);
      if (!o) add('word-no-example', w.en + ' (' + p.id + ')');
      for (const tip of ['anlam', 'ters', 'dinle', 'bosluk']) {
        if (tip === 'bosluk' && !boslukluMu(w)) continue;
        const R = turTest({ tip, w }); R.hata = 0; R.bitti = false;
        const uniq = new Set(R.secenek.map(x => x.toLowerCase()));
        if (uniq.size < R.secenek.length) add('dup-options', tip + ' ' + w.en + ': ' + R.secenek.join('|'));
        if (R.secenek.length < 3) add('few-options-' + tip, w.en + ': ' + R.secenek.join('|'));
        if (tip === 'ters' && R.secenek.some(x => x !== R.dogru && x.toLowerCase() === R.dogru.toLowerCase())) add('ters-dup', w.en);
        if (!R.hedef.parcalar.length) add('harf-yok-' + tip, w.en + ' / ' + R.hedef.metin);
        if (tip === 'bosluk' && R.prompt.ana.indexOf('___') < 0) add('bosluk-yok', w.en + ' / ' + (o && o.en));
        R.hedef.parcalar.forEach(q => { out.enUzun.harf = Math.max(out.enUzun.harf, q.dizi.length); });
        olc(R, 'test', tip + ' ' + w.en);
      }
      const R = turTanis({ w }); olc(R, 'tanis', w.en);
    }
  }
  // Türkçe kutusunun üst satırları dar ekranda sığıyor mu (sığmazsa küçülerek yazılır)
  if (parca === 0) {
  ctx.save(); const usF = Math.round(clamp(L.stripH * 0.38, 10, 15)); ctx.font = `700 ${usF}px ${FONT}`;
  ['YENİ KELİME · Oku, dinle, sonra harflerini diz', 'CÜMLEYİ KUR · İngilizcesini yerleştir', 'TEKRAR · CÜMLEYİ KUR · İngilizcesini yerleştir', 'HATAYI BUL · Doğru yazılışı yanlışın üstüne kaydır', 'TEKRAR · HATAYI BUL · Doğru kelimeyi yanlışın üstüne kaydır', 'B2 · TEKRAR · KELİME · Türkçesi verilen kelimeyi harf harf diz', '🔊 DİNLE · karolar okuma bitince düşecek'].forEach(t => { const tw = ctx.measureText(t).width; if (tw > L.in.w - 8) add('header-overflow', Math.round(tw) + '>' + (L.in.w - 8) + ' ' + t); });
  ctx.restore();
  }
  // sav items
  D.kelime = null;
  for (const r of C.rivals.filter(r => !r.karma).slice(0, 400).filter(benim)) {
    D.r = r; D.li = seviyeZor(r.lvl); D.kullanilan = {}; D.kullanilanHata = {};
    for (let k = 0; k < 6; k++) {
      let m; try { m = savunmaMaddesi(); } catch (e) { add('sav-exception', r.id + ' ' + e.message); continue; }
      if (!m.kural) add('sav-no-rule', r.id + ' ' + m.tokens.join(' '));
      if (m.tokens[m.idx] === m.dogru) add('sav-wrong-equals-right', r.id + ' ' + m.tokens.join(' '));
      if (!m.klasik && m.tokens[m.idx] && m.dogru && m.tokens[m.idx].toLowerCase() === m.dogru.toLowerCase()) add('sav-case-only', r.id + ' ' + m.tokens.join(' '));
      if (k === 0) { const R = turSav(m); R.hata = 0; R.bitti = false; olc(R, 'sav', m.tokens.join(' ')); if (G.T.cols < m.tokens.length) add('sav-tasma', m.tokens.join(' ')); }
    }
  }
  G.R = null; G.T = null; D = null; G.state = 'menu';
  return out;
};
