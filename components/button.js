import { registerComponent } from './registry.js';

registerComponent({
  type: 'button',
  label: 'Button',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 100, height: 36 },
  defaultProps: {
    text: 'Button',
    fill: '#f8fafc',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1,
    constraints: {
      fontSize: 12,
      fontWeight: 'regular'
    }
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity', 'constraints'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-button';
    el.innerText = obj.text || '';
    
    // Apply font constraints
    const c = obj.constraints || {};
    el.style.fontSize = `${c.fontSize || 12}px`;
    el.style.fontWeight = c.fontWeight === 'bold' ? '700' : '400';
    
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      el.innerText = value || '';
    }
    if (key === 'constraints') {
      const c = value || {};
      el.style.fontSize = `${c.fontSize || 12}px`;
      el.style.fontWeight = c.fontWeight === 'bold' ? '700' : '400';
    }
  }
});
