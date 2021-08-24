"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSdk = exports.wikipediaMetricsDocument = exports.viewsInPastMonthDocument = exports.getMeshSDK = exports.getBuiltMesh = exports.documentsInSDL = exports.getMeshOptions = exports.rawConfig = exports.Provider = exports.Type = exports.Provider2 = exports.Tool = exports.Agent4 = exports.Agent3 = exports.Access5 = exports.Granularity22 = exports.AccessSite3 = exports.ActivityLevel3 = exports.PageType13 = exports.Granularity21 = exports.EditorType16 = exports.Format = void 0;
const tslib_1 = require("tslib");
var Format;
(function (Format) {
    Format["SVG"] = "svg";
    Format["MML"] = "mml";
    Format["PNG"] = "png";
})(Format = exports.Format || (exports.Format = {}));
var EditorType16;
(function (EditorType16) {
    EditorType16["ALL_EDITOR_TYPES"] = "all-editor-types";
    EditorType16["ANONYMOUS"] = "anonymous";
    EditorType16["GROUP_BOT"] = "group-bot";
    EditorType16["NAME_BOT"] = "name-bot";
    EditorType16["USER"] = "user";
})(EditorType16 = exports.EditorType16 || (exports.EditorType16 = {}));
var Granularity21;
(function (Granularity21) {
    Granularity21["DAILY"] = "daily";
    Granularity21["MONTHLY"] = "monthly";
})(Granularity21 = exports.Granularity21 || (exports.Granularity21 = {}));
var PageType13;
(function (PageType13) {
    PageType13["ALL_PAGE_TYPES"] = "all-page-types";
    PageType13["CONTENT"] = "content";
    PageType13["NON_CONTENT"] = "non-content";
})(PageType13 = exports.PageType13 || (exports.PageType13 = {}));
var ActivityLevel3;
(function (ActivityLevel3) {
    ActivityLevel3["ALL_ACTIVITY_LEVELS"] = "all-activity-levels";
    ActivityLevel3["_1__4_EDITS"] = "1..4-edits";
    ActivityLevel3["_5__24_EDITS"] = "5..24-edits";
    ActivityLevel3["_25__99_EDITS"] = "25..99-edits";
    ActivityLevel3["_100___EDITS"] = "100..-edits";
})(ActivityLevel3 = exports.ActivityLevel3 || (exports.ActivityLevel3 = {}));
var AccessSite3;
(function (AccessSite3) {
    AccessSite3["ALL_SITES"] = "all-sites";
    AccessSite3["DESKTOP_SITE"] = "desktop-site";
    AccessSite3["MOBILE_SITE"] = "mobile-site";
})(AccessSite3 = exports.AccessSite3 || (exports.AccessSite3 = {}));
var Granularity22;
(function (Granularity22) {
    Granularity22["HOURLY"] = "hourly";
    Granularity22["DAILY"] = "daily";
    Granularity22["MONTHLY"] = "monthly";
})(Granularity22 = exports.Granularity22 || (exports.Granularity22 = {}));
var Access5;
(function (Access5) {
    Access5["ALL_ACCESS"] = "all-access";
    Access5["DESKTOP"] = "desktop";
    Access5["MOBILE_APP"] = "mobile-app";
    Access5["MOBILE_WEB"] = "mobile-web";
})(Access5 = exports.Access5 || (exports.Access5 = {}));
var Agent3;
(function (Agent3) {
    Agent3["ALL_AGENTS"] = "all-agents";
    Agent3["USER"] = "user";
    Agent3["SPIDER"] = "spider";
})(Agent3 = exports.Agent3 || (exports.Agent3 = {}));
var Agent4;
(function (Agent4) {
    Agent4["ALL_AGENTS"] = "all-agents";
    Agent4["USER"] = "user";
    Agent4["SPIDER"] = "spider";
    Agent4["BOT"] = "bot";
})(Agent4 = exports.Agent4 || (exports.Agent4 = {}));
var Tool;
(function (Tool) {
    Tool["MT"] = "mt";
    Tool["DICTIONARY"] = "dictionary";
})(Tool = exports.Tool || (exports.Tool = {}));
var Provider2;
(function (Provider2) {
    Provider2["JSONDICT"] = "JsonDict";
    Provider2["DICTD"] = "Dictd";
})(Provider2 = exports.Provider2 || (exports.Provider2 = {}));
var Type;
(function (Type) {
    Type["TEX"] = "tex";
    Type["INLINE_TEX"] = "inline-tex";
    Type["CHEM"] = "chem";
})(Type = exports.Type || (exports.Type = {}));
var Provider;
(function (Provider) {
    Provider["APERTIUM"] = "Apertium";
    Provider["YANDEX"] = "Yandex";
    Provider["YOUDAO"] = "Youdao";
})(Provider = exports.Provider || (exports.Provider = {}));
const graphql_1 = require("graphql");
const runtime_1 = require("@graphql-mesh/runtime");
const store_1 = require("@graphql-mesh/store");
const path_1 = require("path");
const transpile_only_1 = tslib_1.__importDefault(require("ts-node/register/transpile-only"));
const cache_inmemory_lru_1 = tslib_1.__importDefault(require("@graphql-mesh/cache-inmemory-lru"));
const openapi_1 = tslib_1.__importDefault(require("@graphql-mesh/openapi"));
const merger_bare_1 = tslib_1.__importDefault(require("@graphql-mesh/merger-bare"));
const oas_schema_js_1 = tslib_1.__importDefault(require("./sources/Wiki/oas-schema.js"));
const importedModules = {
    // @ts-ignore
    ["ts-node/register/transpile-only"]: transpile_only_1.default,
    // @ts-ignore
    ["@graphql-mesh/cache-inmemory-lru"]: cache_inmemory_lru_1.default,
    // @ts-ignore
    ["@graphql-mesh/openapi"]: openapi_1.default,
    // @ts-ignore
    ["@graphql-mesh/merger-bare"]: merger_bare_1.default,
    // @ts-ignore
    [".mesh/sources/Wiki/oas-schema.js"]: oas_schema_js_1.default
};
const baseDir = path_1.join(__dirname, '..');
const syncImportFn = (moduleId) => {
    const relativeModuleId = (path_1.isAbsolute(moduleId) ? path_1.relative(baseDir, moduleId) : moduleId).split('\\').join('/');
    if (!(relativeModuleId in importedModules)) {
        throw new Error(`Cannot find module '${relativeModuleId}'.`);
    }
    return importedModules[relativeModuleId];
};
const importFn = async (moduleId) => syncImportFn(moduleId);
const rootStore = new store_1.MeshStore('.mesh', new store_1.FsStoreStorageAdapter({
    cwd: baseDir,
    importFn,
}), {
    readonly: true,
    validate: false
});
require("ts-node/register/transpile-only");
const cache_inmemory_lru_2 = tslib_1.__importDefault(require("@graphql-mesh/cache-inmemory-lru"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const events_1 = require("events");
const utils_1 = require("@graphql-mesh/utils");
const openapi_2 = tslib_1.__importDefault(require("@graphql-mesh/openapi"));
const merger_bare_2 = tslib_1.__importDefault(require("@graphql-mesh/merger-bare"));
const utils_2 = require("@graphql-mesh/utils");
const additionalResolvers$0 = tslib_1.__importStar(require("../additional-resolvers.ts"));
exports.rawConfig = { "sources": [{ "name": "Wiki", "handler": { "openapi": { "source": "https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml" } } }], "additionalTypeDefs": "extend type Query {\n  viewsInPastMonth(project: String!): Float!\n}\n", "additionalResolvers": ["./additional-resolvers.ts"], "require": ["ts-node/register/transpile-only"], "documents": ["example-queries/*.graphql"] };
async function getMeshOptions() {
    const cache = new cache_inmemory_lru_2.default({
        ...(exports.rawConfig.cache || {}),
        store: rootStore.child('cache'),
    });
    const eventEmitter = new events_1.EventEmitter({ captureRejections: true });
    eventEmitter.setMaxListeners(Infinity);
    const pubsub = new graphql_subscriptions_1.PubSub({ eventEmitter });
    const sourcesStore = rootStore.child('sources');
    const logger = new utils_1.DefaultLogger('Mesh');
    const sources = [];
    const transforms = [];
    const wikiTransforms = [];
    const wikiHandler = new openapi_2.default({
        name: exports.rawConfig.sources[0].name,
        config: exports.rawConfig.sources[0].handler.openapi,
        baseDir,
        cache,
        pubsub,
        store: sourcesStore.child(exports.rawConfig.sources[0].name),
        logger: logger.child(exports.rawConfig.sources[0].name),
        importFn
    });
    sources.push({
        name: 'Wiki',
        handler: wikiHandler,
        transforms: wikiTransforms
    });
    const merger = new merger_bare_2.default({
        cache,
        pubsub,
        logger: logger.child('BareMerger'),
        store: rootStore.child('bareMerger')
    });
    const additionalTypeDefs = [graphql_1.parse(/* GraphQL */ `extend type Query {
  viewsInPastMonth(project: String!): Float!
}
`),];
    const additionalResolversRawConfig = [];
    additionalResolversRawConfig.push(additionalResolvers$0.resolvers || additionalResolvers$0.default || additionalResolvers$0);
    const additionalResolvers = await utils_2.resolveAdditionalResolvers(baseDir, additionalResolversRawConfig, importFn, pubsub);
    const liveQueryInvalidations = exports.rawConfig.liveQueryInvalidations;
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
exports.getMeshOptions = getMeshOptions;
exports.documentsInSDL = [/* GraphQL */ `query viewsInPastMonth {
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
async function getBuiltMesh() {
    const meshConfig = await getMeshOptions();
    return runtime_1.getMesh(meshConfig);
}
exports.getBuiltMesh = getBuiltMesh;
async function getMeshSDK() {
    const { sdkRequester } = await getBuiltMesh();
    return getSdk(sdkRequester);
}
exports.getMeshSDK = getMeshSDK;
exports.viewsInPastMonthDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "viewsInPastMonth" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "viewsInPastMonth" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "project" }, "value": { "kind": "StringValue", "value": "en.wikipedia.org", "block": false } }] }] } }] };
exports.wikipediaMetricsDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "wikipediaMetrics" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "access" }, "value": { "kind": "EnumValue", "value": "ALL_ACCESS" } }, { "kind": "Argument", "name": { "kind": "Name", "value": "agent" }, "value": { "kind": "EnumValue", "value": "USER" } }, { "kind": "Argument", "name": { "kind": "Name", "value": "start" }, "value": { "kind": "StringValue", "value": "20200101", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "end" }, "value": { "kind": "StringValue", "value": "20200226", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "project" }, "value": { "kind": "StringValue", "value": "en.wikipedia.org", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "granularity" }, "value": { "kind": "EnumValue", "value": "DAILY" } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "items" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "views" } }] } }] } }] } }] };
function getSdk(requester) {
    return {
        viewsInPastMonth(variables, options) {
            return requester(exports.viewsInPastMonthDocument, variables, options);
        },
        wikipediaMetrics(variables, options) {
            return requester(exports.wikipediaMetricsDocument, variables, options);
        }
    };
}
exports.getSdk = getSdk;
