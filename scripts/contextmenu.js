import { state, getObjects, getObjectById, setSelection, notify } from './state.js';
import { executeCommand, ReorderCommand, DeleteCommand, CreateCommand } from './history.js';
import { groupSelection, ungroupSelection } from './group.js';
import { deepClone, generateUUID } from './utils.js';

let menuEl = null;

/**
 * Initializes context menu click interceptions and action mappings.
 */
export function initContextMenu() {
  menuEl = document.getElementById('context-menu');
  const container = document.getElementById('canvas-scroll-container');

  if (!menuEl || !container) return;

  // Intercept right-clicks on canvas viewport
  container.addEventListener('contextmenu', onContextMenu);
  
  // Intercept menu item clicks
  menuEl.addEventListener('click', onMenuItemClick);

  // Close context menu on click elsewhere
  window.addEventListener('click', closeContextMenu);
  window.addEventListener('blur', closeContextMenu);
}

function onContextMenu(e) {
  // If target is inside panel sidebars or top toolbar, allow native context menu
  if (e.target.closest('.sidebar') || e.target.closest('#top-toolbar') || e.target.closest('#status-bar')) {
    return;
  }

  e.preventDefault();

  const componentEl = e.target.closest('.wc-component');
  if (componentEl) {
    const id = componentEl.getAttribute('data-id');
    // If not already in selection, select it
    if (!state.selection.includes(id)) {
      setSelection([id]);
    }
  } else {
    // Clicked empty space: clear selection
    setSelection([]);
  }

  // Adjust context menu item enable/disable states based on current selection
  updateMenuOptionsDisabledState();

  // Position context menu at mouse cursor coordinates
  menuEl.classList.remove('hidden');
  
  // Avoid menu going outside window boundaries
  const menuWidth = menuEl.offsetWidth || 200;
  const menuHeight = menuEl.offsetHeight || 300;
  
  let left = e.clientX;
  let top = e.clientY;

  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 8;
  }
  if (top + menuHeight > window.innerHeight) {
    top = window.innerHeight - menuHeight - 8;
  }

  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
}

function updateMenuOptionsDisabledState() {
  const selection = state.selection;
  const hasSelection = selection.length > 0;
  const objects = getObjects();
  
  const isLocked = hasSelection && selection.some(id => getObjectById(id)?.locked);
  const isGroup = hasSelection && selection.some(id => getObjectById(id)?.type === 'group');

  // Helper to toggle disabled class/attribute on buttons
  const setBtnState = (action, enabled) => {
    const btn = menuEl.querySelector(`[data-action="${action}"]`);
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.4';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  };

  // Group selection requires at least 2 items
  setBtnState('group', hasSelection && selection.length > 1 && !isLocked);
  // Ungroup selection requires a selected group
  setBtnState('ungroup', hasSelection && isGroup && !isLocked);

  // Edit actions (cut, copy, duplicate, delete, lock, hide, rename)
  setBtnState('cut', hasSelection && !isLocked);
  setBtnState('copy', hasSelection);
  setBtnState('paste', !!state.clipboard);
  setBtnState('paste-in-place', !!state.clipboard);
  setBtnState('duplicate', hasSelection && !isLocked);
  setBtnState('delete', hasSelection && !isLocked);
  
  // Reordering action items
  setBtnState('front', hasSelection && !isLocked);
  setBtnState('forward', hasSelection && !isLocked);
  setBtnState('backward', hasSelection && !isLocked);
  setBtnState('back', hasSelection && !isLocked);

  setBtnState('lock', hasSelection);
  setBtnState('hide', hasSelection);
  setBtnState('rename', hasSelection);
}

export function closeContextMenu() {
  if (menuEl) menuEl.classList.add('hidden');
}

function onMenuItemClick(e) {
  const item = e.target.closest('.context-menu-item');
  if (!item) return;

  const action = item.getAttribute('data-action');
  executeContextAction(action);
  closeContextMenu();
}

/**
 * Maps menu actions to state actions.
 */
export function executeContextAction(action) {
  const selection = state.selection;
  
  switch (action) {
    case 'cut':
      clipboardCut();
      break;
    case 'copy':
      clipboardCopy();
      break;
    case 'paste':
      clipboardPaste(false);
      break;
    case 'paste-in-place':
      clipboardPaste(true);
      break;
    case 'duplicate':
      duplicateSelection();
      break;
    case 'delete':
      deleteSelection();
      break;
    case 'group':
      groupSelection();
      break;
    case 'ungroup':
      ungroupSelection();
      break;
    case 'front':
      reorderSelection('front');
      break;
    case 'forward':
      reorderSelection('forward');
      break;
    case 'backward':
      reorderSelection('backward');
      break;
    case 'back':
      reorderSelection('back');
      break;
    case 'lock':
      toggleLockSelection();
      break;
    case 'hide':
      hideSelection();
      break;
    case 'rename':
      renameSelection();
      break;
  }
}

// ACTION IMPLEMENTATIONS

export function deleteSelection() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const toDelete = selection.map(id => getObjectById(id)).filter(Boolean);
  executeCommand(new DeleteCommand(toDelete));
}

export function toggleLockSelection() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const updateMap = {};
  selection.forEach(id => {
    const obj = getObjectById(id);
    if (obj) {
      updateMap[id] = { locked: !obj.locked };
    }
  });

  updateObjectProperties(updateMap);
}

export function hideSelection() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const updateMap = {};
  selection.forEach(id => {
    updateMap[id] = { hidden: true };
  });

  updateObjectProperties(updateMap);
  setSelection([]); // Clear selection since hidden elements cannot be selected on canvas
}

export function renameSelection() {
  const selection = state.selection;
  if (!selection || selection.length !== 1) return;

  // Dispatch renaming event. Left sidebar layers list will intercept this and pop open rename editor!
  notify('rename-layer', { objectId: selection[0] });
}

/**
 * Standard clipboard Cut.
 */
export function clipboardCut() {
  clipboardCopy();
  deleteSelection();
}

/**
 * Standard clipboard Copy.
 */
export function clipboardCopy() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  // Clone objects
  state.clipboard = selection.map(id => getObjectById(id)).filter(Boolean).map(deepClone);
}

/**
 * Standard clipboard Paste.
 */
export function clipboardPaste(inPlace = false) {
  if (!state.clipboard || state.clipboard.length === 0) return;

  const pageObjects = getObjects();
  const idMap = new Map();
  
  // Clone clipboard objects and assign new IDs
  const cloned = state.clipboard.map(obj => {
    const newId = generateUUID();
    idMap.set(obj.id, newId);
    
    // Shift slightly if paste is NOT in-place
    const offset = inPlace ? 0 : 20;
    
    return {
      ...deepClone(obj),
      id: newId,
      x: obj.x + offset,
      y: obj.y + offset
    };
  });

  // Re-parent nested groups childIds maps
  cloned.forEach(obj => {
    if (obj.parentId && idMap.has(obj.parentId)) {
      obj.parentId = idMap.get(obj.parentId);
    }
    if (obj.childIds) {
      obj.childIds = obj.childIds.map(cid => idMap.has(cid) ? idMap.get(cid) : cid);
    }
  });

  executeCommand(new CreateCommand(cloned));
}

/**
 * Duplicate active selection in-place with offset.
 */
export function duplicateSelection() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  // Temp copy clipboard, overwrite, paste, and restore clipboard
  const oldClipboard = state.clipboard;
  
  state.clipboard = selection.map(id => getObjectById(id)).filter(Boolean).map(deepClone);
  clipboardPaste(false); // paste with offset
  
  state.clipboard = oldClipboard;
}

/**
 * Handles Z-index layering adjustments.
 */
export function reorderSelection(direction) {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const objects = getObjects();
  const before = deepClone(objects);
  const selectedIds = new Set(selection);
  
  let after = [];

  if (direction === 'front') {
    const selected = objects.filter(o => selectedIds.has(o.id));
    const nonSelected = objects.filter(o => !selectedIds.has(o.id));
    after = [...nonSelected, ...selected];
  } else if (direction === 'back') {
    const selected = objects.filter(o => selectedIds.has(o.id));
    const nonSelected = objects.filter(o => !selectedIds.has(o.id));
    after = [...selected, ...nonSelected];
  } else if (direction === 'forward') {
    after = [...objects];
    for (let i = after.length - 2; i >= 0; i--) {
      if (selectedIds.has(after[i].id) && !selectedIds.has(after[i + 1].id)) {
        // Swap
        const temp = after[i];
        after[i] = after[i + 1];
        after[i + 1] = temp;
      }
    }
  } else if (direction === 'backward') {
    after = [...objects];
    for (let i = 1; i < after.length; i++) {
      if (selectedIds.has(after[i].id) && !selectedIds.has(after[i - 1].id)) {
        // Swap
        const temp = after[i];
        after[i] = after[i - 1];
        after[i - 1] = temp;
      }
    }
  }

  // Recalculate z-index properties based on array index order
  after.forEach((obj, idx) => {
    obj.zIndex = idx + 1;
  });

  executeCommand(new ReorderCommand(before, after));
}
