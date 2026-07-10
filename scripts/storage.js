import { state, initProject } from './state.js';
import { debounce } from './utils.js';

const STORAGE_PREFIX = 'wirecanvas_proj_';
const LIST_KEY = 'wirecanvas_projects_list';

/**
 * Gets a list of metadata for all saved projects.
 * @returns {Array<{id: string, name: string, lastSaved: number}>}
 */
export function getProjectsList() {
  try {
    const listJson = localStorage.getItem(LIST_KEY);
    return listJson ? JSON.parse(listJson) : [];
  } catch (e) {
    console.error("Error loading project list:", e);
    return [];
  }
}

/**
 * Updates the project list metadata index.
 */
function updateProjectIndex(projectId, projectName) {
  try {
    const list = getProjectsList();
    const existingIndex = list.findIndex(p => p.id === projectId);
    
    const meta = {
      id: projectId,
      name: projectName,
      lastSaved: Date.now()
    };
    
    if (existingIndex !== -1) {
      list[existingIndex] = meta;
    } else {
      list.push(meta);
    }
    
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Error updating project index:", e);
  }
}

/**
 * Deletes a project from storage.
 */
export function deleteProjectFromStorage(projectId) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
    const list = getProjectsList().filter(p => p.id !== projectId);
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Error deleting project:", e);
  }
}

/**
 * Direct synchronous save operation (called by debounced saver).
 */
function performSave() {
  try {
    const statusText = document.getElementById('status-autosave');
    if (statusText) {
      statusText.innerHTML = '<span class="save-status-saving"></span>Saving...';
    }

    const payload = {
      schemaVersion: state.schemaVersion,
      projectId: state.projectId,
      projectName: state.projectName,
      pages: state.pages.map(p => ({
        id: p.id,
        name: p.name,
        objects: p.objects // save objects array
      })),
      activePageId: state.activePageId,
      view: state.view,
      settings: state.settings
    };

    localStorage.setItem(`${STORAGE_PREFIX}${state.projectId}`, JSON.stringify(payload));
    updateProjectIndex(state.projectId, state.projectName);
    
    if (statusText) {
      statusText.innerHTML = '<span class="save-status-saved"></span>Saved';
    }
  } catch (e) {
    console.error("Error during project autosave:", e);
    const statusText = document.getElementById('status-autosave');
    if (statusText) {
      statusText.innerText = 'Save Failed';
    }
  }
}

// Debounced wrapper for autosaving
export const saveProject = debounce(() => {
  performSave();
}, 500);

/**
 * Loads a project by ID from localStorage.
 */
export function loadProject(projectId) {
  try {
    const rawData = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (!rawData) return false;
    
    const payload = JSON.parse(rawData);
    
    // Check schema version and run migrations if needed
    const migratedPayload = migrateProjectSchema(payload);
    
    initProject(migratedPayload);
    
    // Set status bar
    const statusText = document.getElementById('status-autosave');
    if (statusText) {
      statusText.innerHTML = '<span class="save-status-saved"></span>Saved';
    }
    return true;
  } catch (e) {
    console.error("Failed to load project:", e);
    return false;
  }
}

/**
 * Schema migrator logic to convert older JSON versions if needed.
 */
export function migrateProjectSchema(payload) {
  if (!payload.schemaVersion) {
    payload.schemaVersion = 1;
  }
  
  if (payload.schemaVersion === 1) {
    // Perform migrations for v2: Ensure constraints and pages fields are correctly structured
    payload.pages = payload.pages.map(page => {
      page.objects = page.objects.map(obj => {
        if (!obj.constraints) obj.constraints = {};
        if (!obj.metadata) obj.metadata = {};
        return obj;
      });
      return page;
    });
    payload.schemaVersion = 2;
  }
  
  return payload;
}

/**
 * Restores the last active project or bootstraps a new one.
 */
export function restoreLastProject() {
  const list = getProjectsList();
  if (list.length > 0) {
    // Load most recently saved project
    list.sort((a, b) => b.lastSaved - a.lastSaved);
    const success = loadProject(list[0].id);
    if (success) return;
  }
  
  // Bootstrap fresh new project
  const initialPayload = {
    schemaVersion: 2,
    projectId: 'default-project',
    projectName: 'Untitled Project',
    pages: [
      {
        id: 'page-default',
        name: 'Page 1',
        objects: []
      }
    ],
    activePageId: 'page-default',
    view: { zoom: 1.0, panX: 0, panY: 0 },
    settings: {
      gridVisible: true,
      gridSize: 16,
      snapEnabled: true,
      rulersVisible: true
    }
  };
  
  initProject(initialPayload);
  performSave();
}
