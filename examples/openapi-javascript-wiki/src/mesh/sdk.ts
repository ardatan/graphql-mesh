import { DocumentNode } from 'graphql';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: any }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  JSON: any;
};

export enum Format {
  SVG = 'svg',
  MML = 'mml',
  PNG = 'png',
}

export enum EditorType {
  ALL_EDITOR_TYPES = 'all-editor-types',
  ANONYMOUS = 'anonymous',
  GROUP_BOT = 'group-bot',
  NAME_BOT = 'name-bot',
  USER = 'user',
}

export enum Granularity {
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export enum PageType {
  ALL_PAGE_TYPES = 'all-page-types',
  CONTENT = 'content',
  NON_CONTENT = 'non-content',
}

export enum ActivityLevel {
  ALL_ACTIVITY_LEVELS = 'all-activity-levels',
  _1__4_EDITS = '1..4-edits',
  _5__24_EDITS = '5..24-edits',
  _25__99_EDITS = '25..99-edits',
  _100___EDITS = '100..-edits',
}

export enum AccessSite {
  ALL_SITES = 'all-sites',
  DESKTOP_SITE = 'desktop-site',
  MOBILE_SITE = 'mobile-site',
}

export enum Granularity2 {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export enum Access {
  ALL_ACCESS = 'all-access',
  DESKTOP = 'desktop',
  MOBILE_APP = 'mobile-app',
  MOBILE_WEB = 'mobile-web',
}

export enum Agent {
  ALL_AGENTS = 'all-agents',
  USER = 'user',
  SPIDER = 'spider',
}

export enum Agent2 {
  ALL_AGENTS = 'all-agents',
  USER = 'user',
  SPIDER = 'spider',
  BOT = 'bot',
}

export enum Tool {
  MT = 'mt',
  DICTIONARY = 'dictionary',
}

export enum Provider2 {
  JSONDICT = 'JsonDict',
  DICTD = 'Dictd',
}

export type MediaMathCheckInput = {
  /** The formula to check */
  q: Scalars['String'];
};

export enum Type {
  TEX = 'tex',
  INLINE_TEX = 'inline-tex',
  CHEM = 'chem',
}

export type TransformHtmlFromToInput = {
  /** The HTML content to translate */
  html: Scalars['String'];
};

export enum Provider {
  APERTIUM = 'Apertium',
  YANDEX = 'Yandex',
  YOUDAO = 'Youdao',
}

export type ViewsInPastMonthQueryVariables = Exact<{ [key: string]: never }>;

export type ViewsInPastMonthQuery = { __typename?: 'Query'; viewsInPastMonth: number };

export type WikipediaMetricsQueryVariables = Exact<{ [key: string]: never }>;

export type WikipediaMetricsQuery = {
  __typename?: 'Query';
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd?: Maybe<{
    __typename?: 'PageviewProject';
    items?: Maybe<Array<Maybe<{ __typename?: 'Items17ListItem'; views?: Maybe<number> }>>>;
  }>;
};

export const ViewsInPastMonthDocument: DocumentNode = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'viewsInPastMonth' },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'viewsInPastMonth' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'project' },
                value: { kind: 'StringValue', value: 'en.wikipedia.org', block: false },
              },
            ],
            directives: [],
          },
        ],
      },
    },
  ],
};
export const WikipediaMetricsDocument: DocumentNode = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'wikipediaMetrics' },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'access' },
                value: { kind: 'EnumValue', value: 'ALL_ACCESS' },
              },
              { kind: 'Argument', name: { kind: 'Name', value: 'agent' }, value: { kind: 'EnumValue', value: 'USER' } },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: { kind: 'StringValue', value: '20200101', block: false },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: { kind: 'StringValue', value: '20200226', block: false },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'project' },
                value: { kind: 'StringValue', value: 'en.wikipedia.org', block: false },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'granularity' },
                value: { kind: 'EnumValue', value: 'DAILY' },
              },
            ],
            directives: [],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  arguments: [],
                  directives: [],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'views' }, arguments: [], directives: [] },
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
    viewsInPastMonth(variables?: ViewsInPastMonthQueryVariables, options?: C): Promise<ViewsInPastMonthQuery> {
      return requester<ViewsInPastMonthQuery, ViewsInPastMonthQueryVariables>(
        ViewsInPastMonthDocument,
        variables,
        options
      );
    },
    wikipediaMetrics(variables?: WikipediaMetricsQueryVariables, options?: C): Promise<WikipediaMetricsQuery> {
      return requester<WikipediaMetricsQuery, WikipediaMetricsQueryVariables>(
        WikipediaMetricsDocument,
        variables,
        options
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
