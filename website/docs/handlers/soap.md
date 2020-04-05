---
id: soap
title: SOAP
sidebar_label: SOAP
---

This handler allows you to consume [SOAP](https://www.soapui.org/) `WSDL` files and generate a remote executable schema for those services.

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
