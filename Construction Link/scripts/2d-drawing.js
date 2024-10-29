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
let resizing = false; // To track if an endpoint is being resized
let resizingPoint = null; // Track which endpoint is being resized

// Create a delete button
const deleteButton = document.createElement('button');
deleteButton.className = 'delete-button';
deleteButton.innerHTML = 'X';
document.body.appendChild(deleteButton);

// Create endpoint elements
const endpoint1 = document.createElement('div');
const endpoint2 = document.createElement('div');
endpoint1.className = 'endpoint';
endpoint2.className = 'endpoint';
document.body.appendChild(endpoint1);
document.body.appendChild(endpoint2);

// Function to get mouse position relative to canvas using getBoundingClientRect
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
    const { x, y } = getMousePos(event); // Use getMousePos to get adjusted coordinates
    const clickedWall = walls.find(wall => isPointOnLine(x, y, wall));

    if (clickedWall) {
        if (selectedWall) {
            selectedWall.highlighted = false; // Remove highlight from previous wall
        }

        clickedWall.highlighted = true; // Highlight the clicked wall
        selectedWall = clickedWall; // Set as the currently selected wall
        isDragging = true; // Start dragging the selected wall

        // Show the delete button at the midpoint of the selected wall
        showDeleteButton((clickedWall.x1 + clickedWall.x2) / 2, (clickedWall.y1 + clickedWall.y2) / 2);
        
        // Show endpoints
        showEndpoints(selectedWall);
    } else {
        drawing = true; // Start drawing if not clicking on an existing wall
        currentLine.x1 = x;
        currentLine.y1 = y;
        deleteButton.style.display = 'none'; // Hide delete button when starting a new line
    }
});

// Show endpoints function
function showEndpoints(wall) {
    endpoint1.style.left = `${wall.x1 + canvas.offsetLeft - 5}px`;
    endpoint1.style.top = `${wall.y1 + canvas.offsetTop - 5}px`;
    endpoint1.style.display = 'block'; // Show start endpoint

    endpoint2.style.left = `${wall.x2 + canvas.offsetLeft - 5}px`;
    endpoint2.style.top = `${wall.y2 + canvas.offsetTop - 5}px`;
    endpoint2.style.display = 'block'; // Show end endpoint

    // Allow dragging of endpoints to resize the wall
    endpoint1.onmousedown = (e) => {
        e.stopPropagation();
        resizingPoint = 'start';
        resizing = true;
    };

    endpoint2.onmousedown = (e) => {
        e.stopPropagation();
        resizingPoint = 'end';
        resizing = true;
    };
}

// Mouse move event
canvas.addEventListener('mousemove', (event) => {
    const { x, y } = getMousePos(event);

    if (resizing && selectedWall) {
        if (resizingPoint === 'start') {
            selectedWall.x1 = x;
            selectedWall.y1 = y;
        } else if (resizingPoint === 'end') {
            selectedWall.x2 = x;
            selectedWall.y2 = y;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawWalls();
        showEndpoints(selectedWall);
        return;
    }

    const isHoveringOnWall = walls.some(wall => isPointOnLine(x, y, wall));
    canvas.style.cursor = isHoveringOnWall ? 'pointer' : 'crosshair';

    if (isDragging && selectedWall) {
        const dx = x - (selectedWall.x1 + selectedWall.x2) / 2;
        const dy = y - (selectedWall.y1 + selectedWall.y2) / 2;

        selectedWall.x1 += dx;
        selectedWall.y1 += dy;
        selectedWall.x2 += dx;
        selectedWall.y2 += dy;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawWalls();
        showDeleteButton((selectedWall.x1 + selectedWall.x2) / 2, (selectedWall.y1 + selectedWall.y2) / 2);
        drawEnds();
        endpoint1.style.display = 'none';
        endpoint2.style.display = 'none';
        return;
    }

    if (!drawing) return;

    currentLine.x2 = x;
    currentLine.y2 = y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawWalls();
    drawLine(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2);

    const currentLength = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1).toFixed(2);
    drawDynamicLength(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, currentLength);
});

// Mouse up event to finalize drawing or stop dragging
canvas.addEventListener('mouseup', (event) => {
    if (drawing) {
        drawing = false;
        const { x, y } = getMousePos(event);

        currentLine.x2 = x;
        currentLine.y2 = y;
        const length = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1).toFixed(2);
        walls.push({ 
            x1: currentLine.x1, 
            y1: currentLine.y1, 
            x2: currentLine.x2, 
            y2: currentLine.y2, 
            length, 
            texture: wallTexture, 
            highlighted: false 
        });

        add3DWall(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, canvas.width, canvas.height, wallTexture);
        currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
        deleteButton.style.display = 'none';
    }

    isDragging = false;
    resizing = false;
});

document.addEventListener('mouseup', () => {
    resizing = false;
});

// Show delete button
function showDeleteButton(x, y) {
    deleteButton.style.left = `${x + canvas.offsetLeft - 10}px`; // Center the button
    deleteButton.style.top = `${y + canvas.offsetTop - 30}px`; // Adjust position above the wall
    deleteButton.style.display = 'block'; // Show delete button
}

// Delete wall on delete button click
deleteButton.addEventListener('click', () => {
    if (selectedWall) {
        walls = walls.filter(wall => wall !== selectedWall); // Remove from walls array
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        drawGrid(); // Redraw the grid
        drawWalls(); // Redraw the walls

        // Remove from 3D walls
        updateAllWalls(); // Call the update function to redraw all walls in 3D
        endpoint1.style.display = 'none'; // Hide endpoints
        endpoint2.style.display = 'none'; // Hide endpoints
    }
    deleteButton.style.display = 'none'; // Hide delete button after deletion
});

// Draw all walls
function drawWalls() {
    walls.forEach(wall => {
        const color = wall.highlighted ? 'red' : 'black'; // Change color if highlighted
        drawLine(wall.x1, wall.y1, wall.x2, wall.y2, color);
        drawLength(wall.x1, wall.y1, wall.x2, wall.y2); // Draw lengths of already drawn walls
    });
}

// Draw a line between two points
function drawLine(x1, y1, x2, y2, color = 'black') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; // Use the passed color
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw filled circles at both ends of the selected line
function drawEnds() {
    if (selectedWall) {
        ctx.fillStyle = 'blue'; // Color of the filled circle
        const radius = 5; // Radius of the filled circle
        ctx.beginPath();
        ctx.arc(selectedWall.x1, selectedWall.y1, radius, 0, Math.PI * 2); // Start point
        ctx.fill();
        ctx.beginPath();
        ctx.arc(selectedWall.x2, selectedWall.y2, radius, 0, Math.PI * 2); // End point
        ctx.fill();
    }
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

// Wall texture buttons
document.getElementById('brickWall').addEventListener('click', () => {
    wallTexture = './assets/brick_texture.jpg'; // Set to brick texture
});

document.getElementById('blockWall').addEventListener('click', () => {
    wallTexture = './assets/block_texture.jpg'; // Set to block texture
});

// Update walls
document.getElementById('updateWalls').addEventListener('click', () => {
    updateAllWalls();
});

// Adding 3D wall function
function add3DWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture) {
    const event = new CustomEvent('add-wall', { detail: { x1, y1, x2, y2, canvasWidth, canvasHeight, texture } });
    window.dispatchEvent(event);
}

// Update 3D wall function
function update3DWall(wall) {
    const event = new CustomEvent('update-wall', { detail: wall });
    window.dispatchEvent(event);
}

// Update all walls
function updateAllWalls() {
    const event = new CustomEvent('update-all-walls', { detail: { walls, canvasWidth: canvas.width, canvasHeight: canvas.height } });
    window.dispatchEvent(event);
}

// Check if a point is near a line
function isPointOnLine(px, py, wall) {
    const tolerance = 5; // How close the point needs to be to the line
    const distance = Math.abs((wall.y2 - wall.y1) * px - (wall.x2 - wall.x1) * py + wall.x2 * wall.y1 - wall.y2 * wall.x1) /
                     Math.sqrt(Math.pow(wall.y2 - wall.y1, 2) + Math.pow(wall.x2 - wall.x1, 2));
    return distance < tolerance;
}

// Reset cursor style when drawing or hovering over walls
canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = 'default'; // Reset to default cursor
});

// Handle mouse up event to reset resizing state
document.addEventListener('mouseup', () => {
    resizing = false; // Stop resizing when mouse is released
});