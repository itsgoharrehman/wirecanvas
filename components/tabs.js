import { registerComponent } from './registry.js';

registerComponent({
  type: 'tabs',
  label: 'Tabs Container',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="8" y1="3" x2="8" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="3" x2="14" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>',
  defaultSize: { width: 260, height: 120 },
  defaultProps: {
    fill: '#ffffff',
    border: { color: '#475569', width: 1, style: 'solid' },
    borderRadius: 4,
    opacity: 1,
    metadata: {
      activeTab: 0,
      tabs: ['Tab 1', 'Tab 2', 'Tab 3'],
      contents: ['Content Area 1', 'Content Area 2', 'Content Area 3']
    }
  },
  editableProperties: ['fill', 'border', 'borderRadius', 'opacity'],
  render(obj) {
    const el = document.createElement('div');
    el.className = 'wc-component wc-tabs-container';
    
    const meta = obj.metadata || { activeTab: 0, tabs: [], contents: [] };
    const activeTab = meta.activeTab || 0;
    const tabs = meta.tabs || ['Tab 1'];
    const contents = meta.contents || ['Content'];
    
    // Tab Headers
    const headersDiv = document.createElement('div');
    headersDiv.className = 'wc-tabs-headers';
    
    tabs.forEach((tabName, idx) => {
      const headerItem = document.createElement('div');
      headerItem.className = 'wc-tabs-header-item';
      if (idx === activeTab) {
        headerItem.classList.add('active');
      }
      headerItem.innerText = tabName;
      headerItem.setAttribute('data-tab-idx', String(idx));
      headersDiv.appendChild(headerItem);
    });
    
    // Tab Content Area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'wc-tabs-content';
    contentDiv.innerText = contents[activeTab] !== undefined ? contents[activeTab] : '';
    
    el.appendChild(headersDiv);
    el.appendChild(contentDiv);
    return el;
  },
  onPropertyChange(obj, key, value, el) {
    if (key === 'metadata') {
      el.innerHTML = '';
      const content = this.render(obj);
      while (content.firstChild) {
        el.appendChild(content.firstChild);
      }
    }
  }
});
