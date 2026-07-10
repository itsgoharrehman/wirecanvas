import { registerComponent } from './registry.js';

registerComponent({
  type: 'progressbar',
  label: 'Progress Bar',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="10" width="10" height="4" rx="2" fill="currentColor"/></svg>',
  defaultSize: { width: 150, height: 16 },
  defaultProps: {
    fill: '#e2e8f0',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 9999,
    opacity: 1,
    metadata: {
      progress: 40
    }
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-progressbar';
    
    const fill = document.createElement('div');
    fill.className = 'wc-progressbar-fill';
    const percent = obj.metadata?.progress !== undefined ? obj.metadata.progress : 40;
    fill.style.width = `${percent}%`;
    
    el.appendChild(fill);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'metadata') {
      const fill = el.querySelector('.wc-progressbar-fill');
      if (fill) {
        const percent = value?.progress !== undefined ? value.progress : 40;
        fill.style.width = `${percent}%`;
      }
    }
  }
});
