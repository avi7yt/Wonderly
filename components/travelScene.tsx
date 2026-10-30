"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SCENE_SCROLL_VH } from "@/lib/sceneConfig";

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

// Seeded random so the landscape is identical on every load.
function rngFrom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Textures                                                           */
/* ------------------------------------------------------------------ */
const ROAD_TILE = 14; // world units per road texture tile

function makeRoadTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    const r = rngFrom(7);
    ctx.fillStyle = "#3a3a40";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.07})`;
      ctx.fillRect(r() * w, r() * h, 30 + r() * 120, 20 + r() * 90);
    }
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    // edge lines
    ctx.fillStyle = "#e9e3d3";
    ctx.fillRect(w * 0.04, 0, w * 0.022, h);
    ctx.fillRect(w * 0.938, 0, w * 0.022, h);
    // dashed centre line (dash = 40% of the tile)
    ctx.fillRect(w * 0.488, 0, w * 0.024, h * 0.4);
  });
}

function makeGroundTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rngFrom(21);
    ctx.fillStyle = "#a98258";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const light = r() > 0.5;
      ctx.fillStyle = light
        ? `rgba(214,176,128,${0.05 + r() * 0.07})`
        : `rgba(90,62,40,${0.05 + r() * 0.08})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 6 + r() * 38, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,235,200,0.10)" : "rgba(50,30,20,0.16)";
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });
}

function makeSoftDot(inner = 0.0) {
  return canvasTexture(
    128,
    128,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, w * inner, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    false
  );
}

/* ------------------------------------------------------------------ */
/*  Mountains (low-poly cones with a snow line painted by vertex colour) */
/* ------------------------------------------------------------------ */
function makeMountain(
  h: number,
  r: number,
  base: THREE.Color,
  snowAmount: number,
  rng: () => number
) {
  const geo = new THREE.ConeGeometry(r, h, 8, 10, true);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const snow = new THREE.Color(0xf3efe9);
  const dark = base.clone().multiplyScalar(0.72);
  const snowLine = 1 - snowAmount + (rng() - 0.5) * 0.05;
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // position-based wobble => vertices that share a place move together (no cracks)
    const n =
      Math.sin(x * 0.31 + z * 0.23 + y * 0.12) * 0.5 +
      Math.sin(x * 0.11 - z * 0.17 + y * 0.29) * 0.5;
    const t = y / h + 0.5; // 0 base -> 1 apex
    const k = 1 - t * 0.6;
    pos.setXYZ(i, x + n * r * 0.1 * k, y + n * h * 0.03, z + n * r * 0.1 * k);

    c.copy(dark).lerp(base, smoothstep01(0, 0.7, t));
    const s = smoothstep01(snowLine, snowLine + 0.1, t + n * 0.04);
    c.lerp(snow, s);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
function smoothstep01(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/*  The safari jeep                                                    */
/* ------------------------------------------------------------------ */
function buildJeep() {
  const car = new THREE.Group();

  const body = new THREE.MeshStandardMaterial({ color: 0x17707a, roughness: 0.5, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x10202a,
    roughness: 0.12,
    metalness: 0.7,
    transparent: true,
    opacity: 0.88,
  });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.3, metalness: 0.9 });

  const box = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    car.add(m);
    return m;
  };

  // lower body, hood, bumpers
  box(1.9, 0.7, 4.2, body, 0, 0.8, 0);
  box(1.86, 0.1, 1.2, body, 0, 1.2, -1.5);
  box(1.98, 0.24, 0.16, dark, 0, 0.62, -2.14);
  box(1.98, 0.24, 0.16, dark, 0, 0.62, 2.14);
  box(1.2, 0.3, 0.05, dark, 0, 0.95, -2.11); // grille

  // lights
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c4,
    emissive: 0xffe9a8,
    emissiveIntensity: 1.6,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xaa1111,
    emissive: 0xff2222,
    emissiveIntensity: 1.2,
  });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), lightMat);
    hl.scale.set(1, 1, 0.5);
    hl.position.set(s * 0.68, 0.98, -2.12);
    car.add(hl);
    box(0.14, 0.34, 0.05, tailMat, s * 0.82, 1.0, 2.12);
  }

  // cabin walls + glass
  for (const s of [-1, 1]) {
    box(0.06, 0.35, 3.0, body, s * 0.9, 1.325, 0.6);
    box(0.04, 0.3, 2.9, glass, s * 0.9, 1.65, 0.6);
    // wing mirrors
    box(0.1, 0.16, 0.2, dark, s * 1.02, 1.5, -0.75);
    // fender flares
    box(0.34, 0.1, 1.05, dark, s * 1.0, 0.97, -1.35);
    box(0.34, 0.1, 1.05, dark, s * 1.0, 0.97, 1.35);
  }
  box(1.8, 0.35, 0.06, body, 0, 1.325, 2.07);
  box(1.7, 0.3, 0.04, glass, 0, 1.65, 2.07);
  const ws = box(1.8, 0.65, 0.05, glass, 0, 1.47, -0.9);
  ws.rotation.x = 0.28;
  box(1.9, 0.07, 0.1, body, 0, 1.8, -0.84);

  // roof with a SUNROOF opening (x: -0.6..0.6, z: -0.3..0.7)
  box(1.9, 0.08, 0.6, body, 0, 1.84, -0.6);
  box(1.9, 0.08, 1.4, body, 0, 1.84, 1.4);
  for (const s of [-1, 1]) box(0.35, 0.08, 1.0, body, s * 0.775, 1.84, 0.2);

  // interior
  box(1.7, 0.05, 2.9, dark, 0, 1.12, 0.6);
  for (const s of [-1, 1]) box(0.55, 0.5, 0.5, dark, s * 0.4, 1.4, 0.55);

  // roof rack + luggage + jerry can
  box(1.7, 0.04, 1.25, dark, 0, 1.93, 1.4);
  for (const s of [-1, 1]) box(0.04, 0.12, 1.25, dark, s * 0.84, 1.99, 1.4);
  box(0.82, 0.32, 0.55, new THREE.MeshStandardMaterial({ color: 0xe07a1f, roughness: 0.8 }), -0.34, 2.11, 1.45);
  box(0.7, 0.26, 0.45, new THREE.MeshStandardMaterial({ color: 0x3b4a5a, roughness: 0.8 }), 0.38, 2.08, 1.55);
  box(0.22, 0.32, 0.12, new THREE.MeshStandardMaterial({ color: 0x2d6a3a, roughness: 0.6 }), 0.72, 2.11, 0.95);

  // spare wheel on the back door
  const spareTyre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.24, 20),
    new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.95 })
  );
  spareTyre.rotation.x = Math.PI / 2;
  spareTyre.position.set(0, 1.0, 2.32);
  spareTyre.castShadow = true;
  car.add(spareTyre);
  const spareHub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16), chrome);
  spareHub.rotation.x = Math.PI / 2;
  spareHub.position.copy(spareTyre.position);
  car.add(spareHub);

  // wheels (each has a spin group so we can roll them)
  const tyreGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 24);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.34, 18);
  rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.35, 0.5, 0.05);
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.95 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.5 });

  const wheels: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    for (const z of [-1.35, 1.35]) {
      const holder = new THREE.Group();
      holder.position.set(sx * 0.98, 0.45, z);
      const spin = new THREE.Group();
      const tyre = new THREE.Mesh(tyreGeo, tyreMat);
      tyre.castShadow = true;
      spin.add(tyre, new THREE.Mesh(rimGeo, chrome));
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(spokeGeo, spokeMat);
        sp.rotation.x = (i * Math.PI) / 5;
        spin.add(sp);
      }
      holder.add(spin);
      car.add(holder);
      wheels.push(spin);
    }
  }
  return { car, wheels };
}

/* ------------------------------------------------------------------ */
/*  The couple                                                         */
/* ------------------------------------------------------------------ */
function buildCouple() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0.2); // centre of the sunroof

  const skin = new THREE.MeshStandardMaterial({ color: 0xdfa77f, roughness: 0.8 });
  const mat = (c: number, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

  const arm = (jacket: THREE.Material, x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.3, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.48, 4, 8), jacket);
    sleeve.position.y = -0.29;
    sleeve.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
    hand.position.y = -0.6;
    pivot.add(sleeve, hand);
    return pivot;
  };

  const person = (x: number, jacketColor: number, hairColor: number) => {
    const p = new THREE.Group();
    p.position.x = x;
    const jacket = mat(jacketColor);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), jacket);
    torso.scale.set(1.18, 1, 0.66);
    torso.position.y = 1.98;
    torso.castShadow = true;

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8), skin);
    neck.position.y = 2.44;

    const head = new THREE.Group();
    head.position.y = 2.57;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 16, 12), mat(hairColor, 0.7));
    hair.position.set(0, 0.015, 0.03);
    face.castShadow = hair.castShadow = true;
    head.add(face, hair);

    p.add(torso, neck, head);
    return { p, head, jacket };
  };

  const man = person(-0.29, 0x24385c, 0x1b1410);
  const woman = person(0.29, 0xf2e8da, 0x4a2c1a);

  // arms: man -> left arm up (cheering), right arm round her shoulders
  const manUp = arm(man.jacket, -0.21);
  const manHug = arm(man.jacket, 0.21);
  manHug.position.z = 0.15;
  manHug.rotation.z = 1.5;
  // woman -> right arm up (waving), left arm around his waist
  const womanUp = arm(woman.jacket, 0.21);
  const womanHug = arm(woman.jacket, -0.21);
  womanHug.position.z = 0.1;
  womanHug.rotation.z = -1.25;
  man.p.add(manUp);
  woman.p.add(womanUp);
  // hug arms live on the group so they cross between the two people
  manHug.position.x = -0.29 + 0.21;
  womanHug.position.x = 0.29 - 0.21;
  group.add(man.p, woman.p, manHug, womanHug);
  manUp.position.x = -0.21;
  womanUp.position.x = 0.21;

  // woman's flowing hair (3 strands) + scarf
  const strands: THREE.Group[] = [];
  const hairMat = mat(0x4a2c1a, 0.7);
  const strandGeo = new THREE.ConeGeometry(0.045, 0.55, 7);
  strandGeo.rotateX(Math.PI); // wide end at the head, tip at the bottom
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.position.set((i - 2) * 0.04, 2.58, 0.1);
    const strand = new THREE.Mesh(strandGeo, hairMat);
    strand.position.y = -0.27;
    pivot.add(strand);
    woman.p.add(pivot);
    strands.push(pivot);
  }

  const scarfGeo = new THREE.PlaneGeometry(0.12, 1.3, 1, 16);
  scarfGeo.translate(0, -0.65, 0);
  scarfGeo.rotateX(-Math.PI / 2); // now runs from z=0 back to z=+1.3
  const scarfBase = Float32Array.from(scarfGeo.attributes.position.array as Float32Array);
  const scarf = new THREE.Mesh(
    scarfGeo,
    new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.7, side: THREE.DoubleSide })
  );
  scarf.position.set(0, 2.4, 0.1);
  woman.p.add(scarf);

  return { group, man, woman, manUp, womanUp, strands, scarf, scarfGeo, scarfBase };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function TravelScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the CSS gradient behind the canvas stays as a fallback
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = reduceMotion ? 0.3 : 1;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const HORIZON = new THREE.Color(0xf5c8a0);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(HORIZON, 90, 620);

    const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 2000);

    /* ---------- sky + sun ---------- */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(0x2c4a8e) },
          mid: { value: new THREE.Color(0xe2906b) },
          bottom: { value: HORIZON.clone() },
        },
        vertexShader: `varying vec3 vP;
          void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
          void main(){
            float h = clamp(vP.y, 0.0, 1.0);
            vec3 c = mix(bottom, mid, smoothstep(0.0, 0.16, h));
            c = mix(c, top, smoothstep(0.10, 0.7, h));
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      })
    );
    scene.add(sky);

    const glowTex = makeSoftDot(0.0);
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xff7a3a,
        opacity: 0.6,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      })
    );
    sun.scale.set(430, 430, 1);
    const sunCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeSoftDot(0.35),
        color: 0xffdcae,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      })
    );
    sunCore.scale.set(150, 150, 1);
    scene.add(sun, sunCore);
    const SUN_OFFSET = new THREE.Vector3(60, 235, -750);

    /* ---------- lights ---------- */
    scene.add(new THREE.HemisphereLight(0xffe2c0, 0x8a6448, 1.7));
    const key = new THREE.DirectionalLight(0xffcf94, 3.2);
    key.position.set(14, 20, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -7;
    sc.right = 7;
    sc.top = 7;
    sc.bottom = -7;
    sc.near = 1;
    sc.far = 60;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xffb070, 1.6);
    rim.position.set(-10, 8, -30);
    scene.add(rim);

    /* ---------- ground + road ---------- */
    const groundTex = makeGroundTexture();
    groundTex.repeat.set(90, 76);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 760),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -330);
    ground.receiveShadow = true;
    scene.add(ground);

    const ROAD_LEN = 640;
    const roadTex = makeRoadTexture();
    roadTex.repeat.set(1, ROAD_LEN / ROAD_TILE);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(7, ROAD_LEN),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, -300);
    road.receiveShadow = true;
    scene.add(road);

    /* ---------- mountains ---------- */
    const rng = rngFrom(2024);
    const mountains = new THREE.Group();
    const nearCol = new THREE.Color(0xb98d65);
    const farCol = new THREE.Color(0xa795ad);
    const mountainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 20; i++) {
        const z = -60 - i * 20 - rng() * 12;
        const h = 18 + rng() * 26 + i * 2.6;
        const r = h * (0.8 + rng() * 0.4);
        const x = side * (r * 0.95 + 20 + rng() * 14 + i * 0.8);
        const col = nearCol.clone().lerp(farCol, clamp(i / 18)).offsetHSL(0, 0, (rng() - 0.5) * 0.04);
        const m = new THREE.Mesh(makeMountain(h, r, col, i > 6 ? 0.34 : 0.12, rng), mountainMat);
        m.position.set(x, h / 2 - 1, z);
        m.rotation.y = rng() * 6;
        mountains.add(m);
      }
    }
    // distant snowy range closing the valley
    for (let i = 0; i < 9; i++) {
      const h = 70 + rng() * 60;
      const r = h * (1.1 + rng() * 0.4);
      const m = new THREE.Mesh(
        makeMountain(h, r, new THREE.Color(0x9d8cab), 0.55, rng),
        mountainMat
      );
      m.position.set(-300 + i * 75 + (rng() - 0.5) * 30, h / 2 - 2, -430 - rng() * 60);
      m.rotation.y = rng() * 6;
      mountains.add(m);
    }
    scene.add(mountains);

    /* ---------- clouds ---------- */
    const clouds = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe9d2, transparent: true, opacity: 0.85 });
    const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) {
        const m = new THREE.Mesh(cloudGeo, cloudMat);
        const s = 14 + rng() * 14;
        m.scale.set(s * 1.5, s * 0.45, s * 0.8);
        m.position.set((j - n / 2) * 18 + rng() * 6, rng() * 5, rng() * 8);
        c.add(m);
      }
      c.position.set(-380 + rng() * 760, 110 + rng() * 80, -380 - rng() * 140);
      clouds.add(c);
    }
    scene.add(clouds);

    /* ---------- roadside props that stream past ---------- */
    type Streamer = { obj: THREE.Object3D; span: number };
    const streamers: Streamer[] = [];

    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMats = [0x7b5d45, 0x8c6b4e, 0x6d5440].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true })
    );
    for (let i = 0; i < 120; i++) {
      const m = new THREE.Mesh(rockGeo, rockMats[i % 3]);
      const s = 0.3 + Math.pow(rng(), 3) * 2.4;
      m.scale.set(s * (0.8 + rng() * 0.8), s * (0.5 + rng() * 0.5), s * (0.8 + rng() * 0.8));
      m.rotation.y = rng() * 6;
      const side = rng() > 0.5 ? 1 : -1;
      m.position.set(side * (5.4 + Math.pow(rng(), 1.6) * 42), s * 0.22, -300 + rng() * 330);
      scene.add(m);
      streamers.push({ obj: m, span: 330 });
    }

    const bushGeo = new THREE.IcosahedronGeometry(1, 0);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x6f6d3c, roughness: 1, flatShading: true });
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(bushGeo, bushMat);
      const s = 0.25 + rng() * 0.45;
      m.scale.set(s * 1.4, s * 0.7, s * 1.4);
      const side = rng() > 0.5 ? 1 : -1;
      m.position.set(side * (4.8 + rng() * 16), s * 0.3, -300 + rng() * 330);
      scene.add(m);
      streamers.push({ obj: m, span: 330 });
    }

    const postGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.7 });
    const postTopMat = new THREE.MeshStandardMaterial({ color: 0xd9381e, roughness: 0.6 });
    for (let z = 10; z > -300; z -= 15) {
      for (const side of [-1, 1]) {
        const p = new THREE.Group();
        const a = new THREE.Mesh(postGeo, postMat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.15), postTopMat);
        b.position.y = 0.45;
        p.add(a, b);
        p.position.set(side * 4.1, 0.48, z);
        scene.add(p);
        streamers.push({ obj: p, span: 315 });
      }
    }

    // prayer-flag lines strung over the road
    const flagColors = [0x2b6fd6, 0xf4f1ea, 0xd7372a, 0x2f9e55, 0xf2c230];
    const flagGeo = new THREE.PlaneGeometry(0.55, 0.45);
    const flagMats = flagColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide })
    );
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 6.8, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
    const flagPieces: { m: THREE.Mesh; phase: number }[] = [];
    for (let k = 0; k < 3; k++) {
      const line = new THREE.Group();
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(side * 8, 3.4, 0);
        line.add(pole);
      }
      for (let i = 0; i < 26; i++) {
        const x = -7.8 + (15.6 * i) / 25;
        const y = 6.4 - 1.2 * (1 - Math.pow(x / 8, 2));
        const f = new THREE.Mesh(flagGeo, flagMats[i % 5]);
        f.position.set(x, y - 0.22, 0);
        line.add(f);
        flagPieces.push({ m: f, phase: i * 0.7 + k });
      }
      line.position.z = -40 - k * 120;
      scene.add(line);
      streamers.push({ obj: line, span: 360 });
    }

    /* ---------- jeep + couple ---------- */
    const { car, wheels } = buildJeep();
    const couple = buildCouple();
    car.add(couple.group);
    scene.add(car);
    key.target = car;

    /* ---------- dust trail ---------- */
    const DUST = 80;
    const dustPos = new Float32Array(DUST * 3);
    const dustSize = new Float32Array(DUST);
    const dustAlpha = new Float32Array(DUST);
    const dustAge = new Float32Array(DUST);
    const dustLife = new Float32Array(DUST);
    const dustVel = new Float32Array(DUST * 2);
    const respawn = (i: number, stagger = false) => {
      dustLife[i] = 1.3 + rng() * 1.3;
      dustAge[i] = stagger ? rng() * dustLife[i] : 0;
      dustPos[i * 3] = (rng() - 0.5) * 2.2;
      dustPos[i * 3 + 1] = 0.25 + rng() * 0.25;
      dustPos[i * 3 + 2] = 2.4 + rng() * 0.3;
      dustVel[i * 2] = (rng() - 0.5) * 1.6;
      dustVel[i * 2 + 1] = 0.5 + rng() * 0.8;
    };
    for (let i = 0; i < DUST; i++) respawn(i, true);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("aSize", new THREE.BufferAttribute(dustSize, 1));
    dustGeo.setAttribute("aAlpha", new THREE.BufferAttribute(dustAlpha, 1));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: makeSoftDot(0.0) },
        color: { value: new THREE.Color(0xd8b88f) },
        uScale: { value: 600 },
      },
      vertexShader: `attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0);
          gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 color; varying float vA;
        void main(){ float a = texture2D(map, gl_PointCoord).a * vA; gl_FragColor = vec4(color, a);
          #include <colorspace_fragment>
        }`,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    car.add(dust);

    /* ---------- camera path ---------- */
    const camCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(8.0, 3.5, 17.5),
        new THREE.Vector3(4.2, 3.1, 9.0),
        new THREE.Vector3(1.7, 3.05, 5.4),
        new THREE.Vector3(0, 2.95, 3.1),
      ],
      false,
      "centripetal"
    );
    const lookCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 2.7, -10),
        new THREE.Vector3(0, 2.5, -7),
        new THREE.Vector3(0, 2.4, -8),
        new THREE.Vector3(0, 2.4, -14),
      ],
      false,
      "centripetal"
    );

    /* ---------- input ---------- */
    const target = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ---------- animation loop ---------- */
    let lastTime = performance.now();
    let t = 0;
    let prog = 0;
    let raf = 0;
    let texScroll = 0;
    const tmpPos = new THREE.Vector3();
    const tmpLook = new THREE.Vector3();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      t += dt;

      const vh = window.innerHeight;
      // the hero is scrolled out of view -> stop drawing
      const offscreen = window.scrollY > vh * (SCENE_SCROLL_VH + 1.05);
      mount.style.visibility = offscreen ? "hidden" : "visible";
      if (offscreen) return;

      // smoothed inputs
      const ease = 1 - Math.exp(-dt * 3.2);
      mouse.x += (target.x - mouse.x) * ease * motion;
      mouse.y += (target.y - mouse.y) * ease * motion;
      const scrollP = clamp(window.scrollY / (vh * SCENE_SCROLL_VH));
      prog += (scrollP - prog) * (1 - Math.exp(-dt * 7));
      const s = lerp(prog, smooth(prog), 0.55);

      // world speed (units / second): a bit slower as we zoom in
      const speed = lerp(26, 15, s) * motion;

      // road lines + roadside props + wheels
      texScroll += (speed * dt) / ROAD_TILE;
      roadTex.offset.y = texScroll;
      for (const st of streamers) {
        st.obj.position.z += speed * dt;
        if (st.obj.position.z > 30) st.obj.position.z -= st.span;
      }
      for (const w of wheels) w.rotation.x -= (speed * dt) / 0.45;
      for (const f of flagPieces) f.m.rotation.x = Math.sin(t * 6 + f.phase) * 0.35;
      clouds.position.x = Math.sin(t * 0.02) * 40;

      // jeep suspension + mouse lean
      car.position.y = Math.sin(t * 2.7) * 0.012 + Math.sin(t * 7.1) * 0.006;
      car.rotation.z = Math.sin(t * 1.6) * 0.006 - mouse.x * 0.025;
      car.rotation.x = Math.sin(t * 2.1) * 0.004 + mouse.y * 0.012;
      car.rotation.y = -mouse.x * 0.05;

      // couple
      couple.man.head.rotation.y = -mouse.x * 0.7;
      couple.woman.head.rotation.y = -mouse.x * 0.7;
      couple.man.head.rotation.x = mouse.y * 0.25;
      couple.woman.head.rotation.x = mouse.y * 0.25;
      couple.manUp.rotation.z = -2.75 + Math.sin(t * 3.1) * 0.12;
      couple.womanUp.rotation.z = 2.6 + Math.sin(t * 4.3) * 0.18;
      couple.strands.forEach((st, i) => {
        st.rotation.x = -(0.55 + Math.sin(t * 9 + i * 1.3) * 0.16) - (i % 2) * 0.12;
        st.rotation.z = (i - 2) * 0.1 + Math.sin(t * 7 + i) * 0.05;
      });
      const sp = couple.scarfGeo.attributes.position;
      const base = couple.scarfBase;
      for (let i = 0; i < sp.count; i++) {
        const z = base[i * 3 + 2];
        sp.setXYZ(
          i,
          base[i * 3] + Math.sin(t * 8 - z * 5) * 0.06 * z,
          base[i * 3 + 1] + z * 0.1 + Math.sin(t * 11 - z * 6) * 0.09 * z,
          z
        );
      }
      sp.needsUpdate = true;

      // dust
      const sizes = dustGeo.attributes.aSize as THREE.BufferAttribute;
      const alphas = dustGeo.attributes.aAlpha as THREE.BufferAttribute;
      const dpos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        dustAge[i] += dt;
        if (dustAge[i] > dustLife[i]) respawn(i);
        const k = dustAge[i] / dustLife[i];
        dustPos[i * 3] += dustVel[i * 2] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 2 + 1] * dt * 0.7;
        dustPos[i * 3 + 2] += speed * 0.92 * dt;
        dustSize[i] = 0.9 + k * 3.2;
        dustAlpha[i] = Math.sin(k * Math.PI) * 0.32;
      }
      dpos.needsUpdate = sizes.needsUpdate = alphas.needsUpdate = true;

      // camera: scroll moves along the path, mouse orbits around it
      camCurve.getPoint(s, tmpPos);
      lookCurve.getPoint(s, tmpLook);
      const k = lerp(1, 0.45, s);
      const aspect = window.innerWidth / window.innerHeight;
      // on tall phone screens keep the camera closer to the centre line
      tmpPos.x *= aspect < 1 ? lerp(0.3, 1, clamp((aspect - 0.45) / 0.55)) : 1;
      tmpPos.x += mouse.x * 1.0 * k;
      tmpPos.y += -mouse.y * 0.45 * k;
      tmpLook.x += mouse.x * 0.25;
      camera.position.copy(tmpPos);
      camera.lookAt(tmpLook);

      const baseFov = lerp(42, 36, s);
      camera.fov = baseFov + (aspect < 1 ? (1 - aspect) * 28 : 0);
      camera.updateProjectionMatrix();

      dustMat.uniforms.uScale.value =
        renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

      sky.position.copy(camera.position);
      sun.position.copy(camera.position).add(SUN_OFFSET);
      sunCore.position.copy(sun.position);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    /* ---------- cleanup ---------- */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mm) => {
          const withMap = mm as THREE.MeshStandardMaterial;
          withMap.map?.dispose();
          mm.dispose();
        });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="fixed inset-0 z-0 bg-gradient-to-b from-[#2c4a8e] via-[#e2906b] to-[#f0bd8e]"
    />
  );
}
