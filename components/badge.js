import { registerComponent } from './registry.js';

registerComponent({
  type: 'badge',
  label: 'Badge Pill',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  defaultSize: { width: 60, height: 22 },
  defaultProps: {
    text: 'Badge',
    fill: '#e2e8f0',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 9999,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-badge';
    el.innerText = obj.text || '';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerText = value || '';
    }
  }
});
