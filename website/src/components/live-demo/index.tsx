import { FC, useState } from 'react';
import tw from 'twin.macro';

const EXAMPLES = {
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
};

const LiveDemo: FC<{ className?: string }> = ({ className }) => {
  const [exampleRepo, setExampleRepo] = useState('json-schema-example');
  return (
    <div className={className}>
      Choose Live Example:{' '}
      <select
        value={exampleRepo}
        onChange={e => {
          setExampleRepo(e.target.value);
        }}
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
      <iframe
        loading="lazy"
        src={`https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/${exampleRepo}?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml`}
        css={[tw`w-full h-[500px] rounded pt-8`]}
        title={exampleRepo}
        allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
        sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default LiveDemo;
