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
  // 1) Convert 2D (canvas) to 3D coords
  const wallHeight = getWallHeight();
  const midX = (wall.x1 + wall.x2) / 2;
  const midY = (wall.y1 + wall.y2) / 2;
  const posX = midX / PIXELS_PER_METER;
  const posZ = -midY / PIXELS_PER_METER;

  // The wall angle
  const angle = -Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));

  // The 2D length in meters, thickness, baseDepth, baseThickness
  const wallLength = wall.lengthMeter;
  const wallThickness = wall.thickness;
  const baseDepth = wall.baseDepth;        // vertical dimension in 3D
  const baseThickness = wall.baseThickness; // dimension in Z direction for the base

  // 2) Create the base (if baseDepth > 0 and baseThickness > 0)
  if (baseDepth > 0 && baseThickness > 0) {
    // Use a generic base texture
    const baseTexture = new THREE.TextureLoader().load('./imgs/WallBaseTexture.png');
    const baseMaterial = new THREE.MeshStandardMaterial({ map: baseTexture });

    // BoxGeometry(width, height, depth)
    const baseGeometry = new THREE.BoxGeometry(
      wallLength,
      baseDepth,
      baseThickness
    );
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);

    // The base extends downward from y=0 => center is at y = -baseDepth/2
    baseMesh.position.set(posX, -baseDepth / 2, posZ);
    baseMesh.rotation.y = angle;
    scene.add(baseMesh);
    allMeshes.push(baseMesh);
  }

  // 3) Create the wall above the base
  let wallTexture;
  if (wall.wallType === 'brick') {
    wallTexture = new THREE.TextureLoader().load('./imgs/brick_texture.jpg');
  } else if (wall.wallType === 'block') {
    wallTexture = new THREE.TextureLoader().load('./imgs/block_texture.jpg');
  }

  const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
  const wallMaterial = wallTexture
    ? new THREE.MeshStandardMaterial({ map: wallTexture })
    : new THREE.MeshStandardMaterial({ color: 0xffffff });

  const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
  wallMesh.position.set(posX, wallHeight / 2, posZ);
  wallMesh.rotation.y = angle;
  scene.add(wallMesh);
  allMeshes.push(wallMesh);
}

/**
 * When a single new wall is added from 2D:
 */
window.addEventListener('add-wall', (evt) => {
  createWall3D(evt.detail);
  adjustCameraToFitScene();
});

/**
 * When we update/rebuild all walls from 2D:
 */
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

/**
 * Roof creation placeholder
 */
function createRoof() {
  console.warn('Add your roof logic here if needed.');
}
document.getElementById('addRoof').addEventListener('click', () => {
  createRoof();
});

/**
 * Render loop
 */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
