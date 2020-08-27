import { DocumentNode } from 'graphql';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export enum Lang {
  AR = 'ar',
  AZ = 'az',
  BE = 'be',
  BG = 'bg',
  BS = 'bs',
  CA = 'ca',
  CS = 'cs',
  DE = 'de',
  FI = 'fi',
  FR = 'fr',
  EL = 'el',
  ES = 'es',
  ET = 'et',
  HR = 'hr',
  HU = 'hu',
  ID = 'id',
  IT = 'it',
  IS = 'is',
  KW = 'kw',
  NB = 'nb',
  NL = 'nl',
  PL = 'pl',
  PT = 'pt',
  RO = 'ro',
  RU = 'ru',
  SK = 'sk',
  SL = 'sl',
  SR = 'sr',
  SV = 'sv',
  TR = 'tr',
  UK = 'uk',
  ZH = 'zh',
  ZH_TW = 'zh-tw',
}

export enum Units {
  S = 'S',
  I = 'I',
}

export enum Marine {
  T = 't',
}

export enum Tp {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum Tp2 {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export enum Tz {
  LOCAL = 'local',
  UTC = 'utc',
}

export type GetDailyForecastByCoordinatesQueryVariables = Exact<{
  lat: Scalars['Float'];
  lng: Scalars['Float'];
  apiKey: Scalars['String'];
}>;

export type GetDailyForecastByCoordinatesQuery = {
  __typename?: 'Query';
  forecastData?: Maybe<{
    __typename?: 'ForecastDay';
    cityName?: Maybe<string>;
    countryCode?: Maybe<string>;
    stateCode?: Maybe<string>;
    data?: Maybe<
      Array<
        Maybe<{ __typename?: 'Forecast'; datetime?: Maybe<string>; minTemp?: Maybe<number>; maxTemp?: Maybe<number> }>
      >
    >;
  }>;
};

export const GetDailyForecastByCoordinatesDocument: DocumentNode = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getDailyForecastByCoordinates' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'lat' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Float' } } },
          directives: [],
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'lng' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Float' } } },
          directives: [],
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'apiKey' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
          directives: [],
        },
      ],
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'forecastData' },
            name: { kind: 'Name', value: 'getForecastDailyLatLatLonLon' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'lat' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'lat' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'lon' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'lng' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'apiKey' } },
              },
            ],
            directives: [],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'cityName' }, arguments: [], directives: [] },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' }, arguments: [], directives: [] },
                { kind: 'Field', name: { kind: 'Name', value: 'stateCode' }, arguments: [], directives: [] },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'data' },
                  arguments: [],
                  directives: [],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'datetime' }, arguments: [], directives: [] },
                      { kind: 'Field', name: { kind: 'Name', value: 'minTemp' }, arguments: [], directives: [] },
                      { kind: 'Field', name: { kind: 'Name', value: 'maxTemp' }, arguments: [], directives: [] },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};
export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R>;
export function getSdk<C>(requester: Requester<C>) {
  return {
    getDailyForecastByCoordinates(
      variables: GetDailyForecastByCoordinatesQueryVariables,
      options?: C
    ): Promise<GetDailyForecastByCoordinatesQuery> {
      return requester<GetDailyForecastByCoordinatesQuery, GetDailyForecastByCoordinatesQueryVariables>(
        GetDailyForecastByCoordinatesDocument,
        variables,
        options
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
