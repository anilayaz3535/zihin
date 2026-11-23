# İngilizce Dizilişi (SVOPT) · Yapay Zekâ İstemi

Bu dosya, Stacking Sentences'taki 9.000 cümlenin "İngilizce dizilişi" kartını bir yapay zekâya (Claude, ChatGPT, Gemini…) hazırlatmak içindir.

## Nasıl kullanılır

1. `kaynak/dizilis/girdi/` klasöründe 100'er cümlelik dosyalar var (`A1-01.txt`, `A1-02.txt`, … `C2-07.txt`). Yoksa üretmek için: `python3 kaynak/araclar/dizilis-hazirla.py`
2. Yapay zekâya aşağıdaki **İSTEM** bölümünün tamamını yapıştır, en sona da bir girdi dosyasının içeriğini ekle.
3. Gelen cevabı aynı adla `.jsonl` uzantısıyla `kaynak/dizilis/cikti/` klasörüne kaydet (ör. `A1-01.jsonl`).
4. `cd kaynak && sh build-tek.sh` çalıştır. Derleme çıktıları denetler: kabul edilenler oyuna girer, reddedilenler nedenleriyle `kaynak/dizilis/hatalar.txt` dosyasına yazılır. O cümleleri yeniden yaptır.
5. Kalan cümleler için girdi dosyalarını yeniden üret: `python3 kaynak/araclar/dizilis-hazirla.py` (hazır olanları atlar).

Hazır dizilişi olmayan cümlelerde oyun, dizilişi kendisi otomatik çıkarmaya devam eder.

---

## İSTEM (buradan aşağısını kopyala)

Sen Türk öğrencilere İngilizce öğreten bir dil bilgisi uzmanısın. Sana her satırda bir İngilizce cümle ve Türkçe çevirisi vereceğim. Her cümleyi İngilizcedeki **SVOPT** dizilişine göre parçalara ayır ve her parçanın altına, **verilen Türkçe çeviriden** o parçaya karşılık gelen kelimeleri yaz. Öğrenci kartı soldan sağa okuduğunda Türkçeyi İngilizce sırasıyla görecek.

Örnek:
```
I   │ am going │ to school
Ben │ gidiyorum │ okula
```

### Girdi biçimi
Her satır: `KİMLİK | İngilizce cümle | Türkçe çeviri`

### Çıktı biçimi
- Her girdi satırı için **tek satır JSON** (JSON Lines). Satır sırası ve kimlik girdiyle aynı olsun.
- `{"id":"KİMLİK","en":"İngilizce cümle","p":[["GÖREV","İngilizce parça","Türkçe parça"], …]}`
- Cevabında JSON satırlarından başka hiçbir şey yazma: açıklama, başlık, kod bloğu (```) olmasın.

### Görevler
| Kod | Ne | Örnek |
|---|---|---|
| `S` | Özne (cümlede işi yapan / hakkında konuşulan) | **I**, **My grandfather**, **The puppy** |
| `V` | Fiil grubu: yardımcı fiil + asıl fiil + olumsuzluk + öbek fiil eki birlikte | **am going**, **won't forget**, **has bought**, **come back**, **usually eat** |
| `O` | Nesne (fiilin etkilediği şey) | **the ball**, **my torch**, **English** |
| `P` | Yer (nerede / nereye / nereden) | **to school**, **in the kitchen**, **home** |
| `T` | Zaman (ne zaman / ne sıklıkla / ne kadar süre) | **yesterday**, **every morning**, **at seven**, **for two hours** |
| `SORU` | Soru kelimesi ya da soruyu kuran yardımcı fiil | **When**, **What**, **Do**, **Can**, **will** (When **will** you…) |
| `BAG` | Bağlaç | **and**, **because**, **when** (cümle bağlıyorsa), **although** |
| `NASIL` | Nasıl / hangi şekilde (durum zarfı) | **quickly**, **by bus**, **together** |
| `EK` | Bunlara uymayan diğer bilgi | **with my friend**, **for the meeting**, **about music** |
| `KALIP` | Kalıp ifade: kelimeleri tek tek çevrilmez, bir bütün olarak anlamı yazılır | **I wish** → keşke, **would rather** → tercih ederim, **How about** → ne dersin |

### Parçalama kuralları
1. İngilizce cümlenin **bütün kelimeleri**, **aynı sırayla** ve **bir kez** parçalarda yer alsın. Kelime ekleme, silme, değiştirme yapma. Noktalama işaretlerini (. , ? ! ; : ") parçalara yazma. `won't`, `I'm`, `doesn't` gibi kesmeli kelimeler tek kelimedir, aynen kalır.
2. Parçalar dil bilgisi gruplarıdır: tanımlık ve sıfat ismiyle birlikte (`a red pencil`), edat kendi ismiyle birlikte (`in the kitchen`), yardımcı fiil asıl fiille birlikte (`will send`, `is sleeping`).
3. `be` fiili asıl fiilse tamamlayıcısıyla birlikte `V` olur: `am hungry` → `açım`, `is a baker` → `bir fırıncı`.
4. Soru cümlesinde yardımcı fiil özneden önce ayrı kalıyorsa ayrı parça olur, görevi `SORU`, Türkçesi `(soru)`: `Do | you | speak | English`, `When | will | you | come back`.
5. `There is / There are` → `V` (`var`), ardından gelen isim `S`.
6. Öbek fiiller (`come back`, `get up`, `turn off`, `look for`) tek `V` parçasıdır.
7. Yan cümlelerde (because…, when…, if…) aynı kuralları o cümle için de uygula: `BAG` sonra yeniden `S`, `V`…

### Türkçe kuralları
1. Türkçeyi **verilen çeviriden** al. Çevirideki her kelimeyi **bir kez** ve **bölmeden** (ekleriyle birlikte) kullan, anlamca karşılık geldiği parçanın altına yaz. Yeni çeviri uydurma.
2. Türkçede düşen özne zamirini özne parçasına ekleyebilirsin: Ben, Sen, O, Biz, Siz, Onlar (ör. `Okula gidiyorum.` → `I` = `Ben`).
3. Bir parçanın çeviride karşılığı yoksa: yardımcı fiil için `(yardımcı)`, soru yardımcısı için `(soru)`, `be` tek başına kaldıysa `(ek fiil)`, başka bir şeyse `—` yaz.
4. İsim öbeklerinde Türkçe kelimeler **İngilizce sırayla** yazılır: `a new vaccine` → `bir yeni aşı`, `a small mirror` → `bir küçük ayna`. Ek ya da edat karşılığı olan kelimeler kendi kelimesinde kalır: `at the moment` → `şu anda`, `to school` → `okula`, `for the heart` → `kalp için`. Fiil grupları doğal Türkçesiyle yazılır: `would stop raining` → `yağmur dursa`.
6. Zaman ifadeleri (`at the moment`, `every morning`, `yesterday`) her zaman `T`; yer ifadeleri `P`. Kalıp ifadeler (`I wish`) tek `KALIP` parçası olur, Türkçesi anlamıdır (`keşke`). Hava durumu gibi anlamsız `it` öznesinin Türkçesi `—`.
5. Türkçe parçaları küçük harfle yaz (özel adlar hariç). İlk harfi oyun kendisi büyütür.

### Örnekler
Girdi:
```
A1-1:0 | I am going to school. | Okula gidiyorum.
X-1:1 | We played football yesterday. | Dün futbol oynadık.
A2-2:57 | When will you come back? | Ne zaman geri döneceksin?
A2-2:50 | I won't forget my torch. | Fenerimi unutmayacağım.
A1-2:7 | Do you speak English? | İngilizce konuşur musun?
X-1:2 | She goes to work by bus every morning. | O her sabah işe otobüsle gider.
X-1:3 | My uncle is a baker. | Amcam bir fırıncı.
X-1:4 | There are forty chairs in the room. | Odada kırk sandalye var.
X-1:5 | I stayed at home because it was raining. | Yağmur yağdığı için evde kaldım.
B2-2:35 | I wish it would stop raining. | Keşke yağmur dursa.
B2-1:61 | This building is being repaired at the moment. | Bu bina şu anda onarılıyor.
B2-1:28 | A new vaccine has been developed. | Yeni bir aşı geliştirildi.
```
Çıktı:
```
{"id":"A1-1:0","en":"I am going to school.","p":[["S","I","Ben"],["V","am going","gidiyorum"],["P","to school","okula"]]}
{"id":"X-1:1","en":"We played football yesterday.","p":[["S","We","Biz"],["V","played","oynadık"],["O","football","futbol"],["T","yesterday","dün"]]}
{"id":"A2-2:57","en":"When will you come back?","p":[["SORU","When","ne zaman"],["SORU","will","(soru)"],["S","you","Sen"],["V","come back","geri döneceksin"]]}
{"id":"A2-2:50","en":"I won't forget my torch.","p":[["S","I","Ben"],["V","won't forget","unutmayacağım"],["O","my torch","fenerimi"]]}
{"id":"A1-2:7","en":"Do you speak English?","p":[["SORU","Do","(soru)"],["S","you","Sen"],["V","speak","konuşur musun"],["O","English","İngilizce"]]}
{"id":"X-1:2","en":"She goes to work by bus every morning.","p":[["S","She","O"],["V","goes","gider"],["P","to work","işe"],["NASIL","by bus","otobüsle"],["T","every morning","her sabah"]]}
{"id":"X-1:3","en":"My uncle is a baker.","p":[["S","My uncle","amcam"],["V","is a baker","bir fırıncı"]]}
{"id":"X-1:4","en":"There are forty chairs in the room.","p":[["V","There are","var"],["S","forty chairs","kırk sandalye"],["P","in the room","odada"]]}
{"id":"X-1:5","en":"I stayed at home because it was raining.","p":[["S","I","Ben"],["V","stayed","kaldım"],["P","at home","evde"],["BAG","because","için"],["S","it","—"],["V","was raining","yağmur yağdığı"]]}
{"id":"B2-2:35","en":"I wish it would stop raining.","p":[["KALIP","I wish","keşke"],["S","it","—"],["V","would stop raining","yağmur dursa"]]}
{"id":"B2-1:61","en":"This building is being repaired at the moment.","p":[["S","This building","bu bina"],["V","is being repaired","onarılıyor"],["T","at the moment","şu anda"]]}
{"id":"B2-1:28","en":"A new vaccine has been developed.","p":[["S","A new vaccine","bir yeni aşı"],["V","has been developed","geliştirildi"]]}
```

### Son kontrol (cevaplamadan önce her satır için)
- Parçalardaki İngilizce kelimeler art arda okununca cümlenin kendisi mi (noktalama hariç)?
- Görev kodları yalnız: S, V, O, P, T, SORU, BAG, NASIL, EK, KALIP mi?
- Hiçbir Türkçe parça boş değil mi? Türkçe kelimeler çeviriden mi?
- Girdideki her satır için tam bir çıktı satırı var mı?

Şimdi aşağıdaki cümleleri işle:

