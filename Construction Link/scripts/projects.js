// scripts/projects.js
(() => {
    const apiBase = '/api/projects';
    let activeProjectId = null;
  
    // Helpers: show/hide any modal
    function toggleModal(id, show) {
      document.getElementById(id).style.display = show ? 'block' : 'none';
    }
  
    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
      const target = btn.dataset.close;
      btn.addEventListener('click', () => toggleModal(target, false));
    });
  
    // 1) New Project
    document.getElementById('newProjectBtn')
      .addEventListener('click', () => toggleModal('newProjectModal', true));
    document.getElementById('createProjectStart')
      .addEventListener('click', async () => {
        const name = document.getElementById('newProjectName').value.trim();
        if (!name) return alert('Please enter a name');
        // create in DB + FS
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ name })
        });
        const project = await res.json();
        activeProjectId = project.id;
        toggleModal('newProjectModal', false);
        // optionally clear canvas / reset walls
        window.applyProjectData({ walls: [], meta: project });
      });
  
    // 2) Saved Projects
    document.getElementById('savedProjectsBtn')
      .addEventListener('click', async () => {
        const ul = document.getElementById('projectsList');
        ul.innerHTML = '<li>Loading…</li>';
        toggleModal('savedProjectsModal', true);
        const res = await fetch(apiBase);
        const list = await res.json();
        ul.innerHTML = '';
        list.forEach(p => {
          const li = document.createElement('li');
          li.textContent = `${p.name} (${new Date(p.created_at).toLocaleString()})`;
          li.style.cursor = 'pointer';
          li.onclick = async () => {
            activeProjectId = p.id;
            const r2 = await fetch(`${apiBase}/${p.id}`);
            const data = await r2.json();
            toggleModal('savedProjectsModal', false);
            window.applyProjectData(data);
          };
          ul.appendChild(li);
        });
      });
  
    // 3) Export Project
    document.getElementById('exportProjectBtn')
      .addEventListener('click', () => toggleModal('exportProjectModal', true));
    document.getElementById('exportSave')
      .addEventListener('click', saveProject);
    document.getElementById('exportJPG')
      .addEventListener('click', () => alert('JPG export coming soon'));
    document.getElementById('exportPDF')
      .addEventListener('click', () => alert('PDF export coming soon'));
  
    // Save (PUT) current scene to server
    async function saveProject() {
      if (!activeProjectId) return alert('No project selected');
      const payload = window.getCurrentProjectData();
      await fetch(`${apiBase}/${activeProjectId}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      alert('Project saved');
      toggleModal('exportProjectModal', false);
    }
  
    // Ctrl+S / Cmd+S autosave
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.key==='s') {
        e.preventDefault();
        saveProject();
      }
    });
  })();
  