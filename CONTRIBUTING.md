# Contributing to wirecanvas

Thank you for your interest in contributing. We welcome contributions that expand the UI component library, improve grid transformation mathematics, or enhance export fidelity.

## Component Contribution Guidelines
When implementing a new canvas element:
1. **Registry Integration**: Register the component in `components/registry.js` with defined default dimensions, category, and property controls.
2. **Transform Compliance**: Ensure all component bounding boxes respond predictably to `scripts/resize.js` and `scripts/rotate.js`.
3. **State Serialization**: All component visual states must cleanly serialize into the JSON layout format in `scripts/export.js`.

## Contribution Workflow
1. Fork and clone:
   ```bash
   git clone https://github.com/<your-username>/wirecanvas.git
   cd wirecanvas
   ```
2. Create a focused branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Run the development server (`npm run dev`) and test your component on the canvas.
4. Submit a Pull Request completing the mandatory security checklist in `.github/PULL_REQUEST_TEMPLATE.md`.