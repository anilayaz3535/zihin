/* =====================================================================
   İNGİLİZCE DİZİLİŞİ · cümle tamamlanınca: İngilizce parçalar ve altında aynı sırayla Türkçeleri
     I   │ am going  │ to school
     Ben │ gidiyorum │ okula          Türkçesi: Okula gidiyorum.
   Cümlelerde kelime kelime Türkçe karşılık yok; Türkçe çeviri, sözlük ve küçük bir işlev sözcükleri listesiyle
   otomatik eşleştirilir. Her parçanın altındaki Türkçe, cümlenin kendi çevirisinden alınır (uydurulmaz).
   Eşleşme güvenilir değilse (çeviride eşleşmeyen çok kelime kalırsa) yalnız renkli İngilizce parçalar
   ve normal Türkçe gösterilir: yanlış karşılık göstermektense hiç göstermemek.
   dizilisCoz(en, tr, kodlar, sozlukAl) saf işlevdir (testler/dizilis.test.mjs).
   ===================================================================== */
const DZ_DUZENSIZ = { went: 'go', gone: 'go', saw: 'see', seen: 'see', ate: 'eat', eaten: 'eat', came: 'come', took: 'take', taken: 'take', made: 'make', had: 'have', has: 'have', did: 'do', does: 'do', done: 'do', was: 'be', were: 'be', been: 'be', is: 'be', am: 'be', are: 'be', said: 'say', got: 'get', gotten: 'get', knew: 'know', known: 'know', thought: 'think', bought: 'buy', brought: 'bring', told: 'tell', gave: 'give', given: 'give', found: 'find', left: 'leave', felt: 'feel', wrote: 'write', written: 'write', ran: 'run', sat: 'sit', stood: 'stand', slept: 'sleep', spoke: 'speak', spoken: 'speak', drank: 'drink', drunk: 'drink', drove: 'drive', driven: 'drive', began: 'begin', begun: 'begin', became: 'become', met: 'meet', paid: 'pay', sold: 'sell', sent: 'send', spent: 'spend', taught: 'teach', caught: 'catch', built: 'build', lost: 'lose', won: 'win', kept: 'keep', held: 'hold', heard: 'hear', understood: 'understand', forgot: 'forget', forgotten: 'forget', broke: 'break', broken: 'break', chose: 'choose', chosen: 'choose', fell: 'fall', fallen: 'fall', flew: 'fly', flown: 'fly', grew: 'grow', grown: 'grow', hid: 'hide', hidden: 'hide', rang: 'ring', rode: 'ride', rose: 'rise', sang: 'sing', swam: 'swim', threw: 'throw', thrown: 'throw', woke: 'wake', wore: 'wear', worn: 'wear', men: 'man', women: 'woman', children: 'child', feet: 'foot', teeth: 'tooth', people: 'person', mice: 'mouse', better: 'good', best: 'good', worse: 'bad', worst: 'bad', led: 'lead', meant: 'mean', fed: 'feed', fought: 'fight', shot: 'shoot', shook: 'shake', stole: 'steal', drew: 'draw', drawn: 'draw', froze: 'freeze', blew: 'blow', hung: 'hang', lit: 'light', stuck: 'stick', forgave: 'forgive', lay: 'lie', laid: 'lay', bit: 'bite', dug: 'dig', fled: 'flee', sank: 'sink', swore: 'swear', tore: 'tear', wept: 'weep', learnt: 'learn', burnt: 'burn', dreamt: 'dream', dealt: 'deal', bent: 'bend', lent: 'lend', ridden: 'ride', spun: 'spin', overcame: 'overcome', withdrew: 'withdraw', arose: 'arise', sought: 'seek', struck: 'strike', bore: 'bear', born: 'bear', beaten: 'beat' };
// işlev sözcükleri → çeviride aranacak Türkçe biçimler (kısa olanlar yalnız birebir eşleşir)
const DZ_ISLEV = {
  i: ['ben', 'bana', 'beni', 'benim', 'bende', 'benden'], me: ['beni', 'bana', 'ben', 'bende', 'benden', 'benimle'], my: ['benim'], mine: ['benim', 'benimki'], myself: ['kendim', 'kendimi', 'kendime'],
  you: ['sen', 'siz', 'seni', 'sana', 'sizi', 'size', 'sende', 'sizde', 'senden', 'sizden', 'seninle', 'sizinle'], your: ['senin', 'sizin'], yours: ['seninki', 'sizinki'], yourself: ['kendin', 'kendini', 'kendine'],
  he: ['o', 'onu', 'ona'], him: ['onu', 'ona', 'ondan', 'onunla'], his: ['onun'], she: ['o', 'onu', 'ona'], her: ['onun', 'onu', 'ona', 'ondan', 'onunla'], it: ['o', 'onu', 'ona', 'bu', 'bunu', 'buna'], its: ['onun'],
  we: ['biz', 'bize', 'bizi', 'bizim', 'bizde'], us: ['bizi', 'bize', 'bizimle', 'bizden'], our: ['bizim'], they: ['onlar', 'onları', 'onlara'], them: ['onları', 'onlara', 'onlardan', 'onlarla'], their: ['onların'],
  this: ['bu', 'bunu', 'buna', 'bunun', 'burası', 'bunlar'], that: ['şu', 'şunu', 'o', 'onu', 'şunun', 'orası'], these: ['bunlar', 'bunları', 'bu'], those: ['şunlar', 'onlar', 'şu', 'o'],
  a: ['bir'], an: ['bir'], one: ['bir', 'biri'], and: ['ve'], or: ['veya', 'yoksa', 'ya'], but: ['ama', 'fakat', 'ancak'], because: ['çünkü'], if: ['eğer'], so: ['yüzden', 'yani', 'öyle'],
  very: ['çok'], too: ['çok', 'de', 'da', 'fazla'], also: ['de', 'da', 'ayrıca'], not: ['değil', 'değilim', 'değilsin', 'değiliz', 'değiller', 'değildir'], no: ['hayır', 'hiç', 'yok'], yes: ['evet'], please: ['lütfen'],
  what: ['ne', 'neyi', 'neye', 'neden', 'nedir', 'neler'], where: ['nerede', 'nereye', 'nereden', 'nerede', 'nere', 'neresi'], when: ['ne zaman', 'zaman', 'iken'], who: ['kim', 'kimi', 'kime', 'kimin', 'kimdir'], why: ['neden', 'niye', 'niçin'], how: ['nasıl', 'kaç', 'ne kadar'], which: ['hangi', 'hangisi'], whose: ['kimin'],
  there: ['var', 'orada', 'oraya', 'orası', 'yok'], here: ['burada', 'buraya', 'burası', 'işte'], now: ['şimdi'], today: ['bugün'], tomorrow: ['yarın'], yesterday: ['dün'], always: ['her zaman', 'hep', 'daima'], never: ['asla', 'hiç', 'hiçbir'], sometimes: ['bazen'], usually: ['genellikle', 'genelde'], often: ['sık', 'sıklıkla', 'çoğu'],
  every: ['her'], all: ['bütün', 'tüm', 'hepsi', 'herkes', 'hep'], some: ['bazı', 'biraz', 'birkaç'], many: ['çok', 'birçok', 'kaç'], much: ['çok', 'kadar'], more: ['daha'], most: ['en'], any: ['hiç', 'herhangi'], with: ['ile', 'birlikte'], about: ['hakkında', 'yaklaşık'], like: ['gibi'], than: ['göre'],
  english: ['ingilizce'], turkish: ['türkçe', 'türk'], hello: ['merhaba'], hi: ['selam', 'merhaba'], thanks: ['teşekkürler', 'sağ ol'], thank: ['teşekkür']
};
// sözlükte olmayan / farklı yazılmış sık karşılıklar (çeviride aranır; fiiller -mek/-mak ile)
const DZ_EKSOZ = {
  need: 'gerekmek / ihtiyaç', have: 'var / sahip olmak', has: 'var', like: 'sevmek / hoşlanmak', love: 'sevmek', name: 'ad / isim', time: 'saat / zaman', year: 'yıl / sene / yaş', old: 'yaş / eski / yaşlı',
  grandfather: 'dede', grandmother: 'nine / babaanne / anneanne', brother: 'kardeş / abi / ağabey', sister: 'kardeş / abla', parents: 'anne baba / ebeveyn / aile', bread: 'ekmek', cook: 'aşçı / pişirmek',
  hand: 'el', kitten: 'yavru kedi', puppy: 'yavru köpek', thirsty: 'susamak / susuz', hungry: 'aç', bored: 'sıkılmak', eat: 'yemek', drink: 'içmek', make: 'yapmak', watch: 'izlemek / seyretmek / saat', take: 'almak / götürmek',
  play: 'oynamak / çalmak', look: 'bakmak / aramak / görünmek', wear: 'giymek / takmak', put: 'koymak / giymek', tired: 'yorgun', sofa: 'kanepe', coat: 'mont / palto / ceket', turtle: 'kaplumbağa', rabbit: 'tavşan', parrot: 'papağan',
  nose: 'burun / burn', trash: 'çöp', water: 'su / sulamak', colorful: 'renkli', colourful: 'renkli', light: 'hafif / ışık / açık', get: 'almak / olmak / binmek / kalkmak', go: 'gitmek', come: 'gelmek', see: 'görmek', want: 'istemek',
  do: 'yapmak', know: 'bilmek', live: 'yaşamak / oturmak', work: 'çalışmak / iş', study: 'çalışmak / ders', clean: 'temizlemek / temiz', help: 'yardım', open: 'açmak / açık', close: 'kapatmak / kapamak', turn: 'çevirmek / dönmek',
  kid: 'çocuk', child: 'çocuk', boy: 'erkek çocuk / oğlan', girl: 'kız', man: 'adam / erkek', woman: 'kadın', friend: 'arkadaş', family: 'aile', mother: 'anne', father: 'baba', mom: 'anne', dad: 'baba',
  enjoy: 'hoş gitmek / hoşlanmak / keyif almak / sevmek', last: 'geçen / son / sonuncu', used: 'eskiden / kullanmak', learn: 'öğrenmek / bilgi edinmek', public: 'toplu / kamu / halka açık', transport: 'taşıma / ulaşım',
  suitcase: 'bavul / valiz', visit: 'ziyaret etmek / gezmek', hike: 'yürüyüş', hiking: 'yürüyüş', grow: 'yetiştirmek / büyümek', practice: 'pratik / pratik yapmak / alıştırma', practise: 'pratik / pratik yapmak', story: 'hikaye / öykü',
  instead: 'yerine', torch: 'fener / el feneri / meşale', flashlight: 'fener / el feneri', discuss: 'tartışmak / konuşmak', explain: 'açıklamak / anlatmak', station: 'istasyon', airport: 'havalimanı / havaalanı', match: 'maç / eşleşmek', free: 'boş / ücretsiz / özgür', food: 'yemek / yiyecek', way: 'yol / şekil',
  check: 'kontrol etmek', leave: 'ayrılmak / bırakmak / çıkmak', catch: 'yakalamak', hurt: 'acımak / incitmek / ağrımak', online: 'çevrim içi / internet', picnic: 'piknik', sunny: 'güneşli', flight: 'uçuş', meeting: 'toplantı', shop: 'dükkan / mağaza / alışveriş',
  enough: 'yeterince / yeterli', race: 'yarış', clothes: 'kıyafet / giysi', careful: 'dikkatli / özenli', building: 'bina', film: 'film', tv: 'televizyon', email: 'e-posta / eposta',
  one: 'bir', two: 'iki', three: 'üç', four: 'dört', five: 'beş', six: 'altı', seven: 'yedi', eight: 'sekiz', nine: 'dokuz', ten: 'on', eleven: 'on bir', twelve: 'on iki', fifteen: 'on beş', twenty: 'yirmi', thirty: 'otuz', forty: 'kırk', fifty: 'elli', sixty: 'altmış', seventy: 'yetmiş', eighty: 'seksen', ninety: 'doksan', hundred: 'yüz', thousand: 'bin', million: 'milyon', first: 'birinci / ilk', second: 'ikinci / saniye', third: 'üçüncü',
  favourite: 'en sevdiği / favori', favorite: 'en sevdiği / favori', breakfast: 'kahvaltı', lunch: 'öğle yemeği', dinner: 'akşam yemeği', room: 'oda', class: 'sınıf / ders', lesson: 'ders', teacher: 'öğretmen'
};
const DZ_BAGLAC = { when: '-dığında / -ınca', because: 'çünkü / -dığı için', if: 'eğer / -se', while: '-iken', that: 'ki / -dığı', and: 've', but: 'ama', or: 'veya', so: 'bu yüzden', although: '-e rağmen', though: '-e rağmen', unless: '-medikçe', before: '-meden önce', after: '-dikten sonra', until: '-e kadar', since: '-den beri', whether: '-ip -mediği', which: 'ki / -an', who: 'ki / -an' };
const DZ_OZNE = { i: 'Ben', you: 'Sen', he: 'O', she: 'O', it: 'O', we: 'Biz', they: 'Onlar' };
const DZ_NESNE = { me: 1, him: 1, us: 1, them: 1 };
const DZ_YARDIMCI = { am: 1, is: 1, are: 1, was: 1, were: 1, be: 1, been: 1, being: 1, do: 1, does: 1, did: 1, have: 1, has: 1, had: 1, will: 1, would: 1, shall: 1, should: 1, can: 1, could: 1, may: 1, might: 1, must: 1, not: 1, "n't": 1 };
const DZ_BELIRLEYICI = { a: 1, an: 1, the: 1, my: 1, your: 1, his: 1, its: 1, our: 1, their: 1, this: 1, that: 1, these: 1, those: 1, every: 1, some: 1, any: 1, many: 1, much: 1, no: 1, each: 1, all: 1, several: 1, few: 1, more: 1, most: 1, another: 1, other: 1 };
const DZ_EK = /^(mi|mı|mu|mü)(sin|sın|sun|sün|yim|yım|yum|yüm|siniz|sınız|sunuz|sünüz|yiz|yız|yuz|yüz|dir|dır|dur|dür|ydi|ydı|ydu|ydü|ymış|ymiş)?$|^(de|da|ki|ise|bile|değil\w*|idi|imiş|mısın|misin)$/;
const DZ_IKI_EK = ['', 'i', 'ı', 'u', 'ü', 'e', 'a', 'de', 'da', 'den', 'dan', 'im', 'ım', 'um', 'üm', 'in', 'ın', 'un', 'ün', 'imiz', 'ımız', 'umuz', 'ümüz', 'iniz', 'ınız', 'ler', 'lar', 'leri', 'ları', 'yu', 'yü', 'yi', 'yı', 'ye', 'ya', 'm', 'n', 'le', 'la', 'ler', 'deki', 'daki', 'e', 'imde', 'ımda', 'inde', 'ında', 'ime', 'ıma', 'ine', 'ına'];
const dzKucuk = s => String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase().replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
function dzEnKokler(w) {
  const o = [w], d = DZ_DUZENSIZ[w]; if (d) o.push(d);
  if (/ies$/.test(w)) o.push(w.slice(0, -3) + 'y');
  if (/(s|x|z|ch|sh|o)es$/.test(w)) o.push(w.slice(0, -2));
  if (/[^s]s$/.test(w)) o.push(w.slice(0, -1));
  if (/ing$/.test(w) && w.length > 4) { const k = w.slice(0, -3); o.push(k, k + 'e'); if (/(.)\1$/.test(k)) o.push(k.slice(0, -1)); if (/y$/.test(k)) o.push(k.slice(0, -1) + 'ie'); }
  if (/ied$/.test(w)) o.push(w.slice(0, -3) + 'y');
  if (/ed$/.test(w) && w.length > 3) { const k = w.slice(0, -2); o.push(k, w.slice(0, -1)); if (/(.)\1$/.test(k)) o.push(k.slice(0, -1)); }
  if (/(er|est)$/.test(w) && w.length > 4) { const k = w.replace(/(er|est)$/, ''); o.push(k, k + 'e'); if (/(.)\1$/.test(k)) o.push(k.slice(0, -1)); if (/i$/.test(k)) o.push(k.slice(0, -1) + 'y'); }
  if (/ly$/.test(w) && w.length > 4) { o.push(w.slice(0, -2)); if (/ily$/.test(w)) o.push(w.slice(0, -3) + 'y'); }
  return o;
}
// sözlük karşılığından aranacak Türkçe kökler: "gitmek" → git, gid · "kitap" → kitap, kitab · "başlamak" → başla, başl
function dzTrKokler(anlam) {
  const out = [];
  const ekle = x => { if (x && x.length >= 2 && out.indexOf(x) < 0) out.push(x); };
  dzKucuk(anlam).replace(/\([^)]*\)/g, ' ').split(/[\/,;]| veya | ya da /).forEach(p => {
    p.trim().split(/\s+/).forEach(k => {
      k = k.replace(/[^a-zçğıöşü]/g, ''); if (k.length < 2) return;
      if (/(mek|mak)$/.test(k) && k.length > 4) {
        // fiil kökü: "gitmek" → git, gid · "yemek" → ye, yi · "oynamak" → oyna, oynu · "beklemek" → bekle, bekli
        const kok = k.slice(0, -3);
        ekle('@' + kok); ekle('@' + kok.replace(/t$/, 'd').replace(/k$/, 'ğ'));
        if (/[ae]$/.test(kok)) ['ı', 'i', 'u', 'ü'].forEach(v => ekle('@' + kok.slice(0, -1) + v));
        if (k.length >= 3) ekle(k);
        return;
      }
      ekle(k); ekle(k.replace(/t$/, 'd').replace(/p$/, 'b').replace(/ç$/, 'c').replace(/nk$/, 'ng').replace(/k$/, 'ğ'));
      // ünlü düşmesi: burun → burn(um), ağız → ağz(ı), oğul → oğl(u)
      if (/^[a-zçğıöşü]+[bcçdfgğhjklmnprsştvyz][ıiuü][bcçdfgğhjklmnprsştvyz]$/.test(k) && k.length >= 4) ekle(k.slice(0, -2) + k.slice(-1));
    });
  });
  return out;
}
function dzEslesme(kok, t, birebir) {
  if (kok.charAt(0) === '@') {   // fiil kökü: her ek olabilir (git-tim, gid-iyorum, ye-r, yi-yor)
    kok = kok.slice(1);
    if (!t.startsWith(kok)) return 0;
    if (kok.length >= 3) return kok.length + 0.2;
    return /^(r|ar|er|ır|ir|ur|ür|iyor|ıyor|uyor|üyor|yor|d[ıiuü]|t[ıiuü]|m[ıiuü]ş|ecek|acak|eceğ|acağ|ebil|abil|yebil|yabil|me|ma|mez|maz|sin|sın|se|sa|ince|ınca|ip|ıp|yip|yıp|erek|arak|yerek|yarak|mek|mak|meli|malı|il|ıl|ş|y)/.test(t.slice(kok.length)) ? kok.length + 0.2 : 0;
  }
  if (birebir || kok.length <= 2) {
    if (t === kok) return kok.length + 0.5;
    if (birebir) return 0;
    return DZ_IKI_EK.indexOf(t.slice(kok.length)) >= 0 && t.startsWith(kok) ? kok.length : 0;
  }
  return t.startsWith(kok) ? kok.length + (t === kok ? 0.5 : 0) : 0;
}

const DZ_EDAT = { to: 1, in: 1, on: 1, at: 1, of: 1, for: 1, from: 1, with: 1, by: 1, into: 1, onto: 1, over: 1, under: 1, near: 1, after: 1, before: 1, about: 1, behind: 1, between: 1, since: 1, until: 1, towards: 1, toward: 1, through: 1, across: 1, around: 1, during: 1, without: 1, against: 1, among: 1, inside: 1, outside: 1, above: 1, below: 1, next: 1, opposite: 1, along: 1, past: 1, beside: 1 };
const DZ_ZAMAN = /^(yesterday|today|tomorrow|tonight|now|then|soon|later|recently|already|ago|morning|mornings|afternoon|evening|evenings|night|nights|week|weeks|weekend|weekends|month|months|year|years|day|days|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mondays|sundays|saturdays|fridays|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|o'clock|noon|midnight|hour|hours|minute|minutes|century|decade|always|never|often|sometimes|usually|every|last|next|early|late|lately|nowadays|currently|immediately|yet|once|twice|daily|weekly|monthly|annually)$/;
const DZ_SAYI = /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|hundred|thousand|million|few|several|many|a|an|the)$/;
const DZ_YER = /^(home|here|there|abroad|downstairs|upstairs|outside|inside|everywhere|somewhere|nowhere|away|back|downtown|overseas)$/;
const DZ_ZARF = { yet: 1, usually: 1, always: 1, never: 1, often: 1, sometimes: 1, also: 1, really: 1, just: 1, still: 1, already: 1, even: 1, ever: 1, only: 1, rarely: 1, seldom: 1 };
const DZ_SAHIPLIK = { my: 1, your: 1, his: 1, her: 1, its: 1, our: 1, their: 1 };
const DZ_EDAT_TR = { for: ['için'], after: ['sonra'], before: ['önce'], near: ['yakın'], under: ['alt'], behind: ['arka'], between: ['ara'], since: ['beri'], until: ['kadar'], towards: ['doğru'], toward: ['doğru'], about: ['hakkında', 'hakkın'], without: ['olmadan'], inside: ['iç'], outside: ['dış'], above: ['üst', 'üzer'], below: ['alt'], around: ['etraf', 'çevre'], during: ['boyunca', 'sırasında'], against: ['karşı'], among: ['arasında'], next: ['yan', 'sonraki'], opposite: ['karşı'], through: ['boyunca', 'içinden'], across: ['karşı'], with: ['ile', 'birlikte', 'yanında'], like: ['gibi'] };
// sözlük karşılığı → aday biçimler: her biri kelime dizisi (çok kelimeli karşılık: "kurşun kalem", "satın almak")
function dzAdaylar(w, sozlukAl) {
  const out = [];
  (DZ_ISLEV[w] || []).forEach(k => out.push({ k: dzKucuk(k).split(' ').map(x => [x]), birebir: k.length <= 3 }));
  (DZ_EDAT_TR[w] || []).forEach(k => out.push({ k: [[dzKucuk(k)]], birebir: false }));
  let fiil = false;
  const cekim = [w, DZ_DUZENSIZ[w], /[^s]s$/.test(w) ? w.slice(0, -1) : '', /es$/.test(w) ? w.slice(0, -2) : '', /ed$/.test(w) ? w.slice(0, -2) : '', /ed$/.test(w) ? w.slice(0, -1) : ''].filter(Boolean);
  dzEnKokler(w).forEach(kk => {
    const s0 = sozlukAl(kk), ek = DZ_EKSOZ[kk];
    const s = s0 && s0.tr ? (ek ? { tr: s0.tr + ' / ' + ek } : s0) : ek ? { tr: ek } : null;
    if (!s || !s.tr) return;
    const fiilOlabilir = cekim.indexOf(kk) >= 0;
    dzKucuk(s.tr).replace(/\([^)]*\)/g, ' ').split(/[\/,;]| veya | ya da /).forEach(an => {
      const sozcukler = an.trim().split(/\s+/).map(x => x.replace(/[^a-zçğıöşü]/g, '')).filter(x => x.length >= 2);
      if (!sozcukler.length) return;
      if (fiilOlabilir && /(mek|mak)$/.test(sozcukler[sozcukler.length - 1])) fiil = true;
      // çok kelimeli karşılık: son kelime dışındakiler isimdir ("yemek yemek": yemek + ye-)
      if (sozcukler.length > 1) out.push({ k: sozcukler.map((x, q) => q < sozcukler.length - 1 ? dzTrKokler(x).filter(y => y.charAt(0) !== '@') : dzTrKokler(x)), birebir: false });
      sozcukler.forEach(x => out.push({ k: [dzTrKokler(x)], birebir: false, parca: sozcukler.length > 1 }));
    });
  });
  return { adaylar: out, fiil };
}

/* en: İngilizce cümle, tr: Türkçe çeviri, kodlar: kelime başına hata kodları (B be, X yardımcı, M modal, Z zamir, A artikel, E edat…)
   sozlukAl(k) → { tr, pos } ya da null. Dönüş: { parcalar: [{ en, tr, yardimci, soru, ek }], tamam: bool } */
function dizilisCoz(en, tr, kodlar, sozlukAl) {
  const enT = String(en).replace(/[.,!?;:"“”]/g, ' ').split(/\s+/).filter(Boolean);
  const kod = kodlar && kodlar.length === enT.length ? kodlar : enT.map(() => 'W');
  const soru = /\?\s*$/.test(en);
  const trT = String(tr).replace(/\([^)]*\)/g, ' ').replace(/[.,!?;:"“”…]/g, ' ').split(/\s+/).filter(Boolean);
  const trK = trT.map(t => dzKucuk(t).replace(/['’]/g, ''));
  const lw = enT.map(w => w.toLowerCase().replace(/’/g, "'"));
  const n = enT.length, m = trT.length;
  if (!n || !m) return { parcalar: enT.map(w => ({ en: w, tr: '' })), tamam: false };
  const kokW = lw.map(w => w === "can't" ? 'can' : w === "won't" ? 'will' : w.replace(/n't$/, '').replace(/'(m|re|s|ve|ll|d)$/, ''));
  // 1) eşleştirme: her İngilizce kelime için çevirideki aday kelimeler (ya da kelime dizileri) ve puanları
  const es = [], puan = [], fiilS = [], adayL = [];
  for (let i = 0; i < n; i++) {
    const { adaylar, fiil } = dzAdaylar(kokW[i], sozlukAl); fiilS[i] = fiil;
    const ad = dzKucuk(enT[i]).replace(/[^a-z0-9çğıöşü]/g, ''), liste = [];
    for (let j = 0; j < m; j++) {
      // aynı yazılan kelime (ad, sayı): "Mert" → "Mert'in", "7" → "7'de"
      if (ad.length >= 2 && (trK[j] === ad || (/^[A-Z0-9]/.test(enT[i]) && i > 0 && trK[j].startsWith(ad)))) { liste.push({ js: [j], p: ad.length + 1 }); continue; }
      let ep = 0, ej = null;
      adaylar.forEach(a => {
        if (j + a.k.length > m) return;
        let p = 0;
        for (let q = 0; q < a.k.length; q++) { let b = 0; a.k[q].forEach(st => { b = Math.max(b, dzEslesme(st, trK[j + q], a.birebir)); }); if (!b) { p = 0; break; } p += b; }
        if (a.parca) p -= 0.6;   // çok kelimeli karşılığın tek parçası: tam diziden zayıf
        if (p > ep) { ep = p; ej = []; for (let q = 0; q < a.k.length; q++) ej.push(j + q); }
      });
      if (ep >= 1.5) liste.push({ js: ej, p: ep });
    }
    adayL[i] = liste; es[i] = []; puan[i] = 0;
  }
  // yardımcı do / have (soru başı, olumsuz, ya da ardından özne / V3): "yapmak" / "var" karşılığı alınmaz
  for (let i = 0; i < n; i++) {
    const w = lw[i], sonra_ = lw[i + 1] || '', sk = kod[i + 1] || '';
    const v3 = k => k < n && (kod[k] === 'V' || /(ed|en|wn|ne)$/.test(lw[k]) || Object.prototype.hasOwnProperty.call(DZ_DUZENSIZ, lw[k]) && !/^(went|saw|ate|came|took|made|had|did|was|were|said|got|knew|thought|bought|brought|told|gave|found|felt|wrote|ran|sat|stood|slept|spoke|drank|drove|began|became|met|paid|sold|sent|spent|taught|caught|built|lost|won|kept|held|heard|understood|forgot|broke|chose|fell|flew|grew|hid|rang|rode|rose|sang|swam|threw|woke|wore)$/.test(lw[k]));
    if (/^(do|does|did|don't|doesn't|didn't)$/.test(w) && ((i === 0 && soru) || /n't$/.test(w) || sonra_ === 'not' || DZ_OZNE[sonra_] || sk === 'Z')) es[i] = null;
    if (/^(have|has|had|haven't|hasn't|hadn't)$/.test(w) && (v3(i + 1) || (sonra_ === 'not' && v3(i + 2)) || (DZ_ZARF[sonra_] && v3(i + 2)) || (i === 0 && soru && v3(i + 2)))) es[i] = null;
    if (i === 0 && soru && DZ_YARDIMCI[w] && !/^(have|has|had)$/.test(w)) es[i] = null;
  }
  // küresel atama: en yüksek puanlı eşleşmeden başlayarak; bir Türkçe kelime tek İngilizce kelimeye gider,
  // kaybeden kelime boşta kalan sonraki en iyi adayını alır (fly → uçak değil uçurur)
  const sahip = new Array(m).fill(-1), tum = [];
  adayL.forEach((l, i) => { if (es[i] === null) return; l.forEach(c => tum.push({ i, js: c.js, p: c.p })); });
  tum.sort((x, y) => y.p - x.p || x.js[0] - y.js[0]);
  tum.forEach(c => { if (es[c.i].length || es[c.i] === null || c.js.some(j => sahip[j] >= 0)) return; es[c.i] = c.js.slice(); puan[c.i] = c.p; c.js.forEach(j => { sahip[j] = c.i; }); });
  for (let i = 0; i < n; i++) if (es[i] === null) es[i] = [];
  // 2) kelime türleri
  const yardimciMi = i => !!DZ_YARDIMCI[lw[i]] || /n't$/.test(lw[i]) || /'(m|re|s|ll|d|ve)$/.test(lw[i]) && DZ_OZNE[lw[i].split("'")[0]] === undefined;
  const beMi = i => /^(am|is|are|was|were|be|been|being|isn't|aren't|wasn't|weren't|'m|'re|'s)$/.test(lw[i]) || /'(m|re)$/.test(lw[i]);
  const fiilMi = i => yardimciMi(i) || /^(S|P|I|V|U|O|J|H)$/.test(kod[i]) || fiilS[i] || (!!DZ_DUZENSIZ[lw[i]] && !/^(men|women|children|feet|teeth|people|mice|better|best|worse|worst|left|past)$/.test(lw[i]));
  const edatMi = i => kod[i] === 'E' || !!DZ_EDAT[lw[i]];
  const belirleyiciMi = i => !!DZ_BELIRLEYICI[lw[i]] || kod[i] === 'A';
  const zamanMi = i => kod[i] === 'T' || DZ_ZAMAN.test(lw[i]) || /^\d{4}$/.test(lw[i]) || /^\d{1,2}(:\d\d)?(am|pm)?$/.test(lw[i]);
  const yerMi = i => DZ_YER.test(lw[i]);
  const tarzMi = i => /ly$/.test(lw[i]) && lw[i].length > 4 && !/^(only|family|early|daily|weekly|monthly|yearly|friendly|lovely|likely|ugly|holy|silly|lonely|lively|elderly|july|italy|reply|supply|apply|fly|july)$/.test(lw[i]) || /^(fast|hard|well|together|alone|again)$/.test(lw[i]);
  const islevMi = i => yardimciMi(i) || edatMi(i) || belirleyiciMi(i) || !!DZ_OZNE[lw[i]] || !!DZ_NESNE[lw[i]] || !!DZ_SAHIPLIK[lw[i]] || lw[i] === 'there' || lw[i] === 'to' || /^(A|E|Z|B|X|M|G)$/.test(kod[i]);
  // 3) dil bilgisi parçaları: özne / isim grubu · fiil grubu · edat grubu · bağlaç / soru kelimesi · zarf
  const sinif = i => {
    const w = lw[i];
    if (/^(Q)$/.test(kod[i]) || (/^(what|where|who|why|how|which|whose|when)$/.test(w) && (i === 0 || soru))) return 'Q';
    if (/^(L|R)$/.test(kod[i]) || /^(and|but|or|because|so|if|when|while|although|that|unless|whether|though|since|after|before|until)$/.test(w) && (i + 1 < n && (DZ_OZNE[lw[i + 1]] || belirleyiciMi(i + 1) || DZ_SAHIPLIK[lw[i + 1]] || kod[i + 1] === 'Z')) || /^(and|but|or|because|so|although|unless|whether)$/.test(w)) return 'B';
    if (DZ_OZNE[w] || DZ_NESNE[w]) return 'Z';
    if (i > 0 && (kod[i] === 'F' || /^(back|up|down|out|off|away|over|around|along)$/.test(w)) && sinifOnce === 'F' && !yardimciMi(i - 1) && (i + 1 >= n || kod[i] === 'F' || !(belirleyiciMi(i + 1) || DZ_SAHIPLIK[lw[i + 1]] || isimSozluk(i + 1)) || /^(off|up|down|out|away|back)$/.test(w) && belirleyiciMi(i + 1) === false)) return 'F';   // öbek fiil: come back, get up
    if (/^(this|that|these|those)$/.test(w) && (i + 1 >= n || kod[i + 1] === 'A' || /^(a|an|the)$/.test(lw[i + 1]) || DZ_SAHIPLIK[lw[i + 1]] || yardimciMi(i + 1) || beMi(i + 1))) return 'Z';   // gösterme zamiri
    if (w === 'there' && ((i + 1 < n && beMi(i + 1)) || (i > 0 && beMi(i - 1)))) return 'F';
    if (i === 0 && /ing$/.test(w) && w.length > 5 && !(i + 1 < n && DZ_OZNE[lw[i + 1]])) return 'I';   // "Running on ice was…": isim-fiil özne
    const hareketten = hareketTo(i);
    if (edatMi(i) && (hareketten || !(w === 'to' && i + 1 < n && (fiilS[i + 1] || !/^(W|A|Z|G|T)$/.test(kod[i + 1])) && !belirleyiciMi(i + 1) && !DZ_SAHIPLIK[lw[i + 1]]))) return 'E';
    const o = i > 0 ? lw[i - 1] : '';
    const zamirOnce = /^(this|that|these|those)$/.test(o) && (yardimciMi(i) || beMi(i) || /^(S|P|V|M|X|B)$/.test(kod[i]) || (fiilMi(i) && /s$/.test(w)));
    if (i > 0 && !zamirOnce && (DZ_BELIRLEYICI[o] || DZ_SAHIPLIK[o] || kod[i - 1] === 'A' || (edatMi(i - 1) && (o !== 'to' || hareketTo(i - 1))))) return zamanMi(i) && /^(this|that|every|last|next|each|all|one)$/.test(o) ? 'T' : 'I';
    if (i > 0 && yardimciMi(i - 1) && /(ing|ed|en)$/.test(w) && !belirleyiciMi(i)) return 'F';
    if (w === 'to' || yardimciMi(i) || w === 'not' || (DZ_ZARF[w] && i + 1 < n && (yardimciMi(i + 1) || fiilMi(i + 1))) || (DZ_ZARF[w] && i > 0 && yardimciMi(i - 1))) return 'F';
    if (zamanMi(i)) return 'T';
    if (/^(this|that|every|last|next|each|all|one)$/.test(w) && i + 1 < n && zamanMi(i + 1) && !/^(the)$/.test(w)) return 'T';
    if (tarzMi(i)) return 'N';
    if (fiilMi(i) && !yardimciMi(i) && i + 1 < n && yardimciMi(i + 1) && (i === 0 || sinifOnce === 'B' || sinifOnce === 'I')) return 'I';   // "Sleep is…": fiil gibi görünen özne
    if (fiilMi(i) && !(fiilVar && sinifOnce === 'I')) return 'F';
    return 'I';
  };
  const hareketTo = i => lw[i] === 'to' && i > 0 && dzEnKokler(lw[i - 1]).some(k => /^(go|come|walk|run|drive|fly|travel|move|return|get|ride|hurry|rush|cycle|head|sail)$/.test(k));
  const isimSozluk = i => { const sz_ = sozlukAl(lw[i]); return !!(sz_ && sz_.tr && !/(mek|mak)$/.test(dzKucuk(sz_.tr).split(/[\/,;(]/)[0].trim())); };
  let sinifOnce = null, fiilVar = false;
  const ing = [];
  for (let i = 0; i < n; i++) {
    const c = sinif(i), son = ing[ing.length - 1];
    if (c === 'F' && !(soru && yardimciMi(i) && (i === 0 || sinifOnce === 'Q'))) fiilVar = true;   // soru başındaki yardımcı fiil, asıl fiil sayılmaz
    if (c === 'B' || c === 'Q') fiilVar = false;
    sinifOnce = c;
    const sadeEdat = son && son.c === 'E' && son.i.slice(1).every(k => belirleyiciMi(k) || DZ_SAYI.test(lw[k]));
    const birles = son && ((c === 'I' && (son.c === 'I' || son.c === 'E' || son.c === 'T')) || (c === 'T' && (son.c === 'T' || sadeEdat)) || (c === 'F' && son.c === 'F') || (c === 'Q' && son.c === 'Q'));
    if (birles) { son.i.push(i); if (c === 'T' && son.c === 'E') son.zaman = true; if (c === 'T' && son.c === 'I' && son.i.length === 2 && DZ_BELIRLEYICI[lw[son.i[0]]]) son.c = 'T'; } else ing.push({ c, i: [i] });
  }
  // "of" grubu önceki isme bağlanır (the surface | of the moon → the surface of the moon); be + isim/sıfat = yüklem (am hungry, is an artist)
  for (let k = 1; k < ing.length; k++) {
    const p = ing[k], o = ing[k - 1];
    if (p.c === 'E' && lw[p.i[0]] === 'of' && (o.c === 'I' || o.c === 'Z' || o.yuklem)) { o.i = o.i.concat(p.i); ing.splice(k, 1); k--; continue; }
    if (p.c === 'I' && o.c === 'F' && o.i.every(i => beMi(i) || lw[i] === 'not' || /n't$/.test(lw[i]) || DZ_ZARF[lw[i]]) && !(o.i.length === 1 && lw[o.i[0]] === 'there')) { o.i = o.i.concat(p.i); o.yuklem = true; ing.splice(k, 1); k--; }
  }
  // soru başındaki yardımcı fiil (Do / Is / Can …): ayrı parça, görev "soru"
  if (soru && ing.length && ing[0].c === 'F' && yardimciMi(ing[0].i[0]) && ing[0].i.length > 1 && !es[ing[0].i[0]].length) { const y = { c: 'F', i: [ing[0].i.shift()], rol: 'soru', soruYrd: true }; ing.unshift(y); }
  else if (soru && ing.length && ing[0].c === 'F' && ing[0].i.length === 1 && yardimciMi(ing[0].i[0]) && ing.length > 1) { ing[0].rol = 'soru'; ing[0].soruYrd = true; }
  if (soru) for (let k = 0; k + 2 < ing.length; k++) {
    const p = ing[k];
    if (p.c === 'F' && !p.soruYrd && p.i.every(i => yardimciMi(i)) && (ing[k + 1].c === 'Z' || ing[k + 1].c === 'I') && ing.slice(k + 2).some(q => q.c === 'F') && (k === 0 || ing[k - 1].c === 'Q')) p.soruYrd = true;
  }
  // 4) görevler (SVOPT): özne · fiil · nesne · yer · zaman · (soru, bağlaç, nasıl, ek bilgi)
  const ZAMAN_EDAT = /^(since|until|during|before|after|till)$/, ZAMANLI_EDAT = /^(at|on|in|for|during|since|until|before|after|by|till|from|within)$/,
    HAREKET = /^(go|come|walk|run|drive|fly|travel|move|return|get|ride|swim|hurry|rush|climb|jump|send|take|bring|carry|invite|sail|cycle|head|arrive|lead)$/, YER_EDAT = /^(in|at|on|to|from|under|near|behind|between|into|onto|over|across|around|inside|outside|above|below|next|opposite|along|beside|through|towards|toward|out|off|up|down)$/;
  let fiilGordu = false;
  ing.forEach(p => {
    const ilk = lw[p.i[0]];
    if (p.soruYrd) p.rol = 'soru';
    else if (p.c === 'Q') p.rol = 'soru';
    else if (p.c === 'B') { p.rol = 'baglac'; fiilGordu = false; }
    else if (p.c === 'F') { p.rol = 'V'; fiilGordu = true; }
    else if (p.c === 'N') p.rol = 'nasil';
    else if (p.c === 'T' || (p.c !== 'E' && p.i.some(zamanMi)) || (p.c === 'E' && (ZAMAN_EDAT.test(ilk) || (ZAMANLI_EDAT.test(ilk) && (zamanMi(p.i[p.i.length - 1]) || (/^(at|until|by|before|after|since|in)$/.test(ilk) && /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight)$/.test(lw[p.i[p.i.length - 1]]))))))) p.rol = 'T';
    else if (p.c === 'E') {
      // "to" yalnız hareket fiilinden sonra yerdir (go to school); listen to music, talk to her → ek bilgi
      const onceki = ing[ing.indexOf(p) - 1], fiilKok = onceki && onceki.c === 'F' ? dzEnKokler(lw[onceki.i[onceki.i.length - 1]]) : [];
      p.rol = ilk === 'to' ? (fiilKok.some(k => HAREKET.test(k)) ? 'P' : 'ek') : YER_EDAT.test(ilk) ? 'P' : 'ek';
    }
    else if (p.i.length <= 2 && p.i.some(yerMi) && fiilGordu) p.rol = 'P';
    else p.rol = fiilGordu ? 'O' : 'S';
  });
  // be ile kurulan soruda (Are you aware…?) fiil yoksa özneden sonraki isim grubu yüklemdir
  if (ing[0] && ing[0].soruYrd && beMi(ing[0].i[0]) && !ing.some(p => p.rol === 'V')) { const ozne = ing.findIndex(p => p.rol === 'O' || p.rol === 'S'); if (ozne >= 0) { ing[ozne].rol = 'S'; const y = ing.slice(ozne + 1).find(p => p.rol === 'O' || p.rol === 'S'); if (y) y.rol = 'V'; } }
  // soruda yardımcı fiilden sonraki ilk isim grubu öznedir (Can your sister swim? → your sister = S)
  if (ing[0] && ing[0].soruYrd) { const k = ing.findIndex((p, pi) => pi > 0 && (p.rol === 'O' || p.rol === 'S')); const v = ing.findIndex(p => p.rol === 'V'); if (k >= 0 && (v < 0 || k < v)) ing[k].rol = 'S'; }
  // 5) Türkçe kelimeleri parçalara dağıt: eşleşen kelime kendi parçasına; eşleşmeyenler kurallara göre
  const par = ing, trPar = new Array(m).fill(-1);
  par.forEach((p, pi) => p.i.forEach(i => es[i].forEach(j => { trPar[j] = pi; })));
  const bos = pi => !par[pi].i.some(i => es[i].length);
  let tahmin = 0;
  const geri = j => { for (let k = j - 1; k >= 0; k--) if (trPar[k] >= 0) return trPar[k]; return -1; };
  const ileri = j => { for (let k = j + 1; k < m; k++) if (trPar[k] >= 0) return trPar[k]; return -1; };
  // a) ekler (soru eki, de/da, değil…) ve var/yok, "konusu" → öndeki kelimenin parçası; bir/daha/en/çok → sonrakinin
  for (let j = 0; j < m; j++) {
    if (trPar[j] >= 0) continue;
    if (DZ_EK.test(trK[j]) || /^konu(su|sunu|sunda|da|yu)?$/.test(trK[j])) { const a = geri(j); if (a >= 0) trPar[j] = a; }
    else if (/^(bir|daha|en|çok)$/.test(trK[j])) { const a = ileri(j); if (a >= 0) trPar[j] = a; }
  }
  // b) eşleşmeyen kelime öbekleri: cümle sonundaki öbek → Türkçesi boş fiil parçasına (Türkçede fiil sondadır);
  //    tek boş parça kaldıysa → ona; değilse komşu parçaya (tahmin)
  for (let j = 0; j < m; j++) {
    if (trPar[j] >= 0) continue;
    let k = j; while (k + 1 < m && trPar[k + 1] < 0) k++;
    const sonda = k === m - 1 || (k + 1 < m && DZ_EK.test(trK[k + 1]));
    const varYok = trK.slice(j, k + 1).every(x => /^(var|yok|değil)/.test(x));
    let bosFiil = par.findIndex((p, pi) => p.rol === 'V' && !p.soruYrd && bos(pi) && !p.i.every(i => yardimciMi(i)) && !trPar.includes(pi));
    if (bosFiil < 0) bosFiil = par.findIndex((p, pi) => p.rol === 'V' && !p.soruYrd && bos(pi) && !trPar.includes(pi));
    // "is a baker" = "bir … fırıncı": fiil parçasının Türkçesi öbeğin hemen önündeyse öbek de onundur
    if (bosFiil < 0 && sonda && j > 0 && trPar[j - 1] >= 0 && par[trPar[j - 1]].rol === 'V') bosFiil = trPar[j - 1];
    const bosDiger = par.map((p, pi) => pi).filter(pi => bos(pi) && !par[pi].soruYrd && par[pi].rol !== 'baglac' && par[pi].rol !== 'V' && !(par[pi].i.length === 1 && DZ_OZNE[lw[par[pi].i[0]]]) && !par[pi].i.every(i => yardimciMi(i)) && !trPar.includes(pi));
    let hedef = -1;
    if (sonda && bosFiil >= 0) hedef = bosFiil;
    else if (bosDiger.length === 1) hedef = bosDiger[0];
    else if (varYok) hedef = geri(j);
    else { tahmin += k - j + 1; hedef = -2; }   // emin değil: gösterilmez, boş parça sözlük karşılığı alır
    for (let q = j; q <= k; q++) trPar[q] = hedef;
    j = k;
  }
  par.forEach((p, pi) => { p.tr = []; for (let j = 0; j < m; j++) if (trPar[j] === pi) p.tr.push(trT[j]); });
  // 6) Türkçesi boş parça: özne zamiri → Ben/Sen/O…, yardımcı fiil → (ek fiil)/(yardımcı), diğerleri → sözlük karşılığı
  let sozlukten = 0;
  par.forEach(p => {
    if (p.tr.length) { p.kaynak = 'ceviri'; return; }
    const w = lw[p.i[0]];
    if (p.i.length === 1 && DZ_OZNE[w]) { let z = DZ_OZNE[w]; if (w === 'you' && /(siniz|sınız|sunuz|sünüz|iniz|ınız|unuz|ünüz)$/.test(trK[m - 1])) z = 'Siz'; p.tr = [z]; p.kaynak = 'zamir'; return; }
    if (p.i.every(i => yardimciMi(i) || lw[i] === 'there')) { p.etiket = p.i.some(beMi) && !p.soruYrd ? '(ek fiil)' : p.soruYrd ? '(soru)' : '(yardımcı)'; p.kaynak = 'etiket'; return; }
    if (p.rol === 'baglac' && DZ_BAGLAC[w]) { p.tr = [DZ_BAGLAC[w]]; p.kaynak = 'sozluk'; sozlukten++; return; }
    const g_ = [];
    p.i.forEach(i => {
      const w2 = kokW[i];
      if (/^(the)$/.test(w2) || yardimciMi(i)) return;
      if (DZ_ISLEV[w2] && DZ_ISLEV[w2].length) { g_.push(DZ_ISLEV[w2][0]); return; }
      let an = '';
      dzEnKokler(w2).some(k2 => { const sx = sozlukAl(k2) || (DZ_EKSOZ[k2] ? { tr: DZ_EKSOZ[k2] } : null); if (sx && sx.tr) { an = sx.tr.replace(/\([^)]*\)/g, '').split(/[\/,;]/)[0].trim(); return !!an; } return false; });
      if (!an && (/^[0-9]/.test(enT[i]) || (i > 0 && /^[A-Z]/.test(enT[i]) && enT[i] !== 'I'))) an = enT[i];
      if (an) g_.push(an);
    });
    if (g_.length) { p.tr = [g_.join(' ')]; p.kaynak = 'sozluk'; sozlukten++; } else { p.etiket = '–'; p.kaynak = 'etiket'; }
  });
  const parcalar = par.map(p => ({ en: p.i.map(i => enT[i]).join(' '), tr: p.etiket || p.tr.join(' '), rol: p.rol, kaynak: p.kaynak }));
  // büyük harf: Türkçe cümlenin ilk kelimesi (özel ad değilse) küçülür; dizilişin ilk Türkçesi büyük harfle başlar
  const ozelAd = enT.some((w, i) => i > 0 && w !== 'I' && /^[A-Z]/.test(w) && trK[0].startsWith(dzKucuk(w).replace(/[^a-zçğıöşü]/g, '').slice(0, 3)));
  if (!ozelAd) parcalar.forEach(p => { if (p.kaynak === 'ceviri' && p.tr.split(' ')[0] === trT[0]) p.tr = dzKucuk(p.tr.charAt(0)) + p.tr.slice(1); });
  const ilkTr = parcalar.find(p => p.kaynak !== 'etiket');
  if (ilkTr && parcalar.indexOf(ilkTr) <= 1) ilkTr.tr = ilkTr.tr.charAt(0).toLocaleUpperCase('tr') + ilkTr.tr.slice(1);
  // tamam: bütün Türkçe çeviriden geldi ve tahmin yok (yalnız istatistik / test için; kart her durumda gösterilir)
  const icerikEksik = enT.some((w, i) => !es[i].length && !islevMi(i) && !DZ_ISLEV[kokW[i]] && !DZ_ZARF[lw[i]]);
  const tamam = par.length >= 2 && tahmin === 0 && sozlukten === 0 && !icerikEksik;
  return { parcalar, tamam };
}

/* ---------------- oyunda gösterim ---------------- */
let dzOnbellek = {}, dzAcik = null;
function dizilisAcikMi() { return kayit.ayar.dizilis !== false; }
// Hazır diziliş (yapay zekâyla hazırlanıp denetlenmiş): içerikte 5. alan ya da kaynak/dizilis/dizilis.json → dizilis-hazir.js (window.NE_DIZILIS)
function dizilisHazir(s) {
  if (s.dz) return s.dz;
  const H = window.NE_DIZILIS, v = H && s.kaynak != null ? H[s.kaynak + ':' + s.i] : null;
  return v ? v.map(q => q.join('§')).join('¦') : '';
}
function dizilisCumle(s) {
  // hazır diziliş varsa o; yoksa otomatik eşleştirme
  const dz = dizilisHazir(s);
  if (dz) {
    const parcalar = dz.split('¦').map(q => { const a = q.split('§'); const tr = a[2] || '—'; return { rol: a[0], en: a[1], tr, kaynak: /^\(.*\)$|^—$/.test(tr) ? 'etiket' : 'hazir' }; });
    const ilk = parcalar.find(p => p.kaynak === 'hazir'); if (ilk) ilk.tr = ilk.tr.charAt(0).toLocaleUpperCase('tr') + ilk.tr.slice(1);
    return { parcalar, tamam: true, hazir: true };
  }
  const k = s.en + '§' + s.tr;
  if (!dzOnbellek[k]) {
    const sz = sozluk();
    dzOnbellek[k] = dizilisCoz(s.en, s.tr, s.c, w => sz[w] ? { tr: sz[w].tr, pos: sz[w].pos } : null);
    const anah = Object.keys(dzOnbellek); if (anah.length > 300) delete dzOnbellek[anah[0]];
  }
  return dzOnbellek[k];
}
const DZ_ROL = { S: ['S', 'Özne', '#19f0ff'], V: ['V', 'Fiil', '#ff4d6d'], O: ['O', 'Nesne', '#3dff7a'], P: ['P', 'Yer', '#b18cff'], T: ['T', 'Zaman', '#ffd23d'],
  soru: ['?', 'Soru', '#ff9a3c'], baglac: ['+', 'Bağlaç', '#9aaccb'], nasil: ['N', 'Nasıl', '#5ee0c8'], ek: ['+', 'Ek bilgi', '#9aaccb'],
  kalip: ['K', 'Kalıp', '#ff7ad9'] };   // kalıp ifade tek parça ve anlamıyla: I wish → Keşke
// cümle tamamlanınca SVOPT kartı: oyun bekler, kart dokunana kadar kalır; dokununca sonraki cümle gelir
function dizilisGoster(s, devam) {
  const r = dizilisCumle(s);
  let el = document.getElementById('dizilis');
  if (!el) { el = document.createElement('div'); el.id = 'dizilis'; document.body.appendChild(el); }
  const sozlukVar = r.parcalar.some(p => p.kaynak === 'sozluk');
  el.innerHTML = `<div class="dz-kart" role="dialog" aria-label="${tt('İngilizce dizilişi')}"><div class="dz-bas"><span>${tt('İNGİLİZCE DİZİLİŞİ')}</span><button class="dz-dinle" aria-label="${tt('Tekrar dinle')}">${HOP} ${tt('Dinle')}</button></div>
    <div class="dz-parcalar">${r.parcalar.map(p => { const rl = DZ_ROL[p.rol] || DZ_ROL.ek; return `<div class="dz-p${p.kaynak === 'etiket' ? ' yrd' : ''}${p.kaynak === 'sozluk' ? ' sozluk' : ''}" style="--c:${rl[2]}"><em><i>${rl[0]}</i>${tt(rl[1])}</em><b lang="en">${esc(p.en)}</b><span>${esc(p.tr)}</span></div>`; }).join('')}</div>
    ${sozlukVar ? '<p class="dz-not">' + tt('<i>Eğik yazılar</i> sözlük karşılığıdır.') + '</p>' : ''}
    <div class="dz-alt">${tt('Devam etmek için dokun')}</div></div>`;
  el.classList.add('acik');
  const kapat = birKez(() => { dizilisGizle(); devam(); });
  dzAcik = { kapat };
  el.onclick = e => { if (e.target.closest('.dz-dinle')) { e.stopPropagation(); sesAc(); Konus.soyle(s.en, { zorla: true }); return; } Ses.cal('tik', { ses: 0.35 }); Konus.sus(); kapat(); };
}
function dizilisGizle() { const el = document.getElementById('dizilis'); if (el) { el.classList.remove('acik'); el.onclick = null; } dzAcik = null; }
window.addEventListener('keydown', e => {
  if (!dzAcik || e.repeat || (typeof panelAcik === 'function' && panelAcik())) return;
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); dzAcik.kapat(); }
}, true);
