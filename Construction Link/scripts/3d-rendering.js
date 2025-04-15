// 3d-rendering.js

import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'https://unpkg.com/three-csgmesh@1.0.2/build/three-csgmesh.module.js';

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

// Keep track of all meshes
const allMeshes = [];

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

function getWallHeight() {
  const val = parseFloat(document.getElementById('wallHeight').value) || 10;
  const unit = document.getElementById('heightUnit').value;
  return (unit === 'ft') ? (val * 0.3048) : val;
}

function createWall3D(wall) {
  const wallHeight = getWallHeight();

  // Convert 2D canvas coordinates to 3D
  const midX = (wall.x1 + wall.x2) / 2;
  const midY = (wall.y1 + wall.y2) / 2;
  const posX = midX / PIXELS_PER_METER;
  const posZ = -midY / PIXELS_PER_METER;

  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  const wallLength = wall.lengthMeter;
  const wallThickness = wall.thickness;
  const baseDepth = wall.baseDepth;
  const baseThickness = wall.baseThickness;

  // Create the base: position it exactly under the wall.
  if (baseDepth > 0 && baseThickness > 0) {
    const baseTexture = new THREE.TextureLoader().load('./imgs/WallBaseTexture.png');
    const baseMaterial = new THREE.MeshStandardMaterial({ map: baseTexture });
    const baseGeometry = new THREE.BoxGeometry(wallLength, baseDepth, baseThickness);
    baseGeometry.translate(0, -baseDepth / 2, 0);
    // Shift base so its center in Z is aligned with the wall (subtract half wallThickness)
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(posX, 0, posZ - wallThickness/2);
    baseMesh.rotation.y = angle;
    scene.add(baseMesh);
    allMeshes.push(baseMesh);
  }

  // Prepare wall material and texture.
  let wallTexture;
  if (wall.wallType === 'brick') {
    wallTexture = new THREE.TextureLoader().load('./imgs/brick_texture.jpg');
  } else if (wall.wallType === 'block') {
    wallTexture = new THREE.TextureLoader().load('./imgs/block_texture.jpg');
  }
  const wallMaterial = wallTexture
    ? new THREE.MeshStandardMaterial({ map: wallTexture })
    : new THREE.MeshStandardMaterial({ color: 0xffffff });

  let wallMesh;

  if (!wall.door && (!wall.windows || wall.windows.length === 0)) {
    // No cutouts: use simple box.
    const geometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    geometry.translate(0, wallHeight / 2, 0);
    wallMesh = new THREE.Mesh(geometry, wallMaterial);
  } else {
    // Use CSG subtraction for real cutouts.
    // Create the base wall as a box.
    const wallBoxGeom = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    // Translate so that the lower-left-front corner is at (0,0,0)
    wallBoxGeom.translate(wallLength/2, wallHeight/2, wallThickness/2);
    const wallBox = new THREE.Mesh(wallBoxGeom, wallMaterial);
    let csgWall = CSG.fromMesh(wallBox);

    if (wall.door) {
      const doorWidth = wall.door.width;
      const doorHeight = wall.door.height;
      let doorX;
      switch (wall.door.side) {
        case 'left': doorX = doorWidth/2; break;
        case 'center': doorX = wallLength/2; break;
        case 'right': doorX = wallLength - doorWidth/2; break;
        default: doorX = wallLength/2;
      }
      const doorY = 0; // door bottom on ground
      // Create door geometry slightly thicker than wall to ensure a full subtraction.
      const doorGeom = new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness + 0.02);
      doorGeom.translate(doorX, doorHeight/2, wallThickness/2);
      const doorMesh = new THREE.Mesh(doorGeom, wallMaterial);
      const csgDoor = CSG.fromMesh(doorMesh);
      csgWall = csgWall.subtract(csgDoor);
    }

    if (wall.windows && wall.windows.length > 0) {
      wall.windows.forEach(win => {
        const winWidth = win.width;
        const winHeight = win.height;
        let winX;
        switch (win.position) {
          case 'left': winX = winWidth/2; break;
          case 'center': winX = wallLength/2; break;
          case 'right': winX = wallLength - winWidth/2; break;
          default: winX = wallLength/2;
        }
        // Position window so that its bottom is at about 50% of wall height.
        const winY = wallHeight * 0.5;
        const winGeom = new THREE.BoxGeometry(winWidth, winHeight, wallThickness + 0.02);
        winGeom.translate(winX, winY + winHeight/2, wallThickness/2);
        const winMesh = new THREE.Mesh(winGeom, wallMaterial);
        const csgWin = CSG.fromMesh(winMesh);
        csgWall = csgWall.subtract(csgWin);
      });
    }
    // Convert back to mesh.
    wallMesh = CSG.toMesh(csgWall, wallBox.matrix, wallMaterial);
    // The CSG operation may lose UV data; for production you might want to regenerate UVs here.
  }

  // Position and rotate the wall.
  wallMesh.position.x += posX - wallLength/2;
  wallMesh.position.z += posZ;
  wallMesh.rotation.y = angle;
  scene.add(wallMesh);
  allMeshes.push(wallMesh);
}

window.addEventListener('add-wall', (evt) => {
  createWall3D(evt.detail);
  adjustCameraToFitScene();
});

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
    shapePoints.push(new THREE.Vector2(outX, outY));
  });
  const roofShape = new THREE.Shape(shapePoints);
  const thicknessMeters = roofThicknessInches * 0.0254;
  const extrudeSettings = { depth: thicknessMeters, bevelEnabled: false };
  const shapeGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
  const roofTexture = new THREE.TextureLoader().load('./imgs/RoofTexture.jpeg');
  const roofMaterial = new THREE.MeshStandardMaterial({ map: roofTexture });
  const roofMesh = new THREE.Mesh(shapeGeometry, roofMaterial);
  roofMesh.rotation.x = -Math.PI / 2;
  const wallHeight = getWallHeight();
  roofMesh.position.set(center.x / PIXELS_PER_METER, wallHeight + thicknessMeters, -center.y / PIXELS_PER_METER);
  scene.add(roofMesh);
  allMeshes.push(roofMesh);
  const rodRadius = (steelRodDiameter / 1000) / 2;
  const rodHeight = thicknessMeters + 0.1;
  const rodGeometry = new THREE.CylinderGeometry(rodRadius, rodRadius, rodHeight, 16);
  const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  shapePoints.forEach(vec => {
    const finalX = center.x / PIXELS_PER_METER + vec.x;
    const finalY = wallHeight + thicknessMeters + rodHeight / 2;
    const finalZ = -(center.y / PIXELS_PER_METER) + vec.y;
    const rodMesh = new THREE.Mesh(rodGeometry, rodMaterial);
    rodMesh.position.set(finalX, finalY, finalZ);
    scene.add(rodMesh);
    allMeshes.push(rodMesh);
  });
  adjustCameraToFitScene();
}

function addUniquePoint(arr, p) {
  if (!arr.some(q => Math.abs(q.x - p.x) < 0.001 && Math.abs(q.y - p.y) < 0.001)) {
    arr.push(p);
  }
}

function computeCenter(pts) {
  let sx = 0, sy = 0;
  pts.forEach(p => { sx += p.x; sy += p.y; });
  return { x: sx / pts.length, y: sy / pts.length };
}

//////////////////////
// Beam & Column
//////////////////////

let beamColumnGroup = new THREE.Group();
const columnBeamTexture = new THREE.TextureLoader().load('./imgs/ColumnBeemTexture.jpeg');

window.addEventListener('add-beam-column', (evt) => {
  if (beamColumnGroup.parent) {
    scene.remove(beamColumnGroup);
    beamColumnGroup.traverse(child => {
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
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
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
