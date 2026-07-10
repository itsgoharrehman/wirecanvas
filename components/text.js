import { registerComponent } from './registry.js';

registerComponent({
  type: 'text',
  label: 'Text',
  icon: '<svg viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  defaultSize: { width: 150, height: 40 },
  defaultProps: {
    text: 'Double click to edit text',
    fill: 'transparent',
    opacity: 1,
    constraints: {
      fontSize: 14,
      fontFamily: 'system-ui',
      textAlign: 'left',
      lineHeight: 1.4,
      fontWeight: 'regular'
    }
  },
  editableProperties: ['text', 'constraints', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-text';
    
    // Apply initial content
    el.innerText = obj.text || '';
    
    // Apply styling from constraints
    const c = obj.constraints || {};
    el.style.fontSize = `${c.fontSize || 14}px`;
    el.style.fontFamily = c.fontFamily || 'system-ui';
    el.style.textAlign = c.textAlign || 'left';
    el.style.lineHeight = String(c.lineHeight || 1.4);
    el.style.fontWeight = c.fontWeight === 'bold' ? '700' : '400';
    
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      // Update text only if not editing to avoid cursor jumping
      if (!el.classList.contains('editing')) {
        el.innerText = value || '';
      }
    }
    if (key === 'constraints') {
      const c = value || {};
      el.style.fontSize = `${c.fontSize || 14}px`;
      el.style.fontFamily = c.fontFamily || 'system-ui';
      el.style.textAlign = c.textAlign || 'left';
      el.style.lineHeight = String(c.lineHeight || 1.4);
      el.style.fontWeight = c.fontWeight === 'bold' ? '700' : '400';
    }
  }
});
