#!/usr/bin/env python3
"""Kısa yazımdan yapay zekâ çıktı biçimine (JSON Lines) çevirir: elle ya da yapay zekâyla hızlı diziliş yazmak için.
Kullanım: python3 araclar/dizilis-kisa.py GİRDİ.txt [ÇIKTI.jsonl]   (çıktı verilmezse dizilis/cikti/<ad>.jsonl)
Kısa satır: KİMLİK|GÖREV:İngilizce parça=Türkçe parça|GÖREV:…      ör.  B2-2:35|KALIP:I wish=Keşke|S:it=—|V:would stop raining=yağmur dursa
Boş satırlar ve # ile başlayanlar atlanır. Denetim derlemede (dizilis-birlestir.py) yapılır."""
import json, os, sys
kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = open(os.path.join(kok, 'icerik.js'), encoding='utf-8').read()
C = json.loads(t[t.index('window.NE_ICERIK=') + 17:].rstrip().rstrip(';'))
gir = sys.argv[1]
cik = sys.argv[2] if len(sys.argv) > 2 else os.path.join(kok, 'dizilis', 'cikti', os.path.splitext(os.path.basename(gir))[0] + '.jsonl')
satirlar = []
for no, sat in enumerate(open(gir, encoding='utf-8'), 1):
    sat = sat.strip()
    if not sat or sat.startswith('#'): continue
    kim, *parca = sat.split('|')
    p = []
    for q in parca:
        rol, _, geri = q.partition(':'); en, _, tr = geri.partition('=')
        p.append([rol.strip(), en.strip(), tr.strip()])
    try: rid, i = kim.strip().rsplit(':', 1); en = C['sentences'][rid][int(i)][1]
    except Exception: en = ''
    satirlar.append(json.dumps({'id': kim.strip(), 'en': en, 'p': p}, ensure_ascii=False))
open(cik, 'w', encoding='utf-8').write('\n'.join(satirlar) + '\n')
print('%s: %d satır' % (os.path.relpath(cik, kok), len(satirlar)))
