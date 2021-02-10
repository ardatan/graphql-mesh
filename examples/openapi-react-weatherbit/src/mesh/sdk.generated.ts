import { DocumentNode } from 'graphql';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export enum Lang {
  AR = 'AR',
  AZ = 'AZ',
  BE = 'BE',
  BG = 'BG',
  BS = 'BS',
  CA = 'CA',
  CS = 'CS',
  DE = 'DE',
  FI = 'FI',
  FR = 'FR',
  EL = 'EL',
  ES = 'ES',
  ET = 'ET',
  HR = 'HR',
  HU = 'HU',
  ID = 'ID',
  IT = 'IT',
  IS = 'IS',
  KW = 'KW',
  NB = 'NB',
  NL = 'NL',
  PL = 'PL',
  PT = 'PT',
  RO = 'RO',
  RU = 'RU',
  SK = 'SK',
  SL = 'SL',
  SR = 'SR',
  SV = 'SV',
  TR = 'TR',
  UK = 'UK',
  ZH = 'ZH',
  ZH_TW = 'ZH_TW',
}

export enum Marine {
  T = 'T',
}

export enum Units {
  S = 'S',
  I = 'I',
}

export enum Include {
  MINUTELY = 'MINUTELY',
}

export enum Tp {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

export enum Tp2 {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

export enum Tz {
  LOCAL = 'LOCAL',
  UTC = 'UTC',
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
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'lng' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Float' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'apiKey' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'forecastData' },
            name: { kind: 'Name', value: 'getForecastDailyLatequalToLatLonLon' },
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
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'cityName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stateCode' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'data' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'datetime' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'minTemp' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'maxTemp' } },
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
