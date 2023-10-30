---
'json-machete': minor
---

BREAKING: All the functions requires `readFileOrUrl` instead of fetch function and/or import
function, and they no longer need a logger instance but `debugLogFn` for verbose logging
