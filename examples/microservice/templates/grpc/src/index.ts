import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROTO_PATH = path.join(__dirname, '../proto/service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const service = protoDescriptor.<%= name %>;

const server = new grpc.Server();

// Add your service implementation here
server.addService(service.service, {
  // Example method
  exampleMethod: (call, callback) => {
    callback(null, { message: 'Hello from <%= name %>' });
  },
});

const port = process.env.PORT || <%= port %>;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
  server.start();
  console.log(`<%= name %> gRPC server running on port ${port}`);
});
