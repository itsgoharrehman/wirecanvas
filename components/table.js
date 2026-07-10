import { registerComponent } from './registry.js';

registerComponent({
  type: 'table',
  label: 'Table',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" stroke-width="2"/><line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" stroke-width="2"/></svg>',
  defaultSize: { width: 300, height: 120 },
  defaultProps: {
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1,
    metadata: {
      rows: 3,
      cols: 3,
      headers: ['Header 1', 'Header 2', 'Header 3'],
      cells: [
        ['Item A1', 'Item A2', 'Item A3'],
        ['Item B1', 'Item B2', 'Item B3']
      ]
    }
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-table-container';
    
    const table = document.createElement('table');
    table.className = 'wc-table';
    
    const meta = obj.metadata || { rows: 3, cols: 3, headers: [], cells: [] };
    const numRows = meta.rows || 3;
    const numCols = meta.cols || 3;
    const headers = meta.headers || [];
    const cells = meta.cells || [];
    
    // Build headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 0; c < numCols; c++) {
      const th = document.createElement('th');
      th.innerText = headers[c] !== undefined ? headers[c] : `Col ${c + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Build body
    const tbody = document.createElement('tbody');
    // Note: meta.rows counts including headers (e.g. 3 rows total = 1 header + 2 data rows)
    const numDataRows = Math.max(1, numRows - 1);
    for (let r = 0; r < numDataRows; r++) {
      const tr = document.createElement('tr');
      const rowData = cells[r] || [];
      for (let c = 0; c < numCols; c++) {
        const td = document.createElement('td');
        td.innerText = rowData[c] !== undefined ? rowData[c] : `Data ${r + 1}-${c + 1}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    
    el.appendChild(table);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'metadata') {
      // Re-render table contents
      el.innerHTML = '';
      const table = this.render(obj).querySelector('table');
      if (table) el.appendChild(table);
    }
  }
});
