// Component imports to run self-registration
import '../components/rectangle.js';
import '../components/circle.js';
import '../components/line.js';
import '../components/arrow.js';
import '../components/text.js';
import '../components/button.js';
import '../components/input.js';
import '../components/textarea.js';
import '../components/checkbox.js';
import '../components/radio.js';
import '../components/dropdown.js';
import '../components/card.js';
import '../components/avatar.js';
import '../components/image.js';
import '../components/navbar.js';
import '../components/sidebar.js';
import '../components/divider.js';
import '../components/badge.js';
import '../components/searchbar.js';
import '../components/progressbar.js';
import '../components/table.js';
import '../components/tabs.js';
import '../components/group.js';

// Module imports
import { restoreLastProject } from './storage.js';
import { initWorkspace, drawRulers } from './workspace.js';
import { initRenderCoordinator, executeViewportCulling } from './render.js';
import { initSelection, updateSelectionBox } from './selection.js';
import { initDragHandlers } from './drag.js';
import { initResizeHandlers } from './resize.js';
import { initRotateHandlers } from './rotate.js';
import { initContextMenu } from './contextmenu.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { initPropertiesPanel } from './properties.js';
import { initToolbar } from './toolbar.js';
import { initSidebarComponents } from './sidebar-components.js';
import { initLayersPanel } from './layers-panel.js';
import { initPagesPanel } from './pages-panel.js';
import { initTemplatesList } from './templates.js';

import { state, getObjects, getObjectById, updateObjectProperties } from './state.js';
import { executeCommand, PropertyCommand } from './history.js';

/**
 * Bootstrap WireCanvas application when DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State and Load Project
  initRenderCoordinator(); // Must subscribe BEFORE project loads to receive event triggers
  restoreLastProject();

  // 2. Initialize Workspaces and Interactivity Gestures
  initWorkspace();
  initSelection();
  initDragHandlers();
  initResizeHandlers();
  initRotateHandlers();
  initContextMenu();
  initKeyboardShortcuts();

  // 3. Initialize Sidebars panels
  initSidebarTabs();
  initSidebarComponents();
  initLayersPanel();
  initPagesPanel();
  initTemplatesList();

  // 4. Initialize Toolbar and properties editor
  initToolbar();
  initPropertiesPanel();

  // 5. Initialize Canvas double-click inline text editors
  initCanvasInlineEditors();
  
  // 6. Init mouse wheel zoom listener
  initCanvasMouseWheelZoom();

  // Trigger initial render cull checks
  executeViewportCulling();
});

/**
 * Switch Left Sidebar panel tabs visibility.
 */
function initSidebarTabs() {
  const tabs = document.querySelectorAll('.sidebar-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        const panel = document.getElementById(`panel-${t.getAttribute('data-tab')}`);
        if (panel) panel.classList.remove('active');
      });
      
      tab.classList.add('active');
      const activePanel = document.getElementById(`panel-${tab.getAttribute('data-tab')}`);
      if (activePanel) activePanel.classList.add('active');
    });
  });
}

/**
 * Custom Zoom listener on Ctrl+MouseWheel.
 */
function initCanvasMouseWheelZoom() {
  const container = document.getElementById('canvas-scroll-container');
  if (!container) return;

  container.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      // Calculate cursor offsets
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const delta = -e.deltaY;
      const zoomStep = 0.08;
      const currentZoom = state.view.zoom;
      
      let newZoom = currentZoom;
      if (delta > 0) {
        newZoom = Math.min(2.0, currentZoom + zoomStep);
      } else {
        newZoom = Math.max(0.25, currentZoom - zoomStep);
      }

      // Import zoomTo dynamically or call it from workspace
      import('./workspace.js').then(mod => {
        mod.zoomTo(newZoom, cursorX, cursorY);
      });
    }
  }, { passive: false });
}

/**
 * Attaches double-click inline editing triggers to text-bearing objects.
 */
function initCanvasInlineEditors() {
  const layer = document.getElementById('canvas-objects-layer');
  if (!layer) return;

  // Double click delegates text edits
  layer.addEventListener('dblclick', (e) => {
    const textEl = e.target.closest('.wc-text');
    if (!textEl) return;

    e.stopPropagation();

    const id = textEl.getAttribute('data-id');
    const obj = getObjectById(id);
    if (!obj || obj.locked) return;

    textEl.contentEditable = 'true';
    textEl.classList.add('editing');
    
    // Focus and select all text
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    textEl.focus();

    const beforeText = obj.text || '';

    const saveText = () => {
      textEl.contentEditable = 'false';
      textEl.classList.remove('editing');
      window.getSelection().removeAllRanges();

      const newText = textEl.innerText.trim();
      if (newText !== beforeText) {
        executeCommand(new PropertyCommand({
          [id]: {
            before: { text: beforeText },
            after: { text: newText }
          }
        }));
      }
    };

    textEl.addEventListener('blur', saveText, { once: true });
    textEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textEl.blur();
      }
    });
  });

  // Clicking checkboxes and radio buttons to toggle in edit mode
  layer.addEventListener('pointerdown', (e) => {
    // Checkbox click
    const box = e.target.closest('.wc-checkbox-box');
    if (box) {
      const comp = box.closest('.wc-component');
      if (!comp) return;
      const id = comp.getAttribute('data-id');
      const obj = getObjectById(id);
      if (obj && !obj.locked) {
        e.stopPropagation();
        const currentCheck = !!obj.metadata?.checked;
        executeCommand(new PropertyCommand({
          [id]: {
            before: { metadata: { checked: currentCheck } },
            after: { metadata: { checked: !currentCheck } }
          }
        }));
      }
      return;
    }

    // Radio click
    const radio = e.target.closest('.wc-radio-box');
    if (radio) {
      const comp = radio.closest('.wc-component');
      if (!comp) return;
      const id = comp.getAttribute('data-id');
      const obj = getObjectById(id);
      if (obj && !obj.locked) {
        e.stopPropagation();
        executeCommand(new PropertyCommand({
          [id]: {
            before: { metadata: { checked: false } },
            after: { metadata: { checked: true } }
          }
        }));
      }
      return;
    }

    // Tabs switching click on canvas!
    const tabHeader = e.target.closest('.wc-tabs-header-item');
    if (tabHeader) {
      const comp = tabHeader.closest('.wc-component');
      if (!comp) return;
      const id = comp.getAttribute('data-id');
      const obj = getObjectById(id);
      if (obj) {
        e.stopPropagation();
        const tabIdx = Number(tabHeader.getAttribute('data-tab-idx'));
        const before = obj.metadata || { activeTab: 0, tabs: [], contents: [] };
        executeCommand(new PropertyCommand({
          [id]: {
            before: { metadata: { ...before, activeTab: before.activeTab } },
            after: { metadata: { ...before, activeTab: tabIdx } }
          }
        }));
      }
    }
  });
}
