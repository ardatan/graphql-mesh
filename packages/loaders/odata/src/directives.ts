import {
  TransportDirective,
  type TransportDirectiveArgs as SharedTransportDirectiveArgs,
} from '@graphql-mesh/utils';

export { TransportDirective };

/**
 * OData loader `@transport` typing when `options.odata` is present (`kind: "connect"`).
 *
 * @example
 * ```ts
 * const args: TransportDirectiveArgs = {
 *   kind: 'connect',
 *   subgraph: 'trippin',
 *   location: 'https://services.odata.org/TripPinRESTierService/',
 *   options: { odata: { batch: 'json', expandNavProps: true } },
 * };
 * ```
 */
export type TransportDirectiveArgs = SharedTransportDirectiveArgs<{
  /**
   * OData-specific transport options.
   *
   * @example { batch: 'json', expandNavProps: true }
   */
  odata?: {
    /**
     * `$batch` encoding (`none` disables batching).
     *
     * @example 'json'
     */
    batch?: 'none' | 'json' | 'multipart';
    /**
     * Expand navigation properties in Accept / emit.
     *
     * @example true
     */
    expandNavProps?: boolean;
    /**
     * Header names treated as security (stripped from batch clones, etc.).
     *
     * @example ['authorization', 'x-api-key']
     */
    securityHeaderNames?: string[];
  };
}> & { kind: 'connect' };
