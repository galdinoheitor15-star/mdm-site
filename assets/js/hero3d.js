// Cena 3D do hero: logo MDM extrudado + capelo com borla física + objetos de estudo orbitando.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PURPLE = 0x7b2cf0;
const PURPLE_DEEP = 0x3a0d77;
const YELLOW = 0xffcf1f;
let LOW = false; // modo leve: sem transmissão/iridescência (celulares e máquinas fracas)

export function initHero3D(container) {
  const isMobile = matchMedia('(max-width: 900px)').matches;
  const lowPower = isMobile || (navigator.hardwareConcurrency || 8) <= 4;
  LOW = lowPower;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return null;
  }
  let pixelRatio = Math.min(devicePixelRatio, isMobile ? 1.25 : lowPower ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = makeBackground();
  scene.fog = new THREE.Fog(0x12031f, 9, 22);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.2, 9);

  // ---------- Luzes ----------
  scene.add(new THREE.AmbientLight(0x8a5cff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rimPurple = new THREE.PointLight(PURPLE, 40, 20);
  rimPurple.position.set(-4, 1, -2);
  scene.add(rimPurple);
  const rimYellow = new THREE.PointLight(YELLOW, 18, 14);
  rimYellow.position.set(4, -2, 2);
  scene.add(rimYellow);

  // ---------- Grupo principal (posição do logo na tela) ----------
  const stage = new THREE.Group();
  scene.add(stage);
  const logoRoot = new THREE.Group();
  stage.add(logoRoot);

  // ---------- Logo extrudado ----------
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: 0xe9dcff, roughness: 0.22, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.06,
    iridescence: 0.55, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 600],
    sheen: 0.4, sheenColor: new THREE.Color(0xc9a8ff)
  });
  const sideMat = new THREE.MeshPhysicalMaterial({
    color: 0x9b5cff, roughness: 0.22, metalness: 0.65,
    clearcoat: 1, clearcoatRoughness: 0.1,
    emissive: 0x2a0870, emissiveIntensity: 0.5
  });
  if (lowPower) { faceMat.iridescence = 0; faceMat.sheen = 0; }

  const extrude = { depth: 0.24, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 6, curveSegments: 72 };

  const R = 1, r = 0.7, gap = 0.36;
  const a1 = Math.PI / 2 - gap, a2 = Math.PI / 2 + gap;
  const ring = new THREE.Shape();
  ring.absarc(0, 0, R, a1, a2, true);
  ring.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
  ring.absarc(0, 0, r, a2, a1, false);
  ring.closePath();

  const book = new THREE.Shape();
  book.moveTo(-0.5, 0.18);
  book.lineTo(0, -0.12);
  book.lineTo(0.5, 0.18);
  book.lineTo(0.5, -0.38);
  book.quadraticCurveTo(0.2, -0.36, 0, -0.56);
  book.quadraticCurveTo(-0.2, -0.36, -0.5, -0.38);
  book.closePath();

  const logoGeo = new THREE.ExtrudeGeometry([ring, book], extrude);
  logoGeo.translate(0, 0, -extrude.depth / 2);
  const logo = new THREE.Mesh(logoGeo, [faceMat, sideMat]);
  logoRoot.add(logo);

  // halo luminoso atrás do logo
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.012, 16, 160),
    new THREE.MeshBasicMaterial({ color: 0xc9a8ff, transparent: true, opacity: 0.9 })
  );
  halo.position.z = -0.25;
  logoRoot.add(halo);
  const halo2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.006, 12, 160),
    new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.7 })
  );
  halo2.rotation.x = 1.2;
  logoRoot.add(halo2);

  // disco de vidro roxo por trás
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 96),
    new THREE.MeshPhysicalMaterial({ color: PURPLE, roughness: 0.35, metalness: 0.1, transmission: 0.0, transparent: true, opacity: 0.55, emissive: PURPLE_DEEP, emissiveIntensity: 0.6 })
  );
  disc.position.z = -0.32;
  logoRoot.add(disc);

  // ---------- Capelo ----------
  const cap = new THREE.Group();
  cap.position.set(0, 1.12, 0.05);
  cap.rotation.set(0.32, 0, -0.08);
  logoRoot.add(cap);

  const capMat = new THREE.MeshPhysicalMaterial({ color: 0x24093f, roughness: 0.4, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: lowPower ? 0 : 1, sheenColor: new THREE.Color(0x7b2cf0) });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.5, 1, 1, 1), capMat);
  board.rotation.y = Math.PI / 4;
  cap.add(board);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(board.geometry), new THREE.LineBasicMaterial({ color: 0xc9a8ff, transparent: true, opacity: 0.6 }));
  edge.rotation.y = Math.PI / 4;
  cap.add(edge);
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.34, 48), capMat);
  skull.position.y = -0.2;
  cap.add(skull);

  const goldMat = new THREE.MeshPhysicalMaterial({ color: YELLOW, roughness: 0.25, metalness: 0.8, emissive: 0x6b4a00, emissiveIntensity: 0.6 });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), goldMat);
  button.position.y = 0.06;
  cap.add(button);
  const cornerX = 0.75 * Math.SQRT2 - 0.03;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, cornerX, 8), goldMat);
  cord.rotation.z = Math.PI / 2;
  cord.position.set(cornerX / 2, 0.055, 0);
  cap.add(cord);

  // borla com pêndulo (física simples de mola)
  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(cornerX, 0.04, 0);
  cap.add(tasselPivot);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), goldMat);
  string.position.y = -0.21;
  tasselPivot.add(string);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), goldMat);
  knot.position.y = -0.43;
  tasselPivot.add(knot);
  const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 24, 1, true), goldMat);
  fringe.position.y = -0.58;
  fringe.rotation.x = Math.PI;
  tasselPivot.add(fringe);
  const tassel = { ax: 0, az: 0, vx: 0, vz: 0 };

  // ---------- Objetos orbitando ----------
  const orbiters = [];
  const addOrbiter = (mesh, { radius, angle, y, z, speed, spin, scale = 1, depth = 1 }) => {
    mesh.scale.setScalar(scale);
    const holder = new THREE.Group();
    holder.add(mesh);
    stage.add(holder);
    orbiters.push({ holder, mesh, radius, angle, y, z, speed, spin, depth, phase: Math.random() * Math.PI * 2 });
  };

  addOrbiter(makeBook(0x7b2cf0), { radius: 2.6, angle: 2.6, y: -0.9, z: 0.4, speed: 0.08, spin: [0.2, 0.5, 0.1], scale: 0.9 });
  addOrbiter(makeBook(0xffcf1f), { radius: 2.9, angle: 0.4, y: 1.2, z: -0.6, speed: 0.08, spin: [0.3, -0.4, 0.2], scale: 0.75 });
  addOrbiter(makePencil(), { radius: 2.5, angle: 5.4, y: -1.3, z: 0.8, speed: 0.08, spin: [0.6, 0.2, 0.9], scale: 1 });
  addOrbiter(makeAtom(), { radius: 2.8, angle: 3.6, y: 1.4, z: -0.2, speed: 0.08, spin: [0.3, 0.6, 0.2], scale: 0.85 });
  addOrbiter(makeTriangle(), { radius: 3.1, angle: 1.4, y: -0.2, z: -1.2, speed: 0.08, spin: [0.2, 0.3, 0.4], scale: 0.8 });
  addOrbiter(makeDNA(), { radius: 3.2, angle: 4.5, y: 0.2, z: -1, speed: 0.08, spin: [0.1, 0.8, 0.05], scale: 0.7 });
  addOrbiter(makeGlassSphere(0.32), { radius: 2.2, angle: 1.0, y: -1.5, z: 1.3, speed: 0.08, spin: [0, 0, 0] });
  addOrbiter(makeGlassSphere(0.2), { radius: 2.4, angle: 3.0, y: 1.9, z: 1.1, speed: 0.08, spin: [0, 0, 0] });

  // fórmulas flutuantes (sprites com texto)
  const formulas = ['E = mc²', 'π', '∫ f(x) dx', 'H₂O', 'Δ = b² − 4ac', 'x²', 'λ', 'sen²θ + cos²θ = 1', 'F = m·a', 'ENEM', 'SSA'];
  const sprites = formulas.map((txt, i) => {
    const s = makeTextSprite(txt, i % 4 === 0 ? '#ffcf1f' : '#d9c4ff');
    const a = (i / formulas.length) * Math.PI * 2;
    s.userData = { a, rad: 3.8 + (i % 3) * 0.8, y: Math.sin(i * 1.7) * 2.2, z: -2.5 - (i % 4) * 0.8, sp: 0.02 + (i % 3) * 0.008 };
    stage.add(s);
    return s;
  });

  // ---------- Partículas ----------
  const pCount = lowPower ? 500 : 1400;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount * 3);
  const col = new Float32Array(pCount * 3);
  const cA = new THREE.Color(0xc9a8ff), cB = new THREE.Color(YELLOW), cC = new THREE.Color(0x7b2cf0);
  for (let i = 0; i < pCount; i++) {
    const rad = 3 + Math.random() * 10;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th) * 0.7;
    pos[i * 3 + 2] = rad * Math.cos(ph) - 3;
    const c = Math.random() < 0.08 ? cB : Math.random() < 0.5 ? cA : cC;
    col.set([c.r, c.g, c.b], i * 3);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, map: makeDot(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(particles);

  // ---------- Pós-processamento ----------
  let composer = null;
  if (!lowPower) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 0.97));
    composer.addPass(new OutputPass());
  }

  // ---------- Estado / interação ----------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;
  let intro = 0;      // 0 → 1 na animação de entrada
  let started = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  const perf = { sum: 0, n: 0 };
  const prevCapPos = new THREE.Vector3();
  const capWorld = new THREE.Vector3();
  const capVel = new THREE.Vector3();

  const onPointer = (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener('pointermove', onPointer, { passive: true });

  // giroscópio no celular
  const onTilt = (e) => {
    if (e.gamma == null) return;
    pointer.tx = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
    pointer.ty = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
  };
  if (isMobile) addEventListener('deviceorientation', onTilt, { passive: true });

  function layout() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
    // desktop: logo à direita do texto; mobile: logo no topo
    camera.position.z = w > 900 ? 9 : 11.5;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    if (w > 900) {
      stage.position.set(halfW * 0.5, 0.05, 0);
      stage.scale.setScalar(THREE.MathUtils.clamp(halfW / 4.8, 0.7, 1));
    } else {
      stage.position.set(0, halfH * 0.41, 0);
      stage.scale.setScalar(THREE.MathUtils.clamp(halfW / 3, 0.5, 0.9));
    }
    stage.userData.base = stage.position.clone();
  }
  const ro = new ResizeObserver(layout);
  ro.observe(container);
  layout();

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && started && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  });
  io.observe(container);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && started && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  });

  // estado inicial (antes da entrada)
  logoRoot.scale.setScalar(0.001);

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    // celular: 30 fps bastam para o 3D e deixam folga para a rolagem;
    // depois que o hero sai de vista quase todo, para de calcular e desenhar
    if (isMobile && (now - last < 31 || scrollP > 0.45)) {
      if (scrollP > 0.45) last = now;
      raf = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    // entrada: escala com overshoot + giro
    if (intro < 1) intro = Math.min(1, intro + dt / 1.8);
    const e = easeOutBack(intro);
    const eSmooth = 1 - Math.pow(1 - intro, 4);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // logo
    logoRoot.scale.setScalar(Math.max(0.001, e * (1 - scrollP * 0.35)));
    logoRoot.rotation.y = (1 - eSmooth) * -Math.PI * 1.5 + pointer.x * 0.45 + Math.sin(elapsed * 0.6) * 0.12 + scrollP * Math.PI * 0.9;
    logoRoot.rotation.x = pointer.y * 0.25 + Math.sin(elapsed * 0.8) * 0.04 - scrollP * 0.4;
    logoRoot.position.y = Math.sin(elapsed * 1.1) * 0.08;

    const base = stage.userData.base;
    stage.position.y = base.y + scrollP * 1.6;
    stage.position.x = base.x;

    halo.rotation.z = elapsed * 0.4;
    halo2.rotation.z = -elapsed * 0.3;
    halo2.rotation.y = Math.sin(elapsed * 0.5) * 0.4;

    // física da borla: reage à aceleração do capelo
    cap.getWorldPosition(capWorld);
    const vel = capVel.subVectors(capWorld, prevCapPos);
    prevCapPos.copy(capWorld);
    const k = 38, damp = 3.2;
    tassel.vz += (-tassel.az * k - tassel.vz * damp) * dt + vel.x * 6;
    tassel.vx += (-tassel.ax * k - tassel.vx * damp) * dt - vel.z * 6 + logoRoot.rotation.y * 0.0;
    tassel.az += tassel.vz * dt;
    tassel.ax += tassel.vx * dt;
    tasselPivot.rotation.z = THREE.MathUtils.clamp(tassel.az, -0.9, 0.9);
    tasselPivot.rotation.x = THREE.MathUtils.clamp(tassel.ax + Math.sin(elapsed * 1.3) * 0.05, -0.9, 0.9);

    // órbitas
    const spread = 1 + scrollP * 1.8;
    for (const o of orbiters) {
      const a = o.angle + elapsed * o.speed;
      const rr = o.radius * spread * (0.4 + 0.6 * eSmooth);
      o.holder.position.set(Math.cos(a) * rr, o.y + Math.sin(elapsed * 0.9 + o.phase) * 0.18, o.z + Math.sin(a) * 0.9);
      o.holder.position.x += pointer.x * -0.25 * o.depth;
      o.holder.position.y += pointer.y * 0.2 * o.depth;
      o.mesh.rotation.x += o.spin[0] * dt;
      o.mesh.rotation.y += o.spin[1] * dt;
      o.mesh.rotation.z += o.spin[2] * dt;
      o.mesh.scale.setScalar((o.mesh.userData.s ??= o.mesh.scale.x) * eSmooth);
    }

    for (const s of sprites) {
      const d = s.userData;
      const a = d.a + elapsed * d.sp;
      s.position.set(Math.cos(a) * d.rad * spread, d.y + Math.sin(elapsed * 0.5 + d.a) * 0.3, d.z);
      s.material.opacity = 0.55 * eSmooth * (1 - scrollP * 0.6);
    }

    particles.rotation.y = elapsed * 0.02 + pointer.x * 0.05;
    particles.rotation.x = pointer.y * 0.03;

    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (0.2 - pointer.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(base.x * 0.1, base.y * 0.2, 0);

    // qualidade adaptativa: se a média passar de ~22ms/quadro, reduz a resolução uma vez
    perf.sum += dt; perf.n++;
    if (perf.n === 90) {
      if (perf.sum / perf.n > (isMobile ? 0.042 : 0.022) && pixelRatio > 0.9) {
        pixelRatio = Math.max(0.85, pixelRatio - 0.35);
        renderer.setPixelRatio(pixelRatio);
        layout();
        particles.geometry.setDrawRange(0, Math.floor(pCount / 2));
      }
      perf.sum = 0; perf.n = 0;
    }

    // quase fora da tela: não gasta GPU desenhando
    if (scrollP < 0.92) {
      if (composer) composer.render(); else renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (started) return;
      started = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    setScroll(p) { scrollP = p; }
  };
}

/* ================= helpers ================= */

function easeOutBack(t) {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function makeBackground() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(330, 220, 10, 300, 260, 420);
  grd.addColorStop(0, '#4b14a3');
  grd.addColorStop(0.45, '#22074a');
  grd.addColorStop(1, '#12031f');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeTextSprite(text, color) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '700 64px Poppins, DM Sans, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w; c.height = 100;
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillText(text, 20, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  const h = 0.32;
  s.scale.set(h * (w / 100), h, 1);
  return s;
}

function makeBook(color) {
  const g = new THREE.Group();
  const cover = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xfaf6ff, roughness: 0.8 });
  const w = 0.9, h = 0.16, d = 0.66, t = 0.025;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), cover); top.position.y = h / 2;
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), cover); bot.position.y = -h / 2;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(t, h + t, d), cover); spine.position.x = -w / 2;
  const block = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, h - 0.01, d - 0.05), pages); block.position.x = 0.01;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, h + 0.03, d + 0.005), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  band.position.x = -w / 2 + 0.18;
  g.add(top, bot, spine, block, band);
  return g;
}

function makePencil() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), new THREE.MeshPhysicalMaterial({ color: YELLOW, roughness: 0.35, clearcoat: 0.6 }));
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xf2c79a, roughness: 0.8 }));
  wood.position.y = -0.65; wood.rotation.x = Math.PI;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.07, 12), new THREE.MeshStandardMaterial({ color: 0x2a0b4d }));
  lead.position.y = -0.735; lead.rotation.x = Math.PI;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xc0c0d0, metalness: 0.9, roughness: 0.25 }));
  ferrule.position.y = 0.6;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xc9a8ff, roughness: 0.6 }));
  eraser.position.y = 0.71;
  g.add(body, wood, lead, ferrule, eraser);
  g.rotation.z = 0.8;
  return g;
}

function makeAtom() {
  const g = new THREE.Group();
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshStandardMaterial({ color: YELLOW, emissive: YELLOW, emissiveIntensity: 1.4 }));
  g.add(nucleus);
  const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xd9c4ff, metalness: 0.7, roughness: 0.2, emissive: 0x5a1bb8, emissiveIntensity: 0.6 });
  for (let i = 0; i < 3; i++) {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 12, 100), ringMat);
    tor.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0);
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI) / 3;
    tor.rotation.set(Math.PI / 2.4, 0, 0);
    pivot.add(tor);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    e.position.set(0.55, 0, 0);
    tor.add(e);
    g.add(pivot);
  }
  return g;
}

function makeTriangle() {
  const outer = new THREE.Shape();
  outer.moveTo(0, 0.7); outer.lineTo(-0.6, -0.35); outer.lineTo(0.6, -0.35); outer.closePath();
  const hole = new THREE.Path();
  hole.moveTo(0, 0.38); hole.lineTo(-0.32, -0.2); hole.lineTo(0.32, -0.2); hole.closePath();
  outer.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outer, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
  geo.center();
  // transmissão exige um passe extra de render da cena inteira: só no desktop
  const mat = LOW
    ? new THREE.MeshStandardMaterial({ color: 0xc9a8ff, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.6 })
    : new THREE.MeshPhysicalMaterial({ color: 0xc9a8ff, transmission: 0.9, thickness: 0.3, roughness: 0.08, ior: 1.4, transparent: true, opacity: 0.9 });
  return new THREE.Mesh(geo, mat);
}

function makeDNA() {
  const g = new THREE.Group();
  const a = new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x3a0d77, emissiveIntensity: 0.6, roughness: 0.3 });
  const b = new THREE.MeshStandardMaterial({ color: YELLOW, emissive: 0x6b4a00, emissiveIntensity: 0.5, roughness: 0.3 });
  const link = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const sph = new THREE.SphereGeometry(0.05, 12, 12);
  for (let i = 0; i < 14; i++) {
    const t = i * 0.45;
    const y = (i - 7) * 0.1;
    const p1 = new THREE.Mesh(sph, a); p1.position.set(Math.cos(t) * 0.22, y, Math.sin(t) * 0.22);
    const p2 = new THREE.Mesh(sph, b); p2.position.set(-Math.cos(t) * 0.22, y, -Math.sin(t) * 0.22);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.44, 6), link);
    l.position.set(0, y, 0); l.rotation.z = Math.PI / 2; l.rotation.y = -t;
    g.add(p1, p2, l);
  }
  return g;
}

function makeGlassSphere(rad) {
  const mat = LOW
    ? new THREE.MeshStandardMaterial({ color: 0xd9c4ff, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.45 })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.6, roughness: 0.02, ior: 1.5, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1 });
  return new THREE.Mesh(new THREE.SphereGeometry(rad, LOW ? 24 : 48, LOW ? 24 : 48), mat);
}
