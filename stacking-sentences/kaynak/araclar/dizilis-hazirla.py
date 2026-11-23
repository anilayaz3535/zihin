#!/usr/bin/env python3
"""Yapay zekâya verilecek cümle partilerini hazırlar: kaynak/dizilis/girdi/<SEVİYE>-<NN>.txt (100'er cümle).
Satır biçimi:  KİMLİK | İngilizce | Türkçe      (kimlik = bölüm kimliği:sıra, ör. A2-2:57)
Zaten doğru çıktısı olan (dizilis.json'da bulunan) cümleler yeniden yazılmaz; --hepsi ile hepsi yazılır."""
import json, os, sys, glob
kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = open(os.path.join(kok, 'icerik.js'), encoding='utf-8').read()
C = json.loads(t[t.index('window.NE_ICERIK=') + 17:].rstrip().rstrip(';'))
hazir = {}
yol = os.path.join(kok, 'dizilis', 'dizilis.json')
if os.path.exists(yol) and '--hepsi' not in sys.argv: hazir = json.load(open(yol, encoding='utf-8'))
for f in glob.glob(os.path.join(kok, 'dizilis', 'girdi', '*.txt')): os.remove(f)
seviye_sira = [s['code'] for s in C['seviyeler']]
rl = {r['id']: r['lvl'] for r in C['rivals']}
satirlar = {}
for rid, liste in C['sentences'].items():
    for i, s in enumerate(liste):
        if not s: continue
        kim = '%s:%d' % (rid, i)
        if kim in hazir: continue
        satirlar.setdefault(rl.get(rid, rid.split('-')[0]), []).append('%s | %s | %s' % (kim, s[1].strip(), s[0].strip()))
PARTI = 100; toplam = 0; dosya = 0
for l in seviye_sira + [x for x in satirlar if x not in seviye_sira]:
    v = satirlar.get(l, [])
    for k in range(0, len(v), PARTI):
        ad = '%s-%02d.txt' % (l, k // PARTI + 1)
        open(os.path.join(kok, 'dizilis', 'girdi', ad), 'w', encoding='utf-8').write('\n'.join(v[k:k + PARTI]) + '\n')
        toplam += len(v[k:k + PARTI]); dosya += 1
print('dizilis/girdi: %d dosya, %d cümle (%d cümle zaten hazır)' % (dosya, toplam, len(hazir)))
