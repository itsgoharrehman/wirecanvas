const registry = new Map();

/**
 * Registers a component specification.
 * @param {Object} config - Component configurations and render functions.
 */
export function registerComponent(config) {
  if (!config.type) {
    throw new Error("Component configuration must have a 'type' identifier.");
  }
  registry.set(config.type, config);
}

/**
 * Returns the component configuration for the given type.
 * @param {string} type - Component type.
 */
export function getComponentConfig(type) {
  return registry.get(type);
}

/**
 * Returns all registered component configurations.
 */
export function getAllComponentConfigs() {
  return Array.from(registry.values());
}

/**
 * Helper to apply common style attributes to a component's root DOM element.
 * Minimizes duplicate rendering code.
 */
export function applyCommonStyles(obj, el, parentObj = null) {
  // Coordinate positioning relative to parent if inside a group
  const parentX = parentObj ? parentObj.x : 0;
  const parentY = parentObj ? parentObj.y : 0;
  
  el.style.left = `${obj.x - parentX}px`;
  el.style.top = `${obj.y - parentY}px`;
  el.style.width = `${obj.width}px`;
  el.style.height = `${obj.height}px`;
  el.style.transform = `rotate(${obj.rotation}deg)`;
  el.style.zIndex = obj.zIndex;
  el.style.opacity = obj.opacity;
  
  // Exclude SVG lines and arrows from standard box styling
  if (obj.type !== 'line' && obj.type !== 'arrow') {
    // Fill background (with support for color hex + opacity)
    if (obj.fill === 'transparent') {
      el.style.backgroundColor = 'transparent';
    } else {
      // Support alpha colors or hex color direct values
      el.style.backgroundColor = obj.fill || '#ffffff';
    }
    
    // Border
    if (obj.border) {
      el.style.borderStyle = obj.border.style || 'solid';
      el.style.borderWidth = `${obj.border.width}px`;
      el.style.borderColor = obj.border.color || '#475569';
    } else {
      el.style.borderStyle = 'none';
      el.style.borderWidth = '0px';
    }
    
    // Corner Radius
    if (obj.borderRadius !== undefined) {
      if (typeof obj.borderRadius === 'object') {
        el.style.borderTopLeftRadius = `${obj.borderRadius.tl || 0}px`;
        el.style.borderTopRightRadius = `${obj.borderRadius.tr || 0}px`;
        el.style.borderBottomRightRadius = `${obj.borderRadius.br || 0}px`;
        el.style.borderBottomLeftRadius = `${obj.borderRadius.bl || 0}px`;
      } else {
        el.style.borderRadius = `${obj.borderRadius}px`;
      }
    } else {
      el.style.borderRadius = '0px';
    }
  }

  // Handle Locked / Hidden tags
  el.classList.toggle('locked', !!obj.locked);
  el.classList.toggle('hidden-object', !!obj.hidden);
  
  // Set data attribute for pointer event target checking
  el.setAttribute('data-id', obj.id);
  el.setAttribute('data-type', obj.type);
}
