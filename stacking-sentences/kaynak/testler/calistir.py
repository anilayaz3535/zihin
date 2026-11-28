#!/usr/bin/env python3
"""Kalıcı test seti — her değişiklikten sonra çalıştır.

Kullanım (kaynak klasöründen):
    sh build.sh                          # önce oyunu derle
    python3 testler/calistir.py          # bütün testler
    python3 testler/calistir.py veri modlar   # yalnız seçilenler
    python3 testler/calistir.py --hizli  # her değişiklikte: uzun taramalar (veri, online) hariç, ~2 dk
    python3 testler/calistir.py --taban  # veri taramasının tabanını yeniden yaz

Gerekenler: Python 3, `pip install playwright` ve `playwright install chromium`.
Bilgisayardaki Chrome'u kullanmak için: CHROME=/yol/chrome python3 testler/calistir.py
Ekran görüntüleri testler/cikti/ klasörüne yazılır.
"""
import sys, os, json, time, subprocess, traceback
from collections import Counter
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.abspath(__file__))
KAYNAK = os.path.dirname(DIR)
PORT = int(os.environ.get('TEST_PORT', '18900'))
URL = f'http://127.0.0.1:{PORT}/index.html'   # oyun gerçek sunucudaki gibi http ile açılır (file:// ses dosyalarını engeller)
OUT = os.path.join(DIR, 'cikti')
TABAN = os.path.join(DIR, 'taban.json')
BOT = open(os.path.join(DIR, 'bot.js'), encoding='utf-8').read()
SWEEP = open(os.path.join(DIR, 'sweep.js'), encoding='utf-8').read()
METIN = open(os.path.join(DIR, 'metin.js'), encoding='utf-8').read()
METIN_TABAN = os.path.join(DIR, 'metin_taban.json')
CHROME = os.environ.get('CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
os.makedirs(OUT, exist_ok=True)

TESTLER = []
YAVAS = ('veri', 'online', 'tek')   # --hizli bunları atlar; adım sonunda tam set çalışır
def test(f):
    TESTLER.append(f); return f

def profil_js(pid='t', ad='Test', ek=''):
    return ("if (!localStorage.getItem('te_profiller_v1')) { localStorage.setItem('te_profiller_v1', JSON.stringify({aktif:'%s', liste:[{id:'%s', ad:'%s'}], eskiAktarildi:true}));"
            " localStorage.setItem('te_profil_%s', JSON.stringify({tutGor:true, baslangic:'A1', rehber:true, kelRehber:true, sonLvl:'A1', acik:{'A1-1':true},"
            " ayar:{muzik:true, efekt:true, ses:true, trSes:true, dizilis:true, ingCumleSecildi:true, ingKelimeSecildi:true}%s})); }") % (pid, pid, ad, pid, ek)   # göster / gizle önceden seçilmiş (gizle)

class Sayfa:
    """Bir telefon gibi davranan tarayıcı sayfası; JS hatalarını toplar."""
    def __init__(self, b, w=390, h=844, profil=True, pid='t', ad='Test', init=(), dpr=1):
        self.ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=True, has_touch=True)
        self.pg = self.ctx.new_page(); self.errs = []
        # Google Fonts'a internet olmayabilir: testler her yerde aynı sonucu versin diye boş CSS döndürülür
        self.ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.on('console', lambda m: self.errs.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'Failed to load' not in m.text and 'ERR_NAME' not in m.text else None)
        for s in init: self.pg.add_init_script(s)
        self.pg.add_init_script(BOT)
        if profil: self.pg.add_init_script(profil_js(pid, ad))
        self.ac()
    def ac(self):
        self.pg.goto(URL); self.bekle()
    def bekle(self):
        self.pg.wait_for_function('window.__acildi === true', timeout=30000); self.pg.evaluate('__botInstall()')
    def js(self, s): return self.pg.evaluate(s)
    def foto(self, ad): self.pg.screenshot(path=os.path.join(OUT, ad + '.png'))
    def hatalar(self): return self.errs + (self.js('window.__hata') or [])
    def kapat(self): self.ctx.close()
    def cop(self):
        # uzun taramalarda biriken çöpü toplatır (tahta çizimi tarayıcının JS dışı hafızasını şişirir; toplanmazsa sekme çöker)
        try:
            if not hasattr(self, '_cdp'): self._cdp = self.ctx.new_cdp_session(self.pg)
            self._cdp.send('HeapProfiler.collectGarbage')
        except Exception: pass

def esit(a, b, ne):
    if a != b: raise AssertionError(f'{ne}: {a!r} != {b!r}')
def dogru(x, ne):
    if not x: raise AssertionError(ne)

# ---------------------------------------------------------------- testler
@test
def acilis(b):
    """İlk açılış: karşılama, rehberi geçip profil oluşturma, açılış ekranı, iki ana düğme, JS hatası yok."""
    s = Sayfa(b, profil=False)
    esit(s.js('ekran'), 'ilkKarsila', 'ilk ekran')
    s.pg.tap('#ilk-gec'); s.pg.wait_for_timeout(150); esit(s.js('ekran'), 'profilYeni', 'rehberi geç')
    s.pg.tap('#p-olustur'); s.pg.wait_for_timeout(150)
    dogru(s.js("document.getElementById('not').textContent.length > 0"), 'boş isim uyarısı yok')
    s.pg.tap('#p-ad'); s.pg.keyboard.type('Ayşe'); s.pg.tap('#p-olustur'); s.pg.wait_for_timeout(300)
    esit(s.js('ekran'), 'acilis', 'profil sonrası ekran')
    dogru(s.js("!!document.getElementById('a-kariyer') && !!document.getElementById('a-online')"), 'KARİYER / ONLINE düğmesi yok')
    esit(s.js('aktifProfil().ad'), 'Ayşe', 'aktif profil')
    s.foto('acilis')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'profil oluşturuldu, açılış ekranı tamam'

@test
def veri(b, taban_yaz=False):
    """Bütün cümle/kelime/hata turları 3 ekran boyutunda tahtada kurulup çizilir; sorun sayıları tabandan artmamalı.
    Tahta her zaman hedefe yeter: en uzun cümle (kelime sayısı) ve en uzun kelime (harf sayısı) tek satıra yatay sığar."""
    sonuc = {}; uzun = {}
    for vw, vh in [(360, 640), (390, 844), (844, 390)]:
        s = Sayfa(b, vw, vh, init=[SWEEP])
        top = {'cumle': 0, 'kelime': 0, 'sorun': Counter()}; ornek = {}
        for parca in range(8):
            r = s.js(f'__sweep({parca}, 8)'); s.cop(); s.pg.wait_for_timeout(50)
            top['cumle'] += r['sentences']; top['kelime'] += r['words']; top['sorun'].update(r['issues'])
            for k, v in r['enUzun'].items(): uzun[k] = max(uzun.get(k, 0), v)
            for k, v in r['samples'].items(): ornek.setdefault(k, v)
        top['sorun'] = dict(top['sorun']); sonuc[f'{vw}x{vh}'] = top
        for ad in ('tahta-tasma', 'sav-tasma', 'cumle-sutun-yanlis', 'tahta-kuyudan-tasma'):
            esit(top['sorun'].get(ad, 0), 0, f'{vw}x{vh} {ad}: {ornek.get(ad)}')
        esit(s.hatalar(), [], f'JS hataları {vw}x{vh}'); s.kapat()
    dogru(uzun['sutun'] >= uzun['cumle'] and uzun['sutun'] >= uzun['harf'], f'tahta en uzuna yetmiyor: {uzun}')
    if taban_yaz or not os.path.exists(TABAN):
        json.dump(sonuc, open(TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        return 'taban yazıldı: ' + ', '.join(f"{k} {v['cumle']} cümle {v['kelime']} kelime" for k, v in sonuc.items()) + f"; en uzun cümle {uzun['cumle']}, en uzun kelime {uzun['harf']}, en çok {uzun['sutun']} sütun"
    taban = json.load(open(TABAN, encoding='utf-8'))
    for k, v in sonuc.items():
        t = taban[k]
        esit(v['cumle'], t['cumle'], k + ' cümle sayısı'); esit(v['kelime'], t['kelime'], k + ' kelime sayısı')
        for ad, n in v['sorun'].items():
            dogru(n <= t['sorun'].get(ad, 0), f'{k} yeni/artan sorun: {ad} {t["sorun"].get(ad, 0)} -> {n}')
    v = sonuc['390x844']
    return f"{v['cumle']} cümle, {v['kelime']} kelime; en uzun cümle {uzun['cumle']} kelime, en uzun kelime {uzun['harf']} harf, tahta en çok {uzun['sutun']} sütun: hepsi tek satıra sığdı; sorunlar tabanı aşmadı"

MODLAR = [
    ('kariyer_A1-1', "dojoBaslat(rakipBul('A1-1'))", 0.1),
    ('kelime_K-A1-1', "dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})", 0.1),
    ('seviye_testi', "stBaslat()", 0.25),
    ('kaybetme', "dojoBaslat(rakipBul('A1-1'))", 0.7),
    ('antrenman', "antrenmanBaslat()", 0.1),
    ('B2', "dojoBaslat(seviyeRakipleri('B2')[3])", 0.1),
    ('C2_usta', "dojoBaslat(seviyeRakipleri('C2').filter(r => r.usta === 2)[0])", 0.1),
]
@test
def modlar(b):
    """Bot her oyun modunu sonuna kadar oynar: takılma yok, sonuç ekranına varır, hata yok."""
    s = Sayfa(b); ozet = []
    for ad, bas, err in MODLAR:
        s.js('__log.length = 0; __stalls.length = 0;'); s.js(bas)
        r = s.js(f'__ff(900, {err}, () => (G.state === "over" || G.state === "menu") && ekran === "sonuc")')
        s.foto('mod_' + ad)
        dogru(r['done'], f'{ad}: sonuç ekranına varmadı ({r["t"]:.0f} sn)')
        esit(s.js('__stalls'), [], ad + ' takılma')
        n = len(s.js('__log')); dogru(n > 0, ad + ': hiç tur oynanmadı')
        kaz = s.js('!!(D && D.kazandi)')
        if ad == 'kaybetme': esit(kaz, False, '%70 hatayla oynayan bot kazandı')
        ozet.append(f"{ad} {n} tur {'kazandı' if kaz else 'kaybetti'}")
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return '; '.join(ozet)

@test
def gorev(b):
    """Günün Görevi: açılışta düğme; aynı gün aynı cümleler; 5 cümle + 2 hatayı bul; bonus XP yalnız günün ilk tamamlanışında;
    görev serisi (dün + bugün); kariyer yıldızına / kilidine dokunmaz; yarım kayıt yazılmaz; sonuç ekranında panel ve ANA MENÜ."""
    s = Sayfa(b, init=[SAAT])
    dogru(s.js("!!document.getElementById('a-gorev')"), 'açılışta Günün Görevi düğmesi yok')
    a1 = s.js("JSON.stringify(gorevHazirla('2026-11-23','A1').liste)"); a2 = s.js("JSON.stringify(gorevHazirla('2026-11-23','A1').liste)")
    esit(a1, a2, 'aynı gün aynı görev'); dogru(a1 != s.js("JSON.stringify(gorevHazirla('2026-11-24','A1').liste)"), 'ertesi gün aynı görev')
    esit(len(json.loads(a1)), 5, 'görevde 5 cümle')
    for l in ('A1', 'B2', 'C2'): esit(len(json.loads(s.js(f"JSON.stringify(gorevHazirla('2026-11-23','{l}').liste)"))), 5, l + ' görevi')
    yildizOnce = s.js('JSON.stringify(kayit.yildiz)'); acikOnce = s.js('JSON.stringify(kayit.acik)')
    s.js('__log.length = 0; __stalls.length = 0;'); s.pg.tap('#a-gorev')
    esit(s.js('bolumModu()'), 'gunluk', 'mod')
    xp0 = s.js('kayit.xp')
    r = s.js('__ff(900, 0.03, () => G.state !== "playing" && ekran === "sonuc")'); s.foto('gorev_sonuc')
    dogru(r['done'], 'görev sonuç ekranına varmadı'); esit(s.js('__stalls'), [], 'takılma')
    tipler = [x['tip'] for x in s.js('__log')]; esit(tipler.count('kur'), 5, 'cümle sayısı'); esit(tipler.count('sav'), 2, 'hatayı bul sayısı')
    dogru(s.js('D.kazandi'), 'bot görevi kazanamadı')
    dogru(s.js("!!document.querySelector('.gorev-sonuc')"), 'sonuçta görev paneli yok')
    esit(s.js("document.getElementById('s-harita').textContent"), s.js("tt('ANA MENÜ')"), 'ana menü düğmesi')
    esit(s.js('kayit.gorev.seri'), 1, 'görev serisi'); esit(s.js('kayit.gorev.toplam'), 1, 'görev toplamı')
    xp1 = s.js('kayit.xp'); dogru(xp1 - xp0 >= 10 + 5, f'bonus XP yok ({xp1 - xp0})')
    esit(s.js('JSON.stringify(kayit.yildiz)'), yildizOnce, 'kariyer yıldızları değişti'); esit(s.js('JSON.stringify(kayit.acik)'), acikOnce, 'kilitler değişti')
    esit(s.js('yarimOku()'), None, 'görev yarım kaydı yazdı')
    # aynı gün ikinci kez: bonus yok, seri aynı
    s.pg.tap('#s-tekrar'); r = s.js('__ff(900, 0.03, () => G.state !== "playing" && ekran === "sonuc")'); dogru(r['done'], 'ikinci görev bitmedi')
    xp2 = s.js('kayit.xp'); esit(s.js('kayit.gorev.toplam'), 1, 'aynı gün iki kez sayıldı'); dogru(xp2 - xp1 < xp1 - xp0, 'ikinci kez de bonus verildi')
    # ertesi gün: seri 2; iki gün atlanırsa 1'e döner
    s.js('window.__ileri = 864e5'); s.pg.reload(); s.bekle(); s.pg.wait_for_timeout(200)
    dogru(s.js("document.querySelector('#a-gorev').classList.contains('hazir')"), 'ertesi gün görev yeniden hazır değil')
    s.pg.tap('#a-gorev'); s.js('__ff(900, 0.03, () => G.state !== "playing" && ekran === "sonuc")'); esit(s.js('kayit.gorev.seri'), 2, 'ertesi gün seri')
    s.js('window.__ileri = 4 * 864e5'); s.pg.reload(); s.bekle(); s.pg.wait_for_timeout(200)
    esit(s.js('gorevSeri()'), 0, 'kaçan günden sonra seri gösterimi')
    s.pg.tap('#a-gorev'); s.js('__ff(900, 0.03, () => G.state !== "playing" && ekran === "sonuc")'); esit(s.js('kayit.gorev.seri'), 1, 'seri yeniden başladı'); esit(s.js('kayit.gorev.enUzun'), 2, 'en uzun görev serisi')
    # duraklat → çık ana menüye
    s.pg.tap('#s-harita'); s.pg.wait_for_timeout(200); esit(s.js('ekran'), 'acilis', 'ANA MENÜ')
    s.pg.tap('#a-gorev'); s.js('__ff(6, 0, () => false)'); s.pg.tap('#pauseBtn'); s.pg.wait_for_timeout(200); s.pg.tap('#p-cik'); s.pg.wait_for_timeout(200)
    esit(s.js('ekran'), 'acilis', 'görevden çıkınca açılış')
    # bozuk görev kaydı onarılır
    s.js("kayit = kayitDuzelt(Object.assign({}, kayit, {gorev: {son: 'dün', seri: -3, gunler: {x: 1}}, rozet: {a: 'b', cumle1: 5}}), bosKayit()).k")
    esit(s.js('JSON.stringify([kayit.gorev.son, kayit.gorev.seri, kayit.gorev.gunler, kayit.rozet])'), json.dumps([None, 0, {}, {'cumle1': 5}], separators=(',', ':')), 'bozuk görev / rozet kaydı onarımı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f'aynı gün aynı görev; 5 cümle + 2 hatayı bul; bonus +{xp1 - xp0} XP bir kez; seri 1 → 2 → (kaçan gün) 1; kariyer kaydı aynı; onarım tamam'

@test
def rozet(b):
    """Rozetler: sayaçlar olaylarla artar, hak edilen rozet bir kez açılır ve sonuç ekranında kutlanır; rozet ekranı 3 boyutta taşmaz; eski oyuncuda sessizce açılır."""
    s = Sayfa(b)
    esit(s.js('rozetSay()'), 0, 'yeni oyuncuda rozet')
    s.js("dojoBaslat(rakipBul('A1-1'))")
    r = s.js('__ff(900, 0.0, () => G.state !== "playing" && ekran === "sonuc")'); dogru(r['done'], 'bölüm bitmedi')
    c = s.js('kayit.istat.cumle'); dogru(c >= 4, f'cümle sayacı {c}'); esit(s.js('kayit.istat.kusursuz'), s.js('D.istat.kusursuz'), 'kusursuz sayacı')
    esit(s.js('kayit.istat.hataBul || 0'), s.js('D.istat.savOk'), 'hata bulma sayacı')
    dogru(s.js('rozetAcikMi("cumle1")'), 'İlk Cümle rozeti açılmadı')
    dogru(s.js("!!document.querySelector('.rozet-yeni')"), 'sonuçta yeni rozet kutlaması yok'); s.foto('rozet_sonuc')
    n1 = s.js('rozetSay()')
    s.pg.tap('#s-tekrar'); s.js('__ff(900, 0.0, () => G.state !== "playing" && ekran === "sonuc")')
    dogru(not s.js("!!document.querySelector('.rozet-yeni')") or s.js('rozetSay()') > n1, 'aynı rozet ikinci kez kutlandı')
    for w, h in ((320, 568), (390, 844), (844, 390)):
        s.pg.set_viewport_size({'width': w, 'height': h}); s.js('acilisAc()'); s.pg.wait_for_timeout(150); s.pg.tap('#a-rozet'); s.pg.wait_for_timeout(250)
        esit(s.js('ekran'), 'rozetler', 'rozet ekranı')
        tas = s.js("[...document.querySelectorAll('.rz-kart')].filter(e => e.scrollWidth > e.clientWidth + 2).length"); esit(tas, 0, f'{w}x{h} taşan rozet kartı')
        esit(s.js("document.querySelectorAll('.rz-kart').length"), s.js('ROZETLER.length'), 'rozet sayısı')
        s.foto(f'rozetler_{w}x{h}')
        s.pg.tap('#r-geri'); s.pg.wait_for_timeout(150); esit(s.js('ekran'), 'acilis', 'rozet geri')
    # eski oyuncu: hak ettiği rozetler sessizce açılır
    s.js("kayit.rozet = {}; kayit.seri.enUzun = 8; kayit.xp = 1200; rozetKontrol()")
    dogru(s.js('rozetAcikMi("seri7") && rozetAcikMi("xp1000") && !rozetAcikMi("seri30")'), 'eski oyuncunun rozetleri')
    s.js("dilSec('en'); acilisAc(); rozetlerAc()"); s.pg.wait_for_timeout(150)
    tr = s.js("[...document.querySelectorAll('.rz-kart b, .rz-kart small')].map(e => e.textContent).filter(t => /[ğüşıöçİĞÜŞÖÇ]/.test(t))"); esit(tr, [], 'İngilizce rozet ekranında Türkçe yazı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f'{n1} rozet ilk bölümde açıldı; sayaçlar olaylarla birebir; 3 ekranda taşma yok; eski oyuncu; İngilizce'

@test
def uygulama(b):
    """Uygulama katmanı (Capacitor taklidi): yerel okuma eklentisi Konus'a bağlı, sıra / kesme / sus; titreşim olaylarla; geri tuşu; arka plana gidince duraklar; çentik payı."""
    TAKLIT = """window.__cagri = []; window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
      TextToSpeech: { speak: o => { __cagri.push(['speak', o.text, o.lang]); return new Promise(r => { window.__okuBitir = r; setTimeout(r, 300); }); }, stop: () => { __cagri.push(['stop']); return Promise.resolve(); } },
      Haptics: { impact: o => __cagri.push(['impact', o.style]), notification: o => __cagri.push(['notif', o.type]) },
      App: { addListener: (ad, f) => { (window.__dinle = window.__dinle || {})[ad] = f; }, minimizeApp: () => __cagri.push(['minimize']) },
      StatusBar: { hide: () => __cagri.push(['statusHide']) }, SplashScreen: { hide: () => __cagri.push(['splashHide']) },
      LocalNotifications: { getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async o => { __cagri.push(['schedule', o.notifications.length]); },
        checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }) },
      Preferences: (() => { const m = new Map(); return { keys: async () => ({ keys: [...m.keys()] }), get: async o => ({ value: m.has(o.key) ? m.get(o.key) : null }), set: async o => { m.set(o.key, o.value); }, remove: async o => { m.delete(o.key); } }; })() } };"""
    s = Sayfa(b, init=[TAKLIT])
    s.pg.wait_for_timeout(400)
    c = s.js('__cagri.map(x => x[0])'); dogru('statusHide' in c and 'splashHide' in c, f'durum çubuğu / açılış resmi: {c}')
    dogru(s.js('Konus.bilgi().yerli'), 'yerel okuma bağlanmadı')
    s.js('__cagri.length = 0'); s.js("Konus.tr('Merhaba', { zorla: true })"); s.pg.wait_for_timeout(50)
    esit(s.js('__cagri.filter(x => x[0] === "speak")'), [['speak', 'Merhaba', 'tr-TR']], 'Türkçe okuma')
    s.js("window.__b = 0; Konus.soyle('one', { zorla: true, bitti: () => __b++ }); Konus.soyle('two', { zorla: true, bitti: () => __b += 10 })"); s.pg.wait_for_timeout(600)
    esit(s.js('__b'), 11, 'kesilen ve biten okumanın bitti çağrısı'); 
    s.js("window.__b = 0; Konus.soyle('x', { zorla: true, bitti: () => __b++ }); Konus.sus()"); esit(s.js('__b'), 1, 'sus bitti çağırır')
    # titreşim
    s.js('__cagri.length = 0'); s.js("Olay.yay('hata', {}); Olay.yay('cumleTamam', { kusursuz: true })")
    esit(s.js('__cagri.filter(x => x[0] !== "speak" && x[0] !== "stop")'), [['notif', 'ERROR'], ['impact', 'MEDIUM']], 'titreşim')
    s.js("kayit.ayar.titresim = false; __cagri.length = 0; Olay.yay('hata', {})"); esit(s.js('__cagri.length'), 0, 'titreşim kapalı'); s.js('kayit.ayar.titresim = true')
    # geri tuşu: oyunda duraklatır, duraklatmada devam eder, menüde geri, açılışta arka plana
    s.js("dojoBaslat(rakipBul('A1-1'))"); s.js('__ff(3, 0, () => false)')
    s.js('__dinle.backButton()'); esit(s.js('G.state'), 'paused', 'geri tuşu oyunda duraklatmadı')
    s.js('__dinle.backButton()'); esit(s.js('G.state'), 'playing', 'geri tuşu duraklatmadan dönmedi')
    s.js('__dinle.appStateChange({ isActive: false })'); esit(s.js('G.state'), 'paused', 'arka plana gidince duraklamadı')
    s.js('acilisAc(); profilAc()'); s.js('__dinle.backButton()'); esit(s.js('ekran'), 'acilis', 'profilde geri')
    s.js('__cagri.length = 0; __dinle.backButton()'); esit(s.js('__cagri.map(x => x[0])'), ['minimize'], 'açılışta geri: arka plana')
    s.js('ayarAc(false, acilisAc)'); s.pg.wait_for_timeout(100)
    dogru(s.js("!!document.querySelector('[data-a=hatirlat]')"), 'uygulamada hatırlatma ayarı yok')
    s.js('__cagri.length = 0'); s.pg.tap('[data-a=hatirlat]'); s.pg.wait_for_timeout(200)
    dogru(s.js('kayit.ayar.hatirlat'), 'hatırlatma açılmadı'); dogru(any(x[0] == 'schedule' for x in s.js('__cagri')), 'hatırlatma planlanmadı')
    # çentik payı: HUD ve alt panel güvenli alanın içinde
    s.js("guvenliAlan = () => ({ t: 47, r: 0, b: 34, l: 0 }); layout()")
    dogru(s.js('L.skor.y >= 47 && L.hedefP.y >= 44 && L.in.y + L.in.h <= innerHeight - 34'), 'çentik payı bırakılmadı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'yerel okuma (sıra, kesme, sus), titreşim, geri tuşu, arka plan, hatırlatma, çentik payı tamam'

@test
def profil(b):
    """Profil, yarım bölüm kaydı, kapatıp açınca kaldığı yerden devam, ikinci profil, silme, eski kayıt aktarımı."""
    s = Sayfa(b, profil=False)
    s.pg.tap('#ilk-gec'); s.pg.wait_for_timeout(150)
    s.pg.tap('#p-ad'); s.pg.keyboard.type('Ayşe'); s.pg.tap('#p-olustur'); s.pg.wait_for_timeout(300)
    s.pg.tap('#a-kariyer'); s.pg.wait_for_timeout(300)
    s.pg.tap('.secim[data-l="A1"]'); s.pg.wait_for_timeout(400)
    s.pg.tap('#k-devam'); s.pg.wait_for_timeout(300)
    dogru(s.js("!!document.getElementById('ing-pen')"), 'yeni oyuncuya İngilizce göster / gizle sorulmadı')
    s.pg.tap('#ing-pen button[data-g="0"]'); s.pg.wait_for_timeout(300)
    s.pg.tap('#tSkip'); s.pg.wait_for_timeout(300)
    esit(s.js('G.state'), 'playing', 'bölüm başlamadı')
    s.js("__ff(400, 0.15, () => D && D.ti >= 4 && G.R && !G.R.bitti && !G.R.tahtaHazir)")
    y = s.js('yarimOku()'); dogru(y, 'yarım kayıt yazılmadı')
    once = {'turYazi': y['turYazi'], 'score': y['G']['score'], 'hata': y['G']['hata']}
    s.pg.tap('#pauseBtn'); s.pg.wait_for_timeout(200); s.pg.tap('#p-cik'); s.pg.wait_for_timeout(300)
    s.pg.reload(); s.bekle(); s.pg.wait_for_timeout(300)
    esit(s.js('ekran'), 'acilis', 'yeniden açılış')
    s.pg.tap('#a-prof'); s.pg.wait_for_timeout(300); s.pg.tap('#p-kaydet'); s.pg.wait_for_timeout(200)
    dogru(s.js("document.getElementById('not').textContent.length > 0"), 'OYUNU KAYDET bildirimi yok')
    s.pg.tap('#p-geri'); s.pg.wait_for_timeout(200); s.pg.tap('#a-kariyer'); s.pg.wait_for_timeout(300)
    s.pg.tap('#k-devam'); s.pg.wait_for_timeout(300)
    sonra = s.js("({turYazi: D && D.turYazi, score: G.score, hata: G.hata})")
    esit(sonra, once, 'kaldığı yerden devam')
    s.foto('profil_devam')
    r = s.js("__ff(900, 0.1, () => G.state === 'over' && ekran === 'sonuc')")
    dogru(r['done'], 'devam edilen bölüm bitmedi')
    dogru(not s.js('yarimOku()'), 'bölüm bitince yarım kayıt silinmedi')
    # ikinci profil
    s.pg.tap('#s-harita'); s.pg.wait_for_timeout(300); s.pg.tap('#k-geri'); s.pg.wait_for_timeout(200)
    s.pg.tap('#a-prof'); s.pg.wait_for_timeout(200); s.pg.tap('#p-yeni'); s.pg.wait_for_timeout(200)
    s.pg.tap('#p-ad'); s.pg.keyboard.type('ayşe'); s.pg.tap('#p-olustur'); s.pg.wait_for_timeout(200)
    esit(s.js('profiller.liste.length'), 1, 'aynı isimle ikinci profil açıldı')
    s.pg.fill('#p-ad', ''); s.pg.tap('#p-ad'); s.pg.keyboard.type('Ali'); s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(300)
    esit(s.js('aktifProfil().ad'), 'Ali', 'ikinci profil')
    esit(s.js('Object.keys(kayit.yildiz).length'), 0, 'yeni profil boş başlamadı')
    s.pg.tap('#a-prof'); s.pg.wait_for_timeout(300); s.pg.tap('.prof-liste .profil-btn'); s.pg.wait_for_timeout(300)
    esit(s.js('aktifProfil().ad'), 'Ayşe', 'profil değiştirme')
    dogru(s.js('Object.keys(kayit.yildiz).length') > 0, 'Ayşe yıldızları kayboldu')
    s.pg.tap('#a-prof'); s.pg.wait_for_timeout(200); s.pg.tap('.prof-liste .profil-btn'); s.pg.wait_for_timeout(200)
    s.pg.tap('#a-prof'); s.pg.wait_for_timeout(200); s.pg.tap('#p-sil'); s.pg.wait_for_timeout(100); s.pg.tap('#p-sil'); s.pg.wait_for_timeout(300)
    esit(s.js('profiller.liste.map(p => p.ad)'), ['Ayşe'], 'profil silme')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    # eski (profilsiz) kayıt ilk profile aktarılır
    s = Sayfa(b, profil=False, init=["if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.setItem('te_kayit_v1', JSON.stringify({tutGor:true, baslangic:'A2', yildiz:{'A1-1':3,'A1-2':2}, best: 7777, acik:{'A1-1':true,'A1-2':true,'A1-3':true}})); }"])
    esit(s.js('ekran'), 'profilYeni', 'eski kayıt varken karşılama gösterildi')   # önceki ilerlemesi olan oyuncu rehbere girmez
    s.pg.fill('#p-ad', 'Mert'); s.pg.tap('#p-olustur'); s.pg.wait_for_timeout(300)
    esit(s.js('kayit.best'), 7777, 'eski kayıt aktarımı')
    esit(s.hatalar(), [], 'JS hataları (eski kayıt)'); s.kapat()
    return f"devam: {once['turYazi']}, puan {once['score']}, hata göstergesi {once['hata']} aynen geri geldi"

@test
def yarim_kelime(b):
    """Kelime paketinde hata göstergesi doluyken çıkılır; yeniden açılınca aynı durumdan devam edilir."""
    s = Sayfa(b, pid='pc', ad='Can')
    s.js("paketBaslat(paketBul('K-A1-2'))")
    s.js("__ff(600, 0.25, () => { const y = D && D.kelime && D.kelime.i >= 4 && yarimOku(); return !!(y && y.G.hata >= 2); })")
    y = s.js('yarimOku()'); dogru(y, 'yarım kayıt yazılmadı')
    once = {'score': y['G']['score'], 'hata': y['G']['hata'], 'jokers': y['G']['jokers']}
    dogru(y['G']['hata'] >= 2, 'hata göstergesi dolmadan kaydedildi')
    s.pg.reload(); s.bekle()
    s.js('haritaAc()'); s.pg.wait_for_timeout(200); s.pg.tap('#k-devam'); s.js('__ff(1.6, 0)')
    esit(s.js("({score: G.score, hata: G.hata, jokers: G.jokers})"), once, 'kelime paketi devam (son tur başındaki kayıt)')
    r = s.js("__ff(900, 0.1, () => G.state === 'over' && ekran === 'sonuc')")
    dogru(r['done'], 'paket bitmedi'); dogru(not s.js('yarimOku()'), 'yarım kayıt silinmedi')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f"puan {once['score']}, hata göstergesi {once['hata']} geri geldi"

@test
def dokunma(b):
    """Güç ve sistem düğmeleri 3 ekran boyutunda ekranın içinde, her birinin ortasına dokununca kendisi basılıyor;
    tahta ekranın içinde ve düğmelerin altında kalmıyor; karo sürükleyince ve iki karoya dokununca hamle yapılıyor."""
    for vw, vh in [(360, 640), (390, 844), (844, 390)]:
        s = Sayfa(b, vw, vh)
        s.js("dojoBaslat(rakipBul('A1-1'))"); s.js('__ff(12, 0, () => G.R && G.R.tahtaHazir && !tahtaMesgul())')
        r = s.js("""(() => { const q = [...document.querySelectorAll('#pow button, #sys button')].filter(e => e.offsetParent);
          const ad = e => (e.className || '') + ':' + (e.dataset.k || e.id);
          const disari = [], ortulu = [];
          for (const e of q) { const b = e.getBoundingClientRect();
            if (b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) disari.push(ad(e));
            const h = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2); if (!h || !(h === e || e.contains(h))) ortulu.push(ad(e)); }
          const T = G.T, t = { l: T.x, t: T.y, r: T.x + T.cols * T.cw, b: T.y + T.rows * T.ch }, cak = [];
          for (const e of q) { const b = e.getBoundingClientRect(); if (b.left < t.r && b.right > t.l && b.top < t.b && b.bottom > t.t) cak.push(ad(e)); }
          return {n: q.length, disari, ortulu, cak, tahta: t.l >= 0 && t.t >= 0 && t.r <= innerWidth && t.b <= innerHeight}; })()""")
        s.foto(f'dokunma_{vw}x{vh}')
        dogru(r['n'] >= 6, f'{vw}x{vh} düğmeler görünmüyor ({r["n"]})')
        esit(r['disari'], [], f'{vw}x{vh} ekran dışında'); esit(r['ortulu'], [], f'{vw}x{vh} ortası başka düğmenin altında')
        esit((r['cak'], r['tahta']), ([], True), f'{vw}x{vh} tahta düğmelerin altında ya da ekran dışında')
        # sürükleme ve dokun-dokun: oyunun hamle işlevi bu iki hücreyle çağrılır
        s.js("window.__hamleler = []; (() => { const o = hamle; window.hamle = (a, b) => { __hamleler.push([a, b]); return o(a, b); }; })(); G.R.sure = 0")
        x1, y1 = s.js(f'{HUCRE}({{r: 0, c: 0}})'); x2, y2 = s.js(f'{HUCRE}({{r: 1, c: 2}})')
        s.pg.mouse.move(x1, y1); s.pg.mouse.down(); s.pg.mouse.move(x2, y2, steps=5); s.pg.mouse.up(); s.pg.wait_for_function('!tahtaMesgul()', timeout=4000)
        x3, y3 = s.js(f'{HUCRE}({{r: 2, c: 1}})'); x4, y4 = s.js(f'{HUCRE}({{r: 0, c: 3}})')
        s.pg.touchscreen.tap(x3, y3); s.pg.touchscreen.tap(x4, y4)
        esit(s.js('__hamleler.map(h => [h[0].r, h[0].c, h[1].r, h[1].c])'), [[0, 0, 1, 2], [2, 1, 0, 3]], f'{vw}x{vh} sürükleme / dokun-dokun')
        esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return '3 ekran boyutunda düğmeler ve tahta doğru; sürükleme ve dokun-dokun hamle yapıyor'

@test
def online(b):
    """Yerel test sunucusuyla iki telefon: oda kur, katıl, aynı cümleler, maç sonucu, yanlış kod."""
    br = subprocess.Popen([sys.executable, os.path.join(DIR, 'broker.py'), '18931', '18932'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        br.stdout.readline()
        S = json.dumps(['ws://127.0.0.1:18931/mqtt', 'ws://127.0.0.1:18932/mqtt'])
        A = Sayfa(b, pid='pa', ad='Ayşe', init=[f'window.TE_SUNUCULAR = {S};'])
        B = Sayfa(b, pid='pb', ad='Ali', init=[f'window.TE_SUNUCULAR = {S};'])
        A.pg.tap('#a-online'); A.pg.tap('#o-hiz'); A.pg.tap('#o-kur'); A.pg.wait_for_function("Ag.durum() === 'acik'", timeout=15000)
        kod = A.js('OD.kod')
        B.pg.tap('#a-online'); B.pg.tap('#o-hiz'); B.pg.fill('#o-kod', kod); B.pg.tap('#o-katil')
        B.pg.wait_for_function('!!OD.rakip', timeout=20000); A.pg.wait_for_function('!!OD.rakip', timeout=5000)
        esit(A.js('OD.rakip.ad'), 'Ali', 'ev sahibi rakibi'); esit(B.js('OD.rakip.ad'), 'Ayşe', 'misafir rakibi')
        for p, e in ((A, 0.05), (B, 0.3)): p.js(f"window.__bt = setInterval(() => __botStep({e}), 40); 0")
        for p in (A, B): p.js(DZ_SAYAC)
        A.pg.tap('#oda-basla')
        B.pg.wait_for_function("D && D.online && G.state === 'playing'", timeout=10000)
        esit(A.js('JSON.stringify(D.online.liste)'), B.js('JSON.stringify(D.online.liste)'), 'iki telefonda cümle listesi')
        A.pg.wait_for_function("ekran === 'onlineSonuc'", timeout=150000); B.pg.wait_for_function("ekran === 'onlineSonuc'", timeout=20000)
        ka, kb = A.js('D.online.karar'), B.js('D.online.karar')
        A.foto('online_A'); B.foto('online_B')
        dogru(ka and kb, 'sonuç yok')
        esit((A.js('__dzSay'), B.js('__dzSay')), (0, 0), 'online maçta İngilizce dizilişi kartı açıldı')
        B.pg.tap('#os-cik'); B.pg.wait_for_timeout(200); B.pg.fill('#o-kod', '0000'); B.pg.tap('#o-katil')
        B.pg.wait_for_function("ekran === 'online' && !!document.querySelector('.uyari')", timeout=30000)
        esit(A.hatalar(), [], 'JS hataları A'); esit(B.hatalar(), [], 'JS hataları B')
        # STRATEJİ: oda, aynı tahta, tur sonuçları karşıya gider, maç sonucu iki telefonda tutarlı
        A.js('kayit.strRehber = true; odadanCik(); onlineModAc("strateji")'); B.js('kayit.strRehber = true; odadanCik(); onlineModAc("strateji")'); A.pg.wait_for_timeout(300)
        A.pg.tap('#o-lvl button[data-l="B1"]'); A.pg.tap('#o-kur'); A.pg.wait_for_function("Ag.durum() === 'acik'", timeout=15000)
        kod2 = A.js('OD.kod'); B.pg.fill('#o-kod', kod2); B.pg.tap('#o-katil')
        B.pg.wait_for_function('!!OD.rakip && OD.mod === "strateji"', timeout=20000); A.pg.wait_for_function('!!OD.rakip', timeout=5000)
        A.pg.tap('#oda-basla'); B.pg.wait_for_function('!!STR', timeout=10000)
        esit(A.js('[STR.lvl, STR.tohum, JSON.stringify(STR.cum)]'), B.js('[STR.lvl, STR.tohum, JSON.stringify(STR.cum)]'), 'strateji maç bilgisi')
        for p in (A, B): p.pg.tap('#st-basla')
        esit(A.js('JSON.stringify(STR.R.T.h.map(k => k && k.txt + k.ci))'), B.js('JSON.stringify(STR.R.T.h.map(k => k && k.txt + k.ci))'), 'iki telefonda aynı tahta')
        for tur in range(3):
            A.js(STR_OYNA % 'true'); B.js(STR_OYNA % ('false' if tur == 1 else 'true'))
            for p in (A, B): p.pg.wait_for_function(f'STR.tur === {tur} && STR.rakipS[{tur}] && STR.ben[{tur}] && document.getElementById("st-panel").classList.contains("acik") && !!document.getElementById("st-devam")', timeout=20000)
            for p in (A, B): p.pg.tap('#st-devam')
        for p in (A, B): p.pg.wait_for_function("ekran === 'strSonuc'", timeout=10000)
        sa, sb = A.js('[STR.karar.k, STR.ben.map(x => x.puan), STR.rakipS.map(x => x.puan)]'), B.js('[STR.karar.k, STR.ben.map(x => x.puan), STR.rakipS.map(x => x.puan)]')
        A.foto('online_strateji_A')
        esit((sa[1], sa[2]), (sb[2], sb[1]), 'iki telefonda tur puanları: ' + json.dumps([A.js('STR.ben'), B.js('STR.ben')], ensure_ascii=False))
        esit({sa[0], sb[0]}, {'kazandin', 'kaybettin'}, 'strateji maç sonucu')
        # hazır emoji: A gönderir, B'de rakip balonu çıkar; susturunca gelmez; geçersiz emoji yok sayılır
        A.pg.wait_for_function("getComputedStyle(document.getElementById('emo-btn')).display !== 'none'", timeout=3000)   # sonuç ekranında emoji düğmesi
        A.js('EM.son = 0; emoGonder(3)'); B.pg.wait_for_function("!!document.querySelector('.emo-ucan.rakip')", timeout=8000)
        esit(B.js("document.querySelector('.emo-ucan.rakip b').textContent"), '🔥', 'gelen emoji')
        B.js('EM.sessiz = emoMac(); document.querySelectorAll(".emo-ucan").forEach(e => e.remove())'); A.js('EM.son = 0; emoGonder(1)'); B.pg.wait_for_timeout(1500)
        esit(B.js("document.querySelectorAll('.emo-ucan.rakip').length"), 0, 'susturulmuş emoji geldi')
        B.js('EM.sessiz = null; EM.alSon = 0; emoAl({ mac: emoMac(), e: 99 })'); esit(B.js("document.querySelectorAll('.emo-ucan.rakip').length"), 0, 'geçersiz emoji gösterildi')
        esit(A.hatalar(), [], 'JS hataları A (strateji)'); esit(B.hatalar(), [], 'JS hataları B (strateji)')
        # HIZLI EŞLEŞ: aynı mod ve seviyede bekleyen iki oyuncu eşleşir, maç kendiliğinden başlar
        for p in (A, B): p.js("strKapat(); odadanCik(); onlineModAc('hiz')"); p.pg.wait_for_timeout(200); p.pg.tap('#o-lvl button[data-l="A2"]'); p.pg.tap('#o-hizli')
        for p in (A, B): p.pg.wait_for_function("D && D.online && G.state === 'playing'", timeout=30000)
        esit(A.js('JSON.stringify(D.online.liste)'), B.js('JSON.stringify(D.online.liste)'), 'hızlı eşleşmede cümle listesi')
        esit(A.js('D.r.lvl'), 'A2', 'hızlı eşleşme seviyesi')
        dogru(B.js('OD.rakip.ad').startswith('Oyuncu #') and A.js('OD.rakip.ad').startswith('Oyuncu #'), 'hızlı eşleşmede gerçek isim göründü: ' + B.js('OD.rakip.ad'))
        esit(A.hatalar(), [], 'JS hataları A (eşleşme)'); esit(B.hatalar(), [], 'JS hataları B (eşleşme)')
        A.kapat(); B.kapat()
        return f'oda {kod}: A {ka}, B {kb}; yanlış kod uyarısı; strateji odası {kod2}: {sa[0]} / {sb[0]}, puanlar {sa[1]} – {sa[2]}; hızlı eşleşme A2 tamam'
    finally:
        br.kill()

# strateji turunu oyuncu gibi oynar: dogru ise doğru kelimeleri (değilse ilk kelime yerine tuzak / sıra hatası) seçip bombalar
STR_OYNA = """(dogru => { const R = STR.R, T = R.T;
  for (let n = 0; n < 3 && R.hamle > 0; n++) { const a = T.h.findIndex(x => x && x.k < 0 && !x.cel && x.ci === T.h.find(y => y && y.k === n).ci); if (a >= 0) strTasiOyuncu(a, T.h.findIndex(y => y && y.k === n)); }
  T.hedef.forEach((t, k) => strSec(T.h.findIndex(x => x && x.k === k), k));
  if (!dogru) { const z = T.h.find(x => x && x.cel); if (z) R.secim[z.of] = z; else { const t = R.secim[0]; R.secim[0] = R.secim[1]; R.secim[1] = t; } }
  strBomba(); })(%s)"""

@test
def strateji(b):
    """STRATEJİ kuralları ve bilgisayara karşı maç: kayma (sağa, satır sonunda alta, ilk boşluğa), tahta üretimi (aynı tohum aynı tahta,
    tuzak doğrusuyla aynı renk, başlangıçta hazır üçlü ve hedefin yanında kendi rengi yok), bomba (seçilenler + değen aynı renk, düşme, zincir),
    doğru / yanlış, tur ve maç kararı, bilgisayar rakip, sürükle-bırak ve dokun-dokun, kutudan geri alma, hamle sınırı, süre, çıkış, 3 ekran, İngilizce."""
    s = Sayfa(b); s.js('kayit.strRehber = true')   # alıştırma ayrı testte (strateji_rehber)
    # kayma kuralı: 2x3 tahta, son hücre boş
    k = s.js("""(() => { const K = t => ({ id: t, txt: t, ci: 0, k: -1 }); const T = { cols: 3, rows: 2, h: ['a','b','c','d','e',null].map(x => x && K(x)) };
      const y = () => T.h.map(x => x ? x.txt : '_').join('');
      const o = []; strTasi(T, 0, 2); o.push(y()); strTasi(T, 4, 0); o.push(y()); strTasi(T, 1, 5); o.push(y());
      const U = { cols: 3, rows: 2, h: ['a','b','c',null,'d','e'].map(x => x && K(x)) }; strTasi(U, 4, 1); o.push(U.h.map(x => x ? x.txt : '_').join(''));
      return o; })()""")
    esit(k, ['_bacde', 'dbac_e', 'edac_b', 'adbc_e'], 'kayma kuralı (sağa, satır sonunda alta, ilk boşluğa)')
    # tahta üretimi
    rap = s.js("""(() => { const o = { ayni: 0, kotu: 0, tuzakRenk: 0, tuzak: 0, bos: 0, n: 0, hedefTam: 0 };
      SEVIYELER.forEach(l => { const r = tohumluRastgele('t' + l); strCumleler(l, r).forEach((ref, i) => {
        const s = sAl(ref), T1 = strTahta(s, l, 'x' + i), T2 = strTahta(s, l, 'x' + i); o.n++;
        if (JSON.stringify(T1.h) === JSON.stringify(T2.h)) o.ayni++;
        o.kotu += strKotuHucreler(T1).length; o.bos += T1.h.filter(x => !x).length === STR_BOS ? 1 : 0;
        if (T1.hedef.every((t, k) => T1.h.filter(x => x && x.k === k).length === 1)) o.hedefTam++;
        T1.h.forEach(x => { if (x && x.cel) { o.tuzak++; if (x.ci === T1.h.find(y => y && y.k === x.of).ci) o.tuzakRenk++; } });
      }); }); return o; })()""")
    esit((rap['ayni'], rap['bos'], rap['hedefTam']), (rap['n'],) * 3, 'aynı tohum aynı tahta / boşluk / hedef karolar')
    dogru(rap['n'] == 18, f"6 seviyede 3'er cümle: {rap['n']}")
    esit(rap['tuzakRenk'], rap['tuzak'], 'tuzak doğrusuyla aynı renk'); dogru(rap['tuzak'] >= 18, 'tuzak az')
    dogru(rap['kotu'] <= 2, f"başlangıçta hazır üçlü / hedefin yanında kendi rengi: {rap['kotu']} hücre")
    # bomba: seçilen + değen aynı renk; düşme; zincir puanı
    bp = s.js("""(() => { const K = (t, ci, k) => ({ id: t, txt: t, ci, k: k == null ? -1 : k });
      const T = { cols: 3, rows: 3, hedef: ['A'], h: [K('x',1), K('y',2), K('z',3), K('p',0), K('q',1), K('r',2), K('A',0,0), K('B',0), K('C',3)] };
      const p = strPatlamaPlani(T, ['A']); return [p.adimlar[0].hucreler.sort(), p.adimlar[0].puan, strDogruMu(T, [T.h[6]]), strDogruMu(T, [T.h[7]])]; })()""")
    esit(bp, [[3, 6, 7], 30, True, False], 'bomba patlaması ve doğruluk')
    # bilgisayara karşı maç (ekrandan)
    s.js('acilisAc()'); s.pg.tap('#a-online'); s.pg.tap('#o-strateji'); s.pg.tap('#o-lvl button[data-l="A1"]'); s.pg.tap('#o-bot')
    dogru(s.js('!!STR && STR.rakip.bot'), 'bilgisayar maçı açılmadı'); s.foto('strateji_kural'); s.pg.tap('#st-basla')
    esit(s.js('STR.R.hamle'), s.js('STR.R.T.n + 6'), 'hamle hakkı')
    # sürükle: karoyu boş olmayan bir hücreye
    def merkez(i): return s.js(f"(() => {{ const b = strTahtaEl().getBoundingClientRect(), c = b.width / STR.R.T.cols; return [b.left + ({i} % STR.R.T.cols + .5) * c, b.top + (Math.floor({i} / STR.R.T.cols) + .5) * c]; }})()")
    a, bb = s.js('STR.R.T.h.findIndex(x => x && x.k < 0)'), s.js('STR.R.T.h.findIndex(x => x && x.k === 0)')
    ida = s.js(f'STR.R.T.h[{a}].id'); x0, y0 = merkez(a); x1, y1 = merkez(bb)
    s.pg.mouse.move(x0, y0); s.pg.mouse.down(); s.pg.mouse.move(x1, y1, steps=8); s.pg.mouse.up(); s.pg.wait_for_timeout(100)
    esit((s.js(f'STR.R.T.h[{bb}].id'), s.js('STR.R.hamle')), (ida, s.js('STR.R.T.n + 5')), 'sürükleyerek taşıma')
    # sürükle: karoyu kutuya (gölge), dokun-dokun seçim, kutudan geri al
    h0 = s.js('STR.R.T.h.findIndex(x => x && x.k === 0)'); x0, y0 = merkez(h0)
    kb = s.js("(() => { const b = document.querySelector('.st-kutu').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    s.pg.mouse.move(x0, y0); s.pg.mouse.down(); s.pg.mouse.move(kb[0], kb[1], steps=8); s.pg.mouse.up(); s.pg.wait_for_timeout(100)
    esit(s.js('STR.R.secim[0] && STR.R.secim[0].k'), 0, 'kutuya sürükleme'); esit(s.js('strHucreBul(STR.R.T, STR.R.secim[0].id)'), h0, 'karo tahtada kaldı (gölge)')
    esit(s.js('STR.R.hamle'), s.js('STR.R.T.n + 5'), 'seçim hamle harcadı')
    h1 = s.js('STR.R.T.h.findIndex(x => x && x.k === 1)'); x1, y1 = merkez(h1); s.pg.mouse.click(x1, y1); s.pg.tap('.st-kutu[data-i="1"]')
    esit(s.js('STR.R.secim[1] && STR.R.secim[1].k'), 1, 'dokun-dokun seçim')
    s.pg.tap('.st-kutu[data-i="1"]'); esit(s.js('STR.R.secim[1]'), None, 'kutudan geri alma')
    dogru(s.js('document.getElementById("st-bomba").disabled'), 'kutular dolmadan bomba açık')
    # hamle sınırı
    s.js('STR.R.hamle = 0'); esit(s.js('strTasiOyuncu(0, 1)'), False, 'hamle bitince taşıma'); s.js('STR.R.hamle = 3; strCiz()')
    for w, h in ((320, 568), (390, 844), (844, 390)):
        s.pg.set_viewport_size({'width': w, 'height': h}); s.pg.wait_for_timeout(250)
        tas = s.js("""(() => { const v = [innerWidth, innerHeight], o = [];
          document.querySelectorAll('#str .st-tahta, #str .st-kutu, #st-bomba, #st-x').forEach(e => { const b = e.getBoundingClientRect(); if (b.left < -1 || b.top < -1 || b.right > v[0] + 1 || b.bottom > v[1] + 1) o.push(e.className || e.id); });
          return o; })()""")
        esit(tas, [], f'{w}x{h} ekrandan taşan'); s.foto(f'strateji_{w}x{h}')
    s.pg.set_viewport_size({'width': 390, 'height': 844})
    # 3 tur: doğru, yanlış, doğru → bilgisayarın sonucu beklenir, karar verilir
    for tur, d in enumerate(('true', 'false', 'true')):
        s.js(f"STR.R.secim = STR.R.secim.map(() => null); {STR_OYNA % d}")
        s.js('clearTimeout(STR.botT); STR.botT = null'); s.pg.wait_for_timeout(200)
        s.js(f"(() => {{ const r = tohumluRastgele(STR.tohum + ':bot:' + STR.tur), x = strBotOyna(STR.R.T, STR.lvl, r); strRakipSonuc({{ tur: STR.tur, dogru: x.dogru, puan: x.puan }}); }})()")
        s.pg.wait_for_function('STR.ben[STR.tur] && STR.rakipS[STR.tur] && document.getElementById("st-panel").classList.contains("acik") && !!document.getElementById("st-devam")', timeout=15000)
        if tur == 1: esit(s.js('STR.ben[1].puan'), 0, 'yanlış cümle puanı'); s.foto('strateji_tur_yanlis')
        s.pg.tap('#st-devam')
    s.pg.wait_for_function("ekran === 'strSonuc'", timeout=5000); s.foto('strateji_sonuc')
    sk = s.js('strSkor()'); kr = s.js('STR.karar.k')
    bek = 'kazandin' if sk['b'] > sk['r'] or (sk['b'] == sk['r'] and sk['pb'] > sk['pr']) else 'kaybettin' if sk['b'] < sk['r'] or sk['pb'] < sk['pr'] else 'berabere'
    esit(kr, bek, 'maç kararı'); esit(s.js('kayit.istat.online || 0'), 0, 'bilgisayar maçı online istatistiğine yazıldı')
    s.pg.tap('#ss-tekrar'); dogru(s.js('!!STR && STR.tur === -1'), 'tekrar oyna'); s.pg.tap('#st-basla')
    s.pg.tap('#st-x'); s.pg.tap('#st-cik'); s.pg.wait_for_timeout(200)
    esit((s.js('STR'), s.js('ekran'), s.js("!!document.getElementById('str')")), (None, 'online', False), 'maçtan çıkış')
    # süre: kutular boşken süre biterse tur yanlış sayılır
    s.js("botMacBaslat('strateji', 'C2')"); s.pg.tap('#st-basla'); s.js('STR.R.t0 -= (STR_SURE + 1) * 1000; strSaat()')
    esit(s.js('[STR.ben[0].dogru, STR.ben[0].puan]'), [False, 0], 'süre doldu')
    # İngilizce arayüz
    s.js("strKapat(); dilSec('en'); botMacBaslat('strateji', 'B2')"); s.pg.wait_for_timeout(100)
    tr = s.js("[...document.querySelectorAll('#str .st-kart, #str .st-ust')].map(e => e.textContent).filter(t => /[ğüşıöçİĞÜŞÖÇ]/.test(t))"); esit(tr, [], 'İngilizce arayüzde Türkçe yazı')
    s.js("strKapat(); onlineSonMod = null; onlineAc()"); tr = s.js("document.getElementById('card').textContent"); dogru(not __import__('re').search('[ğüşıöçİĞÜŞÖÇ]', tr), 'İngilizce online ekranı: ' + tr[:80])
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f"kayma, {rap['n']} tahta (tuzak {rap['tuzak']}, kötü başlangıç {rap['kotu']}), bomba ve zincir; bilgisayara karşı 3 tur → {kr}; sürükle / dokun / geri al, hamle, süre, çıkış, 3 ekran, İngilizce"

@test
def strateji_rehber(b):
    """Rehberli ilk strateji maçı: ilk maçtan önce bir kez açılır; koç balonu ve el işareti; yalnız gösterilen hamle yapılabilir;
    kayma, tuzak uyarısı, kutular, bomba; bitince kurallar kartı ve maç; bir daha açılmaz (kalıcı); strateji ekranından yeniden açılır, Geç ile döner; İngilizce."""
    s = Sayfa(b)
    esit(s.js('kayit.strRehber'), False, 'yeni oyuncuda alıştırma görülmüş')
    s.pg.tap('#a-online'); s.pg.tap('#o-strateji'); s.pg.tap('#o-bot'); s.pg.wait_for_timeout(300)
    dogru(s.js('!!(STR && STR.R && STR.R.rehber)') and s.js("!!document.querySelector('.st-koc')"), 'ilk maçta alıştırma açılmadı'); s.foto('rehber_1')
    esit(s.js('strTasiOyuncu(23, 2)'), False, 'bilgi adımında taşıma yapıldı')
    s.pg.tap('#rh-ileri'); s.pg.wait_for_timeout(450)
    once = s.js('STR.R.T.h.map(x => x && x.txt).join()')
    esit(s.js('strTasiOyuncu(0, 1)'), False, 'gösterilmeyen hamle yapıldı'); esit(s.js('STR.R.T.h.map(x => x && x.txt).join()'), once, 'yanlış hamle tahtayı değiştirdi')
    dogru(s.js("document.querySelector('.st-k.rh-kaynak') && document.querySelector('#st-el').className === 'surukle'"), 'vurgu / el işareti yok')
    # sürükleyerek: mavi karoyu I'nın yanına
    def merkez(i): return s.js(f"(() => {{ const b = strTahtaEl().getBoundingClientRect(), c = b.width / STR.R.T.cols; return [b.left + ({i} % STR.R.T.cols + .5) * c, b.top + (Math.floor({i} / STR.R.T.cols) + .5) * c]; }})()")
    x0, y0 = merkez(23); x1, y1 = merkez(2)
    s.pg.mouse.move(x0, y0); s.pg.mouse.down(); s.pg.mouse.move(x1, y1, steps=8); s.pg.mouse.up(); s.pg.wait_for_timeout(450)
    esit(s.js('STR.R.T.h.slice(0, 6).map(x => x && x.txt)'), ['the', 'I', 'dog', 'cat', 'go', 'big'], 'kayma (sağa, boşluğa kadar)')
    esit(s.js('STR.R.rehber.adim'), 2, 'taşımadan sonra adım')
    s.pg.tap('#rh-ileri'); s.pg.wait_for_timeout(450); esit(s.js('strTasiOyuncu(18, 16)'), True, 'yeşil karo'); s.pg.wait_for_timeout(450)
    # kelimeler: tuzak 'are' seçilemez, sırayla I, am, happy
    hucre = lambda t: s.js(f'STR.R.T.h.findIndex(x => x && x.txt === "{t}")')
    s.js(f'strSec({hucre("am")})'); esit(s.js('STR.R.secim.filter(Boolean).length'), 0, 'sırası gelmeyen kelime seçildi')
    s.js(f'strSec({hucre("I")})'); s.pg.wait_for_timeout(450)
    s.js(f'strSec({hucre("are")})'); esit(s.js('STR.R.secim[1]'), None, 'tuzak seçildi'); dogru('are' in s.js("document.querySelector('.st-koc').textContent"), 'tuzak uyarısı yok')
    s.js(f'strSec({hucre("am")})'); s.pg.wait_for_timeout(450); s.js(f'strSec({hucre("happy")})'); s.pg.wait_for_timeout(450)
    dogru(s.js("document.getElementById('st-bomba').classList.contains('rh-kaynak')"), 'bomba vurgulanmadı'); s.foto('rehber_bomba')
    s.pg.tap('#st-bomba', force=True); s.pg.wait_for_function("!!document.getElementById('rh-bitti')", timeout=10000); s.foto('rehber_son')
    s.pg.tap('#rh-bitti'); s.pg.wait_for_timeout(200)
    dogru(s.js("!!document.getElementById('st-basla') && !document.querySelector('.st-koc') && STR.R === null"), 'alıştırmadan sonra kurallar kartı açılmadı')
    esit(s.js('kayit.strRehber'), True, 'alıştırma kaydedilmedi')
    s.pg.tap('#st-basla'); dogru(s.js('STR.tur === 0 && !STR.R.rehber'), 'maç başlamadı')
    s.js('strKapat()'); s.pg.reload(); s.bekle()
    esit(s.js('kayit.strRehber'), True, 'alıştırma kalıcı değil')
    s.js("botMacBaslat('strateji', 'A2')"); dogru(s.js("!!document.getElementById('st-basla') && !document.querySelector('.st-koc')"), 'alıştırma ikinci kez açıldı')
    # strateji ekranından yeniden; Geç ile geri
    s.js("strKapat(); onlineModAc('strateji')"); s.pg.tap('#o-rehber'); dogru(s.js("!!document.querySelector('.st-koc')"), 'Nasıl oynanır alıştırmayı açmadı')
    s.pg.tap('#rh-gec'); s.pg.wait_for_timeout(200); esit((s.js('STR'), s.js('ekran')), (None, 'online'), 'Geç ile strateji ekranına dönüş')
    # İngilizce: bütün koç yazılarının çevirisi var
    eksik = s.js("REHBER.filter(a => !(a.m in DIL_SOZLUK.en)).map(a => a.m)"); esit(eksik, [], 'çevirisi olmayan koç yazısı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'ilk maçta bir kez; yalnız gösterilen hamle; kayma, tuzak uyarısı, kutular, bomba; kurallar kartı ve maç; kalıcı; Nasıl oynanır ve Geç; İngilizce'

@test
def emoji(b):
    """Hazır emojiler: HIZ maçında yarış çubuğunun yanında düğme, çubuk 6 emoji + sustur; gönderilen emoji uçar; 1,5 sn sınırı;
    bilgisayar karşılık verir; strateji ekranında ve sonuçta düğme; menüde düğme yok; İngilizce."""
    s = Sayfa(b, init=['window.__emoBotOlasilik = 1;'])
    gorunur = "getComputedStyle(document.getElementById('emo-btn')).display !== 'none'"
    s.pg.wait_for_timeout(300); dogru(not s.js(gorunur), 'menüde emoji düğmesi göründü')
    s.js("botMacBaslat('hiz', 'A1')"); s.js('__ff(12, 0.02, () => false)'); s.pg.wait_for_timeout(400)
    dogru(s.js(gorunur), 'HIZ maçında emoji düğmesi yok')
    s.pg.tap('#emo-btn'); s.pg.wait_for_timeout(100)
    esit(s.js("[...document.querySelectorAll('#emo-bar.acik button')].map(b => b.textContent)"), ['👍', '😮', '😂', '🔥', '👏', '😅', '🔇'], 'emoji çubuğu')
    s.foto('emoji_cubuk'); s.pg.tap('#emo-bar [data-e="4"]'); s.pg.wait_for_timeout(100)
    dogru(s.js("document.querySelector('.emo-ucan.ben b').textContent === '👏'"), 'gönderilen emoji uçmadı')
    esit(s.js('emoGonder(0)'), False, '1,5 sn sınırı')
    s.pg.wait_for_function("!!document.querySelector('.emo-ucan.rakip')", timeout=6000)
    dogru(s.js("document.querySelector('.emo-ucan.rakip small').textContent") == s.js('OD.rakip.ad'), 'bilgisayarın emojisinde ad yok')
    # strateji
    s.js("kayit.strRehber = true; G.state = 'over'; botMacBaslat('strateji', 'A1')"); s.pg.wait_for_timeout(400)
    dogru(not s.js(gorunur), 'kurallar kartı açıkken emoji düğmesi göründü')
    s.pg.tap('#st-basla'); s.pg.wait_for_timeout(400); dogru(s.js(gorunur), 'strateji maçında emoji düğmesi yok'); s.foto('emoji_strateji')
    s.js('EM.son = 0'); dogru(s.js('emoGonder(2)'), 'stratejide emoji gönderilemedi')
    s.js('strKapat(); onlineSonMod = null; onlineAc()'); s.pg.wait_for_timeout(400); dogru(not s.js(gorunur), 'maçtan çıkınca emoji düğmesi kaldı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'HIZ ve stratejide düğme, 6 emoji + sustur, uçan balon, 1,5 sn sınırı, bilgisayarın karşılığı, menüde yok'

@test
def muzik(b):
    """Canlı müzik ve patlama sesleri: HIZ maçında 'hiz', stratejide 'strateji' çalar, menüde lo-fi'ye döner; gerilim yarışa / süreye göre;
    maç bitince susar; çevrimdışı kayıtta hata yok, ses kırpılmıyor (tepe < 1) ve duyulur (RMS); patlama efektleri tanımlı."""
    s = Sayfa(b); s.pg.mouse.click(5, 5); s.js('kayit.strRehber = true')
    s.js("botMacBaslat('hiz', 'A1')"); s.pg.wait_for_timeout(300); esit(s.js('Ses.parca()'), 'hiz', 'HIZ müziği')
    s.js("D.online.t0 = D.online.t0 || performance.now(); D.istat.cumle = 4; D.online.rakip.cumle = 3; onlineTik()"); esit(s.js('(() => { let g; const e = Ses.gerilim; Ses.gerilim = x => { g = x; e(x); }; onlineTik(); Ses.gerilim = e; return g; })()'), 2, 'son cümlede gerilim')
    s.js("G.state = 'over'; botMacBaslat('strateji', 'A1')"); s.pg.tap('#st-basla'); s.pg.wait_for_timeout(300); esit(s.js('Ses.parca()'), 'strateji', 'strateji müziği')
    s.js('STR.R.t0 -= (STR_SURE - 8) * 1000'); s.pg.wait_for_timeout(400)
    esit(s.js('(() => { let g; const e = Ses.gerilim; Ses.gerilim = x => { g = x; e(x); }; strSaat(); Ses.gerilim = e; return g; })()'), 2, 'son 10 saniyede gerilim')
    s.js('STR.R.t0 = Date.now()'); s.js(f"STR.R.secim = STR.R.secim.map(() => null); {STR_OYNA % 'true'}"); s.pg.wait_for_timeout(200)
    dogru(s.js("strTahtaEl().classList.contains('topla')"), 'bombadan önce içine çekilme yok')
    s.js('for (let i = 0; i < 3; i++) { STR.ben[i] = { dogru: true, puan: 100, secim: "x" }; STR.rakipS[i] = { dogru: true, puan: 50 }; } STR.tur = 2; strMacSonu()')
    s.pg.wait_for_timeout(1200); esit(s.js('Ses.parca()'), None, 'maç bitince canlı müzik susmadı')
    s.js('strKapat(); acilisAc()'); s.pg.wait_for_timeout(200); esit(s.js('Ses.parca()'), None, 'menüde canlı müzik çalıyor')
    for ad in ('emme', 'megaBomba', 'zincirBum'): dogru(s.js(f"typeof Ses.onizle === 'function'"), 'önizleme yok')
    olc = s.js("""(async () => { const o = {}; for (const [ad, p, sn, ef] of [['hiz', 'hiz', 12, []], ['strateji', 'strateji', 12, []], ['bomba', null, 3, [[0.1, 'emme', 0.9], [0.7, 'megaBomba', 1.4], [1.8, 'zincirBum', 0.9]]]]) {
        const d = await Ses.onizle(p, sn, [[0, 0], [6, 2]], ef); let t = 0, q = 0; for (const x of d) { const a = Math.abs(x); if (a > t) t = a; q += x * x; } o[ad] = [t, Math.sqrt(q / d.length)]; } return o; })()""")
    for ad, (tepe, rms) in olc.items(): dogru(tepe < 1 and rms > 0.02, f'{ad}: tepe {tepe:.2f}, rms {rms:.3f}')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'HIZ / strateji müziği, gerilim, içine çekme, maç sonunda ve menüde susar; ' + ', '.join(f"{k} tepe {v[0]:.2f} rms {v[1]:.3f}" for k, v in olc.items())

@test
def anlik(b):
    """HAMLE ANINDA ÖDÜL: grubu büyüten taşıma "+puan" uçurur, grup parlar (3+ aynı renk, gökkuşağı hariç); büyütmeyen taşıma ödül vermez;
    değer doğru kelimeden bağımsız (tuzak kelimenin grubu da aynı ödülü alır); İngilizce yazı."""
    s = Sayfa(b); s.js('kayit.strRehber = true'); s.js('yolOyna(12)'); s.pg.wait_for_timeout(300)
    esit(s.js("document.querySelectorAll('#str .st-k.grup').length"), s.js('strGruplar(STR.R.T).size'), 'başlangıçta parlayan karo sayısı')
    bul = """(iyi) => { const T = STR.R.T; for (let a = 0; a < T.h.length; a++) for (let b = 0; b < T.h.length; b++) { if (a === b || !T.h[a] || strDonuk(T.h[a]) || strDonuk(T.h[b])) continue;
      const K = { cols: T.cols, rows: T.rows, h: T.h.slice() }; strTasi(K, a, b); const f = strGrupDeger(strGruplar(K)) - strGrupDeger(strGruplar(T)); if (iyi ? f > 0 : f === 0) return [a, b, f]; } return null; }"""
    h = s.js(f'({bul})(true)'); dogru(h, 'grubu büyüten hamle bulunamadı')
    s.js(f'strTasiOyuncu({h[0]}, {h[1]})')
    esit(s.js('__anlik.fark'), h[2], 'anlık ödül değeri')
    dogru(s.js("!!document.querySelector('#str .st-anlik')"), '+puan uçmadı'); s.foto('anlik_odul')
    dogru(s.js("document.querySelectorAll('#str .st-k.grup').length") >= 3, 'grup parlamıyor')
    esit(s.js("document.querySelectorAll('#str .st-k.grup').length"), s.js('strGruplar(STR.R.T).size'), 'parlayan karo sayısı')
    s.pg.wait_for_timeout(1200); dogru(not s.js("!!document.querySelector('#str .st-anlik')"), '+puan ekrandan kalkmadı')
    h2 = s.js(f'({bul})(false)')
    if h2: s.js(f'strTasiOyuncu({h2[0]}, {h2[1]})'); esit(s.js('__anlik.fark'), 0, 'boş hamleye ödül'); dogru(not s.js("!!document.querySelector('#str .st-anlik')"), 'boş hamlede +puan')
    # gökkuşağı (renksiz) karolar grup sayılmaz; değer kelimeden bağımsız
    esit(s.js("strGruplar({ cols: 3, rows: 1, h: [{ id: 1, ci: -1 }, { id: 2, ci: -1 }, { id: 3, ci: -1 }] }).size"), 0, 'gökkuşağı grubu')
    esit(s.js("strGrupDeger(strGruplar({ cols: 3, rows: 1, h: [{ id: 1, ci: 2, k: 0 }, { id: 2, ci: 2, k: -1 }, { id: 3, ci: 2, k: -1 }] }))"),
         s.js("strGrupDeger(strGruplar({ cols: 3, rows: 1, h: [{ id: 1, ci: 2, k: -1 }, { id: 2, ci: 2, k: -1 }, { id: 3, ci: 2, k: -1 }] }))"), 'değer kelimeye bağlı')
    esit(s.js("dilSec('en'); tt('Harika!') + tt('Muhteşem!')"), 'Great!Amazing!', 'İngilizce')
    esit(s.hatalar(), [], 'JS hatası'); s.kapat()
    return f'grubu büyüten hamle +{h[2]}, parlayan gruplar, boş hamleye ödül yok, gökkuşağı hariç, kelimeden bağımsız, İngilizce'

@test
def yol(b):
    """BÖLÜM YOLU: 120 bölüm üretilir, aynı no aynı bölüm, hepsi uzman çözümüyle çözülebilir, engeller hedef kelimede yok; donuk karo taşınmaz ve
    kayan sıra onu atlar; haritadan oynanır; uzman hamleleriyle kazanılır (yıldız, sonraki bölüm açılır, kalıcı, XP); NEREDEYSE +3 hamle bir kez;
    yanlış cümle ve hedefe yetmeyen bomba kaybettirir, TEKRAR DENE aynı tahta; bozuk kayıt onarılır; tek kişilik bölümde emoji yok; İngilizce."""
    s = Sayfa(b); s.js('kayit.strRehber = true')
    r = s.js("""(() => { const o = { n: 0, cozulur: 0, ayni: 0, hedefteEngel: 0, tur: {} };
      for (let n = 1; n <= YOL_TOPLAM; n++) { const B = yolBolum(n); o.n++; o.tur[B.hedef.tur] = (o.tur[B.hedef.tur] || 0) + 1;
        if (yolHedefSayi(B.hedef, B.uzman) >= B.hedef.sayi) o.cozulur++;
        if (B.T.h.some(k => k && k.k >= 0 && (k.buz || k.kilit))) o.hedefteEngel++; }
      yolOnbellek.clear(); const a = JSON.stringify(yolBolum(37).T.h); yolOnbellek.clear(); o.ayni = a === JSON.stringify(yolBolum(37).T.h) ? 1 : 0; return o; })()""")
    esit((r['n'], r['cozulur'], r['ayni'], r['hedefteEngel']), (120, 120, 1, 0), 'bölüm üretimi')
    dogru(all(r['tur'].get(k, 0) >= 10 for k in ('puan', 'buz', 'renk', 'kilit')), f"hedef türleri: {r['tur']}")
    # donuk karo
    k = s.js("""(() => { const K = (t, o) => Object.assign({ id: t, txt: t, ci: 0, k: -1 }, o || {}); const T = { cols: 3, rows: 2, h: [K('a'), K('b', { buz: true }), K('c'), K('d'), K('e'), null] };
      const y = () => T.h.map(x => x ? x.txt : '_').join(''); return [strTasi(T, 1, 0), strTasi(T, 4, 1), strTasi(T, 4, 0), y()]; })()""")
    esit(k[:3], [False, False, True], 'donuk karo taşınmaz / üstüne bırakılmaz')
    esit(s.js("""(() => { const K = (t, o) => Object.assign({ id: t, txt: t, ci: 0, k: -1 }, o || {}); const T = { cols: 3, rows: 2, h: [K('a'), K('b', { buz: true }), K('c'), K('d'), K('e'), null] };
      strTasi(T, 4, 0); return T.h.map(x => x ? x.txt : '_').join(''); })()"""), 'ebacd_', 'kayan sıra buzu atlar')
    # özel karolar: etkiler, SÜPER KOMBO, zincir, gökkuşağı; 11. bölümden önce yok
    oz = s.js("""(() => { const K = (id, ci, o) => Object.assign({ id, txt: 'w' + id, ci, k: -1 }, o || {});
      // 4x3 tahta: 0 kırmızı (hedef) satır başında; 1 yatay kırmızı; 2. satırda dikey mavi, 3. satırda paket
      const T = { cols: 4, rows: 3, hedef: ['w0'], h: [K(0, 0, { k: 0 }), K(1, 0, { ozel: 'yatay' }), K(2, 2), K(3, 3), K(4, 1), K(5, 2), K(6, 3, { ozel: 'dikey' }), K(7, 1), K(8, 2), K(9, 1), K(10, 3), K(11, 2)] };
      const p = strPatlamaPlani(T, [0]), a = p.adimlar[0];
      const U = { cols: 4, rows: 3, h: [K(0, 0), K(1, 1, { ozel: 'gokkusagi', ci: -1 }), K(2, 2), K(3, 2), K(4, 2), K(5, 1), K(6, 2), K(7, 1), K(8, 1), K(9, 3), K(10, 1), K(11, 0)] };
      const g = strOzelGenislet(U, [0]);
      const V = { cols: 4, rows: 3, h: [K(0, 0, { ozel: 'yatay' }), K(1, 0, { ozel: 'dikey' }), K(2, 2), K(3, 3), K(4, 1), K(5, 2), K(6, 3), K(7, 1), K(8, 2), K(9, 1), K(10, 3), K(11, 2)] };
      const k = strOzelGenislet(V, [0, 1]);
      return { satir: a.hucreler.slice().sort((x, y) => x - y), tetik: a.ozel.map(o => o.tur).sort(), gok: g.hs.slice().sort((x, y) => x - y), kombo: [k.kombo, k.hs.length],
        once: [1, 2, 6, 7, 8, 9, 10].filter(n => yolBolum(n).T.h.some(x => x && x.ozel)).length, ilk: [3, 4, 5].every(n => yolBolum(n).T.h.filter(x => x && x.ozel).length === 1), sonra: yolBolum(15).T.h.some(x => x && x.ozel) }; })()""")
    esit(oz['satir'], [0, 1, 2, 3], 'yatay çizgili satırı patlatır'); esit(oz['tetik'], ['yatay'], 'tetiklenen özel karo')
    esit(oz['gok'], [0, 1, 11], 'gökkuşağı: yanındaki patlayan karonun rengindeki (kırmızı) bütün karolar')
    esit(oz['kombo'][0], True, 'iki özel karo SÜPER KOMBO'); dogru(oz['kombo'][1] >= 6, 'SÜPER KOMBO artı şekli')
    esit((oz['once'], oz['ilk'], oz['sonra']), (0, True, True), 'özel karo: 3–5. bölümde birer, 6–10 ve 1–2 yok, 11+ var')
    # ilk 5 bölüm yeni oyuncu için: hiç taşımayan çoğunu, az düşünen hepsini geçer
    kolay = s.js("""(() => { let hamlesiz = 0, az = 0; for (let n = 1; n <= 5; n++) { const B = yolBolum(n), T = yolKopya(B.T);
        if (yolHedefSayi(B.hedef, yolIstat(strPatlamaPlani(T, T.hedef.map((t, k) => T.h.find(x => x && x.k === k).id)))) >= B.hedef.sayi) hamlesiz++;
        if (yolHedefSayi(B.hedef, yolUzman(B.T, Math.round(B.hamle / 3), B.hedef.tur, -1)) >= B.hedef.sayi) az++; } return [hamlesiz, az]; })()""")
    dogru(kolay[0] >= 3 and kolay[1] == 5, f'ilk 5 bölüm kolay değil (hamlesiz {kolay[0]}/5, az düşünen {kolay[1]}/5)')
    # haritadan oyna, uzman hamleleriyle kazan
    s.js('acilisAc()'); s.pg.tap('#a-yol', force=True); esit(s.js('ekran'), 'yol', 'harita'); esit(s.js("document.querySelector('.y-durak.simdi').dataset.n"), '1', 'sıradaki bölüm')
    s.js("document.querySelector('.y-durak[data-n=\"5\"]').click()"); dogru('1' in s.js("document.getElementById('not').textContent"), 'kilitli bölüm uyarısı yok')
    s.pg.tap('.y-durak[data-n="1"]', force=True); esit(s.js('ekran'), 'yolBas', 'başlangıç kartı'); s.pg.tap('#y-oyna', force=True)
    dogru(s.js('!!(STR && STR.yol && STR.yol.no === 1)'), 'bölüm açılmadı'); s.pg.wait_for_timeout(300)
    dogru(s.js("getComputedStyle(document.getElementById('emo-btn')).display === 'none'"), 'tek kişilik bölümde emoji düğmesi var')
    xp0 = s.js('kayit.xp')
    s.js("""(() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, B.hedef.renk == null ? -1 : B.hedef.renk, h);
      h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); })()""")
    dogru(s.js("document.getElementById('st-rakip').textContent.indexOf('✓') >= 0"), 'önizleme hedefin tamam olduğunu göstermiyor')
    s.js('strBomba()'); s.pg.wait_for_function("!!document.getElementById('y-sonraki')", timeout=20000); s.foto('yol_kazandi')
    dogru(s.js('kayit.yol.yildiz[1]') >= 2, f"uzman çözümüyle yıldız: {s.js('kayit.yol.yildiz[1]')}"); esit(s.js('kayit.yol.acik'), 2, 'sonraki bölüm açılmadı'); dogru(s.js('kayit.xp') > xp0, 'XP yok')
    s.pg.tap('#y-sonraki', force=True); esit(s.js('ekran'), 'yolBas', 'sonraki bölüm kartı')
    # NEREDEYSE: hedef ulaşılmazken hamle biter → +3 hamle bir kez
    s.js("yolOyna(2); STR.yol.b = Object.assign({}, STR.yol.b, { hedef: { tur: 'puan', sayi: 99999 } }); STR.R.hamle = 1")
    s.js("(() => { const R = STR.R, a = R.T.h.findIndex(x => x && x.k < 0 && !strDonuk(x)), b = R.T.h.findIndex((x, i) => i !== a && x && !strDonuk(x)); strTasiOyuncu(a, b); })()")
    dogru(s.js("!!document.getElementById('y-ek')"), 'NEREDEYSE çıkmadı'); s.foto('yol_neredeyse'); s.pg.tap('#y-ek', force=True); esit(s.js('STR.R.hamle'), 3, '+3 hamle')
    # bedava hak bitti: çantada +3 hamle varsa onu kullanmayı önerir; yoksa bir daha sormaz
    s.js('kayit.envanter.hamle3 = 1; STR.R.hamle = 1'); s.js("(() => { const R = STR.R, a = R.T.h.findIndex(x => x && x.k < 0 && !strDonuk(x)), b = R.T.h.findIndex((x, i) => i !== a && x && !strDonuk(x)); strTasiOyuncu(a, b); })()")
    dogru(s.js("document.getElementById('st-panel').classList.contains('acik') && /1/.test(document.querySelector('.y-bedava').textContent)"), 'çantadaki +3 hamle önerilmedi')
    s.pg.tap('#y-ek', force=True); esit((s.js('STR.R.hamle'), s.js('kayit.envanter.hamle3')), (3, 0), 'çantadan +3 hamle')
    s.js('STR.R.hamle = 1'); s.js("(() => { const R = STR.R, a = R.T.h.findIndex(x => x && x.k < 0 && !strDonuk(x)), b = R.T.h.findIndex((x, i) => i !== a && x && !strDonuk(x)); strTasiOyuncu(a, b); })()")
    dogru(not s.js("document.getElementById('st-panel').classList.contains('acik')"), 'güç yokken NEREDEYSE yeniden çıktı')
    # hedefe yetmeyen bomba: kaybeder, TEKRAR DENE aynı tahta
    s.js("(() => { const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()")
    s.pg.wait_for_function("!!document.getElementById('y-tekrar') && !document.getElementById('y-sonraki')", timeout=20000); esit(s.js('kayit.yol.acik'), 2, 'kaybedince bölüm açıldı')
    ilk = s.js('JSON.stringify(yolBolum(2).T.h.map(k => k && k.txt))'); s.pg.tap('#y-tekrar', force=True); esit(s.js('JSON.stringify(STR.R.T.h.map(k => k && k.txt))'), ilk, 'TEKRAR DENE aynı tahta')
    # yanlış cümle
    s.js("(() => { const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); const z = R.secim[0]; R.secim[0] = R.secim[1]; R.secim[1] = z; strBomba(); })()")
    s.pg.wait_for_function("!!document.querySelector('.y-sonuc .st-dogru')", timeout=10000)
    # kalıcılık ve onarım
    s.js('strKapat()'); s.pg.reload(); s.bekle(); esit((s.js('kayit.yol.acik'), s.js('kayit.yol.yildiz[1]') >= 2), (2, True), 'kalıcı değil')
    s.js("kayit = kayitDuzelt(Object.assign({}, kayit, { yol: { acik: 'x', yildiz: { 3: 9, a: 1, 2: 2 }, enIyi: [] } }), bosKayit()).k")
    esit(s.js('JSON.stringify(kayit.yol)'), json.dumps({'acik': 1, 'yildiz': {'2': 2}, 'enIyi': {}}, separators=(',', ':')), 'bozuk yol kaydı onarımı')
    # İngilizce
    s.js("dilSec('en'); yolHaritaAc()"); tr = s.js("[...document.querySelectorAll('.y-bolge b, .y-bolge small, .ana-baslik')].map(e => e.textContent).filter(t => /[ğüşıöçİĞÜŞÖÇ]/.test(t))"); esit(tr, [], 'İngilizce haritada Türkçe')
    s.js('yolBaslangic(21)'); tr = s.js("[...document.querySelectorAll('.y-bas, .y-hedef, .y-yeni, .y-bilgi')].map(e => e.textContent).filter(t => /[ğüşıöçİĞÜŞÖÇ]/.test(t))"); esit(tr, [], 'İngilizce başlangıç kartında Türkçe')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f"120 bölüm çözülebilir ({r['tur']}); donuk karo; haritadan oyna, uzmanla kazan; NEREDEYSE bir kez; kaybet / tekrar aynı tahta; yanlış cümle; kalıcı; onarım; İngilizce"

@test
def odul(b):
    """Güçler, sandıklar, günlük çark: başlangıç hediyesi; çark günde bir (ertesi gün yeniden), ağırlıklar; bölüm kazanınca sandık, 4 yuva,
    aynı anda tek sandık açılır, süre dolunca açılır ve ödül verir; +3 hamle, çekiç (kelimeye vurulmaz, buzu kırar ve hedefe sayılır,
    karoyu yok eder), mıknatıs (hamle harcamadan değiştirir); güç yoksa uyarı; bozuk kayıt onarılır; İngilizce."""
    s = Sayfa(b, init=[SAAT]); s.js('kayit.strRehber = true')
    esit(s.js('JSON.stringify(kayit.envanter)'), '{"hamle3":1,"cekic":1,"miknatis":1}', 'başlangıç güçleri')
    # çark
    dogru(s.js("document.getElementById('a-cark').classList.contains('hazir')"), 'çark hazır görünmüyor')
    s.pg.tap('#a-cark', force=True); esit(s.js('ekran'), 'cark', 'çark ekranı'); once = s.js('JSON.stringify([kayit.envanter, kayit.xp, kayit.sandik.slot.length, kayit.seri.dondurma])')
    s.pg.tap('#c-cevir'); s.pg.wait_for_selector('.odul-pen', timeout=8000); s.foto('cark_odul')
    dogru(s.js('JSON.stringify([kayit.envanter, kayit.xp, kayit.sandik.slot.length, kayit.seri.dondurma])') != once, 'çark ödül vermedi')
    esit(s.js('kayit.cark.son'), s.js('bugunAnahtar()'), 'çark günü'); s.pg.tap('#odul-tamam'); dogru(s.js("document.getElementById('c-cevir').disabled"), 'aynı gün ikinci çevirme')
    s.js('window.__ileri = 864e5'); s.pg.reload(); s.bekle(); dogru(s.js('carkHazir()'), 'ertesi gün çark hazır değil')
    f = s.js("(() => { const n = Array(CARK.length).fill(0); for (let i = 0; i < 20000; i++) n[carkSec(Math.random())]++; return n.map(x => x / 200); })()")
    top = s.js('CARK.reduce((a, c) => a + c.a, 0)'); bek = s.js('CARK.map(c => c.a)')
    dogru(all(abs(f[i] - bek[i] * 100 / top) < 2 for i in range(len(f))), f'çark ağırlıkları: {f}')
    # sandık: bölüm kazan → yuva; 4 dolunca yer yok
    s.js("kayit.sandik.slot = []; kayit.yol.acik = 2; sandikKazan('altin')"); esit(s.js('sandikSuresi(kayit.sandik.slot[0])'), 30000, 'ilk bölümlerin sandığı 30 sn')
    s.js("kayit.sandik.slot = []; kayit.yol.acik = 9; sandikKazan('altin')"); esit(s.js('sandikSuresi(kayit.sandik.slot[0])'), 3 * 3600e3, 'sonraki altın sandık 3 sa')
    s.js("kayit.sandik.slot = []; for (let i = 0; i < 3; i++) sandikKazan('tahta')"); esit(s.js("!!sandikKazan('altin')"), True, '4. sandık'); esit(s.js("sandikKazan('tahta')"), None, 'yer yokken sandık')
    s.js('yolHaritaAc()'); esit(s.js("document.querySelectorAll('#sandiklar .sandik[data-i]').length"), 4, 'haritada sandıklar')
    s.pg.tap('#sandiklar .sandik[data-i="0"]'); dogru(s.js('kayit.sandik.slot[0].acilis > 0'), 'açılma başlamadı')
    s.pg.tap('#sandiklar .sandik[data-i="1"]'); esit(s.js('kayit.sandik.slot[1].acilis'), None, 'aynı anda iki sandık açıldı')
    xp0 = s.js('kayit.xp'); s.js('window.__ileri = window.__ileri + 16 * 60e3; sandikYenile()')
    esit(s.js("sandikDurum(kayit.sandik.slot[0])"), 'hazir', 'süre dolunca hazır'); s.pg.tap('#sandiklar .sandik.hazir', force=True)
    s.pg.wait_for_selector('.odul-pen'); dogru(s.js('kayit.xp') > xp0 and s.js('kayit.sandik.slot.length') == 3, 'sandık ödülü / yuva'); s.pg.tap('#odul-tamam')
    # bölüm kazanınca sandık (yol uzman çözümü)
    s.js("kayit.sandik.slot = []; yolOyna(1)")
    s.js("""(() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, B.hedef.renk == null ? -1 : B.hedef.renk, h);
      h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()""")
    s.pg.wait_for_function("!!document.querySelector('.sandik-kazan')", timeout=20000); esit(s.js('kayit.sandik.slot.length'), 1, 'bölüm kazanınca sandık')
    # güçler
    s.js("kayit.envanter = { hamle3: 1, cekic: 3, miknatis: 1 }; yolOyna(21)")
    h0 = s.js('STR.R.hamle'); s.pg.tap('.arac[data-t="hamle3"]'); esit((s.js('STR.R.hamle'), s.js('kayit.envanter.hamle3')), (h0 + 3, 0), '+3 hamle')
    s.pg.tap('.arac[data-t="hamle3"]'); dogru('yok' in s.js("document.getElementById('not').textContent") or 'have' in s.js("document.getElementById('not').textContent"), 'güç yokken uyarı')
    s.js("aracSec('cekic')"); hedefK = s.js('STR.R.T.h.findIndex(x => x && x.k === 0)'); s.js(f'aracDokun({hedefK})'); esit(s.js('kayit.envanter.cekic'), 3, 'kelimeye çekiç vuruldu')
    buz = s.js('STR.R.T.h.findIndex(x => x && x.buz)'); s.js(f'aracDokun({buz})'); esit((s.js(f'STR.R.T.h[{buz}].buz'), s.js('STR.R.ekstra.buz'), s.js('kayit.envanter.cekic')), (False, 1, 2), 'çekiç buzu kırdı')
    s.js("aracSec('cekic')"); nor = s.js('STR.R.T.h.findIndex(x => x && x.k < 0 && !x.buz && !x.kilit)'); s.js(f'aracDokun({nor})'); esit(s.js(f'STR.R.T.h[{nor}]'), None, 'çekiç karoyu yok etti')
    s.js("aracSec('miknatis')"); h1 = s.js('STR.R.hamle'); a, c = s.js("(() => { const R = STR.R, l = R.T.h.map((x, i) => x && !strDonuk(x) ? i : -1).filter(i => i >= 0); return [l[0], l[5]]; })()")
    ta, tc = s.js(f'STR.R.T.h[{a}].id'), s.js(f'STR.R.T.h[{c}].id'); s.js(f'aracDokun({a}); aracDokun({c})')
    esit((s.js(f'STR.R.T.h[{a}].id'), s.js(f'STR.R.T.h[{c}].id'), s.js('STR.R.hamle'), s.js('kayit.envanter.miknatis')), (tc, ta, h1, 0), 'mıknatıs')
    s.foto('odul_guc')
    # onarım
    s.js("kayit = kayitDuzelt(Object.assign({}, kayit, { envanter: { hamle3: -2, cekic: 'x' }, sandik: { slot: [{ tur: 'elmas', t: 1 }, { tur: 'tahta', t: 5, acilis: null }] }, cark: { son: 'dün' } }), bosKayit()).k")
    esit(s.js('JSON.stringify([kayit.envanter, kayit.sandik, kayit.cark])'), json.dumps([{'hamle3': 0, 'cekic': 0, 'miknatis': 1}, {'slot': [{'tur': 'tahta', 't': 5, 'acilis': None}]}, {'son': None}], separators=(',', ':')), 'bozuk ödül kaydı onarımı')
    s.js("strKapat(); dilSec('en'); carkAc()"); tr = s.js("document.getElementById('card').textContent"); dogru(not __import__('re').search('[ğüşıöçİĞÜŞÖÇ]', tr), 'İngilizce çark: ' + ' '.join(__import__('re').findall(r'\S*[ğüşıöçİĞÜŞÖÇ]\S*', tr)))
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'başlangıç güçleri; çark günde bir, ağırlıklar; 4 yuva, tek sandık açılır, süreyle açılır; bölüm kazanınca sandık; +3 hamle, çekiç, mıknatıs; onarım; İngilizce'

@test
def etkinlik(b):
    """Haftalık etkinlik: ISO hafta ve dönen tema; puanlar (Bölüm Yolu 3+yıldız, Günün Görevi 6, bölüm 4, online 4/2); ödül basamakları
    yalnız ulaşılınca ve bir kez alınır; yuva doluyken sandık ödülü bekler; son basamak şampiyonluk ve rozet; yeni haftada sıfırlanır; onarım; İngilizce."""
    s = Sayfa(b, init=[SAAT]); s.js('kayit.strRehber = true')
    esit(s.js("[etkHafta(new Date(2026, 0, 1).getTime()).anahtar, etkHafta(new Date(2026, 11, 28).getTime()).anahtar, etkHafta(new Date(2027, 0, 4).getTime()).anahtar]"), ['2026-W01', '2026-W53', '2027-W01'], 'ISO hafta')
    dogru(s.js('etkKalan()') > 0 and s.js('etkKalan()') <= 7 * 864e5, 'kalan süre')
    dogru(s.js("!!document.getElementById('a-etk')"), 'ana menüde etkinlik şeridi yok')
    p0 = s.js('etkGuncelle().puan')
    s.js("Olay.yay('bolumBitti', { mod: 'yol', kazandi: true, yildiz: 3 }); Olay.yay('bolumBitti', { mod: 'gunluk', kazandi: true }); Olay.yay('bolumBitti', { mod: 'bolum', kazandi: true }); Olay.yay('bolumBitti', { mod: 'bolum', kazandi: false }); Olay.yay('onlineBitti', { kazandi: false })")
    esit(s.js('kayit.etkinlik.puan') - p0, 6 + 6 + 4 + 2, 'etkinlik puanları')
    s.js('etkAc()'); n_al = s.js("document.querySelectorAll('.etk-al').length"); esit(n_al, 2, 'ulaşılan basamaklar (5, 12)')
    s.js('etkAl(2)'); esit(s.js('kayit.etkinlik.alinan'), [], 'ulaşılmayan basamak alındı')
    h0 = s.js('kayit.envanter.hamle3'); s.pg.tap('.etk-al[data-i="0"]'); s.pg.wait_for_selector('.odul-pen'); s.pg.tap('#odul-tamam')
    esit((s.js('kayit.envanter.hamle3'), s.js('kayit.etkinlik.alinan')), (h0 + 1, [0]), 'ödül alındı'); s.js('etkAl(0)'); esit(s.js('kayit.envanter.hamle3'), h0 + 1, 'aynı ödül iki kez')
    s.js("kayit.sandik.slot = [1, 2, 3, 4].map(() => ({ tur: 'tahta', t: 1, acilis: null })); etkPuanEkle(200); etkAl(3)"); esit(3 in s.js('kayit.etkinlik.alinan'), False, 'yuva doluyken sandık ödülü alındı')
    s.js("kayit.sandik.slot = []; etkAl(9)"); esit((s.js('kayit.etkinlik.tamam'), s.js('kayit.sandik.slot[0].tur')), (1, 'altin'), 'son basamak'); s.js("document.querySelector('#odul-tamam') && document.querySelector('#odul-tamam').click()")
    dogru(s.js("(rozetKontrol(), rozetAcikMi('etkinlik1'))"), 'etkinlik rozeti açılmadı')
    t1 = s.js('etkTema().ad'); s.js('window.__ileri = 7 * 864e5'); s.pg.reload(); s.bekle()
    esit((s.js('etkGuncelle().puan'), s.js('kayit.etkinlik.alinan'), s.js('kayit.etkinlik.tamam')), (0, [], 1), 'yeni haftada sıfırlama'); dogru(s.js('etkTema().ad') != t1, 'tema değişmedi')
    s.js("kayit = kayitDuzelt(Object.assign({}, kayit, { etkinlik: { hafta: 'x', puan: -1, alinan: [0, 'a', 99] } }), bosKayit()).k")
    esit(s.js('JSON.stringify(kayit.etkinlik)'), json.dumps({'hafta': '', 'puan': 0, 'alinan': [0], 'tamam': 0}, separators=(',', ':')), 'bozuk etkinlik kaydı onarımı')
    s.js("dilSec('en'); etkAc()"); tr = s.js("document.getElementById('card').textContent"); dogru(not __import__('re').search('[ğüşıöçİĞÜŞÖÇ]', tr), 'İngilizce etkinlik: ' + ' '.join(__import__('re').findall(r'\S*[ğüşıöçİĞÜŞÖÇ]\S*', tr)))
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'ISO hafta ve tema; puanlar; basamaklar bir kez ve ulaşılınca; dolu yuva; şampiyonluk ve rozet; yeni haftada sıfırlama; onarım; İngilizce'

@test
def paylas(b):
    """Paylaş ve davet: Günün Görevi kareleri (5 cümle + 2 hata) ve metin; Bölüm Yolu metninde davet linki; linkle açılınca davet kartı,
    o bölüm oynanır (kilitli olsa da), sonuçta karşılaştırma, ilerleme değişmez; adres satırından davet silinir; bozuk davet yok sayılır."""
    s = Sayfa(b); s.js('kayit.strRehber = true')
    s.pg.tap('#a-gorev', force=True); r = s.js('__ff(900, 0.03, () => G.state !== "playing" && ekran === "sonuc")'); dogru(r['done'], 'görev bitmedi')
    kare = s.js("document.querySelector('.paylas-satir .kareler').textContent")
    dogru(len([c for c in kare if c in '🟩🟨🟦🟥']) == 7 and kare.count('🟦') + kare.count('🟥') == 2, f'görev kareleri: {kare}')
    s.pg.tap('#s-paylas'); m = s.js('__paylasilan[__paylasilan.length - 1]')
    dogru(kare in m and s.js('OYUN_URL') in m and s.js('bugunAnahtar()') in m, 'görev paylaşım metni: ' + m)
    s.js("yolOyna(1)"); s.js("""(() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, -1, h);
      h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()""")
    s.pg.wait_for_selector('#y-paylas', timeout=20000); s.pg.tap('#y-paylas'); m = s.js('__paylasilan[__paylasilan.length - 1]')
    dogru('#davet=y.1.' in m and '.Test' in m and '⭐' in m, 'bölüm paylaşım metni: ' + m)
    esit(s.js("[davetOku('#davet=y.0.5.a'), davetOku('#davet=y.999.5.a'), davetOku('#x'), davetOku('#davet=y.12.300.Mert').no]"), [None, None, None, 12], 'davet çözümleme')
    s.kapat()
    # linkle açılış
    s = Sayfa(b, init=["if (!sessionStorage.getItem('dv')) { sessionStorage.setItem('dv', 1); history.replaceState(null, '', location.pathname + '#davet=y.30.100.Mert%20Can'); }", 'localStorage.setItem("x", 1)'])
    s.js('kayit.strRehber = true'); s.js('acilisAc()') if s.js('ekran') != 'davet' else None
    esit(s.js('ekran'), 'davet', 'davet kartı'); dogru('Mert Can' in s.js('card.innerText') and '100' in s.js('card.innerText'), 'davet kartı yazısı')
    dogru('davet' not in s.js('location.href'), 'adres satırında davet kaldı'); s.foto('davet_kart')
    s.pg.tap('#dv-oyna'); esit((s.js('STR.yol.no'), s.js('STR.yol.davet.ad')), (30, 'Mert Can'), 'davetle bölüm 30')
    s.js("""(() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, B.hedef.renk == null ? -1 : B.hedef.renk, h);
      h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()""")
    s.pg.wait_for_selector('.davet-sonuc', timeout=20000); dogru('GEÇTİN' in s.js("document.querySelector('.davet-sonuc').innerText"), 'uzman 100 puanı geçemedi'); s.foto('davet_sonuc')
    esit((s.js('kayit.yol.acik'), s.js('kayit.yol.yildiz[30] || 0'), s.js('kayit.sandik.slot.length')), (1, 0, 0), 'davetle oynanan kilitli bölüm ilerlemeyi değiştirdi')
    s.pg.tap('#y-paylas'); dogru('Mert Can 100' in s.js('__paylasilan[__paylasilan.length - 1]'), 'karşılaştırma paylaşılmadı')
    dogru(s.js("!document.getElementById('y-sonraki') && !!document.getElementById('y-kendi')"), 'kilitli davet bölümünden sonra SONRAKİ BÖLÜM çıktı')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return 'görev kareleri ve metni; bölüm davet linki; davet çözümleme; linkle açılış, kart, oynama, karşılaştırma, ilerleme korunur'

@test
def olcum(b):
    """Ölçüm: olaylar (açılış, bölüm başla / bitti, Bölüm Yolu ayrıntıları, çark, sandık, paylaş) kaydedilir; kişisel veri (isim, cümle) yok;
    kimlik rastgele ve kalıcı; ayardan kapanınca olay yok; anahtar verilince olaylar toplu olarak servise gider; anahtar yokken ağ isteği yok."""
    giden = []
    s = Sayfa(b, ad='Zeynep', init=["window.TE_OLCUM_ANAHTAR = 'phc_test'; window.TE_OLCUM_ADRES = 'https://olcum.test/batch/';"])
    s.ctx.route('https://olcum.test/**', lambda r: (giden.append(r.request.post_data), r.fulfill(status=200, body='{}')))
    s.js('kayit.strRehber = true; yolOyna(1)')
    s.js("""(() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, -1, h);
      h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()""")
    s.pg.wait_for_selector('#y-paylas', timeout=20000); s.pg.tap('#y-paylas')
    s.js('strKapat(); acilisAc(); carkCevir && (kayit.cark.son = null); carkAc(); carkCevir()'); s.pg.wait_for_timeout(300)
    ev = s.js('__olcum.map(e => e.event)')
    for ad in ('oyun_acildi', 'bolum_basladi', 'bolum_bitti', 'paylasti', 'cark', 'ekran'): dogru(ad in ev, f'olay yok: {ad} ({ev})')
    yb = s.js("__olcum.find(e => e.event === 'bolum_bitti' && e.properties.mod === 'yol').properties")
    for k in ('yol_no', 'deneme', 'kalan_hamle', 'zorluk', 'hedef', 'kazandi', 'yildiz'): dogru(k in yb, f'Bölüm Yolu olayında {k} yok')
    hepsi = s.js('JSON.stringify(__olcum)'); cumle = s.js('yolBolum(1).s.en')
    dogru('Zeynep' not in hepsi and cumle not in hepsi, 'ölçümde kişisel veri / cümle var')
    kim = s.js('olcumKimlik()'); dogru(len(kim) >= 12 and all(e == kim for e in s.js('__olcum.map(e => e.properties.distinct_id)')), 'kimlik')
    s.js('Olcum.gonder()'); s.pg.wait_for_timeout(500)
    dogru(giden and '"api_key":"phc_test"' in giden[-1] and '"batch"' in giden[-1] and 'Zeynep' not in ''.join(giden), f'servise gitmedi ya da kişisel veri var: {giden[:1]}')
    s.pg.reload(); s.bekle(); esit(s.js('olcumKimlik()'), kim, 'kimlik kalıcı değil')
    s.js("ayarAc(false, acilisAc)"); s.pg.tap('.anahtar[data-a="olcum"]'); esit(s.js('olcumIzinli()'), False, 'ölçüm kapanmadı')
    n = s.js('__olcum.length'); s.js("Olay.yay('bolumBasladi', { mod: 'bolum', r: 'x', lvl: 'A1' })"); esit(s.js('__olcum.length'), n, 'kapalıyken olay kaydedildi')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    # anahtar yokken ağ isteği yok
    istek = []
    s = Sayfa(b); s.pg.on('request', lambda r: istek.append(r.url) if 'posthog' in r.url or 'olcum' in r.url else None)
    s.js('Olcum.olay("deneme"); Olcum.gonder()'); s.pg.wait_for_timeout(300); esit(istek, [], 'anahtar yokken istek gitti'); s.kapat()
    return f'{len(set(ev))} olay türü; kişisel veri yok; kimlik kalıcı; kapatma; toplu gönderim; anahtarsız istek yok'

@test
def hiz_bot(b):
    """HIZ: seviye seçimi ve bilgisayara karşı maç: seçilen seviyenin cümleleri, bilgisayar cümleleri zamanla bitirir, karar ve sonuç ekranı."""
    s = Sayfa(b)
    s.pg.tap('#a-online'); s.pg.tap('#o-hiz'); s.pg.tap('#o-lvl button[data-l="B1"]'); s.pg.tap('#o-bot')
    esit((s.js('D.online && D.r.lvl'), s.js('OD.bot')), ('B1', True), 'B1 bilgisayar maçı')
    dogru(all(s.js('D.online.liste.map(a => sAl(a).kaynak.indexOf("B1") === 0)')), 'cümleler B1 değil')
    r = s.js('__ff(900, 0.05, () => !!(D.online.benim || D.online.karar))'); dogru(r['done'], 'maç bitmedi')
    s.pg.wait_for_function('ekran === "onlineSonuc"', timeout=15000); s.foto('hiz_bot_sonuc')
    plan = s.js('[D.online.botPlan.length, D.online.rakip.cumle, D.online.botPlan.filter(t => t <= D.online.benim.sure).length, D.online.botPlan[0]]')
    esit(plan[0], 5, 'bilgisayarın planı'); esit(plan[1], plan[2], 'bilgisayar planına göre cümle bitirdi')
    dogru(8000 < plan[3] < 60000, f'bilgisayarın ilk cümle süresi {plan[3]} ms')
    esit(s.js('kayit.istat.online || 0'), 0, 'bilgisayar maçı online istatistiğine yazıldı')
    s.pg.tap('#os-tekrar'); esit(s.js('OD.bot && D && D.online && D.r.lvl'), 'B1', 'tekrar oyna')
    s.pg.tap('#pauseBtn'); s.pg.tap('#p-cik'); s.pg.wait_for_timeout(200); esit(s.js('ekran'), 'online', 'duraklatıp çıkış')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return "B1 bilgisayar maçı: seviye, bilgisayarın ilerlemesi, karar, tekrar ve çıkış tamam"

def ekranlari_topla(b, dil='tr'):
    """Bütün ekranları sırayla açar, bot birkaç mod oynar; ekran yazıları, tuvale çizilen yazılar ve bildirimler toplanır."""
    on = [METIN] + ([f"localStorage.setItem('te_dil', '{dil}');"] if dil != 'tr' else [])
    s = Sayfa(b, init=on); m = {}
    def al(ad, js=None, tik=None):
        if js: s.js(js)
        if tik: s.pg.tap(tik)
        s.pg.wait_for_timeout(60); m[ad] = s.js('__ekran()')
    al('acilis', 'acilisAc()'); al('profil', 'profilAc()'); al('profil_yeni', 'profilYeniAc()')
    al('harita', "acilisAc(); haritaAc('A1')"); al('harita_kelime', tik='#yol-sec button[data-y="kelime"]')
    al('defter', 'defterAc()'); al('defter_kelime', "defterAc('kelime')")
    al('ayar', 'ayarAc(false, acilisAc)'); al('online', 'onlineSonMod = null; onlineAc()'); al('online_hiz', "onlineModAc('hiz')"); al('online_strateji', "onlineModAc('strateji')"); s.js('onlineSonMod = null')
    al('ders', "dersAc(rakipBul('A1-1'), null, acilisAc)")
    s.js('showTutorial()')
    for i in range(s.js('SLIDES.length')): al(f'nasil_{i + 1}', 'tutStep(1)' if i else None)
    s.js('tutFinish()')
    for ad, bas, err in [('kariyer', "dojoBaslat(rakipBul('A1-1'))", 0.15), ('kelime', "dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})", 0.2),
                         ('seviye_testi', 'stBaslat()', 0.3), ('kaybetme', "dojoBaslat(rakipBul('A1-2'))", 0.7)]:
        s.js(bas); s.js(f'__ff(6, {err})'); al(ad + '_oyun')
        s.js('togglePause()'); al(ad + '_duraklat'); s.js('togglePause()')
        s.js(f'__ff(900, {err}, () => (G.state === "over" || G.state === "menu") && (ekran === "sonuc" || ekran === "stSonuc"))'); al(ad + '_sonuc')
    # rehberli ilk cümle (ilk.js): karşılama, oyun, sonuç, hedef seçimi
    al('ilk_karsila', 'ilkKarsila()')
    s.js('ilkBaslat()'); s.js('__ff(4, 0)'); al('ilk_oyun')
    s.js("__ff(60, 0, () => ekran === 'ilkSonuc')"); al('ilk_sonuc'); al('ilk_hedef', "ilkHedefAc('Test')")
    m['tuval'] = sorted(s.js('[...__ciz]')); m['bildirim'] = sorted(s.js('[...__notlar]')); m['koc'] = sorted(s.js('[...__koc]')); m['dizilis'] = sorted(s.js('[...__dzk]'))
    h = s.hatalar(); s.kapat()
    return m, h

@test
def metin(b, taban_yaz=False):
    """Türkçe arayüzdeki bütün yazılar tabandakiyle birebir aynı (dil dosyası taşıması bir şeyi değiştirmedi)."""
    m, h = ekranlari_topla(b)
    esit(h, [], 'JS hataları')
    if taban_yaz or not os.path.exists(METIN_TABAN):
        json.dump(m, open(METIN_TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        return f"taban yazıldı: {len(m) - 2} ekran, tuvalde {len(m['tuval'])} farklı yazı"
    t = json.load(open(METIN_TABAN, encoding='utf-8'))
    farklar = [k for k in t if m.get(k) != t[k]]
    if farklar:
        k = farklar[0]
        if isinstance(t[k], list):
            raise AssertionError(f"{len(farklar)} ekran farklı: {farklar}; {k}: eksik {sorted(set(t[k]) - set(m[k]))[:8]} fazla {sorted(set(m[k]) - set(t[k]))[:8]}")
        import difflib
        d = [x for x in difflib.unified_diff(t[k].splitlines(), (m.get(k) or '').splitlines(), lineterm='', n=0) if x[:1] in '+-' and x[:3] not in ('+++', '---')]
        raise AssertionError(f"{len(farklar)} ekran farklı: {farklar}; {k}: {d[:6]}")
    return f"{len(t) - 2} ekran ve tuvaldeki {len(t['tuval'])} farklı yazı birebir aynı"

@test
def dil(b):
    """İngilizce arayüz: ayarlardan seçilir, kalıcıdır; menü, oyun içi ve tuval yazıları İngilizce, Türkçe arayüz kelimeleri kalmaz, hata yok."""
    s = Sayfa(b)
    s.js('ayarAc(false, acilisAc)'); s.pg.tap('#dil-sec button[data-dil="en"]'); s.pg.wait_for_timeout(200)
    esit(s.js('arayuzDili'), 'en', 'dil seçimi')
    dogru('Interface language' in s.js("card.innerText"), 'ayarlar ekranı İngilizceye dönmedi')
    s.pg.reload(); s.bekle(); esit(s.js('arayuzDili'), 'en', 'dil kalıcı değil'); s.kapat()
    m, h = ekranlari_topla(b, 'en')
    esit(h, [], 'JS hataları (İngilizce)')
    beklenen = {'acilis': ['CAREER', 'ONLINE', '⚙ Settings', 'PLAY', 'LEVEL 1'], 'profil': ['💾 SAVE GAME'], 'online': ['SPEED', 'STRATEGY', 'PLAY ›'], 'online_hiz': ['Create room', 'JOIN', '🎲 QUICK MATCH'], 'online_strateji': ['STRATEGY', 'Computer'],
                'kariyer_duraklat': ['PAUSED', 'RESUME'], 'kariyer_sonuc': ['SCORE', 'CAREER'], 'nasil_1': ['HOW TO PLAY?', 'GOAL'],
                'tuval': ['SCORE:', 'GOAL', 'Sentences', 'BUILD THE SENTENCE · Put the English'], 'ilk_karsila': ['BUILD YOUR FIRST SENTENCE'],
                'ilk_sonuc': ['FIRST SENTENCE DONE!', 'SAVE AND CONTINUE'], 'ilk_hedef': ['YOUR DAILY GOAL', 'Casual · 20 XP']}
    for ekr, kel in beklenen.items():
        metin = '\n'.join(m[ekr]) if isinstance(m[ekr], list) else m[ekr]
        for k in kel: dogru(k in metin, f'{ekr}: "{k}" yok')
    yasak = ['KARİYER', 'DURAKLATILDI', 'HEDEF', 'Cümleler', 'CÜMLE BOMBASI', 'SÜRE DOLDU', 'TEKRAR OYNA', 'ODA KUR', 'NASIL OYNANIR', 'Ayarlar']
    for ekr, v in m.items():
        metin = '\n'.join(v) if isinstance(v, list) else v
        for k in yasak: dogru(k not in metin, f'{ekr}: Türkçe arayüz yazısı kaldı: {k}')
    dogru(m['koc'] and all(not set('çğıöşüÇĞİÖŞÜ') & set(k) for k in m['koc']), f"koç yazısı İngilizce değil: {m['koc']}")
    return 'İngilizce arayüz tamam (içerik Türkçe-İngilizce aynen)'

# Capacitor Preferences taklidi: sekme kapanana kadar sessionStorage'da durur, her işlem gecikmeli (gerçek eklenti gibi)
PREF_TAKLIT = """(() => { const K = 'PREF:', d = () => new Promise(r => setTimeout(r, 5 + Math.random() * 25));
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Preferences: {
    async keys() { await d(); const keys = []; for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k.indexOf(K) === 0) keys.push(k.slice(K.length)); } return { keys }; },
    async get({ key }) { await d(); return { value: sessionStorage.getItem(K + key) }; },
    async set({ key, value }) { await d(); sessionStorage.setItem(K + key, value); },
    async remove({ key }) { await d(); sessionStorage.removeItem(K + key); } } } }; })();"""

@test
def depo(b):
    """Uygulama modu: eski tarayıcı kaydı telefonun kalıcı hafızasına taşınır; tarayıcı hafızası silinse de profil ve yarım bölüm kalır."""
    tohum = "if (!sessionStorage.getItem('tohum')) { sessionStorage.setItem('tohum', '1'); localStorage.clear(); " + profil_js('pd', 'Deniz') + " }"
    s = Sayfa(b, profil=False, init=[PREF_TAKLIT, tohum])
    esit(s.js('Depo.tur()'), 'uygulama', 'depo türü')
    esit(s.js('aktifProfil() && aktifProfil().ad'), 'Deniz', 'taşınan profil')
    dogru(s.js('Depo.durum().tasinan') >= 2, 'eski kayıt taşınmadı')
    dogru(s.js("!!sessionStorage.getItem('PREF:te_profiller_v1')"), 'kalıcı hafızaya yazılmadı')
    s.js("dojoBaslat(rakipBul('A1-1'))")
    s.js("__ff(400, 0.15, () => D && D.ti >= 3 && G.R && !G.R.bitti && !G.R.tahtaHazir)")
    y = s.js('yarimOku()'); dogru(y, 'yarım kayıt yok')
    s.pg.wait_for_function('Depo.durum().bekleyen === 0', timeout=5000)
    esit(s.js('Depo.durum().hata'), 0, 'kalıcı hafıza yazma hatası')
    s.js('localStorage.clear()')          # işletim sistemi tarayıcı hafızasını sildi
    s.pg.reload(); s.bekle()
    esit(s.js('Depo.durum().tasinan'), 0, 'ikinci açılışta yeniden taşıma yapıldı')
    esit(s.js('aktifProfil() && aktifProfil().ad'), 'Deniz', 'tarayıcı hafızası silinince profil')
    y2 = s.js('yarimOku()'); dogru(y2, 'tarayıcı hafızası silinince yarım bölüm kayboldu')
    esit((y2['turYazi'], y2['G']['score']), (y['turYazi'], y['G']['score']), 'yarım bölüm içeriği')
    s.pg.tap('#a-kariyer'); s.pg.wait_for_timeout(300); s.pg.tap('#k-devam'); s.pg.wait_for_timeout(300)
    esit(s.js('G.state'), 'playing', 'devam edilemedi')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    return f"taşındı, tarayıcı hafızası silindikten sonra {y['turYazi']} turundan devam edildi"

# ---------------------------------------------------------------- kayıt güvenliği
def tohum(anahtarlar, on=''):
    """İlk açılışta tarayıcı hafızasını temizleyip verilen ham kayıtları yazar (yeniden yüklemede tekrar yazmaz)."""
    yaz = ''.join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False), ensure_ascii=False)});" for k, v in anahtarlar.items())
    return f"if (!sessionStorage.getItem('tohum{on}')) {{ sessionStorage.setItem('tohum{on}', '1'); localStorage.clear(); {yaz} }}"

LISTE_A = {'aktif': 'pa', 'liste': [{'id': 'pa', 'ad': 'Ayşe'}], 'eskiAktarildi': True}
IYI_KAYIT = {'v': 1, 'tutGor': True, 'baslangic': 'A1', 'rehber': True, 'kelRehber': True, 'sonLvl': 'A2', 'sonSekme': 'kelime',
             'acik': {'A1-1': True, 'A1-2': True}, 'yildiz': {'A1-1': 3, 'A1-2': 2}, 'kel': {'apple': [3, 123456, 1]},
             'tekrar': [{'k': 'c:A1-1:0', 'tur': 'cumle', 'r': 'A1-1', 'i': 0, 'kutu': 2, 'vade': 1, 'hata': 1, 't': 1}],
             'ders': {'A1-1': 1}, 'gorulen': {'A1-1': [1, 2]}, 'ayar': {'muzik': False, 'efekt': True, 'ses': True, 'trSes': True},
             'best': 4321, 'seviyeTesti': {'sonuc': 'A2', 'once': None, 'dogru': 9, 'n': 14}, 'istat': {'dojo': 5, 'zafer': 4, 'online': 1, 'onlineGalibiyet': 1}, 'sonKayit': 1}

def bildirim(s): return s.js("document.getElementById('not').textContent")
def yedekler(s, anahtar): return s.js(f"Depo.anahtarlar().filter(k => k.indexOf('te_yedek:{anahtar}:') === 0).map(k => Depo.al(k))")

@test
def kayit(b):
    """Bozuk, eksik, yanlış türde ve eski kayıtlar: oyun çökmez, veri kaybolmaz (bozuk hali yedeklenir), oyuncuya bir kez söylenir."""
    ozet = []
    # A) profil kaydı okunamıyor
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': '{"yildiz": {bozuk'})])
    esit(s.js('ekran'), 'acilis', 'A: açılış'); esit(s.js('aktifProfil().ad'), 'Ayşe', 'A: profil')
    esit(s.js('Object.keys(kayit.yildiz).length'), 0, 'A: boş kayıtla başlamadı')
    dogru('okunamadı' in bildirim(s), 'A: oyuncuya söylenmedi'); esit(yedekler(s, 'te_profil_pa'), ['{"yildiz": {bozuk'], 'A: yedek')
    s.js("dojoBaslat(rakipBul('A1-1'))"); s.js("__ff(900, 0.1, () => G.state === 'over' && ekran === 'sonuc')")
    s.pg.reload(); s.bekle()
    esit(bildirim(s), '', 'A: ikinci açılışta yine uyarı'); esit(len(yedekler(s, 'te_profil_pa')), 1, 'A: yedek kayboldu')
    dogru(s.js('Object.keys(kayit.yildiz).length') >= 0 and s.js('kayit.v') == 2, 'A: yeni kayıt yazılmadı')
    esit(s.hatalar(), [], 'A: JS hataları'); s.kapat(); ozet.append('okunamayan kayıt')
    # B) yanlış türde alanlar
    bozuk = {'v': 1, 'baslangic': 'A2', 'acik': 'x', 'yildiz': {'A1-1': 3, 'A1-2': 'çok', 'A1-3': 2}, 'kel': {'apple': [3, 123, 1], 'bad': 'x'},
             'tekrar': {}, 'ayar': {'muzik': 'evet', 'efekt': False}, 'best': 'abc', 'istat': None, 'sonLvl': 'Z9', 'sonSekme': 'x',
             'seviyeTesti': {'sonuc': 'Q'}, 'gelecekAlan': {'a': 1}}
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': bozuk})])
    k = s.js('kayit')
    esit(k['yildiz'], {'A1-1': 3, 'A1-3': 2}, 'B: yıldızlar'); esit(k['kel'], {'apple': [3, 123, 1]}, 'B: kelimeler')
    esit((k['tekrar'], k['best'], k['sonLvl'], k['sonSekme'], k['seviyeTesti'], k['baslangic']), ([], 0, 'A1', 'cumle', None, 'A2'), 'B: onarılan alanlar')
    esit((k['ayar']['muzik'], k['ayar']['efekt'], k['acik']), (True, False, {'A1-1': True}), 'B: ayar ve açık bölümler')
    esit((k['istat']['dojo'], k['gelecekAlan'], k['v']), (0, {'a': 1}, 2), 'B: istatistik, bilinmeyen alan, sürüm')
    dogru('bozuktu' in bildirim(s), 'B: oyuncuya söylenmedi'); esit(len(yedekler(s, 'te_profil_pa')), 1, 'B: yedek')
    s.pg.tap('#a-kariyer'); s.pg.wait_for_timeout(300); esit(s.js('ekran'), 'harita', 'B: kariyer açılmadı')
    s.js("dojoBaslat(rakipBul('A1-1'))"); r = s.js("__ff(900, 0.1, () => G.state === 'over' && ekran === 'sonuc')"); dogru(r['done'], 'B: bölüm oynanamadı')
    esit(s.hatalar(), [], 'B: JS hataları'); s.kapat(); ozet.append('yanlış türler')
    # C) eksik alanlar (çok eski kayıt) ve D) tam v1 kayıt: sessizce okunur, veri aynen korunur
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': {'aktif': 'pa', 'liste': [{'id': 'pa', 'ad': 'Ayşe'}, {'id': 'pb', 'ad': 'Ali'}], 'eskiAktarildi': True},
                                            'te_profil_pa': {'tutGor': True}, 'te_profil_pb': IYI_KAYIT})])
    esit((bildirim(s), yedekler(s, 'te_profil_pa')), ('', []), 'C: eksik alan uyarı/yedek üretti')
    esit((s.js('kayit.sonLvl'), s.js('kayit.ayar.muzik')), ('A1', True), 'C: varsayılanlar')
    s.js("profilSec('pb')"); k = s.js('kayit')
    for a, v in IYI_KAYIT.items():
        if a != 'v': esit(k[a], dict(v, dizilis=True, ingCumle=False, ingKelime=False, ingCumleSecildi=False, ingKelimeSecildi=False, yonergeSes=True, titresim=True, hatirlat=False) if a == 'ayar' else v, f'D: {a} korunmadı')   # yeni ayar varsayılanla eklenir, eskiler aynen
    esit((k['v'], yedekler(s, 'te_profil_pb')), (2, []), 'D: sürüm/yedek')
    esit(s.hatalar(), [], 'C/D: JS hataları'); s.kapat(); ozet.append('eski kayıt aynen')
    # E) profil listesi okunamıyor: telefondaki profil kayıtları geri bağlanır (okunamayan profil bağlanmaz)
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': 'xx{', 'te_profil_pa': IYI_KAYIT, 'te_profil_pb': {'tutGor': True}, 'te_profil_pc': '{bozuk'})])
    esit(s.js('profiller.liste.map(p => p.id)'), ['pa', 'pb'], 'E: kurtarılan profiller')
    esit(s.js('profiller.liste.map(p => p.ad)'), ['Profil 1', 'Profil 2'], 'E: kurtarılan isimler')
    esit((s.js('profiller.aktif'), s.js('Object.keys(kayit.yildiz).length'), s.js('profiller.eskiAktarildi')), ('pa', 2, True), 'E: aktif profil ve ilerleme')
    dogru('kurtarıldı' in bildirim(s), 'E: oyuncuya söylenmedi'); esit(yedekler(s, 'te_profiller_v1'), ['xx{'], 'E: liste yedeği')
    s.pg.reload(); s.bekle(); esit((bildirim(s), s.js('profiller.liste.length')), ('', 2), 'E: düzeltilmiş liste yazılmadı')
    esit(s.hatalar(), [], 'E: JS hataları'); s.kapat()
    # F) liste hiç yok ama profil kaydı var
    s = Sayfa(b, profil=False, init=[tohum({'te_profil_pz': IYI_KAYIT})])
    esit((s.js('ekran'), s.js('profiller.aktif'), s.js('kayit.best')), ('acilis', 'pz', 4321), 'F: liste olmadan kurtarma')
    esit(s.hatalar(), [], 'F: JS hataları'); s.kapat(); ozet.append('profil listesi kurtarma')
    # G) karışık liste: yinelenen/kuralsız kimlik, boş isim, olmayan aktif
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': {'aktif': 'zz', 'liste': [{'id': 'pa', 'ad': '  Ayşe  '}, {'id': 'pa', 'ad': 'tekrar'}, {'id': 'kötü id!', 'ad': 'x'}, {'id': 'pb'}]},
                                            'te_profil_pa': {'tutGor': True}})])
    esit((s.js('profiller.liste.map(p => p.id + ":" + p.ad)'), s.js('profiller.aktif')), (['pa:Ayşe', 'pb:Profil 2'], 'pa'), 'G: liste onarımı')
    dogru('düzeltildi' in bildirim(s), 'G: oyuncuya söylenmedi')
    esit(s.hatalar(), [], 'G: JS hataları'); s.kapat()
    # H) okunamayan yarım bölüm oyunu kilitlemez
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': IYI_KAYIT, 'te_yarim_pa': {'v': 1, 'r': 'A1-1'}})])
    dogru('Yarım bölüm açılamadı' in bildirim(s), 'H: oyuncuya söylenmedi')
    esit((s.js("Depo.al('te_yarim_pa')"), s.js('yarimOku()')), (None, None), 'H: bozuk yarım silinmedi')
    s.pg.tap('#a-kariyer'); s.pg.wait_for_timeout(300); s.pg.tap('#k-devam'); s.pg.wait_for_timeout(300)
    if s.js("!!document.getElementById('ing-pen')"): s.pg.tap('#ing-pen button[data-g="0"]'); s.pg.wait_for_timeout(300)   # göster / gizle sorusu
    esit(s.js('G.state'), 'playing', 'H: bölüm başlamadı')
    esit(s.hatalar(), [], 'H: JS hataları'); s.kapat(); ozet.append('bozuk yarım')
    # I) telefonda yer yok: oyun sürer, bir kez uyarılır, yer açılınca yine kaydeder
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': IYI_KAYIT})])
    s.js("window.__dolu = true; const _s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.__dolu && k.indexOf('te_profil_') === 0) throw new DOMException('dolu', 'QuotaExceededError'); return _s.call(this, k, v); }; 0")
    s.js("dojoBaslat(rakipBul('A1-1'))"); s.js('__ff(20, 0.1)')
    dogru('yer kalmamış' in bildirim(s), 'I: uyarı yok'); esit(s.js('G.state'), 'playing', 'I: oyun durdu')
    s.js("window.__dolu = false; document.getElementById('not').textContent = ''"); s.js('__ff(20, 0.1)')
    dogru(s.js("kaydet()") is True, 'I: yer açılınca kaydetmedi')
    esit(s.hatalar(), [], 'I: JS hataları'); s.kapat(); ozet.append('yer yok')
    # J) uygulama modunda bozuk kalıcı hafıza kaydı
    pref = f"if (!sessionStorage.getItem('pt')) {{ sessionStorage.setItem('pt', '1'); localStorage.clear(); sessionStorage.setItem('PREF:te_profiller_v1', {json.dumps(json.dumps(LISTE_A))}); sessionStorage.setItem('PREF:te_profil_pa', '[1,2'); }}"
    s = Sayfa(b, profil=False, init=[PREF_TAKLIT, pref])
    esit((s.js('Depo.tur()'), s.js('aktifProfil().ad')), ('uygulama', 'Ayşe'), 'J: uygulama modu')
    dogru('okunamadı' in bildirim(s), 'J: oyuncuya söylenmedi'); esit(yedekler(s, 'te_profil_pa'), ['[1,2'], 'J: yedek')
    esit(s.hatalar(), [], 'J: JS hataları'); s.kapat(); ozet.append('uygulama modu')
    # K) rastgele bozuk veriyle 3000 deneme: doğrulayıcı hiç hata fırlatmaz, çıktısı geçerli ve ikinci geçişte değişmez
    s = Sayfa(b)
    r = s.js(r"""(() => {
      let a = 7; const R = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
      const cop = d => { const t = R(); if (d > 3 || t < 0.25) return [null, 1, -5, 'x', true, 1e309, 'A1', [], {}][Math.floor(R() * 9)];
        if (t < 0.6) { const o = {}; for (let i = 0; i < 4; i++) o[['A1-1', 'apple', 'k', 'tur', 'kutu', 'vade', 'm', 'tokens', 'idx', 'r', 'i', 'id', 'ad'][Math.floor(R() * 13)]] = cop(d + 1); return o; }
        const o = []; for (let i = 0; i < 3; i++) o.push(cop(d + 1)); return o; };
      const alanlar = Object.keys(bosKayit()); let hata = 0, gecersiz = 0, oynak = 0;
      for (let n = 0; n < 3000; n++) {
        const ham = {}; for (const f of alanlar) if (R() < 0.6) ham[f] = R() < 0.5 ? cop(0) : bosKayit()[f];
        try {
          const x = kayitDuzelt(JSON.parse(JSON.stringify(ham)), bosKayit(), l => !!SEVIYE[l]);
          const y = kayitDuzelt(JSON.parse(JSON.stringify(x.k)), bosKayit(), l => !!SEVIYE[l]);
          if (y.bozuk.length || JSON.stringify(y.k) !== JSON.stringify(x.k)) oynak++;
          const k = x.k;
          if (typeof k.yildiz !== 'object' || !Array.isArray(k.tekrar) || typeof k.kel !== 'object' || typeof k.ayar.muzik !== 'boolean' || !SEVIYE[k.sonLvl]) gecersiz++;
          const p = profillerDuzelt({ aktif: cop(1), liste: [cop(1), { id: 'ok', ad: cop(2) }, cop(1)] });
          if (!p.p.liste.every(e => typeof e.ad === 'string' && e.ad && /^[A-Za-z0-9_-]+$/.test(e.id))) gecersiz++;
          yarimGecerli(cop(0));
        } catch (e) { hata++; }
      }
      return { hata, gecersiz, oynak };
    })()""")
    esit(r, {'hata': 0, 'gecersiz': 0, 'oynak': 0}, 'K: rastgele bozuk veri')
    s.kapat(); ozet.append('3000 rastgele deneme')
    return ', '.join(ozet) + ' — hepsi tamam'

# ---------------------------------------------------------------- olay yolu ve derleme
OLAYLAR = ['kayitYuklendi', 'bolumBasladi', 'turBasladi', 'dogruHamle', 'hata', 'copeAtildi', 'cumleTamam', 'hataBulundu', 'soruBitti', 'kelimeTanisildi', 'kombo', 'komboBitti', 'bolumBitti', 'onlineBitti', 'hedefTamam', 'uniteTamam']
OLAY_KAYITCI = "window.__olay = []; " + ''.join(f"Olay.dinle('{a}', v => __olay.push(['{a}', JSON.parse(JSON.stringify(v))])); " for a in OLAYLAR) + "0"

@test
def olay(b):
    """Motorun duyurduğu olaylar oyunun kendi sayaçlarıyla birebir tutar; bozuk bir dinleyici oyunu durdurmaz."""
    s = Sayfa(b); s.js(OLAY_KAYITCI); ozet = []
    for ad, bas, err, mod in [('kariyer', "dojoBaslat(rakipBul('A1-1'))", 0.15, 'bolum'), ('kelime', "dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})", 0.15, 'kelime'),
                              ('seviye_testi', 'stBaslat()', 0.3, 'test'), ('kaybetme', "dojoBaslat(rakipBul('A1-2'))", 0.7, 'bolum'), ('antrenman', 'antrenmanBaslat()', 0.1, 'antrenman')]:
        s.js('__olay.length = 0'); s.js(bas)
        r = s.js(f'__ff(900, {err}, () => (G.state === "over" || G.state === "menu") && (ekran === "sonuc" || ekran === "stSonuc"))'); dogru(r['done'], ad + ': bitmedi')
        o = s.js('__olay'); say = lambda a: sum(1 for x in o if x[0] == a); st = s.js('D.istat')
        esit((o[0][0], o[0][1]['mod']), ('bolumBasladi', mod), ad + ': ilk olay')
        esit((say('bolumBasladi'), say('bolumBitti')), (1, 1), ad + ': başla/bitti sayısı')
        bit = [x[1] for x in o if x[0] == 'bolumBitti'][0]
        esit((bit['kazandi'], bit['skor'], bit['mod']), (s.js('D.kazandi'), s.js('G.score'), mod), ad + ': bolumBitti bilgisi')
        esit(say('hata'), st['yanlis'], ad + ': hata olayı = yanlış sayacı'); esit(say('dogruHamle'), st['dogru'], ad + ': doğru hamle')
        esit(say('cumleTamam'), st['cumle'], ad + ': cümle'); esit(sum(1 for x in o if x[0] == 'cumleTamam' and x[1]['kusursuz']), st['kusursuz'], ad + ': kusursuz')
        esit(say('hataBulundu'), st['savOk'], ad + ': bulunan hata'); esit(say('soruBitti'), st['test'], ad + ': kelime sorusu')
        esit(say('turBasladi'), s.js('D.tur'), ad + ': tur'); esit(max([x[1]['n'] for x in o if x[0] == 'kombo'] or [0]), s.js('D.enKombo || 0'), ad + ': en uzun kombo')
        ozet.append(f"{ad} {len(o)} olay")
    # profil değişince
    s.js('__olay.length = 0'); s.js("profilOlustur('Ali')"); esit(s.js("__olay.filter(x => x[0] === 'kayitYuklendi').length"), 1, 'profil açılınca kayitYuklendi')
    # bozuk dinleyici
    s.js("Olay.dinle('dogruHamle', () => { throw new Error('deneme'); }); Olay.dinle('bolumBitti', () => { throw new Error('deneme'); }); 0")
    s.js("dojoBaslat(rakipBul('A1-1'))"); r = s.js("__ff(900, 0.1, () => G.state === 'over' && ekran === 'sonuc')")
    dogru(r['done'], 'bozuk dinleyiciyle bölüm bitmedi'); dogru(s.js('Olay.hataSayisi()') > 0, 'dinleyici hatası sayılmadı')
    esit([h for h in s.hatalar() if 'Olay dinleyicisi' not in h and 'deneme' not in h], [], 'JS hataları'); s.kapat()
    return '; '.join(ozet) + '; sayaçlarla birebir'

@test
def derleme(b):
    """Her kaynak parçası derlemede bir kez var; kalıcı hafızaya yalnız kayıt katmanı yazar; saf katmanlar ekranı bilmez."""
    P = os.path.join(KAYNAK, 'parcalar'); bsh = open(os.path.join(KAYNAK, 'build.sh'), encoding='utf-8').read()
    import re
    sira = re.search(r'for f in ([^;]+); do', bsh).group(1).split()
    js = sorted(f[:-3] for f in os.listdir(P) if f.endswith('.js'))
    esit(sorted(sira), js, 'build.sh listesi ile parcalar/*.js')
    esit(len(sira), len(set(sira)), 'build.sh listesinde tekrar')
    html = open(os.path.join(KAYNAK, 'index.html'), encoding='utf-8').read()
    for f in sira + ['head_old.css', 'extra', 'body']:
        ad = f + ('.js' if f in sira else '.html' if f != 'extra' else '.css')
        dogru(open(os.path.join(P, ad), encoding='utf-8').read() in html, f'{ad} kaynak/index.html içinde yok: önce sh build.sh')
    dogru(sira.index('kayit-sema') < sira.index('kayit') and sira.index('ogretim') < sira.index('kayit') and sira.index('olay') < sira.index('kayit'), 'katman sırası')
    kod = {f: open(os.path.join(P, f + '.js'), encoding='utf-8').read() for f in sira}
    for f, t in kod.items():
        if f not in ('depo',): dogru('localStorage' not in t, f'{f}.js localStorage kullanıyor (Depo üzerinden olmalı)')
        if f not in ('depo', 'dil', 'kayit', 'screens'): dogru('Depo.' not in t, f'{f}.js kalıcı hafızaya doğrudan erişiyor (kayit.js üzerinden olmalı)')
    yorumsuz = lambda t: re.sub(r'(?m)^\s*//.*$', '', re.sub(r'/\*.*?\*/', '', t, flags=re.S))
    for f in ('kayit-sema', 'olay'):   # saf katmanlar: ekranı, oyun durumunu ve hafızayı bilmez (yorumlar hariç)
        for yasak in (r'\bdocument\b', r'(?<![\w.$])Depo\.', r'(?<![\w.$])G\.', r'(?<![\w.$])D\.', r'(?<![\w.$])ctx\.'):
            dogru(not re.search(yasak, yorumsuz(kod[f])), f'{f}.js saf değil: {yasak}')
    return f'{len(sira)} parça derlemede; katman kuralları tamam'

@test
def tek(b):
    """Kökteki tek dosya (index.html) son kaynaktan üretilmiş ve sesleri, içeriği içeriyor."""
    sonuc = subprocess.run(['sh', os.path.join(KAYNAK, 'build-tek.sh')], capture_output=True, text=True)
    esit(sonuc.returncode, 0, 'build-tek.sh: ' + sonuc.stderr[-300:])
    yeni = open(os.path.join(KAYNAK, 'tek', 'index.html'), encoding='utf-8').read()
    import shutil; shutil.rmtree(os.path.join(KAYNAK, 'tek'), ignore_errors=True)
    for k in ('window.SES_VERI={', '"muzik":', 'window.NE_ICERIK', 'window.NE_SIRA', 'window.NE_HATALAR'): dogru(k in yeni, 'tek dosyada yok: ' + k)
    kok = os.path.join(os.path.dirname(KAYNAK), 'index.html')
    esit(open(kok, encoding='utf-8').read() == yeni, True, 'kökteki index.html eski: cd kaynak && sh build-tek.sh && cp tek/index.html ../index.html')
    return f'{len(yeni.encode()) / 1e6:.2f} MB, güncel'

# ---------------------------------------------------------------- XP, günlük hedef, seri
# testte saat ileri alınabilir (window.__ileri ms); sayfa yenilenince de korunur
SAAT = """(() => { const n = Date.now.bind(Date); let yedek = 0;
  const oku = () => { try { return +(sessionStorage.getItem('__ileri') || 0); } catch (e) { return yedek; } };
  Object.defineProperty(window, '__ileri', { get: oku, set: v => { yedek = v; try { sessionStorage.setItem('__ileri', String(v)); } catch (e) {} } });
  Date.now = () => n() + oku(); })();"""
GUN_MS = 864e5

def beklenen_xp(o):
    """Olay kaydından XP_KURAL'a göre beklenen XP."""
    x = 0
    for ad, v in o:
        if ad == 'cumleTamam': x += 4 + (2 if v['kusursuz'] else 0)
        elif ad == 'hataBulundu': x += 3
        elif ad == 'soruBitti': x += 2 if v['temiz'] else 1
        elif ad == 'kelimeTanisildi': x += 1
        elif ad == 'bolumBitti' and v['kazandi'] and v['mod'] != 'test': x += 5 + 2 * (v['yildiz'] or 0)
    return x

@test
def ilerleme(b):
    """XP kuralları, günlük hedef, seri, dondurma ve gün değişimi (sahte saatle); ses kapalıyken de görünür; bozuk ilerleme kaydı onarılır."""
    # A) seri kuralları (saf işlevler)
    s = Sayfa(b)
    r = s.js(r"""(() => {
      const B = '2026-11-20', g = (n) => gunEkle(B, n), S = (o) => Object.assign({ gun: 0, enUzun: 0, sonGun: null, dondurma: 0, donan: [] }, o);
      const sonuc = {};
      let x = seriBugune(S({ gun: 4, sonGun: B }), B); sonuc.bugun = [x.s.gun, x.olan.bitti];
      x = seriBugune(S({ gun: 4, sonGun: g(-1) }), B); sonuc.dun = [x.s.gun, x.olan.bitti, x.olan.donduruldu];
      x = seriBugune(S({ gun: 4, sonGun: g(-2), dondurma: 1 }), B); sonuc.birKacti = [x.s.gun, x.s.dondurma, x.s.sonGun === g(-1), x.olan.donduruldu, x.s.donan.join()];
      x = seriBugune(S({ gun: 4, sonGun: g(-3), dondurma: 1 }), B); sonuc.ikiKacti = [x.s.gun, x.s.sonGun, x.olan.bitti, x.olan.biten];
      x = seriBugune(S({ gun: 4, sonGun: g(-3), dondurma: 2 }), B); sonuc.ikiDondurma = [x.s.gun, x.s.dondurma, x.olan.donduruldu];
      x = seriBugune(S({ gun: 4, sonGun: g(2) }), B); sonuc.saatGeri = [x.s.gun, x.olan.bitti];
      x = seriHedefTamam(S({ gun: 6, enUzun: 6, sonGun: g(-1) }), B); sonuc.yedinci = [x.s.gun, x.s.enUzun, x.s.dondurma, x.olan.yeniDondurma];
      x = seriHedefTamam(x.s, B); sonuc.ayniGun = [x.s.gun, x.olan.artti];
      x = seriHedefTamam(S({ gun: 13, enUzun: 20, sonGun: g(-1), dondurma: 2 }), B); sonuc.enFazla = [x.s.gun, x.s.enUzun, x.s.dondurma];
      sonuc.takvim = [gunEkle('2026-12-31', 1), gunFarki('2027-02-28', '2027-03-01'), gunFarki('2028-02-28', '2028-03-01'), gunEkle('2026-03-01', -1)];
      sonuc.gece = [gunAnahtar(new Date(2026, 10, 20, 23, 59, 59).getTime()), gunAnahtar(new Date(2026, 10, 21, 0, 0, 1).getTime())];
      return sonuc; })()""")
    esit(r, {'bugun': [4, False], 'dun': [4, False, 0], 'birKacti': [4, 0, True, 1, '2026-11-19'], 'ikiKacti': [0, None, True, 4], 'ikiDondurma': [4, 0, 2],
             'saatGeri': [4, False], 'yedinci': [7, 7, 1, True], 'ayniGun': [7, False], 'enFazla': [14, 20, 2],
             'takvim': ['2027-01-01', 1, 2, '2026-02-28'], 'gece': ['2026-11-20', '2026-11-21']}, 'A: seri kuralları')
    s.kapat()
    # B) oyun içinde: XP olaylarla birebir, hedef, seri, gün atlama, dondurma, kalıcılık (sahte saat)
    s = Sayfa(b, init=[SAAT]); s.js(OLAY_KAYITCI); s.js('hedefSec(20)')
    def oyna(bas, err=0.05):
        s.js('__olay.length = 0'); xp0 = s.js('kayit.xp'); s.js(bas)
        r = s.js("__ff(900, %s, () => G.state === 'over' && (ekran === 'sonuc' || ekran === 'stSonuc'))" % err); dogru(r['done'], bas + ' bitmedi')
        o = s.js('__olay'); kaz = s.js('kayit.xp') - xp0
        esit(kaz, beklenen_xp(o), bas + ': XP olaylardan hesaplanandan farklı')
        if s.js('ekran') == 'sonuc': esit(s.js('D.ilerleme.xp'), kaz, bas + ': sonuç ekranındaki XP')
        return kaz, o
    kaz, o = oyna("dojoBaslat(rakipBul('A1-1'))")
    dogru(kaz >= 20, f'B: bir bölüm 20 XP getirmedi ({kaz})'); esit(s.js('kayit.seri.gun'), 1, 'B: hedef sonrası seri')
    esit(sum(1 for x in o if x[0] == 'hedefTamam'), 1, 'B: hedefTamam olayı'); dogru('GÜNLÜK HEDEF TAMAM' in s.js('card.innerText'), 'B: sonuçta kutlama yok')
    s.foto('ilerleme_hedef')
    kaz2, _ = oyna("dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})")
    esit(s.js('kayit.seri.gun'), 1, 'B: aynı gün seri iki kez arttı')
    kaz3, _ = oyna('stBaslat()', 0.3)
    s.js(f'window.__ileri += {GUN_MS}; acilisAc()'); esit((s.js('bugunXp()'), s.js('kayit.seri.gun')), (0, 1), 'B: ertesi gün')
    dogru('1 gün seri' in s.js('card.innerText') and '/20' in s.js('card.innerText'), 'B: açılışta halka/seri yok')
    oyna("dojoBaslat(rakipBul('A1-1'))"); esit(s.js('kayit.seri.gun'), 2, 'B: ikinci gün seri')
    s.js(f"document.getElementById('not').textContent = ''; window.__ileri += {3 * GUN_MS}; acilisAc()")
    esit(s.js('kayit.seri.gun'), 0, 'B: iki gün kaçınca seri bitmedi'); dogru('serin bitti' in bildirim(s), 'B: seri bitti uyarısı yok')
    s.js('kayit.seri = { gun: 6, enUzun: 6, sonGun: gunEkle(bugunAnahtar(), -1), dondurma: 0, donan: [] }; kaydet()')
    oyna("dojoBaslat(rakipBul('A1-1'))"); esit((s.js('kayit.seri.gun'), s.js('kayit.seri.dondurma')), (7, 1), 'B: 7. gün dondurma')
    dogru('seri dondurma kazandın' in s.js('card.innerText'), 'B: dondurma kutlaması yok')
    s.js(f"document.getElementById('not').textContent = ''; window.__ileri += {2 * GUN_MS}; acilisAc()")
    esit((s.js('kayit.seri.gun'), s.js('kayit.seri.dondurma'), s.js('kayit.seri.donan.length')), (7, 0, 1), 'B: dondurma kullanımı')
    dogru('Seri dondurma kullanıldı' in bildirim(s), 'B: dondurma uyarısı yok')
    once = s.js('({xp: kayit.xp, seri: kayit.seri, gun: kayit.gunluk})'); s.pg.reload(); s.bekle()
    esit(s.js('({xp: kayit.xp, seri: kayit.seri, gun: kayit.gunluk})'), once, 'B: yeniden açılınca ilerleme')
    # gece yarısı: 23:59:50'de kazanılan XP o güne, 00:00:10'dakiler yeni güne yazılır
    s.js("window.__ileri += (() => { const d = new Date(Date.now()), y = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 50); return y.getTime() - d.getTime(); })(); 0")
    g1 = s.js('bugunAnahtar()'); s.js('xpEkle(7)'); s.js('window.__ileri += 20000; 0'); g2 = s.js('bugunAnahtar()'); s.js('xpEkle(3)')
    esit((g1 != g2, s.js(f"kayit.gunluk.gunler['{g1}']") >= 7, s.js('bugunXp()')), (True, True, 3), 'B: gece yarısı')
    # hedef değiştirme: bugünkü XP yeni hedefi aşıyorsa bugün sayılır
    s.js("kayit.seri = { gun: 2, enUzun: 9, sonGun: gunEkle(bugunAnahtar(), -1), dondurma: 0, donan: [] }; hedefSec(100); xpEkle(18)")
    esit(s.js('kayit.seri.gun'), 2, 'B: hedef 100 iken seri arttı'); s.js('hedefSec(20)'); esit(s.js('kayit.seri.gun'), 3, 'B: hedef düşürülünce bugün sayılmadı')
    esit(s.hatalar(), [], 'B: JS hataları'); s.kapat()
    # C) ses kapalıyken: XP paneli ve kutlama yazıyla tam
    s = Sayfa(b, init=[SAAT]); s.js("kayit.ayar.muzik = false; kayit.ayar.efekt = false; kayit.ayar.ses = false; kayit.ayar.trSes = false; Ses.ayarla(); hedefSec(20)")
    s.js("dojoBaslat(rakipBul('A1-1'))"); s.js("__ff(900, 0.05, () => G.state === 'over' && ekran === 'sonuc')")
    t = s.js('card.innerText'); dogru('XP' in t and 'GÜNLÜK HEDEF TAMAM' in t and s.js("!!document.querySelector('.xp-panel.kutla .halka')"), 'C: sessizde görsel eksik')
    esit(s.hatalar(), [], 'C: JS hataları'); s.kapat()
    # D) bozuk ilerleme kaydı onarılır
    bozuk = dict(IYI_KAYIT, xp='çok', gunluk={'hedef': 33, 'gunler': {'2026-11-20': 40, 'dün': 5, '2026-11-19': -3}}, seri={'gun': 5, 'enUzun': 2, 'sonGun': 'x', 'dondurma': 9})
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': bozuk})])
    esit((s.js('kayit.xp'), s.js('kayit.gunluk'), s.js('kayit.seri.gun'), s.js('kayit.seri.dondurma')), (0, {'hedef': 50, 'gunler': {'2026-11-20': 40}}, 0, 2), 'D: ilerleme onarımı')
    dogru('bozuktu' in bildirim(s), 'D: uyarı yok'); esit(s.hatalar(), [], 'D: JS hataları'); s.kapat()
    return f'seri kuralları 11/11; bölüm {kaz} XP, paket {kaz2} XP, seviye testi {kaz3} XP (olaylarla birebir); gün atlama, dondurma, gece yarısı, sessiz mod, onarım tamam'

# ---------------------------------------------------------------- ilk 60 saniye (ilk.js)
ADIM = "window.__adim = (sec, dur) => { for (let s = 0; s < sec; s += 0.05) { update(0.05); draw(); if (dur && dur()) return +G.t.toFixed(2); } return null; };"
KOC = "document.getElementById('koc').textContent"
ELLE = [ADIM, 'window.requestAnimationFrame = () => 0;']   # zamanı test ilerletir; kimse oynamaz

def ilk_bas(s):
    """Karşılamadan rehberli cümleyi başlatır; karolar tahtaya yağınca dokunuştan bu yana geçen oyun saniyesini döndürür."""
    s.pg.tap('#ilk-bas'); t0 = s.js('G.t')
    t1 = s.js('__adim(20, () => G.R && G.R.tahtaHazir && !G.T.hareket)'); dogru(t1, 'karolar hiç yağmadı')
    return t0, t1 - t0
HUCRE = "(h => { const p = hucreMerkez(h.r, h.c); return [p.x, p.y]; })"
def surukle(s, a, b):
    """Karoyu parmakla tutup başka hücreye sürükler (dokunmayla aynı olaylar: pointerdown → pointermove → pointerup)."""
    x1, y1 = s.js(f'{HUCRE}({json.dumps(a)})'); x2, y2 = s.js(f'{HUCRE}({json.dumps(b)})')
    s.pg.mouse.move(x1, y1); s.pg.mouse.down(); s.pg.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, steps=3); s.pg.mouse.move(x2, y2, steps=3); s.pg.mouse.up()

@test
def ilk(b):
    """İlk 60 saniye: profil yokken rehberli ilk cümle; karolar hızlı gelir, ilk kelime sol başta hazırdır, el işareti yol gösterir;
    yanlış kelimeyi dizinin sonuna koymak cezasız engellenir; sürükleyerek ve iki karoya dokunarak yerleştirilir; ilk XP isimle açılan profile geçer;
    günlük hedef; çıkış, geri ve eski kayıt yolları."""
    s = Sayfa(b, 360, 640, profil=False, init=ELLE)
    esit(s.js('ekran'), 'ilkKarsila', 'A: hiç profil yokken ilk ekran')
    s.foto('ilk_1_karsila')
    t0, ilk_sn = ilk_bas(s)
    dogru(ilk_sn <= 8, f'A: karolar {ilk_sn} sn sonra geldi')
    r = s.js("""({ icerik: cumleler(seviyeRakipleri('A1')[0].id).includes(G.R.s), n: hedefDizi(G.R).length, mod: bolumModu(), bas: G.T.h[G.T.rows - 2][0].txt, ilk: hedefDizi(G.R)[0],
      capa: G.T.h[G.T.rows - 2][0].id === G.R.capa, zincir: G.R.zincir && G.R.zincir.k, tr: karolar(G.T).some(k => /[çğıöşüÇĞİÖŞÜ]/.test(k.txt)), sure: G.R.sure, cel: G.R.cel.length })""")
    dogru(r['icerik'] and r['n'] in (3, 4), f'A: cümle ilk bölümün kısa bir cümlesi değil: {r}')
    esit((r['bas'] == r['ilk'], r['capa'], r['zincir'], r['mod'], r['sure'], r['cel'], r['tr']), (True, True, 1, 'ilk', 0, 0, False), 'A: ilk kelime sol başta hazır; süre, tuzak ve Türkçe karo yok')
    sat = s.js('G.T.rows - 2')
    # B) el işareti hemen: sıradaki kelimeden dizinin sonuna; koç yol gösterir, Türkçe cümleyi kapatmaz
    s.js('__adim(1)')
    ip = s.js('G.ipucu && G.ipucu.h'); dogru(ip and ip.get('a') and ip.get('b'), f'B: el işareti yok: {ip}')
    esit((s.js(f"G.T.h[{ip['a']['r']}][{ip['a']['c']}].txt"), ip['b']), (s.js('hedefDizi(G.R)[1]'), {'r': sat, 'c': 1}), 'B: el işareti sıradaki kelimeyi göstermiyor')
    dogru('kelimesini tut' in s.js(KOC), 'B: koç yazısı yok'); dogru(s.js("document.getElementById('koc').classList.contains('show')"), 'B: koç görünmüyor')
    pb = s.js('G.promptBox'); kr = s.js("document.getElementById('koc').getBoundingClientRect().toJSON()")
    dogru(kr['top'] >= pb['y'] + pb['h'], f'B: koç Türkçe cümleyi kapatıyor: {kr} {pb}')
    s.foto('ilk_2_el')
    # C) yanlış kelimeyi dizinin sonuna koymak engellenir: karo geri seker; ceza, gösterge, hata defteri yok
    yan = s.js("(() => { const k = karolar(G.T, q => !q.zincir && q.txt !== hedefDizi(G.R)[1])[0]; return { r: k.r, c: k.c }; })()")
    surukle(s, yan, {'r': sat, 'c': 1}); s.js('__adim(0.6)')
    esit(s.js('G.R.zincir.k'), 1, 'C: yanlış kelime diziye girdi'); dogru('buraya gelmez' in s.js(KOC), 'C: uyarı yok')
    esit((s.js('D.istat.yanlis'), s.js('G.hata'), s.js('kayit.tekrar.length'), s.js('D.hatalar.length')), (0, 0, 0, 0), 'C: ceza verildi')
    # D) doğru kelimeyi sürükleyince dizi uzar
    ip = s.js('ipucuHamle(G.R)'); surukle(s, ip['a'], ip['b']); s.js('__adim(0.4)')
    esit((s.js('G.R.zincir && G.R.zincir.k'), s.js('D.istat.dogru')), (2, 1), 'D: sürükleyerek yerleşmedi')
    # E) sonraki kelime: önce el işareti yok (oyuncu düşünür), 2,5 sn sonra gelir
    n = r['n']
    if n > 2:
        s.js('__adim(0.5)')
        dogru('Sıradaki kelime' in s.js(KOC) and not s.js('!!G.ipucu'), 'E: ikinci kelimede hemen ipucu verildi')
        s.js('__adim(2.4)'); dogru('İpucu' in s.js(KOC) and s.js('!!G.ipucu'), 'E: 2,5 sn sonra ipucu yok')
    # F) kalan kelimeler iki karoya sırayla dokunarak (dokun-dokun)
    for _ in range(4):
        if not s.js("ekran !== 'ilkSonuc' && !!G.R && !G.R.bitti"): break
        ip = s.js('ipucuHamle(G.R)')
        for h in (ip['a'], ip['b']):
            x, y = s.js(f'{HUCRE}({json.dumps(h)})'); s.pg.touchscreen.tap(x, y); s.js('__adim(0.1)')
        s.js('__adim(0.5)')
    dogru(s.js("__adim(6, () => !!dzAcik)") and 'happy' in s.js("document.getElementById('dizilis').innerText"), 'F: İngilizce dizilişi kartı çıkmadı')
    s.pg.tap('#dizilis')
    dogru(s.js("__adim(20, () => ekran === 'ilkSonuc')"), 'F: sonuç ekranı açılmadı')
    # G) sonuç: kusursuz, +6 XP (cümle 4 + hatasız 2), halka; profil ve kalıcı kayıt henüz yok, yarım kayıt yok
    esit((s.js('D.istat.yanlis'), s.js('D.istat.kusursuz'), s.js('D.ilerleme.xp'), s.js('D.ilerleme.bugun')), (0, 1, 6, 6), 'G: sonuç')
    t = s.js('card.innerText'); dogru('+6 XP' in t and s.js("!!card.querySelector('.halka')") and s.js('G.R') is None, 'G: XP/halka yok')
    esit((s.js('profiller.liste.length'), s.js("Object.keys(localStorage).filter(k => /^te_(profil|yarim)/.test(k))")), (0, []), 'G: isim yazılmadan kayıt yazıldı')
    s.pg.wait_for_timeout(200); s.foto('ilk_3_sonuc')
    s.pg.tap('#i-kaydet'); s.pg.wait_for_timeout(150)
    dogru(len(bildirim(s)) > 0 and s.js('ekran') == 'ilkSonuc', 'G: boş isim kabul edildi')
    s.pg.tap('#i-ad'); s.pg.keyboard.type('Ayşe'); s.pg.keyboard.press('Enter'); s.pg.wait_for_timeout(300)
    esit((s.js('ekran'), s.js('aktifProfil().ad'), s.js('kayit.xp'), s.js('bugunXp()')), ('ilkHedef', 'Ayşe', 6, 6), 'G: XP yeni profile geçmedi')
    yan = s.js("({ rehber: kayit.rehber, tutGor: kayit.tutGor, baslangic: kayit.baslangic, yildiz: kayit.yildiz, best: kayit.best, dojo: kayit.istat.dojo, zafer: kayit.istat.zafer, tekrar: kayit.tekrar.length, acik: kayit.acik, kel: Object.keys(kayit.kel).length })")
    esit(yan, {'rehber': False, 'tutGor': False, 'baslangic': None, 'yildiz': {}, 'best': 0, 'dojo': 0, 'zafer': 0, 'tekrar': 0, 'acik': {'A1-1': True}, 'kel': 0}, 'G: rehber cümle kariyer kaydını değiştirdi')
    esit(s.js("JSON.parse(localStorage.getItem('te_profil_' + profiller.aktif)).xp"), 6, 'G: XP kalıcı hafızaya yazılmadı')
    s.foto('ilk_4_hedef')
    # H) günlük hedef → seviye seçimi; yeniden açılınca açılış ekranında halka 6/20
    s.pg.tap('.secim[data-hedef="20"]'); s.pg.wait_for_timeout(250)
    esit((s.js('ekran'), s.js('kayit.gunluk.hedef')), ('ilk', 20), 'H: hedef seçimi')
    s.pg.reload(); s.bekle(); s.pg.wait_for_timeout(200)
    t = s.js('card.innerText'); dogru(s.js('ekran') == 'acilis' and '6' in t and '/20' in t, 'H: açılışta halka 6/20 değil')
    esit(s.hatalar(), [], 'JS hataları'); s.kapat()
    # I) hızlı oynayan biri: karolar yağdıktan sonra sonuç ekranına kadar
    s = Sayfa(b, 390, 844, profil=False, init=ELLE)
    t0, _ = ilk_bas(s)
    hizli = s.js("""__adim(60, () => { if (dzAcik) dzAcik.kapat(); if (G.R && !G.R.bitti && hamleSerbest()) { const h = ipucuHamle(G.R); if (h) hamle(h.a, h.b); }
                    return ekran === 'ilkSonuc'; })""")
    dogru(hizli and hizli - t0 <= 30, f'I: rehberli cümle {hizli and hizli - t0} sn sürdü'); sure = round(hizli - t0, 1)
    # J) duraklat → çık: karşılamaya döner; rehberi geç → isim formu → geri: karşılama; Escape karşılamada bir şey yapmaz
    s.js("ilkKarsila()"); s.pg.tap('#ilk-bas'); s.js('__adim(3)')
    s.js('togglePause()'); s.pg.tap('#p-cik'); s.pg.wait_for_timeout(200)
    esit((s.js('ekran'), s.js('D'), s.js('G.state'), s.js(KOC)), ('ilkKarsila', None, 'menu', ''), 'J: duraklatıp çıkınca')
    s.pg.keyboard.press('Escape'); esit(s.js('ekran'), 'ilkKarsila', 'J: Escape')
    s.pg.tap('#ilk-gec'); s.pg.wait_for_timeout(150); esit(s.js('ekran'), 'profilYeni', 'J: rehberi geç')
    s.pg.tap('#p-rehber'); s.pg.wait_for_timeout(150); esit(s.js('ekran'), 'ilkKarsila', 'J: isim formundan geri')
    s.pg.tap('#ilk-gec'); s.pg.wait_for_timeout(150); s.pg.keyboard.press('Escape'); esit(s.js('ekran'), 'ilkKarsila', 'J: isim formunda Escape')
    esit(s.hatalar(), [], 'J: JS hataları'); s.kapat()
    # K) profili olan telefonda karşılama yok; son profil silinince karşılama yeniden gelir
    s = Sayfa(b)
    esit(s.js('ekran'), 'acilis', 'K: profil varken açılış'); s.js('profilSil(profiller.aktif); profilsizAc()'); esit(s.js('ekran'), 'ilkKarsila', 'K: son profil silinince')
    esit(s.hatalar(), [], 'K: JS hataları'); s.kapat()
    return f'karolar {ilk_sn:.1f} sn sonra yağdı; hızlı oyuncu {sure} sn\'de bitirdi; engeller cezasız; sürükleme ve dokun-dokun; +6 XP profile geçti; hedef 20 → halka 6/20'

# ---------------------------------------------------------------- ünite haritası (harita.js)
# A1: ilk ünite (6 bölüm) bitmiş, 2. ünitede 2 bölüm bitmiş, 3. bölüm sıradaki; ilk paket yarı öğrenilmiş, ikinci açık
HARITA_ILER = """(() => { kayit.baslangic = 'A1'; kayit.rehber = true; kayit.tutGor = true; kayit.ders = {};
  const l = seviyeRakipleri('A1'); for (let i = 0; i < 8; i++) { kayit.yildiz[l[i].id] = [3,2,3,1,3,3,2,3][i]; kayit.acik[l[i].id] = true; } kayit.acik[l[8].id] = true;
  const p = seviyePaketleri('A1'); kayit.acik[p[0].id] = true; kayit.yildiz[p[0].id] = 2; paketKelimeleri(p[0].id).forEach((w, i) => kayit.kel[w.k] = [i % 3 ? 2 : 1, 0, 0]); kayit.acik[p[1].id] = true;
  paketKelimeleri(p[1].id).slice(0, 4).forEach(w => kayit.kel[w.k] = [1, 0, 0]); kaydet(); })()"""
# Ekranda yerleşim sorunları: taşma, yazı kutusu yolun dışında ya da kendi dairesinin üstünde
YERLESIM = """(() => { const sorun = [], y = [...document.querySelectorAll('#liste .yol')];
  if (card.scrollWidth > card.clientWidth + 1) sorun.push('yatay taşma ' + card.scrollWidth + '>' + card.clientWidth);
  y.forEach(yol => { const Y = yol.getBoundingClientRect();
    yol.querySelectorAll('.dugum').forEach(d => { const el = d.querySelector('.etiket'), e = el.getBoundingClientRect(), t = d.querySelector('.top').getBoundingClientRect(), mw = (el.classList.contains('sol') ? t.left - Y.left : Y.right - t.right) - 14;   // yazının sığabileceği genişlik
      if (e.left < Y.left - 1 || e.right > Y.right + 1 || t.left < Y.left - 1 || t.right > Y.right + 1) sorun.push(d.dataset.id + ' yolun dışında');
      if (e.right > t.left + 1 && e.left < t.right - 1) sorun.push(d.dataset.id + ' yazı daireyi kapatıyor');
      if (!(mw >= 110)) sorun.push(d.dataset.id + ' yazıya ayrılan yer dar ' + Math.round(mw)); }); });
  return sorun; })()"""

@test
def harita(b):
    """Ünite haritası: 20 seviyenin yolu içerikle birebir (ünite, bölüm, paket sırası); kilit/yıldız/sıradaki kayıtla aynı;
    durağa ve yazısına dokununca eski akış; kilitli durak uyarısı; ünite dersi kısayolu; ünite tamam kutlaması bir kez;
    3 ekran boyutunda taşma ve çakışma yok; İngilizce."""
    s = Sayfa(b, 360, 640)
    # A) her seviye ve iki sekme: duraklar içerikle aynı sırada, üniteler bölgelerle aynı, yerleşim sorunsuz
    s.js("kayit.baslangic = 'A1'; haritaAc('A1')")
    r = s.js("""(() => { const out = {};
      for (const l of [...SEVIYELER, ...SINAVLAR, ...HAYATLAR]) { aktifLvlK = l;
        aktifYol = 'cumle'; listeCiz();
        const ids = [...document.querySelectorAll('#liste .dugum')].map(d => d.dataset.id), adlar = [...document.querySelectorAll('#liste .unite .u-ad')].map(e => e.textContent);
        const bolgeler = []; seviyeRakipleri(l).forEach(r => { const b = bolgeAd(r.bolge); if (bolgeler[bolgeler.length - 1] !== b) bolgeler.push(b); });
        aktifYol = 'kelime'; listeCiz();
        const pids = [...document.querySelectorAll('#liste .dugum')].map(d => d.dataset.id), gruplar = [...document.querySelectorAll('#liste .yol')].map(y => y.querySelectorAll('.dugum').length);
        out[l] = { cumle: JSON.stringify(ids) === JSON.stringify(seviyeRakipleri(l).map(r => r.id)), unite: JSON.stringify(adlar) === JSON.stringify(bolgeler),
                   paket: JSON.stringify(pids) === JSON.stringify(seviyePaketleri(l).map(p => p.id)), grup: Math.max(0, ...gruplar) <= 6, n: ids.length, u: adlar.length, p: pids.length }; }
      return out; })()""")
    kotu = {l: v for l, v in r.items() if not (v['cumle'] and v['unite'] and v['paket'] and v['grup'])}
    esit(kotu, {}, 'A: yol içerikle aynı değil')
    esit((r['A1']['n'], r['A1']['u'], r['A1']['p']), (21, 6, 27), 'A: A1 yolu')
    for w, h in ((360, 640), (320, 568), (844, 390)):
        s.pg.set_viewport_size({'width': w, 'height': h}); s.pg.wait_for_timeout(100); sorun = []
        for l in ('A1', 'B2', 'C1', 'TOEFL', 'LGS', 'TALK'):
            for yol in ('cumle', 'kelime'): sorun += [f'{w}x{h} {l} {yol}: ' + x for x in s.js(f"(() => {{ aktifLvlK = '{l}'; aktifYol = '{yol}'; listeCiz(); return {YERLESIM}; }})()")]
        esit(sorun[:8], [], f'A: yerleşim {w}x{h}')
    s.pg.set_viewport_size({'width': 360, 'height': 640})
    esit(s.hatalar(), [], 'A: JS hataları'); s.kapat()
    # B) durumlar kayıtla aynı: ünite 1 tamam, ünite 2 aktif (ders kısayolu), sonrası kilitli; tek sıradaki ve ekranda
    s = Sayfa(b, 360, 640); s.js(HARITA_ILER); s.js("aktifYol = 'cumle'; haritaAc('A1')"); s.pg.wait_for_timeout(250)
    st = s.js("""(() => ({ unite: [...document.querySelectorAll('#liste .unite')].map(u => u.className.replace('unite', '').trim() || '-'),
      ders: [...document.querySelectorAll('#liste .unite')].map(u => !!u.querySelector('.u-ders')),
      bitti: [...document.querySelectorAll('.dugum.bitti')].map(d => d.dataset.id), kilit: [...document.querySelectorAll('.dugum.kilit')].length,
      sira: [...document.querySelectorAll('.dugum.sira')].map(d => d.dataset.id), beklenen: siradakiBolum('cumle', 'A1').id,
      yildiz: [...document.querySelectorAll('.dugum.bitti')].map(d => d.querySelectorAll('.yz i').length), kayitY: Object.values(kayit.yildiz).slice(0, 8),
      kilitBeklenen: seviyeRakipleri('A1').filter(r => !rakipAcikMi(r)).length,
      aria: document.querySelector('.dugum.sira .top').getAttribute('aria-label'),
      gorunur: (() => { const a = document.querySelector('.dugum.sira .top').getBoundingClientRect(), c = card.getBoundingClientRect(); return a.top >= c.top && a.bottom <= c.bottom; })() }))()""")
    esit(st['unite'], ['tamam', 'aktif', 'kilit', 'kilit', 'kilit', 'kilit'], 'B: ünite durumları')
    esit(st['ders'], [True, True, False, False, False, False], 'B: ders kısayolu')
    esit((st['sira'], len(st['bitti']), st['kilit'], st['yildiz']), ([st['beklenen']], 8, st['kilitBeklenen'], [3, 2, 3, 1, 3, 3, 2, 3]), 'B: duraklar')
    dogru('sıradaki' in st['aria'] and st['gorunur'], f'B: sıradaki durak ekranda değil / erişilebilir adı yok: {st}')
    dogru('ÜNİTE 1' in s.js('card.innerText') and 'TAMAMLANDI' in s.js('card.innerText') and 'BAŞLA' in s.js("document.querySelector('.dugum.sira').innerText"), 'B: yazılar')
    s.foto('harita_1')
    # C) dokunma: kilitli durak uyarır; sıradaki durak eski akışla (önce ders) aynı bölümü açar; bitmiş bölümün yazısına dokunmak da açar
    kilitli = s.js("document.querySelector('.dugum.kilit').dataset.id")
    s.pg.tap(f'.dugum[data-id="{kilitli}"] .top'); s.pg.wait_for_timeout(150)
    esit((s.js('ekran'), bildirim(s), s.js('D')), ('harita', 'Önce bir önceki bölümü bitir.', None), 'C: kilitli durak')
    s.pg.tap('.dugum.sira .top'); s.pg.wait_for_timeout(200)
    dogru(s.js('ekran') == 'ders' and s.js("document.querySelector('.ders-dunya').textContent === rakipBul(siradakiBolum('cumle','A1').id).world"), 'C: sıradaki durak dersi açmadı')
    s.pg.tap('#d-git'); s.pg.wait_for_timeout(200); esit(s.js('D && D.r.id'), st['beklenen'], 'C: sıradaki durak başka bölüm açtı')
    s.js("haritaAc('A1')"); s.pg.wait_for_timeout(200)
    ilk = s.js("seviyeRakipleri('A1')[0].id"); s.js(f"""document.querySelector('.dugum[data-id="{ilk}"]').scrollIntoView({{block: 'center'}})"""); s.pg.wait_for_timeout(100)
    s.pg.tap(f'.dugum[data-id="{ilk}"] .etiket'); s.pg.wait_for_timeout(200)
    dogru(s.js('ekran') in ('ders', None) or s.js('D && D.r.id') == ilk, 'C: yazıya dokunmak bölümü açmadı')
    if s.js('ekran') == 'ders': s.pg.tap('#d-git'); s.pg.wait_for_timeout(200)
    esit(s.js('D && D.r.id'), ilk, 'C: bitmiş bölüm')
    # ünite dersi kısayolu: ünite 2'nin sıradaki bölümünün dersi; Geri haritaya döner
    s.js("haritaAc('A1')"); s.pg.wait_for_timeout(200); s.js("document.querySelectorAll('.u-ders')[1].scrollIntoView({block: 'center'})"); s.pg.wait_for_timeout(100)
    s.pg.tap(':nth-match(.u-ders, 2)'); s.pg.wait_for_timeout(200)
    dogru(s.js('ekran') == 'ders' and s.js("document.querySelector('.ders-dunya').textContent === rakipBul(siradakiBolum('cumle','A1').id).world"), 'C: ünite dersi')
    s.pg.tap('#d-geri'); s.pg.wait_for_timeout(200); esit((s.js('ekran'), s.js('D')), ('harita', None), 'C: dersten geri')
    # D) kelime yolu: halka oranı öğrenilen/toplam; kilitli paket uyarısı aynı; sıradaki paket açılır
    s.js("aktifYol = 'kelime'; listeCiz()"); s.pg.wait_for_timeout(150)
    k = s.js("""(() => { const p = seviyePaketleri('A1'), q = paketIlerleme(p[0]);
      return { o: document.querySelector(`.dugum[data-id="${p[0].id}"]`).style.getPropertyValue('--o'), b: String(Math.round(q.ogrenilen / q.toplam * 100)),
               sira: document.querySelector('.dugum.sira').dataset.id, p1: p[1].id, kilit: p[2].id, grup: document.querySelector('#liste .u-ad').textContent }; })()""")
    esit((k['o'], k['sira'], k['grup']), (k['b'], k['p1'], 'Konu paketleri'), 'D: paket halkası / sıradaki / grup adı')
    s.js(f"""document.querySelector('.dugum[data-id="{k['kilit']}"]').scrollIntoView({{block: 'center'}})"""); s.pg.wait_for_timeout(100)
    s.pg.tap(f'.dugum[data-id="{k["kilit"]}"] .top'); s.pg.wait_for_timeout(150)
    dogru(s.js('ekran') == 'harita' and 'paketini bitir' in bildirim(s), 'D: kilitli paket uyarısı')
    s.js("document.querySelector('.dugum.sira').scrollIntoView({block: 'center'})"); s.pg.tap('.dugum.sira .top'); s.pg.wait_for_timeout(200)
    esit((s.js('D && D.r.id'), s.js('!!(D && D.kelime)')), (k['p1'], True), 'D: sıradaki paket')
    esit(s.hatalar(), [], 'B-D: JS hataları'); s.kapat()
    # E) ünite tamam: 2. ünitenin ara sınavı ilk kez kazanılınca bir kez kutlanır; tekrar oynayınca kutlanmaz; seviye sınavı seviyeyi bitirir
    s = Sayfa(b); s.js(HARITA_ILER); s.js("const l = seviyeRakipleri('A1'); kayit.yildiz[l[8].id] = 2; kayit.acik[l[9].id] = true; kaydet()"); s.js(OLAY_KAYITCI)
    def oyna(i):
        s.js('__olay.length = 0'); s.js(f"dojoBaslat(seviyeRakipleri('A1')[{i}])")
        r = s.js("__ff(900, 0.02, () => G.state === 'over' && ekran === 'sonuc')"); dogru(r['done'], f'E: bölüm {i} bitmedi')
        return s.js('card.innerText'), [v for a, v in s.js('__olay') if a == 'uniteTamam'], s.js('D.kazandi')
    t, ol, kaz = oyna(9)
    dogru(kaz, 'E: ara sınav kaybedildi (bot)')
    dogru('ÜNİTE 2 TAMAM' in t and 'Ev ve eşyalar' in t and 'Sıradaki ünite: Okul ve günlük hayat' in t, f'E: kutlama yok: {t[:300]}')
    esit([(o['lvl'], o['unite'], o['seviyeBitti']) for o in ol], [('A1', 2, False)], 'E: uniteTamam olayı')
    s.foto('harita_2_unite_tamam')
    t, ol, _ = oyna(9); dogru('ÜNİTE' not in t and not ol, 'E: ikinci kez kutlandı')
    t, ol, _ = oyna(10); dogru('ÜNİTE' not in t and not ol, 'E: ünite bitmeden kutlandı')
    s.js("seviyeRakipleri('A1').slice(0, 20).forEach(r => { kayit.yildiz[r.id] = kayit.yildiz[r.id] || 1; kayit.acik[r.id] = true; }); kayit.acik[seviyeRakipleri('A1')[20].id] = true; kaydet()")
    t, ol, kaz = oyna(20); seviye_sonu = 'seviye sonu kutlandı' if kaz else 'seviye sınavını bot kaybetti, seviye sonu denenmedi'
    if kaz: dogru('A1 seviyesinin bütün üniteleri bitti!' in t and ol and ol[0]['seviyeBitti'], f'E: seviye sonu: {t[:300]}')
    s.js("haritaAc('A1')"); s.pg.wait_for_timeout(200)
    dogru(s.js("[...document.querySelectorAll('#liste .unite')].slice(0, 2).every(u => u.classList.contains('tamam'))"), 'E: haritada ünite 2 tamam değil')
    esit(s.hatalar(), [], 'E: JS hataları'); s.kapat()
    # F) İngilizce arayüz
    s = Sayfa(b, 360, 640, init=["localStorage.setItem('te_dil', 'en')"]); s.js(HARITA_ILER); s.js("aktifYol = 'cumle'; haritaAc('A1')"); s.pg.wait_for_timeout(200)
    t = s.js('card.innerText'); a = s.js("document.querySelector('.dugum.kilit .top').getAttribute('aria-label')")
    dogru(all(x in t for x in ('UNIT 1', '✓ COMPLETE', 'START', '6 / 6 chapters', '📖 Lesson')) and a.endswith('locked'), f'F: İngilizce eksik: {a}')
    dogru(not any(x in t for x in ('ÜNİTE', 'BAŞLA', 'TAMAMLANDI', ' bölüm')), 'F: Türkçe arayüz yazısı kaldı')
    esit(s.hatalar(), [], 'F: JS hataları'); s.kapat()
    return f"20 seviye içerikle birebir (A1: {r['A1']['u']} ünite, {r['A1']['n']} bölüm, {r['A1']['p']} paket); 3 ekranda yerleşim temiz; durumlar, dokunma, ders kısayolu, ünite kutlaması ({seviye_sonu}), İngilizce tamam"

# ---------------------------------------------------------------- İngilizce dizilişi kartı (dizilis.js)
DZ_SAYAC = "window.__dzSay = 0; (() => { const o = dizilisGoster; window.dizilisGoster = function () { window.__dzSay++; return o.apply(this, arguments); }; })(); 0"
DZ_YER = "(() => { const r = document.querySelector('#dizilis .dz-kart').getBoundingClientRect(); return [r.top >= 0, r.left >= 0, r.right <= innerWidth + 0.5, r.bottom <= innerHeight + 0.5]; })()"
DZ_ACIK = "!!document.querySelector('#dizilis.acik')"

def dz_bekle(s, sn=150):
    """Kart açılana kadar oynar (bölüm biterse A1'in sıradaki bölümünü başlatır); giriş animasyonunu bekler."""
    for i in range(4):
        s.js(f"__ff({sn}, 0, () => !!dzAcik || G.state === 'over' || !D)")
        if s.js('!!dzAcik'):
            s.pg.wait_for_function("document.querySelector('#dizilis .dz-kart').getAnimations().length === 0", timeout=5000)
            return s.js('G.R.s.en')
        s.js(f"dojoBaslat(seviyeRakipleri('A1')[{3 + i}])")
    raise AssertionError('diziliş kartı açılmadı')

@test
def dizilis_birim(b):
    """İngilizce dizilişi eşleştiricisi (yüklenen sürümün birim testi): 10 örnek cümle SVOPT sırasıyla, bütün içerikte her parçada görev ve Türkçe, kapsama."""
    r = subprocess.run(['node', '--test', os.path.join(DIR, 'dizilis.test.mjs')], capture_output=True, text=True, timeout=300)
    cik = r.stdout + r.stderr
    dogru(r.returncode == 0 and '# pass 3' in cik and '# fail 0' in cik, cik[-1500:])
    k = [x for x in cik.splitlines() if 'kapsama' in x]
    return '3 / 3; ' + (k[0].split('kapsama', 1)[1].strip() if k else '')

@test
def dizilis(b):
    """İngilizce dizilişi (SVOPT) kartı, yüklenen sürümdeki gibi: cümle kurulunca açılır; her parçada görev, İngilizce, İngilizce sırayla Türkçe;
    Türkçe sıralı satır yok; oyun bekler, dokunulmadıkça kalır; Dinle kapatmaz; dokunma, Enter, boşluk, ↓ ve tahta alanına dokunma kapatır; Escape duraklatır;
    çıkınca kalkar; ayar kapatır; online'da ve seviye testinde çıkmaz; B2'de de çıkar; hazır diziliş kullanılır; ayar kalıcı; 3 ekran; İngilizce."""
    s = Sayfa(b, 390, 844); s.js("window.__dzElle = true; kayit.tutGor = true; kaydet()"); s.js(OLAY_KAYITCI); s.js(DZ_SAYAC)
    s.js("dojoBaslat(rakipBul('A1-1'))")
    en = dz_bekle(s)
    bi = s.js("""({ rol: [...document.querySelectorAll('.dz-p em')].map(x => x.textContent), en: [...document.querySelectorAll('.dz-p b')].map(x => x.textContent),
      tr: [...document.querySelectorAll('.dz-p span')].map(x => x.textContent), turkceSatir: !!document.querySelector('.dz-tr'),
      bas: document.querySelector('.dz-bas span').textContent, alt: document.querySelector('.dz-alt').textContent,
      beklenen: dizilisCumle(G.R.s).parcalar.map(p => p.en), kelimeler: tokenle(G.R.s.en).join(' ').toLowerCase() })""")
    # A) her parçada görev, İngilizce, Türkçe; parçalar art arda cümlenin kendisi; Türkçe sıralı satır yok
    dogru(len(bi['en']) >= 2 and len(bi['rol']) == len(bi['en']) == len(bi['tr']) and all(bi['tr']), f'A: parçalar: {bi}')
    esit((bi['en'], ' '.join(bi['en']).lower(), bi['turkceSatir']), (bi['beklenen'], bi['kelimeler'], False), 'A: parçalar cümleyle aynı değil / Türkçe satır var')
    esit((bi['bas'], bi['alt']), ('İNGİLİZCE DİZİLİŞİ', 'Devam etmek için dokun'), 'A: başlık / alt yazı')
    esit(s.js(DZ_YER), [True, True, True, True], 'A: kart ekranda')
    s.foto('dizilis_1')
    # B) kart açıkken oyun bekler: 20 sn sonra da yeni tur yok (biten tur bitmiş kalır), kart açık
    ti = s.js('D.ti'); s.js('__olay.length = 0'); s.js('__ff(20, 0)')
    esit((s.js('D.ti'), s.js('G.R.bitti'), s.js(DZ_ACIK), [a for a, _ in s.js('__olay')].count('turBasladi')), (ti, True, True, 0), 'B: kart açıkken oyun ilerledi')
    # C) Dinle düğmesi kartı kapatmaz; D) karta dokununca kapanır, sonraki tur başlar
    s.pg.tap('.dz-dinle'); s.pg.wait_for_timeout(100); esit(s.js(DZ_ACIK), True, 'C: Dinle kartı kapattı')
    s.pg.tap('#dizilis'); esit(s.js(DZ_ACIK), False, 'D: dokununca kapanmadı')
    dogru(s.js("__ff(12, 0, () => D.ti > %d)" % ti)['done'], 'D: kapandıktan sonra sonraki tur başlamadı')
    # E) diğer kapatma yolları: Enter, boşluk, ↓ ve tahtanın olduğu yere dokunma (kart bütün ekranı kaplar)
    yollar = []
    for ad, kapat in (('Enter', lambda: s.pg.keyboard.press('Enter')), ('boşluk', lambda: s.pg.keyboard.press(' ')), ('↓', lambda: s.pg.keyboard.press('ArrowDown')),
                      ('tahta alanı', lambda: s.pg.touchscreen.tap(*s.js("[G.T.x + G.T.cols * G.T.cw / 2, G.T.y + G.T.rows * G.T.ch / 2]")))):
        dz_bekle(s); kapat(); s.pg.wait_for_timeout(60)
        esit((s.js(DZ_ACIK), s.js('G.state'), s.js('!!(G.R && !G.R.bitti && G.R.tahtaHazir)')), (False, 'playing', False), f'E: {ad} kartı kapatmadı / oyuna geçti'); yollar.append(ad)
    # F) Escape (yüklenen sürümde olduğu gibi) duraklatır, kart yerinde kalır; devam edince hâlâ açık; çıkınca kalkar
    dz_bekle(s); s.pg.keyboard.press('Escape'); s.pg.wait_for_timeout(80)
    esit((s.js('G.state'), s.js(DZ_ACIK)), ('paused', True), 'F: Escape'); s.js('togglePause()'); s.js('__ff(3, 0)')
    esit((s.js(DZ_ACIK), s.js('!!(G.R && !G.R.bitti && G.R.tahtaHazir)')), (True, False), 'F: devamda kart / oyun')
    s.js('togglePause()'); s.pg.tap('#p-cik'); s.pg.wait_for_timeout(100)
    esit((s.js(DZ_ACIK), s.js('!!dzAcik')), (False, False), 'F: çıkınca kart kalktı mı')
    # G) ayar kapalıyken bütün bölüm kartsız; açıkken her kurulan cümlede bir kart (bot oyuncu gibi 1 sn sonra kapatır)
    s.js("window.__dzElle = false; kayit.ayar.dizilis = false; kaydet(); __dzSay = 0; __olay.length = 0; dojoBaslat(rakipBul('A1-2'))")
    dogru(s.js("__ff(900, 0.05, () => G.state === 'over' && ekran === 'sonuc')")['done'], 'G: kapalıyken bölüm bitmedi')
    esit((s.js('__dzSay'), s.js("__olay.some(([a]) => a === 'cumleTamam')")), (0, True), 'G: ayar kapalıyken kart')
    s.js("kayit.ayar.dizilis = true; kaydet(); __dzSay = 0; __olay.length = 0; dojoBaslat(rakipBul('A1-3'))")
    dogru(s.js("__ff(900, 0.05, () => G.state === 'over' && ekran === 'sonuc')")['done'], 'G: açıkken bölüm bitmedi')
    tamam = s.js("__olay.filter(([a]) => a === 'cumleTamam').length")
    dogru(tamam > 0 and s.js('__dzSay') == tamam, f"G: kart sayısı {s.js('__dzSay')} / kurulan cümle {tamam}")
    # H) seviye testinde çıkmaz; B2 bölümünde de çıkar (bütün seviyeler)
    s.js("__dzSay = 0; __olay.length = 0; stBaslat()")     # bu oyunun seviye testi kelime sorularından oluşur; kart koşulu (!D.st) yüklenen sürümdeki gibi
    dogru(s.js("__ff(900, 0.3, () => G.state === 'over')")['done'] and s.js('!!(D && D.st)'), 'H: seviye testi bitmedi')
    esit(s.js('__dzSay'), 0, 'H: seviye testinde kart')
    s.js("window.__dzElle = true; __dzSay = 0; dojoBaslat(rakipBul(seviyeRakipleri('B2')[0].id))")
    dogru(s.js("__ff(150, 0, () => !!dzAcik)")['done'] and s.js("document.querySelectorAll('.dz-p').length") >= 2, 'H: B2 cümlesinde kart çıkmadı')
    # I) hazır diziliş (yapay zekâyla hazırlanmış, dizilis-hazir.js) otomatik eşleştirmenin önüne geçer
    h = s.js("(() => { const r = dizilisCumle(cumleler('A1-1')[0]); return { hazir: !!r.hazir, p: r.parcalar.map(p => [p.rol, p.en, p.tr]) }; })()")
    esit(h, {'hazir': True, 'p': [['S', 'I', 'Ben'], ['V', 'am going', 'gidiyorum'], ['P', 'to school', 'okula']]}, 'I: hazır diziliş')
    kap = s.js("""(() => { const H = window.NE_DIZILIS || {}, o = {}; C.rivals.forEach(r => (C.sentences[r.id] || []).forEach((x, i) => { const k = r.lvl; o[k] = o[k] || [0, 0]; o[k][1]++; if (H[r.id + ':' + i]) o[k][0]++; })); return o; })()""")
    esit(len(kap), 20, 'I: seviye ve yol sayısı')
    for sv in kap:
        esit(kap[sv][0], kap[sv][1], f'I: {sv} cümlelerinin hepsi hazır değil')
    k3 = s.js("['B2-2:35', 'B2-1:61', 'B2-1:28'].map(k => { const [r, i] = k.split(':'); return dizilisCumle(cumleler(r)[+i]).parcalar.map(p => p.rol + ':' + p.en + '=' + p.tr).join(' | '); })")
    esit(k3, ['kalip:I wish=Keşke | S:it=— | V:would stop raining=yağmur dursa', 'S:This building=Bu bina | V:is being repaired=onarılıyor | T:at the moment=şu anda',
              'S:A new vaccine=Bir yeni aşı | V:has been developed=geliştirildi'], 'I: kullanıcının bildirdiği üç cümle')
    esit(s.hatalar(), [], 'A-I: JS hataları'); s.kapat()
    # J) ayar ekranında anahtar; kalıcı; eski kayıtta (anahtar yok) açık; bozuk değer onarılır
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': IYI_KAYIT})])
    esit(s.js('kayit.ayar.dizilis'), True, 'J: eski kayıtta varsayılan açık')
    s.js('ayarAc(false, acilisAc)'); s.pg.wait_for_timeout(100)
    dogru('İngilizce dizilişi' in s.js('card.innerText'), 'J: ayar yazısı yok')
    s.pg.tap('.anahtar[data-a="dizilis"]'); esit(s.js('kayit.ayar.dizilis'), False, 'J: anahtar')
    s.pg.reload(); s.bekle(); esit(s.js('kayit.ayar.dizilis'), False, 'J: kalıcı değil'); s.kapat()
    bozuk = dict(IYI_KAYIT, ayar={'muzik': True, 'efekt': True, 'ses': True, 'trSes': True, 'dizilis': 'evet'})
    s = Sayfa(b, profil=False, init=[tohum({'te_profiller_v1': LISTE_A, 'te_profil_pa': bozuk})])
    esit(s.js('kayit.ayar.dizilis'), True, 'J: bozuk değer onarılmadı'); dogru('bozuktu' in bildirim(s), 'J: onarım uyarısı yok'); s.kapat()
    # K) 320 px, yatay ekran ve İngilizce arayüz
    for w, h_, dil in ((320, 568, 'tr'), (844, 390, 'tr'), (360, 640, 'en')):
        s = Sayfa(b, w, h_, init=[f"localStorage.setItem('te_dil', '{dil}')"] if dil == 'en' else [])
        s.js("window.__dzElle = true; kayit.tutGor = true; kaydet(); dojoBaslat(rakipBul('A1-1'))"); dz_bekle(s)
        esit(s.js(DZ_YER), [True, True, True, True], f'K: {w}x{h_} kart ekranda')
        if dil == 'en':
            t = s.js("document.getElementById('dizilis').innerText")
            dogru(all(x in t for x in ('ENGLISH WORD ORDER', 'Listen', 'SUBJECT', 'VERB', 'Tap to continue')), f'K: İngilizce yazı eksik: {t}')
            s.js('dzAcik.kapat(); togglePause(); ayarAc(true)'); dogru('English word order' in s.js('card.innerText'), 'K: İngilizce ayar yazısı yok')
        if w == 844: s.foto('dizilis_yatay')
        esit(s.hatalar(), [], f'K: {w}x{h_} JS hataları'); s.kapat()
    hazir = ' · '.join(f'{l} {a}/{b}' for l, (a, b) in kap.items() if a)
    return f'hazır diziliş: {hazir}; kart açıldı, oyun bekledi; kapatma: dokunma + {", ".join(yollar)}; Escape duraklatır; ayar kapalı 0 kart, açık {tamam}/{tamam}; seviye testinde 0; B2\'de var; hazır diziliş; kalıcı ayar; 3 ekran; İngilizce'

@test
def goster(b):
    """İngilizceyi göster / gizle: Cümleler ve Kelimeler sekmesinde bir kez sorulur (seçilmediyse bölüm başlarken), seçim profilde kalır;
    gösterilince İngilizce cümle / soluk harfler görünür, puan ve XP yarı; seviye testi her zaman gizli."""
    s = Sayfa(b)
    s.js('kayit.ayar.ingCumleSecildi = kayit.ayar.ingKelimeSecildi = false; kaydet()')   # bu profilde henüz sorulmamış
    acik = lambda: s.js("!!document.getElementById('ing-pen')")
    pen = lambda: s.js("document.getElementById('ing-pen').innerText")
    s.js("haritaAc('A1')"); dogru(not acik(), 'harita açılır açılmaz pencere çıktı')
    dogru('göster mi' in s.js("document.getElementById('ing-sec').innerText"), 'seçilmemiş düğmenin yazısı')
    s.pg.tap('#yol-sec button[data-y="kelime"]'); s.pg.wait_for_timeout(150)
    dogru(acik(), 'Kelimeler sekmesine dokununca seçim sorulmadı')
    dogru('İngilizce kelimeyi göster' in pen() and 'İngilizce kelimeyi gizle' in pen(), 'kelime seçenekleri: ' + pen())
    dogru('önerilen' in s.js("document.querySelector('#ing-pen button[data-g=\"1\"]').innerText") and 'önerilen' not in s.js("document.querySelector('#ing-pen button[data-g=\"0\"]').innerText"), 'göster önerilen değil')
    s.pg.tap('#ing-pen button[data-g="1"]'); s.pg.wait_for_timeout(150)
    esit(s.js('[kayit.ayar.ingKelime, kayit.ayar.ingKelimeSecildi, kayit.ayar.ingCumleSecildi]'), [True, True, False], 'kelime seçimi')
    s.pg.tap('#yol-sec button[data-y="kelime"]'); s.pg.wait_for_timeout(150); dogru(not acik(), 'seçildikten sonra yeniden soruldu')
    dogru('gösteriliyor' in s.js("document.getElementById('ing-sec').innerText"), 'düğme "gösteriliyor" yazmıyor')
    s.pg.tap('#ing-deg'); s.pg.wait_for_timeout(150); dogru(acik(), 'değiştir düğmesi pencereyi açmadı')
    s.pg.tap('#ing-pen button[data-g="1"]'); s.pg.wait_for_timeout(150)
    # Cümleler sekmesinde seçilmediyse bölüm başlarken sorulur; gizle seçilince bölüm başlar
    s.js("kayit.rehber = false; cumleDojo(rakipBul('A1-1'))"); s.pg.wait_for_timeout(150)
    dogru(acik() and 'İngilizce cümleyi gizle' in pen(), 'bölüm başlarken cümle seçimi sorulmadı')
    s.pg.tap('#ing-pen button[data-g="0"]'); s.pg.wait_for_timeout(300)
    esit(s.js('[kayit.ayar.ingCumle, kayit.ayar.ingCumleSecildi, !!D, D && D.goster]'), [False, True, True, False], 'gizle ile bölüm başlamadı')
    s.js('ekranlariKapat(); G.state = "menu"; D = null; kaydet()'); s.pg.reload(); s.bekle()
    esit(s.js('[kayit.ayar.ingKelime, kayit.ayar.ingKelimeSecildi, kayit.ayar.ingCumle, kayit.ayar.ingCumleSecildi]'), [True, True, False, True], 'seçim yeniden açılınca kayboldu')
    # gösterilerek: cümle turunda İngilizce satır, kelime turunda soluk harfler; puan yarı
    s.js("kayit.ayar.ingCumle = true; dojoBaslat(rakipBul('A1-1'))")
    s.pg.wait_for_function("G.R && G.R.tip === 'kur' && G.R.tahtaHazir", timeout=20000)
    dogru(s.js('D.goster && ingCumleGoster(G.R) && promptDuzen(G.R, G.R.prompt, 300, 1).ingL.length > 0'), 'İngilizce cümle Türkçe şeritte yok')
    esit(s.js('(() => { const a = G.score; return [addScore(100), G.score - a]; })()'), [50, 50], 'göster modunda puan yarı değil')
    s.js("kayit.ayar.ingCumle = false; dojoBaslat(rakipBul('A1-1'))"); s.pg.wait_for_function("G.R && G.R.tahtaHazir", timeout=20000)
    dogru(s.js('!D.goster && !ingCumleGoster(G.R)'), 'gizle seçiliyken İngilizce görünüyor')
    esit(s.js('(() => { const a = G.score; return [addScore(100), G.score - a]; })()'), [100, 100], 'gizle modunda puan')
    # XP yarı (olaylardan hesaplanan, yukarı yuvarlanmış)
    s.js(OLAY_KAYITCI); s.js('__olay.length = 0'); xp0 = s.js('kayit.xp')
    s.js("dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})")
    r = s.js("__ff(900, 0.05, () => G.state === 'over' && ekran === 'sonuc')"); dogru(r['done'], 'gösterilerek oynanan paket bitmedi')
    o = s.js('__olay'); kaz = s.js('kayit.xp') - xp0
    esit(o[0][1].get('goster'), True, 'bolumBasladi olayında goster')
    yari = lambda n: (n + 1) // 2
    bek = 0
    for ad, v in o:
        if ad == 'cumleTamam': bek += yari(4 + (2 if v['kusursuz'] else 0))
        elif ad == 'hataBulundu': bek += yari(3)
        elif ad == 'soruBitti': bek += yari(2 if v['temiz'] else 1)
        elif ad == 'kelimeTanisildi': bek += yari(1)
        elif ad == 'bolumBitti' and v['kazandi']: bek += yari(5 + 2 * (v['yildiz'] or 0))
    esit(kaz, bek, 'gösterilerek oynanan paketin XP\'si yarı değil')
    dogru(kaz < beklenen_xp(o), 'XP azalmadı')
    dogru('gösterilerek oynandı' in s.js('card.innerText'), 'sonuç ekranında göster notu yok')
    s.js('stBaslat()'); esit(s.js('D.goster'), False, 'seviye testi gösterilerek oynanıyor')
    esit(s.errs, [], 'JS hataları'); s.kapat()
    return f'sekmede soruldu, kalıcı; göster: İngilizce satır ve soluk harfler, puan yarı, XP {kaz} (gizli olsa {beklenen_xp(o)}); seviye testi gizli'

# telefonun okuma sesi yerine kayıt tutan sahte ses: okunan yazılar __soz'e yazılır, okuma kısa sürer
SAHTE_SES = """
window.__soz = [];
(function () {
  const s = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() { s.speaking = false; }, resume() {}, addEventListener() {},
    speak(u) { __soz.push(u.text); s.speaking = true; setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => { s.speaking = false; u.onend && u.onend(); }, 150 + u.text.length * 4); }, 20); } };
  Object.defineProperty(window, 'speechSynthesis', { value: s, configurable: true });
  if (typeof SpeechSynthesisUtterance === 'undefined') window.SpeechSynthesisUtterance = function (t) { this.text = t; };
})();
"""

@test
def yonerge(b):
    """Yönergeler: her turun başında şeritteki kısa yönerge, ardından Türkçe cümle / anlam / kelime okunur (karolar okuma bitince yağar);
    dinleme turunda ardından İngilizce duyulur; şeride dokununca içerik yeniden okunur; yazım hatası turunda genel soru okunmaz;
    oyunda tahtayı kapatan bilgi kutusu yok; anlatım ekranı sesli; yönerge ve Türkçe okuma Ayarlar'dan ayrı ayrı kapanır."""
    s = Sayfa(b, init=[SAHTE_SES]); s.pg.mouse.click(5, 5)
    soz = lambda: s.js('__soz.slice()')
    bekle = lambda kos: s.pg.wait_for_function(kos, timeout=20000)
    kisa = lambda: s.js('yonergeKisa(G.R)')
    s.js("__soz.length = 0; dojoBaslat(rakipBul('A1-1'))"); bekle('G.R && G.R.tahtaHazir')
    trc = lambda: s.js('G.R.s.tr.replace(/;/g, ",")')
    esit(soz(), [kisa(), trc()], 'ilk turda yönerge, sonra Türkçe cümle')
    dogru(s.js('G.R.tahtaHazir'), 'karolar yağmadı')
    dogru('İngilizce kelimeleri sırayla yan yana diz' in kisa(), 'kısa yönerge: ' + kisa())
    # aynı tür arka arkaya: yine yalnız kısa yönerge (her turda)
    s.js("__soz.length = 0; G.R.bitti = true; turBaslat(turKur(cumleSec()))"); bekle('G.R.tahtaHazir')
    esit(soz(), [kisa(), trc()], 'ikinci turda yönerge ve Türkçe cümle')
    # şeride dokununca Türkçe cümle okunur
    s.js('__soz.length = 0; tekrarDinle()'); bekle('__soz.length >= 1')
    esit(soz()[0], s.js('G.R.s.tr.replace(/;/g, ",")'), 'şeride dokununca Türkçe cümle okunmadı')
    # hatayı bul: kısa yönerge
    s.js("__soz.length = 0; G.R.bitti = true; turBaslat(turSav(savunmaMaddesi()))"); bekle('G.R.tahtaHazir')
    esit(soz(), [kisa(), s.js('G.R.prompt.ana')], 'hatayı bul: yönerge ve Türkçe anlam')
    # yazım hatası turu: "Yazımı yanlış olan kelimeyi bul" okunmaz, "Doğru yazılışı yanlışın üstüne kaydır" okunur
    s.js("__soz.length = 0; G.R.bitti = true; turBaslat(turSav({ tip: 'yazim', tokens: ['shelf', 'bsaket', 'lamp'], idx: 1, dogru: 'basket', tr: 'Yazımı yanlış olan kelimeyi bul', kural: 'Doğru yazım: basket' }))")
    bekle('G.R.tahtaHazir')
    esit(soz(), ['Hatayı bul. Doğru yazılışı yanlışın üstüne kaydır.'], 'yazım turunda okunan')
    s.js('__soz.length = 0; tekrarDinle()'); bekle('__soz.length >= 1')
    dogru('Yazımı yanlış' not in soz()[0], 'dokununca genel soru okundu')
    # dinleme turu: yönergeden sonra İngilizce duyulur
    s.js("__soz.length = 0; G.R.bitti = true; const s0 = cumleSec(); D.dinle = true; const R = turKur(s0); D.dinle = false; turBaslat(R)"); bekle('G.R.tahtaHazir')
    o = soz(); esit(o[:1], [kisa()], 'dinleme turunda önce yönerge'); dogru(len(o) >= 2 and o[1] == s.js('G.R.s.en'), 'dinleme turunda İngilizce duyulmadı: %r' % o)
    # oyunda tahtayı kapatan bilgi kutusu yok (ilk kez açıklamaları kaldırıldı)
    dogru(s.js("typeof anlat") == 'undefined' and not s.js("document.getElementById('not').classList.contains('show')"), 'oyunda bilgi kutusu açık')
    # kelime paketi: yeni kelime turunda yalnız kısa yönerge
    s.js("__soz.length = 0; dojoBaslat(paketBul('K-A1-1'), {kelime: paketBul('K-A1-1')})"); bekle('G.R && G.R.tahtaHazir')
    esit(soz()[:1], [kisa()], 'yeni kelime turu: yönerge'); dogru(len(soz()) == 2 and s.js('G.R.prompt.ana') in soz()[1], 'yeni kelime okunmadı: %r' % soz())
    # anlatım ekranı sesli (giriş)
    s.js("__soz.length = 0; showTutorial()"); bekle('__soz.length >= 1')
    dogru('oynayarak' in soz()[0], 'anlatım okunmadı: %r' % soz()[:1])
    s.js('tutFinish()')
    # Ayarlar: kapalıysa hiçbir şey kendiliğinden okunmaz, şeritte yine yazar
    s.js("ayarAc(false, acilisAc)"); dogru('Yönergeleri sesli oku' in s.js('card.innerText'), "Ayarlar'da yönerge anahtarı yok")
    s.pg.tap('.anahtar[data-a="yonergeSes"]'); esit(s.js('kayit.ayar.yonergeSes'), False, 'anahtar kapanmadı')
    s.js("__soz.length = 0; dojoBaslat(rakipBul('A1-1'))"); bekle('G.R && G.R.tahtaHazir')
    esit(soz(), [trc()], 'yönerge kapalıyken yalnız Türkçe cümle okunmalı'); dogru('CÜMLE KUR' in s.js('G.R.prompt.ust'), 'şeritte yönerge yazmıyor')
    s.js("kayit.ayar.trSes = false; __soz.length = 0; dojoBaslat(rakipBul('A1-1'))"); bekle('G.R && G.R.tahtaHazir')
    esit(soz(), [], 'ikisi de kapalıyken okundu')
    esit(s.errs, [], 'JS hataları'); s.kapat()
    return 'her turda yönerge + Türkçe cümle / anlam / kelime, karolar sonra; içerik dokununca yeniden; dinlemede İngilizce; yazım turunda "Doğru yazılışı yanlışın üstüne kaydır"; bilgi kutusu yok; anlatım sesli; ayardan kapanıyor'

# ---------------------------------------------------------------- çalıştırıcı
def main():
    arg = [a for a in sys.argv[1:] if not a.startswith('--')]
    taban = '--taban' in sys.argv
    secili = [t for t in TESTLER if not arg or t.__name__ in arg]
    if '--hizli' in sys.argv: secili = [t for t in secili if t.__name__ not in YAVAS]   # her değişiklikte (~2 dk)
    sv = subprocess.Popen([sys.executable, '-I', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '--directory', KAYNAK], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        sonuc = calistir(secili, taban)
    finally:
        sv.kill()
    kalan = [s for s in sonuc if not s[1]]
    print(f'\n{len(sonuc) - len(kalan)}/{len(sonuc)} test geçti' + (' — KALANLAR: ' + ', '.join(s[0] for s in kalan) if kalan else ''))
    sys.exit(1 if kalan else 0)

def calistir(secili, taban):
    sonuc = []
    with sync_playwright() as p:
        b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'])
        for t in secili:
            t0 = time.time()
            try:
                d = t(b, taban) if t.__name__ in ('veri', 'metin') else t(b)
                sonuc.append((t.__name__, True, d, time.time() - t0))
            except Exception as e:
                sonuc.append((t.__name__, False, f'{type(e).__name__}: {e}', time.time() - t0))
                traceback.print_exc()
            ad, ok, d, sn = sonuc[-1]
            print(f"{'GEÇTİ ' if ok else 'KALDI '} {ad:<13} {sn:5.0f} sn  {d}", flush=True)
        b.close()
    return sonuc

if __name__ == '__main__':
    main()
