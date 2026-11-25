/* =====================================================================
   PAYLAŞ VE DAVET ("Beni geç")
   · Sonuç ekranlarında 📤 Paylaş: Wordle gibi emojili sonuç metni + oyunun linki. Uygulamada telefonun paylaş menüsü
     (Capacitor Share), tarayıcıda navigator.share, o da yoksa panoya kopyalama.
   · Günün Görevi: her tur bir kare (🟩 hatasız cümle · 🟨 hatalı cümle · 🟦 bulunan hata · 🟥 kaçırılan hata), yıldızlar, süre.
   · Bölüm Yolu: yıldızlar, puan; link "#davet=y.<bölüm>.<puan>.<ad>" taşır. Linki açan oyuncu o bölümü oynar (kilitli olsa da,
     ilerlemesi değişmez), sonunda iki puan karşılaştırılır ve kendi sonucunu geri paylaşabilir.
   · OYUN_URL: oyunun herkese açık adresi (mağaza linkleri hazır olunca buraya yazılır).
   ===================================================================== */
const OYUN_URL = 'https://anilayaz3535.github.io/zihin/stacking-sentences/';
let DAVET = null;   // { tur: 'y', no, puan, ad } — linkle gelen davet (bir kez gösterilir)
function davetOku(h) {
  const m = /davet=y\.(\d{1,3})\.(\d{1,6})\.([^&]{1,60})/.exec(String(h || ''));
  if (!m) return null;
  const no = +m[1], puan = +m[2]; let ad = 'Arkadaşın';
  try { ad = temizAd(decodeURIComponent(m[3])); } catch (e) { }
  return no >= 1 && no <= YOL_TOPLAM ? { tur: 'y', no, puan, ad } : null;
}
try { DAVET = davetOku(location.hash); if (DAVET && history.replaceState) history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
function davetLink(no, puan) {
  const ad = encodeURIComponent((aktifProfil() && aktifProfil().ad) || tt('Arkadaşın'));
  return OYUN_URL + '#davet=y.' + no + '.' + puan + '.' + ad;
}
async function paylas(metin) {
  sesAc(); window.__paylasilan.push(metin);
  const c = window.Capacitor, S = c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.Share;
  try {
    if (S) { await S.share({ text: metin, dialogTitle: tt('Paylaş') }); return 'uygulama'; }
    if (navigator.share) { await navigator.share({ text: metin }); return 'paylas'; }
  } catch (e) { if (e && (e.name === 'AbortError' || /cancel/i.test(e.message || ''))) return 'iptal'; }
  try { await navigator.clipboard.writeText(metin); not(tt('Kopyalandı! İstediğin yere yapıştır.')); return 'pano'; } catch (e) { }
  not(tt('Paylaşılamadı.')); return 'yok';
}
window.__paylasilan = [];   // test: son paylaşılan metinler
function paylasDugme(id) { return `<button class="sec paylas-btn" id="${id}">📤 ${tt('PAYLAŞ')}</button>`; }
const yildizEmoji = n => '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
const sureMetin = sn => Math.floor(sn / 60) + ':' + String(Math.floor(sn % 60)).padStart(2, '0');

/* ---- Günün Görevi: tur kareleri ---- */
Olay.dinle('bolumBasladi', v => { if (v.mod === 'gunluk' && D) { D.kareler = []; D.gorevT0 = G.t; D.kareBekle = false; } });
// kaçırılan "hatayı bul" turu 🟥: bir sonraki tur başlarken ya da görev biterken hâlâ bulunmamışsa
const kareKapat = () => { if (D && D.gunluk && D.kareler && D.kareBekle) { D.kareler.push('🟥'); D.kareBekle = false; } };
Olay.dinle('turBasladi', v => { if (!(D && D.gunluk && D.kareler)) return; kareKapat(); D.kareBekle = v.tip === 'sav'; });
Olay.dinle('bolumBitti', v => { if (v.mod === 'gunluk') kareKapat(); });
Olay.dinle('cumleTamam', v => { if (D && D.gunluk && D.kareler) D.kareler.push(v.kusursuz ? '🟩' : '🟨'); });
Olay.dinle('hataBulundu', () => { if (D && D.gunluk && D.kareler) { D.kareler.push('🟦'); D.kareBekle = false; } });
function gorevPaylasMetni(d) {
  const sn = Math.max(0, G.t - (d.gorevT0 || 0));
  return `Stacking Sentences · ${tt('Günün Görevi')} ${bugunAnahtar()} · ${d.r.lvl}\n${(d.kareler || []).join('')}  ${yildizEmoji(d.yildiz || 0)}  ⏱ ${sureMetin(sn)}\n` +
    tt('Ben bugünkü İngilizce cümleleri kurdum. Sen de dene!') + '\n' + OYUN_URL;
}
/* ---- Bölüm Yolu ---- */
function yolPaylasMetni(no, yildiz, puan, davetSonuc) {
  return `Stacking Sentences · 🗺 ${tt('Bölüm {n}', { n: no })}\n${yildizEmoji(yildiz)}  ${puan} ${tt('puan')}${davetSonuc || ''}\n` +
    tt('Beni geçebilir misin? 👉') + ' ' + davetLink(no, puan);
}
/* ---- davet kartı (açılışta, linkle gelindiyse bir kez) ---- */
function davetGoster() {
  const d = DAVET; if (!d || !aktifProfil()) return false;
  DAVET = null;
  const b = yolBolum(d.no);
  goster(`<div class="davet-kart"><div class="davet-ikon">🎯</div>
    <h3>${tt('{ad} seni çağırıyor!', { ad: esc(d.ad) })}</h3>
    <p>${tt('{ad}, Bölüm {n}’de {p} puan yaptı. Onu geçebilir misin?', { ad: esc(d.ad), n: d.no, p: d.puan })}</p>
    <div class="y-hedef">${yolHedefYazi(b.hedef)}</div></div>
    <button class="big" id="dv-oyna">${tt('OYNA ▶')}</button><div class="row"><button class="sec" id="dv-sonra">${tt('Sonra')}</button></div>`, '', 'davet');
  $('#dv-oyna').onclick = () => { sesAc(); yolOyna(d.no, { davet: d }); };
  $('#dv-sonra').onclick = () => acilisAc();
  return true;
}
