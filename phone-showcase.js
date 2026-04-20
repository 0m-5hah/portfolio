/**
 * 3D phone + screen video; tune **phone-showcase-config.json** (plain-English keys).
 * This file loads JSON, applies “whereItShowsOnThePage” to `.projects-phone-row` CSS variables, then runs Three.js.
 * Bare "three" / "three/addons/" require the import map in index.html (CSP hash); addon modules from the CDN also import "three".
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CONFIG_JSON = new URL('phone-showcase-config.json', import.meta.url);

/** Keep in sync with styles.css; no 3D phone (and no WebGL) below min-width 1400px for .project-phone-showcase-slot. */
const PHONE_SHOWCASE_MAX_WIDTH_PX = 1399;

/** Fallback if fetch fails or fields are missing */
const DEFAULT_PHONE_CONFIG = {
  modelUrl: 'laptop_Demo/blenderphone.glb',
  screenMaterialName: 'Screen on.002',
  /** 0–100 each: percent of the recording cropped from that edge (higher = more shrink). */
  screenShrinkPercent: { fromTop: 0, fromBottom: 0, fromLeft: 0, fromRight: 0 },
  /** 0–100 each: push the picture that way on the glass; opposing sides combine (e.g. Left vs Right). */
  screenVideoMovePercent: {
    moveVideoLeft: 0,
    moveVideoRight: 0,
    moveVideoLower: 0,
    moveVideoHigher: 0,
  },
  /** 0–100: zoom out so more of the recording fits on the glass (undoes shrink + can go past full frame). */
  screenZoomOutPercent: 0,
  /**
   * When true (default), letterbox/pillarbox the video to match the **physical glass** aspect from
   * phoneBoxProportions (viewportAspect), falling back to UV island span if unset. GLB UVs are often ~square
   * while the glass is portrait; using UV-only aspect causes a tall skinny strip with huge side bars.
   * Set false to stretch the video to the UV island (may look wrong).
   */
  fitRecordingAspectToGlass: true,
  /** glTF camera object name (case-insensitive). Export from Blender with Include → Cameras enabled. */
  blenderCameraName: 'Camera',
  modelUniformScale: 1,
  cameraZoomMultiplier: 1,
  /**
   * Yaw (horizontal turn) applied while pointer is over the viewport so the screen faces the camera more.
   * Positive vs negative depends on your GLB; flip the sign if it turns the wrong way. 0 = no turn.
   */
  hoverTurnTowardUserDeg: 22,
  /** Optional pitch (degrees) from pointer vertical position at viewport edge; 0 = pitch off. */
  hoverTiltMaxDeg: 0,
  maxPixelRatio: 3,
  screenSource: 'video',
  screenImageUrl: 'laptop_Demo/phone-screen-poster.jpg',
  pageLayout: {
    width: '220px',
    nudgeX: '0rem',
    nudgeY: '0rem',
    anchorRight: '-2rem',
    rowGap: '1.25rem',
    viewportAspect: '1080 / 2340',
    viewportMaxHeight: 'min(52vh, 420px)',
    mobileMaxWidth: 'min(100%, 280px)',
    phoneZIndex: '',
    videoDecodeWidth: '1080px',
    videoDecodeHeight: '2340px',
  },
};

/** @type {typeof DEFAULT_PHONE_CONFIG} */
let phoneCfg = {
  ...DEFAULT_PHONE_CONFIG,
  screenShrinkPercent: { ...DEFAULT_PHONE_CONFIG.screenShrinkPercent },
  screenVideoMovePercent: { ...DEFAULT_PHONE_CONFIG.screenVideoMovePercent },
  pageLayout: { ...DEFAULT_PHONE_CONFIG.pageLayout },
};

/**
 * glTF screen quads often use only part of 0–1 UV space; without remapping the video is over-zoomed.
 * Set after the model loads; null means treat mesh UV as already 0–1.
 * @type {{ uMin: number; uMax: number; vMin: number; vMax: number; uSpan: number; vSpan: number } | null}
 */
let screenMeshUvRect = null;

/**
 * @param {THREE.Object3D} root
 * @param {string} materialName
 */
function updateScreenMeshUvRect(root, materialName) {
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  let found = false;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!mats.some((m) => m?.name === materialName)) return;
    const uv = obj.geometry?.attributes?.uv;
    if (!uv) return;
    found = true;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  });
  if (!found) {
    screenMeshUvRect = null;
    return;
  }
  const eps = 1e-6;
  const uSpan = Math.max(eps, uMax - uMin);
  const vSpan = Math.max(eps, vMax - vMin);
  screenMeshUvRect = { uMin, uMax, vMin, vMax, uSpan, vSpan };
}

const PAGE_LAYOUT_TO_CSS = {
  width: '--phone-showcase-width',
  nudgeX: '--phone-showcase-nudge-x',
  nudgeY: '--phone-showcase-nudge-y',
  anchorRight: '--phone-showcase-anchor-right',
  rowGap: '--phone-showcase-row-gap',
  viewportAspect: '--phone-showcase-aspect',
  viewportMaxHeight: '--phone-showcase-max-h',
  mobileMaxWidth: '--phone-showcase-mobile-max-w',
  phoneZIndex: '--phone-showcase-z-index',
  videoDecodeWidth: '--phone-video-decode-w',
  videoDecodeHeight: '--phone-video-decode-h',
};

/** @param {Record<string, unknown>} fit */
function normalizeScreenShrink(fit) {
  const clamp = (x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };
  let top = clamp(fit.shrinkFromTop ?? fit.shrinkFromTopPercent);
  let bottom = clamp(fit.shrinkFromBottom ?? fit.shrinkFromBottomPercent);
  let left = clamp(fit.shrinkFromLeft ?? fit.shrinkFromLeftPercent);
  let right = clamp(fit.shrinkFromRight ?? fit.shrinkFromRightPercent);
  if (left + right >= 100) {
    const s = 99 / (left + right);
    left *= s;
    right *= s;
  }
  if (top + bottom >= 100) {
    const s = 99 / (top + bottom);
    top *= s;
    bottom *= s;
  }
  return { fromTop: top, fromBottom: bottom, fromLeft: left, fromRight: right };
}

/** @param {Record<string, unknown>} fit */
function normalizeScreenMove(fit) {
  const clamp = (x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };
   return {
    moveVideoLeft: clamp(fit.moveVideoLeft),
    moveVideoRight: clamp(fit.moveVideoRight),
    moveVideoLower: clamp(fit.moveVideoLower),
    moveVideoHigher: clamp(fit.moveVideoHigher),
  };
}

/** @param {Record<string, unknown>} fit */
function normalizeScreenZoomOut(fit) {
  const n = Number(
    fit.showMoreOfTheRecordingPercent ??
      fit.showMoreOfVideoPercent ??
      fit.zoomOutTheVideoOnScreenPercent ??
      fit.recordingZoomOutPercent
  );
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** @param {unknown} val */
function parseCssPx(val) {
  const n = Number(String(val ?? '').replace(/px$/i, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** @param {unknown} s e.g. "177 / 374" from phoneBoxProportions */
function parseAspectRatioString(s) {
  const m = String(s ?? '')
    .trim()
    .match(/([\d.]+)\s*\/\s*([\d.]+)/);
  if (!m) return null;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w / h;
}

/** Width÷height of the phone glass for video fitting (matches CSS phone box, not necessarily UV island). */
function getGlassWidthOverHeightForVideoFit() {
  const fromCfg = parseAspectRatioString(phoneCfg.pageLayout?.viewportAspect);
  if (fromCfg != null) return fromCfg;
  const r = screenMeshUvRect;
  if (r && r.uSpan > 0 && r.vSpan > 0) return r.uSpan / r.vSpan;
  return NaN;
}

/** @param {HTMLVideoElement | null | undefined} video */
function getRecordingPixelSize(video) {
  if (video && video.videoWidth > 0 && video.videoHeight > 0) {
    return { w: video.videoWidth, h: video.videoHeight };
  }
  const vw = parseCssPx(phoneCfg.pageLayout.videoDecodeWidth);
  const vh = parseCssPx(phoneCfg.pageLayout.videoDecodeHeight);
  if (vw > 0 && vh > 0) return { w: vw, h: vh };
  return null;
}

/**
 * Widen the sampled texture window on one axis so video W:H matches the **glass** aspect (contain).
 * @param {number} sx
 * @param {number} sy
 * @param {number} tx
 * @param {number} ty
 * @param {HTMLVideoElement | null | undefined} video
 */
function applyAspectContainToTextureWindow(sx, sy, tx, ty, video) {
  if (!phoneCfg.fitRecordingAspectToGlass) return { sx, sy, tx, ty };
  const px = getRecordingPixelSize(video);
  if (!px) return { sx, sy, tx, ty };
  const aVid = px.w / px.h;
  const aGlass = getGlassWidthOverHeightForVideoFit();
  if (!Number.isFinite(aGlass) || aGlass <= 0) return { sx, sy, tx, ty };
  const eps = 1e-4;
  if (Math.abs(aGlass - aVid) < eps) return { sx, sy, tx, ty };

  if (aGlass > aVid) {
    const f = aGlass / aVid;
    const nsx = sx * f;
    return { sx: nsx, sy, tx: tx - (nsx - sx) / 2, ty };
  }
  const f = aVid / aGlass;
  const nsy = sy * f;
  return { sx, sy: nsy, tx, ty: ty - (nsy - sy) / 2 };
}

/** @param {number} sx @param {number} sy @param {number} tx @param {number} ty */
function clampTextureWindow(sx, sy, tx, ty) {
  let txClamped = tx;
  let tyClamped = ty;
  /** Only clamp axes that zoom past full texture; otherwise keep pan offsets (may be <0). */
  if (sx > 1 + 1e-6) {
    txClamped = Math.max(1 - sx, Math.min(tx, 0));
  }
  if (sy > 1 + 1e-6) {
    tyClamped = Math.max(1 - sy, Math.min(ty, 0));
  }
  return { tx: txClamped, ty: tyClamped };
}

/**
 * JSON: recordingOnScreen shrink / showMoreOfTheRecordingPercent / moves + biggerPhoneModel / biggerPhoneInPicture.
 * Older keys (pageLayout, modelUrl, …) still accepted.
 */
function mergePhoneConfig(raw) {
  const base = JSON.parse(JSON.stringify(DEFAULT_PHONE_CONFIG));
  if (!raw || typeof raw !== 'object') return base;

  const fit =
    (raw.recordingOnScreen && typeof raw.recordingOnScreen === 'object' && raw.recordingOnScreen) || {};

  const pageIn =
    (raw.whereItShowsOnThePage && typeof raw.whereItShowsOnThePage === 'object' && raw.whereItShowsOnThePage) ||
    (raw.pageLayout && typeof raw.pageLayout === 'object' && raw.pageLayout) ||
    {};

  const pickStr = (lay, old, def) => String(pageIn[lay] ?? pageIn[old] ?? def);

  const pageLayout = {
    width: pickStr('howWideThePhoneColumnIs', 'width', base.pageLayout.width),
    nudgeX: pickStr('movePhoneLeftOrRight', 'nudgeX', base.pageLayout.nudgeX),
    nudgeY: pickStr('movePhoneUpOrDown', 'nudgeY', base.pageLayout.nudgeY),
    anchorRight: pickStr(
      'howFarPhoneIsFromTheRightEdge',
      'anchorRight',
      base.pageLayout.anchorRight
    ),
    rowGap: pickStr('spaceBetweenCardsAndPhone', 'rowGap', base.pageLayout.rowGap),
    viewportAspect: pickStr('phoneBoxProportions', 'viewportAspect', base.pageLayout.viewportAspect),
    viewportMaxHeight: pickStr('maxHeightOfPhoneBox', 'viewportMaxHeight', base.pageLayout.viewportMaxHeight),
    mobileMaxWidth: pickStr('maxPhoneWidthOnSmallScreens', 'mobileMaxWidth', base.pageLayout.mobileMaxWidth),
    phoneZIndex: pickStr('putPhoneAboveCardsZIndex', 'phoneZIndex', base.pageLayout.phoneZIndex ?? ''),
    videoDecodeWidth: pickStr('matchYourVideoFileWidth', 'videoDecodeWidth', base.pageLayout.videoDecodeWidth),
    videoDecodeHeight: pickStr('matchYourVideoFileHeight', 'videoDecodeHeight', base.pageLayout.videoDecodeHeight),
  };

  const play =
    raw.playVideoOrStillImage ?? raw.screenSource ?? base.screenSource;

  const aspectRaw =
    fit.fitRecordingAspectToGlass ?? raw.fitRecordingAspectToGlass ?? base.fitRecordingAspectToGlass;
  const fitRecordingAspectToGlass = aspectRaw !== false && aspectRaw !== 'false' && aspectRaw !== 0;

  return {
    modelUrl: String(raw.phoneModelFile ?? raw.modelUrl ?? base.modelUrl),
    screenMaterialName: String(
      raw.blenderNameOfScreenMaterial ?? raw.screenMaterialName ?? base.screenMaterialName
    ),
    blenderCameraName: String(
      raw.blenderNameOfCamera ?? raw.blenderCameraName ?? base.blenderCameraName
    ),
    screenShrinkPercent: normalizeScreenShrink(fit),
    screenVideoMovePercent: normalizeScreenMove(fit),
    screenZoomOutPercent: normalizeScreenZoomOut(fit),
    fitRecordingAspectToGlass,
    modelUniformScale:
      Number(
        raw.biggerPhoneModel ??
          raw.biggerWholePhoneInThe3DScene ??
          raw.modelUniformScale ??
          base.modelUniformScale
      ) || 1,
    cameraZoomMultiplier:
      Number(
        raw.biggerPhoneInPicture ?? raw.cameraZoom ?? raw.cameraZoomMultiplier ?? base.cameraZoomMultiplier
      ) || 1,
    maxPixelRatio: Number(raw.canvasSharpnessCap ?? raw.maxPixelRatio ?? base.maxPixelRatio) || 2,
    hoverTurnTowardUserDeg: Math.max(
      -75,
      Math.min(
        75,
        Number(
          raw.howMuchThePhoneTurnsTowardYouOnHoverInDegrees ??
            raw.hoverTurnTowardUserDeg ??
            raw.hoverYawTowardUserDegrees ??
            base.hoverTurnTowardUserDeg
        ) || 0
      )
    ),
    hoverTiltMaxDeg: Math.max(
      0,
      Math.min(
        60,
        Number(
          raw.howMuchThePhoneTiltsOnHoverInDegrees ??
            raw.hoverTiltMaxDeg ??
            raw.hoverTiltDegrees ??
            base.hoverTiltMaxDeg
        ) || 0
      )
    ),
    screenSource: play === 'image' || play === 'still' ? 'image' : 'video',
    screenImageUrl: String(raw.stillImageFile ?? raw.screenImageUrl ?? base.screenImageUrl),
    pageLayout,
  };
}

async function loadPhoneShowcaseConfig() {
  const res = await fetch(CONFIG_JSON.href, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return mergePhoneConfig(await res.json());
}

/** @param {typeof DEFAULT_PHONE_CONFIG.pageLayout} pl */
function applyPageLayoutToProjects(pl) {
  const el = document.querySelector('#projects .projects-phone-row');
  if (!el) return;
  for (const [key, cssVar] of Object.entries(PAGE_LAYOUT_TO_CSS)) {
    const val = pl[key];
    if (val != null && val !== '') el.style.setProperty(cssVar, String(val));
  }
}

function screenSourceEffective() {
  if (typeof location === 'undefined') return phoneCfg.screenSource;
  const q = new URLSearchParams(location.search).get('phoneScreen');
  if (q === 'jpeg' || q === 'image') return 'image';
  if (q === 'video') return 'video';
  return phoneCfg.screenSource;
}

/**
 * @param {THREE.Texture} tex
 * @param {HTMLVideoElement | null | undefined} [video] when set, uses real pixel size as soon as metadata is available
 */
function applyScreenUv(tex, video) {
  const p = phoneCfg.screenShrinkPercent;
  const sl = (p.fromLeft ?? 0) / 100;
  const sr = (p.fromRight ?? 0) / 100;
  const st = (p.fromTop ?? 0) / 100;
  const sb = (p.fromBottom ?? 0) / 100;

  const m = phoneCfg.screenVideoMovePercent;
  const maxPan = 0.45;
  const du = (maxPan * ((m.moveVideoRight || 0) - (m.moveVideoLeft || 0))) / 100;
  const dv = (maxPan * ((m.moveVideoHigher || 0) - (m.moveVideoLower || 0))) / 100;

  const zo = phoneCfg.screenZoomOutPercent ?? 0;
  const zoF = Math.max(0, Math.min(100, zo)) / 100;

  const uSpan = Math.max(0.02, 1 - sl - sr);
  const vSpan = Math.max(0.02, 1 - st - sb);

  /** Crop window in texture space (same as original repeat.set(uSpan,vSpan) + offset). */
  let sx = uSpan;
  let sy = vSpan;
  let tx = sl + du;
  let ty = sb + dv;

  const asp = applyAspectContainToTextureWindow(sx, sy, tx, ty, video);
  sx = asp.sx;
  sy = asp.sy;
  tx = asp.tx;
  ty = asp.ty;
  const cl = clampTextureWindow(sx, sy, tx, ty);
  tx = cl.tx;
  ty = cl.ty;

  const r = screenMeshUvRect;
  let rx = sx;
  let ry = sy;
  let ox = tx;
  let oy = ty;
  if (r) {
    rx = sx / r.uSpan;
    ry = sy / r.vSpan;
    ox = tx - (sx * r.uMin) / r.uSpan;
    oy = ty - (sy * r.vMin) / r.vSpan;
  }

  /** Zoom out last, around texture 0.5 (avoids compounding broken UVs with aspect + mesh remap). */
  const z = 1 + zoF * 0.95;
  if (z > 1 + 1e-6) {
    rx *= z;
    ry *= z;
    ox = z * ox + (1 - z) / 2;
    oy = z * oy + (1 - z) / 2;
  }

  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(rx, ry);
  tex.offset.set(ox, oy);
}

/**
 * @param {THREE.Object3D} root
 * @param {THREE.Texture} tex
 * @param {{ flipY?: boolean }} [opts]
 */
function assignTextureToScreen(root, tex, opts = {}) {
  const flipY = opts.flipY ?? false;
  const name = phoneCfg.screenMaterialName;
  let applied = false;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m || m.name !== name) return;
      if (m.map) m.map.dispose();
      if (m.emissiveMap) {
        m.emissiveMap.dispose();
        m.emissiveMap = null;
      }
      m.emissive.setRGB(0, 0, 0);
      if ('emissiveIntensity' in m) m.emissiveIntensity = 0;
      const { r, g, b } = m.color;
      if (r + g + b < 0.03) m.color.setRGB(1, 1, 1);
      m.map = tex;
      tex.flipY = flipY;
      m.map.needsUpdate = true;
      m.needsUpdate = true;
      applied = true;
    });
  });
  return applied;
}

/** Same material-name match as {@link assignTextureToScreen}. */
function findMeshUsingMaterialName(root, materialName) {
  const name = String(materialName || '');
  /** @type {THREE.Mesh | null} */
  let hit = null;
  root.traverse((obj) => {
    if (hit || !obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (mats.some((m) => m && m.name === name)) hit = obj;
  });
  return hit;
}

/** @param {string} url */
function loadImageScreenTexture(url) {
  const loader = new THREE.TextureLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        applyScreenUv(tex);
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

/**
 * @param {THREE.Object3D} root
 * @param {HTMLVideoElement} video
 */
function applyVideoToScreen(root, video) {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const refreshUv = () => {
    applyScreenUv(tex, video);
    tex.needsUpdate = true;
  };
  applyScreenUv(tex, video);
  const ok = assignTextureToScreen(root, tex, { flipY: false }) ? tex : null;
  if (ok) {
    if (video.videoWidth > 0) refreshUv();
    else {
      video.addEventListener('loadedmetadata', refreshUv, { once: true });
      video.addEventListener('loadeddata', refreshUv, { once: true });
    }
  }
  return ok;
}

/**
 * glTF camera from Blender: use the loader’s camera object so parent/animation updates the view each frame.
 * @param {THREE.Object3D} sceneRoot
 * @param {string} preferredName glTF camera node name (e.g. "Camera" from Blender)
 * @returns {THREE.PerspectiveCamera | null}
 */
function pickExportedCamera(sceneRoot, preferredName) {
  /** @type {THREE.PerspectiveCamera[]} */
  const cams = [];
  sceneRoot.updateMatrixWorld(true);
  sceneRoot.traverse((o) => {
    if (o.isPerspectiveCamera) cams.push(o);
  });
  if (cams.length === 0) return null;

  const want = String(preferredName || '')
    .trim()
    .toLowerCase();
  let src = cams[0];
  if (want) {
    const hit = cams.find((c) => (c.name || '').trim().toLowerCase() === want);
    if (hit) src = hit;
  }
  return src;
}

/**
 * When the GLB has no camera, place the viewer in front of the model (along the thinnest axis).
 * @param {THREE.Object3D} model
 * @param {THREE.PerspectiveCamera} camera
 */
function applyHeadOnFallbackCamera(model, camera) {
  const box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const worldUp = new THREE.Vector3(0, 1, 0);
  /** Shortest AABB axis often = thickness; but if the phone lies flat, that axis is world Y and +Y + lookAt(center) is a top-down view. Skip Y in that case and use the next-thinnest axis. */
  const axes = [
    { axis: new THREE.Vector3(1, 0, 0), span: size.x },
    { axis: new THREE.Vector3(0, 1, 0), span: size.y },
    { axis: new THREE.Vector3(0, 0, 1), span: size.z },
  ].sort((a, b) => a.span - b.span);
  let i = 0;
  if (
    axes[i].span > 1e-6 &&
    Math.abs(axes[i].axis.dot(worldUp)) > 0.85 &&
    axes.length > 1
  ) {
    i = 1;
  }
  const axis = axes[i].axis.clone();
  const extent = Math.max(size.x, size.y, size.z);
  const dist = extent * 2.4;
  camera.position.copy(c).add(axis.multiplyScalar(dist));
  camera.up.copy(worldUp);
  camera.lookAt(c);
  camera.near = Math.max(0.001, extent * 0.002);
  camera.far = extent * 80;
  camera.fov = 38;
  camera.zoom = 1;
  camera.filmOffset = 0;
  camera.filmGauge = 35;
  camera.updateProjectionMatrix();
}

/**
 * @param {HTMLElement} container
 * @param {{ canvas: HTMLCanvasElement; video: HTMLVideoElement }} els
 */
export async function initPhoneShowcase(container, els) {
  const { canvas, video } = els;
  const cfg = phoneCfg;
  const posterImg = container.querySelector('.phone-showcase-poster');
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    if (posterImg) posterImg.hidden = false;
    canvas.hidden = true;
    return;
  }

  if (posterImg) posterImg.hidden = false;
  canvas.hidden = false;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment(renderer);
  scene.environment = pmrem.fromScene(roomEnv).texture;
  roomEnv.dispose();
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 4, 2);
  scene.add(key);

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(cfg.modelUrl);
  /** Pivot for hover tilt; camera stays on scene so the view stays put while the phone rotates. */
  const tiltPivot = new THREE.Group();
  /** Yaw first, then pitch; reads as “turn to face, then slight nod”. */
  tiltPivot.rotation.order = 'YXZ';
  scene.add(tiltPivot);
  const model = gltf.scene;
  tiltPivot.add(model);
  updateScreenMeshUvRect(model, cfg.screenMaterialName);
  if (cfg.modelUniformScale !== 1) {
    model.scale.multiplyScalar(cfg.modelUniformScale);
    model.updateMatrixWorld(true);
  }
  /** Put mesh centroid on the pivot so tilt is in place (no arc / “orbit” from an off-center origin). */
  tiltPivot.updateMatrixWorld(true);
  const tiltBbox = new THREE.Box3().setFromObject(model);
  const tiltCenterW = tiltBbox.getCenter(new THREE.Vector3());
  model.position.sub(tiltPivot.worldToLocal(tiltCenterW.clone()));
  model.updateMatrixWorld(true);

  /** Prefer Blender-exported camera; detach to scene so hover tilt does not rotate the lens with the mesh. */
  let camera = pickExportedCamera(tiltPivot, cfg.blenderCameraName);
  if (camera) {
    scene.attach(camera);
  } else {
    console.warn(
      '[phone-showcase] No camera in GLB (enable “Cameras” when exporting glTF), or name mismatch. Using head-on fallback.'
    );
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    applyHeadOnFallbackCamera(tiltPivot, camera);
  }
  if (cfg.cameraZoomMultiplier !== 1) {
    camera.zoom *= cfg.cameraZoomMultiplier;
    camera.updateProjectionMatrix();
  }

  const screenMode = screenSourceEffective();
  /** @type {THREE.Texture | null} */
  let tex = null;

  if (screenMode === 'image') {
    try {
      const imgTex = await loadImageScreenTexture(cfg.screenImageUrl);
      if (assignTextureToScreen(model, imgTex, { flipY: false })) {
        tex = imgTex;
      } else {
        console.warn('[phone-showcase] No material named "%s" for image.', cfg.screenMaterialName);
        imgTex.dispose();
      }
    } catch (e) {
      console.warn('[phone-showcase] Screen image failed, falling back to video.', e);
    }
  }

  if (!tex) {
    tex = applyVideoToScreen(model, video);
  }

  const screenTextureIsVideo = !!(tex && tex.isVideoTexture);

  if (!tex) {
    console.warn('[phone-showcase] No screen texture; check material "%s".', cfg.screenMaterialName);
  } else {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  const hasGltfAnimation = gltf.animations.length > 0;
  const animDuration = hasGltfAnimation
    ? Math.max(...gltf.animations.map((c) => c.duration || 0), 0)
    : 0;
  const mixer = hasGltfAnimation ? new THREE.AnimationMixer(model) : null;
  /** @type {{ action: THREE.AnimationAction; clip: THREE.AnimationClip }[]} */
  const animActions = [];
  if (mixer) {
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.play();
      animActions.push({ action, clip });
    }
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w < 2 || h < 2) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /** @type {(() => void) | null} */
  let tryPlay = null;
  if (screenTextureIsVideo) {
    video.loop = !hasGltfAnimation;
    tryPlay = () => {
      video.play().catch(() => {});
    };
    container.addEventListener('pointerdown', tryPlay, { passive: true });
    video.addEventListener('canplay', tryPlay, { once: true });
    tryPlay();
  }

  /** Yaw = turn toward user while hovered; pitch optional from pointer Y. */
  let tiltTargetX = 0;
  let tiltTargetY = 0;
  const onPointerLeavePhone = () => {
    tiltTargetX = 0;
    tiltTargetY = 0;
  };
  container.addEventListener('pointerleave', onPointerLeavePhone);
  container.addEventListener('pointercancel', onPointerLeavePhone);
  const removePhonePointerListeners = () => {
    container.removeEventListener('pointerleave', onPointerLeavePhone);
    container.removeEventListener('pointercancel', onPointerLeavePhone);
  };

  /** @type {(() => void) | null} */
  let removeHoverTilt = null;
  const hoverMotionEnabled =
    Math.abs(cfg.hoverTurnTowardUserDeg) > 1e-6 || cfg.hoverTiltMaxDeg > 0;
  if (hoverMotionEnabled) {
    const yawHoverRad = THREE.MathUtils.degToRad(cfg.hoverTurnTowardUserDeg);
    const pitchMaxRad = THREE.MathUtils.degToRad(cfg.hoverTiltMaxDeg);
    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      tiltTargetY = yawHoverRad;
      if (pitchMaxRad > 0) {
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        tiltTargetX = -ny * pitchMaxRad;
      } else {
        tiltTargetX = 0;
      }
    };
    container.addEventListener('pointermove', onMove, { passive: true });
    removeHoverTilt = () => {
      container.removeEventListener('pointermove', onMove);
    };
  }

  const clock = new THREE.Clock();
  let cycleT = 0;
  let inTail = false;
  let raf = 0;
  let firstFrame = true;
  const tiltSmooth = 0.14;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = clock.getDelta();
    const vDur = video.duration;

    if (hoverMotionEnabled) {
      tiltPivot.rotation.x += (tiltTargetX - tiltPivot.rotation.x) * tiltSmooth;
      tiltPivot.rotation.y += (tiltTargetY - tiltPivot.rotation.y) * tiltSmooth;
      tiltPivot.rotation.z = 0;
    }

    if (hasGltfAnimation && screenTextureIsVideo && animDuration > 0 && Number.isFinite(vDur) && vDur > 0) {
      if (!inTail) {
        cycleT = Math.min(video.currentTime, vDur);
        if (video.ended || cycleT >= vDur - 0.02) {
          inTail = true;
          video.pause();
          const hold = Math.max(0, vDur - 1 / 30);
          video.currentTime = hold;
          cycleT = Math.min(cycleT, vDur);
        }
      } else {
        cycleT += dt;
        if (cycleT >= animDuration) {
          inTail = false;
          cycleT = 0;
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      }
      for (const { action, clip } of animActions) {
        const d = clip.duration || animDuration;
        action.time = Math.min(cycleT, d);
      }
      if (mixer) mixer.update(0);
    } else if (mixer) {
      mixer.update(dt);
    }
    if (tex && screenTextureIsVideo) tex.needsUpdate = true;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      if (posterImg) posterImg.hidden = true;
    }
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    if (tryPlay) container.removeEventListener('pointerdown', tryPlay);
    removePhonePointerListeners();
    if (removeHoverTilt) removeHoverTilt();
    if (mixer) mixer.stopAllAction();
    renderer.dispose();
    if (tex) tex.dispose();
  };
}

function shouldSkipPhoneShowcase() {
  if (typeof window !== 'undefined' && window.__OM_PORTFOLIO_NOJS__) return true;
  if (document.documentElement.classList.contains('html-nojs-compat')) return true;
  try {
    if (new URLSearchParams(location.search).get('nojs') === '1') return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

async function boot() {
  if (shouldSkipPhoneShowcase()) return;
  const root = document.getElementById('phone-showcase-root');
  if (!root) return;
  const canvas = root.querySelector('#phone-showcase-canvas');
  const video = document.getElementById('phone-screen-video');
  const posterImg = root.querySelector('.phone-showcase-poster');
  if (!canvas || !video) return;

  try {
    phoneCfg = await loadPhoneShowcaseConfig();
    applyPageLayoutToProjects(phoneCfg.pageLayout);
  } catch (e) {
    console.warn('[phone-showcase] Using defaults (could not load phone-showcase-config.json)', e);
    phoneCfg = mergePhoneConfig(null);
    applyPageLayoutToProjects(phoneCfg.pageLayout);
  }

  const narrowMq = window.matchMedia(`(max-width: ${PHONE_SHOWCASE_MAX_WIDTH_PX}px)`);
  if (narrowMq.matches) {
    video.preload = 'none';
  } else {
    video.preload = 'auto';
  }

  let showcaseStarted = false;
  const tryStartShowcase = () => {
    if (narrowMq.matches) return;
    if (showcaseStarted) return;
    showcaseStarted = true;
    initPhoneShowcase(root, { canvas, video }).catch((err) => {
      console.error('[phone-showcase]', err);
      canvas.hidden = true;
      if (posterImg) posterImg.hidden = false;
    });
  };

  narrowMq.addEventListener('change', tryStartShowcase);
  tryStartShowcase();
}

if (!shouldSkipPhoneShowcase()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
