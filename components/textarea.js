import { registerComponent } from './registry.js';

registerComponent({
  type: 'textarea',
  label: 'Text Area',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 160, height: 80 },
  defaultProps: {
    text: 'Enter message text...',
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-textarea';
    el.innerText = obj.text || '';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerText = value || '';
    }
  }
});
