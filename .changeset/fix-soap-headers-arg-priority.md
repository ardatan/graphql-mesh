---
"@graphql-mesh/transport-soap": patch
---

Fix query args taking priority over `soapHeaders` loader config in namespace-aware SOAP executor.

When both a WSDL-declared `<soap:header>` arg and the loader-level `soapHeaders` config contribute content to the same XML header element, the config entry previously ran last and silently overwrote the value supplied by the caller.

The fix seeds `soap:Header` from the `soapHeaders` config first, then lets the args loop overwrite on key collision — so explicit query arguments always take priority over static loader defaults. Args that GraphQL coerces to an empty/absent value (null, undefined, `""`, or `{}`) are not treated as intentional overrides and leave the config-supplied default in place.
