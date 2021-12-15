import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { DocumentNode } from 'graphql';
export declare type Maybe<T> = T | null;
export declare type InputMaybe<T> = Maybe<T>;
export declare type Exact<
  T extends {
    [key: string]: unknown;
  }
> = {
  [K in keyof T]: T[K];
};
export declare type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export declare type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export declare type RequireFields<T, K extends keyof T> = {
  [X in Exclude<keyof T, K>]?: T[X];
} & {
  [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export declare type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  JSON: any;
};
export declare type Query = {
  /**
   * Gets availability of featured feed content for the apps by wiki domain.
   *
   * Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   *
   *
   * Equivalent to GET /feed/availability
   */
  getFeedAvailability?: Maybe<Availability>;
  /**
   * Returns the previously-stored formula via `/media/math/check/{type}` for
   * the given hash.
   *
   * Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).
   *
   *
   * Equivalent to GET /media/math/formula/{hash}
   */
  getMediaMathFormulaHash?: Maybe<Scalars['JSON']>;
  /**
   * Given a request hash, renders a TeX formula into its mathematic
   * representation in the given format. When a request is issued to the
   * `/media/math/check/{format}` POST endpoint, the response contains the
   * `x-resource-location` header denoting the hash ID of the POST data. Once
   * obtained, this endpoint has to be used to obtain the actual render.
   *
   * Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).
   *
   *
   * Equivalent to GET /media/math/render/{format}/{hash}
   */
  getMediaMathRenderFormatHash?: Maybe<Scalars['JSON']>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of absolute bytes
   * difference sums. You can filter by editors-type (all-editor-types, anonymous, group-bot,
   * name-bot, user) and page-type (all-page-types, content, non-content). You can choose
   * between daily and monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/bytes-difference/absolute/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}
   */
  getMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEnd?: Maybe<AbsoluteBytesDifference>;
  /**
   * Given a Mediawiki project, a page-title prefixed with canonical namespace (for
   * instance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes
   * difference absolute sums. You can filter by editors-type (all-editor-types, anonymous,
   * group-bot, name-bot, user). You can choose between daily and monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/bytes-difference/absolute/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}
   */
  getMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEnd?: Maybe<AbsoluteBytesDifferencePerPage>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of bytes difference net
   * sums. You can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot,
   * user) and page-type (all-page-types, content or non-content). You can choose between
   * daily and monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/bytes-difference/net/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}
   */
  getMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEnd?: Maybe<NetBytesDifference>;
  /**
   * Given a Mediawiki project, a page-title prefixed with canonical namespace (for
   * instance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes
   * difference net sums. You can filter by editors-type (all-editor-types, anonymous,
   * group-bot, name-bot, user). You can choose between daily and monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/bytes-difference/net/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}
   */
  getMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEnd?: Maybe<NetBytesDifferencePerPage>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of its edited-pages counts.
   * You can filter by editor-type (all-editor-types, anonymous, group-bot, name-bot, user),
   * page-type (all-page-types, content or non-content) or activity-level (1..4-edits,
   * 5..24-edits, 25..99-edits, 100..-edits). You can choose between daily and monthly
   * granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edited-pages/aggregate/{project}/{editor-type}/{page-type}/{activity-level}/{granularity}/{start}/{end}
   */
  getMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd?: Maybe<EditedPages>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of its new pages counts.
   * You can filter by editor type (all-editor-types, anonymous, group-bot, name-bot, user)
   * or page-type (all-page-types, content or non-content). You can choose between daily and
   * monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edited-pages/new/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}
   */
  getMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEnd?: Maybe<NewPages>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
   * edited-pages by absolute bytes-difference. You can filter by editor-type (all-editor-types,
   * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edited-pages/top-by-absolute-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditedPagesByAbsBytesDiff>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top
   * 100 edited-pages by edits count. You can filter by editor-type (all-editor-types,
   * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or
   * non-content).
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edited-pages/top-by-edits/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditedPagesByEdits>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
   * edited-pages by net bytes-difference. You can filter by editor-type (all-editor-types,
   * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edited-pages/top-by-net-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditedPagesByNetBytesDiff>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of its editors counts.
   * You can filter by editory-type (all-editor-types, anonymous, group-bot, name-bot, user),
   * page-type (all-page-types, content or non-content) or activity-level (1..4-edits,
   * 5..24-edits, 25..99-edits or 100..-edits). You can choose between daily and monthly
   * granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/editors/aggregate/{project}/{editor-type}/{page-type}/{activity-level}/{granularity}/{start}/{end}
   */
  getMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd?: Maybe<Editors>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
   * editors by absolute bytes-difference. You can filter by editor-type (all-editor-types,
   * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
   * The user_text returned is either the mediawiki user_text if the user is registered, or
   * null if user is anonymous.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/editors/top-by-absolute-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditorsByAbsBytesDiff>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top
   * 100 editors by edits count. You can filter by editor-type (all-editor-types,
   * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or
   * non-content). The user_text returned is either the mediawiki user_text if the user is
   * registered, or null if user is anonymous.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/editors/top-by-edits/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditorsByEdits>;
  /**
   * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
   * editors by net bytes-difference. You can filter by editor-type (all-editor-types, anonymous,
   * group-bot, name-bot, user) or page-type (all-page-types, content or non-content). The
   * user_text returned is either the mediawiki user_text if the user is registered, or
   * "Anonymous Editor" if user is anonymous.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/editors/top-by-net-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}
   */
  getMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Maybe<TopEditorsByNetBytesDiff>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of edits counts.
   * You can filter by editors-type (all-editor-types, anonymous, bot, registered) and
   * page-type (all-page-types, content or non-content). You can choose between daily and
   * monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edits/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}
   */
  getMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEnd?: Maybe<MetricsEditsAggregate>;
  /**
   * Given a Mediawiki project, a page-title prefixed with its canonical namespace (for
   * instance 'User:Jimbo_Wales') and a date range, returns a timeseries of edit counts.
   * You can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot, user).
   * You can choose between daily and monthly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/edits/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}
   */
  getMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEnd?: Maybe<EditsPerPage>;
  /**
   * Given a project and a date range, returns a timeseries of pagecounts.
   * You can filter by access site (mobile or desktop) and you can choose between monthly,
   * daily and hourly granularity as well.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/legacy/pagecounts/aggregate/{project}/{access-site}/{granularity}/{start}/{end}
   */
  getMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEnd?: Maybe<PagecountsProject>;
  /**
   * Given a date range, returns a timeseries of pageview counts. You can filter by project,
   * access method and/or agent type. You can choose between daily and hourly granularity
   * as well.
   *
   * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/pageviews/aggregate/{project}/{access}/{agent}/{granularity}/{start}/{end}
   */
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd?: Maybe<PageviewProject>;
  /**
   * Given a Mediawiki article and a date range, returns a daily timeseries of its pageview
   * counts. You can also filter by access method and/or agent type.
   *
   * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}
   */
  getMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEnd?: Maybe<PageviewArticle>;
  /**
   * Lists the pageviews to this project, split by country of origin for a given month.
   * Because of privacy reasons, pageviews are given in a bucketed format, and countries
   * with less than 100 views do not get reported.
   * Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/pageviews/top-by-country/{project}/{access}/{year}/{month}
   */
  getMetricsPageviewsTopByCountryProjectAccessYearMonth?: Maybe<ByCountry>;
  /**
   * Lists the 1000 most viewed articles for a given project and timespan (month or day).
   * You can filter by access method.
   *
   * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/pageviews/top/{project}/{access}/{year}/{month}/{day}
   */
  getMetricsPageviewsTopProjectAccessYearMonthDay?: Maybe<PageviewTops>;
  /**
   * Given a Mediawiki project and a date range, returns a timeseries of its newly registered
   * users counts. You can choose between daily and monthly granularity. The newly registered
   * users value is computed with self-created users only, not auto-login created ones.
   *
   * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
   * - Rate limit: 25 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/registered-users/new/{project}/{granularity}/{start}/{end}
   */
  getMetricsRegisteredUsersNewProjectGranularityStartEnd?: Maybe<NewRegisteredUsers>;
  /**
   * Given a project and a date range, returns a timeseries of unique devices counts.
   * You need to specify a project, and can filter by accessed site (mobile or desktop).
   * You can choose between daily and hourly granularity as well.
   *
   * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
   * - Rate limit: 100 req/s
   * - License: Data accessible via this endpoint is available under the
   *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
   *
   *
   * Equivalent to GET /metrics/unique-devices/{project}/{access-site}/{granularity}/{start}/{end}
   */
  getMetricsUniqueDevicesProjectAccessSiteGranularityStartEnd?: Maybe<UniqueDevices>;
  /**
   * Fetches the list of language pairs the back-end service can translate
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/list/languagepairs/
   */
  getTransformListLanguagepairs?: Maybe<CxLanguagepairs>;
  /**
   * Fetches the list of tools that are available for the given pair of languages.
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/list/pair/{from}/{to}/
   */
  getTransformListPairFromTo?: Maybe<CxListTools>;
  /**
   * Fetches the list of tools and all of the language pairs it can translate
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/list/tool/{tool}
   */
  getTransformListToolTool?: Maybe<Scalars['JSON']>;
  /**
   * Fetches the list of tools and all of the language pairs it can translate
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/list/tool/{tool}/{from}
   */
  getTransformListToolToolFrom?: Maybe<Scalars['JSON']>;
  /**
   * Fetches the list of tools and all of the language pairs it can translate
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/list/tool/{tool}/{from}/{to}
   */
  getTransformListToolToolFromTo?: Maybe<Scalars['JSON']>;
  /**
   * Fetches the dictionary meaning of a word from a language and displays
   * it in the target language.
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/word/from/{from_lang}/to/{to_lang}/{word}
   */
  getTransformWordFromFromLangToToLangWord?: Maybe<CxDict>;
  /**
   * Fetches the dictionary meaning of a word from a language and displays
   * it in the target language.
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to GET /transform/word/from/{from_lang}/to/{to_lang}/{word}/{provider}
   */
  getTransformWordFromFromLangToToLangWordProvider?: Maybe<CxDict>;
  viewsInPastMonth: Scalars['Float'];
};
export declare type QuerygetMediaMathFormulaHashArgs = {
  hash: Scalars['String'];
};
export declare type QuerygetMediaMathRenderFormatHashArgs = {
  format: Format;
  hash: Scalars['String'];
};
export declare type QuerygetMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageTitle: Scalars['String'];
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageTitle: Scalars['String'];
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs = {
  activityLevel: ActivityLevel3;
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs = {
  activityLevel: ActivityLevel3;
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs = {
  day: Scalars['String'];
  editorType: EditorType16;
  month: Scalars['String'];
  pageType: PageType13;
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageType: PageType13;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEndArgs = {
  editorType: EditorType16;
  end: Scalars['String'];
  granularity: Granularity21;
  pageTitle: Scalars['String'];
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEndArgs = {
  accessSite: AccessSite3;
  end: Scalars['String'];
  granularity: Granularity22;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsPageviewsAggregateProjectAccessAgentGranularityStartEndArgs = {
  access: Access5;
  agent: Agent3;
  end: Scalars['String'];
  granularity: Granularity22;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEndArgs = {
  access: Access5;
  agent: Agent4;
  article: Scalars['String'];
  end: Scalars['String'];
  granularity: Granularity21;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsPageviewsTopByCountryProjectAccessYearMonthArgs = {
  access: Access5;
  month: Scalars['String'];
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsPageviewsTopProjectAccessYearMonthDayArgs = {
  access: Access5;
  day: Scalars['String'];
  month: Scalars['String'];
  project: Scalars['String'];
  year: Scalars['String'];
};
export declare type QuerygetMetricsRegisteredUsersNewProjectGranularityStartEndArgs = {
  end: Scalars['String'];
  granularity: Granularity21;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetMetricsUniqueDevicesProjectAccessSiteGranularityStartEndArgs = {
  accessSite: AccessSite3;
  end: Scalars['String'];
  granularity: Granularity21;
  project: Scalars['String'];
  start: Scalars['String'];
};
export declare type QuerygetTransformListPairFromToArgs = {
  from: Scalars['String'];
  to: Scalars['String'];
};
export declare type QuerygetTransformListToolToolArgs = {
  tool: Tool;
};
export declare type QuerygetTransformListToolToolFromArgs = {
  from: Scalars['String'];
  tool: Tool;
};
export declare type QuerygetTransformListToolToolFromToArgs = {
  from: Scalars['String'];
  to: Scalars['String'];
  tool: Tool;
};
export declare type QuerygetTransformWordFromFromLangToToLangWordArgs = {
  fromLang: Scalars['String'];
  toLang: Scalars['String'];
  word: Scalars['String'];
};
export declare type QuerygetTransformWordFromFromLangToToLangWordProviderArgs = {
  fromLang: Scalars['String'];
  provider: Provider2;
  toLang: Scalars['String'];
  word: Scalars['String'];
};
export declare type QueryviewsInPastMonthArgs = {
  project: Scalars['String'];
};
export declare type Availability = {
  /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
  inTheNews: Array<Maybe<Scalars['String']>>;
  /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
  mostRead: Array<Maybe<Scalars['String']>>;
  /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
  onThisDay: Array<Maybe<Scalars['String']>>;
  /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
  pictureOfTheDay: Array<Maybe<Scalars['String']>>;
  /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
  todaysFeaturedArticle: Array<Maybe<Scalars['String']>>;
};
export declare enum Format {
  SVG = 'svg',
  MML = 'mml',
  PNG = 'png',
}
export declare type AbsoluteBytesDifference = {
  items?: Maybe<Array<Maybe<ItemsListItem>>>;
};
export declare type ItemsListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<ResultsListItem>>>;
};
export declare type ResultsListItem = {
  absBytesDiff?: Maybe<Scalars['Float']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare enum EditorType16 {
  ALL_EDITOR_TYPES = 'all-editor-types',
  ANONYMOUS = 'anonymous',
  GROUP_BOT = 'group-bot',
  NAME_BOT = 'name-bot',
  USER = 'user',
}
export declare enum Granularity21 {
  DAILY = 'daily',
  MONTHLY = 'monthly',
}
export declare enum PageType13 {
  ALL_PAGE_TYPES = 'all-page-types',
  CONTENT = 'content',
  NON_CONTENT = 'non-content',
}
export declare type AbsoluteBytesDifferencePerPage = {
  items?: Maybe<Array<Maybe<Items2ListItem>>>;
};
export declare type Items2ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageTitle?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<ResultsListItem>>>;
};
export declare type NetBytesDifference = {
  items?: Maybe<Array<Maybe<Items3ListItem>>>;
};
export declare type Items3ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results2ListItem>>>;
};
export declare type Results2ListItem = {
  netBytesDiff?: Maybe<Scalars['Float']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type NetBytesDifferencePerPage = {
  items?: Maybe<Array<Maybe<Items4ListItem>>>;
};
export declare type Items4ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageTitle?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results2ListItem>>>;
};
export declare type EditedPages = {
  items?: Maybe<Array<Maybe<Items5ListItem>>>;
};
export declare type Items5ListItem = {
  activityLevel?: Maybe<Scalars['String']>;
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results3ListItem>>>;
};
export declare type Results3ListItem = {
  editedPages?: Maybe<Scalars['Int']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare enum ActivityLevel3 {
  ALL_ACTIVITY_LEVELS = 'all-activity-levels',
  _1__4_EDITS = '1..4-edits',
  _5__24_EDITS = '5..24-edits',
  _25__99_EDITS = '25..99-edits',
  _100___EDITS = '100..-edits',
}
export declare type NewPages = {
  items?: Maybe<Array<Maybe<Items6ListItem>>>;
};
export declare type Items6ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results4ListItem>>>;
};
export declare type Results4ListItem = {
  newPages?: Maybe<Scalars['Int']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type TopEditedPagesByAbsBytesDiff = {
  items?: Maybe<Array<Maybe<Items7ListItem>>>;
};
export declare type Items7ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results5ListItem>>>;
};
export declare type Results5ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<TopListItem>>>;
};
export declare type TopListItem = {
  absBytesDiff?: Maybe<Scalars['Float']>;
  pageTitle2?: Maybe<Scalars['String']>;
  rank?: Maybe<Scalars['Int']>;
};
export declare type TopEditedPagesByEdits = {
  items?: Maybe<Array<Maybe<Items8ListItem>>>;
};
export declare type Items8ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results6ListItem>>>;
};
export declare type Results6ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<Top2ListItem>>>;
};
export declare type Top2ListItem = {
  edits?: Maybe<Scalars['Float']>;
  pageTitle3?: Maybe<Scalars['String']>;
  rank?: Maybe<Scalars['Int']>;
};
export declare type TopEditedPagesByNetBytesDiff = {
  items?: Maybe<Array<Maybe<Items9ListItem>>>;
};
export declare type Items9ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results7ListItem>>>;
};
export declare type Results7ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<Top3ListItem>>>;
};
export declare type Top3ListItem = {
  netBytesDiff?: Maybe<Scalars['Float']>;
  pageTitle4?: Maybe<Scalars['String']>;
  rank?: Maybe<Scalars['Int']>;
};
export declare type Editors = {
  items?: Maybe<Array<Maybe<Items10ListItem>>>;
};
export declare type Items10ListItem = {
  activityLevel?: Maybe<Scalars['String']>;
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results8ListItem>>>;
};
export declare type Results8ListItem = {
  editors?: Maybe<Scalars['Int']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type TopEditorsByAbsBytesDiff = {
  items?: Maybe<Array<Maybe<Items11ListItem>>>;
};
export declare type Items11ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results9ListItem>>>;
};
export declare type Results9ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<Top4ListItem>>>;
};
export declare type Top4ListItem = {
  absBytesDiff?: Maybe<Scalars['Float']>;
  rank?: Maybe<Scalars['Int']>;
  userText?: Maybe<Scalars['String']>;
};
export declare type TopEditorsByEdits = {
  items?: Maybe<Array<Maybe<Items12ListItem>>>;
};
export declare type Items12ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results10ListItem>>>;
};
export declare type Results10ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<Top5ListItem>>>;
};
export declare type Top5ListItem = {
  edits?: Maybe<Scalars['Float']>;
  rank?: Maybe<Scalars['Int']>;
  userText?: Maybe<Scalars['String']>;
};
export declare type TopEditorsByNetBytesDiff = {
  items?: Maybe<Array<Maybe<Items13ListItem>>>;
};
export declare type Items13ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results11ListItem>>>;
};
export declare type Results11ListItem = {
  timestamp?: Maybe<Scalars['String']>;
  top?: Maybe<Array<Maybe<Top6ListItem>>>;
};
export declare type Top6ListItem = {
  netBytesDiff?: Maybe<Scalars['Float']>;
  rank?: Maybe<Scalars['Int']>;
  userText?: Maybe<Scalars['String']>;
};
export declare type MetricsEditsAggregate = {
  items?: Maybe<Array<Maybe<Items14ListItem>>>;
};
export declare type Items14ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageType?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results12ListItem>>>;
};
export declare type Results12ListItem = {
  edits?: Maybe<Scalars['Float']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type EditsPerPage = {
  items?: Maybe<Array<Maybe<Items15ListItem>>>;
};
export declare type Items15ListItem = {
  editorType?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  pageTitle?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results12ListItem>>>;
};
export declare type PagecountsProject = {
  items?: Maybe<Array<Maybe<Items16ListItem>>>;
};
export declare type Items16ListItem = {
  accessSite?: Maybe<Scalars['String']>;
  count?: Maybe<Scalars['Float']>;
  granularity?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare enum AccessSite3 {
  ALL_SITES = 'all-sites',
  DESKTOP_SITE = 'desktop-site',
  MOBILE_SITE = 'mobile-site',
}
export declare enum Granularity22 {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}
export declare type PageviewProject = {
  items?: Maybe<Array<Maybe<Items17ListItem>>>;
};
export declare type Items17ListItem = {
  access?: Maybe<Scalars['String']>;
  agent?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  timestamp?: Maybe<Scalars['String']>;
  views?: Maybe<Scalars['Float']>;
};
export declare enum Access5 {
  ALL_ACCESS = 'all-access',
  DESKTOP = 'desktop',
  MOBILE_APP = 'mobile-app',
  MOBILE_WEB = 'mobile-web',
}
export declare enum Agent3 {
  ALL_AGENTS = 'all-agents',
  USER = 'user',
  SPIDER = 'spider',
}
export declare type PageviewArticle = {
  items?: Maybe<Array<Maybe<Items18ListItem>>>;
};
export declare type Items18ListItem = {
  access?: Maybe<Scalars['String']>;
  agent?: Maybe<Scalars['String']>;
  article?: Maybe<Scalars['String']>;
  granularity?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  timestamp?: Maybe<Scalars['String']>;
  views?: Maybe<Scalars['Float']>;
};
export declare enum Agent4 {
  ALL_AGENTS = 'all-agents',
  USER = 'user',
  SPIDER = 'spider',
  BOT = 'bot',
}
export declare type ByCountry = {
  items?: Maybe<Array<Maybe<Items19ListItem>>>;
};
export declare type Items19ListItem = {
  access?: Maybe<Scalars['String']>;
  countries?: Maybe<Array<Maybe<CountriesListItem>>>;
  month?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  year?: Maybe<Scalars['String']>;
};
export declare type CountriesListItem = {
  country?: Maybe<Scalars['String']>;
  rank?: Maybe<Scalars['Int']>;
  views?: Maybe<Scalars['Float']>;
};
export declare type PageviewTops = {
  items?: Maybe<Array<Maybe<Items20ListItem>>>;
};
export declare type Items20ListItem = {
  access?: Maybe<Scalars['String']>;
  articles?: Maybe<Array<Maybe<ArticlesListItem>>>;
  day?: Maybe<Scalars['String']>;
  month?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  year?: Maybe<Scalars['String']>;
};
export declare type ArticlesListItem = {
  article?: Maybe<Scalars['String']>;
  rank?: Maybe<Scalars['Int']>;
  views?: Maybe<Scalars['Float']>;
};
export declare type NewRegisteredUsers = {
  items?: Maybe<Array<Maybe<Items21ListItem>>>;
};
export declare type Items21ListItem = {
  granularity?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<Results13ListItem>>>;
};
export declare type Results13ListItem = {
  newRegisteredUsers?: Maybe<Scalars['Int']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type UniqueDevices = {
  items?: Maybe<Array<Maybe<Items22ListItem>>>;
};
export declare type Items22ListItem = {
  accessSite?: Maybe<Scalars['String']>;
  devices?: Maybe<Scalars['Float']>;
  granularity?: Maybe<Scalars['String']>;
  project?: Maybe<Scalars['String']>;
  timestamp?: Maybe<Scalars['String']>;
};
export declare type CxLanguagepairs = {
  /** the list of available source languages */
  source?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** the list of available destination languages */
  target?: Maybe<Array<Maybe<Scalars['String']>>>;
};
export declare type CxListTools = {
  /** the list of tools available for the given language pair */
  tools?: Maybe<Array<Maybe<Scalars['String']>>>;
};
export declare enum Tool {
  MT = 'mt',
  DICTIONARY = 'dictionary',
}
export declare type CxDict = {
  /** the original word to look up */
  source?: Maybe<Scalars['String']>;
  /** the translations found */
  translations?: Maybe<Array<Maybe<TranslationsListItem>>>;
};
export declare type TranslationsListItem = {
  /** extra information about the phrase */
  info?: Maybe<Scalars['String']>;
  /** the translated phrase */
  phrase?: Maybe<Scalars['String']>;
  /** the source dictionary used for the translation */
  sources?: Maybe<Scalars['String']>;
};
export declare enum Provider2 {
  JSONDICT = 'JsonDict',
  DICTD = 'Dictd',
}
export declare type Mutation = {
  /**
   * Checks the supplied TeX formula for correctness and returns the
   * normalised formula representation as well as information about
   * identifiers. Available types are tex and inline-tex. The response
   * contains the `x-resource-location` header which can be used to retrieve
   * the render of the checked formula in one of the supported rendering
   * formats. Just append the value of the header to `/media/math/{format}/`
   * and perform a GET request against that URL.
   *
   * Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).
   *
   *
   * Equivalent to POST /media/math/check/{type}
   */
  postMediaMathCheckType?: Maybe<Scalars['JSON']>;
  /**
   * Fetches the machine translation for the posted content from the source
   * to the destination language.
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to POST /transform/html/from/{from_lang}/to/{to_lang}
   */
  postTransformHtmlFromFromLangToToLang?: Maybe<CxMt>;
  /**
   * Fetches the machine translation for the posted content from the source
   * to the destination language.
   *
   * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
   *
   *
   * Equivalent to POST /transform/html/from/{from_lang}/to/{to_lang}/{provider}
   */
  postTransformHtmlFromFromLangToToLangProvider?: Maybe<CxMt>;
};
export declare type MutationpostMediaMathCheckTypeArgs = {
  mediaMathCheckInput: MediaMathCheckInput;
  type: Type;
};
export declare type MutationpostTransformHtmlFromFromLangToToLangArgs = {
  fromLang: Scalars['String'];
  toLang: Scalars['String'];
  transformHtmlFromToInput: TransformHtmlFromToInput;
};
export declare type MutationpostTransformHtmlFromFromLangToToLangProviderArgs = {
  fromLang: Scalars['String'];
  provider: Provider;
  toLang: Scalars['String'];
  transformHtmlFromToInput: TransformHtmlFromToInput;
};
export declare type MediaMathCheckInput = {
  /** The formula to check */
  q: Scalars['String'];
};
export declare enum Type {
  TEX = 'tex',
  INLINE_TEX = 'inline-tex',
  CHEM = 'chem',
}
export declare type CxMt = {
  /** the translated content */
  contents?: Maybe<Scalars['String']>;
};
export declare type TransformHtmlFromToInput = {
  /** The HTML content to translate */
  html: Scalars['String'];
};
export declare enum Provider {
  APERTIUM = 'Apertium',
  YANDEX = 'Yandex',
  YOUDAO = 'Youdao',
}
export declare type WithIndex<TObject> = TObject & Record<string, any>;
export declare type ResolversObject<TObject> = WithIndex<TObject>;
export declare type ResolverTypeWrapper<T> = Promise<T> | T;
export declare type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export declare type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;
export declare type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;
export declare type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;
export declare type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;
export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<
    {
      [key in TKey]: TResult;
    },
    TParent,
    TContext,
    TArgs
  >;
  resolve?: SubscriptionResolveFn<
    TResult,
    {
      [key in TKey]: TResult;
    },
    TContext,
    TArgs
  >;
}
export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}
export declare type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;
export declare type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;
export declare type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;
export declare type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;
export declare type NextResolverFn<T> = () => Promise<T>;
export declare type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;
/** Mapping between all available schema types and the resolvers types */
export declare type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>;
  Availability: ResolverTypeWrapper<Availability>;
  String: ResolverTypeWrapper<Scalars['String']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']>;
  Format: Format;
  AbsoluteBytesDifference: ResolverTypeWrapper<AbsoluteBytesDifference>;
  ItemsListItem: ResolverTypeWrapper<ItemsListItem>;
  ResultsListItem: ResolverTypeWrapper<ResultsListItem>;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  EditorType16: EditorType16;
  Granularity21: Granularity21;
  PageType13: PageType13;
  AbsoluteBytesDifferencePerPage: ResolverTypeWrapper<AbsoluteBytesDifferencePerPage>;
  Items2ListItem: ResolverTypeWrapper<Items2ListItem>;
  NetBytesDifference: ResolverTypeWrapper<NetBytesDifference>;
  Items3ListItem: ResolverTypeWrapper<Items3ListItem>;
  Results2ListItem: ResolverTypeWrapper<Results2ListItem>;
  NetBytesDifferencePerPage: ResolverTypeWrapper<NetBytesDifferencePerPage>;
  Items4ListItem: ResolverTypeWrapper<Items4ListItem>;
  EditedPages: ResolverTypeWrapper<EditedPages>;
  Items5ListItem: ResolverTypeWrapper<Items5ListItem>;
  Results3ListItem: ResolverTypeWrapper<Results3ListItem>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  ActivityLevel3: ActivityLevel3;
  NewPages: ResolverTypeWrapper<NewPages>;
  Items6ListItem: ResolverTypeWrapper<Items6ListItem>;
  Results4ListItem: ResolverTypeWrapper<Results4ListItem>;
  TopEditedPagesByAbsBytesDiff: ResolverTypeWrapper<TopEditedPagesByAbsBytesDiff>;
  Items7ListItem: ResolverTypeWrapper<Items7ListItem>;
  Results5ListItem: ResolverTypeWrapper<Results5ListItem>;
  TopListItem: ResolverTypeWrapper<TopListItem>;
  TopEditedPagesByEdits: ResolverTypeWrapper<TopEditedPagesByEdits>;
  Items8ListItem: ResolverTypeWrapper<Items8ListItem>;
  Results6ListItem: ResolverTypeWrapper<Results6ListItem>;
  Top2ListItem: ResolverTypeWrapper<Top2ListItem>;
  TopEditedPagesByNetBytesDiff: ResolverTypeWrapper<TopEditedPagesByNetBytesDiff>;
  Items9ListItem: ResolverTypeWrapper<Items9ListItem>;
  Results7ListItem: ResolverTypeWrapper<Results7ListItem>;
  Top3ListItem: ResolverTypeWrapper<Top3ListItem>;
  Editors: ResolverTypeWrapper<Editors>;
  Items10ListItem: ResolverTypeWrapper<Items10ListItem>;
  Results8ListItem: ResolverTypeWrapper<Results8ListItem>;
  TopEditorsByAbsBytesDiff: ResolverTypeWrapper<TopEditorsByAbsBytesDiff>;
  Items11ListItem: ResolverTypeWrapper<Items11ListItem>;
  Results9ListItem: ResolverTypeWrapper<Results9ListItem>;
  Top4ListItem: ResolverTypeWrapper<Top4ListItem>;
  TopEditorsByEdits: ResolverTypeWrapper<TopEditorsByEdits>;
  Items12ListItem: ResolverTypeWrapper<Items12ListItem>;
  Results10ListItem: ResolverTypeWrapper<Results10ListItem>;
  Top5ListItem: ResolverTypeWrapper<Top5ListItem>;
  TopEditorsByNetBytesDiff: ResolverTypeWrapper<TopEditorsByNetBytesDiff>;
  Items13ListItem: ResolverTypeWrapper<Items13ListItem>;
  Results11ListItem: ResolverTypeWrapper<Results11ListItem>;
  Top6ListItem: ResolverTypeWrapper<Top6ListItem>;
  MetricsEditsAggregate: ResolverTypeWrapper<MetricsEditsAggregate>;
  Items14ListItem: ResolverTypeWrapper<Items14ListItem>;
  Results12ListItem: ResolverTypeWrapper<Results12ListItem>;
  EditsPerPage: ResolverTypeWrapper<EditsPerPage>;
  Items15ListItem: ResolverTypeWrapper<Items15ListItem>;
  PagecountsProject: ResolverTypeWrapper<PagecountsProject>;
  Items16ListItem: ResolverTypeWrapper<Items16ListItem>;
  AccessSite3: AccessSite3;
  Granularity22: Granularity22;
  PageviewProject: ResolverTypeWrapper<PageviewProject>;
  Items17ListItem: ResolverTypeWrapper<Items17ListItem>;
  Access5: Access5;
  Agent3: Agent3;
  PageviewArticle: ResolverTypeWrapper<PageviewArticle>;
  Items18ListItem: ResolverTypeWrapper<Items18ListItem>;
  Agent4: Agent4;
  ByCountry: ResolverTypeWrapper<ByCountry>;
  Items19ListItem: ResolverTypeWrapper<Items19ListItem>;
  CountriesListItem: ResolverTypeWrapper<CountriesListItem>;
  PageviewTops: ResolverTypeWrapper<PageviewTops>;
  Items20ListItem: ResolverTypeWrapper<Items20ListItem>;
  ArticlesListItem: ResolverTypeWrapper<ArticlesListItem>;
  NewRegisteredUsers: ResolverTypeWrapper<NewRegisteredUsers>;
  Items21ListItem: ResolverTypeWrapper<Items21ListItem>;
  Results13ListItem: ResolverTypeWrapper<Results13ListItem>;
  UniqueDevices: ResolverTypeWrapper<UniqueDevices>;
  Items22ListItem: ResolverTypeWrapper<Items22ListItem>;
  CxLanguagepairs: ResolverTypeWrapper<CxLanguagepairs>;
  CxListTools: ResolverTypeWrapper<CxListTools>;
  Tool: Tool;
  CxDict: ResolverTypeWrapper<CxDict>;
  TranslationsListItem: ResolverTypeWrapper<TranslationsListItem>;
  Provider2: Provider2;
  Mutation: ResolverTypeWrapper<{}>;
  MediaMathCheckInput: MediaMathCheckInput;
  Type: Type;
  CxMt: ResolverTypeWrapper<CxMt>;
  TransformHtmlFromToInput: TransformHtmlFromToInput;
  Provider: Provider;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
}>;
/** Mapping between all available schema types and the resolvers parents */
export declare type ResolversParentTypes = ResolversObject<{
  Query: {};
  Availability: Availability;
  String: Scalars['String'];
  JSON: Scalars['JSON'];
  AbsoluteBytesDifference: AbsoluteBytesDifference;
  ItemsListItem: ItemsListItem;
  ResultsListItem: ResultsListItem;
  Float: Scalars['Float'];
  AbsoluteBytesDifferencePerPage: AbsoluteBytesDifferencePerPage;
  Items2ListItem: Items2ListItem;
  NetBytesDifference: NetBytesDifference;
  Items3ListItem: Items3ListItem;
  Results2ListItem: Results2ListItem;
  NetBytesDifferencePerPage: NetBytesDifferencePerPage;
  Items4ListItem: Items4ListItem;
  EditedPages: EditedPages;
  Items5ListItem: Items5ListItem;
  Results3ListItem: Results3ListItem;
  Int: Scalars['Int'];
  NewPages: NewPages;
  Items6ListItem: Items6ListItem;
  Results4ListItem: Results4ListItem;
  TopEditedPagesByAbsBytesDiff: TopEditedPagesByAbsBytesDiff;
  Items7ListItem: Items7ListItem;
  Results5ListItem: Results5ListItem;
  TopListItem: TopListItem;
  TopEditedPagesByEdits: TopEditedPagesByEdits;
  Items8ListItem: Items8ListItem;
  Results6ListItem: Results6ListItem;
  Top2ListItem: Top2ListItem;
  TopEditedPagesByNetBytesDiff: TopEditedPagesByNetBytesDiff;
  Items9ListItem: Items9ListItem;
  Results7ListItem: Results7ListItem;
  Top3ListItem: Top3ListItem;
  Editors: Editors;
  Items10ListItem: Items10ListItem;
  Results8ListItem: Results8ListItem;
  TopEditorsByAbsBytesDiff: TopEditorsByAbsBytesDiff;
  Items11ListItem: Items11ListItem;
  Results9ListItem: Results9ListItem;
  Top4ListItem: Top4ListItem;
  TopEditorsByEdits: TopEditorsByEdits;
  Items12ListItem: Items12ListItem;
  Results10ListItem: Results10ListItem;
  Top5ListItem: Top5ListItem;
  TopEditorsByNetBytesDiff: TopEditorsByNetBytesDiff;
  Items13ListItem: Items13ListItem;
  Results11ListItem: Results11ListItem;
  Top6ListItem: Top6ListItem;
  MetricsEditsAggregate: MetricsEditsAggregate;
  Items14ListItem: Items14ListItem;
  Results12ListItem: Results12ListItem;
  EditsPerPage: EditsPerPage;
  Items15ListItem: Items15ListItem;
  PagecountsProject: PagecountsProject;
  Items16ListItem: Items16ListItem;
  PageviewProject: PageviewProject;
  Items17ListItem: Items17ListItem;
  PageviewArticle: PageviewArticle;
  Items18ListItem: Items18ListItem;
  ByCountry: ByCountry;
  Items19ListItem: Items19ListItem;
  CountriesListItem: CountriesListItem;
  PageviewTops: PageviewTops;
  Items20ListItem: Items20ListItem;
  ArticlesListItem: ArticlesListItem;
  NewRegisteredUsers: NewRegisteredUsers;
  Items21ListItem: Items21ListItem;
  Results13ListItem: Results13ListItem;
  UniqueDevices: UniqueDevices;
  Items22ListItem: Items22ListItem;
  CxLanguagepairs: CxLanguagepairs;
  CxListTools: CxListTools;
  CxDict: CxDict;
  TranslationsListItem: TranslationsListItem;
  Mutation: {};
  MediaMathCheckInput: MediaMathCheckInput;
  CxMt: CxMt;
  TransformHtmlFromToInput: TransformHtmlFromToInput;
  Boolean: Scalars['Boolean'];
}>;
export declare type QueryResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = ResolversObject<{
  getFeedAvailability?: Resolver<Maybe<ResolversTypes['Availability']>, ParentType, ContextType>;
  getMediaMathFormulaHash?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetMediaMathFormulaHashArgs, 'hash'>
  >;
  getMediaMathRenderFormatHash?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetMediaMathRenderFormatHashArgs, 'format' | 'hash'>
  >;
  getMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['AbsoluteBytesDifference']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['AbsoluteBytesDifferencePerPage']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageTitle' | 'project' | 'start'
    >
  >;
  getMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['NetBytesDifference']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['NetBytesDifferencePerPage']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageTitle' | 'project' | 'start'
    >
  >;
  getMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['EditedPages']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs,
      'activityLevel' | 'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['NewPages']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditedPagesByAbsBytesDiff']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditedPagesByEdits']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditedPagesByNetBytesDiff']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['Editors']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs,
      'activityLevel' | 'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditorsByAbsBytesDiff']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditorsByEdits']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay?: Resolver<
    Maybe<ResolversTypes['TopEditorsByNetBytesDiff']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
      'day' | 'editorType' | 'month' | 'pageType' | 'project' | 'year'
    >
  >;
  getMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['MetricsEditsAggregate']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageType' | 'project' | 'start'
    >
  >;
  getMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['EditsPerPage']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
      'editorType' | 'end' | 'granularity' | 'pageTitle' | 'project' | 'start'
    >
  >;
  getMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['PagecountsProject']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEndArgs,
      'accessSite' | 'end' | 'granularity' | 'project' | 'start'
    >
  >;
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['PageviewProject']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsPageviewsAggregateProjectAccessAgentGranularityStartEndArgs,
      'access' | 'agent' | 'end' | 'granularity' | 'project' | 'start'
    >
  >;
  getMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['PageviewArticle']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEndArgs,
      'access' | 'agent' | 'article' | 'end' | 'granularity' | 'project' | 'start'
    >
  >;
  getMetricsPageviewsTopByCountryProjectAccessYearMonth?: Resolver<
    Maybe<ResolversTypes['ByCountry']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsPageviewsTopByCountryProjectAccessYearMonthArgs,
      'access' | 'month' | 'project' | 'year'
    >
  >;
  getMetricsPageviewsTopProjectAccessYearMonthDay?: Resolver<
    Maybe<ResolversTypes['PageviewTops']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsPageviewsTopProjectAccessYearMonthDayArgs,
      'access' | 'day' | 'month' | 'project' | 'year'
    >
  >;
  getMetricsRegisteredUsersNewProjectGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['NewRegisteredUsers']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsRegisteredUsersNewProjectGranularityStartEndArgs,
      'end' | 'granularity' | 'project' | 'start'
    >
  >;
  getMetricsUniqueDevicesProjectAccessSiteGranularityStartEnd?: Resolver<
    Maybe<ResolversTypes['UniqueDevices']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetMetricsUniqueDevicesProjectAccessSiteGranularityStartEndArgs,
      'accessSite' | 'end' | 'granularity' | 'project' | 'start'
    >
  >;
  getTransformListLanguagepairs?: Resolver<Maybe<ResolversTypes['CxLanguagepairs']>, ParentType, ContextType>;
  getTransformListPairFromTo?: Resolver<
    Maybe<ResolversTypes['CxListTools']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetTransformListPairFromToArgs, 'from' | 'to'>
  >;
  getTransformListToolTool?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetTransformListToolToolArgs, 'tool'>
  >;
  getTransformListToolToolFrom?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetTransformListToolToolFromArgs, 'from' | 'tool'>
  >;
  getTransformListToolToolFromTo?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetTransformListToolToolFromToArgs, 'from' | 'to' | 'tool'>
  >;
  getTransformWordFromFromLangToToLangWord?: Resolver<
    Maybe<ResolversTypes['CxDict']>,
    ParentType,
    ContextType,
    RequireFields<QuerygetTransformWordFromFromLangToToLangWordArgs, 'fromLang' | 'toLang' | 'word'>
  >;
  getTransformWordFromFromLangToToLangWordProvider?: Resolver<
    Maybe<ResolversTypes['CxDict']>,
    ParentType,
    ContextType,
    RequireFields<
      QuerygetTransformWordFromFromLangToToLangWordProviderArgs,
      'fromLang' | 'provider' | 'toLang' | 'word'
    >
  >;
  viewsInPastMonth?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType,
    RequireFields<QueryviewsInPastMonthArgs, 'project'>
  >;
}>;
export declare type AvailabilityResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Availability'] = ResolversParentTypes['Availability']
> = ResolversObject<{
  inTheNews?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  mostRead?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  onThisDay?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  pictureOfTheDay?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  todaysFeaturedArticle?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export interface JSONScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}
export declare type FormatResolvers = {
  SVG: 'svg';
  MML: 'mml';
  PNG: 'png';
};
export declare type AbsoluteBytesDifferenceResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['AbsoluteBytesDifference'] = ResolversParentTypes['AbsoluteBytesDifference']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['ItemsListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ItemsListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['ItemsListItem'] = ResolversParentTypes['ItemsListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['ResultsListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ResultsListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['ResultsListItem'] = ResolversParentTypes['ResultsListItem']
> = ResolversObject<{
  absBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type EditorType16Resolvers = {
  ALL_EDITOR_TYPES: 'all-editor-types';
  ANONYMOUS: 'anonymous';
  GROUP_BOT: 'group-bot';
  NAME_BOT: 'name-bot';
  USER: 'user';
};
export declare type Granularity21Resolvers = {
  DAILY: 'daily';
  MONTHLY: 'monthly';
};
export declare type PageType13Resolvers = {
  ALL_PAGE_TYPES: 'all-page-types';
  CONTENT: 'content';
  NON_CONTENT: 'non-content';
};
export declare type AbsoluteBytesDifferencePerPageResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['AbsoluteBytesDifferencePerPage'] = ResolversParentTypes['AbsoluteBytesDifferencePerPage']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items2ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items2ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items2ListItem'] = ResolversParentTypes['Items2ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['ResultsListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type NetBytesDifferenceResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['NetBytesDifference'] = ResolversParentTypes['NetBytesDifference']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items3ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items3ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items3ListItem'] = ResolversParentTypes['Items3ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results2ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results2ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results2ListItem'] = ResolversParentTypes['Results2ListItem']
> = ResolversObject<{
  netBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type NetBytesDifferencePerPageResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['NetBytesDifferencePerPage'] = ResolversParentTypes['NetBytesDifferencePerPage']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items4ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items4ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items4ListItem'] = ResolversParentTypes['Items4ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results2ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type EditedPagesResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['EditedPages'] = ResolversParentTypes['EditedPages']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items5ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items5ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items5ListItem'] = ResolversParentTypes['Items5ListItem']
> = ResolversObject<{
  activityLevel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results3ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results3ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results3ListItem'] = ResolversParentTypes['Results3ListItem']
> = ResolversObject<{
  editedPages?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ActivityLevel3Resolvers = {
  ALL_ACTIVITY_LEVELS: 'all-activity-levels';
  _1__4_EDITS: '1..4-edits';
  _5__24_EDITS: '5..24-edits';
  _25__99_EDITS: '25..99-edits';
  _100___EDITS: '100..-edits';
};
export declare type NewPagesResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['NewPages'] = ResolversParentTypes['NewPages']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items6ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items6ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items6ListItem'] = ResolversParentTypes['Items6ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results4ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results4ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results4ListItem'] = ResolversParentTypes['Results4ListItem']
> = ResolversObject<{
  newPages?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditedPagesByAbsBytesDiffResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditedPagesByAbsBytesDiff'] = ResolversParentTypes['TopEditedPagesByAbsBytesDiff']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items7ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items7ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items7ListItem'] = ResolversParentTypes['Items7ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results5ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results5ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results5ListItem'] = ResolversParentTypes['Results5ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['TopListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopListItem'] = ResolversParentTypes['TopListItem']
> = ResolversObject<{
  absBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  pageTitle2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditedPagesByEditsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditedPagesByEdits'] = ResolversParentTypes['TopEditedPagesByEdits']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items8ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items8ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items8ListItem'] = ResolversParentTypes['Items8ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results6ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results6ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results6ListItem'] = ResolversParentTypes['Results6ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['Top2ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Top2ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Top2ListItem'] = ResolversParentTypes['Top2ListItem']
> = ResolversObject<{
  edits?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  pageTitle3?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditedPagesByNetBytesDiffResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditedPagesByNetBytesDiff'] = ResolversParentTypes['TopEditedPagesByNetBytesDiff']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items9ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items9ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items9ListItem'] = ResolversParentTypes['Items9ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results7ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results7ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results7ListItem'] = ResolversParentTypes['Results7ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['Top3ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Top3ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Top3ListItem'] = ResolversParentTypes['Top3ListItem']
> = ResolversObject<{
  netBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  pageTitle4?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type EditorsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Editors'] = ResolversParentTypes['Editors']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items10ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items10ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items10ListItem'] = ResolversParentTypes['Items10ListItem']
> = ResolversObject<{
  activityLevel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results8ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results8ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results8ListItem'] = ResolversParentTypes['Results8ListItem']
> = ResolversObject<{
  editors?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditorsByAbsBytesDiffResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditorsByAbsBytesDiff'] = ResolversParentTypes['TopEditorsByAbsBytesDiff']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items11ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items11ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items11ListItem'] = ResolversParentTypes['Items11ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results9ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results9ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results9ListItem'] = ResolversParentTypes['Results9ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['Top4ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Top4ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Top4ListItem'] = ResolversParentTypes['Top4ListItem']
> = ResolversObject<{
  absBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  userText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditorsByEditsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditorsByEdits'] = ResolversParentTypes['TopEditorsByEdits']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items12ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items12ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items12ListItem'] = ResolversParentTypes['Items12ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results10ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results10ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results10ListItem'] = ResolversParentTypes['Results10ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['Top5ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Top5ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Top5ListItem'] = ResolversParentTypes['Top5ListItem']
> = ResolversObject<{
  edits?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  userText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TopEditorsByNetBytesDiffResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TopEditorsByNetBytesDiff'] = ResolversParentTypes['TopEditorsByNetBytesDiff']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items13ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items13ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items13ListItem'] = ResolversParentTypes['Items13ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results11ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results11ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results11ListItem'] = ResolversParentTypes['Results11ListItem']
> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  top?: Resolver<Maybe<Array<Maybe<ResolversTypes['Top6ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Top6ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Top6ListItem'] = ResolversParentTypes['Top6ListItem']
> = ResolversObject<{
  netBytesDiff?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  userText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type MetricsEditsAggregateResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['MetricsEditsAggregate'] = ResolversParentTypes['MetricsEditsAggregate']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items14ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items14ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items14ListItem'] = ResolversParentTypes['Items14ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results12ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results12ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results12ListItem'] = ResolversParentTypes['Results12ListItem']
> = ResolversObject<{
  edits?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type EditsPerPageResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['EditsPerPage'] = ResolversParentTypes['EditsPerPage']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items15ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items15ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items15ListItem'] = ResolversParentTypes['Items15ListItem']
> = ResolversObject<{
  editorType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pageTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results12ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type PagecountsProjectResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['PagecountsProject'] = ResolversParentTypes['PagecountsProject']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items16ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items16ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items16ListItem'] = ResolversParentTypes['Items16ListItem']
> = ResolversObject<{
  accessSite?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  count?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type AccessSite3Resolvers = {
  ALL_SITES: 'all-sites';
  DESKTOP_SITE: 'desktop-site';
  MOBILE_SITE: 'mobile-site';
};
export declare type Granularity22Resolvers = {
  HOURLY: 'hourly';
  DAILY: 'daily';
  MONTHLY: 'monthly';
};
export declare type PageviewProjectResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['PageviewProject'] = ResolversParentTypes['PageviewProject']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items17ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items17ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items17ListItem'] = ResolversParentTypes['Items17ListItem']
> = ResolversObject<{
  access?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  agent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  views?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Access5Resolvers = {
  ALL_ACCESS: 'all-access';
  DESKTOP: 'desktop';
  MOBILE_APP: 'mobile-app';
  MOBILE_WEB: 'mobile-web';
};
export declare type Agent3Resolvers = {
  ALL_AGENTS: 'all-agents';
  USER: 'user';
  SPIDER: 'spider';
};
export declare type PageviewArticleResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['PageviewArticle'] = ResolversParentTypes['PageviewArticle']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items18ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items18ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items18ListItem'] = ResolversParentTypes['Items18ListItem']
> = ResolversObject<{
  access?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  agent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  article?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  views?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Agent4Resolvers = {
  ALL_AGENTS: 'all-agents';
  USER: 'user';
  SPIDER: 'spider';
  BOT: 'bot';
};
export declare type ByCountryResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['ByCountry'] = ResolversParentTypes['ByCountry']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items19ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items19ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items19ListItem'] = ResolversParentTypes['Items19ListItem']
> = ResolversObject<{
  access?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countries?: Resolver<Maybe<Array<Maybe<ResolversTypes['CountriesListItem']>>>, ParentType, ContextType>;
  month?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type CountriesListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['CountriesListItem'] = ResolversParentTypes['CountriesListItem']
> = ResolversObject<{
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  views?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type PageviewTopsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['PageviewTops'] = ResolversParentTypes['PageviewTops']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items20ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items20ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items20ListItem'] = ResolversParentTypes['Items20ListItem']
> = ResolversObject<{
  access?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  articles?: Resolver<Maybe<Array<Maybe<ResolversTypes['ArticlesListItem']>>>, ParentType, ContextType>;
  day?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  month?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ArticlesListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['ArticlesListItem'] = ResolversParentTypes['ArticlesListItem']
> = ResolversObject<{
  article?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  views?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type NewRegisteredUsersResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['NewRegisteredUsers'] = ResolversParentTypes['NewRegisteredUsers']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items21ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items21ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items21ListItem'] = ResolversParentTypes['Items21ListItem']
> = ResolversObject<{
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Maybe<Array<Maybe<ResolversTypes['Results13ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Results13ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Results13ListItem'] = ResolversParentTypes['Results13ListItem']
> = ResolversObject<{
  newRegisteredUsers?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type UniqueDevicesResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['UniqueDevices'] = ResolversParentTypes['UniqueDevices']
> = ResolversObject<{
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['Items22ListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Items22ListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Items22ListItem'] = ResolversParentTypes['Items22ListItem']
> = ResolversObject<{
  accessSite?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  devices?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  granularity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type CxLanguagepairsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['CxLanguagepairs'] = ResolversParentTypes['CxLanguagepairs']
> = ResolversObject<{
  source?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  target?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type CxListToolsResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['CxListTools'] = ResolversParentTypes['CxListTools']
> = ResolversObject<{
  tools?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ToolResolvers = {
  MT: 'mt';
  DICTIONARY: 'dictionary';
};
export declare type CxDictResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['CxDict'] = ResolversParentTypes['CxDict']
> = ResolversObject<{
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Maybe<Array<Maybe<ResolversTypes['TranslationsListItem']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type TranslationsListItemResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['TranslationsListItem'] = ResolversParentTypes['TranslationsListItem']
> = ResolversObject<{
  info?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phrase?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sources?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type Provider2Resolvers = {
  JSONDICT: 'JsonDict';
  DICTD: 'Dictd';
};
export declare type MutationResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']
> = ResolversObject<{
  postMediaMathCheckType?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType,
    RequireFields<MutationpostMediaMathCheckTypeArgs, 'mediaMathCheckInput' | 'type'>
  >;
  postTransformHtmlFromFromLangToToLang?: Resolver<
    Maybe<ResolversTypes['CxMt']>,
    ParentType,
    ContextType,
    RequireFields<MutationpostTransformHtmlFromFromLangToToLangArgs, 'fromLang' | 'toLang' | 'transformHtmlFromToInput'>
  >;
  postTransformHtmlFromFromLangToToLangProvider?: Resolver<
    Maybe<ResolversTypes['CxMt']>,
    ParentType,
    ContextType,
    RequireFields<
      MutationpostTransformHtmlFromFromLangToToLangProviderArgs,
      'fromLang' | 'provider' | 'toLang' | 'transformHtmlFromToInput'
    >
  >;
}>;
export declare type TypeResolvers = {
  TEX: 'tex';
  INLINE_TEX: 'inline-tex';
  CHEM: 'chem';
};
export declare type CxMtResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes['CxMt'] = ResolversParentTypes['CxMt']
> = ResolversObject<{
  contents?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export declare type ProviderResolvers = {
  APERTIUM: 'Apertium';
  YANDEX: 'Yandex';
  YOUDAO: 'Youdao';
};
export declare type Resolvers<ContextType = MeshContext> = ResolversObject<{
  Query?: QueryResolvers<ContextType>;
  Availability?: AvailabilityResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Format?: FormatResolvers;
  AbsoluteBytesDifference?: AbsoluteBytesDifferenceResolvers<ContextType>;
  ItemsListItem?: ItemsListItemResolvers<ContextType>;
  ResultsListItem?: ResultsListItemResolvers<ContextType>;
  EditorType16?: EditorType16Resolvers;
  Granularity21?: Granularity21Resolvers;
  PageType13?: PageType13Resolvers;
  AbsoluteBytesDifferencePerPage?: AbsoluteBytesDifferencePerPageResolvers<ContextType>;
  Items2ListItem?: Items2ListItemResolvers<ContextType>;
  NetBytesDifference?: NetBytesDifferenceResolvers<ContextType>;
  Items3ListItem?: Items3ListItemResolvers<ContextType>;
  Results2ListItem?: Results2ListItemResolvers<ContextType>;
  NetBytesDifferencePerPage?: NetBytesDifferencePerPageResolvers<ContextType>;
  Items4ListItem?: Items4ListItemResolvers<ContextType>;
  EditedPages?: EditedPagesResolvers<ContextType>;
  Items5ListItem?: Items5ListItemResolvers<ContextType>;
  Results3ListItem?: Results3ListItemResolvers<ContextType>;
  ActivityLevel3?: ActivityLevel3Resolvers;
  NewPages?: NewPagesResolvers<ContextType>;
  Items6ListItem?: Items6ListItemResolvers<ContextType>;
  Results4ListItem?: Results4ListItemResolvers<ContextType>;
  TopEditedPagesByAbsBytesDiff?: TopEditedPagesByAbsBytesDiffResolvers<ContextType>;
  Items7ListItem?: Items7ListItemResolvers<ContextType>;
  Results5ListItem?: Results5ListItemResolvers<ContextType>;
  TopListItem?: TopListItemResolvers<ContextType>;
  TopEditedPagesByEdits?: TopEditedPagesByEditsResolvers<ContextType>;
  Items8ListItem?: Items8ListItemResolvers<ContextType>;
  Results6ListItem?: Results6ListItemResolvers<ContextType>;
  Top2ListItem?: Top2ListItemResolvers<ContextType>;
  TopEditedPagesByNetBytesDiff?: TopEditedPagesByNetBytesDiffResolvers<ContextType>;
  Items9ListItem?: Items9ListItemResolvers<ContextType>;
  Results7ListItem?: Results7ListItemResolvers<ContextType>;
  Top3ListItem?: Top3ListItemResolvers<ContextType>;
  Editors?: EditorsResolvers<ContextType>;
  Items10ListItem?: Items10ListItemResolvers<ContextType>;
  Results8ListItem?: Results8ListItemResolvers<ContextType>;
  TopEditorsByAbsBytesDiff?: TopEditorsByAbsBytesDiffResolvers<ContextType>;
  Items11ListItem?: Items11ListItemResolvers<ContextType>;
  Results9ListItem?: Results9ListItemResolvers<ContextType>;
  Top4ListItem?: Top4ListItemResolvers<ContextType>;
  TopEditorsByEdits?: TopEditorsByEditsResolvers<ContextType>;
  Items12ListItem?: Items12ListItemResolvers<ContextType>;
  Results10ListItem?: Results10ListItemResolvers<ContextType>;
  Top5ListItem?: Top5ListItemResolvers<ContextType>;
  TopEditorsByNetBytesDiff?: TopEditorsByNetBytesDiffResolvers<ContextType>;
  Items13ListItem?: Items13ListItemResolvers<ContextType>;
  Results11ListItem?: Results11ListItemResolvers<ContextType>;
  Top6ListItem?: Top6ListItemResolvers<ContextType>;
  MetricsEditsAggregate?: MetricsEditsAggregateResolvers<ContextType>;
  Items14ListItem?: Items14ListItemResolvers<ContextType>;
  Results12ListItem?: Results12ListItemResolvers<ContextType>;
  EditsPerPage?: EditsPerPageResolvers<ContextType>;
  Items15ListItem?: Items15ListItemResolvers<ContextType>;
  PagecountsProject?: PagecountsProjectResolvers<ContextType>;
  Items16ListItem?: Items16ListItemResolvers<ContextType>;
  AccessSite3?: AccessSite3Resolvers;
  Granularity22?: Granularity22Resolvers;
  PageviewProject?: PageviewProjectResolvers<ContextType>;
  Items17ListItem?: Items17ListItemResolvers<ContextType>;
  Access5?: Access5Resolvers;
  Agent3?: Agent3Resolvers;
  PageviewArticle?: PageviewArticleResolvers<ContextType>;
  Items18ListItem?: Items18ListItemResolvers<ContextType>;
  Agent4?: Agent4Resolvers;
  ByCountry?: ByCountryResolvers<ContextType>;
  Items19ListItem?: Items19ListItemResolvers<ContextType>;
  CountriesListItem?: CountriesListItemResolvers<ContextType>;
  PageviewTops?: PageviewTopsResolvers<ContextType>;
  Items20ListItem?: Items20ListItemResolvers<ContextType>;
  ArticlesListItem?: ArticlesListItemResolvers<ContextType>;
  NewRegisteredUsers?: NewRegisteredUsersResolvers<ContextType>;
  Items21ListItem?: Items21ListItemResolvers<ContextType>;
  Results13ListItem?: Results13ListItemResolvers<ContextType>;
  UniqueDevices?: UniqueDevicesResolvers<ContextType>;
  Items22ListItem?: Items22ListItemResolvers<ContextType>;
  CxLanguagepairs?: CxLanguagepairsResolvers<ContextType>;
  CxListTools?: CxListToolsResolvers<ContextType>;
  Tool?: ToolResolvers;
  CxDict?: CxDictResolvers<ContextType>;
  TranslationsListItem?: TranslationsListItemResolvers<ContextType>;
  Provider2?: Provider2Resolvers;
  Mutation?: MutationResolvers<ContextType>;
  Type?: TypeResolvers;
  CxMt?: CxMtResolvers<ContextType>;
  Provider?: ProviderResolvers;
}>;
import { MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import { InContextSdkMethod } from '@graphql-mesh/types';
export declare type QueryWikiSdk = {
  getFeedAvailability: InContextSdkMethod<Query['getFeedAvailability'], {}, MeshContext>;
  getMediaMathFormulaHash: InContextSdkMethod<
    Query['getMediaMathFormulaHash'],
    QuerygetMediaMathFormulaHashArgs,
    MeshContext
  >;
  getMediaMathRenderFormatHash: InContextSdkMethod<
    Query['getMediaMathRenderFormatHash'],
    QuerygetMediaMathRenderFormatHashArgs,
    MeshContext
  >;
  getMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEnd'],
    QuerygetMetricsBytesDifferenceAbsoluteAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEnd'],
    QuerygetMetricsBytesDifferenceAbsolutePerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEnd'],
    QuerygetMetricsBytesDifferenceNetAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEnd'],
    QuerygetMetricsBytesDifferenceNetPerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd'],
    QuerygetMetricsEditedPagesAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEnd'],
    QuerygetMetricsEditedPagesNewProjectEditorTypePageTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditedPagesTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditedPagesTopByEditsProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditedPagesTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEnd'],
    QuerygetMetricsEditorsAggregateProjectEditorTypePageTypeActivityLevelGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditorsTopByAbsoluteBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditorsTopByEditsProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay: InContextSdkMethod<
    Query['getMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDay'],
    QuerygetMetricsEditorsTopByNetBytesDifferenceProjectEditorTypePageTypeYearMonthDayArgs,
    MeshContext
  >;
  getMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEnd'],
    QuerygetMetricsEditsAggregateProjectEditorTypePageTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEnd'],
    QuerygetMetricsEditsPerPageProjectPageTitleEditorTypeGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEnd'],
    QuerygetMetricsLegacyPagecountsAggregateProjectAccessSiteGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd'],
    QuerygetMetricsPageviewsAggregateProjectAccessAgentGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEnd'],
    QuerygetMetricsPageviewsPerArticleProjectAccessAgentArticleGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsPageviewsTopByCountryProjectAccessYearMonth: InContextSdkMethod<
    Query['getMetricsPageviewsTopByCountryProjectAccessYearMonth'],
    QuerygetMetricsPageviewsTopByCountryProjectAccessYearMonthArgs,
    MeshContext
  >;
  getMetricsPageviewsTopProjectAccessYearMonthDay: InContextSdkMethod<
    Query['getMetricsPageviewsTopProjectAccessYearMonthDay'],
    QuerygetMetricsPageviewsTopProjectAccessYearMonthDayArgs,
    MeshContext
  >;
  getMetricsRegisteredUsersNewProjectGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsRegisteredUsersNewProjectGranularityStartEnd'],
    QuerygetMetricsRegisteredUsersNewProjectGranularityStartEndArgs,
    MeshContext
  >;
  getMetricsUniqueDevicesProjectAccessSiteGranularityStartEnd: InContextSdkMethod<
    Query['getMetricsUniqueDevicesProjectAccessSiteGranularityStartEnd'],
    QuerygetMetricsUniqueDevicesProjectAccessSiteGranularityStartEndArgs,
    MeshContext
  >;
  getTransformListLanguagepairs: InContextSdkMethod<Query['getTransformListLanguagepairs'], {}, MeshContext>;
  getTransformListPairFromTo: InContextSdkMethod<
    Query['getTransformListPairFromTo'],
    QuerygetTransformListPairFromToArgs,
    MeshContext
  >;
  getTransformListToolTool: InContextSdkMethod<
    Query['getTransformListToolTool'],
    QuerygetTransformListToolToolArgs,
    MeshContext
  >;
  getTransformListToolToolFrom: InContextSdkMethod<
    Query['getTransformListToolToolFrom'],
    QuerygetTransformListToolToolFromArgs,
    MeshContext
  >;
  getTransformListToolToolFromTo: InContextSdkMethod<
    Query['getTransformListToolToolFromTo'],
    QuerygetTransformListToolToolFromToArgs,
    MeshContext
  >;
  getTransformWordFromFromLangToToLangWord: InContextSdkMethod<
    Query['getTransformWordFromFromLangToToLangWord'],
    QuerygetTransformWordFromFromLangToToLangWordArgs,
    MeshContext
  >;
  getTransformWordFromFromLangToToLangWordProvider: InContextSdkMethod<
    Query['getTransformWordFromFromLangToToLangWordProvider'],
    QuerygetTransformWordFromFromLangToToLangWordProviderArgs,
    MeshContext
  >;
  viewsInPastMonth: InContextSdkMethod<Query['viewsInPastMonth'], QueryviewsInPastMonthArgs, MeshContext>;
};
export declare type MutationWikiSdk = {
  postMediaMathCheckType: InContextSdkMethod<
    Mutation['postMediaMathCheckType'],
    MutationpostMediaMathCheckTypeArgs,
    MeshContext
  >;
  postTransformHtmlFromFromLangToToLang: InContextSdkMethod<
    Mutation['postTransformHtmlFromFromLangToToLang'],
    MutationpostTransformHtmlFromFromLangToToLangArgs,
    MeshContext
  >;
  postTransformHtmlFromFromLangToToLangProvider: InContextSdkMethod<
    Mutation['postTransformHtmlFromFromLangToToLangProvider'],
    MutationpostTransformHtmlFromFromLangToToLangProviderArgs,
    MeshContext
  >;
};
export declare type SubscriptionWikiSdk = {};
export declare type WikiContext = {
  ['Wiki']: {
    Query: QueryWikiSdk;
    Mutation: MutationWikiSdk;
    Subscription: SubscriptionWikiSdk;
  };
};
export declare type MeshContext = WikiContext & BaseMeshContext;
import { GetMeshOptions } from '@graphql-mesh/runtime';
import { YamlConfig } from '@graphql-mesh/types';
import 'ts-node/register/transpile-only';
export declare const rawConfig: YamlConfig.Config;
export declare function getMeshOptions(): GetMeshOptions;
export declare const documentsInSDL: string[];
export declare function getBuiltMesh(): Promise<MeshInstance>;
export declare function getMeshSDK(): Promise<{
  viewsInPastMonth(
    variables?: Exact<{
      [key: string]: never;
    }>,
    options?: any
  ): Promise<viewsInPastMonthQuery>;
  wikipediaMetrics(
    variables?: Exact<{
      [key: string]: never;
    }>,
    options?: any
  ): Promise<wikipediaMetricsQuery>;
}>;
export declare type viewsInPastMonthQueryVariables = Exact<{
  [key: string]: never;
}>;
export declare type viewsInPastMonthQuery = Pick<Query, 'viewsInPastMonth'>;
export declare type wikipediaMetricsQueryVariables = Exact<{
  [key: string]: never;
}>;
export declare type wikipediaMetricsQuery = {
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd?: Maybe<{
    items?: Maybe<Array<Maybe<Pick<Items17ListItem, 'views'>>>>;
  }>;
};
export declare const viewsInPastMonthDocument: DocumentNode;
export declare const wikipediaMetricsDocument: DocumentNode;
export declare type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R>;
export declare function getSdk<C>(requester: Requester<C>): {
  viewsInPastMonth(variables?: viewsInPastMonthQueryVariables, options?: C): Promise<viewsInPastMonthQuery>;
  wikipediaMetrics(variables?: wikipediaMetricsQueryVariables, options?: C): Promise<wikipediaMetricsQuery>;
};
export declare type Sdk = ReturnType<typeof getSdk>;
