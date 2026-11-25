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

function cloudTex() {
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

  // ---- Cordillera en anillo ----
  const SEG = low ? 260 : 420, ROWS = low ? 28 : 44, R0 = 48, R1 = 110;
  const pos = [], col = [], idx = [];
  const rock = new THREE.Color('#3a3f49'), rockDark = new THREE.Color('#23262d'), snow = new THREE.Color('#e9eef5'), c = new THREE.Color();
  const H = [];
  for (let j = 0; j <= ROWS; j++) {
    const t = j / ROWS, r = R0 + (R1 - R0) * t;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const nx = Math.cos(a) * 3.2, ny = Math.sin(a) * 3.2;
      let h = ridged(nx + t * 1.7, ny + t * 1.3) * 26 * Math.pow(t, 0.6) + noise(nx * 4, ny * 4) * 2.5 * t;
      h += Math.max(0, Math.sin(a * 3 + 1.2)) * 9 * t;          // cumbres más altas en algunos tramos
      const y = -3.2 + h * (0.16 + 0.42 * t);
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      H.push(y);
    }
  }
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < SEG; i++) {
    const a = j * (SEG + 1) + i, b = a + 1, c2 = a + SEG + 1, d = c2 + 1;
    idx.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const n = geo.attributes.normal;
  for (let k = 0; k < H.length; k++) {
    const slope = n.getY(k), y = H[k];
    const snowAmt = THREE.MathUtils.smoothstep(slope, 0.5, 0.78) * THREE.MathUtils.smoothstep(y, -1, 4) + THREE.MathUtils.smoothstep(y, 7, 13) * 0.7;
    c.copy(noise(k * 0.13, 3.1) > 0.5 ? rock : rockDark).lerp(snow, Math.min(1, snowAmt));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mountMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: false, transparent: true });
  const mountains = new THREE.Mesh(geo, mountMat);
  group.add(mountains);

  // ---- Suelo nevado ----
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x46526a, roughness: 0.9, transparent: true });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 96), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.66; ground.receiveShadow = true;
  group.add(ground);

  // ---- Bancos de niebla y nubes (se desplazan) ----
  const ctex = cloudTex();
  const clouds = [];
  for (let i = 0; i < (low ? 10 : 18); i++) {
    const m = new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false, opacity: 0.5, fog: false, color: i % 3 ? 0x8a97ad : 0xc9a68c });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), m);
    const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 35;
    s.position.set(Math.cos(a) * r, 2 + Math.random() * 7, Math.sin(a) * r);
    s.userData = { a, r, speed: (0.004 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1), base: 0.25 + Math.random() * 0.35 };
    group.add(s); clouds.push(s);
  }
  const mist = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false, opacity: 0.35, color: 0x6d7a90, fog: false });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), m);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 30, 0.2, Math.sin(a) * 30);
    s.userData = { a, r: 26, speed: 0.01 * (i % 2 ? 1 : -1), base: 0.4 };
    group.add(s); mist.push(s);
  }

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
      mountMat.opacity = studio; groundMat.opacity = studio;
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
