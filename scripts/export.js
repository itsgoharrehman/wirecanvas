import { state, getObjects, getObjectById } from './state.js';
import { getRotatedBounds } from './utils.js';

/**
 * Triggers full project JSON file download.
 * Excludes guides according to specs.
 */
export function triggerExportJSON() {
  const payload = {
    schemaVersion: state.schemaVersion,
    projectId: state.projectId,
    projectName: state.projectName,
    pages: state.pages.map(page => ({
      id: page.id,
      name: page.name,
      // Filter out rulers dropped guides
      objects: page.objects.filter(obj => obj.type !== 'guide')
    })),
    activePageId: state.activePageId,
    view: state.view,
    settings: state.settings
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.projectName.replace(/\s+/g, '_') || 'project'}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Exports current page or active selection as a PNG image using html-to-image library.
 * Coordinates translation offsets dynamically.
 */
export function triggerExportPNG(selectionOnly = false) {
  const pageObjects = getObjects();
  if (pageObjects.length === 0) return;

  const targetIds = selectionOnly ? state.selection : pageObjects.map(o => o.id);
  if (targetIds.length === 0) return;

  // 1. Calculate combined bounds of all target elements in canvas coordinates
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  targetIds.forEach(id => {
    const obj = getObjectById(id);
    if (obj && obj.type !== 'guide' && !obj.hidden) {
      const bounds = getRotatedBounds(obj.x, obj.y, obj.width, obj.height, obj.rotation);
      minX = Math.min(minX, bounds.left);
      maxX = Math.max(maxX, bounds.right);
      minY = Math.min(minY, bounds.top);
      maxY = Math.max(maxY, bounds.bottom);
    }
  });

  if (minX === Infinity) return;

  // Add padding around margins
  const padding = 20;
  const width = Math.ceil(maxX - minX + padding * 2);
  const height = Math.ceil(maxY - minY + padding * 2);

  // 2. Build temporary container DOM structure
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-99999px';
  tempContainer.style.top = '-99999px';
  tempContainer.style.width = `${width}px`;
  tempContainer.style.height = `${height}px`;
  tempContainer.style.backgroundColor = '#ffffff';

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px)`;
  tempContainer.appendChild(wrapper);

  document.body.appendChild(tempContainer);

  // 3. Clone and mount elements matching target list
  targetIds.forEach(id => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      const clone = el.cloneNode(true);
      
      // Make sure hidden elements are displayed in clone and active styles remain static
      clone.classList.remove('hidden-object');
      clone.style.display = 'block';
      
      wrapper.appendChild(clone);
    }
  });

  // 4. Trigger download with html-to-image
  if (window.htmlToImage && typeof window.htmlToImage.toPng === 'function') {
    window.htmlToImage.toPng(tempContainer, {
      width: width,
      height: height,
      style: {
        opacity: '1'
      }
    })
    .then(dataUrl => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${state.projectName.replace(/\s+/g, '_')}_${selectionOnly ? 'selection' : 'page'}.png`;
      link.click();
      tempContainer.remove();
    })
    .catch(err => {
      console.error("PNG render failed:", err);
      tempContainer.remove();
    });
  } else {
    // Fallback if library failed to load
    tempContainer.remove();
    alert("html-to-image library is not available. Export failed.");
  }
}
