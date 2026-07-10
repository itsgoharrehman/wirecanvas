import { registerComponent } from './registry.js';

registerComponent({
  type: 'navbar',
  label: 'Navbar Shell',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7" y1="7" x2="7" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  defaultSize: { width: 320, height: 48 },
  defaultProps: {
    text: 'Logo   ·   Home   Products   About',
    fill: '#f8fafc',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 0,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-navbar';
    el.innerText = obj.text || '';
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerText = value || '';
    }
  }
});
