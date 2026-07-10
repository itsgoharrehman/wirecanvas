import { initProject, notify } from './state.js';
import { migrateProjectSchema, saveProject } from './storage.js';
import { clearAllHistory } from './history.js';

/**
 * Validates, migrates, and loads a JSON schema representation of a WireCanvas project.
 */
export function importProjectJSON(json) {
  try {
    // 1. Core Schema Validation
    if (!json || typeof json !== 'object') {
      throw new Error("Invalid file content. Expected JSON object.");
    }

    if (!json.projectName || !Array.isArray(json.pages)) {
      throw new Error("Missing required project schema properties ('projectName' or 'pages').");
    }

    // Verify page array structure
    json.pages.forEach((page, idx) => {
      if (!page.id || !page.name || !Array.isArray(page.objects)) {
        throw new Error(`Invalid page structure in index: ${idx}.`);
      }
    });

    // 2. Perform Migration to newest schema version
    const migrated = migrateProjectSchema(json);

    // 3. Clear transient command histories
    clearAllHistory();

    // 4. Set state values
    initProject(migrated);

    // 5. Trigger storage save
    saveProject();

    // Visual notification
    console.log("Project JSON imported successfully.");
  } catch (err) {
    console.error("Failed to import project JSON:", err);
    alert(`Import failed: ${err.message}`);
  }
}
