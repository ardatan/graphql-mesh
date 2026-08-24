import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Opts } from '@e2e/opts';
import {
  loadPackageDefinition,
  Server,
  ServerCredentials,
  status,
  type handleUnaryCall,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';

const _dirname = dirname(fileURLToPath(import.meta.url));
const opts = Opts(process.argv);
const port = opts.getServicePort('Echo');

/** Must match e2e GRPC_REFLECTION_TOKEN / mesh.config.ts */
const REQUIRED_REFLECTION_TOKEN = 'reflect-secret';

/** ~5 MiB — above the default 4 MiB gRPC max receive size */
const LARGE_PAYLOAD = Buffer.alloc(5 * 1024 * 1024, 0x61);

const PROTO_PATH = join(_dirname, 'echo.proto');
const packageDefinition = loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const echoProto: any = loadPackageDefinition(packageDefinition).echo;
const reflection = new ReflectionService(packageDefinition);

const getGreeting: handleUnaryCall<{ name: string }, { message: string }> = (call, callback) => {
  callback(null, { message: `Hello ${call.request.name}` });
};

const getSlowGreeting: handleUnaryCall<{ name: string }, { message: string }> = async (
  call,
  callback,
) => {
  await delay(3_000);
  callback(null, { message: `Slow hello ${call.request.name}` });
};

const getLargePayload: handleUnaryCall<{ name: string }, { data: Buffer }> = (_call, callback) => {
  callback(null, { data: LARGE_PAYLOAD });
};

function wrapReflectionAuth(implementation: Record<string, Function>) {
  const wrapped: Record<string, Function> = {};
  for (const [methodName, handler] of Object.entries(implementation)) {
    wrapped[methodName] = function reflectionAuthGuard(call: any, callback?: any) {
      const token = call.metadata?.get('x-reflection-token')?.[0];
      if (token !== REQUIRED_REFLECTION_TOKEN) {
        const err = {
          code: status.UNAUTHENTICATED,
          message: 'missing or invalid x-reflection-token',
        };
        if (typeof callback === 'function') {
          callback(err);
          return;
        }
        call.emit('error', err);
        return;
      }
      return handler.call(this, call, callback);
    };
  }
  return wrapped;
}

function main() {
  const server = new Server({
    // Allow the server itself to send the large payload
    'grpc.max_send_message_length': 8 * 1024 * 1024,
  });

  server.addService(echoProto.Echo.service, {
    GetGreeting: getGreeting,
    GetSlowGreeting: getSlowGreeting,
    GetLargePayload: getLargePayload,
  });

  // Require metadata on reflection only (business RPCs stay open)
  const originalAddService = server.addService.bind(server);
  (server as any).addService = (service: any, implementation: any) =>
    originalAddService(service, wrapReflectionAuth(implementation));
  reflection.addToServer(server);

  server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), err => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Echo gRPC server with reflection on port ${port}`);
    server.start();
  });
}

main();
