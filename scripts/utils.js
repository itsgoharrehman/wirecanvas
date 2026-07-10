/**
 * WireCanvas Utility Helpers
 */

/**
 * Generates a unique v4 UUID.
 * Fallbacks to a math-based generator if crypto.randomUUID is not available.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Creates a deep copy of an object or array.
 * Safe for JSON-serializable types, which represent our object state models.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Use structuredClone if available
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {
      // Fall through to JSON clone on failure (e.g. DOM nodes, though they shouldn't be here)
    }
  }
  
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Throttles a function to run at most once in a given limit window.
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounces a function to delay its execution until a certain time has elapsed since the last call.
 */
export function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

/**
 * Computes bounding rectangle of an rotated element
 */
export function getRotatedBounds(x, y, w, h, angleDegrees) {
  if (angleDegrees === 0) {
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  }
  
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const cx = x + w / 2;
  const cy = y + h / 2;
  
  // Half-extents
  const hx = w / 2;
  const hy = h / 2;
  
  // 4 corners relative to center
  const corners = [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy }
  ];
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  corners.forEach(p => {
    // rotate
    const rx = cx + (p.x * cos - p.y * sin);
    const ry = cy + (p.x * sin + p.y * cos);
    
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  });
  
  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}
