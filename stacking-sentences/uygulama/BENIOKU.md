# Stacking Sentences · uygulama (iOS + Android)

Capacitor 8 projesi. Oyunun kendisi `../kaynak/` içinde; bu klasör onu telefon uygulamasına çevirir.

```
npm install
npm run www        # ../kaynak'tan derler, www/ klasörünü hazırlar
npx cap sync       # www/ ve eklentileri android/ ve ios/ projelerine kopyalar
npm run android    # Android Studio'da açar (Android SDK gerekir)
npm run ios        # Xcode'da açar (Mac gerekir)
npm run ikonlar    # assets/*.png'den bütün ikon ve açılış resimlerini üretir
```

- Yayınlama adımları: `../MAGAZA/YAYIN-REHBERI.md`
- Mac / Android Studio yoksa: GitHub Actions (`.github/workflows/stacking-*.yml`) derler; deneme APK'sı Actions → Artifacts'ta.
- Uygulamaya özgü davranış (titreşim, geri tuşu, hatırlatma, sesli okuma): `../kaynak/parcalar/yerel.js` ve `audio.js` (`Konus`).
- `www/`, `node_modules/` ve derleme çıktıları depoya konmaz; `android/keystore.properties` ve `.jks` asla konmaz.
