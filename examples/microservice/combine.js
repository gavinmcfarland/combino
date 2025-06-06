import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateMicroservice() {
	const combino = new Combino();

	// Example 1: REST API Service with Express
	await combino.combine({
		outputDir: path.join(__dirname, "output/rest-service"),
		templates: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/express"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			serviceType: "rest",
			framework: "express",
			language: "ts",
			name: "user-service",
			description: "User management microservice",
			port: 3000,
			database: "postgres"
		}
	});

	// Example 2: GraphQL Service with Apollo
	await combino.combine({
		outputDir: path.join(__dirname, "output/graphql-service"),
		templates: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/apollo"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			serviceType: "graphql",
			framework: "apollo",
			language: "ts",
			name: "product-service",
			description: "Product catalog GraphQL service",
			port: 4000,
			database: "mongodb"
		}
	});

	// Example 3: gRPC Service
	await combino.combine({
		outputDir: path.join(__dirname, "output/grpc-service"),
		templates: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/grpc"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			serviceType: "grpc",
			framework: "grpc",
			language: "ts",
			name: "payment-service",
			description: "Payment processing gRPC service",
			port: 5000,
			database: "redis"
		}
	});
}

generateMicroservice().catch(console.error);
