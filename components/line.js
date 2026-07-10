import { registerComponent } from './registry.js';

registerComponent({
  type: 'line',
  label: 'Line',
  icon: '<svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  defaultSize: { width: 100, height: 100 },
  defaultProps: {
    border: { color: '#475569', width: 2, style: 'solid' }, // line uses border color for stroke color
    opacity: 1
  },
  editableProperties: ['border', 'opacity'],
  render(obj) {
    const container = document.createElement('div');
    container.className = 'wc-component wc-line';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wc-line-svg');
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', String(obj.width));
    line.setAttribute('y2', String(obj.height));
    line.setAttribute('stroke', obj.border?.color || '#475569');
    line.setAttribute('stroke-width', String(obj.border?.width || 2));
    
    if (obj.border?.style === 'dashed') {
      line.setAttribute('stroke-dasharray', '5,5');
    } else if (obj.border?.style === 'dotted') {
      line.setAttribute('stroke-dasharray', '2,3');
    }
    
    svg.appendChild(line);
    container.appendChild(svg);
    return container;
  },
  onPropertyChange(obj, key, value, el) {
    const line = el.querySelector('line');
    if (line) {
      line.setAttribute('x2', String(obj.width));
      line.setAttribute('y2', String(obj.height));
      if (key === 'border') {
        line.setAttribute('stroke', value.color || '#475569');
        line.setAttribute('stroke-width', String(value.width || 2));
        if (value.style === 'dashed') {
          line.setAttribute('stroke-dasharray', '5,5');
        } else if (value.style === 'dotted') {
          line.setAttribute('stroke-dasharray', '2,3');
        } else {
          line.removeAttribute('stroke-dasharray');
        }
      }
    }
  }
});
