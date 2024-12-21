import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

// Same scale as 2D: 20 px = 1 meter
const PIXELS_PER_METER = 20;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / (window.innerHeight / 2),
  0.1,
  2000
);
camera.position.set(0, 15, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight / 2);
document.getElementById('threejs-canvas').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

const walls = [];
const wallMeshes = [];

// Auto-adjust camera to fit scene
function adjustCameraToFitObject(object) {
  const boundingBox = new THREE.Box3().setFromObject(object);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180); 
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

  cameraZ *= 1.5;
  camera.position.set(center.x, center.y + cameraZ / 3, cameraZ);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

function createWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture) {
  // Pixel distance
  const lengthPx = Math.hypot(x2 - x1, y2 - y1);
  // Convert px to meters
  const lengthM = lengthPx / PIXELS_PER_METER;

  // Read user input for wall height/width
  const height = parseFloat(document.getElementById('wallHeight').value) || 10;
  const thickness = parseFloat(document.getElementById('wallWidth').value) || 1;

  // Load texture
  const textureLoader = new THREE.TextureLoader();
  const wallTexture = textureLoader.load(texture);

  // Create geometry in meters
  const wallGeometry = new THREE.BoxGeometry(lengthM, height, thickness);
  const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);

  // Position in 3D
  // (x - canvasWidth/4) to shift center, then convert px->m
  wall.position.set(
    ((x1 + x2) / 2 - canvasWidth / 4) / PIXELS_PER_METER,
    height / 2,
    -((y1 + y2) / 2 - canvasHeight / 2) / PIXELS_PER_METER
  );

  // Rotate around Y
  wall.rotation.y = Math.atan2(y2 - y1, x2 - x1);

  scene.add(wall);
  walls.push({ x1, y1, x2, y2, texture });
  wallMeshes.push(wall);

  adjustCameraToFitObject(scene);
}

// Listen for "add-wall" from 2D side
window.addEventListener('add-wall', (evt) => {
  const { x1, y1, x2, y2, canvasWidth, canvasHeight, texture } = evt.detail;
  createWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture);
});

// Listen for "update-all-walls" from 2D side
window.addEventListener('update-all-walls', (evt) => {
  const { walls: wallData, canvasWidth, canvasHeight } = evt.detail;

  // Remove existing
  wallMeshes.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  wallMeshes.length = 0;

  // Recreate all walls with updated data
  wallData.forEach(w => {
    createWall(w.x1, w.y1, w.x2, w.y2, canvasWidth, canvasHeight, w.texture);
  });
});

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10).normalize();
scene.add(light);

// Roof creation
function createRoof(canvasWidth, canvasHeight) {
  if (walls.length < 2) {
    console.warn('Not enough walls to create a roof');
    return;
  }
  // bounding box in 2D
  const minX = Math.min(...walls.map(w => Math.min(w.x1, w.x2)));
  const maxX = Math.max(...walls.map(w => Math.max(w.x1, w.x2)));
  const minY = Math.min(...walls.map(w => Math.min(w.y1, w.y2)));
  const maxY = Math.max(...walls.map(w => Math.max(w.y1, w.y2)));

  // Convert to meters
  const widthM = (maxX - minX + 2) / PIXELS_PER_METER;
  const depthM = (maxY - minY + 2) / PIXELS_PER_METER;

  const wallHeight = parseFloat(document.getElementById('wallHeight').value) || 10;

  const textureLoader = new THREE.TextureLoader();
  const roofTexture = textureLoader.load('./assets/roof_texture.jpg');

  // Flat roof
  const roofGeometry = new THREE.BoxGeometry(widthM, 0.2, depthM);
  const roofMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);

  // position roof
  const midX = (minX + maxX) / 2 - canvasWidth / 4;
  const midY = (minY + maxY) / 2 - canvasHeight / 2;

  roof.position.set(
    midX / PIXELS_PER_METER,
    wallHeight + 0.1,
    -midY / PIXELS_PER_METER
  );

  // optional peaked roof
  const peakHeight = 1;
  const roofPeakGeometry = new THREE.ConeGeometry(widthM / 2, peakHeight, 4);
  const roofPeakMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide });
  const roofPeak = new THREE.Mesh(roofPeakGeometry, roofPeakMaterial);
  roofPeak.position.set(roof.position.x, wallHeight + peakHeight, roof.position.z);
  roofPeak.rotation.y = Math.PI / 4;

  scene.add(roof);
  scene.add(roofPeak);

  adjustCameraToFitObject(scene);
}

document.getElementById('addRoof').addEventListener('click', () => {
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight / 2;
  createRoof(canvasWidth, canvasHeight);
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
