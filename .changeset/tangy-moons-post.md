---
'@graphql-mesh/transport-soap': minor
'@omnigraph/soap': minor
---

Auto detection of SOAP version to decide SOAP namespace;
For SOAP 1.1, it is set to `http://schemas.xmlsoap.org/soap/envelope/` and for SOAP 1.2, it is set to `http://www.w3.org/2003/05/soap-envelope`.

If you want to use a custom namespace, you can set it like below;

```ts
import { defineConfig } from '@graphql-mesh/compose-cli'
import { loadSOAPSubgraph } from '@omnigraph/soap'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('CountryInfo', {
        source:
          'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
        soapNamespace: 'http://foo.com/schemas/soap/envelope'
      })
    }
  ]
})
```

