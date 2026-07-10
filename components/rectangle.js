import { registerComponent } from './registry.js';

registerComponent({
  type: 'rectangle',
  label: 'Rectangle',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  defaultSize: { width: 120, height: 80 },
  defaultProps: {
    fill: '#ffffff',
    fillOpacity: 1,
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 0,
    opacity: 1
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-rect';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
