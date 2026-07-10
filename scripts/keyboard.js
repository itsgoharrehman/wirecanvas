import { state, getObjects, getObjectById, setSelection, updateObjectProperties, setArmedTool, updateSettings } from './state.js';
import { executeCommand, TransformCommand, undo, redo, canUndo, canRedo } from './history.js';
import { collectAllChildren, groupSelection, ungroupSelection } from './group.js';
import { deleteSelection, clipboardCopy, clipboardPaste, clipboardCut, duplicateSelection, reorderSelection, hideSelection, toggleLockSelection } from './contextmenu.js';
import { zoomTo } from './workspace.js';
import { debounce } from './utils.js';

// Accumulators for nudging history collapses
let nudgeTotalDx = 0;
let nudgeTotalDy = 0;
let initialNudgeStates = null;

// Debounced history pusher for nudge operations
const commitNudgeHistory = debounce(() => {
  if (!initialNudgeStates || (nudgeTotalDx === 0 && nudgeTotalDy === 0)) {
    initialNudgeStates = null;
    nudgeTotalDx = 0;
    nudgeTotalDy = 0;
    return;
  }

  const transformMap = {};
  initialNudgeStates.forEach((init, id) => {
    const current = getObjectById(id);
    if (init && current) {
      transformMap[id] = {
        before: { x: init.x, y: init.y, width: init.width, height: init.height, rotation: init.rotation },
        after: { x: current.x, y: current.y, width: current.width, height: current.height, rotation: current.rotation }
      };
    }
  });

  executeCommand(new TransformCommand(transformMap));
  
  initialNudgeStates = null;
  nudgeTotalDx = 0;
  nudgeTotalDy = 0;
}, 600);

/**
 * Initializes global keyboard listeners.
 */
export function initKeyboardShortcuts() {
  window.spacePressed = false;

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

function onKeyDown(e) {
  const activeTag = document.activeElement.tagName;
  const isEditable = document.activeElement.isContentEditable || 
                     activeTag === 'INPUT' || 
                     activeTag === 'TEXTAREA' || 
                     activeTag === 'SELECT';

  // Space held down for Pan (Hand) tool
  if (e.code === 'Space' && !isEditable) {
    if (!window.spacePressed) {
      window.spacePressed = true;
      const statusText = document.getElementById('status-tool');
      if (statusText) statusText.innerText = 'Tool: Pan (Space held)';
      // Switch cursor visual feedback on canvas
      document.getElementById('canvas-scroll-container').style.cursor = 'grab';
    }
    // Prevent browser default scroll behaviors
    e.preventDefault();
  }

  // Skip visual hotkeys if editing texts/inputs
  if (isEditable) {
    // Standard Esc to blur contenteditable/inputs
    if (e.key === 'Escape') {
      document.activeElement.blur();
    }
    return;
  }

  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;

  // Shortcuts Mapping Matrix
  
  // 1. Tool Selection Shifts
  if (!isCtrl && !isShift) {
    switch (e.key.toLowerCase()) {
      case 'v':
        setArmedTool('select');
        break;
      case 'h':
        setArmedTool('hand');
        break;
      case 'r':
        setArmedTool('rectangle');
        break;
      case 'o':
        setArmedTool('circle');
        break;
      case 'l':
        setArmedTool('line');
        break;
      case 'a':
        setArmedTool('arrow');
        break;
      case 't':
        setArmedTool('text');
        break;
      case 'g':
        // Grid visibility toggle
        updateSettings({ gridVisible: !state.settings.gridVisible });
        break;
      case 's':
        // Snap settings toggle
        updateSettings({ snapEnabled: !state.settings.snapEnabled });
        break;
    }
  }

  // 2. Undo / Redo
  if (isCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (isShift) {
      redo();
    } else {
      undo();
    }
  }

  // 3. Selection Actions: Cut/Copy/Paste/Select All/Duplicate
  if (isCtrl) {
    switch (e.key.toLowerCase()) {
      case 'c':
        e.preventDefault();
        clipboardCopy();
        break;
      case 'v':
        e.preventDefault();
        if (isShift) {
          clipboardPaste(true); // Paste in place
        } else {
          clipboardPaste(false); // Paste with offset
        }
        break;
      case 'x':
        e.preventDefault();
        clipboardCut();
        break;
      case 'a':
        e.preventDefault();
        // Select all objects
        const allIds = getObjects().filter(o => !o.parentId).map(o => o.id);
        setSelection(allIds);
        break;
      case 'd':
        e.preventDefault();
        duplicateSelection();
        break;
      case 'g':
        e.preventDefault();
        if (isShift) {
          ungroupSelection();
        } else {
          groupSelection();
        }
        break;
      case 'l':
        e.preventDefault();
        toggleLockSelection();
        break;
      case 'h':
        e.preventDefault();
        hideSelection();
        break;
      case 'r':
        e.preventDefault();
        updateSettings({ rulersVisible: !state.settings.rulersVisible });
        break;
    }
  }

  // 4. Delete Selection
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelection();
  }

  // 5. Deselect
  if (e.key === 'Escape') {
    e.preventDefault();
    setSelection([]);
    setArmedTool('select');
  }

  // 6. Layer Z-order Shifts
  if (isCtrl) {
    if (e.key === ']') {
      e.preventDefault();
      if (isShift) {
        reorderSelection('forward');
      } else {
        reorderSelection('front');
      }
    } else if (e.key === '[') {
      e.preventDefault();
      if (isShift) {
        reorderSelection('backward');
      } else {
        reorderSelection('back');
      }
    }
  }

  // 7. Zoom Controls
  if (isCtrl) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      zoomTo(state.view.zoom + 0.1);
    } else if (e.key === '-') {
      e.preventDefault();
      zoomTo(state.view.zoom - 0.1);
    } else if (e.key === '0') {
      e.preventDefault();
      zoomTo(1.0); // Reset
    }
  }

  // Shift + 1: Zoom to fit screen
  if (isShift && e.key === '1') {
    e.preventDefault();
    zoomToFitScreen();
  }

  // 8. Nudging Elements via Arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    nudgeSelection(e);
  }
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    window.spacePressed = false;
    const statusText = document.getElementById('status-tool');
    if (statusText) statusText.innerText = `Tool: ${state.tool.charAt(0).toUpperCase() + state.tool.slice(1)}`;
    document.getElementById('canvas-scroll-container').style.cursor = 'default';
  }
}

/**
 * Handles Arrow keys movement of selection elements.
 */
function nudgeSelection(e) {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  // Verify elements are not locked
  const movableIds = selection.filter(id => !getObjectById(id)?.locked);
  if (movableIds.length === 0) return;

  const key = e.key;
  const isShift = e.shiftKey;

  // Determine displacement amount
  let step = 1;
  if (isShift) {
    step = 10;
  } else if (state.settings.snapEnabled) {
    step = state.settings.gridSize;
  }

  let dx = 0;
  let dy = 0;

  switch (key) {
    case 'ArrowUp': dy = -step; break;
    case 'ArrowDown': dy = step; break;
    case 'ArrowLeft': dx = -step; break;
    case 'ArrowRight': dx = step; break;
  }

  if (dx === 0 && dy === 0) return;

  // Capture starting positions for history collapser if not already captured
  if (!initialNudgeStates) {
    initialNudgeStates = new Map();
    const allIds = collectAllChildren(movableIds);
    allIds.forEach(id => {
      const obj = getObjectById(id);
      if (obj) {
        initialNudgeStates.set(id, {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation
        });
      }
    });
    nudgeTotalDx = 0;
    nudgeTotalDy = 0;
  }

  // Accumulate total coordinates delta
  nudgeTotalDx += dx;
  nudgeTotalDy += dy;

  // Apply nudge position update
  const updateMap = {};
  const allIdsToNudge = collectAllChildren(movableIds);
  allIdsToNudge.forEach(id => {
    const obj = getObjectById(id);
    if (obj) {
      updateMap[id] = {
        x: obj.x + dx,
        y: obj.y + dy
      };
    }
  });

  updateObjectProperties(updateMap);

  // Trigger debounced history pusher
  commitNudgeHistory();
}

/**
 * Standard Zoom to Fit logic.
 */
function zoomToFitScreen() {
  const viewport = document.getElementById('canvas-scroll-container');
  const objects = getObjects();
  if (!viewport || objects.length === 0) return;

  // Calculate boundary box of all canvas objects
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  objects.forEach(obj => {
    if (obj.type !== 'guide') {
      minX = Math.min(minX, obj.x);
      maxX = Math.max(maxX, obj.x + obj.width);
      minY = Math.min(minY, obj.y);
      maxY = Math.max(maxY, obj.y + obj.height);
    }
  });

  if (minX === Infinity) return;

  const w = maxX - minX;
  const h = maxY - minY;

  const vw = viewport.clientWidth - 80; // Add padding
  const vh = viewport.clientHeight - 80;

  // Calculate zoom required
  const zoomW = vw / w;
  const zoomH = vh / h;
  const newZoom = Math.min(zoomW, zoomH);

  // Center pan positions
  const panX = (viewport.clientWidth - w * newZoom) / 2 - minX * newZoom;
  const panY = (viewport.clientHeight - h * newZoom) / 2 - minY * newZoom;

  zoomTo(newZoom, null, null);
  updateView({ zoom: newZoom, panX, panY });
}
