---
id: soap
title: SOAP
sidebar_label: SOAP
---
![image](https://user-images.githubusercontent.com/20847995/79220083-0a1d3a00-7e5c-11ea-9ac5-855428121143.png)

This handler allows you to consume [SOAP](https://soapui.org) `WSDL` files and generate a remote executable schema for those services.

To get started, install the handler library from NPM:

```sh
yarn add @graphql-mesh/soap
```

Now, you can use it directly in your Mesh config file:

```yml
sources:
  - name: CountryInfo
    handler:
      soap:
        wsdl: http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL
```

## Codesandbox Example

You can check out our example that uses SOAP Handler.

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/soap-country-info?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="country-info-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/SoapHandler.generated.md}
