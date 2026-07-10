import { registerComponent } from './registry.js';

registerComponent({
  type: 'circle',
  label: 'Ellipse',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  defaultSize: { width: 100, height: 100 },
  defaultProps: {
    fill: '#ffffff',
    fillOpacity: 1,
    border: { color: '#475569', width: 1, style: 'solid' },
    opacity: 1
  },
  editableProperties: ['fill', 'border', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-circle';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
