// Mağaza ekran görüntüleri (iPhone 6.9", iPad 13", Android; Türkçe ve İngilizce, başlıklı).
// Kullanım (uygulama klasöründen; playwright gerekir: npm i -g playwright):
//   node araclar/magaza-goruntu.js            → ../MAGAZA/ekran-goruntuleri-yeni/ (PNG)
// Sahneler SAHNE'de, başlıklar CIZ'de. Oyuncu profili örnek ilerlemeyle (Elif, 12 gün seri) açılır.
// Mağaza ekran görüntüleri: ham ekranlar (oyunun kendisi) + başlıklı kompozisyon
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[2] || path.join(__dirname, '../../kaynak'), out = process.argv[3] || path.join(__dirname, '../../MAGAZA/ekran-goruntuleri-yeni'), botPath = path.join(root, 'testler/bot.js');
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.end(d); }); }).listen(18992);
const gun = d => { const t = new Date(Date.now() - d * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const yildiz = {}; for (let i = 1; i <= 12; i++) yildiz['A1-' + i] = i % 4 ? 3 : 2;
const acik = {}; for (let i = 1; i <= 13; i++) acik['A1-' + i] = true; acik['A2-1'] = true;
const gorevG = {}; [1, 2, 3, 5, 6].forEach(d => gorevG[gun(d)] = 3000 + d * 410);
const PROFIL = { tutGor: true, baslangic: 'A1', rehber: true, kelRehber: true, sonLvl: 'A1', acik, yildiz,
  ayar: { muzik: true, efekt: true, ses: true, trSes: true, dizilis: true, ingCumleSecildi: true, ingKelimeSecildi: true },
  xp: 1240, gunluk: { hedef: 50, gunler: { [gun(0)]: 35, [gun(1)]: 60, [gun(2)]: 55 } }, seri: { gun: 12, enUzun: 12, sonGun: gun(1), dondurma: 1, donan: [] },
  gorev: { son: gun(1), seri: 3, enUzun: 3, toplam: 5, gunler: gorevG }, istat: { dojo: 20, zafer: 18, online: 2, onlineGalibiyet: 1, cumle: 96, kusursuz: 61, hataBul: 27, enKombo: 14 }, best: 18650 };
const kel = {}; ['apple','book','water','house','happy','school','friend','mother','coffee','table'].forEach((w, i) => kel[w] = [2, 1e9, 0]); PROFIL.kel = kel;
const yy = {}; for (let i = 1; i <= 13; i++) yy[i] = i % 5 ? 3 : 2;
Object.assign(PROFIL, { strRehber: true, yol: { acik: 14, yildiz: yy, enIyi: {} }, envanter: { hamle3: 2, cekic: 3, miknatis: 1 },
  sandik: { slot: [{ tur: 'altin', t: Date.now() - 6e5, acilis: Date.now() - 6e5 }, { tur: 'gumus', t: Date.now(), acilis: null }, { tur: 'tahta', t: Date.now(), acilis: null }] },
  cark: { son: null } });
const INIT = `localStorage.setItem('te_profiller_v1', JSON.stringify({aktif:'p', liste:[{id:'p', ad:'Elif'}], eskiAktarildi:true}));
  localStorage.setItem('te_profil_p', ${JSON.stringify(JSON.stringify(PROFIL))}); localStorage.setItem('te_dil', '__DIL__');`;
// Bölüm Yolu: uzmanın hamlelerinin bir kısmı yapılmış, iki gölge kelime kutuda
const YOL_ARA = no => `yolOyna(${no}); (() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, B.hedef.renk == null ? -1 : B.hedef.renk, h);
  h.slice(0, Math.ceil(h.length / 2)).forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; [0, 1].forEach(k => strSec(R.T.h.findIndex(x => x && x.k === k), k)); })()`;
const SAHNE = {
  oyun: `dojoBaslat(rakipBul('A1-2')); __ff(8, 0, () => G.R && G.R.tahtaHazir && G.R.tip === 'kur'); window.__botStep = () => {}; __ff(1.5, 0, () => false);`,
  menu: `acilisAc()`,
  online: `onlineAc()`,
  yol: YOL_ARA(12),
  dizilis: `window.__dzElle = true; dojoBaslat(rakipBul('A1-3')); __ff(60, 0, () => typeof dzAcik !== 'undefined' && dzAcik); __ff(0.9, 0, () => false);`,
  harita: `yolHaritaAc(); setTimeout(() => { const s = document.querySelector('.y-durak.simdi'); let e = s && s.parentElement; while (e && !(e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; if (e) { const r = s.getBoundingClientRect(), q = e.getBoundingClientRect(); e.scrollTop += r.bottom - q.bottom + 40; } }, 150)`,
  sonuc: `yolOyna(13); (() => { const B = STR.yol.b, h = []; yolUzman(B.T, B.hamle, B.hedef.tur, B.hedef.renk == null ? -1 : B.hedef.renk, h);
    h.forEach(([a, b]) => strTasiOyuncu(a, b)); const R = STR.R; R.T.hedef.forEach((t, k) => strSec(R.T.h.findIndex(x => x && x.k === k), k)); strBomba(); })()`,
  cark: `carkAc()`,
};
const BEKLE = { sonuc: `!!document.getElementById('y-sonraki')` };
const CIZ = {
  tr: { oyun: 'Türkçesini oku,\nİngilizce cümleyi kur', menu: 'Kariyer: A1’den C2’ye\nadım adım ilerle', online: 'Online kapış:\nHız ya da Strateji', yol: 'Strateji: renkleri diz,\nbombayla patlat!', dizilis: 'İngilizce dizilişi\nadım adım öğren', harita: '180 strateji bulmacası,\nher biri yeni', sonuc: 'Yıldızları topla,\nsandıkları aç', cark: 'Günlük çark,\nhaftalık etkinlik' },
  en: { oyun: 'Read the Turkish,\nbuild the English', menu: 'Career: from A1 to C2,\nstep by step', online: 'Play online:\nSpeed or Strategy', yol: 'Strategy: line up colors,\nset off the bomb!', dizilis: 'Learn English\nword order', harita: '180 strategy puzzles,\neach one new', sonuc: 'Earn stars,\nopen chests', cark: 'Daily spin,\nweekly event' } };
const CIHAZ = [ ['iphone-6.9', 430, 932, 3], ['ipad-13', 1032, 1376, 2], ['android', 360, 720, 3] ];
(async () => {
  const b = await chromium.launch();
  const font = fs.readFileSync(path.join(root, 'parcalar/yazitipi.css'), 'utf8');
  for (const dil of ['tr', 'en']) for (const [cad, w, h, dpr] of CIHAZ) {
    // ham ekran: başlık için üstte ve altta pay bırakan, biraz küçültülmüş telefon ekranı
    const sw = Math.round(w * 0.86), sh = Math.round(h * 0.80);
    const ctx = await b.newContext({ viewport: { width: sw, height: sh }, deviceScaleFactor: dpr, isMobile: cad !== 'ipad-13', hasTouch: true });
    await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.addInitScript(INIT.replace('__DIL__', dil)); await ctx.addInitScript({ path: botPath });
    for (const [ad, js] of Object.entries(SAHNE)) {
      const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('HATA', ad, e.message));
      await pg.goto('http://127.0.0.1:18992/index.html'); await pg.waitForFunction('window.__acildi === true', null, { timeout: 30000 });
      await pg.evaluate('__botInstall(); Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();');
      await pg.evaluate(js); if (BEKLE[ad]) await pg.waitForFunction(BEKLE[ad], null, { timeout: 30000 }); await pg.waitForTimeout(ad === 'sonuc' ? 2500 : 900);
      const ham = path.join(out, 'ham', `${dil}-${cad}-${ad}.png`); fs.mkdirSync(path.dirname(ham), { recursive: true });
      await pg.screenshot({ path: ham }); await pg.close();
      // kompozisyon
      const kp = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const yazi = CIZ[dil][ad].split('\n').join('<br>');
      await kp.setContent(`<html><head><style>${font}
        *{margin:0;box-sizing:border-box} body{width:${w}px;height:${h}px;overflow:hidden;font-family:Fredoka;
        background:radial-gradient(circle at 50% 0%,#9b6a8e,#5b3552 45%,#2a1622);display:flex;flex-direction:column;align-items:center}
        h1{margin-top:${Math.round(h * 0.035)}px;height:${Math.round(h * 0.13)}px;display:flex;align-items:center;text-align:center;color:#fff6e8;font-weight:700;
        font-size:${Math.round(Math.min(w * 0.075, h * 0.042))}px;line-height:1.1;-webkit-text-stroke:${Math.max(4, Math.round(w * 0.012))}px #4a1f35;paint-order:stroke fill;text-shadow:0 4px 0 #2a0f1c}
        img{width:${sw}px;height:${sh}px;border-radius:${Math.round(w * 0.06)}px;border:${Math.round(w * 0.018)}px solid #fff6e8;box-shadow:0 12px 40px rgba(0,0,0,.5)}
        </style></head><body><h1>${yazi}</h1><img src="data:image/png;base64,${fs.readFileSync(ham).toString('base64')}"></body></html>`);
      await kp.waitForTimeout(300);
      const son = path.join(out, dil, cad, `${Object.keys(SAHNE).indexOf(ad) + 1}-${ad}.png`); fs.mkdirSync(path.dirname(son), { recursive: true });
      await kp.screenshot({ path: son }); await kp.close();
    }
    await ctx.close();
  }
  await b.close(); srv.close();
})();
