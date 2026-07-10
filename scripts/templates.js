import { state, getObjects, setSelection } from './state.js';
import { executeCommand, CreateCommand } from './history.js';
import { generateUUID, deepClone } from './utils.js';

// Pre-defined layout fixtures representing WireCanvas starter templates
const templates = {
  login: {
    name: 'Login Form',
    objects: [
      {
        type: 'card',
        name: 'Login Panel',
        width: 300,
        height: 380,
        x: 0,
        y: 0,
        fill: '#ffffff',
        border: { color: '#475569', width: 1, style: 'solid' },
        borderRadius: 8
      },
      {
        type: 'text',
        name: 'Panel Header',
        width: 240,
        height: 30,
        x: 30,
        y: 30,
        text: 'Welcome Back',
        constraints: { fontSize: 20, fontFamily: 'system-ui', textAlign: 'center', lineHeight: 1.2, fontWeight: 'bold' }
      },
      {
        type: 'text',
        name: 'Email Label',
        width: 240,
        height: 20,
        x: 30,
        y: 85,
        text: 'Email Address',
        constraints: { fontSize: 11, fontFamily: 'system-ui', textAlign: 'left', fontWeight: 'bold' }
      },
      {
        type: 'input',
        name: 'Email Input',
        width: 240,
        height: 36,
        x: 30,
        y: 110,
        text: 'email@example.com'
      },
      {
        type: 'text',
        name: 'Password Label',
        width: 240,
        height: 20,
        x: 30,
        y: 165,
        text: 'Password',
        constraints: { fontSize: 11, fontFamily: 'system-ui', textAlign: 'left', fontWeight: 'bold' }
      },
      {
        type: 'input',
        name: 'Password Input',
        width: 240,
        height: 36,
        x: 30,
        y: 190,
        text: '••••••••••••'
      },
      {
        type: 'button',
        name: 'Submit Button',
        width: 240,
        height: 40,
        x: 30,
        y: 250,
        text: 'Log In',
        fill: '#0f172a',
        border: { color: '#0f172a', width: 1, style: 'solid' },
        borderRadius: 4,
        constraints: { fontSize: 13, fontWeight: 'bold' }
      },
      {
        type: 'checkbox',
        name: 'Remember Checkbox',
        width: 130,
        height: 24,
        x: 30,
        y: 310,
        text: 'Keep me logged in',
        metadata: { checked: true }
      }
    ]
  },
  
  dashboard: {
    name: 'Dashboard Shell',
    objects: [
      {
        type: 'navbar',
        name: 'Top Header',
        width: 700,
        height: 48,
        x: 0,
        y: 0,
        text: 'Portal  ·  Overview   Analytics   Logs',
        fill: '#f8fafc',
        border: { color: '#cbd5e1', width: 1, style: 'solid' }
      },
      {
        type: 'sidebar',
        name: 'Nav Column',
        width: 140,
        height: 320,
        x: 0,
        y: 48,
        text: 'Statistics\nTraffic\nReports\nSettings',
        fill: '#f8fafc',
        border: { color: '#cbd5e1', width: 1, style: 'solid' }
      },
      {
        type: 'card',
        name: 'Stat Card A',
        width: 160,
        height: 90,
        x: 160,
        y: 70,
        fill: '#ffffff',
        border: { color: '#cbd5e1', width: 1, style: 'solid' },
        borderRadius: 6
      },
      {
        type: 'text',
        name: 'Stat Title A',
        width: 130,
        height: 20,
        x: 175,
        y: 85,
        text: 'ACTIVE USERS',
        constraints: { fontSize: 10, fontWeight: 'bold' }
      },
      {
        type: 'text',
        name: 'Stat Value A',
        width: 130,
        height: 30,
        x: 175,
        y: 110,
        text: '12,480',
        constraints: { fontSize: 20, fontWeight: 'bold' }
      },
      {
        type: 'card',
        name: 'Stat Card B',
        width: 160,
        height: 90,
        x: 340,
        y: 70,
        fill: '#ffffff',
        border: { color: '#cbd5e1', width: 1, style: 'solid' },
        borderRadius: 6
      },
      {
        type: 'text',
        name: 'Stat Title B',
        width: 130,
        height: 20,
        x: 355,
        y: 85,
        text: 'MONTHLY SALES',
        constraints: { fontSize: 10, fontWeight: 'bold' }
      },
      {
        type: 'text',
        name: 'Stat Value B',
        width: 130,
        height: 30,
        x: 355,
        y: 110,
        text: '$41,200',
        constraints: { fontSize: 20, fontWeight: 'bold' }
      },
      {
        type: 'table',
        name: 'Records Table',
        width: 520,
        height: 180,
        x: 160,
        y: 180,
        metadata: {
          rows: 4,
          cols: 3,
          headers: ['ID', 'Customer', 'Status'],
          cells: [
            ['#102', 'Alpha Corp', 'Success'],
            ['#103', 'Beta LLC', 'Pending'],
            ['#104', 'Gamma Inc', 'Failed']
          ]
        }
      }
    ]
  },
  
  hero: {
    name: 'Hero Section',
    objects: [
      {
        type: 'text',
        name: 'Main Title',
        width: 600,
        height: 50,
        x: 50,
        y: 20,
        text: 'Design Beautiful Mockups Fast',
        constraints: { fontSize: 28, textAlign: 'center', fontWeight: 'bold' }
      },
      {
        type: 'text',
        name: 'Subtitle',
        width: 500,
        height: 40,
        x: 100,
        y: 80,
        text: 'Hand-roll vector graphics alignments with pink smart snapping guidelines.',
        constraints: { fontSize: 13, textAlign: 'center' }
      },
      {
        type: 'button',
        name: 'Call Action',
        width: 140,
        height: 38,
        x: 280,
        y: 140,
        text: 'Start Designing',
        fill: '#0284c7',
        border: { color: '#0284c7', width: 1, style: 'solid' },
        borderRadius: 9999,
        constraints: { fontSize: 12, fontWeight: 'bold' }
      },
      {
        type: 'image',
        name: 'Preview Block',
        width: 500,
        height: 240,
        x: 100,
        y: 210,
        borderRadius: 6
      }
    ]
  }
};

/**
 * Initializes layout template click items.
 */
export function initTemplatesList() {
  const container = document.getElementById('templates-list');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(templates).forEach(([key, value]) => {
    const btn = document.createElement('button');
    btn.className = 'sidebar-action-btn';
    btn.style.marginBottom = 'var(--spacing-xs)';
    btn.style.justifyContent = 'flex-start';
    btn.style.paddingLeft = 'var(--spacing-md)';
    btn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" stroke-width="1.5"/></svg>
      <span>${value.name}</span>
    `;

    btn.addEventListener('click', () => {
      injectTemplate(key);
    });

    container.appendChild(btn);
  });
}

/**
 * Clones, positions, and instantiates template schemas into active page state.
 */
function injectTemplate(key) {
  const template = templates[key];
  if (!template) return;

  // Center placement coordinates on viewport view
  const view = state.view;
  const viewport = document.getElementById('canvas-scroll-container');
  const vw = viewport ? viewport.clientWidth : 800;
  const vh = viewport ? viewport.clientHeight : 600;

  // Let origin be centered on screen
  const targetCanvasX = Math.round((-view.panX + vw / 2) / view.zoom - 200);
  const targetCanvasY = Math.round((-view.panY + vh / 2) / view.zoom - 150);

  const idMap = new Map();
  const createdObjects = template.objects.map(obj => {
    const newId = generateUUID();
    idMap.set(obj.id || obj.name, newId); // fallback key to name if no id is present on templates fixture

    const numObjects = getObjects().length;

    return {
      ...deepClone(obj),
      id: newId,
      name: `${obj.name} ${numObjects + 1}`,
      x: obj.x + targetCanvasX,
      y: obj.y + targetCanvasY,
      rotation: obj.rotation || 0,
      opacity: obj.opacity || 1,
      border: obj.border ? { ...obj.border } : null,
      borderRadius: obj.borderRadius !== undefined ? obj.borderRadius : 0,
      parentId: null,
      childIds: obj.childIds ? [] : null,
      constraints: obj.constraints ? { ...obj.constraints } : {},
      metadata: obj.metadata ? { ...obj.metadata } : {}
    };
  });

  // Re-parent nested elements maps
  createdObjects.forEach(obj => {
    if (obj.parentId && idMap.has(obj.parentId)) {
      obj.parentId = idMap.get(obj.parentId);
    }
  });

  executeCommand(new CreateCommand(createdObjects));
  
  // Select all newly created objects
  setSelection(createdObjects.map(o => o.id));
}
