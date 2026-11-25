/* =====================================================================
   ÖDÜLLER: GÜÇLER, SANDIKLAR, GÜNLÜK ÇARK
   · Güçler (Bölüm Yolu'nda kullanılır; kayit.envanter):
       ✋ hamle3: anında +3 hamle · 🔨 cekic: bir karoyu yok eder (buzu kırar, kilitli karoyu patlatır; hedefe sayılır;
       cümlenin kelimelerine dokunmaz) · 🧲 miknatis: iki karonun yerini kaydırmadan, hamle harcamadan değiştirir.
   · Sandıklar (kayit.sandik.slot, 4 yuva): Bölüm Yolu'nda kazanılan her bölüm bir sandık verir (yer varsa).
       🟫 tahta 15 dk · ⬜ gümüş 1 sa (zor bölüm) · 🟨 altın 3 sa (★★★ ya da 💀 bölüm). Aynı anda tek sandık açılır:
       sandığa dokun → açılmaya başlar; süre dolunca dokun → içindekiler. Uygulamada süre dolunca bildirim gelir.
   · Günlük çark (kayit.cark.son): her gün bir bedava çevirme; 8 dilim, ağırlıklı (CARK).
   ===================================================================== */
const ARAC = { hamle3: { i: '✋', ad: '+3 Hamle' }, cekic: { i: '🔨', ad: 'Çekiç' }, miknatis: { i: '🧲', ad: 'Mıknatıs' } };
const SANDIK = {
  tahta: { i: '🟫', ad: 'Tahta sandık', sure: 15 * 60e3, arac: 1, xp: [10, 20], don: 0 },
  gumus: { i: '⬜', ad: 'Gümüş sandık', sure: 60 * 60e3, arac: 2, xp: [25, 40], don: 0.08 },
  altin: { i: '🟨', ad: 'Altın sandık', sure: 3 * 60 * 60e3, arac: 3, xp: [50, 80], don: 0.25 },
};
const SANDIK_YUVA = 4;
const CARK = [
  { t: 'hamle3', n: 1, y: '✋ +3', a: 20, r: '#ff8aa3' }, { t: 'cekic', n: 1, y: '🔨', a: 18, r: '#ffd451' },
  { t: 'miknatis', n: 1, y: '🧲', a: 18, r: '#7fd0ff' }, { t: 'xp', n: 20, y: '⭐ 20', a: 18, r: '#7be38a' },
  { t: 'xp', n: 50, y: '⭐ 50', a: 10, r: '#b49bff' }, { t: 'sandik', n: 'gumus', y: '🎁', a: 8, r: '#ffb15c' },
  { t: 'don', n: 1, y: '❄', a: 4, r: '#c9f0ff' }, { t: 'cekic', n: 3, y: '🔨×3', a: 4, r: '#ff6b6b', buyuk: true },
];

/* ---------------- envanter ---------------- */
function aracEkle(t, n) { kayit.envanter[t] = (kayit.envanter[t] || 0) + n; }
function odulVer(o) {   // { t, n } → açıklama
  if (ARAC[o.t]) { aracEkle(o.t, o.n); return ARAC[o.t].i + ' ' + tt(ARAC[o.t].ad) + (o.n > 1 ? ' ×' + o.n : ''); }
  if (o.t === 'xp') { xpEkle(o.n); return '⭐ ' + o.n + ' XP'; }
  if (o.t === 'don') { if (kayit.seri.dondurma < SERI_DONDURMA_EN) { kayit.seri.dondurma++; return '❄ ' + tt('Seri dondurma'); } xpEkle(30); return '⭐ 30 XP'; }
  if (o.t === 'sandik') { const s = sandikKazan(o.n); return s ? SANDIK[o.n].i + ' ' + tt(SANDIK[o.n].ad) : '⭐ 40 XP' + (xpEkle(40) || ''); }
  return '';
}

/* ---------------- sandıklar ---------------- */
// kazanılan sandık yuvaya girer; yer yoksa null
function sandikKazan(tur) {
  const s = kayit.sandik.slot; if (s.length >= SANDIK_YUVA) return null;
  const k = { tur, t: Date.now(), acilis: null };
  if (kayit.yol.acik <= 4) k.sure = 30e3;   // ilk bölümlerin sandığı 30 sn'de açılır: yeni oyuncu sandık keyfini hemen yaşar
  s.push(k); kaydet(); return k;
}
function sandikSuresi(k) { return k.sure || SANDIK[k.tur].sure; }
function sandikDurum(k) {
  if (!k.acilis) return 'kapali';
  return Date.now() >= k.acilis + sandikSuresi(k) ? 'hazir' : 'aciliyor';
}
function sandikKalan(k) { return Math.max(0, k.acilis + sandikSuresi(k) - Date.now()); }
const sandikSure = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sn = s % 60; return h ? h + tt('sa') + ' ' + m + tt('dk') : m ? m + ':' + String(sn).padStart(2, '0') : sn + tt('sn'); };
function sandikAciliyor() { return kayit.sandik.slot.find(k => sandikDurum(k) === 'aciliyor') || null; }
function sandikDokun(i) {
  const k = kayit.sandik.slot[i]; if (!k) return;
  const d = sandikDurum(k);
  if (d === 'hazir') { sandikAc(i); return; }
  if (d === 'aciliyor') { not(tt('{s} sonra açılır.', { s: sandikSure(sandikKalan(k)) })); return; }
  if (sandikAciliyor()) { not(tt('Aynı anda bir sandık açılır. Önce açılan sandığı bekle.')); Ses.cal('geri', { ses: 0.4 }); return; }
  k.acilis = Date.now(); kaydet(); Ses.cal('yukle', { ses: 0.6 });
  if (Yerel.sandikHatirlat) Yerel.sandikHatirlat(k.acilis + sandikSuresi(k));
  not(tt('{s} sonra açılacak.', { s: sandikSure(sandikSuresi(k)) }));
  sandikYenile();
}
function sandikIcerik(tur) {
  const S = SANDIK[tur], o = [], turler = Object.keys(ARAC);
  for (let i = 0; i < S.arac; i++) o.push({ t: turler[Math.floor(Math.random() * turler.length)], n: 1 });
  o.push({ t: 'xp', n: S.xp[0] + Math.floor(Math.random() * (S.xp[1] - S.xp[0] + 1)) });
  if (Math.random() < S.don) o.push({ t: 'don', n: 1 });
  return o;
}
function sandikAc(i) {
  const k = kayit.sandik.slot[i]; if (!k || sandikDurum(k) !== 'hazir') return;
  kayit.sandik.slot.splice(i, 1); Olcum.olay('sandik_acildi', { tur: k.tur });
  const yazi = sandikIcerik(k.tur).map(odulVer); kaydet();
  Ses.cal('patlama', { ses: 0.5 }); Ses.cal('zafer', { ses: 0.8 }); Yerel.titret('basari');
  odulPenceresi(SANDIK[k.tur].i, tt(SANDIK[k.tur].ad), yazi, sandikYenile);
}
// sandık yuvaları (Bölüm Yolu haritasının üstü ve ödül ekranı)
function sandikHtml() {
  const s = kayit.sandik.slot; let o = '<div class="sandiklar" id="sandiklar">';
  for (let i = 0; i < SANDIK_YUVA; i++) {
    const k = s[i];
    if (!k) { o += `<div class="sandik bos"><i>＋</i><small>${tt('Bölüm kazan')}</small></div>`; continue; }
    const d = sandikDurum(k), S = SANDIK[k.tur];
    o += `<button class="sandik ${k.tur} ${d}" data-i="${i}"><i>${S.i}</i><small>${d === 'hazir' ? tt('AÇ!') : d === 'aciliyor' ? '⏱ ' + sandikSure(sandikKalan(k)) : tt('Aç: {s}', { s: sandikSure(sandikSuresi(k)) })}</small></button>`;
  }
  return o + '</div>';
}
function sandikBagla(kok) { (kok || card).querySelectorAll('.sandik[data-i]').forEach(b => b.onclick = () => { sesAc(); sandikDokun(+b.dataset.i); }); }
function sandikYenile() { const el = document.getElementById('sandiklar'); if (!el) return; el.outerHTML = sandikHtml(); sandikBagla(); }
setInterval(() => { if (document.getElementById('sandiklar') && kayit.sandik.slot.some(k => k.acilis)) sandikYenile(); }, 1000);
function sandikKazanHtml(k) { return `<div class="sandik-kazan"><i>${SANDIK[k.tur].i}</i><b>${tt('{s} kazandın!', { s: tt(SANDIK[k.tur].ad) })}</b><small>${tt('Bölüm Yolu haritasında aç')}</small></div>`; }
function aracHtml() { return `<div class="canta">${Object.keys(ARAC).map(t => `<span title="${tt(ARAC[t].ad)}">${ARAC[t].i}<b>${kayit.envanter[t] || 0}</b></span>`).join('')}</div>`; }
// ödül penceresi (sandık / çark): ödüller sırayla uçarak gelir
function odulPenceresi(ikon, bas, yazilar, sonra) {
  const p = document.createElement('div'); p.className = 'odul-pen';
  p.innerHTML = `<div class="odul-kart"><div class="odul-ikon">${ikon}</div><h3>${esc(bas)}</h3><div class="odul-liste">${yazilar.map((y, i) => `<span style="animation-delay:${0.35 + i * 0.25}s">${esc(y)}</span>`).join('')}</div><button class="big" id="odul-tamam">${tt('HARİKA!')}</button></div>`;
  document.body.appendChild(p);
  p.querySelector('#odul-tamam').onclick = () => { p.remove(); if (sonra) sonra(); };
}

/* ---------------- günlük çark ---------------- */
function carkHazir() { return kayit.cark.son !== bugunAnahtar(); }
function carkAc() {
  const n = CARK.length, dilim = 360 / n;
  const grad = CARK.map((c, i) => `${c.r} ${i * dilim}deg ${(i + 1) * dilim}deg`).join(',');
  goster(`<div class="ust-satir"><button class="geri" id="c-geri">${tt('← Geri')}</button></div>
    <div class="ana-baslik">🎡 ${tt('GÜNLÜK ÇARK')}</div>
    <div class="cark-kutu"><div class="cark-ok">▼</div><div class="cark" id="cark" style="background:conic-gradient(${grad})">
      ${CARK.map((c, i) => `<span style="transform:rotate(${i * dilim + dilim / 2}deg)"><b>${c.y}</b></span>`).join('')}</div><div class="cark-orta">⭐</div></div>
    <p class="aciklama" style="text-align:center">${carkHazir() ? tt('Her gün bir bedava çevirme hakkın var!') : tt('Bugünkü çevirmeni yaptın. Yarın yeniden gel!')}</p>
    <button class="big" id="c-cevir" ${carkHazir() ? '' : 'disabled'}>${tt(carkHazir() ? 'ÇEVİR!' : 'YARIN')}</button>
    <div class="bolum">${tt('Güçlerin')}</div>${aracHtml()}`, '', 'cark');
  $('#c-geri').onclick = () => acilisAc();
  $('#c-cevir').onclick = () => carkCevir();
}
function carkSec(r) { const top = CARK.reduce((a, c) => a + c.a, 0); let x = r * top; for (let i = 0; i < CARK.length; i++) { x -= CARK[i].a; if (x < 0) return i; } return 0; }
function carkCevir() {
  if (!carkHazir()) return;
  sesAc();
  kayit.cark.son = bugunAnahtar(); kaydet(); Olcum.olay('cark');   // önce kaydedilir: yarıda kapatılsa da ikinci çevirme olmaz
  const i = carkSec(Math.random()), dilim = 360 / CARK.length, c = CARK[i];
  const aci = 360 * 6 + (360 - (i * dilim + dilim / 2)) + (Math.random() - 0.5) * dilim * 0.6;
  const el = $('#cark'), b = $('#c-cevir'); b.disabled = true;
  el.style.transition = 'transform 4.2s cubic-bezier(.17,.67,.21,1)'; el.style.transform = `rotate(${aci}deg)`;
  let tik = 0; const tikla = () => { if (tik++ > 26) return; Ses.cal('tik', { ses: 0.4, hiz: 1 + tik * 0.01 }); setTimeout(tikla, 40 + tik * tik * 0.35); }; tikla();
  setTimeout(() => {
    if (ekran !== 'cark') { odulVer(c); kaydet(); return; }
    const yazi = odulVer(c); kaydet();
    Ses.cal(c.buyuk ? 'zafer' : 'yukselis', { ses: 0.8 }); Yerel.titret('basari');
    odulPenceresi(c.buyuk ? '🎉' : '🎡', tt(c.buyuk ? 'BÜYÜK ÖDÜL!' : 'Çarktan çıktı:'), [yazi], carkAc);
  }, 4400);
}
function odulMenuHtml() {
  const hazir = carkHazir(), s = kayit.sandik.slot, acilacak = s.some(k => sandikDurum(k) === 'hazir'), ac = sandikAciliyor();
  return `<div class="odul-satir"><button class="odul-btn ${hazir ? 'hazir' : ''}" id="a-cark"><i>🎡</i><span><b>${tt('Çark')}</b><small>${tt(hazir ? 'Bedava çevir!' : 'Yarın yeni')}</small></span></button>
    <button class="odul-btn ${acilacak ? 'hazir' : ''}" id="a-sandik"><i>🎁</i><span><b>${tt('Sandıklar')} ${s.length}/${SANDIK_YUVA}</b><small>${acilacak ? tt('Açmaya hazır!') : ac ? '⏱ ' + sandikSure(sandikKalan(ac)) : s.length ? tt('Açmayı başlat') : tt('Bölüm kazan')}</small></span></button></div>`;
}

/* ---------------- Bölüm Yolu'nda güç kullanımı (strateji ekranı) ---------------- */
function aracCubukHtml() {
  const R = STR && STR.R;
  return Object.keys(ARAC).map(t => `<button class="arac ${R && R.arac === t ? 'secili' : ''} ${(kayit.envanter[t] || 0) ? '' : 'yok'}" data-t="${t}" aria-label="${tt(ARAC[t].ad)}"><i>${ARAC[t].i}</i><b>${kayit.envanter[t] || 0}</b></button>`).join('');
}
function aracSec(t) {
  const R = STR && STR.R; if (!R || R.bitti) return;
  if (!(kayit.envanter[t] > 0)) { not(tt('Bu güç sende yok. Günlük çarktan ve sandıklardan kazanırsın.')); Ses.cal('geri', { ses: 0.4 }); return; }
  if (t === 'hamle3') { kayit.envanter.hamle3--; kaydet(); R.hamle += 3; Ses.cal('yukselis', { ses: 0.6 }); not(tt('+3 hamle!')); strCiz(); return; }
  R.arac = R.arac === t ? null : t; R.aracIlk = -1; R.secili = -1; Ses.cal('tik', { ses: 0.5 });
  if (R.arac) not(tt(t === 'cekic' ? '🔨 Yok etmek istediğin karoya dokun.' : '🧲 Yerini değiştirmek istediğin iki karoya sırayla dokun.'));
  strCiz();
}
// güç seçiliyken tahtaya dokunma (strateji.js strBirak)
function aracDokun(i) {
  const R = STR.R, k = R.T.h[i];
  if (R.arac === 'cekic') {
    if (!k) return;
    if (k.k >= 0) { not(tt('Cümlenin kelimelerine çekiç vurulmaz.')); Ses.cal('geri', { ses: 0.4 }); return; }
    R.ekstra = R.ekstra || { buz: 0, kilit: 0 };
    const el = strKaroEl(k.id);
    if (k.buz) { k.buz = false; R.ekstra.buz++; if (el) el.classList.add('buz-kir'); }
    else { if (k.kilit) R.ekstra.kilit++; R.T.h[i] = null; if (el) { el.classList.add('pat'); strKivilcim(el, k.ci); } }
    kayit.envanter.cekic--; kaydet(); R.arac = null;
    Ses.cal('darbe', { ses: 0.8 }); Ses.cal('pop', { ses: 0.6 }); Yerel.titret('orta');
    setTimeout(strCiz, 350); return;
  }
  if (R.arac === 'miknatis') {
    if (!k || strDonuk(k)) { not(tt('Buzlu ve kilitli karolar yerinden oynamaz.')); return; }
    if (R.aracIlk < 0) { R.aracIlk = i; R.secili = i; Ses.cal('al', { ses: 0.5 }); strCiz(); return; }
    if (R.aracIlk === i) { R.aracIlk = -1; R.secili = -1; strCiz(); return; }
    const a = R.aracIlk; [R.T.h[a], R.T.h[i]] = [R.T.h[i], R.T.h[a]];
    kayit.envanter.miknatis--; kaydet(); R.arac = null; R.aracIlk = -1; R.secili = -1;
    Ses.cal('kay', { ses: 0.7 }); Yerel.titret('hafif'); strCiz();
  }
}
