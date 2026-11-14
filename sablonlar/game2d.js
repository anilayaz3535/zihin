// =====================================================================
//  ZİHİN 2D OYUN ŞABLONU (Canvas 2D, kütüphane gerekmez)
//  Hazır altyapı: keskin (retina) canvas, kamera sarsıntısı, parçacıklar,
//  parlayan çizim, ses efektleri ve müzik, klavye + joystick + A butonu,
//  menü/duraklat/bitiş, en iyi skor. Sadece "ÖRNEK OYUN" bölümünü değiştir.
// =====================================================================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok */ } },
};
const SAVE_KEY = 'oyun-en-iyi';
const PALETTE = { bgTop: '#1b1446', bgBottom: '#3a1d4f', accent: '#5ef2ff', hot: '#ff4f8b', gold: '#ffd166', ink: '#ffffff' };

// ---------- Canvas ----------
const canvas = document.createElement('canvas');
$('app').appendChild(canvas);
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function onResize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', onResize);
onResize();

// ---------- Kamera sarsıntısı, parçacıklar, flash ----------
const cam = { x: 0, y: 0, shake: 0 };
const FX = [];
function burst(x, y, color = '#ffffff', count = 18, speed = 260, life = 0.7) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), s = rand(speed * 0.3, speed);
    FX.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.6, life), max: life, color, r: rand(2, 5) });
  }
}
function updateFX(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const p = FX[i]; p.life -= dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) FX.splice(i, 1);
  }
}
function drawFX() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of FX) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function glow(color, blur = 18) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function noGlow() { ctx.shadowBlur = 0; }
function flash(color = '#ffffff', strength = 0.5) {
  const f = $('flash');
  f.style.transition = 'none'; f.style.background = color; f.style.opacity = String(strength);
  requestAnimationFrame(() => { f.style.transition = 'opacity .4s ease'; f.style.opacity = '0'; });
}

// ---------- Ses ----------
const Sound = {
  ctx: null, master: null, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(this.ctx.destination); }
    catch { this.ctx = null; }
  },
  tone(freq, dur = 0.15, type = 'sine', vol = 0.2, slide = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.3, vol = 0.25) {
    const c = this.ctx; if (!c) return;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(this.master); s.start();
  },
  sfx: {
    pickup() { Sound.tone(880, 0.12, 'triangle', 0.18, 500); },
    hit() { Sound.noise(0.35, 0.3); Sound.tone(140, 0.4, 'sawtooth', 0.2, -90); },
    click() { Sound.tone(520, 0.06, 'square', 0.07); },
    jump() { Sound.tone(300, 0.18, 'sine', 0.15, 400); },
    start() { Sound.tone(440, 0.1, 'triangle', 0.15, 220); setTimeout(() => Sound.tone(660, 0.16, 'triangle', 0.15, 330), 90); },
    levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => Sound.tone(f, 0.14, 'triangle', 0.14), i * 80)); },
  },
  startMusic(bpm = 116) {
    if (!this.ctx || this.timer) return;
    const notes = [0, 3, 7, 10, 12, 10, 7, 3], root = 110, beat = 60 / bpm / 2; let step = 0;
    this.timer = setInterval(() => {
      const n = notes[step % notes.length];
      this.tone(root * Math.pow(2, n / 12) * 2, beat * 0.9, 'triangle', 0.045);
      if (step % 4 === 0) this.tone(root / 2, beat * 1.8, 'sine', 0.1);
      step++;
    }, beat * 1000);
  },
  stopMusic() { clearInterval(this.timer); this.timer = null; },
};

// ---------- Girdi ----------
const input = { x: 0, y: 0, action: false, actionPressed: false, keys: new Set(), stick: null };
const KEYS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], action: ['Space', 'Enter'] };
addEventListener('keydown', e => {
  if (e.repeat) return;
  input.keys.add(e.code);
  if (KEYS.action.includes(e.code)) { input.action = true; input.actionPressed = true; if (state === 'menu' || state === 'over') startGame(); }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
addEventListener('keyup', e => { input.keys.delete(e.code); if (KEYS.action.includes(e.code)) input.action = false; });
function readInput() {
  const has = list => list.some(c => input.keys.has(c));
  let x = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
  let y = (has(KEYS.down) ? 1 : 0) - (has(KEYS.up) ? 1 : 0); // 2D'de y aşağı doğru artar
  if (input.stick) { x = input.stick.x; y = -input.stick.y; }
  input.x = clamp(x, -1, 1); input.y = clamp(y, -1, 1);
}
const stickEl = $('stick'), knobEl = $('knob');
function moveStick(e) {
  const r = stickEl.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const len = Math.hypot(dx, dy); if (len > 1) { dx /= len; dy /= len; }
  input.stick = { x: dx, y: -dy };
  knobEl.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
}
stickEl.addEventListener('pointerdown', e => { stickEl.setPointerCapture(e.pointerId); moveStick(e); });
stickEl.addEventListener('pointermove', e => { if (stickEl.hasPointerCapture(e.pointerId)) moveStick(e); });
const endStick = () => { input.stick = null; knobEl.style.transform = ''; };
stickEl.addEventListener('pointerup', endStick);
stickEl.addEventListener('pointercancel', endStick);
const btnA = $('btnA');
btnA.addEventListener('pointerdown', e => { e.preventDefault(); input.action = true; input.actionPressed = true; Sound.init(); });
btnA.addEventListener('pointerup', () => { input.action = false; });
btnA.addEventListener('pointercancel', () => { input.action = false; });

// ---------- Ekranlar ve durum ----------
let state = 'menu', score = 0, best = store.get(SAVE_KEY, 0), time = 0;
$('bestMenu').textContent = best;
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id);
  $('hud').classList.toggle('show', id === null);
  document.body.classList.toggle('playing', id === null);
}
function setScore(v) { score = v; $('score').textContent = Math.floor(score); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  Sound.init(); Sound.sfx.click();
  const a = b.dataset.act;
  if (a === 'start') startGame();
  else if (a === 'resume') togglePause();
  else if (a === 'menu') { state = 'menu'; Sound.stopMusic(); show('menu'); }
});
$('menu').addEventListener('click', e => { if (!e.target.closest('button')) startGame(); });
$('pauseBtn').addEventListener('click', () => togglePause());
function togglePause() {
  if (state === 'play') { state = 'pause'; show('pause'); Sound.stopMusic(); }
  else if (state === 'pause') { state = 'play'; show(null); Sound.startMusic(); last = performance.now(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });
function startGame() { Sound.init(); Sound.sfx.start(); Sound.startMusic(); resetGame(); state = 'play'; show(null); last = performance.now(); }
function gameOver() {
  if (state !== 'play') return;
  state = 'over'; Sound.sfx.hit(); Sound.stopMusic();
  cam.shake = 1; flash('#ff3366', 0.45); burst(player.x, player.y, PALETTE.gold, 34, 360);
  if (score > best) { best = Math.floor(score); store.set(SAVE_KEY, best); }
  $('finalScore').textContent = Math.floor(score); $('bestOver').textContent = best; $('bestMenu').textContent = best;
  setTimeout(() => show('over'), 700);
}

// =====================================================================
//  ÖRNEK OYUN — bu bölümü kendi oyununla değiştir
//  (parlayan oyuncu, toplanacak yıldızlar, kovalayan düşmanlar)
// =====================================================================
const player = { x: 0, y: 0, vx: 0, vy: 0, r: 16 };
const stars = [], enemies = [], bgDots = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.5, 2) }));
function spawnStar() { stars.push({ x: rand(40, W - 40), y: rand(120, H - 160), t: rand(0, 6) }); }
function spawnEnemy() { const side = Math.random() < 0.5 ? -30 : W + 30; enemies.push({ x: side, y: rand(100, H - 100), r: rand(12, 20), sp: rand(70, 110) + time * 3 }); }
function resetGame() {
  player.x = W / 2; player.y = H / 2; player.vx = player.vy = 0;
  stars.length = 0; enemies.length = 0; FX.length = 0; setScore(0); time = 0;
  for (let i = 0; i < 5; i++) spawnStar();
  for (let i = 0; i < 2; i++) spawnEnemy();
}
function updateGame(dt) {
  time += dt;
  player.vx = lerp(player.vx, input.x * 320, 1 - Math.pow(0.001, dt));
  player.vy = lerp(player.vy, input.y * 320, 1 - Math.pow(0.001, dt));
  player.x = clamp(player.x + player.vx * dt, player.r, W - player.r);
  player.y = clamp(player.y + player.vy * dt, player.r + 70, H - player.r);
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i]; s.t += dt;
    if (Math.hypot(s.x - player.x, s.y - player.y) < player.r + 14) {
      burst(s.x, s.y, PALETTE.accent, 16); Sound.sfx.pickup(); setScore(score + 10);
      stars.splice(i, 1); spawnStar(); if (Math.random() < 0.35 + time / 90) spawnEnemy();
    }
  }
  for (const e of enemies) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(a) * e.sp * dt; e.y += Math.sin(a) * e.sp * dt;
    if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 4) { gameOver(); return; }
  }
}
function drawGame() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, PALETTE.bgTop); g.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const d of bgDots) { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 2 + d.x * 10); ctx.fillRect(d.x * W, d.y * H, d.s, d.s); }
  ctx.globalAlpha = 1;
  for (const s of stars) {
    const r = 10 + Math.sin(s.t * 4) * 2;
    glow(PALETTE.accent); ctx.fillStyle = PALETTE.accent; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  for (const e of enemies) { glow(PALETTE.hot); ctx.fillStyle = PALETTE.hot; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); }
  if (state !== 'over') { glow(PALETTE.gold, 26); ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill(); }
  noGlow();
}
// ======================= ÖRNEK OYUN SONU =============================

// ---------- Döngü ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  readInput();
  if (state === 'play') updateGame(dt); else time += dt;
  input.actionPressed = false;
  updateFX(dt);
  cam.shake = Math.max(0, cam.shake - dt * 2.5);
  const k = cam.shake * cam.shake * 14;
  ctx.save();
  ctx.translate(rand(-1, 1) * k, rand(-1, 1) * k);
  drawGame();
  drawFX();
  ctx.restore();
}
resetGame();
show('menu');
requestAnimationFrame(frame);
