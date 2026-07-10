import { state, getObjects, getObjectById, updateObjectProperties } from './state.js';
import { executeCommand, TransformCommand } from './history.js';
import { getSelectionCanvasBounds } from './selection.js';
import { canvasToScreen } from './workspace.js';
import { deepClone } from './utils.js';
import { collectAllChildren } from './group.js';

let isRotating = false;
let dragStartX = 0;
let dragStartY = 0;

let initialSelectionBounds = null;
let selectionCenterScreen = null; // { x, y }
let initialObjectRotations = null; // Map of id -> { r, x, y, w, h }
let initialAngle = 0;

/**
 * Initializes rotation handlers.
 */
export function initRotateHandlers() {
  const selectionBox = document.getElementById('selection-bounding-box');
  if (!selectionBox) return;

  selectionBox.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.rotate-handle');
    if (!handle) return;

    e.preventDefault();
    e.stopPropagation();

    startRotating(e);
  });
}

function startRotating(e) {
  isRotating = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  initialSelectionBounds = getSelectionCanvasBounds();
  if (!initialSelectionBounds) return;

  const view = state.view;
  const zoom = view.zoom;

  // Calculate center of selection bounding box in canvas coordinates
  const cx = initialSelectionBounds.x + initialSelectionBounds.width / 2;
  const cy = initialSelectionBounds.y + initialSelectionBounds.height / 2;

  // Convert canvas center to screen pixel coordinates
  const container = document.getElementById('canvas-scroll-container');
  const containerRect = container.getBoundingClientRect();
  
  selectionCenterScreen = {
    x: cx * zoom + view.panX + containerRect.left,
    y: cy * zoom + view.panY + containerRect.top
  };

  // Calculate initial angle of mouse pointer relative to selection center
  const dx = e.clientX - selectionCenterScreen.x;
  const dy = e.clientY - selectionCenterScreen.y;
  initialAngle = Math.atan2(dy, dx); // radians

  // Save initial rotations and coordinates of selection members
  initialObjectRotations = new Map();
  const allIdsToRotate = collectAllChildren(state.selection);
  allIdsToRotate.forEach(id => {
    const obj = getObjectById(id);
    if (obj) {
      initialObjectRotations.set(id, {
        rotation: obj.rotation,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      });
    }
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!isRotating || !selectionCenterScreen || !initialSelectionBounds) return;

  // Current vector from center to mouse
  const dx = e.clientX - selectionCenterScreen.x;
  const dy = e.clientY - selectionCenterScreen.y;
  
  const currentAngle = Math.atan2(dy, dx); // radians
  let deltaAngleRad = currentAngle - initialAngle;
  let deltaAngleDeg = (deltaAngleRad * 180) / Math.PI;

  // Snap to 15-degree steps if Shift is pressed
  if (e.shiftKey) {
    // Snap total rotation (initial + delta) or just snap delta
    deltaAngleDeg = Math.round(deltaAngleDeg / 15) * 15;
    deltaAngleRad = (deltaAngleDeg * Math.PI) / 180;
  }

  const updateMap = {};

  if (initialObjectRotations.size === 1) {
    // Single object: simply rotate
    const id = state.selection[0];
    const start = initialObjectRotations.get(id);
    if (start) {
      let targetRot = Math.round((start.rotation + deltaAngleDeg) % 360);
      if (targetRot < 0) targetRot += 360;
      updateMap[id] = { rotation: targetRot };
    }
  } else {
    // Multi-selection or group container: rotate each object and orbit its coordinates around combined center
    const cx = initialSelectionBounds.x + initialSelectionBounds.width / 2;
    const cy = initialSelectionBounds.y + initialSelectionBounds.height / 2;
    
    const cos = Math.cos(deltaAngleRad);
    const sin = Math.sin(deltaAngleRad);

    initialObjectRotations.forEach((start, id) => {
      // Orbit object's center coordinates around selection center (cx, cy)
      const ecx = start.x + start.width / 2;
      const ecy = start.y + start.height / 2;

      const rx = ecx - cx;
      const ry = ecy - cy;

      // Rotated vector
      const nrx = rx * cos - ry * sin;
      const nry = rx * sin + ry * cos;

      // New top-left coordinate
      const newX = cx + nrx - start.width / 2;
      const newY = cy + nry - start.height / 2;
      
      let newRot = Math.round((start.rotation + deltaAngleDeg) % 360);
      if (newRot < 0) newRot += 360;

      updateMap[id] = {
        x: newX,
        y: newY,
        rotation: newRot
      };
    });
  }

  updateObjectProperties(updateMap);
}

function onPointerUp(e) {
  if (!isRotating) return;

  isRotating = false;

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);

  // Commit history command
  const transformMap = {};
  let changed = false;

  initialObjectRotations.forEach((start, id) => {
    const current = getObjectById(id);
    if (start && current && (start.rotation !== current.rotation || start.x !== current.x || start.y !== current.y)) {
      transformMap[id] = {
        before: { x: start.x, y: start.y, width: start.width, height: start.height, rotation: start.rotation },
        after: { x: current.x, y: current.y, width: current.width, height: current.height, rotation: current.rotation }
      };
      changed = true;
    }
  });

  if (changed) {
    executeCommand(new TransformCommand(transformMap));
  }

  initialSelectionBounds = null;
  selectionCenterScreen = null;
  initialObjectRotations = null;
}
