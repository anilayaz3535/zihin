/* =====================================================================
   EKRANLAR: ilk giriş, harita (Cümleler / Kelimeler), ders, sonuç, defterler, ayarlar, seviye testi, nasıl oynanır
   ===================================================================== */
const card = $('#card'), ov = $('#ov');
let ekran = null, tutOpen = false, tutIdx = 0, tutSonra = null;
const SINAVLAR = Object.keys(SEVIYE).filter(l => seviyeYol(l) === 'sinav');
const HAYATLAR = Object.keys(SEVIYE).filter(l => seviyeYol(l) === 'hayat');
const HOP = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const dinleBtn = en => `<button class="dinle" data-en="${esc(en)}" aria-label="${tt('Dinle')}">${HOP}</button>`;

function goster(html, sinif, ad) {
  ekran = ad || null; tutOpen = ad === 'tut';
  if (typeof olcumEkranAcildi === 'function') olcumEkranAcildi(ad);   // ölçüm: ekran (olcum.js)
  card.className = 'card ' + (sinif || '');
  card.innerHTML = html;
  card.querySelectorAll('.dinle').forEach(b => b.onclick = e => { e.stopPropagation(); sesAc(); Konus.soyle(b.dataset.en, { hiz: 0.85 }); });
  tmBagla(card);
  card.scrollTop = 0; ov.classList.add('show');
}
function ekranlariKapat() { ov.classList.remove('show'); ekran = null; tutOpen = false; }
function panelAcik() { return ov.classList.contains('show') && ekran && ekran !== 'tut' && ekran !== 'pause'; }
// Geri / Escape: her ekranın döndüğü yer
function panelGeri() {
  if (ekran === 'ders' && dersSonra) { const f = dersSonra; dersSonra = null; f(); return; }
  if (G.state === 'paused') { showPause(); return; }
  if (ekran === 'acilis' || ekran === 'ilkKarsila' || ekran === 'ilkSonuc') return;
  if (ekran === 'profilYeni') { if (aktifProfil()) profilAc(); else if (ilkGosterilsinMi()) ilkKarsila(); return; }
  if (ekran === 'ayar') { (ayarDonus || acilisAc)(); return; }
  if (ekran === 'oda' || ekran === 'onlineSonuc') { odadanCik(); onlineAc(); return; }
  if (ekran === 'strSonuc') { const c = $('#ss-cik'); if (c) c.click(); return; }
  if (ekran === 'eslesme') { eslesmeDur(); onlineAc(); return; }
  if (ekran === 'yol' || ekran === 'cark' || ekran === 'etkinlik') { acilisAc(); return; }
  if (ekran === 'yolBas' || ekran === 'dukkan' || ekran === 'canBitti' || ekran === 'yolSinav') { yolHaritaAc(); return; }
  if (ekran === 'online') { onlineSonMod = null; onlineAc(); return; }
  if (ekran === 'harita' || ekran === 'profil' || ekran === 'onlineSecim' || ekran === 'ilk' || ekran === 'ilkHedef') { acilisAc(); return; }
  haritaAc();
}
function not(m, sure) {
  const el = $('#not'); el.textContent = m; el.classList.add('show');
  clearTimeout(not.t); not.t = setTimeout(() => el.classList.remove('show'), sure || 2600);
}
const yildizHtml = n => { let s = ''; for (let i = 0; i < 3; i++) s += i < n ? '<i>★</i>' : '★'; return s; };
// kayıtlı hata satırındaki '(çöpe attın) ' öneki kayıtta Türkçe durur, gösterirken çevrilir
const copeOnekCevir = s => { const t = String(s || ''); for (const on of ['(çöpe attın) ', '(süre doldu)']) if (t.indexOf(on) === 0) return tt(on) + t.slice(on.length); return s; };
function bolgeAd(b) { return !b ? tt('Bölümler') : b === 'Seviye Ustası' ? tt('Seviye Sınavı') : b; }
function sonAcikSeviye() { let s = 'A1'; SEVIYELER.forEach(l => { if (seviyeAcikMi(l)) s = l; }); return s; }

/* ---------------- arka plandaki vitrin sahnesi ---------------- */
function demo() {
  dizilisGizle();                 // oyundan çıkılınca İngilizce dizilişi kartı kalkar (dizilis.js)
  ZAM.length = 0; D = null;
  Object.assign(G, { state: 'menu', combo: 0, ofke: false, slowT: 0, sweep: -1, duz: null, flash: 0, shake: 0, score: 0, shown: 0, gauge: 0, hata: 0, secili: null, surukle: null, ipucu: null, jokerHazir: false });
  Ses.yogunluk(0, true);
  P.length = 0; POP.length = 0; BAN.length = 0; PATLAYAN.length = 0; DUSEN.length = 0;
  const s = cumleler(seviyeRakipleri('A1')[0].id).find(x => x.w.length >= 5 && x.w.length <= 6) || cumleler(seviyeRakipleri('A1')[0].id)[0];
  G.T = null; vitrinTahta(s);
  DUSEN.length = 0;
}

/* ---------------- ilk giriş: seviye seçimi ---------------- */
const SEV_ACIK = { A1: ['Yeni başlıyorum', 'Temel cümleler: am / is / are, geniş zaman, can'], A2: ['Biraz biliyorum', 'Geçmiş zaman, gelecek zaman, should'], B1: ['Orta seviyedeyim', 'Present perfect, edilgen yapı, used to, if'], B2: ['İyi biliyorum', 'Edilgen yapılar, 2. ve 3. koşul, wish, past perfect'], C1: ['İleri seviyedeyim', 'İlgi cümlecikleri, devrik yapı, akademik dil'], C2: ['Uzmanlaşmak istiyorum', 'Deyimler, ince anlam farkları, ileri üslup'] };
function ilkGiris() {
  if (G.state !== 'menu') demo();
  Ses.muzik('menu');
  let ns = 0, nw = 0; for (const k in C.sentences) ns += C.sentences[k].length; for (const k in C.words) nw += C.words[k].length;
  goster(`<div class="ust-satir"><button class="geri" id="i-geri">${tt('← Geri')}</button></div>
    <div class="sub">${tt('İNGİLİZCEN NE DURUMDA?')}</div>
    <p class="aciklama">${tt('{c} cümle, {k} kelime. Kısa bir testle seviyeni bulalım ya da kendin seç. Önceki bölümler de açık kalır.', { c: ns.toLocaleString(yerel()), k: nw.toLocaleString(yerel()) })}</p>
    <button class="secim vurgu" id="st-btn"><div class="rozet">?</div><div><b>${tt('Seviyemi bul')}</b><span>${tt('14 kısa soru · yaklaşık 2 dakika · önerilen')}</span></div></button>
    <div class="ayrac">${tt('ya da kendin seç')}</div>
    ${SEVIYELER.map(l => `<button class="secim" data-l="${l}"><div class="rozet">${l}</div><div><b>${tt(SEV_ACIK[l][0])}</b><span>${tt(SEV_ACIK[l][1])}</span></div></button>`).join('')}`, 'genis', 'ilk');
  $('#i-geri').onclick = () => acilisAc();
  $('#st-btn').onclick = () => { sesAc(); stBaslat(); };
  card.querySelectorAll('.secim[data-l]').forEach(b => b.onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); seviyeUygula(b.dataset.l); haritaAc(b.dataset.l); });
}
function stBaslat() { dojoBaslat({ id: 'seviye-testi', lvl: 'A1', ad: tt('Seviye Testi'), world: tt('Seviyeni bulalım'), n: 0 }, { st: true }); }
function stSonuc() {
  const d = D, k = d.st.kayit, t = stTahmin(k), l = SEVIYELER[t];
  const once = kayit.seviyeTesti && kayit.seviyeTesti.sonuc;
  kayit.seviyeTesti = { sonuc: l, once: once || null, dogru: k.filter(x => x.ok).length, n: k.length };
  kaydet();
  const sut = SEVIYELER.map((sv, i) => {
    const o2 = k.filter(x => x.sev === i), dg = o2.filter(x => x.ok).length, h = o2.length ? Math.round(dg / o2.length * 100) : 0;
    return `<div class="${i === t ? 'sen' : ''}"><i style="height:${o2.length ? Math.max(8, h) : 4}%"></i><b>${sv}</b><span>${o2.length ? dg + '/' + o2.length : '–'}</span></div>`;
  }).join('');
  goster(`<div class="st-rozet">${l}</div>
    <div class="go zafer">${tt('{s} seviye', { s: tt(ST_AD[l]) })}</div>
    <div class="sonuc-alt">${tt('{a} / {b} doğru', { a: kayit.seviyeTesti.dogru, b: k.length })}${once && once !== l ? tt(' · önceki testte {o}', { o: once }) : ''}</div>
    <div class="st-sutunlar">${sut}</div>
    <p class="aciklama">${t === 0 ? tt('Temelden başlıyoruz: A1 bölümleri seni bekliyor.') : tt('{l} bölümleri açılacak. Öncekiler de açık; istediğin zaman dönüp tekrar edebilirsin.', { l })}</p>
    <button class="big" id="s-bas">${tt('{l}’DEN BAŞLA', { l })}</button>
    <div class="row"><button class="sec" id="s-sec">${tt('Kendim seçeyim')}</button></div>`, '', 'sonuc');
  $('#s-bas').onclick = () => { seviyeUygula(l); haritaAc(l); not(tt('{l} seviyesinden başlıyorsun.', { l })); };
  $('#s-sec').onclick = () => { D = null; ilkGiris(); };
}

/* ---------------- açılış: profil · online · kariyer ---------------- */
const harfi = ad => esc(String(ad || '?').charAt(0).toLocaleUpperCase('tr-TR'));
function acilisAc() {
  ilerlemeGuncelle();                                 // uygulama açıkken gün değiştiyse
  if (G.state !== 'menu') demo();
  D = null;
  Ses.muzik('menu'); Konus.sus();
  const p = aktifProfil(); if (!p) { profilsizAc(); return; }
  if (DAVET && davetGoster()) return;   // linkle gelen "Beni geç" daveti (paylas.js)
  const oz = profilOzet(p.id), y = yarimOku();
  // sade ana menü (25 Kasım 2026): üstte profil ve günlük halka, bir sıra kısayol (hazır olanda nokta), ortada büyük ▶ OYNA
  const T = etkTema(), etkHazir = etkHazirSay(), sHazir = kayit.sandik.slot.filter(k => sandikDurum(k) === 'hazir').length, sAc = sandikAciliyor(), gTamam = gorevBugunTamam();
  // kademeli açılma (kilit.js): kilitli özellik görünmez; yeni açılan "YENİ!" rozetiyle gelir
  const yeniler = ozellikYeniler(), ac = id => ozellikAcik(id);
  const kis = (id, i, ad, alt, nokta, cls) => { const oz = id.slice(2), yeni = yeniler.indexOf(oz) >= 0; return ac(oz) ? `<button class="kisayol ${cls || ''}${yeni ? ' yeni-acildi' : ''}" id="${id}"><i>${i}</i><b>${ad}</b><small>${alt}</small>${yeni ? `<em class="yeni">${tt('YENİ!')}</em>` : nokta ? `<em>${nokta === true ? '' : nokta}</em>` : ''}</button>` : ''; };
  const kisSay = ['cark', 'sandik', 'etk', 'gorev', 'rozet'].filter(ac).length;
  // ana menü (28 Kasım 2026): iki ana yol KARİYER (A1 → C2) ve ONLINE (Hız · Strateji); Bölüm Yolu küçük bağlantı
  const kl = SEVIYE[kayit.sonLvl] && seviyeAcikMi(kayit.sonLvl) ? kayit.sonLvl : sonAcikSeviye(), ks = siradakiBolum('cumle', kl);
  const kariyerAlt = y ? tt('Yarım bölüm: ') + yarimYazi(y) : ks ? tt('{l} · Sıradaki: {b}', { l: kl, b: esc(ks.world) }) : tt('A1 → C2 dersler');
  goster(`<div class="acilis sade">
    <div class="ac-ust">${logoHtml('sm')}<button class="profil-mini" id="a-prof"><span class="avatar">${harfi(p.ad)}</span><span><b>${esc(p.ad)}</b><small>${esc(oz.lvl)} · ⭐ ${kayit.xp}</small></span></button></div>
    ${gunlukHtml()}
    <div class="kisayollar" style="grid-template-columns:repeat(${Math.max(1, kisSay)},minmax(0,1fr))${kisSay ? '' : ';display:none'}">
      ${kis('a-cark', '🎡', tt('Çark'), tt(carkHazir() ? 'Bedava!' : 'Yarın'), carkHazir(), carkHazir() ? 'hazir' : '')}
      ${kis('a-sandik', '🎁', tt('Sandık'), sHazir ? tt('AÇ!') : sAc ? sandikSure(sandikKalan(sAc)) : kayit.sandik.slot.length + '/' + SANDIK_YUVA, sHazir || false, sHazir ? 'hazir' : '')}
      ${kis('a-etk', T.i, tt('Etkinlik'), etkKalanYaz(), etkHazir || false, etkHazir ? 'hazir' : '')}
      ${kis('a-gorev', '📅', tt('Görev'), gTamam ? '✓' : tt('+{x} XP', { x: XP_KURAL.gorev }), !gTamam, gTamam ? 'tamam' : 'hazir')}
      ${kis('a-rozet', '🏅', tt('Rozet'), rozetSay() + '/' + ROZETLER.length, false, '')}
    </div>
    <button class="ana-buyuk kariyer" id="a-kariyer"><i>🏆</i><span><b>${tt('KARİYER')}</b><small>${kariyerAlt}</small></span><em>▶</em></button>
    <button class="ana-buyuk online" id="a-online"><i>🏁</i><span><b>${tt('ONLINE')}</b><small>${tt('⚡ Hız · 🧠 Strateji')}</small></span><em>▶</em></button>
    <button class="harita-link" id="a-yol">🧩 ${tt('Bölüm Yolu · strateji bulmacaları')} · ⭐ ${yolYildizToplam()}</button>
    ${ozellikSiradakiHtml()}
    <div class="row"><button class="sec" id="a-ayar">${tt('⚙ Ayarlar')}</button><button class="sec" id="a-nas">${tt('? Nasıl')}</button></div>
  </div>`, '', 'acilis');
  if (yeniler.length) setTimeout(() => { if (ekran === 'acilis') { Ses.cal('yukselis', { ses: 0.5 }); not(tt('YENİ: {o} açıldı!', { o: yeniler.map(id => { const o = OZELLIK.find(x => x.id === id); return o.i + ' ' + tt(o.ad); }).join(', ') })); } }, 500);
  const bag = (id, f) => { const e = $('#' + id); if (e) e.onclick = () => { ozellikGoruldu(id.slice(2)); f(); }; };
  bag('a-gorev', () => { Ses.cal('tik', { ses: 0.5 }); gorevBaslat(); });
  $('#a-yol').onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); yolHaritaAc(); };
  bag('a-etk', () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); etkAc(); });
  bag('a-cark', () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); carkAc(); });
  bag('a-sandik', () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); yolHaritaAc(); });
  bag('a-rozet', () => { Ses.cal('tik', { ses: 0.4 }); rozetlerAc(acilisAc); });
  $('#a-prof').onclick = () => { Ses.cal('tik', { ses: 0.4 }); profilAc(); };
  $('#a-gunluk').onclick = () => { Ses.cal('tik', { ses: 0.4 }); profilAc(); };
  bag('a-online', () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); onlineSonMod = null; onlineAc(); });
  $('#a-kariyer').onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.5 }); haritaAc(); };
  $('#a-ayar').onclick = () => ayarAc(false, acilisAc);
  $('#a-nas').onclick = () => showTutorial(acilisAc);
}

/* ---------------- profil: isimle açılır, bu telefonda saklanır ---------------- */
function tarihYaz(t) { return t ? new Date(t).toLocaleString(yerel(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '–'; }
function profilDegisti() { Ses.ayarla(); musicBtnYaz(); }
function profilAc() {
  const p = aktifProfil(); if (!p) { profilsizAc(); return; }
  const oz = profilOzet(p.id), y = yarimOku(), digerleri = profiller.liste.filter(x => x.id !== p.id);
  goster(`<div class="ust-satir"><button class="geri" id="p-geri">${tt('← Geri')}</button></div>
    <div class="prof-kart">
      <span class="avatar buyuk">${harfi(p.ad)}</span>
      <div class="prof-ad">${esc(p.ad)}</div>
      <div class="prof-ozet"><span>${esc(oz.lvl)}</span><span>★ ${oz.yildiz}</span><span>📗 ${tt('{n} kelime', { n: oz.kelime })}</span><span>🏆 ${oz.best}</span></div>
      <div class="prof-satir">${tt('⭐ {x} XP · 🔥 {s} gün seri · en uzun {e}', { x: kayit.xp, s: kayit.seri.gun, e: kayit.seri.enUzun })}${kayit.seri.dondurma ? ' · ❄ ' + kayit.seri.dondurma : ''}</div>
      <div class="prof-satir">${tt('⚔ Online: {m} maç · {g} galibiyet', { m: oz.online, g: oz.galibiyet })}</div>
      ${y ? `<div class="prof-satir sari">${tt('Yarım bölüm: ')}${yarimYazi(y)}</div>` : ''}
      <div class="prof-satir kucuk" id="p-zaman">${tt('Son kayıt: ')}${tarihYaz(oz.sonKayit)}</div>
    </div>
    <button class="big" id="p-kaydet">${tt('💾 OYUNU KAYDET')}</button>
    <div class="row"><button class="sec" id="p-rozet">${tt('🏅 Rozetler · {a}/{b}', { a: rozetSay(), b: ROZETLER.length })}</button></div>
    <p class="aciklama kucuk">${tt('Oyun her turda ve her bölüm sonunda kendiliğinden de kaydedilir. Bu profili tekrar seçince kaldığın yerden devam edersin.')}</p>
    ${digerleri.length ? `<div class="bolum">${tt('Profil değiştir')}</div><div class="prof-liste">${digerleri.map(x => { const o = profilOzet(x.id); return `<button class="profil-btn" data-id="${x.id}"><span class="avatar">${harfi(x.ad)}</span><span class="pb-ic"><b>${esc(x.ad)}</b><small>${esc(o.lvl)} · ★ ${o.yildiz} · 📗 ${tt('{n} kelime', { n: o.kelime })}</small></span><em>${tt('Seç ›')}</em></button>`; }).join('')}</div>` : ''}
    <div class="row alt-row"><button class="sec" id="p-yeni">${tt('＋ Yeni profil')}</button><button class="sec tehlike" id="p-sil">${tt('Profili sil')}</button></div>`, '', 'profil');
  $('#p-geri').onclick = () => acilisAc();
  $('#p-rozet').onclick = () => rozetlerAc(profilAc);
  $('#p-kaydet').onclick = () => {
    sesAc();
    if (kaydet() && profilleriKaydet()) { Ses.cal('kelime', { ses: 0.6 }); not(tt('Kaydedildi ✓  {ad}', { ad: p.ad })); $('#p-zaman').textContent = tt('Son kayıt: ') + tarihYaz(kayit.sonKayit); }
    else not(tt('Kaydedilemedi: telefonda yer kalmamış olabilir.'));
  };
  card.querySelectorAll('.prof-liste .profil-btn').forEach(b => b.onclick = () => {
    profilSec(b.dataset.id); profilDegisti(); Ses.cal('tik', { ses: 0.5 });
    const yp = aktifProfil(); not(tt(yarimOku() ? '{ad} profili açıldı. Yarım bölümün Kariyer’de seni bekliyor.' : '{ad} profili açıldı.', { ad: yp.ad }));
    acilisAc();
  });
  $('#p-yeni').onclick = () => profilYeniAc();
  const sil = $('#p-sil');
  sil.onclick = () => {
    if (sil.dataset.onay !== '1') { sil.dataset.onay = '1'; sil.textContent = tt('Emin misin? {ad} silinir. Tekrar bas.', { ad: p.ad }); return; }
    profilSil(p.id); profilDegisti(); not(tt('{ad} profili silindi.', { ad: p.ad }));
    if (aktifProfil()) profilAc(); else profilsizAc();
  };
}
function profilYeniAc() {
  const ilk = !profiller.liste.length, eski = ilk && eskiKayitVarMi();
  goster(`${logoHtml('sm')}
    <div class="sub">${tt(ilk ? 'HOŞ GELDİN!' : 'YENİ PROFİL')}</div>
    <p class="aciklama">${tt('İsmini yaz. İlerlemen bu isimle bu telefonda saklanır; bu profili seçince kaldığın yerden devam edersin.')}</p>
    ${eski ? '<p class="aciklama sari">' + tt('Bu telefondaki önceki ilerlemen bu profile aktarılacak.') + '</p>' : ''}
    <input id="p-ad" class="giris" maxlength="16" placeholder="${tt('İsmin')}" autocomplete="off" autocapitalize="words" enterkeyhint="done">
    <button class="big" id="p-olustur">${tt(ilk ? 'BAŞLA' : 'PROFİLİ AÇ')}</button>
    ${ilk ? (ilkGosterilsinMi() ? '<div class="row"><button class="sec" id="p-rehber">' + tt('← Rehberli başla') + '</button></div>' : '') : '<div class="row"><button class="sec" id="p-vazgec">' + tt('Vazgeç') + '</button></div>'}`, '', 'profilYeni');
  const inp = $('#p-ad');
  const tamam = () => {
    const s = profilAdUygun(inp.value); if (s.hata) { not(s.hata); return; }
    sesAc(); profilOlustur(s.ad); profilDegisti();
    not(tt('Hoş geldin, {ad}!', { ad: s.ad })); acilisAc();
  };
  $('#p-olustur').onclick = tamam;
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); tamam(); } };
  const v = $('#p-vazgec'); if (v) v.onclick = () => profilAc();
  const rh = $('#p-rehber'); if (rh) rh.onclick = () => ilkKarsila();
}

/* ---------------- kariyer ---------------- */
let aktifLvlK = null, aktifYol = 'cumle';
function siradakiBolum(yol, l) {
  const ara = yol === 'kelime'
    ? lv => seviyePaketleri(lv).find(p => { if (!paketAcikMi(p)) return false; const q = paketIlerleme(p); return q.tanisilan < q.toplam || !kayit.yildiz[p.id]; })
    : lv => seviyeRakipleri(lv).find(r => rakipAcikMi(r) && !kayit.yildiz[r.id]);
  let s = ara(l); if (s) return s;
  for (const lv of SEVIYELER) { s = ara(lv); if (s) return s; }
  return (yol === 'kelime' ? seviyePaketleri(l).filter(paketAcikMi) : seviyeRakipleri(l).filter(rakipAcikMi)).pop() || null;
}
function haritaAc(lvl) {
  if (G.state !== 'menu') demo();
  D = null;
  Ses.muzik('menu'); Konus.sus();
  const p = aktifProfil(); if (!p) { profilsizAc(); return; }
  if (!kayit.baslangic) { ilkGiris(); return; }
  if (lvl && SEVIYE[lvl]) aktifLvlK = lvl;
  if (!aktifLvlK || !SEVIYE[aktifLvlK]) aktifLvlK = SEVIYE[kayit.sonLvl] ? kayit.sonLvl : 'A1';
  if (SEVIYELER.indexOf(aktifLvlK) >= 0 && !seviyeAcikMi(aktifLvlK)) aktifLvlK = sonAcikSeviye();
  if (kayit.sonSekme) aktifYol = kayit.sonSekme;
  const hz = srsHazir().length + kelHazir().length;
  const sec = l => { const ac = SEVIYELER.indexOf(l) < 0 || seviyeAcikMi(l); return `<option value="${l}"${l === aktifLvlK ? ' selected' : ''}${ac ? '' : ' disabled'}>${ac ? '' : '🔒 '}${SEVIYELER.indexOf(l) >= 0 ? l + ' · ' : ''}${esc(seviyeAd(l))}</option>`; };
  goster(`<div class="kariyer">
    <div class="ust-satir"><button class="geri" id="k-geri">${tt('← Geri')}</button><span class="k-ad">👤 ${esc(p.ad)} · ${esc(kayit.sonLvl || 'A1')}</span></div>
    <button class="big devam-btn" id="k-devam"></button>
    <div class="k-satir"><select id="k-sev" class="secici" aria-label="${tt('Seviye')}">
      <optgroup label="${tt('Genel İngilizce')}">${SEVIYELER.map(sec).join('')}</optgroup>
      <optgroup label="${tt('Sınav Yolu')}">${SINAVLAR.map(sec).join('')}</optgroup>
      <optgroup label="${tt('Hayat İngilizcesi')}">${HAYATLAR.map(sec).join('')}</optgroup></select>
      <button class="sec kucuk-btn" id="k-st">${tt('Seviyeni ölç')}</button></div>
    <div class="seviye-bilgi" id="seviye-bilgi"></div>
    <div class="yol-sec" id="yol-sec"></div>
    <div class="ing-sec" id="ing-sec"></div>
    <div id="liste"></div>
    <div class="k-alt"><button id="k-tekrar" class="${hz ? 'hazir' : ''}">${tt('🔁 Tekrar')}${hz ? `<em>${hz}</em>` : ''}</button><button id="k-defter">${tt('📕 Defterim')}</button></div>
  </div>`, 'genis', 'harita');
  $('#k-geri').onclick = () => acilisAc();
  $('#k-sev').onchange = e => { aktifLvlK = e.target.value; kayit.sonLvl = aktifLvlK; kaydet(); Ses.cal('tik', { ses: 0.4 }); listeCiz(); devamGuncelle(); };
  $('#k-st').onclick = () => { sesAc(); stBaslat(); };
  $('#k-tekrar').onclick = antrenmanBaslat;
  $('#k-defter').onclick = () => defterAc();
  $('#k-devam').onclick = () => {
    sesAc(); Ses.cal('tik', { ses: 0.5 });
    const yy = yarimOku(), yol = yy ? (yy.mod === 'kelime' ? 'kelime' : 'cumle') : aktifYol;
    if (!ingSecildi(yol)) { ingSor(yol, () => $('#k-devam') && $('#k-devam').onclick()); return; }   // göster / gizle henüz seçilmediyse önce sor
    if (yarimOku()) { if (!yarimSurdur()) { not(tt('Yarım bölüm açılamadı; bölümü baştan başlatabilirsin.')); haritaAc(); } return; }
    const s = siradakiBolum(aktifYol, aktifLvlK); if (!s) return;
    if (aktifYol === 'kelime') paketBaslat(s); else cumleDojo(s);
  };
  listeCiz(); devamGuncelle();
}
function devamGuncelle() {
  const b = $('#k-devam'); if (!b) return;
  const y = yarimOku();
  if (y) { b.innerHTML = tt('▶ KALDIĞIN YERDEN') + '<small>' + yarimYazi(y) + '</small>'; return; }
  const s = siradakiBolum(aktifYol, aktifLvlK);
  b.innerHTML = s ? tt('▶ DEVAM ET') + '<small>' + esc(aktifYol === 'kelime' ? s.ad : s.world) + ' · ' + esc(s.lvl) + ' · ' + tt(aktifYol === 'kelime' ? 'kelime paketi' : 'cümle bölümü') + '</small>' : tt('▶ DEVAM ET');
}
function listeCiz() {
  const l = aktifLvlK, s = SEVIYE[l], dl = seviyeRakipleri(l), pl = seviyePaketleri(l);
  $('#seviye-bilgi').textContent = s && s.bilgi ? s.bilgi : '';
  $('#yol-sec').innerHTML = `<button data-y="cumle" class="${aktifYol === 'cumle' ? 'secili' : ''}"><b>${tt('CÜMLELER')}</b><span>${tt('{n} bölüm', { n: dl.length })}</span></button>` +
    `<button data-y="kelime" class="${aktifYol === 'kelime' ? 'secili' : ''}"><b>${tt('KELİMELER')}</b><span>${tt('{n} paket', { n: pl.length })}</span></button>`;
  $('#yol-sec').querySelectorAll('button').forEach(b => b.onclick = () => {
    aktifYol = b.dataset.y; kayit.sonSekme = aktifYol; kaydet(); Ses.cal('tik', { ses: 0.4 }); listeCiz(); devamGuncelle();
    if (!ingSecildi(aktifYol)) ingSor(aktifYol);         // sekmeye dokununca bir kez sorulur; sonra alttaki düğmeyle değişir
  });
  ingCipCiz();
  if (aktifYol === 'kelime') paketYolCiz(l); else cumleYolCiz(l);            // ünite haritası (harita.js)
  const sr = $('#liste .dugum.sira'); if (sr) setTimeout(() => sr.scrollIntoView({ block: 'center' }), 30);
}
/* ---------------- İngilizceyi göster / gizle (Cümleler ve Kelimeler sekmesi için ayrı; profil başına) ----------------
   Sekmeye ilk dokunuşta (ya da o sekmeden ilk bölüm başlarken) iki seçenek sorulur; seçim değiştirilene kadar bütün
   bölümlerde geçerli. Göster: cümle turunda İngilizce cümle Türkçenin altında, kelime turlarında harfler soluk görünür;
   puan ve XP yarı (game.js puanKat, ilerleme.js xpEkle). Seviye testi, tekrar ve online maç her zaman gizli oynanır. */
function ingAnahtar(yol) { return yol === 'kelime' ? 'ingKelime' : 'ingCumle'; }
function ingSecildi(yol) { return !!kayit.ayar[ingAnahtar(yol) + 'Secildi']; }
function ingCipCiz() {
  const e = $('#ing-sec'); if (!e) return;
  const k = aktifYol === 'kelime', g = !!kayit.ayar[ingAnahtar(aktifYol)], sec = ingSecildi(aktifYol);
  const yazi = !sec ? (k ? 'İngilizce kelime: göster mi, gizle mi?' : 'İngilizce cümle: göster mi, gizle mi?')
    : k ? (g ? 'İngilizce kelime gösteriliyor' : 'İngilizce kelime gizli') : (g ? 'İngilizce cümle gösteriliyor' : 'İngilizce cümle gizli');
  e.innerHTML = `<button id="ing-deg" class="${sec && g ? 'acik' : ''}"><i>${!sec ? '❔' : g ? '👁' : '🙈'}</i><span>${tt(yazi)}</span><em>${tt(sec ? 'değiştir' : 'seç')}</em></button>`;
  $('#ing-deg').onclick = () => { sesAc(); Ses.cal('tik', { ses: 0.4 }); ingSor(aktifYol); };
}
function ingSor(yol, sonra) {
  const eski = document.getElementById('ing-pen'); if (eski) eski.remove();
  const k = yol === 'kelime', a = ingAnahtar(yol), sec = ingSecildi(yol), g = !!kayit.ayar[a];
  const pen = document.createElement('div'); pen.id = 'ing-pen';
  const dg = (v, ic, b, s) => `<button data-g="${v}" class="${sec && g === !!v ? 'secili' : ''}"><i>${ic}</i><b>${tt(b)}${v ? ` <span class="oner">${tt('önerilen')}</span>` : ''}</b><small>${tt(s)}</small></button>`;   // göster önerilen
  pen.innerHTML = `<div class="ing-kutu" role="dialog" aria-modal="true"><h3>${tt(k ? 'KELİMELER' : 'CÜMLELER')}</h3><p>${tt('Nasıl oynamak istersin?')}</p>` +
    dg(1, '👁', k ? 'İngilizce kelimeyi göster' : 'İngilizce cümleyi göster', k ? 'Kelimeyi görerek harfleri ara' : 'Cümleyi görerek kelimeleri ara') +
    dg(0, '🙈', k ? 'İngilizce kelimeyi gizle' : 'İngilizce cümleyi gizle', k ? 'Hatırlayarak diz · daha zor' : 'Yalnız Türkçeyi görerek diz · daha zor') +
    `<small class="ing-not">${tt('Seçimin bütün bölümlerde geçerli; haritadaki düğmeden değiştirebilirsin.')}</small></div>`;
  document.body.appendChild(pen);
  yonergeSoyle(k ? 'Nasıl oynamak istersin? İngilizce kelimeyi görerek oynamak için göster düğmesine dokun. Görmeden oynamak için gizle düğmesine dokun.' : 'Nasıl oynamak istersin? İngilizce cümleyi görerek oynamak için göster düğmesine dokun. Görmeden oynamak için gizle düğmesine dokun.');
  pen.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    sesAc(); Ses.cal('tik', { ses: 0.5 });
    Konus.sus(); kayit.ayar[a] = b.dataset.g === '1'; kayit.ayar[a + 'Secildi'] = true; kaydet();
    pen.remove(); ingCipCiz(); if (sonra) sonra();
  });
}
function cumleDojo(r) {
  if (!ingSecildi('cumle')) { ingSor('cumle', () => cumleDojo(r)); return; }
  kayit.sonLvl = r.lvl; kayit.sonSekme = 'cumle'; kaydet();
  const basla = () => { if (!kayit.tutGor) { showTutorial(() => dojoBaslat(r)); return; } dojoBaslat(r); };
  if (kayit.rehber && dersVarMi(r) && !kayit.ders[r.id]) { dersAc(r, basla, () => haritaAc(r.lvl)); return; }
  basla();
}
function paketBaslat(p) {
  if (!ingSecildi('kelime')) { ingSor('kelime', () => paketBaslat(p)); return; }
  kayit.sonLvl = p.lvl; kayit.sonSekme = 'kelime'; kaydet();
  const basla = () => dojoBaslat(p, { kelime: p });
  if (!kayit.tutGor) showTutorial(basla); else basla();
}
/* ---------------- ders ---------------- */
let dersSonra = null;
function dersAc(r, devam, geri) {
  let ic = `<div class="pen-ust"><h2>${tt('Ders')}</h2><span class="lvl">${esc(r.lvl)}</span></div><p class="ders-dunya">${esc(r.world)}</p><div class="ders-kural">${dersMetni(r.rule || '')}</div>`;
  (r.ders || []).forEach(k => { const t = (C.dersler || {})[k]; if (!t) return; ic += `<div class="ders-kart"><b>${dersMetni(t.title)}</b><span>${dersMetni(t.short)}</span><p>${dersMetni(t.rule)}</p></div>`; });
  (r.kurallar || []).forEach(k => { ic += `<div class="ders-not">${dersMetni(k)}</div>`; });
  const ornek = cumleler(r.id).slice(0, 30).filter(s => s.w.length >= 3).sort((a, b) => (siraVeri(b.en) ? 1 : 0) - (siraVeri(a.en) ? 1 : 0) || a.w.length - b.w.length).slice(0, 2);
  if (ornek.length) {
    ic += '<div class="bolum">' + tt('Örnekler') + '</div><div class="liste">';
    ornek.forEach((s, i) => { ic += `<div>${dinleBtn(s.en)}${esc(s.en)}<small>${esc(s.tr)}</small>${i === 0 ? siraHtml(s.en) : ''}</div>`; });
    ic += '</div>';
  }
  ic += `<div class="pen-dip"><button class="big" id="d-git">${tt(G.state === 'paused' ? 'DEVAM' : 'BÖLÜME BAŞLA')}</button>${G.state === 'paused' ? '' : '<div class="row"><button class="sec" id="d-geri">' + tt('Geri') + '</button></div>'}</div>`;
  dersSonra = geri || null;
  goster(ic, 'genis yazi', 'ders');
  kayit.ders[r.id] = 1; kaydet();
  $('#d-git').onclick = () => { dersSonra = null; devam(); };
  const g = $('#d-geri'); if (g) g.onclick = () => { const f = dersSonra; dersSonra = null; if (f) f(); else haritaAc(r.lvl); };
}

/* ---------------- sonuç ---------------- */
function sonucGoster() {
  if (!D) return;
  const d = D; let ic = '';
  const bas = tt(d.antrenman ? 'TAMAM' : d.kazandi ? (d.gunluk ? 'GÖREV TAMAM' : 'BÖLÜM TAMAM') : 'OYUN BİTTİ');
  const alt = d.gunluk ? tt('Günün Görevi · ') + d.r.lvl : d.antrenman ? tt('Antrenman · {a} / {b} hatırladın', { a: d.antrenman.hatirlanan, b: d.antrenman.kuyruk.length })
    : d.kelime ? tt('Kelime Paketi · ') + esc(d.r.ad) + ' · ' + d.r.lvl : esc(d.r.world) + ' · ' + d.r.lvl + (d.r.rule ? ' · ' + esc(d.r.rule) : '');
  ic += `<div class="go ${d.kazandi ? 'zafer' : ''}" style="font-size:clamp(32px,9vw,52px)">${bas}</div><div class="sonuc-alt">${alt}</div>`;
  if (!d.kazandi) ic += '<div class="sonuc-alt kirmizi">' + tt('Hata göstergesi doldu, oyun bitti. Bir dahakine yanlış karo koyma; süre bitmeden doğru karoyu bul.') + '</div>';
  if (d.kazandi && !d.antrenman) ic += `<div class="buyuk-yildiz">${yildizHtml(d.yildiz)}</div><div class="sonuc-alt kucuk">${tt('★ kazandın · ★★ en çok 3 hata · ★★★ en çok 1 hata')}</div>`;
  ic += uniteTamamHtml(d.uniteTamam);                 // ünite ilk kez tamamlandı (harita.js)
  ic += gorevSonucHtml(d.gorevSonuc);                 // Günün Görevi (gorev.js)
  if (d.gunluk && d.kazandi) ic += `<div class="paylas-satir"><span class="kareler">${(d.kareler || []).join('')}</span>${paylasDugme('s-paylas')}</div>`;
  ic += rozetSonucHtml(d.yeniRozet);                  // yeni açılan rozetler (rozet.js)
  if (d.kelime) {
    const pi = paketIlerleme(paketBul(d.r.id));
    ic += `<div class="sonuc-bar"><div><span>${tt('Paket: {a} tanıştın · {b} öğrendin', { a: pi.tanisilan, b: pi.ogrenilen })}</span><span>${pi.ogrenilen} / ${pi.toplam}</span></div><div class="pbar"><i style="width:${Math.round(pi.ogrenilen / Math.max(1, pi.toplam) * 100)}%"></i></div></div>`;
    if (d.yeniPaket) ic += `<div class="sonuc-alt yesil">${tt('Yeni paket açıldı: ')}${esc(d.yeniPaket.ad)}</div>`;
  }
  if (d.yeniDojo && d.kazandi) ic += `<div class="sonuc-alt sari">${d.yeniDojo.lvl !== d.r.lvl ? tt('{l} seviyesi açıldı!', { l: d.yeniDojo.lvl }) : tt('Yeni bölüm açıldı: ') + esc(d.yeniDojo.world)}</div>`;
  const top = d.istat.dogru + d.istat.yanlis;
  ic += sonucXpHtml(d.ilerleme);
  if (d.etkinlik) ic += `<div class="sonuc-alt etk-kazanc">${etkTema().i} ${tt(etkTema().ad)}: +${d.etkinlik} ${etkTema().jeton}</div>`;
  ic += `<div class="stats">
    <div><span>${tt('SKOR')}${d.rekor ? tt(' · YENİ REKOR!') : ''}</span><b>${G.score}</b></div>
    <div><span>${tt('DOĞRU HAMLE')}</span><b>${top ? Math.round(d.istat.dogru / top * 100) : 0}%</b></div>
    ${d.kelime ? `<div><span>${tt('YENİ KELİME')}</span><b>${d.kelime.ogrenilen.length}</b></div>` : d.antrenman ? `<div><span>${tt('HATIRLADIN')}</span><b>${d.antrenman.hatirlanan} / ${d.antrenman.kuyruk.length}</b></div>` : `<div><span>${tt('KUSURSUZ CÜMLE')}</span><b>${d.istat.kusursuz} / ${d.istat.cumle}</b></div>`}
    <div><span>${tt(d.kelime ? 'KELİME SORUSU' : 'BULUNAN HATA')}</span><b>${d.kelime ? d.istat.testOk + ' / ' + d.istat.test : d.istat.savOk + ' / ' + d.istat.sav}</b></div>
    <div><span>${tt('EN UZUN KOMBO')}</span><b>x${d.enKombo || 0}</b></div>
    <div><span>${tt('REKOR')}</span><b>${kayit.best || 0}</b></div></div>`;
  if (d.hatalar.length) {
    ic += `<div class="bolum">${tt(d.kelime ? 'Hataların · bu kelimeler yakında tekrar gelecek' : 'Hataların · Hata Defteri’ne eklendi')}</div><div class="liste">`;
    d.hatalar.slice(0, 10).forEach(h => {
      if (h.tip === 'kelime') ic += `<div>${dinleBtn(h.w.en)}<s>${esc(copeOnekCevir(h.yanlis))}</s> → <ins>${esc(h.w.en)}</ins><small>${esc(h.w.en + ' = ' + h.w.tr)}${h.w.pos ? ' · ' + esc(h.w.pos) : ''}</small></div>`;
      else ic += `<div>${dinleBtn(h.en)}<s>${esc(copeOnekCevir(h.yanlis))}</s> → <ins>${esc(h.dogru || tt('(sil)'))}</ins><small>${esc(h.en)}</small><small class="tr">${esc(h.tr || '')}</small>${h.kural ? `<small class="kr">${esc(h.kural)}</small>` : ''}${h.tip === 'cumle' ? tmDugme(h.en) : ''}</div>`;
    });
    ic += '</div>';
  }
  if (d.kelime && d.kelime.ogrenilen.length) {
    ic += '<div class="bolum">' + tt('Tanıştığın kelimeler') + '</div><div class="liste">';
    d.kelime.ogrenilen.forEach(w => { const o = kelimeOrnek(w); ic += `<div>${dinleBtn(w.en)}<b class="kd-en">${esc(w.en)}</b> = ${esc(w.tr)}${w.pos ? ` <span class="kd-pos">${esc(w.pos)}</span>` : ''}${o ? `<small>${esc(o.en)}</small>` : ''}</div>`; });
    ic += '</div>';
  }
  let sonraki = null;
  if (d.kazandi && !d.antrenman) sonraki = d.kelime ? (d.yeniPaket || null) : (d.r.id && rakipBul(d.r.id) ? sonrakiRakip(d.r) : null);
  if (sonraki && (d.kelime ? !paketAcikMi(sonraki) : !rakipAcikMi(sonraki))) sonraki = null;
  ic += sinavDonusHtml(d);   // kilit.js: Bölüm Yolu'ndan açılan seviye sınavı
  ic += `<div class="pen-dip">${sonraki && !sinavDonusHtml(d) ? `<button class="big" id="s-sonra">${tt('SONRAKİ: ')}${esc(d.kelime ? sonraki.ad : sonraki.world)}</button>` : ''}
    <div class="row">${d.antrenman ? '' : `<button class="sec" id="s-tekrar">${tt(d.kazandi ? 'TEKRAR OYNA' : 'TEKRAR DENE')}</button>`}<button class="sec" id="s-harita">${tt(d.gunluk ? 'ANA MENÜ' : 'KARİYER')}</button></div></div>`;
  goster(ic, 'genis', 'sonuc');
  halkalariDoldur(card);
  if (d.ilerleme && d.ilerleme.hedefOldu) sonra(0.9, () => Ses.cal('yukselis', { ses: 0.6 }));
  if (d.uniteTamam) sonra(d.ilerleme && d.ilerleme.hedefOldu ? 1.7 : 0.9, () => Ses.cal('yukselis', { ses: 0.7 }));
  if (d.yeniRozet && d.yeniRozet.length) sonra(1.3, () => Ses.cal('yukselis', { ses: 0.6 }));
  const r = d.r, kel = d.kelime;
  sinavDonusBagla(d);
  if (sonraki && $('#s-sonra')) $('#s-sonra').onclick = () => kel ? dojoBaslat(sonraki, { kelime: sonraki }) : cumleDojo(sonraki);
  const ps = $('#s-paylas'); if (ps) ps.onclick = () => paylas(gorevPaylasMetni(d));
  const t = $('#s-tekrar'); if (t) t.onclick = () => d.gunluk ? gorevBaslat() : kel ? dojoBaslat(r, { kelime: r }) : dojoBaslat(r);
  $('#s-harita').onclick = () => d.gunluk ? acilisAc() : haritaAc(r.lvl && SEVIYE[r.lvl] ? r.lvl : null);
}

/* ---------------- defterim (hatalar + kelimeler) ve tekrar ---------------- */
let defterSekme = 'hata', kdFiltre = 'hepsi';
function defterAc(sekme) {
  if (sekme) defterSekme = sekme;
  const hTum = kayit.tekrar.slice().sort((a, b) => (a.kutu === 6) - (b.kutu === 6) || a.vade - b.vade);
  const sz = sozluk(), kTum = []; for (const k in kayit.kel) if (sz[k]) kTum.push(sz[k]);
  const hz = srsHazir().length + kelHazir().length;
  let ic = `<div class="ust-satir"><button class="geri" id="df-geri">${tt('← Geri')}</button></div><div class="pen-ust"><h2>${tt('Defterim')}</h2></div>
    <div class="sekmeler" id="df-sek"><button data-s="hata" class="${defterSekme === 'hata' ? 'secili' : ''}">${tt('📕 Hatalar ({n})', { n: hTum.length })}</button><button data-s="kelime" class="${defterSekme === 'kelime' ? 'secili' : ''}">${tt('📗 Kelimeler ({n})', { n: kTum.length })}</button></div>`;
  ic += defterSekme === 'kelime' ? kelimeDefteriHtml(kTum) : hataDefteriHtml(hTum);
  ic += `<div class="pen-dip">${hz || hTum.length || kTum.length ? `<button class="big" id="df-antr">${tt('🔁 TEKRAR ET')}${hz ? tt(' · {n} hazır', { n: hz }) : ''}</button>` : ''}</div>`;
  goster(ic, 'genis', 'defter');
  $('#df-geri').onclick = () => haritaAc();
  card.querySelectorAll('#df-sek button').forEach(b => b.onclick = () => { Ses.cal('tik', { ses: 0.4 }); defterAc(b.dataset.s); });
  card.querySelectorAll('#kd-f button').forEach(b => b.onclick = () => { kdFiltre = b.dataset.f; defterAc('kelime'); });
  const a = $('#df-antr'); if (a) a.onclick = antrenmanBaslat;
}
function hataDefteriHtml(tum) {
  const hz = srsHazir();
  if (!tum.length) return '<p class="aciklama">' + tt('Henüz boş. Yanlış kurduğun cümleler ve kaçırdığın hatalar buraya düşer; sonra 10 dakika, 1, 3, 7 ve 21 gün arayla tekrar karşına çıkar. Böylece unutmazsın.') + '</p>';
  let ic = `<p class="aciklama">${tt('{a} tekrar şimdi hazır · {b} öğrenildi', { a: hz.length, b: tum.filter(e => e.kutu === 6).length })}</p><div class="liste">`;
  tum.slice(0, 80).forEach(e => {
    const dolu = e.kutu === 6 ? 5 : e.kutu - 1; let kutu = '<span class="kutu">';
    for (let q = 1; q <= 5; q++) kutu += q <= dolu ? '<i>●</i>' : '●';
    kutu += '</span>';
    const z = e.kutu === 6 ? tt('öğrenildi') : e.vade <= Date.now() ? tt('şimdi') : tt('{s} sonra', { s: sureYaz(e.vade - Date.now()) });
    if (e.tur === 'cumle') {
      const s = rakipBul(e.r) ? cumleler(e.r)[e.i] : null; if (!s) return;
      ic += `<div>${dinleBtn(s.en)}${esc(s.en)}<small class="tr">${esc(s.tr)}</small><small>${kutu} · ${z}</small>${tmDugme(s.en)}</div>`;
    } else {
      const m = e.m, yan = m.tip === 'sira' ? m.tokens[m.idx] + ' ' + m.tokens[m.idx2] : m.tokens[m.idx];
      ic += `<div>${dinleBtn(m.dogruCumle)}<s>${esc(yan)}</s> → <ins>${esc(m.tip === 'sira' ? m.tokens[m.idx2] + ' ' + m.tokens[m.idx] : (m.dogru || tt('(sil)')))}</ins><small>${esc(m.dogruCumle)}</small><small class="kr">${esc(m.kural || '')}</small><small>${kutu} · ${z}</small></div>`;
    }
  });
  return ic + '</div>';
}
function kelimeDefteriHtml(tum) {
  const dk = dakika(), say = kelSayilar(), hz = kelHazir();
  if (!tum.length) return '<p class="aciklama">' + tt('Henüz boş. Kelime paketlerinde tanıştığın her kelime buraya yazılır ve 10 dakika, 1, 3, 7 ve 21 gün arayla tekrar karşına çıkar.') + '</p>';
  let ic = `<p class="aciklama">${tt('{a} kelime tanıdın · {b} öğrenildi · {c} ustalaştı · {d} tekrar hazır', { a: say.tanis, b: say.ogrenildi, c: say.usta, d: hz.length })}</p>`;
  ic += `<div class="sekmeler kucuk" id="kd-f">${[['hepsi', 'Hepsi'], ['hazir', 'Tekrar zamanı'], ['zor', 'Zorlandıkların']].map(f => `<button data-f="${f[0]}" class="${kdFiltre === f[0] ? 'secili' : ''}">${tt(f[1])}</button>`).join('')}</div>`;
  const liste = tum.filter(w => { const s = kayit.kel[w.k]; return kdFiltre === 'hazir' ? s[0] < 6 && s[1] <= dk : kdFiltre === 'zor' ? s[2] > 0 : true; });
  liste.sort((a, b) => { const x = kayit.kel[a.k], y = kayit.kel[b.k]; return kdFiltre === 'zor' ? y[2] - x[2] : (x[0] === 6) - (y[0] === 6) || x[1] - y[1]; });
  ic += '<div class="liste">';
  liste.slice(0, 160).forEach(w => {
    const s = kayit.kel[w.k]; let kutu = '<span class="kutu">';
    for (let q = 1; q <= 5; q++) kutu += q < s[0] || s[0] === 6 ? '<i>●</i>' : '●';
    kutu += '</span>';
    const z = s[0] === 6 ? tt('ustalaştı') : s[1] <= dk ? tt('şimdi') : tt('{s} sonra', { s: sureYaz((s[1] - dk) * 60000) });
    ic += `<div>${dinleBtn(w.en)}<b class="kd-en">${esc(w.en)}</b> = ${esc(w.tr)}${w.pos ? ` <span class="kd-pos">${esc(w.pos)}</span>` : ''}<small>${kutu} · ${z} · ${esc(paketBul(w.pid).lvl)}${s[2] ? tt(' · {n} hata', { n: s[2] }) : ''}</small></div>`;
  });
  if (!liste.length) ic += '<div>' + tt('Bu filtrede kelime yok.') + '</div>';
  return ic + '</div>';
}
function antrenmanBaslat() {
  let kuyruk = srsHazir().slice(0, 6);
  kelHazir().slice(0, 10 - kuyruk.length).forEach(w => kuyruk.push({ tur: 'kelime', w }));
  if (kuyruk.length < 3) {
    const ek = kayit.tekrar.filter(e => e.kutu < 6 && kuyruk.indexOf(e) < 0).sort((a, b) => a.kutu - b.kutu || a.vade - b.vade);
    kuyruk = kuyruk.concat(ek.slice(0, 6));
    if (kuyruk.length < 3) kelBekleyen(6 - kuyruk.length).forEach(w => { if (!kuyruk.some(e => e.w === w)) kuyruk.push({ tur: 'kelime', w }); });
  }
  kuyruk = karistir(kuyruk).slice(0, 10);
  if (!kuyruk.length) { not(tt('Henüz tekrar edilecek bir şey yok. Kelime paketlerinde öğrendiklerin ve cümlelerde yaptığın hatalar burada birikir.')); return; }
  dojoBaslat({ id: 'antrenman', lvl: sonAcikSeviye(), ad: tt('Antrenman'), world: tt('Antrenman'), rule: tt('Tekrar et, unutma'), n: 0 }, { antrenman: kuyruk });
}

/* ---------------- ayarlar ve duraklatma ---------------- */
let ayarDonus = null;
// oyunda: duraklatma ekranından açıldı · donus: menüden açıldıysa TAMAM'a basınca gidilecek ekran
function ayarAc(oyunda, donus) {
  ayarDonus = oyunda ? showPause : (donus || ayarDonus || acilisAc);
  const A = [['muzik', 'Müzik', 'Oyun ve menü müziği'], ['efekt', 'Efektler', 'Yerleştirme, kombo ve patlama sesleri'], ['titresim', 'Titreşim', 'Doğru ve yanlış hamlede telefon hafifçe titrer'], ['ses', 'İngilizce sesli okuma', 'Cümleler ve kelimeler okunur'], ['trSes', 'Türkçe sesli okuma', 'Kurulacak cümlenin Türkçesi okunur'], ['dizilis', 'İngilizce dizilişi', 'Her cümle tamamlanınca İngilizce sırası ve altında Türkçesi gösterilir'], ['yonergeSes', 'Yönergeleri sesli oku', 'Her turun başında ne yapacağını kısaca sesli söyler']];
  A.push(['olcum', 'Anonim kullanım verisi', 'Oyunu iyileştirmek için isimsiz oyun verisi gönderilir (isim ve yazı gönderilmez)']);
  if (Yerel.bildirimVar()) A.push(['hatirlat', 'Günlük hatırlatma', 'Hedefini tamamlamadığın günler akşam 19:00’da bir bildirim gelir']);
  let ic = '<div class="pen-ust"><h2>' + tt('Ayarlar') + '</h2></div><div class="ayarlar">';
  A.forEach(a => { const acik = a[0] === 'olcum' ? olcumIzinli() : kayit.ayar[a[0]] !== false; ic += `<div class="ayar"><span>${tt(a[1])}<small>${tt(a[2])}</small></span><button class="anahtar${acik ? ' acik' : ''}" data-a="${a[0]}"></button></div>`; });
  ic += `</div>${hedefSecimHtml()}${dilSecimHtml()}<div class="row"><button class="sec" id="a-en">${tt('🔊 İngilizce sesi dene')}</button><button class="sec" id="a-tr">${tt('🔊 Türkçe sesi dene')}</button></div>`;
  const kb = Konus.bilgi();
  ic += `<p class="aciklama kucuk">${tt('Sesli okuma cihazın kendi okuma sesiyle yapılır.')} ${!kb.var ? tt('<b class="red">Bu tarayıcıda sesli okuma yok.</b> Chrome (Android) ya da Safari (iPhone) ile aç.') : tt('Bulunan sesler: {n} · Türkçe: {tr} · İngilizce: {en}', { n: kb.say, tr: kb.tr ? esc(kb.tr) : tt('listede yok, cihazın varsayılan Türkçe sesi denenecek'), en: kb.en ? esc(kb.en) : tt('varsayılan') })}${tt('. Türkçe okunmuyorsa telefonun ayarlarında "Metin okuma" bölümünden Türkçe ses verisini indir. Ayarlar profile kaydedilir.')}</p>`;
  ic += `<div class="pen-dip"><button class="big" id="a-geri">${tt(oyunda ? 'GERİ' : 'TAMAM')}</button></div>`;
  goster(ic, '', 'ayar');
  card.querySelectorAll('.anahtar').forEach(b => b.onclick = () => {
    const k = b.dataset.a;
    if (k === 'olcum') { olcumIzinYaz(!olcumIzinli()); b.classList.toggle('acik', olcumIzinli()); return; }   // cihaz ayarı (profilden bağımsız)
    kayit.ayar[k] = kayit.ayar[k] === false ? true : !kayit.ayar[k]; kaydet();
    b.classList.toggle('acik', kayit.ayar[k] !== false); Ses.ayarla(); musicBtnYaz(); if (!kayit.ayar.ses && !kayit.ayar.trSes) Konus.sus();
    if (k === 'hatirlat') Yerel.hatirlatDegisti(); if (k === 'titresim' && kayit.ayar.titresim) Yerel.titret('orta');
  });
  $('#a-en').onclick = () => { sesAc(); Konus.soyle('Hello! I am learning English by playing.', { zorla: true }); };
  $('#a-tr').onclick = () => { sesAc(); if (!Konus.tr('Merhaba! Oynayarak İngilizce öğreniyorum.', { zorla: true })) not(tt('Bu cihazda Türkçe okuma sesi bulunamadı.')); };
  $('#a-geri').onclick = () => ayarDonus();
  card.querySelectorAll('#hedef-sec button').forEach(b => b.onclick = () => { hedefSec(+b.dataset.hedef); Ses.cal('tik', { ses: 0.4 }); ayarAc(oyunda, donus); });
  card.querySelectorAll('#dil-sec button').forEach(b => b.onclick = () => { if (b.dataset.dil === arayuzDili) return; Ses.cal('tik', { ses: 0.4 }); dilSec(b.dataset.dil); ayarAc(oyunda, donus); });
}
function showPause() {
  const dersR = D && D.r && rakipBul(D.r.id) && dersVarMi(D.r) && !D.kelime ? D.r : null;
  const yer = D ? (D.kelime ? tt('Kelime Paketi · ') + esc(D.r.ad) : D.st ? tt('Seviye Testi') : D.antrenman ? tt('Antrenman') : D.gunluk ? tt('Günün Görevi') + ' · ' + D.r.lvl : D.online ? tt('Online · {ad} ile', { ad: esc(D.online.rakip.ad) }) : esc(D.r.world) + ' · ' + D.r.lvl) : '';
  const cik = tt(D && D.online ? 'MAÇTAN ÇIK' : yarimKaydedilir() ? '💾 KAYDET VE ÇIK' : 'ÇIK');
  goster(`<div class="logo sm"><span class="b">${tt('DURAKLATILDI')}</span></div>
    <div class="sub">${yer}${tt(' · SKOR {n}', { n: G.score })}</div>
    ${D && D.online ? '<p class="aciklama kucuk" style="text-align:center">' + tt('Online maçta süre durmaz; rakibin oynamaya devam ediyor.') + '</p>' : ''}
    <button class="big" id="p-devam">${tt('DEVAM')}</button>
    <div class="row">${dersR ? '<button class="sec" id="p-ders">' + tt('📖 DERSİ GÖR') + '</button>' : ''}<button class="sec" id="p-nas">${tt('NASIL OYNANIR?')}</button><button class="sec" id="p-ayar">${tt('⚙ AYARLAR')}</button></div>
    <div class="row"><button class="sec" id="p-cik">${cik}</button></div>
    ${yarimKaydedilir() ? '<p class="aciklama kucuk" style="text-align:center">' + tt('Çıkarsan Kariyer’de “Kaldığın yerden” ile bu turdan devam edersin.') + '</p>' : ''}
    <div class="keys">${tt(KEYS)}</div>`, '', 'pause');
  $('#p-devam').onclick = togglePause;
  if (dersR) $('#p-ders').onclick = () => dersAc(dersR, () => togglePause(), null);
  $('#p-nas').onclick = () => showTutorial(() => showPause());
  $('#p-ayar').onclick = () => ayarAc(true);
  $('#p-cik').onclick = () => {
    if (D && D.online) { odadanCik(); onlineAc(); return; }
    if (D && D.gunluk) { kaydet(); acilisAc(); return; }
    const kayitli = yarimKaydedilir(), l = D && D.r && SEVIYE[D.r.lvl] ? D.r.lvl : null;
    kaydet(); haritaAc(l);
    if (kayitli) not(tt('Kaydedildi. “Kaldığın yerden” ile devam edebilirsin.'));
  };
}
function togglePause() {
  if (G.state === 'playing') {
    // okuma sürerken duraklatılırsa (ya da telefon kilitlenir / başka uygulamaya geçilirse) devam edince cümle baştan okunur;
    // önceden okuma yarıda kesiliyor ve kelimeler hemen düşmeye başlıyordu
    const R = G.R; if (R && R.bekle && !R.tahtaHazir && !R.bitti && R.prompt && R.prompt.ses) R.tekrarOku = true;
    G.prev = G.state; G.state = 'paused'; G.surukle = null; Konus.sus(); Ses.kis(true); showPause();
  }
  else if (G.state === 'paused') {
    G.state = G.prev || 'playing'; Ses.kis(false); ekranlariKapat();
    const R = G.R; if (R && R.tekrarOku) { R.tekrarOku = false; if (!R.tahtaHazir && !R.bitti) otoOku(R); }
  }
}
function musicBtnYaz() { $('#musicBtn').classList.toggle('off', !kayit.ayar.muzik); }
$('#pauseBtn').onclick = () => { sesAc(); if (G.state === 'playing' || G.state === 'paused') togglePause(); };
$('#musicBtn').onclick = () => { sesAc(); kayit.ayar.muzik = !kayit.ayar.muzik; kaydet(); Ses.ayarla(); musicBtnYaz(); };
$('#setBtn').onclick = () => { sesAc(); if (G.state === 'playing') { togglePause(); ayarAc(true); } else if (G.state === 'paused') ayarAc(true); else if (G.state === 'menu' && (ekran === 'harita' || ekran === 'acilis')) ayarAc(false, ekran === 'harita' ? haritaAc : acilisAc); };
musicBtnYaz();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'playing') togglePause(); Ses.uyu(); }
  else Ses.uyan();
});
document.addEventListener('pointerdown', () => sesAc(), { capture: true });

/* ---------------- nasıl oynanır ---------------- */
const KEYS = 'Klavye: ← → ↑ ↓ karo seç · Enter / Boşluk al ve bırak · J joker · B cümle bombası · Y yavaş · T tekrar dinle · P duraklat';
// nasıl oynanır: küçük tahta örnekleri (karo rengi --c; z dizi, uc sıradaki yer, k hatalı cümle karosu, pt patlayan, gel kayarak gelen)
const RK = ['#ff4757', '#ffc312', '#2ed573', '#1e90ff', '#a55eea'];
const MK = (txt, ci, cls = '', st = '') => `<i class="${cls}" style="--c:${RK[ci]};${st}">${txt}</i>`;
const MG = (sutun, karolar, top = 30) => `<div class="mg" style="grid-template-columns:repeat(${sutun},auto);top:${top}px">${karolar}</div>`;
const SLIDES = [
  { t: 'AMAÇ', demo: `<div class="ctxt" style="top:12px;font-size:22px;color:#ffe48a">A1 → C2 · Sınav · Hayat</div>
      <div class="chips" style="top:52px;bottom:auto"><span>CÜMLELER<em> · bölümler</em></span><span>KELİMELER<em> · paketler</em></span></div>
      <div class="ctxt" style="top:96px;color:#9feeff;font-size:14px">9.000 cümle · 11.000 kelime</div>`,
    txt: `Bu oyunda oynayarak İngilizce öğrenirsin. <b>KARİYER</b>’de seviyeler var: A1’den C2’ye. <b class="gold">CÜMLELER</b>’de cümle kurarsın, <b class="gold">KELİMELER</b>’de kelime öğrenirsin. <b>▶ DEVAM ET</b>’e dokununca sıradaki bölüm açılır. <b>ONLINE KAPIŞMA</b>’da arkadaşınla yarışırsın.` },
  { t: 'CÜMLEYİ KUR', demo: `<div class="dtr" style="top:6px">“Ben sıcak kahve içerim.”</div>
      ${MG(6, MK('HOT', 0) + MK('ICE', 3) + MK('TEA', 4) + MK('SHE', 2) + MK('COLD', 1) + MK('MILK', 0) +
        MK('I', 3, 'z') + MK('DRINK', 2, 'z') + MK('HOT', 1, 'z') + MK('COFFEE', 4, 'gel', '--dx:-40px;--dy:-29px') + MK('AND', 0) + MK('WATER', 2) +
        MK('DRANK', 1) + MK('SUGAR', 3) + MK('CUP', 0) + MK('IS', 4) + MK('FAST', 2) + MK('YOU', 1), 34)}`,
    txt: `Önce ne yapacağın kısaca sesli söylenir ve Türkçe cümle yazılır. Sonra tahtaya İngilizce kelime karoları düşer. Doğru kelimeyi <b>parmağınla tut ve sürükle</b>. Kelimeleri bir sırada <b>soldan sağa</b>, yan yana diz. Doğru dizdiklerin <b class="gold">altın</b> gibi parlar. Cümle bitince karolar <b>patlar</b>. Türkçe yazıya dokunursan sesli dinlersin.` },
  { t: 'TUZAK KELİMELER', demo: `<div class="dtr" style="top:6px">“Ben sıcak kahve içerim.”</div>
      ${MG(4, MK('I', 3, 'z') + MK('DRINKS', 0, 'sek', '--dx:44px') + MK('COFFEE', 4) + MK('AM', 1), 44)}
      <div class="p3" style="top:96px;color:#ffb0b8;text-shadow:0 0 8px #ff3048">YANLIŞ KELİME!</div>`,
    txt: `Tahtada <b>tuzak</b> kelimeler de var. Örneğin <i>drink</i> yerine <i>drinks</i>. Yanlış kelimeyi koyarsan karo <b>geri seker</b> ve doğrusu anlatılır. Bazı kelimeler biraz sonra <b>yukarıdan düşer</b>; bulamazsan biraz bekle.` },
  { t: 'HATAYI BUL', demo: `${MG(4, MK('GOES', 2, 'gel', '--dx:46px;--dy:-34px') + MK('TEA', 0) + MK('RUN', 3) + MK('CAT', 4), 22)}
      ${MG(4, MK('SHE', 0, 'k') + MK('GO', 0, 'k') + MK('TO', 0, 'k') + MK('SCHOOL', 0, 'k'), 86)}`,
    txt: `Bazen tahtanın altında <b>yanlışı olan</b> bir İngilizce cümle durur. Doğru kelimeyi tahtada bul ve <b>yanlış kelimenin üstüne sürükle</b>. Cümlede fazladan bir kelime varsa o kelimeye <b>dokun</b>.` },
  { t: 'KELİME PAKETLERİ', demo: `<div class="ctxt" style="top:4px;color:#ffe48a;font-size:16px">“raf” · isim</div>
      ${MG(6, MK('S', 3, 'z') + MK('H', 1, 'z') + MK('E', 4, 'z') + MK('L', 2, 'gel', '--dx:0px;--dy:30px') + MK('K', 0) + MK('A', 3) +
        MK('O', 1) + MK('T', 2) + MK('R', 0) + MK('F', 4) + MK('N', 3) + MK('I', 2), 34)}`,
    txt: `Yeni kelime önce bir <b>kartta</b> gösterilir; dinlemek için yazıya dokun. Sonra o kelimenin <b>harflerini</b> tahtada bulup soldan sağa yan yana dizersin. Bazen Türkçesini, bazen İngilizcesini, bazen de cümledeki <b>boşluğa</b> gelen kelimeyi dizersin. Ne yapacağın her seferinde <b>sesli söylenir</b>.` },
  { t: 'SÜRE VE HATA GÖSTERGESİ', demo: `<div class="ctxt" style="top:10px;color:#9feeff;font-size:14px">⏱ SÜRE</div><div class="mbar" style="top:34px;--c:#3dff7a"><u></u></div>
      <div class="ctxt" style="top:62px;color:#ffb0b8;font-size:14px">HATA GÖSTERGESİ</div><div class="mbar" style="top:86px;--c:#ff4d5e"><u style="animation-direction:reverse"></u></div>
      <div class="ctxt" style="top:110px;color:#ff6b78;font-size:12px">DOLARSA OYUN BİTER</div>`,
    txt: `Her turun bir <b>süresi</b> var; süre Türkçe yazının altındaki çubukta azalır. Yanlış karo koyarsan ya da süre biterse soldaki <b class="red">hata göstergesi</b> biraz dolar. Gösterge tamamen dolarsa <b>oyun biter</b>. Cümleyi doğru bitirince gösterge biraz <b>boşalır</b>.` },
  { t: 'RENK PATLAMASI', demo: `${MG(5, MK('CAT', 3) + MK('RUN', 0, 'pt') + MK('BIG', 0, 'pt') + MK('SUN', 0, 'pt') + MK('YES', 4) +
        MK('DOG', 1) + MK('AND', 2) + MK('TEA', 4) + MK('BUT', 3) + MK('NOW', 1), 24)}
      <div class="ctxt" style="top:92px;color:#3dff7a;font-size:18px">ZİNCİRLEME KOMBO!</div>
      <div class="pill" style="--c:#ff7a3c;left:50%;bottom:6px;margin-left:-74px">💣 CÜMLE BOMBASI</div>`,
    txt: `Aynı renkten <b>3 karo</b> yan yana ya da alt alta gelirse <b>patlar</b> ve puan kazandırır. Üstteki karolar aşağı düşer, yenileri gelir. Patlamalar sol alttaki <b>💣 CÜMLE BOMBASI</b> düğmesinin halkasını doldurur. Halka dolunca düğmeye dokun: işe yaramayan karolar patlar.` },
  { t: 'KOMBO, JOKER, GÜÇLER', demo: `<div class="pill" style="--c:#ff8a2a;left:50%;top:12px;margin-left:-70px;font-size:16px">ATEŞ · 10 · x4</div>
      <div class="pill" style="--c:#4dc3ff;left:4%;bottom:22px">⏳ YAVAŞ</div><div class="pill pj" style="--c:#ffd23d;left:50%;bottom:22px;margin-left:-44px">🃏 JOKER</div><div class="pill" style="--c:#ff7a3c;right:4%;bottom:22px">💣 BOMBA</div>`,
    txt: `Art arda doğru karo koydukça <b>KOMBO</b> artar ve daha çok puan alırsın. Seri uzayınca ödül kazanırsın: ⏳ <b>YAVAŞ</b> süreyi yavaşlatır, 🃏 <b>JOKER</b> bir karonun Türkçesini gösterir. Ödüller alttaki <b>kutularda</b> durur; kullanmak için kutuya dokun.` },
  { t: 'TEKRAR VE İLERLEME', demo: `<div class="ctxt" style="top:14px;font-size:20px;color:#ffd23d">10 dk · 1 · 3 · 7 · 21 gün</div>
      <div class="chips" style="bottom:52px"><span>📕 Hata Defteri</span><span>📗 Kelime Defteri</span><span>🔁 Antrenman</span></div>
      <div class="ctxt" style="bottom:14px;top:auto;color:#9feeff;font-size:13px">📖 Her bölümün dersi · Türkçe mantığıyla gör</div>`,
    txt: `Yanlış yaptığın cümle ve kelimeler sonra yeniden <b>karşına çıkar</b>; böylece unutmazsın. <b>🔁 Tekrar</b> düğmesi zamanı gelenleri sorar. Her bölümün bir <b>📖 dersi</b> var. <b>Seviyeni ölç</b> ile seviyeni bulabilirsin.` }
];function showTutorial(sonra) {
  tutSonra = sonra || null; tutIdx = 0;
  goster(`<div class="tut">${logoHtml('sm')}<div class="sub">${tt('NASIL OYNANIR?')}</div>
    ${SLIDES.map((sl, i) => `<div class="slide"><div class="st"><i>${i + 1}/${SLIDES.length}</i>${tt(sl.t)}</div><div class="demo">${demoCevir(sl.demo)}</div><div class="stxt">${tt(sl.txt)}</div></div>`).join('')}
    <div class="dots">${SLIDES.map(() => '<b></b>').join('')}</div>
    <div class="nav"><button class="nb" id="tPrev">${tt('◀ GERİ')}</button><button class="nb" id="tNext">${tt('İLERİ ▶')}</button></div>
    <button class="big" id="tGo">${tt('ANLADIM')}</button>
    <div class="skip" id="tSkip">${tt('Anlatımı geç ›')}</div>
    <div class="keys">${tt(KEYS)}</div></div>`, '', 'tut');
  $('#tPrev').onclick = () => tutStep(-1); $('#tNext').onclick = () => tutStep(1);
  $('#tGo').onclick = tutFinish; $('#tSkip').onclick = tutFinish;
  tutRender();
}
function tutRender() {
  card.querySelectorAll('.slide').forEach((el, i) => el.classList.toggle('on', i === tutIdx));
  const sl = card.querySelectorAll('.slide')[tutIdx];   // anlatım sesli okunur (ekrandaki dilde)
  if (sl) { const bas = sl.querySelector('.st').childNodes, ad = [...bas].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim(); yonergeSoyle(ad.toLocaleLowerCase(arayuzDili === 'en' ? 'en' : 'tr-TR') + '. ' + sl.querySelector('.stxt').textContent, { ham: true }); }
  card.querySelectorAll('.dots b').forEach((el, i) => el.classList.toggle('on', i === tutIdx));
  const last = tutIdx === SLIDES.length - 1;
  $('#tPrev').disabled = tutIdx === 0; $('#tNext').style.display = last ? 'none' : ''; $('#tGo').style.display = last ? '' : 'none'; $('#tSkip').style.display = last ? 'none' : '';
  card.scrollTop = 0;
}
function tutStep(d) { sesAc(); const n = tutIdx + d; if (n >= SLIDES.length) { tutFinish(); return; } tutIdx = clamp(n, 0, SLIDES.length - 1); Ses.cal('tik', { ses: 0.4 }); tutRender(); }
function tutFinish() {
  Konus.sus();
  tutOpen = false; kayit.tutGor = true; kaydet();
  const f = tutSonra; tutSonra = null;
  if (f) f(); else acilisAc();
}

/* =====================================================================
   AÇILIŞ
   ===================================================================== */
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0); last = ts;
  try { update(dt); draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
async function boot() {
  if (!C.rivals.length) throw new Error('İçerik dosyası (icerik.js) yüklenemedi');
  await Depo.hazirla();                               // uygulamada kayıtlar telefonun kalıcı hafızasından okunur
  Yerel.kur();                                        // uygulamada: geri tuşu, durum çubuğu, arka plan, hatırlatma (yerel.js)
  if (Depo.uygulamaMi()) { dilOku(); profilleriYukle(); musicBtnYaz(); }
  sabitYazilar();
  layout();
  demo();
  updatePowUI();
  ilerlemeGuncelle();                                 // gün değiştiyse seri bugüne getirilir
  if (aktifProfil()) acilisAc(); else profilsizAc();      // hiç profil yoksa rehberli ilk cümle (ilk.js)
  kayitUyarilariGoster();                             // bozuk kayıt onarıldıysa oyuncuya bir kez söylenir
  window.__acildi = true;
  Olcum.olay('oyun_acildi', { profil: !!aktifProfil(), davet: !!DAVET });
  requestAnimationFrame(frame);
}
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });
const fontReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('700 20px Fredoka'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontReady.then(boot, boot);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (L.in) { SPR.clear(); yerlesimYenile(); renderBG(); } });
