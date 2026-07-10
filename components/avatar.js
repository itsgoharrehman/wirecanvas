import { registerComponent } from './registry.js';

registerComponent({
  type: 'avatar',
  label: 'Avatar',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 4c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" fill="currentColor"/></svg>',
  defaultSize: { width: 40, height: 40 },
  defaultProps: {
    fill: '#e2e8f0',
    border: { color: '#475569', width: 1, style: 'solid' },
    opacity: 1
  },
  editableProperties: ['fill', 'border', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-avatar';
    
    // Add user SVG
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
