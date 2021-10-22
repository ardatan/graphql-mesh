import copyToClipboard from 'copy-to-clipboard';
import { GraphQLSchema, parse } from 'graphql';
import GraphiQL, { Fetcher, FetcherReturnType } from 'graphiql';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [query, setQuery] = useState<string | undefined>(defaultQuery);

  const executor$ = useMemo(
    () =>
      urlLoader.getExecutorAsync(endpoint, {
        specifiedByUrl: true,
        directiveIsRepeatable: true,
        schemaDescription: true,
        subscriptionsEndpoint: endpoint,
        subscriptionsProtocol: SubscriptionProtocol.SSE,
      }),
    [endpoint]
  );
  const fetcher: Fetcher = useCallback(
    async (params, opts) => {
      const executor = await executor$;
      return executor({
        document: opts?.documentAST || parse(params.query),
        variables: params.variables,
        extensions: { headers: opts?.headers },
        operationName: params.operationName,
      }) as FetcherReturnType;
    },
    [executor$]
  );

  const [schema, setSchema] = useState<GraphQLSchema | undefined>();
  useEffect(() => {
    Promise.resolve().then(async () => {
      const executor = await executor$;
      const schema = await introspectSchema(executor, undefined, {
        specifiedByUrl: true,
        directiveIsRepeatable: true,
        schemaDescription: true,
      });
      setSchema(schema);
    });
  }, [endpoint]);

  const graphiqlRef = React.useRef<GraphiQL | null>(null);

  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  return schema ? (
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
        schema={schema}
        fetcher={fetcher}
        query={query}
        onEditQuery={query => setQuery(query)}
        storage={fakeStorageInstance}
      >
        <GraphiQL.Logo>
          <img src="https://www.graphql-mesh.com/img/mesh-logo.svg" style={{ width: '32px', height: '32px' }} />
        </GraphiQL.Logo>
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
  ) : (
    <progress />
  );
};

export default App;
