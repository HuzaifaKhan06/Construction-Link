const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; // Full width
canvas.height = window.innerHeight / 2; // Half height for stacking

let walls = [];
let drawing = false; // To track if the user is drawing
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 }; // To store the current line being drawn
let selectedWall = null; // Track the currently selected wall
let isDragging = false; // To track if a wall is being dragged
let wallTexture = './assets/brick_texture.jpg'; // Default texture

// Draw grid background
function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }
}

drawGrid();