import type { GraphQLSchema } from 'graphql';
import { type LandingPageRenderer, type YogaServerInstance } from 'graphql-yoga';
import type { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql.js';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger, LogLevel, mapMaybePromise } from '@graphql-mesh/utils';
import { type MaybePromise } from '@graphql-tools/utils';
import { createGatewayCore } from './createGatewayCore.js';
import { createGatewayPlugins } from './createGatewayPlugins.js';
import landingPageHtml from './landing-page-html.js';
import { defaultProductLogo } from './productLogo.js';
import type { GatewayConfig } from './types.js';
import { defaultQueryText } from './utils.js';

export type GatewayRuntime<TContext extends Record<string, any> = Record<string, any>> =
  YogaServerInstance<unknown, TContext> & {
    invalidateUnifiedGraph(): void;
    getSchema(): MaybePromise<GraphQLSchema>;
  } & AsyncDisposable;

export function createGatewayRuntime<TContext extends Record<string, any> = Record<string, any>>(
  config: GatewayConfig<TContext>,
): GatewayRuntime<TContext> {
  let logger: Logger;
  if (config.logging == null) {
    logger = new DefaultLogger();
  } else if (typeof config.logging === 'boolean') {
    logger = config.logging ? new DefaultLogger() : new DefaultLogger('', LogLevel.silent);
  }
  if (typeof config.logging === 'number') {
    logger = new DefaultLogger(undefined, config.logging);
  } else if (typeof config.logging === 'object') {
    logger = config.logging;
  }

  let unifiedGraph: GraphQLSchema;
  let schemaInvalidator: () => void;
  let getSchema: () => MaybePromise<GraphQLSchema> = () => unifiedGraph;
  let contextBuilder: <T>(context: T) => MaybePromise<T>;
  let subgraphInformationHTMLRenderer: () => MaybePromise<string> = () => '';

  const productName = config.productName || 'GraphQL Mesh';
  const productDescription =
    config.productDescription || 'Federated architecture for any API service';
  const productPackageName = config.productPackageName || '@graphql-mesh/serve-cli';
  const productLogo = config.productLogo || defaultProductLogo;
  const productLink = config.productLink || 'https://the-guild.dev/graphql/mesh';

  let graphiqlOptionsOrFactory: GraphiQLOptionsOrFactory<unknown> | false;

  if (config.graphiql == null || config.graphiql === true) {
    graphiqlOptionsOrFactory = {
      title: productName,
      defaultQuery: defaultQueryText,
    };
  } else if (config.graphiql === false) {
    graphiqlOptionsOrFactory = false;
  } else if (typeof config.graphiql === 'object') {
    graphiqlOptionsOrFactory = {
      title: productName,
      defaultQuery: defaultQueryText,
      ...config.graphiql,
    };
  } else if (typeof config.graphiql === 'function') {
    const userGraphiqlFactory = config.graphiql;
    // @ts-expect-error PromiseLike is not compatible with Promise
    graphiqlOptionsOrFactory = function graphiqlOptionsFactoryForMesh(...args) {
      const options = userGraphiqlFactory(...args);
      return mapMaybePromise(options, resolvedOpts => {
        if (resolvedOpts === false) {
          return false;
        }
        if (resolvedOpts === true) {
          return {
            title: productName,
            defaultQuery: defaultQueryText,
          };
        }
        return {
          title: productName,
          defaultQuery: defaultQueryText,
          ...resolvedOpts,
        };
      });
    };
  }

  let landingPageRenderer: LandingPageRenderer | boolean;

  if (config.landingPage == null || config.landingPage === true) {
    landingPageRenderer = async function gatewayLandingPageRenderer(opts) {
      const subgraphHtml = await subgraphInformationHTMLRenderer();
      return new opts.fetchAPI.Response(
        landingPageHtml
          .replace(/__GRAPHIQL_LINK__/g, opts.graphqlEndpoint)
          .replace(/__REQUEST_PATH__/g, opts.url.pathname)
          .replace(/__SUBGRAPH_HTML__/g, subgraphHtml)
          .replaceAll(/__PRODUCT_NAME__/g, productName)
          .replaceAll(/__PRODUCT_DESCRIPTION__/g, productDescription)
          .replaceAll(/__PRODUCT_PACKAGE_NAME__/g, productPackageName)
          .replace(/__PRODUCT_LINK__/, productLink)
          .replace(/__PRODUCT_LOGO__/g, productLogo),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'text/html',
          },
        },
      );
    };
  } else if (typeof config.landingPage === 'function') {
    landingPageRenderer = config.landingPage;
  } else if (config.landingPage === false) {
    landingPageRenderer = false;
  }

  const yoga = createGatewayCore({
    fetchAPI: config.fetchAPI,
    logging: logger,
    cors: config.cors,
    graphiql: graphiqlOptionsOrFactory,
    batching: config.batching,
    graphqlEndpoint: config.graphqlEndpoint,
    maskedErrors: config.maskedErrors,
    healthCheckEndpoint: config.healthCheckEndpoint || '/healthcheck',
    landingPage: landingPageRenderer,
    plugins: base => {
      const pluginsAndSomeExtras = createGatewayPlugins(config, base);

      // Ideally we should not have any of these side effects
      // In time refactor to plugins, or change the public interface of createGatewayRuntime
      schemaInvalidator = pluginsAndSomeExtras.schemaInvalidator;
      getSchema = pluginsAndSomeExtras.getSchema;
      contextBuilder = pluginsAndSomeExtras.contextBuilder;
      subgraphInformationHTMLRenderer = pluginsAndSomeExtras.subgraphInformationHTMLRenderer;

      return pluginsAndSomeExtras.plugins;
    },
    context: contextBuilder,
  });

  Object.defineProperties(yoga, {
    invalidateUnifiedGraph: {
      value: schemaInvalidator,
      configurable: true,
    },
    getSchema: {
      value: getSchema,
      configurable: true,
    },
  });

  return yoga as any as GatewayRuntime<TContext>;
}
