import { registerComponent } from './registry.js';

registerComponent({
  type: 'arrow',
  label: 'Arrow',
  icon: '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M20 4H12M20 4V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  defaultSize: { width: 100, height: 100 },
  defaultProps: {
    border: { color: '#475569', width: 2, style: 'solid' },
    opacity: 1
  },
  editableProperties: ['border', 'opacity'],
  render(obj) {
    const container = document.createElement('div');
    container.className = 'wc-component wc-arrow';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wc-arrow-svg');
    
    // Create defs and marker for arrowhead
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `arrowhead-${obj.id}`);
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 4, 0 8');
    polygon.setAttribute('fill', obj.border?.color || '#475569');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', String(obj.width));
    line.setAttribute('y2', String(obj.height));
    line.setAttribute('stroke', obj.border?.color || '#475569');
    line.setAttribute('stroke-width', String(obj.border?.width || 2));
    line.setAttribute('marker-end', `url(#arrowhead-${obj.id})`);
    
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
    const polygon = el.querySelector('polygon');
    if (line) {
      line.setAttribute('x2', String(obj.width));
      line.setAttribute('y2', String(obj.height));
      if (key === 'border') {
        line.setAttribute('stroke', value.color || '#475569');
        line.setAttribute('stroke-width', String(value.width || 2));
        if (polygon) {
          polygon.setAttribute('fill', value.color || '#475569');
        }
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
