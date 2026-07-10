import { registerComponent } from './registry.js';

registerComponent({
  type: 'checkbox',
  label: 'Checkbox',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  defaultSize: { width: 120, height: 24 },
  defaultProps: {
    text: 'Checkbox Item',
    fill: 'transparent',
    opacity: 1,
    metadata: {
      checked: true
    }
  },
  editableProperties: ['text', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-checkbox-container';
    
    const box = document.createElement('div');
    box.className = 'wc-checkbox-box';
    if (obj.metadata?.checked) {
      box.classList.add('checked');
    }
    
    const label = document.createElement('span');
    label.className = 'wc-checkbox-label';
    label.innerText = obj.text || '';
    
    el.appendChild(box);
    el.appendChild(label);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      const label = el.querySelector('.wc-checkbox-label');
      if (label) label.innerText = value || '';
    }
    if (key === 'metadata') {
      const box = el.querySelector('.wc-checkbox-box');
      if (box) {
        box.classList.toggle('checked', !!value?.checked);
      }
    }
  }
});
