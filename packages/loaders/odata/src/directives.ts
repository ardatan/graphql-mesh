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
     * `$batch` encoding stored on `@transport(options.odata.batch)`.
     * `json` / `multipart` coalesce eligible sibling `@connect` calls through
     * `POST /$batch`; `none` disables batching. When omitted, batching is off
     * (same runtime path as `'none'`).
     *
     * @default 'none'
     * @example 'json'
     */
    batch?: 'none' | 'json' | 'multipart';
    /**
     * When true, the connect runtime prefers embedded navigation payloads
     * (Accept / `$expand` handling). Emit may still bake a literal `$expand`
     * into some plural-navigation `@connect` mappings even when this is
     * false/omitted.
     *
     * @default false
     */
    expandNavProps?: boolean;
    /**
     * Extra HTTP header names treated as credentials for `$batch` partitioning
     * / outer forward (in addition to built-in auth-like headers).
     *
     * @example ['authorization', 'x-api-key']
     */
    securityHeaderNames?: string[];
  };
}> & { kind: 'connect' };
