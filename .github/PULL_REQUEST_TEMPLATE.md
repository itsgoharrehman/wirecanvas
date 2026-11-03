## Summary of Changes

Describe the proposed changes, component additions, and reason for the modification.

## Quality and Security Checklist

Before submitting this pull request, verify each of the following invariants:

- [ ] **Component Serialization**: Verified that any new or modified component correctly serializes and deserializes via JSON export/import.
- [ ] **Transform Verified**: Verified that dragging, resizing, rotating, and grid-snapping work smoothly without coordinate drift.
- [ ] **SVG Sanitization**: Verified that exported SVG/PNG markup does not execute arbitrary scripts.
- [ ] **Tested in Browser**: Verified in modern evergreen browsers with `npm run dev`.

## Testing Performed

Detail the local tests or manual canvas interaction steps conducted.