---
'@omnigraph/openapi': patch
---

Support different ref types in `discriminator.mapping`;

All of the following ref formats are considered as valid;
```yml
discriminator:
  mapping:
    A: '#/components/schemas/A'
    # or
    A: 'A'
    # or
    A: '../components/schemas/A'
```
