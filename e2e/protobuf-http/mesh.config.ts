import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildASTSchema, parse } from 'graphql';
import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

/** `connect` → ConnectRPC unary; `twirp` → Twirp unary under `/twirp` + application/protobuf header. */
const style = process.env.PROTOBUF_HTTP_STYLE === 'twirp' ? 'twirp' : 'connect';
const servicePort = opts.getServicePort(style);
const location =
  style === 'twirp'
    ? `http://localhost:${servicePort}/twirp`
    : `http://localhost:${servicePort}`;

function loadHandProtobufSubgraph(name: string, relativeSdlPath: string) {
  return () => {
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
    return {
      name,
      schema$: buildASTSchema(parse(sdl), {
        assumeValidSDL: true,
        assumeValid: true,
      }),
    };
  };
}

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadHandProtobufSubgraph('movies', './subgraphs/movies.graphql'),
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  transports: {
    protobuf: import('@graphql-mesh/transport-protobuf'),
  },
});
