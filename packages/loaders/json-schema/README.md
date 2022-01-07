## JSON Schema (@omnigraph/json-schema)

This package generates GraphQL Schema from JSON Schema and sample JSON request and responses. You can define your root field endpoints like below in your GraphQL Config for example;

```yml
schema:
  myOmnigraph:
    loader: '@omnigraph/json-schema'
    # The base URL of your following endpoints
    baseUrl: http://www.my-api.com
    # The headers will be used while downloading JSON Schemas and Samples
    schemaHeaders:
      Content-Type: application/json
    # The headers will be used while making requests via HTTP
    operationHeaders:
      Accept: application/json
      Content-Type: application/json
      Authorization: Bearer TOKEN
    # Endpoints
    operations:
      # Root Type
      - type: Query
        # The Field Name in the specified Root Type
        field: me
        # Description
        description: My Profile
        # The relative URL to the defined `baseUrl`
        path: /user/{args.id} # args will generate an argument for the field and put it here automatically
        # The HTTP method
        method: GET
        # The path of the relevant JSON Schema for the return type
        responseSchema: ./json-schemas/user.json#/definitions/User
      - type: Mutation
        field: createUser
        path: /user
        method: PUT
        # A JSON sample file for the request body
        requestSample: ./json-samples/user-input.json
        # GraphQL type name for the request body
        requestTypeName: CreateUpdateUser
        # A JSON sample file for the response body and it points to the specific definition using JSON Pointer pattern
        responseSchema: ./json-schemas/user.json#/definitions/User
```
