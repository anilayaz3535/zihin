# Stacking Sentences · App Store ve Google Play'e yayınlama rehberi

Bu rehber, oyunu iki mağazaya koymak için yapman gerekenleri sırayla anlatır. Kod tarafı hazır: uygulama projesi `stacking-sentences/uygulama/` klasöründe (Capacitor 8, iOS + Android). **Mac'in yoksa da olur**: iOS sürümü GitHub'ın Mac makinelerinde derlenip TestFlight'a yüklenebilir.

---

## 0. Önce karar ver (sonradan değişmez)

| Ne | Şu anki değer | Nerede değişir |
|---|---|---|
| Uygulama kimliği (Bundle ID / Package name) | `com.stackingsentences.app` | `uygulama/capacitor.config.json` → `appId`, `android/app/build.gradle` → `applicationId` ve `namespace`, Xcode'da Bundle Identifier. **Mağazaya ilk yüklemeden sonra değiştirilemez.** Kendi alan adın varsa (ör. `com.seninadin.stacking`) şimdi değiştir. |
| Uygulama adı | Stacking Sentences | Mağazada görünen ad `magaza-metinleri.md`'de. Telefonda ikonun altındaki ad uzunsa kısaltılır ("Stacking Sen…"). |
| Gizlilik politikası adresi | `https://anilayaz3535.github.io/zihin/stacking-sentences/MAGAZA/gizlilik.html` | `MAGAZA/gizlilik.html` içindeki **[İLETİŞİM E-POSTASI]** yerine kendi e-postanı yaz. İki mağaza da bu adresi ister. |

## 1. Hesaplar

| Mağaza | Ücret | Adres | Not |
|---|---|---|---|
| Apple Developer Program | yıllık 99 USD | developer.apple.com/programs | Bireysel hesap: kimlik doğrulaması 1–2 gün sürebilir. |
| Google Play Console | bir kez 25 USD | play.google.com/console | **Yeni bireysel hesaplarda** üretime (herkese açık) çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunlu. Arkadaş, aile, öğrenci… Gmail adreslerini topla. |

---

## 2. Android (Google Play)

### 2.1 Deneme APK'sını telefonunda dene (hemen, ücretsiz)
1. GitHub'da depoya git → **Actions** → **Stacking Sentences · Android** → son çalışmaya tıkla.
2. Altta **Artifacts → stacking-sentences-android** indir, içindeki `app-debug.apk`'yı telefonuna at ve kur ("Bilinmeyen kaynaklara izin ver" gerekir).
3. Kontrol et: ses, Türkçe okuma, titreşim, geri tuşu, uygulamayı alta alıp geri açma, online kapışma.

> Türkçe okumuyorsa: Ayarlar → Sistem → Diller → Metin okuma çıkışı → Google'ın konuşma hizmetleri → Türkçe ses verisini indir.

### 2.2 Yayın anahtarı (bir kez)
Google Play'e yüklenen her sürüm aynı anahtarla imzalanır. **Anahtarı ve şifresini kaybetme** (Play App Signing açık olacağı için kaybedersen Google'dan sıfırlatabilirsin ama uğraştırır).

Bilgisayarında (Java yüklü olmalı) bir kez çalıştır:
```
keytool -genkeypair -v -keystore stacking-sentences.jks -alias stacking -keyalg RSA -keysize 2048 -validity 10000
```
Sonra GitHub'da: **Settings → Secrets and variables → Actions → New repository secret**:

| Ad | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i stacking-sentences.jks` çıktısı (Windows: `certutil -encode` ya da bir base64 sitesi yerine PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("stacking-sentences.jks"))`) |
| `ANDROID_KEYSTORE_PASSWORD` | anahtar deposu şifresi |
| `ANDROID_KEY_ALIAS` | `stacking` |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi |

Bundan sonra Actions her çalıştığında imzalı **`app-release.aab`** de üretir (Artifacts içinde). Sürüm numarası (versionCode) her çalışmada otomatik artar.

Android Studio'yla kendin derlemek istersen: `uygulama/android/keystore.properties.ornek` dosyasını `keystore.properties` adıyla kopyala, bilgilerini yaz, sonra `cd uygulama && npm install && npm run android` → Android Studio → Build → Generate Signed App Bundle.

### 2.3 Play Console'da uygulamayı oluştur
1. **Uygulama oluştur**: ad `Stacking Sentences: İngilizce`, varsayılan dil Türkçe, Uygulama, Ücretsiz.
2. **Uygulama içeriği** (Policy → App content) bölümünü doldur:
   - **Gizlilik politikası**: yukarıdaki adres.
   - **Reklamlar**: Hayır, reklam içermiyor.
   - **Uygulama erişimi**: Tüm işlevler kısıtlama olmadan kullanılabilir.
   - **İçerik derecelendirmesi** (IARC anketi): kategori "Referans, Haberler veya Eğitim" ya da "Oyun → Bulmaca/Kelime". Şiddet, cinsellik, kumar, uyuşturucu: hepsi **Hayır**. Kullanıcılar etkileşimde bulunabilir mi: **Evet** (online kapışmada takma ad görünür), konum paylaşımı yok, dijital satın alma yok. Sonuç genelde **3+ / PEGI 3** çıkar.
   - **Hedef kitle**: **13 ve üzeri** seç (ör. 13-15, 16-17, 18+). 13 yaş altını seçersen "Aileler için tasarlandı" politikası devreye girer; online kapışmanın açık MQTT sunucusu kullanması bunu zorlaştırır.
   - **Veri güvenliği**: önerilen cevap:
     - Veri toplanıyor mu: **Evet**.
       - *Kişisel bilgiler → Ad*: isteğe bağlı, yalnız arkadaşla oda kodlu online kapışmada; amaç Uygulama işlevi; geçici olarak işleniyor: Evet; paylaşılıyor: Hayır.
       - *Uygulama etkinliği → Uygulama etkileşimleri* (isimsiz oyun verisi, ölçüm): amaç **Analiz**; kullanıcı kapatabilir (isteğe bağlı): Evet; paylaşılıyor: Hayır (PostHog hizmet sağlayıcı sayılır).
       - *Cihaz veya diğer kimlikler*: uygulamanın ürettiği rastgele kimlik; amaç Analiz.
     - Aktarım sırasında şifreleniyor: **Evet**. Veri silme isteği: oyun verisi telefonda; isimsiz ölçüm verisi kimliğe bağlı değildir (Ayarlar'dan kapatılır).
   - **Haber uygulaması / COVID / Devlet**: Hayır.
3. **Ana mağaza girişi**: metinler `magaza-metinleri.md`, görseller bu klasörde.

### 2.4 Test ve yayın
1. **Test → Kapalı test** → yeni kanal → test kullanıcılarının e-posta listesini ekle → **Yeni sürüm** → `app-release.aab` yükle → yayınla. Test bağlantısını kullanıcılarına gönder; uygulamayı yükleyip **14 gün** boyunca test grubunda kalsınlar.
2. 14 gün sonra **Üretim erişimine başvur** (birkaç soru sorulur: testte ne öğrendin, ne düzelttin…).
3. Onaydan sonra **Üretim → Yeni sürüm** → aynı (ya da yeni) AAB → incelemeye gönder. İnceleme genelde 1–7 gün.

---

## 3. iOS (App Store)

### 3.1 App Store Connect'te uygulamayı oluştur
1. developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers → +** → App IDs → App → Bundle ID: `com.stackingsentences.app` (Explicit). Ek yetenek gerekmez (Push Notifications seçme; hatırlatmalar yerel bildirim).
2. appstoreconnect.apple.com → **Uygulamalar → + Yeni uygulama** → iOS, ad `Stacking Sentences: İngilizce`, birincil dil Türkçe, Bundle ID'yi seç, SKU: `stacking-sentences`.

### 3.2a Mac YOKSA: GitHub ile derle ve TestFlight'a yükle
1. App Store Connect → **Kullanıcılar ve Erişim → Entegrasyonlar → App Store Connect API → +** → ad "GitHub", erişim **Admin** (otomatik imzalama sertifika oluşturabilsin diye). `.p8` dosyasını indir (bir kez indirilebilir!), **Key ID** ve **Issuer ID**'yi not al.
2. developer.apple.com → Membership → **Team ID**'yi not al.
3. GitHub → Settings → Secrets → Actions:

| Ad | Değer |
|---|---|
| `APPLE_TEAM_ID` | Team ID (10 karakter) |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | `.p8` dosyasının base64'ü (Android anahtarındaki gibi) |

4. GitHub → **Actions → Stacking Sentences · iOS → Run workflow** → **TestFlight'a yükle** kutusunu işaretle → Run.
5. 10–20 dakika sonra derleme App Store Connect → **TestFlight**'ta görünür ("İşleniyor" birkaç dakika sürer). Telefonuna **TestFlight** uygulamasını kur, kendini iç test kullanıcısı olarak ekle ve dene.

> Bu yol bu ortamda denenemedi (Apple hesabı gerekiyor). İlk çalıştırmada imzalama hatası çıkarsa hata metnini bana gönder; ya da bir kez bir Mac'te 3.2b'yi yap.

### 3.2b Mac VARSA
```
cd stacking-sentences/uygulama
npm install
npm run ios          # web dosyalarını hazırlar, Xcode'u açar
```
Xcode'da: **App** hedefi → Signing & Capabilities → Team'ini seç → üstte cihaz olarak "Any iOS Device" → **Product → Archive** → **Distribute App → App Store Connect → Upload**.

### 3.3 Mağaza bilgileri ve incelemeye gönder
1. **Uygulama Gizliliği**: Gizlilik politikası adresi. Veri toplama: **Kullanım Verisi → Ürün Etkileşimi**: *Seni izlemek için kullanılmaz*, *Kimliğine bağlı değil*, amaç **Analiz**. Başka veri yok (online kapışmadaki takma ad saklanmadan anlık iletilir). Uygulamadaki `PrivacyInfo.xcprivacy` de bunu söyler. Ölçüm anahtarı girilmemişse "Veri toplamıyoruz" seçilebilir.
2. **Yaş derecelendirmesi**: anketteki bütün içerik sorularına **Yok**. "Kullanıcılar arası iletişim / kullanıcı içeriği" sorusu varsa: online kapışmada yalnız takma ad görünür, sohbet yok. Sonuç **4+** (ya da 9+) çıkar. **Çocuklar kategorisini (Kids) seçme.**
3. **Sürüm bilgileri**: metinler ve ekran görüntüleri (`iphone-6.9` ve `ipad-13`), TestFlight'taki derlemeyi seç.
4. **İnceleme notu** (App Review Information → Notes) — kopyala:
   ```
   No login is required. Tap "İLK CÜMLENİ KUR" to start a 30-second guided sentence, then enter any name.
   The interface can be switched to English: Settings (⚙) → Interface language → English.
   "ONLINE KAPIŞMA" (online match) needs two devices with the same 4-digit room code; all other modes work offline.
   ```
5. **İncelemeye gönder**. Genelde 1–3 gün.

---

## 4. Güncelleme yaparken

1. Oyunu `kaynak/parcalar/` içinde değiştir → `cd kaynak && sh build.sh && python3 testler/calistir.py --hizli`.
2. Web sürümü (tek dosya) için: `sh build-tek.sh && cp tek/index.html ../index.html`.
3. Sürüm numarası: `uygulama/android/app/build.gradle` → `versionName "1.1"` ve Xcode / `ios/App/App.xcodeproj` → `MARKETING_VERSION = 1.1`. Derleme numaraları GitHub'da otomatik artar.
4. GitHub'a gönder → Actions yeni APK/AAB'yi üretir; iOS için iş akışını "TestFlight'a yükle" ile çalıştır.
5. Ekran görüntüleri değiştiyse: `cd uygulama && node araclar/magaza-goruntu.js`.
6. İkon değişecekse: `uygulama/kaynak-gorsel/*.html` → PNG'ler `uygulama/assets/` → `npm run ikonlar`.

## 5. İnceleme riskleri ve önlemler

| Risk | Durum |
|---|---|
| Apple 4.2 "Web sitesini paketleme" | Uygulama çevrimdışı çalışır, yerel okuma motoru, titreşim, yerel bildirim, geri tuşu ve çentik desteği var; yalnız web sayfası değil. |
| Apple 4.1 / marka | "Tetris" adı ekrandan, koddan ve ağ konusundan kaldırıldı. Anahtar kelimelerde başka marka yok. |
| Online kapışma ücretsiz açık sunucular kullanıyor (HiveMQ, EMQX) | Sunucu çalışmazsa yalnız online mod etkilenir; inceleme notunda belirtildi. Kalıcı yayında kendi sunucunu `kaynak/parcalar/online.js` → `ONLINE_SUNUCULAR`'a yazman önerilir. |
| Türkçe ses yoksa sesli okuma susar | Oyun yine oynanır; Ayarlar'da "Türkçe sesi dene" ve yönlendirme var. |
| iPad | Uygulama iPad'de tam ekran çalışır (`UIRequiresFullScreen`); iPad ekran görüntüleri hazır. İstemezsen Xcode'da Devices: iPhone yap. |
