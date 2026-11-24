# Stacking Sentences · Geliştirme Rehberi

> Eski adı **Tetris English**. "Tetris" adı The Tetris Company'nin markası olduğu için ekrandan, sayfa başlığından ve logodan kaldırıldı (20 Kasım 2026). Kodda kalan `te_` kayıt anahtarları ve değişken adları görünmez; dokunulmadı.

Bu dosya, oyunu başka bir yapay zekâda ya da başka bir geliştiriciyle devam ettirmek için yazıldı.

## Oyun nedir?

Türkçe konuşanlar için İngilizce öğreten bir tarayıcı oyunu (sıcak **kafe teması**, Gemini videosundaki görünüm; 23 Kasım 2026'ya kadar neon / cyberpunk idi). Oynanış **2D karo tahtası** (23 Kasım 2026'dan beri; önceki sürümde Tetris gibi düşen bloklar ve Kelime Mezarlığı vardı): hedefin karoları tahtada karışık durur, oyuncu karoları sürükleyip yer değiştirerek hedefi bir satırda soldan sağa tek tek dizer; dizi tamamlanınca patlar, aynı renkten 3+ karo toplu / zincirleme patlar. Ayrıntı: **Oynanış: karo tahtası** bölümü.

- 20 seviye: A1–C2, Sınav Yolu (TOEFL, IELTS, YDS, YÖKDİL, TOEIC, Cambridge, PTE, Duolingo, LGS, YKS-YDT) ve Hayat İngilizcesi (iş, iş görüşmesi, seyahat, günlük konuşma).
- 9.031 cümle, 11.253 kelime, dersler, hata kuralları, "Türkçe mantığıyla gör" dizilişleri.
- Açılış ekranı: **profil**, **ONLINE KAPIŞMA**, **KARİYER**, Ayarlar, Nasıl oynanır.
- Kariyer: ▶ DEVAM ET (ya da yarım bölüm varsa ▶ KALDIĞIN YERDEN), seviye seçici (Genel / Sınav Yolu / Hayat İngilizcesi), **CÜMLELER** ve **KELİMELER** sekmeleri, bölüm listesi, 🔁 Tekrar (antrenman), 📕 Defterim (hatalar + kelimeler).

## Hangi dosyayı açmalı?

| Dosya | Ne işe yarar |
|---|---|
| `index.html` (kökte, 4 MB) | Oyunun tamamı tek dosyada; içerik ve sesler gömülü. **Oynamak için bu.** Okumak/düzenlemek için değil. |
| `kaynak/parcalar/*.js, *.css, *.html` | **Kaynak kodu. Düzenleme burada yapılır.** |
| `kaynak/icerik.js` (2,9 MB) | Bütün İngilizce içerik (`window.NE_ICERIK`, saf JSON). Çok büyük; tamamını okumaya gerek yok. |
| `kaynak/siralama.js` | "Türkçe mantığıyla gör" verisi (`window.NE_SIRA`). |
| `kaynak/hatalar.js` | Türklerin sık yaptığı 57 klasik hata (`window.NE_HATALAR`). |
| `kaynak/ses/` | `muzik.wav` (döngü, 23 Kasım 2026): sakin lo-fi — Rhodes piyano akorları, ahşap marimba, yumuşak bas, hafif ritim, plak sıcaklığı; 75 BPM, 25.6 sn, 22.05 kHz mono, dikişsiz (oyuncunun tarifiyle sentezlendi). Erkek spiker sesleri (spiker-1..3.mp3) kaldırıldı. |
| `kaynak/build.sh` | Parçaları birleştirip `kaynak/index.html` üretir (içerik ve sesler ayrı dosya). |
| `kaynak/build-tek.sh` | Her şeyi gömüp `kaynak/tek/index.html` üretir (tek dosya sürüm). |

Düzenledikten sonra: `cd kaynak && sh build-tek.sh` → çıkan `kaynak/tek/index.html` yeni oyundur.

## Kaynak kodu (kaynak/parcalar), birleşme sırasıyla

`build.sh` parçaları bu sırayla birleştirir. Sıra önemlidir: bir dosya, kendinden önceki dosyaların en üst düzeydeki tanımlarını kullanabilir.

| Sıra | Dosya | Katman | Görevi |
|---|---|---|---|
| 0 | `head_old.css.html`, `extra.css`, `body.html` | Görünüm | HTML iskeleti, bütün CSS, kontroller. Sabit yazılar `data-t` / `data-ta` taşır (`sabitYazilar()` çevirir) |
| 1 | `depo.js` | Altyapı | Kalıcı hafıza kapısı (`Depo.al / yaz / sil / anahtarlar / hazirla`). Tarayıcıda localStorage, uygulamada Capacitor Preferences |
| 2 | `dil.js`, `dil-en.js` | Altyapı | Arayüz dili: `tt('Türkçe metin', {…})`, `MARKA`, `dilSec`, `yerel()`; İngilizce sözlük |
| 3 | `olay.js` | Altyapı (saf) | Olay yolu: `Olay.dinle / yay`. Motor duyurur, oyunlaştırma modülleri dinler |
| 4 | `kayit-sema.js` | Kayıt (saf) | Kayıt doğrulama ve onarım: `kayitDuzelt`, `profillerDuzelt`, `yarimGecerli` |
| 5 | `core.js` | Motor | Yardımcılar, ekran yerleşimi (`layout`), karo resmi (`karoSprite`, `karoYaziOlc`: yazı sığmazsa dikey), arka plan (`renderBG`), parçacıklar |
| 6 | `ogretim.js` | Öğretim | İçerik ve öğretim kuralları: seviyeler, bölümler, paketler, çeldiriciler, aralıklı tekrar, hata kuralları (`kural`), dersler, seviye testi, sözlük (`anlamBul`). Eski data.js'in içerik kısmı |
| 7 | `kayit.js` | Kayıt | Profiller, ilerleme (`kayit`), yarım bölüm okuma/yazma/silme, bozuk kayıt yedeği ve uyarıları. Eski data.js'in kayıt kısmı |
| 8 | `ilerleme.js` | Oyunlaştırma | XP, günlük hedef, seri ve seri dondurma. Yalnız olayları dinler; motora dokunmaz. Açılıştaki halka, bölüm sonu XP paneli, ayarlardaki hedef seçimi |
| 9 | `audio.js` | Ses | `Ses` (müzik, efektler: tahta için al, kay, geri, dus, pop, zincir, super, bomba, saat; puan kasası için altin, kasa; kombo arttıkça oyun müziği biraz yükselir: `yogunluk`) ve `Konus` (cihazın sesli okuması) |
| 10 | `game.js` | Motor | Bölüm oturumu `D`, tur türleri, **tahta kuralları** (karo üretimi, dizi/zincir, hamle değerlendirme, renk eşleşmesi, yerçekimi, yeni karolar, süre, ipucu), puan/kombo/güçler, bölüm sonu; olayları duyurur |
| 11 | `engine.js` | Motor | Tahta yerleşimi (`tahtaYerlesim`, `tahtaSatir`), güncelleme döngüsü ve karo hareketi (`tahtaTik`), çizim (tahta, Türkçe kutusu, süre çubuğu, HUD), sürükleme / dokunma / klavye |
| 12 | `online.js` | Ağ | Online kapışma: MQTT istemcisi, oda (`OD`), maç ve sonuç ekranları |
| 13 | `ilk.js` | Oyunlaştırma | İlk 60 saniye: hiç profil yokken karşılama, rehberli ilk cümle ve koç, ilk XP, isim, günlük hedef |
| 14 | `harita.js` | Ekranlar | Ünite haritası: Kariyer ekranındaki zikzak yol (üniteler, duraklar), kelime paketi grupları, ünite tamam kutlaması |
| 15 | `dizilis.js` | Öğretim + Ekranlar | İngilizce dizilişi (SVOPT) kartı: cümle tamamlanınca İngilizce parçalar, görevleri ve altında İngilizce sırayla Türkçeleri. `dizilisCoz` saf eşleştiricidir |
| 16 | `gorev.js` | Oyunlaştırma | **Günün Görevi**: tarihten üretilen günlük 5 cümle + 2 hatayı bul, bonus XP, görev serisi, açılış düğmesi ve sonuç paneli |
| 17 | `rozet.js` | Oyunlaştırma | **Rozetler**: 27 başarım; olayları dinler, sayaçları `kayit.istat`'a yazar, sonuç ekranında kutlar, rozet ekranı |
| 18a | `strateji.js` | Oyun + Ağ | **STRATEJİ maçı** (online'ın ikinci modu, bilgisayara karşı da): tahta üretimi, kayma, bomba ve zincir, bilgisayar rakip, tur/maç kararı, kendi DOM ekranı (`#str`) |
| 18 | `yerel.js` | Uygulama | **App Store / Google Play katmanı** (Capacitor): titreşim, Android geri tuşu, arka plana gidince duraklatma, durum çubuğu, açılış resmi, günlük hatırlatma bildirimi. Tarayıcıda yalnız titreşim çalışır |
| 19 | `screens.js` | Ekranlar | Bütün menü ekranları ve oyunun açılışı (`boot`) |

Görünüm parçaları: `head_old.css.html`, **`yazitipi.css`** (Fredoka yazı tipi base64 gömülü, ~78 KB; internet olmadan da aynı görünür; lisans `yazitipi-LISANS.txt`, SIL OFL), `extra.css`, `body.html`.

### Katman kuralları (`derleme` testi denetler)

- Kalıcı hafızaya (`Depo.`) yalnız `depo.js`, `dil.js` (dil seçimi), `kayit.js` ve `screens.js`'teki `boot()` erişir. Oyun motoru kayda `kaydet()`, `yarimYaz()`, `yarimOku()` gibi kayıt katmanı işlevleriyle ulaşır.
- `localStorage` yalnız `depo.js`'te (ve body.html'deki yükleme ekranı satırında) geçer.
- `kayit-sema.js` ve `olay.js` saftır: ekranı (`document`), oyun durumunu (`G`, `D`), tuvali (`ctx`) ve hafızayı (`Depo`) bilmez.
- Yeni bir `.js` parçası eklersen `build.sh` listesine yaz; yazmazsan `derleme` testi kalır.

### Olay yolu (olay.js)

Seri, XP, rozet gibi yeni özellikler oyun motoruna dokunmadan olayları dinleyerek yazılır:

```
Olay.dinle('cumleTamam', v => { if (v.kusursuz) xpEkle(10); });
```

| Olay | Ne zaman | Bilgi |
|---|---|---|
| `kayitYuklendi` | profil açıldı, değişti, silindi | `profil` |
| `bolumBasladi` | bölüm/paket/test/antrenman/online/rehberli ilk cümle başladı (`mod`: bolum, kelime, test, antrenman, online, ilk) | `mod, r, lvl, devam` |
| `turBasladi` | her tur | `tip, no` |
| `dogruHamle` | dizinin uzadığı her kelime / harf, bulunan hata | `tip, kelime` |
| `hata` | dizinin sonuna yanlış karo, yanlış düzeltme, kaçırılan hata, dolan süre | `tip, kelime, mesaj, kural` |
| `copeAtildi` | (eski düşen blok oynanışında tuzak kelime çöpe atılınca; karo tahtasında duyurulmaz) | `kelime, puan` |
| `cumleTamam` | cümle kuruldu | `kusursuz, en` |
| `hataBulundu` | HATAYI BUL turu çözüldü | `kelime` |
| `soruBitti` | kelime sorusu bitti | `temiz, kelime` |
| `kelimeTanisildi` | kelime paketinde yeni kelime tanıtıldı | `kelime` |
| `kombo` / `komboBitti` | seri arttı / bozuldu | `n` |
| `bolumBitti` | bölüm sonu (online hariç) | `mod, r, lvl, kazandi, yildiz, skor, istat, enKombo, rekor` |
| `onlineBitti` | online maç sonucu | `kazandi, neden` |
| `hedefTamam` | günlük hedef bugün ilk kez doldu (ilerleme.js duyurur) | `seri, yeniDondurma` |

`bolumBasladi` / `bolumBitti`'de `mod` artık `gunluk` da olabilir (Günün Görevi); `bolumBitti`'de `gorevIlk` (günün ilk tamamlanışı, bonus XP) vardır.
| `uniteTamam` | bir ünitenin bütün bölümleri ilk kez yıldız aldı (harita.js duyurur) | `lvl, unite, bolge, seviyeBitti` |

- Olay sayıları oyunun kendi sayaçlarıyla birebir tutar (`hata` = `D.istat.yanlis`, `dogruHamle` = `D.istat.dogru`…); `olay` testi bunu 5 modda denetler.
- Bir dinleyici hata verirse oyun durmaz; hata yakalanır, `Olay.hataSayisi()` artar, konsola yazılır.

## Tur türleri (`G.R.tip`)

- `kur` → **CÜMLEYİ KUR**: Türkçe cümle sesli okunur, okuma bitince karolar tahtaya yağar. Cümlenin kelimeleri bir satırda soldan sağa sırayla dizilir; tuzak karolar (çeldiriciler) ve dolgu kelimeler de tahtadadır. Bazen "Dinle ve kur": Türkçe gizli, İngilizce cümle dinlenir.
- `sav` → **HATAYI BUL**: içinde bir yanlış olan cümle tahtanın altında sabit durur; doğru karo tahtada bir yerdedir, yanlışın üstüne sürüklenir. Fazla kelimede (doğrusu yok) yanlış karoya dokunulur; sıra hatasında iki sabit karo birbirinin üstüne sürüklenir. Eşleşmede doğru Türkçe anlam, yazım hatasında doğru yazılış sürüklenir. (Kodda adı hâlâ `sav`.)
- `test` → kelime soruları, **harf harf**: `anlam` (Türkçesinden İngilizcesini diz), `ters` (İngilizce kelimenin Türkçesini diz; kısa anlamın ilk seçeneği, ayraçsız), `dinle`, `bosluk` (cümledeki boşluğun kelimesini diz). Tuzak harfler yanlış seçeneklerin harflerinden. Öbekte (make an appointment) her kelime ayrı parça, sırayla dizilir.
- `tanis` → yeni kelime kartı (anlam, okunuş, örnek cümle); sonra kelime harf harf dizilir (cezasız; yanlış harfte sıradaki harf gösterilir).

Bir cümle bölümü: 4–6 `kur` turu, aralarında `sav` turları. Kelime paketi: tanış → sorular → arada eşleşme/yazım hatası bulma.

## Oynanış: karo tahtası (game.js + engine.js)

- **Tahta boyu her turda hedefe göre:** sütun = cümlenin kelime sayısı / kelimenin (öbekte en uzun kelimenin) harf sayısı, en az 6 (`tahtaBoyut`). En uzun cümle (18 kelime) ve en uzun kelime (18 harf; Türkçe cevapta 22) tek satıra yatay sığar. Satır sayısı (3–7) karodaki yazı en büyük olacak şekilde seçilir (`tahtaSatir`); karo yazısı yatay sığmazsa dikey yazılır (`karoYaziOlc`).
- **Hamle:** karoyu tut ve sürükle → bırakılan hücredeki karoyla yer değiştirir; kısa fiske komşuyla; iki karoya sırayla dokunmak da olur; klavyede ok tuşları + Enter/Boşluk (`hamle`, `dokun`).
- **Dizi (zincir):** hedefin başı bir satırda soldan sağa (`zincirBul`). Etkin dizi en az 2 karodur ya da oyuncunun kendi koyduğu ilk karo (çapa). Dizi altın parlar, sıradaki yer kesik çizgili. Diziye doğru karo eklenince `dogruHamle`; dizinin sonuna **yanlış karo** konursa karo geri seker, Türkçe kural açıklaması çıkar (`yanlisYerlesti`: sıra hatası / yanlış kelime + `kural()` / bu cümleye girmez / yanlış harf), hata defterine ve aralıklı tekrara yazılır. Başka hamleler serbesttir.
- **Patlama ve kaskad:** dizi tamamlanınca soldan sağa patlar (POP! KOMBO). Yan yana / alt alta 3+ aynı renk karo toplu patlar; 5'li ya da L/T biçimi **SÜPER PATLAMA** (o renkteki bütün serbest karolar). Üstteki karolar düşer, yukarıdan yenileri gelir; yeni eşleşmeler **ZİNCİRLEME KOMBO** (`kaskadAdim`, `renkGruplari`, `yercekimi`, `doldur`). Dizideki karolar ve hatayı bul satırı sabittir (patlamaz, düşmez). Yeni karolarda önce tahtada eksik kalan hedef karoları gelir (`eksikGerekenler`).
- **Eksik başlayan karo:** bazı turlarda hedefin bir parçası tahtada yoktur; 3,5–6 sn sonra yukarıdan iner (`bekleyenTik`). Rehberli ilk cümlede, seviye testinde, online maçta ve tanışmada yoktur.
- **Süre:** her turun süresi var (`sureHesapla`; kelime/harf sayısına ve seviyeye göre, bölüm ilerledikçe biraz kısalır; oyuncu isteğiyle `SURE_KAT` = 3 katı: 5 kelimelik A1 cümlesi ~141 sn, 6 harfli kelime ~78 sn). Süre biterse hata sayılır, göstergeye bir dilim eklenir, sıradaki karo el işaretiyle gösterilir ve süre yarıdan yeniden başlar; hatayı bul turunda tur biter; seviye testinde soru biter. ⏳ Yavaş 15 sn süreyi yavaşlatır.
- **Hata göstergesi (eski mezarlığın yerine):** her hata ve dolan süre 1 dilim (`HATA_MAX` = 10). Dolarsa bölüm kaybedilir (online'da maç). Tamamlanan cümle 1, hatasız cümle 2, hatasız kelime sorusu 1 dilim boşaltır. Rehberli ilk cümlede ve seviye testinde gösterge yoktur. Yıldızlar yine hata sayısına göre.
- **Alt panel (`#pow`, body.html):** solda 💣 **CÜMLE BOMBASI** rozeti (sayısı ve dolum halkası), yanında **4 güç kutusu** (kazanılan her 🃏 joker / ⏳ yavaş bir kutuda durur, dokununca kullanılır; boş kutu kesik çizgili; 4'ten fazla güçte son kutuda sayı), altında sarı **bölüm ilerleme çubuğu** (bitmiş turlar + şu anki turda dizilen kısım; `altCubukGuncelle`). Üstte sağdaki halka "HEDEF Cümleler 3/7" tur sayısını gösterir.
- **Güçler:** CÜMLE BOMBASI halkası renk patlamaları ve cümlelerle dolar; dolunca bir bomba hazır olur (en çok 2; 6'lı seri ödülü de verir). Bomba hedefe gerekmeyen serbest karoları patlatır, göstergeyi 2 dilim boşaltır. 🃏 Joker: dokunulan karonun Türkçesi 1 kez, 2 sn (yalnız cümle kurarken). ⏳ Yavaş.
- **Kayıt:** yarım bölüm biçimi aynı (`kayit-sema.js` dokunulmadı): G'ye `hata` ve `bombaDolum` eklendi, `pile` boş yazılır. Eski kayıttaki mezarlık açılırken hata göstergesine çevrilir. Yarıda bırakılan tur baştan, yeni karışık tahtayla oynanır.

## İngilizceyi göster / gizle (23 Kasım 2026)
- Kariyer haritasında **CÜMLELER** ve **KELİMELER** sekmesi için ayrı seçim: oyuncu sekmeye ilk dokunduğunda (ya da o sekmeden ilk bölüm / paket başlarken) pencere sorar: 👁 *İngilizce cümleyi / kelimeyi göster* ya da 🙈 *gizle*. Seçim profilde kalır (`kayit.ayar.ingCumle`, `ingKelime`; sorulup sorulmadığı `ingCumleSecildi`, `ingKelimeSecildi`), sekmelerin altındaki düğmeyle değişir (`ingSor`, `ingCipCiz` — screens.js).
- **Göster:** cümle kurma turunda İngilizce cümle Türkçe şeritte Türkçenin altında görünür (dizilen kelimeler yeşil, sıradaki turuncu ve altı çizili; `ingCumleGoster`, `ingSatirlari`); kelime turlarında (Türkçesini bul dahil) harf kutularında dizilecek harfler soluk görünür (`ilerlemeCiz`). Düzey etiketinde 👁 görünür, sonuç ekranında not yazar.
- **Göster ile puan ve XP yarı:** `puanKat` (game.js, `addScore` içinde) ve `xpEkle` (ilerleme.js; `bolumBasladi` olayındaki `goster` ile, yukarı yuvarlanır). Yıldızlar aynı.
- Seviye testi, tekrar (antrenman), online maç ve rehberli ilk cümle her zaman gizli oynanır (`D.goster` false).

## Yönergeler ve oyun içi konuşma (23 Kasım 2026)
- Her tur türünün yönergesi `YONERGE` tablosunda (game.js): `e` etiket, `k` kısa yönerge; Türkçe şeridin üstünde "e · k" yazar (iki satıra kadar). Hatayı bul yönergeleri oyuncunun beğendiği "… kaydır" diliyle.
- (24 Kasım 2026'dan beri yönergeden sonra Türkçe içerik de okunur; bkz. Online → Sesli okuma.) Eski kural: **oyunda kendiliğinden yalnız kısa yönerge okunur** (oyuncu isteği: konuşma araya girmesin): her turun başında `otoOku` şeritteki yönergeyi okur ("Hatayı bul. Doğru yazılışı yanlışın üstüne kaydır."), karolar okuma bitince yağar. Türkçe cümle, kelime, tur sonundaki İngilizce cümle ve diziliş kartı kendiliğinden okunmaz; şeride (🔊) ya da kartın Dinle düğmesine dokununca okunur. Dinleme turlarında (`R.dinleSes`) yönergeden sonra duyulacak İngilizce çalar. Kelime paketindeki yazım / eşleşme turlarında şeride dokununca da genel soru değil yönerge okunur.
- Ayarlar'daki **Yönergeleri sesli oku** (`kayit.ayar.yonergeSes`, açık gelir) kapatır; yazılı yönerge yine görünür. Türkçe arayüzde Türkçe, İngilizce arayüzde İngilizce sesle (`yonergeSoyle`).
- **Oyunda bilgi kutusu yok** (23 Kasım 2026, oyuncu isteği): "Aynı renkten üç karo…" gibi ilk kez açıklamaları (`ANLAT`, `anlat`) tahtayı kapattığı için kaldırıldı. Boş güç kutusuna ya da dolmamış bombaya dokununca yalnız kısa ses ve titreşim olur.
- **Giriş**: Nasıl oynanır sayfaları sade dille yazıldı ve açılınca sesli okunur; göster / gizle penceresi açılınca ne yapılacağı okunur.

## Puan kasası (23 Kasım 2026)
- Her puanda (`addScore(v, x, y)`) patlamanın olduğu yerden altın paralar yukarıdaki ⭐ skora kavisle uçar (`paraSac`, `PARA`, `drawPara`). Her para kasaya düşünce "tın" sesi (`altin`; seride perde yükselir), sayaç seri hâlinde yükselir ve altın parlar; sayarken "SKOR:" yerine kazanılan "+N" yazar. Seri bitince (300+ puanda) kasa "ka-çing" der (`kasa`). `G.score` hemen artar; ekrandaki sayı (`G.shown`) paralar düştükçe artar (`paraTik`).

## Kafe teması (görünüm, 23 Kasım 2026)
- Bütün ekranlar Gemini videosundaki sıcak kafe görünümünde: arkada kafe resmi (`extra.css` sonunda `--kafe`, videonun ilk karesinden; tahtanın ve yazıların olduğu yer yumuşak ışıkla dolduruldu, ~50 KB JPEG base64), yazı tipi **Fredoka** (yoksa Poppins / sistem yazısı), şeker gibi parlak karolar (`karoSprite`, `KARO_RENK`), gri-mavi tahta (`drawTahta`), krem Türkçe şerit (`drawPrompt`, `kremKutu`), mürdüm paneller, altın ana düğmeler, krem ikincil düğmeler.
- Menülerde (`G.state === 'menu'`) skor, halka, gösterge ve alt panel gizlenir (`body.menude`); arkada kafe ve vitrin tahtası görünür.
- Eski neon renkler CSS'te sistemli olarak çevrildi (koyu lacivert → mürdüm, camgöbeği → altın / krem, neon pembe → sıcak pembe).

## Kullanıcının kesin istekleri (bunları bozmayın)

- **Ninja oyunu değil.** "Savun, saldır, hücum, dojo, düello, usta, öfke, zafer, kes" gibi savaş/ninja sözcükleri ekranda **görünmemeli**. Kodda kalan `dojoBaslat`, `rakipBul`, `sav` gibi değişken adları görünmez; sorun değil.
- **Müzik** `ses/muzik.wav` (lo-fi). **Erkek spiker sesi kaldırıldı** (23 Kasım 2026, oyuncu isteği). Ninja English müziği ve kılıç/gong sesleri kullanılmayacak.
- **Turun başında kısa yönerge okunur, kelimeler okuma bitince düşer** (`otoOku` → `okuBekle`; dinleme turlarında ardından İngilizce). Okuma başlamazsa yaklaşık 2 saniye sonra devam eder; cihazda o dilin sesi varsa ya da okuma daha önce çalıştıysa 3–4 saniye beklenir (`Konus.baslamaSuresi`). Okuma geç başlarsa ve henüz kelime düşmediyse yine bitmesi beklenir. Okuma sırasında duraklatılırsa (telefon kilitlenmesi dahil) devam edince cümle baştan okunur. Türkçe kutusuna dokunmak / T tuşu (`tekrarDinle`) kelimeler daha düşmediyse yeniden okur ve bekler.
- **Karoların üstünde Türkçe yazmaz.** Türkçe anlam ancak kelime diziye doğru yerleşince (ya da joker kullanılınca) görünür.
- **Joker sınırlı**: oyuna 2 jokerle başlanır, yenisi yalnız art arda doğru hamle serisiyle (her 6'lı seride sırayla YAVAŞ → JOKER → CÜMLE BOMBASI) gelir. 1 joker = dokunulan karonun Türkçesi 1 kez, 2 saniye.
- Oyun **zor** olmalı: hata göstergesi dolunca oyun biter; her turun süresi var.
- İngilizce öğretisi (içerik, çeldiriciler, hata kuralları, tekrar sistemi) değiştirilmeden kalmalı; değişen yalnız oynanış (karo tahtası), arka plan sesleri ve oyun müziği.
- **Tahta:** altta ayrı cevap tepsisi / kutu şeridi yok; bütün aksiyon tahtanın içinde. Üstte Türkçe hedef, skor ve hedef sayacı; sol altta CÜMLE BOMBASI, yanında 4 güç kutusu ve sarı bölüm ilerleme çubuğu (bunlar cevap tepsisi değil). Görünüm videodaki kafe teması; süre 3 katı. En uzun cümle ve en uzun kelime tahtaya yatay sığmalı.
- Kullanıcı Türkçe konuşur; ekran yazıları Türkçe.

## Arayüz dili (dil.js, dil-en.js)

- Ekrandaki menü, düğme, bildirim ve oyun içi uyarı yazıları `tt('...')` ile yazılır. **Anahtar Türkçe metnin kendisidir**; Türkçe arayüzde metin aynen çıkar, İngilizcede `DIL_SOZLUK.en` karşılığı gelir. Karşılığı olmayan metin Türkçe kalır (oyun bozulmaz).
- Yer tutucular: `tt('BOMBA! {n} KELİME PATLADI', { n: 3 })`. İngilizce cümlede yer tutucunun yeri değişebilir.
- Yeni metin eklerken `tt()` içine yaz, sonra `dil-en.js`'e karşılığını ekle. Yeni dil: `DIL_SOZLUK.de = {...}` gibi bir dosya ekle, `DILLER` listesine yaz, `build.sh` sırasına koy.
- **Çevrilmeyenler (bilerek):** İngilizce öğretim içeriği ve Türkçe anlamlar, bölüm/seviye/paket adları (icerik.js), hata kuralları ve ders metinleri, "Türkçe mantığıyla gör", hata bulma soru yönergeleri (ogretim.js). Bunlar Türkçe konuşanlara özel içeriktir; başka dil konuşanlar için ayrı içerik projesi gerekir.
- Dil seçimi: Ayarlar → **Arayüz dili** (Türkçe / English). Cihaza `te_dil` anahtarıyla kaydedilir (profilden bağımsız).
- Yazılar `tt()` ile, kullanıldığı anda çevrilir; sabit listeler (`SLIDES`, `SEV_ACIK`, ayar adları, `KOMBO_KADEME`) Türkçe kalır ve gösterilirken çevrilir. Dil değişince tuvaldeki arka plan yazıları `renderBG()` ile yeniden çizilir.
- Yerel değişkenlerin çoğu `t` adını kullandığı için çeviri işlevinin adı **`tt`**'dir; `t` adında yeni bir genel işlev tanımlamayın.

## Kalıcı kayıt (depo.js)

- **Tarayıcıda** (şimdiki web sürümü): `localStorage`; davranış eskisiyle aynı.
- **Uygulamada** (Capacitor, `@capacitor/preferences` eklentisi yüklüyse): kayıtlar telefonun kalıcı hafızasına yazılır. İşletim sistemi yer açmak için tarayıcı hafızasını silse de profil ve yarım bölüm kalır. İlk açılışta tarayıcıdaki eski `te_` kayıtları bir kez kalıcı hafızaya taşınır; anahtarlar ve biçim değişmez.
- Okuma bellekteki kopyadan anında yapılır; yazma arkada kalıcı hafızaya gider (yedek kopya localStorage'a da yazılır). `boot()` önce `await Depo.hazirla()` bekler, sonra profilleri okur.
- Eklenti çalışmazsa sessizce tarayıcı hafızasına döner. `Depo.durum()` → `{ bekleyen, hata, tasinan }`.

## Kayıt güvenliği (kayit-sema.js + kayit.js)

Kayıttan okunan her veri oyuna girmeden önce doğrulanır. Amaç: oyun hiçbir kayıtta çökmesin, hiçbir veri sessizce kaybolmasın.

| Durum | Ne olur |
|---|---|
| Alan eksik (eski kayıt) | Varsayılan değer konur; uyarı ve yedek yok |
| Alan yanlış türde (ör. `yildiz: null`, `best: "abc"`) | Yalnız o alan onarılır, geçerli parçaları korunur; ham kayıt yedeklenir; oyuncuya bir kez "Kaydının bir kısmı bozuktu ve düzeltildi" denir |
| Kayıt hiç okunamıyor (bozuk JSON) | Ham kayıt yedeklenir, profil temiz kayıtla açılır, oyuncuya söylenir |
| Profil listesi kayıp/bozuk | Telefondaki `te_profil_<id>` kayıtları "Profil 1, 2…" adıyla geri bağlanır (okunamayan profil bağlanmaz) |
| Profil listesinde yinelenen/kuralsız kimlik, boş isim, olmayan aktif profil | Temizlenir; aktif profil ilk geçerli profil olur |
| Yarım bölüm kaydı bozuk | Silinir, "Yarım bölüm açılamadı" denir; bölüm baştan başlatılabilir |
| Telefonda yer yok (yazma hatası) | Oyun sürer, bir kez uyarılır; yer açılınca otomatik kayıt yine çalışır |
| Tanınmayan alan (ileriki sürümden) | Dokunulmaz, korunur |

- **Yedek:** `te_yedek:<anahtar>:<zaman>` anahtarında ham hali durur; her anahtar için en çok 3 yedek, aynısı ikinci kez yedeklenmez.
- **Sürüm:** kayıt artık `v: 2`. Biçim değişirse `KAYIT_SURUM`'u artır, `GOCLER`'e bir göç adımı ekle; `ALANLAR`'a yeni alanın doğrulayıcısını yaz; `bosKayit()`'a varsayılanını ekle.
- **Uyarılar:** açılışta `kayitUyarilariGoster()` bir kez gösterir; oyun açıkken çıkan uyarı hemen gösterilir.
- **Sıra:** kayıtlar `SEVIYE` tanımlandıktan sonra (kayit.js sonunda, ogretim.js'ten sonra) okunur; uygulamada `boot()` kalıcı hafıza hazır olunca okur.

## XP, günlük hedef ve seri (ilerleme.js)

Oyuncu her gün küçük bir hedefe ulaşır; ulaştığı her gün seri 1 artar. Can/enerji sistemi yoktur: oynamak hiçbir zaman kısıtlanmaz.

| Olay | XP |
|---|---|
| Cümle kuruldu | 4 (hatasızsa +2) |
| Hatayı bul turu çözüldü | 3 |
| Kelime sorusu | ilk denemede 2, değilse 1 |
| Yeni kelime tanıtıldı | 1 |
| Bölüm/paket kazanıldı (seviye testi ve rehberli ilk cümle hariç) | 5 + yıldız başına 2 |
| Online maç | kazanırsa 5, kaybederse 2 |

- **Günlük hedef:** Rahat 20 / Normal 50 (varsayılan) / Ciddi 100 XP; Ayarlar'dan değişir. Hedef düşürülür ve bugünkü XP yeni hedefi aşıyorsa bugün sayılır.
- **Gün:** telefonun yerel günü (`YYYY-MM-DD`); gece yarısından sonra kazanılan XP yeni güne yazılır.
- **Seri:** hedef dün ya da bugün tamamlandıysa sürer. Arada gün kaçtıysa her kaçan gün için 1 seri dondurma harcanır; yetmezse seri 0'a döner ve oyuncuya bir kez söylenir. Saat geri alınırsa seri bozulmaz.
- **Seri dondurma:** serinin her 7. gününde 1 tane; en çok 2 birikir.
- **Kayıt alanları:** `xp` (toplam), `gunluk: { hedef, gunler: { gün: xp } }` (son 120 gün), `seri: { gun, enUzun, sonGun, dondurma, donan }`. Bozuk değerler `kayit-sema.js`'te onarılır.
- **Ekranlar:** açılışta halka + seri (dokununca profil), bölüm/online sonunda kazanılan XP, halkanın dolması ve hedef kutlaması (ses kapalıyken de yazıyla görünür), profilde toplam XP ve en uzun seri.
- Kurallar `XP_KURAL`, `HEDEFLER`, `SERI_DONDURMA_*` sabitlerindedir.

## İlk 60 saniye (ilk.js)

Telefonda hiç profil yoksa (ve profillerden önceki eski kayıt da yoksa) oyun isim ve seviye sormadan önce rehberli bir cümleyle açılır. Amaç: oyuncu ilk dakikada oyunun ne olduğunu oynayarak anlasın ve ilk başarısını yaşasın.

1. **Karşılama** (`ilkKarsila`): tek düğme "İLK CÜMLENİ KUR". Altında "Rehberi geç, profil aç" (eski isim formu).
2. **Rehberli cümle** (`ilkBaslat` → `dojoBaslat(r, { ilkCumle })`): ilk bölümün 3 kelimelik ilk cümlesi (şu an "I am happy." / "Ben mutluyum."). Türkçesi önce okunur, karolar sonra yağar; karolarda Türkçe yazmaz.
   - İlk kelime sol başta hazır durur (çapa); tuzak kelime, süre, hata göstergesi ve renk patlaması yok.
   - İlk kelimede el işareti hemen sıradaki karodan dizinin sonuna kayar; sonrakilerde oyuncu önce kendi düşünür, 2,5 sn sonra ya da hatalı denemede el işareti gelir.
   - Yanlış kelimeyi dizinin sonuna koymak engellenir (karo geri seker); koç nedenini söyler. Ceza, gösterge, hata defteri, tekrar listesi yok.
   - Koç baloncuğu (`#koc`, ekran okuyucu duyurur) tahtanın altında durur (tahta ona yer ayırır); Türkçe cümleyi ve karoları kapatmaz.
3. **Sonuç** (`ilkSonuc`): cümle, dinle düğmesi, +XP ve dolan günlük halka; isim kutusu. İsim yazılınca `profilOlustur(ad, true)` profili açar ve rehberde kazanılan XP'yi (ve ses ayarlarını) yeni profile geçirir.
4. **Günlük hedef** (`ilkHedefAc`): Rahat 20 / Normal 50 (önerilen) / Ciddi 100; sonra seviye seçimi (`ilkGiris`).

- Rehberli cümle kariyer kaydına dokunmaz: yıldız, açılan bölüm, rekor, bölüm sayısı, `rehber` ve `tutGor` değişmez; yarım kayıt yazılmaz. İlk gerçek bölümün öncesindeki "Nasıl oynanır" anlatımı aynen durur.
- Motor kancaları: `game.js` (`dojoBaslat` opt.ilkCumle, `baslangicDuzelt`, `hamle` → `ilkUyar`, `sureHesapla` / `gostergeEkle` / `renkKapali`, `dojoBitti`), `engine.js` (`update` → `ilkTik`, `tahtaYerlesim` koç yeri). Olaylarda `mod: 'ilk'`.
- Profil olmayan her yol `profilsizAc()` ile açılır: ilk kezse karşılama, değilse isim formu. Son profil silinince karşılama yeniden gelir.

## Ünite haritası (harita.js)

Kariyer ekranındaki liste, Duolingo'daki gibi aşağı doğru ilerleyen bir yoldur. Yalnız gösterimdir: kilit kuralları (`rakipAcikMi`, `paketAcikMi`), bölüm sırası, içerik ve öğretim aynıdır; durağa dokununca eskisi gibi `cumleDojo` / `paketBaslat` açılır (gerekirse önce ders ve "Nasıl oynanır").

- **Ünite = içerikteki bölge** (`r.bolge`, ardışık bölümler). A1'de 6 ünite: Temel Yapılar, Ev ve eşyalar, Okul ve günlük hayat, Şehir ve dışarıda, Kelime ve Kullanım, Seviye Sınavı. Çoğu ünite bir ara sınavla biter.
- **Ünite kartı:** "ÜNİTE n", ad, ★ toplanan / en çok, biten / toplam bölüm çubuğu, 📖 Ders (ünitenin sıradaki bölümünün dersi; yoksa açık son bölümünki). Durum: tamam (yeşil), aktif (sıradaki bölüm bu ünitede, parlar), kilitli (soluk).
- **Durak:** daire + yanında yazı (bölüm adı, ara sınav / seviye sınavı etiketi, kural, yıldızlar). Kilitli 🔒, ara sınav 🏆, seviye sınavı 👑, sıradaki ▶ (nabız gibi atar, yazısında BAŞLA; harita açılınca ortaya kaydırılır). Duraklar zikzak dizilir (yüzde 22 / 62 / 78 / 38); yazı dairenin geniş tarafına yazılır, genişliği durağın yerine göre hesaplanır.
- **Kelime yolu:** paketlerin bölgesi yok; ardışık paketler türüne göre (konu paketleri / "Kelime N") en çok 6'lık gruplara ayrılır ("Konu paketleri", "Kelime 1–6"). Dairenin çevresi öğrenilen / toplam halkasıdır.
- **Ünite tamam:** bir ünitenin son yıldızsız bölümü ilk kez kazanılınca sonuç ekranında 🏆 "ÜNİTE n TAMAM" + sıradaki ünite (son ünitede "seviyenin bütün üniteleri bitti") ve `uniteTamam` olayı. Tekrar oynayınca kutlanmaz.
- Erişilebilirlik: her daire bir düğmedir; ekran okuyucu "ad · ara sınav · sıradaki / kilitli / n / 3 yıldız" okur. Hareket azaltma açıksa nabız animasyonu durur.

## İngilizce dizilişi · SVOPT kartı (dizilis.js)

Yüklenen "tetris-english-5" sürümündeki özellik; yalnız bu kısım alındı.

- Cümle kurma turunda (bölüm, kelime paketi, tekrar, dinleme turu, rehberli ilk cümle) cümle tamamlanınca oyun durur ve kart açılır. Her parçanın üstünde görevi (S Özne · V Fiil · O Nesne · P Yer · T Zaman; gerektiğinde Soru, Bağlaç, Nasıl, Ek bilgi), ortada İngilizcesi, altında **İngilizce sırayla** Türkçesi: `S I · V am going · P to school` / `Ben · gidiyorum · okula`. Türkçe sıralı cümle kartta yoktur (oyunda zaten görünüyor).
- Kart **dokunana kadar** kalır; ekranın her yerine dokunmak (kart bütün ekranı kaplar), Enter, boşluk ve ↓ kapatır. Escape oyunu duraklatır, kart yerinde kalır. "Dinle" düğmesi cümleyi yeniden okur; kart açıldıktan 0,8 sn sonra cümle bir kez okunur. Kapanınca sonraki cümle 0,3 sn sonra gelir.
- Online maçta ve seviye testinde açılmaz (bu oyunun seviye testi kelime sorularından oluşur). Bölümden çıkınca kart kalkar (`demo` → `dizilisGizle`).
- Ayar: Ayarlar → "İngilizce dizilişi" (`kayit.ayar.dizilis`, varsayılan açık; eski kayıtta yoksa açık, bozuk değer onarılır).
- Türkçe karşılıklar cümlenin kendi çevirisinden alınır (`dizilisCoz(en, tr, kodlar, sozlukAl)`: sözlük + `DZ_ISLEV` + `DZ_EKSOZ` ile eşleştirme, Türkçenin fiil sonda olması kuralı). Çeviriden bulunamayan parçada sözlük karşılığı **eğik** yazılır ("Eğik yazılar sözlük karşılığıdır" notu). Yardımcı fiiller "(ek fiil)", "(yardımcı)", soru başı "(soru)" olarak gösterilir.
- Bütün parçaları çeviriden bulunan cümle oranı: A1 %75 · A2 %53 · B1 %40 · B2 %21 · C1 %12 · C2 %7 (diğerlerinde bazı parçalar sözlükten). Artırmak için `DZ_EKSOZ` tablosuna sık kelimelerin çevirideki karşılıkları eklenir; `dizilis_birim` testi yeni oranları yazar.
- **Hazır diziliş (yapay zekâyla):** en doğru sonuç için cümleler bir yapay zekâya parti parti yaptırılır. İstem ve adımlar: `kaynak/dizilis/PROMPT.md`. Girdi partileri `python3 araclar/dizilis-hazirla.py` → `kaynak/dizilis/girdi/*.txt` (100'er cümle, hazır olanlar atlanır; şu an 104 parti). Yapay zekânın cevabı `kaynak/dizilis/cikti/*.jsonl` olarak kaydedilir; derleme (`build.sh`) önce `araclar/dizilis-birlestir.py` ile denetler (kimlik, İngilizce kelimeler eksiksiz ve aynı sırada, görev kodları, boş Türkçe), kabul edilenleri `kaynak/dizilis/dizilis.json`'a ve oyunun okuduğu `kaynak/dizilis-hazir.js`'e (`window.NE_DIZILIS`) yazar; reddedilenler nedenleriyle `kaynak/dizilis/hatalar.txt`'ye. Oyun önce hazır dizilişi (`dizilisHazir`: içerikte 5. alan ya da `NE_DIZILIS[bölüm:sıra]`), yoksa otomatik eşleştirmeyi kullanır. Şu an 4 cümle hazır.
- Test botu kartı oyuncu gibi 1 sn sonra kapatır; kartı testin kendisi denetleyecekse `window.__dzElle = true`.

## Profiller ve kayıt (anahtarlar; depo.js üzerinden)

| Anahtar | İçerik |
|---|---|
| `te_profiller_v1` | `{ aktif, liste: [{ id, ad, t }], eskiAktarildi }` |
| `te_profil_<id>` | O profilin bütün ilerlemesi (`kayit`: açılan bölümler, yıldızlar, kelimeler, hata defteri, ayarlar, online istatistiği, XP, günlük hedef, seri) |
| `te_yarim_<id>` | Yarıda kalan bölüm (`yarimKaydet`, game.js) |
| `te_kayit_v1` | Profillerden önceki tek kayıt; ilk açılan profile bir kez aktarılır, yedek olarak silinmez |

- `kaydet()` her değişiklikte aktif profile yazar (otomatik kayıt). Profil ekranındaki **💾 OYUNU KAYDET** aynı kaydı elle yapar ve "Son kayıt" saatini gösterir.
- **Yarım bölüm**: cümle bölümü ve kelime paketinde her turun başında (`turBaslat` → `yarimKaydet`) tur sırası, o turun cümlesi/sorusu, skor, kombo, güçler, hata göstergesi, CÜMLE BOMBASI dolumu, istatistikler ve hata listesi kaydedilir. Kariyer'de ▶ KALDIĞIN YERDEN (`yarimSurdur`) o turdan devam eder; yarıda bırakılan tur baştan oynanır. Bölüm bitince ya da kaybedilince yarım kayıt silinir. Antrenman, seviye testi ve online maç kaydedilmez.

## Online kapışma

### İki mod (23 Kasım 2026)
- Online giriş: önce mod seçimi (`onlineAc` → ekran `onlineSecim`): **⚡ HIZ** ve **🧠 STRATEJİ**. Mod ekranında (`onlineModAc`, ekran `online`) seviye (A1–C2) seçilir ve rakip yolu: **🎲 HIZLI EŞLEŞ**, **🤖 BİLGİSAYARA KARŞI**, **ODA KUR** / kodla **KATIL**.
- **HIZ**: eski kapışma; cümleler seçilen seviyeden. Bilgisayar rakip (`botMacBaslat`, `botHizTik`) her cümleyi seviyesine göre bir sürede bitirir (`BOT_KELIME_SN`, kelime başına ~3–3,8 sn + cümle başına 6 sn, ±%20); süre oyun saatiyle ölçülür (duraklatınca bilgisayar da bekler).
- **Hızlı eşleşme** (`eslesmeBaslat`): konu `…/lobi-<mod>-<seviye>`. Herkes 2 sn'de bir `bekle` yayınlar; kimliği küçük olan `teklif` (gizli oda kodu) gönderir, öbürü 3 kez `kabul` eder; ikisi o odaya geçer, ev sahibi (`OD.oto`) rakip gelince maçı kendiliğinden başlatır. 20 sn'de kimse yoksa bilgisayara karşı oynama önerilir.
- Bilgisayara karşı maçlar `kayit.istat.online`'a sayılmaz (XP verir, `onlineBitti` olayında `bot: true`).

### Görünüm (24 Kasım 2026)
- Online giriş (`onlineAc`): iki büyük mod kartı, içlerinde küçük canlı görseller (HIZ: yarışan karolar ve kronometre; STRATEJİ: patlayan mini ızgara ve bomba); oyuncunun maç / galibiyet özeti.
- Mod ekranı (`onlineModAc`): renkli bant, seviye karoları (`LVL_RENK`), büyük HIZLI EŞLEŞ, iki seçenek kartı (Bilgisayar · Oda kur), kodla katıl.
- Ortak parçalar: `oyuncuHtml` (avatar, ad, alt yazı, kazanana taç), `vsHtml` (iki oyuncu ve VS rozeti), `kiyasSatir` (iki değeri ortadan dışa çubuklarla karşılaştırır).
- Eşleşme: radar (dalgalar, yörüngede dönen kelime karoları, ortada oyuncunun avatarı). Lobi: VS kartı (rakip yoksa nabız gibi atan "?"), oda kodu ve **📤 Kodu paylaş** (telefonun paylaş menüsü; yoksa panoya kopyalar).
- HIZ maçı içinde (engine.js `drawStatus`): **yarış çubuğu**: "Sen" ve rakip iki satır; avatarlar bitirilen cümle kadar ilerler, rakibin hata göstergesi ince çizgi.
- Sonuç ekranları (HIZ ve STRATEJİ): VS kartı ve taç, karşılaştırma çubukları (cümle / skor / süre; stratejide tur tur ve toplam). Stratejide üst çubukta avatarlı tur skoru, kurallar kartında VS.
- Online ekranlarında ⚔ yerine 🏁.

### Hazır emojiler (emoji.js, 24 Kasım 2026)
- Yalnız 6 hazır emoji (`EMO`: 👍 😮 😂 🔥 👏 😅); yazı yok, denetlenecek kullanıcı içeriği oluşmaz. Ağ mesajı `emo` (`mac`, `e`: sıra), yalnız eşleşilen rakipten ve açık maçtan kabul edilir.
- 😊 düğmesi (`#emo-btn`) bağlama göre yer alır (`emoBaglam`): HIZ maçında yarış çubuğunun sağı (engine.js `window.__yarisKonum`), stratejide rakip satırı (kurallar ve tur paneli açıkken yok), sonuç ekranlarında VS rozetinin altı; menüde görünmez. Çubuk (`#emo-bar`): 6 emoji + 🔇 (bu maçta rakibin emojilerini gizler).
- Gönderilen emoji kendi avatarının, gelen emoji rakibin avatarının yanında uçar (`.emo-ucan`, rakipte adıyla). Gönderme 1,5 sn'de bir (`EMO_ARALIK`), gelenler en çok 0,8 sn'de bir gösterilir.
- Bilgisayar rakip ara sıra karşılık verir (`emoBotTepki`, olasılık %45; testte `window.__emoBotOlasilik`): oyuncunun emojisine, tur / maç sonucuna, HIZ'da cümle bitirince.

### Strateji alıştırması (24 Kasım 2026)
- İlk strateji maçından önce bir kez (`kayit.strRehber`, kayit-sema.js doğrular) ya da strateji ekranındaki **📘 Nasıl oynanır? (alıştırma)** ile (`strRehberTek`).
- Elle hazırlanmış 6×4 tahta (`REHBER_TAHTA`), cümle "Ben mutluyum." → I am happy. Adımlar `REHBER`: bilgi → mavi karoyu I'nın yanına taşı (kayma görülür) → bilgi → yeşil karoyu happy'nin yanına → I, am (sarı "are" tuzağı uyarısı), happy kutulara → BOMBA → kapanış.
- Koç balonu (`.st-koc`, yazı sesli okunur) üstte durur, içerik balonun altına iner; parlayan kaynak (`.rh-kaynak`), kesik çizgili hedef (`.rh-hedef`), el işareti (`#st-el`, sürükleme / dokunma animasyonu). Her adımda yalnız gösterilen hamle yapılabilir (`rehberIzin`); yanlışta balon sallanır.
- "Geç" ya da bitirince alıştırma görülmüş sayılır; maçtan önceyse kurallar kartı açılır.

### Sesli okuma (24 Kasım 2026, oyuncu isteği)
- Her turun başında yönerge, **ardından Türkçe cümle / anlam / kelime** kendiliğinden okunur (`otoOku`); karolar okuma bitince yağar. Dinleme turunda İngilizce. İçeriği yönergenin kendisi olan turlarda (`R.otoIcerik = false`) tekrar okunmaz. Stratejide tur başında Türkçe cümle okunur.
- Ayarlar: "Yönergeleri sesli oku" yalnız yönergeyi, "Türkçe sesli okuma" Türkçe içeriği kapatır.

### STRATEJİ (strateji.js)
- Maç 3 tur (`STR_TUR`); her tur bir cümle (`strCumleler`: seviyeye göre `STR_ARALIK` kelime, 13 harften uzun kelime yok). Süre 180 sn (`STR_SURE`), hamle = kelime sayısı + 6.
- **Tahta** (`strTahta(cümle, seviye, tohum)`): 6 sütun, 6 satır (8+ kelimede 7), 3 boş hücre; 4 renk. Hedef kelimeler + tuzaklar (`2 + seviye sırası` kadar; içerikteki çeldiriciler, **doğrusuyla aynı renk**) + aynı seviyenin başka cümlelerinden dolgu kelimeler (renkler dengelenir). Yerleştirmeden sonra onarılır: hazır 3'lü aynı renk yok, hedef karonun yanında kendi rengi yok (`strKotuHucreler`). Aynı tohum → aynı tahta (iki telefon aynı tahtayı kendisi üretir).
- **Kayma** (`strTasi`): karo hedef hücreye oturur; oradaki ve arkasındakiler okuma sırasıyla sağa (satır sonunda alt satıra, tahta sonunda başa) kayar ve ilk boşluğu doldurur; karonun eski yeri boşalır. Boş hücreye bırakmak kaydırmaz.
- **Seçim**: kutulara karonun gölgesi gider (`R.secim`, karo kimliği), karo tahtada kalır; seçim hamle harcamaz. Sürükle-bırak (hücreye: taşı, kutuya: seç) ya da dokun-dokun. Kutuya dokununca gölge geri alınır.
- **Bomba** (`strPatlamaPlani`): cümle doğruysa (`strDogruMu`, büyük/küçük harf ve noktalama farkı yok) seçilen karolar + bağlı aynı renk patlar (10 puan/karo); düşme (`strDus`), sonra 4+ aynı renk bağlı grup zincirleme patlar (her zincir ×1,5, ×2…); tahta tamamen temizlenirse +300. Yanlışsa 0.
- **Karar**: tur → ikisi doğruysa puan, biri doğruysa doğru olan, ikisi yanlışsa berabere (`strTurKazanan`). Maç → tur sayısı, eşitse toplam puan, yine eşitse berabere.
- **Bilgisayar** (`strBotOyna`): doğru seçme olasılığı seviyeye göre (`STR_BOT_DOGRU`, %86 → %72; yanlışta bir kelimenin yerine onun tuzağını seçer); hamle hakkının %40–70'ini açgözlü kullanır (her adımda bombayı en çok büyüten taşımalardan biri). Ölçüm: hiç taşımayan oyuncu tur başına ~80–150, bilgisayar ~190–265, iyi oyuncu ~400–570 puan.
- **Ağ**: ev sahibi `basla` mesajına `mod: 'strateji'`, `tohum` ve 3 cümle koyar; her tur sonunda `stur` (tur, doğru, puan) 3 kez gönderilir. Turlar iki telefonda bağımsız ilerler; tur sonucu iki taraf da bitirince görünür.
- Ekran `#str` (DOM, tuvalin üstünde): karolar kimlikle eşlenir ve CSS geçişiyle kayar; patlama: parlama, sarsıntı, kıvılcım, uçan puan, ses ve titreşim. Yatay ekranda tahta solda (`#str.yatay`). Geri tuşu / Escape / ✕ → çıkış onayı.

- Ev sahibi **ODA KUR** der, 4 haneli kod çıkar; arkadaşı kodu yazıp **KATIL**ır. Ev sahibi seviyeyi seçip **MAÇI BAŞLAT**ır.
- İkisi aynı 5 cümleyi kendi tahtasında kurar (yalnız CÜMLEYİ KUR turları). Rakibin adı, bitirdiği cümle sayısı ve hata göstergesi Türkçe kutusunun sol altında görünür.
- Önce bitiren kazanır (süre bitirdiği cümlenin tamamlandığı an ölçülür); hata göstergesi dolan kaybeder; maçtan çıkan ya da 15 sn sesi gelmeyen kaybeder.
- Bağlantı: ücretsiz genel MQTT sunucuları, WebSocket üstünden (`ONLINE_SUNUCULAR`: HiveMQ ve EMQX). İkisine birden bağlanılır; biri çalışmazsa öbürü yeter, iki yoldan gelen aynı mesaj bir kez işlenir. Bu sunucular deneme amaçlıdır, garanti vermez; kalıcı bir yayında kendi sunucunuzu `ONLINE_SUNUCULAR` listesine yazın. Test için `window.TE_SUNUCULAR` ile başka sunucu verilebilir.
- Konu: `stacking-sentences-tr/v1/oda/<kod>` (23 Kasım 2026: mağaza sürümü için eski marka adı konudan da kaldırıldı; eski sürümlerle eşleşmez). Mesajlar ve akış `online.js` başındaki açıklamada.

## Spiker

Erkek spiker sesleri (spiker-1..3) kaldırıldı (23 Kasım 2026, oyuncu isteği); `Ses.spiker()` hep `false` döner, oyundaki çağrılar zararsız kalır.

Not (23 Kasım 2026): oyuncunun getirdiği audio_v2.js kullanılmadı. Onun "doğal ses motoru" kelime söylemiyor, hece başına ton çalıyordu (yönergeler anlaşılmaz, Dinle turları oynanamaz).

## Test sonrası yapılan düzeltmeler (19 Kasım 2026)

- **Kelime anlamındaki tür etiketi** ("duş almak · ifade", "öğrenmek · fiil öbeği", 100 kelime): `paketKelimeleri` etiketi anlamdan ayırıp türe yazar. Önceden "Türkçesini bul" sorusunda bu kelimelere çeldirici çıkmıyordu ya da etiket doğru cevabı ele veriyordu.
- **Blok resmi önbelleği sınırlandı** (`SPR_MAX`, core.js): önceden her bölümde ~12 MB tuval belleği birikiyor, uzun oyunda telefon tarayıcısı çökebiliyordu.
- **ÇÖPE AT dairesi ENTER'ın üstünde**: dairenin alt sağına dokunmak ENTER'a gidiyor, tuzak kelime yanlışlıkla bırakılıyordu.
- **Dinle ve kur**: İngilizce okuma hiç başlamazsa Türkçesi 2 sn sonra gösterilir (önceden 9 sn bekleniyordu).
- Dar ekranda Türkçe kutusunun üst satırı ve uzun kartlar sığacak kadar küçülür; joker yazısı kuyunun tepesinde kesilmez.

## Test seti (kaynak/testler)

Her değişiklikten sonra çalıştır. Python 3 + `pip install playwright` + `playwright install chromium` gerekir.

```
cd kaynak
sh build.sh
python3 testler/calistir.py            # bütün testler (~8 dk), adım sonunda
python3 testler/calistir.py --hizli    # her değişiklikte (~3 dk; veri, online ve tek hariç)
python3 testler/calistir.py modlar dil # yalnız seçilenler
```

| Test | Ne kontrol eder |
|---|---|
| `acilis` | İlk açılışta karşılama; rehberi geçip profil oluşturma, açılış ekranı, JS hatası yok |
| `harita` | 20 seviyenin yolu içerikle birebir (ünite, bölüm, paket sırası; grup ≤ 6); 320, 360 ve 844 px ekranda taşma, yazı-daire çakışması ve dar yazı alanı yok; ünite/durak durumları kayıtla aynı, tek sıradaki ve ekranda; kilitli durak uyarısı; sıradaki durak (önce ders) ve yazıya dokunma aynı bölümü açar; ünite dersi kısayolu ve geri; kelime halkası ve kilitli paket uyarısı; ünite tamam bir kez kutlanır, olay duyurulur, seviye sonu; İngilizce |
| `dizilis_birim` | Yüklenen sürümün birim testi (`node --test testler/dizilis.test.mjs`): 10 örnek cümle SVOPT sırasıyla, bütün içerikte her parçada görev ve Türkçe, kapsama oranları |
| `dizilis` | Kart cümle kurulunca açılır; görev, İngilizce, Türkçe her parçada, parçalar cümleyle aynı, Türkçe sıralı satır yok; 20 sn oyun bekler; Dinle kapatmaz; dokunma, Enter, boşluk, ↓, tahta alanı kapatır; Escape duraklatır, çıkınca kalkar; ayar kapalı 0 kart, açık her cümlede 1; seviye testinde ve online'da yok; B2'de var; hazır diziliş kullanılır; ayar kalıcı, eski kayıtta açık, bozuk değer onarılır; 320, 390, 844 px; İngilizce |
| `goster` | İngilizceyi göster / gizle: sekmede bir kez sorulur (seçilmediyse bölüm başlarken), değiştir düğmesi, seçim yeniden açılınca kalır; gösterilince İngilizce satır var, puan ve XP yarı (olaylardan hesaplanan), sonuçta not; seviye testi gizli |
| `yonerge` | Sahte okuma sesiyle: her turda yalnız kısa yönerge okunur, Türkçe cümle kendiliğinden okunmaz (şeride dokununca okunur); dinleme turunda ardından İngilizce; yazım turunda "Doğru yazılışı yanlışın üstüne kaydır"; oyunda bilgi kutusu yok; anlatım sesli; Ayarlar'dan kapanır |
| `ilk` | İlk 60 saniye: karolar 8 sn içinde yağar; ilk kelime sol başta hazır, süre/tuzak yok; el işareti hemen; yanlış kelime cezasız geri seker; koç Türkçe cümleyi kapatmaz; sürükleyerek ve dokun-dokun yerleştirme; ikinci kelimede gecikmeli ipucu; +6 XP isimle açılan profile geçer, kariyer kaydı değişmez; hedef seçimi; yeniden açılışta halka; hızlı oyuncu 30 sn altında bitirir; duraklat/çık, rehberi geç, geri tuşları; son profil silinince karşılama |
| `veri` | 9.031 cümle ve 11.253 kelimenin bütün turları 3 ekran boyutunda tahtada kurulup çizilir; hedef her zaman tek satıra sığar (taşma 0), en uzun cümle / kelime / sütun yazılır; karo yazısı ve Türkçe kutusu sorunları `taban.json`'dakini aşmaz |
| `modlar` | Bot (oyunun `hamle` / `dokun` işlevleriyle, `ipucuHamle` / `yanlisHamle`) 7 modu sonuna kadar oynar (kariyer, kelime paketi, seviye testi, kaybetme, antrenman, B2, C2 sınavı); takılma yok |
| `profil` | Yarım bölüm (skor ve hata göstergesi), kapatıp açınca kaldığı yerden devam, OYUNU KAYDET, ikinci profil, silme, eski kayıt aktarımı |
| `yarim_kelime` | Kelime paketinde hata göstergesi doluyken çıkıp aynı durumdan devam |
| `dokunma` | Güç ve sistem düğmeleri 3 ekran boyutunda ekranda ve basılabilir; tahta ekranda ve düğmelerin altında değil; sürükleme ve dokun-dokun hamle yapar |
| `online` | Yerel test sunucusuyla iki telefon: HIZ odası (aynı cümleler, sonuç, yanlış kod); STRATEJİ odası (aynı maç bilgisi ve tahta, 3 tur, iki telefonda tur puanları birebir, tutarlı karar); hızlı eşleşme (A2'de iki bekleyen eşleşir, maç kendiliğinden başlar) |
| `metin` | Türkçe arayüzdeki 34 ekran, koç yazıları ve tuvaldeki yazılar `metin_taban.json` ile birebir aynı |
| `dil` | İngilizce arayüz seçilir, kalıcıdır, Türkçe arayüz yazısı kalmaz (rehberli ilk cümle ve koç dahil) |
| `depo` | Uygulama modu (Capacitor taklidi): eski kayıt taşınır, tarayıcı hafızası silinse de profil ve yarım bölüm kalır |
| `olay` | Motorun olayları 5 modda oyunun sayaçlarıyla birebir; bozuk dinleyici oyunu durdurmuyor |
| `derleme` | Her `.js` parçası `build.sh` listesinde ve derlemede; katman kuralları |
| `tek` | Kökteki tek dosya son kaynaktan üretilmiş, sesler ve içerik gömülü (yalnız tam sette) |
| `ilerleme` | Seri kuralları tablosu (dün, bugün, kaçan gün, dondurma, 7. gün, saat geri, artık yıl); sahte saatle gün atlama, gece yarısı, yeniden açılış; bölüm/paket/seviye testinde XP olaylarla birebir; hedef değiştirme; ses kapalıyken kutlama; bozuk ilerleme kaydının onarımı |
| `gorev` | Günün Görevi: açılış düğmesi; aynı gün aynı görev, ertesi gün farklı; A1/B2/C2'de 5 cümle; 5 cümle + 2 hatayı bul; bonus XP yalnız günün ilk tamamlanışında; görev serisi (ertesi gün 2, kaçan gün 1); kariyer yıldızı / kilidi ve yarım kayıt değişmez; ANA MENÜ ve duraklatmadan çıkış; bozuk görev / rozet kaydının onarımı |
| `rozet` | Rozetler: sayaçlar olaylarla birebir; İlk Cümle açılır ve sonuçta kutlanır, ikinci kez kutlanmaz; rozet ekranı 320, 390, 844 px'te taşmaz; eski oyuncuda sessizce açılır; İngilizce arayüzde Türkçe yazı yok |
| `strateji` | Kayma kuralı (sağa, satır sonunda alta, ilk boşluğa); 6 seviyede 18 tahta (aynı tohum aynı tahta, 3 boşluk, tuzak doğrusuyla aynı renk, kötü başlangıç yok); bomba ve doğruluk; bilgisayara karşı maç ekrandan: sürükleyerek taşıma, kutuya sürükleme (gölge, hamle harcamaz), dokun-dokun, kutudan geri alma, hamle sınırı, 3 ekranda taşma yok, 3 tur (biri yanlış) ve karar, tekrar oyna, çıkış, süre dolması, İngilizce |
| `strateji_rehber` | Alıştırma: ilk maçta bir kez; bilgi adımında ve gösterilmeyen hamlede taşıma yok; sürükleyerek kayma; sırası gelmeyen kelime ve tuzak seçilmez, uyarı; bomba; kurallar kartı ve maç; kalıcı; Nasıl oynanır ve Geç; bütün koç yazılarının İngilizcesi |
| `emoji` | Menüde düğme yok; HIZ maçında düğme, çubuk (6 emoji + sustur), uçan balon, 1,5 sn sınırı, bilgisayarın adıyla karşılığı; strateji: kurallar kartında yok, maçta var, gönderilir; çıkınca kalkar. (`online` testi: iki telefon arası emoji, susturma, geçersiz emoji) |
| `hiz_bot` | HIZ: B1 seçilip bilgisayara karşı; cümleler B1'den, bilgisayar ilerliyor, karar, online istatistiğine yazılmaz, tekrar oyna, duraklatıp çıkış |
| `uygulama` | Capacitor taklidiyle: yerel okuma (Türkçe dil kodu, kesilen okumanın bitişi, sus), titreşim ve kapatma, geri tuşu (oyun, duraklatma, profil, açılış), arka plana gidince duraklama, hatırlatma ayarı ve planlama, çentik payı |
| `kayit` | Bozuk/eksik/yanlış türde/eski kayıtlar, profil listesi kurtarma, bozuk yarım bölüm, yer yok, uygulama modu, 3.000 rastgele bozuk kayıtla doğrulayıcı (hata yok, çıktı geçerli, ikinci geçişte değişmez) |

- Oyun testte yerel `http.server` ile açılır (gerçek sunucudaki gibi); Google Fonts isteği boş cevapla karşılanır, internet gerekmez.
- `metin` testi her çalıştırmada aynı oynar: rastgelelik sabit tohumlu, saat oyunun saatine bağlı, cihazın sesli okuması sessiz (gerçek zamanlı okuma olayları karoların yağma anını değiştiriyordu). İngilizce dizilişi kartlarının metinleri de toplanır (`dizilis`).
- Bilerek yapılan bir yazı değişikliğinden sonra `python3 testler/calistir.py metin --taban` tabanı yeniler; önce farkı gözle kontrol et.
- Ekran görüntüleri `testler/cikti/` klasörüne yazılır.

## Yayınlama

- Tek dosya: kökteki `index.html` (ya da `kaynak/tek/index.html`) herhangi bir yerde açılır.
- Cloudflare Pages: Workers & Pages → Create → Pages → Upload assets → zip ya da `index.html` → Deploy.
