import { state, getObjects, getObjectById, updateObjectProperties, setSelection } from './state.js';
import { executeCommand, PropertyCommand } from './history.js';
import { deepClone } from './utils.js';

let container = null;

// Track before-state for history commands
let beforePropertyState = null;

/**
 * Initializes the properties panel listeners.
 */
export function initPropertiesPanel() {
  container = document.getElementById('properties-panel-content');
  if (!container) return;

  state.subscribe((event) => {
    if (event === 'selection-changed' || event === 'objects-changed') {
      renderPropertiesPanel();
    }
  });

  renderPropertiesPanel();
}

/**
 * Main properties builder. Parses selection and builds layout inputs dynamically.
 */
function renderPropertiesPanel() {
  container.innerHTML = '';

  const selection = state.selection;
  if (!selection || selection.length === 0) {
    container.innerHTML = `
      <div style="padding: var(--spacing-lg); color: var(--text-muted); text-align: center;">
        Select an object on the canvas to view and edit its properties.
      </div>
    `;
    return;
  }

  // Gather objects in selection
  const selectedObjects = selection.map(id => getObjectById(id)).filter(Boolean);
  if (selectedObjects.length === 0) return;

  // Render quick alignment tools at the top
  renderQuickAlignTools();

  // Render geometry block
  renderGeometryProperties(selectedObjects);

  // Render component-specific properties (text editing, table columns, tabs items)
  renderTypeSpecificProperties(selectedObjects);

  // Render visual styling (fill, border, corners, opacity)
  renderStylingProperties(selectedObjects);
}

/**
 * Quick alignment buttons relative to selection bounding box or canvas.
 */
function renderQuickAlignTools() {
  const section = document.createElement('div');
  section.className = 'properties-section';
  section.innerHTML = `
    <h4>Align</h4>
    <div class="align-tools-grid">
      <button class="align-btn" data-align="left" title="Align Left">
        <svg class="icon" viewBox="0 0 24 24"><path d="M4 2v20M20 6H8v4h12V6Zm-4 8H8v4h8v-4Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="align-btn" data-align="center" title="Align Horizontal Center">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2v20M19 6H5v3h14V6Zm-2 9H7v3h10v-3Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="align-btn" data-align="right" title="Align Right">
        <svg class="icon" viewBox="0 0 24 24"><path d="M20 2v20M4 6h12v4H4V6Zm4 8h8v4H8v-4Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="align-btn" data-align="top" title="Align Top">
        <svg class="icon" viewBox="0 0 24 24"><path d="M2 4h20M6 20V8h4v12H6Zm8-4V8h4v8h-4Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="align-btn" data-align="middle" title="Align Vertical Middle">
        <svg class="icon" viewBox="0 0 24 24"><path d="M2 12h20M6 19V5h3v14H6Zm9-2V7h3v10h-3Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="align-btn" data-align="bottom" title="Align Bottom">
        <svg class="icon" viewBox="0 0 24 24"><path d="M2 20h20M6 4v12h4V4H6Zm8 4v8h4V8h-4Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
    </div>
  `;

  section.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alignSelection(btn.getAttribute('data-align'));
    });
  });

  container.appendChild(section);
}

/**
 * Layout coordinates inputs.
 */
function renderGeometryProperties(objects) {
  const section = document.createElement('div');
  section.className = 'properties-section';

  // Read common values
  const valX = getCommonValue(objects, 'x');
  const valY = getCommonValue(objects, 'y');
  const valW = getCommonValue(objects, 'width');
  const valH = getCommonValue(objects, 'height');
  const valRot = getCommonValue(objects, 'rotation');

  section.innerHTML = `
    <h4>Geometry</h4>
    <div class="property-grid-2col" style="margin-bottom: var(--spacing-sm);">
      <div class="property-field">
        <label>X Position</label>
        <input type="number" class="property-input prop-geo" data-prop="x" value="${valX === null ? '' : valX}" placeholder="${valX === null ? 'Mixed' : ''}">
      </div>
      <div class="property-field">
        <label>Y Position</label>
        <input type="number" class="property-input prop-geo" data-prop="y" value="${valY === null ? '' : valY}" placeholder="${valY === null ? 'Mixed' : ''}">
      </div>
    </div>
    <div class="property-grid-2col">
      <div class="property-field">
        <label>Width</label>
        <input type="number" class="property-input prop-geo" data-prop="width" min="1" value="${valW === null ? '' : valW}" placeholder="${valW === null ? 'Mixed' : ''}">
      </div>
      <div class="property-field">
        <label>Height</label>
        <input type="number" class="property-input prop-geo" data-prop="height" min="1" value="${valH === null ? '' : valH}" placeholder="${valH === null ? 'Mixed' : ''}">
      </div>
    </div>
    <div class="property-grid-2col" style="margin-top: var(--spacing-sm);">
      <div class="property-field">
        <label>Rotation (°)</label>
        <input type="number" class="property-input prop-geo" data-prop="rotation" min="0" max="360" value="${valRot === null ? '' : valRot}" placeholder="${valRot === null ? 'Mixed' : ''}">
      </div>
    </div>
  `;

  // Bind key capture events
  section.querySelectorAll('.prop-geo').forEach(input => {
    input.addEventListener('focus', () => captureBeforeState(objects));
    input.addEventListener('change', (e) => applyGeoPropertyChange(objects, e.target));
  });

  container.appendChild(section);
}

/**
 * Text strings fields, table cells count, and tabs listings.
 */
function renderTypeSpecificProperties(objects) {
  // We only render type specific tools if a single object is selected, to avoid complexity
  if (objects.length !== 1) return;

  const obj = objects[0];
  const type = obj.type;

  // 1. Text Content edits
  const textBearingTypes = ['text', 'button', 'input', 'textarea', 'checkbox', 'radio', 'dropdown', 'navbar', 'sidebar', 'badge', 'searchbar'];
  if (textBearingTypes.includes(type)) {
    const section = document.createElement('div');
    section.className = 'properties-section';
    
    // Constraints font parameters
    const c = obj.constraints || {};
    const fontSize = c.fontSize || 14;
    const fontFamily = c.fontFamily || 'system-ui';
    const textAlign = c.textAlign || 'left';
    const fontWeight = c.fontWeight || 'regular';

    section.innerHTML = `
      <h4>Typography & Text</h4>
      <div class="property-field" style="margin-bottom: var(--spacing-md);">
        <label>Content Label</label>
        <textarea class="property-input prop-txt" data-prop="text" style="height: 60px; resize: vertical; padding: 6px;">${obj.text || ''}</textarea>
      </div>
      <div class="property-grid-2col" style="margin-bottom: var(--spacing-sm);">
        <div class="property-field">
          <label>Font Size</label>
          <input type="number" class="property-input prop-const" data-const="fontSize" value="${fontSize}">
        </div>
        <div class="property-field">
          <label>Font Weight</label>
          <select class="property-select prop-const" data-const="fontWeight">
            <option value="regular" ${fontWeight === 'regular' ? 'selected' : ''}>Regular</option>
            <option value="bold" ${fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
          </select>
        </div>
      </div>
      <div class="property-grid-2col">
        <div class="property-field">
          <label>Alignment</label>
          <select class="property-select prop-const" data-const="textAlign">
            <option value="left" ${textAlign === 'left' ? 'selected' : ''}>Left</option>
            <option value="center" ${textAlign === 'center' ? 'selected' : ''}>Center</option>
            <option value="right" ${textAlign === 'right' ? 'selected' : ''}>Right</option>
          </select>
        </div>
        <div class="property-field">
          <label>Font Family</label>
          <select class="property-select prop-const" data-const="fontFamily">
            <option value="system-ui" ${fontFamily === 'system-ui' ? 'selected' : ''}>Sans-Serif</option>
            <option value="monospace" ${fontFamily === 'monospace' ? 'selected' : ''}>Monospace</option>
            <option value="serif" ${fontFamily === 'serif' ? 'selected' : ''}>Serif</option>
          </select>
        </div>
      </div>
    `;

    section.querySelector('.prop-txt').addEventListener('focus', () => captureBeforeState(objects));
    section.querySelector('.prop-txt').addEventListener('change', (e) => applyPropChange(obj, 'text', e.target.value));

    section.querySelectorAll('.prop-const').forEach(input => {
      input.addEventListener('focus', () => captureBeforeState(objects));
      input.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-const');
        const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        const newConst = { ...obj.constraints, [key]: val };
        applyPropChange(obj, 'constraints', newConst);
      });
    });

    container.appendChild(section);
  }

  // 2. Table Column/Row controllers
  if (type === 'table') {
    const section = document.createElement('div');
    section.className = 'properties-section';
    section.innerHTML = `
      <h4>Table Actions</h4>
      <div class="table-controls">
        <div class="table-controls-row">
          <button class="table-action-btn" id="tbl-add-row">Add Row</button>
          <button class="table-action-btn" id="tbl-rem-row">Remove Row</button>
        </div>
        <div class="table-controls-row">
          <button class="table-action-btn" id="tbl-add-col">Add Column</button>
          <button class="table-action-btn" id="tbl-rem-col">Remove Column</button>
        </div>
      </div>
    `;

    section.querySelector('#tbl-add-row').addEventListener('click', () => adjustTableDimensions(obj, 1, 0));
    section.querySelector('#tbl-rem-row').addEventListener('click', () => adjustTableDimensions(obj, -1, 0));
    section.querySelector('#tbl-add-col').addEventListener('click', () => adjustTableDimensions(obj, 0, 1));
    section.querySelector('#tbl-rem-col').addEventListener('click', () => adjustTableDimensions(obj, 0, -1));

    container.appendChild(section);
  }

  // 3. Tabs items management
  if (type === 'tabs') {
    const section = document.createElement('div');
    section.className = 'properties-section';
    
    const meta = obj.metadata || { activeTab: 0, tabs: [], contents: [] };
    const tabsList = meta.tabs || [];
    
    let listHTML = '';
    tabsList.forEach((tab, idx) => {
      listHTML += `
        <div class="property-row" style="margin-bottom: var(--spacing-xs);">
          <input type="text" class="property-input prop-tab-title" data-idx="${idx}" value="${tab}" style="width:70%;">
          <button class="page-btn tbl-tab-delete" data-idx="${idx}" title="Delete Tab">×</button>
        </div>
      `;
    });

    section.innerHTML = `
      <h4>Tabs Management</h4>
      <div style="max-height: 120px; overflow-y: auto; margin-bottom: var(--spacing-sm);">
        ${listHTML}
      </div>
      <button class="sidebar-action-btn" id="tab-add-btn">Add Tab</button>
    `;

    section.querySelectorAll('.prop-tab-title').forEach(input => {
      input.addEventListener('focus', () => captureBeforeState(objects));
      input.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        const newTabs = [...meta.tabs];
        newTabs[idx] = e.target.value;
        const newMeta = { ...meta, tabs: newTabs };
        applyPropChange(obj, 'metadata', newMeta);
      });
    });

    section.querySelectorAll('.tbl-tab-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (meta.tabs.length <= 1) return; // preserve at least one tab
        
        captureBeforeState(objects);
        const newTabs = meta.tabs.filter((_, i) => i !== idx);
        const newContents = meta.contents.filter((_, i) => i !== idx);
        const newActive = Math.max(0, Math.min(meta.activeTab, newTabs.length - 1));
        
        applyPropChange(obj, 'metadata', {
          activeTab: newActive,
          tabs: newTabs,
          contents: newContents
        });
      });
    });

    section.querySelector('#tab-add-btn').addEventListener('click', () => {
      captureBeforeState(objects);
      const newTabs = [...meta.tabs, `Tab ${meta.tabs.length + 1}`];
      const newContents = [...meta.contents, `Content Area ${meta.tabs.length + 1}`];
      
      applyPropChange(obj, 'metadata', {
        activeTab: newTabs.length - 1,
        tabs: newTabs,
        contents: newContents
      });
    });

    container.appendChild(section);
  }

  // 4. Progress bar slider
  if (type === 'progressbar') {
    const section = document.createElement('div');
    section.className = 'properties-section';
    const progress = obj.metadata?.progress !== undefined ? obj.metadata.progress : 40;

    section.innerHTML = `
      <h4>Progress Slider</h4>
      <div class="property-row">
        <label>Progress</label>
        <div class="slider-container">
          <input type="range" class="prop-progress" min="0" max="100" value="${progress}">
          <span class="slider-value">${progress}%</span>
        </div>
      </div>
    `;

    const range = section.querySelector('.prop-progress');
    const label = section.querySelector('.slider-value');

    range.addEventListener('input', (e) => {
      label.innerText = `${e.target.value}%`;
    });
    range.addEventListener('focus', () => captureBeforeState(objects));
    range.addEventListener('change', (e) => {
      applyPropChange(obj, 'metadata', { progress: Number(e.target.value) });
    });

    container.appendChild(section);
  }
}

/**
 * Color picker, border styles, corner radius, and opacity styling section.
 */
function renderStylingProperties(objects) {
  const section = document.createElement('div');
  section.className = 'properties-section';

  const valFill = getCommonValue(objects, 'fill');
  const valOpacity = getCommonValue(objects, 'opacity');
  
  // Read nested border values
  const borderColors = objects.map(o => o.border?.color).filter(Boolean);
  const borderWidths = objects.map(o => o.border?.width).filter(v => v !== undefined);
  const borderStyles = objects.map(o => o.border?.style).filter(Boolean);
  
  const commonBorderColor = borderColors.every(c => c === borderColors[0]) ? borderColors[0] : null;
  const commonBorderWidth = borderWidths.every(w => w === borderWidths[0]) ? borderWidths[0] : null;
  const commonBorderStyle = borderStyles.every(s => s === borderStyles[0]) ? borderStyles[0] : null;

  // Corner radius (supports single or per corner checks)
  const isSingleRadius = objects.every(o => typeof o.borderRadius === 'number');
  const commonRadius = isSingleRadius && objects.every(o => o.borderRadius === objects[0].borderRadius) ? objects[0].borderRadius : null;

  const showBorders = objects.some(o => o.type !== 'line' && o.type !== 'arrow');

  section.innerHTML = `
    <h4>Aesthetic Styling</h4>
    <div class="property-row">
      <label>Background Fill</label>
      <div class="color-picker-wrapper">
        <div id="fill-picker-nano" class="color-picker-trigger"></div>
        <input type="text" id="fill-hex-input" class="property-input" value="${valFill === null ? 'Mixed' : valFill}" style="width: 70px; height: 28px;">
      </div>
    </div>
    
    ${showBorders ? `
      <div class="property-row" style="margin-top: var(--spacing-sm);">
        <label>Border Style</label>
        <select class="property-select prop-border" data-border="style" style="width: 120px;">
          <option value="solid" ${commonBorderStyle === 'solid' ? 'selected' : ''}>Solid</option>
          <option value="dashed" ${commonBorderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
          <option value="dotted" ${commonBorderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
          <option value="none" ${commonBorderStyle === 'none' ? 'selected' : ''}>None</option>
        </select>
      </div>
      <div class="property-row" style="margin-top: var(--spacing-xs);">
        <label>Border Color</label>
        <div class="color-picker-wrapper">
          <div id="border-picker-nano" class="color-picker-trigger"></div>
          <input type="text" id="border-hex-input" class="property-input" value="${commonBorderColor === null ? 'Mixed' : commonBorderColor}" style="width: 70px; height: 28px;">
        </div>
      </div>
      <div class="property-row" style="margin-top: var(--spacing-xs);">
        <label>Border Weight</label>
        <input type="number" class="property-input prop-border" data-border="width" min="0" value="${commonBorderWidth === null ? '' : commonBorderWidth}" style="width: 60px;">
      </div>
      <div class="property-row" style="margin-top: var(--spacing-sm);">
        <label>Corner Radius</label>
        <input type="number" class="property-input prop-radius" min="0" value="${commonRadius === null ? '' : commonRadius}" placeholder="${isSingleRadius ? '' : 'Mixed'}" style="width: 60px;">
      </div>
    ` : ''}

    <div class="property-row" style="margin-top: var(--spacing-md);">
      <label>Opacity</label>
      <div class="slider-container">
        <input type="range" class="prop-opacity" min="0" max="100" value="${valOpacity === null ? 100 : Math.round(valOpacity * 100)}">
        <span class="slider-value">${valOpacity === null ? 'Mixed' : `${Math.round(valOpacity * 100)}%`}</span>
      </div>
    </div>
  `;

  // Bind standard inputs
  section.querySelectorAll('.prop-border').forEach(input => {
    input.addEventListener('focus', () => captureBeforeState(objects));
    input.addEventListener('change', (e) => {
      const field = e.target.getAttribute('data-border');
      let val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      
      const updateMap = {};
      objects.forEach(o => {
        const border = o.border || { color: '#475569', width: 1, style: 'solid' };
        updateMap[o.id] = {
          border: { ...border, [field]: val }
        };
      });
      applyBatchPropChange(objects, updateMap);
    });
  });

  if (showBorders) {
    const radiusInput = section.querySelector('.prop-radius');
    radiusInput.addEventListener('focus', () => captureBeforeState(objects));
    radiusInput.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      const updateMap = {};
      objects.forEach(o => {
        updateMap[o.id] = { borderRadius: val };
      });
      applyBatchPropChange(objects, updateMap);
    });
  }

  // Opacity range
  const range = section.querySelector('.prop-opacity');
  const label = section.querySelector('.slider-value');
  range.addEventListener('input', (e) => {
    label.innerText = `${e.target.value}%`;
  });
  range.addEventListener('focus', () => captureBeforeState(objects));
  range.addEventListener('change', (e) => {
    const val = Number(e.target.value) / 100;
    const updateMap = {};
    objects.forEach(o => {
      updateMap[o.id] = { opacity: val };
    });
    applyBatchPropChange(objects, updateMap);
  });

  // Initialize Pickr color pickers if available
  setTimeout(() => {
    setupPickrColorPicker(objects, 'fill', '#fill-picker-nano', '#fill-hex-input');
    if (showBorders) {
      setupPickrColorPicker(objects, 'borderColor', '#border-picker-nano', '#border-hex-input');
    }
  }, 10);

  container.appendChild(section);
}

/**
 * Setup Pickr nano instance helper.
 */
function setupPickrColorPicker(objects, targetProp, triggerSelector, inputSelector) {
  const trigger = container.querySelector(triggerSelector);
  const textInput = container.querySelector(inputSelector);
  if (!trigger || !textInput) return;

  const initialVal = textInput.value === 'Mixed' ? '#ffffff' : textInput.value;

  if (window.Pickr) {
    const pickr = window.Pickr.create({
      el: trigger,
      theme: 'nano',
      default: initialVal || '#ffffff',
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          hex: true,
          input: true,
          clear: false,
          save: true
        }
      }
    });

    pickr.on('show', () => captureBeforeState(objects));

    pickr.on('change', (color) => {
      const hex = color.toHEXA().toString();
      textInput.value = hex;
      applyLiveColorUpdate(objects, targetProp, hex);
    });

    pickr.on('save', (color) => {
      const hex = color.toHEXA().toString();
      textInput.value = hex;
      applyLiveColorUpdate(objects, targetProp, hex);
      commitBatchPropertyHistory(objects);
      pickr.hide();
    });
  } else {
    // Fallback: make trigger act as simple input type="color"
    textInput.addEventListener('focus', () => captureBeforeState(objects));
    textInput.addEventListener('change', (e) => {
      applyLiveColorUpdate(objects, targetProp, e.target.value);
      commitBatchPropertyHistory(objects);
    });
  }
}

function applyLiveColorUpdate(objects, type, color) {
  const updateMap = {};
  objects.forEach(o => {
    if (type === 'fill') {
      updateMap[o.id] = { fill: color };
    } else {
      const border = o.border || { color: '#475569', width: 1, style: 'solid' };
      updateMap[o.id] = {
        border: { ...border, color }
      };
    }
  });
  updateObjectProperties(updateMap);
}

// CAPTURING UTILITIES FOR COMMANDS

function captureBeforeState(objects) {
  beforePropertyState = {};
  objects.forEach(o => {
    beforePropertyState[o.id] = deepClone(o);
  });
}

function commitBatchPropertyHistory(objects) {
  if (!beforePropertyState) return;

  const propertyMap = {};
  let changed = false;

  objects.forEach(o => {
    const before = beforePropertyState[o.id];
    const after = getObjectById(o.id);

    if (before && after) {
      // Find diff keys
      const diffBefore = {};
      const diffAfter = {};

      const testKeys = ['x', 'y', 'width', 'height', 'rotation', 'text', 'fill', 'opacity', 'border', 'borderRadius', 'constraints', 'metadata'];
      testKeys.forEach(k => {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
          diffBefore[k] = before[k];
          diffAfter[k] = after[k];
          changed = true;
        }
      });

      if (Object.keys(diffAfter).length > 0) {
        propertyMap[o.id] = {
          before: diffBefore,
          after: diffAfter
        };
      }
    }
  });

  if (changed) {
    executeCommand(new PropertyCommand(propertyMap));
  }
  
  beforePropertyState = null;
}

function applyPropChange(obj, key, val) {
  const propertyMap = {
    [obj.id]: {
      before: { [key]: beforePropertyState[obj.id]?.[key] },
      after: { [key]: val }
    }
  };
  executeCommand(new PropertyCommand(propertyMap));
  beforePropertyState = null;
}

function applyBatchPropChange(objects, updateMap) {
  if (!beforePropertyState) return;

  const propertyMap = {};
  for (const [id, valMap] of Object.entries(updateMap)) {
    const before = {};
    for (const k of Object.keys(valMap)) {
      before[k] = beforePropertyState[id]?.[k];
    }
    propertyMap[id] = {
      before,
      after: valMap
    };
  }

  executeCommand(new PropertyCommand(propertyMap));
  beforePropertyState = null;
}

function applyGeoPropertyChange(objects, input) {
  if (!beforePropertyState) return;

  const prop = input.getAttribute('data-prop');
  const val = Number(input.value);

  const updateMap = {};
  objects.forEach(o => {
    updateMap[o.id] = { [prop]: val };
  });

  applyBatchPropChange(objects, updateMap);
}

// ALIGNMENT UTILITIES

function alignSelection(alignment) {
  const selection = state.selection;
  if (!selection || selection.length === 0) return;

  const bounds = getSelectionCanvasBounds();
  if (!bounds) return;

  const objects = selection.map(id => getObjectById(id)).filter(obj => obj && !obj.locked);
  if (objects.length === 0) return;

  captureBeforeState(objects);

  const updateMap = {};

  if (objects.length === 1) {
    // Single object: align relative to canvas boundary (e.g. 8000x8000 center or viewport center)
    // For simplicity, let's align relative to active page size (8000x8000 coordinates limit)
    const obj = objects[0];
    let newX = obj.x;
    let newY = obj.y;

    switch (alignment) {
      case 'left': newX = 0; break;
      case 'center': newX = 4000 - obj.width / 2; break;
      case 'right': newX = 8000 - obj.width; break;
      case 'top': newY = 0; break;
      case 'middle': newY = 4000 - obj.height / 2; break;
      case 'bottom': newY = 8000 - obj.height; break;
    }

    updateMap[obj.id] = { x: newX, y: newY };
  } else {
    // Multi-object align relative to combined selection bounding box bounds
    objects.forEach(obj => {
      let newX = obj.x;
      let newY = obj.y;

      switch (alignment) {
        case 'left':
          newX = bounds.x;
          break;
        case 'center':
          newX = bounds.x + (bounds.width - obj.width) / 2;
          break;
        case 'right':
          newX = bounds.x + bounds.width - obj.width;
          break;
        case 'top':
          newY = bounds.y;
          break;
        case 'middle':
          newY = bounds.y + (bounds.height - obj.height) / 2;
          break;
        case 'bottom':
          newY = bounds.y + bounds.height - obj.height;
          break;
      }

      updateMap[obj.id] = { x: newX, y: newY };
    });
  }

  applyBatchPropChange(objects, updateMap);
}

/**
 * Add / delete columns and rows for table items.
 */
function adjustTableDimensions(obj, rowDelta, colDelta) {
  const meta = obj.metadata || { rows: 3, cols: 3, headers: [], cells: [] };
  
  let newRows = Math.max(2, (meta.rows || 3) + rowDelta); // min 2 (1 header, 1 data)
  let newCols = Math.max(1, (meta.cols || 3) + colDelta); // min 1 column

  captureBeforeState([obj]);

  const newHeaders = [...(meta.headers || [])];
  if (colDelta > 0) {
    for (let i = newHeaders.length; i < newCols; i++) {
      newHeaders.push(`Header ${i + 1}`);
    }
  } else if (colDelta < 0) {
    newHeaders.splice(newCols);
  }

  const newCells = (meta.cells || []).map(row => {
    const newRow = [...row];
    if (colDelta > 0) {
      for (let i = newRow.length; i < newCols; i++) {
        newRow.push('');
      }
    } else if (colDelta < 0) {
      newRow.splice(newCols);
    }
    return newRow;
  });

  const currentDataRowsCount = newRows - 1;
  if (rowDelta > 0) {
    for (let r = newCells.length; r < currentDataRowsCount; r++) {
      const newRow = Array(newCols).fill('');
      newCells.push(newRow);
    }
  } else if (rowDelta < 0) {
    newCells.splice(currentDataRowsCount);
  }

  applyPropChange(obj, 'metadata', {
    rows: newRows,
    cols: newCols,
    headers: newHeaders,
    cells: newCells
  });
}

// HELPERS

function getCommonValue(objects, key) {
  const first = objects[0][key];
  if (objects.every(o => o[key] === first)) return first;
  return null;
}
