// 3d-rendering.js

import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

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

// Keep track of all wall/base meshes
const allMeshes = [];

/**
 * Auto-adjust the camera so we can see everything (walls + base).
 */
function adjustCameraToFitScene() {
  const box = new THREE.Box3().setFromObject(scene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.4; // a bit further out

    camera.position.set(center.x + cameraZ / 3, center.y + cameraZ / 3, cameraZ);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }
}

/**
 * Read the user-chosen wall height from the sidebar.
 */
function getWallHeight() {
  const val = parseFloat(document.getElementById('wallHeight').value) || 10;
  const unit = document.getElementById('heightUnit').value;
  return (unit === 'ft') ? (val * 0.3048) : val;
}

/**
 * Create a 3D wall + base exactly as requested:
 */
function createWall3D(wall) {
  const wallHeight = getWallHeight();

  // Convert from 2D canvas coords to 3D
  const midX = (wall.x1 + wall.x2) / 2;
  const midY = (wall.y1 + wall.y2) / 2;
  const posX = midX / PIXELS_PER_METER;
  const posZ = -midY / PIXELS_PER_METER;

  // Angle of the wall
  const angle = -Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));

  // The 2D length in meters
  const wallLength = wall.lengthMeter;
  const wallThickness = wall.thickness;
  const baseDepth = wall.baseDepth;         // vertical dimension
  const baseThickness = wall.baseThickness; // thickness in Z direction

  // 1) Create the base if needed
  if (baseDepth > 0 && baseThickness > 0) {
    const baseTexture = new THREE.TextureLoader().load('./imgs/WallBaseTexture.png');
    const baseMaterial = new THREE.MeshStandardMaterial({ map: baseTexture });
    // box geometry: (width, height, depth)
    const baseGeometry = new THREE.BoxGeometry(wallLength, baseDepth, baseThickness);

    // Center the geometry so bottom is at y=0
    baseGeometry.translate(0, -baseDepth / 2, 0);

    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    // Place so top of base is at y=0
    baseMesh.position.set(posX, 0, posZ);
    baseMesh.rotation.y = angle;
    scene.add(baseMesh);
    allMeshes.push(baseMesh);
  }

  // 2) Create the wall
  let wallTexture;
  if (wall.wallType === 'brick') {
    wallTexture = new THREE.TextureLoader().load('./imgs/brick_texture.jpg');
  } else if (wall.wallType === 'block') {
    wallTexture = new THREE.TextureLoader().load('./imgs/block_texture.jpg');
  }

  const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
  // Shift so bottom is at y=0
  wallGeometry.translate(0, wallHeight / 2, 0);

  const wallMaterial = wallTexture
    ? new THREE.MeshStandardMaterial({ map: wallTexture })
    : new THREE.MeshStandardMaterial({ color: 0xffffff });

  const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
  wallMesh.position.set(posX, 0, posZ);
  wallMesh.rotation.y = angle;
  scene.add(wallMesh);
  allMeshes.push(wallMesh);
}

// When a new wall is added
window.addEventListener('add-wall', (evt) => {
  createWall3D(evt.detail);
  adjustCameraToFitScene();
});

// When we rebuild all walls
window.addEventListener('update-all-walls', (evt) => {
  const { walls } = evt.detail;

  // Remove old
  allMeshes.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  allMeshes.length = 0;

  // Create new
  walls.forEach(w => createWall3D(w));
  adjustCameraToFitScene();
});

// Roof placeholder
function createRoof() {
  console.warn('Add your roof logic here if needed.');
}
document.getElementById('addRoof').addEventListener('click', () => {
  createRoof();
});

/**
 * Beam & Column
 */
let beamColumnGroup = new THREE.Group();
const columnBeamTexture = new THREE.TextureLoader().load('./imgs/ColumnBeemTexture.jpeg');

window.addEventListener('add-beam-column', (evt) => {
  // Remove old beam/column group
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

  // Collect unique endpoints
  const uniqueEndpoints = [];

  function roundVec(v, decimals=3) {
    const f = Math.pow(10, decimals);
    v.x = Math.round(v.x * f) / f;
    v.y = Math.round(v.y * f) / f;
    v.z = Math.round(v.z * f) / f;
  }

  function addUniqueEndpoint(v) {
    // Round to reduce floating errors
    roundVec(v, 3);
    for (let ep of uniqueEndpoints) {
      if (ep.distanceTo(v) < 0.01) return;
    }
    uniqueEndpoints.push(v);
  }

  // For each wall, add a beam
  walls.forEach(wall => {
    if (!wall.hasBeamColumn) return; // skip if not marked

    const pos1 = new THREE.Vector3(wall.x1 / PIXELS_PER_METER, 0, -wall.y1 / PIXELS_PER_METER);
    const pos2 = new THREE.Vector3(wall.x2 / PIXELS_PER_METER, 0, -wall.y2 / PIXELS_PER_METER);

    addUniqueEndpoint(pos1);
    addUniqueEndpoint(pos2);

    // Midpoint for the beam
    const midX = (wall.x1 + wall.x2) / 2 / PIXELS_PER_METER;
    const midZ = -(wall.y1 + wall.y2) / 2 / PIXELS_PER_METER;
    const angle = -Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));

    const beamThickness = 0.3; // vertical thickness
    const beamDepth = 0.3;     // depth in z
    const beamGeometry = new THREE.BoxGeometry(wall.lengthMeter, beamThickness, beamDepth);
    // Shift so bottom is at y=0
    beamGeometry.translate(0, beamThickness/2, 0);

    const beamMaterial = new THREE.MeshStandardMaterial({ map: columnBeamTexture });
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    beamMesh.position.set(midX, wallHeight, midZ); // beam on top of wall
    beamMesh.rotation.y = angle;
    beamColumnGroup.add(beamMesh);
  });

  // For each unique endpoint, add a column
  const columnSize = 0.4; // total side
  walls.forEach(wall => {
    if (!wall.hasBeamColumn) return;
    // We'll rely on uniqueEndpoints already set
  });

  uniqueEndpoints.forEach(ep => {
    // A column from y=0 to y=wallHeight
    const columnGeometry = new THREE.BoxGeometry(columnSize, wallHeight, columnSize);
    // Shift so bottom is at y=0
    columnGeometry.translate(0, wallHeight/2, 0);

    const columnMaterial = new THREE.MeshStandardMaterial({ map: columnBeamTexture });
    const columnMesh = new THREE.Mesh(columnGeometry, columnMaterial);
    columnMesh.position.set(ep.x, 0, ep.z);
    // Usually columns are vertical; we won't rotate them
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
