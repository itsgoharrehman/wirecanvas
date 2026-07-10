import { state, getObjects, getObjectById, setSelection, updateObjectProperties, setArmedTool } from './state.js';
import { executeCommand, TransformCommand, CreateCommand } from './history.js';
import { screenToCanvas, canvasToScreen } from './workspace.js';
import { computeAndDrawGuides, clearSmartGuides } from './guides.js';
import { getRotatedBounds, deepClone, generateUUID } from './utils.js';
import { getSelectionCanvasBounds, updateSelectionBox } from './selection.js';
import { collectAllChildren } from './group.js';

let isDragging = false;
let dragMode = null; // 'move' | 'pan' | 'marquee' | 'draw'
let dragStartX = 0;
let dragStartY = 0;

// Transform drag properties
let initialObjectStates = null; // Map of id -> { x, y, width, height }
let selectionBounds = null;
let currentCreatedObj = null;

/**
 * Initializes all drag gesture delegations.
 */
export function initDragHandlers() {
  const container = document.getElementById('canvas-scroll-container');
  if (!container) return;

  container.addEventListener('pointerdown', onPointerDown);
}

function onPointerDown(e) {
  // If target is inside properties panel or sidebar, ignore
  if (e.target.closest('.sidebar') || e.target.closest('#top-toolbar') || e.target.closest('#status-bar')) {
    return;
  }

  // Handle context menu close
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu && !contextMenu.classList.contains('hidden')) {
    contextMenu.classList.add('hidden');
    // If context menu was shown, let's consume click
    return;
  }

  // Left click or middle click
  const isLeftClick = e.button === 0;
  const isMiddleClick = e.button === 1;
  const spacePressed = window.spacePressed || false;

  dragStartX = e.clientX;
  dragStartY = e.clientY;

  // 1. Pan Mode (Hand tool, Space held, or Middle Click)
  if (state.tool === 'hand' || spacePressed || isMiddleClick) {
    dragMode = 'pan';
    isDragging = true;
    container.setPointerCapture(e.pointerId);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    e.preventDefault();
    return;
  }

  if (!isLeftClick) return;

  // Check if click on resize or rotate handle
  const handle = e.target.closest('.resize-handle') || e.target.closest('.rotate-handle');
  if (handle) {
    // Let resize/rotate handlers process it
    return;
  }

  // Check if click on canvas component
  const componentEl = e.target.closest('.wc-component');
  
  // 2. Component Draw Mode (if a drawing tool is armed)
  if (state.tool !== 'select' && state.tool !== 'hand') {
    startDrawing(e);
    return;
  }

  // 3. Move Mode (Select tool, clicked on component)
  if (componentEl) {
    const id = componentEl.getAttribute('data-id');
    const obj = getObjectById(id);
    
    if (obj) {
      // Manage selection list
      const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
      const isAlreadySelected = state.selection.includes(id);

      if (isMultiSelect) {
        if (isAlreadySelected) {
          setSelection(state.selection.filter(sid => sid !== id));
        } else {
          setSelection([...state.selection, id]);
        }
      } else {
        if (!isAlreadySelected) {
          // If part of a group, select the top-level group instead, unless double-clicked!
          // We check if it has parentId
          if (obj.parentId && !state.selection.includes(obj.parentId)) {
            // Traverse up to find top-most parent
            let parent = obj;
            while (parent.parentId) {
              const nextParent = getObjectById(parent.parentId);
              if (!nextParent) break;
              parent = nextParent;
            }
            setSelection(parent.id);
          } else {
            setSelection([id]);
          }
        }
      }

      // If object is locked, don't allow dragging it, but allow selecting
      const selectedLocked = state.selection.some(sid => getObjectById(sid)?.locked);
      if (selectedLocked) {
        return;
      }

      startMoving(e);
      return;
    }
  }

  // 4. Marquee Selection Mode (Select tool, clicked empty space)
  if (state.tool === 'select') {
    startMarquee(e);
  }
}

/**
 * Initiates the dragging of selected objects.
 */
function startMoving(e) {
  dragMode = 'move';
  isDragging = true;

  // Capture current positions
  initialObjectStates = new Map();
  const allIdsToMove = collectAllChildren(state.selection);
  allIdsToMove.forEach(id => {
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

  selectionBounds = getSelectionCanvasBounds();

  const container = document.getElementById('canvas-scroll-container');
  container.setPointerCapture(e.pointerId);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
}

/**
 * Initiates the drawing of a new shape.
 */
function startDrawing(e) {
  dragMode = 'draw';
  isDragging = true;

  const canvasCoord = screenToCanvas(e.clientX, e.clientY);
  const startX = Math.round(canvasCoord.x);
  const startY = Math.round(canvasCoord.y);

  // Setup defaults size depending on type
  let width = 10;
  let height = 10;

  // Add temp object to state
  const type = state.tool;
  const newId = generateUUID();
  
  // Lookup defaultProps
  const registry = import('../components/registry.js');
  
  // Set default dimensions
  let defaultWidth = 100;
  let defaultHeight = 100;
  
  // Create object schema
  currentCreatedObj = {
    id: newId,
    type: type,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${getObjects().filter(o => o.type === type).length + 1}`,
    x: startX,
    y: startY,
    width: width,
    height: height,
    rotation: 0,
    fill: '#ffffff',
    opacity: 1,
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 0,
    parentId: null,
    childIds: type === 'group' || type === 'tabs' ? [] : null,
    constraints: {},
    metadata: {}
  };

  // Specific overrides
  if (type === 'circle') {
    currentCreatedObj.borderRadius = 0; // border radius not used on circle DOM (css 50% circle)
  } else if (type === 'line' || type === 'arrow') {
    currentCreatedObj.fill = 'transparent';
    currentCreatedObj.border = { color: '#475569', width: 2, style: 'solid' };
  } else if (type === 'text') {
    currentCreatedObj.text = 'Double click to edit text';
    currentCreatedObj.fill = 'transparent';
    currentCreatedObj.constraints = { fontSize: 14, fontFamily: 'system-ui', textAlign: 'left', lineHeight: 1.4, fontWeight: 'regular' };
  } else if (type === 'button') {
    currentCreatedObj.text = 'Button';
    currentCreatedObj.fill = '#f8fafc';
    currentCreatedObj.borderRadius = 4;
  } else if (type === 'input') {
    currentCreatedObj.text = 'Placeholder...';
  } else if (type === 'checkbox') {
    currentCreatedObj.text = 'Checkbox';
    currentCreatedObj.fill = 'transparent';
    currentCreatedObj.metadata = { checked: false };
  } else if (type === 'radio') {
    currentCreatedObj.text = 'Option';
    currentCreatedObj.fill = 'transparent';
    currentCreatedObj.metadata = { checked: false };
  }

  // Push to objects list
  const page = state.pages.find(p => p.id === state.activePageId);
  page.objects.push(currentCreatedObj);
  
  setSelection([newId]);
  
  initialObjectStates = new Map();
  initialObjectStates.set(newId, { x: startX, y: startY, width: 10, height: 10, rotation: 0 });

  const container = document.getElementById('canvas-scroll-container');
  container.setPointerCapture(e.pointerId);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
}

/**
 * Initiates marquee rubber-band drag.
 */
function startMarquee(e) {
  dragMode = 'marquee';
  isDragging = true;

  const marqueeBox = document.getElementById('marquee-selection-box');
  if (marqueeBox) {
    marqueeBox.classList.remove('hidden');
    marqueeBox.style.left = `${dragStartX}px`;
    marqueeBox.style.top = `${dragStartY}px`;
    marqueeBox.style.width = '0px';
    marqueeBox.style.height = '0px';
  }

  const container = document.getElementById('canvas-scroll-container');
  container.setPointerCapture(e.pointerId);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!isDragging) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  const view = state.view;

  // 1. Panning Action
  if (dragMode === 'pan') {
    updateView({
      panX: view.panX + dx,
      panY: view.panY + dy
    });
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    return;
  }

  // Convert pixel delta to canvas logical coordinates displacement
  const canvasDx = dx / view.zoom;
  const canvasDy = dy / view.zoom;

  // 2. Moving Objects Action
  if (dragMode === 'move' && initialObjectStates) {
    // Snap dragging bounding box
    let newX = selectionBounds.x + canvasDx;
    let newY = selectionBounds.y + canvasDy;

    // Apply Snapping & Smart Guides
    if (state.settings.snapEnabled) {
      const snapped = computeAndDrawGuides(state.selection, newX, newY, selectionBounds.width, selectionBounds.height);
      newX = snapped.snapX;
      newY = snapped.snapY;
    } else {
      clearSmartGuides();
    }

    // Grid Snapping as a fallback if not snapped by guides
    if (state.settings.snapEnabled && !document.getElementById('smart-guides-svg').hasChildNodes()) {
      const gridSize = state.settings.gridSize;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Compute delta shift from snapped coordinates
    const finalDx = newX - selectionBounds.x;
    const finalDy = newY - selectionBounds.y;

    // Update positions
    const updateMap = {};
    initialObjectStates.forEach((init, id) => {
      updateMap[id] = {
        x: init.x + finalDx,
        y: init.y + finalDy
      };
    });

    updateObjectProperties(updateMap);
    return;
  }

  // 3. Drawing Shape Action
  if (dragMode === 'draw' && currentCreatedObj) {
    const startState = initialObjectStates.get(currentCreatedObj.id);
    let currentW = canvasDx;
    let currentH = canvasDy;

    let targetX = startState.x;
    let targetY = startState.y;

    if (currentW < 0) {
      targetX = startState.x + currentW;
      currentW = Math.abs(currentW);
    }
    if (currentH < 0) {
      targetY = startState.y + currentH;
      currentH = Math.abs(currentH);
    }

    // Grid snapping for drawings
    if (state.settings.snapEnabled) {
      const gridSize = state.settings.gridSize;
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
      currentW = Math.max(8, Math.round(currentW / gridSize) * gridSize);
      currentH = Math.max(8, Math.round(currentH / gridSize) * gridSize);
    }

    updateObjectProperties({
      [currentCreatedObj.id]: {
        x: targetX,
        y: targetY,
        width: currentW,
        height: currentH
      }
    });
    return;
  }

  // 4. Marquee Selector Action
  if (dragMode === 'marquee') {
    const marqueeBox = document.getElementById('marquee-selection-box');
    if (!marqueeBox) return;

    let left = dragStartX;
    let top = dragStartY;
    let w = dx;
    let h = dy;

    if (w < 0) {
      left = dragStartX + w;
      w = Math.abs(w);
    }
    if (h < 0) {
      top = dragStartY + h;
      h = Math.abs(h);
    }

    marqueeBox.style.left = `${left}px`;
    marqueeBox.style.top = `${top}px`;
    marqueeBox.style.width = `${w}px`;
    marqueeBox.style.height = `${h}px`;

    // Query elements intersecting marquee rect
    const containerRect = container.getBoundingClientRect();
    
    // Convert screen coordinates to canvas space
    const canvasMin = screenToCanvas(left, top);
    const canvasMax = screenToCanvas(left + w, top + h);

    const selectIds = [];
    getObjects().forEach(obj => {
      if (obj.hidden || obj.parentId) return;

      const bounds = getRotatedBounds(obj.x, obj.y, obj.width, obj.height, obj.rotation);
      
      const intersects = !(
        bounds.right < canvasMin.x ||
        bounds.left > canvasMax.x ||
        bounds.bottom < canvasMin.y ||
        bounds.top > canvasMax.y
      );

      if (intersects) {
        selectIds.push(obj.id);
      }
    });

    setSelection(selectIds);
  }
}

function onPointerUp(e) {
  if (!isDragging) return;

  isDragging = false;
  clearSmartGuides();

  const container = document.getElementById('canvas-scroll-container');
  container.releasePointerCapture(e.pointerId);
  container.removeEventListener('pointermove', onPointerMove);
  container.removeEventListener('pointerup', onPointerUp);

  // 1. Move complete: Push transform history entry
  if (dragMode === 'move' && initialObjectStates) {
    const transformMap = {};
    let changed = false;

    initialObjectStates.forEach((init, id) => {
      const current = getObjectById(id);
      if (init && current && (init.x !== current.x || init.y !== current.y)) {
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
  }

  // 2. Shape Draw complete: Push create shape history entry
  if (dragMode === 'draw' && currentCreatedObj) {
    // Remove temporary object from pages list so we can push it cleanly via CreateCommand execute
    const page = state.pages.find(p => p.id === state.activePageId);
    page.objects = page.objects.filter(o => o.id !== currentCreatedObj.id);
    
    // Commit to history via command
    executeCommand(new CreateCommand(currentCreatedObj));
    
    // Reset to select tool
    setArmedTool('select');
  }

  // 3. Marquee complete: hide marquee box
  if (dragMode === 'marquee') {
    const marqueeBox = document.getElementById('marquee-selection-box');
    if (marqueeBox) marqueeBox.classList.add('hidden');
  }

  // Reset states
  dragMode = null;
  initialObjectStates = null;
  selectionBounds = null;
  currentCreatedObj = null;
}
