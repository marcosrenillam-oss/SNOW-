// Página del juego: la bajada (separada de la clase).
import * as THREE from 'three';
import { buildWorld, poseRider, BOARD, THEMES } from './world.js';
import { createGame } from './game.js';
import { buildBackdrop } from './backdrop.js';
import { loaderProgress } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('snowprofe:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('snowprofe:' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
const html = document.documentElement;
const LOW = matchMedia('(max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const S = { dir: store.get('stance', 'regular') === 'goofy' ? -1 : 1, pL: 0, pR: 0, skin: store.get('skin', 'drake') };

loaderProgress(0.1);
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let PR = Math.min(devicePixelRatio, LOW ? 1.5 : 2);
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOW ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 3000);

const W = await buildWorld(renderer);
loaderProgress(0.6);
await W.loadOutdoor();
loaderProgress(0.9);
W.scene.environment = W.envMountain;
W.flakes.visible = false; W.catcher.visible = false; W.slope.visible = false; W.layers.visible = false;
W.bgSphere.visible = false; W.studioSphere.visible = true; W.studioSphere.material.opacity = 1;
W.scene.fog.color.set('#cfd9e5'); W.scene.fog.near = 70; W.scene.fog.far = 700;
W.hemi.intensity = 0.9; W.warm.intensity = 0; W.rim.intensity = 0.5;
if (LOW) W.key.shadow.mapSize.set(1024, 1024);
const BD = buildBackdrop(W.scene, { low: LOW });
const parts = (b) => b.userData.parts;
for (const b of [W.bindL, W.bindR]) { parts(b).boot.visible = true; parts(b).boot.scale.setScalar(1); }
W.mats.boot.opacity = W.mats.bootDark.opacity = W.mats.bootAccent.opacity = 1;
const deg = Math.PI / 180;
W.bindL.rotation.y = (S.dir > 0 ? 15 : -6) * deg * S.dir;
W.bindR.rotation.y = (S.dir > 0 ? -6 : 15) * deg * S.dir;

function setSkin(sk) {
  S.skin = sk; store.set('skin', sk); W.setSkin(sk); html.dataset.board = sk;
  $$('[data-skin]').forEach((b) => b.classList.toggle('on', b.dataset.skin === sk));
}
$$('[data-skin]').forEach((b) => b.addEventListener('click', () => setSkin(b.dataset.skin)));
setSkin(S.skin);

/* ---------- Entrada ---------- */
const input = { L: new Set(), R: new Set(), J: new Set(), kL: false, kR: false, kJ: false };
$$('[data-pedal]').forEach((btn, n) => {
  const side = btn.dataset.pedal;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); input[side].add(n + ':' + e.pointerId); btn.classList.add('down'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, (e) => { input[side].delete(n + ':' + e.pointerId); if (![...input[side]].some((k) => k.startsWith(n + ':'))) btn.classList.remove('down'); });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});
const jb = $('#jump-btn');
jb.addEventListener('pointerdown', (e) => { e.preventDefault(); jb.setPointerCapture?.(e.pointerId); input.J.add(e.pointerId); jb.classList.add('down'); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jb.addEventListener(ev, (e) => { input.J.delete(e.pointerId); if (!input.J.size) jb.classList.remove('down'); });
jb.addEventListener('contextmenu', (e) => e.preventDefault());
const keyMap = { ArrowLeft: 'kL', KeyA: 'kL', ArrowRight: 'kR', KeyD: 'kR', Space: 'kJ', ArrowUp: 'kJ', KeyW: 'kJ' };
addEventListener('keydown', (e) => { if (keyMap[e.code]) { input[keyMap[e.code]] = true; if (game.on) e.preventDefault(); } if (e.code === 'Escape' && game.on) toMenu(); });
addEventListener('keyup', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
addEventListener('blur', () => { input.kL = input.kR = input.kJ = false; input.L.clear(); input.R.clear(); input.J.clear(); });
const inL = () => input.kL || input.L.size > 0, inR = () => input.kR || input.R.size > 0, inJ = () => input.kJ || input.J.size > 0;

/* ---------- Interfaz ---------- */
let mode = 'libre', msgTimer, trickTimer;
const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
function showBest() { const b = store.get('best-' + mode, 0); $('#best-score').textContent = b ? fmtTime(b) : '—'; $('#best-points').textContent = store.get('best-points', 0); }
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; $$('[data-mode]').forEach((x) => x.classList.toggle('on', x === b)); showBest(); }));
showBest();
const ui = {
  start(m) { document.body.classList.add('playing'); $('#game').hidden = false; $('#game-over').hidden = true; $('#start').hidden = true; $('#g-gates').textContent = m === 'slalom' ? 'Puertas 0' : 'Pista roja'; },
  stop() { document.body.classList.remove('playing'); $('#game').hidden = true; $('#start').hidden = false; showBest(); },
  countdown(v) { const m = $('#game-msg'); m.textContent = v; m.classList.add('on'); m.classList.remove('bad'); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('on'), 500); },
  msg(t, bad) {
    const m = $('#game-msg'); m.textContent = t; m.classList.add('on'); m.classList.toggle('bad', !!bad);
    clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('on'), 800);
    if (bad) { const f = $('#flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); navigator.vibrate?.(80); }
  },
  trick(name, pts, combo, start) {
    const el = $('#g-trick');
    el.querySelector('b').textContent = name;
    el.querySelector('span').textContent = start ? '' : `+${pts}${combo > 1 ? `  ×${combo} combo` : ''}`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(trickTimer); trickTimer = setTimeout(() => el.classList.remove('on'), 1600);
  },
  hud(d) {
    $('#g-score').textContent = d.score;
    jb.style.setProperty('--charge', d.charge.toFixed(3)); jb.classList.toggle('air', d.state === 'air');
    $('#g-speed').textContent = Math.round(d.kmh); $('#g-time').textContent = fmtTime(d.time);
    $('#g-prog').style.transform = `scaleX(${d.progress.toFixed(3)})`;
    if (d.mode === 'slalom') $('#g-gates').textContent = `Puertas ${d.gates}`;
  },
  finish(r) {
    $('#go-title').textContent = r.isBest ? '¡Nuevo récord!' : '¡Bajada completada!';
    $('#go-time').textContent = fmtTime(r.time); $('#go-top').textContent = Math.round(r.top * 3.6);
    $('#go-gates-box').hidden = r.mode !== 'slalom'; $('#go-gates').textContent = `${r.gates}/${r.total}`; $('#go-score').textContent = r.score;
    $('#go-best').textContent = (r.isBest ? 'Tu mejor tiempo en esta pista.' : `Tu récord: ${fmtTime(r.best)}`) + ` · Récord de puntos: ${r.bestPts}`;
    setTimeout(() => { $('#game-over').hidden = false; }, 900);
  },
};
const game = createGame({ W, camera, S, inL, inR, inJ, store, ui, renderer, low: LOW });
function toMenu() { game.stop(); }
$('#play-btn').addEventListener('click', () => game.start(mode));
$('#again-btn').addEventListener('click', () => game.start(mode));
$('#quit-btn').addEventListener('click', toMenu);
$('#game-exit').addEventListener('click', toMenu);

/* ---------- Bucle ---------- */
const footL = new THREE.Vector3(), footR = new THREE.Vector3(), center = new THREE.Vector3();
const meters = $$('.pedal .meter b').map((b) => ({ b, side: b.closest('.pedal').dataset.pedal }));
let vw = 0, vh = 0, lastT = performance.now(), clock = 0;
function resize() { vw = innerWidth; vh = innerHeight; renderer.setSize(vw, vh, false); canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px'; camera.aspect = vw / vh; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const perf = { n: 0, t: 0 };
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  perf.n++; perf.t += (now - lastT) / 1000;
  if (perf.t > 1.5) { const fps = perf.n / perf.t; perf.n = perf.t = 0; if (fps < 44 && PR > 0.85) { PR -= 0.25; renderer.setPixelRatio(PR); renderer.setSize(vw, vh, false); } }
  lastT = now; clock += dt;
  let opt;
  if (game.on) {
    opt = game.update(dt, clock);
    center.copy(opt.flakeAt);
  } else {
    // menú: tu tabla y tu avatar girando despacio delante de los Alpes
    W.rig.position.set(0, 0, 0); W.rig.rotation.set(0, clock * 0.35, 0); W.rig.quaternion.setFromEuler(W.rig.rotation);
    W.shadow.material.opacity = 0;
    if (vw > 820) { camera.position.set(-1.25, 1.25, 4.8); camera.lookAt(-1.25, 0.75, 0); }
    else { camera.position.set(0, 0.55, 5.4); camera.lookAt(0, 0.05, 0); }
    opt = { crouch: 0.5, shiftX: 0, shiftZ: 0, lookYaw: S.dir * 0.8, arms: 0.4, dir: S.dir };
    center.set(0, 0.5, 0);
  }
  W.rig.updateMatrixWorld(true);
  W.rider.visible = true; W.rider.position.set(0, 0, 0); W.rider.scale.setScalar(1); W.rider.rotation.set(0, 0, 0);
  W.rider.updateMatrixWorld(true);
  parts(W.bindL).aAnkleBone.getWorldPosition(footL); W.rider.worldToLocal(footL);
  parts(W.bindR).aAnkleBone.getWorldPosition(footR); W.rider.worldToLocal(footR);
  poseRider(W.rider, footL, footR, opt);
  W.studioSphere.position.copy(camera.position);
  W.studioSphere.rotation.y = 2.35;
  BD.update(clock, dt, { studio: 0, center, camera, speedZ: 0, fall: 1 });
  for (const m of meters) m.b.style.transform = `scaleX(${(m.side === 'L' ? S.pL : S.pR).toFixed(3)})`;
  renderer.render(W.scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame((now) => { lastT = now; frame(now); loaderProgress(1); setTimeout(() => $('#loader').classList.add('done'), 400); });
window.__snow = { W, S, game, input };
