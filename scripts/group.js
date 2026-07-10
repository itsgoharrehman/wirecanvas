import { state, getObjects, getObjectById, setSelection } from './state.js';
import { executeCommand, GroupCommand, UngroupCommand } from './history.js';
import { generateUUID } from './utils.js';
import { getSelectionCanvasBounds } from './selection.js';

/**
 * Recursively collects all child IDs of a list of objects.
 * Useful for expanding transform actions (move, resize, rotate) to nested elements.
 */
export function collectAllChildren(ids) {
  const result = new Set();
  
  function collect(id) {
    if (result.has(id)) return;
    result.add(id);
    const obj = getObjectById(id);
    if (obj && obj.childIds) {
      obj.childIds.forEach(collect);
    }
  }

  ids.forEach(collect);
  return Array.from(result);
}

/**
 * Groups the current selection.
 */
export function groupSelection() {
  const selection = state.selection;
  if (!selection || selection.length <= 1) return; // Need at least 2 objects to group

  const bounds = getSelectionCanvasBounds();
  if (!bounds) return;

  const objects = getObjects();
  
  // Filter out objects that already have parents (we group top-level or sibling nodes)
  // Check if they are locked
  const targetObjects = selection.map(id => getObjectById(id)).filter(obj => obj && !obj.locked);
  const targetIds = targetObjects.map(obj => obj.id);
  
  if (targetIds.length <= 1) return;

  const groupId = generateUUID();
  const groupCount = objects.filter(o => o.type === 'group').length + 1;

  // Create group object schema
  const groupObject = {
    id: groupId,
    type: 'group',
    name: `Group ${groupCount}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    fill: 'transparent',
    opacity: 1,
    border: null,
    borderRadius: 0,
    parentId: null,
    childIds: targetIds,
    constraints: {},
    metadata: {}
  };

  executeCommand(new GroupCommand(groupObject, targetIds));
}

/**
 * Ungroups the selected group(s).
 */
export function ungroupSelection() {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const groupsToUngroup = selection
    .map(id => getObjectById(id))
    .filter(obj => obj && obj.type === 'group' && !obj.locked);

  if (groupsToUngroup.length === 0) return;

  groupsToUngroup.forEach(group => {
    executeCommand(new UngroupCommand(group, group.childIds));
  });
}
