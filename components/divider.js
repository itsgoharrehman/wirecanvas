import { registerComponent } from './registry.js';

registerComponent({
  type: 'divider',
  label: 'Divider Line',
  icon: '<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/></svg>',
  defaultSize: { width: 120, height: 10 },
  defaultProps: {
    fill: 'transparent',
    opacity: 1,
    metadata: {
      orientation: 'horizontal'
    }
  },
  editableProperties: ['opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-divider';
    if (obj.metadata?.orientation === 'vertical') {
      el.classList.add('vertical');
    }
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'metadata') {
      el.classList.toggle('vertical', value?.orientation === 'vertical');
    }
  }
});
