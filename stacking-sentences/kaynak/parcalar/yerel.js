/* =====================================================================
   UYGULAMA KATMANI (App Store / Google Play sürümü, Capacitor)
   Tarayıcıda hiçbir şey değiştirmez (titreşim hariç: Android Chrome'da navigator.vibrate).
   Uygulamada telefonun yerel özelliklerini bağlar:
   · Titreşim (Haptics): doğru hamle hafif, yanlış hamle uyarı, cümle / bölüm tamam başarı. Ayarlar → Titreşim.
   · Android geri tuşu: oyunda duraklatır; menüde bir önceki ekrana döner; açılış ekranında uygulamayı arka plana alır.
   · Uygulama arka plana gidince oyun duraklar, ses susar (telefon kilitlenince de).
   · Durum çubuğu gizlenir (tam ekran oyun), açılış resmi oyun hazır olunca kalkar.
   · Günlük hatırlatma (Local Notifications): hedef tamamlanmayan günler 19:00'da bir bildirim. Ayarlar'dan açılır,
     izin ilk açılışta istenir. Önümüzdeki 7 gün planlanır; hedef tamamlanınca bugünkü bildirim iptal edilir.
   Sesli okuma için yerel okuma eklentisi audio.js'teki Konus içinde kullanılır.
   ===================================================================== */
const Yerel = (() => {
  const C = () => window.Capacitor;
  const yerliMi = () => { const c = C(); return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); };
  const ek = ad => { const c = C(); return (yerliMi() && c.Plugins && c.Plugins[ad]) || null; };
  const platform = () => { const c = C(); return c && c.getPlatform ? c.getPlatform() : 'web'; };

  /* ---- titreşim ---- */
  let sonTitresim = 0;
  function titret(tur) {
    if (kayit.ayar.titresim === false) return;
    const simdi = Date.now(); if (tur === 'hafif' && simdi - sonTitresim < 60) return; sonTitresim = simdi;
    const H = ek('Haptics');
    try {
      if (H) {
        if (tur === 'hata') H.notification({ type: 'ERROR' });
        else if (tur === 'basari') H.notification({ type: 'SUCCESS' });
        else H.impact({ style: tur === 'orta' ? 'MEDIUM' : 'LIGHT' });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(tur === 'hata' ? [30, 40, 30] : tur === 'basari' ? [15, 30, 25] : tur === 'orta' ? 22 : 10);
    } catch (e) { }
  }
  const oyunda = () => G.state === 'playing';
  Olay.dinle('dogruHamle', () => { if (oyunda()) titret('hafif'); });
  Olay.dinle('hata', () => titret('hata'));
  Olay.dinle('cumleTamam', () => titret('orta'));
  Olay.dinle('kombo', v => { if (v.n && v.n % 6 === 0) titret('orta'); });
  Olay.dinle('bolumBitti', v => { if (v.kazandi) titret('basari'); });

  /* ---- geri tuşu (Android) ---- */
  function geri() {
    if (typeof STR !== 'undefined' && STR && !ov.classList.contains('show')) { strCikSor(); return; }   // strateji maçı
    if (typeof dzAcik !== 'undefined' && dzAcik && G.state === 'playing') { dzAcik.kapat(); return; }   // İngilizce dizilişi kartı
    if (G.state === 'playing') { togglePause(); return; }
    if (G.state === 'paused') {
      if (ekran === 'pause') { togglePause(); return; }
      const g = card.querySelector('#a-geri, .geri'); if (g) { g.click(); return; }
      showPause(); return;
    }
    // menüler: ekrandaki geri düğmesi, yoksa açılışa; açılıştaysa uygulamayı arka plana al
    const g = card && card.querySelector('.ust-satir .geri, #d-geri, #r-geri, #p-geri, #a-geri, #s-harita, #ss-cik, #os-cik, #es-iptal, #oda-cik, #y-harita, #c-geri, #e-geri');
    if (ekran === 'acilis' || ekran === 'ilkKarsila') { const A = ek('App'); if (A && A.minimizeApp) A.minimizeApp(); else if (A) A.exitApp(); return; }
    if (g) { g.click(); return; }
    if (aktifProfil()) acilisAc();
  }

  /* ---- günlük hatırlatma ---- */
  const HATIRLAT_SAAT = 19, BILDIRIM_ILK = 4100;
  const MESAJLAR = [
    ['🔥 Serin seni bekliyor', 'Bugünkü hedefe birkaç cümle kaldı. 3 dakikan var mı?'],
    ['📅 Günün görevi hazır', 'Bugünün 5 cümlesi seni bekliyor.'],
    ['☕ Kısa bir mola?', 'Bir bölüm oyna, günlük hedefini tamamla.'],
    ['✏️ Bugün bir cümle kur', 'Her gün biraz İngilizce, serini koru.'],
  ];
  async function hatirlatAyarla() {
    const N = ek('LocalNotifications'); if (!N) return;
    try {
      const bekleyen = await N.getPending();
      const bizim = (bekleyen.notifications || []).filter(n => n.id >= BILDIRIM_ILK && n.id < BILDIRIM_ILK + 20).map(n => ({ id: n.id }));
      if (bizim.length) await N.cancel({ notifications: bizim });
      if (!kayit.ayar.hatirlat || !aktifProfil()) return;
      const liste = [], simdi = new Date();
      for (let i = 0; i < 7; i++) {
        const t = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + i, HATIRLAT_SAAT, 0, 0);
        if (t <= simdi) continue;
        if (i === 0 && ilerlemeOzet().tamam) continue;           // bugünün hedefi tamam: bugün hatırlatma yok
        const m = MESAJLAR[i % MESAJLAR.length];
        liste.push({ id: BILDIRIM_ILK + i, title: tt(m[0]), body: tt(m[1]), schedule: { at: t, allowWhileIdle: true } });
      }
      if (liste.length) await N.schedule({ notifications: liste });
    } catch (e) { console.warn('Hatırlatma kurulamadı', e); }
  }
  async function hatirlatIzin() {
    const N = ek('LocalNotifications'); if (!N) return false;
    try {
      let p = await N.checkPermissions();
      if (p.display !== 'granted') p = await N.requestPermissions();
      return p.display === 'granted';
    } catch (e) { return false; }
  }
  // Ayarlar'da anahtar açılınca
  async function hatirlatDegisti() {
    if (kayit.ayar.hatirlat && !(await hatirlatIzin())) {
      kayit.ayar.hatirlat = false; kaydet();
      not(tt('Bildirim izni verilmedi. Telefonun ayarlarından açabilirsin.'));
      if (ekran === 'ayar') { const b = card.querySelector('[data-a="hatirlat"]'); if (b) b.classList.remove('acik'); }
    }
    hatirlatAyarla();
  }
  Olay.dinle('hedefTamam', () => hatirlatAyarla());
  // sandık açılınca bildirim (odul.js); hatırlatma ayarından bağımsız, izin varsa
  async function sandikHatirlat(zaman) {
    const N = ek('LocalNotifications'); if (!N) return;
    try {
      await N.cancel({ notifications: [{ id: 4300 }] });
      const p = await N.checkPermissions(); if (p.display !== 'granted' || !zaman || zaman <= Date.now()) return;
      await N.schedule({ notifications: [{ id: 4300, title: tt('🎁 Sandığın açıldı!'), body: tt('İçinde ne var? Gel ve aç.'), schedule: { at: new Date(zaman), allowWhileIdle: true } }] });
    } catch (e) { }
  }
  Olay.dinle('kayitYuklendi', () => hatirlatAyarla());

  /* ---- açılış ---- */
  function kur() {
    if (!yerliMi()) return;
    document.documentElement.classList.add('uygulama', 'platform-' + platform());
    const S = ek('StatusBar'); if (S) { try { S.hide(); } catch (e) { } }
    const A = ek('App');
    if (A) {
      A.addListener('backButton', geri);
      A.addListener('appStateChange', s => {
        if (!s.isActive) { if (G.state === 'playing') togglePause(); Konus.sus(); Ses.uyu(); }
        else { Ses.uyan(); hatirlatAyarla(); }
      });
    }
    const bekle = () => { if (window.__acildi) { const SP = ek('SplashScreen'); if (SP) { try { SP.hide({ fadeOutDuration: 250 }); } catch (e) { } } hatirlatAyarla(); } else setTimeout(bekle, 100); };
    bekle();
  }
  return { kur, yerliMi, platform, titret, geri, hatirlatAyarla, sandikHatirlat, hatirlatDegisti, bildirimVar: () => !!ek('LocalNotifications') };
})();
