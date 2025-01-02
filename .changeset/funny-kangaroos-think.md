---
'@graphql-mesh/transport-soap': patch
'@omnigraph/soap': patch
'@graphql-mesh/types': patch
---

- You can now choose the name of the alias you want to use for SOAP body;

```ts filename="mesh.config.ts" {4}
import { defineConfig } from '@graphql-mesh/compose-cli'

export const composeConfig = defineConfig({
  sources: [
    {
      sourceHandler: loadSOAPSubgraph('CountryInfo', {
        source:
          'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
        bodyAlias: 'my-body'
      })
    }
  ]
})
```

- Then it will generate a body like below by using the alias;

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:my-body="http://foo.com/">
   <soap:Body>
      <my-body:Foo>
          <my-body:Bar>baz</my-body:Bar>
      </my-body:Foo>
   </soap:Body>
</soap:Envelope>
```

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
          alias: 'header',
          namespace: 'http://foo.com',
          headers: {
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
