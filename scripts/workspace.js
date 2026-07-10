import { state, updateView } from './state.js';
import { executeViewportCulling } from './render.js';

// Dom references
let hRuler = null;
let vRuler = null;
let container = null;
let canvas = null;

// Track active mouse position for ruler indicator drawing
let mouseCanvasX = 0;
let mouseCanvasY = 0;

/**
 * Initialize workspace coordinate transforms, rulers, zooming, panning, and guide dropping.
 */
export function initWorkspace() {
  hRuler = document.getElementById('ruler-horizontal');
  vRuler = document.getElementById('ruler-vertical');
  container = document.getElementById('canvas-scroll-container');
  canvas = document.getElementById('workspace-canvas');

  if (!hRuler || !vRuler || !container || !canvas) return;

  // Set up observers
  window.addEventListener('resize', () => {
    resizeRulerCanvases();
    drawRulers();
  });
  
  // Listen to state view updates
  state.subscribe((event) => {
    if (event === 'view-changed' || event === 'project-loaded' || event === 'page-changed') {
      applyViewTransform();
      drawRulers();
    }
  });

  // Track mouse coordinates on workspace to update status bar and ruler indicators
  container.addEventListener('pointermove', updateRulerMouseIndicator);

  // Setup rulers canvas sizes
  resizeRulerCanvases();
  applyViewTransform();
  drawRulers();
}

/**
 * Resizes 2D canvases to match client bounding boxes.
 */
function resizeRulerCanvases() {
  const dpr = window.devicePixelRatio || 1;
  
  hRuler.width = hRuler.clientWidth * dpr;
  hRuler.height = hRuler.clientHeight * dpr;
  hRuler.getContext('2d').scale(dpr, dpr);
  
  vRuler.width = vRuler.clientWidth * dpr;
  vRuler.height = vRuler.clientHeight * dpr;
  vRuler.getContext('2d').scale(dpr, dpr);
}

/**
 * Applies view transforms to the workspace canvas DOM.
 */
function applyViewTransform() {
  const view = state.view;
  canvas.style.transform = `translate3d(${view.panX}px, ${view.panY}px, 0) scale(${view.zoom})`;
}

/**
 * Updates coordinates on cursor move and triggers ruler redraw.
 */
function updateRulerMouseIndicator(e) {
  const rect = container.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const view = state.view;
  // Convert screen coordinates to canvas logical coordinates
  mouseCanvasX = Math.round((screenX - view.panX) / view.zoom);
  mouseCanvasY = Math.round((screenY - view.panY) / view.zoom);

  // Update status bar text
  const coordDisplay = document.getElementById('status-coords');
  if (coordDisplay) {
    coordDisplay.innerText = `x: ${mouseCanvasX}px, y: ${mouseCanvasY}px`;
  }

  // Redraw rulers to draw the cursor indicators
  drawRulers();
}

/**
 * Draws coordinate grids and ticks on canvas rulers.
 */
export function drawRulers() {
  if (!state.settings.rulersVisible) {
    hRuler.style.display = 'none';
    vRuler.style.display = 'none';
    document.getElementById('ruler-corner').style.display = 'none';
    document.getElementById('editor-viewport').style.gridTemplateColumns = '0px 1fr';
    document.getElementById('editor-viewport').style.gridTemplateRows = '0px 1fr';
    return;
  } else {
    hRuler.style.display = 'block';
    vRuler.style.display = 'block';
    document.getElementById('ruler-corner').style.display = 'block';
    document.getElementById('editor-viewport').style.gridTemplateColumns = '20px 1fr';
    document.getElementById('editor-viewport').style.gridTemplateRows = '20px 1fr';
  }

  const hCtx = hRuler.getContext('2d');
  const vCtx = vRuler.getContext('2d');

  const w = hRuler.clientWidth;
  const h = vRuler.clientHeight;

  const view = state.view;
  const zoom = view.zoom;
  const panX = view.panX;
  const panY = view.panY;

  // Clear contexts
  hCtx.fillStyle = '#ffffff';
  hCtx.fillRect(0, 0, w, 20);
  
  vCtx.fillStyle = '#ffffff';
  vCtx.fillRect(0, 0, 20, h);

  // Draw borders
  hCtx.strokeStyle = '#e2e8f0';
  hCtx.lineWidth = 1;
  hCtx.beginPath();
  hCtx.moveTo(0, 19.5);
  hCtx.lineTo(w, 19.5);
  hCtx.stroke();

  vCtx.strokeStyle = '#e2e8f0';
  vCtx.lineWidth = 1;
  vCtx.beginPath();
  vCtx.moveTo(19.5, 0);
  vCtx.lineTo(19.5, h);
  vCtx.stroke();

  // Tick marking math
  let majorInterval = 100;
  if (zoom < 0.35) {
    majorInterval = 500;
  } else if (zoom < 0.75) {
    majorInterval = 200;
  } else if (zoom >= 1.5) {
    majorInterval = 50;
  }
  
  const minorInterval = majorInterval / 10;
  
  hCtx.font = '9px system-ui, sans-serif';
  hCtx.fillStyle = '#64748b';
  hCtx.textAlign = 'left';
  hCtx.textBaseline = 'top';

  vCtx.font = '9px system-ui, sans-serif';
  vCtx.fillStyle = '#64748b';
  vCtx.textAlign = 'left';
  vCtx.textBaseline = 'top';

  // 1. Draw Horizontal Ruler ticks
  const startX = Math.floor(-panX / (zoom * minorInterval)) * minorInterval;
  const endX = Math.ceil((w - panX) / (zoom * minorInterval)) * minorInterval;

  for (let x = startX; x <= endX; x += minorInterval) {
    const screenX = x * zoom + panX;
    if (screenX < 0 || screenX > w) continue;

    const isMajor = Math.abs(x % majorInterval) < 0.001;
    
    hCtx.strokeStyle = isMajor ? '#94a3b8' : '#cbd5e1';
    hCtx.beginPath();
    hCtx.moveTo(screenX, isMajor ? 6 : 12);
    hCtx.lineTo(screenX, 20);
    hCtx.stroke();

    if (isMajor) {
      hCtx.fillText(String(x), screenX + 3, 2);
    }
  }

  // 2. Draw Vertical Ruler ticks
  const startY = Math.floor(-panY / (zoom * minorInterval)) * minorInterval;
  const endY = Math.ceil((h - panY) / (zoom * minorInterval)) * minorInterval;

  for (let y = startY; y <= endY; y += minorInterval) {
    const screenY = y * zoom + panY;
    if (screenY < 0 || screenY > h) continue;

    const isMajor = Math.abs(y % majorInterval) < 0.001;
    
    vCtx.strokeStyle = isMajor ? '#94a3b8' : '#cbd5e1';
    vCtx.beginPath();
    vCtx.moveTo(isMajor ? 6 : 12, screenY);
    vCtx.lineTo(20, screenY);
    vCtx.stroke();

    if (isMajor) {
      // Draw text rotated, or just stacked
      vCtx.save();
      vCtx.translate(2, screenY + 2);
      vCtx.fillText(String(y), 0, 0);
      vCtx.restore();
    }
  }

  // 3. Draw cursor indicators (red ticks)
  const indX = mouseCanvasX * zoom + panX;
  if (indX >= 0 && indX <= w) {
    hCtx.strokeStyle = '#e20074';
    hCtx.lineWidth = 1;
    hCtx.beginPath();
    hCtx.moveTo(indX, 0);
    hCtx.lineTo(indX, 20);
    hCtx.stroke();
  }

  const indY = mouseCanvasY * zoom + panY;
  if (indY >= 0 && indY <= h) {
    vCtx.strokeStyle = '#e20074';
    vCtx.lineWidth = 1;
    vCtx.beginPath();
    vCtx.moveTo(0, indY);
    vCtx.lineTo(20, indY);
    vCtx.stroke();
  }
}

/**
 * Screen to Canvas coordinate translation.
 */
export function screenToCanvas(screenX, screenY) {
  const rect = container.getBoundingClientRect();
  const view = state.view;
  const x = (screenX - rect.left - view.panX) / view.zoom;
  const y = (screenY - rect.top - view.panY) / view.zoom;
  return { x, y };
}

/**
 * Canvas to Screen coordinate translation.
 */
export function canvasToScreen(canvasX, canvasY) {
  const rect = container.getBoundingClientRect();
  const view = state.view;
  const x = canvasX * view.zoom + view.panX + rect.left;
  const y = canvasY * view.zoom + view.panY + rect.top;
  return { x, y };
}

/**
 * Zooms the view centered around a specific canvas point or screen point.
 */
export function zoomTo(newZoom, centerX = null, centerY = null) {
  const view = state.view;
  const oldZoom = view.zoom;
  
  // Clamp zoom between 25% and 200%
  const zoom = Math.min(Math.max(newZoom, 0.25), 2.0);
  
  let panX = view.panX;
  let panY = view.panY;
  
  if (centerX !== null && centerY !== null) {
    // Zoom centered around coordinates: keep visual point under cursor invariant
    // screenPoint = canvasPoint * zoom + pan => pan = screenPoint - canvasPoint * zoom
    panX = centerX - ((centerX - panX) / oldZoom) * zoom;
    panY = centerY - ((centerY - panY) / oldZoom) * zoom;
  }
  
  updateView({ zoom, panX, panY });
  
  // Update UI dropdown button text
  const zoomText = document.getElementById('zoom-text');
  if (zoomText) {
    zoomText.innerText = `${Math.round(zoom * 100)}%`;
  }
}
