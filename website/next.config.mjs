import { withGuildDocs } from 'guild-docs/next.config';
import { applyUnderscoreRedirects } from 'guild-docs/underscore-redirects';

export default withGuildDocs({
  basePath: process.env.NEXT_BASE_PATH && process.env.NEXT_BASE_PATH !== '' ? process.env.NEXT_BASE_PATH : undefined,
  experimental: {},
  images: {
    unoptimized: true, // doesn't work with `next export`
    allowFutureImage: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config, meta) {
    applyUnderscoreRedirects(config, meta);

    return config;
  },
  redirects: () =>
    Object.entries({
      '/docs/introduction': '/docs',
      '/docs/getting-started': '/docs',
      '/docs/getting-started/introduction': '/docs',
      '/docs/getting-started/basic-example': '/docs',
      '/docs/handlers': '/docs/handlers/handlers-introduction',
      '/docs/handlers/available-handlers': '/docs/handlers/handlers-introduction',
      '/docs/api/modules/runtime_src': '/docs/getting-started/your-first-mesh-gateway',
      '/docs/recipes': '/docs',
      '/docs/api': '/docs',
      '/docs/modules': '/docs',
      '/docs/api/modules': '/docs',
      '/docs/api/interfaces/types_src.YamlConfig.FilterHelperArgsOpts': '/docs',
      '/docs/api/classes/apollo_link_src.MeshApolloLink': '/docs',
      '/docs/api/classes': '/docs',
      '/docs/api/modules/json_machete_src': '/docs/handlers/json-schema',
      '/docs/recipes/as-gateway': '/docs/getting-started/your-first-mesh-gateway',
      '/docs/guides/combine-many-sources': '/docs/getting-started/combine-multiple-sources',
      '/docs/api/modules/urql_src': '/docs',
      '/docs/guides': '/docs',
      '/docs/recipes/multiple-apis': '/docs/getting-started/combine-multiple-sources',
      '/docs/recipes/as-sdk': '/docs/guides/mesh-sdk',
      '/docs/migration/openapi-0': '/docs/migration/openapi-0.31-0.32',
      '/docs/recipes/build-mesh-artifacts': '/docs/guides/mesh-sdk',
      '/docs/api/interfaces/types_src.YamlConfig.RateLimitPluginConfig': '/docs/getting-started/customize-mesh-server',
      '/docs/api/classes/utils_src.DefaultLogger': '/docs/getting-started/customize-mesh-server',
      '/docs/api/classes/handlers_mysql_src.MySQLHandler': '/docs/handlers/mysql',
      '/docs/api/interfaces/types_src.YamlConfig.CorsConfig': '/docs/getting-started/customize-mesh-server',
      '/docs/api/modules/plugins_prometheus_src': '/docs/getting-started/customize-mesh-server',
      '/docs/api/interfaces/types_src.YamlConfig.ServeConfig': '/docs/getting-started/customize-mesh-server',
      '/docs/api/interfaces/types_src.YamlConfig.SortHelperArgsOpts': '/docs/getting-started/customize-mesh-server',
      '/docs/api/modules/handlers_grpc_src': '/docs/handlers/grpc',
      '/docs/api/modules/loaders_openapi_src': '/docs/handlers/openapi',
      '/docs/api/modules/jit_executor_src': '/docs/getting-started/customize-mesh-server',
      '/docs/api/modules/handlers_raml_src': '/docs/handlers/openapi',
      '/docs/api/modules/loaders_raml_src': '/docs/handlers/openapi',
      '/docs/api/interfaces/types_src.YamlConfig.OpenapiHandler': '/docs/handlers/openapi',
      '/docs/api/interfaces/types_src.YamlConfig.QueryStringOptions1': '/docs',
      '/docs/api/modules/handlers_mongoose_src': '/docs/handlers/mongoose',
      '/docs/api/interfaces/types_src.YamlConfig.ComposeWithMongooseFieldsOpts': '/docs/handlers/mongoose',
      '/docs/api/interfaces/runtime_src.MeshInstance': '/docs/guides/mesh-sdk',
      '/docs/api/modules/utils_src': '/docs/getting-started/customize-mesh-server',
      '/docs/api/interfaces/types_src.YamlConfig.Plugin': '/docs/getting-started/customize-mesh-server',
      '/docs/api/interfaces/types_src.YamlConfig.Transform': '/docs/getting-started/customize-mesh-server',
      '/docs/api/interfaces/types_src.MeshTransform': '/docs/getting-started/customize-mesh-server',
      '/docs/api/modules/transforms_rename_src': '/docs/transforms/rename',
      '/docs/api/modules/config': '/docs',
      '/docs/api/modules/config_src': '/docs',
      '/docs/api/modules/transforms_prefix_src': '/docs',
      '/docs/api/interfaces/types_src.YamlConfig.PrefixTransformConfig': '/docs',
      '/docs/api/interfaces': '/docs',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
