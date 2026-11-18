import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createRenameTransform,
  defineConfig as defineComposeConfig,
  loadSdlSubgraph,
  type MeshComposeCLISourceHandlerDef,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

/** `connect` → ConnectRPC unary; `twirp` → Twirp unary under `/twirp` + application/protobuf header. */
const style = process.env.PROTOBUF_HTTP_STYLE === 'twirp' ? 'twirp' : 'connect';
const servicePort = opts.getServicePort(style);
const location =
  style === 'twirp' ? `http://localhost:${servicePort}/twirp` : `http://localhost:${servicePort}`;

function loadHandProtobufSubgraph(
  name: string,
  relativeSdlPath: string,
): MeshComposeCLISourceHandlerDef {
  return ctx => {
    let sdl = readFileSync(join(import.meta.dirname, relativeSdlPath), 'utf8').replaceAll(
      '__LOCATION__',
      location,
    );
    if (style === 'twirp') {
      sdl = sdl.replace(
        '# __TRANSPORT_HEADERS__',
        'headers: [["Content-Type", "application/protobuf"]]',
      );
    } else {
      sdl = sdl.replace(/\n\s*# __TRANSPORT_HEADERS__/, '');
    }
    return loadSdlSubgraph(name, { typeDefs: sdl })(ctx);
  };
}

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadHandProtobufSubgraph('movies', './subgraphs/movies.graphql'),
      // Prove transforms rewrite `@protobuf__rpc(args:)` like `@connect` (no @source/@merge).
      transforms: [
        createRenameTransform({
          argRenamer: ({ fieldName, argName }) =>
            fieldName === 'moviesByYear' && argName === 'year' ? 'releaseYear' : argName,
        }),
      ],
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  transports: {
    protobuf: import('@graphql-mesh/transport-protobuf'),
  },
});
