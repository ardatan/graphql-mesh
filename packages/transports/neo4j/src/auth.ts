import neo4j, { type AuthToken } from 'neo4j-driver';

/**
 * Neo4j driver authentication for Mesh loaders and the Neo4j transport.
 *
 * Maps to `neo4j-driver` auth tokens (`neo4j.auth.basic`, `.kerberos`, `.bearer`, `.custom`).
 * When omitted, the driver uses an unauthenticated (`scheme: "none"`) token.
 *
 * @example
 * ```ts
 * const auth: Neo4JAuthOpts = {
 *   type: 'basic',
 *   username: 'neo4j',
 *   password: process.env.NEO4J_PASSWORD!,
 * }
 * ```
 */
export type Neo4JAuthOpts = Neo4JBasicAuth | Neo4JKerberosAuth | Neo4JBearerAuth | Neo4JCustomAuth;

/**
 * Username/password auth (`neo4j.auth.basic`).
 *
 * @example
 * ```ts
 * const auth: Neo4JBasicAuth = {
 *   type: 'basic',
 *   username: 'neo4j',
 *   password: 'secret',
 *   realm: 'native',
 * }
 * ```
 */
export interface Neo4JBasicAuth {
  /**
   * Discriminator for basic auth.
   *
   * @example 'basic'
   */
  type: 'basic';
  /**
   * Neo4j user name.
   *
   * @example 'neo4j'
   */
  username: string;
  /**
   * Neo4j user password.
   *
   * @example 'secret'
   */
  password: string;
  /**
   * Optional auth realm (passed through to the driver).
   *
   * @example 'native'
   */
  realm?: string;
}

/**
 * Kerberos ticket auth (`neo4j.auth.kerberos`).
 *
 * @example
 * ```ts
 * const auth: Neo4JKerberosAuth = {
 *   type: 'kerberos',
 *   base64EncodedTicket: process.env.NEO4J_KERBEROS_TICKET!,
 * }
 * ```
 */
export interface Neo4JKerberosAuth {
  /**
   * Discriminator for Kerberos auth.
   *
   * @example 'kerberos'
   */
  type: 'kerberos';
  /**
   * Base64-encoded Kerberos ticket accepted by Neo4j.
   *
   * @example 'YIIE...'
   */
  base64EncodedTicket: string;
}

/**
 * Bearer token auth (`neo4j.auth.bearer`), typically SSO / OIDC.
 *
 * @example
 * ```ts
 * const auth: Neo4JBearerAuth = {
 *   type: 'bearer',
 *   base64EncodedToken: process.env.NEO4J_BEARER_TOKEN!,
 * }
 * ```
 */
export interface Neo4JBearerAuth {
  /**
   * Discriminator for bearer auth.
   *
   * @example 'bearer'
   */
  type: 'bearer';
  /**
   * Base64-encoded bearer token accepted by Neo4j.
   *
   * @example 'eyJhbGciOi...'
   */
  base64EncodedToken: string;
}

/**
 * Custom scheme auth (`neo4j.auth.custom`) for plugins / enterprise schemes.
 *
 * @example
 * ```ts
 * const auth: Neo4JCustomAuth = {
 *   type: 'custom',
 *   principal: 'service-account',
 *   credentials: process.env.NEO4J_CUSTOM_SECRET!,
 *   realm: 'ldap',
 *   scheme: 'ldap',
 *   parameters: { dn: 'cn=mesh,dc=example,dc=com' },
 * }
 * ```
 */
export interface Neo4JCustomAuth {
  /**
   * Discriminator for custom auth.
   *
   * @example 'custom'
   */
  type: 'custom';
  /**
   * Principal (identity) for the custom scheme.
   *
   * @example 'service-account'
   */
  principal: string;
  /**
   * Credentials for the custom scheme.
   *
   * @example 's3cret'
   */
  credentials: string;
  /**
   * Realm for the custom scheme.
   *
   * @example 'ldap'
   */
  realm: string;
  /**
   * Auth scheme name registered with Neo4j.
   *
   * @example 'ldap'
   */
  scheme: string;
  /**
   * Optional scheme-specific parameters forwarded to the driver.
   *
   * @example { dn: 'cn=mesh,dc=example,dc=com' }
   */
  parameters?: any;
}

/**
 * Convert Mesh {@link Neo4JAuthOpts} into a `neo4j-driver` {@link AuthToken}.
 * Missing opts become an unauthenticated token (`scheme: "none"`).
 */
export function getAuthFromOpts(authOpts: Neo4JAuthOpts | null | undefined): AuthToken {
  if (!authOpts) {
    return { scheme: 'none', credentials: '' };
  }
  switch (authOpts.type) {
    case 'basic':
      return neo4j.auth.basic(authOpts.username, authOpts.password, authOpts.realm);
    case 'kerberos':
      return neo4j.auth.kerberos(authOpts.base64EncodedTicket);
    case 'bearer':
      return neo4j.auth.bearer(authOpts.base64EncodedToken);
    case 'custom':
      return neo4j.auth.custom(
        authOpts.principal,
        authOpts.credentials,
        authOpts.realm,
        authOpts.scheme,
        authOpts.parameters,
      );
  }
}
