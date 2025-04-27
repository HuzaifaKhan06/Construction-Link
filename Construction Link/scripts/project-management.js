// scripts/project-management.js
;(function() {
    const API_BASE = 'http://localhost:3000/api/projects';
  
    let currentProjectId = null;
  
    // Elements
    const btnNew    = document.getElementById('btnNewProject');
    const btnSaved  = document.getElementById('btnSavedProjects');
    const btnExport = document.getElementById('btnExport');
  
    const newModal   = document.getElementById('newProjectModal');
    const closeNew   = document.getElementById('closeNewProject');
    const startNew   = document.getElementById('startNewProject');
    const newName    = document.getElementById('newProjectName');
  
    const savedModal   = document.getElementById('savedProjectsModal');
    const closeSaved   = document.getElementById('closeSavedProjects');
    const projectsList = document.getElementById('projectsList');
  
    const exportModal = document.getElementById('exportModal');
    const closeExport = document.getElementById('closeExport');
    const saveBtn     = document.getElementById('saveProjectBtn');
    const jpgBtn      = document.getElementById('exportJpgBtn');
    const pdfBtn      = document.getElementById('exportPdfBtn');
  
    // Helpers
    function open(m)  { m.style.display = 'block'; }
    function close(m) { m.style.display = 'none'; }
  
    // — New Project —
    btnNew.onclick = () => open(newModal);
    closeNew.onclick = () => close(newModal);
    startNew.onclick = async () => {
      const name = newName.value.trim();
      if (!name) return alert('Enter project name');
      try {
        const res  = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create');
        currentProjectId = json.id;
        close(newModal);
        alert(`Project "${name}" created (ID ${json.id})`);
      } catch (err) {
        alert(err.message);
      }
    };
  
    // — Saved Projects —
    btnSaved.onclick = async () => {
      open(savedModal);
      projectsList.innerHTML = '<li>Loading…</li>';
  
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const arr = await res.json();
  
        // Clear list and render
        projectsList.innerHTML = '';
        if (arr.length === 0) {
          projectsList.innerHTML = '<li>No projects found.</li>';
        } else {
          arr.forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.name} (updated ${new Date(p.updated_at).toLocaleString()})`;
            li.style.cursor = 'pointer';
            li.onclick = async () => {
              try {
                const res2 = await fetch(`${API_BASE}/${p.id}`);
                if (!res2.ok) throw new Error('Failed to load project');
                const pj = await res2.json();
                currentProjectId = pj.id;
  
                // json_data comes back as a string
                const data = typeof pj.json_data === 'string'
                  ? JSON.parse(pj.json_data)
                  : pj.json_data;
  
                applyProjectData(data);
                close(savedModal);
                alert(`Loaded project "${pj.name}"`);
              } catch (e) {
                alert(e.message);
              }
            };
            projectsList.appendChild(li);
          });
        }
      } catch (err) {
        projectsList.innerHTML = '<li>Error loading projects</li>';
        alert(err.message);
      }
    };
    closeSaved.onclick = () => close(savedModal);
  
    // — Export Modal & Save —
    btnExport.onclick = () => open(exportModal);
    closeExport.onclick = () => close(exportModal);
    saveBtn.onclick  = saveProject;
    jpgBtn.onclick   = () => alert('JPG export not yet implemented');
    pdfBtn.onclick   = () => alert('PDF export not yet implemented');
  
    // Ctrl+S binding
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
    });
  
    // Gather current design state
    window.getCurrentProjectData = function() {
      return {
        walls: window.walls || [],
        beamColumnActive: window.beamColumnActive || false,
        roofData: window.roofData || null,
        floorData: window.floorData || null
      };
    };
  
    // Apply loaded design
    window.applyProjectData = function(data) {
        // 1) Load into local 2D module
        if (typeof window.loadDesign === 'function') {
          window.loadDesign(data);
        } else {
          console.error('loadDesign() not found');
        }
    
        // 2) Recreate 3D roof & floor
        if (data.roofData && typeof window.createRoof3D === 'function') {
          window.createRoof3D(
            data.roofData.thicknessInches,
            data.roofData.steelRodDiameter,
            data.roofData.marginFeet
          );
        }
        if (data.floorData && typeof window.createFloor3D === 'function') {
          window.createFloor3D(data.floorData.thicknessInches);
        }
      };
  
    // Save current project
    async function saveProject() {
      if (!currentProjectId) return alert('No project selected');
      try {
        const res  = await fetch(`${API_BASE}/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json_data: getCurrentProjectData() })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to save');
        alert('Project saved');
        close(exportModal);
      } catch (err) {
        alert(err.message);
      }
    }
  })();
  