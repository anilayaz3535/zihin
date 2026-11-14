// =====================================================================
//  ZİHİN 3D OYUN ŞABLONU (three.js 0.160)
//  Hazır altyapı: renderer + gökyüzü + ışık/gölge + bloom parlama,
//  kamera takibi ve sarsıntı, parçacıklar, ses efektleri ve müzik,
//  klavye + dokunmatik joystick + A butonu, menü/duraklat/bitiş, en iyi skor.
//  Oyunu yazmak için sadece "ÖRNEK OYUN" bölümünü değiştir.
// =====================================================================
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- Kayıt ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok */ } },
};
const SAVE_KEY = 'oyun-en-iyi';

// ---------- Renk paleti (oyuna göre değiştir) ----------
const PALETTE = { skyTop: 0x1b1446, skyBottom: 0xff7a59, fog: 0x3a2a5c, accent: 0x5ef2ff, hot: 0xff4f8b, gold: 0xffd166 };

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);

// ---------- Sahne, gökyüzü, ışıklar ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PALETTE.fog, 30, 170);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(500, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PALETTE.skyTop) }, bottom: { value: new THREE.Color(PALETTE.skyBottom) } },
    vertexShader: 'varying vec3 vDir;\nvoid main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top;\nuniform vec3 bottom;\nvarying vec3 vDir;\nvoid main() { float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, smoothstep(0.42, 0.9, h)), 1.0); }',
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xc4d4ff, 0x2a1640, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dd, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(PALETTE.accent, 0.7);
rim.position.set(-30, 20, -40);
scene.add(rim);

// ---------- Kamera ve sarsıntı ----------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 8, 14);
const camRig = { offset: new THREE.Vector3(0, 7, 13), look: new THREE.Vector3(0, 1, -5), shake: 0 };
const _tmp = new THREE.Vector3();
function updateCamera(target, dt) {
  _tmp.copy(target).add(camRig.offset);
  camera.position.lerp(_tmp, 1 - Math.pow(0.002, dt));
  if (camRig.shake > 0) {
    camRig.shake = Math.max(0, camRig.shake - dt * 2.5);
    const k = camRig.shake * camRig.shake * 0.8;
    camera.position.x += rand(-1, 1) * k;
    camera.position.y += rand(-1, 1) * k;
  }
  camera.lookAt(_tmp.copy(target).add(camRig.look));
  sky.position.copy(camera.position);
  sun.position.set(target.x + 30, target.y + 50, target.z + 20);
  sun.target.position.copy(target);
}

// ---------- Prosedürel doku ve malzeme yardımcıları ----------
function gridTexture(base = '#241a3d', line = '#3d2c78', size = 512, cells = 8) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  g.strokeStyle = line; g.lineWidth = 4;
  const s = size / cells;
  for (let i = 0; i <= cells; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...opts });
const glowMat = (color, intensity = 1.4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });

// ---------- Bloom parlama (yüklenemezse oyun normal çalışır) ----------
let composer = null;
async function setupPost() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    const c = new EffectComposer(renderer);
    c.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    c.setSize(window.innerWidth, window.innerHeight);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.55, 0.4, 0.82));
    c.addPass(new OutputPass());
    composer = c;
  } catch (e) { console.warn('Bloom kapalı: ' + e.message); composer = null; }
}

// ---------- Parçacıklar ----------
const FX = { list: [], geo: new THREE.IcosahedronGeometry(0.12, 0), mats: new Map() };
function fxMat(color) { if (!FX.mats.has(color)) FX.mats.set(color, new THREE.MeshBasicMaterial({ color })); return FX.mats.get(color); }
function burst(pos, color = 0xffffff, count = 18, speed = 7, life = 0.7) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(FX.geo, fxMat(color));
    m.position.copy(pos);
    scene.add(m);
    const v = new THREE.Vector3(rand(-1, 1), rand(0.2, 1.3), rand(-1, 1)).normalize().multiplyScalar(rand(speed * 0.4, speed));
    FX.list.push({ m, v, life: rand(life * 0.6, life), max: life });
  }
}
function updateFX(dt) {
  for (let i = FX.list.length - 1; i >= 0; i--) {
    const p = FX.list[i];
    p.life -= dt;
    p.v.y -= 14 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.scale.setScalar(Math.max(0.001, p.life / p.max));
    if (p.life <= 0) { scene.remove(p.m); FX.list.splice(i, 1); }
  }
}
function flash(color = '#ffffff', strength = 0.5) {
  const f = $('flash');
  f.style.transition = 'none'; f.style.background = color; f.style.opacity = String(strength);
  requestAnimationFrame(() => { f.style.transition = 'opacity .4s ease'; f.style.opacity = '0'; });
}

// ---------- Ses (dosya gerekmez, WebAudio ile üretilir) ----------
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
  startMusic(bpm = 112) {
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

// ---------- Girdi: klavye + dokunmatik joystick + A butonu ----------
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
  let y = (has(KEYS.up) ? 1 : 0) - (has(KEYS.down) ? 1 : 0);
  if (input.stick) { x = input.stick.x; y = input.stick.y; }
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

// ---------- Ekranlar ve oyun durumu ----------
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
  else if (state === 'pause') { state = 'play'; show(null); Sound.startMusic(); clock.getDelta(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

function startGame() {
  Sound.init(); Sound.sfx.start(); Sound.startMusic();
  resetGame();
  state = 'play'; show(null); clock.getDelta();
}
function gameOver() {
  if (state !== 'play') return;
  state = 'over';
  Sound.sfx.hit(); Sound.stopMusic();
  camRig.shake = 1; flash('#ff3366', 0.45);
  burst(player.position, PALETTE.gold, 30, 10);
  if (score > best) { best = Math.floor(score); store.set(SAVE_KEY, best); }
  $('finalScore').textContent = Math.floor(score);
  $('bestOver').textContent = best; $('bestMenu').textContent = best;
  setTimeout(() => show('over'), 700);
}

// =====================================================================
//  ÖRNEK OYUN — bu bölümü kendi oyununla değiştir
//  (oyuncu küresi, toplanacak kristaller, kaçılacak dikenler)
// =====================================================================
const groundTex = gridTexture();
groundTex.repeat.set(40, 40);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const player = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 2), new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: 0xff8a00, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 }));
player.castShadow = true;
player.position.y = 0.8;
scene.add(player);
const playerVel = new THREE.Vector3();

const items = [];
const orbGeo = new THREE.OctahedronGeometry(0.5), orbMat = glowMat(PALETTE.accent, 1.6);
const spikeGeo = new THREE.ConeGeometry(0.7, 1.6, 6), spikeMat = mat(PALETTE.hot, { emissive: 0x99113f, emissiveIntensity: 0.8 });
function spawn(type) {
  const m = new THREE.Mesh(type === 'orb' ? orbGeo : spikeGeo, type === 'orb' ? orbMat : spikeMat);
  const a = rand(0, Math.PI * 2), d = rand(8, 24);
  m.position.set(player.position.x + Math.cos(a) * d, type === 'orb' ? 1 : 0.8, player.position.z + Math.sin(a) * d);
  m.castShadow = true;
  scene.add(m);
  items.push({ mesh: m, type });
}
function resetGame() {
  for (const it of items) scene.remove(it.mesh);
  items.length = 0;
  player.position.set(0, 0.8, 0); playerVel.set(0, 0, 0);
  setScore(0); time = 0;
  for (let i = 0; i < 8; i++) spawn('orb');
  for (let i = 0; i < 4; i++) spawn('spike');
}
function updateGame(dt) {
  time += dt;
  playerVel.x += input.x * 40 * dt;
  playerVel.z -= input.y * 40 * dt;
  playerVel.multiplyScalar(Math.pow(0.05, dt));
  if (playerVel.length() > 12) playerVel.setLength(12);
  player.position.addScaledVector(playerVel, dt);
  player.rotation.x += playerVel.z * dt;
  player.rotation.z -= playerVel.x * dt;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.type === 'orb') { it.mesh.rotation.y += dt * 2; it.mesh.position.y = 1 + Math.sin(time * 3 + i) * 0.2; }
    const dist = it.mesh.position.distanceTo(player.position);
    if (it.type === 'orb' && dist < 1.4) {
      burst(it.mesh.position, PALETTE.accent, 16); Sound.sfx.pickup(); setScore(score + 10);
      scene.remove(it.mesh); items.splice(i, 1); spawn('orb');
      if (Math.random() < 0.5 + time / 120) spawn('spike');
      continue;
    }
    if (it.type === 'spike' && dist < 1.3) { gameOver(); return; }
    if (dist > 40) { scene.remove(it.mesh); items.splice(i, 1); spawn(it.type); }
  }
}
function idleScene(dt) { player.rotation.y += dt * 0.6; }
// ======================= ÖRNEK OYUN SONU =============================

// ---------- Döngü, otomatik kalite, yeniden boyutlandırma ----------
const clock = new THREE.Clock();
let fpsTime = 0, fpsFrames = 0, qualityChecked = false;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  readInput();
  if (state === 'play') {
    updateGame(dt);
    if (!qualityChecked) {
      fpsTime += dt; fpsFrames++;
      if (fpsTime > 3) { qualityChecked = true; if (fpsFrames / fpsTime < 40) { composer = null; renderer.setPixelRatio(1); } }
    }
  } else idleScene(dt);
  input.actionPressed = false;
  updateFX(dt);
  ground.position.set(Math.round(player.position.x / 10) * 10, 0, Math.round(player.position.z / 10) * 10);
  updateCamera(player.position, dt);
  if (composer) composer.render(dt); else renderer.render(scene, camera);
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 0.8 ? 72 : 60;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}
addEventListener('resize', onResize);
onResize();
setupPost();
show('menu');
frame();
