import { registerComponent } from './registry.js';

registerComponent({
  type: 'card',
  label: 'Card Panel',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 200, height: 140 },
  defaultProps: {
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 6,
    opacity: 1
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-card';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
