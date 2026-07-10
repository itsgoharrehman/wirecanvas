import { state, getObjects, getObjectById, setSelection } from './state.js';
import { getRotatedBounds } from './utils.js';

let selectionBoxEl = null;

/**
 * Initialize selection visual box listeners.
 */
export function initSelection() {
  selectionBoxEl = document.getElementById('selection-bounding-box');
  
  // Listen to state changes to update visual box
  state.subscribe((event) => {
    if (
      event === 'selection-changed' || 
      event === 'objects-changed' || 
      event === 'view-changed' ||
      event === 'project-loaded' ||
      event === 'page-changed'
    ) {
      updateSelectionBox();
    }
  });

  updateSelectionBox();
}

/**
 * Re-computes selection boundaries and positions the screen-space bounding box.
 */
export function updateSelectionBox() {
  if (!selectionBoxEl) return;

  const selection = state.selection;
  if (!selection || selection.length === 0) {
    selectionBoxEl.classList.add('hidden');
    // Also clear status bar selection text
    const statusText = document.getElementById('status-selection');
    if (statusText) statusText.innerText = 'No selection';
    return;
  }

  const objects = getObjects();
  const view = state.view;
  const zoom = view.zoom;
  const panX = view.panX;
  const panY = view.panY;

  // Single Object Selection
  if (selection.length === 1) {
    const obj = getObjectById(selection[0]);
    if (!obj || obj.hidden) {
      selectionBoxEl.classList.add('hidden');
      return;
    }

    selectionBoxEl.classList.remove('hidden');
    
    // Position bounding box exactly matching the single object (including its rotation)
    const left = obj.x * zoom + panX;
    const top = obj.y * zoom + panY;
    const width = obj.width * zoom;
    const height = obj.height * zoom;

    selectionBoxEl.style.left = `${left}px`;
    selectionBoxEl.style.top = `${top}px`;
    selectionBoxEl.style.width = `${width}px`;
    selectionBoxEl.style.height = `${height}px`;
    selectionBoxEl.style.transform = `rotate(${obj.rotation}deg)`;

    // Update status text
    const statusText = document.getElementById('status-selection');
    if (statusText) {
      statusText.innerText = `Selected: ${obj.name || obj.type}`;
    }
    
    // Hide specific resize handles if line/arrow (they don't support side resize, only endpoint movement - or standard simple resize)
    const sideHandles = selectionBoxEl.querySelectorAll('.resize-handle:not(.handle-nw):not(.handle-ne):not(.handle-se):not(.handle-sw)');
    const isLine = obj.type === 'line' || obj.type === 'arrow';
    sideHandles.forEach(h => h.style.display = isLine ? 'none' : 'block');
    return;
  }

  // Multi-Object Selection
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let selectedCount = 0;

  selection.forEach(id => {
    const obj = getObjectById(id);
    if (obj && !obj.hidden) {
      selectedCount++;
      const bounds = getRotatedBounds(obj.x, obj.y, obj.width, obj.height, obj.rotation);
      minX = Math.min(minX, bounds.left);
      maxX = Math.max(maxX, bounds.right);
      minY = Math.min(minY, bounds.top);
      maxY = Math.max(maxY, bounds.bottom);
    }
  });

  if (selectedCount === 0) {
    selectionBoxEl.classList.add('hidden');
    return;
  }

  selectionBoxEl.classList.remove('hidden');

  // Draw axis-aligned bounding box covering all selected objects
  const left = minX * zoom + panX;
  const top = minY * zoom + panY;
  const width = (maxX - minX) * zoom;
  const height = (maxY - minY) * zoom;

  selectionBoxEl.style.left = `${left}px`;
  selectionBoxEl.style.top = `${top}px`;
  selectionBoxEl.style.width = `${width}px`;
  selectionBoxEl.style.height = `${height}px`;
  selectionBoxEl.style.transform = 'none'; // No rotation for multi-selection bounding box

  // Show all side handles for multi-select
  const sideHandles = selectionBoxEl.querySelectorAll('.resize-handle');
  sideHandles.forEach(h => h.style.display = 'block');

  // Update status text
  const statusText = document.getElementById('status-selection');
  if (statusText) {
    statusText.innerText = `${selectedCount} objects selected`;
  }
}

/**
 * Returns bounds of active selection in canvas space.
 */
export function getSelectionCanvasBounds() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return null;

  if (selection.length === 1) {
    const obj = getObjectById(selection[0]);
    if (!obj) return null;
    return { x: obj.x, y: obj.y, width: obj.width, height: obj.height, rotation: obj.rotation };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  selection.forEach(id => {
    const obj = getObjectById(id);
    if (obj) {
      const bounds = getRotatedBounds(obj.x, obj.y, obj.width, obj.height, obj.rotation);
      minX = Math.min(minX, bounds.left);
      maxX = Math.max(maxX, bounds.right);
      minY = Math.min(minY, bounds.top);
      maxY = Math.max(maxY, bounds.bottom);
    }
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0
  };
}
