---
'@graphql-mesh/string-interpolation': patch
---

Avoid logging sensitive data directly. Instead, log a generic error message without including the potentially sensitive str variable. This way, it still notifies of errors without risking the exposure of sensitive information.

- Replace the logging statement on line 176 in `packages/string-interpolation/src/interpolator.js` to avoid logging the `str` variable.
- Ensure that the new logging statement provides enough information to debug the issue without exposing sensitive data.
