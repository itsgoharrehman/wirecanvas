import { state, getObjects, getObjectById } from './state.js';

// Snap threshold in canvas pixels
const SNAP_THRESHOLD = 5;

/**
 * Clears the smart guides SVG overlay.
 */
export function clearSmartGuides() {
  const svg = document.getElementById('smart-guides-svg');
  if (svg) svg.innerHTML = '';
}

/**
 * Computes snap offsets and renders pink smart guides on the screen.
 * @param {Array<string>} targetIds - Active selection object IDs.
 * @param {number} x - Suggested x coordinates.
 * @param {number} y - Suggested y coordinates.
 * @param {number} width - Selection bounding width.
 * @param {number} height - Selection bounding height.
 * @returns {{snapX: number, snapY: number}} - Snapped coordinates.
 */
export function computeAndDrawGuides(targetIds, x, y, width, height) {
  clearSmartGuides();

  const objects = getObjects();
  const view = state.view;
  const zoom = view.zoom;

  // Snapping target bounding box edges
  const tLeft = x;
  const tCenterX = x + width / 2;
  const tRight = x + width;
  const tTop = y;
  const tCenterY = y + height / 2;
  const tBottom = y + height;

  let snapX = x;
  let snapY = y;
  let snappedH = false;
  let snappedV = false;

  const guides = []; // List of visual guide lines to draw: { x, y, type: 'v' | 'h', length }

  // Snapping candidates: non-selected, non-hidden, non-nested objects
  const candidates = objects.filter(obj => 
    !targetIds.includes(obj.id) && 
    !obj.hidden && 
    !obj.parentId &&
    obj.type !== 'guide'
  );

  // 1. Horizontal Snapping (Vertical guide lines)
  for (const cand of candidates) {
    const cLeft = cand.x;
    const cCenterX = cand.x + cand.width / 2;
    const cRight = cand.x + cand.width;
    const cTop = cand.y;
    const cBottom = cand.y + cand.height;

    // Check alignments: Left-Left, Center-Center, Right-Right, Left-Right, Right-Left
    const checks = [
      { t: tLeft, c: cLeft, offset: 0, label: 'L-L' },
      { t: tCenterX, c: cCenterX, offset: -width / 2, label: 'C-C' },
      { t: tRight, c: cRight, offset: -width, label: 'R-R' },
      { t: tLeft, c: cRight, offset: 0, label: 'L-R' },
      { t: tRight, c: cLeft, offset: -width, label: 'R-L' }
    ];

    for (const check of checks) {
      if (Math.abs(check.t - check.c) < SNAP_THRESHOLD) {
        snapX = check.c + check.offset;
        snappedH = true;

        // Visual line bounding boundaries
        const yMin = Math.min(tTop, cTop);
        const yMax = Math.max(tBottom, cBottom);
        
        guides.push({
          x: check.c,
          y1: yMin,
          y2: yMax,
          type: 'v'
        });
        break;
      }
    }
    if (snappedH) break;
  }

  // 2. Vertical Snapping (Horizontal guide lines)
  for (const cand of candidates) {
    const cLeft = cand.x;
    const cRight = cand.x + cand.width;
    const cTop = cand.y;
    const cCenterY = cand.y + cand.height / 2;
    const cBottom = cand.y + cand.height;

    // Check alignments: Top-Top, Center-Center, Bottom-Bottom, Top-Bottom, Bottom-Top
    const checks = [
      { t: tTop, c: cTop, offset: 0, label: 'T-T' },
      { t: tCenterY, c: cCenterY, offset: -height / 2, label: 'C-C' },
      { t: tBottom, c: cBottom, offset: -height, label: 'B-B' },
      { t: tTop, c: cBottom, offset: 0, label: 'T-B' },
      { t: tBottom, c: cTop, offset: -height, label: 'B-T' }
    ];

    for (const check of checks) {
      if (Math.abs(check.t - check.c) < SNAP_THRESHOLD) {
        snapY = check.c + check.offset;
        snappedV = true;

        // Visual line bounding boundaries
        const xMin = Math.min(tLeft, cLeft);
        const xMax = Math.max(tRight, cRight);

        guides.push({
          y: check.c,
          x1: xMin,
          x2: xMax,
          type: 'h'
        });
        break;
      }
    }
    if (snappedV) break;
  }

  // Draw the computed alignment guides in the screen-space overlay
  if (guides.length > 0) {
    drawGuidesSVG(guides, zoom);
  }

  return { snapX, snapY };
}

/**
 * Draws guide lines inside the smart-guides-svg container.
 */
function drawGuidesSVG(guides, zoom) {
  const svg = document.getElementById('smart-guides-svg');
  if (!svg) return;

  // Renders lines by multiplying canvas coordinates * zoom scale
  guides.forEach(g => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'smart-guide-line');
    
    if (g.type === 'v') {
      const x = g.x * zoom;
      const y1 = g.y1 * zoom;
      const y2 = g.y2 * zoom;
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y2));
    } else {
      const y = g.y * zoom;
      const x1 = g.x1 * zoom;
      const x2 = g.x2 * zoom;
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y));
    }
    svg.appendChild(line);
  });
}
