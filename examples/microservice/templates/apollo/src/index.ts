import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const port = process.env.PORT || <%= port %>;

const { url } = await startStandaloneServer(server, {
  listen: { port: Number(port) },
});

console.log(`<%= name %> GraphQL server running at ${url}`);
