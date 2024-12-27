---
'@graphql-mesh/transport-soap': patch
'@omnigraph/soap': patch
'@graphql-mesh/types': patch
---

If you want to add SOAP headers to the request body like below;

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:header="http://foo.com/">
   <soap:Header>
      <header:MyHeader>
         <header:UserName>user</header:UserName>
         <header:Password>password</header:Password>
      </header:MyHeader>
   </soap:Header>
```

You can add the headers to the configuration like below;

```ts filename="mesh.config.ts" {2,7-9}
import { defineConfig } from '@graphql-mesh/compose-cli'
import { loadSOAPSubgraph } from '@omnigraph/soap'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('CountryInfo', {
        source:
          'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
        soapHeaders: {
          namespace: 'http://foo.com',
          content: {
            MyHeader: {
              UserName: 'user',
              Password: 'password'
            }
          }
        }
      })
    }
  ]
})
```
