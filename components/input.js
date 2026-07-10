import { registerComponent } from './registry.js';

registerComponent({
  type: 'input',
  label: 'Input Field',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7" y1="10" x2="7" y2="14" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 160, height: 32 },
  defaultProps: {
    text: 'Placeholder text...',
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-input';
    el.innerText = obj.text || '';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerText = value || '';
    }
  }
});
