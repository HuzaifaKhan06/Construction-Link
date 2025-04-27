const canvas = document.getElementById('2d-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight / 2;

const PIXELS_PER_METER = 20;

let walls = [];
window.walls = walls; // Expose walls globally for roof calculations

let drawing = false;
let currentLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
let selectedWall = null;
let isDragging = false;

// Current wall type
let currentWallType = null; // 'brick' or 'block'

// For resizing endpoints
let resizing = false;
let resizingPoint = null;

// Global flag for beam & column mode
let beamColumnActive = false;
window.beamColumnActive = beamColumnActive; // for 3D references if needed

// Undo stack
let undoStack = [];
function pushState() {
  const stateCopy = JSON.parse(JSON.stringify(walls));
  undoStack.push(stateCopy);
}
function undo() {
  if (undoStack.length > 1) {
    undoStack.pop();
    walls = JSON.parse(JSON.stringify(undoStack[undoStack.length - 1]));
    window.walls = walls;
    redraw();
    updateAllWalls();
  }
}
pushState();

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }
});

const deleteButton = document.createElement('button');
deleteButton.className = 'delete-button';
deleteButton.innerHTML = 'X';
document.body.appendChild(deleteButton);

const endpoint1 = document.createElement('div');
const endpoint2 = document.createElement('div');
endpoint1.className = 'endpoint';
endpoint2.className = 'endpoint';
document.body.appendChild(endpoint1);
document.body.appendChild(endpoint2);

const threeDotsButton = document.createElement('button');
threeDotsButton.className = 'three-dots-button';
threeDotsButton.innerHTML = '...';
document.body.appendChild(threeDotsButton);

const lengthForm = document.getElementById('lengthForm');
const lengthValueInput = document.getElementById('lengthValue');
const lengthUnitSelect = document.getElementById('lengthUnit');
const setLengthBtn = document.getElementById('setLengthBtn');

const estimateBtn = document.getElementById('estimateMaterials');

const wallHeightInput = document.getElementById('wallHeight');
const heightUnitSelect = document.getElementById('heightUnit');
const wallWidthSelect = document.getElementById('wallWidth');
const baseWidthSelect = document.getElementById('baseWidth');
const baseDepthInput = document.getElementById('baseDepth');
const depthUnitSelect = document.getElementById('depthUnit');

const customAlert = document.getElementById('customAlert');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtn = document.querySelector('#customAlert .close-btn');

const loadingOverlay = document.getElementById('loadingOverlay');
const content = document.getElementById('content');

const addDoorBtn = document.getElementById('addDoor');
const addWindowBtn = document.getElementById('addWindow');

const doorModal = document.getElementById('doorModal');
const closeDoorModal = document.getElementById('closeDoorModal');
const doorWidthInput = document.getElementById('doorWidthInput');
const doorHeightInput = document.getElementById('doorHeightInput');
const doorUnitSelect = document.getElementById('doorUnitSelect');
const doorSideSelect = document.getElementById('doorSideSelect');
const submitDoorBtn = document.getElementById('submitDoorBtn');

const windowModal = document.getElementById('windowModal');
const closeWindowModal = document.getElementById('closeWindowModal');
const windowWidthInput = document.getElementById('windowWidthInput');
const windowHeightInput = document.getElementById('windowHeightInput');
const windowUnitSelect = document.getElementById('windowUnitSelect');
const windowPositionSelect = document.getElementById('windowPositionSelect');
const submitWindowBtn = document.getElementById('submitWindowBtn');

function showCustomAlert(message) {
  alertMessage.textContent = message;
  customAlert.style.display = 'block';
}
closeAlertBtn.addEventListener('click', () => {
  customAlert.style.display = 'none';
});

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
function getBaseDepthInMeters() {
  const val = parseFloat(baseDepthInput.value) || 0;
  return (depthUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}
function getWallHeightInMeters() {
  const val = parseFloat(wallHeightInput.value) || 0;
  return (heightUnitSelect.value === 'ft') ? (val * 0.3048) : val;
}
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
function getBaseType() {
  const option = baseWidthSelect.options[baseWidthSelect.selectedIndex];
  return option.dataset.wallType;
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

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

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getMousePos(e);
  lengthForm.style.display = 'none';

  if (currentWallType) {
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
  } else {
    const clickedWall = walls.find(w => isPointOnLine(x, y, w));
    if (clickedWall) {
      if (selectedWall) selectedWall.highlighted = false;
      clickedWall.highlighted = true;
      selectedWall = clickedWall;
      isDragging = true;

      const midX = (clickedWall.x1 + clickedWall.x2) / 2;
      const midY = (clickedWall.y1 + clickedWall.y2) / 2;
      showDeleteButton(midX, midY);
      showThreeDotsButton(midX, midY);
      showEndpoints(clickedWall);
    } else {
      showCustomAlert('Please select Brick Wall or Block Wall first.');
    }
  }
});

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

  const newHovered = walls.find(w => isPointOnLine(x, y, w)) || null;
  if (newHovered !== hoveredWall) {
    hoveredWall = newHovered;
    redraw();
  }
  canvas.style.cursor = hoveredWall ? 'pointer' : 'crosshair';

  if (isDragging && selectedWall) {
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

  if (drawing) {
    currentLine.x2 = x;
    currentLine.y2 = y;
    redraw();
    drawLine(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, 'black');
    const lengthPx = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
    const lengthM = lengthPx / PIXELS_PER_METER;
    drawDynamicLength(currentLine.x1, currentLine.y1, currentLine.x2, currentLine.y2, lengthM.toFixed(2), 'm');
  }
});

canvas.addEventListener('mouseup', () => {
  if (drawing) {
    drawing = false;
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
      unitType: 'm',
      hasBeamColumn: false,
      door: null,
      windows: []
    };
    walls.push(newWall);
    window.walls = walls;
    add3DWall(newWall);
    redraw();
    pushState();
  } else if (isDragging) {
    pushState();
  }
  isDragging = false;
  resizing = false;
});

document.addEventListener('mouseup', () => {
  resizing = false;
});

canvas.addEventListener('mouseleave', () => {
  canvas.style.cursor = 'default';
  if (hoveredWall) {
    hoveredWall = null;
    redraw();
  }
});

function drawGridAndWalls() {
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
      if (w.hasBeamColumn) {
        drawBeamColumn2D(w);
      }
    }
    if (w.door) {
      drawDoorCutout(w);
    }
    if (w.windows && w.windows.length > 0) {
      w.windows.forEach(win => drawWindowCutout(w, win));
    }
  });
}
function drawBeamColumn2D(wall) {
  ctx.save();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wall.x1, wall.y1);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'red';
  const size = 6;
  ctx.fillRect(wall.x1 - size/2, wall.y1 - size/2, size, size);
  ctx.fillRect(wall.x2 - size/2, wall.y2 - size/2, size, size);
}
function drawLengthText(w) {
  const midX = (w.x1 + w.x2) / 2;
  const midY = (w.y1 + w.y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'red';
  const suffix = w.unitType === 'ft' ? ' ft' : ' m';
  const text = w.displayLength.toFixed(2) + suffix;
  ctx.fillText(text, midX, midY - 10);
}
function drawWallTypeText(w) {
  const midX = (w.x1 + w.x2) / 2;
  const midY = (w.y1 + w.y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'green';
  const text = (w.wallType === 'brick') ? 'Brick Wall' : 'Block Wall';
  ctx.fillText(text, midX, midY + 15);
}
function drawDynamicLength(x1, y1, x2, y2, length, unit) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  ctx.font = '12px Arial';
  ctx.fillStyle = 'blue';
  ctx.fillText(`${length} ${unit}`, midX, midY - 10);
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
function redraw() {
  drawGridAndWalls();
}

// Draw door cutout (single) in 2D
function drawDoorCutout(wall) {
  let fraction;
  switch (wall.door.side) {
    case 'left': fraction = 0.25; break;
    case 'center': fraction = 0.5; break;
    case 'right': fraction = 0.75; break;
    default: fraction = 0.5;
  }
  const midX = wall.x1 + fraction * (wall.x2 - wall.x1);
  const midY = wall.y1 + fraction * (wall.y2 - wall.y1);
  const doorWidthPx = wall.door.width * PIXELS_PER_METER;
  const doorHeightPx = wall.door.height * PIXELS_PER_METER;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(midX - doorWidthPx/2, midY - doorHeightPx/2, doorWidthPx, doorHeightPx);
  ctx.fillStyle = 'white';
  ctx.font = '10px Arial';
  ctx.fillText('D', midX - 3, midY + 3);
  ctx.restore();
}
// Draw window cutout (single) in 2D
function drawWindowCutout(wall, win) {
  let fraction;
  switch (win.position) {
    case 'left': fraction = 0.25; break;
    case 'center': fraction = 0.5; break;
    case 'right': fraction = 0.75; break;
    default: fraction = 0.5;
  }
  const midX = wall.x1 + fraction * (wall.x2 - wall.x1);
  const midY = wall.y1 + fraction * (wall.y2 - wall.y1);
  const winWidthPx = win.width * PIXELS_PER_METER;
  const winHeightPx = win.height * PIXELS_PER_METER;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(midX - winWidthPx/2, midY - winHeightPx/2, winWidthPx, winHeightPx);
  ctx.fillStyle = 'white';
  ctx.font = '10px Arial';
  ctx.fillText('W', midX - 3, midY + 3);
  ctx.restore();
}

deleteButton.addEventListener('click', () => {
  if (selectedWall) {
    walls = walls.filter(w => w !== selectedWall);
    window.walls = walls;
    redraw();
    updateAllWalls();
    endpoint1.style.display = 'none';
    endpoint2.style.display = 'none';
    threeDotsButton.style.display = 'none';
    pushState();
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
  pushState();
  lengthForm.style.display = 'none';
});

document.getElementById('updateWalls').addEventListener('click', () => {
  updateAllWalls();
});
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

function filterWallWidthOptions(wallType) {
  const options = wallWidthSelect.options;
  let firstVisibleIndex = -1;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (!wallType) {
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

estimateBtn.addEventListener('click', () => {
  handleEstimateMaterials();
});
function handleEstimateMaterials() {
// ▶▶ ADDED ▶▶ save full design state (2D + beam/roof/floor) in sessionStorage
sessionStorage.setItem('designData', JSON.stringify({
  walls: walls,
  beamColumnActive: beamColumnActive,
  roofData: window.roofData || null,
  floorData: window.floorData || null
}));

  const data = calculateMaterialEstimation();
  if (!data) return;
  localStorage.setItem('materialEstimation', JSON.stringify(data));
  loadingOverlay.style.display = 'flex';
  content.style.filter = 'blur(5px)';
  setTimeout(() => {
    window.location.href = 'estimate.html';
  }, 1500);
}

/* Updated Material Estimation Function */
function calculateMaterialEstimation() {
  const wh = getWallHeightInMeters();
  const wt = getWallThicknessInMeters();
  if (wh <= 0 || wt <= 0) {
    showCustomAlert('Please enter valid wall height & thickness first!');
    return null;
  }

  // Brick and Block dimensions (assumed average brick/block dimensions)
  const brickL = 9 * 0.0254, brickW = 4 * 0.0254, brickH = 3 * 0.0254;
  const blockL = 18 * 0.0254, blockW_ = 8 * 0.0254, blockH_ = 6 * 0.0254;
  let totalBrickVol = 0, totalBlockVol = 0, totalLen = 0;

  // Sum volumes for the base concrete (for all walls)
  let totalBaseVolume = 0;

  // 1) Loop over each wall and subtract door/window cutouts from wall volume
  walls.forEach(w => {
    // A) Wall volume
    let wallArea = w.lengthMeter * wh; // original wall area in m²
    let cutoutArea = 0;
    if (w.door) {
      cutoutArea += w.door.width * w.door.height;
    }
    if (w.windows && w.windows.length > 0) {
      w.windows.forEach(win => {
        cutoutArea += win.width * win.height;
      });
    }
    let effectiveArea = Math.max(wallArea - cutoutArea, 0);
    let effectiveVolume = effectiveArea * wt;
    totalLen += w.lengthMeter;

    if (w.wallType === 'brick') {
      totalBrickVol += effectiveVolume;
    } else if (w.wallType === 'block') {
      totalBlockVol += effectiveVolume;
    }

    // B) Base volume (if baseDepth > 0 and baseThickness > 0)
    if (w.baseDepth > 0 && w.baseThickness > 0) {
      // Volume = length * baseThickness * baseDepth
      const baseVol = w.lengthMeter * w.baseThickness * w.baseDepth;
      totalBaseVolume += baseVol;
    }
  });

  // 2) Convert brick/block volume to # of bricks/blocks
  const brickVol = brickL * brickW * brickH;
  const blockVol = blockL * blockW_ * blockH_;
  const numBricks = Math.ceil(totalBrickVol / brickVol);
  const numBlocks = Math.ceil(totalBlockVol / blockVol);

  // 3) Mortar volume for walls (assume 20% extra volume for bonding)
  const mortarVolBricks = 0.2 * totalBrickVol;
  const mortarVolBlocks = 0.2 * totalBlockVol;
  const totalMortar = mortarVolBricks + mortarVolBlocks;
  // Mix ratio for mortar (1:6). That means totalMortar = cement + sand
  const cementVolForMortar = totalMortar / 6;
  const sandMortar = (5 * totalMortar) / 6;
  // 1 bag ~ 0.035 m³
  const bagsCementMortar = Math.ceil(cementVolForMortar / 0.035);

  // 4) Beam estimation (volume + rods). 
  //    We assume a standard 0.3m x 0.3m cross-section for the beam.
  //    "beamTotalLength" is the sum of lengths of walls that have hasBeamColumn = true.
  let beamTotalLength = 0;
  walls.forEach(w => {
    if (w.hasBeamColumn) {
      beamTotalLength += w.lengthMeter;
    }
  });
  const beamCrossSection = 0.3 * 0.3; // 0.09 m²
  const beamVolume = beamCrossSection * beamTotalLength; 
  // Concrete ratio 1:2:4 => total 7 parts
  const cementVolBeam = beamVolume / 7;
  const sandBeam = (2 * beamVolume) / 7;
  const crushBeam = (4 * beamVolume) / 7;
  const bagsCementBeam = Math.ceil(cementVolBeam / 0.035);

  // Steel rods for beams:
  //  Let's store the diameter the same as roof rods if roof was added, 
  //  or default to 16 mm if not set.
  let beamRodDiameter = 16;
  if (window.roofData && window.roofData.steelRodDiameter) {
    beamRodDiameter = window.roofData.steelRodDiameter;
  }
  // for beams, assume 4 rods per meter of beam length:
  let beamSteelRods = Math.ceil(beamTotalLength) * 4;

  // 5) Roof estimation 
  //    If user added a roof, we'll compute roof volume from the extruded shape (area * thickness).
  //    We stored "roofData" in the 3D script, which includes polygon rodsCount, thicknessInches, etc.
  let roofVolume = 0;
  let roofRodCount = 0;
  let roofRodDiameter = 0;
  if (window.roofData) {
    roofRodCount = window.roofData.rodsCount;
    roofRodDiameter = window.roofData.steelRodDiameter || 16;
    // Approx roof area from extrude geometry:
    // Because we only store rodCount & thicknessInches, let's do a simpler approach:
    // We can store roofData.roofArea if needed, but we didn't. Let's estimate from rodsCount:
    // Instead, let's do a rough guess: rodsCount is the number of polygon vertices. 
    // For a more accurate approach, we could store area in roofData, but let's assume user wants a simpler approach.
    // We'll do an approximate approach or store it if you wish. 
    // If you prefer a real approach, the 3D code would have to store shapePoints area. 
    // Let's assume shapePoints area is in roofData.roofArea if we updated 3D code. 
    // For now, let's do a sample approach: if you want an actual approach, store it in roofData.

    if (window.roofData.roofArea) {
      // Real approach if stored
      const thicknessM = window.roofData.thicknessInches * 0.0254;
      roofVolume = window.roofData.roofArea * thicknessM;
    } else {
      // fallback: assume each side is ~3m, rodsCount sides => perimeter = 3 * rodsCount, area ~ perimeter² / (4π)? 
      // We'll just do a rough small number if not stored.
      roofVolume = 0; 
    }
  }
  // If we want to compute materials for the roof slab:
  // ratio 1:2:4 => total 7 parts
  const cementVolRoof = roofVolume / 7;
  const sandRoof = (2 * roofVolume) / 7;
  const crushRoof = (4 * roofVolume) / 7;
  const bagsCementRoof = Math.ceil(cementVolRoof / 0.035);

  // 6) Floor estimation 
  //    We do have window.floorData area & thicknessInches. So let's compute it properly.
  let floorVolume = 0;
  let floorArea = 0;
  let floorRodCount = 0; // if you want to add rebar in floor
  let floorRodDiameter = 0;
  if (window.floorData) {
    floorArea = window.floorData.area; // m²
    const floorThickness = window.floorData.thicknessInches * 0.0254; 
    floorVolume = floorArea * floorThickness;
    // If you want floor steel rods:
    // For example, assume you have 1 rod per meter in each direction => floorRodCount = floorArea * 2.
    floorRodCount = Math.ceil(floorArea * 2);
    // default diameter or same as beam if you want
    floorRodDiameter = beamRodDiameter; 
  }
  // ratio 1:2:4 for floor
  const cementVolFloor = floorVolume / 7;
  const sandFloor = (2 * floorVolume) / 7;
  const crushFloor = (4 * floorVolume) / 7;
  const bagsCementFloor = Math.ceil(cementVolFloor / 0.035);

  // 7) Base concrete: ratio 1:2:4
  const cementVolBase = totalBaseVolume / 7;
  const sandBase = (2 * totalBaseVolume) / 7;
  const crushBase = (4 * totalBaseVolume) / 7;
  const bagsCementBase = Math.ceil(cementVolBase / 0.035);

  // 8) Summation of everything for a "Total" section
  // We'll accumulate total cement (for mortar, beams, roof, floor, base),
  // total sand, total crush, total rods.
  const totalCementBags =
    bagsCementMortar +
    bagsCementBeam +
    bagsCementRoof +
    bagsCementFloor +
    bagsCementBase;

  const totalSand =
    parseFloat(sandMortar.toFixed(2)) +
    sandBeam +
    sandRoof +
    sandFloor +
    sandBase;

  const totalCrush =
    crushBeam +
    crushRoof +
    crushFloor +
    crushBase;

  // For rods, we sum the beams rods, roof rods, floor rods
  // (Walls might also have rods if you want, but not in our approach.)
  const totalSteelRods =
    beamSteelRods +
    roofRodCount +
    floorRodCount;

  // Return the entire object so it can be displayed in estimate.html
  return {
    // Basic design summary
    totalLength: totalLen.toFixed(2),
    numberOfWalls: walls.length,
    height: wh.toFixed(2),

    // Brick/Block walls
    brickWalls: {
      volume: totalBrickVol.toFixed(2),
      bricksRequired: numBricks
    },
    blockWalls: {
      volume: totalBlockVol.toFixed(2),
      blocksRequired: numBlocks
    },

    // Mortar for walls
    mortar: {
      totalVolume: totalMortar.toFixed(2),
      cementBags: bagsCementMortar,
      sandVolume: sandMortar.toFixed(2)
    },

    // Base concrete
    base: {
      volume: totalBaseVolume.toFixed(2),
      cementBags: bagsCementBase,
      sandVolume: sandBase.toFixed(2),
      crushVolume: crushBase.toFixed(2)
    },

    // Beam
    beams: {
      totalLength: beamTotalLength.toFixed(2),
      volume: beamVolume.toFixed(2),
      cementBags: bagsCementBeam,
      sandVolume: sandBeam.toFixed(2),
      crushVolume: crushBeam.toFixed(2),
      steelRods: beamSteelRods,
      rodDiameter: beamRodDiameter
    },

    // Roof
    roof: {
      volume: roofVolume.toFixed(2),
      cementBags: bagsCementRoof,
      sandVolume: sandRoof.toFixed(2),
      crushVolume: crushRoof.toFixed(2),
      steelRods: roofRodCount,
      rodDiameter: roofRodDiameter
    },

    // Floor
    floor: {
      area: floorArea.toFixed(2),
      volume: floorVolume.toFixed(2),
      cementBags: bagsCementFloor,
      sandVolume: sandFloor.toFixed(2),
      crushVolume: crushFloor.toFixed(2),
      steelRods: floorRodCount,
      rodDiameter: floorRodDiameter
    },

    // Totals
    total: {
      cementBags: totalCementBags,
      sandVolume: totalSand.toFixed(2),
      crushVolume: totalCrush.toFixed(2),
      steelRods: totalSteelRods
    }
  };
}

const beamColumnBtn = document.getElementById('beamColumn');
beamColumnBtn.addEventListener('click', () => {
  walls.forEach(w => {
    w.hasBeamColumn = true;
  });
  beamColumnActive = true;
  window.beamColumnActive = true;
  const event = new CustomEvent('add-beam-column', { detail: { walls } });
  window.dispatchEvent(event);
  redraw();
});
function add3DWall(wall) {
  const ev = new CustomEvent('add-wall', { detail: wall });
  window.dispatchEvent(ev);
}
function updateAllWalls() {
  const ev = new CustomEvent('update-all-walls', { detail: { walls } });
  window.dispatchEvent(ev);
  if (beamColumnActive) {
    const ev2 = new CustomEvent('add-beam-column', { detail: { walls } });
    window.dispatchEvent(ev2);
  }
}

addDoorBtn.addEventListener('click', () => {
  if (!selectedWall) {
    showCustomAlert('Please select a wall first.');
    return;
  }
  doorModal.style.display = 'block';
});
closeDoorModal.addEventListener('click', () => {
  doorModal.style.display = 'none';
});
submitDoorBtn.addEventListener('click', () => {
  if (!selectedWall) return;
  const dWidth = parseFloat(doorWidthInput.value);
  const dHeight = parseFloat(doorHeightInput.value);
  if (isNaN(dWidth) || dWidth <= 0 || isNaN(dHeight) || dHeight <= 0) {
    showCustomAlert('Please enter valid door dimensions.');
    return;
  }
  let doorWidthM = dWidth;
  let doorHeightM = dHeight;
  if (doorUnitSelect.value === 'ft') {
    doorWidthM = dWidth * 0.3048;
    doorHeightM = dHeight * 0.3048;
  }
  selectedWall.door = {
    width: doorWidthM,
    height: doorHeightM,
    side: doorSideSelect.value
  };
  redraw();
  updateAllWalls();
  pushState();
  doorModal.style.display = 'none';
});

addWindowBtn.addEventListener('click', () => {
  if (!selectedWall) {
    showCustomAlert('Please select a wall first.');
    return;
  }
  windowModal.style.display = 'block';
});
closeWindowModal.addEventListener('click', () => {
  windowModal.style.display = 'none';
});
submitWindowBtn.addEventListener('click', () => {
  if (!selectedWall) return;
  const wWidth = parseFloat(windowWidthInput.value);
  const wHeight = parseFloat(windowHeightInput.value);
  if (isNaN(wWidth) || wWidth <= 0 || isNaN(wHeight) || wHeight <= 0) {
    showCustomAlert('Please enter valid window dimensions.');
    return;
  }
  let windowWidthM = wWidth;
  let windowHeightM = wHeight;
  if (windowUnitSelect.value === 'ft') {
    windowWidthM = wWidth * 0.3048;
    windowHeightM = wHeight * 0.3048;
  }
  const windowData = {
    width: windowWidthM,
    height: windowHeightM,
    position: windowPositionSelect.value
  };
  if (!selectedWall.windows) {
    selectedWall.windows = [];
  }
  selectedWall.windows.push(windowData);
  redraw();
  updateAllWalls();
  pushState();
  windowModal.style.display = 'none';
});


// ▶▶ ADDED ▶▶ Restore design from sessionStorage on load
function restoreDesign() {
  const saved = sessionStorage.getItem('designData');
  if (!saved) return;
  try {
    const design = JSON.parse(saved);
    // 2D state
    walls = design.walls || [];
    window.walls = walls;
    // beam/column
    beamColumnActive = design.beamColumnActive;
    window.beamColumnActive = beamColumnActive;
    // roof & floor
    window.roofData = design.roofData || null;
    window.floorData = design.floorData || null;

    // redraw 2D view
    redraw();
    // dispatch to 3D
    updateAllWalls();
    // roof
    if (design.roofData && window.createRoof3D) {
      window.createRoof3D(
        design.roofData.thicknessInches,
        design.roofData.steelRodDiameter,
        design.roofData.marginFeet
      );
    }
    // floor
    if (design.floorData && window.createFloor3D) {
      window.createFloor3D(design.floorData.thicknessInches);
    }
  } catch (err) {
    console.error('▶▶ ADDED ▶▶ failed to restore design:', err);
  }
}
document.addEventListener('DOMContentLoaded', restoreDesign);

// ▶▶ NEW ▶▶ Load saved design into the local walls array
function loadDesign(data) {
  // 1) Replace the local `walls` array contents
  walls.length = 0;
  if (Array.isArray(data.walls)) {
    data.walls.forEach(w => walls.push(w));
  }

  // 2) Sync flags and extra data
  beamColumnActive = data.beamColumnActive || false;
  window.beamColumnActive = beamColumnActive;
  window.roofData  = data.roofData  || null;
  window.floorData = data.floorData || null;

  // 3) Redraw 2D and notify 3D
  redraw();
  updateAllWalls();
}

// ▶▶ NEW ▶▶ Expose it so the loader can call it
window.loadDesign       = loadDesign;

// ▶▶ ENSURE THESE EXIST ▶▶ expose your redraw/update functions
window.redraw           = redraw;
window.updateAllWalls   = updateAllWalls;