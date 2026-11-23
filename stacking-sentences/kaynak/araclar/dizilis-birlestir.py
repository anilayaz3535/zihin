#!/usr/bin/env python3
"""Yapay zekânın yazdığı SVOPT çıktılarını denetler ve birleştirir.
Girdi : kaynak/dizilis/cikti/*.jsonl   (her satır: {"id": "A2-2:57", "en": "...", "p": [["S","I","Ben"], ...]})
Çıktı : kaynak/dizilis/dizilis.json    (kimlik → parçalar; build bunu cümlelere ekler)
        kaynak/dizilis/hatalar.txt     (reddedilen satırlar ve nedeni; bunları yapay zekâya yeniden yaptır)
        kaynak/dizilis-hazir.js        (oyunun okuduğu biçim: window.NE_DIZILIS = { kimlik: parçalar })
Denetim: kimlik var mı, İngilizce kelimeler eksiksiz ve aynı sırada mı, görevler geçerli mi, Türkçe boş mu."""
import json, os, re, glob
kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = open(os.path.join(kok, 'icerik.js'), encoding='utf-8').read()
C = json.loads(t[t.index('window.NE_ICERIK=') + 17:].rstrip().rstrip(';'))
GOREV = {'S': 'S', 'V': 'V', 'O': 'O', 'P': 'P', 'T': 'T', 'SORU': 'soru', 'BAG': 'baglac', 'NASIL': 'nasil', 'EK': 'ek', 'KALIP': 'kalip'}
def tokenle(s): return [x for x in re.split(r'\s+', re.sub(r'[.,!?;:"“”]', ' ', s)) if x]
def norm(w): return w.lower().replace('’', "'")
yol = os.path.join(kok, 'dizilis', 'dizilis.json')
sonuc = json.load(open(yol, encoding='utf-8')) if os.path.exists(yol) else {}
hatalar, yeni = [], 0
for f in sorted(glob.glob(os.path.join(kok, 'dizilis', 'cikti', '*.jsonl')) + glob.glob(os.path.join(kok, 'dizilis', 'cikti', '*.txt'))):
    for no, satir in enumerate(open(f, encoding='utf-8'), 1):
        satir = satir.strip().rstrip(',')
        if not satir or satir.startswith('```'): continue
        yer = '%s:%d' % (os.path.basename(f), no)
        try: x = json.loads(satir)
        except Exception: hatalar.append('%s  JSON okunamadı: %s' % (yer, satir[:80])); continue
        kim = x.get('id', ''); p = x.get('p')
        try: rid, i = kim.rsplit(':', 1); s = C['sentences'][rid][int(i)]
        except Exception: hatalar.append('%s  bilinmeyen kimlik %s' % (yer, kim)); continue
        if not isinstance(p, list) or not p: hatalar.append('%s  %s: parça yok' % (yer, kim)); continue
        sorun = None
        for q in p:
            if not (isinstance(q, list) and len(q) == 3 and all(isinstance(z, str) for z in q)): sorun = 'parça biçimi [görev, İngilizce, Türkçe] değil'; break
            if q[0].upper() not in GOREV: sorun = 'geçersiz görev "%s"' % q[0]; break
            if not q[2].strip(): sorun = '"%s" parçasının Türkçesi boş' % q[1]; break
            if len(q[2]) > 80: sorun = 'Türkçe çok uzun'; break
        if not sorun:
            bek = [norm(w) for w in tokenle(s[1])]
            gel = [norm(w) for q in p for w in tokenle(q[1])]
            if gel != bek: sorun = 'İngilizce kelimeler cümleyle aynı değil: %s ≠ %s' % (' '.join(gel), ' '.join(bek))
        if sorun: hatalar.append('%s  %s: %s' % (yer, kim, sorun)); continue
        sonuc[kim] = [[GOREV[q[0].upper()], ' '.join(tokenle(q[1])), q[2].strip()] for q in p]; yeni += 1
json.dump(sonuc, open(yol, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
open(os.path.join(kok, 'dizilis-hazir.js'), 'w', encoding='utf-8').write('/* İngilizce dizilişi: yapay zekâyla hazırlanıp denetlenmiş SVOPT parçaları (araclar/dizilis-birlestir.py üretir; bu dosyayı elle değiştirmeyin). */\n'
    + 'window.NE_DIZILIS=' + json.dumps(sonuc, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(kok, 'dizilis', 'hatalar.txt'), 'w', encoding='utf-8').write('\n'.join(hatalar) + ('\n' if hatalar else ''))
top = sum(1 for v in C['sentences'].values() for s in v if s)
print('dizilis: %d satır alındı, %d reddedildi (dizilis/hatalar.txt) · hazır cümle %d / %d' % (yeni, len(hatalar), len(sonuc), top))
