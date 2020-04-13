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

> You can check out our example that uses SOAP Handler.
<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/country-info?fontsize=14&hidenavigation=1&theme=dark"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="country-info-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/SoapHandler.generated.md}
