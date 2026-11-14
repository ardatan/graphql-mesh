import {
  TransportDirective,
  type TransportDirectiveArgs as SharedTransportDirectiveArgs,
} from '@graphql-mesh/utils';

export { TransportDirective };

/** OData loader `@transport` typing when `options.odata` is present. */
export type TransportDirectiveArgs = SharedTransportDirectiveArgs<{
  odata?: {
    batch?: 'none' | 'json' | 'multipart';
    expandNavProps?: boolean;
  };
}> & { kind: 'rest' };
