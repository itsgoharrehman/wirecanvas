import { state, setArmedTool, setSelection } from './state.js';
import { executeCommand, CreateCommand } from './history.js';
import { screenToCanvas } from './workspace.js';
import { getComponentConfig, getAllComponentConfigs } from '../components/registry.js';
import { generateUUID } from './utils.js';

/**
 * Initializes the draggable left sidebar components list.
 */
export function initSidebarComponents() {
  const shapesGrid = document.getElementById('shapes-list');
  const uiGrid = document.getElementById('ui-components-list');
  const dropContainer = document.getElementById('canvas-scroll-container');

  if (!shapesGrid || !uiGrid || !dropContainer) return;

  // Retrieve configs
  const configs = getAllComponentConfigs();

  const shapeTypes = ['rectangle', 'circle', 'line', 'arrow', 'text'];
  const uiTypes = [
    'button', 'input', 'textarea', 'checkbox', 'radio', 'dropdown',
    'image', 'avatar', 'card', 'navbar', 'sidebar', 'divider',
    'badge', 'searchbar', 'progressbar', 'table', 'tabs'
  ];

  // 1. Populate Lists
  shapeTypes.forEach(type => {
    const config = getComponentConfig(type);
    if (config) {
      shapesGrid.appendChild(createComponentCard(config));
    }
  });

  uiTypes.forEach(type => {
    const config = getComponentConfig(type);
    if (config) {
      uiGrid.appendChild(createComponentCard(config));
    }
  });

  // 2. Setup Drop Listener on Canvas Container
  dropContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); // Required to allow drops!
    e.dataTransfer.dropEffect = 'copy';
  });

  dropContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('wc-type');
    if (!type) return;

    // Convert drop screen coordinate to canvas coordinate
    const canvasCoord = screenToCanvas(e.clientX, e.clientY);
    
    // Create component at dropped position (centered)
    const config = getComponentConfig(type);
    const size = config ? config.defaultSize : { width: 100, height: 100 };
    
    const x = Math.round(canvasCoord.x - size.width / 2);
    const y = Math.round(canvasCoord.y - size.height / 2);

    instantiateComponent(type, x, y);
  });
  
  // Register click canvas drawing
  dropContainer.addEventListener('click', (e) => {
    // If drawing tool armed, create shape on click
    if (state.tool !== 'select' && state.tool !== 'hand') {
      // Ignore click if it was on a component or handle (drag.js handles drawing drags)
      if (e.target.closest('.wc-component') || e.target.closest('.resize-handle') || e.target.closest('.rotate-handle')) {
        return;
      }
      
      const canvasCoord = screenToCanvas(e.clientX, e.clientY);
      const config = getComponentConfig(state.tool);
      const size = config ? config.defaultSize : { width: 100, height: 100 };
      
      const x = Math.round(canvasCoord.x - size.width / 2);
      const y = Math.round(canvasCoord.y - size.height / 2);
      
      instantiateComponent(state.tool, x, y);
      setArmedTool('select'); // Switch tool back to select
    }
  });
}

/**
 * Creates visual cards in Left panel grid list.
 */
function createComponentCard(config) {
  const card = document.createElement('div');
  card.className = 'component-item';
  card.setAttribute('draggable', 'true');
  card.setAttribute('title', `Drag or click to place ${config.label}`);
  
  card.innerHTML = `
    ${config.icon}
    <span>${config.label}</span>
  `;

  // HTML5 DragStart
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('wc-type', config.type);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create custom ghost text image to avoid visual bulk
    const ghost = document.createElement('div');
    ghost.style.padding = '4px 8px';
    ghost.style.background = '#0f172a';
    ghost.style.color = '#ffffff';
    ghost.style.fontSize = '10px';
    ghost.style.borderRadius = '3px';
    ghost.innerText = config.label;
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => ghost.remove(), 10);
  });

  // Click handler (Arms tool)
  card.addEventListener('click', () => {
    setArmedTool(config.type);
    
    // Visual feedback in status bar
    const statusText = document.getElementById('status-tool');
    if (statusText) statusText.innerText = `Tool: Draw ${config.label} (Click on canvas to place)`;
  });

  return card;
}

/**
 * Creates a component schema object, instantiates and commits via CreateCommand.
 */
export function instantiateComponent(type, x, y) {
  const config = getComponentConfig(type);
  if (!config) return;

  const size = config.defaultSize || { width: 100, height: 100 };
  const defaultProps = config.defaultProps || {};

  const numObjects = state.pages.find(p => p.id === state.activePageId).objects.length;

  const obj = {
    id: generateUUID(),
    type: type,
    name: `${config.label} ${numObjects + 1}`,
    x: x,
    y: y,
    width: size.width,
    height: size.height,
    rotation: 0,
    fill: defaultProps.fill || '#ffffff',
    opacity: defaultProps.opacity || 1,
    border: defaultProps.border !== undefined ? { ...defaultProps.border } : { color: '#475569', width: 1, style: 'solid' },
    borderRadius: defaultProps.borderRadius !== undefined ? (typeof defaultProps.borderRadius === 'object' ? { ...defaultProps.borderRadius } : defaultProps.borderRadius) : 0,
    parentId: null,
    childIds: type === 'group' || type === 'tabs' ? [] : null,
    constraints: defaultProps.constraints ? { ...defaultProps.constraints } : {},
    metadata: defaultProps.metadata ? { ...defaultProps.metadata } : {}
  };

  // Specific components schema settings overrides
  if (type === 'text') {
    obj.text = defaultProps.text || 'Double click to edit text';
  } else if (type === 'button') {
    obj.text = defaultProps.text || 'Button';
  } else if (type === 'input') {
    obj.text = defaultProps.text || 'Placeholder...';
  } else if (type === 'textarea') {
    obj.text = defaultProps.text || 'Enter message...';
  } else if (type === 'checkbox') {
    obj.text = defaultProps.text || 'Checkbox';
  } else if (type === 'radio') {
    obj.text = defaultProps.text || 'Option';
  } else if (type === 'dropdown') {
    obj.text = defaultProps.text || 'Select...';
  } else if (type === 'navbar') {
    obj.text = defaultProps.text || 'Logo   ·   Home   Products';
  } else if (type === 'sidebar') {
    obj.text = defaultProps.text || 'Dashboard\nAnalytics\nSettings';
  } else if (type === 'badge') {
    obj.text = defaultProps.text || 'Badge';
  } else if (type === 'searchbar') {
    obj.text = defaultProps.text || 'Search...';
  }

  executeCommand(new CreateCommand(obj));
}
