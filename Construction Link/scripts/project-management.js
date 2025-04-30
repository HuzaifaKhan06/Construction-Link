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

  // — New Project —
  btnNew.onclick   = () => open(newModal);
  closeNew.onclick = () => close(newModal);

  startNew.onclick = async () => {
    const name = newNameInput.value.trim();
    if (!name) {
      return alert('Please enter a project name.');
    }

    // 🔍 Debug log of payload
    const payload = { name, user_id: userId };
    console.log('Creating project with', payload);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Server returned ${res.status}`);
      }
      currentProjectId = json.id;
      alert(`Project "${json.name}" created! (ID ${json.id})`);
      close(newModal);
      // ▶▶ NEW ▶▶ Clear prior design
      sessionStorage.removeItem('designData');
      if (window.clear2D) window.clear2D();
      if (window.clear3D) window.clear3D();
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Error creating project: ' + err.message);
    }
  };

  // — Saved Projects —
  btnSaved.onclick = async () => {
    open(savedModal);
    projectsList.innerHTML = '<li>Loading…</li>';

    try {
      const res = await fetch(`${API_BASE}?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const list = await res.json();
      projectsList.innerHTML = '';

      if (list.length === 0) {
        projectsList.innerHTML = '<li>No projects found.</li>';
      } else {
        list.forEach(p => {
          const li = document.createElement('li');
          li.textContent = `${p.name} (updated ${new Date(p.updated_at).toLocaleString()})`;
          li.style.cursor = 'pointer';
          li.onclick = async () => {
            try {
              const res2 = await fetch(`${API_BASE}/${p.id}?user_id=${userId}`);
              if (!res2.ok) throw new Error('Failed to load project');
              const pj = await res2.json();
              currentProjectId = pj.id;
              const data = typeof pj.json_data === 'string'
                ? JSON.parse(pj.json_data)
                : pj.json_data;
              applyProjectData(data);
              close(savedModal);
              alert(`Loaded "${pj.name}"`);
            } catch (e) {
              console.error(e);
              alert(e.message);
            }
          };
          projectsList.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      projectsList.innerHTML = '<li>Error loading projects</li>';
      alert(err.message);
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
    return alert('Could not find both canvases to export.');
  }
  const link = document.createElement('a');
  link.download = `project_${currentProjectId || 'design'}.jpg`;
  link.href = combined.toDataURL('image/jpeg', 1.0);
  link.click();
};

// — Export as PDF —
pdfBtn.onclick = () => {
  const combined = getCombinedCanvas();
  if (!combined) {
    return alert('Could not find both canvases to export.');
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
};


  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveProject();
    }
  });

  async function saveProject() {
    if (!currentProjectId) {
      return alert('No project selected to save.');
    }
    const payload = {
      json_data: getCurrentProjectData(),
      user_id: userId
    };
    console.log('Saving project with', payload);

    try {
      const res = await fetch(`${API_BASE}/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Server returned ${res.status}`);
      }
      alert('Project saved.');
      close(exportModal);
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Error saving project: ' + err.message);
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
