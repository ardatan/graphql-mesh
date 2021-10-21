import copyToClipboard from 'copy-to-clipboard';
import { getOperationAST, GraphQLSchema, parse } from 'graphql';
import GraphiQL, { Fetcher, FetcherResult } from 'graphiql';
import React, { useEffect, useState } from 'react';
import { SubscriptionProtocol, UrlLoader } from '@graphql-tools/url-loader';
import { introspectSchema } from '@graphql-tools/wrap';
import { makeDefaultArg, getDefaultScalarArgValue } from './CustomArgs';
import GraphiQLExplorer from 'graphiql-explorer';
import 'graphiql/graphiql.css';
import './App.css';

let fakeStorageObj = {};
const fakeStorageInstance: Storage = {
  getItem(key) {
    return fakeStorageObj[key];
  },
  setItem(key, val) {
    fakeStorageObj[key] = val;
  },
  clear() {
    fakeStorageObj = {};
  },
  key(i) {
    return Object.keys(fakeStorageObj)[i];
  },
  removeItem(key) {
    delete fakeStorageObj[key];
  },
  get length() {
    return Object.keys(fakeStorageObj).length;
  },
};

const App: React.FC<{ defaultQuery: string; endpoint: string }> = ({ defaultQuery = '', endpoint }) => {
  const urlLoader = new UrlLoader();
  const [fetcher, setFetcher] = useState<Fetcher | null>(null);
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  useEffect(() => {
    urlLoader
      .getExecutorAsync(endpoint, {
        specifiedByUrl: true,
        directiveIsRepeatable: true,
        schemaDescription: true,
        subscriptionsEndpoint: endpoint,
        subscriptionsProtocol: SubscriptionProtocol.SSE,
      })
      .then(executor => {
        introspectSchema(
          executor,
          {},
          {
            specifiedByUrl: true,
            directiveIsRepeatable: true,
            schemaDescription: true,
          }
        ).then(schema => setSchema(schema));
        setFetcher(() => ({ query, operationName }, opts) => {
          const document = parse(query);
          return executor({
            document,
            variables: JSON.parse(variables),
            extensions: opts,
            operationName,
          }) as FetcherResult;
        });
      });
  }, []);

  const [operationName, setOperationName] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState<string | undefined>(defaultQuery);
  const [variables, setVariables] = useState('{}');
  const [headers, setHeaders] = useState('{}');

  const graphiqlRef = React.useRef<GraphiQL | null>(null);

  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  return (
    schema &&
    fetcher && (
      <div className="graphiql-container">
        <GraphiQLExplorer
          schema={schema}
          query={query}
          onEdit={query => setQuery(query)}
          onRunOperation={operationName => graphiqlRef.current?.handleRunQuery(operationName)}
          explorerIsOpen={isExplorerOpen}
          onToggleExplorer={() => setIsExplorerOpen(!isExplorerOpen)}
          getDefaultScalarArgValue={getDefaultScalarArgValue}
          makeDefaultArg={makeDefaultArg}
        />
        <GraphiQL
          ref={graphiqlRef}
          headerEditorEnabled={true}
          defaultVariableEditorOpen={false}
          docExplorerOpen={false}
          fetcher={fetcher}
          query={query}
          onEditQuery={query => setQuery(query)}
          variables={variables}
          onEditVariables={variables => setVariables(variables)}
          operationName={operationName}
          onEditOperationName={operationName => setOperationName(operationName)}
          headers={headers}
          onEditHeaders={headers => setHeaders(headers)}
          storage={fakeStorageInstance}
        >
          <GraphiQL.Logo>GraphQL Mesh</GraphiQL.Logo>
          <GraphiQL.Toolbar>
            <GraphiQL.Button
              onClick={() => graphiqlRef.current?.handlePrettifyQuery()}
              label="Prettify"
              title="Prettify Query (Shift-Ctrl-P)"
            />
            <GraphiQL.Button
              onClick={() => graphiqlRef.current?.handleToggleHistory()}
              label="History"
              title="Show History"
            />
            <GraphiQL.Button
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              label="Explorer"
              title="Toggle Explorer"
            />
            <GraphiQL.Button onClick={() => copyToClipboard(query!)} label="Copy Operation" title="Copy Operation" />
          </GraphiQL.Toolbar>
        </GraphiQL>
      </div>
    )
  );
};

export default App;
