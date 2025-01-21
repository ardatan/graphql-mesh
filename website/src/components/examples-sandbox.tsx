'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { CaretSlimIcon, cn } from '@theguild/components';

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

export interface ExamplesSandboxProps extends React.HTMLAttributes<HTMLElement> {
  lazy?: boolean;
  border?: boolean;
}

function isValidExampleDir(value: string): boolean {
  return Object.values(EXAMPLES).some(group => Object.values(group).includes(value));
}

export function ExamplesSandbox({ lazy = false, border = false, ...rest }: ExamplesSandboxProps) {
  const [exampleDir, setExampleDir] = useState('json-schema-example');
  const [isVisible, setIsVisible] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (isVisible) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const { basePath } = useRouter();

  const iframeSrc = `${basePath}/codesandbox-iframe.html?example=${encodeURIComponent(exampleDir)}`;

  return (
    <div {...rest} className={cn('w-full', rest.className)}>
      <div className="flex items-center justify-center gap-2">
        Choose Live Example:
        <select
          value={exampleDir}
          onChange={e => {
            const value = e.target.value;
            if (isValidExampleDir(value)) {
              setExampleDir(value);
            }
          }}
          className="bg-inherit hive-focus w-[200px] cursor-pointer px-3 pr-8 p-2 border-beige-400 dark:border-neutral-800 border rounded-lg hover:bg-beige-100 dark:hover:bg-neutral-900 appearance-none"
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
        <div className="w-0">
          <CaretSlimIcon className="size-4 relative pointer-events-none -left-9" />
        </div>
      </div>
      <div
        ref={containerRef}
        // #0D0D0D is CodeSandbox's background color
        className={cn(
          'w-full mt-8 h-[520px] sm:h-[720px] bg-[#0D0D0D] overflow-hidden',
          border && 'rounded-lg border border-beige-400 dark:border-neutral-800',
        )}
      >
        {isVisible && (
          <iframe
            loading={lazy ? 'eager' : 'lazy'}
            src={iframeSrc}
            className="size-full"
            title={exampleDir}
            allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
            sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
