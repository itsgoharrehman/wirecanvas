import { getComponentConfig, applyCommonStyles } from '../components/registry.js';
import { state, getObjects, getObjectById } from './state.js';
import { getRotatedBounds } from './utils.js';

// DOM Cache Map to avoid querying the DOM repeatedly
const elementCache = new Map();

/**
 * Returns the DOM element for an object ID from the cache or DOM.
 */
export function getElementByObjectId(id) {
  if (elementCache.has(id)) {
    const el = elementCache.get(id);
    if (el.parentNode) return el;
  }
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    elementCache.set(id, el);
  }
  return el;
}

/**
 * Completely clears the DOM cache and removes all components from the canvas.
 */
export function clearCanvasDOM() {
  const container = document.getElementById('canvas-objects-layer');
  if (container) container.innerHTML = '';
  elementCache.clear();
}

/**
 * Mounts (renders and appends) a single object (and its children recursively) to the DOM.
 */
export function mountObject(obj, pageObjects, parentEl = null) {
  const config = getComponentConfig(obj.type);
  if (!config) {
    console.warn(`No component configuration found for type: ${obj.type}`);
    return null;
  }

  // Create root element
  const el = config.render(obj);
  elementCache.set(obj.id, el);

  // Apply common position/visual styles
  const parentObj = obj.parentId ? pageObjects.find(o => o.id === obj.parentId) : null;
  applyCommonStyles(obj, el, parentObj);

  // If this is a container (group, tabs, table, etc.) and has children, mount them
  if (obj.childIds && obj.childIds.length > 0) {
    // Find container element inside el where children should go (e.g. content pane for tabs, or root for group)
    let childContainer = el;
    if (obj.type === 'tabs') {
      childContainer = el.querySelector('.wc-tabs-content') || el;
    }
    
    obj.childIds.forEach(cid => {
      const childObj = pageObjects.find(o => o.id === cid);
      if (childObj) {
        mountObject(childObj, pageObjects, childContainer);
      }
    });
  }

  // Append to parent or objects layer
  if (parentEl) {
    parentEl.appendChild(el);
  } else {
    const mainContainer = document.getElementById('canvas-objects-layer');
    if (mainContainer) mainContainer.appendChild(el);
  }

  return el;
}

/**
 * Removes an object's DOM element from the canvas and cache.
 */
export function unmountObject(id) {
  const el = getElementByObjectId(id);
  if (el) {
    el.remove();
  }
  elementCache.delete(id);
}

/**
 * Patches a single object's DOM element when its state changes.
 */
export function patchObject(id) {
  const obj = getObjectById(id);
  if (!obj) {
    unmountObject(id);
    return;
  }

  let el = getElementByObjectId(id);
  if (!el) {
    // If not mounted (culled), we might need to mount it if it has entered the viewport.
    // The culling run will handle this.
    return;
  }

  const config = getComponentConfig(obj.type);
  if (!config) return;

  // Apply visual settings
  const pageObjects = getObjects();
  const parentObj = obj.parentId ? pageObjects.find(o => o.id === obj.parentId) : null;
  applyCommonStyles(obj, el, parentObj);

  // Call component-specific patch functions
  config.editableProperties.forEach(prop => {
    if (prop === 'constraints') {
      config.onPropertyChange(obj, 'constraints', obj.constraints, el);
    } else if (prop === 'metadata') {
      config.onPropertyChange(obj, 'metadata', obj.metadata, el);
    } else if (obj[prop] !== undefined) {
      config.onPropertyChange(obj, prop, obj[prop], el);
    }
  });

  // Re-patch z-order and locking classes if necessary
  el.style.zIndex = obj.zIndex;
  el.classList.toggle('locked', !!obj.locked);
  el.classList.toggle('hidden-object', !!obj.hidden);
}

/**
 * Executes a viewport culling pass on top-level canvas objects.
 * Visible objects are mounted; offscreen top-level objects are unmounted.
 */
export function executeViewportCulling() {
  const viewport = document.getElementById('canvas-scroll-container');
  if (!viewport) return;

  const view = state.view;
  const zoom = view.zoom;
  const panX = view.panX;
  const panY = view.panY;

  const vWidth = viewport.clientWidth;
  const vHeight = viewport.clientHeight;

  // Compute viewport bounds in canvas coordinates
  // ScrollLeft / ScrollTop represent scroll offsets, but since we are panning manually via translates:
  const xMin = -panX / zoom - 200;
  const xMax = (-panX + vWidth) / zoom + 200;
  const yMin = -panY / zoom - 200;
  const yMax = (-panY + vHeight) / zoom + 200;

  const pageObjects = getObjects();
  
  // Filter top-level elements (no parent group)
  const topLevelObjects = pageObjects.filter(obj => !obj.parentId);

  topLevelObjects.forEach(obj => {
    // Get axis-aligned bounds of object (including rotation)
    const bounds = getRotatedBounds(obj.x, obj.y, obj.width, obj.height, obj.rotation);

    // Check intersection with viewport (buffered rect)
    const isVisible = !(
      bounds.right < xMin ||
      bounds.left > xMax ||
      bounds.bottom < yMin ||
      bounds.top > yMax
    );

    const isMounted = elementCache.has(obj.id);

    if (isVisible && !obj.hidden) {
      if (!isMounted) {
        // Mount it
        mountObject(obj, pageObjects);
      } else {
        // Already mounted, ensure it is in the DOM (in case it was detached)
        const el = getElementByObjectId(obj.id);
        if (el && !el.parentNode) {
          const mainContainer = document.getElementById('canvas-objects-layer');
          if (mainContainer) mainContainer.appendChild(el);
        }
      }
    } else {
      if (isMounted) {
        // Cull it (unmount from DOM to save browser cycles)
        unmountObject(obj.id);
      }
    }
  });
}

/**
 * Targeted UI render dispatcher.
 * Handles state updates without re-building the entire DOM.
 */
export function initRenderCoordinator() {
  // Listen to state changes
  state.subscribe((event, detail) => {
    switch (event) {
      case 'project-loaded':
      case 'page-changed':
        clearCanvasDOM();
        executeViewportCulling();
        break;
      case 'objects-changed':
        const { changeType, objectIds } = detail;
        if (changeType === 'refresh') {
          clearCanvasDOM();
          executeViewportCulling();
        } else if (changeType === 'add') {
          executeViewportCulling();
        } else if (changeType === 'delete') {
          if (objectIds) {
            objectIds.forEach(id => unmountObject(id));
          }
          executeViewportCulling();
        } else if (changeType === 'modify') {
          if (objectIds) {
            objectIds.forEach(id => {
              const obj = getObjectById(id);
              if (obj && obj.parentId) {
                // If it is nested inside a group, patch it
                patchObject(id);
              } else {
                // Top level objects - patch or cull-evaluate
                executeViewportCulling();
                patchObject(id);
              }
            });
          }
        }
        break;
      case 'view-changed':
        executeViewportCulling();
        break;
    }
  });
}
