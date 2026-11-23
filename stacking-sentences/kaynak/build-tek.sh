#!/bin/sh
# tek dosya: içerik ve sesler index.html'in içine gömülür
cd "$(dirname "$0")" && ./build.sh && mkdir -p tek && python3 - <<'PY'
import base64, os
s = open('index.html', encoding='utf-8').read()
for f in ['icerik.js', 'siralama.js', 'dizilis-hazir.js', 'hatalar.js']:
    tag = '<script src="%s"></script>' % f
    assert s.count(tag) == 1
    s = s.replace(tag, '<script>\n' + open(f, encoding='utf-8').read() + '\n</script>')
ses = ',\n'.join('"%s":"%s"' % (n.rsplit('.', 1)[0], base64.b64encode(open('ses/' + n, 'rb').read()).decode()) for n in sorted(os.listdir('ses')) if n.endswith(('.mp3', '.wav')))
tag = '<script>\nwindow.__hata'
assert s.count(tag) == 1, 'ses gömme yeri bulunamadı'
s = s.replace(tag, '<script>window.SES_VERI={\n' + ses + '\n};</script>\n' + tag, 1)
open('tek/index.html', 'w', encoding='utf-8').write(s)
print('tek/index.html', os.path.getsize('tek/index.html'))
PY
