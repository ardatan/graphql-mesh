---
"@omnigraph/soap": patch
---

Support documents without any prefixes on W3 definitions like `xs` etc.

WSDL definitions might not have any prefix for W3 definitions as in here;
```xml
<xs:schema />
```
Unlike this one;
```xml
<schema />
```

Both are supported, previously it was throwing while looking for a namespace prefix for W3. Now it considers W3 to be the default/global namespace if there is no explicit prefix for it in the document.

```xml
<wsdl:definitions xmlns:xsd="http://www.w3.org/2001/XMLSchema" />
```
