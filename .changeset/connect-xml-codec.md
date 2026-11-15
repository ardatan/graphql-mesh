---
'@graphql-mesh/transport-rest': minor
---

Mesh `@connect` can speak XML (including SOAP-shaped documents) without a separate `@soap` directive.

When `Content-Type` is `text/xml`, `application/xml`, `application/soap+xml`, or another `*+xml` type, `http.body` JSONSelection is serialized with `fast-xml-parser` (FXP object shape: `attributes`, `innerText`) instead of `JSON.stringify`. Responses with an XML Content-Type (or a body that looks like XML after JSON parse fails) are parsed back to that object shape before `selection` runs.

SOAP is just document shape in the JSON tree — authors include `soap:Envelope` / `soap:Body` themselves (quoted keys for colons). Mesh does not auto-wrap envelopes. `SOAPAction` remains a normal HTTP header.

```graphql
type Query {
  person(id: ID!): Person
    @connect(
      source: "soapDemo"
      http: {
        POST: "/SOAP.Demo.cls"
        headers: [
          { name: "Content-Type", value: "text/xml; charset=utf-8" }
          { name: "SOAPAction", value: "http://tempuri.org/SOAP.Demo.FindPerson" }
        ]
        body: """
          "soap:Envelope": {
            attributes: {
              "xmlns:soap": $("http://schemas.xmlsoap.org/soap/envelope/")
              "xmlns:tns": $("http://tempuri.org")
            }
            "soap:Body": {
              "tns:FindPerson": { "tns:id": $args.id }
            }
          }
        """
      }
      selection: """
        name: Envelope.Body.FindPersonResponse.FindPersonResult.Name
      """
    )
}
```

Response parse uses `removeNSPrefix`, so selection paths are unprefixed (`Envelope.Body…`). This is Hive/Mesh-specific XML support on the Connectors API — not Apollo Router dual-run.
