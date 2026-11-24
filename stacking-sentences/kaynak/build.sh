#!/bin/sh
cd "$(dirname "$0")"
python3 araclar/dizilis-birlestir.py || exit 1   # yapay zekâ SVOPT çıktıları (dizilis/cikti) → dizilis/dizilis.json + dizilis-hazir.js
{ cat parcalar/head_old.css.html; cat parcalar/yazitipi.css; cat parcalar/extra.css; cat parcalar/body.html;
  for f in depo dil dil-en olay kayit-sema core ogretim kayit ilerleme audio game engine online ilk harita dizilis gorev rozet strateji yol odul etkinlik emoji yerel screens; do cat parcalar/$f.js; echo; done
  printf '</script>\n</body>\n</html>\n'; } > index.html
