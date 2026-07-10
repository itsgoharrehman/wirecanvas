import { registerComponent } from './registry.js';

registerComponent({
  type: 'group',
  label: 'Group',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  defaultSize: { width: 100, height: 100 },
  defaultProps: {
    fill: 'transparent',
    opacity: 1,
    childIds: []
  },
  editableProperties: ['opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-group';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
