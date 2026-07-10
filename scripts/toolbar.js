import { state, setArmedTool, setProjectName, updateSettings } from './state.js';
import { undo, redo, canUndo, canRedo } from './history.js';
import { groupSelection, ungroupSelection } from './group.js';
import { deleteSelection, duplicateSelection, clipboardPaste } from './contextmenu.js';
import { zoomTo } from './workspace.js';
import { triggerExportJSON, triggerExportPNG } from './export.js';

/**
 * Initializes toolbar buttons listeners, dropdowns, and project renaming.
 */
export function initToolbar() {
  // Tool buttons
  setupToolBtn('tool-select', 'select');
  setupToolBtn('tool-hand', 'hand');
  setupToolBtn('btn-draw-rect', 'rectangle');
  setupToolBtn('btn-draw-circle', 'circle');
  setupToolBtn('btn-draw-line', 'line');
  setupToolBtn('btn-draw-arrow', 'arrow');
  setupToolBtn('btn-draw-text', 'text');

  // Command buttons
  document.getElementById('btn-undo').addEventListener('click', () => undo());
  document.getElementById('btn-redo').addEventListener('click', () => redo());
  document.getElementById('btn-duplicate').addEventListener('click', () => duplicateSelection());
  document.getElementById('btn-delete').addEventListener('click', () => deleteSelection());
  
  document.getElementById('btn-group').addEventListener('click', () => groupSelection());
  document.getElementById('btn-ungroup').addEventListener('click', () => ungroupSelection());

  // View option toggles
  setupToggleBtn('btn-toggle-grid', 'gridVisible');
  setupToggleBtn('btn-toggle-snap', 'snapEnabled');
  setupToggleBtn('btn-toggle-rulers', 'rulersVisible');

  // Zoom options dropdown
  setupZoomDropdown();

  // Export options dropdown
  setupExportDropdown();

  // Import options
  setupImportTrigger();

  // Project renaming
  setupProjectRename();

  // Present Mode
  document.getElementById('btn-present').addEventListener('click', togglePresentMode);

  // Subscribe to updates to toggle active toolbar states
  state.subscribe((event) => {
    if (event === 'tool-changed') {
      updateActiveToolBtn();
    }
    if (event === 'history-changed' || event === 'project-loaded' || event === 'page-changed') {
      updateUndoRedoBtnDisabledStates();
    }
    if (event === 'settings-changed' || event === 'project-loaded') {
      updateSettingsTogglesActiveStates();
    }
    if (event === 'project-loaded' || event === 'project-meta-changed') {
      const nameInput = document.getElementById('project-name');
      if (nameInput && nameInput.innerText !== state.projectName) {
        nameInput.innerText = state.projectName;
      }
    }
  });

  // Initial updates
  updateActiveToolBtn();
  updateUndoRedoBtnDisabledStates();
  updateSettingsTogglesActiveStates();
}

function setupToolBtn(elementId, toolName) {
  const btn = document.getElementById(elementId);
  if (btn) {
    btn.addEventListener('click', () => {
      setArmedTool(toolName);
    });
  }
}

function updateActiveToolBtn() {
  const tools = {
    'select': 'tool-select',
    'hand': 'tool-hand',
    'rectangle': 'btn-draw-rect',
    'circle': 'btn-draw-circle',
    'line': 'btn-draw-line',
    'arrow': 'btn-draw-arrow',
    'text': 'btn-draw-text'
  };

  const activeId = tools[state.tool];
  Object.values(tools).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === activeId);
  });
}

function updateUndoRedoBtnDisabledStates() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  if (undoBtn) undoBtn.style.opacity = canUndo() ? '1' : '0.4';
  if (redoBtn) redoBtn.style.opacity = canRedo() ? '1' : '0.4';
}

function setupToggleBtn(elementId, settingsKey) {
  const btn = document.getElementById(elementId);
  if (btn) {
    btn.addEventListener('click', () => {
      updateSettings({ [settingsKey]: !state.settings[settingsKey] });
    });
  }
}

function updateSettingsTogglesActiveStates() {
  const toggles = {
    'btn-toggle-grid': 'gridVisible',
    'btn-toggle-snap': 'snapEnabled',
    'btn-toggle-rulers': 'rulersVisible'
  };

  for (const [id, key] of Object.entries(toggles)) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('active', !!state.settings[key]);
    }
  }
}

/**
 * Hook up the zoom level selectors.
 */
function setupZoomDropdown() {
  const selectBtn = document.getElementById('zoom-select-btn');
  const dropdown = document.getElementById('zoom-dropdown-menu');
  if (!selectBtn || !dropdown) return;

  // Toggle open
  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Handle clicks on zoom items
  dropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const val = btn.getAttribute('data-zoom');
    
    if (val === 'fit') {
      // Fit zoom is mapped inside keyboard.js or workspace.js
      // Dispatch shortcut shift+1 equivalent
      const event = new KeyboardEvent('keydown', { key: '1', shiftKey: true });
      window.dispatchEvent(event);
    } else if (val === 'selection') {
      // Zoom to selection: calculate selection bounds and zoom centered
      zoomToSelection();
    } else {
      zoomTo(Number(val));
    }
    
    dropdown.classList.remove('show');
  });

  window.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });
}

function zoomToSelection() {
  const bounds = getSelectionCanvasBounds(); // let's reuse selection bounds helper
  const viewport = document.getElementById('canvas-scroll-container');
  if (!bounds || !viewport) return;

  const vw = viewport.clientWidth - 80;
  const vh = viewport.clientHeight - 80;

  const zoomW = vw / bounds.width;
  const zoomH = vh / bounds.height;
  const newZoom = Math.min(zoomW, zoomH);

  // Center pan positions
  const panX = (viewport.clientWidth - bounds.width * newZoom) / 2 - bounds.x * newZoom;
  const panY = (viewport.clientHeight - bounds.height * newZoom) / 2 - bounds.y * newZoom;

  zoomTo(newZoom, null, null);
  updateView({ zoom: newZoom, panX, panY });
}

/**
 * Hook up PNG/JSON Exporter dropdown.
 */
function setupExportDropdown() {
  const trigger = document.getElementById('btn-export-trigger');
  const menu = document.getElementById('export-dropdown-menu');

  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });

  menu.querySelector('#btn-export-json').addEventListener('click', () => {
    triggerExportJSON();
    menu.classList.remove('show');
  });

  menu.querySelector('#btn-export-png-page').addEventListener('click', () => {
    triggerExportPNG(false); // Entire page
    menu.classList.remove('show');
  });

  menu.querySelector('#btn-export-png-selection').addEventListener('click', () => {
    triggerExportPNG(true); // Selection only
    menu.classList.remove('show');
  });

  window.addEventListener('click', () => {
    menu.classList.remove('show');
  });
}

/**
 * Hook up file input element for JSON loads.
 */
function setupImportTrigger() {
  const trigger = document.getElementById('btn-import');
  const fileInput = document.getElementById('import-file-input');

  if (!trigger || !fileInput) return;

  trigger.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        // Import module handles check
        import('./import.js').then(mod => {
          mod.importProjectJSON(json);
        });
      } catch (err) {
        console.error("Failed to parse JSON file:", err);
        alert("Failed to parse project JSON. Check file schema version.");
      }
    };
    reader.readAsText(file);
    fileInput.value = ''; // reset
  });
}

/**
 * Binds contenteditable name changes.
 */
function setupProjectRename() {
  const el = document.getElementById('project-name');
  if (!el) return;

  el.addEventListener('blur', () => {
    const name = el.innerText.trim() || 'Untitled Project';
    setProjectName(name);
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });
}

/**
 * Presentation mode hiding menus.
 */
function togglePresentMode() {
  const app = document.getElementById('app-container');
  if (!app) return;

  const active = app.classList.toggle('presentation-mode');
  
  // Set toolbar btn active
  document.getElementById('btn-present').classList.toggle('active', active);

  // Esc key exits present mode
  if (active) {
    const escExit = (e) => {
      if (e.key === 'Escape') {
        app.classList.remove('presentation-mode');
        document.getElementById('btn-present').classList.remove('active');
        window.removeEventListener('keydown', escExit);
      }
    };
    window.addEventListener('keydown', escExit);
  }
}
