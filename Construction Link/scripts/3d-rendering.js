// 3d-rendering.js

import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';
import { Shape, ShapeGeometry, Vector2, Path } from 'https://unpkg.com/three@0.126.1/build/three.module.js';

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

// Keep track of all meshes for easy removal
const allMeshes = [];

/**
 * Auto-adjust the camera so we can see everything (walls + base + roof).
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
 * Read user-chosen wall height from the sidebar (in meters).
 */
function getWallHeight() {
  const val = parseFloat(document.getElementById('wallHeight').value) || 10;
  const unit = document.getElementById('heightUnit').value;
  return (unit === 'ft') ? (val * 0.3048) : val;
}

/**
 * Create a 3D wall + base with optional cutouts (doors/windows).
 */
function createWall3D(wall) {
  const wallHeight = getWallHeight();

  // Convert from 2D canvas coords to 3D
  const midX = (wall.x1 + wall.x2) / 2;
  const midY = (wall.y1 + wall.y2) / 2;
  const posX = midX / PIXELS_PER_METER;
  const posZ = -midY / PIXELS_PER_METER; // 2D Y down => 3D Z up

  const angle = Math.atan2((wall.y2 - wall.y1), (wall.x2 - wall.x1));

  // The 2D length in meters
  const wallLength = wall.lengthMeter;
  const wallThickness = wall.thickness;
  const baseDepth = wall.baseDepth;         // vertical dimension
  const baseThickness = wall.baseThickness; // thickness in Z direction

  // 1) Create the base if needed
  if (baseDepth > 0 && baseThickness > 0) {
    const baseTexture = new THREE.TextureLoader().load('./imgs/WallBaseTexture.png');
    const baseMaterial = new THREE.MeshStandardMaterial({ map: baseTexture });
    const baseGeometry = new THREE.BoxGeometry(wallLength, baseDepth, baseThickness);

    // Center the geometry so the top is at y=0
    // We want base bottom at negative y => shift upward by half
    baseGeometry.translate(0, -baseDepth / 2, 0);

    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(posX, 0, posZ);
    baseMesh.rotation.y = angle;
    scene.add(baseMesh);
    allMeshes.push(baseMesh);
  }

  // 2) Create the wall with or without openings
  let wallTexture;
  if (wall.wallType === 'brick') {
    wallTexture = new THREE.TextureLoader().load('./imgs/brick_texture.jpg');
  } else if (wall.wallType === 'block') {
    wallTexture = new THREE.TextureLoader().load('./imgs/block_texture.jpg');
  }
  const wallMaterial = wallTexture
    ? new THREE.MeshStandardMaterial({ map: wallTexture })
    : new THREE.MeshStandardMaterial({ color: 0xffffff });

  // If openings exist, create shape with holes
  if (wall.openings && wall.openings.length > 0) {
    // We'll define a rectangular shape the size of the wall: width=wallLength, height=wallHeight
    // Then add holes for each opening
    const wallShape = new Shape();
    // Start at bottom-left
    wallShape.moveTo(0, 0);
    wallShape.lineTo(wallLength, 0);
    wallShape.lineTo(wallLength, wallHeight);
    wallShape.lineTo(0, wallHeight);
    wallShape.lineTo(0, 0);

    // For each opening, add a hole
    wall.openings.forEach(opening => {
      const { type, width, height, location } = opening;

      // horizontal offset
      let xOffset = 0;
      if (location === 'center') {
        xOffset = (wallLength - width) / 2;
      } else if (location === 'right') {
        xOffset = wallLength - width;
      } else {
        xOffset = 0; // left
      }

      // vertical offset
      // door at bottom => yOffset=0
      // window => place above center => let's do (wallHeight - height)/2
      let yOffset = 0;
      if (type === 'window') {
        yOffset = (wallHeight - height) / 2;
        if (yOffset < 0) yOffset = 0; // in case user enters huge window
      }

      const holePath = new Path();
      holePath.moveTo(xOffset, yOffset);
      holePath.lineTo(xOffset + width, yOffset);
      holePath.lineTo(xOffset + width, yOffset + height);
      holePath.lineTo(xOffset, yOffset + height);
      holePath.lineTo(xOffset, yOffset);
      wallShape.holes.push(holePath);
    });

    // Extrude shape to get thickness
    const extrudeSettings = {
      depth: wallThickness,
      bevelEnabled: false
    };
    const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);

    // By default, the shape's bottom is at y=0 => shift it up so bottom is at y=0
    // Then center thickness along Z if needed. We'll place the bottom at y=0:
    // We'll do translation so that shape is centered in the thickness dimension
    wallGeometry.center();
    // But we only want to center in Z, not in Y. So let's shift it back:
    // After center(), the geometry is centered in all axes. We want y= (wallHeight/2)
    // Let's do a bounding box approach or we can do a manual shift:
    wallGeometry.translate(0, wallHeight / 2, 0);

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(posX, 0, posZ);
    wallMesh.rotation.y = angle;
    scene.add(wallMesh);
    allMeshes.push(wallMesh);
  } else {
    // No openings => simple box
    const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    // Shift so bottom is at y=0
    wallGeometry.translate(0, wallHeight / 2, 0);

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(posX, 0, posZ);
    wallMesh.rotation.y = angle;
    scene.add(wallMesh);
    allMeshes.push(wallMesh);
  }
}

// Listen for add-wall
window.addEventListener('add-wall', (evt) => {
  createWall3D(evt.detail);
  adjustCameraToFitScene();
});

// Listen for update-all-walls
window.addEventListener('update-all-walls', (evt) => {
  const { walls } = evt.detail;

  // Remove old
  allMeshes.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.dispose();
  });
  allMeshes.length = 0;

  // Create new
  walls.forEach(w => createWall3D(w));
  adjustCameraToFitScene();
});

// -------------------- Roof Logic --------------------

const roofModal = document.getElementById('roofModal');
const closeRoofModal = document.getElementById('closeRoofModal');
const roofWidthInput = document.getElementById('roofWidthInput');
const steelRodSelect = document.getElementById('steelRodSelect');
const roofMarginInput = document.getElementById('roofMarginInput');
const submitRoofBtn = document.getElementById('submitRoofBtn');

// When user clicks Add Roof (sidebar button)
document.getElementById('addRoof').addEventListener('click', () => {
  // Check if at least 2 walls are drawn
  if (!window.walls || window.walls.length < 2) {
    alert("Please make at least 2 walls.");
    return;
  }
  roofModal.style.display = 'block';
});

// Close modal
closeRoofModal.addEventListener('click', () => {
  roofModal.style.display = 'none';
});

// Submit roof
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

// Create roof as extruded polygon
function createRoof3D(roofThicknessInches, steelRodDiameter, marginFeet) {
  // 1) Gather unique endpoints
  const uniquePoints = [];
  window.walls.forEach(w => {
    const p1 = { x: w.x1, y: w.y1 };
    const p2 = { x: w.x2, y: w.y2 };
    addUniquePoint(uniquePoints, p1);
    addUniquePoint(uniquePoints, p2);
  });

  // 2) Sort points in clockwise order around center
  const center = computeCenter(uniquePoints);
  uniquePoints.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });

  // 3) Convert to Vector2 in meters, with margin
  const marginMeters = marginFeet * 0.3048;
  const shapePoints = [];
  uniquePoints.forEach(pt => {
    const dx = pt.x - center.x;
    const dy = pt.y - center.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const newR = (r / PIXELS_PER_METER) + marginMeters;
    const outX = newR * Math.cos(angle);
    const outY = newR * Math.sin(angle);

    shapePoints.push(new Vector2(outX, outY));
  });

  // 4) Create shape
  const roofShape = new Shape(shapePoints);

  // 5) Extrude
  const thicknessMeters = roofThicknessInches * 0.0254;
  const extrudeSettings = {
    depth: thicknessMeters,
    bevelEnabled: false
  };
  const shapeGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);

  // 6) Create mesh
  const roofTexture = new THREE.TextureLoader().load('./imgs/RoofTexture.jpeg');
  const roofMaterial = new THREE.MeshStandardMaterial({ map: roofTexture });
  const roofMesh = new THREE.Mesh(shapeGeometry, roofMaterial);

  // 7) Position
  roofMesh.rotation.x = -Math.PI / 2;
  const wallHeight = getWallHeight();
  roofMesh.position.set(
    center.x / PIXELS_PER_METER,
    wallHeight + thicknessMeters,
    -center.y / PIXELS_PER_METER
  );

  scene.add(roofMesh);
  allMeshes.push(roofMesh);

  // 8) Add rods
  const rodRadius = (steelRodDiameter / 1000) / 2;
  const rodHeight = thicknessMeters + 0.1;
  const rodGeometry = new THREE.CylinderGeometry(rodRadius, rodRadius, rodHeight, 16);
  const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });

  shapePoints.forEach(vec => {
    const rodMesh = new THREE.Mesh(rodGeometry, rodMaterial);
    const finalX = center.x / PIXELS_PER_METER + vec.x;
    const finalY = wallHeight + thicknessMeters + rodHeight / 2;
    const finalZ = -(center.y / PIXELS_PER_METER) + vec.y;
    rodMesh.position.set(finalX, finalY, finalZ);
    scene.add(rodMesh);
    allMeshes.push(rodMesh);
  });

  adjustCameraToFitScene();
}

// Helpers
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
  return { x: sx / pts.length, y: sy / pts.length };
}

// ---------------- Beam & Column ----------------
let beamColumnGroup = new THREE.Group();
const columnBeamTexture = new THREE.TextureLoader().load('./imgs/ColumnBeemTexture.jpeg');

window.addEventListener('add-beam-column', (evt) => {
  // Remove old
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

  // Collect unique endpoints
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

  // For each wall that hasBeamColumn
  walls.forEach(wall => {
    if (!wall.hasBeamColumn) return;

    const pos1 = new THREE.Vector3(wall.x1 / PIXELS_PER_METER, 0, -wall.y1 / PIXELS_PER_METER);
    const pos2 = new THREE.Vector3(wall.x2 / PIXELS_PER_METER, 0, -wall.y2 / PIXELS_PER_METER);

    addUniqueEndpoint(pos1);
    addUniqueEndpoint(pos2);

    // Beam
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

  // Columns at endpoints
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
