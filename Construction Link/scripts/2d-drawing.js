const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth; 
canvas.height = window.innerHeight / 2; 

// We'll treat 20 pixels == 1 meter internally
const PIXELS_PER_METER = 20;

let walls = [];
let drawing = false; 
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 }; 
let selectedWall = null; 
let isDragging = false; 

// Default texture and wall type
let wallTexture = './imgs/brick_texture.jpg'; 
let currentWallType = 'brick'; // "brick" or "block"

// For resizing endpoints
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

// Material Estimation button
const estimateBtn = document.getElementById('estimateMaterials');

// HTML elements for wall height & thickness
const wallHeightInput = document.getElementById('wallHeight');
const heightUnitSelect = document.getElementById('heightUnit');
const wallWidthInput = document.getElementById('wallWidth');
const widthUnitSelect = document.getElementById('widthUnit');

// Helper to convert user input to meters
function getWallHeightInMeters() {
  const val = parseFloat(wallHeightInput.value) || 0;
  return (heightUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}
function getWallThicknessInMeters() {
  const val = parseFloat(wallWidthInput.value) || 0;
  return (widthUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}

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
    lengthForm.style.display = 'none'; // Hide length form if open

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

    // If we are not dragging or resizing but we are drawing a new line
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

        // Add the new wall to our array
        walls.push({
            x1: currentLine.x1,
            y1: currentLine.y1,
            x2: currentLine.x2,
            y2: currentLine.y2,
            lengthMeter: lengthM,     // internal measure in meters
            displayLength: lengthM,   // displayed value (by default same as meter)
            unitType: 'm',            // 'm' or 'ft'
            texture: wallTexture,
            wallType: currentWallType,  
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

    // Prefill lengthValueInput from wall
    if (selectedWall.unitType === 'ft') {
        lengthValueInput.value = selectedWall.displayLength;
        lengthUnitSelect.value = 'ft';
    } else {
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
        newLengthM = newVal * 0.3048; // foot -> meter
    }

    // ratio for scaling
    const ratio = newLengthM / oldLengthM;

    // Rescale around midpoint
    const midX = (selectedWall.x1 + selectedWall.x2) / 2;
    const midY = (selectedWall.y1 + selectedWall.y2) / 2;

    selectedWall.x1 = midX + (selectedWall.x1 - midX) * ratio;
    selectedWall.y1 = midY + (selectedWall.y1 - midY) * ratio;
    selectedWall.x2 = midX + (selectedWall.x2 - midX) * ratio;
    selectedWall.y2 = midY + (selectedWall.y2 - midY) * ratio;

    // Update internal meter length
    selectedWall.lengthMeter = newLengthM;

    // Update displayed value and unit
    if (lengthUnitSelect.value === 'ft') {
        selectedWall.displayLength = newVal; 
        selectedWall.unitType = 'ft';
    } else {
        selectedWall.displayLength = newVal; 
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

function drawLengthText(wall) {
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = 'red';

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

// Updating the 3D scene
document.getElementById('updateWalls').addEventListener('click', () => {
    updateAllWalls();
});

// Texture selection
document.getElementById('brickWall').addEventListener('click', () => {
    wallTexture = './imgs/brick_texture.jpg';
    currentWallType = 'brick';
});
document.getElementById('blockWall').addEventListener('click', () => {
    wallTexture = './imgs/block_texture.jpg';
    currentWallType = 'block';
});

// Material Estimation Button
estimateBtn.addEventListener('click', () => {
    calculateMaterialEstimation();
});

// Calculate material estimation
function calculateMaterialEstimation() {
    // We'll get wall height & thickness in meters
    const wallH = getWallHeightInMeters();
    const wallT = getWallThicknessInMeters();

    if (wallH <= 0 || wallT <= 0) {
        alert('Please enter valid wall Height and Thickness first!');
        return;
    }

    // We'll accumulate separate volumes for brick walls and block walls
    let totalBrickVolume = 0; 
    let totalBlockVolume = 0;

    walls.forEach(wall => {
        // The length in meters is stored in wall.lengthMeter
        // Volume = length * height * thickness
        const volume = wall.lengthMeter * wallH * wallT;
        if (wall.wallType === 'brick') {
            totalBrickVolume += volume;
        } else if (wall.wallType === 'block') {
            totalBlockVolume += volume;
        }
    });

    // Suppose:
    // - Volume of one standard brick ~ 0.0015 m^3
    // - Volume of one standard block ~ 0.0075 m^3
    const volumePerBrick = 0.0015; 
    const volumePerBlock = 0.0075;

    // Calculate how many bricks/blocks needed (round up)
    const numBricks = Math.ceil(totalBrickVolume / volumePerBrick);
    const numBlocks = Math.ceil(totalBlockVolume / volumePerBlock);

    // Mortar ~ 20% of total volume, ratio cement:sand = 1:5
    const mortarVolumeBrick = 0.2 * totalBrickVolume;
    const mortarVolumeBlock = 0.2 * totalBlockVolume;
    const totalMortarVolume = mortarVolumeBrick + mortarVolumeBlock;

    // 1 bag cement = ~0.035 m^3, ratio is 1 part cement, 5 parts sand
    const totalCementVolume = totalMortarVolume / 6; 
    const totalSandVolume = (5 * totalMortarVolume) / 6;
    const bagsCement = Math.ceil(totalCementVolume / 0.035);
    const sandCubicMeters = totalSandVolume.toFixed(2);

    // Prepare a summary
    let message = 'Material Estimation:\n\n';
    message += `Brick Walls Volume: ${totalBrickVolume.toFixed(2)} m³\n`;
    message += `Block Walls Volume: ${totalBlockVolume.toFixed(2)} m³\n\n`;

    if (numBricks > 0) {
        message += `Bricks Required: ${numBricks}\n`;
    }
    if (numBlocks > 0) {
        message += `Blocks Required: ${numBlocks}\n`;
    }

    message += `\nMortar Volume (approx): ${totalMortarVolume.toFixed(2)} m³\n`;
    message += `Bags of Cement (approx): ${bagsCement}\n`;
    message += `Sand (approx): ${sandCubicMeters} m³\n`;

    alert(message);
}

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
