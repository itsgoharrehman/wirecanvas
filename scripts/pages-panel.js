import { state, selectPage, addPage, deletePage, duplicatePage, renamePage, notify } from './state.js';
import { debounce } from './utils.js';

let container = null;

// Throttled thumbnail render helper
const thumbnailDebounces = new Map();

/**
 * Initializes pages panel tab UI.
 */
export function initPagesPanel() {
  container = document.getElementById('pages-list-container');
  const addPageBtn = document.getElementById('btn-add-page');

  if (!container || !addPageBtn) return;

  addPageBtn.addEventListener('click', () => {
    addPage();
  });

  // Subscribe to page list changes
  state.subscribe((event) => {
    if (
      event === 'pages-list-changed' || 
      event === 'page-changed' || 
      event === 'project-loaded'
    ) {
      renderPagesList();
    }
    
    // Throttled update of thumbnails on objects change
    if (event === 'objects-changed') {
      triggerThumbnailRedraw(state.activePageId);
    }
  });

  renderPagesList();
}

/**
 * Renders list of pages in project.
 */
function renderPagesList() {
  container.innerHTML = '';

  state.pages.forEach((page) => {
    const row = document.createElement('div');
    row.className = 'page-row';
    if (page.id === state.activePageId) {
      row.classList.add('active');
    }

    // Page Thumbnail Container
    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'page-thumbnail-container';
    thumbContainer.setAttribute('data-page-id', page.id);
    
    // Draw SVG thumbnail
    drawPageThumbnailSVG(page, thumbContainer);

    // Page Metadata (Title + Options)
    const meta = document.createElement('div');
    meta.className = 'page-meta';

    const title = document.createElement('span');
    title.className = 'page-title';
    title.innerText = page.name;
    
    title.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startRenamePage(page.id, title);
    });

    const actions = document.createElement('div');
    actions.className = 'page-row-actions';

    // Duplicate Page Button
    const dupBtn = document.createElement('button');
    dupBtn.className = 'page-btn';
    dupBtn.title = 'Duplicate Page';
    dupBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:12px;height:12px;"><rect x="9" y="9" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    dupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicatePage(page.id);
    });

    // Delete Page Button
    const delBtn = document.createElement('button');
    delBtn.className = 'page-btn';
    delBtn.title = 'Delete Page';
    delBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:12px;height:12px;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    
    // Disable delete if it's the last page
    if (state.pages.length <= 1) {
      delBtn.disabled = true;
      delBtn.style.opacity = '0.3';
      delBtn.style.cursor = 'not-allowed';
    } else {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePage(page.id);
      });
    }

    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);
    
    meta.appendChild(title);
    meta.appendChild(actions);
    
    row.appendChild(thumbContainer);
    row.appendChild(meta);

    // Switch page on Click
    row.addEventListener('click', () => {
      selectPage(page.id);
    });

    // Support Drag Page Reordering
    setupPageDragReorder(row, page.id);

    container.appendChild(row);
  });
}

function startRenamePage(pageId, titleEl) {
  titleEl.contentEditable = 'true';
  titleEl.classList.add('editing');
  
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(titleEl);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  titleEl.focus();

  const finishRename = () => {
    titleEl.contentEditable = 'false';
    titleEl.classList.remove('editing');
    
    const newName = titleEl.innerText.trim();
    if (newName) {
      renamePage(pageId, newName);
    } else {
      const page = state.pages.find(p => p.id === pageId);
      titleEl.innerText = page ? page.name : '';
    }
  };

  titleEl.addEventListener('blur', finishRename, { once: true });
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
  });
}

/**
 * Drag and drop pages reordering.
 */
function setupPageDragReorder(row, pageId) {
  row.setAttribute('draggable', 'true');

  row.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('page-id', pageId);
    e.dataTransfer.effectAllowed = 'move';
    row.style.opacity = '0.4';
  });

  row.addEventListener('dragend', () => {
    row.style.opacity = '1';
    // Clear indicators
    container.querySelectorAll('.page-row').forEach(r => {
      r.style.borderTop = '';
      r.style.borderBottom = '';
    });
  });

  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const hoverY = e.clientY - rect.top;

    container.querySelectorAll('.page-row').forEach(r => {
      r.style.borderTop = '';
      r.style.borderBottom = '';
    });

    if (hoverY < rect.height / 2) {
      row.style.borderTop = '2px solid var(--accent)';
    } else {
      row.style.borderBottom = '2px solid var(--accent)';
    }
  });

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('page-id');
    if (!draggedId || draggedId === pageId) return;

    const rect = row.getBoundingClientRect();
    const hoverY = e.clientY - rect.top;

    const draggedIdx = state.pages.findIndex(p => p.id === draggedId);
    const targetIdx = state.pages.findIndex(p => p.id === pageId);
    
    const insertIdx = hoverY < rect.height / 2 ? targetIdx : targetIdx + 1;
    
    // Remove and insert
    const [draggedPage] = state.pages.splice(draggedIdx, 1);
    
    // Compensate index shift if target was after dragged item
    let finalInsertIdx = insertIdx;
    if (draggedIdx < insertIdx) {
      finalInsertIdx = insertIdx - 1;
    }
    
    state.pages.splice(finalInsertIdx, 0, draggedPage);
    notify('pages-list-changed');
  });
}

/**
 * Throttles/debounces rendering of miniature page thumbnail mockup.
 */
function triggerThumbnailRedraw(pageId) {
  if (!thumbnailDebounces.has(pageId)) {
    const deb = debounce(() => {
      const page = state.pages.find(p => p.id === pageId);
      const thumbContainer = container?.querySelector(`[data-page-id="${pageId}"]`);
      if (page && thumbContainer) {
        drawPageThumbnailSVG(page, thumbContainer);
      }
    }, 1000); // 1-second throttle/debounce
    thumbnailDebounces.set(pageId, deb);
  }
  
  // Fire
  thumbnailDebounces.get(pageId)();
}

/**
 * Dynamically draws SVG layout representation of shapes inside page.
 */
function drawPageThumbnailSVG(page, containerEl) {
  // Compute boundaries of active objects to draw a nice framed view
  const objects = page.objects || [];
  
  let minX = 0, minY = 0, maxX = 800, maxY = 600;
  
  if (objects.length > 0) {
    minX = Math.min(...objects.map(o => o.x)) - 100;
    minY = Math.min(...objects.map(o => o.y)) - 100;
    maxX = Math.max(...objects.map(o => o.x + o.width)) + 100;
    maxY = Math.max(...objects.map(o => o.y + o.height)) + 100;
  }
  
  const width = maxX - minX;
  const height = maxY - minY;

  // Build SVG string
  let svgContent = '';
  objects.forEach(obj => {
    if (obj.hidden || obj.type === 'guide') return;

    const fill = obj.fill === 'transparent' ? 'none' : '#cbd5e1';
    const stroke = '#94a3b8';
    const sw = obj.type === 'line' || obj.type === 'arrow' ? 10 : 2;

    if (obj.type === 'circle') {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${obj.width / 2}" ry="${obj.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${obj.rotation} ${cx} ${cy})" />`;
    } else if (obj.type === 'line' || obj.type === 'arrow') {
      svgContent += `<line x1="${obj.x}" y1="${obj.y}" x2="${obj.x + obj.width}" y2="${obj.y + obj.height}" stroke="${stroke}" stroke-width="${sw * 2}" />`;
    } else {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      svgContent += `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="${typeof obj.borderRadius === 'number' ? obj.borderRadius : 0}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${obj.rotation} ${cx} ${cy})" />`;
    }
  });

  containerEl.innerHTML = `
    <svg viewBox="${minX} ${minY} ${width} ${height}" class="page-thumbnail">
      <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff" />
      ${svgContent}
    </svg>
  `;
}
