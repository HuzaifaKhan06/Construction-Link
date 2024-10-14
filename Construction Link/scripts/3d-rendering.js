import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

// Create the 3D scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight / 2), 0.1, 1000);

// Set the camera position to view the model from the front
camera.position.set(0, 15, 50); // Adjusted height and distance for a better view
camera.lookAt(0, 0, 0); // Look at the origin

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight / 2); // Adjust width for side-by-side
document.getElementById('threejs-canvas').appendChild(renderer.domElement);

// OrbitControls to allow rotation, zooming, and panning
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.enableZoom = true; // Enable zoom

// Function to create 3D walls
function createWall(x1, y1, x2, y2, canvasWidth, canvasHeight) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const height = document.getElementById('wallHeight').value || 10;
    const width = document.getElementById('wallWidth').value || 1;

    const wallGeometry = new THREE.BoxGeometry(length, height, width);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    wall.position.set((x1 + x2) / 2 - canvasWidth / 4, height / 2, (y1 + y2) / 2 - canvasHeight / 2); // Adjust positions for 3D scene
    wall.rotation.y = Math.atan2(y2 - y1, x2 - x1);

    scene.add(wall);
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

// Rendering loop for the 3D scene
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
