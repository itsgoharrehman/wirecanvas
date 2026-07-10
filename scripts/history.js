import { state, getActivePage, setObjects, updateObjectProperties, setSelection, notify } from './state.js';
import { deepClone } from './utils.js';
import { saveProject } from './storage.js';

// Map of pageId -> HistoryStack
const pageHistoryStacks = new Map();

class HistoryStack {
  constructor() {
    this.stack = [];
    this.pointer = -1;
    this.maxSize = 100;
  }

  push(command) {
    // Truncate any commands ahead of the pointer (if user did undo, then does a new action)
    this.stack = this.stack.slice(0, this.pointer + 1);
    
    this.stack.push(command);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.pointer++;
    }
    
    saveProject();
  }

  undo() {
    if (this.pointer >= 0) {
      const command = this.stack[this.pointer];
      command.undo();
      this.pointer--;
      saveProject();
      return true;
    }
    return false;
  }

  redo() {
    if (this.pointer < this.stack.length - 1) {
      this.pointer++;
      const command = this.stack[this.pointer];
      command.execute();
      saveProject();
      return true;
    }
    return false;
  }

  clear() {
    this.stack = [];
    this.pointer = -1;
  }
}

/**
 * Gets or creates the history stack for the active page.
 */
export function getActiveHistoryStack() {
  const pageId = state.activePageId;
  if (!pageHistoryStacks.has(pageId)) {
    pageHistoryStacks.set(pageId, new HistoryStack());
  }
  return pageHistoryStacks.get(pageId);
}

/**
 * Clear all history stacks (e.g. on new project load).
 */
export function clearAllHistory() {
  pageHistoryStacks.clear();
}

/**
 * Executes a command and pushes it to history.
 */
export function executeCommand(command) {
  command.execute();
  getActiveHistoryStack().push(command);
}

/**
 * Performs Undo.
 */
export function undo() {
  const success = getActiveHistoryStack().undo();
  if (success) {
    notify('history-changed', { canUndo: canUndo(), canRedo: canRedo() });
  }
}

/**
 * Performs Redo.
 */
export function redo() {
  const success = getActiveHistoryStack().redo();
  if (success) {
    notify('history-changed', { canUndo: canUndo(), canRedo: canRedo() });
  }
}

export function canUndo() {
  const stack = getActiveHistoryStack();
  return stack.pointer >= 0;
}

export function canRedo() {
  const stack = getActiveHistoryStack();
  return stack.pointer < stack.stack.length - 1;
}


// COMMAND IMPLEMENTATIONS

/**
 * Command for Creating objects.
 */
export class CreateCommand {
  constructor(objects) {
    this.objects = Array.isArray(objects) ? objects.map(deepClone) : [deepClone(objects)];
    this.ids = this.objects.map(o => o.id);
  }

  execute() {
    const pageObjects = getActivePage().objects;
    // Add only if not already present
    this.objects.forEach(obj => {
      if (!pageObjects.some(o => o.id === obj.id)) {
        pageObjects.push(deepClone(obj));
      }
    });
    setSelection(this.ids);
    notify('objects-changed', { changeType: 'add', objectIds: this.ids });
  }

  undo() {
    const page = getActivePage();
    page.objects = page.objects.filter(obj => !this.ids.includes(obj.id));
    setSelection([]);
    notify('objects-changed', { changeType: 'delete', objectIds: this.ids });
  }
}

/**
 * Command for Deleting objects.
 */
export class DeleteCommand {
  constructor(objects) {
    this.objects = Array.isArray(objects) ? objects.map(deepClone) : [deepClone(objects)];
    this.ids = this.objects.map(o => o.id);
  }

  execute() {
    const page = getActivePage();
    page.objects = page.objects.filter(obj => !this.ids.includes(obj.id));
    setSelection([]);
    notify('objects-changed', { changeType: 'delete', objectIds: this.ids });
  }

  undo() {
    const page = getActivePage();
    // Restore deleted objects
    this.objects.forEach(obj => {
      if (!page.objects.some(o => o.id === obj.id)) {
        page.objects.push(deepClone(obj));
      }
    });
    setSelection(this.ids);
    notify('objects-changed', { changeType: 'add', objectIds: this.ids });
  }
}

/**
 * Command for geometric transforms (move, resize, rotate).
 * transformMap format: { [id]: { before: {x,y,w,h,r}, after: {x,y,w,h,r} } }
 */
export class TransformCommand {
  constructor(transformMap) {
    this.transformMap = deepClone(transformMap);
    this.ids = Object.keys(transformMap);
  }

  execute() {
    const updateMap = {};
    for (const [id, bounds] of Object.entries(this.transformMap)) {
      updateMap[id] = bounds.after;
    }
    updateObjectProperties(updateMap);
    setSelection(this.ids);
  }

  undo() {
    const updateMap = {};
    for (const [id, bounds] of Object.entries(this.transformMap)) {
      updateMap[id] = bounds.before;
    }
    updateObjectProperties(updateMap);
    setSelection(this.ids);
  }
}

/**
 * Command for updating visual properties (fill, border, corner radius, text, contents).
 * propertyMap format: { [id]: { before: { [key]: val }, after: { [key]: val } } }
 */
export class PropertyCommand {
  constructor(propertyMap) {
    this.propertyMap = deepClone(propertyMap);
    this.ids = Object.keys(propertyMap);
  }

  execute() {
    const updateMap = {};
    for (const [id, props] of Object.entries(this.propertyMap)) {
      updateMap[id] = props.after;
    }
    updateObjectProperties(updateMap);
    setSelection(this.ids);
  }

  undo() {
    const updateMap = {};
    for (const [id, props] of Object.entries(this.propertyMap)) {
      updateMap[id] = props.before;
    }
    updateObjectProperties(updateMap);
    setSelection(this.ids);
  }
}

/**
 * Command for reordering objects (Bring to front, send to back, etc.).
 */
export class ReorderCommand {
  constructor(beforeObjects, afterObjects) {
    this.beforeObjects = deepClone(beforeObjects);
    this.afterObjects = deepClone(afterObjects);
  }

  execute() {
    setObjects(deepClone(this.afterObjects));
    notify('layers-list-changed');
  }

  undo() {
    setObjects(deepClone(this.beforeObjects));
    notify('layers-list-changed');
  }
}

/**
 * Command for grouping selection list.
 */
export class GroupCommand {
  constructor(groupObject, childIds) {
    this.groupObject = deepClone(groupObject);
    this.childIds = [...childIds];
    this.groupId = groupObject.id;
  }

  execute() {
    const page = getActivePage();
    // Add the group container object to pages list
    page.objects.push(deepClone(this.groupObject));
    // Reparent childIds
    page.objects.forEach(obj => {
      if (this.childIds.includes(obj.id)) {
        obj.parentId = this.groupId;
      }
    });
    setSelection(this.groupId);
    notify('objects-changed', { changeType: 'add', objectIds: [this.groupId] });
    notify('layers-list-changed');
  }

  undo() {
    const page = getActivePage();
    // Remove group container
    page.objects = page.objects.filter(obj => obj.id !== this.groupId);
    // Un-parent child elements
    page.objects.forEach(obj => {
      if (this.childIds.includes(obj.id)) {
        obj.parentId = null;
      }
    });
    setSelection(this.childIds);
    notify('objects-changed', { changeType: 'delete', objectIds: [this.groupId] });
    notify('layers-list-changed');
  }
}

/**
 * Command for ungrouping a group container.
 */
export class UngroupCommand {
  constructor(groupObject, childIds) {
    this.groupObject = deepClone(groupObject);
    this.childIds = [...childIds];
    this.groupId = groupObject.id;
  }

  execute() {
    const page = getActivePage();
    // Remove group container
    page.objects = page.objects.filter(obj => obj.id !== this.groupId);
    // Un-parent children
    page.objects.forEach(obj => {
      if (this.childIds.includes(obj.id)) {
        obj.parentId = null;
      }
    });
    setSelection(this.childIds);
    notify('objects-changed', { changeType: 'delete', objectIds: [this.groupId] });
    notify('layers-list-changed');
  }

  undo() {
    const page = getActivePage();
    // Restore group container
    page.objects.push(deepClone(this.groupObject));
    // Re-parent children
    page.objects.forEach(obj => {
      if (this.childIds.includes(obj.id)) {
        obj.parentId = this.groupId;
      }
    });
    setSelection(this.groupId);
    notify('objects-changed', { changeType: 'add', objectIds: [this.groupId] });
    notify('layers-list-changed');
  }
}
