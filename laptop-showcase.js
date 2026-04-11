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

/** Fit camera to an axis-aligned box (center + bounding sphere for distance). */
function fitCameraToBox(camera, controls, box, margin = 2.35) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const R = Math.max(sphere.radius, maxDim * 0.5, 1e-6);

  controls.target.copy(center);

  const vFovRad = THREE.MathUtils.degToRad(camera.fov);
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * Math.max(camera.aspect, 0.01));
  const distV = R / Math.tan(vFovRad / 2);
  const distH = R / Math.tan(hFovRad / 2);
  const dist = margin * Math.max(distV, distH);

  camera.near = Math.max(maxDim / 400, dist / 1000);
  camera.far = Math.max(maxDim * 100, dist * 50);
  camera.updateProjectionMatrix();

  camera.position.set(center.x + dist * 0.55, center.y + dist * 0.38, center.z + dist * 0.62);
  camera.lookAt(center);
  controls.update();
}

function fitCameraToObject(camera, controls, object, margin) {
  const box = new THREE.Box3().setFromObject(object);
  fitCameraToBox(camera, controls, box, margin);
}

/**
 * Rest-pose bounds miss animated lid/screen. Union AABB over the timeline so framing fits the full motion.
 */
function computeAnimatedBounds(rootObj, mixer, clips) {
  const merged = new THREE.Box3();
  const tmp = new THREE.Box3();
  const maxDur = Math.max(...clips.map((c) => c.duration || 0), 0.001);
  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxDur;
    mixer.setTime(t);
    rootObj.updateMatrixWorld(true);
    tmp.setFromObject(rootObj);
    if (i === 0) merged.copy(tmp);
    else merged.union(tmp);
  }

  mixer.setTime(0);
  rootObj.updateMatrixWorld(true);
  return merged;
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
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 500);

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
  controls.minDistance = 0.6;
  controls.maxDistance = 24;
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
      resize();
      let frameBox = new THREE.Box3().setFromObject(rootObj);
      if (mixer && gltf.animations?.length) {
        frameBox = computeAnimatedBounds(rootObj, mixer, gltf.animations);
      }
      fitCameraToBox(camera, controls, frameBox);
      requestAnimationFrame(() => {
        if (!framedObject) return;
        resize();
        fitCameraToBox(camera, controls, frameBox);
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
