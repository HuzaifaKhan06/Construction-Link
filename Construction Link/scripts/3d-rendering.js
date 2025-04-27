import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { Shape, ShapeGeometry, Vector2 } from 'https://unpkg.com/three@0.126.1/build/three.module.js';

const PIXELS_PER_METER = 20;
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / (window.innerHeight / 2),
  0.1,
  2000
);
camera.position.set(0, 15, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight / 2);
document.getElementById('threejs-canvas').appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Keep track of all wall/base/roof/door/window/floor meshes
const allMeshes = [];

/**
 * Auto-adjust the camera so we can see everything.
 */
function adjustCameraToFitScene() {
  const box = new THREE.Box3().setFromObject(scene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.4;
    camera.position.set(center.x + cameraZ / 3, center.y + cameraZ / 3, cameraZ);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }
}

/**
 * Read the user-chosen wall height.
 */
function getWallHeight() {
  const val = parseFloat(document.getElementById('wallHeight').value) || 10;
  const unit = document.getElementById('heightUnit').value;
  return (unit === 'ft') ? (val * 0.3048) : val;
}

// Constant gap to ensure roof is above beams/columns
const BEAM_COLUMN_ROOF_GAP = 0.3; // in meters

/**
 * Helper: compute polygon area via shoelace formula
 */
function computePolygonArea(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Create a 3D wall + base as specified.
 */
function createWall3D(wall) {
  const wallHeight = getWallHeight();
  const midX = (wall.x1 + wall.x2) / 2;
  const midY = (wall.y1 + wall.y2) / 2;
  const posX = midX / PIXELS_PER_METER;
  const posZ = -midY / PIXELS_PER_METER;
  const angle = Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));
  const wallLength = wall.lengthMeter;
  const wallThickness = wall.thickness;
  const baseDepth = wall.baseDepth;
  const baseThickness = wall.baseThickness;

  // Base Mesh
  if (baseDepth > 0 && baseThickness > 0) {
    const baseTexture = new THREE.TextureLoader().load('./imgs/WallBaseTexture.png');
    const baseMaterial = new THREE.MeshStandardMaterial({ map: baseTexture });
    const baseGeometry = new THREE.BoxGeometry(wallLength, baseDepth, baseThickness);
    baseGeometry.translate(0, -baseDepth / 2, 0);
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(posX, 0, posZ);
    baseMesh.rotation.y = angle;
    scene.add(baseMesh);
    allMeshes.push(baseMesh);
  }

  // Wall Mesh
  let wallTexture;
  if (wall.wallType === 'brick') {
    wallTexture = new THREE.TextureLoader().load('./imgs/brick_texture.jpg');
  } else if (wall.wallType === 'block') {
    wallTexture = new THREE.TextureLoader().load('./imgs/block_texture.jpg');
  }
  const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
  wallGeometry.translate(0, wallHeight / 2, 0);
  const wallMaterial = wallTexture
    ? new THREE.MeshStandardMaterial({ map: wallTexture })
    : new THREE.MeshStandardMaterial({ color: 0xffffff });
  const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
  wallMesh.position.set(posX, 0, posZ);
  wallMesh.rotation.y = angle;
  scene.add(wallMesh);
  allMeshes.push(wallMesh);

  // Door (both sides)
  if (wall.door) {
    let fraction;
    switch (wall.door.side) {
      case 'left': fraction = 0.25; break;
      case 'center': fraction = 0.5; break;
      case 'right': fraction = 0.75; break;
      default: fraction = 0.5;
    }
    const doorCenterLocalX = -wallLength/2 + fraction * wallLength;
    const doorCenterLocalY = wall.door.height / 2;
    const doorCenterLocalZ = (wallThickness / 2 + 0.01);
    const doorGeometry = new THREE.PlaneGeometry(wall.door.width, wall.door.height);
    const doorTexture = new THREE.TextureLoader().load('./imgs/door_texture.jpg');
    const doorMaterial = doorTexture 
      ? new THREE.MeshStandardMaterial({ map: doorTexture, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: 0x654321, side: THREE.DoubleSide });
    const doorMesh1 = new THREE.Mesh(doorGeometry, doorMaterial);
    const doorLocalPos1 = new THREE.Vector3(doorCenterLocalX, doorCenterLocalY, doorCenterLocalZ);
    const doorWorldPos1 = doorLocalPos1.clone();
    doorWorldPos1.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
    doorWorldPos1.add(new THREE.Vector3(posX, 0, posZ));
    doorMesh1.position.copy(doorWorldPos1);
    doorMesh1.rotation.y = angle;
    scene.add(doorMesh1);
    allMeshes.push(doorMesh1);

    const doorCenterLocalZ2 = -(wallThickness / 2 + 0.01);
    const doorMesh2 = new THREE.Mesh(doorGeometry.clone(), doorMaterial.clone());
    const doorLocalPos2 = new THREE.Vector3(doorCenterLocalX, doorCenterLocalY, doorCenterLocalZ2);
    const doorWorldPos2 = doorLocalPos2.clone();
    doorWorldPos2.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
    doorWorldPos2.add(new THREE.Vector3(posX, 0, posZ));
    doorMesh2.position.copy(doorWorldPos2);
    doorMesh2.rotation.y = angle;
    scene.add(doorMesh2);
    allMeshes.push(doorMesh2);
  }

  // Windows (both sides)
  if (wall.windows && wall.windows.length > 0) {
    wall.windows.forEach(win => {
      let fraction;
      switch (win.position) {
        case 'left': fraction = 0.25; break;
        case 'center': fraction = 0.5; break;
        case 'right': fraction = 0.75; break;
        default: fraction = 0.5;
      }
      const windowCenterLocalX = -wallLength/2 + fraction * wallLength;
      const windowCenterLocalY = wallHeight * 0.7;
      const windowCenterLocalZ = (wallThickness / 2 + 0.01);
      const windowGeometry = new THREE.PlaneGeometry(win.width, win.height);
      const windowTexture = new THREE.TextureLoader().load('./imgs/window_texture.jpg');
      const windowMaterial = windowTexture
        ? new THREE.MeshStandardMaterial({ map: windowTexture, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
      const windowMesh1 = new THREE.Mesh(windowGeometry, windowMaterial);
      const windowLocalPos1 = new THREE.Vector3(windowCenterLocalX, windowCenterLocalY, windowCenterLocalZ);
      const windowWorldPos1 = windowLocalPos1.clone();
      windowWorldPos1.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      windowWorldPos1.add(new THREE.Vector3(posX, 0, posZ));
      windowMesh1.position.copy(windowWorldPos1);
      windowMesh1.rotation.y = angle;
      scene.add(windowMesh1);
      allMeshes.push(windowMesh1);

      const windowCenterLocalZ2 = -(wallThickness / 2 + 0.01);
      const windowMesh2 = new THREE.Mesh(windowGeometry.clone(), windowMaterial.clone());
      const windowLocalPos2 = new THREE.Vector3(windowCenterLocalX, windowCenterLocalY, windowCenterLocalZ2);
      const windowWorldPos2 = windowLocalPos2.clone();
      windowWorldPos2.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      windowWorldPos2.add(new THREE.Vector3(posX, 0, posZ));
      windowMesh2.position.copy(windowWorldPos2);
      windowMesh2.rotation.y = angle;
      scene.add(windowMesh2);
      allMeshes.push(windowMesh2);
    });
  }
}

// When a new wall is added
window.addEventListener('add-wall', (evt) => {
  createWall3D(evt.detail);
  adjustCameraToFitScene();
});

// When all walls are updated
window.addEventListener('update-all-walls', (evt) => {
  const { walls } = evt.detail;
  allMeshes.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.dispose();
  });
  allMeshes.length = 0;
  walls.forEach(w => createWall3D(w));
  adjustCameraToFitScene();
});

// --- Roof Modal and Creation Logic ---
const roofModal = document.getElementById('roofModal');
const closeRoofModal = document.getElementById('closeRoofModal');
const roofWidthInput = document.getElementById('roofWidthInput');
const steelRodSelect = document.getElementById('steelRodSelect');
const roofMarginInput = document.getElementById('roofMarginInput');
const submitRoofBtn = document.getElementById('submitRoofBtn');

document.getElementById('addRoof').addEventListener('click', () => {
  // Do not open roof modal if beams have not been applied.
  if (!window.beamColumnActive) {
    alert("Please add beams and columns first.");
    return;
  }
  if (!window.walls || window.walls.length < 2) {
    alert("Please make at least 2 walls.");
    return;
  }
  roofModal.style.display = 'block';
});
closeRoofModal.addEventListener('click', () => {
  roofModal.style.display = 'none';
});
submitRoofBtn.addEventListener('click', () => {
  if (!window.beamColumnActive) {
    alert("Please add beams and columns first.");
    return;
  }
  const roofThicknessInches = parseFloat(roofWidthInput.value);
  if (isNaN(roofThicknessInches) || roofThicknessInches <= 0) {
    alert("Please enter a valid roof thickness in inches.");
    return;
  }
  const steelRodDiameter = parseFloat(steelRodSelect.value);
  if (isNaN(steelRodDiameter) || steelRodDiameter <= 0) {
    alert("Please select a valid steel rod diameter.");
    return;
  }
  const marginFeet = parseFloat(roofMarginInput.value) || 0;
  createRoof3D(roofThicknessInches, steelRodDiameter, marginFeet);
  roofModal.style.display = 'none';
});

/**
 * Creates a roof based on wall endpoints. The roof is placed above the beams
 * by adding a vertical gap (BEAM_COLUMN_ROOF_GAP).
 */
function createRoof3D(roofThicknessInches, steelRodDiameter, marginFeet) {
  const uniquePoints = [];
  window.walls.forEach(w => {
    const p1 = { x: w.x1, y: w.y1 };
    const p2 = { x: w.x2, y: w.y2 };
    addUniquePoint(uniquePoints, p1);
    addUniquePoint(uniquePoints, p2);
  });
  const center = computeCenter(uniquePoints);
  uniquePoints.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
  const marginMeters = marginFeet * 0.3048;
  let shapePoints = [];
  uniquePoints.forEach(pt => {
    const dx = pt.x - center.x;
    const dy = pt.y - center.y;
    const r = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const newR = (r / PIXELS_PER_METER) + marginMeters;
    const outX = newR * Math.cos(angle);
    const outY = newR * Math.sin(angle);
    shapePoints.push(new Vector2(outX, outY));
  });
  const thicknessMeters = roofThicknessInches * 0.0254;
  const roofShape = new THREE.Shape(shapePoints);
  const extrudeSettings = {
    depth: thicknessMeters,
    bevelEnabled: false
  };
  const shapeGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
  const roofTexture = new THREE.TextureLoader().load('./imgs/RoofTexture.jpeg');
  const roofMaterial = new THREE.MeshStandardMaterial({ map: roofTexture });
  const roofMesh = new THREE.Mesh(shapeGeometry, roofMaterial);
  roofMesh.rotation.x = -Math.PI / 2;
  const wallHeight = getWallHeight();
  // Place roof above beams using additional gap
  roofMesh.position.set(
    center.x / PIXELS_PER_METER,
    wallHeight + thicknessMeters + BEAM_COLUMN_ROOF_GAP,
    -center.y / PIXELS_PER_METER
  );
  scene.add(roofMesh);
  allMeshes.push(roofMesh);

  // Calculate the roof polygon area so we can store it for accurate volume calc
  const roofArea = computePolygonArea(shapePoints);

  // Add steel rods at each vertex of the roof polygon
  const rodRadius = (steelRodDiameter / 1000) / 2;
  const rodHeight = thicknessMeters + 0.1;
  const rodGeometry = new THREE.CylinderGeometry(rodRadius, rodRadius, rodHeight, 16);
  const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  shapePoints.forEach(vec => {
    const finalX = center.x / PIXELS_PER_METER + vec.x;
    const finalY = wallHeight + thicknessMeters + BEAM_COLUMN_ROOF_GAP + rodHeight / 2;
    const finalZ = -(center.y / PIXELS_PER_METER) + vec.y;
    const rodMesh = new THREE.Mesh(rodGeometry, rodMaterial);
    rodMesh.position.set(finalX, finalY, finalZ);
    scene.add(rodMesh);
    allMeshes.push(rodMesh);
  });
  adjustCameraToFitScene();

  // Store roof data globally for estimation
  window.roofData = {
    thicknessInches: roofThicknessInches,
    steelRodDiameter: steelRodDiameter,
    marginFeet: marginFeet,
    rodHeight: rodHeight,
    rodsCount: shapePoints.length,
    roofArea: roofArea // newly stored area in m²
  };
}

// --- Floor Modal and Creation Logic ---
const floorModal = document.getElementById('floorModal');
const closeFloorModal = document.getElementById('closeFloorModal');
const floorThicknessInput = document.getElementById('floorThicknessInput');
const submitFloorBtn = document.getElementById('submitFloorBtn');

document.getElementById('addFloor').addEventListener('click', () => {
  if (!window.walls || window.walls.length === 0) {
    alert("Please create walls first.");
    return;
  }
  floorModal.style.display = 'block';
});
closeFloorModal.addEventListener('click', () => {
  floorModal.style.display = 'none';
});
submitFloorBtn.addEventListener('click', () => {
  const floorThicknessInches = parseFloat(floorThicknessInput.value);
  if (isNaN(floorThicknessInches) || floorThicknessInches <= 0) {
    alert("Please enter a valid floor thickness in inches.");
    return;
  }
  createFloor3D(floorThicknessInches);
  floorModal.style.display = 'none';
});

/**
 * Creates the floor exactly within the polygon from the walls (no extra margin).
 */
function createFloor3D(floorThicknessInches) {
  const uniquePoints = [];
  window.walls.forEach(w => {
    const p1 = { x: w.x1, y: w.y1 };
    const p2 = { x: w.x2, y: w.y2 };
    addUniquePoint(uniquePoints, p1);
    addUniquePoint(uniquePoints, p2);
  });
  const center = computeCenter(uniquePoints);
  uniquePoints.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
  let shapePoints = [];
  uniquePoints.forEach(pt => {
    const dx = pt.x - center.x;
    const dy = pt.y - center.y;
    const r = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const outX = (r / PIXELS_PER_METER) * Math.cos(angle);
    const outY = (r / PIXELS_PER_METER) * Math.sin(angle);
    shapePoints.push(new Vector2(outX, outY));
  });
  const floorShape = new THREE.Shape(shapePoints);
  const thicknessMeters = floorThicknessInches * 0.0254;
  const extrudeSettings = {
    depth: thicknessMeters,
    bevelEnabled: false
  };
  const floorGeometry = new THREE.ExtrudeGeometry(floorShape, extrudeSettings);
  floorGeometry.rotateX(-Math.PI / 2);
  floorGeometry.translate(center.x / PIXELS_PER_METER, 0, -center.y / PIXELS_PER_METER);
  const floorTexture = new THREE.TextureLoader().load('./imgs/floorTexture.png');
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 4);
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floorMesh);
  allMeshes.push(floorMesh);
  adjustCameraToFitScene();

  // Compute floor area from shapePoints (in m²)
  const floorArea = computePolygonArea(shapePoints);

  // Store floor data globally for estimation
  window.floorData = {
    area: floorArea,
    thicknessInches: floorThicknessInches
  };
}

// Helper functions
function addUniquePoint(arr, p) {
  if (!arr.some(q => Math.abs(q.x - p.x) < 0.001 && Math.abs(q.y - p.y) < 0.001)) {
    arr.push(p);
  }
}
function computeCenter(pts) {
  let sx = 0, sy = 0;
  pts.forEach(p => {
    sx += p.x;
    sy += p.y;
  });
  return {
    x: sx / pts.length,
    y: sy / pts.length
  };
}

// --- Beam & Column ---
let beamColumnGroup = new THREE.Group();
const columnBeamTexture = new THREE.TextureLoader().load('./imgs/ColumnBeemTexture.jpeg');

window.addEventListener('add-beam-column', (evt) => {
  if (beamColumnGroup.parent) {
    scene.remove(beamColumnGroup);
    beamColumnGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
  beamColumnGroup = new THREE.Group();
  const walls = evt.detail.walls;
  const wallHeight = getWallHeight();
  const uniqueEndpoints = [];
  function roundVec(v, decimals=3) {
    const f = Math.pow(10, decimals);
    v.x = Math.round(v.x * f) / f;
    v.y = Math.round(v.y * f) / f;
    v.z = Math.round(v.z * f) / f;
  }
  function addUniqueEndpoint(v) {
    roundVec(v, 3);
    for (let ep of uniqueEndpoints) {
      if (ep.distanceTo(v) < 0.01) return;
    }
    uniqueEndpoints.push(v);
  }
  walls.forEach(wall => {
    if (!wall.hasBeamColumn) return;
    const pos1 = new THREE.Vector3(wall.x1 / PIXELS_PER_METER, 0, -wall.y1 / PIXELS_PER_METER);
    const pos2 = new THREE.Vector3(wall.x2 / PIXELS_PER_METER, 0, -wall.y2 / PIXELS_PER_METER);
    addUniqueEndpoint(pos1);
    addUniqueEndpoint(pos2);
    const midX = (wall.x1 + wall.x2) / 2 / PIXELS_PER_METER;
    const midZ = -(wall.y1 + wall.y2) / 2 / PIXELS_PER_METER;
    const angle = Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));
    const beamThickness = 0.3;
    const beamDepth = 0.3;
    const beamGeometry = new THREE.BoxGeometry(wall.lengthMeter, beamThickness, beamDepth);
    beamGeometry.translate(0, beamThickness / 2, 0);
    const beamMaterial = new THREE.MeshStandardMaterial({ map: columnBeamTexture });
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    beamMesh.position.set(midX, wallHeight, midZ);
    beamMesh.rotation.y = angle;
    beamColumnGroup.add(beamMesh);
  });
  const columnSize = 0.4;
  uniqueEndpoints.forEach(ep => {
    const columnGeometry = new THREE.BoxGeometry(columnSize, wallHeight, columnSize);
    columnGeometry.translate(0, wallHeight / 2, 0);
    const columnMaterial = new THREE.MeshStandardMaterial({ map: columnBeamTexture });
    const columnMesh = new THREE.Mesh(columnGeometry, columnMaterial);
    columnMesh.position.set(ep.x, 0, ep.z);
    beamColumnGroup.add(columnMesh);
  });
  scene.add(beamColumnGroup);
  adjustCameraToFitScene();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
window.createRoof3D   = createRoof3D;
window.createFloor3D  = createFloor3D;