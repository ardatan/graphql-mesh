---
'@graphql-mesh/transport-soap': patch
'@omnigraph/soap': patch
---

Some SOAP API endpoints need `SOAPAction` HTTP header that points to the action path defined in the
WSDL.
This fixes that issue for those endpoints.
[Learn more about SOAPAction header](https://www.ibm.com/docs/en/baw/22.x?topic=binding-protocol-headers)
