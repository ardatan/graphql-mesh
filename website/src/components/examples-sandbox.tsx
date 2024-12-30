'use client';

import { useState } from 'react';
import { cn } from '@theguild/components';

export const EXAMPLES = {
  OpenAPI: {
    'JavaScript Wiki': 'openapi-javascript-wiki',
    'Location Weather': 'openapi-location-weather',
    YouTrack: 'openapi-youtrack',
    Stripe: 'openapi-stripe',
    StackExchange: 'openapi-stackexchange',
    'WeatherBit on React App': 'openapi-react-weatherbit',
    'NextJS with Apollo': 'nextjs-apollo-example',
  },
  'JSON Schema': {
    'Fake API': 'json-schema-example',
    'Covid-19 Statistics': 'json-schema-covid',
    'Subscriptions, Webhooks & Live Queries': 'json-schema-subscriptions',
  },
  OData: {
    TripPin: 'odata-trippin',
    'Microsoft Graph': 'odata-microsoft',
  },
  SOAP: {
    'Country Info': 'soap-country-info',
  },
  MySQL: {
    Rfam: 'mysql-rfam',
  },
  SQLite: {
    Chinook: 'sqlite-chinook',
  },
  'Apollo Federation': {
    'Apollo Federation Example': 'federation-example',
  },
  'Apache Thrift': {
    Calculator: 'thrift-calculator',
  },
  gRPC: {
    'Movies Example': 'grpc-example',
  },
  Neo4J: {
    'Movies Example': 'neo4j-example',
  },
};

/**
 * These options won't work if the Sandbox is a DevBox (not Legacy).
 * @see https://codesandbox.io/docs/learn/sandboxes/embedding
 */
const CODESANDBOX_OPTIONS = {
  codemirror: '1',
  hidedevtools: '1',
  hidenavigation: '1',
  view: 'editor',
  module: '%2F.meshrc.yml',
};

const HEIGHT = 720;

export interface ExamplesSandboxProps extends React.HTMLAttributes<HTMLElement> {
  provider: 'CodeSandbox' | 'StackBlitz';
}

export function ExamplesSandbox({ provider, ...rest }: ExamplesSandboxProps) {
  const [exampleDir, setExampleDir] = useState('json-schema-example');

  const repo = 'github/ardatan/graphql-mesh';

  const src =
    provider === 'CodeSandbox'
      ? `https://codesandbox.io/embed/${repo}/tree/master/examples/${exampleDir}?${new URLSearchParams(CODESANDBOX_OPTIONS).toString()}`
      : `https://stackblitz.com/${repo}?embed=1&hidedevtools=1&hideNavigation=1&file=examples%2F${exampleDir}%2F.meshrc.yml`;

  return (
    <div {...rest} className={cn('w-full', rest.className)}>
      <div className="flex items-center justify-center gap-2">
        Choose Live Example:
        <select
          value={exampleDir}
          onChange={e => {
            setExampleDir(e.target.value);
          }}
          className="border rounded-md py-1.5"
        >
          {Object.entries(EXAMPLES).map(([groupName, group]) => (
            <optgroup key={groupName} label={groupName}>
              {Object.entries(group).map(([exampleName, value]) => (
                <option key={exampleName} label={exampleName} value={value}>
                  {exampleName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <iframe
        loading="lazy"
        src={src}
        className="w-full mt-8"
        height={HEIGHT}
        title={exampleDir}
        allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
        sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
        onFocus={e => {
          console.log(document.activeElement);
        }}
      />
    </div>
  );
}
