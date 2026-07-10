import { registerComponent } from './registry.js';

registerComponent({
  type: 'searchbar',
  label: 'Search Bar',
  icon: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  defaultSize: { width: 180, height: 32 },
  defaultProps: {
    text: 'Search...',
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 9999,
    opacity: 1
  },
  editableProperties: ['text', 'fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-searchbar';
    
    // Add search icon SVG
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('class', 'icon');
    iconSvg.innerHTML = `<circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'wc-searchbar-text';
    textSpan.innerText = obj.text || '';
    
    el.appendChild(iconSvg);
    el.appendChild(textSpan);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'text') {
      const textSpan = el.querySelector('.wc-searchbar-text');
      if (textSpan) textSpan.innerText = value || '';
    }
  }
});
