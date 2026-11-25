# Ölçüm rehberi: oyunun gerçekten "bağımlılık yapıp yapmadığını" sayılarla görmek

Oyun isimsiz oyun verisi gönderebilir (`kaynak/parcalar/olcum.js`). Kişisel veri yok: isim, yazı, cümle gönderilmez; cihaz başına rastgele bir kimlik ve oyun olayları. Oyuncu Ayarlar'dan kapatabilir. **Anahtar girilene kadar hiçbir şey gönderilmez.**

## 1. PostHog'u aç (ücretsiz, 10 dakika)
1. **eu.posthog.com** adresinde hesap aç (Avrupa sunucusu: KVKK / GDPR için uygun). Ücretsiz katman ayda 1 milyon olay; bu oyun için fazlasıyla yeter.
2. Yeni proje: "Stacking Sentences". **Project API key** (`phc_…` ile başlar) kopyala. Bu anahtar herkese açık bir anahtardır (yalnız veri gönderir, okuyamaz); koda yazılabilir.
3. Anahtarı `kaynak/parcalar/olcum.js` dosyasındaki `OLCUM_ANAHTAR` satırına yaz:
   ```js
   const OLCUM_ANAHTAR = window.TE_OLCUM_ANAHTAR || 'phc_BURAYA';
   ```
   Ya da anahtarı bana gönder, ben eklerim. Sonra `sh build.sh`, `sh build-tek.sh`.
4. Project settings → **IP data capture: kapalı** (IP adresi de tutulmasın).

## 2. Gönderilen olaylar
| Olay | Ne zaman | Bilgiler |
|---|---|---|
| `oyun_acildi` | oyun açılınca | profil var mı, davetle mi geldi |
| `profil_acildi` | profil yüklenince | toplam XP, seri, Bölüm Yolu'nda açık bölüm |
| `ilk_profil` | yeni oyuncu isim yazınca | – |
| `ekran` | her ekran açılışında | ekran adı (acilis, yol, yolBas, cark, online…) |
| `bolum_basladi` / `bolum_bitti` | her bölüm / maç | mod, bölüm, seviye, kazandı, yıldız, skor; **Bölüm Yolu'nda** bölüm no, bu oturumdaki deneme, kalan hamle, NEREDEYSE kullanıldı mı, zorluk, hedef türü, süre |
| `neredeyse` | hamle bitip hedefe yetmeyince | bölüm, ulaşılan, hedef |
| `online_bitti` | online maç sonu | mod, kazandı, bilgisayara karşı mı |
| `cark`, `sandik_acildi` | çark çevrilince, sandık açılınca | sandık türü |
| `paylasti`, `davet_acildi` | paylaşım ve davetle gelen | paylaşım türü, bölüm |
| `gunluk_hedef`, `unite_tamam` | günlük hedef tamam, ünite tamam | seri, ünite |
| `oturum_ara` | uygulama arka plana giderken | oturum süresi |

Her olayda: rastgele cihaz kimliği, oturum kimliği, platform (android / ios / web), arayüz dili, oyun sürümü.

## 3. Kurulacak 5 grafik (PostHog → Insights)
1. **Geri dönüş (Retention)**: başlangıç `oyun_acildi`, dönüş `oyun_acildi`, günlük. **1. gün ve 7. gün** oranı. Hedef: 1. gün ≥ %40, 7. gün ≥ %15 (iyi mobil oyun seviyesi).
2. **İlk oturum hunisi (Funnel)**: `oyun_acildi` → `ilk_profil` → `bolum_bitti` (mod=yol, yol_no=1, kazandi) → … yol_no=5. İnsanların nerede bıraktığı.
3. **Bölüm zorluğu**: `bolum_bitti` (mod=yol), `yol_no`'ya göre kazanma oranı ve ortalama `deneme`. Candy Crush gibi: kolay bölümler %80+, zor bölümler %40–60, 💀 %25–40 olmalı. Çok düşük bölüm → hamle artır / hedef düşür (`yol.js` YOL_ORAN, YOL_EK_HAMLE).
4. **Oturum süresi**: `oturum_ara.sure_sn` ortalaması ve dağılımı.
5. **Yayılma**: `paylasti` sayısı ve `davet_acildi` / `paylasti` oranı (bir paylaşım kaç yeni oyuncu getiriyor).

## 4. Kapalı testte bakılacaklar (14 gün)
- 1. gün dönüşü %30'un altındaysa: ilk 5 dakika (ilk bölümler, menü) sorunlu.
- Bir bölümde kazanma oranı aniden düşüyorsa: o bölümü kolaylaştır.
- `neredeyse` çok sık ama kazanma düşükse: +3 hamle yetmiyor, hedefi düşür.
- Kimse paylaşmıyorsa: paylaş düğmesini daha görünür yap, ödül ekle (ör. paylaşınca 1 çark hakkı).
