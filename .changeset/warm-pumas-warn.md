---
"@omnigraph/openapi": patch
---

Respect global parameters object on top of method objects like;
```yml
parameters: # Take this as well
  - name: foo
    ...
get:
  parameters:
    - name: bar
```
