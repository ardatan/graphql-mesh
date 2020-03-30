---
id: soap
title: SOAP
sidebar_label: SOAP
---

This handler allow you to consume SOAP services from a remote endpoint.

To get started, install the handler library from NPM:

```
$ yarn add @graphql-mesh/soap
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: CountryInfo
    handler:
      soap:
        wsdl: http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL
```

## Config API Reference

{@import ../generated-markdown/SoapHandler.generated.md}
