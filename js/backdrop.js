// Fondo vivo en 3D: cordillera nevada, suelo de nieve, niebla que se mueve, nubes y nieve con viento (todo en GPU).
import * as THREE from 'three';

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ridged(x, y) {
  let s = 0, a = 0.55, f = 1;
  for (let o = 0; o < 6; o++) { const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1); s += n * n * a; a *= 0.5; f *= 2.05; }
  return s;
}

function _unusedCloudTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const x = 128 + (Math.random() - 0.5) * 140, y = 128 + (Math.random() - 0.5) * 60, r = 30 + Math.random() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildBackdrop(scene, { low = false } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  // ---- Suelo nevado que se funde con el lago helado del panorama ----
  const fc = document.createElement('canvas'); fc.width = fc.height = 256;
  { const g = fc.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.95, transparent: true, alphaMap: new THREE.CanvasTexture(fc), depthWrite: false });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(38, 96), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.66; ground.receiveShadow = true;
  group.add(ground);
  const clouds = [], mist = [], mountMat = { opacity: 1 }, mountains = null;

  // ---- Nieve en GPU (con viento y rastro del cursor) ----
  const COUNT = low ? 1800 : 4200, BOX = new THREE.Vector3(24, 14, 24);
  const p = new Float32Array(COUNT * 3), sz = new Float32Array(COUNT), ph = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    p[i * 3] = Math.random() * BOX.x; p[i * 3 + 1] = Math.random() * BOX.y; p[i * 3 + 2] = Math.random() * BOX.z;
    sz[i] = Math.pow(Math.random(), 4) * 0.55 + 0.08; ph[i] = Math.random() * 100;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  sg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  sg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector2(0.4, 0) }, uScale: { value: 300 }, uOpacity: { value: 1 }, uFall: { value: 1 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform vec2 uWind; uniform float uScale; uniform float uFall;
      varying float vSize; varying float vFade;
      void main(){
        vec3 q = position;
        float fall = (0.35 + aSize * 0.5) * uFall;
        q.y -= uTime * fall;
        q.x += uTime * uWind.x + sin(uTime * 0.7 + aPhase) * 0.35;
        q.z += uTime * uWind.y + cos(uTime * 0.53 + aPhase * 1.3) * 0.35;
        vec3 w = mod(q - uCenter, uBox) - uBox * 0.5 + uCenter;
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        vSize = aSize;
        vFade = smoothstep(1.2, 3.0, d) * (1.0 - smoothstep(9.0, 12.0, d));
        gl_PointSize = clamp(aSize * uScale / d, 1.0, 22.0);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vSize; varying float vFade;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float soft = mix(0.75, 0.05, clamp(vSize, 0.0, 1.0));   // los copos grandes (cerca) salen desenfocados
        float a = 1.0 - smoothstep(1.0 - soft - 0.15, 1.0, r);
        gl_FragColor = vec4(vec3(1.0), a * vFade * uOpacity * (0.35 + 0.5 * (1.0 - vSize)));
      }`,
  });
  const snowPts = new THREE.Points(sg, snowMat);
  snowPts.frustumCulled = false;
  scene.add(snowPts);

  const windT = new THREE.Vector2(0.4, 0);
  let mx = 0, my = 0, lx = 0, ly = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  return {
    group, snow: snowPts, mountains, ground, groundMat,
    update(t, dt, { studio, center, camera, fall = 1, speedZ = 0 }) {
      // nubes y niebla giran despacio alrededor
      for (const s of [...clouds, ...mist]) {
        s.userData.a += s.userData.speed * dt;
        s.position.x = Math.cos(s.userData.a) * s.userData.r; s.position.z = Math.sin(s.userData.a) * s.userData.r;
        s.lookAt(camera.position.x, s.position.y, camera.position.z);
        s.material.opacity = s.userData.base * studio;
      }
      groundMat.opacity = studio;
      group.visible = studio > 0.01;
      // viento: base + empujón del cursor
      const vx = (mx - lx) / Math.max(dt, 0.008), vy = (my - ly) / Math.max(dt, 0.008); lx = mx; ly = my;
      windT.x = THREE.MathUtils.damp(windT.x, 0.35 + THREE.MathUtils.clamp(vx * 0.0015, -2.5, 2.5), 2.5, dt);
      windT.y = THREE.MathUtils.damp(windT.y, -speedZ + THREE.MathUtils.clamp(vy * 0.001, -1.5, 1.5), 2.5, dt);
      const u = snowMat.uniforms;
      u.uWind.value.x = 0; u.uWind.value.y = 0;
      u.uTime.value = t;
      // integrar el viento como desplazamiento acumulado (evita saltos)
      snowPts.position.x += windT.x * dt; snowPts.position.z += windT.y * dt;
      u.uCenter.value.copy(center).sub(snowPts.position);
      u.uFall.value = fall;
      u.uScale.value = innerHeight * 0.55 * Math.min(devicePixelRatio, 2) / 2;
    },
  };
}
