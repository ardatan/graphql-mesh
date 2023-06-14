import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Algolia schema with nested one Of', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('algolia-nested-one-of', {
      source: `./fixtures/algolia-subset-nested-one-of.yml`,
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchInlineSnapshot(`
      "schema {
        query: Query
        mutation: Mutation
      }

      directive @oneOf on OBJECT | INTERFACE | INPUT_OBJECT

      directive @resolveRoot on FIELD_DEFINITION

      directive @globalOptions(sourceName: String, endpoint: String, operationHeaders: ObjMap, queryStringOptions: ObjMap, queryParams: ObjMap) on OBJECT

      directive @httpOperation(path: String, operationSpecificHeaders: ObjMap, httpMethod: HTTPMethod, isBinary: Boolean, requestBaseBody: ObjMap, queryParamArgMap: ObjMap, queryStringOptionsByParam: ObjMap) on FIELD_DEFINITION

      type Query @globalOptions(sourceName: "algolia-nested-one-of", endpoint: "https://{args.appId:myAppId}.algolia.net") {
        "Retrieve the Rule with the specified objectID."
        getRule(appId: String = "myAppId"): rule @httpOperation(path: "/1/indexes/", operationSpecificHeaders: "{\\"accept\\":\\"application/json\\"}", httpMethod: GET)
      }

      "Rule object."
      type rule {
        consequence: consequence
      }

      "Consequence of the Rule."
      type consequence {
        params: consequenceParams
      }

      type consequenceParams {
        facetFilters: [facetFilters]
      }

      "Filter hits by facet value."
      union facetFilters = listOfSearchFilters | String_container

      "List of search filters"
      type listOfSearchFilters {
        items: [mixedSearchFilters]
      }

      "Mixed search filters. Array of strings or string." 
      union mixedSearchFilters = searchFiltersArrayString | String_container

      "Search filters array of string"
      type searchFiltersArrayString {
        items: [String]
      }

      type String_container {
        String: String @resolveRoot
      }

      type Mutation {
        "Create or update the Rule with the specified objectID."
        saveRule(appId: String = "myAppId", input: rule_Input): String @httpOperation(path: "/1/indexes/", operationSpecificHeaders: "{\\"Content-Type\\":\\"application/json\\",\\"accept\\":\\"application/json\\"}", httpMethod: PUT)
      }

      "Rule object."
      input rule_Input {
        consequence: consequence_Input
      }

      "Consequence of the Rule."
      input consequence_Input {
        params: consequenceParams_Input
      }

      input consequenceParams_Input {
        facetFilters: facetFilters_Input
      }

      input facetFilters_Input @oneOf {
        listOfSearchFilters: [mixedSearchFilters_Input]
        String: String
      }
      
      input mixedSearchFilters_Input @oneOf {
        searchFiltersArrayString: [String]
        String: String
      }

      scalar ObjMap

      enum HTTPMethod {
        GET
        HEAD
        POST
        PUT
        DELETE
        CONNECT
        OPTIONS
        TRACE
        PATCH
      }"
    `);
  });
});
