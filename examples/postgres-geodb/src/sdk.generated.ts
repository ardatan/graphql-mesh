import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  GeoCursor: any;
  GeoBigFloat: any;
  GithubDateTime: any;
  GithubURI: any;
  GithubHTML: any;
  GithubGitObjectID: any;
  GithubPreciseDateTime: any;
  GithubX509Certificate: any;
  GithubGitTimestamp: any;
  GithubGitSSHRemote: any;
  GithubDate: any;
};


/** A connection to a list of `City` values. */
export type GeoCitiesConnection = {
   __typename?: 'GeoCitiesConnection';
  /** A list of `City` objects. */
  nodes: Array<Maybe<GeoCity>>;
  /** A list of edges which contains the `City` and cursor to aid in pagination. */
  edges: Array<GeoCitiesEdge>;
  /** Information to aid in pagination. */
  pageInfo: GeoPageInfo;
  /** The count of *all* `City` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `City` edge in the connection. */
export type GeoCitiesEdge = {
   __typename?: 'GeoCitiesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['GeoCursor']>;
  /** The `City` at the end of the edge. */
  node?: Maybe<GeoCity>;
};

/** Methods to use when ordering `City`. */
export enum GeoCitiesOrderBy {
  Natural = '[object Object]',
  IdAsc = '[object Object]',
  IdDesc = '[object Object]',
  NameAsc = '[object Object]',
  NameDesc = '[object Object]',
  CountrycodeAsc = '[object Object]',
  CountrycodeDesc = '[object Object]',
  DistrictAsc = '[object Object]',
  DistrictDesc = '[object Object]',
  PopulationAsc = '[object Object]',
  PopulationDesc = '[object Object]',
  PrimaryKeyAsc = '[object Object]',
  PrimaryKeyDesc = '[object Object]'
}

export type GeoCity = GeoNode & {
   __typename?: 'GeoCity';
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  id: Scalars['Int'];
  name: Scalars['String'];
  countrycode: Scalars['String'];
  district: Scalars['String'];
  population: Scalars['Int'];
  /** Reads and enables pagination through a set of `Country`. */
  countriesByCapital: GeoCountriesConnection;
  developers: GithubSearchResultItemConnection;
};


export type GeoCityCountriesByCapitalArgs = {
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['GeoCursor']>;
  after?: Maybe<Scalars['GeoCursor']>;
  orderBy?: Maybe<Array<GeoCountriesOrderBy>>;
  condition?: Maybe<GeoCountryCondition>;
};


export type GeoCityDevelopersArgs = {
  limit?: Maybe<Scalars['Int']>;
};

/** A condition to be used against `City` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type GeoCityCondition = {
  /** Checks for equality with the object’s `id` field. */
  id?: Maybe<Scalars['Int']>;
  /** Checks for equality with the object’s `name` field. */
  name?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `countrycode` field. */
  countrycode?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `district` field. */
  district?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `population` field. */
  population?: Maybe<Scalars['Int']>;
};

/** An input for mutations affecting `City` */
export type GeoCityInput = {
  id: Scalars['Int'];
  name: Scalars['String'];
  countrycode: Scalars['String'];
  district: Scalars['String'];
  population: Scalars['Int'];
};

/** Represents an update to a `City`. Fields that are set will be updated. */
export type GeoCityPatch = {
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  countrycode?: Maybe<Scalars['String']>;
  district?: Maybe<Scalars['String']>;
  population?: Maybe<Scalars['Int']>;
};

/** A connection to a list of `Country` values. */
export type GeoCountriesConnection = {
   __typename?: 'GeoCountriesConnection';
  /** A list of `Country` objects. */
  nodes: Array<Maybe<GeoCountry>>;
  /** A list of edges which contains the `Country` and cursor to aid in pagination. */
  edges: Array<GeoCountriesEdge>;
  /** Information to aid in pagination. */
  pageInfo: GeoPageInfo;
  /** The count of *all* `Country` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `Country` edge in the connection. */
export type GeoCountriesEdge = {
   __typename?: 'GeoCountriesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['GeoCursor']>;
  /** The `Country` at the end of the edge. */
  node?: Maybe<GeoCountry>;
};

/** Methods to use when ordering `Country`. */
export enum GeoCountriesOrderBy {
  Natural = '[object Object]',
  CodeAsc = '[object Object]',
  CodeDesc = '[object Object]',
  NameAsc = '[object Object]',
  NameDesc = '[object Object]',
  ContinentAsc = '[object Object]',
  ContinentDesc = '[object Object]',
  RegionAsc = '[object Object]',
  RegionDesc = '[object Object]',
  SurfaceareaAsc = '[object Object]',
  SurfaceareaDesc = '[object Object]',
  IndepyearAsc = '[object Object]',
  IndepyearDesc = '[object Object]',
  PopulationAsc = '[object Object]',
  PopulationDesc = '[object Object]',
  LifeexpectancyAsc = '[object Object]',
  LifeexpectancyDesc = '[object Object]',
  GnpAsc = '[object Object]',
  GnpDesc = '[object Object]',
  GnpoldAsc = '[object Object]',
  GnpoldDesc = '[object Object]',
  LocalnameAsc = '[object Object]',
  LocalnameDesc = '[object Object]',
  GovernmentformAsc = '[object Object]',
  GovernmentformDesc = '[object Object]',
  HeadofstateAsc = '[object Object]',
  HeadofstateDesc = '[object Object]',
  CapitalAsc = '[object Object]',
  CapitalDesc = '[object Object]',
  Code2Asc = '[object Object]',
  Code2Desc = '[object Object]',
  PrimaryKeyAsc = '[object Object]',
  PrimaryKeyDesc = '[object Object]'
}

export type GeoCountry = GeoNode & {
   __typename?: 'GeoCountry';
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  code: Scalars['String'];
  name: Scalars['String'];
  continent: Scalars['String'];
  region: Scalars['String'];
  surfacearea: Scalars['Float'];
  indepyear?: Maybe<Scalars['Int']>;
  population: Scalars['Int'];
  lifeexpectancy?: Maybe<Scalars['Float']>;
  gnp?: Maybe<Scalars['GeoBigFloat']>;
  gnpold?: Maybe<Scalars['GeoBigFloat']>;
  localname: Scalars['String'];
  governmentform: Scalars['String'];
  headofstate?: Maybe<Scalars['String']>;
  capital?: Maybe<Scalars['Int']>;
  code2: Scalars['String'];
  /** Reads a single `City` that is related to this `Country`. */
  cityByCapital?: Maybe<GeoCity>;
  /** Reads and enables pagination through a set of `Countrylanguage`. */
  countrylanguagesByCountrycode: GeoCountrylanguagesConnection;
};


export type GeoCountryCountrylanguagesByCountrycodeArgs = {
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['GeoCursor']>;
  after?: Maybe<Scalars['GeoCursor']>;
  orderBy?: Maybe<Array<GeoCountrylanguagesOrderBy>>;
  condition?: Maybe<GeoCountrylanguageCondition>;
};

/** A condition to be used against `Country` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type GeoCountryCondition = {
  /** Checks for equality with the object’s `code` field. */
  code?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `name` field. */
  name?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `continent` field. */
  continent?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `region` field. */
  region?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `surfacearea` field. */
  surfacearea?: Maybe<Scalars['Float']>;
  /** Checks for equality with the object’s `indepyear` field. */
  indepyear?: Maybe<Scalars['Int']>;
  /** Checks for equality with the object’s `population` field. */
  population?: Maybe<Scalars['Int']>;
  /** Checks for equality with the object’s `lifeexpectancy` field. */
  lifeexpectancy?: Maybe<Scalars['Float']>;
  /** Checks for equality with the object’s `gnp` field. */
  gnp?: Maybe<Scalars['GeoBigFloat']>;
  /** Checks for equality with the object’s `gnpold` field. */
  gnpold?: Maybe<Scalars['GeoBigFloat']>;
  /** Checks for equality with the object’s `localname` field. */
  localname?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `governmentform` field. */
  governmentform?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `headofstate` field. */
  headofstate?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `capital` field. */
  capital?: Maybe<Scalars['Int']>;
  /** Checks for equality with the object’s `code2` field. */
  code2?: Maybe<Scalars['String']>;
};

/** An input for mutations affecting `Country` */
export type GeoCountryInput = {
  code: Scalars['String'];
  name: Scalars['String'];
  continent: Scalars['String'];
  region: Scalars['String'];
  surfacearea: Scalars['Float'];
  indepyear?: Maybe<Scalars['Int']>;
  population: Scalars['Int'];
  lifeexpectancy?: Maybe<Scalars['Float']>;
  gnp?: Maybe<Scalars['GeoBigFloat']>;
  gnpold?: Maybe<Scalars['GeoBigFloat']>;
  localname: Scalars['String'];
  governmentform: Scalars['String'];
  headofstate?: Maybe<Scalars['String']>;
  capital?: Maybe<Scalars['Int']>;
  code2: Scalars['String'];
};

export type GeoCountrylanguage = GeoNode & {
   __typename?: 'GeoCountrylanguage';
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  countrycode: Scalars['String'];
  language: Scalars['String'];
  isofficial: Scalars['Boolean'];
  percentage: Scalars['Float'];
  /** Reads a single `Country` that is related to this `Countrylanguage`. */
  countryByCountrycode?: Maybe<GeoCountry>;
};

/**
 * A condition to be used against `Countrylanguage` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type GeoCountrylanguageCondition = {
  /** Checks for equality with the object’s `countrycode` field. */
  countrycode?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `language` field. */
  language?: Maybe<Scalars['String']>;
  /** Checks for equality with the object’s `isofficial` field. */
  isofficial?: Maybe<Scalars['Boolean']>;
  /** Checks for equality with the object’s `percentage` field. */
  percentage?: Maybe<Scalars['Float']>;
};

/** An input for mutations affecting `Countrylanguage` */
export type GeoCountrylanguageInput = {
  countrycode: Scalars['String'];
  language: Scalars['String'];
  isofficial: Scalars['Boolean'];
  percentage: Scalars['Float'];
};

/** Represents an update to a `Countrylanguage`. Fields that are set will be updated. */
export type GeoCountrylanguagePatch = {
  countrycode?: Maybe<Scalars['String']>;
  language?: Maybe<Scalars['String']>;
  isofficial?: Maybe<Scalars['Boolean']>;
  percentage?: Maybe<Scalars['Float']>;
};

/** A connection to a list of `Countrylanguage` values. */
export type GeoCountrylanguagesConnection = {
   __typename?: 'GeoCountrylanguagesConnection';
  /** A list of `Countrylanguage` objects. */
  nodes: Array<Maybe<GeoCountrylanguage>>;
  /** A list of edges which contains the `Countrylanguage` and cursor to aid in pagination. */
  edges: Array<GeoCountrylanguagesEdge>;
  /** Information to aid in pagination. */
  pageInfo: GeoPageInfo;
  /** The count of *all* `Countrylanguage` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `Countrylanguage` edge in the connection. */
export type GeoCountrylanguagesEdge = {
   __typename?: 'GeoCountrylanguagesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['GeoCursor']>;
  /** The `Countrylanguage` at the end of the edge. */
  node?: Maybe<GeoCountrylanguage>;
};

/** Methods to use when ordering `Countrylanguage`. */
export enum GeoCountrylanguagesOrderBy {
  Natural = '[object Object]',
  CountrycodeAsc = '[object Object]',
  CountrycodeDesc = '[object Object]',
  LanguageAsc = '[object Object]',
  LanguageDesc = '[object Object]',
  IsofficialAsc = '[object Object]',
  IsofficialDesc = '[object Object]',
  PercentageAsc = '[object Object]',
  PercentageDesc = '[object Object]',
  PrimaryKeyAsc = '[object Object]',
  PrimaryKeyDesc = '[object Object]'
}

/** Represents an update to a `Country`. Fields that are set will be updated. */
export type GeoCountryPatch = {
  code?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  continent?: Maybe<Scalars['String']>;
  region?: Maybe<Scalars['String']>;
  surfacearea?: Maybe<Scalars['Float']>;
  indepyear?: Maybe<Scalars['Int']>;
  population?: Maybe<Scalars['Int']>;
  lifeexpectancy?: Maybe<Scalars['Float']>;
  gnp?: Maybe<Scalars['GeoBigFloat']>;
  gnpold?: Maybe<Scalars['GeoBigFloat']>;
  localname?: Maybe<Scalars['String']>;
  governmentform?: Maybe<Scalars['String']>;
  headofstate?: Maybe<Scalars['String']>;
  capital?: Maybe<Scalars['Int']>;
  code2?: Maybe<Scalars['String']>;
};

/** All input for the create `City` mutation. */
export type GeoCreateCityInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `City` to be created by this mutation. */
  city: GeoCityInput;
};

/** The output of our create `City` mutation. */
export type GeoCreateCityPayload = {
   __typename?: 'GeoCreateCityPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `City` that was created by this mutation. */
  city?: Maybe<GeoCity>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** An edge for our `City`. May be used by Relay 1. */
  cityEdge?: Maybe<GeoCitiesEdge>;
};


/** The output of our create `City` mutation. */
export type GeoCreateCityPayloadCityEdgeArgs = {
  orderBy?: Maybe<Array<GeoCitiesOrderBy>>;
};

/** All input for the create `Country` mutation. */
export type GeoCreateCountryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Country` to be created by this mutation. */
  country: GeoCountryInput;
};

/** All input for the create `Countrylanguage` mutation. */
export type GeoCreateCountrylanguageInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Countrylanguage` to be created by this mutation. */
  countrylanguage: GeoCountrylanguageInput;
};

/** The output of our create `Countrylanguage` mutation. */
export type GeoCreateCountrylanguagePayload = {
   __typename?: 'GeoCreateCountrylanguagePayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Countrylanguage` that was created by this mutation. */
  countrylanguage?: Maybe<GeoCountrylanguage>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Country` that is related to this `Countrylanguage`. */
  countryByCountrycode?: Maybe<GeoCountry>;
  /** An edge for our `Countrylanguage`. May be used by Relay 1. */
  countrylanguageEdge?: Maybe<GeoCountrylanguagesEdge>;
};


/** The output of our create `Countrylanguage` mutation. */
export type GeoCreateCountrylanguagePayloadCountrylanguageEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountrylanguagesOrderBy>>;
};

/** The output of our create `Country` mutation. */
export type GeoCreateCountryPayload = {
   __typename?: 'GeoCreateCountryPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Country` that was created by this mutation. */
  country?: Maybe<GeoCountry>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `City` that is related to this `Country`. */
  cityByCapital?: Maybe<GeoCity>;
  /** An edge for our `Country`. May be used by Relay 1. */
  countryEdge?: Maybe<GeoCountriesEdge>;
};


/** The output of our create `Country` mutation. */
export type GeoCreateCountryPayloadCountryEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountriesOrderBy>>;
};


/** All input for the `deleteCityById` mutation. */
export type GeoDeleteCityByIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  id: Scalars['Int'];
};

/** All input for the `deleteCity` mutation. */
export type GeoDeleteCityInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `City` to be deleted. */
  nodeId: Scalars['ID'];
};

/** The output of our delete `City` mutation. */
export type GeoDeleteCityPayload = {
   __typename?: 'GeoDeleteCityPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `City` that was deleted by this mutation. */
  city?: Maybe<GeoCity>;
  deletedCityId?: Maybe<Scalars['ID']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** An edge for our `City`. May be used by Relay 1. */
  cityEdge?: Maybe<GeoCitiesEdge>;
};


/** The output of our delete `City` mutation. */
export type GeoDeleteCityPayloadCityEdgeArgs = {
  orderBy?: Maybe<Array<GeoCitiesOrderBy>>;
};

/** All input for the `deleteCountryByCode` mutation. */
export type GeoDeleteCountryByCodeInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  code: Scalars['String'];
};

/** All input for the `deleteCountry` mutation. */
export type GeoDeleteCountryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `Country` to be deleted. */
  nodeId: Scalars['ID'];
};

/** All input for the `deleteCountrylanguageByCountrycodeAndLanguage` mutation. */
export type GeoDeleteCountrylanguageByCountrycodeAndLanguageInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  countrycode: Scalars['String'];
  language: Scalars['String'];
};

/** All input for the `deleteCountrylanguage` mutation. */
export type GeoDeleteCountrylanguageInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `Countrylanguage` to be deleted. */
  nodeId: Scalars['ID'];
};

/** The output of our delete `Countrylanguage` mutation. */
export type GeoDeleteCountrylanguagePayload = {
   __typename?: 'GeoDeleteCountrylanguagePayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Countrylanguage` that was deleted by this mutation. */
  countrylanguage?: Maybe<GeoCountrylanguage>;
  deletedCountrylanguageId?: Maybe<Scalars['ID']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Country` that is related to this `Countrylanguage`. */
  countryByCountrycode?: Maybe<GeoCountry>;
  /** An edge for our `Countrylanguage`. May be used by Relay 1. */
  countrylanguageEdge?: Maybe<GeoCountrylanguagesEdge>;
};


/** The output of our delete `Countrylanguage` mutation. */
export type GeoDeleteCountrylanguagePayloadCountrylanguageEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountrylanguagesOrderBy>>;
};

/** The output of our delete `Country` mutation. */
export type GeoDeleteCountryPayload = {
   __typename?: 'GeoDeleteCountryPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Country` that was deleted by this mutation. */
  country?: Maybe<GeoCountry>;
  deletedCountryId?: Maybe<Scalars['ID']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `City` that is related to this `Country`. */
  cityByCapital?: Maybe<GeoCity>;
  /** An edge for our `Country`. May be used by Relay 1. */
  countryEdge?: Maybe<GeoCountriesEdge>;
};


/** The output of our delete `Country` mutation. */
export type GeoDeleteCountryPayloadCountryEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountriesOrderBy>>;
};

/** An object with a globally unique `ID`. */
export type GeoNode = {
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
};

/** Information about pagination in a connection. */
export type GeoPageInfo = {
   __typename?: 'GeoPageInfo';
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['GeoCursor']>;
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['GeoCursor']>;
};

/** All input for the `updateCityById` mutation. */
export type GeoUpdateCityByIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** An object where the defined keys will be set on the `City` being updated. */
  cityPatch: GeoCityPatch;
  id: Scalars['Int'];
};

/** All input for the `updateCity` mutation. */
export type GeoUpdateCityInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `City` to be updated. */
  nodeId: Scalars['ID'];
  /** An object where the defined keys will be set on the `City` being updated. */
  cityPatch: GeoCityPatch;
};

/** The output of our update `City` mutation. */
export type GeoUpdateCityPayload = {
   __typename?: 'GeoUpdateCityPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `City` that was updated by this mutation. */
  city?: Maybe<GeoCity>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** An edge for our `City`. May be used by Relay 1. */
  cityEdge?: Maybe<GeoCitiesEdge>;
};


/** The output of our update `City` mutation. */
export type GeoUpdateCityPayloadCityEdgeArgs = {
  orderBy?: Maybe<Array<GeoCitiesOrderBy>>;
};

/** All input for the `updateCountryByCode` mutation. */
export type GeoUpdateCountryByCodeInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** An object where the defined keys will be set on the `Country` being updated. */
  countryPatch: GeoCountryPatch;
  code: Scalars['String'];
};

/** All input for the `updateCountry` mutation. */
export type GeoUpdateCountryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `Country` to be updated. */
  nodeId: Scalars['ID'];
  /** An object where the defined keys will be set on the `Country` being updated. */
  countryPatch: GeoCountryPatch;
};

/** All input for the `updateCountrylanguageByCountrycodeAndLanguage` mutation. */
export type GeoUpdateCountrylanguageByCountrycodeAndLanguageInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** An object where the defined keys will be set on the `Countrylanguage` being updated. */
  countrylanguagePatch: GeoCountrylanguagePatch;
  countrycode: Scalars['String'];
  language: Scalars['String'];
};

/** All input for the `updateCountrylanguage` mutation. */
export type GeoUpdateCountrylanguageInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The globally unique `ID` which will identify a single `Countrylanguage` to be updated. */
  nodeId: Scalars['ID'];
  /** An object where the defined keys will be set on the `Countrylanguage` being updated. */
  countrylanguagePatch: GeoCountrylanguagePatch;
};

/** The output of our update `Countrylanguage` mutation. */
export type GeoUpdateCountrylanguagePayload = {
   __typename?: 'GeoUpdateCountrylanguagePayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Countrylanguage` that was updated by this mutation. */
  countrylanguage?: Maybe<GeoCountrylanguage>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Country` that is related to this `Countrylanguage`. */
  countryByCountrycode?: Maybe<GeoCountry>;
  /** An edge for our `Countrylanguage`. May be used by Relay 1. */
  countrylanguageEdge?: Maybe<GeoCountrylanguagesEdge>;
};


/** The output of our update `Countrylanguage` mutation. */
export type GeoUpdateCountrylanguagePayloadCountrylanguageEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountrylanguagesOrderBy>>;
};

/** The output of our update `Country` mutation. */
export type GeoUpdateCountryPayload = {
   __typename?: 'GeoUpdateCountryPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The `Country` that was updated by this mutation. */
  country?: Maybe<GeoCountry>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `City` that is related to this `Country`. */
  cityByCapital?: Maybe<GeoCity>;
  /** An edge for our `Country`. May be used by Relay 1. */
  countryEdge?: Maybe<GeoCountriesEdge>;
};


/** The output of our update `Country` mutation. */
export type GeoUpdateCountryPayloadCountryEdgeArgs = {
  orderBy?: Maybe<Array<GeoCountriesOrderBy>>;
};

/** Autogenerated input type of AcceptEnterpriseAdministratorInvitation */
export type GithubAcceptEnterpriseAdministratorInvitationInput = {
  /** The id of the invitation being accepted */
  invitationId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AcceptEnterpriseAdministratorInvitation */
export type GithubAcceptEnterpriseAdministratorInvitationPayload = {
   __typename?: 'GithubAcceptEnterpriseAdministratorInvitationPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The invitation that was accepted. */
  invitation?: Maybe<GithubEnterpriseAdministratorInvitation>;
  /** A message confirming the result of accepting an administrator invitation. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of AcceptTopicSuggestion */
export type GithubAcceptTopicSuggestionInput = {
  /** The Node ID of the repository. */
  repositoryId: Scalars['ID'];
  /** The name of the suggested topic. */
  name: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AcceptTopicSuggestion */
export type GithubAcceptTopicSuggestionPayload = {
   __typename?: 'GithubAcceptTopicSuggestionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The accepted topic. */
  topic?: Maybe<GithubTopic>;
};

/** The possible capabilities for action executions setting. */
export enum GithubActionExecutionCapabilitySetting {
  /** All action executions are disabled. */
  Disabled = 'DISABLED',
  /** All action executions are enabled. */
  AllActions = 'ALL_ACTIONS',
  /** Only actions defined within the repo are allowed. */
  LocalActionsOnly = 'LOCAL_ACTIONS_ONLY',
  /** Organization administrators action execution capabilities. */
  NoPolicy = 'NO_POLICY'
}

/** Represents an object which can take actions on GitHub. Typically a User or Bot. */
export type GithubActor = {
  /** A URL pointing to the actor's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** The username of the actor. */
  login: Scalars['String'];
  /** The HTTP path for this actor. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this actor. */
  url: Scalars['GithubURI'];
};


/** Represents an object which can take actions on GitHub. Typically a User or Bot. */
export type GithubActorAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** Location information for an actor */
export type GithubActorLocation = {
   __typename?: 'GithubActorLocation';
  /** City */
  city?: Maybe<Scalars['String']>;
  /** Country name */
  country?: Maybe<Scalars['String']>;
  /** Country code */
  countryCode?: Maybe<Scalars['String']>;
  /** Region name */
  region?: Maybe<Scalars['String']>;
  /** Region or state code */
  regionCode?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of AddAssigneesToAssignable */
export type GithubAddAssigneesToAssignableInput = {
  /** The id of the assignable object to add assignees to. */
  assignableId: Scalars['ID'];
  /** The id of users to add as assignees. */
  assigneeIds: Array<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddAssigneesToAssignable */
export type GithubAddAssigneesToAssignablePayload = {
   __typename?: 'GithubAddAssigneesToAssignablePayload';
  /** The item that was assigned. */
  assignable?: Maybe<GithubAssignable>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of AddComment */
export type GithubAddCommentInput = {
  /** The Node ID of the subject to modify. */
  subjectId: Scalars['ID'];
  /** The contents of the comment. */
  body: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddComment */
export type GithubAddCommentPayload = {
   __typename?: 'GithubAddCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The edge from the subject's comment connection. */
  commentEdge?: Maybe<GithubIssueCommentEdge>;
  /** The subject */
  subject?: Maybe<GithubNode>;
  /** The edge from the subject's timeline connection. */
  timelineEdge?: Maybe<GithubIssueTimelineItemEdge>;
};

/** Represents a 'added_to_project' event on a given issue or pull request. */
export type GithubAddedToProjectEvent = GithubNode & {
   __typename?: 'GithubAddedToProjectEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Autogenerated input type of AddLabelsToLabelable */
export type GithubAddLabelsToLabelableInput = {
  /** The id of the labelable object to add labels to. */
  labelableId: Scalars['ID'];
  /** The ids of the labels to add. */
  labelIds: Array<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddLabelsToLabelable */
export type GithubAddLabelsToLabelablePayload = {
   __typename?: 'GithubAddLabelsToLabelablePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The item that was labeled. */
  labelable?: Maybe<GithubLabelable>;
};

/** Autogenerated input type of AddProjectCard */
export type GithubAddProjectCardInput = {
  /** The Node ID of the ProjectColumn. */
  projectColumnId: Scalars['ID'];
  /** The content of the card. Must be a member of the ProjectCardItem union */
  contentId?: Maybe<Scalars['ID']>;
  /** The note on the card. */
  note?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddProjectCard */
export type GithubAddProjectCardPayload = {
   __typename?: 'GithubAddProjectCardPayload';
  /** The edge from the ProjectColumn's card connection. */
  cardEdge?: Maybe<GithubProjectCardEdge>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The ProjectColumn */
  projectColumn?: Maybe<GithubProjectColumn>;
};

/** Autogenerated input type of AddProjectColumn */
export type GithubAddProjectColumnInput = {
  /** The Node ID of the project. */
  projectId: Scalars['ID'];
  /** The name of the column. */
  name: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddProjectColumn */
export type GithubAddProjectColumnPayload = {
   __typename?: 'GithubAddProjectColumnPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The edge from the project's column connection. */
  columnEdge?: Maybe<GithubProjectColumnEdge>;
  /** The project */
  project?: Maybe<GithubProject>;
};

/** Autogenerated input type of AddPullRequestReviewComment */
export type GithubAddPullRequestReviewCommentInput = {
  /** The node ID of the pull request reviewing */
  pullRequestId?: Maybe<Scalars['ID']>;
  /** The Node ID of the review to modify. */
  pullRequestReviewId?: Maybe<Scalars['ID']>;
  /** The SHA of the commit to comment on. */
  commitOID?: Maybe<Scalars['GithubGitObjectID']>;
  /** The text of the comment. */
  body: Scalars['String'];
  /** The relative path of the file to comment on. */
  path?: Maybe<Scalars['String']>;
  /** The line index in the diff to comment on. */
  position?: Maybe<Scalars['Int']>;
  /** The comment id to reply to. */
  inReplyTo?: Maybe<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddPullRequestReviewComment */
export type GithubAddPullRequestReviewCommentPayload = {
   __typename?: 'GithubAddPullRequestReviewCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The newly created comment. */
  comment?: Maybe<GithubPullRequestReviewComment>;
  /** The edge from the review's comment connection. */
  commentEdge?: Maybe<GithubPullRequestReviewCommentEdge>;
};

/** Autogenerated input type of AddPullRequestReview */
export type GithubAddPullRequestReviewInput = {
  /** The Node ID of the pull request to modify. */
  pullRequestId: Scalars['ID'];
  /** The commit OID the review pertains to. */
  commitOID?: Maybe<Scalars['GithubGitObjectID']>;
  /** The contents of the review body comment. */
  body?: Maybe<Scalars['String']>;
  /** The event to perform on the pull request review. */
  event?: Maybe<GithubPullRequestReviewEvent>;
  /** The review line comments. */
  comments?: Maybe<Array<Maybe<GithubDraftPullRequestReviewComment>>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddPullRequestReview */
export type GithubAddPullRequestReviewPayload = {
   __typename?: 'GithubAddPullRequestReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The newly created pull request review. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
  /** The edge from the pull request's review connection. */
  reviewEdge?: Maybe<GithubPullRequestReviewEdge>;
};

/** Autogenerated input type of AddReaction */
export type GithubAddReactionInput = {
  /** The Node ID of the subject to modify. */
  subjectId: Scalars['ID'];
  /** The name of the emoji to react with. */
  content: GithubReactionContent;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddReaction */
export type GithubAddReactionPayload = {
   __typename?: 'GithubAddReactionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The reaction object. */
  reaction?: Maybe<GithubReaction>;
  /** The reactable subject. */
  subject?: Maybe<GithubReactable>;
};

/** Autogenerated input type of AddStar */
export type GithubAddStarInput = {
  /** The Starrable ID to star. */
  starrableId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of AddStar */
export type GithubAddStarPayload = {
   __typename?: 'GithubAddStarPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The starrable. */
  starrable?: Maybe<GithubStarrable>;
};

/** A GitHub App. */
export type GithubApp = GithubNode & {
   __typename?: 'GithubApp';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The description of the app. */
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The hex color code, without the leading '#', for the logo background. */
  logoBackgroundColor: Scalars['String'];
  /** A URL pointing to the app's logo. */
  logoUrl: Scalars['GithubURI'];
  /** The name of the app. */
  name: Scalars['String'];
  /** A slug based on the name of the app for use in URLs. */
  slug: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The URL to the app's homepage. */
  url: Scalars['GithubURI'];
};


/** A GitHub App. */
export type GithubAppLogoUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** Autogenerated input type of ArchiveRepository */
export type GithubArchiveRepositoryInput = {
  /** The ID of the repository to mark as archived. */
  repositoryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ArchiveRepository */
export type GithubArchiveRepositoryPayload = {
   __typename?: 'GithubArchiveRepositoryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The repository that was marked as archived. */
  repository?: Maybe<GithubRepository>;
};

/** An object that can have users assigned to it. */
export type GithubAssignable = {
  /** A list of Users assigned to this object. */
  assignees: GithubUserConnection;
};


/** An object that can have users assigned to it. */
export type GithubAssignableAssigneesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Represents an 'assigned' event on any assignable object. */
export type GithubAssignedEvent = GithubNode & {
   __typename?: 'GithubAssignedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the assignable associated with the event. */
  assignable: GithubAssignable;
  /** Identifies the user or mannequin that was assigned. */
  assignee?: Maybe<GithubAssignee>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /**
   * Identifies the user who was assigned.
   * @deprecated Assignees can now be mannequins. Use the `assignee` field instead. Removal on 2020-01-01 UTC.
   */
  user?: Maybe<GithubUser>;
};

/** Types that can be assigned to issues. */
export type GithubAssignee = GithubBot | GithubMannequin | GithubOrganization | GithubUser;

/** An entry in the audit log. */
export type GithubAuditEntry = {
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Types that can initiate an audit log event. */
export type GithubAuditEntryActor = GithubBot | GithubOrganization | GithubUser;

/** Ordering options for Audit Log connections. */
export type GithubAuditLogOrder = {
  /** The field to order Audit Logs by. */
  field?: Maybe<GithubAuditLogOrderField>;
  /** The ordering direction. */
  direction?: Maybe<GithubOrderDirection>;
};

/** Properties by which Audit Log connections can be ordered. */
export enum GithubAuditLogOrderField {
  /** Order audit log entries by timestamp */
  CreatedAt = 'CREATED_AT'
}

/** Represents a 'base_ref_changed' event on a given issue or pull request. */
export type GithubBaseRefChangedEvent = GithubNode & {
   __typename?: 'GithubBaseRefChangedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Represents a 'base_ref_force_pushed' event on a given pull request. */
export type GithubBaseRefForcePushedEvent = GithubNode & {
   __typename?: 'GithubBaseRefForcePushedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the after commit SHA for the 'base_ref_force_pushed' event. */
  afterCommit?: Maybe<GithubCommit>;
  /** Identifies the before commit SHA for the 'base_ref_force_pushed' event. */
  beforeCommit?: Maybe<GithubCommit>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** Identifies the fully qualified ref name for the 'base_ref_force_pushed' event. */
  ref?: Maybe<GithubRef>;
};

/** Represents a Git blame. */
export type GithubBlame = {
   __typename?: 'GithubBlame';
  /** The list of ranges from a Git blame. */
  ranges: Array<GithubBlameRange>;
};

/** Represents a range of information from a Git blame. */
export type GithubBlameRange = {
   __typename?: 'GithubBlameRange';
  /**
   * Identifies the recency of the change, from 1 (new) to 10 (old). This is
   * calculated as a 2-quantile and determines the length of distance between the
   * median age of all the changes in the file and the recency of the current
   * range's change.
   */
  age: Scalars['Int'];
  /** Identifies the line author */
  commit: GithubCommit;
  /** The ending line for the range */
  endingLine: Scalars['Int'];
  /** The starting line for the range */
  startingLine: Scalars['Int'];
};

/** Represents a Git blob. */
export type GithubBlob = GithubNode & GithubGitObject & {
   __typename?: 'GithubBlob';
  /** An abbreviated version of the Git object ID */
  abbreviatedOid: Scalars['String'];
  /** Byte size of Blob object */
  byteSize: Scalars['Int'];
  /** The HTTP path for this Git object */
  commitResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this Git object */
  commitUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** Indicates whether the Blob is binary or text */
  isBinary: Scalars['Boolean'];
  /** Indicates whether the contents is truncated */
  isTruncated: Scalars['Boolean'];
  /** The Git object ID */
  oid: Scalars['GithubGitObjectID'];
  /** The Repository the Git object belongs to */
  repository: GithubRepository;
  /** UTF8 text data or null if the Blob is binary */
  text?: Maybe<Scalars['String']>;
};

/** A special type of user which takes actions on behalf of GitHub Apps. */
export type GithubBot = GithubNode & GithubActor & GithubUniformResourceLocatable & {
   __typename?: 'GithubBot';
  /** A URL pointing to the GitHub App's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** The username of the actor. */
  login: Scalars['String'];
  /** The HTTP path for this bot */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this bot */
  url: Scalars['GithubURI'];
};


/** A special type of user which takes actions on behalf of GitHub Apps. */
export type GithubBotAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** A branch protection rule. */
export type GithubBranchProtectionRule = GithubNode & {
   __typename?: 'GithubBranchProtectionRule';
  /** A list of conflicts matching branches protection rule and other branch protection rules */
  branchProtectionRuleConflicts: GithubBranchProtectionRuleConflictConnection;
  /** The actor who created this branch protection rule. */
  creator?: Maybe<GithubActor>;
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** Will new commits pushed to matching branches dismiss pull request review approvals. */
  dismissesStaleReviews: Scalars['Boolean'];
  id: Scalars['ID'];
  /** Can admins overwrite branch protection. */
  isAdminEnforced: Scalars['Boolean'];
  /** Repository refs that are protected by this rule */
  matchingRefs: GithubRefConnection;
  /** Identifies the protection rule pattern. */
  pattern: Scalars['String'];
  /** A list push allowances for this branch protection rule. */
  pushAllowances: GithubPushAllowanceConnection;
  /** The repository associated with this branch protection rule. */
  repository?: Maybe<GithubRepository>;
  /** Number of approving reviews required to update matching branches. */
  requiredApprovingReviewCount?: Maybe<Scalars['Int']>;
  /** List of required status check contexts that must pass for commits to be accepted to matching branches. */
  requiredStatusCheckContexts?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** Are approving reviews required to update matching branches. */
  requiresApprovingReviews: Scalars['Boolean'];
  /** Are reviews from code owners required to update matching branches. */
  requiresCodeOwnerReviews: Scalars['Boolean'];
  /** Are commits required to be signed. */
  requiresCommitSignatures: Scalars['Boolean'];
  /** Are status checks required to update matching branches. */
  requiresStatusChecks: Scalars['Boolean'];
  /** Are branches required to be up to date before merging. */
  requiresStrictStatusChecks: Scalars['Boolean'];
  /** Is pushing to matching branches restricted. */
  restrictsPushes: Scalars['Boolean'];
  /** Is dismissal of pull request reviews restricted. */
  restrictsReviewDismissals: Scalars['Boolean'];
  /** A list review dismissal allowances for this branch protection rule. */
  reviewDismissalAllowances: GithubReviewDismissalAllowanceConnection;
};


/** A branch protection rule. */
export type GithubBranchProtectionRuleBranchProtectionRuleConflictsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A branch protection rule. */
export type GithubBranchProtectionRuleMatchingRefsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A branch protection rule. */
export type GithubBranchProtectionRulePushAllowancesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A branch protection rule. */
export type GithubBranchProtectionRuleReviewDismissalAllowancesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** A conflict between two branch protection rules. */
export type GithubBranchProtectionRuleConflict = {
   __typename?: 'GithubBranchProtectionRuleConflict';
  /** Identifies the branch protection rule. */
  branchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  /** Identifies the conflicting branch protection rule. */
  conflictingBranchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  /** Identifies the branch ref that has conflicting rules */
  ref?: Maybe<GithubRef>;
};

/** The connection type for BranchProtectionRuleConflict. */
export type GithubBranchProtectionRuleConflictConnection = {
   __typename?: 'GithubBranchProtectionRuleConflictConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubBranchProtectionRuleConflictEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubBranchProtectionRuleConflict>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubBranchProtectionRuleConflictEdge = {
   __typename?: 'GithubBranchProtectionRuleConflictEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubBranchProtectionRuleConflict>;
};

/** The connection type for BranchProtectionRule. */
export type GithubBranchProtectionRuleConnection = {
   __typename?: 'GithubBranchProtectionRuleConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubBranchProtectionRuleEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubBranchProtectionRule>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubBranchProtectionRuleEdge = {
   __typename?: 'GithubBranchProtectionRuleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubBranchProtectionRule>;
};

/** Autogenerated input type of CancelEnterpriseAdminInvitation */
export type GithubCancelEnterpriseAdminInvitationInput = {
  /** The Node ID of the pending enterprise administrator invitation. */
  invitationId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CancelEnterpriseAdminInvitation */
export type GithubCancelEnterpriseAdminInvitationPayload = {
   __typename?: 'GithubCancelEnterpriseAdminInvitationPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The invitation that was canceled. */
  invitation?: Maybe<GithubEnterpriseAdministratorInvitation>;
  /** A message confirming the result of canceling an administrator invitation. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of ChangeUserStatus */
export type GithubChangeUserStatusInput = {
  /** The emoji to represent your status. Can either be a native Unicode emoji or an emoji name with colons, e.g., :grinning:. */
  emoji?: Maybe<Scalars['String']>;
  /** A short description of your current status. */
  message?: Maybe<Scalars['String']>;
  /**
   * The ID of the organization whose members will be allowed to see the status. If
   * omitted, the status will be publicly visible.
   */
  organizationId?: Maybe<Scalars['ID']>;
  /** Whether this status should indicate you are not fully available on GitHub, e.g., you are away. */
  limitedAvailability?: Maybe<Scalars['Boolean']>;
  /** If set, the user status will not be shown after this date. */
  expiresAt?: Maybe<Scalars['GithubDateTime']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ChangeUserStatus */
export type GithubChangeUserStatusPayload = {
   __typename?: 'GithubChangeUserStatusPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** Your updated status. */
  status?: Maybe<GithubUserStatus>;
};

/** Autogenerated input type of ClearLabelsFromLabelable */
export type GithubClearLabelsFromLabelableInput = {
  /** The id of the labelable object to clear the labels from. */
  labelableId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ClearLabelsFromLabelable */
export type GithubClearLabelsFromLabelablePayload = {
   __typename?: 'GithubClearLabelsFromLabelablePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The item that was unlabeled. */
  labelable?: Maybe<GithubLabelable>;
};

/** Autogenerated input type of CloneProject */
export type GithubCloneProjectInput = {
  /** The owner ID to create the project under. */
  targetOwnerId: Scalars['ID'];
  /** The source project to clone. */
  sourceId: Scalars['ID'];
  /** Whether or not to clone the source project's workflows. */
  includeWorkflows: Scalars['Boolean'];
  /** The name of the project. */
  name: Scalars['String'];
  /** The description of the project. */
  body?: Maybe<Scalars['String']>;
  /** The visibility of the project, defaults to false (private). */
  public?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CloneProject */
export type GithubCloneProjectPayload = {
   __typename?: 'GithubCloneProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The id of the JobStatus for populating cloned fields. */
  jobStatusId?: Maybe<Scalars['String']>;
  /** The new cloned project. */
  project?: Maybe<GithubProject>;
};

/** Autogenerated input type of CloneTemplateRepository */
export type GithubCloneTemplateRepositoryInput = {
  /** The Node ID of the template repository. */
  repositoryId: Scalars['ID'];
  /** The name of the new repository. */
  name: Scalars['String'];
  /** The ID of the owner for the new repository. */
  ownerId: Scalars['ID'];
  /** A short description of the new repository. */
  description?: Maybe<Scalars['String']>;
  /** Indicates the repository's visibility level. */
  visibility: GithubRepositoryVisibility;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CloneTemplateRepository */
export type GithubCloneTemplateRepositoryPayload = {
   __typename?: 'GithubCloneTemplateRepositoryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new repository. */
  repository?: Maybe<GithubRepository>;
};

/** An object that can be closed */
export type GithubClosable = {
  /** `true` if the object is closed (definition of closed may depend on type) */
  closed: Scalars['Boolean'];
  /** Identifies the date and time when the object was closed. */
  closedAt?: Maybe<Scalars['GithubDateTime']>;
};

/** Represents a 'closed' event on any `Closable`. */
export type GithubClosedEvent = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubClosedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Object that was closed. */
  closable: GithubClosable;
  /** Object which triggered the creation of this event. */
  closer?: Maybe<GithubCloser>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** The HTTP path for this closed event. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this closed event. */
  url: Scalars['GithubURI'];
};

/** Autogenerated input type of CloseIssue */
export type GithubCloseIssueInput = {
  /** ID of the issue to be closed. */
  issueId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CloseIssue */
export type GithubCloseIssuePayload = {
   __typename?: 'GithubCloseIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The issue that was closed. */
  issue?: Maybe<GithubIssue>;
};

/** Autogenerated input type of ClosePullRequest */
export type GithubClosePullRequestInput = {
  /** ID of the pull request to be closed. */
  pullRequestId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ClosePullRequest */
export type GithubClosePullRequestPayload = {
   __typename?: 'GithubClosePullRequestPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request that was closed. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** The object which triggered a `ClosedEvent`. */
export type GithubCloser = GithubCommit | GithubPullRequest;

/** The Code of Conduct for a repository */
export type GithubCodeOfConduct = GithubNode & {
   __typename?: 'GithubCodeOfConduct';
  /** The body of the Code of Conduct */
  body?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The key for the Code of Conduct */
  key: Scalars['String'];
  /** The formal name of the Code of Conduct */
  name: Scalars['String'];
  /** The HTTP path for this Code of Conduct */
  resourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this Code of Conduct */
  url?: Maybe<Scalars['GithubURI']>;
};

/** Collaborators affiliation level with a subject. */
export enum GithubCollaboratorAffiliation {
  /** All outside collaborators of an organization-owned subject. */
  Outside = 'OUTSIDE',
  /** All collaborators with permissions to an organization-owned subject, regardless of organization membership status. */
  Direct = 'DIRECT',
  /** All collaborators the authenticated user can see. */
  All = 'ALL'
}

/** Represents a comment. */
export type GithubComment = {
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** The body as Markdown. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** Represents a comment. */
export type GithubCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** A comment author association with repository. */
export enum GithubCommentAuthorAssociation {
  /** Author is a member of the organization that owns the repository. */
  Member = 'MEMBER',
  /** Author is the owner of the repository. */
  Owner = 'OWNER',
  /** Author has been invited to collaborate on the repository. */
  Collaborator = 'COLLABORATOR',
  /** Author has previously committed to the repository. */
  Contributor = 'CONTRIBUTOR',
  /** Author has not previously committed to the repository. */
  FirstTimeContributor = 'FIRST_TIME_CONTRIBUTOR',
  /** Author has not previously committed to GitHub. */
  FirstTimer = 'FIRST_TIMER',
  /** Author has no association with the repository. */
  None = 'NONE'
}

/** The possible errors that will prevent a user from updating a comment. */
export enum GithubCommentCannotUpdateReason {
  /** Unable to create comment because repository is archived. */
  Archived = 'ARCHIVED',
  /** You must be the author or have write access to this repository to update this comment. */
  InsufficientAccess = 'INSUFFICIENT_ACCESS',
  /** Unable to create comment because issue is locked. */
  Locked = 'LOCKED',
  /** You must be logged in to update this comment. */
  LoginRequired = 'LOGIN_REQUIRED',
  /** Repository is under maintenance. */
  Maintenance = 'MAINTENANCE',
  /** At least one email address must be verified to update this comment. */
  VerifiedEmailRequired = 'VERIFIED_EMAIL_REQUIRED',
  /** You cannot update this comment */
  Denied = 'DENIED'
}

/** Represents a 'comment_deleted' event on a given issue or pull request. */
export type GithubCommentDeletedEvent = GithubNode & {
   __typename?: 'GithubCommentDeletedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Represents a Git commit. */
export type GithubCommit = GithubNode & GithubGitObject & GithubSubscribable & GithubUniformResourceLocatable & {
   __typename?: 'GithubCommit';
  /** An abbreviated version of the Git object ID */
  abbreviatedOid: Scalars['String'];
  /** The number of additions in this commit. */
  additions: Scalars['Int'];
  /** The pull requests associated with a commit */
  associatedPullRequests?: Maybe<GithubPullRequestConnection>;
  /** Authorship details of the commit. */
  author?: Maybe<GithubGitActor>;
  /** Check if the committer and the author match. */
  authoredByCommitter: Scalars['Boolean'];
  /** The datetime when this commit was authored. */
  authoredDate: Scalars['GithubDateTime'];
  /** Fetches `git blame` information. */
  blame: GithubBlame;
  /** The number of changed files in this commit. */
  changedFiles: Scalars['Int'];
  /** Comments made on the commit. */
  comments: GithubCommitCommentConnection;
  /** The HTTP path for this Git object */
  commitResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this Git object */
  commitUrl: Scalars['GithubURI'];
  /** The datetime when this commit was committed. */
  committedDate: Scalars['GithubDateTime'];
  /** Check if commited via GitHub web UI. */
  committedViaWeb: Scalars['Boolean'];
  /** Committership details of the commit. */
  committer?: Maybe<GithubGitActor>;
  /** The number of deletions in this commit. */
  deletions: Scalars['Int'];
  /** The deployments associated with a commit. */
  deployments?: Maybe<GithubDeploymentConnection>;
  /** The linear commit history starting from (and including) this commit, in the same order as `git log`. */
  history: GithubCommitHistoryConnection;
  id: Scalars['ID'];
  /** The Git commit message */
  message: Scalars['String'];
  /** The Git commit message body */
  messageBody: Scalars['String'];
  /** The commit message body rendered to HTML. */
  messageBodyHTML: Scalars['GithubHTML'];
  /** The Git commit message headline */
  messageHeadline: Scalars['String'];
  /** The commit message headline rendered to HTML. */
  messageHeadlineHTML: Scalars['GithubHTML'];
  /** The Git object ID */
  oid: Scalars['GithubGitObjectID'];
  /** The parents of a commit. */
  parents: GithubCommitConnection;
  /** The datetime when this commit was pushed. */
  pushedDate?: Maybe<Scalars['GithubDateTime']>;
  /** The Repository this commit belongs to */
  repository: GithubRepository;
  /** The HTTP path for this commit */
  resourcePath: Scalars['GithubURI'];
  /** Commit signing information, if present. */
  signature?: Maybe<GithubGitSignature>;
  /** Status information for this commit */
  status?: Maybe<GithubStatus>;
  /** Check and Status rollup information for this commit. */
  statusCheckRollup?: Maybe<GithubStatusCheckRollup>;
  /** Returns a list of all submodules in this repository as of this Commit parsed from the .gitmodules file. */
  submodules: GithubSubmoduleConnection;
  /**
   * Returns a URL to download a tarball archive for a repository.
   * Note: For private repositories, these links are temporary and expire after five minutes.
   */
  tarballUrl: Scalars['GithubURI'];
  /** Commit's root Tree */
  tree: GithubTree;
  /** The HTTP path for the tree of this commit */
  treeResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for the tree of this commit */
  treeUrl: Scalars['GithubURI'];
  /** The HTTP URL for this commit */
  url: Scalars['GithubURI'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
  /**
   * Returns a URL to download a zipball archive for a repository.
   * Note: For private repositories, these links are temporary and expire after five minutes.
   */
  zipballUrl: Scalars['GithubURI'];
};


/** Represents a Git commit. */
export type GithubCommitAssociatedPullRequestsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubPullRequestOrder>;
};


/** Represents a Git commit. */
export type GithubCommitBlameArgs = {
  path: Scalars['String'];
};


/** Represents a Git commit. */
export type GithubCommitCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents a Git commit. */
export type GithubCommitDeploymentsArgs = {
  environments?: Maybe<Array<Scalars['String']>>;
  orderBy?: Maybe<GithubDeploymentOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents a Git commit. */
export type GithubCommitHistoryArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  path?: Maybe<Scalars['String']>;
  author?: Maybe<GithubCommitAuthor>;
  since?: Maybe<Scalars['GithubGitTimestamp']>;
  until?: Maybe<Scalars['GithubGitTimestamp']>;
};


/** Represents a Git commit. */
export type GithubCommitParentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents a Git commit. */
export type GithubCommitSubmodulesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Specifies an author for filtering Git commits. */
export type GithubCommitAuthor = {
  /**
   * ID of a User to filter by. If non-null, only commits authored by this user
   * will be returned. This field takes precedence over emails.
   */
  id?: Maybe<Scalars['ID']>;
  /** Email addresses to filter by. Commits authored by any of the specified email addresses will be returned. */
  emails?: Maybe<Array<Scalars['String']>>;
};

/** Represents a comment on a given Commit. */
export type GithubCommitComment = GithubNode & GithubComment & GithubDeletable & GithubUpdatable & GithubUpdatableComment & GithubReactable & GithubRepositoryNode & {
   __typename?: 'GithubCommitComment';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** Identifies the comment body. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** Identifies the commit associated with the comment, if the commit exists. */
  commit?: Maybe<GithubCommit>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** Returns whether or not a comment has been minimized. */
  isMinimized: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Returns why the comment was minimized. */
  minimizedReason?: Maybe<Scalars['String']>;
  /** Identifies the file path associated with the comment. */
  path?: Maybe<Scalars['String']>;
  /** Identifies the line position associated with the comment. */
  position?: Maybe<Scalars['Int']>;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path permalink for this commit comment. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL permalink for this commit comment. */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Check if the current viewer can minimize this object. */
  viewerCanMinimize: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** Represents a comment on a given Commit. */
export type GithubCommitCommentReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** Represents a comment on a given Commit. */
export type GithubCommitCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for CommitComment. */
export type GithubCommitCommentConnection = {
   __typename?: 'GithubCommitCommentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCommitCommentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCommitComment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCommitCommentEdge = {
   __typename?: 'GithubCommitCommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCommitComment>;
};

/** A thread of comments on a commit. */
export type GithubCommitCommentThread = GithubNode & GithubRepositoryNode & {
   __typename?: 'GithubCommitCommentThread';
  /** The comments that exist in this thread. */
  comments: GithubCommitCommentConnection;
  /** The commit the comments were made on. */
  commit?: Maybe<GithubCommit>;
  id: Scalars['ID'];
  /** The file the comments were made on. */
  path?: Maybe<Scalars['String']>;
  /** The position in the diff for the commit that the comment was made on. */
  position?: Maybe<Scalars['Int']>;
  /** The repository associated with this node. */
  repository: GithubRepository;
};


/** A thread of comments on a commit. */
export type GithubCommitCommentThreadCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for Commit. */
export type GithubCommitConnection = {
   __typename?: 'GithubCommitConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCommitEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCommit>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Ordering options for commit contribution connections. */
export type GithubCommitContributionOrder = {
  /** The field by which to order commit contributions. */
  field: GithubCommitContributionOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which commit contribution connections can be ordered. */
export enum GithubCommitContributionOrderField {
  /** Order commit contributions by when they were made. */
  OccurredAt = 'OCCURRED_AT',
  /** Order commit contributions by how many commits they represent. */
  CommitCount = 'COMMIT_COUNT'
}

/** This aggregates commits made by a user within one repository. */
export type GithubCommitContributionsByRepository = {
   __typename?: 'GithubCommitContributionsByRepository';
  /** The commit contributions, each representing a day. */
  contributions: GithubCreatedCommitContributionConnection;
  /** The repository in which the commits were made. */
  repository: GithubRepository;
  /** The HTTP path for the user's commits to the repository in this time range. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for the user's commits to the repository in this time range. */
  url: Scalars['GithubURI'];
};


/** This aggregates commits made by a user within one repository. */
export type GithubCommitContributionsByRepositoryContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubCommitContributionOrder>;
};

/** An edge in a connection. */
export type GithubCommitEdge = {
   __typename?: 'GithubCommitEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCommit>;
};

/** The connection type for Commit. */
export type GithubCommitHistoryConnection = {
   __typename?: 'GithubCommitHistoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCommitEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCommit>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a 'connected' event on a given issue or pull request. */
export type GithubConnectedEvent = GithubNode & {
   __typename?: 'GithubConnectedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Reference originated in a different repository. */
  isCrossRepository: Scalars['Boolean'];
  /** Issue or pull request that made the reference. */
  source: GithubReferencedSubject;
  /** Issue or pull request which was connected. */
  subject: GithubReferencedSubject;
};

/** Represents a contribution a user made on GitHub, such as opening an issue. */
export type GithubContribution = {
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** A calendar of contributions made on GitHub by a user. */
export type GithubContributionCalendar = {
   __typename?: 'GithubContributionCalendar';
  /** A list of hex color codes used in this calendar. The darker the color, the more contributions it represents. */
  colors: Array<Scalars['String']>;
  /** Determine if the color set was chosen because it's currently Halloween. */
  isHalloween: Scalars['Boolean'];
  /** A list of the months of contributions in this calendar. */
  months: Array<GithubContributionCalendarMonth>;
  /** The count of total contributions in the calendar. */
  totalContributions: Scalars['Int'];
  /** A list of the weeks of contributions in this calendar. */
  weeks: Array<GithubContributionCalendarWeek>;
};

/** Represents a single day of contributions on GitHub by a user. */
export type GithubContributionCalendarDay = {
   __typename?: 'GithubContributionCalendarDay';
  /** The hex color code that represents how many contributions were made on this day compared to others in the calendar. */
  color: Scalars['String'];
  /** How many contributions were made by the user on this day. */
  contributionCount: Scalars['Int'];
  /** The day this square represents. */
  date: Scalars['GithubDate'];
  /** A number representing which day of the week this square represents, e.g., 1 is Monday. */
  weekday: Scalars['Int'];
};

/** A month of contributions in a user's contribution graph. */
export type GithubContributionCalendarMonth = {
   __typename?: 'GithubContributionCalendarMonth';
  /** The date of the first day of this month. */
  firstDay: Scalars['GithubDate'];
  /** The name of the month. */
  name: Scalars['String'];
  /** How many weeks started in this month. */
  totalWeeks: Scalars['Int'];
  /** The year the month occurred in. */
  year: Scalars['Int'];
};

/** A week of contributions in a user's contribution graph. */
export type GithubContributionCalendarWeek = {
   __typename?: 'GithubContributionCalendarWeek';
  /** The days of contributions in this week. */
  contributionDays: Array<GithubContributionCalendarDay>;
  /** The date of the earliest square in this week. */
  firstDay: Scalars['GithubDate'];
};

/** Ordering options for contribution connections. */
export type GithubContributionOrder = {
  /**
   * The field by which to order contributions.
   * 
   * **Upcoming Change on 2019-10-01 UTC**
   * **Description:** `field` will be removed. Only one order field is supported.
   * **Reason:** `field` will be removed.
   */
  field?: Maybe<GithubContributionOrderField>;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which contribution connections can be ordered. */
export enum GithubContributionOrderField {
  /** Order contributions by when they were made. */
  OccurredAt = 'OCCURRED_AT'
}

/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollection = {
   __typename?: 'GithubContributionsCollection';
  /** Commit contributions made by the user, grouped by repository. */
  commitContributionsByRepository: Array<GithubCommitContributionsByRepository>;
  /** A calendar of this user's contributions on GitHub. */
  contributionCalendar: GithubContributionCalendar;
  /** The years the user has been making contributions with the most recent year first. */
  contributionYears: Array<Scalars['Int']>;
  /** Determine if this collection's time span ends in the current month. */
  doesEndInCurrentMonth: Scalars['Boolean'];
  /**
   * The date of the first restricted contribution the user made in this time
   * period. Can only be non-null when the user has enabled private contribution counts.
   */
  earliestRestrictedContributionDate?: Maybe<Scalars['GithubDate']>;
  /** The ending date and time of this collection. */
  endedAt: Scalars['GithubDateTime'];
  /**
   * The first issue the user opened on GitHub. This will be null if that issue was
   * opened outside the collection's time range and ignoreTimeRange is false. If
   * the issue is not visible but the user has opted to show private contributions,
   * a RestrictedContribution will be returned.
   */
  firstIssueContribution?: Maybe<GithubCreatedIssueOrRestrictedContribution>;
  /**
   * The first pull request the user opened on GitHub. This will be null if that
   * pull request was opened outside the collection's time range and
   * ignoreTimeRange is not true. If the pull request is not visible but the user
   * has opted to show private contributions, a RestrictedContribution will be returned.
   */
  firstPullRequestContribution?: Maybe<GithubCreatedPullRequestOrRestrictedContribution>;
  /**
   * The first repository the user created on GitHub. This will be null if that
   * first repository was created outside the collection's time range and
   * ignoreTimeRange is false. If the repository is not visible, then a
   * RestrictedContribution is returned.
   */
  firstRepositoryContribution?: Maybe<GithubCreatedRepositoryOrRestrictedContribution>;
  /** Does the user have any more activity in the timeline that occurred prior to the collection's time range? */
  hasActivityInThePast: Scalars['Boolean'];
  /** Determine if there are any contributions in this collection. */
  hasAnyContributions: Scalars['Boolean'];
  /**
   * Determine if the user made any contributions in this time frame whose details
   * are not visible because they were made in a private repository. Can only be
   * true if the user enabled private contribution counts.
   */
  hasAnyRestrictedContributions: Scalars['Boolean'];
  /** Whether or not the collector's time span is all within the same day. */
  isSingleDay: Scalars['Boolean'];
  /** A list of issues the user opened. */
  issueContributions: GithubCreatedIssueContributionConnection;
  /** Issue contributions made by the user, grouped by repository. */
  issueContributionsByRepository: Array<GithubIssueContributionsByRepository>;
  /**
   * When the user signed up for GitHub. This will be null if that sign up date
   * falls outside the collection's time range and ignoreTimeRange is false.
   */
  joinedGitHubContribution?: Maybe<GithubJoinedGitHubContribution>;
  /**
   * The date of the most recent restricted contribution the user made in this time
   * period. Can only be non-null when the user has enabled private contribution counts.
   */
  latestRestrictedContributionDate?: Maybe<Scalars['GithubDate']>;
  /**
   * When this collection's time range does not include any activity from the user, use this
   * to get a different collection from an earlier time range that does have activity.
   */
  mostRecentCollectionWithActivity?: Maybe<GithubContributionsCollection>;
  /**
   * Returns a different contributions collection from an earlier time range than this one
   * that does not have any contributions.
   */
  mostRecentCollectionWithoutActivity?: Maybe<GithubContributionsCollection>;
  /**
   * The issue the user opened on GitHub that received the most comments in the specified
   * time frame.
   */
  popularIssueContribution?: Maybe<GithubCreatedIssueContribution>;
  /**
   * The pull request the user opened on GitHub that received the most comments in the
   * specified time frame.
   */
  popularPullRequestContribution?: Maybe<GithubCreatedPullRequestContribution>;
  /** Pull request contributions made by the user. */
  pullRequestContributions: GithubCreatedPullRequestContributionConnection;
  /** Pull request contributions made by the user, grouped by repository. */
  pullRequestContributionsByRepository: Array<GithubPullRequestContributionsByRepository>;
  /** Pull request review contributions made by the user. */
  pullRequestReviewContributions: GithubCreatedPullRequestReviewContributionConnection;
  /** Pull request review contributions made by the user, grouped by repository. */
  pullRequestReviewContributionsByRepository: Array<GithubPullRequestReviewContributionsByRepository>;
  /** A list of repositories owned by the user that the user created in this time range. */
  repositoryContributions: GithubCreatedRepositoryContributionConnection;
  /**
   * A count of contributions made by the user that the viewer cannot access. Only
   * non-zero when the user has chosen to share their private contribution counts.
   */
  restrictedContributionsCount: Scalars['Int'];
  /** The beginning date and time of this collection. */
  startedAt: Scalars['GithubDateTime'];
  /** How many commits were made by the user in this time span. */
  totalCommitContributions: Scalars['Int'];
  /** How many issues the user opened. */
  totalIssueContributions: Scalars['Int'];
  /** How many pull requests the user opened. */
  totalPullRequestContributions: Scalars['Int'];
  /** How many pull request reviews the user left. */
  totalPullRequestReviewContributions: Scalars['Int'];
  /** How many different repositories the user committed to. */
  totalRepositoriesWithContributedCommits: Scalars['Int'];
  /** How many different repositories the user opened issues in. */
  totalRepositoriesWithContributedIssues: Scalars['Int'];
  /** How many different repositories the user left pull request reviews in. */
  totalRepositoriesWithContributedPullRequestReviews: Scalars['Int'];
  /** How many different repositories the user opened pull requests in. */
  totalRepositoriesWithContributedPullRequests: Scalars['Int'];
  /** How many repositories the user created. */
  totalRepositoryContributions: Scalars['Int'];
  /** The user who made the contributions in this collection. */
  user: GithubUser;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionCommitContributionsByRepositoryArgs = {
  maxRepositories?: Maybe<Scalars['Int']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionIssueContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubContributionOrder>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionIssueContributionsByRepositoryArgs = {
  maxRepositories?: Maybe<Scalars['Int']>;
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionPullRequestContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubContributionOrder>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionPullRequestContributionsByRepositoryArgs = {
  maxRepositories?: Maybe<Scalars['Int']>;
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionPullRequestReviewContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubContributionOrder>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionPullRequestReviewContributionsByRepositoryArgs = {
  maxRepositories?: Maybe<Scalars['Int']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionRepositoryContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  excludeFirst?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubContributionOrder>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionTotalIssueContributionsArgs = {
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionTotalPullRequestContributionsArgs = {
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionTotalRepositoriesWithContributedIssuesArgs = {
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionTotalRepositoriesWithContributedPullRequestsArgs = {
  excludeFirst?: Maybe<Scalars['Boolean']>;
  excludePopular?: Maybe<Scalars['Boolean']>;
};


/** A contributions collection aggregates contributions such as opened issues and commits created by a user. */
export type GithubContributionsCollectionTotalRepositoryContributionsArgs = {
  excludeFirst?: Maybe<Scalars['Boolean']>;
};

/** Represents a 'converted_note_to_issue' event on a given issue or pull request. */
export type GithubConvertedNoteToIssueEvent = GithubNode & {
   __typename?: 'GithubConvertedNoteToIssueEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Autogenerated input type of ConvertProjectCardNoteToIssue */
export type GithubConvertProjectCardNoteToIssueInput = {
  /** The ProjectCard ID to convert. */
  projectCardId: Scalars['ID'];
  /** The ID of the repository to create the issue in. */
  repositoryId: Scalars['ID'];
  /** The title of the newly created issue. Defaults to the card's note text. */
  title?: Maybe<Scalars['String']>;
  /** The body of the newly created issue. */
  body?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ConvertProjectCardNoteToIssue */
export type GithubConvertProjectCardNoteToIssuePayload = {
   __typename?: 'GithubConvertProjectCardNoteToIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated ProjectCard. */
  projectCard?: Maybe<GithubProjectCard>;
};

/** Autogenerated input type of CreateBranchProtectionRule */
export type GithubCreateBranchProtectionRuleInput = {
  /** The global relay id of the repository in which a new branch protection rule should be created in. */
  repositoryId: Scalars['ID'];
  /** The glob-like pattern used to determine matching branches. */
  pattern: Scalars['String'];
  /** Are approving reviews required to update matching branches. */
  requiresApprovingReviews?: Maybe<Scalars['Boolean']>;
  /** Number of approving reviews required to update matching branches. */
  requiredApprovingReviewCount?: Maybe<Scalars['Int']>;
  /** Are commits required to be signed. */
  requiresCommitSignatures?: Maybe<Scalars['Boolean']>;
  /** Can admins overwrite branch protection. */
  isAdminEnforced?: Maybe<Scalars['Boolean']>;
  /** Are status checks required to update matching branches. */
  requiresStatusChecks?: Maybe<Scalars['Boolean']>;
  /** Are branches required to be up to date before merging. */
  requiresStrictStatusChecks?: Maybe<Scalars['Boolean']>;
  /** Are reviews from code owners required to update matching branches. */
  requiresCodeOwnerReviews?: Maybe<Scalars['Boolean']>;
  /** Will new commits pushed to matching branches dismiss pull request review approvals. */
  dismissesStaleReviews?: Maybe<Scalars['Boolean']>;
  /** Is dismissal of pull request reviews restricted. */
  restrictsReviewDismissals?: Maybe<Scalars['Boolean']>;
  /** A list of User or Team IDs allowed to dismiss reviews on pull requests targeting matching branches. */
  reviewDismissalActorIds?: Maybe<Array<Scalars['ID']>>;
  /** Is pushing to matching branches restricted. */
  restrictsPushes?: Maybe<Scalars['Boolean']>;
  /** A list of User, Team or App IDs allowed to push to matching branches. */
  pushActorIds?: Maybe<Array<Scalars['ID']>>;
  /** List of required status check contexts that must pass for commits to be accepted to matching branches. */
  requiredStatusCheckContexts?: Maybe<Array<Scalars['String']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateBranchProtectionRule */
export type GithubCreateBranchProtectionRulePayload = {
   __typename?: 'GithubCreateBranchProtectionRulePayload';
  /** The newly created BranchProtectionRule. */
  branchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Represents the contribution a user made by committing to a repository. */
export type GithubCreatedCommitContribution = GithubContribution & {
   __typename?: 'GithubCreatedCommitContribution';
  /** How many commits were made on this day to this repository by the user. */
  commitCount: Scalars['Int'];
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The repository the user made a commit in. */
  repository: GithubRepository;
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** The connection type for CreatedCommitContribution. */
export type GithubCreatedCommitContributionConnection = {
   __typename?: 'GithubCreatedCommitContributionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCreatedCommitContributionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCreatedCommitContribution>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of commits across days and repositories in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCreatedCommitContributionEdge = {
   __typename?: 'GithubCreatedCommitContributionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCreatedCommitContribution>;
};

/** Represents the contribution a user made on GitHub by opening an issue. */
export type GithubCreatedIssueContribution = GithubContribution & {
   __typename?: 'GithubCreatedIssueContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** The issue that was opened. */
  issue: GithubIssue;
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** The connection type for CreatedIssueContribution. */
export type GithubCreatedIssueContributionConnection = {
   __typename?: 'GithubCreatedIssueContributionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCreatedIssueContributionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCreatedIssueContribution>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCreatedIssueContributionEdge = {
   __typename?: 'GithubCreatedIssueContributionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCreatedIssueContribution>;
};

/** Represents either a issue the viewer can access or a restricted contribution. */
export type GithubCreatedIssueOrRestrictedContribution = GithubCreatedIssueContribution | GithubRestrictedContribution;

/** Represents the contribution a user made on GitHub by opening a pull request. */
export type GithubCreatedPullRequestContribution = GithubContribution & {
   __typename?: 'GithubCreatedPullRequestContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The pull request that was opened. */
  pullRequest: GithubPullRequest;
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** The connection type for CreatedPullRequestContribution. */
export type GithubCreatedPullRequestContributionConnection = {
   __typename?: 'GithubCreatedPullRequestContributionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCreatedPullRequestContributionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCreatedPullRequestContribution>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCreatedPullRequestContributionEdge = {
   __typename?: 'GithubCreatedPullRequestContributionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCreatedPullRequestContribution>;
};

/** Represents either a pull request the viewer can access or a restricted contribution. */
export type GithubCreatedPullRequestOrRestrictedContribution = GithubCreatedPullRequestContribution | GithubRestrictedContribution;

/** Represents the contribution a user made by leaving a review on a pull request. */
export type GithubCreatedPullRequestReviewContribution = GithubContribution & {
   __typename?: 'GithubCreatedPullRequestReviewContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The pull request the user reviewed. */
  pullRequest: GithubPullRequest;
  /** The review the user left on the pull request. */
  pullRequestReview: GithubPullRequestReview;
  /** The repository containing the pull request that the user reviewed. */
  repository: GithubRepository;
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** The connection type for CreatedPullRequestReviewContribution. */
export type GithubCreatedPullRequestReviewContributionConnection = {
   __typename?: 'GithubCreatedPullRequestReviewContributionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCreatedPullRequestReviewContributionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCreatedPullRequestReviewContribution>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCreatedPullRequestReviewContributionEdge = {
   __typename?: 'GithubCreatedPullRequestReviewContributionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCreatedPullRequestReviewContribution>;
};

/** Represents the contribution a user made on GitHub by creating a repository. */
export type GithubCreatedRepositoryContribution = GithubContribution & {
   __typename?: 'GithubCreatedRepositoryContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The repository that was created. */
  repository: GithubRepository;
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** The connection type for CreatedRepositoryContribution. */
export type GithubCreatedRepositoryContributionConnection = {
   __typename?: 'GithubCreatedRepositoryContributionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubCreatedRepositoryContributionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubCreatedRepositoryContribution>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubCreatedRepositoryContributionEdge = {
   __typename?: 'GithubCreatedRepositoryContributionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubCreatedRepositoryContribution>;
};

/** Represents either a repository the viewer can access or a restricted contribution. */
export type GithubCreatedRepositoryOrRestrictedContribution = GithubCreatedRepositoryContribution | GithubRestrictedContribution;

/** Autogenerated input type of CreateEnterpriseOrganization */
export type GithubCreateEnterpriseOrganizationInput = {
  /** The ID of the enterprise owning the new organization. */
  enterpriseId: Scalars['ID'];
  /** The login of the new organization. */
  login: Scalars['String'];
  /** The profile name of the new organization. */
  profileName: Scalars['String'];
  /** The email used for sending billing receipts. */
  billingEmail: Scalars['String'];
  /** The logins for the administrators of the new organization. */
  adminLogins: Array<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateEnterpriseOrganization */
export type GithubCreateEnterpriseOrganizationPayload = {
   __typename?: 'GithubCreateEnterpriseOrganizationPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise that owns the created organization. */
  enterprise?: Maybe<GithubEnterprise>;
  /** The organization that was created. */
  organization?: Maybe<GithubOrganization>;
};

/** Autogenerated input type of CreateIpAllowListEntry */
export type GithubCreateIpAllowListEntryInput = {
  /** The ID of the owner for which to create the new IP allow list entry. */
  ownerId: Scalars['ID'];
  /** An IP address or range of addresses in CIDR notation. */
  allowListValue: Scalars['String'];
  /** An optional name for the IP allow list entry. */
  name?: Maybe<Scalars['String']>;
  /** Whether the IP allow list entry is active when an IP allow list is enabled. */
  isActive: Scalars['Boolean'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateIpAllowListEntry */
export type GithubCreateIpAllowListEntryPayload = {
   __typename?: 'GithubCreateIpAllowListEntryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The IP allow list entry that was created. */
  ipAllowListEntry?: Maybe<GithubIpAllowListEntry>;
};

/** Autogenerated input type of CreateIssue */
export type GithubCreateIssueInput = {
  /** The Node ID of the repository. */
  repositoryId: Scalars['ID'];
  /** The title for the issue. */
  title: Scalars['String'];
  /** The body for the issue description. */
  body?: Maybe<Scalars['String']>;
  /** The Node ID for the user assignee for this issue. */
  assigneeIds?: Maybe<Array<Scalars['ID']>>;
  /** The Node ID of the milestone for this issue. */
  milestoneId?: Maybe<Scalars['ID']>;
  /** An array of Node IDs of labels for this issue. */
  labelIds?: Maybe<Array<Scalars['ID']>>;
  /** An array of Node IDs for projects associated with this issue. */
  projectIds?: Maybe<Array<Scalars['ID']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateIssue */
export type GithubCreateIssuePayload = {
   __typename?: 'GithubCreateIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new issue. */
  issue?: Maybe<GithubIssue>;
};

/** Autogenerated input type of CreateProject */
export type GithubCreateProjectInput = {
  /** The owner ID to create the project under. */
  ownerId: Scalars['ID'];
  /** The name of project. */
  name: Scalars['String'];
  /** The description of project. */
  body?: Maybe<Scalars['String']>;
  /** The name of the GitHub-provided template. */
  template?: Maybe<GithubProjectTemplate>;
  /** A list of repository IDs to create as linked repositories for the project */
  repositoryIds?: Maybe<Array<Scalars['ID']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateProject */
export type GithubCreateProjectPayload = {
   __typename?: 'GithubCreateProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new project. */
  project?: Maybe<GithubProject>;
};

/** Autogenerated input type of CreatePullRequest */
export type GithubCreatePullRequestInput = {
  /** The Node ID of the repository. */
  repositoryId: Scalars['ID'];
  /**
   * The name of the branch you want your changes pulled into. This should be an existing branch
   * on the current repository. You cannot update the base branch on a pull request to point
   * to another repository.
   */
  baseRefName: Scalars['String'];
  /**
   * The name of the branch where your changes are implemented. For cross-repository pull requests
   * in the same network, namespace `head_ref_name` with a user like this: `username:branch`.
   */
  headRefName: Scalars['String'];
  /** The title of the pull request. */
  title: Scalars['String'];
  /** The contents of the pull request. */
  body?: Maybe<Scalars['String']>;
  /** Indicates whether maintainers can modify the pull request. */
  maintainerCanModify?: Maybe<Scalars['Boolean']>;
  /** Indicates whether this pull request should be a draft. */
  draft?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreatePullRequest */
export type GithubCreatePullRequestPayload = {
   __typename?: 'GithubCreatePullRequestPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new pull request. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** Autogenerated input type of CreateRef */
export type GithubCreateRefInput = {
  /** The Node ID of the Repository to create the Ref in. */
  repositoryId: Scalars['ID'];
  /** The fully qualified name of the new Ref (ie: `refs/heads/my_new_branch`). */
  name: Scalars['String'];
  /** The GitObjectID that the new Ref shall target. Must point to a commit. */
  oid: Scalars['GithubGitObjectID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateRef */
export type GithubCreateRefPayload = {
   __typename?: 'GithubCreateRefPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The newly created ref. */
  ref?: Maybe<GithubRef>;
};

/** Autogenerated input type of CreateRepository */
export type GithubCreateRepositoryInput = {
  /** The name of the new repository. */
  name: Scalars['String'];
  /** The ID of the owner for the new repository. */
  ownerId?: Maybe<Scalars['ID']>;
  /** A short description of the new repository. */
  description?: Maybe<Scalars['String']>;
  /** Indicates the repository's visibility level. */
  visibility: GithubRepositoryVisibility;
  /**
   * Whether this repository should be marked as a template such that anyone who
   * can access it can create new repositories with the same files and directory structure.
   */
  template?: Maybe<Scalars['Boolean']>;
  /** The URL for a web page about this repository. */
  homepageUrl?: Maybe<Scalars['GithubURI']>;
  /** Indicates if the repository should have the wiki feature enabled. */
  hasWikiEnabled?: Maybe<Scalars['Boolean']>;
  /** Indicates if the repository should have the issues feature enabled. */
  hasIssuesEnabled?: Maybe<Scalars['Boolean']>;
  /**
   * When an organization is specified as the owner, this ID identifies the team
   * that should be granted access to the new repository.
   */
  teamId?: Maybe<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateRepository */
export type GithubCreateRepositoryPayload = {
   __typename?: 'GithubCreateRepositoryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new repository. */
  repository?: Maybe<GithubRepository>;
};

/** Autogenerated input type of CreateTeamDiscussionComment */
export type GithubCreateTeamDiscussionCommentInput = {
  /** The ID of the discussion to which the comment belongs. */
  discussionId: Scalars['ID'];
  /** The content of the comment. */
  body: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateTeamDiscussionComment */
export type GithubCreateTeamDiscussionCommentPayload = {
   __typename?: 'GithubCreateTeamDiscussionCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new comment. */
  teamDiscussionComment?: Maybe<GithubTeamDiscussionComment>;
};

/** Autogenerated input type of CreateTeamDiscussion */
export type GithubCreateTeamDiscussionInput = {
  /** The ID of the team to which the discussion belongs. */
  teamId: Scalars['ID'];
  /** The title of the discussion. */
  title: Scalars['String'];
  /** The content of the discussion. */
  body: Scalars['String'];
  /**
   * If true, restricts the visiblity of this discussion to team members and
   * organization admins. If false or not specified, allows any organization member
   * to view this discussion.
   */
  private?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of CreateTeamDiscussion */
export type GithubCreateTeamDiscussionPayload = {
   __typename?: 'GithubCreateTeamDiscussionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new discussion. */
  teamDiscussion?: Maybe<GithubTeamDiscussion>;
};

/** Represents a mention made by one issue or pull request to another. */
export type GithubCrossReferencedEvent = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubCrossReferencedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Reference originated in a different repository. */
  isCrossRepository: Scalars['Boolean'];
  /** Identifies when the reference was made. */
  referencedAt: Scalars['GithubDateTime'];
  /** The HTTP path for this pull request. */
  resourcePath: Scalars['GithubURI'];
  /** Issue or pull request that made the reference. */
  source: GithubReferencedSubject;
  /** Issue or pull request to which the reference was made. */
  target: GithubReferencedSubject;
  /** The HTTP URL for this pull request. */
  url: Scalars['GithubURI'];
  /** Checks if the target will be closed when the source is merged. */
  willCloseTarget: Scalars['Boolean'];
};



/** Autogenerated input type of DeclineTopicSuggestion */
export type GithubDeclineTopicSuggestionInput = {
  /** The Node ID of the repository. */
  repositoryId: Scalars['ID'];
  /** The name of the suggested topic. */
  name: Scalars['String'];
  /** The reason why the suggested topic is declined. */
  reason: GithubTopicSuggestionDeclineReason;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeclineTopicSuggestion */
export type GithubDeclineTopicSuggestionPayload = {
   __typename?: 'GithubDeclineTopicSuggestionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The declined topic. */
  topic?: Maybe<GithubTopic>;
};

/** The possible default permissions for repositories. */
export enum GithubDefaultRepositoryPermissionField {
  /** No access */
  None = 'NONE',
  /** Can read repos by default */
  Read = 'READ',
  /** Can read and write repos by default */
  Write = 'WRITE',
  /** Can read, write, and administrate repos by default */
  Admin = 'ADMIN'
}

/** Entities that can be deleted. */
export type GithubDeletable = {
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
};

/** Autogenerated input type of DeleteBranchProtectionRule */
export type GithubDeleteBranchProtectionRuleInput = {
  /** The global relay id of the branch protection rule to be deleted. */
  branchProtectionRuleId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteBranchProtectionRule */
export type GithubDeleteBranchProtectionRulePayload = {
   __typename?: 'GithubDeleteBranchProtectionRulePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of DeleteDeployment */
export type GithubDeleteDeploymentInput = {
  /** The Node ID of the deployment to be deleted. */
  id: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteDeployment */
export type GithubDeleteDeploymentPayload = {
   __typename?: 'GithubDeleteDeploymentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of DeleteIpAllowListEntry */
export type GithubDeleteIpAllowListEntryInput = {
  /** The ID of the IP allow list entry to delete. */
  ipAllowListEntryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteIpAllowListEntry */
export type GithubDeleteIpAllowListEntryPayload = {
   __typename?: 'GithubDeleteIpAllowListEntryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The IP allow list entry that was deleted. */
  ipAllowListEntry?: Maybe<GithubIpAllowListEntry>;
};

/** Autogenerated input type of DeleteIssueComment */
export type GithubDeleteIssueCommentInput = {
  /** The ID of the comment to delete. */
  id: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteIssueComment */
export type GithubDeleteIssueCommentPayload = {
   __typename?: 'GithubDeleteIssueCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of DeleteIssue */
export type GithubDeleteIssueInput = {
  /** The ID of the issue to delete. */
  issueId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteIssue */
export type GithubDeleteIssuePayload = {
   __typename?: 'GithubDeleteIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The repository the issue belonged to */
  repository?: Maybe<GithubRepository>;
};

/** Autogenerated input type of DeleteProjectCard */
export type GithubDeleteProjectCardInput = {
  /** The id of the card to delete. */
  cardId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteProjectCard */
export type GithubDeleteProjectCardPayload = {
   __typename?: 'GithubDeleteProjectCardPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The column the deleted card was in. */
  column?: Maybe<GithubProjectColumn>;
  /** The deleted card ID. */
  deletedCardId?: Maybe<Scalars['ID']>;
};

/** Autogenerated input type of DeleteProjectColumn */
export type GithubDeleteProjectColumnInput = {
  /** The id of the column to delete. */
  columnId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteProjectColumn */
export type GithubDeleteProjectColumnPayload = {
   __typename?: 'GithubDeleteProjectColumnPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The deleted column ID. */
  deletedColumnId?: Maybe<Scalars['ID']>;
  /** The project the deleted column was in. */
  project?: Maybe<GithubProject>;
};

/** Autogenerated input type of DeleteProject */
export type GithubDeleteProjectInput = {
  /** The Project ID to update. */
  projectId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteProject */
export type GithubDeleteProjectPayload = {
   __typename?: 'GithubDeleteProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The repository or organization the project was removed from. */
  owner?: Maybe<GithubProjectOwner>;
};

/** Autogenerated input type of DeletePullRequestReviewComment */
export type GithubDeletePullRequestReviewCommentInput = {
  /** The ID of the comment to delete. */
  id: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeletePullRequestReviewComment */
export type GithubDeletePullRequestReviewCommentPayload = {
   __typename?: 'GithubDeletePullRequestReviewCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request review the deleted comment belonged to. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
};

/** Autogenerated input type of DeletePullRequestReview */
export type GithubDeletePullRequestReviewInput = {
  /** The Node ID of the pull request review to delete. */
  pullRequestReviewId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeletePullRequestReview */
export type GithubDeletePullRequestReviewPayload = {
   __typename?: 'GithubDeletePullRequestReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The deleted pull request review. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
};

/** Autogenerated input type of DeleteRef */
export type GithubDeleteRefInput = {
  /** The Node ID of the Ref to be deleted. */
  refId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteRef */
export type GithubDeleteRefPayload = {
   __typename?: 'GithubDeleteRefPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of DeleteTeamDiscussionComment */
export type GithubDeleteTeamDiscussionCommentInput = {
  /** The ID of the comment to delete. */
  id: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteTeamDiscussionComment */
export type GithubDeleteTeamDiscussionCommentPayload = {
   __typename?: 'GithubDeleteTeamDiscussionCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of DeleteTeamDiscussion */
export type GithubDeleteTeamDiscussionInput = {
  /** The discussion ID to delete. */
  id: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DeleteTeamDiscussion */
export type GithubDeleteTeamDiscussionPayload = {
   __typename?: 'GithubDeleteTeamDiscussionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Represents a 'demilestoned' event on a given issue or pull request. */
export type GithubDemilestonedEvent = GithubNode & {
   __typename?: 'GithubDemilestonedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the milestone title associated with the 'demilestoned' event. */
  milestoneTitle: Scalars['String'];
  /** Object referenced by event. */
  subject: GithubMilestoneItem;
};

/** Represents a 'deployed' event on a given pull request. */
export type GithubDeployedEvent = GithubNode & {
   __typename?: 'GithubDeployedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The deployment associated with the 'deployed' event. */
  deployment: GithubDeployment;
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** The ref associated with the 'deployed' event. */
  ref?: Maybe<GithubRef>;
};

/** A repository deploy key. */
export type GithubDeployKey = GithubNode & {
   __typename?: 'GithubDeployKey';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** The deploy key. */
  key: Scalars['String'];
  /** Whether or not the deploy key is read only. */
  readOnly: Scalars['Boolean'];
  /** The deploy key title. */
  title: Scalars['String'];
  /** Whether or not the deploy key has been verified. */
  verified: Scalars['Boolean'];
};

/** The connection type for DeployKey. */
export type GithubDeployKeyConnection = {
   __typename?: 'GithubDeployKeyConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubDeployKeyEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubDeployKey>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubDeployKeyEdge = {
   __typename?: 'GithubDeployKeyEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubDeployKey>;
};

/** Represents triggered deployment instance. */
export type GithubDeployment = GithubNode & {
   __typename?: 'GithubDeployment';
  /** Identifies the commit sha of the deployment. */
  commit?: Maybe<GithubCommit>;
  /** Identifies the oid of the deployment commit, even if the commit has been deleted. */
  commitOid: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the actor who triggered the deployment. */
  creator?: Maybe<GithubActor>;
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The deployment description. */
  description?: Maybe<Scalars['String']>;
  /** The latest environment to which this deployment was made. */
  environment?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The latest environment to which this deployment was made. */
  latestEnvironment?: Maybe<Scalars['String']>;
  /** The latest status of this deployment. */
  latestStatus?: Maybe<GithubDeploymentStatus>;
  /** The original environment to which this deployment was made. */
  originalEnvironment?: Maybe<Scalars['String']>;
  /** Extra information that a deployment system might need. */
  payload?: Maybe<Scalars['String']>;
  /** Identifies the Ref of the deployment, if the deployment was created by ref. */
  ref?: Maybe<GithubRef>;
  /** Identifies the repository associated with the deployment. */
  repository: GithubRepository;
  /** The current state of the deployment. */
  state?: Maybe<GithubDeploymentState>;
  /** A list of statuses associated with the deployment. */
  statuses?: Maybe<GithubDeploymentStatusConnection>;
  /** The deployment task. */
  task?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};


/** Represents triggered deployment instance. */
export type GithubDeploymentStatusesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for Deployment. */
export type GithubDeploymentConnection = {
   __typename?: 'GithubDeploymentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubDeploymentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubDeployment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubDeploymentEdge = {
   __typename?: 'GithubDeploymentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubDeployment>;
};

/** Represents a 'deployment_environment_changed' event on a given pull request. */
export type GithubDeploymentEnvironmentChangedEvent = GithubNode & {
   __typename?: 'GithubDeploymentEnvironmentChangedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The deployment status that updated the deployment environment. */
  deploymentStatus: GithubDeploymentStatus;
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
};

/** Ordering options for deployment connections */
export type GithubDeploymentOrder = {
  /** The field to order deployments by. */
  field: GithubDeploymentOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which deployment connections can be ordered. */
export enum GithubDeploymentOrderField {
  /** Order collection by creation time */
  CreatedAt = 'CREATED_AT'
}

/** The possible states in which a deployment can be. */
export enum GithubDeploymentState {
  /** The pending deployment was not updated after 30 minutes. */
  Abandoned = 'ABANDONED',
  /** The deployment is currently active. */
  Active = 'ACTIVE',
  /** An inactive transient deployment. */
  Destroyed = 'DESTROYED',
  /** The deployment experienced an error. */
  Error = 'ERROR',
  /** The deployment has failed. */
  Failure = 'FAILURE',
  /** The deployment is inactive. */
  Inactive = 'INACTIVE',
  /** The deployment is pending. */
  Pending = 'PENDING',
  /** The deployment has queued */
  Queued = 'QUEUED',
  /** The deployment is in progress. */
  InProgress = 'IN_PROGRESS'
}

/** Describes the status of a given deployment attempt. */
export type GithubDeploymentStatus = GithubNode & {
   __typename?: 'GithubDeploymentStatus';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the actor who triggered the deployment. */
  creator?: Maybe<GithubActor>;
  /** Identifies the deployment associated with status. */
  deployment: GithubDeployment;
  /** Identifies the description of the deployment. */
  description?: Maybe<Scalars['String']>;
  /** Identifies the environment URL of the deployment. */
  environmentUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** Identifies the log URL of the deployment. */
  logUrl?: Maybe<Scalars['GithubURI']>;
  /** Identifies the current state of the deployment. */
  state: GithubDeploymentStatusState;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** The connection type for DeploymentStatus. */
export type GithubDeploymentStatusConnection = {
   __typename?: 'GithubDeploymentStatusConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubDeploymentStatusEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubDeploymentStatus>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubDeploymentStatusEdge = {
   __typename?: 'GithubDeploymentStatusEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubDeploymentStatus>;
};

/** The possible states for a deployment status. */
export enum GithubDeploymentStatusState {
  /** The deployment is pending. */
  Pending = 'PENDING',
  /** The deployment was successful. */
  Success = 'SUCCESS',
  /** The deployment has failed. */
  Failure = 'FAILURE',
  /** The deployment is inactive. */
  Inactive = 'INACTIVE',
  /** The deployment experienced an error. */
  Error = 'ERROR',
  /** The deployment is queued */
  Queued = 'QUEUED',
  /** The deployment is in progress. */
  InProgress = 'IN_PROGRESS'
}

/** Represents a 'disconnected' event on a given issue or pull request. */
export type GithubDisconnectedEvent = GithubNode & {
   __typename?: 'GithubDisconnectedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Reference originated in a different repository. */
  isCrossRepository: Scalars['Boolean'];
  /** Issue or pull request from which the issue was disconnected. */
  source: GithubReferencedSubject;
  /** Issue or pull request which was disconnected. */
  subject: GithubReferencedSubject;
};

/** Autogenerated input type of DismissPullRequestReview */
export type GithubDismissPullRequestReviewInput = {
  /** The Node ID of the pull request review to modify. */
  pullRequestReviewId: Scalars['ID'];
  /** The contents of the pull request review dismissal message. */
  message: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of DismissPullRequestReview */
export type GithubDismissPullRequestReviewPayload = {
   __typename?: 'GithubDismissPullRequestReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The dismissed pull request review. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
};

/** Specifies a review comment to be left with a Pull Request Review. */
export type GithubDraftPullRequestReviewComment = {
  /** Path to the file being commented on. */
  path: Scalars['String'];
  /** Position in the file to leave a comment on. */
  position: Scalars['Int'];
  /** Body of the comment to leave. */
  body: Scalars['String'];
};

/** An account to manage multiple organizations with consolidated policy and billing. */
export type GithubEnterprise = GithubNode & {
   __typename?: 'GithubEnterprise';
  /** A URL pointing to the enterprise's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** Enterprise billing information visible to enterprise billing managers. */
  billingInfo?: Maybe<GithubEnterpriseBillingInfo>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The description of the enterprise. */
  description?: Maybe<Scalars['String']>;
  /** The description of the enterprise as HTML. */
  descriptionHTML: Scalars['GithubHTML'];
  id: Scalars['ID'];
  /** The location of the enterprise. */
  location?: Maybe<Scalars['String']>;
  /** A list of users who are members of this enterprise. */
  members: GithubEnterpriseMemberConnection;
  /** The name of the enterprise. */
  name: Scalars['String'];
  /** A list of organizations that belong to this enterprise. */
  organizations: GithubOrganizationConnection;
  /** Enterprise information only visible to enterprise owners. */
  ownerInfo?: Maybe<GithubEnterpriseOwnerInfo>;
  /** The HTTP path for this enterprise. */
  resourcePath: Scalars['GithubURI'];
  /** The URL-friendly identifier for the enterprise. */
  slug: Scalars['String'];
  /** The HTTP URL for this enterprise. */
  url: Scalars['GithubURI'];
  /** A list of user accounts on this enterprise. */
  userAccounts: GithubEnterpriseUserAccountConnection;
  /** Is the current viewer an admin of this enterprise? */
  viewerIsAdmin: Scalars['Boolean'];
  /** The URL of the enterprise website. */
  websiteUrl?: Maybe<Scalars['GithubURI']>;
};


/** An account to manage multiple organizations with consolidated policy and billing. */
export type GithubEnterpriseAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** An account to manage multiple organizations with consolidated policy and billing. */
export type GithubEnterpriseMembersArgs = {
  organizationLogins?: Maybe<Array<Scalars['String']>>;
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubEnterpriseMemberOrder>;
  role?: Maybe<GithubEnterpriseUserAccountMembershipRole>;
  deployment?: Maybe<GithubEnterpriseUserDeployment>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account to manage multiple organizations with consolidated policy and billing. */
export type GithubEnterpriseOrganizationsArgs = {
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubOrganizationOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account to manage multiple organizations with consolidated policy and billing. */
export type GithubEnterpriseUserAccountsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for User. */
export type GithubEnterpriseAdministratorConnection = {
   __typename?: 'GithubEnterpriseAdministratorConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseAdministratorEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A User who is an administrator of an enterprise. */
export type GithubEnterpriseAdministratorEdge = {
   __typename?: 'GithubEnterpriseAdministratorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUser>;
  /** The role of the administrator. */
  role: GithubEnterpriseAdministratorRole;
};

/** An invitation for a user to become an owner or billing manager of an enterprise. */
export type GithubEnterpriseAdministratorInvitation = GithubNode & {
   __typename?: 'GithubEnterpriseAdministratorInvitation';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The email of the person who was invited to the enterprise. */
  email?: Maybe<Scalars['String']>;
  /** The enterprise the invitation is for. */
  enterprise: GithubEnterprise;
  id: Scalars['ID'];
  /** The user who was invited to the enterprise. */
  invitee?: Maybe<GithubUser>;
  /** The user who created the invitation. */
  inviter?: Maybe<GithubUser>;
  /** The invitee's pending role in the enterprise (owner or billing_manager). */
  role: GithubEnterpriseAdministratorRole;
};

/** The connection type for EnterpriseAdministratorInvitation. */
export type GithubEnterpriseAdministratorInvitationConnection = {
   __typename?: 'GithubEnterpriseAdministratorInvitationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseAdministratorInvitationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseAdministratorInvitation>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseAdministratorInvitationEdge = {
   __typename?: 'GithubEnterpriseAdministratorInvitationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseAdministratorInvitation>;
};

/** Ordering options for enterprise administrator invitation connections */
export type GithubEnterpriseAdministratorInvitationOrder = {
  /** The field to order enterprise administrator invitations by. */
  field: GithubEnterpriseAdministratorInvitationOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which enterprise administrator invitation connections can be ordered. */
export enum GithubEnterpriseAdministratorInvitationOrderField {
  /** Order enterprise administrator member invitations by creation time */
  CreatedAt = 'CREATED_AT'
}

/** The possible administrator roles in an enterprise account. */
export enum GithubEnterpriseAdministratorRole {
  /** Represents an owner of the enterprise account. */
  Owner = 'OWNER',
  /** Represents a billing manager of the enterprise account. */
  BillingManager = 'BILLING_MANAGER'
}

/** Metadata for an audit entry containing enterprise account information. */
export type GithubEnterpriseAuditEntryData = {
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
};

/** Enterprise billing information visible to enterprise billing managers and owners. */
export type GithubEnterpriseBillingInfo = {
   __typename?: 'GithubEnterpriseBillingInfo';
  /** The number of licenseable users/emails across the enterprise. */
  allLicensableUsersCount: Scalars['Int'];
  /** The number of data packs used by all organizations owned by the enterprise. */
  assetPacks: Scalars['Int'];
  /**
   * The number of available seats across all owned organizations based on the unique number of billable users.
   * @deprecated `availableSeats` will be replaced with `totalAvailableLicenses` to provide more clarity on the value being returned Use EnterpriseBillingInfo.totalAvailableLicenses instead. Removal on 2020-01-01 UTC.
   */
  availableSeats: Scalars['Int'];
  /** The bandwidth quota in GB for all organizations owned by the enterprise. */
  bandwidthQuota: Scalars['Float'];
  /** The bandwidth usage in GB for all organizations owned by the enterprise. */
  bandwidthUsage: Scalars['Float'];
  /** The bandwidth usage as a percentage of the bandwidth quota. */
  bandwidthUsagePercentage: Scalars['Int'];
  /**
   * The total seats across all organizations owned by the enterprise.
   * @deprecated `seats` will be replaced with `totalLicenses` to provide more clarity on the value being returned Use EnterpriseBillingInfo.totalLicenses instead. Removal on 2020-01-01 UTC.
   */
  seats: Scalars['Int'];
  /** The storage quota in GB for all organizations owned by the enterprise. */
  storageQuota: Scalars['Float'];
  /** The storage usage in GB for all organizations owned by the enterprise. */
  storageUsage: Scalars['Float'];
  /** The storage usage as a percentage of the storage quota. */
  storageUsagePercentage: Scalars['Int'];
  /** The number of available licenses across all owned organizations based on the unique number of billable users. */
  totalAvailableLicenses: Scalars['Int'];
  /** The total number of licenses allocated. */
  totalLicenses: Scalars['Int'];
};

/** The possible values for the enterprise default repository permission setting. */
export enum GithubEnterpriseDefaultRepositoryPermissionSettingValue {
  /** Organizations in the enterprise choose default repository permissions for their members. */
  NoPolicy = 'NO_POLICY',
  /** Organization members will be able to clone, pull, push, and add new collaborators to all organization repositories. */
  Admin = 'ADMIN',
  /** Organization members will be able to clone, pull, and push all organization repositories. */
  Write = 'WRITE',
  /** Organization members will be able to clone and pull all organization repositories. */
  Read = 'READ',
  /** Organization members will only be able to clone and pull public repositories. */
  None = 'NONE'
}

/** The possible values for an enabled/disabled enterprise setting. */
export enum GithubEnterpriseEnabledDisabledSettingValue {
  /** The setting is enabled for organizations in the enterprise. */
  Enabled = 'ENABLED',
  /** The setting is disabled for organizations in the enterprise. */
  Disabled = 'DISABLED',
  /** There is no policy set for organizations in the enterprise. */
  NoPolicy = 'NO_POLICY'
}

/** The possible values for an enabled/no policy enterprise setting. */
export enum GithubEnterpriseEnabledSettingValue {
  /** The setting is enabled for organizations in the enterprise. */
  Enabled = 'ENABLED',
  /** There is no policy set for organizations in the enterprise. */
  NoPolicy = 'NO_POLICY'
}

/** An identity provider configured to provision identities for an enterprise. */
export type GithubEnterpriseIdentityProvider = GithubNode & {
   __typename?: 'GithubEnterpriseIdentityProvider';
  /** The digest algorithm used to sign SAML requests for the identity provider. */
  digestMethod?: Maybe<GithubSamlDigestAlgorithm>;
  /** The enterprise this identity provider belongs to. */
  enterprise?: Maybe<GithubEnterprise>;
  /** ExternalIdentities provisioned by this identity provider. */
  externalIdentities: GithubExternalIdentityConnection;
  id: Scalars['ID'];
  /** The x509 certificate used by the identity provider to sign assertions and responses. */
  idpCertificate?: Maybe<Scalars['GithubX509Certificate']>;
  /** The Issuer Entity ID for the SAML identity provider. */
  issuer?: Maybe<Scalars['String']>;
  /** Recovery codes that can be used by admins to access the enterprise if the identity provider is unavailable. */
  recoveryCodes?: Maybe<Array<Scalars['String']>>;
  /** The signature algorithm used to sign SAML requests for the identity provider. */
  signatureMethod?: Maybe<GithubSamlSignatureAlgorithm>;
  /** The URL endpoint for the identity provider's SAML SSO. */
  ssoUrl?: Maybe<Scalars['GithubURI']>;
};


/** An identity provider configured to provision identities for an enterprise. */
export type GithubEnterpriseIdentityProviderExternalIdentitiesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** An object that is a member of an enterprise. */
export type GithubEnterpriseMember = GithubEnterpriseUserAccount | GithubUser;

/** The connection type for EnterpriseMember. */
export type GithubEnterpriseMemberConnection = {
   __typename?: 'GithubEnterpriseMemberConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseMemberEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseMember>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A User who is a member of an enterprise through one or more organizations. */
export type GithubEnterpriseMemberEdge = {
   __typename?: 'GithubEnterpriseMemberEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** Whether the user does not have a license for the enterprise. */
  isUnlicensed: Scalars['Boolean'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseMember>;
};

/** Ordering options for enterprise member connections. */
export type GithubEnterpriseMemberOrder = {
  /** The field to order enterprise members by. */
  field: GithubEnterpriseMemberOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which enterprise member connections can be ordered. */
export enum GithubEnterpriseMemberOrderField {
  /** Order enterprise members by login */
  Login = 'LOGIN',
  /** Order enterprise members by creation time */
  CreatedAt = 'CREATED_AT'
}

/** The possible values for the enterprise members can create repositories setting. */
export enum GithubEnterpriseMembersCanCreateRepositoriesSettingValue {
  /** Organization administrators choose whether to allow members to create repositories. */
  NoPolicy = 'NO_POLICY',
  /** Members will be able to create public and private repositories. */
  All = 'ALL',
  /** Members will be able to create only public repositories. */
  Public = 'PUBLIC',
  /** Members will be able to create only private repositories. */
  Private = 'PRIVATE',
  /** Members will not be able to create public or private repositories. */
  Disabled = 'DISABLED'
}

/** The possible values for the members can make purchases setting. */
export enum GithubEnterpriseMembersCanMakePurchasesSettingValue {
  /** The setting is enabled for organizations in the enterprise. */
  Enabled = 'ENABLED',
  /** The setting is disabled for organizations in the enterprise. */
  Disabled = 'DISABLED'
}

/** The connection type for Organization. */
export type GithubEnterpriseOrganizationMembershipConnection = {
   __typename?: 'GithubEnterpriseOrganizationMembershipConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseOrganizationMembershipEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubOrganization>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An enterprise organization that a user is a member of. */
export type GithubEnterpriseOrganizationMembershipEdge = {
   __typename?: 'GithubEnterpriseOrganizationMembershipEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubOrganization>;
  /** The role of the user in the enterprise membership. */
  role: GithubEnterpriseUserAccountMembershipRole;
};

/** The connection type for User. */
export type GithubEnterpriseOutsideCollaboratorConnection = {
   __typename?: 'GithubEnterpriseOutsideCollaboratorConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseOutsideCollaboratorEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A User who is an outside collaborator of an enterprise through one or more organizations. */
export type GithubEnterpriseOutsideCollaboratorEdge = {
   __typename?: 'GithubEnterpriseOutsideCollaboratorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** Whether the outside collaborator does not have a license for the enterprise. */
  isUnlicensed: Scalars['Boolean'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUser>;
  /** The enterprise organization repositories this user is a member of. */
  repositories: GithubEnterpriseRepositoryInfoConnection;
};


/** A User who is an outside collaborator of an enterprise through one or more organizations. */
export type GithubEnterpriseOutsideCollaboratorEdgeRepositoriesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubRepositoryOrder>;
};

/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfo = {
   __typename?: 'GithubEnterpriseOwnerInfo';
  /** A list of enterprise organizations configured with the provided action execution capabilities setting value. */
  actionExecutionCapabilitySettingOrganizations: GithubOrganizationConnection;
  /** A list of all of the administrators for this enterprise. */
  admins: GithubEnterpriseAdministratorConnection;
  /** A list of users in the enterprise who currently have two-factor authentication disabled. */
  affiliatedUsersWithTwoFactorDisabled: GithubUserConnection;
  /** Whether or not affiliated users with two-factor authentication disabled exist in the enterprise. */
  affiliatedUsersWithTwoFactorDisabledExist: Scalars['Boolean'];
  /** The setting value for whether private repository forking is enabled for repositories in organizations in this enterprise. */
  allowPrivateRepositoryForkingSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided private repository forking setting value. */
  allowPrivateRepositoryForkingSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for base repository permissions for organizations in this enterprise. */
  defaultRepositoryPermissionSetting: GithubEnterpriseDefaultRepositoryPermissionSettingValue;
  /** A list of enterprise organizations configured with the provided default repository permission. */
  defaultRepositoryPermissionSettingOrganizations: GithubOrganizationConnection;
  /** Enterprise Server installations owned by the enterprise. */
  enterpriseServerInstallations: GithubEnterpriseServerInstallationConnection;
  /** The setting value for whether the enterprise has an IP allow list enabled. */
  ipAllowListEnabledSetting: GithubIpAllowListEnabledSettingValue;
  /** The IP addresses that are allowed to access resources owned by the enterprise. */
  ipAllowListEntries: GithubIpAllowListEntryConnection;
  /** Whether or not the default repository permission is currently being updated. */
  isUpdatingDefaultRepositoryPermission: Scalars['Boolean'];
  /** Whether the two-factor authentication requirement is currently being enforced. */
  isUpdatingTwoFactorRequirement: Scalars['Boolean'];
  /**
   * The setting value for whether organization members with admin permissions on a
   * repository can change repository visibility.
   */
  membersCanChangeRepositoryVisibilitySetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided can change repository visibility setting value. */
  membersCanChangeRepositoryVisibilitySettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether members of organizations in the enterprise can create internal repositories. */
  membersCanCreateInternalRepositoriesSetting?: Maybe<Scalars['Boolean']>;
  /** The setting value for whether members of organizations in the enterprise can create private repositories. */
  membersCanCreatePrivateRepositoriesSetting?: Maybe<Scalars['Boolean']>;
  /** The setting value for whether members of organizations in the enterprise can create public repositories. */
  membersCanCreatePublicRepositoriesSetting?: Maybe<Scalars['Boolean']>;
  /** The setting value for whether members of organizations in the enterprise can create repositories. */
  membersCanCreateRepositoriesSetting?: Maybe<GithubEnterpriseMembersCanCreateRepositoriesSettingValue>;
  /** A list of enterprise organizations configured with the provided repository creation setting value. */
  membersCanCreateRepositoriesSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether members with admin permissions for repositories can delete issues. */
  membersCanDeleteIssuesSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided members can delete issues setting value. */
  membersCanDeleteIssuesSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether members with admin permissions for repositories can delete or transfer repositories. */
  membersCanDeleteRepositoriesSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided members can delete repositories setting value. */
  membersCanDeleteRepositoriesSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether members of organizations in the enterprise can invite outside collaborators. */
  membersCanInviteCollaboratorsSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided members can invite collaborators setting value. */
  membersCanInviteCollaboratorsSettingOrganizations: GithubOrganizationConnection;
  /** Indicates whether members of this enterprise's organizations can purchase additional services for those organizations. */
  membersCanMakePurchasesSetting: GithubEnterpriseMembersCanMakePurchasesSettingValue;
  /** The setting value for whether members with admin permissions for repositories can update protected branches. */
  membersCanUpdateProtectedBranchesSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided members can update protected branches setting value. */
  membersCanUpdateProtectedBranchesSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether members can view dependency insights. */
  membersCanViewDependencyInsightsSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided members can view dependency insights setting value. */
  membersCanViewDependencyInsightsSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether organization projects are enabled for organizations in this enterprise. */
  organizationProjectsSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided organization projects setting value. */
  organizationProjectsSettingOrganizations: GithubOrganizationConnection;
  /** A list of outside collaborators across the repositories in the enterprise. */
  outsideCollaborators: GithubEnterpriseOutsideCollaboratorConnection;
  /** A list of pending administrator invitations for the enterprise. */
  pendingAdminInvitations: GithubEnterpriseAdministratorInvitationConnection;
  /** A list of pending collaborators across the repositories in the enterprise. */
  pendingCollaborators: GithubEnterprisePendingCollaboratorConnection;
  /** A list of pending member invitations for organizations in the enterprise. */
  pendingMemberInvitations: GithubEnterprisePendingMemberInvitationConnection;
  /** The setting value for whether repository projects are enabled in this enterprise. */
  repositoryProjectsSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided repository projects setting value. */
  repositoryProjectsSettingOrganizations: GithubOrganizationConnection;
  /** The SAML Identity Provider for the enterprise. */
  samlIdentityProvider?: Maybe<GithubEnterpriseIdentityProvider>;
  /** A list of enterprise organizations configured with the SAML single sign-on setting value. */
  samlIdentityProviderSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether team discussions are enabled for organizations in this enterprise. */
  teamDiscussionsSetting: GithubEnterpriseEnabledDisabledSettingValue;
  /** A list of enterprise organizations configured with the provided team discussions setting value. */
  teamDiscussionsSettingOrganizations: GithubOrganizationConnection;
  /** The setting value for whether the enterprise requires two-factor authentication for its organizations and users. */
  twoFactorRequiredSetting: GithubEnterpriseEnabledSettingValue;
  /** A list of enterprise organizations configured with the two-factor authentication setting value. */
  twoFactorRequiredSettingOrganizations: GithubOrganizationConnection;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoActionExecutionCapabilitySettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoAdminsArgs = {
  query?: Maybe<Scalars['String']>;
  role?: Maybe<GithubEnterpriseAdministratorRole>;
  orderBy?: Maybe<GithubEnterpriseMemberOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoAffiliatedUsersWithTwoFactorDisabledArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoAllowPrivateRepositoryForkingSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoDefaultRepositoryPermissionSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: GithubDefaultRepositoryPermissionField;
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoEnterpriseServerInstallationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  connectedOnly?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubEnterpriseServerInstallationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoIpAllowListEntriesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubIpAllowListEntryOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanChangeRepositoryVisibilitySettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanCreateRepositoriesSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: GithubOrganizationMembersCanCreateRepositoriesSettingValue;
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanDeleteIssuesSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanDeleteRepositoriesSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanInviteCollaboratorsSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanUpdateProtectedBranchesSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoMembersCanViewDependencyInsightsSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoOrganizationProjectsSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoOutsideCollaboratorsArgs = {
  login?: Maybe<Scalars['String']>;
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubEnterpriseMemberOrder>;
  visibility?: Maybe<GithubRepositoryVisibility>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoPendingAdminInvitationsArgs = {
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubEnterpriseAdministratorInvitationOrder>;
  role?: Maybe<GithubEnterpriseAdministratorRole>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoPendingCollaboratorsArgs = {
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubRepositoryInvitationOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoPendingMemberInvitationsArgs = {
  query?: Maybe<Scalars['String']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoRepositoryProjectsSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoSamlIdentityProviderSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: GithubIdentityProviderConfigurationState;
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoTeamDiscussionsSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};


/** Enterprise information only visible to enterprise owners. */
export type GithubEnterpriseOwnerInfoTwoFactorRequiredSettingOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  value: Scalars['Boolean'];
  orderBy?: Maybe<GithubOrganizationOrder>;
};

/** The connection type for User. */
export type GithubEnterprisePendingCollaboratorConnection = {
   __typename?: 'GithubEnterprisePendingCollaboratorConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterprisePendingCollaboratorEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A user with an invitation to be a collaborator on a repository owned by an organization in an enterprise. */
export type GithubEnterprisePendingCollaboratorEdge = {
   __typename?: 'GithubEnterprisePendingCollaboratorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** Whether the invited collaborator does not have a license for the enterprise. */
  isUnlicensed: Scalars['Boolean'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUser>;
  /** The enterprise organization repositories this user is a member of. */
  repositories: GithubEnterpriseRepositoryInfoConnection;
};


/** A user with an invitation to be a collaborator on a repository owned by an organization in an enterprise. */
export type GithubEnterprisePendingCollaboratorEdgeRepositoriesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubRepositoryOrder>;
};

/** The connection type for OrganizationInvitation. */
export type GithubEnterprisePendingMemberInvitationConnection = {
   __typename?: 'GithubEnterprisePendingMemberInvitationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterprisePendingMemberInvitationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubOrganizationInvitation>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** Identifies the total count of unique users in the connection. */
  totalUniqueUserCount: Scalars['Int'];
};

/** An invitation to be a member in an enterprise organization. */
export type GithubEnterprisePendingMemberInvitationEdge = {
   __typename?: 'GithubEnterprisePendingMemberInvitationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** Whether the invitation has a license for the enterprise. */
  isUnlicensed: Scalars['Boolean'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubOrganizationInvitation>;
};

/** A subset of repository information queryable from an enterprise. */
export type GithubEnterpriseRepositoryInfo = GithubNode & {
   __typename?: 'GithubEnterpriseRepositoryInfo';
  id: Scalars['ID'];
  /** Identifies if the repository is private. */
  isPrivate: Scalars['Boolean'];
  /** The repository's name. */
  name: Scalars['String'];
  /** The repository's name with owner. */
  nameWithOwner: Scalars['String'];
};

/** The connection type for EnterpriseRepositoryInfo. */
export type GithubEnterpriseRepositoryInfoConnection = {
   __typename?: 'GithubEnterpriseRepositoryInfoConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseRepositoryInfoEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseRepositoryInfo>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseRepositoryInfoEdge = {
   __typename?: 'GithubEnterpriseRepositoryInfoEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseRepositoryInfo>;
};

/** An Enterprise Server installation. */
export type GithubEnterpriseServerInstallation = GithubNode & {
   __typename?: 'GithubEnterpriseServerInstallation';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The customer name to which the Enterprise Server installation belongs. */
  customerName: Scalars['String'];
  /** The host name of the Enterprise Server installation. */
  hostName: Scalars['String'];
  id: Scalars['ID'];
  /** Whether or not the installation is connected to an Enterprise Server installation via GitHub Connect. */
  isConnected: Scalars['Boolean'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** User accounts on this Enterprise Server installation. */
  userAccounts: GithubEnterpriseServerUserAccountConnection;
  /** User accounts uploads for the Enterprise Server installation. */
  userAccountsUploads: GithubEnterpriseServerUserAccountsUploadConnection;
};


/** An Enterprise Server installation. */
export type GithubEnterpriseServerInstallationUserAccountsArgs = {
  orderBy?: Maybe<GithubEnterpriseServerUserAccountOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Enterprise Server installation. */
export type GithubEnterpriseServerInstallationUserAccountsUploadsArgs = {
  orderBy?: Maybe<GithubEnterpriseServerUserAccountsUploadOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for EnterpriseServerInstallation. */
export type GithubEnterpriseServerInstallationConnection = {
   __typename?: 'GithubEnterpriseServerInstallationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseServerInstallationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseServerInstallation>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseServerInstallationEdge = {
   __typename?: 'GithubEnterpriseServerInstallationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseServerInstallation>;
};

/** Ordering options for Enterprise Server installation connections. */
export type GithubEnterpriseServerInstallationOrder = {
  /** The field to order Enterprise Server installations by. */
  field: GithubEnterpriseServerInstallationOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which Enterprise Server installation connections can be ordered. */
export enum GithubEnterpriseServerInstallationOrderField {
  /** Order Enterprise Server installations by host name */
  HostName = 'HOST_NAME',
  /** Order Enterprise Server installations by customer name */
  CustomerName = 'CUSTOMER_NAME',
  /** Order Enterprise Server installations by creation time */
  CreatedAt = 'CREATED_AT'
}

/** A user account on an Enterprise Server installation. */
export type GithubEnterpriseServerUserAccount = GithubNode & {
   __typename?: 'GithubEnterpriseServerUserAccount';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** User emails belonging to this user account. */
  emails: GithubEnterpriseServerUserAccountEmailConnection;
  /** The Enterprise Server installation on which this user account exists. */
  enterpriseServerInstallation: GithubEnterpriseServerInstallation;
  id: Scalars['ID'];
  /** Whether the user account is a site administrator on the Enterprise Server installation. */
  isSiteAdmin: Scalars['Boolean'];
  /** The login of the user account on the Enterprise Server installation. */
  login: Scalars['String'];
  /** The profile name of the user account on the Enterprise Server installation. */
  profileName?: Maybe<Scalars['String']>;
  /** The date and time when the user account was created on the Enterprise Server installation. */
  remoteCreatedAt: Scalars['GithubDateTime'];
  /** The ID of the user account on the Enterprise Server installation. */
  remoteUserId: Scalars['Int'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};


/** A user account on an Enterprise Server installation. */
export type GithubEnterpriseServerUserAccountEmailsArgs = {
  orderBy?: Maybe<GithubEnterpriseServerUserAccountEmailOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for EnterpriseServerUserAccount. */
export type GithubEnterpriseServerUserAccountConnection = {
   __typename?: 'GithubEnterpriseServerUserAccountConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccountEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccount>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseServerUserAccountEdge = {
   __typename?: 'GithubEnterpriseServerUserAccountEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseServerUserAccount>;
};

/** An email belonging to a user account on an Enterprise Server installation. */
export type GithubEnterpriseServerUserAccountEmail = GithubNode & {
   __typename?: 'GithubEnterpriseServerUserAccountEmail';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The email address. */
  email: Scalars['String'];
  id: Scalars['ID'];
  /** Indicates whether this is the primary email of the associated user account. */
  isPrimary: Scalars['Boolean'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The user account to which the email belongs. */
  userAccount: GithubEnterpriseServerUserAccount;
};

/** The connection type for EnterpriseServerUserAccountEmail. */
export type GithubEnterpriseServerUserAccountEmailConnection = {
   __typename?: 'GithubEnterpriseServerUserAccountEmailConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccountEmailEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccountEmail>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseServerUserAccountEmailEdge = {
   __typename?: 'GithubEnterpriseServerUserAccountEmailEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseServerUserAccountEmail>;
};

/** Ordering options for Enterprise Server user account email connections. */
export type GithubEnterpriseServerUserAccountEmailOrder = {
  /** The field to order emails by. */
  field: GithubEnterpriseServerUserAccountEmailOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which Enterprise Server user account email connections can be ordered. */
export enum GithubEnterpriseServerUserAccountEmailOrderField {
  /** Order emails by email */
  Email = 'EMAIL'
}

/** Ordering options for Enterprise Server user account connections. */
export type GithubEnterpriseServerUserAccountOrder = {
  /** The field to order user accounts by. */
  field: GithubEnterpriseServerUserAccountOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which Enterprise Server user account connections can be ordered. */
export enum GithubEnterpriseServerUserAccountOrderField {
  /** Order user accounts by login */
  Login = 'LOGIN',
  /** Order user accounts by creation time on the Enterprise Server installation */
  RemoteCreatedAt = 'REMOTE_CREATED_AT'
}

/** A user accounts upload from an Enterprise Server installation. */
export type GithubEnterpriseServerUserAccountsUpload = GithubNode & {
   __typename?: 'GithubEnterpriseServerUserAccountsUpload';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The enterprise to which this upload belongs. */
  enterprise: GithubEnterprise;
  /** The Enterprise Server installation for which this upload was generated. */
  enterpriseServerInstallation: GithubEnterpriseServerInstallation;
  id: Scalars['ID'];
  /** The name of the file uploaded. */
  name: Scalars['String'];
  /** The synchronization state of the upload */
  syncState: GithubEnterpriseServerUserAccountsUploadSyncState;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** The connection type for EnterpriseServerUserAccountsUpload. */
export type GithubEnterpriseServerUserAccountsUploadConnection = {
   __typename?: 'GithubEnterpriseServerUserAccountsUploadConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccountsUploadEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseServerUserAccountsUpload>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseServerUserAccountsUploadEdge = {
   __typename?: 'GithubEnterpriseServerUserAccountsUploadEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseServerUserAccountsUpload>;
};

/** Ordering options for Enterprise Server user accounts upload connections. */
export type GithubEnterpriseServerUserAccountsUploadOrder = {
  /** The field to order user accounts uploads by. */
  field: GithubEnterpriseServerUserAccountsUploadOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which Enterprise Server user accounts upload connections can be ordered. */
export enum GithubEnterpriseServerUserAccountsUploadOrderField {
  /** Order user accounts uploads by creation time */
  CreatedAt = 'CREATED_AT'
}

/** Synchronization state of the Enterprise Server user accounts upload */
export enum GithubEnterpriseServerUserAccountsUploadSyncState {
  /** The synchronization of the upload is pending. */
  Pending = 'PENDING',
  /** The synchronization of the upload succeeded. */
  Success = 'SUCCESS',
  /** The synchronization of the upload failed. */
  Failure = 'FAILURE'
}

/** An account for a user who is an admin of an enterprise or a member of an enterprise through one or more organizations. */
export type GithubEnterpriseUserAccount = GithubNode & GithubActor & {
   __typename?: 'GithubEnterpriseUserAccount';
  /** A URL pointing to the enterprise user account's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The enterprise in which this user account exists. */
  enterprise: GithubEnterprise;
  id: Scalars['ID'];
  /** An identifier for the enterprise user account, a login or email address */
  login: Scalars['String'];
  /** The name of the enterprise user account */
  name?: Maybe<Scalars['String']>;
  /** A list of enterprise organizations this user is a member of. */
  organizations: GithubEnterpriseOrganizationMembershipConnection;
  /** The HTTP path for this user. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this user. */
  url: Scalars['GithubURI'];
  /** The user within the enterprise. */
  user?: Maybe<GithubUser>;
};


/** An account for a user who is an admin of an enterprise or a member of an enterprise through one or more organizations. */
export type GithubEnterpriseUserAccountAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** An account for a user who is an admin of an enterprise or a member of an enterprise through one or more organizations. */
export type GithubEnterpriseUserAccountOrganizationsArgs = {
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubOrganizationOrder>;
  role?: Maybe<GithubEnterpriseUserAccountMembershipRole>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for EnterpriseUserAccount. */
export type GithubEnterpriseUserAccountConnection = {
   __typename?: 'GithubEnterpriseUserAccountConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubEnterpriseUserAccountEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubEnterpriseUserAccount>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubEnterpriseUserAccountEdge = {
   __typename?: 'GithubEnterpriseUserAccountEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubEnterpriseUserAccount>;
};

/** The possible roles for enterprise membership. */
export enum GithubEnterpriseUserAccountMembershipRole {
  /** The user is a member of the enterprise membership. */
  Member = 'MEMBER',
  /** The user is an owner of the enterprise membership. */
  Owner = 'OWNER'
}

/** The possible GitHub Enterprise deployments where this user can exist. */
export enum GithubEnterpriseUserDeployment {
  /** The user is part of a GitHub Enterprise Cloud deployment. */
  Cloud = 'CLOUD',
  /** The user is part of a GitHub Enterprise Server deployment. */
  Server = 'SERVER'
}

/** An external identity provisioned by SAML SSO or SCIM. */
export type GithubExternalIdentity = GithubNode & {
   __typename?: 'GithubExternalIdentity';
  /** The GUID for this identity */
  guid: Scalars['String'];
  id: Scalars['ID'];
  /** Organization invitation for this SCIM-provisioned external identity */
  organizationInvitation?: Maybe<GithubOrganizationInvitation>;
  /** SAML Identity attributes */
  samlIdentity?: Maybe<GithubExternalIdentitySamlAttributes>;
  /** SCIM Identity attributes */
  scimIdentity?: Maybe<GithubExternalIdentityScimAttributes>;
  /** User linked to this external identity. Will be NULL if this identity has not been claimed by an organization member. */
  user?: Maybe<GithubUser>;
};

/** The connection type for ExternalIdentity. */
export type GithubExternalIdentityConnection = {
   __typename?: 'GithubExternalIdentityConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubExternalIdentityEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubExternalIdentity>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubExternalIdentityEdge = {
   __typename?: 'GithubExternalIdentityEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubExternalIdentity>;
};

/** SAML attributes for the External Identity */
export type GithubExternalIdentitySamlAttributes = {
   __typename?: 'GithubExternalIdentitySamlAttributes';
  /** The NameID of the SAML identity */
  nameId?: Maybe<Scalars['String']>;
};

/** SCIM attributes for the External Identity */
export type GithubExternalIdentityScimAttributes = {
   __typename?: 'GithubExternalIdentityScimAttributes';
  /** The userName of the SCIM identity */
  username?: Maybe<Scalars['String']>;
};

/** The connection type for User. */
export type GithubFollowerConnection = {
   __typename?: 'GithubFollowerConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubUserEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** The connection type for User. */
export type GithubFollowingConnection = {
   __typename?: 'GithubFollowingConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubUserEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Autogenerated input type of FollowUser */
export type GithubFollowUserInput = {
  /** ID of the user to follow. */
  userId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of FollowUser */
export type GithubFollowUserPayload = {
   __typename?: 'GithubFollowUserPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The user that was followed. */
  user?: Maybe<GithubUser>;
};

/** A funding platform link for a repository. */
export type GithubFundingLink = {
   __typename?: 'GithubFundingLink';
  /** The funding platform this link is for. */
  platform: GithubFundingPlatform;
  /** The configured URL for this funding link. */
  url: Scalars['GithubURI'];
};

/** The possible funding platforms for repository funding links. */
export enum GithubFundingPlatform {
  /** GitHub funding platform. */
  Github = 'GITHUB',
  /** Patreon funding platform. */
  Patreon = 'PATREON',
  /** Open Collective funding platform. */
  OpenCollective = 'OPEN_COLLECTIVE',
  /** Ko-fi funding platform. */
  KoFi = 'KO_FI',
  /** Tidelift funding platform. */
  Tidelift = 'TIDELIFT',
  /** Community Bridge funding platform. */
  CommunityBridge = 'COMMUNITY_BRIDGE',
  /** Liberapay funding platform. */
  Liberapay = 'LIBERAPAY',
  /** IssueHunt funding platform. */
  Issuehunt = 'ISSUEHUNT',
  /** Otechie funding platform. */
  Otechie = 'OTECHIE',
  /** Custom funding platform. */
  Custom = 'CUSTOM'
}

/** A generic hovercard context with a message and icon */
export type GithubGenericHovercardContext = GithubHovercardContext & {
   __typename?: 'GithubGenericHovercardContext';
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
};

/** A Gist. */
export type GithubGist = GithubNode & GithubStarrable & GithubUniformResourceLocatable & {
   __typename?: 'GithubGist';
  /** A list of comments associated with the gist */
  comments: GithubGistCommentConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The gist description. */
  description?: Maybe<Scalars['String']>;
  /** The files in this gist. */
  files?: Maybe<Array<Maybe<GithubGistFile>>>;
  /** A list of forks associated with the gist */
  forks: GithubGistConnection;
  id: Scalars['ID'];
  /** Identifies if the gist is a fork. */
  isFork: Scalars['Boolean'];
  /** Whether the gist is public or not. */
  isPublic: Scalars['Boolean'];
  /** The gist name. */
  name: Scalars['String'];
  /** The gist owner. */
  owner?: Maybe<GithubRepositoryOwner>;
  /** Identifies when the gist was last pushed to. */
  pushedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The HTML path to this resource. */
  resourcePath: Scalars['GithubURI'];
  /** A list of users who have starred this starrable. */
  stargazers: GithubStargazerConnection;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this Gist. */
  url: Scalars['GithubURI'];
  /** Returns a boolean indicating whether the viewing user has starred this starrable. */
  viewerHasStarred: Scalars['Boolean'];
};


/** A Gist. */
export type GithubGistCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A Gist. */
export type GithubGistFilesArgs = {
  limit?: Maybe<Scalars['Int']>;
  oid?: Maybe<Scalars['GithubGitObjectID']>;
};


/** A Gist. */
export type GithubGistForksArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubGistOrder>;
};


/** A Gist. */
export type GithubGistStargazersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubStarOrder>;
};

/** Represents a comment on an Gist. */
export type GithubGistComment = GithubNode & GithubComment & GithubDeletable & GithubUpdatable & GithubUpdatableComment & {
   __typename?: 'GithubGistComment';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the gist. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** Identifies the comment body. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  /** The associated gist. */
  gist: GithubGist;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** Returns whether or not a comment has been minimized. */
  isMinimized: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Returns why the comment was minimized. */
  minimizedReason?: Maybe<Scalars['String']>;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Check if the current viewer can minimize this object. */
  viewerCanMinimize: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** Represents a comment on an Gist. */
export type GithubGistCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for GistComment. */
export type GithubGistCommentConnection = {
   __typename?: 'GithubGistCommentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubGistCommentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubGistComment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubGistCommentEdge = {
   __typename?: 'GithubGistCommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubGistComment>;
};

/** The connection type for Gist. */
export type GithubGistConnection = {
   __typename?: 'GithubGistConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubGistEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubGist>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubGistEdge = {
   __typename?: 'GithubGistEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubGist>;
};

/** A file in a gist. */
export type GithubGistFile = {
   __typename?: 'GithubGistFile';
  /** The file name encoded to remove characters that are invalid in URL paths. */
  encodedName?: Maybe<Scalars['String']>;
  /** The gist file encoding. */
  encoding?: Maybe<Scalars['String']>;
  /** The file extension from the file name. */
  extension?: Maybe<Scalars['String']>;
  /** Indicates if this file is an image. */
  isImage: Scalars['Boolean'];
  /** Whether the file's contents were truncated. */
  isTruncated: Scalars['Boolean'];
  /** The programming language this file is written in. */
  language?: Maybe<GithubLanguage>;
  /** The gist file name. */
  name?: Maybe<Scalars['String']>;
  /** The gist file size in bytes. */
  size?: Maybe<Scalars['Int']>;
  /** UTF8 text data or null if the file is binary */
  text?: Maybe<Scalars['String']>;
};


/** A file in a gist. */
export type GithubGistFileTextArgs = {
  truncate?: Maybe<Scalars['Int']>;
};

/** Ordering options for gist connections */
export type GithubGistOrder = {
  /** The field to order repositories by. */
  field: GithubGistOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which gist connections can be ordered. */
export enum GithubGistOrderField {
  /** Order gists by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order gists by update time */
  UpdatedAt = 'UPDATED_AT',
  /** Order gists by push time */
  PushedAt = 'PUSHED_AT'
}

/** The privacy of a Gist */
export enum GithubGistPrivacy {
  /** Public */
  Public = 'PUBLIC',
  /** Secret */
  Secret = 'SECRET',
  /** Gists that are public and secret */
  All = 'ALL'
}

/** Represents an actor in a Git commit (ie. an author or committer). */
export type GithubGitActor = {
   __typename?: 'GithubGitActor';
  /** A URL pointing to the author's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** The timestamp of the Git action (authoring or committing). */
  date?: Maybe<Scalars['GithubGitTimestamp']>;
  /** The email in the Git commit. */
  email?: Maybe<Scalars['String']>;
  /** The name in the Git commit. */
  name?: Maybe<Scalars['String']>;
  /** The GitHub user corresponding to the email field. Null if no such user exists. */
  user?: Maybe<GithubUser>;
};


/** Represents an actor in a Git commit (ie. an author or committer). */
export type GithubGitActorAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** Represents information about the GitHub instance. */
export type GithubGitHubMetadata = {
   __typename?: 'GithubGitHubMetadata';
  /** Returns a String that's a SHA of `github-services` */
  gitHubServicesSha: Scalars['GithubGitObjectID'];
  /** IP addresses that users connect to for git operations */
  gitIpAddresses?: Maybe<Array<Scalars['String']>>;
  /** IP addresses that service hooks are sent from */
  hookIpAddresses?: Maybe<Array<Scalars['String']>>;
  /** IP addresses that the importer connects from */
  importerIpAddresses?: Maybe<Array<Scalars['String']>>;
  /** Whether or not users are verified */
  isPasswordAuthenticationVerifiable: Scalars['Boolean'];
  /** IP addresses for GitHub Pages' A records */
  pagesIpAddresses?: Maybe<Array<Scalars['String']>>;
};

/** Represents a Git object. */
export type GithubGitObject = {
  /** An abbreviated version of the Git object ID */
  abbreviatedOid: Scalars['String'];
  /** The HTTP path for this Git object */
  commitResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this Git object */
  commitUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** The Git object ID */
  oid: Scalars['GithubGitObjectID'];
  /** The Repository the Git object belongs to */
  repository: GithubRepository;
};


/** Information about a signature (GPG or S/MIME) on a Commit or Tag. */
export type GithubGitSignature = {
  /** Email used to sign this object. */
  email: Scalars['String'];
  /** True if the signature is valid and verified by GitHub. */
  isValid: Scalars['Boolean'];
  /** Payload for GPG signing object. Raw ODB object without the signature header. */
  payload: Scalars['String'];
  /** ASCII-armored signature header from object. */
  signature: Scalars['String'];
  /** GitHub user corresponding to the email signing this commit. */
  signer?: Maybe<GithubUser>;
  /**
   * The state of this signature. `VALID` if signature is valid and verified by
   * GitHub, otherwise represents reason why signature is considered invalid.
   */
  state: GithubGitSignatureState;
  /** True if the signature was made with GitHub's signing key. */
  wasSignedByGitHub: Scalars['Boolean'];
};

/** The state of a Git signature. */
export enum GithubGitSignatureState {
  /** Valid signature and verified by GitHub */
  Valid = 'VALID',
  /** Invalid signature */
  Invalid = 'INVALID',
  /** Malformed signature */
  MalformedSig = 'MALFORMED_SIG',
  /** Key used for signing not known to GitHub */
  UnknownKey = 'UNKNOWN_KEY',
  /** Invalid email used for signing */
  BadEmail = 'BAD_EMAIL',
  /** Email used for signing unverified on GitHub */
  UnverifiedEmail = 'UNVERIFIED_EMAIL',
  /** Email used for signing not known to GitHub */
  NoUser = 'NO_USER',
  /** Unknown signature type */
  UnknownSigType = 'UNKNOWN_SIG_TYPE',
  /** Unsigned */
  Unsigned = 'UNSIGNED',
  /** Internal error - the GPG verification service is unavailable at the moment */
  GpgverifyUnavailable = 'GPGVERIFY_UNAVAILABLE',
  /** Internal error - the GPG verification service misbehaved */
  GpgverifyError = 'GPGVERIFY_ERROR',
  /** The usage flags for the key that signed this don't allow signing */
  NotSigningKey = 'NOT_SIGNING_KEY',
  /** Signing key expired */
  ExpiredKey = 'EXPIRED_KEY',
  /** Valid signature, pending certificate revocation checking */
  OcspPending = 'OCSP_PENDING',
  /** Valid siganture, though certificate revocation check failed */
  OcspError = 'OCSP_ERROR',
  /** The signing certificate or its chain could not be verified */
  BadCert = 'BAD_CERT',
  /** One or more certificates in chain has been revoked */
  OcspRevoked = 'OCSP_REVOKED'
}



/** Represents a GPG signature on a Commit or Tag. */
export type GithubGpgSignature = GithubGitSignature & {
   __typename?: 'GithubGpgSignature';
  /** Email used to sign this object. */
  email: Scalars['String'];
  /** True if the signature is valid and verified by GitHub. */
  isValid: Scalars['Boolean'];
  /** Hex-encoded ID of the key that signed this object. */
  keyId?: Maybe<Scalars['String']>;
  /** Payload for GPG signing object. Raw ODB object without the signature header. */
  payload: Scalars['String'];
  /** ASCII-armored signature header from object. */
  signature: Scalars['String'];
  /** GitHub user corresponding to the email signing this commit. */
  signer?: Maybe<GithubUser>;
  /**
   * The state of this signature. `VALID` if signature is valid and verified by
   * GitHub, otherwise represents reason why signature is considered invalid.
   */
  state: GithubGitSignatureState;
  /** True if the signature was made with GitHub's signing key. */
  wasSignedByGitHub: Scalars['Boolean'];
};

/** Represents a 'head_ref_deleted' event on a given pull request. */
export type GithubHeadRefDeletedEvent = GithubNode & {
   __typename?: 'GithubHeadRefDeletedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the Ref associated with the `head_ref_deleted` event. */
  headRef?: Maybe<GithubRef>;
  /** Identifies the name of the Ref associated with the `head_ref_deleted` event. */
  headRefName: Scalars['String'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
};

/** Represents a 'head_ref_force_pushed' event on a given pull request. */
export type GithubHeadRefForcePushedEvent = GithubNode & {
   __typename?: 'GithubHeadRefForcePushedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the after commit SHA for the 'head_ref_force_pushed' event. */
  afterCommit?: Maybe<GithubCommit>;
  /** Identifies the before commit SHA for the 'head_ref_force_pushed' event. */
  beforeCommit?: Maybe<GithubCommit>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** Identifies the fully qualified ref name for the 'head_ref_force_pushed' event. */
  ref?: Maybe<GithubRef>;
};

/** Represents a 'head_ref_restored' event on a given pull request. */
export type GithubHeadRefRestoredEvent = GithubNode & {
   __typename?: 'GithubHeadRefRestoredEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
};

/** Detail needed to display a hovercard for a user */
export type GithubHovercard = {
   __typename?: 'GithubHovercard';
  /** Each of the contexts for this hovercard */
  contexts: Array<GithubHovercardContext>;
};

/** An individual line of a hovercard */
export type GithubHovercardContext = {
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
};


/** The possible states in which authentication can be configured with an identity provider. */
export enum GithubIdentityProviderConfigurationState {
  /** Authentication with an identity provider is configured and enforced. */
  Enforced = 'ENFORCED',
  /** Authentication with an identity provider is configured but not enforced. */
  Configured = 'CONFIGURED',
  /** Authentication with an identity provider is not configured. */
  Unconfigured = 'UNCONFIGURED'
}

/** Autogenerated input type of InviteEnterpriseAdmin */
export type GithubInviteEnterpriseAdminInput = {
  /** The ID of the enterprise to which you want to invite an administrator. */
  enterpriseId: Scalars['ID'];
  /** The login of a user to invite as an administrator. */
  invitee?: Maybe<Scalars['String']>;
  /** The email of the person to invite as an administrator. */
  email?: Maybe<Scalars['String']>;
  /** The role of the administrator. */
  role?: Maybe<GithubEnterpriseAdministratorRole>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of InviteEnterpriseAdmin */
export type GithubInviteEnterpriseAdminPayload = {
   __typename?: 'GithubInviteEnterpriseAdminPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The created enterprise administrator invitation. */
  invitation?: Maybe<GithubEnterpriseAdministratorInvitation>;
};

/** The possible values for the IP allow list enabled setting. */
export enum GithubIpAllowListEnabledSettingValue {
  /** The setting is enabled for the owner. */
  Enabled = 'ENABLED',
  /** The setting is disabled for the owner. */
  Disabled = 'DISABLED'
}

/** An IP address or range of addresses that is allowed to access an owner's resources. */
export type GithubIpAllowListEntry = GithubNode & {
   __typename?: 'GithubIpAllowListEntry';
  /** A single IP address or range of IP addresses in CIDR notation. */
  allowListValue: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Whether the entry is currently active. */
  isActive: Scalars['Boolean'];
  /** The name of the IP allow list entry. */
  name?: Maybe<Scalars['String']>;
  /** The owner of the IP allow list entry. */
  owner: GithubIpAllowListOwner;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** The connection type for IpAllowListEntry. */
export type GithubIpAllowListEntryConnection = {
   __typename?: 'GithubIpAllowListEntryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubIpAllowListEntryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubIpAllowListEntry>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubIpAllowListEntryEdge = {
   __typename?: 'GithubIpAllowListEntryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubIpAllowListEntry>;
};

/** Ordering options for IP allow list entry connections. */
export type GithubIpAllowListEntryOrder = {
  /** The field to order IP allow list entries by. */
  field: GithubIpAllowListEntryOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which IP allow list entry connections can be ordered. */
export enum GithubIpAllowListEntryOrderField {
  /** Order IP allow list entries by creation time. */
  CreatedAt = 'CREATED_AT',
  /** Order IP allow list entries by the allow list value. */
  AllowListValue = 'ALLOW_LIST_VALUE'
}

/** Types that can own an IP allow list. */
export type GithubIpAllowListOwner = GithubEnterprise | GithubOrganization;

/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssue = GithubNode & GithubAssignable & GithubClosable & GithubComment & GithubUpdatable & GithubUpdatableComment & GithubLabelable & GithubLockable & GithubReactable & GithubRepositoryNode & GithubSubscribable & GithubUniformResourceLocatable & {
   __typename?: 'GithubIssue';
  /** Reason that the conversation was locked. */
  activeLockReason?: Maybe<GithubLockReason>;
  /** A list of Users assigned to this object. */
  assignees: GithubUserConnection;
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** Identifies the body of the issue. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** Identifies the body of the issue rendered to text. */
  bodyText: Scalars['String'];
  /** `true` if the object is closed (definition of closed may depend on type) */
  closed: Scalars['Boolean'];
  /** Identifies the date and time when the object was closed. */
  closedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of comments associated with the Issue. */
  comments: GithubIssueCommentConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  /** The hovercard information for this issue */
  hovercard: GithubHovercard;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** A list of labels associated with the object. */
  labels?: Maybe<GithubLabelConnection>;
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** `true` if the object is locked */
  locked: Scalars['Boolean'];
  /** Identifies the milestone associated with the issue. */
  milestone?: Maybe<GithubMilestone>;
  /** Identifies the issue number. */
  number: Scalars['Int'];
  /** A list of Users that are participating in the Issue conversation. */
  participants: GithubUserConnection;
  /** List of project cards associated with this issue. */
  projectCards: GithubProjectCardConnection;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path for this issue */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the state of the issue. */
  state: GithubIssueState;
  /**
   * A list of events, comments, commits, etc. associated with the issue.
   * @deprecated `timeline` will be removed Use Issue.timelineItems instead. Removal on 2019-10-01 UTC.
   */
  timeline: GithubIssueTimelineConnection;
  /** A list of events, comments, commits, etc. associated with the issue. */
  timelineItems: GithubIssueTimelineItemsConnection;
  /** Identifies the issue title. */
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this issue */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueAssigneesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueHovercardArgs = {
  includeNotificationContexts?: Maybe<Scalars['Boolean']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueLabelsArgs = {
  orderBy?: Maybe<GithubLabelOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueParticipantsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueProjectCardsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  archivedStates?: Maybe<Array<Maybe<GithubProjectCardArchivedState>>>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueTimelineArgs = {
  since?: Maybe<Scalars['GithubDateTime']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueTimelineItemsArgs = {
  since?: Maybe<Scalars['GithubDateTime']>;
  skip?: Maybe<Scalars['Int']>;
  itemTypes?: Maybe<Array<GithubIssueTimelineItemsItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project. */
export type GithubIssueUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Represents a comment on an Issue. */
export type GithubIssueComment = GithubNode & GithubComment & GithubDeletable & GithubUpdatable & GithubUpdatableComment & GithubReactable & GithubRepositoryNode & {
   __typename?: 'GithubIssueComment';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** The body as Markdown. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** Returns whether or not a comment has been minimized. */
  isMinimized: Scalars['Boolean'];
  /** Identifies the issue associated with the comment. */
  issue: GithubIssue;
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Returns why the comment was minimized. */
  minimizedReason?: Maybe<Scalars['String']>;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /**
   * Returns the pull request associated with the comment, if this comment was made on a
   * pull request.
   */
  pullRequest?: Maybe<GithubPullRequest>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path for this issue comment */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this issue comment */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Check if the current viewer can minimize this object. */
  viewerCanMinimize: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** Represents a comment on an Issue. */
export type GithubIssueCommentReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** Represents a comment on an Issue. */
export type GithubIssueCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for IssueComment. */
export type GithubIssueCommentConnection = {
   __typename?: 'GithubIssueCommentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubIssueCommentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubIssueComment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubIssueCommentEdge = {
   __typename?: 'GithubIssueCommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubIssueComment>;
};

/** The connection type for Issue. */
export type GithubIssueConnection = {
   __typename?: 'GithubIssueConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubIssueEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubIssue>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** This aggregates issues opened by a user within one repository. */
export type GithubIssueContributionsByRepository = {
   __typename?: 'GithubIssueContributionsByRepository';
  /** The issue contributions. */
  contributions: GithubCreatedIssueContributionConnection;
  /** The repository in which the issues were opened. */
  repository: GithubRepository;
};


/** This aggregates issues opened by a user within one repository. */
export type GithubIssueContributionsByRepositoryContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubContributionOrder>;
};

/** An edge in a connection. */
export type GithubIssueEdge = {
   __typename?: 'GithubIssueEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubIssue>;
};

/** Ways in which to filter lists of issues. */
export type GithubIssueFilters = {
  /**
   * List issues assigned to given name. Pass in `null` for issues with no assigned
   * user, and `*` for issues assigned to any user.
   */
  assignee?: Maybe<Scalars['String']>;
  /** List issues created by given name. */
  createdBy?: Maybe<Scalars['String']>;
  /** List issues where the list of label names exist on the issue. */
  labels?: Maybe<Array<Scalars['String']>>;
  /** List issues where the given name is mentioned in the issue. */
  mentioned?: Maybe<Scalars['String']>;
  /**
   * List issues by given milestone argument. If an string representation of an
   * integer is passed, it should refer to a milestone by its number field. Pass in
   * `null` for issues with no milestone, and `*` for issues that are assigned to any milestone.
   */
  milestone?: Maybe<Scalars['String']>;
  /** List issues that have been updated at or after the given date. */
  since?: Maybe<Scalars['GithubDateTime']>;
  /** List issues filtered by the list of states given. */
  states?: Maybe<Array<GithubIssueState>>;
  /** List issues subscribed to by viewer. */
  viewerSubscribed?: Maybe<Scalars['Boolean']>;
};

/** Ways in which lists of issues can be ordered upon return. */
export type GithubIssueOrder = {
  /** The field in which to order issues by. */
  field: GithubIssueOrderField;
  /** The direction in which to order issues by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which issue connections can be ordered. */
export enum GithubIssueOrderField {
  /** Order issues by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order issues by update time */
  UpdatedAt = 'UPDATED_AT',
  /** Order issues by comment count */
  Comments = 'COMMENTS'
}

/** Used for return value of Repository.issueOrPullRequest. */
export type GithubIssueOrPullRequest = GithubIssue | GithubPullRequest;

/** The possible states of an issue. */
export enum GithubIssueState {
  /** An issue that is still open */
  Open = 'OPEN',
  /** An issue that has been closed */
  Closed = 'CLOSED'
}

/** The connection type for IssueTimelineItem. */
export type GithubIssueTimelineConnection = {
   __typename?: 'GithubIssueTimelineConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubIssueTimelineItemEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubIssueTimelineItem>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An item in an issue timeline */
export type GithubIssueTimelineItem = GithubAssignedEvent | GithubClosedEvent | GithubCommit | GithubCrossReferencedEvent | GithubDemilestonedEvent | GithubIssueComment | GithubLabeledEvent | GithubLockedEvent | GithubMilestonedEvent | GithubReferencedEvent | GithubRenamedTitleEvent | GithubReopenedEvent | GithubSubscribedEvent | GithubTransferredEvent | GithubUnassignedEvent | GithubUnlabeledEvent | GithubUnlockedEvent | GithubUnsubscribedEvent | GithubUserBlockedEvent;

/** An edge in a connection. */
export type GithubIssueTimelineItemEdge = {
   __typename?: 'GithubIssueTimelineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubIssueTimelineItem>;
};

/** An item in an issue timeline */
export type GithubIssueTimelineItems = GithubAddedToProjectEvent | GithubAssignedEvent | GithubClosedEvent | GithubCommentDeletedEvent | GithubConnectedEvent | GithubConvertedNoteToIssueEvent | GithubCrossReferencedEvent | GithubDemilestonedEvent | GithubDisconnectedEvent | GithubIssueComment | GithubLabeledEvent | GithubLockedEvent | GithubMarkedAsDuplicateEvent | GithubMentionedEvent | GithubMilestonedEvent | GithubMovedColumnsInProjectEvent | GithubPinnedEvent | GithubReferencedEvent | GithubRemovedFromProjectEvent | GithubRenamedTitleEvent | GithubReopenedEvent | GithubSubscribedEvent | GithubTransferredEvent | GithubUnassignedEvent | GithubUnlabeledEvent | GithubUnlockedEvent | GithubUnmarkedAsDuplicateEvent | GithubUnpinnedEvent | GithubUnsubscribedEvent | GithubUserBlockedEvent;

/** The connection type for IssueTimelineItems. */
export type GithubIssueTimelineItemsConnection = {
   __typename?: 'GithubIssueTimelineItemsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubIssueTimelineItemsEdge>>>;
  /** Identifies the count of items after applying `before` and `after` filters. */
  filteredCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubIssueTimelineItems>>>;
  /** Identifies the count of items after applying `before`/`after` filters and `first`/`last`/`skip` slicing. */
  pageCount: Scalars['Int'];
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** Identifies the date and time when the timeline was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** An edge in a connection. */
export type GithubIssueTimelineItemsEdge = {
   __typename?: 'GithubIssueTimelineItemsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubIssueTimelineItems>;
};

/** The possible item types found in a timeline. */
export enum GithubIssueTimelineItemsItemType {
  /** Represents a comment on an Issue. */
  IssueComment = 'ISSUE_COMMENT',
  /** Represents a mention made by one issue or pull request to another. */
  CrossReferencedEvent = 'CROSS_REFERENCED_EVENT',
  /** Represents a 'added_to_project' event on a given issue or pull request. */
  AddedToProjectEvent = 'ADDED_TO_PROJECT_EVENT',
  /** Represents an 'assigned' event on any assignable object. */
  AssignedEvent = 'ASSIGNED_EVENT',
  /** Represents a 'closed' event on any `Closable`. */
  ClosedEvent = 'CLOSED_EVENT',
  /** Represents a 'comment_deleted' event on a given issue or pull request. */
  CommentDeletedEvent = 'COMMENT_DELETED_EVENT',
  /** Represents a 'connected' event on a given issue or pull request. */
  ConnectedEvent = 'CONNECTED_EVENT',
  /** Represents a 'converted_note_to_issue' event on a given issue or pull request. */
  ConvertedNoteToIssueEvent = 'CONVERTED_NOTE_TO_ISSUE_EVENT',
  /** Represents a 'demilestoned' event on a given issue or pull request. */
  DemilestonedEvent = 'DEMILESTONED_EVENT',
  /** Represents a 'disconnected' event on a given issue or pull request. */
  DisconnectedEvent = 'DISCONNECTED_EVENT',
  /** Represents a 'labeled' event on a given issue or pull request. */
  LabeledEvent = 'LABELED_EVENT',
  /** Represents a 'locked' event on a given issue or pull request. */
  LockedEvent = 'LOCKED_EVENT',
  /** Represents a 'marked_as_duplicate' event on a given issue or pull request. */
  MarkedAsDuplicateEvent = 'MARKED_AS_DUPLICATE_EVENT',
  /** Represents a 'mentioned' event on a given issue or pull request. */
  MentionedEvent = 'MENTIONED_EVENT',
  /** Represents a 'milestoned' event on a given issue or pull request. */
  MilestonedEvent = 'MILESTONED_EVENT',
  /** Represents a 'moved_columns_in_project' event on a given issue or pull request. */
  MovedColumnsInProjectEvent = 'MOVED_COLUMNS_IN_PROJECT_EVENT',
  /** Represents a 'pinned' event on a given issue or pull request. */
  PinnedEvent = 'PINNED_EVENT',
  /** Represents a 'referenced' event on a given `ReferencedSubject`. */
  ReferencedEvent = 'REFERENCED_EVENT',
  /** Represents a 'removed_from_project' event on a given issue or pull request. */
  RemovedFromProjectEvent = 'REMOVED_FROM_PROJECT_EVENT',
  /** Represents a 'renamed' event on a given issue or pull request */
  RenamedTitleEvent = 'RENAMED_TITLE_EVENT',
  /** Represents a 'reopened' event on any `Closable`. */
  ReopenedEvent = 'REOPENED_EVENT',
  /** Represents a 'subscribed' event on a given `Subscribable`. */
  SubscribedEvent = 'SUBSCRIBED_EVENT',
  /** Represents a 'transferred' event on a given issue or pull request. */
  TransferredEvent = 'TRANSFERRED_EVENT',
  /** Represents an 'unassigned' event on any assignable object. */
  UnassignedEvent = 'UNASSIGNED_EVENT',
  /** Represents an 'unlabeled' event on a given issue or pull request. */
  UnlabeledEvent = 'UNLABELED_EVENT',
  /** Represents an 'unlocked' event on a given issue or pull request. */
  UnlockedEvent = 'UNLOCKED_EVENT',
  /** Represents a 'user_blocked' event on a given user. */
  UserBlockedEvent = 'USER_BLOCKED_EVENT',
  /** Represents an 'unmarked_as_duplicate' event on a given issue or pull request. */
  UnmarkedAsDuplicateEvent = 'UNMARKED_AS_DUPLICATE_EVENT',
  /** Represents an 'unpinned' event on a given issue or pull request. */
  UnpinnedEvent = 'UNPINNED_EVENT',
  /** Represents an 'unsubscribed' event on a given `Subscribable`. */
  UnsubscribedEvent = 'UNSUBSCRIBED_EVENT'
}

/** Represents a user signing up for a GitHub account. */
export type GithubJoinedGitHubContribution = GithubContribution & {
   __typename?: 'GithubJoinedGitHubContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** A label for categorizing Issues or Milestones with a given Repository. */
export type GithubLabel = GithubNode & {
   __typename?: 'GithubLabel';
  /** Identifies the label color. */
  color: Scalars['String'];
  /** Identifies the date and time when the label was created. */
  createdAt?: Maybe<Scalars['GithubDateTime']>;
  /** A brief description of this label. */
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** Indicates whether or not this is a default label. */
  isDefault: Scalars['Boolean'];
  /** A list of issues associated with this label. */
  issues: GithubIssueConnection;
  /** Identifies the label name. */
  name: Scalars['String'];
  /** A list of pull requests associated with this label. */
  pullRequests: GithubPullRequestConnection;
  /** The repository associated with this label. */
  repository: GithubRepository;
  /** The HTTP path for this label. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the label was last updated. */
  updatedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The HTTP URL for this label. */
  url: Scalars['GithubURI'];
};


/** A label for categorizing Issues or Milestones with a given Repository. */
export type GithubLabelIssuesArgs = {
  orderBy?: Maybe<GithubIssueOrder>;
  labels?: Maybe<Array<Scalars['String']>>;
  states?: Maybe<Array<GithubIssueState>>;
  filterBy?: Maybe<GithubIssueFilters>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A label for categorizing Issues or Milestones with a given Repository. */
export type GithubLabelPullRequestsArgs = {
  states?: Maybe<Array<GithubPullRequestState>>;
  labels?: Maybe<Array<Scalars['String']>>;
  headRefName?: Maybe<Scalars['String']>;
  baseRefName?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubIssueOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** An object that can have labels assigned to it. */
export type GithubLabelable = {
  /** A list of labels associated with the object. */
  labels?: Maybe<GithubLabelConnection>;
};


/** An object that can have labels assigned to it. */
export type GithubLabelableLabelsArgs = {
  orderBy?: Maybe<GithubLabelOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for Label. */
export type GithubLabelConnection = {
   __typename?: 'GithubLabelConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubLabelEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubLabel>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a 'labeled' event on a given issue or pull request. */
export type GithubLabeledEvent = GithubNode & {
   __typename?: 'GithubLabeledEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the label associated with the 'labeled' event. */
  label: GithubLabel;
  /** Identifies the `Labelable` associated with the event. */
  labelable: GithubLabelable;
};

/** An edge in a connection. */
export type GithubLabelEdge = {
   __typename?: 'GithubLabelEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubLabel>;
};

/** Ways in which lists of labels can be ordered upon return. */
export type GithubLabelOrder = {
  /** The field in which to order labels by. */
  field: GithubLabelOrderField;
  /** The direction in which to order labels by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which label connections can be ordered. */
export enum GithubLabelOrderField {
  /** Order labels by name  */
  Name = 'NAME',
  /** Order labels by creation time */
  CreatedAt = 'CREATED_AT'
}

/** Represents a given language found in repositories. */
export type GithubLanguage = GithubNode & {
   __typename?: 'GithubLanguage';
  /** The color defined for the current language. */
  color?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The name of the current language. */
  name: Scalars['String'];
};

/** A list of languages associated with the parent. */
export type GithubLanguageConnection = {
   __typename?: 'GithubLanguageConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubLanguageEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubLanguage>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** The total size in bytes of files written in that language. */
  totalSize: Scalars['Int'];
};

/** Represents the language of a repository. */
export type GithubLanguageEdge = {
   __typename?: 'GithubLanguageEdge';
  cursor: Scalars['String'];
  node: GithubLanguage;
  /** The number of bytes of code written in the language. */
  size: Scalars['Int'];
};

/** Ordering options for language connections. */
export type GithubLanguageOrder = {
  /** The field to order languages by. */
  field: GithubLanguageOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which language connections can be ordered. */
export enum GithubLanguageOrderField {
  /** Order languages by the size of all files containing the language */
  Size = 'SIZE'
}

/** A repository's open source license */
export type GithubLicense = GithubNode & {
   __typename?: 'GithubLicense';
  /** The full text of the license */
  body: Scalars['String'];
  /** The conditions set by the license */
  conditions: Array<Maybe<GithubLicenseRule>>;
  /** A human-readable description of the license */
  description?: Maybe<Scalars['String']>;
  /** Whether the license should be featured */
  featured: Scalars['Boolean'];
  /** Whether the license should be displayed in license pickers */
  hidden: Scalars['Boolean'];
  id: Scalars['ID'];
  /** Instructions on how to implement the license */
  implementation?: Maybe<Scalars['String']>;
  /** The lowercased SPDX ID of the license */
  key: Scalars['String'];
  /** The limitations set by the license */
  limitations: Array<Maybe<GithubLicenseRule>>;
  /** The license full name specified by <https://spdx.org/licenses> */
  name: Scalars['String'];
  /** Customary short name if applicable (e.g, GPLv3) */
  nickname?: Maybe<Scalars['String']>;
  /** The permissions set by the license */
  permissions: Array<Maybe<GithubLicenseRule>>;
  /** Whether the license is a pseudo-license placeholder (e.g., other, no-license) */
  pseudoLicense: Scalars['Boolean'];
  /** Short identifier specified by <https://spdx.org/licenses> */
  spdxId?: Maybe<Scalars['String']>;
  /** URL to the license on <https://choosealicense.com> */
  url?: Maybe<Scalars['GithubURI']>;
};

/** Describes a License's conditions, permissions, and limitations */
export type GithubLicenseRule = {
   __typename?: 'GithubLicenseRule';
  /** A description of the rule */
  description: Scalars['String'];
  /** The machine-readable rule key */
  key: Scalars['String'];
  /** The human-readable rule label */
  label: Scalars['String'];
};

/** Autogenerated input type of LinkRepositoryToProject */
export type GithubLinkRepositoryToProjectInput = {
  /** The ID of the Project to link to a Repository */
  projectId: Scalars['ID'];
  /** The ID of the Repository to link to a Project. */
  repositoryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of LinkRepositoryToProject */
export type GithubLinkRepositoryToProjectPayload = {
   __typename?: 'GithubLinkRepositoryToProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The linked Project. */
  project?: Maybe<GithubProject>;
  /** The linked Repository. */
  repository?: Maybe<GithubRepository>;
};

/** An object that can be locked. */
export type GithubLockable = {
  /** Reason that the conversation was locked. */
  activeLockReason?: Maybe<GithubLockReason>;
  /** `true` if the object is locked */
  locked: Scalars['Boolean'];
};

/** Represents a 'locked' event on a given issue or pull request. */
export type GithubLockedEvent = GithubNode & {
   __typename?: 'GithubLockedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Reason that the conversation was locked (optional). */
  lockReason?: Maybe<GithubLockReason>;
  /** Object that was locked. */
  lockable: GithubLockable;
};

/** Autogenerated input type of LockLockable */
export type GithubLockLockableInput = {
  /** ID of the issue or pull request to be locked. */
  lockableId: Scalars['ID'];
  /** A reason for why the issue or pull request will be locked. */
  lockReason?: Maybe<GithubLockReason>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of LockLockable */
export type GithubLockLockablePayload = {
   __typename?: 'GithubLockLockablePayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The item that was locked. */
  lockedRecord?: Maybe<GithubLockable>;
};

/** The possible reasons that an issue or pull request was locked. */
export enum GithubLockReason {
  /** The issue or pull request was locked because the conversation was off-topic. */
  OffTopic = 'OFF_TOPIC',
  /** The issue or pull request was locked because the conversation was too heated. */
  TooHeated = 'TOO_HEATED',
  /** The issue or pull request was locked because the conversation was resolved. */
  Resolved = 'RESOLVED',
  /** The issue or pull request was locked because the conversation was spam. */
  Spam = 'SPAM'
}

/** A placeholder user for attribution of imported data on GitHub. */
export type GithubMannequin = GithubNode & GithubActor & GithubUniformResourceLocatable & {
   __typename?: 'GithubMannequin';
  /** A URL pointing to the GitHub App's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The mannequin's email on the source instance. */
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The username of the actor. */
  login: Scalars['String'];
  /** The HTML path to this resource. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The URL to this resource. */
  url: Scalars['GithubURI'];
};


/** A placeholder user for attribution of imported data on GitHub. */
export type GithubMannequinAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** Represents a 'marked_as_duplicate' event on a given issue or pull request. */
export type GithubMarkedAsDuplicateEvent = GithubNode & {
   __typename?: 'GithubMarkedAsDuplicateEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
};

/** A public description of a Marketplace category. */
export type GithubMarketplaceCategory = GithubNode & {
   __typename?: 'GithubMarketplaceCategory';
  /** The category's description. */
  description?: Maybe<Scalars['String']>;
  /** The technical description of how apps listed in this category work with GitHub. */
  howItWorks?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The category's name. */
  name: Scalars['String'];
  /** How many Marketplace listings have this as their primary category. */
  primaryListingCount: Scalars['Int'];
  /** The HTTP path for this Marketplace category. */
  resourcePath: Scalars['GithubURI'];
  /** How many Marketplace listings have this as their secondary category. */
  secondaryListingCount: Scalars['Int'];
  /** The short name of the category used in its URL. */
  slug: Scalars['String'];
  /** The HTTP URL for this Marketplace category. */
  url: Scalars['GithubURI'];
};

/** A listing in the GitHub integration marketplace. */
export type GithubMarketplaceListing = GithubNode & {
   __typename?: 'GithubMarketplaceListing';
  /** The GitHub App this listing represents. */
  app?: Maybe<GithubApp>;
  /** URL to the listing owner's company site. */
  companyUrl?: Maybe<Scalars['GithubURI']>;
  /** The HTTP path for configuring access to the listing's integration or OAuth app */
  configurationResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for configuring access to the listing's integration or OAuth app */
  configurationUrl: Scalars['GithubURI'];
  /** URL to the listing's documentation. */
  documentationUrl?: Maybe<Scalars['GithubURI']>;
  /** The listing's detailed description. */
  extendedDescription?: Maybe<Scalars['String']>;
  /** The listing's detailed description rendered to HTML. */
  extendedDescriptionHTML: Scalars['GithubHTML'];
  /** The listing's introductory description. */
  fullDescription: Scalars['String'];
  /** The listing's introductory description rendered to HTML. */
  fullDescriptionHTML: Scalars['GithubHTML'];
  /**
   * Whether this listing has been submitted for review from GitHub for approval to be displayed in the Marketplace.
   * @deprecated `hasApprovalBeenRequested` will be removed. Use `isVerificationPendingFromDraft` instead. Removal on 2019-10-01 UTC.
   */
  hasApprovalBeenRequested: Scalars['Boolean'];
  /** Does this listing have any plans with a free trial? */
  hasPublishedFreeTrialPlans: Scalars['Boolean'];
  /** Does this listing have a terms of service link? */
  hasTermsOfService: Scalars['Boolean'];
  /** A technical description of how this app works with GitHub. */
  howItWorks?: Maybe<Scalars['String']>;
  /** The listing's technical description rendered to HTML. */
  howItWorksHTML: Scalars['GithubHTML'];
  id: Scalars['ID'];
  /** URL to install the product to the viewer's account or organization. */
  installationUrl?: Maybe<Scalars['GithubURI']>;
  /** Whether this listing's app has been installed for the current viewer */
  installedForViewer: Scalars['Boolean'];
  /**
   * Whether this listing has been approved for display in the Marketplace.
   * @deprecated `isApproved` will be removed. Use `isPublic` instead. Removal on 2019-10-01 UTC.
   */
  isApproved: Scalars['Boolean'];
  /** Whether this listing has been removed from the Marketplace. */
  isArchived: Scalars['Boolean'];
  /**
   * Whether this listing has been removed from the Marketplace.
   * @deprecated `isDelisted` will be removed. Use `isArchived` instead. Removal on 2019-10-01 UTC.
   */
  isDelisted: Scalars['Boolean'];
  /**
   * Whether this listing is still an editable draft that has not been submitted
   * for review and is not publicly visible in the Marketplace.
   */
  isDraft: Scalars['Boolean'];
  /** Whether the product this listing represents is available as part of a paid plan. */
  isPaid: Scalars['Boolean'];
  /** Whether this listing has been approved for display in the Marketplace. */
  isPublic: Scalars['Boolean'];
  /** Whether this listing has been rejected by GitHub for display in the Marketplace. */
  isRejected: Scalars['Boolean'];
  /** Whether this listing has been approved for unverified display in the Marketplace. */
  isUnverified: Scalars['Boolean'];
  /** Whether this draft listing has been submitted for review for approval to be unverified in the Marketplace. */
  isUnverifiedPending: Scalars['Boolean'];
  /** Whether this draft listing has been submitted for review from GitHub for approval to be verified in the Marketplace. */
  isVerificationPendingFromDraft: Scalars['Boolean'];
  /** Whether this unverified listing has been submitted for review from GitHub for approval to be verified in the Marketplace. */
  isVerificationPendingFromUnverified: Scalars['Boolean'];
  /** Whether this listing has been approved for verified display in the Marketplace. */
  isVerified: Scalars['Boolean'];
  /** The hex color code, without the leading '#', for the logo background. */
  logoBackgroundColor: Scalars['String'];
  /** URL for the listing's logo image. */
  logoUrl?: Maybe<Scalars['GithubURI']>;
  /** The listing's full name. */
  name: Scalars['String'];
  /** The listing's very short description without a trailing period or ampersands. */
  normalizedShortDescription: Scalars['String'];
  /** URL to the listing's detailed pricing. */
  pricingUrl?: Maybe<Scalars['GithubURI']>;
  /** The category that best describes the listing. */
  primaryCategory: GithubMarketplaceCategory;
  /** URL to the listing's privacy policy, may return an empty string for listings that do not require a privacy policy URL. */
  privacyPolicyUrl: Scalars['GithubURI'];
  /** The HTTP path for the Marketplace listing. */
  resourcePath: Scalars['GithubURI'];
  /** The URLs for the listing's screenshots. */
  screenshotUrls: Array<Maybe<Scalars['String']>>;
  /** An alternate category that describes the listing. */
  secondaryCategory?: Maybe<GithubMarketplaceCategory>;
  /** The listing's very short description. */
  shortDescription: Scalars['String'];
  /** The short name of the listing used in its URL. */
  slug: Scalars['String'];
  /** URL to the listing's status page. */
  statusUrl?: Maybe<Scalars['GithubURI']>;
  /** An email address for support for this listing's app. */
  supportEmail?: Maybe<Scalars['String']>;
  /**
   * Either a URL or an email address for support for this listing's app, may
   * return an empty string for listings that do not require a support URL.
   */
  supportUrl: Scalars['GithubURI'];
  /** URL to the listing's terms of service. */
  termsOfServiceUrl?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the Marketplace listing. */
  url: Scalars['GithubURI'];
  /** Can the current viewer add plans for this Marketplace listing. */
  viewerCanAddPlans: Scalars['Boolean'];
  /** Can the current viewer approve this Marketplace listing. */
  viewerCanApprove: Scalars['Boolean'];
  /** Can the current viewer delist this Marketplace listing. */
  viewerCanDelist: Scalars['Boolean'];
  /** Can the current viewer edit this Marketplace listing. */
  viewerCanEdit: Scalars['Boolean'];
  /**
   * Can the current viewer edit the primary and secondary category of this
   * Marketplace listing.
   */
  viewerCanEditCategories: Scalars['Boolean'];
  /** Can the current viewer edit the plans for this Marketplace listing. */
  viewerCanEditPlans: Scalars['Boolean'];
  /**
   * Can the current viewer return this Marketplace listing to draft state
   * so it becomes editable again.
   */
  viewerCanRedraft: Scalars['Boolean'];
  /**
   * Can the current viewer reject this Marketplace listing by returning it to
   * an editable draft state or rejecting it entirely.
   */
  viewerCanReject: Scalars['Boolean'];
  /**
   * Can the current viewer request this listing be reviewed for display in
   * the Marketplace as verified.
   */
  viewerCanRequestApproval: Scalars['Boolean'];
  /** Indicates whether the current user has an active subscription to this Marketplace listing. */
  viewerHasPurchased: Scalars['Boolean'];
  /**
   * Indicates if the current user has purchased a subscription to this Marketplace listing
   * for all of the organizations the user owns.
   */
  viewerHasPurchasedForAllOrganizations: Scalars['Boolean'];
  /** Does the current viewer role allow them to administer this Marketplace listing. */
  viewerIsListingAdmin: Scalars['Boolean'];
};


/** A listing in the GitHub integration marketplace. */
export type GithubMarketplaceListingLogoUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** Look up Marketplace Listings */
export type GithubMarketplaceListingConnection = {
   __typename?: 'GithubMarketplaceListingConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubMarketplaceListingEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubMarketplaceListing>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubMarketplaceListingEdge = {
   __typename?: 'GithubMarketplaceListingEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubMarketplaceListing>;
};

/** Autogenerated input type of MarkPullRequestReadyForReview */
export type GithubMarkPullRequestReadyForReviewInput = {
  /** ID of the pull request to be marked as ready for review. */
  pullRequestId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of MarkPullRequestReadyForReview */
export type GithubMarkPullRequestReadyForReviewPayload = {
   __typename?: 'GithubMarkPullRequestReadyForReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request that is ready for review. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** Audit log entry for a members_can_delete_repos.clear event. */
export type GithubMembersCanDeleteReposClearAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubMembersCanDeleteReposClearAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a members_can_delete_repos.disable event. */
export type GithubMembersCanDeleteReposDisableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubMembersCanDeleteReposDisableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a members_can_delete_repos.enable event. */
export type GithubMembersCanDeleteReposEnableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubMembersCanDeleteReposEnableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Entities that have members who can set status messages. */
export type GithubMemberStatusable = {
  /** Get the status messages members of this entity have set that are either public or visible only to the organization. */
  memberStatuses: GithubUserStatusConnection;
};


/** Entities that have members who can set status messages. */
export type GithubMemberStatusableMemberStatusesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubUserStatusOrder>;
};

/** Represents a 'mentioned' event on a given issue or pull request. */
export type GithubMentionedEvent = GithubNode & {
   __typename?: 'GithubMentionedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Whether or not a PullRequest can be merged. */
export enum GithubMergeableState {
  /** The pull request can be merged. */
  Mergeable = 'MERGEABLE',
  /** The pull request cannot be merged due to merge conflicts. */
  Conflicting = 'CONFLICTING',
  /** The mergeability of the pull request is still being calculated. */
  Unknown = 'UNKNOWN'
}

/** Autogenerated input type of MergeBranch */
export type GithubMergeBranchInput = {
  /** The Node ID of the Repository containing the base branch that will be modified. */
  repositoryId: Scalars['ID'];
  /** The name of the base branch that the provided head will be merged into. */
  base: Scalars['String'];
  /** The head to merge into the base branch. This can be a branch name or a commit GitObjectID. */
  head: Scalars['String'];
  /** Message to use for the merge commit. If omitted, a default will be used. */
  commitMessage?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of MergeBranch */
export type GithubMergeBranchPayload = {
   __typename?: 'GithubMergeBranchPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The resulting merge Commit. */
  mergeCommit?: Maybe<GithubCommit>;
};

/** Represents a 'merged' event on a given pull request. */
export type GithubMergedEvent = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubMergedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the commit associated with the `merge` event. */
  commit?: Maybe<GithubCommit>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the Ref associated with the `merge` event. */
  mergeRef?: Maybe<GithubRef>;
  /** Identifies the name of the Ref associated with the `merge` event. */
  mergeRefName: Scalars['String'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** The HTTP path for this merged event. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this merged event. */
  url: Scalars['GithubURI'];
};

/** Autogenerated input type of MergePullRequest */
export type GithubMergePullRequestInput = {
  /** ID of the pull request to be merged. */
  pullRequestId: Scalars['ID'];
  /** Commit headline to use for the merge commit; if omitted, a default message will be used. */
  commitHeadline?: Maybe<Scalars['String']>;
  /** Commit body to use for the merge commit; if omitted, a default message will be used */
  commitBody?: Maybe<Scalars['String']>;
  /** OID that the pull request head ref must match to allow merge; if omitted, no check is performed. */
  expectedHeadOid?: Maybe<Scalars['GithubGitObjectID']>;
  /** The merge method to use. If omitted, defaults to 'MERGE' */
  mergeMethod?: Maybe<GithubPullRequestMergeMethod>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of MergePullRequest */
export type GithubMergePullRequestPayload = {
   __typename?: 'GithubMergePullRequestPayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request that was merged. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** Represents a Milestone object on a given repository. */
export type GithubMilestone = GithubNode & GithubClosable & GithubUniformResourceLocatable & {
   __typename?: 'GithubMilestone';
  /** `true` if the object is closed (definition of closed may depend on type) */
  closed: Scalars['Boolean'];
  /** Identifies the date and time when the object was closed. */
  closedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the actor who created the milestone. */
  creator?: Maybe<GithubActor>;
  /** Identifies the description of the milestone. */
  description?: Maybe<Scalars['String']>;
  /** Identifies the due date of the milestone. */
  dueOn?: Maybe<Scalars['GithubDateTime']>;
  id: Scalars['ID'];
  /** Just for debugging on review-lab */
  issuePrioritiesDebug: Scalars['String'];
  /** A list of issues associated with the milestone. */
  issues: GithubIssueConnection;
  /** Identifies the number of the milestone. */
  number: Scalars['Int'];
  /** A list of pull requests associated with the milestone. */
  pullRequests: GithubPullRequestConnection;
  /** The repository associated with this milestone. */
  repository: GithubRepository;
  /** The HTTP path for this milestone */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the state of the milestone. */
  state: GithubMilestoneState;
  /** Identifies the title of the milestone. */
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this milestone */
  url: Scalars['GithubURI'];
};


/** Represents a Milestone object on a given repository. */
export type GithubMilestoneIssuesArgs = {
  orderBy?: Maybe<GithubIssueOrder>;
  labels?: Maybe<Array<Scalars['String']>>;
  states?: Maybe<Array<GithubIssueState>>;
  filterBy?: Maybe<GithubIssueFilters>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents a Milestone object on a given repository. */
export type GithubMilestonePullRequestsArgs = {
  states?: Maybe<Array<GithubPullRequestState>>;
  labels?: Maybe<Array<Scalars['String']>>;
  headRefName?: Maybe<Scalars['String']>;
  baseRefName?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubIssueOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for Milestone. */
export type GithubMilestoneConnection = {
   __typename?: 'GithubMilestoneConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubMilestoneEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubMilestone>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a 'milestoned' event on a given issue or pull request. */
export type GithubMilestonedEvent = GithubNode & {
   __typename?: 'GithubMilestonedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the milestone title associated with the 'milestoned' event. */
  milestoneTitle: Scalars['String'];
  /** Object referenced by event. */
  subject: GithubMilestoneItem;
};

/** An edge in a connection. */
export type GithubMilestoneEdge = {
   __typename?: 'GithubMilestoneEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubMilestone>;
};

/** Types that can be inside a Milestone. */
export type GithubMilestoneItem = GithubIssue | GithubPullRequest;

/** Ordering options for milestone connections. */
export type GithubMilestoneOrder = {
  /** The field to order milestones by. */
  field: GithubMilestoneOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which milestone connections can be ordered. */
export enum GithubMilestoneOrderField {
  /** Order milestones by when they are due. */
  DueDate = 'DUE_DATE',
  /** Order milestones by when they were created. */
  CreatedAt = 'CREATED_AT',
  /** Order milestones by when they were last updated. */
  UpdatedAt = 'UPDATED_AT',
  /** Order milestones by their number. */
  Number = 'NUMBER'
}

/** The possible states of a milestone. */
export enum GithubMilestoneState {
  /** A milestone that is still open. */
  Open = 'OPEN',
  /** A milestone that has been closed. */
  Closed = 'CLOSED'
}

/** Represents a 'moved_columns_in_project' event on a given issue or pull request. */
export type GithubMovedColumnsInProjectEvent = GithubNode & {
   __typename?: 'GithubMovedColumnsInProjectEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Autogenerated input type of MoveProjectCard */
export type GithubMoveProjectCardInput = {
  /** The id of the card to move. */
  cardId: Scalars['ID'];
  /** The id of the column to move it into. */
  columnId: Scalars['ID'];
  /** Place the new card after the card with this id. Pass null to place it at the top. */
  afterCardId?: Maybe<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of MoveProjectCard */
export type GithubMoveProjectCardPayload = {
   __typename?: 'GithubMoveProjectCardPayload';
  /** The new edge of the moved card. */
  cardEdge?: Maybe<GithubProjectCardEdge>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of MoveProjectColumn */
export type GithubMoveProjectColumnInput = {
  /** The id of the column to move. */
  columnId: Scalars['ID'];
  /** Place the new column after the column with this id. Pass null to place it at the front. */
  afterColumnId?: Maybe<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of MoveProjectColumn */
export type GithubMoveProjectColumnPayload = {
   __typename?: 'GithubMoveProjectColumnPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The new edge of the moved column. */
  columnEdge?: Maybe<GithubProjectColumnEdge>;
};

/** An object with an ID. */
export type GithubNode = {
  /** ID of the object. */
  id: Scalars['ID'];
};

/** Metadata for an audit entry with action oauth_application.* */
export type GithubOauthApplicationAuditEntryData = {
  /** The name of the OAuth Application. */
  oauthApplicationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the OAuth Application */
  oauthApplicationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the OAuth Application */
  oauthApplicationUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a oauth_application.create event. */
export type GithubOauthApplicationCreateAuditEntry = GithubNode & GithubAuditEntry & GithubOauthApplicationAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOauthApplicationCreateAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The application URL of the OAuth Application. */
  applicationUrl?: Maybe<Scalars['GithubURI']>;
  /** The callback URL of the OAuth Application. */
  callbackUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The name of the OAuth Application. */
  oauthApplicationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the OAuth Application */
  oauthApplicationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the OAuth Application */
  oauthApplicationUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The rate limit of the OAuth Application. */
  rateLimit?: Maybe<Scalars['Int']>;
  /** The state of the OAuth Application. */
  state?: Maybe<GithubOauthApplicationCreateAuditEntryState>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The state of an OAuth Application when it was created. */
export enum GithubOauthApplicationCreateAuditEntryState {
  /** The OAuth Application was active and allowed to have OAuth Accesses. */
  Active = 'ACTIVE',
  /** The OAuth Application was suspended from generating OAuth Accesses due to abuse or security concerns. */
  Suspended = 'SUSPENDED',
  /** The OAuth Application was in the process of being deleted. */
  PendingDeletion = 'PENDING_DELETION'
}

/** The corresponding operation type for the action */
export enum GithubOperationType {
  /** An existing resource was accessed */
  Access = 'ACCESS',
  /** A resource performed an authentication event */
  Authentication = 'AUTHENTICATION',
  /** A new resource was created */
  Create = 'CREATE',
  /** An existing resource was modified */
  Modify = 'MODIFY',
  /** An existing resource was removed */
  Remove = 'REMOVE',
  /** An existing resource was restored */
  Restore = 'RESTORE',
  /** An existing resource was transferred between multiple resources */
  Transfer = 'TRANSFER'
}

/** Possible directions in which to order a list of items when provided an `orderBy` argument. */
export enum GithubOrderDirection {
  /** Specifies an ascending order for a given `orderBy` argument. */
  Asc = 'ASC',
  /** Specifies a descending order for a given `orderBy` argument. */
  Desc = 'DESC'
}

/** Audit log entry for a org.add_billing_manager */
export type GithubOrgAddBillingManagerAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgAddBillingManagerAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The email address used to invite a billing manager for the organization. */
  invitationEmail?: Maybe<Scalars['String']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.add_member */
export type GithubOrgAddMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgAddMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The permission level of the member added to the organization. */
  permission?: Maybe<GithubOrgAddMemberAuditEntryPermission>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The permissions available to members on an Organization. */
export enum GithubOrgAddMemberAuditEntryPermission {
  /** Can read and clone repositories. */
  Read = 'READ',
  /** Can read, clone, push, and add collaborators to repositories. */
  Admin = 'ADMIN'
}

/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganization = GithubNode & GithubActor & GithubRegistryPackageOwner & GithubRegistryPackageSearch & GithubProjectOwner & GithubRepositoryOwner & GithubUniformResourceLocatable & GithubMemberStatusable & GithubProfileOwner & GithubSponsorable & {
   __typename?: 'GithubOrganization';
  /** Determine if this repository owner has any items that can be pinned to their profile. */
  anyPinnableItems: Scalars['Boolean'];
  /** Audit log entries of the organization */
  auditLog: GithubOrganizationAuditEntryConnection;
  /** A URL pointing to the organization's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The organization's public profile description. */
  description?: Maybe<Scalars['String']>;
  /** The organization's public profile description rendered to HTML. */
  descriptionHTML?: Maybe<Scalars['String']>;
  /** The organization's public email. */
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** Whether the organization has verified its profile email and website. */
  isVerified: Scalars['Boolean'];
  /**
   * Showcases a selection of repositories and gists that the profile owner has
   * either curated or that have been selected automatically based on popularity.
   */
  itemShowcase: GithubProfileItemShowcase;
  /** The organization's public profile location. */
  location?: Maybe<Scalars['String']>;
  /** The organization's login name. */
  login: Scalars['String'];
  /** Get the status messages members of this entity have set that are either public or visible only to the organization. */
  memberStatuses: GithubUserStatusConnection;
  /** A list of users who are members of this organization. */
  membersWithRole: GithubOrganizationMemberConnection;
  /** The organization's public profile name. */
  name?: Maybe<Scalars['String']>;
  /** The HTTP path creating a new team */
  newTeamResourcePath: Scalars['GithubURI'];
  /** The HTTP URL creating a new team */
  newTeamUrl: Scalars['GithubURI'];
  /** The billing email for the organization. */
  organizationBillingEmail?: Maybe<Scalars['String']>;
  /** A list of users who have been invited to join this organization. */
  pendingMembers: GithubUserConnection;
  /** A list of repositories and gists this profile owner can pin to their profile. */
  pinnableItems: GithubPinnableItemConnection;
  /** A list of repositories and gists this profile owner has pinned to their profile */
  pinnedItems: GithubPinnableItemConnection;
  /** Returns how many more items this profile owner can pin to their profile. */
  pinnedItemsRemaining: Scalars['Int'];
  /**
   * A list of repositories this user has pinned to their profile
   * @deprecated pinnedRepositories will be removed Use ProfileOwner.pinnedItems instead. Removal on 2019-10-01 UTC.
   */
  pinnedRepositories: GithubRepositoryConnection;
  /** Find project by number. */
  project?: Maybe<GithubProject>;
  /** A list of projects under the owner. */
  projects: GithubProjectConnection;
  /** The HTTP path listing organization's projects */
  projectsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL listing organization's projects */
  projectsUrl: Scalars['GithubURI'];
  /**
   * A list of registry packages under the owner.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageOwner` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackages: GithubRegistryPackageConnection;
  /**
   * A list of registry packages for a particular search query.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageSearch` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackagesForQuery: GithubRegistryPackageConnection;
  /** A list of repositories that the user owns. */
  repositories: GithubRepositoryConnection;
  /** Find Repository. */
  repository?: Maybe<GithubRepository>;
  /**
   * When true the organization requires all members, billing managers, and outside
   * collaborators to enable two-factor authentication.
   */
  requiresTwoFactorAuthentication?: Maybe<Scalars['Boolean']>;
  /** The HTTP path for this organization. */
  resourcePath: Scalars['GithubURI'];
  /** The Organization's SAML identity providers */
  samlIdentityProvider?: Maybe<GithubOrganizationIdentityProvider>;
  /** The GitHub Sponsors listing for this user. */
  sponsorsListing?: Maybe<GithubSponsorsListing>;
  /** This object's sponsorships as the maintainer. */
  sponsorshipsAsMaintainer: GithubSponsorshipConnection;
  /** This object's sponsorships as the sponsor. */
  sponsorshipsAsSponsor: GithubSponsorshipConnection;
  /** Find an organization's team by its slug. */
  team?: Maybe<GithubTeam>;
  /** A list of teams in this organization. */
  teams: GithubTeamConnection;
  /** The HTTP path listing organization's teams */
  teamsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL listing organization's teams */
  teamsUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this organization. */
  url: Scalars['GithubURI'];
  /** Organization is adminable by the viewer. */
  viewerCanAdminister: Scalars['Boolean'];
  /** Can the viewer pin repositories and gists to the profile? */
  viewerCanChangePinnedItems: Scalars['Boolean'];
  /** Can the current viewer create new projects on this owner. */
  viewerCanCreateProjects: Scalars['Boolean'];
  /** Viewer can create repositories on this organization */
  viewerCanCreateRepositories: Scalars['Boolean'];
  /** Viewer can create teams on this organization. */
  viewerCanCreateTeams: Scalars['Boolean'];
  /** Viewer is an active member of this organization. */
  viewerIsAMember: Scalars['Boolean'];
  /** The organization's public profile URL. */
  websiteUrl?: Maybe<Scalars['GithubURI']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationAnyPinnableItemsArgs = {
  type?: Maybe<GithubPinnableItemType>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationAuditLogArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubAuditLogOrder>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationMemberStatusesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubUserStatusOrder>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationMembersWithRoleArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationPendingMembersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationPinnableItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationPinnedItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationPinnedRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationProjectArgs = {
  number: Scalars['Int'];
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationProjectsArgs = {
  orderBy?: Maybe<GithubProjectOrder>;
  search?: Maybe<Scalars['String']>;
  states?: Maybe<Array<GithubProjectState>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationRegistryPackagesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  names?: Maybe<Array<Maybe<Scalars['String']>>>;
  repositoryId?: Maybe<Scalars['ID']>;
  packageType?: Maybe<GithubRegistryPackageType>;
  registryPackageType?: Maybe<Scalars['String']>;
  publicOnly?: Maybe<Scalars['Boolean']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationRegistryPackagesForQueryArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  packageType?: Maybe<GithubRegistryPackageType>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  isFork?: Maybe<Scalars['Boolean']>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationRepositoryArgs = {
  name: Scalars['String'];
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationSponsorshipsAsMaintainerArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  includePrivate?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationSponsorshipsAsSponsorArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationTeamArgs = {
  slug: Scalars['String'];
};


/** An account on GitHub, with one or more owners, that has repositories, members and teams. */
export type GithubOrganizationTeamsArgs = {
  privacy?: Maybe<GithubTeamPrivacy>;
  role?: Maybe<GithubTeamRole>;
  query?: Maybe<Scalars['String']>;
  userLogins?: Maybe<Array<Scalars['String']>>;
  orderBy?: Maybe<GithubTeamOrder>;
  ldapMapped?: Maybe<Scalars['Boolean']>;
  rootTeamsOnly?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** An audit entry in an organization audit log. */
export type GithubOrganizationAuditEntry = GithubMembersCanDeleteReposClearAuditEntry | GithubMembersCanDeleteReposDisableAuditEntry | GithubMembersCanDeleteReposEnableAuditEntry | GithubOauthApplicationCreateAuditEntry | GithubOrgAddBillingManagerAuditEntry | GithubOrgAddMemberAuditEntry | GithubOrgBlockUserAuditEntry | GithubOrgConfigDisableCollaboratorsOnlyAuditEntry | GithubOrgConfigEnableCollaboratorsOnlyAuditEntry | GithubOrgCreateAuditEntry | GithubOrgDisableOauthAppRestrictionsAuditEntry | GithubOrgDisableSamlAuditEntry | GithubOrgDisableTwoFactorRequirementAuditEntry | GithubOrgEnableOauthAppRestrictionsAuditEntry | GithubOrgEnableSamlAuditEntry | GithubOrgEnableTwoFactorRequirementAuditEntry | GithubOrgInviteMemberAuditEntry | GithubOrgInviteToBusinessAuditEntry | GithubOrgOauthAppAccessApprovedAuditEntry | GithubOrgOauthAppAccessDeniedAuditEntry | GithubOrgOauthAppAccessRequestedAuditEntry | GithubOrgRemoveBillingManagerAuditEntry | GithubOrgRemoveMemberAuditEntry | GithubOrgRemoveOutsideCollaboratorAuditEntry | GithubOrgRestoreMemberAuditEntry | GithubOrgUnblockUserAuditEntry | GithubOrgUpdateDefaultRepositoryPermissionAuditEntry | GithubOrgUpdateMemberAuditEntry | GithubOrgUpdateMemberRepositoryCreationPermissionAuditEntry | GithubOrgUpdateMemberRepositoryInvitationPermissionAuditEntry | GithubPrivateRepositoryForkingDisableAuditEntry | GithubPrivateRepositoryForkingEnableAuditEntry | GithubRepoAccessAuditEntry | GithubRepoAddMemberAuditEntry | GithubRepoAddTopicAuditEntry | GithubRepoArchivedAuditEntry | GithubRepoChangeMergeSettingAuditEntry | GithubRepoConfigDisableAnonymousGitAccessAuditEntry | GithubRepoConfigDisableCollaboratorsOnlyAuditEntry | GithubRepoConfigDisableContributorsOnlyAuditEntry | GithubRepoConfigDisableSockpuppetDisallowedAuditEntry | GithubRepoConfigEnableAnonymousGitAccessAuditEntry | GithubRepoConfigEnableCollaboratorsOnlyAuditEntry | GithubRepoConfigEnableContributorsOnlyAuditEntry | GithubRepoConfigEnableSockpuppetDisallowedAuditEntry | GithubRepoConfigLockAnonymousGitAccessAuditEntry | GithubRepoConfigUnlockAnonymousGitAccessAuditEntry | GithubRepoCreateAuditEntry | GithubRepoDestroyAuditEntry | GithubRepoRemoveMemberAuditEntry | GithubRepoRemoveTopicAuditEntry | GithubRepositoryVisibilityChangeDisableAuditEntry | GithubRepositoryVisibilityChangeEnableAuditEntry | GithubTeamAddMemberAuditEntry | GithubTeamAddRepositoryAuditEntry | GithubTeamChangeParentTeamAuditEntry | GithubTeamRemoveMemberAuditEntry | GithubTeamRemoveRepositoryAuditEntry;

/** The connection type for OrganizationAuditEntry. */
export type GithubOrganizationAuditEntryConnection = {
   __typename?: 'GithubOrganizationAuditEntryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubOrganizationAuditEntryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubOrganizationAuditEntry>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Metadata for an audit entry with action org.* */
export type GithubOrganizationAuditEntryData = {
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
};

/** An edge in a connection. */
export type GithubOrganizationAuditEntryEdge = {
   __typename?: 'GithubOrganizationAuditEntryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubOrganizationAuditEntry>;
};

/** The connection type for Organization. */
export type GithubOrganizationConnection = {
   __typename?: 'GithubOrganizationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubOrganizationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubOrganization>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubOrganizationEdge = {
   __typename?: 'GithubOrganizationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubOrganization>;
};

/** An Identity Provider configured to provision SAML and SCIM identities for Organizations */
export type GithubOrganizationIdentityProvider = GithubNode & {
   __typename?: 'GithubOrganizationIdentityProvider';
  /** The digest algorithm used to sign SAML requests for the Identity Provider. */
  digestMethod?: Maybe<Scalars['GithubURI']>;
  /** External Identities provisioned by this Identity Provider */
  externalIdentities: GithubExternalIdentityConnection;
  id: Scalars['ID'];
  /** The x509 certificate used by the Identity Provder to sign assertions and responses. */
  idpCertificate?: Maybe<Scalars['GithubX509Certificate']>;
  /** The Issuer Entity ID for the SAML Identity Provider */
  issuer?: Maybe<Scalars['String']>;
  /** Organization this Identity Provider belongs to */
  organization?: Maybe<GithubOrganization>;
  /** The signature algorithm used to sign SAML requests for the Identity Provider. */
  signatureMethod?: Maybe<Scalars['GithubURI']>;
  /** The URL endpoint for the Identity Provider's SAML SSO. */
  ssoUrl?: Maybe<Scalars['GithubURI']>;
};


/** An Identity Provider configured to provision SAML and SCIM identities for Organizations */
export type GithubOrganizationIdentityProviderExternalIdentitiesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** An Invitation for a user to an organization. */
export type GithubOrganizationInvitation = GithubNode & {
   __typename?: 'GithubOrganizationInvitation';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The email address of the user invited to the organization. */
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The type of invitation that was sent (e.g. email, user). */
  invitationType: GithubOrganizationInvitationType;
  /** The user who was invited to the organization. */
  invitee?: Maybe<GithubUser>;
  /** The user who created the invitation. */
  inviter: GithubUser;
  /** The organization the invite is for */
  organization: GithubOrganization;
  /** The user's pending role in the organization (e.g. member, owner). */
  role: GithubOrganizationInvitationRole;
};

/** The connection type for OrganizationInvitation. */
export type GithubOrganizationInvitationConnection = {
   __typename?: 'GithubOrganizationInvitationConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubOrganizationInvitationEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubOrganizationInvitation>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubOrganizationInvitationEdge = {
   __typename?: 'GithubOrganizationInvitationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubOrganizationInvitation>;
};

/** The possible organization invitation roles. */
export enum GithubOrganizationInvitationRole {
  /** The user is invited to be a direct member of the organization. */
  DirectMember = 'DIRECT_MEMBER',
  /** The user is invited to be an admin of the organization. */
  Admin = 'ADMIN',
  /** The user is invited to be a billing manager of the organization. */
  BillingManager = 'BILLING_MANAGER',
  /** The user's previous role will be reinstated. */
  Reinstate = 'REINSTATE'
}

/** The possible organization invitation types. */
export enum GithubOrganizationInvitationType {
  /** The invitation was to an existing user. */
  User = 'USER',
  /** The invitation was to an email address. */
  Email = 'EMAIL'
}

/** The connection type for User. */
export type GithubOrganizationMemberConnection = {
   __typename?: 'GithubOrganizationMemberConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubOrganizationMemberEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a user within an organization. */
export type GithubOrganizationMemberEdge = {
   __typename?: 'GithubOrganizationMemberEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** Whether the organization member has two factor enabled or not. Returns null if information is not available to viewer. */
  hasTwoFactorEnabled?: Maybe<Scalars['Boolean']>;
  /** The item at the end of the edge. */
  node?: Maybe<GithubUser>;
  /** The role this user has in the organization. */
  role?: Maybe<GithubOrganizationMemberRole>;
};

/** The possible roles within an organization for its members. */
export enum GithubOrganizationMemberRole {
  /** The user is a member of the organization. */
  Member = 'MEMBER',
  /** The user is an administrator of the organization. */
  Admin = 'ADMIN'
}

/** The possible values for the members can create repositories setting on an organization. */
export enum GithubOrganizationMembersCanCreateRepositoriesSettingValue {
  /** Members will be able to create public and private repositories. */
  All = 'ALL',
  /** Members will be able to create only private repositories. */
  Private = 'PRIVATE',
  /** Members will not be able to create public or private repositories. */
  Disabled = 'DISABLED'
}

/** Ordering options for organization connections. */
export type GithubOrganizationOrder = {
  /** The field to order organizations by. */
  field: GithubOrganizationOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which organization connections can be ordered. */
export enum GithubOrganizationOrderField {
  /** Order organizations by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order organizations by login */
  Login = 'LOGIN'
}

/** An organization list hovercard context */
export type GithubOrganizationsHovercardContext = GithubHovercardContext & {
   __typename?: 'GithubOrganizationsHovercardContext';
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
  /** Organizations this user is a member of that are relevant */
  relevantOrganizations: GithubOrganizationConnection;
  /** The total number of organizations this user is in */
  totalOrganizationCount: Scalars['Int'];
};


/** An organization list hovercard context */
export type GithubOrganizationsHovercardContextRelevantOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** An organization teams hovercard context */
export type GithubOrganizationTeamsHovercardContext = GithubHovercardContext & {
   __typename?: 'GithubOrganizationTeamsHovercardContext';
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
  /** Teams in this organization the user is a member of that are relevant */
  relevantTeams: GithubTeamConnection;
  /** The path for the full team list for this user */
  teamsResourcePath: Scalars['GithubURI'];
  /** The URL for the full team list for this user */
  teamsUrl: Scalars['GithubURI'];
  /** The total number of teams the user is on in the organization */
  totalTeamCount: Scalars['Int'];
};


/** An organization teams hovercard context */
export type GithubOrganizationTeamsHovercardContextRelevantTeamsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Audit log entry for a org.block_user */
export type GithubOrgBlockUserAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgBlockUserAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The blocked user. */
  blockedUser?: Maybe<GithubUser>;
  /** The username of the blocked user. */
  blockedUserName?: Maybe<Scalars['String']>;
  /** The HTTP path for the blocked user. */
  blockedUserResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the blocked user. */
  blockedUserUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.config.disable_collaborators_only event. */
export type GithubOrgConfigDisableCollaboratorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgConfigDisableCollaboratorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.config.enable_collaborators_only event. */
export type GithubOrgConfigEnableCollaboratorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgConfigEnableCollaboratorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.create event. */
export type GithubOrgCreateAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgCreateAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The billing plan for the Organization. */
  billingPlan?: Maybe<GithubOrgCreateAuditEntryBillingPlan>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The billing plans available for organizations. */
export enum GithubOrgCreateAuditEntryBillingPlan {
  /** Free Plan */
  Free = 'FREE',
  /** Team Plan */
  Business = 'BUSINESS',
  /** Enterprise Cloud Plan */
  BusinessPlus = 'BUSINESS_PLUS',
  /** Legacy Unlimited Plan */
  Unlimited = 'UNLIMITED',
  /** Tiered Per Seat Plan */
  TieredPerSeat = 'TIERED_PER_SEAT'
}

/** Audit log entry for a org.disable_oauth_app_restrictions event. */
export type GithubOrgDisableOauthAppRestrictionsAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgDisableOauthAppRestrictionsAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.disable_saml event. */
export type GithubOrgDisableSamlAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgDisableSamlAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The SAML provider's digest algorithm URL. */
  digestMethodUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The SAML provider's issuer URL. */
  issuerUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The SAML provider's signature algorithm URL. */
  signatureMethodUrl?: Maybe<Scalars['GithubURI']>;
  /** The SAML provider's single sign-on URL. */
  singleSignOnUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.disable_two_factor_requirement event. */
export type GithubOrgDisableTwoFactorRequirementAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgDisableTwoFactorRequirementAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.enable_oauth_app_restrictions event. */
export type GithubOrgEnableOauthAppRestrictionsAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgEnableOauthAppRestrictionsAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.enable_saml event. */
export type GithubOrgEnableSamlAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgEnableSamlAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The SAML provider's digest algorithm URL. */
  digestMethodUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The SAML provider's issuer URL. */
  issuerUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The SAML provider's signature algorithm URL. */
  signatureMethodUrl?: Maybe<Scalars['GithubURI']>;
  /** The SAML provider's single sign-on URL. */
  singleSignOnUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.enable_two_factor_requirement event. */
export type GithubOrgEnableTwoFactorRequirementAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgEnableTwoFactorRequirementAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.invite_member event. */
export type GithubOrgInviteMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgInviteMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The email address of the organization invitation. */
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The organization invitation. */
  organizationInvitation?: Maybe<GithubOrganizationInvitation>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.invite_to_business event. */
export type GithubOrgInviteToBusinessAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgInviteToBusinessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.oauth_app_access_approved event. */
export type GithubOrgOauthAppAccessApprovedAuditEntry = GithubNode & GithubAuditEntry & GithubOauthApplicationAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgOauthAppAccessApprovedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The name of the OAuth Application. */
  oauthApplicationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the OAuth Application */
  oauthApplicationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the OAuth Application */
  oauthApplicationUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.oauth_app_access_denied event. */
export type GithubOrgOauthAppAccessDeniedAuditEntry = GithubNode & GithubAuditEntry & GithubOauthApplicationAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgOauthAppAccessDeniedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The name of the OAuth Application. */
  oauthApplicationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the OAuth Application */
  oauthApplicationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the OAuth Application */
  oauthApplicationUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.oauth_app_access_requested event. */
export type GithubOrgOauthAppAccessRequestedAuditEntry = GithubNode & GithubAuditEntry & GithubOauthApplicationAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgOauthAppAccessRequestedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The name of the OAuth Application. */
  oauthApplicationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the OAuth Application */
  oauthApplicationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the OAuth Application */
  oauthApplicationUrl?: Maybe<Scalars['GithubURI']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.remove_billing_manager event. */
export type GithubOrgRemoveBillingManagerAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgRemoveBillingManagerAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The reason for the billing manager being removed. */
  reason?: Maybe<GithubOrgRemoveBillingManagerAuditEntryReason>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The reason a billing manager was removed from an Organization. */
export enum GithubOrgRemoveBillingManagerAuditEntryReason {
  /** The organization required 2FA of its billing managers and this user did not have 2FA enabled. */
  TwoFactorRequirementNonCompliance = 'TWO_FACTOR_REQUIREMENT_NON_COMPLIANCE',
  /** SAML external identity missing */
  SamlExternalIdentityMissing = 'SAML_EXTERNAL_IDENTITY_MISSING',
  /** SAML SSO enforcement requires an external identity */
  SamlSsoEnforcementRequiresExternalIdentity = 'SAML_SSO_ENFORCEMENT_REQUIRES_EXTERNAL_IDENTITY'
}

/** Audit log entry for a org.remove_member event. */
export type GithubOrgRemoveMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgRemoveMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The types of membership the member has with the organization. */
  membershipTypes?: Maybe<Array<GithubOrgRemoveMemberAuditEntryMembershipType>>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The reason for the member being removed. */
  reason?: Maybe<GithubOrgRemoveMemberAuditEntryReason>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The type of membership a user has with an Organization. */
export enum GithubOrgRemoveMemberAuditEntryMembershipType {
  /** A direct member is a user that is a member of the Organization. */
  DirectMember = 'DIRECT_MEMBER',
  /**
   * Organization administrators have full access and can change several settings,
   * including the names of repositories that belong to the Organization and Owners
   * team membership. In addition, organization admins can delete the organization
   * and all of its repositories.
   */
  Admin = 'ADMIN',
  /** A billing manager is a user who manages the billing settings for the Organization, such as updating payment information. */
  BillingManager = 'BILLING_MANAGER',
  /**
   * An unaffiliated collaborator is a person who is not a member of the
   * Organization and does not have access to any repositories in the Organization.
   */
  Unaffiliated = 'UNAFFILIATED',
  /**
   * An outside collaborator is a person who isn't explicitly a member of the
   * Organization, but who has Read, Write, or Admin permissions to one or more
   * repositories in the organization.
   */
  OutsideCollaborator = 'OUTSIDE_COLLABORATOR'
}

/** The reason a member was removed from an Organization. */
export enum GithubOrgRemoveMemberAuditEntryReason {
  /** The organization required 2FA of its billing managers and this user did not have 2FA enabled. */
  TwoFactorRequirementNonCompliance = 'TWO_FACTOR_REQUIREMENT_NON_COMPLIANCE',
  /** SAML external identity missing */
  SamlExternalIdentityMissing = 'SAML_EXTERNAL_IDENTITY_MISSING',
  /** SAML SSO enforcement requires an external identity */
  SamlSsoEnforcementRequiresExternalIdentity = 'SAML_SSO_ENFORCEMENT_REQUIRES_EXTERNAL_IDENTITY'
}

/** Audit log entry for a org.remove_outside_collaborator event. */
export type GithubOrgRemoveOutsideCollaboratorAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgRemoveOutsideCollaboratorAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The types of membership the outside collaborator has with the organization. */
  membershipTypes?: Maybe<Array<GithubOrgRemoveOutsideCollaboratorAuditEntryMembershipType>>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The reason for the outside collaborator being removed from the Organization. */
  reason?: Maybe<GithubOrgRemoveOutsideCollaboratorAuditEntryReason>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The type of membership a user has with an Organization. */
export enum GithubOrgRemoveOutsideCollaboratorAuditEntryMembershipType {
  /**
   * An outside collaborator is a person who isn't explicitly a member of the
   * Organization, but who has Read, Write, or Admin permissions to one or more
   * repositories in the organization.
   */
  OutsideCollaborator = 'OUTSIDE_COLLABORATOR',
  /**
   * An unaffiliated collaborator is a person who is not a member of the
   * Organization and does not have access to any repositories in the organization.
   */
  Unaffiliated = 'UNAFFILIATED',
  /** A billing manager is a user who manages the billing settings for the Organization, such as updating payment information. */
  BillingManager = 'BILLING_MANAGER'
}

/** The reason an outside collaborator was removed from an Organization. */
export enum GithubOrgRemoveOutsideCollaboratorAuditEntryReason {
  /** The organization required 2FA of its billing managers and this user did not have 2FA enabled. */
  TwoFactorRequirementNonCompliance = 'TWO_FACTOR_REQUIREMENT_NON_COMPLIANCE',
  /** SAML external identity missing */
  SamlExternalIdentityMissing = 'SAML_EXTERNAL_IDENTITY_MISSING'
}

/** Audit log entry for a org.restore_member event. */
export type GithubOrgRestoreMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgRestoreMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The number of custom email routings for the restored member. */
  restoredCustomEmailRoutingsCount?: Maybe<Scalars['Int']>;
  /** The number of issue assignemnts for the restored member. */
  restoredIssueAssignmentsCount?: Maybe<Scalars['Int']>;
  /** Restored organization membership objects. */
  restoredMemberships?: Maybe<Array<GithubOrgRestoreMemberAuditEntryMembership>>;
  /** The number of restored memberships. */
  restoredMembershipsCount?: Maybe<Scalars['Int']>;
  /** The number of repositories of the restored member. */
  restoredRepositoriesCount?: Maybe<Scalars['Int']>;
  /** The number of starred repositories for the restored member. */
  restoredRepositoryStarsCount?: Maybe<Scalars['Int']>;
  /** The number of watched repositories for the restored member. */
  restoredRepositoryWatchesCount?: Maybe<Scalars['Int']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Types of memberships that can be restored for an Organization member. */
export type GithubOrgRestoreMemberAuditEntryMembership = GithubOrgRestoreMemberMembershipOrganizationAuditEntryData | GithubOrgRestoreMemberMembershipRepositoryAuditEntryData | GithubOrgRestoreMemberMembershipTeamAuditEntryData;

/** Metadata for an organization membership for org.restore_member actions */
export type GithubOrgRestoreMemberMembershipOrganizationAuditEntryData = GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgRestoreMemberMembershipOrganizationAuditEntryData';
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
};

/** Metadata for a repository membership for org.restore_member actions */
export type GithubOrgRestoreMemberMembershipRepositoryAuditEntryData = GithubRepositoryAuditEntryData & {
   __typename?: 'GithubOrgRestoreMemberMembershipRepositoryAuditEntryData';
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
};

/** Metadata for a team membership for org.restore_member actions */
export type GithubOrgRestoreMemberMembershipTeamAuditEntryData = GithubTeamAuditEntryData & {
   __typename?: 'GithubOrgRestoreMemberMembershipTeamAuditEntryData';
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.unblock_user */
export type GithubOrgUnblockUserAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgUnblockUserAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The user being unblocked by the organization. */
  blockedUser?: Maybe<GithubUser>;
  /** The username of the blocked user. */
  blockedUserName?: Maybe<Scalars['String']>;
  /** The HTTP path for the blocked user. */
  blockedUserResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the blocked user. */
  blockedUserUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a org.update_default_repository_permission */
export type GithubOrgUpdateDefaultRepositoryPermissionAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgUpdateDefaultRepositoryPermissionAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The new default repository permission level for the organization. */
  permission?: Maybe<GithubOrgUpdateDefaultRepositoryPermissionAuditEntryPermission>;
  /** The former default repository permission level for the organization. */
  permissionWas?: Maybe<GithubOrgUpdateDefaultRepositoryPermissionAuditEntryPermission>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The default permission a repository can have in an Organization. */
export enum GithubOrgUpdateDefaultRepositoryPermissionAuditEntryPermission {
  /** Can read and clone repositories. */
  Read = 'READ',
  /** Can read, clone and push to repositories. */
  Write = 'WRITE',
  /** Can read, clone, push, and add collaborators to repositories. */
  Admin = 'ADMIN',
  /** No default permission value. */
  None = 'NONE'
}

/** Audit log entry for a org.update_member event. */
export type GithubOrgUpdateMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgUpdateMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The new member permission level for the organization. */
  permission?: Maybe<GithubOrgUpdateMemberAuditEntryPermission>;
  /** The former member permission level for the organization. */
  permissionWas?: Maybe<GithubOrgUpdateMemberAuditEntryPermission>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The permissions available to members on an Organization. */
export enum GithubOrgUpdateMemberAuditEntryPermission {
  /** Can read and clone repositories. */
  Read = 'READ',
  /** Can read, clone, push, and add collaborators to repositories. */
  Admin = 'ADMIN'
}

/** Audit log entry for a org.update_member_repository_creation_permission event. */
export type GithubOrgUpdateMemberRepositoryCreationPermissionAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgUpdateMemberRepositoryCreationPermissionAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** Can members create repositories in the organization. */
  canCreateRepositories?: Maybe<Scalars['Boolean']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The permission for visibility level of repositories for this organization. */
  visibility?: Maybe<GithubOrgUpdateMemberRepositoryCreationPermissionAuditEntryVisibility>;
};

/** The permissions available for repository creation on an Organization. */
export enum GithubOrgUpdateMemberRepositoryCreationPermissionAuditEntryVisibility {
  /** All organization members are restricted from creating any repositories. */
  All = 'ALL',
  /** All organization members are restricted from creating public repositories. */
  Public = 'PUBLIC'
}

/** Audit log entry for a org.update_member_repository_invitation_permission event. */
export type GithubOrgUpdateMemberRepositoryInvitationPermissionAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubOrgUpdateMemberRepositoryInvitationPermissionAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** Can outside collaborators be invited to repositories in the organization. */
  canInviteOutsideCollaboratorsToRepositories?: Maybe<Scalars['Boolean']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Information about pagination in a connection. */
export type GithubPageInfo = {
   __typename?: 'GithubPageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']>;
};

/** Types that can grant permissions on a repository to a user */
export type GithubPermissionGranter = GithubOrganization | GithubRepository | GithubTeam;

/** A level of permission and source for a user's access to a repository. */
export type GithubPermissionSource = {
   __typename?: 'GithubPermissionSource';
  /** The organization the repository belongs to. */
  organization: GithubOrganization;
  /** The level of access this source has granted to the user. */
  permission: GithubDefaultRepositoryPermissionField;
  /** The source of this permission. */
  source: GithubPermissionGranter;
};

/** Types that can be pinned to a profile page. */
export type GithubPinnableItem = GithubGist | GithubRepository;

/** The connection type for PinnableItem. */
export type GithubPinnableItemConnection = {
   __typename?: 'GithubPinnableItemConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPinnableItemEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPinnableItem>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPinnableItemEdge = {
   __typename?: 'GithubPinnableItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPinnableItem>;
};

/** Represents items that can be pinned to a profile page or dashboard. */
export enum GithubPinnableItemType {
  /** A repository. */
  Repository = 'REPOSITORY',
  /** A gist. */
  Gist = 'GIST',
  /** An issue. */
  Issue = 'ISSUE',
  /** A project. */
  Project = 'PROJECT',
  /** A pull request. */
  PullRequest = 'PULL_REQUEST',
  /** A user. */
  User = 'USER',
  /** An organization. */
  Organization = 'ORGANIZATION',
  /** A team. */
  Team = 'TEAM'
}

/** Represents a 'pinned' event on a given issue or pull request. */
export type GithubPinnedEvent = GithubNode & {
   __typename?: 'GithubPinnedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the issue associated with the event. */
  issue: GithubIssue;
};


/** Audit log entry for a private_repository_forking.disable event. */
export type GithubPrivateRepositoryForkingDisableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubPrivateRepositoryForkingDisableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a private_repository_forking.enable event. */
export type GithubPrivateRepositoryForkingEnableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubPrivateRepositoryForkingEnableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/**
 * A curatable list of repositories relating to a repository owner, which defaults
 * to showing the most popular repositories they own.
 */
export type GithubProfileItemShowcase = {
   __typename?: 'GithubProfileItemShowcase';
  /** Whether or not the owner has pinned any repositories or gists. */
  hasPinnedItems: Scalars['Boolean'];
  /**
   * The repositories and gists in the showcase. If the profile owner has any
   * pinned items, those will be returned. Otherwise, the profile owner's popular
   * repositories will be returned.
   */
  items: GithubPinnableItemConnection;
};


/**
 * A curatable list of repositories relating to a repository owner, which defaults
 * to showing the most popular repositories they own.
 */
export type GithubProfileItemShowcaseItemsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Represents any entity on GitHub that has a profile page. */
export type GithubProfileOwner = {
  /** Determine if this repository owner has any items that can be pinned to their profile. */
  anyPinnableItems: Scalars['Boolean'];
  /** The public profile email. */
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /**
   * Showcases a selection of repositories and gists that the profile owner has
   * either curated or that have been selected automatically based on popularity.
   */
  itemShowcase: GithubProfileItemShowcase;
  /** The public profile location. */
  location?: Maybe<Scalars['String']>;
  /** The username used to login. */
  login: Scalars['String'];
  /** The public profile name. */
  name?: Maybe<Scalars['String']>;
  /** A list of repositories and gists this profile owner can pin to their profile. */
  pinnableItems: GithubPinnableItemConnection;
  /** A list of repositories and gists this profile owner has pinned to their profile */
  pinnedItems: GithubPinnableItemConnection;
  /** Returns how many more items this profile owner can pin to their profile. */
  pinnedItemsRemaining: Scalars['Int'];
  /** Can the viewer pin repositories and gists to the profile? */
  viewerCanChangePinnedItems: Scalars['Boolean'];
  /** The public profile website URL. */
  websiteUrl?: Maybe<Scalars['GithubURI']>;
};


/** Represents any entity on GitHub that has a profile page. */
export type GithubProfileOwnerAnyPinnableItemsArgs = {
  type?: Maybe<GithubPinnableItemType>;
};


/** Represents any entity on GitHub that has a profile page. */
export type GithubProfileOwnerPinnableItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents any entity on GitHub that has a profile page. */
export type GithubProfileOwnerPinnedItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Projects manage issues, pull requests and notes within a project owner. */
export type GithubProject = GithubNode & GithubClosable & GithubUpdatable & {
   __typename?: 'GithubProject';
  /** The project's description body. */
  body?: Maybe<Scalars['String']>;
  /** The projects description body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** `true` if the object is closed (definition of closed may depend on type) */
  closed: Scalars['Boolean'];
  /** Identifies the date and time when the object was closed. */
  closedAt?: Maybe<Scalars['GithubDateTime']>;
  /** List of columns in the project */
  columns: GithubProjectColumnConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The actor who originally created the project. */
  creator?: Maybe<GithubActor>;
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** The project's name. */
  name: Scalars['String'];
  /** The project's number. */
  number: Scalars['Int'];
  /** The project's owner. Currently limited to repositories, organizations, and users. */
  owner: GithubProjectOwner;
  /** List of pending cards in this project */
  pendingCards: GithubProjectCardConnection;
  /** The HTTP path for this project */
  resourcePath: Scalars['GithubURI'];
  /** Whether the project is open or closed. */
  state: GithubProjectState;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this project */
  url: Scalars['GithubURI'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
};


/** Projects manage issues, pull requests and notes within a project owner. */
export type GithubProjectColumnsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Projects manage issues, pull requests and notes within a project owner. */
export type GithubProjectPendingCardsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  archivedStates?: Maybe<Array<Maybe<GithubProjectCardArchivedState>>>;
};

/** A card in a project. */
export type GithubProjectCard = GithubNode & {
   __typename?: 'GithubProjectCard';
  /**
   * The project column this card is associated under. A card may only belong to one
   * project column at a time. The column field will be null if the card is created
   * in a pending state and has yet to be associated with a column. Once cards are
   * associated with a column, they will not become pending in the future.
   */
  column?: Maybe<GithubProjectColumn>;
  /** The card content item */
  content?: Maybe<GithubProjectCardItem>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The actor who created this card */
  creator?: Maybe<GithubActor>;
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** Whether the card is archived */
  isArchived: Scalars['Boolean'];
  /** The card note */
  note?: Maybe<Scalars['String']>;
  /** The project that contains this card. */
  project: GithubProject;
  /** The HTTP path for this card */
  resourcePath: Scalars['GithubURI'];
  /** The state of ProjectCard */
  state?: Maybe<GithubProjectCardState>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this card */
  url: Scalars['GithubURI'];
};

/** The possible archived states of a project card. */
export enum GithubProjectCardArchivedState {
  /** A project card that is archived */
  Archived = 'ARCHIVED',
  /** A project card that is not archived */
  NotArchived = 'NOT_ARCHIVED'
}

/** The connection type for ProjectCard. */
export type GithubProjectCardConnection = {
   __typename?: 'GithubProjectCardConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubProjectCardEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubProjectCard>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubProjectCardEdge = {
   __typename?: 'GithubProjectCardEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubProjectCard>;
};

/** Types that can be inside Project Cards. */
export type GithubProjectCardItem = GithubIssue | GithubPullRequest;

/** Various content states of a ProjectCard */
export enum GithubProjectCardState {
  /** The card has content only. */
  ContentOnly = 'CONTENT_ONLY',
  /** The card has a note only. */
  NoteOnly = 'NOTE_ONLY',
  /** The card is redacted. */
  Redacted = 'REDACTED'
}

/** A column inside a project. */
export type GithubProjectColumn = GithubNode & {
   __typename?: 'GithubProjectColumn';
  /** List of cards in the column */
  cards: GithubProjectCardConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** The project column's name. */
  name: Scalars['String'];
  /** The project that contains this column. */
  project: GithubProject;
  /** The semantic purpose of the column */
  purpose?: Maybe<GithubProjectColumnPurpose>;
  /** The HTTP path for this project column */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this project column */
  url: Scalars['GithubURI'];
};


/** A column inside a project. */
export type GithubProjectColumnCardsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  archivedStates?: Maybe<Array<Maybe<GithubProjectCardArchivedState>>>;
};

/** The connection type for ProjectColumn. */
export type GithubProjectColumnConnection = {
   __typename?: 'GithubProjectColumnConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubProjectColumnEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubProjectColumn>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubProjectColumnEdge = {
   __typename?: 'GithubProjectColumnEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubProjectColumn>;
};

/** The semantic purpose of the column - todo, in progress, or done. */
export enum GithubProjectColumnPurpose {
  /** The column contains cards still to be worked on */
  Todo = 'TODO',
  /** The column contains cards which are currently being worked on */
  InProgress = 'IN_PROGRESS',
  /** The column contains cards which are complete */
  Done = 'DONE'
}

/** A list of projects associated with the owner. */
export type GithubProjectConnection = {
   __typename?: 'GithubProjectConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubProjectEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubProject>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubProjectEdge = {
   __typename?: 'GithubProjectEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubProject>;
};

/** Ways in which lists of projects can be ordered upon return. */
export type GithubProjectOrder = {
  /** The field in which to order projects by. */
  field: GithubProjectOrderField;
  /** The direction in which to order projects by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which project connections can be ordered. */
export enum GithubProjectOrderField {
  /** Order projects by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order projects by update time */
  UpdatedAt = 'UPDATED_AT',
  /** Order projects by name */
  Name = 'NAME'
}

/** Represents an owner of a Project. */
export type GithubProjectOwner = {
  id: Scalars['ID'];
  /** Find project by number. */
  project?: Maybe<GithubProject>;
  /** A list of projects under the owner. */
  projects: GithubProjectConnection;
  /** The HTTP path listing owners projects */
  projectsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL listing owners projects */
  projectsUrl: Scalars['GithubURI'];
  /** Can the current viewer create new projects on this owner. */
  viewerCanCreateProjects: Scalars['Boolean'];
};


/** Represents an owner of a Project. */
export type GithubProjectOwnerProjectArgs = {
  number: Scalars['Int'];
};


/** Represents an owner of a Project. */
export type GithubProjectOwnerProjectsArgs = {
  orderBy?: Maybe<GithubProjectOrder>;
  search?: Maybe<Scalars['String']>;
  states?: Maybe<Array<GithubProjectState>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** State of the project; either 'open' or 'closed' */
export enum GithubProjectState {
  /** The project is open. */
  Open = 'OPEN',
  /** The project is closed. */
  Closed = 'CLOSED'
}

/** GitHub-provided templates for Projects */
export enum GithubProjectTemplate {
  /** Create a board with columns for To do, In progress and Done. */
  BasicKanban = 'BASIC_KANBAN',
  /** Create a board with v2 triggers to automatically move cards across To do, In progress and Done columns. */
  AutomatedKanbanV2 = 'AUTOMATED_KANBAN_V2',
  /** Create a board with triggers to automatically move cards across columns with review automation. */
  AutomatedReviewsKanban = 'AUTOMATED_REVIEWS_KANBAN',
  /** Create a board to triage and prioritize bugs with To do, priority, and Done columns. */
  BugTriage = 'BUG_TRIAGE'
}

/** A user's public key. */
export type GithubPublicKey = GithubNode & {
   __typename?: 'GithubPublicKey';
  /** The last time this authorization was used to perform an action. Values will be null for keys not owned by the user. */
  accessedAt?: Maybe<Scalars['GithubDateTime']>;
  /**
   * Identifies the date and time when the key was created. Keys created before
   * March 5th, 2014 have inaccurate values. Values will be null for keys not owned by the user.
   */
  createdAt?: Maybe<Scalars['GithubDateTime']>;
  /** The fingerprint for this PublicKey. */
  fingerprint: Scalars['String'];
  id: Scalars['ID'];
  /** Whether this PublicKey is read-only or not. Values will be null for keys not owned by the user. */
  isReadOnly?: Maybe<Scalars['Boolean']>;
  /** The public key string. */
  key: Scalars['String'];
  /**
   * Identifies the date and time when the key was updated. Keys created before
   * March 5th, 2014 may have inaccurate values. Values will be null for keys not
   * owned by the user.
   */
  updatedAt?: Maybe<Scalars['GithubDateTime']>;
};

/** The connection type for PublicKey. */
export type GithubPublicKeyConnection = {
   __typename?: 'GithubPublicKeyConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPublicKeyEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPublicKey>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPublicKeyEdge = {
   __typename?: 'GithubPublicKeyEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPublicKey>;
};

/** A repository pull request. */
export type GithubPullRequest = GithubNode & GithubAssignable & GithubClosable & GithubComment & GithubUpdatable & GithubUpdatableComment & GithubLabelable & GithubLockable & GithubReactable & GithubRepositoryNode & GithubSubscribable & GithubUniformResourceLocatable & {
   __typename?: 'GithubPullRequest';
  /** Reason that the conversation was locked. */
  activeLockReason?: Maybe<GithubLockReason>;
  /** The number of additions in this pull request. */
  additions: Scalars['Int'];
  /** A list of Users assigned to this object. */
  assignees: GithubUserConnection;
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** Identifies the base Ref associated with the pull request. */
  baseRef?: Maybe<GithubRef>;
  /** Identifies the name of the base Ref associated with the pull request, even if the ref has been deleted. */
  baseRefName: Scalars['String'];
  /** Identifies the oid of the base ref associated with the pull request, even if the ref has been deleted. */
  baseRefOid: Scalars['GithubGitObjectID'];
  /** The repository associated with this pull request's base Ref. */
  baseRepository?: Maybe<GithubRepository>;
  /** The body as Markdown. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** The number of changed files in this pull request. */
  changedFiles: Scalars['Int'];
  /** The HTTP path for the checks of this pull request. */
  checksResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for the checks of this pull request. */
  checksUrl: Scalars['GithubURI'];
  /** `true` if the pull request is closed */
  closed: Scalars['Boolean'];
  /** Identifies the date and time when the object was closed. */
  closedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of comments associated with the pull request. */
  comments: GithubIssueCommentConnection;
  /** A list of commits present in this pull request's head branch not present in the base branch. */
  commits: GithubPullRequestCommitConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The number of deletions in this pull request. */
  deletions: Scalars['Int'];
  /** The actor who edited this pull request's body. */
  editor?: Maybe<GithubActor>;
  /** Lists the files changed within this pull request. */
  files?: Maybe<GithubPullRequestChangedFileConnection>;
  /** Identifies the head Ref associated with the pull request. */
  headRef?: Maybe<GithubRef>;
  /** Identifies the name of the head Ref associated with the pull request, even if the ref has been deleted. */
  headRefName: Scalars['String'];
  /** Identifies the oid of the head ref associated with the pull request, even if the ref has been deleted. */
  headRefOid: Scalars['GithubGitObjectID'];
  /** The repository associated with this pull request's head Ref. */
  headRepository?: Maybe<GithubRepository>;
  /** The owner of the repository associated with this pull request's head Ref. */
  headRepositoryOwner?: Maybe<GithubRepositoryOwner>;
  /** The hovercard information for this issue */
  hovercard: GithubHovercard;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** The head and base repositories are different. */
  isCrossRepository: Scalars['Boolean'];
  /** Identifies if the pull request is a draft. */
  isDraft: Scalars['Boolean'];
  /** A list of labels associated with the object. */
  labels?: Maybe<GithubLabelConnection>;
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** `true` if the pull request is locked */
  locked: Scalars['Boolean'];
  /** Indicates whether maintainers can modify the pull request. */
  maintainerCanModify: Scalars['Boolean'];
  /** The commit that was created when this pull request was merged. */
  mergeCommit?: Maybe<GithubCommit>;
  /** Whether or not the pull request can be merged based on the existence of merge conflicts. */
  mergeable: GithubMergeableState;
  /** Whether or not the pull request was merged. */
  merged: Scalars['Boolean'];
  /** The date and time that the pull request was merged. */
  mergedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The actor who merged the pull request. */
  mergedBy?: Maybe<GithubActor>;
  /** Identifies the milestone associated with the pull request. */
  milestone?: Maybe<GithubMilestone>;
  /** Identifies the pull request number. */
  number: Scalars['Int'];
  /** A list of Users that are participating in the Pull Request conversation. */
  participants: GithubUserConnection;
  /** The permalink to the pull request. */
  permalink: Scalars['GithubURI'];
  /**
   * The commit that GitHub automatically generated to test if this pull request
   * could be merged. This field will not return a value if the pull request is
   * merged, or if the test merge commit is still being generated. See the
   * `mergeable` field for more details on the mergeability of the pull request.
   */
  potentialMergeCommit?: Maybe<GithubCommit>;
  /** List of project cards associated with this pull request. */
  projectCards: GithubProjectCardConnection;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path for this pull request. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP path for reverting this pull request. */
  revertResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for reverting this pull request. */
  revertUrl: Scalars['GithubURI'];
  /** The current status of this pull request with respect to code review. */
  reviewDecision?: Maybe<GithubPullRequestReviewDecision>;
  /** A list of review requests associated with the pull request. */
  reviewRequests?: Maybe<GithubReviewRequestConnection>;
  /** The list of all review threads for this pull request. */
  reviewThreads: GithubPullRequestReviewThreadConnection;
  /** A list of reviews associated with the pull request. */
  reviews?: Maybe<GithubPullRequestReviewConnection>;
  /** Identifies the state of the pull request. */
  state: GithubPullRequestState;
  /** A list of reviewer suggestions based on commit history and past review comments. */
  suggestedReviewers: Array<Maybe<GithubSuggestedReviewer>>;
  /**
   * A list of events, comments, commits, etc. associated with the pull request.
   * @deprecated `timeline` will be removed Use PullRequest.timelineItems instead. Removal on 2019-10-01 UTC.
   */
  timeline: GithubPullRequestTimelineConnection;
  /** A list of events, comments, commits, etc. associated with the pull request. */
  timelineItems: GithubPullRequestTimelineItemsConnection;
  /** Identifies the pull request title. */
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this pull request. */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Whether or not the viewer can apply suggestion. */
  viewerCanApplySuggestion: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
};


/** A repository pull request. */
export type GithubPullRequestAssigneesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestCommitsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestFilesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestHovercardArgs = {
  includeNotificationContexts?: Maybe<Scalars['Boolean']>;
};


/** A repository pull request. */
export type GithubPullRequestLabelsArgs = {
  orderBy?: Maybe<GithubLabelOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestParticipantsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestProjectCardsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  archivedStates?: Maybe<Array<Maybe<GithubProjectCardArchivedState>>>;
};


/** A repository pull request. */
export type GithubPullRequestReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** A repository pull request. */
export type GithubPullRequestReviewRequestsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestReviewThreadsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestReviewsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  states?: Maybe<Array<GithubPullRequestReviewState>>;
  author?: Maybe<Scalars['String']>;
};


/** A repository pull request. */
export type GithubPullRequestTimelineArgs = {
  since?: Maybe<Scalars['GithubDateTime']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestTimelineItemsArgs = {
  since?: Maybe<Scalars['GithubDateTime']>;
  skip?: Maybe<Scalars['Int']>;
  itemTypes?: Maybe<Array<GithubPullRequestTimelineItemsItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository pull request. */
export type GithubPullRequestUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** A file changed in a pull request. */
export type GithubPullRequestChangedFile = {
   __typename?: 'GithubPullRequestChangedFile';
  /** The number of additions to the file. */
  additions: Scalars['Int'];
  /** The number of deletions to the file. */
  deletions: Scalars['Int'];
  /** The path of the file. */
  path: Scalars['String'];
};

/** The connection type for PullRequestChangedFile. */
export type GithubPullRequestChangedFileConnection = {
   __typename?: 'GithubPullRequestChangedFileConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestChangedFileEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestChangedFile>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPullRequestChangedFileEdge = {
   __typename?: 'GithubPullRequestChangedFileEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestChangedFile>;
};

/** Represents a Git commit part of a pull request. */
export type GithubPullRequestCommit = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubPullRequestCommit';
  /** The Git commit object */
  commit: GithubCommit;
  id: Scalars['ID'];
  /** The pull request this commit belongs to */
  pullRequest: GithubPullRequest;
  /** The HTTP path for this pull request commit */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this pull request commit */
  url: Scalars['GithubURI'];
};

/** Represents a commit comment thread part of a pull request. */
export type GithubPullRequestCommitCommentThread = GithubNode & GithubRepositoryNode & {
   __typename?: 'GithubPullRequestCommitCommentThread';
  /** The comments that exist in this thread. */
  comments: GithubCommitCommentConnection;
  /** The commit the comments were made on. */
  commit: GithubCommit;
  id: Scalars['ID'];
  /** The file the comments were made on. */
  path?: Maybe<Scalars['String']>;
  /** The position in the diff for the commit that the comment was made on. */
  position?: Maybe<Scalars['Int']>;
  /** The pull request this commit comment thread belongs to */
  pullRequest: GithubPullRequest;
  /** The repository associated with this node. */
  repository: GithubRepository;
};


/** Represents a commit comment thread part of a pull request. */
export type GithubPullRequestCommitCommentThreadCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for PullRequestCommit. */
export type GithubPullRequestCommitConnection = {
   __typename?: 'GithubPullRequestCommitConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestCommitEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestCommit>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPullRequestCommitEdge = {
   __typename?: 'GithubPullRequestCommitEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestCommit>;
};

/** The connection type for PullRequest. */
export type GithubPullRequestConnection = {
   __typename?: 'GithubPullRequestConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequest>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** This aggregates pull requests opened by a user within one repository. */
export type GithubPullRequestContributionsByRepository = {
   __typename?: 'GithubPullRequestContributionsByRepository';
  /** The pull request contributions. */
  contributions: GithubCreatedPullRequestContributionConnection;
  /** The repository in which the pull requests were opened. */
  repository: GithubRepository;
};


/** This aggregates pull requests opened by a user within one repository. */
export type GithubPullRequestContributionsByRepositoryContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubContributionOrder>;
};

/** An edge in a connection. */
export type GithubPullRequestEdge = {
   __typename?: 'GithubPullRequestEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequest>;
};

/** Represents available types of methods to use when merging a pull request. */
export enum GithubPullRequestMergeMethod {
  /** Add all commits from the head branch to the base branch with a merge commit. */
  Merge = 'MERGE',
  /** Combine all commits from the head branch into a single commit in the base branch. */
  Squash = 'SQUASH',
  /** Add all commits from the head branch onto the base branch individually. */
  Rebase = 'REBASE'
}

/** Ways in which lists of issues can be ordered upon return. */
export type GithubPullRequestOrder = {
  /** The field in which to order pull requests by. */
  field: GithubPullRequestOrderField;
  /** The direction in which to order pull requests by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which pull_requests connections can be ordered. */
export enum GithubPullRequestOrderField {
  /** Order pull_requests by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order pull_requests by update time */
  UpdatedAt = 'UPDATED_AT'
}

/** A review object for a given pull request. */
export type GithubPullRequestReview = GithubNode & GithubComment & GithubDeletable & GithubUpdatable & GithubUpdatableComment & GithubReactable & GithubRepositoryNode & {
   __typename?: 'GithubPullRequestReview';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** Identifies the pull request review body. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body of this review rendered as plain text. */
  bodyText: Scalars['String'];
  /** A list of review comments for the current pull request review. */
  comments: GithubPullRequestReviewCommentConnection;
  /** Identifies the commit associated with this pull request review. */
  commit?: Maybe<GithubCommit>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of teams that this review was made on behalf of. */
  onBehalfOf: GithubTeamConnection;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the pull request associated with this pull request review. */
  pullRequest: GithubPullRequest;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path permalink for this PullRequestReview. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the current state of the pull request review. */
  state: GithubPullRequestReviewState;
  /** Identifies when the Pull Request Review was submitted */
  submittedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL permalink for this PullRequestReview. */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** A review object for a given pull request. */
export type GithubPullRequestReviewCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A review object for a given pull request. */
export type GithubPullRequestReviewOnBehalfOfArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A review object for a given pull request. */
export type GithubPullRequestReviewReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** A review object for a given pull request. */
export type GithubPullRequestReviewUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** A review comment associated with a given repository pull request. */
export type GithubPullRequestReviewComment = GithubNode & GithubComment & GithubDeletable & GithubUpdatable & GithubUpdatableComment & GithubReactable & GithubRepositoryNode & {
   __typename?: 'GithubPullRequestReviewComment';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the subject of the comment. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** The comment body of this review comment. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The comment body of this review comment rendered as plain text. */
  bodyText: Scalars['String'];
  /** Identifies the commit associated with the comment. */
  commit?: Maybe<GithubCommit>;
  /** Identifies when the comment was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The diff hunk to which the comment applies. */
  diffHunk: Scalars['String'];
  /** Identifies when the comment was created in a draft state. */
  draftedAt: Scalars['GithubDateTime'];
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** Returns whether or not a comment has been minimized. */
  isMinimized: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Returns why the comment was minimized. */
  minimizedReason?: Maybe<Scalars['String']>;
  /** Identifies the original commit associated with the comment. */
  originalCommit?: Maybe<GithubCommit>;
  /** The original line index in the diff to which the comment applies. */
  originalPosition: Scalars['Int'];
  /** Identifies when the comment body is outdated */
  outdated: Scalars['Boolean'];
  /** The path to which the comment applies. */
  path: Scalars['String'];
  /** The line index in the diff to which the comment applies. */
  position?: Maybe<Scalars['Int']>;
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The pull request associated with this review comment. */
  pullRequest: GithubPullRequest;
  /** The pull request review associated with this review comment. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The comment this is a reply to. */
  replyTo?: Maybe<GithubPullRequestReviewComment>;
  /** The repository associated with this node. */
  repository: GithubRepository;
  /** The HTTP path permalink for this review comment. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the state of the comment. */
  state: GithubPullRequestReviewCommentState;
  /** Identifies when the comment was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL permalink for this review comment. */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Check if the current viewer can minimize this object. */
  viewerCanMinimize: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** A review comment associated with a given repository pull request. */
export type GithubPullRequestReviewCommentReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** A review comment associated with a given repository pull request. */
export type GithubPullRequestReviewCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for PullRequestReviewComment. */
export type GithubPullRequestReviewCommentConnection = {
   __typename?: 'GithubPullRequestReviewCommentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestReviewCommentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestReviewComment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPullRequestReviewCommentEdge = {
   __typename?: 'GithubPullRequestReviewCommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestReviewComment>;
};

/** The possible states of a pull request review comment. */
export enum GithubPullRequestReviewCommentState {
  /** A comment that is part of a pending review */
  Pending = 'PENDING',
  /** A comment that is part of a submitted review */
  Submitted = 'SUBMITTED'
}

/** The connection type for PullRequestReview. */
export type GithubPullRequestReviewConnection = {
   __typename?: 'GithubPullRequestReviewConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestReviewEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestReview>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** This aggregates pull request reviews made by a user within one repository. */
export type GithubPullRequestReviewContributionsByRepository = {
   __typename?: 'GithubPullRequestReviewContributionsByRepository';
  /** The pull request review contributions. */
  contributions: GithubCreatedPullRequestReviewContributionConnection;
  /** The repository in which the pull request reviews were made. */
  repository: GithubRepository;
};


/** This aggregates pull request reviews made by a user within one repository. */
export type GithubPullRequestReviewContributionsByRepositoryContributionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubContributionOrder>;
};

/** The review status of a pull request. */
export enum GithubPullRequestReviewDecision {
  /** Changes have been requested on the pull request. */
  ChangesRequested = 'CHANGES_REQUESTED',
  /** The pull request has received an approving review. */
  Approved = 'APPROVED',
  /** A review is required before the pull request can be merged. */
  ReviewRequired = 'REVIEW_REQUIRED'
}

/** An edge in a connection. */
export type GithubPullRequestReviewEdge = {
   __typename?: 'GithubPullRequestReviewEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestReview>;
};

/** The possible events to perform on a pull request review. */
export enum GithubPullRequestReviewEvent {
  /** Submit general feedback without explicit approval. */
  Comment = 'COMMENT',
  /** Submit feedback and approve merging these changes. */
  Approve = 'APPROVE',
  /** Submit feedback that must be addressed before merging. */
  RequestChanges = 'REQUEST_CHANGES',
  /** Dismiss review so it now longer effects merging. */
  Dismiss = 'DISMISS'
}

/** The possible states of a pull request review. */
export enum GithubPullRequestReviewState {
  /** A review that has not yet been submitted. */
  Pending = 'PENDING',
  /** An informational review. */
  Commented = 'COMMENTED',
  /** A review allowing the pull request to merge. */
  Approved = 'APPROVED',
  /** A review blocking the pull request from merging. */
  ChangesRequested = 'CHANGES_REQUESTED',
  /** A review that has been dismissed. */
  Dismissed = 'DISMISSED'
}

/** A threaded list of comments for a given pull request. */
export type GithubPullRequestReviewThread = GithubNode & {
   __typename?: 'GithubPullRequestReviewThread';
  /** A list of pull request comments associated with the thread. */
  comments: GithubPullRequestReviewCommentConnection;
  id: Scalars['ID'];
  /** Whether this thread has been resolved */
  isResolved: Scalars['Boolean'];
  /** Identifies the pull request associated with this thread. */
  pullRequest: GithubPullRequest;
  /** Identifies the repository associated with this thread. */
  repository: GithubRepository;
  /** The user who resolved this thread */
  resolvedBy?: Maybe<GithubUser>;
  /** Whether or not the viewer can resolve this thread */
  viewerCanResolve: Scalars['Boolean'];
  /** Whether or not the viewer can unresolve this thread */
  viewerCanUnresolve: Scalars['Boolean'];
};


/** A threaded list of comments for a given pull request. */
export type GithubPullRequestReviewThreadCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  skip?: Maybe<Scalars['Int']>;
};

/** Review comment threads for a pull request review. */
export type GithubPullRequestReviewThreadConnection = {
   __typename?: 'GithubPullRequestReviewThreadConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestReviewThreadEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestReviewThread>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPullRequestReviewThreadEdge = {
   __typename?: 'GithubPullRequestReviewThreadEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestReviewThread>;
};

/** Represents the latest point in the pull request timeline for which the viewer has seen the pull request's commits. */
export type GithubPullRequestRevisionMarker = {
   __typename?: 'GithubPullRequestRevisionMarker';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The last commit the viewer has seen. */
  lastSeenCommit: GithubCommit;
  /** The pull request to which the marker belongs. */
  pullRequest: GithubPullRequest;
};

/** The possible states of a pull request. */
export enum GithubPullRequestState {
  /** A pull request that is still open. */
  Open = 'OPEN',
  /** A pull request that has been closed without being merged. */
  Closed = 'CLOSED',
  /** A pull request that has been closed by being merged. */
  Merged = 'MERGED'
}

/** The connection type for PullRequestTimelineItem. */
export type GithubPullRequestTimelineConnection = {
   __typename?: 'GithubPullRequestTimelineConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestTimelineItemEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestTimelineItem>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An item in an pull request timeline */
export type GithubPullRequestTimelineItem = GithubAssignedEvent | GithubBaseRefForcePushedEvent | GithubClosedEvent | GithubCommit | GithubCommitCommentThread | GithubCrossReferencedEvent | GithubDemilestonedEvent | GithubDeployedEvent | GithubDeploymentEnvironmentChangedEvent | GithubHeadRefDeletedEvent | GithubHeadRefForcePushedEvent | GithubHeadRefRestoredEvent | GithubIssueComment | GithubLabeledEvent | GithubLockedEvent | GithubMergedEvent | GithubMilestonedEvent | GithubPullRequestReview | GithubPullRequestReviewComment | GithubPullRequestReviewThread | GithubReferencedEvent | GithubRenamedTitleEvent | GithubReopenedEvent | GithubReviewDismissedEvent | GithubReviewRequestRemovedEvent | GithubReviewRequestedEvent | GithubSubscribedEvent | GithubUnassignedEvent | GithubUnlabeledEvent | GithubUnlockedEvent | GithubUnsubscribedEvent | GithubUserBlockedEvent;

/** An edge in a connection. */
export type GithubPullRequestTimelineItemEdge = {
   __typename?: 'GithubPullRequestTimelineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestTimelineItem>;
};

/** An item in a pull request timeline */
export type GithubPullRequestTimelineItems = GithubAddedToProjectEvent | GithubAssignedEvent | GithubBaseRefChangedEvent | GithubBaseRefForcePushedEvent | GithubClosedEvent | GithubCommentDeletedEvent | GithubConnectedEvent | GithubConvertedNoteToIssueEvent | GithubCrossReferencedEvent | GithubDemilestonedEvent | GithubDeployedEvent | GithubDeploymentEnvironmentChangedEvent | GithubDisconnectedEvent | GithubHeadRefDeletedEvent | GithubHeadRefForcePushedEvent | GithubHeadRefRestoredEvent | GithubIssueComment | GithubLabeledEvent | GithubLockedEvent | GithubMarkedAsDuplicateEvent | GithubMentionedEvent | GithubMergedEvent | GithubMilestonedEvent | GithubMovedColumnsInProjectEvent | GithubPinnedEvent | GithubPullRequestCommit | GithubPullRequestCommitCommentThread | GithubPullRequestReview | GithubPullRequestReviewThread | GithubPullRequestRevisionMarker | GithubReadyForReviewEvent | GithubReferencedEvent | GithubRemovedFromProjectEvent | GithubRenamedTitleEvent | GithubReopenedEvent | GithubReviewDismissedEvent | GithubReviewRequestRemovedEvent | GithubReviewRequestedEvent | GithubSubscribedEvent | GithubTransferredEvent | GithubUnassignedEvent | GithubUnlabeledEvent | GithubUnlockedEvent | GithubUnmarkedAsDuplicateEvent | GithubUnpinnedEvent | GithubUnsubscribedEvent | GithubUserBlockedEvent;

/** The connection type for PullRequestTimelineItems. */
export type GithubPullRequestTimelineItemsConnection = {
   __typename?: 'GithubPullRequestTimelineItemsConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPullRequestTimelineItemsEdge>>>;
  /** Identifies the count of items after applying `before` and `after` filters. */
  filteredCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPullRequestTimelineItems>>>;
  /** Identifies the count of items after applying `before`/`after` filters and `first`/`last`/`skip` slicing. */
  pageCount: Scalars['Int'];
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** Identifies the date and time when the timeline was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** An edge in a connection. */
export type GithubPullRequestTimelineItemsEdge = {
   __typename?: 'GithubPullRequestTimelineItemsEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPullRequestTimelineItems>;
};

/** The possible item types found in a timeline. */
export enum GithubPullRequestTimelineItemsItemType {
  /** Represents a Git commit part of a pull request. */
  PullRequestCommit = 'PULL_REQUEST_COMMIT',
  /** Represents a commit comment thread part of a pull request. */
  PullRequestCommitCommentThread = 'PULL_REQUEST_COMMIT_COMMENT_THREAD',
  /** A review object for a given pull request. */
  PullRequestReview = 'PULL_REQUEST_REVIEW',
  /** A threaded list of comments for a given pull request. */
  PullRequestReviewThread = 'PULL_REQUEST_REVIEW_THREAD',
  /** Represents the latest point in the pull request timeline for which the viewer has seen the pull request's commits. */
  PullRequestRevisionMarker = 'PULL_REQUEST_REVISION_MARKER',
  /** Represents a 'base_ref_changed' event on a given issue or pull request. */
  BaseRefChangedEvent = 'BASE_REF_CHANGED_EVENT',
  /** Represents a 'base_ref_force_pushed' event on a given pull request. */
  BaseRefForcePushedEvent = 'BASE_REF_FORCE_PUSHED_EVENT',
  /** Represents a 'deployed' event on a given pull request. */
  DeployedEvent = 'DEPLOYED_EVENT',
  /** Represents a 'deployment_environment_changed' event on a given pull request. */
  DeploymentEnvironmentChangedEvent = 'DEPLOYMENT_ENVIRONMENT_CHANGED_EVENT',
  /** Represents a 'head_ref_deleted' event on a given pull request. */
  HeadRefDeletedEvent = 'HEAD_REF_DELETED_EVENT',
  /** Represents a 'head_ref_force_pushed' event on a given pull request. */
  HeadRefForcePushedEvent = 'HEAD_REF_FORCE_PUSHED_EVENT',
  /** Represents a 'head_ref_restored' event on a given pull request. */
  HeadRefRestoredEvent = 'HEAD_REF_RESTORED_EVENT',
  /** Represents a 'merged' event on a given pull request. */
  MergedEvent = 'MERGED_EVENT',
  /** Represents a 'review_dismissed' event on a given issue or pull request. */
  ReviewDismissedEvent = 'REVIEW_DISMISSED_EVENT',
  /** Represents an 'review_requested' event on a given pull request. */
  ReviewRequestedEvent = 'REVIEW_REQUESTED_EVENT',
  /** Represents an 'review_request_removed' event on a given pull request. */
  ReviewRequestRemovedEvent = 'REVIEW_REQUEST_REMOVED_EVENT',
  /** Represents a 'ready_for_review' event on a given pull request. */
  ReadyForReviewEvent = 'READY_FOR_REVIEW_EVENT',
  /** Represents a comment on an Issue. */
  IssueComment = 'ISSUE_COMMENT',
  /** Represents a mention made by one issue or pull request to another. */
  CrossReferencedEvent = 'CROSS_REFERENCED_EVENT',
  /** Represents a 'added_to_project' event on a given issue or pull request. */
  AddedToProjectEvent = 'ADDED_TO_PROJECT_EVENT',
  /** Represents an 'assigned' event on any assignable object. */
  AssignedEvent = 'ASSIGNED_EVENT',
  /** Represents a 'closed' event on any `Closable`. */
  ClosedEvent = 'CLOSED_EVENT',
  /** Represents a 'comment_deleted' event on a given issue or pull request. */
  CommentDeletedEvent = 'COMMENT_DELETED_EVENT',
  /** Represents a 'connected' event on a given issue or pull request. */
  ConnectedEvent = 'CONNECTED_EVENT',
  /** Represents a 'converted_note_to_issue' event on a given issue or pull request. */
  ConvertedNoteToIssueEvent = 'CONVERTED_NOTE_TO_ISSUE_EVENT',
  /** Represents a 'demilestoned' event on a given issue or pull request. */
  DemilestonedEvent = 'DEMILESTONED_EVENT',
  /** Represents a 'disconnected' event on a given issue or pull request. */
  DisconnectedEvent = 'DISCONNECTED_EVENT',
  /** Represents a 'labeled' event on a given issue or pull request. */
  LabeledEvent = 'LABELED_EVENT',
  /** Represents a 'locked' event on a given issue or pull request. */
  LockedEvent = 'LOCKED_EVENT',
  /** Represents a 'marked_as_duplicate' event on a given issue or pull request. */
  MarkedAsDuplicateEvent = 'MARKED_AS_DUPLICATE_EVENT',
  /** Represents a 'mentioned' event on a given issue or pull request. */
  MentionedEvent = 'MENTIONED_EVENT',
  /** Represents a 'milestoned' event on a given issue or pull request. */
  MilestonedEvent = 'MILESTONED_EVENT',
  /** Represents a 'moved_columns_in_project' event on a given issue or pull request. */
  MovedColumnsInProjectEvent = 'MOVED_COLUMNS_IN_PROJECT_EVENT',
  /** Represents a 'pinned' event on a given issue or pull request. */
  PinnedEvent = 'PINNED_EVENT',
  /** Represents a 'referenced' event on a given `ReferencedSubject`. */
  ReferencedEvent = 'REFERENCED_EVENT',
  /** Represents a 'removed_from_project' event on a given issue or pull request. */
  RemovedFromProjectEvent = 'REMOVED_FROM_PROJECT_EVENT',
  /** Represents a 'renamed' event on a given issue or pull request */
  RenamedTitleEvent = 'RENAMED_TITLE_EVENT',
  /** Represents a 'reopened' event on any `Closable`. */
  ReopenedEvent = 'REOPENED_EVENT',
  /** Represents a 'subscribed' event on a given `Subscribable`. */
  SubscribedEvent = 'SUBSCRIBED_EVENT',
  /** Represents a 'transferred' event on a given issue or pull request. */
  TransferredEvent = 'TRANSFERRED_EVENT',
  /** Represents an 'unassigned' event on any assignable object. */
  UnassignedEvent = 'UNASSIGNED_EVENT',
  /** Represents an 'unlabeled' event on a given issue or pull request. */
  UnlabeledEvent = 'UNLABELED_EVENT',
  /** Represents an 'unlocked' event on a given issue or pull request. */
  UnlockedEvent = 'UNLOCKED_EVENT',
  /** Represents a 'user_blocked' event on a given user. */
  UserBlockedEvent = 'USER_BLOCKED_EVENT',
  /** Represents an 'unmarked_as_duplicate' event on a given issue or pull request. */
  UnmarkedAsDuplicateEvent = 'UNMARKED_AS_DUPLICATE_EVENT',
  /** Represents an 'unpinned' event on a given issue or pull request. */
  UnpinnedEvent = 'UNPINNED_EVENT',
  /** Represents an 'unsubscribed' event on a given `Subscribable`. */
  UnsubscribedEvent = 'UNSUBSCRIBED_EVENT'
}

/** The possible target states when updating a pull request. */
export enum GithubPullRequestUpdateState {
  /** A pull request that is still open. */
  Open = 'OPEN',
  /** A pull request that has been closed without being merged. */
  Closed = 'CLOSED'
}

/** A team, user or app who has the ability to push to a protected branch. */
export type GithubPushAllowance = GithubNode & {
   __typename?: 'GithubPushAllowance';
  /** The actor that can push. */
  actor?: Maybe<GithubPushAllowanceActor>;
  /** Identifies the branch protection rule associated with the allowed user or team. */
  branchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  id: Scalars['ID'];
};

/** Types that can be an actor. */
export type GithubPushAllowanceActor = GithubApp | GithubTeam | GithubUser;

/** The connection type for PushAllowance. */
export type GithubPushAllowanceConnection = {
   __typename?: 'GithubPushAllowanceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubPushAllowanceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubPushAllowance>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubPushAllowanceEdge = {
   __typename?: 'GithubPushAllowanceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubPushAllowance>;
};

/** Represents the client's rate limit. */
export type GithubRateLimit = {
   __typename?: 'GithubRateLimit';
  /** The point cost for the current query counting against the rate limit. */
  cost: Scalars['Int'];
  /** The maximum number of points the client is permitted to consume in a 60 minute window. */
  limit: Scalars['Int'];
  /** The maximum number of nodes this query may return */
  nodeCount: Scalars['Int'];
  /** The number of points remaining in the current rate limit window. */
  remaining: Scalars['Int'];
  /** The time at which the current rate limit window resets in UTC epoch seconds. */
  resetAt: Scalars['GithubDateTime'];
};

/** Represents a subject that can be reacted on. */
export type GithubReactable = {
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
};


/** Represents a subject that can be reacted on. */
export type GithubReactableReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};

/** The connection type for User. */
export type GithubReactingUserConnection = {
   __typename?: 'GithubReactingUserConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReactingUserEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a user that's made a reaction. */
export type GithubReactingUserEdge = {
   __typename?: 'GithubReactingUserEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  node: GithubUser;
  /** The moment when the user made the reaction. */
  reactedAt: Scalars['GithubDateTime'];
};

/** An emoji reaction to a particular piece of content. */
export type GithubReaction = GithubNode & {
   __typename?: 'GithubReaction';
  /** Identifies the emoji reaction. */
  content: GithubReactionContent;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** The reactable piece of content */
  reactable: GithubReactable;
  /** Identifies the user who created this reaction. */
  user?: Maybe<GithubUser>;
};

/** A list of reactions that have been left on the subject. */
export type GithubReactionConnection = {
   __typename?: 'GithubReactionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReactionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubReaction>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** Whether or not the authenticated user has left a reaction on the subject. */
  viewerHasReacted: Scalars['Boolean'];
};

/** Emojis that can be attached to Issues, Pull Requests and Comments. */
export enum GithubReactionContent {
  /** Represents the `:+1:` emoji. */
  ThumbsUp = 'THUMBS_UP',
  /** Represents the `:-1:` emoji. */
  ThumbsDown = 'THUMBS_DOWN',
  /** Represents the `:laugh:` emoji. */
  Laugh = 'LAUGH',
  /** Represents the `:hooray:` emoji. */
  Hooray = 'HOORAY',
  /** Represents the `:confused:` emoji. */
  Confused = 'CONFUSED',
  /** Represents the `:heart:` emoji. */
  Heart = 'HEART',
  /** Represents the `:rocket:` emoji. */
  Rocket = 'ROCKET',
  /** Represents the `:eyes:` emoji. */
  Eyes = 'EYES'
}

/** An edge in a connection. */
export type GithubReactionEdge = {
   __typename?: 'GithubReactionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubReaction>;
};

/** A group of emoji reactions to a particular piece of content. */
export type GithubReactionGroup = {
   __typename?: 'GithubReactionGroup';
  /** Identifies the emoji reaction. */
  content: GithubReactionContent;
  /** Identifies when the reaction was created. */
  createdAt?: Maybe<Scalars['GithubDateTime']>;
  /** The subject that was reacted to. */
  subject: GithubReactable;
  /** Users who have reacted to the reaction subject with the emotion represented by this reaction group */
  users: GithubReactingUserConnection;
  /** Whether or not the authenticated user has left a reaction on the subject. */
  viewerHasReacted: Scalars['Boolean'];
};


/** A group of emoji reactions to a particular piece of content. */
export type GithubReactionGroupUsersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Ways in which lists of reactions can be ordered upon return. */
export type GithubReactionOrder = {
  /** The field in which to order reactions by. */
  field: GithubReactionOrderField;
  /** The direction in which to order reactions by the specified field. */
  direction: GithubOrderDirection;
};

/** A list of fields that reactions can be ordered by. */
export enum GithubReactionOrderField {
  /** Allows ordering a list of reactions by when they were created. */
  CreatedAt = 'CREATED_AT'
}

/** Represents a 'ready_for_review' event on a given pull request. */
export type GithubReadyForReviewEvent = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubReadyForReviewEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** The HTTP path for this ready for review event. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this ready for review event. */
  url: Scalars['GithubURI'];
};

/** Represents a Git reference. */
export type GithubRef = GithubNode & {
   __typename?: 'GithubRef';
  /** A list of pull requests with this ref as the head ref. */
  associatedPullRequests: GithubPullRequestConnection;
  id: Scalars['ID'];
  /** The ref name. */
  name: Scalars['String'];
  /** The ref's prefix, such as `refs/heads/` or `refs/tags/`. */
  prefix: Scalars['String'];
  /** The repository the ref belongs to. */
  repository: GithubRepository;
  /** The object the ref points to. */
  target: GithubGitObject;
};


/** Represents a Git reference. */
export type GithubRefAssociatedPullRequestsArgs = {
  states?: Maybe<Array<GithubPullRequestState>>;
  labels?: Maybe<Array<Scalars['String']>>;
  headRefName?: Maybe<Scalars['String']>;
  baseRefName?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubIssueOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for Ref. */
export type GithubRefConnection = {
   __typename?: 'GithubRefConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRefEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRef>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRefEdge = {
   __typename?: 'GithubRefEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRef>;
};

/** Represents a 'referenced' event on a given `ReferencedSubject`. */
export type GithubReferencedEvent = GithubNode & {
   __typename?: 'GithubReferencedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the commit associated with the 'referenced' event. */
  commit?: Maybe<GithubCommit>;
  /** Identifies the repository associated with the 'referenced' event. */
  commitRepository: GithubRepository;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Reference originated in a different repository. */
  isCrossRepository: Scalars['Boolean'];
  /** Checks if the commit message itself references the subject. Can be false in the case of a commit comment reference. */
  isDirectReference: Scalars['Boolean'];
  /** Object referenced by event. */
  subject: GithubReferencedSubject;
};

/** Any referencable object */
export type GithubReferencedSubject = GithubIssue | GithubPullRequest;

/** Ways in which lists of git refs can be ordered upon return. */
export type GithubRefOrder = {
  /** The field in which to order refs by. */
  field: GithubRefOrderField;
  /** The direction in which to order refs by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which ref connections can be ordered. */
export enum GithubRefOrderField {
  /** Order refs by underlying commit date if the ref prefix is refs/tags/ */
  TagCommitDate = 'TAG_COMMIT_DATE',
  /** Order refs by their alphanumeric name */
  Alphabetical = 'ALPHABETICAL'
}

/** Autogenerated input type of RegenerateEnterpriseIdentityProviderRecoveryCodes */
export type GithubRegenerateEnterpriseIdentityProviderRecoveryCodesInput = {
  /** The ID of the enterprise on which to set an identity provider. */
  enterpriseId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RegenerateEnterpriseIdentityProviderRecoveryCodes */
export type GithubRegenerateEnterpriseIdentityProviderRecoveryCodesPayload = {
   __typename?: 'GithubRegenerateEnterpriseIdentityProviderRecoveryCodesPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The identity provider for the enterprise. */
  identityProvider?: Maybe<GithubEnterpriseIdentityProvider>;
};

/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackage = GithubNode & {
   __typename?: 'GithubRegistryPackage';
  /**
   * The package type color
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  color: Scalars['String'];
  id: Scalars['ID'];
  /**
   * Find the latest version for the package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  latestVersion?: Maybe<GithubRegistryPackageVersion>;
  /**
   * Identifies the title of the package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  name: Scalars['String'];
  /**
   * Identifies the title of the package, with the owner prefixed.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  nameWithOwner: Scalars['String'];
  /**
   * Find the package file identified by the guid.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object. Removal on 2020-04-01 UTC.
   */
  packageFileByGuid?: Maybe<GithubRegistryPackageFile>;
  /**
   * Find the package file identified by the sha256.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object. Removal on 2020-04-01 UTC.
   */
  packageFileBySha256?: Maybe<GithubRegistryPackageFile>;
  /**
   * Identifies the type of the package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  packageType: GithubRegistryPackageType;
  /**
   * List the prerelease versions for this package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  preReleaseVersions?: Maybe<GithubRegistryPackageVersionConnection>;
  /**
   * The type of the package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackageType?: Maybe<Scalars['String']>;
  /**
   * repository that the release is associated with
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  repository?: Maybe<GithubRepository>;
  /**
   * Statistics about package activity.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  statistics?: Maybe<GithubRegistryPackageStatistics>;
  /**
   * list of tags for this package
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object. Removal on 2020-04-01 UTC.
   */
  tags: GithubRegistryPackageTagConnection;
  /**
   * List the topics for this package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object. Removal on 2020-04-01 UTC.
   */
  topics?: Maybe<GithubTopicConnection>;
  /**
   * Find package version by version string.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  version?: Maybe<GithubRegistryPackageVersion>;
  /**
   * Find package version by version string.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  versionByPlatform?: Maybe<GithubRegistryPackageVersion>;
  /**
   * Find package version by manifest SHA256.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  versionBySha256?: Maybe<GithubRegistryPackageVersion>;
  /**
   * list of versions for this package
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  versions: GithubRegistryPackageVersionConnection;
  /**
   * List package versions with a specific metadatum.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `Package` object instead. Removal on 2020-04-01 UTC.
   */
  versionsByMetadatum?: Maybe<GithubRegistryPackageVersionConnection>;
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackagePackageFileByGuidArgs = {
  guid: Scalars['String'];
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackagePackageFileBySha256Args = {
  sha256: Scalars['String'];
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackagePreReleaseVersionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageTagsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageTopicsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageVersionArgs = {
  version: Scalars['String'];
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageVersionByPlatformArgs = {
  version: Scalars['String'];
  platform: Scalars['String'];
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageVersionBySha256Args = {
  sha256: Scalars['String'];
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageVersionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A registry package contains the content for an uploaded package. */
export type GithubRegistryPackageVersionsByMetadatumArgs = {
  metadatum: GithubRegistryPackageMetadatum;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for RegistryPackage. */
export type GithubRegistryPackageConnection = {
   __typename?: 'GithubRegistryPackageConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRegistryPackageEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRegistryPackage>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A package dependency contains the information needed to satisfy a dependency. */
export type GithubRegistryPackageDependency = GithubNode & {
   __typename?: 'GithubRegistryPackageDependency';
  /**
   * Identifies the type of dependency.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageDependency` object instead. Removal on 2020-04-01 UTC.
   */
  dependencyType: GithubRegistryPackageDependencyType;
  id: Scalars['ID'];
  /**
   * Identifies the name of the dependency.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageDependency` object instead. Removal on 2020-04-01 UTC.
   */
  name: Scalars['String'];
  /**
   * Identifies the version of the dependency.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageDependency` object instead. Removal on 2020-04-01 UTC.
   */
  version: Scalars['String'];
};

/** The connection type for RegistryPackageDependency. */
export type GithubRegistryPackageDependencyConnection = {
   __typename?: 'GithubRegistryPackageDependencyConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRegistryPackageDependencyEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRegistryPackageDependency>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRegistryPackageDependencyEdge = {
   __typename?: 'GithubRegistryPackageDependencyEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRegistryPackageDependency>;
};

/** The possible types of a registry package dependency. */
export enum GithubRegistryPackageDependencyType {
  /** A default registry package dependency type. */
  Default = 'DEFAULT',
  /** A dev registry package dependency type. */
  Dev = 'DEV',
  /** A test registry package dependency type. */
  Test = 'TEST',
  /** A peer registry package dependency type. */
  Peer = 'PEER',
  /** An optional registry package dependency type. */
  Optional = 'OPTIONAL',
  /** An optional registry package dependency type. */
  Bundled = 'BUNDLED'
}

/** An edge in a connection. */
export type GithubRegistryPackageEdge = {
   __typename?: 'GithubRegistryPackageEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRegistryPackage>;
};

/** A file in a specific registry package version. */
export type GithubRegistryPackageFile = GithubNode & {
   __typename?: 'GithubRegistryPackageFile';
  /**
   * A unique identifier for this file.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  guid?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /**
   * Identifies the md5.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  md5?: Maybe<Scalars['String']>;
  /**
   * URL to download the asset metadata.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  metadataUrl: Scalars['GithubURI'];
  /**
   * Name of the file
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  name: Scalars['String'];
  /**
   * The package version this file belongs to.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  packageVersion: GithubRegistryPackageVersion;
  /**
   * Identifies the sha1.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  sha1?: Maybe<Scalars['String']>;
  /**
   * Identifies the sha256.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  sha256?: Maybe<Scalars['String']>;
  /**
   * Identifies the size.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  size?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /**
   * URL to download the asset.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageFile` object instead. Removal on 2020-04-01 UTC.
   */
  url: Scalars['GithubURI'];
};

/** The connection type for RegistryPackageFile. */
export type GithubRegistryPackageFileConnection = {
   __typename?: 'GithubRegistryPackageFileConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRegistryPackageFileEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRegistryPackageFile>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRegistryPackageFileEdge = {
   __typename?: 'GithubRegistryPackageFileEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRegistryPackageFile>;
};

/** Represents a single registry metadatum */
export type GithubRegistryPackageMetadatum = {
  /** Name of the metadatum. */
  name: Scalars['String'];
  /** Value of the metadatum. */
  value: Scalars['String'];
  /** True, if the metadatum can be updated if it already exists */
  update?: Maybe<Scalars['Boolean']>;
};

/** Represents an owner of a registry package. */
export type GithubRegistryPackageOwner = {
  id: Scalars['ID'];
  /**
   * A list of registry packages under the owner.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageOwner` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackages: GithubRegistryPackageConnection;
};


/** Represents an owner of a registry package. */
export type GithubRegistryPackageOwnerRegistryPackagesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  names?: Maybe<Array<Maybe<Scalars['String']>>>;
  repositoryId?: Maybe<Scalars['ID']>;
  packageType?: Maybe<GithubRegistryPackageType>;
  registryPackageType?: Maybe<Scalars['String']>;
  publicOnly?: Maybe<Scalars['Boolean']>;
};

/** Represents an interface to search packages on an object. */
export type GithubRegistryPackageSearch = {
  id: Scalars['ID'];
  /**
   * A list of registry packages for a particular search query.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageSearch` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackagesForQuery: GithubRegistryPackageConnection;
};


/** Represents an interface to search packages on an object. */
export type GithubRegistryPackageSearchRegistryPackagesForQueryArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  packageType?: Maybe<GithubRegistryPackageType>;
};

/** Represents a object that contains package activity statistics such as downloads. */
export type GithubRegistryPackageStatistics = {
   __typename?: 'GithubRegistryPackageStatistics';
  /**
   * Number of times the package was downloaded this month.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisMonth: Scalars['Int'];
  /**
   * Number of times the package was downloaded this week.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisWeek: Scalars['Int'];
  /**
   * Number of times the package was downloaded this year.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisYear: Scalars['Int'];
  /**
   * Number of times the package was downloaded today.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsToday: Scalars['Int'];
  /**
   * Number of times the package was downloaded since it was created.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsTotalCount: Scalars['Int'];
};

/** A version tag contains the mapping between a tag name and a version. */
export type GithubRegistryPackageTag = GithubNode & {
   __typename?: 'GithubRegistryPackageTag';
  id: Scalars['ID'];
  /**
   * Identifies the tag name of the version.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageTag` object instead. Removal on 2020-04-01 UTC.
   */
  name: Scalars['String'];
  /**
   * version that the tag is associated with
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageTag` object instead. Removal on 2020-04-01 UTC.
   */
  version?: Maybe<GithubRegistryPackageVersion>;
};

/** The connection type for RegistryPackageTag. */
export type GithubRegistryPackageTagConnection = {
   __typename?: 'GithubRegistryPackageTagConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRegistryPackageTagEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRegistryPackageTag>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRegistryPackageTagEdge = {
   __typename?: 'GithubRegistryPackageTagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRegistryPackageTag>;
};

/** The possible types of a registry package. */
export enum GithubRegistryPackageType {
  /** An npm registry package. */
  Npm = 'NPM',
  /** A rubygems registry package. */
  Rubygems = 'RUBYGEMS',
  /** A maven registry package. */
  Maven = 'MAVEN',
  /** A docker image. */
  Docker = 'DOCKER',
  /** A debian package. */
  Debian = 'DEBIAN',
  /** A nuget package. */
  Nuget = 'NUGET',
  /** A python package. */
  Python = 'PYTHON'
}

/** A package version contains the information about a specific package version. */
export type GithubRegistryPackageVersion = GithubNode & {
   __typename?: 'GithubRegistryPackageVersion';
  /**
   * list of dependencies for this package
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  dependencies: GithubRegistryPackageDependencyConnection;
  /**
   * A file associated with this registry package version
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  fileByName?: Maybe<GithubRegistryPackageFile>;
  /**
   * List of files associated with this registry package version
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  files: GithubRegistryPackageFileConnection;
  id: Scalars['ID'];
  /**
   * A single line of text to install this package version.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  installationCommand?: Maybe<Scalars['String']>;
  /**
   * Identifies the package manifest for this package version.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  manifest?: Maybe<Scalars['String']>;
  /**
   * Identifies the platform this version was built for.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  platform?: Maybe<Scalars['String']>;
  /**
   * Indicates whether this version is a pre-release.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  preRelease: Scalars['Boolean'];
  /**
   * The README of this package version
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  readme?: Maybe<Scalars['String']>;
  /**
   * The HTML README of this package version
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  readmeHtml?: Maybe<Scalars['GithubHTML']>;
  /**
   * Registry package associated with this version.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackage?: Maybe<GithubRegistryPackage>;
  /**
   * Release associated with this package.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  release?: Maybe<GithubRelease>;
  /**
   * Identifies the sha256.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  sha256?: Maybe<Scalars['String']>;
  /**
   * Identifies the size.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  size?: Maybe<Scalars['Int']>;
  /**
   * Statistics about package activity.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  statistics?: Maybe<GithubRegistryPackageVersionStatistics>;
  /**
   * Identifies the package version summary.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  summary?: Maybe<Scalars['String']>;
  /**
   * Time at which the most recent file upload for this package version finished
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  updatedAt: Scalars['GithubDateTime'];
  /**
   * Identifies the version number.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  version: Scalars['String'];
  /**
   * Can the current viewer edit this Package version.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersion` object instead. Removal on 2020-04-01 UTC.
   */
  viewerCanEdit: Scalars['Boolean'];
};


/** A package version contains the information about a specific package version. */
export type GithubRegistryPackageVersionDependenciesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  type?: Maybe<GithubRegistryPackageDependencyType>;
};


/** A package version contains the information about a specific package version. */
export type GithubRegistryPackageVersionFileByNameArgs = {
  filename: Scalars['String'];
};


/** A package version contains the information about a specific package version. */
export type GithubRegistryPackageVersionFilesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for RegistryPackageVersion. */
export type GithubRegistryPackageVersionConnection = {
   __typename?: 'GithubRegistryPackageVersionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRegistryPackageVersionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRegistryPackageVersion>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRegistryPackageVersionEdge = {
   __typename?: 'GithubRegistryPackageVersionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRegistryPackageVersion>;
};

/** Represents a object that contains package version activity statistics such as downloads. */
export type GithubRegistryPackageVersionStatistics = {
   __typename?: 'GithubRegistryPackageVersionStatistics';
  /**
   * Number of times the package was downloaded this month.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersionStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisMonth: Scalars['Int'];
  /**
   * Number of times the package was downloaded this week.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersionStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisWeek: Scalars['Int'];
  /**
   * Number of times the package was downloaded this year.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersionStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsThisYear: Scalars['Int'];
  /**
   * Number of times the package was downloaded today.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersionStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsToday: Scalars['Int'];
  /**
   * Number of times the package was downloaded since it was created.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageVersionStatistics` object instead. Removal on 2020-04-01 UTC.
   */
  downloadsTotalCount: Scalars['Int'];
};

/** A release contains the content for a release. */
export type GithubRelease = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubRelease';
  /** The author of the release */
  author?: Maybe<GithubUser>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The description of the release. */
  description?: Maybe<Scalars['String']>;
  /** The description of this release rendered to HTML. */
  descriptionHTML?: Maybe<Scalars['GithubHTML']>;
  id: Scalars['ID'];
  /** Whether or not the release is a draft */
  isDraft: Scalars['Boolean'];
  /** Whether or not the release is a prerelease */
  isPrerelease: Scalars['Boolean'];
  /** The title of the release. */
  name?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the release was created. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** List of releases assets which are dependent on this release. */
  releaseAssets: GithubReleaseAssetConnection;
  /** The HTTP path for this issue */
  resourcePath: Scalars['GithubURI'];
  /** A description of the release, rendered to HTML without any links in it. */
  shortDescriptionHTML?: Maybe<Scalars['GithubHTML']>;
  /** The Git tag the release points to */
  tag?: Maybe<GithubRef>;
  /** The name of the release's Git tag */
  tagName: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this issue */
  url: Scalars['GithubURI'];
};


/** A release contains the content for a release. */
export type GithubReleaseReleaseAssetsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
};


/** A release contains the content for a release. */
export type GithubReleaseShortDescriptionHtmlArgs = {
  limit?: Maybe<Scalars['Int']>;
};

/** A release asset contains the content for a release asset. */
export type GithubReleaseAsset = GithubNode & {
   __typename?: 'GithubReleaseAsset';
  /** The asset's content-type */
  contentType: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The number of times this asset was downloaded */
  downloadCount: Scalars['Int'];
  /** Identifies the URL where you can download the release asset via the browser. */
  downloadUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** Identifies the title of the release asset. */
  name: Scalars['String'];
  /** Release that the asset is associated with */
  release?: Maybe<GithubRelease>;
  /** The size (in bytes) of the asset */
  size: Scalars['Int'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The user that performed the upload */
  uploadedBy: GithubUser;
  /** Identifies the URL of the release asset. */
  url: Scalars['GithubURI'];
};

/** The connection type for ReleaseAsset. */
export type GithubReleaseAssetConnection = {
   __typename?: 'GithubReleaseAssetConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReleaseAssetEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubReleaseAsset>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubReleaseAssetEdge = {
   __typename?: 'GithubReleaseAssetEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubReleaseAsset>;
};

/** The connection type for Release. */
export type GithubReleaseConnection = {
   __typename?: 'GithubReleaseConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReleaseEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRelease>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubReleaseEdge = {
   __typename?: 'GithubReleaseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRelease>;
};

/** Ways in which lists of releases can be ordered upon return. */
export type GithubReleaseOrder = {
  /** The field in which to order releases by. */
  field: GithubReleaseOrderField;
  /** The direction in which to order releases by the specified field. */
  direction: GithubOrderDirection;
};

/** Properties by which release connections can be ordered. */
export enum GithubReleaseOrderField {
  /** Order releases by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order releases alphabetically by name */
  Name = 'NAME'
}

/** Autogenerated input type of RemoveAssigneesFromAssignable */
export type GithubRemoveAssigneesFromAssignableInput = {
  /** The id of the assignable object to remove assignees from. */
  assignableId: Scalars['ID'];
  /** The id of users to remove as assignees. */
  assigneeIds: Array<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveAssigneesFromAssignable */
export type GithubRemoveAssigneesFromAssignablePayload = {
   __typename?: 'GithubRemoveAssigneesFromAssignablePayload';
  /** The item that was unassigned. */
  assignable?: Maybe<GithubAssignable>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Represents a 'removed_from_project' event on a given issue or pull request. */
export type GithubRemovedFromProjectEvent = GithubNode & {
   __typename?: 'GithubRemovedFromProjectEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
};

/** Autogenerated input type of RemoveEnterpriseAdmin */
export type GithubRemoveEnterpriseAdminInput = {
  /** The Enterprise ID from which to remove the administrator. */
  enterpriseId: Scalars['ID'];
  /** The login of the user to remove as an administrator. */
  login: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveEnterpriseAdmin */
export type GithubRemoveEnterpriseAdminPayload = {
   __typename?: 'GithubRemoveEnterpriseAdminPayload';
  /** The user who was removed as an administrator. */
  admin?: Maybe<GithubUser>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated enterprise. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of removing an administrator. */
  message?: Maybe<Scalars['String']>;
  /** The viewer performing the mutation. */
  viewer?: Maybe<GithubUser>;
};

/** Autogenerated input type of RemoveEnterpriseIdentityProvider */
export type GithubRemoveEnterpriseIdentityProviderInput = {
  /** The ID of the enterprise from which to remove the identity provider. */
  enterpriseId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveEnterpriseIdentityProvider */
export type GithubRemoveEnterpriseIdentityProviderPayload = {
   __typename?: 'GithubRemoveEnterpriseIdentityProviderPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The identity provider that was removed from the enterprise. */
  identityProvider?: Maybe<GithubEnterpriseIdentityProvider>;
};

/** Autogenerated input type of RemoveEnterpriseOrganization */
export type GithubRemoveEnterpriseOrganizationInput = {
  /** The ID of the enterprise from which the organization should be removed. */
  enterpriseId: Scalars['ID'];
  /** The ID of the organization to remove from the enterprise. */
  organizationId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveEnterpriseOrganization */
export type GithubRemoveEnterpriseOrganizationPayload = {
   __typename?: 'GithubRemoveEnterpriseOrganizationPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated enterprise. */
  enterprise?: Maybe<GithubEnterprise>;
  /** The organization that was removed from the enterprise. */
  organization?: Maybe<GithubOrganization>;
  /** The viewer performing the mutation. */
  viewer?: Maybe<GithubUser>;
};

/** Autogenerated input type of RemoveLabelsFromLabelable */
export type GithubRemoveLabelsFromLabelableInput = {
  /** The id of the Labelable to remove labels from. */
  labelableId: Scalars['ID'];
  /** The ids of labels to remove. */
  labelIds: Array<Scalars['ID']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveLabelsFromLabelable */
export type GithubRemoveLabelsFromLabelablePayload = {
   __typename?: 'GithubRemoveLabelsFromLabelablePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The Labelable the labels were removed from. */
  labelable?: Maybe<GithubLabelable>;
};

/** Autogenerated input type of RemoveOutsideCollaborator */
export type GithubRemoveOutsideCollaboratorInput = {
  /** The ID of the outside collaborator to remove. */
  userId: Scalars['ID'];
  /** The ID of the organization to remove the outside collaborator from. */
  organizationId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveOutsideCollaborator */
export type GithubRemoveOutsideCollaboratorPayload = {
   __typename?: 'GithubRemoveOutsideCollaboratorPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The user that was removed as an outside collaborator. */
  removedUser?: Maybe<GithubUser>;
};

/** Autogenerated input type of RemoveReaction */
export type GithubRemoveReactionInput = {
  /** The Node ID of the subject to modify. */
  subjectId: Scalars['ID'];
  /** The name of the emoji reaction to remove. */
  content: GithubReactionContent;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveReaction */
export type GithubRemoveReactionPayload = {
   __typename?: 'GithubRemoveReactionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The reaction object. */
  reaction?: Maybe<GithubReaction>;
  /** The reactable subject. */
  subject?: Maybe<GithubReactable>;
};

/** Autogenerated input type of RemoveStar */
export type GithubRemoveStarInput = {
  /** The Starrable ID to unstar. */
  starrableId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RemoveStar */
export type GithubRemoveStarPayload = {
   __typename?: 'GithubRemoveStarPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The starrable. */
  starrable?: Maybe<GithubStarrable>;
};

/** Represents a 'renamed' event on a given issue or pull request */
export type GithubRenamedTitleEvent = GithubNode & {
   __typename?: 'GithubRenamedTitleEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the current title of the issue or pull request. */
  currentTitle: Scalars['String'];
  id: Scalars['ID'];
  /** Identifies the previous title of the issue or pull request. */
  previousTitle: Scalars['String'];
  /** Subject that was renamed. */
  subject: GithubRenamedTitleSubject;
};

/** An object which has a renamable title */
export type GithubRenamedTitleSubject = GithubIssue | GithubPullRequest;

/** Represents a 'reopened' event on any `Closable`. */
export type GithubReopenedEvent = GithubNode & {
   __typename?: 'GithubReopenedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Object that was reopened. */
  closable: GithubClosable;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
};

/** Autogenerated input type of ReopenIssue */
export type GithubReopenIssueInput = {
  /** ID of the issue to be opened. */
  issueId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ReopenIssue */
export type GithubReopenIssuePayload = {
   __typename?: 'GithubReopenIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The issue that was opened. */
  issue?: Maybe<GithubIssue>;
};

/** Autogenerated input type of ReopenPullRequest */
export type GithubReopenPullRequestInput = {
  /** ID of the pull request to be reopened. */
  pullRequestId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ReopenPullRequest */
export type GithubReopenPullRequestPayload = {
   __typename?: 'GithubReopenPullRequestPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request that was reopened. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** Audit log entry for a repo.access event. */
export type GithubRepoAccessAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoAccessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoAccessAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoAccessAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.add_member event. */
export type GithubRepoAddMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoAddMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoAddMemberAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoAddMemberAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.add_topic event. */
export type GithubRepoAddTopicAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & GithubTopicAuditEntryData & {
   __typename?: 'GithubRepoAddTopicAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The name of the topic added to the repository */
  topic?: Maybe<GithubTopic>;
  /** The name of the topic added to the repository */
  topicName?: Maybe<Scalars['String']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.archived event. */
export type GithubRepoArchivedAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepoArchivedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoArchivedAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoArchivedAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.change_merge_setting event. */
export type GithubRepoChangeMergeSettingAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepoChangeMergeSettingAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the change was to enable (true) or disable (false) the merge type */
  isEnabled?: Maybe<Scalars['Boolean']>;
  /** The merge method affected by the change */
  mergeType?: Maybe<GithubRepoChangeMergeSettingAuditEntryMergeType>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The merge options available for pull requests to this repository. */
export enum GithubRepoChangeMergeSettingAuditEntryMergeType {
  /** The pull request is added to the base branch in a merge commit. */
  Merge = 'MERGE',
  /** Commits from the pull request are added onto the base branch individually without a merge commit. */
  Rebase = 'REBASE',
  /** The pull request's commits are squashed into a single commit before they are merged to the base branch. */
  Squash = 'SQUASH'
}

/** Audit log entry for a repo.config.disable_anonymous_git_access event. */
export type GithubRepoConfigDisableAnonymousGitAccessAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigDisableAnonymousGitAccessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.disable_collaborators_only event. */
export type GithubRepoConfigDisableCollaboratorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigDisableCollaboratorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.disable_contributors_only event. */
export type GithubRepoConfigDisableContributorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigDisableContributorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.disable_sockpuppet_disallowed event. */
export type GithubRepoConfigDisableSockpuppetDisallowedAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigDisableSockpuppetDisallowedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.enable_anonymous_git_access event. */
export type GithubRepoConfigEnableAnonymousGitAccessAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigEnableAnonymousGitAccessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.enable_collaborators_only event. */
export type GithubRepoConfigEnableCollaboratorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigEnableCollaboratorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.enable_contributors_only event. */
export type GithubRepoConfigEnableContributorsOnlyAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigEnableContributorsOnlyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.enable_sockpuppet_disallowed event. */
export type GithubRepoConfigEnableSockpuppetDisallowedAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigEnableSockpuppetDisallowedAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.lock_anonymous_git_access event. */
export type GithubRepoConfigLockAnonymousGitAccessAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigLockAnonymousGitAccessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.config.unlock_anonymous_git_access event. */
export type GithubRepoConfigUnlockAnonymousGitAccessAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoConfigUnlockAnonymousGitAccessAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repo.create event. */
export type GithubRepoCreateAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepoCreateAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The name of the parent repository for this forked repository. */
  forkParentName?: Maybe<Scalars['String']>;
  /** The name of the root repository for this netork. */
  forkSourceName?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoCreateAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoCreateAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.destroy event. */
export type GithubRepoDestroyAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepoDestroyAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoDestroyAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoDestroyAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.remove_member event. */
export type GithubRepoRemoveMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & {
   __typename?: 'GithubRepoRemoveMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
  /** The visibility of the repository */
  visibility?: Maybe<GithubRepoRemoveMemberAuditEntryVisibility>;
};

/** The privacy of a repository */
export enum GithubRepoRemoveMemberAuditEntryVisibility {
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL',
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC'
}

/** Audit log entry for a repo.remove_topic event. */
export type GithubRepoRemoveTopicAuditEntry = GithubNode & GithubAuditEntry & GithubRepositoryAuditEntryData & GithubOrganizationAuditEntryData & GithubTopicAuditEntryData & {
   __typename?: 'GithubRepoRemoveTopicAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The name of the topic added to the repository */
  topic?: Maybe<GithubTopic>;
  /** The name of the topic added to the repository */
  topicName?: Maybe<Scalars['String']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** A repository contains the content for a project. */
export type GithubRepository = GithubNode & GithubProjectOwner & GithubRegistryPackageOwner & GithubRegistryPackageSearch & GithubSubscribable & GithubStarrable & GithubUniformResourceLocatable & GithubRepositoryInfo & {
   __typename?: 'GithubRepository';
  /** A list of users that can be assigned to issues in this repository. */
  assignableUsers: GithubUserConnection;
  /** A list of branch protection rules for this repository. */
  branchProtectionRules: GithubBranchProtectionRuleConnection;
  /** Returns the code of conduct for this repository */
  codeOfConduct?: Maybe<GithubCodeOfConduct>;
  /** A list of collaborators associated with the repository. */
  collaborators?: Maybe<GithubRepositoryCollaboratorConnection>;
  /** A list of commit comments associated with the repository. */
  commitComments: GithubCommitCommentConnection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The Ref associated with the repository's default branch. */
  defaultBranchRef?: Maybe<GithubRef>;
  /** Whether or not branches are automatically deleted when merged in this repository. */
  deleteBranchOnMerge: Scalars['Boolean'];
  /** A list of deploy keys that are on this repository. */
  deployKeys: GithubDeployKeyConnection;
  /** Deployments associated with the repository */
  deployments: GithubDeploymentConnection;
  /** The description of the repository. */
  description?: Maybe<Scalars['String']>;
  /** The description of the repository rendered to HTML. */
  descriptionHTML: Scalars['GithubHTML'];
  /** The number of kilobytes this repository occupies on disk. */
  diskUsage?: Maybe<Scalars['Int']>;
  /** Returns how many forks there are of this repository in the whole network. */
  forkCount: Scalars['Int'];
  /** A list of direct forked repositories. */
  forks: GithubRepositoryConnection;
  /** The funding links for this repository */
  fundingLinks: Array<GithubFundingLink>;
  /** Indicates if the repository has issues feature enabled. */
  hasIssuesEnabled: Scalars['Boolean'];
  /** Indicates if the repository has the Projects feature enabled. */
  hasProjectsEnabled: Scalars['Boolean'];
  /** Indicates if the repository has wiki feature enabled. */
  hasWikiEnabled: Scalars['Boolean'];
  /** The repository's URL. */
  homepageUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** Indicates if the repository is unmaintained. */
  isArchived: Scalars['Boolean'];
  /** Returns whether or not this repository disabled. */
  isDisabled: Scalars['Boolean'];
  /** Identifies if the repository is a fork. */
  isFork: Scalars['Boolean'];
  /** Indicates if the repository has been locked or not. */
  isLocked: Scalars['Boolean'];
  /** Identifies if the repository is a mirror. */
  isMirror: Scalars['Boolean'];
  /** Identifies if the repository is private. */
  isPrivate: Scalars['Boolean'];
  /** Identifies if the repository is a template that can be used to generate new repositories. */
  isTemplate: Scalars['Boolean'];
  /** Returns a single issue from the current repository by number. */
  issue?: Maybe<GithubIssue>;
  /** Returns a single issue-like object from the current repository by number. */
  issueOrPullRequest?: Maybe<GithubIssueOrPullRequest>;
  /** A list of issues that have been opened in the repository. */
  issues: GithubIssueConnection;
  /** Returns a single label by name */
  label?: Maybe<GithubLabel>;
  /** A list of labels associated with the repository. */
  labels?: Maybe<GithubLabelConnection>;
  /** A list containing a breakdown of the language composition of the repository. */
  languages?: Maybe<GithubLanguageConnection>;
  /** The license associated with the repository */
  licenseInfo?: Maybe<GithubLicense>;
  /** The reason the repository has been locked. */
  lockReason?: Maybe<GithubRepositoryLockReason>;
  /** A list of Users that can be mentioned in the context of the repository. */
  mentionableUsers: GithubUserConnection;
  /** Whether or not PRs are merged with a merge commit on this repository. */
  mergeCommitAllowed: Scalars['Boolean'];
  /** Returns a single milestone from the current repository by number. */
  milestone?: Maybe<GithubMilestone>;
  /** A list of milestones associated with the repository. */
  milestones?: Maybe<GithubMilestoneConnection>;
  /** The repository's original mirror URL. */
  mirrorUrl?: Maybe<Scalars['GithubURI']>;
  /** The name of the repository. */
  name: Scalars['String'];
  /** The repository's name with owner. */
  nameWithOwner: Scalars['String'];
  /** A Git object in the repository */
  object?: Maybe<GithubGitObject>;
  /** The image used to represent this repository in Open Graph data. */
  openGraphImageUrl: Scalars['GithubURI'];
  /** The User owner of the repository. */
  owner: GithubRepositoryOwner;
  /** The repository parent, if this is a fork. */
  parent?: Maybe<GithubRepository>;
  /** The primary language of the repository's code. */
  primaryLanguage?: Maybe<GithubLanguage>;
  /** Find project by number. */
  project?: Maybe<GithubProject>;
  /** A list of projects under the owner. */
  projects: GithubProjectConnection;
  /** The HTTP path listing the repository's projects */
  projectsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL listing the repository's projects */
  projectsUrl: Scalars['GithubURI'];
  /** Returns a single pull request from the current repository by number. */
  pullRequest?: Maybe<GithubPullRequest>;
  /** A list of pull requests that have been opened in the repository. */
  pullRequests: GithubPullRequestConnection;
  /** Identifies when the repository was last pushed to. */
  pushedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Whether or not rebase-merging is enabled on this repository. */
  rebaseMergeAllowed: Scalars['Boolean'];
  /** Fetch a given ref from the repository */
  ref?: Maybe<GithubRef>;
  /** Fetch a list of refs from the repository */
  refs?: Maybe<GithubRefConnection>;
  /**
   * A list of registry packages under the owner.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageOwner` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackages: GithubRegistryPackageConnection;
  /**
   * A list of registry packages for a particular search query.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageSearch` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackagesForQuery: GithubRegistryPackageConnection;
  /** Lookup a single release given various criteria. */
  release?: Maybe<GithubRelease>;
  /** List of releases which are dependent on this repository. */
  releases: GithubReleaseConnection;
  /** A list of applied repository-topic associations for this repository. */
  repositoryTopics: GithubRepositoryTopicConnection;
  /** The HTTP path for this repository */
  resourcePath: Scalars['GithubURI'];
  /** A description of the repository, rendered to HTML without any links in it. */
  shortDescriptionHTML: Scalars['GithubHTML'];
  /** Whether or not squash-merging is enabled on this repository. */
  squashMergeAllowed: Scalars['Boolean'];
  /** The SSH URL to clone this repository */
  sshUrl: Scalars['GithubGitSSHRemote'];
  /** A list of users who have starred this starrable. */
  stargazers: GithubStargazerConnection;
  /**
   * Returns a list of all submodules in this repository parsed from the
   * .gitmodules file as of the default branch's HEAD commit.
   */
  submodules: GithubSubmoduleConnection;
  /** Temporary authentication token for cloning this repository. */
  tempCloneToken?: Maybe<Scalars['String']>;
  /** The repository from which this repository was generated, if any. */
  templateRepository?: Maybe<GithubRepository>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this repository */
  url: Scalars['GithubURI'];
  /** Whether this repository has a custom image to use with Open Graph as opposed to being represented by the owner's avatar. */
  usesCustomOpenGraphImage: Scalars['Boolean'];
  /** Indicates whether the viewer has admin permissions on this repository. */
  viewerCanAdminister: Scalars['Boolean'];
  /** Can the current viewer create new projects on this owner. */
  viewerCanCreateProjects: Scalars['Boolean'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Indicates whether the viewer can update the topics of this repository. */
  viewerCanUpdateTopics: Scalars['Boolean'];
  /** Returns a boolean indicating whether the viewing user has starred this starrable. */
  viewerHasStarred: Scalars['Boolean'];
  /** The users permission level on the repository. Will return null if authenticated as an GitHub App. */
  viewerPermission?: Maybe<GithubRepositoryPermission>;
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
  /** A list of vulnerability alerts that are on this repository. */
  vulnerabilityAlerts?: Maybe<GithubRepositoryVulnerabilityAlertConnection>;
  /** A list of users watching the repository. */
  watchers: GithubUserConnection;
};


/** A repository contains the content for a project. */
export type GithubRepositoryAssignableUsersArgs = {
  query?: Maybe<Scalars['String']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryBranchProtectionRulesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryCollaboratorsArgs = {
  affiliation?: Maybe<GithubCollaboratorAffiliation>;
  query?: Maybe<Scalars['String']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryCommitCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryDeployKeysArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryDeploymentsArgs = {
  environments?: Maybe<Array<Scalars['String']>>;
  orderBy?: Maybe<GithubDeploymentOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryForksArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryIssueArgs = {
  number: Scalars['Int'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryIssueOrPullRequestArgs = {
  number: Scalars['Int'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryIssuesArgs = {
  orderBy?: Maybe<GithubIssueOrder>;
  labels?: Maybe<Array<Scalars['String']>>;
  states?: Maybe<Array<GithubIssueState>>;
  filterBy?: Maybe<GithubIssueFilters>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryLabelArgs = {
  name: Scalars['String'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryLabelsArgs = {
  orderBy?: Maybe<GithubLabelOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryLanguagesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubLanguageOrder>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryMentionableUsersArgs = {
  query?: Maybe<Scalars['String']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryMilestoneArgs = {
  number: Scalars['Int'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryMilestonesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  states?: Maybe<Array<GithubMilestoneState>>;
  orderBy?: Maybe<GithubMilestoneOrder>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryObjectArgs = {
  oid?: Maybe<Scalars['GithubGitObjectID']>;
  expression?: Maybe<Scalars['String']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryProjectArgs = {
  number: Scalars['Int'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryProjectsArgs = {
  orderBy?: Maybe<GithubProjectOrder>;
  search?: Maybe<Scalars['String']>;
  states?: Maybe<Array<GithubProjectState>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryPullRequestArgs = {
  number: Scalars['Int'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryPullRequestsArgs = {
  states?: Maybe<Array<GithubPullRequestState>>;
  labels?: Maybe<Array<Scalars['String']>>;
  headRefName?: Maybe<Scalars['String']>;
  baseRefName?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubIssueOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryRefArgs = {
  qualifiedName: Scalars['String'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryRefsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  refPrefix: Scalars['String'];
  direction?: Maybe<GithubOrderDirection>;
  orderBy?: Maybe<GithubRefOrder>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryRegistryPackagesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  names?: Maybe<Array<Maybe<Scalars['String']>>>;
  repositoryId?: Maybe<Scalars['ID']>;
  packageType?: Maybe<GithubRegistryPackageType>;
  registryPackageType?: Maybe<Scalars['String']>;
  publicOnly?: Maybe<Scalars['Boolean']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryRegistryPackagesForQueryArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  packageType?: Maybe<GithubRegistryPackageType>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryReleaseArgs = {
  tagName: Scalars['String'];
};


/** A repository contains the content for a project. */
export type GithubRepositoryReleasesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubReleaseOrder>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryRepositoryTopicsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryShortDescriptionHtmlArgs = {
  limit?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryStargazersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubStarOrder>;
};


/** A repository contains the content for a project. */
export type GithubRepositorySubmodulesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryVulnerabilityAlertsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A repository contains the content for a project. */
export type GithubRepositoryWatchersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The affiliation of a user to a repository */
export enum GithubRepositoryAffiliation {
  /** Repositories that are owned by the authenticated user. */
  Owner = 'OWNER',
  /** Repositories that the user has been added to as a collaborator. */
  Collaborator = 'COLLABORATOR',
  /**
   * Repositories that the user has access to through being a member of an
   * organization. This includes every repository on every team that the user is on.
   */
  OrganizationMember = 'ORGANIZATION_MEMBER'
}

/** Metadata for an audit entry with action repo.* */
export type GithubRepositoryAuditEntryData = {
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
};

/** The connection type for User. */
export type GithubRepositoryCollaboratorConnection = {
   __typename?: 'GithubRepositoryCollaboratorConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRepositoryCollaboratorEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a user who is a collaborator of a repository. */
export type GithubRepositoryCollaboratorEdge = {
   __typename?: 'GithubRepositoryCollaboratorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  node: GithubUser;
  /** The permission the user has on the repository. */
  permission: GithubRepositoryPermission;
  /** A list of sources for the user's access to the repository. */
  permissionSources?: Maybe<Array<GithubPermissionSource>>;
};

/** A list of repositories owned by the subject. */
export type GithubRepositoryConnection = {
   __typename?: 'GithubRepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRepositoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRepository>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
  /** The total size in kilobytes of all repositories in the connection. */
  totalDiskUsage: Scalars['Int'];
};

/** The reason a repository is listed as 'contributed'. */
export enum GithubRepositoryContributionType {
  /** Created a commit */
  Commit = 'COMMIT',
  /** Created an issue */
  Issue = 'ISSUE',
  /** Created a pull request */
  PullRequest = 'PULL_REQUEST',
  /** Created the repository */
  Repository = 'REPOSITORY',
  /** Reviewed a pull request */
  PullRequestReview = 'PULL_REQUEST_REVIEW'
}

/** An edge in a connection. */
export type GithubRepositoryEdge = {
   __typename?: 'GithubRepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRepository>;
};

/** A subset of repository info. */
export type GithubRepositoryInfo = {
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The description of the repository. */
  description?: Maybe<Scalars['String']>;
  /** The description of the repository rendered to HTML. */
  descriptionHTML: Scalars['GithubHTML'];
  /** Returns how many forks there are of this repository in the whole network. */
  forkCount: Scalars['Int'];
  /** Indicates if the repository has issues feature enabled. */
  hasIssuesEnabled: Scalars['Boolean'];
  /** Indicates if the repository has the Projects feature enabled. */
  hasProjectsEnabled: Scalars['Boolean'];
  /** Indicates if the repository has wiki feature enabled. */
  hasWikiEnabled: Scalars['Boolean'];
  /** The repository's URL. */
  homepageUrl?: Maybe<Scalars['GithubURI']>;
  /** Indicates if the repository is unmaintained. */
  isArchived: Scalars['Boolean'];
  /** Identifies if the repository is a fork. */
  isFork: Scalars['Boolean'];
  /** Indicates if the repository has been locked or not. */
  isLocked: Scalars['Boolean'];
  /** Identifies if the repository is a mirror. */
  isMirror: Scalars['Boolean'];
  /** Identifies if the repository is private. */
  isPrivate: Scalars['Boolean'];
  /** Identifies if the repository is a template that can be used to generate new repositories. */
  isTemplate: Scalars['Boolean'];
  /** The license associated with the repository */
  licenseInfo?: Maybe<GithubLicense>;
  /** The reason the repository has been locked. */
  lockReason?: Maybe<GithubRepositoryLockReason>;
  /** The repository's original mirror URL. */
  mirrorUrl?: Maybe<Scalars['GithubURI']>;
  /** The name of the repository. */
  name: Scalars['String'];
  /** The repository's name with owner. */
  nameWithOwner: Scalars['String'];
  /** The image used to represent this repository in Open Graph data. */
  openGraphImageUrl: Scalars['GithubURI'];
  /** The User owner of the repository. */
  owner: GithubRepositoryOwner;
  /** Identifies when the repository was last pushed to. */
  pushedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The HTTP path for this repository */
  resourcePath: Scalars['GithubURI'];
  /** A description of the repository, rendered to HTML without any links in it. */
  shortDescriptionHTML: Scalars['GithubHTML'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this repository */
  url: Scalars['GithubURI'];
  /** Whether this repository has a custom image to use with Open Graph as opposed to being represented by the owner's avatar. */
  usesCustomOpenGraphImage: Scalars['Boolean'];
};


/** A subset of repository info. */
export type GithubRepositoryInfoShortDescriptionHtmlArgs = {
  limit?: Maybe<Scalars['Int']>;
};

/** An invitation for a user to be added to a repository. */
export type GithubRepositoryInvitation = GithubNode & {
   __typename?: 'GithubRepositoryInvitation';
  id: Scalars['ID'];
  /** The user who received the invitation. */
  invitee: GithubUser;
  /** The user who created the invitation. */
  inviter: GithubUser;
  /** The permission granted on this repository by this invitation. */
  permission: GithubRepositoryPermission;
  /** The Repository the user is invited to. */
  repository?: Maybe<GithubRepositoryInfo>;
};

/** Ordering options for repository invitation connections. */
export type GithubRepositoryInvitationOrder = {
  /** The field to order repository invitations by. */
  field: GithubRepositoryInvitationOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which repository invitation connections can be ordered. */
export enum GithubRepositoryInvitationOrderField {
  /** Order repository invitations by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order repository invitations by invitee login */
  InviteeLogin = 'INVITEE_LOGIN'
}

/** The possible reasons a given repository could be in a locked state. */
export enum GithubRepositoryLockReason {
  /** The repository is locked due to a move. */
  Moving = 'MOVING',
  /** The repository is locked due to a billing related reason. */
  Billing = 'BILLING',
  /** The repository is locked due to a rename. */
  Rename = 'RENAME',
  /** The repository is locked due to a migration. */
  Migrating = 'MIGRATING'
}

/** Represents a object that belongs to a repository. */
export type GithubRepositoryNode = {
  /** The repository associated with this node. */
  repository: GithubRepository;
};

/** Ordering options for repository connections */
export type GithubRepositoryOrder = {
  /** The field to order repositories by. */
  field: GithubRepositoryOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which repository connections can be ordered. */
export enum GithubRepositoryOrderField {
  /** Order repositories by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order repositories by update time */
  UpdatedAt = 'UPDATED_AT',
  /** Order repositories by push time */
  PushedAt = 'PUSHED_AT',
  /** Order repositories by name */
  Name = 'NAME',
  /** Order repositories by number of stargazers */
  Stargazers = 'STARGAZERS'
}

/** Represents an owner of a Repository. */
export type GithubRepositoryOwner = {
  /** A URL pointing to the owner's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** The username used to login. */
  login: Scalars['String'];
  /**
   * A list of repositories this user has pinned to their profile
   * @deprecated pinnedRepositories will be removed Use ProfileOwner.pinnedItems instead. Removal on 2019-10-01 UTC.
   */
  pinnedRepositories: GithubRepositoryConnection;
  /** A list of repositories that the user owns. */
  repositories: GithubRepositoryConnection;
  /** Find Repository. */
  repository?: Maybe<GithubRepository>;
  /** The HTTP URL for the owner. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for the owner. */
  url: Scalars['GithubURI'];
};


/** Represents an owner of a Repository. */
export type GithubRepositoryOwnerAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** Represents an owner of a Repository. */
export type GithubRepositoryOwnerPinnedRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** Represents an owner of a Repository. */
export type GithubRepositoryOwnerRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  isFork?: Maybe<Scalars['Boolean']>;
};


/** Represents an owner of a Repository. */
export type GithubRepositoryOwnerRepositoryArgs = {
  name: Scalars['String'];
};

/** The access level to a repository */
export enum GithubRepositoryPermission {
  /**
   * Can read, clone, and push to this repository. Can also manage issues, pull
   * requests, and repository settings, including adding collaborators
   */
  Admin = 'ADMIN',
  /** Can read, clone, and push to this repository. They can also manage issues, pull requests, and some repository settings */
  Maintain = 'MAINTAIN',
  /** Can read, clone, and push to this repository. Can also manage issues and pull requests */
  Write = 'WRITE',
  /** Can read and clone this repository. Can also manage issues and pull requests */
  Triage = 'TRIAGE',
  /** Can read and clone this repository. Can also open and comment on issues and pull requests */
  Read = 'READ'
}

/** The privacy of a repository */
export enum GithubRepositoryPrivacy {
  /** Public */
  Public = 'PUBLIC',
  /** Private */
  Private = 'PRIVATE'
}

/** A repository-topic connects a repository to a topic. */
export type GithubRepositoryTopic = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubRepositoryTopic';
  id: Scalars['ID'];
  /** The HTTP path for this repository-topic. */
  resourcePath: Scalars['GithubURI'];
  /** The topic. */
  topic: GithubTopic;
  /** The HTTP URL for this repository-topic. */
  url: Scalars['GithubURI'];
};

/** The connection type for RepositoryTopic. */
export type GithubRepositoryTopicConnection = {
   __typename?: 'GithubRepositoryTopicConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRepositoryTopicEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRepositoryTopic>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRepositoryTopicEdge = {
   __typename?: 'GithubRepositoryTopicEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRepositoryTopic>;
};

/** The repository's visibility level. */
export enum GithubRepositoryVisibility {
  /** The repository is visible only to those with explicit access. */
  Private = 'PRIVATE',
  /** The repository is visible to everyone. */
  Public = 'PUBLIC',
  /** The repository is visible only to users in the same business. */
  Internal = 'INTERNAL'
}

/** Audit log entry for a repository_visibility_change.disable event. */
export type GithubRepositoryVisibilityChangeDisableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepositoryVisibilityChangeDisableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a repository_visibility_change.enable event. */
export type GithubRepositoryVisibilityChangeEnableAuditEntry = GithubNode & GithubAuditEntry & GithubEnterpriseAuditEntryData & GithubOrganizationAuditEntryData & {
   __typename?: 'GithubRepositoryVisibilityChangeEnableAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  /** The HTTP path for this enterprise. */
  enterpriseResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The slug of the enterprise. */
  enterpriseSlug?: Maybe<Scalars['String']>;
  /** The HTTP URL for this enterprise. */
  enterpriseUrl?: Maybe<Scalars['GithubURI']>;
  id: Scalars['ID'];
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** A alert for a repository with an affected vulnerability. */
export type GithubRepositoryVulnerabilityAlert = GithubNode & GithubRepositoryNode & {
   __typename?: 'GithubRepositoryVulnerabilityAlert';
  /**
   * The affected version
   * @deprecated advisory specific fields are being removed from repositoryVulnerabilityAlert objects Use `securityVulnerability.vulnerableVersionRange` instead. Removal on 2019-10-01 UTC.
   */
  affectedRange: Scalars['String'];
  /** When was the alert created? */
  createdAt: Scalars['GithubDateTime'];
  /** The reason the alert was dismissed */
  dismissReason?: Maybe<Scalars['String']>;
  /** When was the alert dimissed? */
  dismissedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The user who dismissed the alert */
  dismisser?: Maybe<GithubUser>;
  /**
   * The external identifier for the vulnerability
   * @deprecated advisory specific fields are being removed from repositoryVulnerabilityAlert objects Use `securityAdvisory.identifiers` instead. Removal on 2019-10-01 UTC.
   */
  externalIdentifier?: Maybe<Scalars['String']>;
  /**
   * The external reference for the vulnerability
   * @deprecated advisory specific fields are being removed from repositoryVulnerabilityAlert objects Use `securityAdvisory.references` instead. Removal on 2019-10-01 UTC.
   */
  externalReference: Scalars['String'];
  /**
   * The fixed version
   * @deprecated advisory specific fields are being removed from repositoryVulnerabilityAlert objects Use `securityVulnerability.firstPatchedVersion` instead. Removal on 2019-10-01 UTC.
   */
  fixedIn?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /**
   * The affected package
   * @deprecated advisory specific fields are being removed from repositoryVulnerabilityAlert objects Use `securityVulnerability.package` instead. Removal on 2019-10-01 UTC.
   */
  packageName: Scalars['String'];
  /** The associated repository */
  repository: GithubRepository;
  /** The associated security advisory */
  securityAdvisory?: Maybe<GithubSecurityAdvisory>;
  /** The associated security vulnerablity */
  securityVulnerability?: Maybe<GithubSecurityVulnerability>;
  /** The vulnerable manifest filename */
  vulnerableManifestFilename: Scalars['String'];
  /** The vulnerable manifest path */
  vulnerableManifestPath: Scalars['String'];
  /** The vulnerable requirements */
  vulnerableRequirements?: Maybe<Scalars['String']>;
};

/** The connection type for RepositoryVulnerabilityAlert. */
export type GithubRepositoryVulnerabilityAlertConnection = {
   __typename?: 'GithubRepositoryVulnerabilityAlertConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubRepositoryVulnerabilityAlertEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRepositoryVulnerabilityAlert>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubRepositoryVulnerabilityAlertEdge = {
   __typename?: 'GithubRepositoryVulnerabilityAlertEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubRepositoryVulnerabilityAlert>;
};

/** Types that can be requested reviewers. */
export type GithubRequestedReviewer = GithubMannequin | GithubTeam | GithubUser;

/** Autogenerated input type of RequestReviews */
export type GithubRequestReviewsInput = {
  /** The Node ID of the pull request to modify. */
  pullRequestId: Scalars['ID'];
  /** The Node IDs of the user to request. */
  userIds?: Maybe<Array<Scalars['ID']>>;
  /** The Node IDs of the team to request. */
  teamIds?: Maybe<Array<Scalars['ID']>>;
  /** Add users to the set rather than replace. */
  union?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of RequestReviews */
export type GithubRequestReviewsPayload = {
   __typename?: 'GithubRequestReviewsPayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The pull request that is getting requests. */
  pullRequest?: Maybe<GithubPullRequest>;
  /** The edge from the pull request to the requested reviewers. */
  requestedReviewersEdge?: Maybe<GithubUserEdge>;
};

/** Autogenerated input type of ResolveReviewThread */
export type GithubResolveReviewThreadInput = {
  /** The ID of the thread to resolve */
  threadId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of ResolveReviewThread */
export type GithubResolveReviewThreadPayload = {
   __typename?: 'GithubResolveReviewThreadPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The thread to resolve. */
  thread?: Maybe<GithubPullRequestReviewThread>;
};

/** Represents a private contribution a user made on GitHub. */
export type GithubRestrictedContribution = GithubContribution & {
   __typename?: 'GithubRestrictedContribution';
  /**
   * Whether this contribution is associated with a record you do not have access to. For
   * example, your own 'first issue' contribution may have been made on a repository you can no
   * longer access.
   */
  isRestricted: Scalars['Boolean'];
  /** When this contribution was made. */
  occurredAt: Scalars['GithubDateTime'];
  /** The HTTP path for this contribution. */
  resourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this contribution. */
  url: Scalars['GithubURI'];
  /** The user who made this contribution. */
  user: GithubUser;
};

/** A team or user who has the ability to dismiss a review on a protected branch. */
export type GithubReviewDismissalAllowance = GithubNode & {
   __typename?: 'GithubReviewDismissalAllowance';
  /** The actor that can dismiss. */
  actor?: Maybe<GithubReviewDismissalAllowanceActor>;
  /** Identifies the branch protection rule associated with the allowed user or team. */
  branchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  id: Scalars['ID'];
};

/** Types that can be an actor. */
export type GithubReviewDismissalAllowanceActor = GithubTeam | GithubUser;

/** The connection type for ReviewDismissalAllowance. */
export type GithubReviewDismissalAllowanceConnection = {
   __typename?: 'GithubReviewDismissalAllowanceConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReviewDismissalAllowanceEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubReviewDismissalAllowance>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubReviewDismissalAllowanceEdge = {
   __typename?: 'GithubReviewDismissalAllowanceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubReviewDismissalAllowance>;
};

/** Represents a 'review_dismissed' event on a given issue or pull request. */
export type GithubReviewDismissedEvent = GithubNode & GithubUniformResourceLocatable & {
   __typename?: 'GithubReviewDismissedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** Identifies the optional message associated with the 'review_dismissed' event. */
  dismissalMessage?: Maybe<Scalars['String']>;
  /** Identifies the optional message associated with the event, rendered to HTML. */
  dismissalMessageHTML?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** Identifies the previous state of the review with the 'review_dismissed' event. */
  previousReviewState: GithubPullRequestReviewState;
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** Identifies the commit which caused the review to become stale. */
  pullRequestCommit?: Maybe<GithubPullRequestCommit>;
  /** The HTTP path for this review dismissed event. */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the review associated with the 'review_dismissed' event. */
  review?: Maybe<GithubPullRequestReview>;
  /** The HTTP URL for this review dismissed event. */
  url: Scalars['GithubURI'];
};

/** A request for a user to review a pull request. */
export type GithubReviewRequest = GithubNode & {
   __typename?: 'GithubReviewRequest';
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** Identifies the pull request associated with this review request. */
  pullRequest: GithubPullRequest;
  /** The reviewer that is requested. */
  requestedReviewer?: Maybe<GithubRequestedReviewer>;
};

/** The connection type for ReviewRequest. */
export type GithubReviewRequestConnection = {
   __typename?: 'GithubReviewRequestConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubReviewRequestEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubReviewRequest>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents an 'review_requested' event on a given pull request. */
export type GithubReviewRequestedEvent = GithubNode & {
   __typename?: 'GithubReviewRequestedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** Identifies the reviewer whose review was requested. */
  requestedReviewer?: Maybe<GithubRequestedReviewer>;
};

/** An edge in a connection. */
export type GithubReviewRequestEdge = {
   __typename?: 'GithubReviewRequestEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubReviewRequest>;
};

/** Represents an 'review_request_removed' event on a given pull request. */
export type GithubReviewRequestRemovedEvent = GithubNode & {
   __typename?: 'GithubReviewRequestRemovedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** PullRequest referenced by event. */
  pullRequest: GithubPullRequest;
  /** Identifies the reviewer whose review request was removed. */
  requestedReviewer?: Maybe<GithubRequestedReviewer>;
};

/**
 * A hovercard context with a message describing the current code review state of the pull
 * request.
 */
export type GithubReviewStatusHovercardContext = GithubHovercardContext & {
   __typename?: 'GithubReviewStatusHovercardContext';
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
  /** The current status of the pull request with respect to code review. */
  reviewDecision?: Maybe<GithubPullRequestReviewDecision>;
};

/** The possible digest algorithms used to sign SAML requests for an identity provider. */
export enum GithubSamlDigestAlgorithm {
  /** SHA1 */
  Sha1 = 'SHA1',
  /** SHA256 */
  Sha256 = 'SHA256',
  /** SHA384 */
  Sha384 = 'SHA384',
  /** SHA512 */
  Sha512 = 'SHA512'
}

/** The possible signature algorithms used to sign SAML requests for a Identity Provider. */
export enum GithubSamlSignatureAlgorithm {
  /** RSA-SHA1 */
  RsaSha1 = 'RSA_SHA1',
  /** RSA-SHA256 */
  RsaSha256 = 'RSA_SHA256',
  /** RSA-SHA384 */
  RsaSha384 = 'RSA_SHA384',
  /** RSA-SHA512 */
  RsaSha512 = 'RSA_SHA512'
}

/** A Saved Reply is text a user can use to reply quickly. */
export type GithubSavedReply = GithubNode & {
   __typename?: 'GithubSavedReply';
  /** The body of the saved reply. */
  body: Scalars['String'];
  /** The saved reply body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** The title of the saved reply. */
  title: Scalars['String'];
  /** The user that saved this reply. */
  user?: Maybe<GithubActor>;
};

/** The connection type for SavedReply. */
export type GithubSavedReplyConnection = {
   __typename?: 'GithubSavedReplyConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSavedReplyEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSavedReply>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSavedReplyEdge = {
   __typename?: 'GithubSavedReplyEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSavedReply>;
};

/** Ordering options for saved reply connections. */
export type GithubSavedReplyOrder = {
  /** The field to order saved replies by. */
  field: GithubSavedReplyOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which saved reply connections can be ordered. */
export enum GithubSavedReplyOrderField {
  /** Order saved reply by when they were updated. */
  UpdatedAt = 'UPDATED_AT'
}

/** The results of a search. */
export type GithubSearchResultItem = GithubApp | GithubIssue | GithubMarketplaceListing | GithubOrganization | GithubPullRequest | GithubRepository | GithubUser;

/** A list of results that matched against a search query. */
export type GithubSearchResultItemConnection = {
   __typename?: 'GithubSearchResultItemConnection';
  /** The number of pieces of code that matched the search query. */
  codeCount: Scalars['Int'];
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSearchResultItemEdge>>>;
  /** The number of issues that matched the search query. */
  issueCount: Scalars['Int'];
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSearchResultItem>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** The number of repositories that matched the search query. */
  repositoryCount: Scalars['Int'];
  /** The number of users that matched the search query. */
  userCount: Scalars['Int'];
  /** The number of wiki pages that matched the search query. */
  wikiCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSearchResultItemEdge = {
   __typename?: 'GithubSearchResultItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSearchResultItem>;
  /** Text matches on the result found. */
  textMatches?: Maybe<Array<Maybe<GithubTextMatch>>>;
};

/** Represents the individual results of a search. */
export enum GithubSearchType {
  /** Returns results matching issues in repositories. */
  Issue = 'ISSUE',
  /** Returns results matching repositories. */
  Repository = 'REPOSITORY',
  /** Returns results matching users and organizations on GitHub. */
  User = 'USER'
}

/** A GitHub Security Advisory */
export type GithubSecurityAdvisory = GithubNode & {
   __typename?: 'GithubSecurityAdvisory';
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** This is a long plaintext description of the advisory */
  description: Scalars['String'];
  /** The GitHub Security Advisory ID */
  ghsaId: Scalars['String'];
  id: Scalars['ID'];
  /** A list of identifiers for this advisory */
  identifiers: Array<GithubSecurityAdvisoryIdentifier>;
  /** The organization that originated the advisory */
  origin: Scalars['String'];
  /** The permalink for the advisory */
  permalink?: Maybe<Scalars['GithubURI']>;
  /** When the advisory was published */
  publishedAt: Scalars['GithubDateTime'];
  /** A list of references for this advisory */
  references: Array<GithubSecurityAdvisoryReference>;
  /** The severity of the advisory */
  severity: GithubSecurityAdvisorySeverity;
  /** A short plaintext summary of the advisory */
  summary: Scalars['String'];
  /** When the advisory was last updated */
  updatedAt: Scalars['GithubDateTime'];
  /** Vulnerabilities associated with this Advisory */
  vulnerabilities: GithubSecurityVulnerabilityConnection;
  /** When the advisory was withdrawn, if it has been withdrawn */
  withdrawnAt?: Maybe<Scalars['GithubDateTime']>;
};


/** A GitHub Security Advisory */
export type GithubSecurityAdvisoryVulnerabilitiesArgs = {
  orderBy?: Maybe<GithubSecurityVulnerabilityOrder>;
  ecosystem?: Maybe<GithubSecurityAdvisoryEcosystem>;
  package?: Maybe<Scalars['String']>;
  severities?: Maybe<Array<GithubSecurityAdvisorySeverity>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for SecurityAdvisory. */
export type GithubSecurityAdvisoryConnection = {
   __typename?: 'GithubSecurityAdvisoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSecurityAdvisoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSecurityAdvisory>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** The possible ecosystems of a security vulnerability's package. */
export enum GithubSecurityAdvisoryEcosystem {
  /** Ruby gems hosted at RubyGems.org */
  Rubygems = 'RUBYGEMS',
  /** JavaScript packages hosted at npmjs.com */
  Npm = 'NPM',
  /** Python packages hosted at PyPI.org */
  Pip = 'PIP',
  /** Java artifacts hosted at the Maven central repository */
  Maven = 'MAVEN',
  /** .NET packages hosted at the NuGet Gallery */
  Nuget = 'NUGET',
  /** PHP packages hosted at packagist.org */
  Composer = 'COMPOSER'
}

/** An edge in a connection. */
export type GithubSecurityAdvisoryEdge = {
   __typename?: 'GithubSecurityAdvisoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSecurityAdvisory>;
};

/** A GitHub Security Advisory Identifier */
export type GithubSecurityAdvisoryIdentifier = {
   __typename?: 'GithubSecurityAdvisoryIdentifier';
  /** The identifier type, e.g. GHSA, CVE */
  type: Scalars['String'];
  /** The identifier */
  value: Scalars['String'];
};

/** An advisory identifier to filter results on. */
export type GithubSecurityAdvisoryIdentifierFilter = {
  /** The identifier type. */
  type: GithubSecurityAdvisoryIdentifierType;
  /** The identifier string. Supports exact or partial matching. */
  value: Scalars['String'];
};

/** Identifier formats available for advisories. */
export enum GithubSecurityAdvisoryIdentifierType {
  /** Common Vulnerabilities and Exposures Identifier. */
  Cve = 'CVE',
  /** GitHub Security Advisory ID. */
  Ghsa = 'GHSA'
}

/** Ordering options for security advisory connections */
export type GithubSecurityAdvisoryOrder = {
  /** The field to order security advisories by. */
  field: GithubSecurityAdvisoryOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which security advisory connections can be ordered. */
export enum GithubSecurityAdvisoryOrderField {
  /** Order advisories by publication time */
  PublishedAt = 'PUBLISHED_AT',
  /** Order advisories by update time */
  UpdatedAt = 'UPDATED_AT'
}

/** An individual package */
export type GithubSecurityAdvisoryPackage = {
   __typename?: 'GithubSecurityAdvisoryPackage';
  /** The ecosystem the package belongs to, e.g. RUBYGEMS, NPM */
  ecosystem: GithubSecurityAdvisoryEcosystem;
  /** The package name */
  name: Scalars['String'];
};

/** An individual package version */
export type GithubSecurityAdvisoryPackageVersion = {
   __typename?: 'GithubSecurityAdvisoryPackageVersion';
  /** The package name or version */
  identifier: Scalars['String'];
};

/** A GitHub Security Advisory Reference */
export type GithubSecurityAdvisoryReference = {
   __typename?: 'GithubSecurityAdvisoryReference';
  /** A publicly accessible reference */
  url: Scalars['GithubURI'];
};

/** Severity of the vulnerability. */
export enum GithubSecurityAdvisorySeverity {
  /** Low. */
  Low = 'LOW',
  /** Moderate. */
  Moderate = 'MODERATE',
  /** High. */
  High = 'HIGH',
  /** Critical. */
  Critical = 'CRITICAL'
}

/** An individual vulnerability within an Advisory */
export type GithubSecurityVulnerability = {
   __typename?: 'GithubSecurityVulnerability';
  /** The Advisory associated with this Vulnerability */
  advisory: GithubSecurityAdvisory;
  /** The first version containing a fix for the vulnerability */
  firstPatchedVersion?: Maybe<GithubSecurityAdvisoryPackageVersion>;
  /** A description of the vulnerable package */
  package: GithubSecurityAdvisoryPackage;
  /** The severity of the vulnerability within this package */
  severity: GithubSecurityAdvisorySeverity;
  /** When the vulnerability was last updated */
  updatedAt: Scalars['GithubDateTime'];
  /**
   * A string that describes the vulnerable package versions.
   * This string follows a basic syntax with a few forms.
   * + `= 0.2.0` denotes a single vulnerable version.
   * + `<= 1.0.8` denotes a version range up to and including the specified version
   * + `< 0.1.11` denotes a version range up to, but excluding, the specified version
   * + `>= 4.3.0, < 4.3.5` denotes a version range with a known minimum and maximum version.
   * + `>= 0.0.1` denotes a version range with a known minimum, but no known maximum
   */
  vulnerableVersionRange: Scalars['String'];
};

/** The connection type for SecurityVulnerability. */
export type GithubSecurityVulnerabilityConnection = {
   __typename?: 'GithubSecurityVulnerabilityConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSecurityVulnerabilityEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSecurityVulnerability>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSecurityVulnerabilityEdge = {
   __typename?: 'GithubSecurityVulnerabilityEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSecurityVulnerability>;
};

/** Ordering options for security vulnerability connections */
export type GithubSecurityVulnerabilityOrder = {
  /** The field to order security vulnerabilities by. */
  field: GithubSecurityVulnerabilityOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which security vulnerability connections can be ordered. */
export enum GithubSecurityVulnerabilityOrderField {
  /** Order vulnerability by update time */
  UpdatedAt = 'UPDATED_AT'
}

/** Autogenerated input type of SetEnterpriseIdentityProvider */
export type GithubSetEnterpriseIdentityProviderInput = {
  /** The ID of the enterprise on which to set an identity provider. */
  enterpriseId: Scalars['ID'];
  /** The URL endpoint for the identity provider's SAML SSO. */
  ssoUrl: Scalars['GithubURI'];
  /** The Issuer Entity ID for the SAML identity provider */
  issuer?: Maybe<Scalars['String']>;
  /** The x509 certificate used by the identity provider to sign assertions and responses. */
  idpCertificate: Scalars['String'];
  /** The signature algorithm used to sign SAML requests for the identity provider. */
  signatureMethod: GithubSamlSignatureAlgorithm;
  /** The digest algorithm used to sign SAML requests for the identity provider. */
  digestMethod: GithubSamlDigestAlgorithm;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of SetEnterpriseIdentityProvider */
export type GithubSetEnterpriseIdentityProviderPayload = {
   __typename?: 'GithubSetEnterpriseIdentityProviderPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The identity provider for the enterprise. */
  identityProvider?: Maybe<GithubEnterpriseIdentityProvider>;
};

/** Represents an S/MIME signature on a Commit or Tag. */
export type GithubSmimeSignature = GithubGitSignature & {
   __typename?: 'GithubSmimeSignature';
  /** Email used to sign this object. */
  email: Scalars['String'];
  /** True if the signature is valid and verified by GitHub. */
  isValid: Scalars['Boolean'];
  /** Payload for GPG signing object. Raw ODB object without the signature header. */
  payload: Scalars['String'];
  /** ASCII-armored signature header from object. */
  signature: Scalars['String'];
  /** GitHub user corresponding to the email signing this commit. */
  signer?: Maybe<GithubUser>;
  /**
   * The state of this signature. `VALID` if signature is valid and verified by
   * GitHub, otherwise represents reason why signature is considered invalid.
   */
  state: GithubGitSignatureState;
  /** True if the signature was made with GitHub's signing key. */
  wasSignedByGitHub: Scalars['Boolean'];
};

/** Entities that can be sponsored through GitHub Sponsors */
export type GithubSponsorable = {
  /** The GitHub Sponsors listing for this user. */
  sponsorsListing?: Maybe<GithubSponsorsListing>;
  /** This object's sponsorships as the maintainer. */
  sponsorshipsAsMaintainer: GithubSponsorshipConnection;
  /** This object's sponsorships as the sponsor. */
  sponsorshipsAsSponsor: GithubSponsorshipConnection;
};


/** Entities that can be sponsored through GitHub Sponsors */
export type GithubSponsorableSponsorshipsAsMaintainerArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  includePrivate?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};


/** Entities that can be sponsored through GitHub Sponsors */
export type GithubSponsorableSponsorshipsAsSponsorArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};

/** A sponsorship relationship between a sponsor and a maintainer */
export type GithubSponsorship = GithubNode & {
   __typename?: 'GithubSponsorship';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /**
   * The entity that is being sponsored
   * @deprecated `Sponsorship.maintainer` will be removed. Use `Sponsorship.sponsorable` instead. Removal on 2020-04-01 UTC.
   */
  maintainer: GithubUser;
  /** The privacy level for this sponsorship. */
  privacyLevel: GithubSponsorshipPrivacy;
  /** The entity that is sponsoring. Returns null if the sponsorship is private */
  sponsor?: Maybe<GithubUser>;
  /** The entity that is being sponsored */
  sponsorable: GithubSponsorable;
  /** The associated sponsorship tier */
  tier?: Maybe<GithubSponsorsTier>;
};

/** The connection type for Sponsorship. */
export type GithubSponsorshipConnection = {
   __typename?: 'GithubSponsorshipConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSponsorshipEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSponsorship>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSponsorshipEdge = {
   __typename?: 'GithubSponsorshipEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSponsorship>;
};

/** Ordering options for sponsorship connections. */
export type GithubSponsorshipOrder = {
  /** The field to order sponsorship by. */
  field: GithubSponsorshipOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which sponsorship connections can be ordered. */
export enum GithubSponsorshipOrderField {
  /** Order sponsorship by creation time. */
  CreatedAt = 'CREATED_AT'
}

/** The privacy of a sponsorship */
export enum GithubSponsorshipPrivacy {
  /** Public */
  Public = 'PUBLIC',
  /** Private */
  Private = 'PRIVATE'
}

/** A GitHub Sponsors listing. */
export type GithubSponsorsListing = GithubNode & {
   __typename?: 'GithubSponsorsListing';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The full description of the listing. */
  fullDescription: Scalars['String'];
  /** The full description of the listing rendered to HTML. */
  fullDescriptionHTML: Scalars['GithubHTML'];
  id: Scalars['ID'];
  /** The listing's full name. */
  name: Scalars['String'];
  /** The short description of the listing. */
  shortDescription: Scalars['String'];
  /** The short name of the listing. */
  slug: Scalars['String'];
  /** The published tiers for this GitHub Sponsors listing. */
  tiers?: Maybe<GithubSponsorsTierConnection>;
};


/** A GitHub Sponsors listing. */
export type GithubSponsorsListingTiersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubSponsorsTierOrder>;
};

/** A GitHub Sponsors tier associated with a GitHub Sponsors listing. */
export type GithubSponsorsTier = GithubNode & {
   __typename?: 'GithubSponsorsTier';
  /** SponsorsTier information only visible to users that can administer the associated Sponsors listing. */
  adminInfo?: Maybe<GithubSponsorsTierAdminInfo>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The description of the tier. */
  description: Scalars['String'];
  /** The tier description rendered to HTML */
  descriptionHTML: Scalars['GithubHTML'];
  id: Scalars['ID'];
  /** How much this tier costs per month in cents. */
  monthlyPriceInCents: Scalars['Int'];
  /** How much this tier costs per month in dollars. */
  monthlyPriceInDollars: Scalars['Int'];
  /** The name of the tier. */
  name: Scalars['String'];
  /** The sponsors listing that this tier belongs to. */
  sponsorsListing: GithubSponsorsListing;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** SponsorsTier information only visible to users that can administer the associated Sponsors listing. */
export type GithubSponsorsTierAdminInfo = {
   __typename?: 'GithubSponsorsTierAdminInfo';
  /** The sponsorships associated with this tier. */
  sponsorships: GithubSponsorshipConnection;
};


/** SponsorsTier information only visible to users that can administer the associated Sponsors listing. */
export type GithubSponsorsTierAdminInfoSponsorshipsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  includePrivate?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};

/** The connection type for SponsorsTier. */
export type GithubSponsorsTierConnection = {
   __typename?: 'GithubSponsorsTierConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSponsorsTierEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSponsorsTier>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSponsorsTierEdge = {
   __typename?: 'GithubSponsorsTierEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSponsorsTier>;
};

/** Ordering options for Sponsors tiers connections. */
export type GithubSponsorsTierOrder = {
  /** The field to order tiers by. */
  field: GithubSponsorsTierOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which Sponsors tiers connections can be ordered. */
export enum GithubSponsorsTierOrderField {
  /** Order tiers by creation time. */
  CreatedAt = 'CREATED_AT',
  /** Order tiers by their monthly price in cents */
  MonthlyPriceInCents = 'MONTHLY_PRICE_IN_CENTS'
}

/** The connection type for User. */
export type GithubStargazerConnection = {
   __typename?: 'GithubStargazerConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubStargazerEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a user that's starred a repository. */
export type GithubStargazerEdge = {
   __typename?: 'GithubStargazerEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  node: GithubUser;
  /** Identifies when the item was starred. */
  starredAt: Scalars['GithubDateTime'];
};

/** Ways in which star connections can be ordered. */
export type GithubStarOrder = {
  /** The field in which to order nodes by. */
  field: GithubStarOrderField;
  /** The direction in which to order nodes. */
  direction: GithubOrderDirection;
};

/** Properties by which star connections can be ordered. */
export enum GithubStarOrderField {
  /** Allows ordering a list of stars by when they were created. */
  StarredAt = 'STARRED_AT'
}

/** Things that can be starred. */
export type GithubStarrable = {
  id: Scalars['ID'];
  /** A list of users who have starred this starrable. */
  stargazers: GithubStargazerConnection;
  /** Returns a boolean indicating whether the viewing user has starred this starrable. */
  viewerHasStarred: Scalars['Boolean'];
};


/** Things that can be starred. */
export type GithubStarrableStargazersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubStarOrder>;
};

/** The connection type for Repository. */
export type GithubStarredRepositoryConnection = {
   __typename?: 'GithubStarredRepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubStarredRepositoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRepository>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a starred repository. */
export type GithubStarredRepositoryEdge = {
   __typename?: 'GithubStarredRepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  node: GithubRepository;
  /** Identifies when the item was starred. */
  starredAt: Scalars['GithubDateTime'];
};

/** Represents a commit status. */
export type GithubStatus = GithubNode & {
   __typename?: 'GithubStatus';
  /** The commit this status is attached to. */
  commit?: Maybe<GithubCommit>;
  /** Looks up an individual status context by context name. */
  context?: Maybe<GithubStatusContext>;
  /** The individual status contexts for this commit. */
  contexts: Array<GithubStatusContext>;
  id: Scalars['ID'];
  /** The combined commit status. */
  state: GithubStatusState;
};


/** Represents a commit status. */
export type GithubStatusContextArgs = {
  name: Scalars['String'];
};

/** Represents the rollup for both the check runs and status for a commit. */
export type GithubStatusCheckRollup = GithubNode & {
   __typename?: 'GithubStatusCheckRollup';
  /** The commit the status and check runs are attached to. */
  commit?: Maybe<GithubCommit>;
  /** A list of status contexts and check runs for this commit. */
  contexts: GithubStatusCheckRollupContextConnection;
  id: Scalars['ID'];
  /** The combined status for the commit. */
  state: GithubStatusState;
};


/** Represents the rollup for both the check runs and status for a commit. */
export type GithubStatusCheckRollupContextsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** Types that can be inside a StatusCheckRollup context. */
export type GithubStatusCheckRollupContext = GithubStatusContext;

/** The connection type for StatusCheckRollupContext. */
export type GithubStatusCheckRollupContextConnection = {
   __typename?: 'GithubStatusCheckRollupContextConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubStatusCheckRollupContextEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubStatusCheckRollupContext>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubStatusCheckRollupContextEdge = {
   __typename?: 'GithubStatusCheckRollupContextEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubStatusCheckRollupContext>;
};

/** Represents an individual commit status context */
export type GithubStatusContext = GithubNode & {
   __typename?: 'GithubStatusContext';
  /** The avatar of the OAuth application or the user that created the status */
  avatarUrl?: Maybe<Scalars['GithubURI']>;
  /** This commit this status context is attached to. */
  commit?: Maybe<GithubCommit>;
  /** The name of this status context. */
  context: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The actor who created this status context. */
  creator?: Maybe<GithubActor>;
  /** The description for this status context. */
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The state of this status context. */
  state: GithubStatusState;
  /** The URL for this status context. */
  targetUrl?: Maybe<Scalars['GithubURI']>;
};


/** Represents an individual commit status context */
export type GithubStatusContextAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};

/** The possible commit status states. */
export enum GithubStatusState {
  /** Status is expected. */
  Expected = 'EXPECTED',
  /** Status is errored. */
  Error = 'ERROR',
  /** Status is failing. */
  Failure = 'FAILURE',
  /** Status is pending. */
  Pending = 'PENDING',
  /** Status is successful. */
  Success = 'SUCCESS'
}

/** Autogenerated input type of SubmitPullRequestReview */
export type GithubSubmitPullRequestReviewInput = {
  /** The Pull Request ID to submit any pending reviews. */
  pullRequestId?: Maybe<Scalars['ID']>;
  /** The Pull Request Review ID to submit. */
  pullRequestReviewId?: Maybe<Scalars['ID']>;
  /** The event to send to the Pull Request Review. */
  event: GithubPullRequestReviewEvent;
  /** The text field to set on the Pull Request Review. */
  body?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of SubmitPullRequestReview */
export type GithubSubmitPullRequestReviewPayload = {
   __typename?: 'GithubSubmitPullRequestReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The submitted pull request review. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
};

/** A pointer to a repository at a specific revision embedded inside another repository. */
export type GithubSubmodule = {
   __typename?: 'GithubSubmodule';
  /** The branch of the upstream submodule for tracking updates */
  branch?: Maybe<Scalars['String']>;
  /** The git URL of the submodule repository */
  gitUrl: Scalars['GithubURI'];
  /** The name of the submodule in .gitmodules */
  name: Scalars['String'];
  /** The path in the superproject that this submodule is located in */
  path: Scalars['String'];
  /** The commit revision of the subproject repository being tracked by the submodule */
  subprojectCommitOid?: Maybe<Scalars['GithubGitObjectID']>;
};

/** The connection type for Submodule. */
export type GithubSubmoduleConnection = {
   __typename?: 'GithubSubmoduleConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubSubmoduleEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubSubmodule>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubSubmoduleEdge = {
   __typename?: 'GithubSubmoduleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubSubmodule>;
};

/** Entities that can be subscribed to for web and email notifications. */
export type GithubSubscribable = {
  id: Scalars['ID'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
};

/** Represents a 'subscribed' event on a given `Subscribable`. */
export type GithubSubscribedEvent = GithubNode & {
   __typename?: 'GithubSubscribedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Object referenced by event. */
  subscribable: GithubSubscribable;
};

/** The possible states of a subscription. */
export enum GithubSubscriptionState {
  /** The User is only notified when participating or @mentioned. */
  Unsubscribed = 'UNSUBSCRIBED',
  /** The User is notified of all conversations. */
  Subscribed = 'SUBSCRIBED',
  /** The User is never notified. */
  Ignored = 'IGNORED'
}

/** A suggestion to review a pull request based on a user's commit history and review comments. */
export type GithubSuggestedReviewer = {
   __typename?: 'GithubSuggestedReviewer';
  /** Is this suggestion based on past commits? */
  isAuthor: Scalars['Boolean'];
  /** Is this suggestion based on past review comments? */
  isCommenter: Scalars['Boolean'];
  /** Identifies the user suggested to review the pull request. */
  reviewer: GithubUser;
};

/** Represents a Git tag. */
export type GithubTag = GithubNode & GithubGitObject & {
   __typename?: 'GithubTag';
  /** An abbreviated version of the Git object ID */
  abbreviatedOid: Scalars['String'];
  /** The HTTP path for this Git object */
  commitResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this Git object */
  commitUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** The Git tag message. */
  message?: Maybe<Scalars['String']>;
  /** The Git tag name. */
  name: Scalars['String'];
  /** The Git object ID */
  oid: Scalars['GithubGitObjectID'];
  /** The Repository the Git object belongs to */
  repository: GithubRepository;
  /** Details about the tag author. */
  tagger?: Maybe<GithubGitActor>;
  /** The Git object the tag points to. */
  target: GithubGitObject;
};

/** A team of users in an organization. */
export type GithubTeam = GithubNode & GithubSubscribable & GithubMemberStatusable & {
   __typename?: 'GithubTeam';
  /** A list of teams that are ancestors of this team. */
  ancestors: GithubTeamConnection;
  /** A URL pointing to the team's avatar. */
  avatarUrl?: Maybe<Scalars['GithubURI']>;
  /** List of child teams belonging to this team */
  childTeams: GithubTeamConnection;
  /** The slug corresponding to the organization and team. */
  combinedSlug: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The description of the team. */
  description?: Maybe<Scalars['String']>;
  /** Find a team discussion by its number. */
  discussion?: Maybe<GithubTeamDiscussion>;
  /** A list of team discussions. */
  discussions: GithubTeamDiscussionConnection;
  /** The HTTP path for team discussions */
  discussionsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for team discussions */
  discussionsUrl: Scalars['GithubURI'];
  /** The HTTP path for editing this team */
  editTeamResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for editing this team */
  editTeamUrl: Scalars['GithubURI'];
  id: Scalars['ID'];
  /** A list of pending invitations for users to this team */
  invitations?: Maybe<GithubOrganizationInvitationConnection>;
  /** Get the status messages members of this entity have set that are either public or visible only to the organization. */
  memberStatuses: GithubUserStatusConnection;
  /** A list of users who are members of this team. */
  members: GithubTeamMemberConnection;
  /** The HTTP path for the team' members */
  membersResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for the team' members */
  membersUrl: Scalars['GithubURI'];
  /** The name of the team. */
  name: Scalars['String'];
  /** The HTTP path creating a new team */
  newTeamResourcePath: Scalars['GithubURI'];
  /** The HTTP URL creating a new team */
  newTeamUrl: Scalars['GithubURI'];
  /** The organization that owns this team. */
  organization: GithubOrganization;
  /** The parent team of the team. */
  parentTeam?: Maybe<GithubTeam>;
  /** The level of privacy the team has. */
  privacy: GithubTeamPrivacy;
  /** A list of repositories this team has access to. */
  repositories: GithubTeamRepositoryConnection;
  /** The HTTP path for this team's repositories */
  repositoriesResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this team's repositories */
  repositoriesUrl: Scalars['GithubURI'];
  /** The HTTP path for this team */
  resourcePath: Scalars['GithubURI'];
  /** The slug corresponding to the team. */
  slug: Scalars['String'];
  /** The HTTP path for this team's teams */
  teamsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this team's teams */
  teamsUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this team */
  url: Scalars['GithubURI'];
  /** Team is adminable by the viewer. */
  viewerCanAdminister: Scalars['Boolean'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
};


/** A team of users in an organization. */
export type GithubTeamAncestorsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A team of users in an organization. */
export type GithubTeamAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** A team of users in an organization. */
export type GithubTeamChildTeamsArgs = {
  orderBy?: Maybe<GithubTeamOrder>;
  userLogins?: Maybe<Array<Scalars['String']>>;
  immediateOnly?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A team of users in an organization. */
export type GithubTeamDiscussionArgs = {
  number: Scalars['Int'];
};


/** A team of users in an organization. */
export type GithubTeamDiscussionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  isPinned?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubTeamDiscussionOrder>;
};


/** A team of users in an organization. */
export type GithubTeamInvitationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A team of users in an organization. */
export type GithubTeamMemberStatusesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubUserStatusOrder>;
};


/** A team of users in an organization. */
export type GithubTeamMembersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  membership?: Maybe<GithubTeamMembershipType>;
  role?: Maybe<GithubTeamMemberRole>;
  orderBy?: Maybe<GithubTeamMemberOrder>;
};


/** A team of users in an organization. */
export type GithubTeamRepositoriesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubTeamRepositoryOrder>;
};

/** Audit log entry for a team.add_member event. */
export type GithubTeamAddMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubTeamAuditEntryData & {
   __typename?: 'GithubTeamAddMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the team was mapped to an LDAP Group. */
  isLdapMapped?: Maybe<Scalars['Boolean']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a team.add_repository event. */
export type GithubTeamAddRepositoryAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & GithubTeamAuditEntryData & {
   __typename?: 'GithubTeamAddRepositoryAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the team was mapped to an LDAP Group. */
  isLdapMapped?: Maybe<Scalars['Boolean']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Metadata for an audit entry with action team.* */
export type GithubTeamAuditEntryData = {
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a team.change_parent_team event. */
export type GithubTeamChangeParentTeamAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubTeamAuditEntryData & {
   __typename?: 'GithubTeamChangeParentTeamAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the team was mapped to an LDAP Group. */
  isLdapMapped?: Maybe<Scalars['Boolean']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The new parent team. */
  parentTeam?: Maybe<GithubTeam>;
  /** The name of the new parent team */
  parentTeamName?: Maybe<Scalars['String']>;
  /** The name of the former parent team */
  parentTeamNameWas?: Maybe<Scalars['String']>;
  /** The HTTP path for the parent team */
  parentTeamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the parent team */
  parentTeamUrl?: Maybe<Scalars['GithubURI']>;
  /** The former parent team. */
  parentTeamWas?: Maybe<GithubTeam>;
  /** The HTTP path for the previous parent team */
  parentTeamWasResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the previous parent team */
  parentTeamWasUrl?: Maybe<Scalars['GithubURI']>;
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The connection type for Team. */
export type GithubTeamConnection = {
   __typename?: 'GithubTeamConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTeamEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubTeam>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** A team discussion. */
export type GithubTeamDiscussion = GithubNode & GithubComment & GithubDeletable & GithubReactable & GithubSubscribable & GithubUniformResourceLocatable & GithubUpdatable & GithubUpdatableComment & {
   __typename?: 'GithubTeamDiscussion';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the discussion's team. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** The body as Markdown. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** Identifies the discussion body hash. */
  bodyVersion: Scalars['String'];
  /** A list of comments on this discussion. */
  comments: GithubTeamDiscussionCommentConnection;
  /** The HTTP path for discussion comments */
  commentsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for discussion comments */
  commentsUrl: Scalars['GithubURI'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** Whether or not the discussion is pinned. */
  isPinned: Scalars['Boolean'];
  /** Whether or not the discussion is only visible to team members and org admins. */
  isPrivate: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the discussion within its team. */
  number: Scalars['Int'];
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The HTTP path for this discussion */
  resourcePath: Scalars['GithubURI'];
  /** The team that defines the context of this discussion. */
  team: GithubTeam;
  /** The title of the discussion */
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this discussion */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Whether or not the current viewer can pin this discussion. */
  viewerCanPin: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the viewer is able to change their subscription status for the repository. */
  viewerCanSubscribe: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
  /** Identifies if the viewer is watching, not watching, or ignoring the subscribable entity. */
  viewerSubscription?: Maybe<GithubSubscriptionState>;
};


/** A team discussion. */
export type GithubTeamDiscussionCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubTeamDiscussionCommentOrder>;
  fromComment?: Maybe<Scalars['Int']>;
};


/** A team discussion. */
export type GithubTeamDiscussionReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** A team discussion. */
export type GithubTeamDiscussionUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** A comment on a team discussion. */
export type GithubTeamDiscussionComment = GithubNode & GithubComment & GithubDeletable & GithubReactable & GithubUniformResourceLocatable & GithubUpdatable & GithubUpdatableComment & {
   __typename?: 'GithubTeamDiscussionComment';
  /** The actor who authored the comment. */
  author?: Maybe<GithubActor>;
  /** Author's association with the comment's team. */
  authorAssociation: GithubCommentAuthorAssociation;
  /** The body as Markdown. */
  body: Scalars['String'];
  /** The body rendered to HTML. */
  bodyHTML: Scalars['GithubHTML'];
  /** The body rendered to text. */
  bodyText: Scalars['String'];
  /** The current version of the body content. */
  bodyVersion: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Check if this comment was created via an email reply. */
  createdViaEmail: Scalars['Boolean'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The discussion this comment is about. */
  discussion: GithubTeamDiscussion;
  /** The actor who edited the comment. */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Check if this comment was edited and includes an edit with the creation data */
  includesCreatedEdit: Scalars['Boolean'];
  /** The moment the editor made the last edit */
  lastEditedAt?: Maybe<Scalars['GithubDateTime']>;
  /** Identifies the comment number. */
  number: Scalars['Int'];
  /** Identifies when the comment was published at. */
  publishedAt?: Maybe<Scalars['GithubDateTime']>;
  /** A list of reactions grouped by content left on the subject. */
  reactionGroups?: Maybe<Array<GithubReactionGroup>>;
  /** A list of Reactions left on the Issue. */
  reactions: GithubReactionConnection;
  /** The HTTP path for this comment */
  resourcePath: Scalars['GithubURI'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this comment */
  url: Scalars['GithubURI'];
  /** A list of edits to this content. */
  userContentEdits?: Maybe<GithubUserContentEditConnection>;
  /** Check if the current viewer can delete this object. */
  viewerCanDelete: Scalars['Boolean'];
  /** Can user react to this subject */
  viewerCanReact: Scalars['Boolean'];
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
  /** Did the viewer author this comment. */
  viewerDidAuthor: Scalars['Boolean'];
};


/** A comment on a team discussion. */
export type GithubTeamDiscussionCommentReactionsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  content?: Maybe<GithubReactionContent>;
  orderBy?: Maybe<GithubReactionOrder>;
};


/** A comment on a team discussion. */
export type GithubTeamDiscussionCommentUserContentEditsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The connection type for TeamDiscussionComment. */
export type GithubTeamDiscussionCommentConnection = {
   __typename?: 'GithubTeamDiscussionCommentConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTeamDiscussionCommentEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubTeamDiscussionComment>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubTeamDiscussionCommentEdge = {
   __typename?: 'GithubTeamDiscussionCommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubTeamDiscussionComment>;
};

/** Ways in which team discussion comment connections can be ordered. */
export type GithubTeamDiscussionCommentOrder = {
  /** The field by which to order nodes. */
  field: GithubTeamDiscussionCommentOrderField;
  /** The direction in which to order nodes. */
  direction: GithubOrderDirection;
};

/** Properties by which team discussion comment connections can be ordered. */
export enum GithubTeamDiscussionCommentOrderField {
  /** Allows sequential ordering of team discussion comments (which is equivalent to chronological ordering). */
  Number = 'NUMBER'
}

/** The connection type for TeamDiscussion. */
export type GithubTeamDiscussionConnection = {
   __typename?: 'GithubTeamDiscussionConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTeamDiscussionEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubTeamDiscussion>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubTeamDiscussionEdge = {
   __typename?: 'GithubTeamDiscussionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubTeamDiscussion>;
};

/** Ways in which team discussion connections can be ordered. */
export type GithubTeamDiscussionOrder = {
  /** The field by which to order nodes. */
  field: GithubTeamDiscussionOrderField;
  /** The direction in which to order nodes. */
  direction: GithubOrderDirection;
};

/** Properties by which team discussion connections can be ordered. */
export enum GithubTeamDiscussionOrderField {
  /** Allows chronological ordering of team discussions. */
  CreatedAt = 'CREATED_AT'
}

/** An edge in a connection. */
export type GithubTeamEdge = {
   __typename?: 'GithubTeamEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubTeam>;
};

/** The connection type for User. */
export type GithubTeamMemberConnection = {
   __typename?: 'GithubTeamMemberConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTeamMemberEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a user who is a member of a team. */
export type GithubTeamMemberEdge = {
   __typename?: 'GithubTeamMemberEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The HTTP path to the organization's member access page. */
  memberAccessResourcePath: Scalars['GithubURI'];
  /** The HTTP URL to the organization's member access page. */
  memberAccessUrl: Scalars['GithubURI'];
  node: GithubUser;
  /** The role the member has on the team. */
  role: GithubTeamMemberRole;
};

/** Ordering options for team member connections */
export type GithubTeamMemberOrder = {
  /** The field to order team members by. */
  field: GithubTeamMemberOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which team member connections can be ordered. */
export enum GithubTeamMemberOrderField {
  /** Order team members by login */
  Login = 'LOGIN',
  /** Order team members by creation time */
  CreatedAt = 'CREATED_AT'
}

/** The possible team member roles; either 'maintainer' or 'member'. */
export enum GithubTeamMemberRole {
  /** A team maintainer has permission to add and remove team members. */
  Maintainer = 'MAINTAINER',
  /** A team member has no administrative permissions on the team. */
  Member = 'MEMBER'
}

/** Defines which types of team members are included in the returned list. Can be one of IMMEDIATE, CHILD_TEAM or ALL. */
export enum GithubTeamMembershipType {
  /** Includes only immediate members of the team. */
  Immediate = 'IMMEDIATE',
  /** Includes only child team members for the team. */
  ChildTeam = 'CHILD_TEAM',
  /** Includes immediate and child team members for the team. */
  All = 'ALL'
}

/** Ways in which team connections can be ordered. */
export type GithubTeamOrder = {
  /** The field in which to order nodes by. */
  field: GithubTeamOrderField;
  /** The direction in which to order nodes. */
  direction: GithubOrderDirection;
};

/** Properties by which team connections can be ordered. */
export enum GithubTeamOrderField {
  /** Allows ordering a list of teams by name. */
  Name = 'NAME'
}

/** The possible team privacy values. */
export enum GithubTeamPrivacy {
  /** A secret team can only be seen by its members. */
  Secret = 'SECRET',
  /** A visible team can be seen and @mentioned by every member of the organization. */
  Visible = 'VISIBLE'
}

/** Audit log entry for a team.remove_member event. */
export type GithubTeamRemoveMemberAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubTeamAuditEntryData & {
   __typename?: 'GithubTeamRemoveMemberAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the team was mapped to an LDAP Group. */
  isLdapMapped?: Maybe<Scalars['Boolean']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** Audit log entry for a team.remove_repository event. */
export type GithubTeamRemoveRepositoryAuditEntry = GithubNode & GithubAuditEntry & GithubOrganizationAuditEntryData & GithubRepositoryAuditEntryData & GithubTeamAuditEntryData & {
   __typename?: 'GithubTeamRemoveRepositoryAuditEntry';
  /** The action name */
  action: Scalars['String'];
  /** The user who initiated the action */
  actor?: Maybe<GithubAuditEntryActor>;
  /** The IP address of the actor */
  actorIp?: Maybe<Scalars['String']>;
  /** A readable representation of the actor's location */
  actorLocation?: Maybe<GithubActorLocation>;
  /** The username of the user who initiated the action */
  actorLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the actor. */
  actorResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the actor. */
  actorUrl?: Maybe<Scalars['GithubURI']>;
  /** The time the action was initiated */
  createdAt: Scalars['GithubPreciseDateTime'];
  id: Scalars['ID'];
  /** Whether the team was mapped to an LDAP Group. */
  isLdapMapped?: Maybe<Scalars['Boolean']>;
  /** The corresponding operation type for the action */
  operationType?: Maybe<GithubOperationType>;
  /** The Organization associated with the Audit Entry. */
  organization?: Maybe<GithubOrganization>;
  /** The name of the Organization. */
  organizationName?: Maybe<Scalars['String']>;
  /** The HTTP path for the organization */
  organizationResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the organization */
  organizationUrl?: Maybe<Scalars['GithubURI']>;
  /** The repository associated with the action */
  repository?: Maybe<GithubRepository>;
  /** The name of the repository */
  repositoryName?: Maybe<Scalars['String']>;
  /** The HTTP path for the repository */
  repositoryResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the repository */
  repositoryUrl?: Maybe<Scalars['GithubURI']>;
  /** The team associated with the action */
  team?: Maybe<GithubTeam>;
  /** The name of the team */
  teamName?: Maybe<Scalars['String']>;
  /** The HTTP path for this team */
  teamResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for this team */
  teamUrl?: Maybe<Scalars['GithubURI']>;
  /** The user affected by the action */
  user?: Maybe<GithubUser>;
  /** For actions involving two users, the actor is the initiator and the user is the affected user. */
  userLogin?: Maybe<Scalars['String']>;
  /** The HTTP path for the user. */
  userResourcePath?: Maybe<Scalars['GithubURI']>;
  /** The HTTP URL for the user. */
  userUrl?: Maybe<Scalars['GithubURI']>;
};

/** The connection type for Repository. */
export type GithubTeamRepositoryConnection = {
   __typename?: 'GithubTeamRepositoryConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTeamRepositoryEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubRepository>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** Represents a team repository. */
export type GithubTeamRepositoryEdge = {
   __typename?: 'GithubTeamRepositoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  node: GithubRepository;
  /** The permission level the team has on the repository */
  permission: GithubRepositoryPermission;
};

/** Ordering options for team repository connections */
export type GithubTeamRepositoryOrder = {
  /** The field to order repositories by. */
  field: GithubTeamRepositoryOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which team repository connections can be ordered. */
export enum GithubTeamRepositoryOrderField {
  /** Order repositories by creation time */
  CreatedAt = 'CREATED_AT',
  /** Order repositories by update time */
  UpdatedAt = 'UPDATED_AT',
  /** Order repositories by push time */
  PushedAt = 'PUSHED_AT',
  /** Order repositories by name */
  Name = 'NAME',
  /** Order repositories by permission */
  Permission = 'PERMISSION',
  /** Order repositories by number of stargazers */
  Stargazers = 'STARGAZERS'
}

/** The role of a user on a team. */
export enum GithubTeamRole {
  /** User has admin rights on the team. */
  Admin = 'ADMIN',
  /** User is a member of the team. */
  Member = 'MEMBER'
}

/** A text match within a search result. */
export type GithubTextMatch = {
   __typename?: 'GithubTextMatch';
  /** The specific text fragment within the property matched on. */
  fragment: Scalars['String'];
  /** Highlights within the matched fragment. */
  highlights: Array<GithubTextMatchHighlight>;
  /** The property matched on. */
  property: Scalars['String'];
};

/** Represents a single highlight in a search result match. */
export type GithubTextMatchHighlight = {
   __typename?: 'GithubTextMatchHighlight';
  /** The indice in the fragment where the matched text begins. */
  beginIndice: Scalars['Int'];
  /** The indice in the fragment where the matched text ends. */
  endIndice: Scalars['Int'];
  /** The text matched. */
  text: Scalars['String'];
};

/** A topic aggregates entities that are related to a subject. */
export type GithubTopic = GithubNode & GithubStarrable & {
   __typename?: 'GithubTopic';
  id: Scalars['ID'];
  /** The topic's name. */
  name: Scalars['String'];
  /**
   * A list of related topics, including aliases of this topic, sorted with the most relevant
   * first. Returns up to 10 Topics.
   */
  relatedTopics: Array<GithubTopic>;
  /** A list of users who have starred this starrable. */
  stargazers: GithubStargazerConnection;
  /** Returns a boolean indicating whether the viewing user has starred this starrable. */
  viewerHasStarred: Scalars['Boolean'];
};


/** A topic aggregates entities that are related to a subject. */
export type GithubTopicRelatedTopicsArgs = {
  first?: Maybe<Scalars['Int']>;
};


/** A topic aggregates entities that are related to a subject. */
export type GithubTopicStargazersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubStarOrder>;
};

/** Metadata for an audit entry with a topic. */
export type GithubTopicAuditEntryData = {
  /** The name of the topic added to the repository */
  topic?: Maybe<GithubTopic>;
  /** The name of the topic added to the repository */
  topicName?: Maybe<Scalars['String']>;
};

/** The connection type for Topic. */
export type GithubTopicConnection = {
   __typename?: 'GithubTopicConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubTopicEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubTopic>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubTopicEdge = {
   __typename?: 'GithubTopicEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubTopic>;
};

/** Reason that the suggested topic is declined. */
export enum GithubTopicSuggestionDeclineReason {
  /** The suggested topic is not relevant to the repository. */
  NotRelevant = 'NOT_RELEVANT',
  /** The suggested topic is too specific for the repository (e.g. #ruby-on-rails-version-4-2-1). */
  TooSpecific = 'TOO_SPECIFIC',
  /** The viewer does not like the suggested topic. */
  PersonalPreference = 'PERSONAL_PREFERENCE',
  /** The suggested topic is too general for the repository. */
  TooGeneral = 'TOO_GENERAL'
}

/** Autogenerated input type of TransferIssue */
export type GithubTransferIssueInput = {
  /** The Node ID of the issue to be transferred */
  issueId: Scalars['ID'];
  /** The Node ID of the repository the issue should be transferred to */
  repositoryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of TransferIssue */
export type GithubTransferIssuePayload = {
   __typename?: 'GithubTransferIssuePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The issue that was transferred */
  issue?: Maybe<GithubIssue>;
};

/** Represents a 'transferred' event on a given issue or pull request. */
export type GithubTransferredEvent = GithubNode & {
   __typename?: 'GithubTransferredEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** The repository this came from */
  fromRepository?: Maybe<GithubRepository>;
  id: Scalars['ID'];
  /** Identifies the issue associated with the event. */
  issue: GithubIssue;
};

/** Represents a Git tree. */
export type GithubTree = GithubNode & GithubGitObject & {
   __typename?: 'GithubTree';
  /** An abbreviated version of the Git object ID */
  abbreviatedOid: Scalars['String'];
  /** The HTTP path for this Git object */
  commitResourcePath: Scalars['GithubURI'];
  /** The HTTP URL for this Git object */
  commitUrl: Scalars['GithubURI'];
  /** A list of tree entries. */
  entries?: Maybe<Array<GithubTreeEntry>>;
  id: Scalars['ID'];
  /** The Git object ID */
  oid: Scalars['GithubGitObjectID'];
  /** The Repository the Git object belongs to */
  repository: GithubRepository;
};

/** Represents a Git tree entry. */
export type GithubTreeEntry = {
   __typename?: 'GithubTreeEntry';
  /** Entry file mode. */
  mode: Scalars['Int'];
  /** Entry file name. */
  name: Scalars['String'];
  /** Entry file object. */
  object?: Maybe<GithubGitObject>;
  /** Entry file Git object ID. */
  oid: Scalars['GithubGitObjectID'];
  /** The Repository the tree entry belongs to */
  repository: GithubRepository;
  /** If the TreeEntry is for a directory occupied by a submodule project, this returns the corresponding submodule */
  submodule?: Maybe<GithubSubmodule>;
  /** Entry file type. */
  type: Scalars['String'];
};

/** Autogenerated input type of UnarchiveRepository */
export type GithubUnarchiveRepositoryInput = {
  /** The ID of the repository to unarchive. */
  repositoryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnarchiveRepository */
export type GithubUnarchiveRepositoryPayload = {
   __typename?: 'GithubUnarchiveRepositoryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The repository that was unarchived. */
  repository?: Maybe<GithubRepository>;
};

/** Represents an 'unassigned' event on any assignable object. */
export type GithubUnassignedEvent = GithubNode & {
   __typename?: 'GithubUnassignedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the assignable associated with the event. */
  assignable: GithubAssignable;
  /** Identifies the user or mannequin that was unassigned. */
  assignee?: Maybe<GithubAssignee>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /**
   * Identifies the subject (user) who was unassigned.
   * @deprecated Assignees can now be mannequins. Use the `assignee` field instead. Removal on 2020-01-01 UTC.
   */
  user?: Maybe<GithubUser>;
};

/** Autogenerated input type of UnfollowUser */
export type GithubUnfollowUserInput = {
  /** ID of the user to unfollow. */
  userId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnfollowUser */
export type GithubUnfollowUserPayload = {
   __typename?: 'GithubUnfollowUserPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The user that was unfollowed. */
  user?: Maybe<GithubUser>;
};

/** Represents a type that can be retrieved by a URL. */
export type GithubUniformResourceLocatable = {
  /** The HTML path to this resource. */
  resourcePath: Scalars['GithubURI'];
  /** The URL to this resource. */
  url: Scalars['GithubURI'];
};

/** Represents an unknown signature on a Commit or Tag. */
export type GithubUnknownSignature = GithubGitSignature & {
   __typename?: 'GithubUnknownSignature';
  /** Email used to sign this object. */
  email: Scalars['String'];
  /** True if the signature is valid and verified by GitHub. */
  isValid: Scalars['Boolean'];
  /** Payload for GPG signing object. Raw ODB object without the signature header. */
  payload: Scalars['String'];
  /** ASCII-armored signature header from object. */
  signature: Scalars['String'];
  /** GitHub user corresponding to the email signing this commit. */
  signer?: Maybe<GithubUser>;
  /**
   * The state of this signature. `VALID` if signature is valid and verified by
   * GitHub, otherwise represents reason why signature is considered invalid.
   */
  state: GithubGitSignatureState;
  /** True if the signature was made with GitHub's signing key. */
  wasSignedByGitHub: Scalars['Boolean'];
};

/** Represents an 'unlabeled' event on a given issue or pull request. */
export type GithubUnlabeledEvent = GithubNode & {
   __typename?: 'GithubUnlabeledEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the label associated with the 'unlabeled' event. */
  label: GithubLabel;
  /** Identifies the `Labelable` associated with the event. */
  labelable: GithubLabelable;
};

/** Autogenerated input type of UnlinkRepositoryFromProject */
export type GithubUnlinkRepositoryFromProjectInput = {
  /** The ID of the Project linked to the Repository. */
  projectId: Scalars['ID'];
  /** The ID of the Repository linked to the Project. */
  repositoryId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnlinkRepositoryFromProject */
export type GithubUnlinkRepositoryFromProjectPayload = {
   __typename?: 'GithubUnlinkRepositoryFromProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The linked Project. */
  project?: Maybe<GithubProject>;
  /** The linked Repository. */
  repository?: Maybe<GithubRepository>;
};

/** Represents an 'unlocked' event on a given issue or pull request. */
export type GithubUnlockedEvent = GithubNode & {
   __typename?: 'GithubUnlockedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Object that was unlocked. */
  lockable: GithubLockable;
};

/** Autogenerated input type of UnlockLockable */
export type GithubUnlockLockableInput = {
  /** ID of the issue or pull request to be unlocked. */
  lockableId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnlockLockable */
export type GithubUnlockLockablePayload = {
   __typename?: 'GithubUnlockLockablePayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The item that was unlocked. */
  unlockedRecord?: Maybe<GithubLockable>;
};

/** Represents an 'unmarked_as_duplicate' event on a given issue or pull request. */
export type GithubUnmarkedAsDuplicateEvent = GithubNode & {
   __typename?: 'GithubUnmarkedAsDuplicateEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
};

/** Autogenerated input type of UnmarkIssueAsDuplicate */
export type GithubUnmarkIssueAsDuplicateInput = {
  /** ID of the issue or pull request currently marked as a duplicate. */
  duplicateId: Scalars['ID'];
  /** ID of the issue or pull request currently considered canonical/authoritative/original. */
  canonicalId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnmarkIssueAsDuplicate */
export type GithubUnmarkIssueAsDuplicatePayload = {
   __typename?: 'GithubUnmarkIssueAsDuplicatePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The issue or pull request that was marked as a duplicate. */
  duplicate?: Maybe<GithubIssueOrPullRequest>;
};

/** Represents an 'unpinned' event on a given issue or pull request. */
export type GithubUnpinnedEvent = GithubNode & {
   __typename?: 'GithubUnpinnedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Identifies the issue associated with the event. */
  issue: GithubIssue;
};

/** Autogenerated input type of UnresolveReviewThread */
export type GithubUnresolveReviewThreadInput = {
  /** The ID of the thread to unresolve */
  threadId: Scalars['ID'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UnresolveReviewThread */
export type GithubUnresolveReviewThreadPayload = {
   __typename?: 'GithubUnresolveReviewThreadPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The thread to resolve. */
  thread?: Maybe<GithubPullRequestReviewThread>;
};

/** Represents an 'unsubscribed' event on a given `Subscribable`. */
export type GithubUnsubscribedEvent = GithubNode & {
   __typename?: 'GithubUnsubscribedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** Object referenced by event. */
  subscribable: GithubSubscribable;
};

/** Entities that can be updated. */
export type GithubUpdatable = {
  /** Check if the current viewer can update this object. */
  viewerCanUpdate: Scalars['Boolean'];
};

/** Comments that can be updated. */
export type GithubUpdatableComment = {
  /** Reasons why the current viewer can not update this comment. */
  viewerCannotUpdateReasons: Array<GithubCommentCannotUpdateReason>;
};

/** Autogenerated input type of UpdateBranchProtectionRule */
export type GithubUpdateBranchProtectionRuleInput = {
  /** The global relay id of the branch protection rule to be updated. */
  branchProtectionRuleId: Scalars['ID'];
  /** The glob-like pattern used to determine matching branches. */
  pattern?: Maybe<Scalars['String']>;
  /** Are approving reviews required to update matching branches. */
  requiresApprovingReviews?: Maybe<Scalars['Boolean']>;
  /** Number of approving reviews required to update matching branches. */
  requiredApprovingReviewCount?: Maybe<Scalars['Int']>;
  /** Are commits required to be signed. */
  requiresCommitSignatures?: Maybe<Scalars['Boolean']>;
  /** Can admins overwrite branch protection. */
  isAdminEnforced?: Maybe<Scalars['Boolean']>;
  /** Are status checks required to update matching branches. */
  requiresStatusChecks?: Maybe<Scalars['Boolean']>;
  /** Are branches required to be up to date before merging. */
  requiresStrictStatusChecks?: Maybe<Scalars['Boolean']>;
  /** Are reviews from code owners required to update matching branches. */
  requiresCodeOwnerReviews?: Maybe<Scalars['Boolean']>;
  /** Will new commits pushed to matching branches dismiss pull request review approvals. */
  dismissesStaleReviews?: Maybe<Scalars['Boolean']>;
  /** Is dismissal of pull request reviews restricted. */
  restrictsReviewDismissals?: Maybe<Scalars['Boolean']>;
  /** A list of User or Team IDs allowed to dismiss reviews on pull requests targeting matching branches. */
  reviewDismissalActorIds?: Maybe<Array<Scalars['ID']>>;
  /** Is pushing to matching branches restricted. */
  restrictsPushes?: Maybe<Scalars['Boolean']>;
  /** A list of User, Team or App IDs allowed to push to matching branches. */
  pushActorIds?: Maybe<Array<Scalars['ID']>>;
  /** List of required status check contexts that must pass for commits to be accepted to matching branches. */
  requiredStatusCheckContexts?: Maybe<Array<Scalars['String']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateBranchProtectionRule */
export type GithubUpdateBranchProtectionRulePayload = {
   __typename?: 'GithubUpdateBranchProtectionRulePayload';
  /** The newly created BranchProtectionRule. */
  branchProtectionRule?: Maybe<GithubBranchProtectionRule>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseActionExecutionCapabilitySetting */
export type GithubUpdateEnterpriseActionExecutionCapabilitySettingInput = {
  /** The ID of the enterprise on which to set the members can create repositories setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the action execution capability setting on the enterprise. */
  capability: GithubActionExecutionCapabilitySetting;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseActionExecutionCapabilitySetting */
export type GithubUpdateEnterpriseActionExecutionCapabilitySettingPayload = {
   __typename?: 'GithubUpdateEnterpriseActionExecutionCapabilitySettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated action execution capability setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the action execution capability setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseAdministratorRole */
export type GithubUpdateEnterpriseAdministratorRoleInput = {
  /** The ID of the Enterprise which the admin belongs to. */
  enterpriseId: Scalars['ID'];
  /** The login of a administrator whose role is being changed. */
  login: Scalars['String'];
  /** The new role for the Enterprise administrator. */
  role: GithubEnterpriseAdministratorRole;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseAdministratorRole */
export type GithubUpdateEnterpriseAdministratorRolePayload = {
   __typename?: 'GithubUpdateEnterpriseAdministratorRolePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** A message confirming the result of changing the administrator's role. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseAllowPrivateRepositoryForkingSetting */
export type GithubUpdateEnterpriseAllowPrivateRepositoryForkingSettingInput = {
  /** The ID of the enterprise on which to set the allow private repository forking setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the allow private repository forking setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseAllowPrivateRepositoryForkingSetting */
export type GithubUpdateEnterpriseAllowPrivateRepositoryForkingSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseAllowPrivateRepositoryForkingSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated allow private repository forking setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the allow private repository forking setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseDefaultRepositoryPermissionSetting */
export type GithubUpdateEnterpriseDefaultRepositoryPermissionSettingInput = {
  /** The ID of the enterprise on which to set the default repository permission setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the default repository permission setting on the enterprise. */
  settingValue: GithubEnterpriseDefaultRepositoryPermissionSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseDefaultRepositoryPermissionSetting */
export type GithubUpdateEnterpriseDefaultRepositoryPermissionSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseDefaultRepositoryPermissionSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated default repository permission setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the default repository permission setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanChangeRepositoryVisibilitySetting */
export type GithubUpdateEnterpriseMembersCanChangeRepositoryVisibilitySettingInput = {
  /** The ID of the enterprise on which to set the members can change repository visibility setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can change repository visibility setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanChangeRepositoryVisibilitySetting */
export type GithubUpdateEnterpriseMembersCanChangeRepositoryVisibilitySettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanChangeRepositoryVisibilitySettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can change repository visibility setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can change repository visibility setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanCreateRepositoriesSetting */
export type GithubUpdateEnterpriseMembersCanCreateRepositoriesSettingInput = {
  /** The ID of the enterprise on which to set the members can create repositories setting. */
  enterpriseId: Scalars['ID'];
  /**
   * Value for the members can create repositories setting on the enterprise. This
   * or the granular public/private/internal allowed fields (but not both) must be provided.
   */
  settingValue?: Maybe<GithubEnterpriseMembersCanCreateRepositoriesSettingValue>;
  /** When false, allow member organizations to set their own repository creation member privileges. */
  membersCanCreateRepositoriesPolicyEnabled?: Maybe<Scalars['Boolean']>;
  /** Allow members to create public repositories. Defaults to current value. */
  membersCanCreatePublicRepositories?: Maybe<Scalars['Boolean']>;
  /** Allow members to create private repositories. Defaults to current value. */
  membersCanCreatePrivateRepositories?: Maybe<Scalars['Boolean']>;
  /** Allow members to create internal repositories. Defaults to current value. */
  membersCanCreateInternalRepositories?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanCreateRepositoriesSetting */
export type GithubUpdateEnterpriseMembersCanCreateRepositoriesSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanCreateRepositoriesSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can create repositories setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can create repositories setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanDeleteIssuesSetting */
export type GithubUpdateEnterpriseMembersCanDeleteIssuesSettingInput = {
  /** The ID of the enterprise on which to set the members can delete issues setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can delete issues setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanDeleteIssuesSetting */
export type GithubUpdateEnterpriseMembersCanDeleteIssuesSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanDeleteIssuesSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can delete issues setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can delete issues setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanDeleteRepositoriesSetting */
export type GithubUpdateEnterpriseMembersCanDeleteRepositoriesSettingInput = {
  /** The ID of the enterprise on which to set the members can delete repositories setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can delete repositories setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanDeleteRepositoriesSetting */
export type GithubUpdateEnterpriseMembersCanDeleteRepositoriesSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanDeleteRepositoriesSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can delete repositories setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can delete repositories setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanInviteCollaboratorsSetting */
export type GithubUpdateEnterpriseMembersCanInviteCollaboratorsSettingInput = {
  /** The ID of the enterprise on which to set the members can invite collaborators setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can invite collaborators setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanInviteCollaboratorsSetting */
export type GithubUpdateEnterpriseMembersCanInviteCollaboratorsSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanInviteCollaboratorsSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can invite collaborators setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can invite collaborators setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanMakePurchasesSetting */
export type GithubUpdateEnterpriseMembersCanMakePurchasesSettingInput = {
  /** The ID of the enterprise on which to set the members can make purchases setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can make purchases setting on the enterprise. */
  settingValue: GithubEnterpriseMembersCanMakePurchasesSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanMakePurchasesSetting */
export type GithubUpdateEnterpriseMembersCanMakePurchasesSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanMakePurchasesSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can make purchases setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can make purchases setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanUpdateProtectedBranchesSetting */
export type GithubUpdateEnterpriseMembersCanUpdateProtectedBranchesSettingInput = {
  /** The ID of the enterprise on which to set the members can update protected branches setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can update protected branches setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanUpdateProtectedBranchesSetting */
export type GithubUpdateEnterpriseMembersCanUpdateProtectedBranchesSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanUpdateProtectedBranchesSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can update protected branches setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can update protected branches setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseMembersCanViewDependencyInsightsSetting */
export type GithubUpdateEnterpriseMembersCanViewDependencyInsightsSettingInput = {
  /** The ID of the enterprise on which to set the members can view dependency insights setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the members can view dependency insights setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseMembersCanViewDependencyInsightsSetting */
export type GithubUpdateEnterpriseMembersCanViewDependencyInsightsSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseMembersCanViewDependencyInsightsSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated members can view dependency insights setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the members can view dependency insights setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseOrganizationProjectsSetting */
export type GithubUpdateEnterpriseOrganizationProjectsSettingInput = {
  /** The ID of the enterprise on which to set the organization projects setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the organization projects setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseOrganizationProjectsSetting */
export type GithubUpdateEnterpriseOrganizationProjectsSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseOrganizationProjectsSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated organization projects setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the organization projects setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseProfile */
export type GithubUpdateEnterpriseProfileInput = {
  /** The Enterprise ID to update. */
  enterpriseId: Scalars['ID'];
  /** The name of the enterprise. */
  name?: Maybe<Scalars['String']>;
  /** The description of the enterprise. */
  description?: Maybe<Scalars['String']>;
  /** The URL of the enterprise's website. */
  websiteUrl?: Maybe<Scalars['String']>;
  /** The location of the enterprise. */
  location?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseProfile */
export type GithubUpdateEnterpriseProfilePayload = {
   __typename?: 'GithubUpdateEnterpriseProfilePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated enterprise. */
  enterprise?: Maybe<GithubEnterprise>;
};

/** Autogenerated input type of UpdateEnterpriseRepositoryProjectsSetting */
export type GithubUpdateEnterpriseRepositoryProjectsSettingInput = {
  /** The ID of the enterprise on which to set the repository projects setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the repository projects setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseRepositoryProjectsSetting */
export type GithubUpdateEnterpriseRepositoryProjectsSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseRepositoryProjectsSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated repository projects setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the repository projects setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseTeamDiscussionsSetting */
export type GithubUpdateEnterpriseTeamDiscussionsSettingInput = {
  /** The ID of the enterprise on which to set the team discussions setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the team discussions setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledDisabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseTeamDiscussionsSetting */
export type GithubUpdateEnterpriseTeamDiscussionsSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseTeamDiscussionsSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated team discussions setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the team discussions setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateEnterpriseTwoFactorAuthenticationRequiredSetting */
export type GithubUpdateEnterpriseTwoFactorAuthenticationRequiredSettingInput = {
  /** The ID of the enterprise on which to set the two factor authentication required setting. */
  enterpriseId: Scalars['ID'];
  /** The value for the two factor authentication required setting on the enterprise. */
  settingValue: GithubEnterpriseEnabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateEnterpriseTwoFactorAuthenticationRequiredSetting */
export type GithubUpdateEnterpriseTwoFactorAuthenticationRequiredSettingPayload = {
   __typename?: 'GithubUpdateEnterpriseTwoFactorAuthenticationRequiredSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The enterprise with the updated two factor authentication required setting. */
  enterprise?: Maybe<GithubEnterprise>;
  /** A message confirming the result of updating the two factor authentication required setting. */
  message?: Maybe<Scalars['String']>;
};

/** Autogenerated input type of UpdateIpAllowListEnabledSetting */
export type GithubUpdateIpAllowListEnabledSettingInput = {
  /** The ID of the owner on which to set the IP allow list enabled setting. */
  ownerId: Scalars['ID'];
  /** The value for the IP allow list enabled setting. */
  settingValue: GithubIpAllowListEnabledSettingValue;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateIpAllowListEnabledSetting */
export type GithubUpdateIpAllowListEnabledSettingPayload = {
   __typename?: 'GithubUpdateIpAllowListEnabledSettingPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The IP allow list owner on which the setting was updated. */
  owner?: Maybe<GithubIpAllowListOwner>;
};

/** Autogenerated input type of UpdateIpAllowListEntry */
export type GithubUpdateIpAllowListEntryInput = {
  /** The ID of the IP allow list entry to update. */
  ipAllowListEntryId: Scalars['ID'];
  /** An IP address or range of addresses in CIDR notation. */
  allowListValue: Scalars['String'];
  /** An optional name for the IP allow list entry. */
  name?: Maybe<Scalars['String']>;
  /** Whether the IP allow list entry is active when an IP allow list is enabled. */
  isActive: Scalars['Boolean'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateIpAllowListEntry */
export type GithubUpdateIpAllowListEntryPayload = {
   __typename?: 'GithubUpdateIpAllowListEntryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The IP allow list entry that was updated. */
  ipAllowListEntry?: Maybe<GithubIpAllowListEntry>;
};

/** Autogenerated input type of UpdateIssueComment */
export type GithubUpdateIssueCommentInput = {
  /** The ID of the IssueComment to modify. */
  id: Scalars['ID'];
  /** The updated text of the comment. */
  body: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateIssueComment */
export type GithubUpdateIssueCommentPayload = {
   __typename?: 'GithubUpdateIssueCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated comment. */
  issueComment?: Maybe<GithubIssueComment>;
};

/** Autogenerated input type of UpdateIssue */
export type GithubUpdateIssueInput = {
  /** The ID of the Issue to modify. */
  id: Scalars['ID'];
  /** The title for the issue. */
  title?: Maybe<Scalars['String']>;
  /** The body for the issue description. */
  body?: Maybe<Scalars['String']>;
  /** An array of Node IDs of users for this issue. */
  assigneeIds?: Maybe<Array<Scalars['ID']>>;
  /** The Node ID of the milestone for this issue. */
  milestoneId?: Maybe<Scalars['ID']>;
  /** An array of Node IDs of labels for this issue. */
  labelIds?: Maybe<Array<Scalars['ID']>>;
  /** The desired issue state. */
  state?: Maybe<GithubIssueState>;
  /** An array of Node IDs for projects associated with this issue. */
  projectIds?: Maybe<Array<Scalars['ID']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateIssue */
export type GithubUpdateIssuePayload = {
   __typename?: 'GithubUpdateIssuePayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The issue. */
  issue?: Maybe<GithubIssue>;
};

/** Autogenerated input type of UpdateProjectCard */
export type GithubUpdateProjectCardInput = {
  /** The ProjectCard ID to update. */
  projectCardId: Scalars['ID'];
  /** Whether or not the ProjectCard should be archived */
  isArchived?: Maybe<Scalars['Boolean']>;
  /** The note of ProjectCard. */
  note?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateProjectCard */
export type GithubUpdateProjectCardPayload = {
   __typename?: 'GithubUpdateProjectCardPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated ProjectCard. */
  projectCard?: Maybe<GithubProjectCard>;
};

/** Autogenerated input type of UpdateProjectColumn */
export type GithubUpdateProjectColumnInput = {
  /** The ProjectColumn ID to update. */
  projectColumnId: Scalars['ID'];
  /** The name of project column. */
  name: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateProjectColumn */
export type GithubUpdateProjectColumnPayload = {
   __typename?: 'GithubUpdateProjectColumnPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated project column. */
  projectColumn?: Maybe<GithubProjectColumn>;
};

/** Autogenerated input type of UpdateProject */
export type GithubUpdateProjectInput = {
  /** The Project ID to update. */
  projectId: Scalars['ID'];
  /** The name of project. */
  name?: Maybe<Scalars['String']>;
  /** The description of project. */
  body?: Maybe<Scalars['String']>;
  /** Whether the project is open or closed. */
  state?: Maybe<GithubProjectState>;
  /** Whether the project is public or not. */
  public?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateProject */
export type GithubUpdateProjectPayload = {
   __typename?: 'GithubUpdateProjectPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated project. */
  project?: Maybe<GithubProject>;
};

/** Autogenerated input type of UpdatePullRequest */
export type GithubUpdatePullRequestInput = {
  /** The Node ID of the pull request. */
  pullRequestId: Scalars['ID'];
  /**
   * The name of the branch you want your changes pulled into. This should be an existing branch
   * on the current repository.
   */
  baseRefName?: Maybe<Scalars['String']>;
  /** The title of the pull request. */
  title?: Maybe<Scalars['String']>;
  /** The contents of the pull request. */
  body?: Maybe<Scalars['String']>;
  /** The target state of the pull request. */
  state?: Maybe<GithubPullRequestUpdateState>;
  /** Indicates whether maintainers can modify the pull request. */
  maintainerCanModify?: Maybe<Scalars['Boolean']>;
  /** An array of Node IDs of users for this pull request. */
  assigneeIds?: Maybe<Array<Scalars['ID']>>;
  /** The Node ID of the milestone for this pull request. */
  milestoneId?: Maybe<Scalars['ID']>;
  /** An array of Node IDs of labels for this pull request. */
  labelIds?: Maybe<Array<Scalars['ID']>>;
  /** An array of Node IDs for projects associated with this pull request. */
  projectIds?: Maybe<Array<Scalars['ID']>>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdatePullRequest */
export type GithubUpdatePullRequestPayload = {
   __typename?: 'GithubUpdatePullRequestPayload';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated pull request. */
  pullRequest?: Maybe<GithubPullRequest>;
};

/** Autogenerated input type of UpdatePullRequestReviewComment */
export type GithubUpdatePullRequestReviewCommentInput = {
  /** The Node ID of the comment to modify. */
  pullRequestReviewCommentId: Scalars['ID'];
  /** The text of the comment. */
  body: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdatePullRequestReviewComment */
export type GithubUpdatePullRequestReviewCommentPayload = {
   __typename?: 'GithubUpdatePullRequestReviewCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated comment. */
  pullRequestReviewComment?: Maybe<GithubPullRequestReviewComment>;
};

/** Autogenerated input type of UpdatePullRequestReview */
export type GithubUpdatePullRequestReviewInput = {
  /** The Node ID of the pull request review to modify. */
  pullRequestReviewId: Scalars['ID'];
  /** The contents of the pull request review body. */
  body: Scalars['String'];
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdatePullRequestReview */
export type GithubUpdatePullRequestReviewPayload = {
   __typename?: 'GithubUpdatePullRequestReviewPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated pull request review. */
  pullRequestReview?: Maybe<GithubPullRequestReview>;
};

/** Autogenerated input type of UpdateRef */
export type GithubUpdateRefInput = {
  /** The Node ID of the Ref to be updated. */
  refId: Scalars['ID'];
  /** The GitObjectID that the Ref shall be updated to target. */
  oid: Scalars['GithubGitObjectID'];
  /** Permit updates of branch Refs that are not fast-forwards? */
  force?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateRef */
export type GithubUpdateRefPayload = {
   __typename?: 'GithubUpdateRefPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated Ref. */
  ref?: Maybe<GithubRef>;
};

/** Autogenerated input type of UpdateRepository */
export type GithubUpdateRepositoryInput = {
  /** The ID of the repository to update. */
  repositoryId: Scalars['ID'];
  /** The new name of the repository. */
  name?: Maybe<Scalars['String']>;
  /** A new description for the repository. Pass an empty string to erase the existing description. */
  description?: Maybe<Scalars['String']>;
  /**
   * Whether this repository should be marked as a template such that anyone who
   * can access it can create new repositories with the same files and directory structure.
   */
  template?: Maybe<Scalars['Boolean']>;
  /** The URL for a web page about this repository. Pass an empty string to erase the existing URL. */
  homepageUrl?: Maybe<Scalars['GithubURI']>;
  /** Indicates if the repository should have the wiki feature enabled. */
  hasWikiEnabled?: Maybe<Scalars['Boolean']>;
  /** Indicates if the repository should have the issues feature enabled. */
  hasIssuesEnabled?: Maybe<Scalars['Boolean']>;
  /** Indicates if the repository should have the project boards feature enabled. */
  hasProjectsEnabled?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateRepository */
export type GithubUpdateRepositoryPayload = {
   __typename?: 'GithubUpdateRepositoryPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated repository. */
  repository?: Maybe<GithubRepository>;
};

/** Autogenerated input type of UpdateSubscription */
export type GithubUpdateSubscriptionInput = {
  /** The Node ID of the subscribable object to modify. */
  subscribableId: Scalars['ID'];
  /** The new state of the subscription. */
  state: GithubSubscriptionState;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateSubscription */
export type GithubUpdateSubscriptionPayload = {
   __typename?: 'GithubUpdateSubscriptionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The input subscribable entity. */
  subscribable?: Maybe<GithubSubscribable>;
};

/** Autogenerated input type of UpdateTeamDiscussionComment */
export type GithubUpdateTeamDiscussionCommentInput = {
  /** The ID of the comment to modify. */
  id: Scalars['ID'];
  /** The updated text of the comment. */
  body: Scalars['String'];
  /** The current version of the body content. */
  bodyVersion?: Maybe<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateTeamDiscussionComment */
export type GithubUpdateTeamDiscussionCommentPayload = {
   __typename?: 'GithubUpdateTeamDiscussionCommentPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated comment. */
  teamDiscussionComment?: Maybe<GithubTeamDiscussionComment>;
};

/** Autogenerated input type of UpdateTeamDiscussion */
export type GithubUpdateTeamDiscussionInput = {
  /** The Node ID of the discussion to modify. */
  id: Scalars['ID'];
  /** The updated title of the discussion. */
  title?: Maybe<Scalars['String']>;
  /** The updated text of the discussion. */
  body?: Maybe<Scalars['String']>;
  /**
   * The current version of the body content. If provided, this update operation
   * will be rejected if the given version does not match the latest version on the server.
   */
  bodyVersion?: Maybe<Scalars['String']>;
  /** If provided, sets the pinned state of the updated discussion. */
  pinned?: Maybe<Scalars['Boolean']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateTeamDiscussion */
export type GithubUpdateTeamDiscussionPayload = {
   __typename?: 'GithubUpdateTeamDiscussionPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** The updated discussion. */
  teamDiscussion?: Maybe<GithubTeamDiscussion>;
};

/** Autogenerated input type of UpdateTopics */
export type GithubUpdateTopicsInput = {
  /** The Node ID of the repository. */
  repositoryId: Scalars['ID'];
  /** An array of topic names. */
  topicNames: Array<Scalars['String']>;
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
};

/** Autogenerated return type of UpdateTopics */
export type GithubUpdateTopicsPayload = {
   __typename?: 'GithubUpdateTopicsPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']>;
  /** Names of the provided topics that are not valid. */
  invalidTopicNames?: Maybe<Array<Scalars['String']>>;
  /** The updated repository. */
  repository?: Maybe<GithubRepository>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUser = GithubNode & GithubActor & GithubRegistryPackageOwner & GithubRegistryPackageSearch & GithubProjectOwner & GithubRepositoryOwner & GithubUniformResourceLocatable & GithubProfileOwner & GithubSponsorable & {
   __typename?: 'GithubUser';
  /** Determine if this repository owner has any items that can be pinned to their profile. */
  anyPinnableItems: Scalars['Boolean'];
  /** A URL pointing to the user's public avatar. */
  avatarUrl: Scalars['GithubURI'];
  /** The user's public profile bio. */
  bio?: Maybe<Scalars['String']>;
  /** The user's public profile bio as HTML. */
  bioHTML: Scalars['GithubHTML'];
  /** A list of commit comments made by this user. */
  commitComments: GithubCommitCommentConnection;
  /** The user's public profile company. */
  company?: Maybe<Scalars['String']>;
  /** The user's public profile company as HTML. */
  companyHTML: Scalars['GithubHTML'];
  /** The collection of contributions this user has made to different repositories. */
  contributionsCollection: GithubContributionsCollection;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the primary key from the database. */
  databaseId?: Maybe<Scalars['Int']>;
  /** The user's publicly visible profile email. */
  email: Scalars['String'];
  /** A list of users the given user is followed by. */
  followers: GithubFollowerConnection;
  /** A list of users the given user is following. */
  following: GithubFollowingConnection;
  /** Find gist by repo name. */
  gist?: Maybe<GithubGist>;
  /** A list of gist comments made by this user. */
  gistComments: GithubGistCommentConnection;
  /** A list of the Gists the user has created. */
  gists: GithubGistConnection;
  /** The hovercard information for this user in a given context */
  hovercard: GithubHovercard;
  id: Scalars['ID'];
  /** Whether or not this user is a participant in the GitHub Security Bug Bounty. */
  isBountyHunter: Scalars['Boolean'];
  /** Whether or not this user is a participant in the GitHub Campus Experts Program. */
  isCampusExpert: Scalars['Boolean'];
  /** Whether or not this user is a GitHub Developer Program member. */
  isDeveloperProgramMember: Scalars['Boolean'];
  /** Whether or not this user is a GitHub employee. */
  isEmployee: Scalars['Boolean'];
  /** Whether or not the user has marked themselves as for hire. */
  isHireable: Scalars['Boolean'];
  /** Whether or not this user is a site administrator. */
  isSiteAdmin: Scalars['Boolean'];
  /** Whether or not this user is the viewing user. */
  isViewer: Scalars['Boolean'];
  /** A list of issue comments made by this user. */
  issueComments: GithubIssueCommentConnection;
  /** A list of issues associated with this user. */
  issues: GithubIssueConnection;
  /**
   * Showcases a selection of repositories and gists that the profile owner has
   * either curated or that have been selected automatically based on popularity.
   */
  itemShowcase: GithubProfileItemShowcase;
  /** The user's public profile location. */
  location?: Maybe<Scalars['String']>;
  /** The username used to login. */
  login: Scalars['String'];
  /** The user's public profile name. */
  name?: Maybe<Scalars['String']>;
  /** Find an organization by its login that the user belongs to. */
  organization?: Maybe<GithubOrganization>;
  /** A list of organizations the user belongs to. */
  organizations: GithubOrganizationConnection;
  /** A list of repositories and gists this profile owner can pin to their profile. */
  pinnableItems: GithubPinnableItemConnection;
  /** A list of repositories and gists this profile owner has pinned to their profile */
  pinnedItems: GithubPinnableItemConnection;
  /** Returns how many more items this profile owner can pin to their profile. */
  pinnedItemsRemaining: Scalars['Int'];
  /**
   * A list of repositories this user has pinned to their profile
   * @deprecated pinnedRepositories will be removed Use ProfileOwner.pinnedItems instead. Removal on 2019-10-01 UTC.
   */
  pinnedRepositories: GithubRepositoryConnection;
  /** Find project by number. */
  project?: Maybe<GithubProject>;
  /** A list of projects under the owner. */
  projects: GithubProjectConnection;
  /** The HTTP path listing user's projects */
  projectsResourcePath: Scalars['GithubURI'];
  /** The HTTP URL listing user's projects */
  projectsUrl: Scalars['GithubURI'];
  /** A list of public keys associated with this user. */
  publicKeys: GithubPublicKeyConnection;
  /** A list of pull requests associated with this user. */
  pullRequests: GithubPullRequestConnection;
  /**
   * A list of registry packages under the owner.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageOwner` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackages: GithubRegistryPackageConnection;
  /**
   * A list of registry packages for a particular search query.
   * @deprecated Renaming GitHub Packages fields and objects. Use the `PackageSearch` object instead. Removal on 2020-04-01 UTC.
   */
  registryPackagesForQuery: GithubRegistryPackageConnection;
  /** A list of repositories that the user owns. */
  repositories: GithubRepositoryConnection;
  /** A list of repositories that the user recently contributed to. */
  repositoriesContributedTo: GithubRepositoryConnection;
  /** Find Repository. */
  repository?: Maybe<GithubRepository>;
  /** The HTTP path for this user */
  resourcePath: Scalars['GithubURI'];
  /** Replies this user has saved */
  savedReplies?: Maybe<GithubSavedReplyConnection>;
  /** The GitHub Sponsors listing for this user. */
  sponsorsListing?: Maybe<GithubSponsorsListing>;
  /** This object's sponsorships as the maintainer. */
  sponsorshipsAsMaintainer: GithubSponsorshipConnection;
  /** This object's sponsorships as the sponsor. */
  sponsorshipsAsSponsor: GithubSponsorshipConnection;
  /** Repositories the user has starred. */
  starredRepositories: GithubStarredRepositoryConnection;
  /** The user's description of what they're currently doing. */
  status?: Maybe<GithubUserStatus>;
  /** Repositories the user has contributed to, ordered by contribution rank, plus repositories the user has created */
  topRepositories: GithubRepositoryConnection;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The HTTP URL for this user */
  url: Scalars['GithubURI'];
  /** Can the viewer pin repositories and gists to the profile? */
  viewerCanChangePinnedItems: Scalars['Boolean'];
  /** Can the current viewer create new projects on this owner. */
  viewerCanCreateProjects: Scalars['Boolean'];
  /** Whether or not the viewer is able to follow the user. */
  viewerCanFollow: Scalars['Boolean'];
  /** Whether or not this user is followed by the viewer. */
  viewerIsFollowing: Scalars['Boolean'];
  /** A list of repositories the given user is watching. */
  watching: GithubRepositoryConnection;
  /** A URL pointing to the user's public website/blog. */
  websiteUrl?: Maybe<Scalars['GithubURI']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserAnyPinnableItemsArgs = {
  type?: Maybe<GithubPinnableItemType>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserAvatarUrlArgs = {
  size?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserCommitCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserContributionsCollectionArgs = {
  organizationID?: Maybe<Scalars['ID']>;
  from?: Maybe<Scalars['GithubDateTime']>;
  to?: Maybe<Scalars['GithubDateTime']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserFollowersArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserFollowingArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserGistArgs = {
  name: Scalars['String'];
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserGistCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserGistsArgs = {
  privacy?: Maybe<GithubGistPrivacy>;
  orderBy?: Maybe<GithubGistOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserHovercardArgs = {
  primarySubjectId?: Maybe<Scalars['ID']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserIssueCommentsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserIssuesArgs = {
  orderBy?: Maybe<GithubIssueOrder>;
  labels?: Maybe<Array<Scalars['String']>>;
  states?: Maybe<Array<GithubIssueState>>;
  filterBy?: Maybe<GithubIssueFilters>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserOrganizationArgs = {
  login: Scalars['String'];
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserOrganizationsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserPinnableItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserPinnedItemsArgs = {
  types?: Maybe<Array<GithubPinnableItemType>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserPinnedRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserProjectArgs = {
  number: Scalars['Int'];
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserProjectsArgs = {
  orderBy?: Maybe<GithubProjectOrder>;
  search?: Maybe<Scalars['String']>;
  states?: Maybe<Array<GithubProjectState>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserPublicKeysArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserPullRequestsArgs = {
  states?: Maybe<Array<GithubPullRequestState>>;
  labels?: Maybe<Array<Scalars['String']>>;
  headRefName?: Maybe<Scalars['String']>;
  baseRefName?: Maybe<Scalars['String']>;
  orderBy?: Maybe<GithubIssueOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserRegistryPackagesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  names?: Maybe<Array<Maybe<Scalars['String']>>>;
  repositoryId?: Maybe<Scalars['ID']>;
  packageType?: Maybe<GithubRegistryPackageType>;
  registryPackageType?: Maybe<Scalars['String']>;
  publicOnly?: Maybe<Scalars['Boolean']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserRegistryPackagesForQueryArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query?: Maybe<Scalars['String']>;
  packageType?: Maybe<GithubRegistryPackageType>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserRepositoriesArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  isFork?: Maybe<Scalars['Boolean']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserRepositoriesContributedToArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  isLocked?: Maybe<Scalars['Boolean']>;
  includeUserRepositories?: Maybe<Scalars['Boolean']>;
  contributionTypes?: Maybe<Array<Maybe<GithubRepositoryContributionType>>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserRepositoryArgs = {
  name: Scalars['String'];
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserSavedRepliesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubSavedReplyOrder>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserSponsorshipsAsMaintainerArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  includePrivate?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserSponsorshipsAsSponsorArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<GithubSponsorshipOrder>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserStarredRepositoriesArgs = {
  ownedByViewer?: Maybe<Scalars['Boolean']>;
  orderBy?: Maybe<GithubStarOrder>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserTopRepositoriesArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  orderBy: GithubRepositoryOrder;
  since?: Maybe<Scalars['GithubDateTime']>;
};


/** A user is an individual's account on GitHub that owns repositories and can make new content. */
export type GithubUserWatchingArgs = {
  privacy?: Maybe<GithubRepositoryPrivacy>;
  orderBy?: Maybe<GithubRepositoryOrder>;
  affiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  ownerAffiliations?: Maybe<Array<Maybe<GithubRepositoryAffiliation>>>;
  isLocked?: Maybe<Scalars['Boolean']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};

/** The possible durations that a user can be blocked for. */
export enum GithubUserBlockDuration {
  /** The user was blocked for 1 day */
  OneDay = 'ONE_DAY',
  /** The user was blocked for 3 days */
  ThreeDays = 'THREE_DAYS',
  /** The user was blocked for 7 days */
  OneWeek = 'ONE_WEEK',
  /** The user was blocked for 30 days */
  OneMonth = 'ONE_MONTH',
  /** The user was blocked permanently */
  Permanent = 'PERMANENT'
}

/** Represents a 'user_blocked' event on a given user. */
export type GithubUserBlockedEvent = GithubNode & {
   __typename?: 'GithubUserBlockedEvent';
  /** Identifies the actor who performed the event. */
  actor?: Maybe<GithubActor>;
  /** Number of days that the user was blocked for. */
  blockDuration: GithubUserBlockDuration;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  id: Scalars['ID'];
  /** The user who was blocked. */
  subject?: Maybe<GithubUser>;
};

/** The connection type for User. */
export type GithubUserConnection = {
   __typename?: 'GithubUserConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubUserEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUser>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edit on user content */
export type GithubUserContentEdit = GithubNode & {
   __typename?: 'GithubUserContentEdit';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** Identifies the date and time when the object was deleted. */
  deletedAt?: Maybe<Scalars['GithubDateTime']>;
  /** The actor who deleted this content */
  deletedBy?: Maybe<GithubActor>;
  /** A summary of the changes for this edit */
  diff?: Maybe<Scalars['String']>;
  /** When this content was edited */
  editedAt: Scalars['GithubDateTime'];
  /** The actor who edited this content */
  editor?: Maybe<GithubActor>;
  id: Scalars['ID'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
};

/** A list of edits to content. */
export type GithubUserContentEditConnection = {
   __typename?: 'GithubUserContentEditConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubUserContentEditEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUserContentEdit>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubUserContentEditEdge = {
   __typename?: 'GithubUserContentEditEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUserContentEdit>;
};

/** Represents a user. */
export type GithubUserEdge = {
   __typename?: 'GithubUserEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUser>;
};

/** The user's description of what they're currently doing. */
export type GithubUserStatus = GithubNode & {
   __typename?: 'GithubUserStatus';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['GithubDateTime'];
  /** An emoji summarizing the user's status. */
  emoji?: Maybe<Scalars['String']>;
  /** The status emoji as HTML. */
  emojiHTML?: Maybe<Scalars['GithubHTML']>;
  /** If set, the status will not be shown after this date. */
  expiresAt?: Maybe<Scalars['GithubDateTime']>;
  /** ID of the object. */
  id: Scalars['ID'];
  /** Whether this status indicates the user is not fully available on GitHub. */
  indicatesLimitedAvailability: Scalars['Boolean'];
  /** A brief message describing what the user is doing. */
  message?: Maybe<Scalars['String']>;
  /** The organization whose members can see this status. If null, this status is publicly visible. */
  organization?: Maybe<GithubOrganization>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['GithubDateTime'];
  /** The user who has this status. */
  user: GithubUser;
};

/** The connection type for UserStatus. */
export type GithubUserStatusConnection = {
   __typename?: 'GithubUserStatusConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<GithubUserStatusEdge>>>;
  /** A list of nodes. */
  nodes?: Maybe<Array<Maybe<GithubUserStatus>>>;
  /** Information to aid in pagination. */
  pageInfo: GithubPageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type GithubUserStatusEdge = {
   __typename?: 'GithubUserStatusEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String'];
  /** The item at the end of the edge. */
  node?: Maybe<GithubUserStatus>;
};

/** Ordering options for user status connections. */
export type GithubUserStatusOrder = {
  /** The field to order user statuses by. */
  field: GithubUserStatusOrderField;
  /** The ordering direction. */
  direction: GithubOrderDirection;
};

/** Properties by which user status connections can be ordered. */
export enum GithubUserStatusOrderField {
  /** Order user statuses by when they were updated. */
  UpdatedAt = 'UPDATED_AT'
}

/** A hovercard context with a message describing how the viewer is related. */
export type GithubViewerHovercardContext = GithubHovercardContext & {
   __typename?: 'GithubViewerHovercardContext';
  /** A string describing this context */
  message: Scalars['String'];
  /** An octicon to accompany this context */
  octicon: Scalars['String'];
  /** Identifies the user who is related to this context. */
  viewer: GithubUser;
};


/** The root query for implementing GraphQL mutations. */
export type Mutation = {
   __typename?: 'Mutation';
  /** Creates a single `City`. */
  createCity?: Maybe<GeoCreateCityPayload>;
  /** Creates a single `Country`. */
  createCountry?: Maybe<GeoCreateCountryPayload>;
  /** Creates a single `Countrylanguage`. */
  createCountrylanguage?: Maybe<GeoCreateCountrylanguagePayload>;
  /** Updates a single `City` using its globally unique id and a patch. */
  updateCity?: Maybe<GeoUpdateCityPayload>;
  /** Updates a single `City` using a unique key and a patch. */
  updateCityById?: Maybe<GeoUpdateCityPayload>;
  /** Updates a single `Country` using its globally unique id and a patch. */
  updateCountry?: Maybe<GeoUpdateCountryPayload>;
  /** Updates a single `Country` using a unique key and a patch. */
  updateCountryByCode?: Maybe<GeoUpdateCountryPayload>;
  /** Updates a single `Countrylanguage` using its globally unique id and a patch. */
  updateCountrylanguage?: Maybe<GeoUpdateCountrylanguagePayload>;
  /** Updates a single `Countrylanguage` using a unique key and a patch. */
  updateCountrylanguageByCountrycodeAndLanguage?: Maybe<GeoUpdateCountrylanguagePayload>;
  /** Deletes a single `City` using its globally unique id. */
  deleteCity?: Maybe<GeoDeleteCityPayload>;
  /** Deletes a single `City` using a unique key. */
  deleteCityById?: Maybe<GeoDeleteCityPayload>;
  /** Deletes a single `Country` using its globally unique id. */
  deleteCountry?: Maybe<GeoDeleteCountryPayload>;
  /** Deletes a single `Country` using a unique key. */
  deleteCountryByCode?: Maybe<GeoDeleteCountryPayload>;
  /** Deletes a single `Countrylanguage` using its globally unique id. */
  deleteCountrylanguage?: Maybe<GeoDeleteCountrylanguagePayload>;
  /** Deletes a single `Countrylanguage` using a unique key. */
  deleteCountrylanguageByCountrycodeAndLanguage?: Maybe<GeoDeleteCountrylanguagePayload>;
  /** Accepts a pending invitation for a user to become an administrator of an enterprise. */
  GithubacceptEnterpriseAdministratorInvitation?: Maybe<GithubAcceptEnterpriseAdministratorInvitationPayload>;
  /** Applies a suggested topic to the repository. */
  GithubacceptTopicSuggestion?: Maybe<GithubAcceptTopicSuggestionPayload>;
  /** Adds assignees to an assignable object. */
  GithubaddAssigneesToAssignable?: Maybe<GithubAddAssigneesToAssignablePayload>;
  /** Adds a comment to an Issue or Pull Request. */
  GithubaddComment?: Maybe<GithubAddCommentPayload>;
  /** Adds labels to a labelable object. */
  GithubaddLabelsToLabelable?: Maybe<GithubAddLabelsToLabelablePayload>;
  /** Adds a card to a ProjectColumn. Either `contentId` or `note` must be provided but **not** both. */
  GithubaddProjectCard?: Maybe<GithubAddProjectCardPayload>;
  /** Adds a column to a Project. */
  GithubaddProjectColumn?: Maybe<GithubAddProjectColumnPayload>;
  /** Adds a review to a Pull Request. */
  GithubaddPullRequestReview?: Maybe<GithubAddPullRequestReviewPayload>;
  /** Adds a comment to a review. */
  GithubaddPullRequestReviewComment?: Maybe<GithubAddPullRequestReviewCommentPayload>;
  /** Adds a reaction to a subject. */
  GithubaddReaction?: Maybe<GithubAddReactionPayload>;
  /** Adds a star to a Starrable. */
  GithubaddStar?: Maybe<GithubAddStarPayload>;
  /** Marks a repository as archived. */
  GithubarchiveRepository?: Maybe<GithubArchiveRepositoryPayload>;
  /** Cancels a pending invitation for an administrator to join an enterprise. */
  GithubcancelEnterpriseAdminInvitation?: Maybe<GithubCancelEnterpriseAdminInvitationPayload>;
  /** Update your status on GitHub. */
  GithubchangeUserStatus?: Maybe<GithubChangeUserStatusPayload>;
  /** Clears all labels from a labelable object. */
  GithubclearLabelsFromLabelable?: Maybe<GithubClearLabelsFromLabelablePayload>;
  /** Creates a new project by cloning configuration from an existing project. */
  GithubcloneProject?: Maybe<GithubCloneProjectPayload>;
  /** Create a new repository with the same files and directory structure as a template repository. */
  GithubcloneTemplateRepository?: Maybe<GithubCloneTemplateRepositoryPayload>;
  /** Close an issue. */
  GithubcloseIssue?: Maybe<GithubCloseIssuePayload>;
  /** Close a pull request. */
  GithubclosePullRequest?: Maybe<GithubClosePullRequestPayload>;
  /** Convert a project note card to one associated with a newly created issue. */
  GithubconvertProjectCardNoteToIssue?: Maybe<GithubConvertProjectCardNoteToIssuePayload>;
  /** Create a new branch protection rule */
  GithubcreateBranchProtectionRule?: Maybe<GithubCreateBranchProtectionRulePayload>;
  /** Creates an organization as part of an enterprise account. */
  GithubcreateEnterpriseOrganization?: Maybe<GithubCreateEnterpriseOrganizationPayload>;
  /** Creates a new IP allow list entry. */
  GithubcreateIpAllowListEntry?: Maybe<GithubCreateIpAllowListEntryPayload>;
  /** Creates a new issue. */
  GithubcreateIssue?: Maybe<GithubCreateIssuePayload>;
  /** Creates a new project. */
  GithubcreateProject?: Maybe<GithubCreateProjectPayload>;
  /** Create a new pull request */
  GithubcreatePullRequest?: Maybe<GithubCreatePullRequestPayload>;
  /** Create a new Git Ref. */
  GithubcreateRef?: Maybe<GithubCreateRefPayload>;
  /** Create a new repository. */
  GithubcreateRepository?: Maybe<GithubCreateRepositoryPayload>;
  /** Creates a new team discussion. */
  GithubcreateTeamDiscussion?: Maybe<GithubCreateTeamDiscussionPayload>;
  /** Creates a new team discussion comment. */
  GithubcreateTeamDiscussionComment?: Maybe<GithubCreateTeamDiscussionCommentPayload>;
  /** Rejects a suggested topic for the repository. */
  GithubdeclineTopicSuggestion?: Maybe<GithubDeclineTopicSuggestionPayload>;
  /** Delete a branch protection rule */
  GithubdeleteBranchProtectionRule?: Maybe<GithubDeleteBranchProtectionRulePayload>;
  /** Deletes a deployment. */
  GithubdeleteDeployment?: Maybe<GithubDeleteDeploymentPayload>;
  /** Deletes an IP allow list entry. */
  GithubdeleteIpAllowListEntry?: Maybe<GithubDeleteIpAllowListEntryPayload>;
  /** Deletes an Issue object. */
  GithubdeleteIssue?: Maybe<GithubDeleteIssuePayload>;
  /** Deletes an IssueComment object. */
  GithubdeleteIssueComment?: Maybe<GithubDeleteIssueCommentPayload>;
  /** Deletes a project. */
  GithubdeleteProject?: Maybe<GithubDeleteProjectPayload>;
  /** Deletes a project card. */
  GithubdeleteProjectCard?: Maybe<GithubDeleteProjectCardPayload>;
  /** Deletes a project column. */
  GithubdeleteProjectColumn?: Maybe<GithubDeleteProjectColumnPayload>;
  /** Deletes a pull request review. */
  GithubdeletePullRequestReview?: Maybe<GithubDeletePullRequestReviewPayload>;
  /** Deletes a pull request review comment. */
  GithubdeletePullRequestReviewComment?: Maybe<GithubDeletePullRequestReviewCommentPayload>;
  /** Delete a Git Ref. */
  GithubdeleteRef?: Maybe<GithubDeleteRefPayload>;
  /** Deletes a team discussion. */
  GithubdeleteTeamDiscussion?: Maybe<GithubDeleteTeamDiscussionPayload>;
  /** Deletes a team discussion comment. */
  GithubdeleteTeamDiscussionComment?: Maybe<GithubDeleteTeamDiscussionCommentPayload>;
  /** Dismisses an approved or rejected pull request review. */
  GithubdismissPullRequestReview?: Maybe<GithubDismissPullRequestReviewPayload>;
  /** Follow a user. */
  GithubfollowUser?: Maybe<GithubFollowUserPayload>;
  /** Invite someone to become an administrator of the enterprise. */
  GithubinviteEnterpriseAdmin?: Maybe<GithubInviteEnterpriseAdminPayload>;
  /** Creates a repository link for a project. */
  GithublinkRepositoryToProject?: Maybe<GithubLinkRepositoryToProjectPayload>;
  /** Lock a lockable object */
  GithublockLockable?: Maybe<GithubLockLockablePayload>;
  /** Marks a pull request ready for review. */
  GithubmarkPullRequestReadyForReview?: Maybe<GithubMarkPullRequestReadyForReviewPayload>;
  /** Merge a head into a branch. */
  GithubmergeBranch?: Maybe<GithubMergeBranchPayload>;
  /** Merge a pull request. */
  GithubmergePullRequest?: Maybe<GithubMergePullRequestPayload>;
  /** Moves a project card to another place. */
  GithubmoveProjectCard?: Maybe<GithubMoveProjectCardPayload>;
  /** Moves a project column to another place. */
  GithubmoveProjectColumn?: Maybe<GithubMoveProjectColumnPayload>;
  /** Regenerates the identity provider recovery codes for an enterprise */
  GithubregenerateEnterpriseIdentityProviderRecoveryCodes?: Maybe<GithubRegenerateEnterpriseIdentityProviderRecoveryCodesPayload>;
  /** Removes assignees from an assignable object. */
  GithubremoveAssigneesFromAssignable?: Maybe<GithubRemoveAssigneesFromAssignablePayload>;
  /** Removes an administrator from the enterprise. */
  GithubremoveEnterpriseAdmin?: Maybe<GithubRemoveEnterpriseAdminPayload>;
  /** Removes the identity provider from an enterprise */
  GithubremoveEnterpriseIdentityProvider?: Maybe<GithubRemoveEnterpriseIdentityProviderPayload>;
  /** Removes an organization from the enterprise */
  GithubremoveEnterpriseOrganization?: Maybe<GithubRemoveEnterpriseOrganizationPayload>;
  /** Removes labels from a Labelable object. */
  GithubremoveLabelsFromLabelable?: Maybe<GithubRemoveLabelsFromLabelablePayload>;
  /** Removes outside collaborator from all repositories in an organization. */
  GithubremoveOutsideCollaborator?: Maybe<GithubRemoveOutsideCollaboratorPayload>;
  /** Removes a reaction from a subject. */
  GithubremoveReaction?: Maybe<GithubRemoveReactionPayload>;
  /** Removes a star from a Starrable. */
  GithubremoveStar?: Maybe<GithubRemoveStarPayload>;
  /** Reopen a issue. */
  GithubreopenIssue?: Maybe<GithubReopenIssuePayload>;
  /** Reopen a pull request. */
  GithubreopenPullRequest?: Maybe<GithubReopenPullRequestPayload>;
  /** Set review requests on a pull request. */
  GithubrequestReviews?: Maybe<GithubRequestReviewsPayload>;
  /** Marks a review thread as resolved. */
  GithubresolveReviewThread?: Maybe<GithubResolveReviewThreadPayload>;
  /** Creates or updates the identity provider for an enterprise. */
  GithubsetEnterpriseIdentityProvider?: Maybe<GithubSetEnterpriseIdentityProviderPayload>;
  /** Submits a pending pull request review. */
  GithubsubmitPullRequestReview?: Maybe<GithubSubmitPullRequestReviewPayload>;
  /** Transfer an issue to a different repository */
  GithubtransferIssue?: Maybe<GithubTransferIssuePayload>;
  /** Unarchives a repository. */
  GithubunarchiveRepository?: Maybe<GithubUnarchiveRepositoryPayload>;
  /** Unfollow a user. */
  GithubunfollowUser?: Maybe<GithubUnfollowUserPayload>;
  /** Deletes a repository link from a project. */
  GithubunlinkRepositoryFromProject?: Maybe<GithubUnlinkRepositoryFromProjectPayload>;
  /** Unlock a lockable object */
  GithubunlockLockable?: Maybe<GithubUnlockLockablePayload>;
  /** Unmark an issue as a duplicate of another issue. */
  GithubunmarkIssueAsDuplicate?: Maybe<GithubUnmarkIssueAsDuplicatePayload>;
  /** Marks a review thread as unresolved. */
  GithubunresolveReviewThread?: Maybe<GithubUnresolveReviewThreadPayload>;
  /** Create a new branch protection rule */
  GithubupdateBranchProtectionRule?: Maybe<GithubUpdateBranchProtectionRulePayload>;
  /** Sets the action execution capability setting for an enterprise. */
  GithubupdateEnterpriseActionExecutionCapabilitySetting?: Maybe<GithubUpdateEnterpriseActionExecutionCapabilitySettingPayload>;
  /** Updates the role of an enterprise administrator. */
  GithubupdateEnterpriseAdministratorRole?: Maybe<GithubUpdateEnterpriseAdministratorRolePayload>;
  /** Sets whether private repository forks are enabled for an enterprise. */
  GithubupdateEnterpriseAllowPrivateRepositoryForkingSetting?: Maybe<GithubUpdateEnterpriseAllowPrivateRepositoryForkingSettingPayload>;
  /** Sets the default repository permission for organizations in an enterprise. */
  GithubupdateEnterpriseDefaultRepositoryPermissionSetting?: Maybe<GithubUpdateEnterpriseDefaultRepositoryPermissionSettingPayload>;
  /** Sets whether organization members with admin permissions on a repository can change repository visibility. */
  GithubupdateEnterpriseMembersCanChangeRepositoryVisibilitySetting?: Maybe<GithubUpdateEnterpriseMembersCanChangeRepositoryVisibilitySettingPayload>;
  /** Sets the members can create repositories setting for an enterprise. */
  GithubupdateEnterpriseMembersCanCreateRepositoriesSetting?: Maybe<GithubUpdateEnterpriseMembersCanCreateRepositoriesSettingPayload>;
  /** Sets the members can delete issues setting for an enterprise. */
  GithubupdateEnterpriseMembersCanDeleteIssuesSetting?: Maybe<GithubUpdateEnterpriseMembersCanDeleteIssuesSettingPayload>;
  /** Sets the members can delete repositories setting for an enterprise. */
  GithubupdateEnterpriseMembersCanDeleteRepositoriesSetting?: Maybe<GithubUpdateEnterpriseMembersCanDeleteRepositoriesSettingPayload>;
  /** Sets whether members can invite collaborators are enabled for an enterprise. */
  GithubupdateEnterpriseMembersCanInviteCollaboratorsSetting?: Maybe<GithubUpdateEnterpriseMembersCanInviteCollaboratorsSettingPayload>;
  /** Sets whether or not an organization admin can make purchases. */
  GithubupdateEnterpriseMembersCanMakePurchasesSetting?: Maybe<GithubUpdateEnterpriseMembersCanMakePurchasesSettingPayload>;
  /** Sets the members can update protected branches setting for an enterprise. */
  GithubupdateEnterpriseMembersCanUpdateProtectedBranchesSetting?: Maybe<GithubUpdateEnterpriseMembersCanUpdateProtectedBranchesSettingPayload>;
  /** Sets the members can view dependency insights for an enterprise. */
  GithubupdateEnterpriseMembersCanViewDependencyInsightsSetting?: Maybe<GithubUpdateEnterpriseMembersCanViewDependencyInsightsSettingPayload>;
  /** Sets whether organization projects are enabled for an enterprise. */
  GithubupdateEnterpriseOrganizationProjectsSetting?: Maybe<GithubUpdateEnterpriseOrganizationProjectsSettingPayload>;
  /** Updates an enterprise's profile. */
  GithubupdateEnterpriseProfile?: Maybe<GithubUpdateEnterpriseProfilePayload>;
  /** Sets whether repository projects are enabled for a enterprise. */
  GithubupdateEnterpriseRepositoryProjectsSetting?: Maybe<GithubUpdateEnterpriseRepositoryProjectsSettingPayload>;
  /** Sets whether team discussions are enabled for an enterprise. */
  GithubupdateEnterpriseTeamDiscussionsSetting?: Maybe<GithubUpdateEnterpriseTeamDiscussionsSettingPayload>;
  /** Sets whether two factor authentication is required for all users in an enterprise. */
  GithubupdateEnterpriseTwoFactorAuthenticationRequiredSetting?: Maybe<GithubUpdateEnterpriseTwoFactorAuthenticationRequiredSettingPayload>;
  /** Sets whether an IP allow list is enabled on an owner. */
  GithubupdateIpAllowListEnabledSetting?: Maybe<GithubUpdateIpAllowListEnabledSettingPayload>;
  /** Updates an IP allow list entry. */
  GithubupdateIpAllowListEntry?: Maybe<GithubUpdateIpAllowListEntryPayload>;
  /** Updates an Issue. */
  GithubupdateIssue?: Maybe<GithubUpdateIssuePayload>;
  /** Updates an IssueComment object. */
  GithubupdateIssueComment?: Maybe<GithubUpdateIssueCommentPayload>;
  /** Updates an existing project. */
  GithubupdateProject?: Maybe<GithubUpdateProjectPayload>;
  /** Updates an existing project card. */
  GithubupdateProjectCard?: Maybe<GithubUpdateProjectCardPayload>;
  /** Updates an existing project column. */
  GithubupdateProjectColumn?: Maybe<GithubUpdateProjectColumnPayload>;
  /** Update a pull request */
  GithubupdatePullRequest?: Maybe<GithubUpdatePullRequestPayload>;
  /** Updates the body of a pull request review. */
  GithubupdatePullRequestReview?: Maybe<GithubUpdatePullRequestReviewPayload>;
  /** Updates a pull request review comment. */
  GithubupdatePullRequestReviewComment?: Maybe<GithubUpdatePullRequestReviewCommentPayload>;
  /** Update a Git Ref. */
  GithubupdateRef?: Maybe<GithubUpdateRefPayload>;
  /** Update information about a repository. */
  GithubupdateRepository?: Maybe<GithubUpdateRepositoryPayload>;
  /** Updates the state for subscribable subjects. */
  GithubupdateSubscription?: Maybe<GithubUpdateSubscriptionPayload>;
  /** Updates a team discussion. */
  GithubupdateTeamDiscussion?: Maybe<GithubUpdateTeamDiscussionPayload>;
  /** Updates a discussion comment. */
  GithubupdateTeamDiscussionComment?: Maybe<GithubUpdateTeamDiscussionCommentPayload>;
  /** Replaces the repository's topics with the given topics. */
  GithubupdateTopics?: Maybe<GithubUpdateTopicsPayload>;
};


/** The root query for implementing GraphQL mutations. */
export type MutationCreateCityArgs = {
  input: GeoCreateCityInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationCreateCountryArgs = {
  input: GeoCreateCountryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationCreateCountrylanguageArgs = {
  input: GeoCreateCountrylanguageInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCityArgs = {
  input: GeoUpdateCityInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCityByIdArgs = {
  input: GeoUpdateCityByIdInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCountryArgs = {
  input: GeoUpdateCountryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCountryByCodeArgs = {
  input: GeoUpdateCountryByCodeInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCountrylanguageArgs = {
  input: GeoUpdateCountrylanguageInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationUpdateCountrylanguageByCountrycodeAndLanguageArgs = {
  input: GeoUpdateCountrylanguageByCountrycodeAndLanguageInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCityArgs = {
  input: GeoDeleteCityInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCityByIdArgs = {
  input: GeoDeleteCityByIdInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCountryArgs = {
  input: GeoDeleteCountryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCountryByCodeArgs = {
  input: GeoDeleteCountryByCodeInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCountrylanguageArgs = {
  input: GeoDeleteCountrylanguageInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationDeleteCountrylanguageByCountrycodeAndLanguageArgs = {
  input: GeoDeleteCountrylanguageByCountrycodeAndLanguageInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubacceptEnterpriseAdministratorInvitationArgs = {
  input: GithubAcceptEnterpriseAdministratorInvitationInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubacceptTopicSuggestionArgs = {
  input: GithubAcceptTopicSuggestionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddAssigneesToAssignableArgs = {
  input: GithubAddAssigneesToAssignableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddCommentArgs = {
  input: GithubAddCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddLabelsToLabelableArgs = {
  input: GithubAddLabelsToLabelableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddProjectCardArgs = {
  input: GithubAddProjectCardInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddProjectColumnArgs = {
  input: GithubAddProjectColumnInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddPullRequestReviewArgs = {
  input: GithubAddPullRequestReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddPullRequestReviewCommentArgs = {
  input: GithubAddPullRequestReviewCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddReactionArgs = {
  input: GithubAddReactionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubaddStarArgs = {
  input: GithubAddStarInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubarchiveRepositoryArgs = {
  input: GithubArchiveRepositoryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcancelEnterpriseAdminInvitationArgs = {
  input: GithubCancelEnterpriseAdminInvitationInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubchangeUserStatusArgs = {
  input: GithubChangeUserStatusInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubclearLabelsFromLabelableArgs = {
  input: GithubClearLabelsFromLabelableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcloneProjectArgs = {
  input: GithubCloneProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcloneTemplateRepositoryArgs = {
  input: GithubCloneTemplateRepositoryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcloseIssueArgs = {
  input: GithubCloseIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubclosePullRequestArgs = {
  input: GithubClosePullRequestInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubconvertProjectCardNoteToIssueArgs = {
  input: GithubConvertProjectCardNoteToIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateBranchProtectionRuleArgs = {
  input: GithubCreateBranchProtectionRuleInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateEnterpriseOrganizationArgs = {
  input: GithubCreateEnterpriseOrganizationInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateIpAllowListEntryArgs = {
  input: GithubCreateIpAllowListEntryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateIssueArgs = {
  input: GithubCreateIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateProjectArgs = {
  input: GithubCreateProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreatePullRequestArgs = {
  input: GithubCreatePullRequestInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateRefArgs = {
  input: GithubCreateRefInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateRepositoryArgs = {
  input: GithubCreateRepositoryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateTeamDiscussionArgs = {
  input: GithubCreateTeamDiscussionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubcreateTeamDiscussionCommentArgs = {
  input: GithubCreateTeamDiscussionCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeclineTopicSuggestionArgs = {
  input: GithubDeclineTopicSuggestionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteBranchProtectionRuleArgs = {
  input: GithubDeleteBranchProtectionRuleInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteDeploymentArgs = {
  input: GithubDeleteDeploymentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteIpAllowListEntryArgs = {
  input: GithubDeleteIpAllowListEntryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteIssueArgs = {
  input: GithubDeleteIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteIssueCommentArgs = {
  input: GithubDeleteIssueCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteProjectArgs = {
  input: GithubDeleteProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteProjectCardArgs = {
  input: GithubDeleteProjectCardInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteProjectColumnArgs = {
  input: GithubDeleteProjectColumnInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeletePullRequestReviewArgs = {
  input: GithubDeletePullRequestReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeletePullRequestReviewCommentArgs = {
  input: GithubDeletePullRequestReviewCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteRefArgs = {
  input: GithubDeleteRefInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteTeamDiscussionArgs = {
  input: GithubDeleteTeamDiscussionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdeleteTeamDiscussionCommentArgs = {
  input: GithubDeleteTeamDiscussionCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubdismissPullRequestReviewArgs = {
  input: GithubDismissPullRequestReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubfollowUserArgs = {
  input: GithubFollowUserInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubinviteEnterpriseAdminArgs = {
  input: GithubInviteEnterpriseAdminInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithublinkRepositoryToProjectArgs = {
  input: GithubLinkRepositoryToProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithublockLockableArgs = {
  input: GithubLockLockableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubmarkPullRequestReadyForReviewArgs = {
  input: GithubMarkPullRequestReadyForReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubmergeBranchArgs = {
  input: GithubMergeBranchInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubmergePullRequestArgs = {
  input: GithubMergePullRequestInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubmoveProjectCardArgs = {
  input: GithubMoveProjectCardInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubmoveProjectColumnArgs = {
  input: GithubMoveProjectColumnInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubregenerateEnterpriseIdentityProviderRecoveryCodesArgs = {
  input: GithubRegenerateEnterpriseIdentityProviderRecoveryCodesInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveAssigneesFromAssignableArgs = {
  input: GithubRemoveAssigneesFromAssignableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveEnterpriseAdminArgs = {
  input: GithubRemoveEnterpriseAdminInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveEnterpriseIdentityProviderArgs = {
  input: GithubRemoveEnterpriseIdentityProviderInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveEnterpriseOrganizationArgs = {
  input: GithubRemoveEnterpriseOrganizationInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveLabelsFromLabelableArgs = {
  input: GithubRemoveLabelsFromLabelableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveOutsideCollaboratorArgs = {
  input: GithubRemoveOutsideCollaboratorInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveReactionArgs = {
  input: GithubRemoveReactionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubremoveStarArgs = {
  input: GithubRemoveStarInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubreopenIssueArgs = {
  input: GithubReopenIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubreopenPullRequestArgs = {
  input: GithubReopenPullRequestInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubrequestReviewsArgs = {
  input: GithubRequestReviewsInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubresolveReviewThreadArgs = {
  input: GithubResolveReviewThreadInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubsetEnterpriseIdentityProviderArgs = {
  input: GithubSetEnterpriseIdentityProviderInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubsubmitPullRequestReviewArgs = {
  input: GithubSubmitPullRequestReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubtransferIssueArgs = {
  input: GithubTransferIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunarchiveRepositoryArgs = {
  input: GithubUnarchiveRepositoryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunfollowUserArgs = {
  input: GithubUnfollowUserInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunlinkRepositoryFromProjectArgs = {
  input: GithubUnlinkRepositoryFromProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunlockLockableArgs = {
  input: GithubUnlockLockableInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunmarkIssueAsDuplicateArgs = {
  input: GithubUnmarkIssueAsDuplicateInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubunresolveReviewThreadArgs = {
  input: GithubUnresolveReviewThreadInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateBranchProtectionRuleArgs = {
  input: GithubUpdateBranchProtectionRuleInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseActionExecutionCapabilitySettingArgs = {
  input: GithubUpdateEnterpriseActionExecutionCapabilitySettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseAdministratorRoleArgs = {
  input: GithubUpdateEnterpriseAdministratorRoleInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseAllowPrivateRepositoryForkingSettingArgs = {
  input: GithubUpdateEnterpriseAllowPrivateRepositoryForkingSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseDefaultRepositoryPermissionSettingArgs = {
  input: GithubUpdateEnterpriseDefaultRepositoryPermissionSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanChangeRepositoryVisibilitySettingArgs = {
  input: GithubUpdateEnterpriseMembersCanChangeRepositoryVisibilitySettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanCreateRepositoriesSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanCreateRepositoriesSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanDeleteIssuesSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanDeleteIssuesSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanDeleteRepositoriesSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanDeleteRepositoriesSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanInviteCollaboratorsSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanInviteCollaboratorsSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanMakePurchasesSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanMakePurchasesSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanUpdateProtectedBranchesSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanUpdateProtectedBranchesSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseMembersCanViewDependencyInsightsSettingArgs = {
  input: GithubUpdateEnterpriseMembersCanViewDependencyInsightsSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseOrganizationProjectsSettingArgs = {
  input: GithubUpdateEnterpriseOrganizationProjectsSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseProfileArgs = {
  input: GithubUpdateEnterpriseProfileInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseRepositoryProjectsSettingArgs = {
  input: GithubUpdateEnterpriseRepositoryProjectsSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseTeamDiscussionsSettingArgs = {
  input: GithubUpdateEnterpriseTeamDiscussionsSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateEnterpriseTwoFactorAuthenticationRequiredSettingArgs = {
  input: GithubUpdateEnterpriseTwoFactorAuthenticationRequiredSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateIpAllowListEnabledSettingArgs = {
  input: GithubUpdateIpAllowListEnabledSettingInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateIpAllowListEntryArgs = {
  input: GithubUpdateIpAllowListEntryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateIssueArgs = {
  input: GithubUpdateIssueInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateIssueCommentArgs = {
  input: GithubUpdateIssueCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateProjectArgs = {
  input: GithubUpdateProjectInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateProjectCardArgs = {
  input: GithubUpdateProjectCardInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateProjectColumnArgs = {
  input: GithubUpdateProjectColumnInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdatePullRequestArgs = {
  input: GithubUpdatePullRequestInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdatePullRequestReviewArgs = {
  input: GithubUpdatePullRequestReviewInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdatePullRequestReviewCommentArgs = {
  input: GithubUpdatePullRequestReviewCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateRefArgs = {
  input: GithubUpdateRefInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateRepositoryArgs = {
  input: GithubUpdateRepositoryInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateSubscriptionArgs = {
  input: GithubUpdateSubscriptionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateTeamDiscussionArgs = {
  input: GithubUpdateTeamDiscussionInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateTeamDiscussionCommentArgs = {
  input: GithubUpdateTeamDiscussionCommentInput;
};


/** The root query for implementing GraphQL mutations. */
export type MutationGithubupdateTopicsArgs = {
  input: GithubUpdateTopicsInput;
};

/** The query root of GitHub's GraphQL interface. */
export type Query = GeoNode & {
   __typename?: 'Query';
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
  /** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
  nodeId: Scalars['ID'];
  /** Fetches an object given its globally unique `ID`. */
  node?: Maybe<GeoNode>;
  /** Reads and enables pagination through a set of `City`. */
  allCities?: Maybe<GeoCitiesConnection>;
  /** Reads and enables pagination through a set of `Country`. */
  allCountries?: Maybe<GeoCountriesConnection>;
  /** Reads and enables pagination through a set of `Countrylanguage`. */
  allCountrylanguages?: Maybe<GeoCountrylanguagesConnection>;
  cityById?: Maybe<GeoCity>;
  countryByCode?: Maybe<GeoCountry>;
  countrylanguageByCountrycodeAndLanguage?: Maybe<GeoCountrylanguage>;
  /** Reads a single `City` using its globally unique `ID`. */
  city?: Maybe<GeoCity>;
  /** Reads a single `Country` using its globally unique `ID`. */
  country?: Maybe<GeoCountry>;
  /** Reads a single `Countrylanguage` using its globally unique `ID`. */
  countrylanguage?: Maybe<GeoCountrylanguage>;
  /** Look up a code of conduct by its key */
  GithubcodeOfConduct?: Maybe<GithubCodeOfConduct>;
  /** Look up a code of conduct by its key */
  GithubcodesOfConduct?: Maybe<Array<Maybe<GithubCodeOfConduct>>>;
  /** Look up an enterprise by URL slug. */
  Githubenterprise?: Maybe<GithubEnterprise>;
  /** Look up a pending enterprise administrator invitation by invitee, enterprise and role. */
  GithubenterpriseAdministratorInvitation?: Maybe<GithubEnterpriseAdministratorInvitation>;
  /** Look up a pending enterprise administrator invitation by invitation token. */
  GithubenterpriseAdministratorInvitationByToken?: Maybe<GithubEnterpriseAdministratorInvitation>;
  /** Look up an open source license by its key */
  Githublicense?: Maybe<GithubLicense>;
  /** Return a list of known open source licenses */
  Githublicenses: Array<Maybe<GithubLicense>>;
  /** Get alphabetically sorted list of Marketplace categories */
  GithubmarketplaceCategories: Array<GithubMarketplaceCategory>;
  /** Look up a Marketplace category by its slug. */
  GithubmarketplaceCategory?: Maybe<GithubMarketplaceCategory>;
  /** Look up a single Marketplace listing */
  GithubmarketplaceListing?: Maybe<GithubMarketplaceListing>;
  /** Look up Marketplace listings */
  GithubmarketplaceListings: GithubMarketplaceListingConnection;
  /** Return information about the GitHub instance */
  Githubmeta: GithubGitHubMetadata;
  /** Fetches an object given its ID. */
  Githubnode?: Maybe<GithubNode>;
  /** Lookup nodes by a list of IDs. */
  Githubnodes: Array<Maybe<GithubNode>>;
  /** Lookup a organization by login. */
  Githuborganization?: Maybe<GithubOrganization>;
  /** The client's rate limit information. */
  GithubrateLimit?: Maybe<GithubRateLimit>;
  /** Hack to workaround https://github.com/facebook/relay/issues/112 re-exposing the root query object */
  Githubrelay: Query;
  /** Lookup a given repository by the owner and repository name. */
  Githubrepository?: Maybe<GithubRepository>;
  /** Lookup a repository owner (ie. either a User or an Organization) by login. */
  GithubrepositoryOwner?: Maybe<GithubRepositoryOwner>;
  /** Lookup resource by a URL. */
  Githubresource?: Maybe<GithubUniformResourceLocatable>;
  /** Perform a search across resources. */
  Githubsearch: GithubSearchResultItemConnection;
  /** GitHub Security Advisories */
  GithubsecurityAdvisories: GithubSecurityAdvisoryConnection;
  /** Fetch a Security Advisory by its GHSA ID */
  GithubsecurityAdvisory?: Maybe<GithubSecurityAdvisory>;
  /** Software Vulnerabilities documented by GitHub Security Advisories */
  GithubsecurityVulnerabilities: GithubSecurityVulnerabilityConnection;
  /**
   * Look up a single Sponsors Listing
   * @deprecated `Query.sponsorsListing` will be removed. Use `Sponsorable.sponsorsListing` instead. Removal on 2020-04-01 UTC.
   */
  GithubsponsorsListing?: Maybe<GithubSponsorsListing>;
  /** Look up a topic by name. */
  Githubtopic?: Maybe<GithubTopic>;
  /** Lookup a user by login. */
  Githubuser?: Maybe<GithubUser>;
  /** The currently authenticated user. */
  Githubviewer: GithubUser;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryNodeArgs = {
  nodeId: Scalars['ID'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryAllCitiesArgs = {
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['GeoCursor']>;
  after?: Maybe<Scalars['GeoCursor']>;
  orderBy?: Maybe<Array<GeoCitiesOrderBy>>;
  condition?: Maybe<GeoCityCondition>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryAllCountriesArgs = {
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['GeoCursor']>;
  after?: Maybe<Scalars['GeoCursor']>;
  orderBy?: Maybe<Array<GeoCountriesOrderBy>>;
  condition?: Maybe<GeoCountryCondition>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryAllCountrylanguagesArgs = {
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['GeoCursor']>;
  after?: Maybe<Scalars['GeoCursor']>;
  orderBy?: Maybe<Array<GeoCountrylanguagesOrderBy>>;
  condition?: Maybe<GeoCountrylanguageCondition>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCityByIdArgs = {
  id: Scalars['Int'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCountryByCodeArgs = {
  code: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCountrylanguageByCountrycodeAndLanguageArgs = {
  countrycode: Scalars['String'];
  language: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCityArgs = {
  nodeId: Scalars['ID'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCountryArgs = {
  nodeId: Scalars['ID'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryCountrylanguageArgs = {
  nodeId: Scalars['ID'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubcodeOfConductArgs = {
  key: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubenterpriseArgs = {
  slug: Scalars['String'];
  invitationToken?: Maybe<Scalars['String']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubenterpriseAdministratorInvitationArgs = {
  userLogin: Scalars['String'];
  enterpriseSlug: Scalars['String'];
  role: GithubEnterpriseAdministratorRole;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubenterpriseAdministratorInvitationByTokenArgs = {
  invitationToken: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithublicenseArgs = {
  key: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubmarketplaceCategoriesArgs = {
  includeCategories?: Maybe<Array<Scalars['String']>>;
  excludeEmpty?: Maybe<Scalars['Boolean']>;
  excludeSubcategories?: Maybe<Scalars['Boolean']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubmarketplaceCategoryArgs = {
  slug: Scalars['String'];
  useTopicAliases?: Maybe<Scalars['Boolean']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubmarketplaceListingArgs = {
  slug: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubmarketplaceListingsArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  categorySlug?: Maybe<Scalars['String']>;
  useTopicAliases?: Maybe<Scalars['Boolean']>;
  viewerCanAdmin?: Maybe<Scalars['Boolean']>;
  adminId?: Maybe<Scalars['ID']>;
  organizationId?: Maybe<Scalars['ID']>;
  allStates?: Maybe<Scalars['Boolean']>;
  slugs?: Maybe<Array<Maybe<Scalars['String']>>>;
  primaryCategoryOnly?: Maybe<Scalars['Boolean']>;
  withFreeTrialsOnly?: Maybe<Scalars['Boolean']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubnodeArgs = {
  id: Scalars['ID'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubnodesArgs = {
  ids: Array<Scalars['ID']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithuborganizationArgs = {
  login: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubrateLimitArgs = {
  dryRun?: Maybe<Scalars['Boolean']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubrepositoryArgs = {
  owner: Scalars['String'];
  name: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubrepositoryOwnerArgs = {
  login: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubresourceArgs = {
  url: Scalars['GithubURI'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubsearchArgs = {
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  query: Scalars['String'];
  type: GithubSearchType;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubsecurityAdvisoriesArgs = {
  orderBy?: Maybe<GithubSecurityAdvisoryOrder>;
  identifier?: Maybe<GithubSecurityAdvisoryIdentifierFilter>;
  publishedSince?: Maybe<Scalars['GithubDateTime']>;
  updatedSince?: Maybe<Scalars['GithubDateTime']>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubsecurityAdvisoryArgs = {
  ghsaId: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubsecurityVulnerabilitiesArgs = {
  orderBy?: Maybe<GithubSecurityVulnerabilityOrder>;
  ecosystem?: Maybe<GithubSecurityAdvisoryEcosystem>;
  package?: Maybe<Scalars['String']>;
  severities?: Maybe<Array<GithubSecurityAdvisorySeverity>>;
  after?: Maybe<Scalars['String']>;
  before?: Maybe<Scalars['String']>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubsponsorsListingArgs = {
  slug: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubtopicArgs = {
  name: Scalars['String'];
};


/** The query root of GitHub's GraphQL interface. */
export type QueryGithubuserArgs = {
  login: Scalars['String'];
};

export type CitiesAndDevelopersQueryVariables = {
  city: Scalars['String'];
};


export type CitiesAndDevelopersQuery = (
  { __typename?: 'Query' }
  & { allCities?: Maybe<(
    { __typename?: 'GeoCitiesConnection' }
    & { nodes: Array<Maybe<(
      { __typename?: 'GeoCity' }
      & Pick<GeoCity, 'name' | 'countrycode' | 'district'>
      & { developers: (
        { __typename?: 'GithubSearchResultItemConnection' }
        & { nodes?: Maybe<Array<Maybe<{ __typename?: 'GithubApp' } | { __typename?: 'GithubIssue' } | { __typename?: 'GithubMarketplaceListing' } | { __typename?: 'GithubOrganization' } | { __typename?: 'GithubPullRequest' } | { __typename?: 'GithubRepository' } | (
          { __typename?: 'GithubUser' }
          & Pick<GithubUser, 'login' | 'avatarUrl'>
        )>>> }
      ) }
    )>> }
  )> }
);


export const CitiesAndDevelopersDocument = gql`
    query citiesAndDevelopers($city: String!) {
  allCities(orderBy: ID_ASC, first: 1, condition: {name: $city}) {
    nodes {
      name
      countrycode
      district
      developers {
        nodes {
          ... on GithubUser {
            login
            avatarUrl
          }
        }
      }
    }
  }
}
    `;
export type Requester<C= {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    citiesAndDevelopers(variables: CitiesAndDevelopersQueryVariables, options?: C): Promise<CitiesAndDevelopersQuery> {
      return requester<CitiesAndDevelopersQuery, CitiesAndDevelopersQueryVariables>(CitiesAndDevelopersDocument, variables, options);
    }
  };
}