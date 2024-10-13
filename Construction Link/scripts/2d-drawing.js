const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; // Full width
canvas.height = window.innerHeight / 2; // Half height for stacking

let walls = [];
let drawing = false; // To track if the user is drawing

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

canvas.addEventListener('mousedown', (event) => {
    drawing = true; // Start drawing
    const x = event.clientX;
    const y = event.clientY;
    walls.push({ x, y });
});

canvas.addEventListener('mousemove', (event) => {
    if (!drawing) return; // Exit if not drawing
    const x = event.clientX;
    const y = event.clientY;
    const lastWall = walls[walls.length - 1];
    drawLine(lastWall.x, lastWall.y, x, y); // Draw line to current mouse position
});

// Draw line when mouse is released
canvas.addEventListener('mouseup', (event) => {
    drawing = false;
    const x = event.clientX;
    const y = event.clientY;
    walls.push({ x, y });
    if (walls.length > 1) {
        const [start, end] = [walls[walls.length - 2], walls[walls.length - 1]];
        // Trigger the 3D wall creation, passing canvas width and height
        add3DWall(start.x, start.y, end.x, end.y, canvas.width, canvas.height);
    }
});

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Expose add3DWall function to be accessible from 3d-rendering.js
export function add3DWall(x1, y1, x2, y2, canvasWidth, canvasHeight) {
    const event = new CustomEvent('add-wall', { detail: { x1, y1, x2, y2, canvasWidth, canvasHeight } });
    window.dispatchEvent(event);
}
