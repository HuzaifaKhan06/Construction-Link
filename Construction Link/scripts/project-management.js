;(function() {
  // 👉 Must match your Express backend:
  const API_BASE = 'http://localhost:3000/api/projects';

  // USER_ID is injected by CreateDesign.php before this script runs
  const userId = window.USER_ID;
  if (!userId) {
    console.error('❌ window.USER_ID is undefined! Check CreateDesign.php injection.');
  }

  let currentProjectId = null;

  // ————— DOM ELEMENTS —————
  const btnNew       = document.getElementById('btnNewProject');
  const btnSaved     = document.getElementById('btnSavedProjects');
  const btnExport    = document.getElementById('btnExport');
  const newModal     = document.getElementById('newProjectModal');
  const closeNew     = document.getElementById('closeNewProject');
  const startNew     = document.getElementById('startNewProject');
  const newNameInput = document.getElementById('newProjectName');
  const savedModal   = document.getElementById('savedProjectsModal');
  const closeSaved   = document.getElementById('closeSavedProjects');
  const projectsList = document.getElementById('projectsList');
  const exportModal  = document.getElementById('exportModal');
  const closeExport  = document.getElementById('closeExport');
  const saveBtn      = document.getElementById('saveProjectBtn');
  const jpgBtn       = document.getElementById('exportJpgBtn');
  const pdfBtn       = document.getElementById('exportPdfBtn');

  function open(modal)  { modal.style.display = 'block'; }
  function close(modal) { modal.style.display = 'none'; }

  // ———— TOAST NOTIFICATION SYSTEM ————
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Add styles for toast notifications
    const style = document.createElement('style');
    style.textContent = `
      #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .toast {
        min-width: 250px;
        margin-bottom: 10px;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: toast-in 0.3s ease-out forwards;
        opacity: 0;
        transform: translateX(50px);
        display: flex;
        align-items: center;
      }
      .toast-success {
        background-color: #4CAF50;
        color: white;
      }
      .toast-error {
        background-color: #F44336;
        color: white;
      }
      .toast-info {
        background-color: #2196F3;
        color: white;
      }
      .toast-warning {
        background-color: #FF9800;
        color: white;
      }
      .toast-icon {
        margin-right: 12px;
        font-size: 20px;
      }
      .toast-content {
        flex-grow: 1;
      }
      .toast-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.8;
        margin-left: 10px;
      }
      .toast-close:hover {
        opacity: 1;
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateX(50px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes toast-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(50px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add styles for updated project card view
  const projectCardStyles = document.createElement('style');
  projectCardStyles.textContent = `
    /* Updated Saved Projects Modal */
    #savedProjectsModal .modal-content {
      width: 80%;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 30px;
    }
    
    /* Project Cards Grid */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    /* Project Card */
    .project-card {
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      background: white;
      cursor: pointer;
      height: 220px; /* Fixed height for consistent cards */
    }

    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    /* Preview Area */
    .project-card-preview {
      height: 150px;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #eee;
      overflow: hidden;
      position: relative;
    }

    /* Improved image styling */
    .project-card-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Ensures the image covers the area without distortion */
      object-position: center; /* Centers the image */
      transition: transform 0.3s ease;
    }
    
    .project-card:hover .project-card-preview img {
      transform: scale(1.05); /* Slight zoom effect on hover */
    }

    /* Improved placeholder styling */
    .project-card-preview .placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
      background-color: #f8f8f8;
      z-index: 1;
    }

    /* Card info section */
    .project-card-info {
      padding: 12px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 70px; /* Fixed height for info section */
      box-sizing: border-box;
    }

    .project-card-title {
      font-weight: 600;
      margin: 0;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 190px;
      color: #333;
    }

    .project-card-date {
      font-size: 12px;
      color: #777;
      margin-top: 4px;
    }
    
    /* Three Dots Menu */
    .menu-dots {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
      position: relative;
    }
    
    .menu-dots:hover {
      background-color: #f0f0f0;
    }
    
    .menu-dots::after {
      content: "⋮";
      font-size: 18px;
      color: #555;
    }
    
    .project-menu {
      position: absolute;
      top: 30px;
      right: 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 100;
      display: none;
      width: 120px;
    }
    
    .project-menu.active {
      display: block;
    }
    
    .project-menu-item {
      padding: 8px 12px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .project-menu-item:hover {
      background-color: #f5f5f5;
    }
    
    .project-menu-item.delete {
      color: #e53935;
    }
    
    /* Empty state */
    .empty-projects {
      text-align: center;
      padding: 40px 0;
      color: #777;
    }
    
    .empty-projects p {
      margin-bottom: 20px;
    }
    
    .empty-projects button {
      background-color: #2980B9;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .empty-projects button:hover {
      background-color: #1F6391;
    }
    
    /* Loading animation */
    .loading-projects {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 0;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Delete confirmation modal */
    #deleteConfirmModal {
      display: none;
      position: fixed;
      z-index: 3100;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: rgba(0, 0, 0, 0.5);
    }
    
    #deleteConfirmModal .modal-content {
      width: 350px;
      text-align: center;
    }
    
    #deleteConfirmModal h3 {
      margin-top: 0;
      color: #333;
    }
    
    #deleteConfirmModal p {
      margin-bottom: 20px;
      color: #555;
    }
    
    #deleteConfirmModal .button-group {
      display: flex;
      justify-content: space-between;
    }
    
    #deleteConfirmModal button {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    #deleteConfirmModal button.cancel {
      background-color: #e0e0e0;
      color: #333;
      margin-right: 10px;
    }
    
    #deleteConfirmModal button.delete {
      background-color: #e53935;
      color: white;
    }
    
    #deleteConfirmModal button:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(projectCardStyles);

  // Create delete confirmation modal
  const deleteConfirmModal = document.createElement('div');
  deleteConfirmModal.id = 'deleteConfirmModal';
  deleteConfirmModal.innerHTML = `
    <div class="modal-content">
      <h3>Delete Project</h3>
      <p>Are you sure you want to delete this project? This action cannot be undone.</p>
      <div class="button-group">
        <button class="cancel" id="cancelDeleteBtn">Cancel</button>
        <button class="delete" id="confirmDeleteBtn">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(deleteConfirmModal);

  // Toast notification function
  function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    switch (type) {
      case 'success': icon = '✓'; break;
      case 'error': icon = '✕'; break;
      case 'warning': icon = '⚠'; break;
      case 'info': icon = 'ℹ'; break;
    }
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">${message}</div>
      <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Handle close button click
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.animation = 'toast-out 0.3s forwards';
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    });
    
    // Auto dismiss after duration
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toast.style.animation = 'toast-out 0.3s forwards';
        setTimeout(() => {
          if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
          }
        }, 300);
      }
    }, duration);
  }

  // Close any open project menus when clicking elsewhere
  document.addEventListener('click', function(event) {
    const activeMenus = document.querySelectorAll('.project-menu.active');
    activeMenus.forEach(menu => {
      // Check if click was outside the menu and its trigger
      const menuTrigger = menu.previousElementSibling;
      if (!menu.contains(event.target) && event.target !== menuTrigger) {
        menu.classList.remove('active');
      }
    });
  });

  // — New Project —
  btnNew.onclick   = () => open(newModal);
  closeNew.onclick = () => close(newModal);

  // Create new project helper function to reuse in multiple places
  async function createNewProject(name) {
    if (!name || !name.trim()) {
      showToast('Please enter a project name.', 'warning');
      return null;
    }

    // 🔍 Debug log of payload
    const payload = { name: name.trim(), user_id: userId };
    console.log('Creating project with', payload);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }
      
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Server returned ${res.status}`);
      }
      currentProjectId = json.id;
      showToast(`Project "${json.name}" created!`, 'success');
      close(newModal);
      return json.id;
    } catch (err) {
      console.error('Error creating project:', err);
      showToast(`Error creating project: ${err.message}`, 'error');
      return null;
    }
  }

  startNew.onclick = async () => {
    const name = newNameInput.value.trim();
    const projectId = await createNewProject(name);
    
    if (projectId) {
      // ▶▶ NEW ▶▶ Clear prior design
      sessionStorage.removeItem('designData');
      if (window.clear2D) window.clear2D();
      if (window.clear3D) window.clear3D();
    }
  };

  // DEBUG HELPER: Show requests in console
  function logRequest(method, url, body = null) {
    const now = new Date().toISOString().split('T')[1].split('.')[0]; // hh:mm:ss
    console.log(`[${now}] ${method} ${url}${body ? '\nBody: ' + JSON.stringify(body) : ''}`);
  }
  
  // — Delete Project Functionality —
  const deleteProject = async (projectId, projectName) => {
    try {
      console.log(`Attempting to delete project ${projectId} for user ${userId}`);
      
      const res = await fetch(`${API_BASE}/${projectId}?user_id=${userId}`, {
        method: 'DELETE'
      });
      
      console.log(`Delete response status: ${res.status}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Project not found or may have been deleted");
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }
      
      close(deleteConfirmModal);
      showToast(`Project "${projectName}" deleted successfully`, 'success');
      btnSaved.onclick(); // Refresh the projects list
      
      // Reset current project if needed
      if (currentProjectId === projectId) {
        currentProjectId = null;
        if (window.clear2D) window.clear2D();
        if (window.clear3D) window.clear3D();
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      close(deleteConfirmModal);
      showToast(`Error deleting project: ${err.message}`, 'error');
      setTimeout(() => btnSaved.onclick(), 1000); // Refresh list anyway
    }
  };

  // Set up delete confirmation modal buttons
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    close(deleteConfirmModal);
  });

  let projectToDelete = null;

  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id, projectToDelete.name);
      projectToDelete = null;
    }
  });

  // Function to create a project card with improved thumbnail handling
  function createProjectCard(project) {
    // Create card elements
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectId = project.id;
    
    // Create preview section
    const preview = document.createElement('div');
    preview.className = 'project-card-preview';
    
    // Create placeholder that will show initially or if image fails to load
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'No Preview';
    preview.appendChild(placeholder);
    
    // Debug the thumbnail data
    console.log(`Project ${project.id} - ${project.name} thumbnail:`, 
                project.thumbnail ? 'Present (Length: ' + project.thumbnail.length + ')' : 'Missing');
    
    // Check if project has a thumbnail
    if (project.thumbnail) {
      const img = document.createElement('img');
      // Set the source to the thumbnail data
      img.src = project.thumbnail;
      img.alt = project.name;
      img.style.display = 'none'; // Hide initially
      
      // When image loads successfully, hide placeholder and show image
      img.onload = function() {
        placeholder.style.display = 'none';
        this.style.display = 'block';
        console.log(`Thumbnail for project ${project.id} loaded successfully`);
      };
      
      // If image fails to load, keep the placeholder visible
      img.onerror = function() {
        console.log(`Failed to load thumbnail for project: ${project.name}`);
        this.style.display = 'none';
        placeholder.style.display = 'flex';
      };
      
      preview.appendChild(img);
    }
    
    // Create info section
    const info = document.createElement('div');
    info.className = 'project-card-info';
    
    // Create title and date container
    const titleContainer = document.createElement('div');
    
    const title = document.createElement('h3');
    title.className = 'project-card-title';
    title.textContent = project.name;
    
    const date = document.createElement('div');
    date.className = 'project-card-date';
    date.textContent = new Date(project.updated_at).toLocaleString();
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(date);
    
    // Create three dots menu
    const menuDots = document.createElement('div');
    menuDots.className = 'menu-dots';
    
    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'project-menu';
    
    const deleteItem = document.createElement('div');
    deleteItem.className = 'project-menu-item delete';
    deleteItem.textContent = 'Delete';
    
    menu.appendChild(deleteItem);
    
    // Add all elements to card
    info.appendChild(titleContainer);
    info.appendChild(menuDots);
    info.appendChild(menu);
    
    card.appendChild(preview);
    card.appendChild(info);
    
    // Add event listeners
    menuDots.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click when clicking menu
      menu.classList.toggle('active');
    });
    
    deleteItem.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click when clicking delete
      menu.classList.remove('active');
      
      // Store project to delete and show confirmation
      projectToDelete = { id: project.id, name: project.name };
      open(deleteConfirmModal);
    });
    
    // Add click handler for the entire card (except menu)
    card.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_BASE}/${project.id}?user_id=${userId}`, {
          headers: { 'Accept': 'application/json' }
        });
        
        // Check for JSON response
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        
        if (!res.ok) throw new Error('Failed to load project');
        
        const pj = await res.json();
        currentProjectId = pj.id;
        const data = typeof pj.json_data === 'string'
          ? JSON.parse(pj.json_data)
          : pj.json_data;
        applyProjectData(data);
        close(savedModal);
        showToast(`Loaded "${pj.name}" Project `, 'success');
      } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
      }
    });
    
    return card;
  }

  // — Saved Projects —
  btnSaved.onclick = async () => {
    open(savedModal);
    
    // Clear previous content and show loading spinner
    projectsList.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-projects';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
    projectsList.appendChild(loadingDiv);

    try {
      const url = `${API_BASE}?user_id=${userId}`;
      logRequest('GET', url);
      
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      // Check for JSON response
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }
      
      if (!res.ok) throw new Error('Failed to fetch projects');
      
      const list = await res.json();
      console.log(`Received ${list.length} projects:`, list);
      
      // Clear loading spinner
      projectsList.innerHTML = '';
      
      // Create grid container for projects
      const gridContainer = document.createElement('div');
      gridContainer.className = 'projects-grid';
      projectsList.appendChild(gridContainer);

      if (list.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-projects';
        emptyState.innerHTML = `
          <p>You don't have any saved projects yet.</p>
          <button id="createFirstProject">Create New Project</button>
        `;
        projectsList.appendChild(emptyState);
        
        // Add click handler for the "Create New Project" button
        document.getElementById('createFirstProject').addEventListener('click', () => {
          close(savedModal);
          open(newModal);
        });
      } else {
        // Create project cards for each project
        list.forEach(project => {
          const card = createProjectCard(project);
          gridContainer.appendChild(card);
        });
      }
    } catch (err) {
      console.error(err);
      projectsList.innerHTML = `
        <div class="empty-projects">
          <p>Error loading projects: ${err.message}</p>
          <button id="retryLoadProjects">Retry</button>
        </div>
      `;
      
      // Add click handler for the "Retry" button
      document.getElementById('retryLoadProjects').addEventListener('click', btnSaved.onclick);
      
      showToast(err.message, 'error');
    }
  };
  
  closeSaved.onclick = () => close(savedModal);

  // — Export & Save —
  btnExport.onclick = () => open(exportModal);
  closeExport.onclick = () => close(exportModal);
  saveBtn.onclick   = saveProject;
  
  // — Helper to build one big canvas from both 2D & 3D —
  function getCombinedCanvas() {
    const canvas2d = document.getElementById('2d-canvas');
    const canvas3d = document.querySelector('#threejs-canvas canvas');
    if (!canvas2d || !canvas3d) return null;

    const width  = canvas2d.width;
    const height = canvas2d.height + canvas3d.height;
    const out    = document.createElement('canvas');
    out.width  = width;
    out.height = height;
    const ctx = out.getContext('2d');

    // draw 2D plan at the top
    ctx.drawImage(canvas2d, 0, 0);
    // then draw 3D view immediately below it
    ctx.drawImage(canvas3d, 0, canvas2d.height);

    return out;
  }

  // — Export as JPG —
  jpgBtn.onclick = () => {
    const combined = getCombinedCanvas();
    if (!combined) {
      showToast('Could not find both canvases to export.', 'error');
      return;
    }
    const link = document.createElement('a');
    link.download = `project_${currentProjectId || 'design'}.jpg`;
    link.href = combined.toDataURL('image/jpeg', 1.0);
    link.click();
    showToast('JPG exported successfully', 'success');
  };

  // — Export as PDF —
  pdfBtn.onclick = () => {
    const combined = getCombinedCanvas();
    if (!combined) {
      showToast('Could not find both canvases to export.', 'error');
      return;
    }
    const imgData = combined.toDataURL('image/jpeg', 1.0);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      // match page to combined canvas size
      format: [combined.width, combined.height],
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, combined.width, combined.height);
    pdf.save(`project_${currentProjectId || 'design'}.pdf`);
    showToast('PDF exported successfully', 'success');
  };

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveProject();
    }
  });

  async function saveProject() {
    // Check if there is an active project
    if (!currentProjectId) {
      // No project exists, show the new project modal
      newNameInput.value = '';  // Clear the input field
      open(newModal);
      
      // Focus the input field
      setTimeout(() => newNameInput.focus(), 100);
      
      // Change the button text from "Start" to "Save"
      const originalButtonText = startNew.textContent;
      startNew.textContent = "Save";
      
      // Change the behavior of the start new project button temporarily
      const originalOnClick = startNew.onclick;
      startNew.onclick = async () => {
        const name = newNameInput.value.trim();
        const projectId = await createNewProject(name);
        
        if (projectId) {
          // Restore original onClick and text
          startNew.onclick = originalOnClick;
          startNew.textContent = originalButtonText;
          
          // Now save the project
          saveProjectData(projectId);
        }
      };
      
      return;
    }
    
    // If we have a project ID, save directly
    saveProjectData(currentProjectId);
  }
  
  async function saveProjectData(projectId) {
    const payload = {
      json_data: getCurrentProjectData(),
      user_id: userId
    };
    
    // Generate thumbnail from 2D canvas with better error handling
    try {
      const canvas2d = document.getElementById('2d-canvas');
      if (canvas2d && canvas2d.width > 0 && canvas2d.height > 0) {
        // Generate thumbnail and compress it slightly to reduce size
        payload.thumbnail = canvas2d.toDataURL('image/jpeg', 0.7);
        console.log('Thumbnail generated successfully');
      } else {
        console.warn('2D canvas not available or has zero dimensions');
      }
    } catch (err) {
      console.warn('Could not generate thumbnail:', err);
    }
    
    console.log('Saving project with ID:', projectId);
  
    try {
      // Use query parameter for user_id as that's what the API expects
      const saveUrl = `${API_BASE}/${projectId}?user_id=${userId}`;
      logRequest('PUT', saveUrl);
      
      const res = await fetch(saveUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`Save project response status: ${res.status}`);
      
      // Handle common status codes
      if (res.status === 404) {
        throw new Error("Project not found. It may have been deleted.");
      }
      
      // Parse response
      let json;
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          json = await res.json();
        } else {
          // If status is OK but not JSON, consider it success
          if (res.ok) {
            json = { message: 'Project saved successfully' };
          } else {
            throw new Error("Server returned non-JSON response");
          }
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        if (res.ok) {
          // If status is OK but parsing failed, consider it success
          json = { message: 'Project saved successfully' };
        } else {
          throw parseError;
        }
      }
      
      if (!res.ok && json && json.error) {
        throw new Error(json.error || `Server returned ${res.status}`);
      }
      
      showToast('Project saved successfully', 'success');
      close(exportModal);
    } catch (err) {
      console.error('Error saving project:', err);
      showToast(`Error saving project: ${err.message}`, 'error');
    }
  }

  // Exposed to your 2D/3D modules:
  window.getCurrentProjectData = () => ({ 
    walls: window.walls || [],
    beamColumnActive: window.beamColumnActive || false,
    roofData: window.roofData || null,
    floorData: window.floorData || null
  });

  window.applyProjectData = data => {
    if (window.loadDesign) window.loadDesign(data);
    if (data.roofData && window.createRoof3D) {
      window.createRoof3D(
        data.roofData.thicknessInches,
        data.roofData.steelRodDiameter,
        data.roofData.marginFeet
      );
    }
    if (data.floorData && window.createFloor3D) {
      window.createFloor3D(data.floorData.thicknessInches);
    }
  };
  
})();