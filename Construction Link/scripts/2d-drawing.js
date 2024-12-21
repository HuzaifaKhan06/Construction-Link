const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; 
canvas.height = window.innerHeight / 2; 

// We'll treat 20 pixels == 1 meter
const PIXELS_PER_METER = 20;

let walls = [];
let drawing = false; 
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 }; 
let selectedWall = null; 
let isDragging = false; 
let wallTexture = './assets/brick_texture.jpg'; 
let resizing = false; 
let resizingPoint = null; 

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

// Create three-dots button
const threeDotsButton = document.createElement('button');
threeDotsButton.className = 'three-dots-button';
threeDotsButton.innerHTML = '...';
document.body.appendChild(threeDotsButton);

// Small form for editing length
const lengthForm = document.getElementById('lengthForm');
const lengthValueInput = document.getElementById('lengthValue');
const lengthUnitSelect = document.getElementById('lengthUnit');
const setLengthBtn = document.getElementById('setLengthBtn');

// Get mouse position relative to canvas
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top
    };
}

// Draw the grid
function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += PIXELS_PER_METER) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += PIXELS_PER_METER) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }
}
drawGrid();

canvas.addEventListener('mousedown', (event) => {
    const { x, y } = getMousePos(event);
    // Hide length form on any new click
    lengthForm.style.display = 'none';

    const clickedWall = walls.find(wall => isPointOnLine(x, y, wall));
    if (clickedWall) {
        // If clicking an existing wall
        if (selectedWall) {
            selectedWall.highlighted = false;
        }
        clickedWall.highlighted = true;
        selectedWall = clickedWall;
        isDragging = true;

        // Show delete + 3-dots near midpoint
        const midX = (clickedWall.x1 + clickedWall.x2) / 2;
        const midY = (clickedWall.y1 + clickedWall.y2) / 2;
        showDeleteButton(midX, midY);
        showThreeDotsButton(midX, midY);

        // Show endpoints
        showEndpoints(selectedWall);
    } else {
        // Start a new line
        drawing = true;
        currentLine.x1 = x;
        currentLine.y1 = y;
        deleteButton.style.display = 'none';
        threeDotsButton.style.display = 'none';
    }
});

function showEndpoints(wall) {
    endpoint1.style.left = `${wall.x1 + canvas.offsetLeft - 5}px`;
    endpoint1.style.top = `${wall.y1 + canvas.offsetTop - 5}px`;
    endpoint1.style.display = 'block';

    endpoint2.style.left = `${wall.x2 + canvas.offsetLeft - 5}px`;
    endpoint2.style.top = `${wall.y2 + canvas.offsetTop - 5}px`;
    endpoint2.style.display = 'block';

    // Drag endpoints for resizing
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

canvas.addEventListener('mousemove', (event) => {
    const { x, y } = getMousePos(event);

    if (resizing && selectedWall) {
        // Resizing the selected wall
        if (resizingPoint === 'start') {
            selectedWall.x1 = x;
            selectedWall.y1 = y;
        } else {
            selectedWall.x2 = x;
            selectedWall.y2 = y;
        }
        redraw();
        showEndpoints(selectedWall);
        return;
    }

    const isHoveringOnWall = walls.some(wall => isPointOnLine(x, y, wall));
    canvas.style.cursor = isHoveringOnWall ? 'pointer' : 'crosshair';

    if (isDragging && selectedWall) {
        // Drag entire wall
        const dx = x - (selectedWall.x1 + selectedWall.x2) / 2;
        const dy = y - (selectedWall.y1 + selectedWall.y2) / 2;

        selectedWall.x1 += dx;
        selectedWall.y1 += dy;
        selectedWall.x2 += dx;
        selectedWall.y2 += dy;

        redraw();
        const midX = (selectedWall.x1 + selectedWall.x2) / 2;
        const midY = (selectedWall.y1 + selectedWall.y2) / 2;
        showDeleteButton(midX, midY);
        showThreeDotsButton(midX, midY);
        drawEnds();

        endpoint1.style.display = 'none';
        endpoint2.style.display = 'none';
        return;
    }

    if (!drawing) return;

    // Drawing new line in progress
    currentLine.x2 = x;
    currentLine.y2 = y;

    redraw();
    drawLine(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, 'black');

    // Show dynamic length in meters
    const lengthPx = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
    const lengthM = lengthPx / PIXELS_PER_METER;
    drawDynamicLength(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, lengthM.toFixed(2), 'm');
});

canvas.addEventListener('mouseup', (event) => {
    if (drawing) {
        drawing = false;
        const { x, y } = getMousePos(event);
        currentLine.x2 = x;
        currentLine.y2 = y;

        const lengthPx = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
        const lengthM = lengthPx / PIXELS_PER_METER;

        // Store a new wall object
        walls.push({
            x1: currentLine.x1,
            y1: currentLine.y1,
            x2: currentLine.x2,
            y2: currentLine.y2,
            lengthMeter: lengthM,        // internal measure in meters
            displayLength: lengthM,      // displayed value (by default same as meter)
            unitType: 'm',               // 'm' or 'ft'
            texture: wallTexture,
            highlighted: false
        });

        // Add to 3D
        add3DWall(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, canvas.width, canvas.height, wallTexture);

        currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
        deleteButton.style.display = 'none';
        threeDotsButton.style.display = 'none';
    }
    isDragging = false;
    resizing = false;
});

document.addEventListener('mouseup', () => {
    resizing = false;
});

function showDeleteButton(x, y) {
    deleteButton.style.left = `${x + canvas.offsetLeft - 10}px`;
    deleteButton.style.top = `${y + canvas.offsetTop - 30}px`;
    deleteButton.style.display = 'block';
}

function showThreeDotsButton(x, y) {
    threeDotsButton.style.left = `${x + canvas.offsetLeft + 10}px`;
    threeDotsButton.style.top = `${y + canvas.offsetTop - 30}px`;
    threeDotsButton.style.display = 'block';
}

// Delete button
deleteButton.addEventListener('click', () => {
    if (selectedWall) {
        walls = walls.filter(w => w !== selectedWall);
        redraw();
        updateAllWalls();
        endpoint1.style.display = 'none';
        endpoint2.style.display = 'none';
        threeDotsButton.style.display = 'none';
    }
    deleteButton.style.display = 'none';
});

// 3-dots button -> show length form
threeDotsButton.addEventListener('click', () => {
    if (!selectedWall) return;

    const leftPos = parseInt(threeDotsButton.style.left, 10);
    const topPos = parseInt(threeDotsButton.style.top, 10) + 35;
    lengthForm.style.left = `${leftPos}px`;
    lengthForm.style.top = `${topPos}px`;
    lengthForm.style.display = 'block';

    // Prefill lengthValueInput and dropdown from wall
    if (selectedWall.unitType === 'ft') {
        // Display length is in feet
        lengthValueInput.value = selectedWall.displayLength;
        lengthUnitSelect.value = 'ft';
    } else {
        // default is 'm'
        lengthValueInput.value = selectedWall.displayLength;
        lengthUnitSelect.value = 'm';
    }
});

// Set new length
setLengthBtn.addEventListener('click', () => {
    if (!selectedWall) return;

    let newVal = parseFloat(lengthValueInput.value);
    if (isNaN(newVal) || newVal <= 0) {
        alert('Please enter a valid length');
        return;
    }

    // old length in meters
    const oldLengthM = selectedWall.lengthMeter;
    if (oldLengthM === 0) return;

    // If user picks foot, convert foot to meters for internal scaling
    let newLengthM = newVal;
    if (lengthUnitSelect.value === 'ft') {
        newLengthM = newVal * 0.3048; // foot to meter
    }

    // Ratio for scaling the existing wall geometry in 2D
    const ratio = newLengthM / oldLengthM;

    // Rescale around midpoint
    const midX = (selectedWall.x1 + selectedWall.x2) / 2;
    const midY = (selectedWall.y1 + selectedWall.y2) / 2;

    selectedWall.x1 = midX + (selectedWall.x1 - midX) * ratio;
    selectedWall.y1 = midY + (selectedWall.y1 - midY) * ratio;
    selectedWall.x2 = midX + (selectedWall.x2 - midX) * ratio;
    selectedWall.y2 = midY + (selectedWall.y2 - midY) * ratio;

    // Update the wall's internal meter length
    selectedWall.lengthMeter = newLengthM;

    // Update the displayed value and unit
    if (lengthUnitSelect.value === 'ft') {
        selectedWall.displayLength = newVal;    // user typed foot
        selectedWall.unitType = 'ft';
    } else {
        selectedWall.displayLength = newVal;    // user typed meter
        selectedWall.unitType = 'm';
    }

    redraw();
    updateAllWalls();

    lengthForm.style.display = 'none';
});

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawWalls();
}

function drawWalls() {
    walls.forEach(wall => {
        const color = wall.highlighted ? 'red' : 'black';
        drawLine(wall.x1, wall.y1, wall.x2, wall.y2, color);
        drawLengthText(wall);
    });
}

function drawLine(x1, y1, x2, y2, color = 'black') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawEnds() {
    if (!selectedWall) return;
    ctx.fillStyle = 'blue';
    const r = 5;
    ctx.beginPath();
    ctx.arc(selectedWall.x1, selectedWall.y1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(selectedWall.x2, selectedWall.y2, r, 0, Math.PI * 2);
    ctx.fill();
}

// Show the length text of a wall
function drawLengthText(wall) {
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = 'red';

    // If wall.unitType is 'ft', show ft; else show m
    let suffix = wall.unitType === 'ft' ? ' ft' : ' m';
    let text = wall.displayLength.toFixed(2) + suffix;
    ctx.fillText(text, midX, midY - 10);
}

// Show the dynamic length while drawing
function drawDynamicLength(x1, y1, x2, y2, length, unit) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = 'blue';
    ctx.fillText(`${length} ${unit}`, midX, midY - 10);
}

// Check if a point is near a line
function isPointOnLine(px, py, wall) {
    const tolerance = 5;
    const distance = Math.abs(
        (wall.y2 - wall.y1) * px -
        (wall.x2 - wall.x1) * py +
         wall.x2 * wall.y1 -
         wall.y2 * wall.x1
    ) / Math.sqrt(
        Math.pow(wall.y2 - wall.y1, 2) + Math.pow(wall.x2 - wall.x1, 2)
    );
    return distance < tolerance;
}

// For roof or other 3D updates
document.getElementById('updateWalls').addEventListener('click', () => {
    updateAllWalls();
});

document.getElementById('brickWall').addEventListener('click', () => {
    wallTexture = './assets/brick_texture.jpg';
});
document.getElementById('blockWall').addEventListener('click', () => {
    wallTexture = './assets/block_texture.jpg';
});

// Dispatch event to 3D side
function add3DWall(x1, y1, x2, y2, canvasWidth, canvasHeight, texture) {
    const ev = new CustomEvent('add-wall', { detail: { x1, y1, x2, y2, canvasWidth, canvasHeight, texture } });
    window.dispatchEvent(ev);
}

// Update all walls in 3D
function updateAllWalls() {
    const ev = new CustomEvent('update-all-walls', { 
        detail: { walls, canvasWidth: canvas.width, canvasHeight: canvas.height }
    });
    window.dispatchEvent(ev);
}

canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = 'default';
});
