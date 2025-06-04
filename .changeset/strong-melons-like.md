---
'@omnigraph/openapi': patch
---

The fix ensures that there is no correct or incorrect order of swaggers - whatever their order,
schema loading and HATEOAS cross-referencing works reliably through coordinated batch processing
with proper dependency resolution.
