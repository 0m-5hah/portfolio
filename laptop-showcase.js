import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SCREEN_NODE = 'Laptop_DisplayPane';
const GLB_URL = new URL('./laptop_Demo/laptop_demo.glb', import.meta.url).href;
const POSTER_URL = new URL('./laptop_Demo/laptop-screen-poster.jpg', import.meta.url).href;

function applyMapToMesh(mesh, texture) {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    if (!m || typeof m !== 'object') continue;
    m.map = texture;
    // glTF export used black base + strong emissive for a "backlit" look; that hides baseColor map.
    if ('color' in m && m.color?.isColor) m.color.setRGB(1, 1, 1);
    if ('emissive' in m && m.emissive?.isColor) m.emissive.setRGB(0, 0, 0);
    if ('emissiveIntensity' in m) m.emissiveIntensity = 0;
    m.needsUpdate = true;
  }
}

function fitCameraToObject(camera, controls, object, margin = 1.48) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  controls.target.copy(center);

  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const vFovRad = THREE.MathUtils.degToRad(camera.fov);
  const hTan = Math.tan(vFovRad / 2);
  const distH = size.y / 2 / hTan;
  const distW = size.x / 2 / (hTan * Math.max(camera.aspect, 0.01));
  const dist = margin * Math.max(distH, distW, size.z * 0.75);

  camera.near = Math.max(maxDim / 400, dist / 800);
  camera.far = Math.max(maxDim * 80, dist * 40);
  camera.updateProjectionMatrix();

  camera.position.set(center.x + dist * 0.55, center.y + dist * 0.38, center.z + dist * 0.62);
  camera.lookAt(center);
  controls.update();
}

/** @param {HTMLElement} root */
function initLaptopShowcase(root) {
  const container = root.querySelector('[data-laptop-stage]');
  const canvas = root.querySelector('[data-laptop-canvas]');
  const video = root.querySelector('[data-laptop-video]');
  const statusEl = root.querySelector('[data-laptop-status]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canvas || !container) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 500);

  const hemi = new THREE.HemisphereLight(0xf5f5ff, 0x222233, 1.05);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3.5, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
  fill.position.set(-4, 2, -2);
  scene.add(fill);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.8;
  controls.maxDistance = 12;
  controls.enablePan = false;

  const clock = new THREE.Clock();
  let mixer = null;
  let screenMesh = null;
  let visible = true;
  /** @type {THREE.Object3D | null} */
  let framedObject = null;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w < 2 || h < 2) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  new ResizeObserver(resize).observe(container);
  resize();

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    },
    { rootMargin: '80px', threshold: 0.03 }
  );
  io.observe(container);

  function tryPlayVideo() {
    if (!video || reducedMotion) return;
    video.play().catch(() => {});
  }

  container.addEventListener('click', tryPlayVideo);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') tryPlayVideo();
    },
    { passive: true }
  );

  const loader = new GLTFLoader();
  loader.load(
    GLB_URL,
    (gltf) => {
      const rootObj = gltf.scene;
      scene.add(rootObj);

      screenMesh = rootObj.getObjectByName(SCREEN_NODE);
      if (!screenMesh || !screenMesh.isMesh) {
        rootObj.traverse((o) => {
          if (o.name === SCREEN_NODE && o.isMesh) screenMesh = o;
        });
      }

      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(rootObj);
        for (const clip of gltf.animations) {
          mixer.clipAction(clip).play();
        }
      }

      framedObject = rootObj;
      fitCameraToObject(camera, controls, rootObj);
      requestAnimationFrame(() => {
        if (framedObject) fitCameraToObject(camera, controls, framedObject);
      });

      if (screenMesh && reducedMotion) {
        new THREE.TextureLoader().load(POSTER_URL, (tex) => {
          applyMapToMesh(screenMesh, tex);
        });
      } else if (screenMesh && video) {
        const tex = new THREE.VideoTexture(video);
        applyMapToMesh(screenMesh, tex);
        video.addEventListener(
          'loadeddata',
          () => {
            tryPlayVideo();
          },
          { once: true }
        );
        tryPlayVideo();
      }

      if (statusEl) statusEl.hidden = true;
    },
    undefined,
    () => {
      if (statusEl) {
        statusEl.textContent =
          'Could not load the 3D model. Check that laptop_Demo/laptop_demo.glb is deployed.';
        statusEl.hidden = false;
      }
    }
  );

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    controls.update();
    renderer.render(scene, camera);
  }

  tick();
}

function initAll() {
  document.querySelectorAll('[data-laptop-showcase]').forEach((root) => {
    initLaptopShowcase(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll, { once: true });
} else {
  initAll();
}
