// İngilizce dizilişi eşleştiricisi: örnek cümleler + bütün içerikte kapsama (node --test testler/dizilis.test.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // kaynak/
const kod = readFileSync(path.join(kok, 'parcalar', 'dizilis.js'), 'utf8').split('/* ---------------- oyunda gösterim')[0];
const dizilisCoz = new Function(kod + '; return dizilisCoz;')();
const t = readFileSync(path.join(kok, 'icerik.js'), 'utf8');
const C = JSON.parse(t.slice(t.indexOf('window.NE_ICERIK=') + 17).trim().replace(/;$/, ''));
const sz = {}; for (const p in C.words) for (const w of C.words[p]) { const k = w[0].toLowerCase(); if (!sz[k]) sz[k] = { tr: w[1], pos: w[2] }; }
const al = k => sz[k] || null;
const yaz = r => r.parcalar.map(p => p.rol + ':' + p.en + '=' + p.tr).join(' | ');
const ornekler = [
  ['I am going to school.', 'Okula gidiyorum.', 'S:I=Ben | V:am going=gidiyorum | P:to school=okula'],
  ['We played football yesterday.', 'Dün futbol oynadık.', 'S:We=Biz | V:played=oynadık | O:football=futbol | T:yesterday=dün'],
  ['She is sleeping.', 'O (kız) uyuyor.', 'S:She=O | V:is sleeping=uyuyor'],
  ['I have a notebook.', 'Bir defterim var.', 'S:I=Ben | V:have=var | O:a notebook=bir defterim'],
  ['My grandfather is sleeping on the sofa.', 'Dedem kanepede uyuyor.', 'S:My grandfather=Dedem | V:is sleeping=uyuyor | P:on the sofa=kanepede'],
  ['We usually eat dinner at seven.', 'Genellikle akşam yedide yemek yeriz.', 'S:We=Biz | V:usually eat=genellikle yemek yeriz | O:dinner=akşam | T:at seven=yedide'],
  ['Can you summarize the story in three sentences?', 'Hikâyeyi üç cümlede özetleyebilir misin?', 'soru:Can=(soru) | S:you=Sen | V:summarize=özetleyebilir misin | O:the story=hikâyeyi | P:in three sentences=üç cümlede'],
  ['She goes to work by bus every morning.', 'O her sabah işe otobüsle gider.', 'S:She=O | V:goes=gider | P:to work=işe | ek:by bus=otobüsle | T:every morning=her sabah'],
  ['Pilots fly planes.', 'Pilotlar uçak uçurur.', 'S:Pilots=Pilotlar | V:fly=uçurur | O:planes=uçak'],
  ['Is this a small mirror?', 'Bu, küçük bir ayna mı?', 'soru:Is=(soru) | S:this=Bu | V:a small mirror=küçük bir ayna mı']
];
test('örnek cümleler SVOPT sırasıyla dizilir', () => {
  for (const [en, tr, bek] of ornekler) assert.equal(yaz(dizilisCoz(en, tr, null, al)), bek, en);
});
test('her cümlede her parçanın altında Türkçe (çeviriden, sözlükten ya da etiket) ve bir görev var', () => {
  let n = 0;
  for (const id in C.sentences) for (const s of C.sentences[id]) { if (!s || n++ % 7) continue; const r = dizilisCoz(s[1], s[0], s[3] ? s[3].split(',') : null, al); for (const p of r.parcalar) { assert.ok(p.rol, s[1]); assert.ok(p.tr && p.tr.length, s[1] + ' · ' + p.en); } }
});
test('çeviriden tam eşleşen cümleler: A1 ≥ %65, A2 ≥ %40, B1 ≥ %35', () => {
  const sev = {};
  for (const id in C.sentences) { const l = id.split('-')[0]; for (const s of C.sentences[id]) { if (!s) continue; const r = dizilisCoz(s[1], s[0], s[3] ? s[3].split(',') : null, al); (sev[l] = sev[l] || [0, 0])[1]++; if (r.tamam) sev[l][0]++; } }
  const o = l => sev[l][0] / sev[l][1];
  console.log('kapsama', Object.entries(sev).filter(([l]) => /^(A1|A2|B1|B2|C1|C2)$/.test(l)).map(([l, [a, b]]) => l + ' %' + Math.round(a / b * 100)).join(' · '));
  assert.ok(o('A1') >= 0.65); assert.ok(o('A2') >= 0.40); assert.ok(o('B1') >= 0.35);
});
