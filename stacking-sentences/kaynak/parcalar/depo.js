/* =====================================================================
   KALICI KAYIT (Depo)
   Profiller, ilerleme ve yarım bölüm kayıtlarının hepsi bu kapıdan geçer.
   · Tarayıcıda: localStorage (eskisi gibi, hiçbir şey değişmez).
   · Uygulamada (Capacitor): telefonun kalıcı hafızası (Preferences eklentisi).
     İşletim sistemi yer açmak için tarayıcı hafızasını silse de kayıt kaybolmaz.
     İlk açılışta eski tarayıcı kayıtları bir kez buraya kopyalanır; anahtarlar
     (te_profiller_v1, te_profil_<id>, te_yarim_<id>, te_kayit_v1) ve biçim aynı kalır.
   Okuma bellekteki kopyadan anında yapılır; yazma arkada kalıcı hafızaya gider.
   ===================================================================== */
const Depo = (() => {
  const ON = 'te_';                      // yalnız oyunun kendi anahtarları
  const bellek = new Map();
  let yerli = null, hazir = null, bekleyen = 0, hata = 0, tasinan = 0;
  let sira = Promise.resolve();         // yazmalar sırayla gider: aynı anahtara art arda yazılınca son yazılan kalır
  const ls = (() => { try { const s = window.localStorage; s.getItem(ON + 'deneme'); return s; } catch (e) { return null; } })();
  function eklenti() {
    const c = window.Capacitor;
    return (c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() && c.Plugins && c.Plugins.Preferences) || null;
  }
  async function yukle(p) {
    const { keys } = await p.keys();
    const bizim = (keys || []).filter(k => k.indexOf(ON) === 0);
    if (!bizim.length && ls) {           // ilk açılış: tarayıcıdaki eski kayıtları bir kez taşı
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.indexOf(ON) === 0) bellek.set(k, ls.getItem(k)); }
      await Promise.all([...bellek].map(([key, value]) => p.set({ key, value })));
      tasinan = bellek.size;
    } else {
      for (const k of bizim) { const { value } = await p.get({ key: k }); if (value != null) bellek.set(k, value); }
    }
  }
  // boot() bunu bekler; tarayıcıda hemen biter
  function hazirla() {
    if (hazir) return hazir;
    const p = eklenti();
    hazir = !p ? Promise.resolve() : yukle(p).then(() => { yerli = p; }, e => { bellek.clear(); console.warn('Kalıcı hafıza açılamadı, tarayıcı hafızası kullanılıyor', e); });
    return hazir;
  }
  function al(k) {
    if (yerli) return bellek.has(k) ? bellek.get(k) : null;
    try { return ls ? ls.getItem(k) : null; } catch (e) { return null; }
  }
  // true: yazıldı; false: yer yok / hafıza kapalı (eskisi gibi)
  function yaz(k, v) {
    v = String(v);
    if (yerli) {
      bellek.set(k, v); bekleyen++;
      sira = sira.then(() => yerli.set({ key: k, value: v })).catch(() => { hata++; }).then(() => { bekleyen--; });
      try { if (ls) ls.setItem(k, v); } catch (e) { }   // yedek kopya; dolarsa önemli değil
      return true;
    }
    if (!ls) return false;
    try { ls.setItem(k, v); return true; } catch (e) { return false; }
  }
  function sil(k) {
    bellek.delete(k);
    if (yerli) { bekleyen++; sira = sira.then(() => yerli.remove({ key: k })).catch(() => { hata++; }).then(() => { bekleyen--; }); }
    try { if (ls) ls.removeItem(k); } catch (e) { }
  }
  // oyunun bütün anahtarları (kurtarma ve yedek temizliği için)
  function anahtarlar() {
    if (yerli) return [...bellek.keys()];
    const o = []; try { if (ls) for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.indexOf(ON) === 0) o.push(k); } } catch (e) { }
    return o;
  }
  // Capacitor eklentisi var mı (kalıcı hafıza açılamasa bile kayıtlar boot'ta okunur)
  const uygulamaMi = () => !!eklenti();
  return { hazirla, al, yaz, sil, anahtarlar, uygulamaMi, tur: () => (yerli ? 'uygulama' : 'tarayici'), durum: () => ({ bekleyen, hata, tasinan }) };
})();

