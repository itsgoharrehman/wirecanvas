# WireCanvas

WireCanvas is a production-quality, low-fidelity wireframing application built in the spirit of early Figma and wireframe.cc. Designed as a visual editor for layout wireframes and visual interaction prototypes, the application runs entirely in the browser using pure HTML5, CSS3, and modern vanilla JavaScript ES6 modules with no compile steps or heavyweight frameworks.

## Key Features

*   **Decoupled State Management**: A single source of truth state store with pub-sub event notifications allowing targeted DOM reconciliations instead of full-canvas refreshes.
*   **Infinite Canvas with Viewport Culling**: Supports an 8000×8000 canvas with passive scroll/pan listeners. Features viewport culling to mount/unmount elements off-screen, maintaining fluid performance with hundreds of objects.
*   **Proportional Scale & Orbit Rotation**:
    *   Proportionally resize multiple elements and nested group items.
    *   Trigonometrically orbit coordinates and rotation values of multiple elements around their combined bounding center.
    *   Shift-key modifier locks aspect ratio during corner resizing and snaps rotation to 15-degree steps.
*   **Smart Pink Snap Guides**: Instantly snap elements during drag-and-drop or resizing against edges (Left, Center, Right, Top, Middle, Bottom) of other canvas components.
*   **Interactive Components on Canvas**: 
    *   Double-click to edit texts inline (`contenteditable`).
    *   Toggle checkbox checkmarks, select radio buttons, and switch tabs panels directly on the active canvas.
    *   Table controls to insert/delete rows and columns dynamically.
*   **Inverse Z-Index Layers Panel Tree**: Visual tree showing groups and items in Photoshop/Figma layer order. Includes locking, hiding, inline renaming, and drag-and-drop re-parenting and reordering.
*   **Vector Page Mockup Previews**: Page selector panel rendering throttled/debounced, lightweight inline SVG-drawn miniature mockups of pages' objects layout.
*   **Starter Templates**: Quick fixtures insertion for Login Form, Dashboard Shell, and Landing Page Hero.
*   **Import / Export**: Accurate PNG rasterization of pages/selections and JSON schema validation imports.

---

## Project Structure

```
c:/Users/Gohar Rehman/Desktop/Canvas/
├── index.html                   # HTML Entry structure
├── package.json                 # Project dependencies configuration
├── README.md                    # Project documentation
├── components/                  # Self-registering UI components
│   ├── registry.js              # Shared visual properties applications
│   ├── rectangle.js
│   ├── circle.js
│   ├── line.js
│   ├── arrow.js
│   ├── text.js
│   ├── button.js
│   ├── input.js
│   ├── textarea.js
│   ├── checkbox.js
│   ├── radio.js
│   ├── dropdown.js
│   ├── card.js
│   ├── avatar.js
│   ├── image.js
│   ├── navbar.js
│   ├── sidebar.js
│   ├── divider.js
│   ├── badge.js
│   ├── searchbar.js
│   ├── progressbar.js
│   ├── table.js
│   ├── tabs.js
│   └── group.js
├── styles/                      # Grayscale visual editor style layout sheets
│   ├── main.css                 # Aggregator stylesheet
│   ├── base.css                 # Variables and typography
│   ├── layout.css               # Viewports frames layout
│   ├── toolbar.css              # Top header buttons and dropdowns
│   ├── sidebar.css              # Left panel tabs toggles
│   ├── layers.css               # Z-Index tree lists
│   ├── workspace.css            # Canvas transform and guides layer
│   ├── components.css           # Components visual wireframes
│   ├── properties.css           # Properties panel fields
│   ├── statusbar.css            # Footer indicators
│   └── contextmenu.css          # Floating menu actions
└── scripts/                     # Interaction scripts
    ├── app.js                   # Bootstrap and inline canvas editing handlers
    ├── state.js                 # Publisher-subscriber state mutations
    ├── history.js               # Command pattern undo/redo transactions
    ├── storage.js               # LocalStorage autosave
    ├── workspace.js             # Canvas coordinates and rulers drawing
    ├── render.js                # Incremental DOM mounts, patches, and culling
    ├── selection.js             # Bounding box selection calculations
    ├── drag.js                  # Moving items and marquee drag selection
    ├── resize.js                # Boundary resizing (Shift locked aspect ratios)
    ├── rotate.js                # Orbit coordinates rotation calculations
    ├── group.js                 # Nested child offset calculations
    ├── guides.js                # Smart snap guide alignments
    ├── contextmenu.js           # Right-click operations (z-index shifts, duplication)
    ├── keyboard.js              # Global keys bindings and arrow nudges
    ├── export.js                # PNG/JSON exporter
    ├── import.js                # JSON validator import
    ├── templates.js             # Starter layout fixtures
    └── utils.js                 # General mathematical methods
```

---

## How to Run Locally

Since this project runs on vanilla ES6 modules, files cannot be loaded using the standard `file://` protocol due to browser CORS security restrictions. 

You can easily serve the project locally using Python's built-in HTTP server:

```bash
# Run inside the project root folder
python -m http.server 8000
```

Once the server starts, open your browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| **Select / Hand Tool** | `V` / `H` |
| **Draw Rectangle / Circle** | `R` / `O` |
| **Draw Line / Arrow / Text** | `L` / `A` / `T` |
| **Undo / Redo** | `Ctrl+Z` / `Ctrl+Shift+Z` |
| **Copy / Cut / Paste** | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` |
| **Paste in Place** | `Ctrl+Shift+V` |
| **Duplicate Selection** | `Ctrl+D` |
| **Delete Selection** | `Delete` / `Backspace` |
| **Group / Ungroup** | `Ctrl+G` / `Ctrl+Shift+G` |
| **Nudge Selection** | Arrow keys (`1px` or grid size) |
| **Nudge Selection (Large)** | `Shift + Arrow keys` (`10px`) |
| **Bring to Front / Send to Back** | `Ctrl+]` / `Ctrl+[` |
| **Bring Forward / Send Backward** | `Ctrl+Shift+]` / `Ctrl+Shift+[` |
| **Toggle Grid / Snapping** | `G` / `S` |
| **Toggle Rulers** | `Ctrl+R` |
| **Zoom In / Out / Reset** | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| **Zoom to Fit Screen** | `Shift+1` |
| **Present Mode** | `Ctrl+P` (Esc to exit) |
