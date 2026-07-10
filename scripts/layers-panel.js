import { state, getObjects, getObjectById, setSelection, updateObjectProperties, notify } from './state.js';
import { executeCommand, ReorderCommand, PropertyCommand } from './history.js';
import { getComponentConfig } from '../components/registry.js';
import { deepClone } from './utils.js';

let container = null;
let draggedLayerId = null;

/**
 * Initializes the layers tree panel.
 */
export function initLayersPanel() {
  container = document.getElementById('layers-tree-container');
  if (!container) return;

  // Subscribe to updates to refresh layers list tree
  state.subscribe((event, detail) => {
    if (
      event === 'objects-changed' || 
      event === 'selection-changed' || 
      event === 'project-loaded' || 
      event === 'page-changed' ||
      event === 'layers-list-changed'
    ) {
      renderLayersTree();
    }
    
    if (event === 'rename-layer' && detail && detail.objectId) {
      startRenameLayer(detail.objectId);
    }
  });

  renderLayersTree();
}

/**
 * Build and render layers tree hierarchy.
 */
function renderLayersTree() {
  container.innerHTML = '';
  const objects = getObjects();
  
  if (objects.length === 0) {
    container.innerHTML = `
      <div style="padding: var(--spacing-lg); color: var(--text-muted); text-align: center;">
        No layers in this page
      </div>
    `;
    return;
  }

  // Find top level objects (no parent) and render in zIndex reverse order (Photoshop style)
  const topLevel = objects.filter(o => !o.parentId);
  
  // Sort descending by zIndex or array order
  topLevel.sort((a, b) => b.zIndex - a.zIndex);

  const treeFragment = document.createDocumentFragment();

  function renderNode(obj, depth = 0) {
    const row = buildLayerRow(obj, depth);
    treeFragment.appendChild(row);

    // If it's a container (group or tabs) and has childIds, render recursively
    if (obj.childIds && obj.childIds.length > 0) {
      // Find children in active objects, sort descending by z-index
      const children = objects.filter(o => obj.childIds.includes(o.id));
      children.sort((a, b) => b.zIndex - a.zIndex);
      
      children.forEach(child => renderNode(child, depth + 1));
    }
  }

  topLevel.forEach(obj => renderNode(obj, 0));
  container.appendChild(treeFragment);
}

/**
 * Builds a single row element for a layer tree node.
 */
function buildLayerRow(obj, depth) {
  const row = document.createElement('div');
  row.className = 'layer-row';
  row.setAttribute('data-id', obj.id);
  row.setAttribute('draggable', 'true');

  if (state.selection.includes(obj.id)) {
    row.classList.add('selected');
  }

  // Visual depth indentation
  if (depth > 0) {
    const indent = document.createElement('div');
    indent.className = 'layer-indent';
    indent.style.width = `${depth * 16}px`;
    row.appendChild(indent);
  }

  // Component Icon
  const iconSpan = document.createElement('span');
  iconSpan.className = 'layer-icon';
  const config = getComponentConfig(obj.type);
  iconSpan.innerHTML = config ? config.icon : '';
  row.appendChild(iconSpan);

  // Label text span
  const nameSpan = document.createElement('span');
  nameSpan.className = 'layer-name';
  nameSpan.innerText = obj.name || `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}`;
  row.appendChild(nameSpan);

  // Lock and Hide Action buttons
  const actions = document.createElement('div');
  actions.className = 'layer-actions';

  // Lock/Unlock toggle
  const lockBtn = document.createElement('button');
  lockBtn.className = 'layer-action-toggle';
  lockBtn.classList.toggle('active', !!obj.locked);
  lockBtn.title = obj.locked ? 'Unlock Layer' : 'Lock Layer';
  lockBtn.innerHTML = obj.locked 
    ? `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
    : `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 9.5-2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  
  lockBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = getObjectById(obj.id);
    if (current) {
      executeCommand(new PropertyCommand({
        [obj.id]: {
          before: { locked: current.locked },
          after: { locked: !current.locked }
        }
      }));
    }
  });

  // Hide/Show Toggle (eye icon)
  const hideBtn = document.createElement('button');
  hideBtn.className = 'layer-action-toggle';
  hideBtn.classList.toggle('active', !!obj.hidden);
  hideBtn.title = obj.hidden ? 'Show Layer' : 'Hide Layer';
  hideBtn.innerHTML = obj.hidden
    ? `<svg class="icon" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
    : `<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = getObjectById(obj.id);
    if (current) {
      executeCommand(new PropertyCommand({
        [obj.id]: {
          before: { hidden: current.hidden },
          after: { hidden: !current.hidden }
        }
      }));
    }
  });

  actions.appendChild(lockBtn);
  actions.appendChild(hideBtn);
  row.appendChild(actions);

  // Sync canvas selection on Click
  row.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    if (isMultiSelect) {
      if (state.selection.includes(obj.id)) {
        setSelection(state.selection.filter(id => id !== obj.id));
      } else {
        setSelection([...state.selection, obj.id]);
      }
    } else {
      setSelection([obj.id]);
    }
  });

  // Double click to Rename
  row.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startRenameLayer(obj.id);
  });

  // HTML5 Drag events for layer tree reordering
  setupLayerDragEvents(row, obj.id);

  return row;
}

function startRenameLayer(id) {
  const row = container.querySelector(`[data-id="${id}"]`);
  if (!row) return;

  const nameSpan = row.querySelector('.layer-name');
  if (!nameSpan) return;

  nameSpan.contentEditable = 'true';
  nameSpan.classList.add('editing');
  
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(nameSpan);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  nameSpan.focus();

  const finishRename = () => {
    nameSpan.contentEditable = 'false';
    nameSpan.classList.remove('editing');
    
    const newName = nameSpan.innerText.trim();
    const current = getObjectById(id);
    if (current && newName && newName !== current.name) {
      executeCommand(new PropertyCommand({
        [id]: {
          before: { name: current.name },
          after: { name: newName }
        }
      }));
    } else {
      nameSpan.innerText = current.name || current.type;
    }
  };

  nameSpan.addEventListener('blur', finishRename, { once: true });
  nameSpan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameSpan.blur();
    }
  });
}

/**
 * Attach Drag Reorder handlers.
 */
function setupLayerDragEvents(row, id) {
  row.addEventListener('dragstart', (e) => {
    draggedLayerId = id;
    e.dataTransfer.effectAllowed = 'move';
    row.style.opacity = '0.4';
  });

  row.addEventListener('dragend', () => {
    row.style.opacity = '1';
    draggedLayerId = null;
    clearDragMarkers();
  });

  row.addEventListener('dragover', (e) => {
    if (draggedLayerId === id) return; // ignore dragging over self

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Check if dragging on top or bottom half of the row to render guidelines
    const rect = row.getBoundingClientRect();
    const hoverY = e.clientY - rect.top;
    
    clearDragMarkers();
    
    // Group support: if hovering on a group, we can also drop INTO the group
    const obj = getObjectById(id);
    const isGroup = obj && obj.type === 'group';

    if (isGroup && hoverY > rect.height * 0.3 && hoverY < rect.height * 0.7) {
      row.style.backgroundColor = 'var(--bg-active)';
    } else if (hoverY < rect.height / 2) {
      row.classList.add('drag-over-above');
    } else {
      row.classList.add('drag-over-below');
    }
  });

  row.addEventListener('dragleave', () => {
    row.classList.remove('drag-over-above', 'drag-over-below');
    row.style.backgroundColor = '';
  });

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === id) return;

    const rect = row.getBoundingClientRect();
    const hoverY = e.clientY - rect.top;

    const draggedObj = getObjectById(draggedLayerId);
    const targetObj = getObjectById(id);

    if (!draggedObj || !targetObj) return;

    const objects = getObjects();
    const beforeObjectsState = deepClone(objects);
    
    let afterObjectsState = [...objects];

    // Determine drop action: 'above' | 'below' | 'into'
    let action = 'below';
    const isGroup = targetObj.type === 'group';

    if (isGroup && hoverY > rect.height * 0.3 && hoverY < rect.height * 0.7) {
      action = 'into';
    } else if (hoverY < rect.height / 2) {
      action = 'above';
    }

    // Remove dragged object from array first
    afterObjectsState = afterObjectsState.filter(o => o.id !== draggedLayerId);

    if (action === 'into') {
      // Re-parent: put dragged under group parentId and append to group's childIds
      draggedObj.parentId = targetObj.id;
      if (!targetObj.childIds.includes(draggedLayerId)) {
        targetObj.childIds.push(draggedLayerId);
      }
      
      // Update array order: place draggedObj right after group or group's current children
      const targetIdx = afterObjectsState.findIndex(o => o.id === targetObj.id);
      afterObjectsState.splice(targetIdx + 1, 0, draggedObj);
    } else {
      // Drop above/below: re-parent to target's parent, and insert before/after
      
      // Un-parent from old group childIds if nested
      if (draggedObj.parentId) {
        const oldParent = getObjectById(draggedObj.parentId);
        if (oldParent && oldParent.childIds) {
          oldParent.childIds = oldParent.childIds.filter(cid => cid !== draggedLayerId);
        }
      }

      draggedObj.parentId = targetObj.parentId;
      if (targetObj.parentId) {
        const newParent = getObjectById(targetObj.parentId);
        if (newParent && newParent.childIds && !newParent.childIds.includes(draggedLayerId)) {
          newParent.childIds.push(draggedLayerId);
        }
      }

      const targetIdx = afterObjectsState.findIndex(o => o.id === targetObj.id);
      const insertIdx = action === 'above' ? targetIdx : targetIdx + 1;
      afterObjectsState.splice(insertIdx, 0, draggedObj);
    }

    // Refresh z-indexes based on new array order index
    afterObjectsState.forEach((obj, idx) => {
      obj.zIndex = idx + 1;
    });

    executeCommand(new ReorderCommand(beforeObjectsState, afterObjectsState));
    notify('layers-list-changed');
  } );
}

function clearDragMarkers() {
  const rows = container.querySelectorAll('.layer-row');
  rows.forEach(r => {
    r.classList.remove('drag-over-above', 'drag-over-below');
    r.style.backgroundColor = '';
  });
}
