#!/bin/sh
# Oyunun kaynağından uygulamanın web klasörünü (www) hazırlar.
# Uygulamada içerik ayrı dosyalarda kalır (tek 7 MB'lık dosya yerine): daha hızlı açılır, bellek daha az dolar.
set -e
cd "$(dirname "$0")/.."
KAYNAK=../kaynak
sh $KAYNAK/build.sh
rm -rf www && mkdir -p www/ses
cp $KAYNAK/index.html $KAYNAK/icerik.js $KAYNAK/siralama.js $KAYNAK/dizilis-hazir.js $KAYNAK/hatalar.js www/
cp $KAYNAK/ses/muzik.wav www/ses/
echo "www hazır: $(du -sh www | cut -f1)"
