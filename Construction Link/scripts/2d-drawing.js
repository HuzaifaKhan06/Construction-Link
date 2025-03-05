// 2d-drawing.js

const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight / 2;

const PIXELS_PER_METER = 20;

let walls = [];
let drawing = false;
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
let selectedWall = null;
let isDragging = false;

// Current wall type
let currentWallType = null; // 'brick' or 'block'

// For resizing endpoints
let resizing = false;
let resizingPoint = null;

// Delete button
const deleteButton = document.createElement('button');
deleteButton.className = 'delete-button';
deleteButton.innerHTML = 'X';
document.body.appendChild(deleteButton);

// Endpoint elements
const endpoint1 = document.createElement('div');
const endpoint2 = document.createElement('div');
endpoint1.className = 'endpoint';
endpoint2.className = 'endpoint';
document.body.appendChild(endpoint1);
document.body.appendChild(endpoint2);

// Three-dots button
const threeDotsButton = document.createElement('button');
threeDotsButton.className = 'three-dots-button';
threeDotsButton.innerHTML = '...';
document.body.appendChild(threeDotsButton);

// Length form
const lengthForm = document.getElementById('lengthForm');
const lengthValueInput = document.getElementById('lengthValue');
const lengthUnitSelect = document.getElementById('lengthUnit');
const setLengthBtn = document.getElementById('setLengthBtn');

// Material Estimation
const estimateBtn = document.getElementById('estimateMaterials');

// Sidebar inputs
const wallHeightInput = document.getElementById('wallHeight');
const heightUnitSelect = document.getElementById('heightUnit');
const wallWidthSelect = document.getElementById('wallWidth');
const baseWidthSelect = document.getElementById('baseWidth');
const baseDepthInput = document.getElementById('baseDepth');
const depthUnitSelect = document.getElementById('depthUnit');

// Custom Alert
const customAlert = document.getElementById('customAlert');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtn = document.querySelector('#customAlert .close-btn');

// Loading Overlay
const loadingOverlay = document.getElementById('loadingOverlay');

// Content (for blur)
const content = document.getElementById('content');

// Show custom alert
function showCustomAlert(message) {
  alertMessage.textContent = message;
  customAlert.style.display = 'block';
}
closeAlertBtn.addEventListener('click', () => {
  customAlert.style.display = 'none';
});

// Convert base dropdown selection to numeric thickness in meters
function getBaseThicknessInMeters() {
  const val = baseWidthSelect.value;
  switch(val) {
    case '4in_brick': return 4 * 0.0254;
    case '9in_brick': return 9 * 0.0254;
    case '13in_brick': return 13 * 0.0254;
    case '18in_brick': return 18 * 0.0254;
    case '8in_block': return 8 * 0.0254;
    case '18in_block': return 18 * 0.0254;
    case '27in_block': return 27 * 0.0254;
    default: return 0.1;
  }
}

// Base depth from user input
function getBaseDepthInMeters() {
  const val = parseFloat(baseDepthInput.value) || 0;
  return (depthUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}

// Wall height
function getWallHeightInMeters() {
  const val = parseFloat(wallHeightInput.value) || 0;
  return (heightUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}

// Wall thickness
function getWallThicknessInMeters() {
  const val = wallWidthSelect.value;
  switch(val) {
    case '4in_brick': return 4 * 0.0254;
    case '9in_brick': return 9 * 0.0254;
    case '13in_brick': return 13 * 0.0254;
    case '18in_brick': return 18 * 0.0254;
    case '8in_block': return 8 * 0.0254;
    case '18in_block': return 18 * 0.0254;
    case '27in_block': return 27 * 0.0254;
    default: return 0.1;
  }
}

// Which base type? We'll store it, though we always use WallBaseTexture.png in 3D
function getBaseType() {
  const option = baseWidthSelect.options[baseWidthSelect.selectedIndex];
  return option.dataset.wallType; // 'brick' or 'block'
}

// Mouse position
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// Draw grid
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

let hoveredWall = null;

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getMousePos(e);
  lengthForm.style.display = 'none';

  const clickedWall = walls.find(w => isPointOnLine(x, y, w));
  if (clickedWall) {
    if (selectedWall) {
      selectedWall.highlighted = false;
    }
    clickedWall.highlighted = true;
    selectedWall = clickedWall;
    isDragging = true;

    const midX = (clickedWall.x1 + clickedWall.x2) / 2;
    const midY = (clickedWall.y1 + clickedWall.y2) / 2;
    showDeleteButton(midX, midY);
    showThreeDotsButton(midX, midY);
    showEndpoints(clickedWall);
  } else {
    // Starting a new wall
    if (!currentWallType) {
      showCustomAlert('Please select Brick Wall or Block Wall first.');
      return;
    }
    const wh = getWallHeightInMeters();
    if (wh <= 0) {
      showCustomAlert('Wall height must be > 0.');
      return;
    }

    drawing = true;
    currentLine.x1 = x;
    currentLine.y1 = y;
    deleteButton.style.display = 'none';
    threeDotsButton.style.display = 'none';
    if (selectedWall) {
      selectedWall.highlighted = false;
      selectedWall = null;
      redraw();
    }
  }
});

function showEndpoints(wall) {
  endpoint1.style.left = `${wall.x1 + canvas.offsetLeft - 5}px`;
  endpoint1.style.top = `${wall.y1 + canvas.offsetTop - 5}px`;
  endpoint1.style.display = 'block';

  endpoint2.style.left = `${wall.x2 + canvas.offsetLeft - 5}px`;
  endpoint2.style.top = `${wall.y2 + canvas.offsetTop - 5}px`;
  endpoint2.style.display = 'block';

  endpoint1.onmousedown = (ev) => {
    ev.stopPropagation();
    resizingPoint = 'start';
    resizing = true;
  };
  endpoint2.onmousedown = (ev) => {
    ev.stopPropagation();
    resizingPoint = 'end';
    resizing = true;
  };
}

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getMousePos(e);

  if (resizing && selectedWall) {
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

  const isHover = walls.some(w => isPointOnLine(x, y, w));
  canvas.style.cursor = isHover ? 'pointer' : 'crosshair';
  const newHovered = walls.find(w => isPointOnLine(x, y, w)) || null;
  if (newHovered !== hoveredWall) {
    hoveredWall = newHovered;
    redraw();
  }

  if (isDragging && selectedWall) {
    // Drag entire wall
    const midX = (selectedWall.x1 + selectedWall.x2) / 2;
    const midY = (selectedWall.y1 + selectedWall.y2) / 2;
    const dx = x - midX;
    const dy = y - midY;

    selectedWall.x1 += dx;
    selectedWall.y1 += dy;
    selectedWall.x2 += dx;
    selectedWall.y2 += dy;

    redraw();
    const nmx = (selectedWall.x1 + selectedWall.x2) / 2;
    const nmy = (selectedWall.y1 + selectedWall.y2) / 2;
    showDeleteButton(nmx, nmy);
    showThreeDotsButton(nmx, nmy);
    drawEnds();

    endpoint1.style.display = 'none';
    endpoint2.style.display = 'none';
    return;
  }

  if (!drawing) return;

  // Drawing new line
  currentLine.x2 = x;
  currentLine.y2 = y;

  redraw();
  drawLine(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, 'black');

  const lengthPx = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
  const lengthM = lengthPx / PIXELS_PER_METER;
  drawDynamicLength(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, lengthM.toFixed(2), 'm');
});

canvas.addEventListener('mouseup', (e) => {
  if (drawing) {
    drawing = false;
    const { x, y } = getMousePos(e);
    currentLine.x2 = x;
    currentLine.y2 = y;

    const lengthPx = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
    const lengthM = lengthPx / PIXELS_PER_METER;

    const newWall = {
      x1: currentLine.x1,
      y1: currentLine.y1,
      x2: currentLine.x2,
      y2: currentLine.y2,
      lengthMeter: lengthM,
      thickness: getWallThicknessInMeters(),
      baseThickness: getBaseThicknessInMeters(),
      baseDepth: getBaseDepthInMeters(),
      highlighted: false,
      wallType: currentWallType,
      baseType: getBaseType(),
      displayLength: lengthM,
      unitType: 'm'
    };

    walls.push(newWall);
    add3DWall(newWall);
    redraw();
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

lengthValueInput.addEventListener('input', () => {
  if (lengthValueInput.value < 0) {
    lengthValueInput.value = 0;
  }
});

function showThreeDotsButton(x, y) {
  threeDotsButton.style.left = `${x + canvas.offsetLeft + 10}px`;
  threeDotsButton.style.top = `${y + canvas.offsetTop - 30}px`;
  threeDotsButton.style.display = 'block';
}

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

threeDotsButton.addEventListener('click', () => {
  if (!selectedWall) return;
  const leftPos = parseInt(threeDotsButton.style.left, 10);
  const topPos = parseInt(threeDotsButton.style.top, 10) + 35;
  lengthForm.style.left = `${leftPos}px`;
  lengthForm.style.top = `${topPos}px`;
  lengthForm.style.display = 'block';

  if (selectedWall.unitType === 'ft') {
    lengthValueInput.value = selectedWall.displayLength;
    lengthUnitSelect.value = 'ft';
  } else {
    lengthValueInput.value = selectedWall.displayLength;
    lengthUnitSelect.value = 'm';
  }
});

setLengthBtn.addEventListener('click', () => {
  if (!selectedWall) return;

  let newVal = parseFloat(lengthValueInput.value);
  if (isNaN(newVal) || newVal <= 0) {
    showCustomAlert('Please enter a valid length > 0.');
    return;
  }

  const oldLength = selectedWall.lengthMeter;
  if (oldLength === 0) return;

  let newLengthM = newVal;
  if (lengthUnitSelect.value === 'ft') {
    newLengthM = newVal * 0.3048;
  }

  const ratio = newLengthM / oldLength;
  const midX = (selectedWall.x1 + selectedWall.x2) / 2;
  const midY = (selectedWall.y1 + selectedWall.y2) / 2;

  selectedWall.x1 = midX + (selectedWall.x1 - midX) * ratio;
  selectedWall.y1 = midY + (selectedWall.y1 - midY) * ratio;
  selectedWall.x2 = midX + (selectedWall.x2 - midX) * ratio;
  selectedWall.y2 = midY + (selectedWall.y2 - midY) * ratio;

  selectedWall.lengthMeter = newLengthM;
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

function drawLine(x1, y1, x2, y2, color = 'black', thickness = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

function drawWalls() {
  walls.forEach(w => {
    const thickPx = w.thickness * PIXELS_PER_METER;
    drawLine(
      w.x1, w.y1,
      w.x2, w.y2,
      w.highlighted ? 'red' : 'black',
      thickPx
    );
    drawLengthText(w);

    if (w === hoveredWall) {
      drawWallTypeText(w);
    }
  });
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

function drawLengthText(w) {
  const midX = (w.x1 + w.x2) / 2;
  const midY = (w.y1 + w.y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'red';

  let suffix = w.unitType === 'ft' ? ' ft' : ' m';
  let text = w.displayLength.toFixed(2) + suffix;
  ctx.fillText(text, midX, midY - 10);
}

function drawWallTypeText(w) {
  const midX = (w.x1 + w.x2) / 2;
  const midY = (w.y1 + w.y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'green';
  let text = (w.wallType === 'brick') ? 'Brick Wall' : 'Block Wall';
  ctx.fillText(text, midX, midY + 15);
}

function drawDynamicLength(x1, y1, x2, y2, length, unit) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'blue';
  ctx.fillText(`${length} ${unit}`, midX, midY - 10);
}

function isPointOnLine(px, py, w) {
  const tolerance = 5;
  const dist = Math.abs(
    (w.y2 - w.y1) * px -
    (w.x2 - w.x1) * py +
    w.x2 * w.y1 -
    w.y2 * w.x1
  ) / Math.sqrt(
    (w.y2 - w.y1)**2 + (w.x2 - w.x1)**2
  );
  return dist < tolerance;
}

// Update 3D side
document.getElementById('updateWalls').addEventListener('click', () => {
  updateAllWalls();
});

// Brick / Block selection
document.getElementById('brickWall').addEventListener('click', () => {
  if (currentWallType === 'brick') {
    currentWallType = null;
    document.getElementById('brickWall').classList.remove('selected');
  } else {
    currentWallType = 'brick';
    document.getElementById('brickWall').classList.add('selected');
    document.getElementById('blockWall').classList.remove('selected');
  }
  filterWallWidthOptions(currentWallType);
});

document.getElementById('blockWall').addEventListener('click', () => {
  if (currentWallType === 'block') {
    currentWallType = null;
    document.getElementById('blockWall').classList.remove('selected');
  } else {
    currentWallType = 'block';
    document.getElementById('blockWall').classList.add('selected');
    document.getElementById('brickWall').classList.remove('selected');
  }
  filterWallWidthOptions(currentWallType);
});

// Filter wall thickness options
function filterWallWidthOptions(wallType) {
  const options = wallWidthSelect.options;
  let firstVisibleIndex = -1;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (!wallType) {
      // If no type selected, show all
      opt.style.display = 'block';
      if (firstVisibleIndex === -1) firstVisibleIndex = i;
    } else if (opt.dataset.wallType === wallType) {
      opt.style.display = 'block';
      if (firstVisibleIndex === -1) firstVisibleIndex = i;
    } else {
      opt.style.display = 'none';
    }
  }
  if (firstVisibleIndex !== -1) {
    wallWidthSelect.selectedIndex = firstVisibleIndex;
  }
}

// Material Estimation
estimateBtn.addEventListener('click', () => {
  handleEstimateMaterials();
});

function handleEstimateMaterials() {
  const data = calculateMaterialEstimation();
  if (!data) return;
  localStorage.setItem('materialEstimation', JSON.stringify(data));
  loadingOverlay.style.display = 'flex';
  content.style.filter = 'blur(5px)';
  setTimeout(() => {
    window.location.href = 'estimate.html';
  }, 1500);
}

function calculateMaterialEstimation() {
  const wh = getWallHeightInMeters();
  const wt = getWallThicknessInMeters();
  if (wh <= 0 || wt <= 0) {
    showCustomAlert('Please enter valid wall height & thickness first!');
    return null;
  }
  // Brick
  const brickL = 9 * 0.0254, brickW = 4 * 0.0254, brickH = 3 * 0.0254;
  // Block
  const blockL = 18 * 0.0254, blockH_ = 6 * 0.0254, blockW_ = 8 * 0.0254;

  let totalBrickVol = 0, totalBlockVol = 0, totalLen = 0;
  walls.forEach(w => {
    const vol = w.lengthMeter * wh * wt;
    totalLen += w.lengthMeter;
    if (w.wallType === 'brick') totalBrickVol += vol;
    else if (w.wallType === 'block') totalBlockVol += vol;
  });

  const brickVol = brickL * brickW * brickH;
  const blockVol = blockL * blockH_ * blockW_;

  const numBricks = Math.ceil(totalBrickVol / brickVol);
  const numBlocks = Math.ceil(totalBlockVol / blockVol);

  const mortarVolB = 0.2 * totalBrickVol;
  const mortarVolBl = 0.2 * totalBlockVol;
  const totalMortar = mortarVolB + mortarVolBl;

  const cementVol = totalMortar / 6;
  const sandVol = (5 * totalMortar) / 6;
  const bagsCement = Math.ceil(cementVol / 0.035);

  return {
    totalLength: totalLen.toFixed(2),
    numberOfWalls: walls.length,
    height: wh.toFixed(2),
    brickWalls: {
      volume: totalBrickVol.toFixed(2),
      bricksRequired: numBricks
    },
    blockWalls: {
      volume: totalBlockVol.toFixed(2),
      blocksRequired: numBlocks
    },
    mortar: {
      totalVolume: totalMortar.toFixed(2),
      cementBags: bagsCement,
      sandVolume: sandVol.toFixed(2)
    }
  };
}

// Send newly drawn wall to 3D
function add3DWall(wall) {
  const ev = new CustomEvent('add-wall', { detail: wall });
  window.dispatchEvent(ev);
}

// Update all walls in 3D
function updateAllWalls() {
  const ev = new CustomEvent('update-all-walls', { detail: { walls } });
  window.dispatchEvent(ev);
}

canvas.addEventListener('mouseleave', () => {
  canvas.style.cursor = 'default';
  if (hoveredWall) {
    hoveredWall = null;
    redraw();
  }
});
