import { registerComponent } from './registry.js';

registerComponent({
  type: 'sidebar',
  label: 'Sidebar Shell',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="3" width="18" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 120, height: 240 },
  defaultProps: {
    text: 'Dashboard\nProjects\nUsers\nSettings',
    fill: '#f8fafc',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 0,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-sidebar';
    
    // Render lines as vertical link elements
    const lines = (obj.text || '').split('\n');
    lines.forEach(line => {
      const item = document.createElement('div');
      item.style.padding = '4px 0';
      item.style.fontSize = '11px';
      item.style.fontWeight = '500';
      item.style.borderBottom = '1px solid #e2e8f0';
      item.innerText = line;
      el.appendChild(item);
    });
    
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerHTML = '';
      const lines = (value || '').split('\n');
      lines.forEach(line => {
        const item = document.createElement('div');
        item.style.padding = '4px 0';
        item.style.fontSize = '11px';
        item.style.fontWeight = '500';
        item.style.borderBottom = '1px solid #e2e8f0';
        item.innerText = line;
        el.appendChild(item);
      });
    }
  }
});
