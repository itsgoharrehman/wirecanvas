import { state, getObjects, getObjectById, updateObjectProperties } from './state.js';
import { executeCommand, TransformCommand } from './history.js';
import { screenToCanvas } from './workspace.js';
import { getSelectionCanvasBounds } from './selection.js';
import { getRotatedBounds, clamp } from './utils.js';
import { collectAllChildren } from './group.js';

let isResizing = false;
let activeHandle = null;
let dragStartX = 0;
let dragStartY = 0;

let initialSelectionBounds = null;
let initialObjectStates = null;

/**
 * Initializes resizing listeners.
 */
export function initResizeHandlers() {
  const selectionBox = document.getElementById('selection-bounding-box');
  if (!selectionBox) return;

  // Delegate listener for resize handles
  selectionBox.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.resize-handle');
    if (!handle) return;

    e.preventDefault();
    e.stopPropagation();

    startResizing(e, handle);
  });
}

function startResizing(e, handle) {
  isResizing = true;
  activeHandle = handle.getAttribute('data-handle');
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  initialSelectionBounds = getSelectionCanvasBounds();

  // Save states of all selected elements
  initialObjectStates = new Map();
  const allIdsToResize = collectAllChildren(state.selection);
  allIdsToResize.forEach(id => {
    const obj = getObjectById(id);
    if (obj) {
      initialObjectStates.set(id, {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation
      });
    }
  });

  // Capture mouse move/up globally
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!isResizing || !initialSelectionBounds) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  const view = state.view;
  const zoom = view.zoom;

  // Transform offset from screen to canvas coordinates
  const canvasDx = dx / zoom;
  const canvasDy = dy / zoom;

  const bounds = { ...initialSelectionBounds };
  const minSize = 10;

  // Compute new bounding box depending on handle type
  let newX = bounds.x;
  let newY = bounds.y;
  let newW = bounds.width;
  let newH = bounds.height;

  // Calculate new scale bounds
  switch (activeHandle) {
    case 'se':
      newW = Math.max(minSize, bounds.width + canvasDx);
      newH = Math.max(minSize, bounds.height + canvasDy);
      break;
    case 'sw':
      newW = Math.max(minSize, bounds.width - canvasDx);
      newX = bounds.x + (bounds.width - newW);
      newH = Math.max(minSize, bounds.height + canvasDy);
      break;
    case 'ne':
      newW = Math.max(minSize, bounds.width + canvasDx);
      newH = Math.max(minSize, bounds.height - canvasDy);
      newY = bounds.y + (bounds.height - newH);
      break;
    case 'nw':
      newW = Math.max(minSize, bounds.width - canvasDx);
      newX = bounds.x + (bounds.width - newW);
      newH = Math.max(minSize, bounds.height - canvasDy);
      newY = bounds.y + (bounds.height - newH);
      break;
    case 'e':
      newW = Math.max(minSize, bounds.width + canvasDx);
      break;
    case 'w':
      newW = Math.max(minSize, bounds.width - canvasDx);
      newX = bounds.x + (bounds.width - newW);
      break;
    case 's':
      newH = Math.max(minSize, bounds.height + canvasDy);
      break;
    case 'n':
      newH = Math.max(minSize, bounds.height - canvasDy);
      newY = bounds.y + (bounds.height - newH);
      break;
  }

  // Aspect ratio lock (Shift held down during corner resize)
  const isCorner = ['nw', 'ne', 'se', 'sw'].includes(activeHandle);
  if (isCorner && e.shiftKey) {
    const originalRatio = bounds.width / bounds.height;
    
    // Choose dominant axis scale
    if (newW / newH > originalRatio) {
      newW = newH * originalRatio;
    } else {
      newH = newW / originalRatio;
    }

    // Re-adjust top/left offsets for nw, ne, sw handles based on locked dimensions
    if (activeHandle === 'nw') {
      newX = bounds.x + (bounds.width - newW);
      newY = bounds.y + (bounds.height - newH);
    } else if (activeHandle === 'ne') {
      newY = bounds.y + (bounds.height - newH);
    } else if (activeHandle === 'sw') {
      newX = bounds.x + (bounds.width - newW);
    }
  }

  // Grid snap resize edges (if enabled)
  if (state.settings.snapEnabled) {
    const gridSize = state.settings.gridSize;
    newX = Math.round(newX / gridSize) * gridSize;
    newY = Math.round(newY / gridSize) * gridSize;
    newW = Math.round(newW / gridSize) * gridSize;
    newH = Math.round(newH / gridSize) * gridSize;
  }

  // Apply new coordinates to objects
  const updateMap = {};

  initialObjectStates.forEach((init, id) => {
    // Compute relative positions inside original bounds box
    const rx = (init.x - bounds.x) / bounds.width;
    const ry = (init.y - bounds.y) / bounds.height;
    const rw = init.width / bounds.width;
    const rh = init.height / bounds.height;

    updateMap[id] = {
      x: newX + rx * newW,
      y: newY + ry * newH,
      width: rw * newW,
      height: rh * newH
    };
  });

  updateObjectProperties(updateMap);
}

function onPointerUp(e) {
  if (!isResizing) return;

  isResizing = false;

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);

  // Commit single TransformCommand to history stack
  const transformMap = {};
  let changed = false;

  initialObjectStates.forEach((init, id) => {
    const current = getObjectById(id);
    if (init && current && (init.width !== current.width || init.height !== current.height || init.x !== current.x || init.y !== current.y)) {
      transformMap[id] = {
        before: { x: init.x, y: init.y, width: init.width, height: init.height, rotation: init.rotation },
        after: { x: current.x, y: current.y, width: current.width, height: current.height, rotation: current.rotation }
      };
      changed = true;
    }
  });

  if (changed) {
    executeCommand(new TransformCommand(transformMap));
  }

  activeHandle = null;
  initialSelectionBounds = null;
  initialObjectStates = null;
}
