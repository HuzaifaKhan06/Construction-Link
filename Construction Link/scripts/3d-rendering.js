import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

// Create the 3D scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 2000); // Increased far clipping plane
camera.position.set(0, 15, 50); // Initial camera position
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

// Adjust camera based on object size
function adjustCameraToFitObject(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180); // Convert FOV to radians
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)); // Calculate camera distance

    cameraZ *= 1.5; // Add buffer to ensure the whole object is visible

    camera.position.set(center.x, center.y + cameraZ / 3, cameraZ); // Update camera position
    camera.lookAt(center); // Ensure camera is looking at object center

    controls.target.copy(center); // Update orbit controls to focus on object center
    controls.update();
}

// Create a wall with Y-axis correction and dynamic texture
function createWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const height = parseFloat(document.getElementById('wallHeight').value) || 10;
    const width = parseFloat(document.getElementById('wallWidth').value) || 1;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load(texture);

    const wallGeometry = new THREE.BoxGeometry(length, height, width);
    const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    // Correct Y-axis inversion
    wall.position.set((x1 + x2) / 2 - canvasWidth / 4, height / 2, -(y1 + y2) / 2 + canvasHeight / 2); 
    wall.rotation.y = Math.atan2(y2 - y1, x2 - x1); // Correct wall rotation

    scene.add(wall);
    walls.push({ x1, y1, x2, y2, texture });
    wallMeshes.push(wall);

    // Adjust camera after adding the wall
    adjustCameraToFitObject(scene);
}

// Listening for wall drawing events from 2D canvas
window.addEventListener('add-wall', (event) => {
    const { x1, y1, x2, y2, canvasWidth, canvasHeight, texture } = event.detail;
    createWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture);
});

// Redraw walls after updating in 2D canvas
window.addEventListener('update-all-walls', (event) => {
    const { walls: wallData, canvasWidth, canvasHeight } = event.detail;

    // Remove existing wall meshes
    wallMeshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    });
    wallMeshes.length = 0;

    // Recreate walls with updated data
    wallData.forEach(wall => {
        createWall(wall.x1, wall.y1, wall.x2, wall.y2, canvasWidth, canvasHeight, wall.texture);
    });
});

// Directional light for better visibility
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10).normalize();
scene.add(light);

// Create a roof based on walls
function createRoof(canvasWidth, canvasHeight) {
    if (walls.length < 2) {
        console.warn('Not enough walls to create a roof');
        return;
    }

    // Calculate boundaries of walls
    const minX = Math.min(...walls.map(wall => Math.min(wall.x1, wall.x2)));
    const maxX = Math.max(...walls.map(wall => Math.max(wall.x1, wall.x2)));
    const minY = Math.min(...walls.map(wall => Math.min(wall.y1, wall.y2)));
    const maxY = Math.max(...walls.map(wall => Math.max(wall.y1, wall.y2)));

    const width = maxX - minX + 2; 
    const depth = maxY - minY + 2;
    const wallHeight = parseFloat(document.getElementById('wallHeight').value) || 10;

    const textureLoader = new THREE.TextureLoader();
    const roofTexture = textureLoader.load('./assets/roof_texture.jpg');

    // Create a flat roof
    const roofGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const roofMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);

    roof.position.set(minX + width / 2 - canvasWidth / 4, wallHeight + 0.1, -(minY + depth / 2) + canvasHeight / 2);

    // Create a peaked roof (optional)
    const peakHeight = 1;
    const roofPeakGeometry = new THREE.ConeGeometry(width / 2, peakHeight, 4);
    const roofPeakMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide });
    const roofPeak = new THREE.Mesh(roofPeakGeometry, roofPeakMaterial);
    roofPeak.position.set(roof.position.x, wallHeight + peakHeight, roof.position.z);
    roofPeak.rotation.y = Math.PI / 4; // Align the peak

    scene.add(roof);
    scene.add(roofPeak);

    // Adjust camera after adding roof
    adjustCameraToFitObject(scene);
}

// Listen for roof creation button click
document.getElementById('addRoof').addEventListener('click', () => {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight / 2;
    createRoof(canvasWidth, canvasHeight);
});

// Rendering loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();