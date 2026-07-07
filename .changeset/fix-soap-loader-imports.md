---
"@omnigraph/soap": patch
---

Resolve nested `<wsdl:import>` and `<xsd:import>` against the importing document's location, not against a fixed `cwd`. Lets the loader follow multi-file WSDLs whose schemas span more than one directory (e.g. TMForum MTOP, OASIS) without flattening them first.

Also handles the common `<xsd:schema>` wrapper pattern — a schema element with no `targetNamespace` whose only purpose is to bring an external schema into `<wsdl:types>` via `<xsd:import>`. This is widely used and valid per the XML Schema spec; the previous code crashed dereferencing `targetNamespace`.

`fetchWSDL` now uses `readFileOrUrl`, matching `fetchXSD`, so WSDL imports work uniformly with both `http(s):` URLs and filesystem paths.

The new optional `baseUrl` parameter on `loadWSDL` lets callers tell the loader where the document came from. When omitted, the legacy `cwd`-based behaviour is preserved unchanged.
