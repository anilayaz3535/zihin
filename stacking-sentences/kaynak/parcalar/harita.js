/* =====================================================================
   ÜNİTE HARİTASI (Kariyer ekranındaki yol)
   İçerikteki bölgeler (r.bolge) birer ünitedir; çoğu bir ara sınavla biter.
   Bu dosya yalnız gösterimdir: kilit kuralları (rakipAcikMi, paketAcikMi), bölüm
   sırası, içerik ve öğretim değişmez; durağa dokununca eskisi gibi cumleDojo /
   paketBaslat açılır. Kelime paketlerinin bölgesi olmadığından ardışık paketler
   türüne göre (konu paketleri / "Kelime N") en çok 6'lık gruplara ayrılır.
   Ünite tamam: bir bölgenin son yıldızsız bölümü ilk kez kazanılınca D.uniteTamam
   dolar (sonuç ekranında kutlanır) ve 'uniteTamam' olayı duyurulur.
   ===================================================================== */
const uniteOnbellek = {}, paketGrupOnbellek = {};
const SAYILI_PAKET = /^Kelime (\d+)$/;
const YOL_X = [22, 62, 78, 38];      // zikzak: durağın yatay yeri (%); yazı durağın geniş tarafına yazılır
const YOL_SATIR = 108, YOL_UST = 40; // px: iki durak arası, ilk durağın üstündeki boşluk

function uniteler(l) {
  if (uniteOnbellek[l]) return uniteOnbellek[l];
  const u = [];
  seviyeRakipleri(l).forEach(r => {
    const son = u[u.length - 1], b = r.bolge || '';
    if (son && son.bolge === b) son.bolumler.push(r); else u.push({ bolge: b, no: u.length + 1, bolumler: [r] });
  });
  return (uniteOnbellek[l] = u);
}
function uniteBul(r) { return r ? uniteler(r.lvl).find(u => u.bolumler.includes(r)) || null : null; }
function uniteDurum(u) {
  let yildiz = 0, biten = 0, acik = 0;
  u.bolumler.forEach(r => { const y = kayit.yildiz[r.id] || 0; yildiz += y; if (y) biten++; if (rakipAcikMi(r)) acik++; });
  return { yildiz, enCok: u.bolumler.length * 3, biten, toplam: u.bolumler.length, acik, tamam: biten === u.bolumler.length };
}
function paketGruplari(l) {
  if (paketGrupOnbellek[l]) return paketGrupOnbellek[l];
  const g = [];
  seviyePaketleri(l).forEach(p => {
    const tur = SAYILI_PAKET.test(p.ad) ? 'sayi' : 'konu', son = g[g.length - 1];
    if (son && son.tur === tur && son.paketler.length < 6) son.paketler.push(p); else g.push({ tur, no: g.length + 1, paketler: [p] });
  });
  return (paketGrupOnbellek[l] = g);
}
function paketGrupAd(g) {
  if (g.tur !== 'sayi') return tt('Konu paketleri');
  const a = g.paketler[0].ad.match(SAYILI_PAKET)[1], b = g.paketler[g.paketler.length - 1].ad.match(SAYILI_PAKET)[1];
  return a === b ? tt('Kelime {a}', { a }) : tt('Kelime {a}–{b}', { a, b });
}

/* ---------------- yol çizimi ---------------- */
// d: { id, ic (dairenin içi), etiket (html), sinif, aria, renk, acik, sira, oran (paket halkası %) }
function yolHtml(dl) {
  const y = i => YOL_UST + i * YOL_SATIR, x = i => YOL_X[i % YOL_X.length];
  const h = YOL_UST + (dl.length - 1) * YOL_SATIR + 76;
  let cizgi = '';
  for (let i = 1; i < dl.length; i++) cizgi += `<line x1="${x(i - 1)}" y1="${y(i - 1)}" x2="${x(i)}" y2="${y(i)}"${dl[i].acik ? ' class="acik"' : ''} vector-effect="non-scaling-stroke"/>`;
  const dg = dl.map((d, i) => {
    const xi = x(i), et = xi > 50 ? `right:calc(${100 - xi}% + 37px);max-width:calc(${xi}% - 45px)` : `left:calc(${xi}% + 37px);max-width:calc(${100 - xi}% - 45px)`;
    return `<div class="dugum ${d.sinif}${d.sira ? ' sira' : ''}" data-id="${d.id}" style="top:${y(i)}px;--x:${xi}%;--c:${d.renk}${d.oran != null ? ';--o:' + d.oran : ''}">
      <button class="top" aria-label="${esc(d.aria)}">${d.ic}</button>
      <div class="etiket${xi > 50 ? ' sol' : ''}" style="${et}">${d.sira ? `<span class="basla">${tt('BAŞLA')}</span>` : ''}${d.etiket}</div></div>`;
  }).join('');
  return `<div class="yol" style="height:${h}px"><svg viewBox="0 0 100 ${h}" preserveAspectRatio="none" aria-hidden="true">${cizgi}</svg>${dg}</div>`;
}
function uniteBaslikHtml(o) {   // o: { no, ad, sinif, renk, sol, sag, oran, ders }
  return `<div class="unite ${o.sinif}" style="--c:${o.renk}">
    <div class="u-ust"><span>${o.no}</span><span>${o.sag}</span></div>
    <b class="u-ad">${esc(o.ad)}</b>
    <div class="pbar"><i style="width:${o.oran}%"></i></div>
    <div class="u-alt"><span>${o.sol}</span>${o.ders ? `<button class="u-ders" data-id="${o.ders}">${tt('📖 Ders')}</button>` : ''}</div></div>`;
}

// Cümle yolu: üniteler, her birinde bölümler (ara sınav 🏆, seviye sınavı 👑)
function cumleYolCiz(l) {
  const sira = seviyeRakipleri(l).find(r => rakipAcikMi(r) && !kayit.yildiz[r.id]);
  let h = '', sayac = 0;
  uniteler(l).forEach(u => {
    const ud = uniteDurum(u), aktif = u.bolumler.includes(sira);
    const ders = (aktif && dersVarMi(sira) ? sira : null) || u.bolumler.filter(rakipAcikMi).reverse().find(dersVarMi) || null;
    h += uniteBaslikHtml({
      no: tt('ÜNİTE {n}', { n: u.no }), ad: bolgeAd(u.bolge), renk: u.bolumler[0].color,
      sinif: ud.tamam ? 'tamam' : aktif ? 'aktif' : ud.acik ? '' : 'kilit',
      sag: (ud.tamam ? tt('✓ TAMAMLANDI') + ' · ' : '') + '★ ' + ud.yildiz + ' / ' + ud.enCok,
      sol: tt('{a} / {b} bölüm', { a: ud.biten, b: ud.toplam }), oran: Math.round(ud.biten / ud.toplam * 100), ders: ders && ders.id
    });
    h += yolHtml(u.bolumler.map(r => {
      sayac++;
      const ac = rakipAcikMi(r), yy = kayit.yildiz[r.id] || 0;
      const ic = !ac ? '🔒' : r.usta === 2 ? '👑' : r.usta ? '🏆' : r === sira ? '▶' : sayac;
      const tur = r.usta === 2 ? tt('SEVİYE SINAVI') : r.usta ? tt('ARA SINAV') : '';
      const durum = !ac ? tt('kilitli') : r === sira ? tt('sıradaki') : tt('{y} / 3 yıldız', { y: yy });
      return {
        id: r.id, ic, renk: r.color, acik: ac, sira: r === sira, sinif: (ac ? (yy ? 'bitti' : '') : 'kilit') + (r.usta ? ' sinav' : ''),
        aria: r.world + (tur ? ' · ' + tur : '') + ' · ' + durum,
        etiket: `<b>${esc(r.world)}</b>${tur ? `<em class="chip usta">${tur}</em>` : ''}<span class="kural">${esc(r.rule || (r.karma ? tt('Bütün seviyeden karışık') : ''))}</span>${ac ? `<span class="yz">${yildizHtml(yy)}</span>` : ''}`
      };
    }));
  });
  $('#liste').innerHTML = h;
  $('#liste').querySelectorAll('.dugum').forEach(b => b.onclick = () => {
    const r = rakipBul(b.dataset.id);
    if (!rakipAcikMi(r)) { not(tt('Önce bir önceki bölümü bitir.')); return; }
    Ses.cal('tik', { ses: 0.5 }); cumleDojo(r);
  });
  $('#liste').querySelectorAll('.u-ders').forEach(b => b.onclick = e => {
    e.stopPropagation(); const r = rakipBul(b.dataset.id); if (!r) return;
    Ses.cal('tik', { ses: 0.4 }); dersAc(r, () => cumleDojo(r), () => haritaAc(r.lvl));
  });
}

// Kelime yolu: paket grupları; her durakta öğrenilen / toplam halkası
function paketYolCiz(l) {
  const pl = seviyePaketleri(l);
  const sira = pl.find(p => { if (!paketAcikMi(p)) return false; const q = paketIlerleme(p); return q.tanisilan < q.toplam || !kayit.yildiz[p.id]; });
  let h = '';
  paketGruplari(l).forEach(g => {
    let o = 0, t = 0, yz = 0, ac = 0;
    g.paketler.forEach(p => { const q = paketIlerleme(p); o += q.ogrenilen; t += q.toplam; yz += kayit.yildiz[p.id] || 0; if (paketAcikMi(p)) ac++; });
    const aktif = g.paketler.includes(sira), tamam = o === t && g.paketler.every(p => kayit.yildiz[p.id]);
    h += uniteBaslikHtml({
      no: tt('GRUP {n}', { n: g.no }), ad: paketGrupAd(g), renk: g.paketler[0].color, sinif: tamam ? 'tamam' : aktif ? 'aktif' : ac ? '' : 'kilit',
      sag: (tamam ? tt('✓ TAMAMLANDI') + ' · ' : '') + '★ ' + yz + ' / ' + g.paketler.length * 3,
      sol: tt('{a} / {b} öğrenildi', { a: o, b: t }), oran: Math.round(o / Math.max(1, t) * 100), ders: null
    });
    h += yolHtml(g.paketler.map(p => {
      const a = paketAcikMi(p), q = paketIlerleme(p), yy = kayit.yildiz[p.id] || 0, oran = Math.round(q.ogrenilen / Math.max(1, q.toplam) * 100);
      const ic = !a ? '🔒' : p === sira ? '▶' : q.ogrenilen === q.toplam ? '✓' : pl.indexOf(p) + 1;
      return {
        id: p.id, renk: p.color, acik: a, sira: p === sira, oran: a ? oran : 0, sinif: 'pk' + (a ? (yy ? ' bitti' : '') : ' kilit'),
        ic: `<i>${ic}</i>`, aria: p.ad + ' · ' + (a ? tt('{a} / {b} öğrenildi', { a: q.ogrenilen, b: q.toplam }) : tt('kilitli')),
        etiket: `<b>${esc(p.ad)}</b><span class="say">${esc(p.ilk + ' – ' + p.son)}</span><span class="say">${tt('{a} / {b} öğrenildi', { a: q.ogrenilen, b: q.toplam })}</span>${a ? `<span class="yz">${yildizHtml(yy)}</span>` : ''}`
      };
    }));
  });
  $('#liste').innerHTML = h;
  $('#liste').querySelectorAll('.dugum').forEach(b => b.onclick = () => {
    const p = paketBul(b.dataset.id);
    if (!paketAcikMi(p)) { paketKilitUyar(p); return; }
    Ses.cal('tik', { ses: 0.5 }); paketBaslat(p);
  });
}
function paketKilitUyar(p) {
  const lp = seviyePaketleri(p.lvl), o = lp[lp.indexOf(p) - 1];
  if (!o) { not(tt('Bu seviye açılınca kelime paketleri de açılır.')); return; }
  const qq = paketIlerleme(o);
  not(kayit.yildiz[o.id] ? tt('Önce "{ad}" paketinin yarısını öğren ({a} / {b}).', { ad: o.ad, a: qq.ogrenilen, b: Math.ceil(qq.toplam / 2) }) : tt('Önce "{ad}" paketini bitir.', { ad: o.ad }));
}

/* ---------------- ünite tamam ---------------- */
Olay.dinle('bolumBitti', v => {
  if (!D || v.mod !== 'bolum' || !v.kazandi || !D.ilkZafer) return;
  const u = uniteBul(D.r); if (!u || !uniteDurum(u).tamam) return;
  const l = uniteler(D.r.lvl), s = l[l.indexOf(u) + 1] || null;
  D.uniteTamam = { no: u.no, ad: bolgeAd(u.bolge), sonraki: s ? bolgeAd(s.bolge) : null, lvl: D.r.lvl, seviyeBitti: l.every(x => uniteDurum(x).tamam) };
  Olay.yay('uniteTamam', { lvl: D.r.lvl, unite: u.no, bolge: u.bolge, seviyeBitti: D.uniteTamam.seviyeBitti });
});
function uniteTamamHtml(t) {
  if (!t) return '';
  const alt = t.seviyeBitti ? tt('{l} seviyesinin bütün üniteleri bitti!', { l: esc(t.lvl) }) : t.sonraki ? tt('Sıradaki ünite: {ad}', { ad: esc(t.sonraki) }) : '';
  return `<div class="unite-tamam"><span class="kupa">🏆</span><div><b>${tt('ÜNİTE {n} TAMAM', { n: t.no })}</b><span>${esc(t.ad)}</span>${alt ? `<small>${alt}</small>` : ''}</div></div>`;
}
