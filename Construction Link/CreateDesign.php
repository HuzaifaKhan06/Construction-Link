<?php
session_start();

// If they've just come from the design page, kill off the design session.
if (isset($_GET['from_design']) && $_GET['from_design'] == '1') {
    session_unset();
    session_destroy();
    header('Location: Login.php');
    exit();
}

// Inactivity timeout (15 min)
$timeout = 900;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY']) > $timeout) {
    session_unset();
    session_destroy();
    header('Location: Login.php');
    exit();
}
$_SESSION['LAST_ACTIVITY'] = time();

// Login guard
if (!isset($_SESSION['user_id'])) {
    header('Location: Login.php');
    exit();
}
$userId = $_SESSION['user_id'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>2D and 3D House Modeling</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      display: flex;
      height: 100vh;
      background-color: #f4f4f4;
      overflow: hidden;
    }

    #content {
      display: flex;
      flex: 1;
      transition: filter 0.3s ease;
    }

    .sidebar {
      width: 220px; /* Slightly wider sidebar */
      background-color: #2C3E50;
      padding: 15px; /* More padding */
      box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .sidebar input, .sidebar button, .sidebar select {
      width: 100%;
      border: none;
      border-radius: 5px;
      font-size: 13px;
    }

    .sidebar input {
      background-color: #ecf0f1;
      color: #2C3E50;
      height: 20px; /* Slightly taller */
      padding: 6px;
    }

    .sidebar select {
      background-color: #ffffff;
      color: #2C3E50;
      height: 32px; /* Slightly taller */
      padding: 3px 6px;
    }

    .sidebar button {
      background-color: #e67e22;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
      height: 30px; /* Taller buttons */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      font-weight: 500;
    }
    
    .sidebar button:hover {
      background-color: #d35400;
    }
    
    .sidebar button.selected {
      background-color: #2980B9;
    }

    /* Top buttons styling */
    .top-buttons {
      margin-bottom: 12px; /* Increased spacing */
    }
    
    .top-buttons button {
      margin-bottom: 8px; /* Increased spacing between buttons */
    }

    /* Form group styling */
    .form-group {
      margin-bottom: 12px; /* Increased spacing between groups */
    }

    /* Unit row layout */
    .unit-row {
      display: flex;
      gap: 8px; /* Increased gap */
      margin-bottom: 8px; /* Added spacing */
    }

    .unit-row input {
      flex: 1;
    }

    .unit-row select {
      width: 85px; /* Slightly wider */
    }

    /* Grid layout for action buttons */
    .action-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px; /* Increased gap */
      width: 100%;
      margin-top: 12px; /* Increased top margin */
    }

    /* Full width buttons */
    .full-width {
      grid-column: span 2;
      margin-bottom: 4px; /* Space between full-width buttons */
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .canvas-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    #2d-canvas {
      width: 100%;
      height: 50%;
      background-color: white;
      border-bottom: 2px solid #ecf0f1;
    }
    
    #threejs-canvas {
      width: 100%;
      height: 50%;
      background-color: white;
    }

    .delete-button {
      position: absolute;
      width: 20px;
      height: 20px;
      background-color: red;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: none;
      z-index: 1000;
    }
    
    .endpoint {
      width: 10px;
      height: 10px;
      background-color: blue;
      border-radius: 50%;
      position: absolute;
      display: none;
      z-index: 1000;
    }
    
    .three-dots-button {
      position: absolute;
      width: 30px;
      height: 30px;
      background-color: #666;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      display: none;
      font-size: 18px;
      line-height: 0.9;
      z-index: 1000;
    }

    /* Small form for editing length */
    #lengthForm {
      position: absolute;
      display: none;
      background-color: #fff;
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 5px;
      width: 150px;
      z-index: 999;
    }
    
    #lengthForm label {
      font-size: 12px;
      margin-right: 5px;
    }
    
    #lengthForm input, #lengthForm select {
      width: 100%;
      margin-bottom: 8px;
      padding: 5px;
      box-sizing: border-box;
    }
    
    #lengthForm button {
      background-color: #e67e22;
      color: white;
      cursor: pointer;
      border: none;
      border-radius: 3px;
      width: 100%;
      padding: 5px;
    }
    
    #lengthForm button:hover {
      background-color: #d35400;
    }

    /* Custom Alert Modal */
    #customAlert {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ffdddd;
      color: #a94442;
      padding: 15px 20px;
      border: 1px solid #a94442;
      border-radius: 5px;
      display: none;
      z-index: 1001;
      min-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    #customAlert .close-btn {
      position: absolute;
      top: 5px;
      right: 10px;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #a94442;
    }
    
    #customAlert p {
      margin: 0;
      padding-right: 20px;
    }

    /* Loading Overlay */
    #loadingOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    
    #loadingOverlay img {
      width: 100px;
      height: 100px;
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 3000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
      background-color: #ffffff;
      margin: 10% auto;
      padding: 30px 20px;
      border-radius: 8px;
      width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .modal-content h2 {
      margin-top: 0;
      text-align: center;
      color: #333;
      font-weight: 600;
    }
    
    .modal-content label {
      display: block;
      margin-top: 15px;
      color: #555;
      font-size: 14px;
    }
    
    .modal-content input,
    .modal-content select {
      width: 100%;
      padding: 8px 10px;
      margin-top: 5px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .modal-content button {
      width: 100%;
      padding: 10px;
      margin-top: 20px;
      background-color: #2980B9;
      border: none;
      color: #fff;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .modal-content button:hover {
      background-color: #1F6391;
    }
    
    .close {
      position: absolute;
      top: 12px;
      right: 16px;
      color: #aaa;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .close:hover,
    .close:focus {
      color: #000;
      text-decoration: none;
    }
    
    .project-modal .modal-content {
      width: 300px;
    }
  </style>
</head>
<body>
<script>
    // Inject the PHP session user_id into JS
    window.USER_ID = <?php echo json_encode($userId, JSON_NUMERIC_CHECK); ?>;
  </script>
  <div id="content">
    <div class="sidebar">
      <!-- Project buttons -->
      <div class="top-buttons">
        <button id="btnNewProject">+ New Project</button>
        <button id="btnSavedProjects">Saved Projects</button>
        <button id="btnExport">Export</button>
      </div>
      
      <!-- Height input group -->
      <div class="form-group">
        <div class="unit-row">
          <input type="number" id="wallHeight" placeholder="Height" min="0" />
          <select id="heightUnit">
            <option value="m">Meter</option>
            <option value="ft">Foot</option>
          </select>
        </div>
      </div>

      <!-- Wall thickness -->
      <div class="form-group">
        <select id="wallWidth">
          <option value="4in_brick" data-wall-type="brick">04 Inch Brick Wall</option>
          <option value="9in_brick" data-wall-type="brick">09 Inch Brick Wall</option>
          <option value="13in_brick" data-wall-type="brick">13 Inch Brick Wall</option>
          <option value="18in_brick" data-wall-type="brick">18 Inch Brick Wall</option>
          <option value="8in_block" data-wall-type="block">08 Inch Block Wall</option>
          <option value="18in_block" data-wall-type="block">18 Inch Block Wall</option>
          <option value="27in_block" data-wall-type="block">27 Inch Block Wall</option>
        </select>
      </div>

      <!-- Wall base -->
      <div class="form-group">
        <select id="baseWidth">
          <option value="4in_brick" data-wall-type="brick">04 Inch Brick Base</option>
          <option value="9in_brick" data-wall-type="brick">09 Inch Brick Base</option>
          <option value="13in_brick" data-wall-type="brick">13 Inch Brick Base</option>
          <option value="18in_brick" data-wall-type="brick">18 Inch Brick Base</option>
          <option value="8in_block" data-wall-type="block">08 Inch Block Base</option>
          <option value="18in_block" data-wall-type="block">18 Inch Block Base</option>
          <option value="27in_block" data-wall-type="block">27 Inch Block Base</option>
        </select>
      </div>

      <!-- Depth input group -->
      <div class="form-group">
        <div class="unit-row">
          <input type="number" id="baseDepth" placeholder="Depth" min="0" />
          <select id="depthUnit">
            <option value="m">Meter</option>
            <option value="ft">Foot</option>
          </select>
        </div>
      </div>

      <!-- Action buttons in grid layout -->
      <div class="action-buttons">
        <button id="addRoof" class="full-width">Add Roof</button>
        <button id="beamColumn" class="full-width">Beam & Column</button>
        <button id="brickWall">Brick Wall</button>
        <button id="blockWall">Block Wall</button>
        <button id="addDoor">Add Door</button>
        <button id="addWindow">Add Window</button>
        <button id="updateWalls" class="full-width">Update Walls</button>
        <button id="estimateMaterials" class="full-width">Estimate Materials</button>
        <button id="addFloor" class="full-width">Add Floor</button>
      </div>
    </div>

    <div class="main">
      <div class="canvas-container">
        <canvas id="2d-canvas"></canvas>
        <div id="threejs-canvas"></div>
      </div>
    </div>
  </div>

  <!-- Hidden form for editing length -->
  <div id="lengthForm">
    <label for="lengthValue">Length:</label>
    <input type="number" id="lengthValue" placeholder="0" min="0" />
    <select id="lengthUnit">
      <option value="m">Meter</option>
      <option value="ft">Foot</option>
    </select>
    <button id="setLengthBtn">Set Length</button>
  </div>

  <!-- Custom Alert Modal -->
  <div id="customAlert">
    <button class="close-btn">&times;</button>
    <p id="alertMessage">This is an alert message.</p>
  </div>

  <!-- Loading Overlay -->
  <div id="loadingOverlay">
    <img src="imgs/loading-spinner.gif" alt="Loading..." />
  </div>

  <!-- Roof Modal -->
  <div id="roofModal" class="modal">
    <div class="modal-content">
      <span class="close" id="closeRoofModal">&times;</span>
      <h2>Add Roof</h2>
      <label for="roofWidthInput">Roof Thickness (in inches):</label>
      <input type="number" id="roofWidthInput" placeholder="Enter thickness" min="1" />
      <label for="steelRodSelect">Steel Rod Diameter (mm):</label>
      <select id="steelRodSelect">
        <option value="10">10 mm</option>
        <option value="12">12 mm</option>
        <option value="14">14 mm</option>
        <option value="16">16 mm</option>
        <option value="18">18 mm</option>
        <option value="20">20 mm</option>
        <option value="22">22 mm</option>
        <option value="24">24 mm</option>
        <option value="26">26 mm</option>
        <option value="28">28 mm</option>
        <option value="30">30 mm</option>
        <option value="32">32 mm</option>
        <option value="34">34 mm</option>
        <option value="36">36 mm</option>
      </select>
      <label for="roofMarginInput">Extra Roof Margin (in feet):</label>
      <input type="number" id="roofMarginInput" placeholder="Enter extra margin" min="0" />
      <button id="submitRoofBtn">Add Roof</button>
    </div>
  </div>

  <!-- Door Modal -->
  <div id="doorModal" class="modal">
    <div class="modal-content">
      <span class="close" id="closeDoorModal">&times;</span>
      <h2>Add Door</h2>
      <label for="doorWidthInput">Door Width:</label>
      <input type="number" id="doorWidthInput" placeholder="Enter width" min="0.1" step="0.1" />
      <label for="doorHeightInput">Door Height:</label>
      <input type="number" id="doorHeightInput" placeholder="Enter height" min="0.1" step="0.1" />
      <label for="doorUnitSelect">Unit:</label>
      <select id="doorUnitSelect">
        <option value="m">Meter</option>
        <option value="ft">Foot</option>
      </select>
      <label for="doorSideSelect">Door Position:</label>
      <select id="doorSideSelect">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <button id="submitDoorBtn">Add Door</button>
    </div>
  </div>

  <!-- Window Modal -->
  <div id="windowModal" class="modal">
    <div class="modal-content">
      <span class="close" id="closeWindowModal">&times;</span>
      <h2>Add Window</h2>
      <label for="windowWidthInput">Window Width:</label>
      <input type="number" id="windowWidthInput" placeholder="Enter width" min="0.1" step="0.1" />
      <label for="windowHeightInput">Window Height:</label>
      <input type="number" id="windowHeightInput" placeholder="Enter height" min="0.1" step="0.1" />
      <label for="windowUnitSelect">Unit:</label>
      <select id="windowUnitSelect">
        <option value="m">Meter</option>
        <option value="ft">Foot</option>
      </select>
      <label for="windowPositionSelect">Window Position:</label>
      <select id="windowPositionSelect">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <button id="submitWindowBtn">Add Window</button>
    </div>
  </div>

  <!-- Floor Modal -->
  <div id="floorModal" class="modal">
    <div class="modal-content">
      <span class="close" id="closeFloorModal">&times;</span>
      <h2>Add Floor</h2>
      <label for="floorThicknessInput">Floor Thickness (in inches):</label>
      <input type="number" id="floorThicknessInput" placeholder="Enter floor thickness" min="1" />
      <button id="submitFloorBtn">Add Floor</button>
    </div>
  </div>

  <!-- New Project Modal -->
  <div id="newProjectModal" class="modal project-modal">
    <div class="modal-content">
      <span class="close" id="closeNewProject">&times;</span>
      <h2>New Project</h2>
      <label for="newProjectName">Project Name:</label>
      <input type="text" id="newProjectName" />
      <button id="startNewProject">Start</button>
    </div>
  </div>

  <!-- Saved Projects Modal -->
  <div id="savedProjectsModal" class="modal project-modal">
    <div class="modal-content">
      <span class="close" id="closeSavedProjects">&times;</span>
      <h2>Saved Projects</h2>
      <ul id="projectsList" style="list-style:none;padding:0;"></ul>
    </div>
  </div>

  <!-- Export Modal -->
  <div id="exportModal" class="modal project-modal">
    <div class="modal-content">
      <span class="close" id="closeExport">&times;</span>
      <h2>Export</h2>
      <button id="saveProjectBtn">Save Project</button>
      <button id="exportJpgBtn">Export as JPG</button>
      <button id="exportPdfBtn">Export as PDF</button>
    </div>
  </div>

  <script type="module" src="./scripts/2d-drawing.js"></script>
  <script type="module" src="./scripts/3d-rendering.js"></script>
  <script src="./scripts/project-management.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</body>
</html>