import { registerComponent } from './registry.js';

registerComponent({
  type: 'dropdown',
  label: 'Dropdown',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14 10-2 2-2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  defaultSize: { width: 140, height: 32 },
  defaultProps: {
    text: 'Select Option...',
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-dropdown';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'wc-dropdown-text';
    textSpan.innerText = obj.text || '';
    
    el.appendChild(textSpan);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      const textSpan = el.querySelector('.wc-dropdown-text');
      if (textSpan) textSpan.innerText = value || '';
    }
  }
});
