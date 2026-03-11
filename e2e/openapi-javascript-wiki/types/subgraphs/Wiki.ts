import type { InContextSdkMethod } from '@graphql-mesh/types';

export namespace WikiTypes {
  export type Maybe<T> = T | null;
  export type InputMaybe<T> = Maybe<T>;
  export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
  export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
  };
  export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
  export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
    [_ in K]?: never;
  };
  export type Incremental<T> =
    | T
    | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
  /** All built-in and custom scalars, mapped to their actual values */
  export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
    BigInt: { input: any; output: any };
    /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
    JSON: { input: any; output: any };
    /** A string that cannot be passed as an empty value */
    NonEmptyString: { input: any; output: any };
    ObjMap: { input: any; output: any };
    _DirectiveExtensions: { input: any; output: any };
    _Any: { input: any; output: any };
  };

  export type HTTPMethod =
    | 'CONNECT'
    | 'DELETE'
    | 'GET'
    | 'HEAD'
    | 'OPTIONS'
    | 'PATCH'
    | 'POST'
    | 'PUT'
    | 'TRACE';

  export type Mutation = {
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
     */
    post_media_math_check_by_type?: Maybe<Scalars['JSON']['output']>;
    /**
     * Fetches the machine translation for the posted content from the source
     * to the destination language.
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    post_transform_html_from_by_from_lang_to_by_to_lang?: Maybe<cx_mt>;
    /**
     * Fetches the machine translation for the posted content from the source
     * to the destination language.
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    post_transform_html_from_by_from_lang_to_by_to_lang_by_provider?: Maybe<cx_mt>;
  };

  export type Mutationpost_media_math_check_by_typeArgs = {
    type: mutationInput_post_media_math_check_by_type_type;
  };

  export type Mutationpost_transform_html_from_by_from_lang_to_by_to_langArgs = {
    from_lang: Scalars['String']['input'];
    to_lang: Scalars['String']['input'];
  };

  export type Mutationpost_transform_html_from_by_from_lang_to_by_to_lang_by_providerArgs = {
    from_lang: Scalars['String']['input'];
    provider: mutationInput_post_transform_html_from_by_from_lang_to_by_to_lang_by_provider_provider;
    to_lang: Scalars['String']['input'];
  };

  export type Query = {
    /**
     * Gets availability of featured feed content for the apps by wiki domain.
     *
     * Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     */
    feed_availability?: Maybe<availability>;
    /**
     * Returns the previously-stored formula via `/media/math/check/{type}` for
     * the given hash.
     *
     * Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).
     */
    media_math_formula_by_hash?: Maybe<Scalars['JSON']['output']>;
    /**
     * Given a request hash, renders a TeX formula into its mathematic
     * representation in the given format. When a request is issued to the
     * `/media/math/check/{format}` POST endpoint, the response contains the
     * `x-resource-location` header denoting the hash ID of the POST data. Once
     * obtained, this endpoint has to be used to obtain the actual render.
     *
     * Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).
     */
    media_math_render_by_format_by_hash?: Maybe<Scalars['JSON']['output']>;
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
     */
    metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end?: Maybe<absolute_bytes_difference>;
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
     */
    metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end?: Maybe<absolute_bytes_difference_per_page>;
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
     */
    metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end?: Maybe<net_bytes_difference>;
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
     */
    metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end?: Maybe<net_bytes_difference_per_page>;
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
     */
    metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end?: Maybe<edited_pages>;
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
     */
    metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end?: Maybe<new_pages>;
    /**
     * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
     * edited-pages by absolute bytes-difference. You can filter by editor-type (all-editor-types,
     * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
     *
     * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     * - Rate limit: 25 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_edited_pages_by_abs_bytes_diff>;
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
     */
    metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_edited_pages_by_edits>;
    /**
     * Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
     * edited-pages by net bytes-difference. You can filter by editor-type (all-editor-types,
     * anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
     *
     * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     * - Rate limit: 25 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_edited_pages_by_net_bytes_diff>;
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
     */
    metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end?: Maybe<editors>;
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
     */
    metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_editors_by_abs_bytes_diff>;
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
     */
    metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_editors_by_edits>;
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
     */
    metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day?: Maybe<top_editors_by_net_bytes_diff>;
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
     */
    metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end?: Maybe<edits>;
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
     */
    metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end?: Maybe<edits_per_page>;
    /**
     * Given a project and a date range, returns a timeseries of pagecounts.
     * You can filter by access site (mobile or desktop) and you can choose between monthly,
     * daily and hourly granularity as well.
     *
     * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end?: Maybe<pagecounts_project>;
    /**
     * Given a date range, returns a timeseries of pageview counts. You can filter by project,
     * access method and/or agent type. You can choose between daily and hourly granularity
     * as well.
     *
     * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end?: Maybe<pageview_project>;
    /**
     * Given a Mediawiki article and a date range, returns a daily timeseries of its pageview
     * counts. You can also filter by access method and/or agent type.
     *
     * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end?: Maybe<pageview_article>;
    /**
     * Lists the pageviews to this project, split by country of origin for a given month.
     * Because of privacy reasons, pageviews are given in a bucketed format, and countries
     * with less than 100 views do not get reported.
     * Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month?: Maybe<by_country>;
    /**
     * Lists the 1000 most viewed articles for a given project and timespan (month or day).
     * You can filter by access method.
     *
     * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day?: Maybe<pageview_tops>;
    /**
     * Given a Mediawiki project and a date range, returns a timeseries of its newly registered
     * users counts. You can choose between daily and monthly granularity. The newly registered
     * users value is computed with self-created users only, not auto-login created ones.
     *
     * - Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
     * - Rate limit: 25 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_registered_users_new_by_project_by_granularity_by_start_by_end?: Maybe<new_registered_users>;
    /**
     * Given a project and a date range, returns a timeseries of unique devices counts.
     * You need to specify a project, and can filter by accessed site (mobile or desktop).
     * You can choose between daily and hourly granularity as well.
     *
     * - Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
     * - Rate limit: 100 req/s
     * - License: Data accessible via this endpoint is available under the
     *   [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
     */
    metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end?: Maybe<unique_devices>;
    /**
     * Fetches the list of language pairs the back-end service can translate
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_list_languagepairs?: Maybe<cx_languagepairs>;
    /**
     * Fetches the list of tools that are available for the given pair of languages.
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_list_pair_by_from_by_to?: Maybe<cx_list_tools>;
    /**
     * Fetches the list of tools and all of the language pairs it can translate
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_list_tool_by_tool?: Maybe<Scalars['JSON']['output']>;
    /**
     * Fetches the list of tools and all of the language pairs it can translate
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_list_tool_by_tool_by_from?: Maybe<Scalars['JSON']['output']>;
    /**
     * Fetches the list of tools and all of the language pairs it can translate
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_list_tool_by_tool_by_from_by_to?: Maybe<Scalars['JSON']['output']>;
    /**
     * Fetches the dictionary meaning of a word from a language and displays
     * it in the target language.
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_word_from_by_from_lang_to_by_to_lang_by_word?: Maybe<cx_dict>;
    /**
     * Fetches the dictionary meaning of a word from a language and displays
     * it in the target language.
     *
     * Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)
     */
    transform_word_from_by_from_lang_to_by_to_lang_by_word_by_provider?: Maybe<cx_dict>;
  };

  export type Querymedia_math_formula_by_hashArgs = {
    hash: Scalars['NonEmptyString']['input'];
  };

  export type Querymedia_math_render_by_format_by_hashArgs = {
    format: queryInput_media_math_render_by_format_by_hash_format;
    hash: Scalars['NonEmptyString']['input'];
  };

  export type Querymetrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity;
      page_title: Scalars['String']['input'];
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity;
      page_title: Scalars['String']['input'];
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_endArgs =
    {
      activity_level: queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_activity_level;
      editor_type: queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_endArgs =
    {
      activity_level: queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_activity_level;
      editor_type: queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs =
    {
      day: Scalars['String']['input'];
      editor_type: queryInput_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type;
      month: Scalars['String']['input'];
      page_type: queryInput_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type;
      project: Scalars['String']['input'];
      year: Scalars['String']['input'];
    };

  export type Querymetrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity;
      page_type: queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs =
    {
      editor_type: queryInput_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity;
      page_title: Scalars['String']['input'];
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_endArgs =
    {
      access_site: queryInput_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_access_site;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_granularity;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_endArgs =
    {
      access: queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_access;
      agent: queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_agent;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_granularity;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_endArgs =
    {
      access: queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_access;
      agent: queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_agent;
      article: Scalars['String']['input'];
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_granularity;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querymetrics_pageviews_top_by_country_by_project_by_access_by_year_by_monthArgs = {
    access: queryInput_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_access;
    month: Scalars['String']['input'];
    project: Scalars['String']['input'];
    year: Scalars['String']['input'];
  };

  export type Querymetrics_pageviews_top_by_project_by_access_by_year_by_month_by_dayArgs = {
    access: queryInput_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_access;
    day: Scalars['String']['input'];
    month: Scalars['String']['input'];
    project: Scalars['String']['input'];
    year: Scalars['String']['input'];
  };

  export type Querymetrics_registered_users_new_by_project_by_granularity_by_start_by_endArgs = {
    end: Scalars['String']['input'];
    granularity: queryInput_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_granularity;
    project: Scalars['String']['input'];
    start: Scalars['String']['input'];
  };

  export type Querymetrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_endArgs =
    {
      access_site: queryInput_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_access_site;
      end: Scalars['String']['input'];
      granularity: queryInput_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_granularity;
      project: Scalars['String']['input'];
      start: Scalars['String']['input'];
    };

  export type Querytransform_list_pair_by_from_by_toArgs = {
    from: Scalars['String']['input'];
    to: Scalars['String']['input'];
  };

  export type Querytransform_list_tool_by_toolArgs = {
    tool: queryInput_transform_list_tool_by_tool_tool;
  };

  export type Querytransform_list_tool_by_tool_by_fromArgs = {
    from: Scalars['String']['input'];
    tool: queryInput_transform_list_tool_by_tool_by_from_tool;
  };

  export type Querytransform_list_tool_by_tool_by_from_by_toArgs = {
    from: Scalars['String']['input'];
    to: Scalars['String']['input'];
    tool: queryInput_transform_list_tool_by_tool_by_from_by_to_tool;
  };

  export type Querytransform_word_from_by_from_lang_to_by_to_lang_by_wordArgs = {
    from_lang: Scalars['String']['input'];
    to_lang: Scalars['String']['input'];
    word: Scalars['String']['input'];
  };

  export type Querytransform_word_from_by_from_lang_to_by_to_lang_by_word_by_providerArgs = {
    from_lang: Scalars['String']['input'];
    provider: queryInput_transform_word_from_by_from_lang_to_by_to_lang_by_word_by_provider_provider;
    to_lang: Scalars['String']['input'];
    word: Scalars['String']['input'];
  };

  export type absolute_bytes_difference = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type absolute_bytes_difference_per_page = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type availability = {
    /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
    in_the_news: Array<Maybe<Scalars['String']['output']>>;
    /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
    most_read: Array<Maybe<Scalars['String']['output']>>;
    /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
    on_this_day: Array<Maybe<Scalars['String']['output']>>;
    /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
    picture_of_the_day: Array<Maybe<Scalars['String']['output']>>;
    /** domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project */
    todays_featured_article: Array<Maybe<Scalars['String']['output']>>;
  };

  export type by_country = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_items_items>
      >
    >;
  };

  export type cx_dict = {
    /** the original word to look up */
    source?: Maybe<Scalars['String']['output']>;
    /** the translations found */
    translations?: Maybe<
      Array<Maybe<query_transform_word_from_by_from_lang_to_by_to_lang_by_word_translations_items>>
    >;
  };

  export type cx_languagepairs = {
    /** the list of available source languages */
    source?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
    /** the list of available destination languages */
    target?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  };

  export type cx_list_tools = {
    /** the list of tools available for the given language pair */
    tools?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  };

  export type cx_mt = {
    /** the translated content */
    contents?: Maybe<Scalars['String']['output']>;
  };

  export type edited_pages = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type editors = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type edits = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type edits_per_page = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  /** The input type of the given formula; can be tex or inline-tex */
  export type mutationInput_post_media_math_check_by_type_type = 'chem' | 'inline_tex' | 'tex';

  /** The machine translation provider id */
  export type mutationInput_post_transform_html_from_by_from_lang_to_by_to_lang_by_provider_provider =
    'Apertium' | 'Yandex' | 'Youdao';

  export type net_bytes_difference = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type net_bytes_difference_per_page = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type new_pages = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type new_registered_users = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type pagecounts_project = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type pageview_article = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type pageview_project = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type pageview_tops = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_items_items>
      >
    >;
  };

  /** The output format; can be svg or mml */
  export type queryInput_media_math_render_by_format_by_hash_format = 'mml' | 'png' | 'svg';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /** Time unit for the response data. As of today, supported values are daily and monthly */
  export type queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /** Time unit for the response data. As of today, supported values are daily and monthly */
  export type queryInput_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /** Time unit for the response data. As of today, supported values are daily and monthly */
  export type queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /** Time unit for the response data. As of today, supported values are daily and monthly */
  export type queryInput_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by activity-level, use one of 1..4-edits, 5..24-edits,
   * 25..99-edits or 100..-edits. If you are interested in edited-pages regardless
   * of their activity level, use all-activity-levels.
   */
  export type queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_activity_level =
    '_1__4_edits' | '_5__24_edits' | '_25__99_edits' | '_100___edits' | 'all_activity_levels';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * The time unit for the response data. As of today, supported values are
   * daily and monthly.
   */
  export type queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (edited-pages in content
   * namespaces) or non-content (edited-pages in non-content namespaces). If you are
   * interested in edited-pages regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging
   * to the bot group but having bot-like names) or user (registered account not in bot
   * group nor having bot-like name). If you are interested in edits regardless of
   * their editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * The time unit for the response data. As of today, supported values are
   * daily and monthly.
   */
  export type queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (new pages in content
   * namespaces) or non-content (new pages in non-content namespaces). If you are
   * interested in new-articles regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by activity-level, use one of 1..4-edits, 5..24-edits,
   * 25..99-edits or 100..-edits. If you are interested in editors regardless
   * of their activity-level, use all-activity-levels.
   */
  export type queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_activity_level =
    '_1__4_edits' | '_5__24_edits' | '_25__99_edits' | '_100___edits' | 'all_activity_levels';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging
   * to the bot group but having bot-like names) or user (registered account not in bot
   * group nor having bot-like name). If you are interested in edits regardless
   * of their editor-type, use all-editor-types.
   */
  export type queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * The time unit for the response data. As of today, supported values are
   * daily and monthly.
   */
  export type queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (edits made in content
   * namespaces) or non-content (edits made in non-content namespaces). If you are
   * interested in editors regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging
   * to the bot group but having bot-like names) or user (registered account not in bot
   * group nor having bot-like name). If you are interested in edits regardless
   * of their editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /**
   * The time unit for the response data. As of today, supported values are
   * daily and monthly.
   */
  export type queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by page-type, use one of content (edits on pages in content
   * namespaces) or non-content (edits on pages in non-content namespaces). If you are
   * interested in edits regardless of their page-type, use all-page-types.
   */
  export type queryInput_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_page_type =
    'all_page_types' | 'content' | 'non_content';

  /**
   * If you want to filter by editor-type, use one of anonymous, group-bot (registered
   * accounts belonging to the bot group), name-bot (registered accounts not belonging to
   * the bot group but having bot-like names) or user (registered account not in bot group
   * nor having bot-like name). If you are interested in edits regardless of their
   * editor-type, use all-editor-types.
   */
  export type queryInput_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_editor_type =
    'all_editor_types' | 'anonymous' | 'group_bot' | 'name_bot' | 'user';

  /** Time unit for the response data. As of today, supported values are daily and monthly */
  export type queryInput_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /** If you want to filter by access site, use one of desktop-site or mobile-site. If you are interested in pagecounts regardless of access site use all-sites. */
  export type queryInput_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_access_site =
    'all_sites' | 'desktop_site' | 'mobile_site';

  /**
   * The time unit for the response data. As of today, the supported granularities for
   * this endpoint are hourly, daily and monthly.
   */
  export type queryInput_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_granularity =
    'daily' | 'hourly' | 'monthly';

  /**
   * If you want to filter by access method, use one of desktop, mobile-app or mobile-web.
   * If you are interested in pageviews regardless of access method, use all-access.
   */
  export type queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_access =
    'all_access' | 'desktop' | 'mobile_app' | 'mobile_web';

  /**
   * If you want to filter by agent type, use one of user or spider. If you are interested
   * in pageviews regardless of agent type, use all-agents.
   */
  export type queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_agent =
    'all_agents' | 'spider' | 'user';

  /**
   * The time unit for the response data. As of today, the supported granularities for this
   * endpoint are hourly, daily, and monthly.
   */
  export type queryInput_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_granularity =
    'daily' | 'hourly' | 'monthly';

  /**
   * If you want to filter by access method, use one of desktop, mobile-app
   * or mobile-web. If you are interested in pageviews regardless of access method,
   * use all-access.
   */
  export type queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_access =
    'all_access' | 'desktop' | 'mobile_app' | 'mobile_web';

  /**
   * If you want to filter by agent type, use one of user, bot or spider. If you are
   * interested in pageviews regardless of agent type, use all-agents.
   */
  export type queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_agent =
    'all_agents' | 'bot' | 'spider' | 'user';

  /**
   * The time unit for the response data. As of today, the only supported granularity for
   * this endpoint is daily and monthly.
   */
  export type queryInput_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by access method, use one of desktop, mobile-app or mobile-web.
   * If you are interested in pageviews regardless of access method, use all-access.
   */
  export type queryInput_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_access =
    'all_access' | 'desktop' | 'mobile_app' | 'mobile_web';

  /**
   * If you want to filter by access method, use one of desktop, mobile-app or mobile-web.
   * If you are interested in pageviews regardless of access method, use all-access.
   */
  export type queryInput_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_access =
    | 'all_access'
    | 'desktop'
    | 'mobile_app'
    | 'mobile_web';

  /**
   * The time unit for the response data. As of today, supported values are
   * daily and monthly.
   */
  export type queryInput_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /**
   * If you want to filter by accessed site, use one of desktop-site or mobile-site.
   * If you are interested in unique devices regardless of accessed site, use or all-sites.
   */
  export type queryInput_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_access_site =
    'all_sites' | 'desktop_site' | 'mobile_site';

  /**
   * The time unit for the response data. As of today, the supported granularities
   * for this endpoint are daily and monthly.
   */
  export type queryInput_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_granularity =
    'daily' | 'monthly';

  /** The tool category to list tools and language pairs for */
  export type queryInput_transform_list_tool_by_tool_by_from_by_to_tool = 'dictionary' | 'mt';

  /** The tool category to list tools and language pairs for */
  export type queryInput_transform_list_tool_by_tool_by_from_tool = 'dictionary' | 'mt';

  /** The tool category to list tools and language pairs for */
  export type queryInput_transform_list_tool_by_tool_tool = 'dictionary' | 'mt';

  /** The dictionary provider id */
  export type queryInput_transform_word_from_by_from_lang_to_by_to_lang_by_word_by_provider_provider =
    'Dictd' | 'JsonDict';

  export type query_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      abs_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      abs_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      net_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      net_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items =
    {
      activity_level?: Maybe<Scalars['String']['output']>;
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items_results_items =
    {
      edited_pages?: Maybe<Scalars['Int']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      new_pages?: Maybe<Scalars['Int']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      abs_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
    };

  export type query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      edits?: Maybe<Scalars['BigInt']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
    };

  export type query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      net_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
    };

  export type query_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items =
    {
      activity_level?: Maybe<Scalars['String']['output']>;
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end_items_items_results_items =
    {
      editors?: Maybe<Scalars['Int']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      abs_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
      user_text?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      edits?: Maybe<Scalars['BigInt']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
      user_text?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items =
    {
      timestamp?: Maybe<Scalars['String']['output']>;
      top?: Maybe<
        Array<
          Maybe<query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items>
        >
      >;
    };

  export type query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items_results_items_top_items =
    {
      net_bytes_diff?: Maybe<Scalars['BigInt']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
      user_text?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_type?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      edits?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items =
    {
      editor_type?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      page_title?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end_items_items_results_items =
    {
      edits?: Maybe<Scalars['BigInt']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end_items_items =
    {
      access_site?: Maybe<Scalars['String']['output']>;
      count?: Maybe<Scalars['BigInt']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end_items_items =
    {
      access?: Maybe<Scalars['String']['output']>;
      agent?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
      views?: Maybe<Scalars['BigInt']['output']>;
    };

  export type query_metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end_items_items =
    {
      access?: Maybe<Scalars['String']['output']>;
      agent?: Maybe<Scalars['String']['output']>;
      article?: Maybe<Scalars['String']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
      views?: Maybe<Scalars['BigInt']['output']>;
    };

  export type query_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_items_items =
    {
      access?: Maybe<Scalars['String']['output']>;
      countries?: Maybe<
        Array<
          Maybe<query_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_items_items_countries_items>
        >
      >;
      month?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      year?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month_items_items_countries_items =
    {
      country?: Maybe<Scalars['String']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
      views?: Maybe<Scalars['BigInt']['output']>;
    };

  export type query_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_items_items =
    {
      access?: Maybe<Scalars['String']['output']>;
      articles?: Maybe<
        Array<
          Maybe<query_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_items_items_articles_items>
        >
      >;
      day?: Maybe<Scalars['String']['output']>;
      month?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      year?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day_items_items_articles_items =
    {
      article?: Maybe<Scalars['String']['output']>;
      rank?: Maybe<Scalars['Int']['output']>;
      views?: Maybe<Scalars['BigInt']['output']>;
    };

  export type query_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_items_items =
    {
      granularity?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      results?: Maybe<
        Array<
          Maybe<query_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_items_items_results_items>
        >
      >;
    };

  export type query_metrics_registered_users_new_by_project_by_granularity_by_start_by_end_items_items_results_items =
    {
      new_registered_users?: Maybe<Scalars['Int']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_items_items =
    {
      access_site?: Maybe<Scalars['String']['output']>;
      devices?: Maybe<Scalars['BigInt']['output']>;
      granularity?: Maybe<Scalars['String']['output']>;
      project?: Maybe<Scalars['String']['output']>;
      timestamp?: Maybe<Scalars['String']['output']>;
    };

  export type query_transform_word_from_by_from_lang_to_by_to_lang_by_word_translations_items = {
    /** extra information about the phrase */
    info?: Maybe<Scalars['String']['output']>;
    /** the translated phrase */
    phrase?: Maybe<Scalars['String']['output']>;
    /** the source dictionary used for the translation */
    sources?: Maybe<Scalars['String']['output']>;
  };

  export type top_edited_pages_by_abs_bytes_diff = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type top_edited_pages_by_edits = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type top_edited_pages_by_net_bytes_diff = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type top_editors_by_abs_bytes_diff = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type top_editors_by_edits = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type top_editors_by_net_bytes_diff = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day_items_items>
      >
    >;
  };

  export type unique_devices = {
    items?: Maybe<
      Array<
        Maybe<query_metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end_items_items>
      >
    >;
  };

  export type _Entity = {};

  export type QuerySdk = {
    /** Gets availability of featured feed content for the apps by wiki domain.

Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental) **/
    feed_availability: InContextSdkMethod<Query['feed_availability'], {}, {}>;
    /** Returns the previously-stored formula via `/media/math/check/{type}` for
the given hash.

Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable). **/
    media_math_formula_by_hash: InContextSdkMethod<
      Query['media_math_formula_by_hash'],
      Querymedia_math_formula_by_hashArgs,
      {}
    >;
    /** Given a request hash, renders a TeX formula into its mathematic
representation in the given format. When a request is issued to the
`/media/math/check/{format}` POST endpoint, the response contains the
`x-resource-location` header denoting the hash ID of the POST data. Once
obtained, this endpoint has to be used to obtain the actual render.

Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable). **/
    media_math_render_by_format_by_hash: InContextSdkMethod<
      Query['media_math_render_by_format_by_hash'],
      Querymedia_math_render_by_format_by_hashArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of absolute bytes
difference sums. You can filter by editors-type (all-editor-types, anonymous, group-bot,
name-bot, user) and page-type (all-page-types, content, non-content). You can choose
between daily and monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end'],
      Querymetrics_bytes_difference_absolute_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project, a page-title prefixed with canonical namespace (for
instance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes
difference absolute sums. You can filter by editors-type (all-editor-types, anonymous,
group-bot, name-bot, user). You can choose between daily and monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end'],
      Querymetrics_bytes_difference_absolute_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of bytes difference net
sums. You can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot,
user) and page-type (all-page-types, content or non-content). You can choose between
daily and monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end'],
      Querymetrics_bytes_difference_net_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project, a page-title prefixed with canonical namespace (for
instance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes
difference net sums. You can filter by editors-type (all-editor-types, anonymous,
group-bot, name-bot, user). You can choose between daily and monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end'],
      Querymetrics_bytes_difference_net_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of its edited-pages counts.
You can filter by editor-type (all-editor-types, anonymous, group-bot, name-bot, user),
page-type (all-page-types, content or non-content) or activity-level (1..4-edits,
5..24-edits, 25..99-edits, 100..-edits). You can choose between daily and monthly
granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end'],
      Querymetrics_edited_pages_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of its new pages counts.
You can filter by editor type (all-editor-types, anonymous, group-bot, name-bot, user)
or page-type (all-page-types, content or non-content). You can choose between daily and
monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end'],
      Querymetrics_edited_pages_new_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
edited-pages by absolute bytes-difference. You can filter by editor-type (all-editor-types,
anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_edited_pages_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top
100 edited-pages by edits count. You can filter by editor-type (all-editor-types,
anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or
non-content).

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_edited_pages_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
edited-pages by net bytes-difference. You can filter by editor-type (all-editor-types,
anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_edited_pages_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of its editors counts.
You can filter by editory-type (all-editor-types, anonymous, group-bot, name-bot, user),
page-type (all-page-types, content or non-content) or activity-level (1..4-edits,
5..24-edits, 25..99-edits or 100..-edits). You can choose between daily and monthly
granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_end'],
      Querymetrics_editors_aggregate_by_project_by_editor_type_by_page_type_by_activity_level_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
editors by absolute bytes-difference. You can filter by editor-type (all-editor-types,
anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).
The user_text returned is either the mediawiki user_text if the user is registered, or
null if user is anonymous.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_editors_top_by_absolute_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top
100 editors by edits count. You can filter by editor-type (all-editor-types,
anonymous, group-bot, name-bot, user) or page-type (all-page-types, content or
non-content). The user_text returned is either the mediawiki user_text if the user is
registered, or null if user is anonymous.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_editors_top_by_edits_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100
editors by net bytes-difference. You can filter by editor-type (all-editor-types, anonymous,
group-bot, name-bot, user) or page-type (all-page-types, content or non-content). The
user_text returned is either the mediawiki user_text if the user is registered, or
"Anonymous Editor" if user is anonymous.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_day'],
      Querymetrics_editors_top_by_net_bytes_difference_by_project_by_editor_type_by_page_type_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of edits counts.
You can filter by editors-type (all-editor-types, anonymous, bot, registered) and
page-type (all-page-types, content or non-content). You can choose between daily and
monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_end'],
      Querymetrics_edits_aggregate_by_project_by_editor_type_by_page_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki project, a page-title prefixed with its canonical namespace (for
instance 'User:Jimbo_Wales') and a date range, returns a timeseries of edit counts.
You can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot, user).
You can choose between daily and monthly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_end'],
      Querymetrics_edits_per_page_by_project_by_page_title_by_editor_type_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a project and a date range, returns a timeseries of pagecounts.
You can filter by access site (mobile or desktop) and you can choose between monthly,
daily and hourly granularity as well.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_end'],
      Querymetrics_legacy_pagecounts_aggregate_by_project_by_access_site_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a date range, returns a timeseries of pageview counts. You can filter by project,
access method and/or agent type. You can choose between daily and hourly granularity
as well.

- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_end'],
      Querymetrics_pageviews_aggregate_by_project_by_access_by_agent_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a Mediawiki article and a date range, returns a daily timeseries of its pageview
counts. You can also filter by access method and/or agent type.

- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_end'],
      Querymetrics_pageviews_per_article_by_project_by_access_by_agent_by_article_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Lists the pageviews to this project, split by country of origin for a given month.
Because of privacy reasons, pageviews are given in a bucketed format, and countries
with less than 100 views do not get reported.
Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month: InContextSdkMethod<
      Query['metrics_pageviews_top_by_country_by_project_by_access_by_year_by_month'],
      Querymetrics_pageviews_top_by_country_by_project_by_access_by_year_by_monthArgs,
      {}
    >;
    /** Lists the 1000 most viewed articles for a given project and timespan (month or day).
You can filter by access method.

- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day: InContextSdkMethod<
      Query['metrics_pageviews_top_by_project_by_access_by_year_by_month_by_day'],
      Querymetrics_pageviews_top_by_project_by_access_by_year_by_month_by_dayArgs,
      {}
    >;
    /** Given a Mediawiki project and a date range, returns a timeseries of its newly registered
users counts. You can choose between daily and monthly granularity. The newly registered
users value is computed with self-created users only, not auto-login created ones.

- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)
- Rate limit: 25 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_registered_users_new_by_project_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_registered_users_new_by_project_by_granularity_by_start_by_end'],
      Querymetrics_registered_users_new_by_project_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Given a project and a date range, returns a timeseries of unique devices counts.
You need to specify a project, and can filter by accessed site (mobile or desktop).
You can choose between daily and hourly granularity as well.

- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)
- Rate limit: 100 req/s
- License: Data accessible via this endpoint is available under the
  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/). **/
    metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end: InContextSdkMethod<
      Query['metrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_end'],
      Querymetrics_unique_devices_by_project_by_access_site_by_granularity_by_start_by_endArgs,
      {}
    >;
    /** Fetches the list of language pairs the back-end service can translate

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_list_languagepairs: InContextSdkMethod<Query['transform_list_languagepairs'], {}, {}>;
    /** Fetches the list of tools that are available for the given pair of languages.

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_list_pair_by_from_by_to: InContextSdkMethod<
      Query['transform_list_pair_by_from_by_to'],
      Querytransform_list_pair_by_from_by_toArgs,
      {}
    >;
    /** Fetches the list of tools and all of the language pairs it can translate

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_list_tool_by_tool: InContextSdkMethod<
      Query['transform_list_tool_by_tool'],
      Querytransform_list_tool_by_toolArgs,
      {}
    >;
    /** Fetches the list of tools and all of the language pairs it can translate

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_list_tool_by_tool_by_from: InContextSdkMethod<
      Query['transform_list_tool_by_tool_by_from'],
      Querytransform_list_tool_by_tool_by_fromArgs,
      {}
    >;
    /** Fetches the list of tools and all of the language pairs it can translate

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_list_tool_by_tool_by_from_by_to: InContextSdkMethod<
      Query['transform_list_tool_by_tool_by_from_by_to'],
      Querytransform_list_tool_by_tool_by_from_by_toArgs,
      {}
    >;
    /** Fetches the dictionary meaning of a word from a language and displays
it in the target language.

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_word_from_by_from_lang_to_by_to_lang_by_word: InContextSdkMethod<
      Query['transform_word_from_by_from_lang_to_by_to_lang_by_word'],
      Querytransform_word_from_by_from_lang_to_by_to_lang_by_wordArgs,
      {}
    >;
    /** Fetches the dictionary meaning of a word from a language and displays
it in the target language.

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    transform_word_from_by_from_lang_to_by_to_lang_by_word_by_provider: InContextSdkMethod<
      Query['transform_word_from_by_from_lang_to_by_to_lang_by_word_by_provider'],
      Querytransform_word_from_by_from_lang_to_by_to_lang_by_word_by_providerArgs,
      {}
    >;
  };

  export type MutationSdk = {
    /** Checks the supplied TeX formula for correctness and returns the
normalised formula representation as well as information about
identifiers. Available types are tex and inline-tex. The response
contains the `x-resource-location` header which can be used to retrieve
the render of the checked formula in one of the supported rendering
formats. Just append the value of the header to `/media/math/{format}/`
and perform a GET request against that URL.

Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable). **/
    post_media_math_check_by_type: InContextSdkMethod<
      Mutation['post_media_math_check_by_type'],
      Mutationpost_media_math_check_by_typeArgs,
      {}
    >;
    /** Fetches the machine translation for the posted content from the source
to the destination language.

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    post_transform_html_from_by_from_lang_to_by_to_lang: InContextSdkMethod<
      Mutation['post_transform_html_from_by_from_lang_to_by_to_lang'],
      Mutationpost_transform_html_from_by_from_lang_to_by_to_langArgs,
      {}
    >;
    /** Fetches the machine translation for the posted content from the source
to the destination language.

Stability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable) **/
    post_transform_html_from_by_from_lang_to_by_to_lang_by_provider: InContextSdkMethod<
      Mutation['post_transform_html_from_by_from_lang_to_by_to_lang_by_provider'],
      Mutationpost_transform_html_from_by_from_lang_to_by_to_lang_by_providerArgs,
      {}
    >;
  };

  export type SubscriptionSdk = {};

  export type Context = {
    ['Wiki']: { Query: QuerySdk; Mutation: MutationSdk; Subscription: SubscriptionSdk };
  };
}
