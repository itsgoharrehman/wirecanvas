import { deepClone, generateUUID } from './utils.js';

// Event emitter / listener subscriptions
const listeners = new Set();

// The single source of truth state store
export const state = {
  schemaVersion: 2,
  projectId: 'default-project',
  projectName: 'Untitled Project',
  projects: [], // Lightweight project metadata switch list
  pages: [
    {
      id: 'page-default',
      name: 'Page 1',
      objects: []
    }
  ],
  activePageId: 'page-default',
  selection: [], // Array of selected object IDs
  clipboard: null, // Cloned object representations
  view: {
    zoom: 1.0,
    panX: 0,
    panY: 0
  },
  tool: 'select', // 'select' | 'hand' | shapes/ui tools
  settings: {
    gridVisible: true,
    gridSize: 16,
    snapEnabled: true,
    rulersVisible: true
  },
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  notify(event, detail = {}) {
    listeners.forEach(callback => {
      try {
        callback(event, detail);
      } catch (e) {
        console.error("Error in state change subscriber:", e);
      }
    });
  }
};

/**
 * Subscribe a callback to state changes.
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  return state.subscribe(callback);
}

/**
 * Notify all subscribers of a specific state change.
 */
export function notify(event, detail = {}) {
  state.notify(event, detail);
}

// Helpers to get active page and objects
export function getActivePage() {
  return state.pages.find(p => p.id === state.activePageId) || state.pages[0];
}

export function getObjects() {
  return getActivePage().objects;
}

export function getObjectById(id) {
  return getObjects().find(obj => obj.id === id);
}

// State Action Mutations

/**
 * Set project properties (on load/import).
 */
export function initProject(projectData) {
  state.projectId = projectData.projectId || generateUUID();
  state.projectName = projectData.projectName || 'Untitled Project';
  state.pages = projectData.pages && projectData.pages.length ? projectData.pages : [
    { id: 'page-default', name: 'Page 1', objects: [] }
  ];
  state.activePageId = projectData.activePageId || state.pages[0].id;
  state.selection = [];
  state.view = projectData.view || { zoom: 1.0, panX: 0, panY: 0 };
  state.settings = { ...state.settings, ...(projectData.settings || {}) };
  
  notify('project-loaded');
  notify('pages-list-changed');
  notify('page-changed');
  notify('selection-changed');
}

export function setProjectName(name) {
  state.projectName = name;
  notify('project-meta-changed');
}

/**
 * Add a new page.
 */
export function addPage(name = null) {
  const newPageId = generateUUID();
  const pageNum = state.pages.length + 1;
  const newPage = {
    id: newPageId,
    name: name || `Page ${pageNum}`,
    objects: []
  };
  state.pages.push(newPage);
  state.activePageId = newPageId;
  state.selection = [];
  
  notify('pages-list-changed');
  notify('page-changed');
  notify('selection-changed');
  return newPageId;
}

/**
 * Delete a page.
 */
export function deletePage(pageId) {
  if (state.pages.length <= 1) return; // Cannot delete the last page
  
  const index = state.pages.findIndex(p => p.id === pageId);
  if (index === -1) return;
  
  state.pages.splice(index, 1);
  
  if (state.activePageId === pageId) {
    // Switch to adjacent page
    const nextActiveIndex = Math.min(index, state.pages.length - 1);
    state.activePageId = state.pages[nextActiveIndex].id;
  }
  state.selection = [];
  
  notify('pages-list-changed');
  notify('page-changed');
  notify('selection-changed');
}

/**
 * Duplicate a page.
 */
export function duplicatePage(pageId) {
  const page = state.pages.find(p => p.id === pageId);
  if (!page) return;
  
  const duplicatedPageId = generateUUID();
  
  // Clone all objects but assign new IDs
  const idMap = new Map();
  const clonedObjects = page.objects.map(obj => {
    const newId = generateUUID();
    idMap.set(obj.id, newId);
    return { ...deepClone(obj), id: newId };
  });
  
  // Patch parentId / childIds maps for groups/tables
  clonedObjects.forEach(obj => {
    if (obj.parentId && idMap.has(obj.parentId)) {
      obj.parentId = idMap.get(obj.parentId);
    }
    if (obj.childIds) {
      obj.childIds = obj.childIds.map(cid => idMap.has(cid) ? idMap.get(cid) : cid);
    }
  });

  const duplicatedPage = {
    id: duplicatedPageId,
    name: `${page.name} (Copy)`,
    objects: clonedObjects
  };
  
  state.pages.push(duplicatedPage);
  state.activePageId = duplicatedPageId;
  state.selection = [];
  
  notify('pages-list-changed');
  notify('page-changed');
  notify('selection-changed');
}

/**
 * Switches the active page.
 */
export function selectPage(pageId) {
  if (state.activePageId === pageId) return;
  state.activePageId = pageId;
  state.selection = [];
  
  notify('page-changed');
  notify('selection-changed');
}

/**
 * Rename a page.
 */
export function renamePage(pageId, name) {
  const page = state.pages.find(p => p.id === pageId);
  if (!page) return;
  page.name = name;
  notify('pages-list-changed');
}

/**
 * Sets the active drawing tool.
 */
export function setArmedTool(toolName) {
  state.tool = toolName;
  notify('tool-changed', { tool: toolName });
}

/**
 * Updates viewport pan and zoom.
 */
export function updateView(viewProps) {
  state.view = { ...state.view, ...viewProps };
  notify('view-changed', state.view);
}

/**
 * Updates application settings.
 */
export function updateSettings(settingsProps) {
  state.settings = { ...state.settings, ...settingsProps };
  notify('settings-changed', state.settings);
}

/**
 * Sets the selection list.
 */
export function setSelection(ids) {
  // Ensure array
  const selectionIds = Array.isArray(ids) ? ids : [ids];
  // Filter out hidden/locked elements if desired, though standard is select locked but restrict move.
  // We'll allow selecting locked.
  state.selection = selectionIds.filter(id => getObjectById(id));
  notify('selection-changed', { selection: state.selection });
}

// Low-Level direct object array mutations (used by command patterns to execute/undo)

/**
 * Directly replaces the objects list of the active page.
 */
export function setObjects(objects) {
  const page = getActivePage();
  page.objects = objects;
  notify('objects-changed', { changeType: 'refresh' });
}

/**
 * Directly updates object coordinates or properties.
 */
export function updateObjectProperties(idPropertiesMap) {
  let changedIds = [];
  for (const [id, props] of Object.entries(idPropertiesMap)) {
    const obj = getObjectById(id);
    if (obj) {
      // Apply properties
      for (const [key, value] of Object.entries(props)) {
        if (key === 'border' && typeof value === 'object') {
          obj.border = { ...obj.border, ...value };
        } else if (key === 'constraints' && typeof value === 'object') {
          obj.constraints = { ...obj.constraints, ...value };
        } else if (key === 'metadata' && typeof value === 'object') {
          obj.metadata = { ...obj.metadata, ...value };
        } else {
          obj[key] = value;
        }
      }
      changedIds.push(id);
    }
  }
  if (changedIds.length > 0) {
    notify('objects-changed', { changeType: 'modify', objectIds: changedIds });
  }
}

