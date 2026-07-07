---
"@graphql-mesh/transport-soap": patch
"@omnigraph/soap": patch
---

Correct SOAP envelope generation for WSDLs with multiple XSD namespaces and `<soap:header>` bindings, and fix array serialization.

Three issues are addressed together because they all surface on the same class of WSDL (one operation, multiple XSD schemas, header binding, array-typed parts):

- **XML namespace** — every body element used to be qualified with the WSDL `bindingNamespace`. Now each element gets the namespace of the schema where it is declared, so types that come from a different XSD render under their own prefix.
- **`<soap:header>` binding** — message parts the WSDL routes to `<soap:Header>` were being placed inside `<soap:Body>`. The loader now records header parts on the `@soap` directive and the executor splits them into `<soap:Header>` at request time.
- **Arrays** — array-valued args were iterated with `for..in`, producing numeric child elements (`<prefix:0>`, `<prefix:1>`). They now serialize as repeated sibling elements.

The new namespace-aware path activates only when the schema was built by the updated loader (it now exposes a `typeNamespaceMap` on `schema.extensions` and a per-arg namespace map on the `@soap` directive) and `bodyAlias` is not configured. Schemas built by older loader versions, and any usage that sets `bodyAlias`, continue to use the legacy code path unchanged. For single-namespace WSDLs without `bodyAlias` the new path falls back to the same `body` prefix the legacy path used, preserving byte-for-byte compatibility (covered by a regression test against `tempconvert.wsdl`).
