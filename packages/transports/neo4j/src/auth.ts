import neo4j, { type AuthToken } from 'neo4j-driver';

export type Neo4JAuthOpts = Neo4JBasicAuth | Neo4JKerberosAuth | Neo4JBearerAuth | Neo4JCustomAuth;

export interface Neo4JBasicAuth {
  type: 'basic';
  username: string;
  password: string;
  realm?: string;
}

export interface Neo4JKerberosAuth {
  type: 'kerberos';
  base64EncodedTicket: string;
}

export interface Neo4JBearerAuth {
  type: 'bearer';
  base64EncodedToken: string;
}

export interface Neo4JCustomAuth {
  type: 'custom';
  principal: string;
  credentials: string;
  realm: string;
  scheme: string;
  parameters?: any;
}

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
