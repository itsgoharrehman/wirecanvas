import { registerComponent } from './registry.js';

registerComponent({
  type: 'image',
  label: 'Image',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="m21 15-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  defaultSize: { width: 120, height: 90 },
  defaultProps: {
    fill: '#f1f5f9',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-image';
    
    // Create the X placeholder SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wc-image-svg');
    
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '0');
    line1.setAttribute('y1', '0');
    line1.setAttribute('x2', '100%');
    line1.setAttribute('y2', '100%');
    
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '100%');
    line2.setAttribute('y1', '0');
    line2.setAttribute('x2', '0');
    line2.setAttribute('y2', '100%');
    
    svg.appendChild(line1);
    svg.appendChild(line2);
    
    const label = document.createElement('span');
    label.className = 'wc-image-placeholder-text';
    label.innerText = 'IMAGE';
    
    el.appendChild(svg);
    el.appendChild(label);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    // Rely on applyCommonStyles
  }
});
