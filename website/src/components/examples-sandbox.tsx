'use client';

import { useEffect, useRef, useState } from 'react';
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

export interface ExamplesSandboxProps extends React.HTMLAttributes<HTMLElement> {
  preventStealingFocusWithUnpleasantDelay?: boolean;
}

export function ExamplesSandbox({
  preventStealingFocusWithUnpleasantDelay,
  ...rest
}: ExamplesSandboxProps) {
  const [exampleDir, setExampleDir] = useState('json-schema-example');
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const repo = 'ardatan/graphql-mesh';

  const src = `https://codesandbox.io/embed/github/${repo}/tree/master/examples/${exampleDir}?${new URLSearchParams(CODESANDBOX_OPTIONS).toString()}`;

  return (
    <div {...rest} className={cn('w-full', rest.className)}>
      <div className="flex items-center justify-center gap-2">
        Choose Live Example:
        <select
          value={exampleDir}
          onChange={e => {
            setExampleDir(e.target.value);
          }}
          className="bg-inherit hive-focus w-[200px]"
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
      <div ref={containerRef} className="w-full mt-8 h-[520px] sm:h-[720px] bg-beige-100">
        {isVisible && (
          <iframe
            loading="eager"
            src={src}
            className="w-full h-full"
            title={exampleDir}
            allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
            sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
            style={{ display: 'none' }}
            // This is such a hack. I hate it.
            // The worst part it's that it's dependent on the internet speed to 2s may be too little
            // and we'll allow CodeSandbox to steal the focus and scroll to the iframe
            // or needlessly too long, and we'll have an empty content, what obviously looks very professional.
            onLoad={
              preventStealingFocusWithUnpleasantDelay
                ? e => {
                    const iframe = e.currentTarget;
                    setTimeout(() => {
                      iframe.style.display = 'block';
                    }, 2000);
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
