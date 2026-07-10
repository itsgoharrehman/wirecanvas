import { registerComponent } from './registry.js';

registerComponent({
  type: 'radio',
  label: 'Radio Button',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  defaultSize: { width: 120, height: 24 },
  defaultProps: {
    text: 'Radio Option',
    fill: 'transparent',
    opacity: 1,
    metadata: {
      checked: true
    }
  },
  editableProperties: ['text', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-radio-container';
    
    const box = document.createElement('div');
    box.className = 'wc-radio-box';
    if (obj.metadata?.checked) {
      box.classList.add('checked');
    }
    
    const label = document.createElement('span');
    label.className = 'wc-radio-label';
    label.innerText = obj.text || '';
    
    el.appendChild(box);
    el.appendChild(label);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      const label = el.querySelector('.wc-radio-label');
      if (label) label.innerText = value || '';
    }
    if (key === 'metadata') {
      const box = el.querySelector('.wc-radio-box');
      if (box) {
        box.classList.toggle('checked', !!value?.checked);
      }
    }
  }
});
