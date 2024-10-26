const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; // Full width
canvas.height = window.innerHeight / 2; // Half height for stacking

let walls = [];
let drawing = false; // To track if the user is drawing
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 }; // To store the current line being drawn

// Adjust for canvas position in the viewport
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect(); // Get canvas position and size
    return {
        x: event.clientX - rect.left, // Adjust X to canvas coordinate
        y: event.clientY - rect.top   // Adjust Y to canvas coordinate
    };
}

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
    const { x, y } = getMousePos(event);
    currentLine.x1 = x;
    currentLine.y1 = y;
});

canvas.addEventListener('mousemove', (event) => {
    if (!drawing) return; // Exit if not drawing
    const { x, y } = getMousePos(event);
    currentLine.x2 = x;
    currentLine.y2 = y;

    // Clear the canvas and redraw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    walls.forEach((wall) => {
        drawLine(wall.x1, wall.y1, wall.x2, wall.y2);
        drawLength(wall.x1, wall.y1, wall.x2, wall.y2); // Draw lengths of already drawn walls
    });

    // Draw the current line
    drawLine(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2);

    // Calculate and display the length dynamically while drawing
    const currentLength = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1).toFixed(2);
    drawDynamicLength(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, currentLength); // Show length dynamically
});

// Draw a line when mouse is released
canvas.addEventListener('mouseup', (event) => {
    drawing = false;
    const { x, y } = getMousePos(event);

    // Save the completed wall to the walls array
    currentLine.x2 = x; // Finalize the end point of the wall
    currentLine.y2 = y;
    const length = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1).toFixed(2); // Calculate length
    walls.push({ x1: currentLine.x1, y1: currentLine.y1, x2: currentLine.x2, y2: currentLine.y2, length }); // Store length with wall data

    // Trigger the 3D wall creation, passing canvas width and height
    add3DWall(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, canvas.width, canvas.height);

    // Reset current line
    currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
});

// Draw a line between two points
function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw the length of each wall on the canvas
function drawLength(x1, y1, x2, y2) {
    const length = Math.hypot(x2 - x1, y2 - y1).toFixed(2); // Calculate the length
    ctx.font = '12px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText(`${length} m`, (x1 + x2) / 2, (y1 + y2) / 2 - 10); // Position the text above the line
}

// Draw the current dynamic length while dragging
function drawDynamicLength(x1, y1, x2, y2, length) {
    ctx.font = '12px Arial';
    ctx.fillStyle = 'blue'; // Different color for dynamic length
    ctx.fillText(`${length} m`, (x1 + x2) / 2, (y1 + y2) / 2 - 10); // Position the text above the line
}

// Expose add3DWall function to be accessible from 3d-rendering.js
export function add3DWall(x1, y1, x2, y2, canvasWidth, canvasHeight) {
    const event = new CustomEvent('add-wall', { detail: { x1, y1, x2, y2, canvasWidth, canvasHeight } });
    window.dispatchEvent(event);
}
