export var Format;
(function (Format) {
    Format["SVG"] = "svg";
    Format["MML"] = "mml";
    Format["PNG"] = "png";
})(Format || (Format = {}));
export var EditorType16;
(function (EditorType16) {
    EditorType16["ALL_EDITOR_TYPES"] = "all-editor-types";
    EditorType16["ANONYMOUS"] = "anonymous";
    EditorType16["GROUP_BOT"] = "group-bot";
    EditorType16["NAME_BOT"] = "name-bot";
    EditorType16["USER"] = "user";
})(EditorType16 || (EditorType16 = {}));
export var Granularity21;
(function (Granularity21) {
    Granularity21["DAILY"] = "daily";
    Granularity21["MONTHLY"] = "monthly";
})(Granularity21 || (Granularity21 = {}));
export var PageType13;
(function (PageType13) {
    PageType13["ALL_PAGE_TYPES"] = "all-page-types";
    PageType13["CONTENT"] = "content";
    PageType13["NON_CONTENT"] = "non-content";
})(PageType13 || (PageType13 = {}));
export var ActivityLevel3;
(function (ActivityLevel3) {
    ActivityLevel3["ALL_ACTIVITY_LEVELS"] = "all-activity-levels";
    ActivityLevel3["_1__4_EDITS"] = "1..4-edits";
    ActivityLevel3["_5__24_EDITS"] = "5..24-edits";
    ActivityLevel3["_25__99_EDITS"] = "25..99-edits";
    ActivityLevel3["_100___EDITS"] = "100..-edits";
})(ActivityLevel3 || (ActivityLevel3 = {}));
export var AccessSite3;
(function (AccessSite3) {
    AccessSite3["ALL_SITES"] = "all-sites";
    AccessSite3["DESKTOP_SITE"] = "desktop-site";
    AccessSite3["MOBILE_SITE"] = "mobile-site";
})(AccessSite3 || (AccessSite3 = {}));
export var Granularity22;
(function (Granularity22) {
    Granularity22["HOURLY"] = "hourly";
    Granularity22["DAILY"] = "daily";
    Granularity22["MONTHLY"] = "monthly";
})(Granularity22 || (Granularity22 = {}));
export var Access5;
(function (Access5) {
    Access5["ALL_ACCESS"] = "all-access";
    Access5["DESKTOP"] = "desktop";
    Access5["MOBILE_APP"] = "mobile-app";
    Access5["MOBILE_WEB"] = "mobile-web";
})(Access5 || (Access5 = {}));
export var Agent3;
(function (Agent3) {
    Agent3["ALL_AGENTS"] = "all-agents";
    Agent3["USER"] = "user";
    Agent3["SPIDER"] = "spider";
})(Agent3 || (Agent3 = {}));
export var Agent4;
(function (Agent4) {
    Agent4["ALL_AGENTS"] = "all-agents";
    Agent4["USER"] = "user";
    Agent4["SPIDER"] = "spider";
    Agent4["BOT"] = "bot";
})(Agent4 || (Agent4 = {}));
export var Tool;
(function (Tool) {
    Tool["MT"] = "mt";
    Tool["DICTIONARY"] = "dictionary";
})(Tool || (Tool = {}));
export var Provider2;
(function (Provider2) {
    Provider2["JSONDICT"] = "JsonDict";
    Provider2["DICTD"] = "Dictd";
})(Provider2 || (Provider2 = {}));
export var Type;
(function (Type) {
    Type["TEX"] = "tex";
    Type["INLINE_TEX"] = "inline-tex";
    Type["CHEM"] = "chem";
})(Type || (Type = {}));
export var Provider;
(function (Provider) {
    Provider["APERTIUM"] = "Apertium";
    Provider["YANDEX"] = "Yandex";
    Provider["YOUDAO"] = "Youdao";
})(Provider || (Provider = {}));
import { parse } from 'graphql';
import { getMesh } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { join, relative, isAbsolute, dirname } from 'path';
import { fileURLToPath } from 'url';
import ExternalModule_0 from 'ts-node/register/transpile-only';
import ExternalModule_1 from '@graphql-mesh/cache-inmemory-lru';
import ExternalModule_2 from '@graphql-mesh/openapi';
import ExternalModule_3 from '@graphql-mesh/merger-bare';
import ExternalModule_4 from './sources/Wiki/oas-schema.cjs';
const importedModules = {
    // @ts-ignore
    ["ts-node/register/transpile-only"]: ExternalModule_0,
    // @ts-ignore
    ["@graphql-mesh/cache-inmemory-lru"]: ExternalModule_1,
    // @ts-ignore
    ["@graphql-mesh/openapi"]: ExternalModule_2,
    // @ts-ignore
    ["@graphql-mesh/merger-bare"]: ExternalModule_3,
    // @ts-ignore
    [".mesh/sources/Wiki/oas-schema.cjs"]: ExternalModule_4
};
const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const importFn = (moduleId) => {
    const relativeModuleId = (isAbsolute(moduleId) ? relative(baseDir, moduleId) : moduleId).split('\\').join('/');
    if (!(relativeModuleId in importedModules)) {
        throw new Error(`Cannot find module '${relativeModuleId}'.`);
    }
    return Promise.resolve(importedModules[relativeModuleId]);
};
const rootStore = new MeshStore('.mesh', new FsStoreStorageAdapter({
    cwd: baseDir,
    importFn,
}), {
    readonly: true,
    validate: false
});
import 'ts-node/register/transpile-only';
import MeshCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import OpenapiHandler from '@graphql-mesh/openapi';
import BareMerger from '@graphql-mesh/merger-bare';
import { resolveAdditionalResolvers } from '@graphql-mesh/utils';
import * as additionalResolvers$0 from '../additional-resolvers.ts';
export const rawConfig = { "sources": [{ "name": "Wiki", "handler": { "openapi": { "source": "https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml" } } }], "additionalTypeDefs": "extend type Query {\n  viewsInPastMonth(project: String!): Float!\n}\n", "additionalResolvers": ["./additional-resolvers.ts"], "require": ["ts-node/register/transpile-only"], "documents": ["example-queries/*.graphql"] };
export async function getMeshOptions() {
    const cache = new MeshCache({
        ...(rawConfig.cache || {}),
        store: rootStore.child('cache'),
    });
    const pubsub = new PubSub();
    const sourcesStore = rootStore.child('sources');
    const logger = new DefaultLogger('🕸️');
    const sources = [];
    const transforms = [];
    const wikiTransforms = [];
    const wikiHandler = new OpenapiHandler({
        name: rawConfig.sources[0].name,
        config: rawConfig.sources[0].handler["openapi"],
        baseDir,
        cache,
        pubsub,
        store: sourcesStore.child(rawConfig.sources[0].name),
        logger: logger.child(rawConfig.sources[0].name),
        importFn
    });
    sources.push({
        name: 'Wiki',
        handler: wikiHandler,
        transforms: wikiTransforms
    });
    const merger = new BareMerger({
        cache,
        pubsub,
        logger: logger.child('BareMerger'),
        store: rootStore.child('bareMerger')
    });
    const additionalTypeDefs = [parse(/* GraphQL */ `extend type Query {
  viewsInPastMonth(project: String!): Float!
}`),];
    const additionalResolversRawConfig = [];
    additionalResolversRawConfig.push(additionalResolvers$0.resolvers || additionalResolvers$0.default || additionalResolvers$0);
    const additionalResolvers = await resolveAdditionalResolvers(baseDir, additionalResolversRawConfig, importFn, pubsub);
    const liveQueryInvalidations = rawConfig.liveQueryInvalidations;
    return {
        sources,
        transforms,
        additionalTypeDefs,
        additionalResolvers,
        cache,
        pubsub,
        merger,
        logger,
        liveQueryInvalidations,
    };
}
export const documentsInSDL = /*#__PURE__*/ [/* GraphQL */ `query viewsInPastMonth {
  viewsInPastMonth(project: "en.wikipedia.org")
}`, /* GraphQL */ `query wikipediaMetrics {
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
    access: ALL_ACCESS
    agent: USER
    start: "20200101"
    end: "20200226"
    project: "en.wikipedia.org"
    granularity: DAILY
  ) {
    items {
      views
    }
  }
}`];
export async function getBuiltMesh() {
    const meshConfig = await getMeshOptions();
    return getMesh(meshConfig);
}
export async function getMeshSDK() {
    const { sdkRequester } = await getBuiltMesh();
    return getSdk(sdkRequester);
}
export const viewsInPastMonthDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "viewsInPastMonth" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "viewsInPastMonth" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "project" }, "value": { "kind": "StringValue", "value": "en.wikipedia.org", "block": false } }] }] } }] };
export const wikipediaMetricsDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "wikipediaMetrics" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "access" }, "value": { "kind": "EnumValue", "value": "ALL_ACCESS" } }, { "kind": "Argument", "name": { "kind": "Name", "value": "agent" }, "value": { "kind": "EnumValue", "value": "USER" } }, { "kind": "Argument", "name": { "kind": "Name", "value": "start" }, "value": { "kind": "StringValue", "value": "20200101", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "end" }, "value": { "kind": "StringValue", "value": "20200226", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "project" }, "value": { "kind": "StringValue", "value": "en.wikipedia.org", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "granularity" }, "value": { "kind": "EnumValue", "value": "DAILY" } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "items" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "views" } }] } }] } }] } }] };
export function getSdk(requester) {
    return {
        viewsInPastMonth(variables, options) {
            return requester(viewsInPastMonthDocument, variables, options);
        },
        wikipediaMetrics(variables, options) {
            return requester(wikipediaMetricsDocument, variables, options);
        }
    };
}
