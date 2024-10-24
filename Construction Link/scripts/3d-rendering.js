import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

// Create the 3D scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);

// Set the camera position to view the model from the front
camera.position.set(0, 15, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight / 2);
document.getElementById('threejs-canvas').appendChild(renderer.domElement);

// OrbitControls to allow rotation, zooming, and panning
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// Global array to store walls
const walls = [];

// Function to create 3D walls
function createWall(x1, y1, x2, y2, canvasWidth, canvasHeight) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const height = parseFloat(document.getElementById('wallHeight').value) || 10;
    const width = parseFloat(document.getElementById('wallWidth').value) || 1;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('./assets/brick_texture.jpg');

    const wallGeometry = new THREE.BoxGeometry(length, height, width);
    const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    wall.position.set((x1 + x2) / 2 - canvasWidth / 4, height / 2, (y1 + y2) / 2 - canvasHeight / 2);
    wall.rotation.y = Math.atan2(y2 - y1, x2 - x1);

    scene.add(wall);

    walls.push({ x1, y1, x2, y2 });
}

// Listen for wall drawing events from 2d-drawing.js
window.addEventListener('add-wall', (event) => {
    const { x1, y1, x2, y2, canvasWidth, canvasHeight } = event.detail;
    createWall(x1, y1, x2, y2, canvasWidth, canvasHeight);
});

// Lighting for better visibility in 3D scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10).normalize();
scene.add(light);

function createRoof(canvasWidth, canvasHeight) {
    if (walls.length < 2) {
        console.warn('Not enough walls to create a roof');
        return;
    }

    // Calculate the boundaries of the walls
    const minX = Math.min(...walls.map(wall => Math.min(wall.x1, wall.x2)));
    const maxX = Math.max(...walls.map(wall => Math.max(wall.x1, wall.x2)));
    const minY = Math.min(...walls.map(wall => Math.min(wall.y1, wall.y2)));
    const maxY = Math.max(...walls.map(wall => Math.max(wall.y1, wall.y2)));

    const width = maxX - minX + 2; // Extend roof width slightly beyond walls
    const depth = maxY - minY + 2; // Extend roof depth slightly beyond walls
    const wallHeight = parseFloat(document.getElementById('wallHeight').value) || 10;

    // Load the roof texture
    const textureLoader = new THREE.TextureLoader();
    const roofTexture = textureLoader.load('./assets/roof_texture.jpg'); // Replace with your texture path

    // Create roof geometry as a box for flat roof
    const roofGeometry = new THREE.BoxGeometry(width, 0.2, depth); // Flat roof
    const roofMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide }); // Use texture
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);

    // Position the roof above the walls, slightly higher than the wall height
    roof.position.set(minX + width / 2 - canvasWidth / 4, wallHeight + 0.1, minY + depth / 2 - canvasHeight / 2);

    // Optionally, you can add a peak to the roof
    const peakHeight = 1; // Height of the peak
    const roofPeakGeometry = new THREE.ConeGeometry(width / 2, peakHeight, 4);
    const roofPeakMaterial = new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide }); // Use the same texture
    const roofPeak = new THREE.Mesh(roofPeakGeometry, roofPeakMaterial);
    roofPeak.position.set(roof.position.x, wallHeight + peakHeight, roof.position.z);
    roofPeak.rotation.y = Math.PI / 4;

    scene.add(roof);
    scene.add(roofPeak); // Add peak to the roof if desired
}


// Listen for the roof button click
document.getElementById('addRoof').addEventListener('click', () => {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight / 2;
    createRoof(canvasWidth, canvasHeight);
});

// Rendering loop for the 3D scene
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
