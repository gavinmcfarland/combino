import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateWebFramework() {
	const combino = new Combino();

	// Example 1: React with TypeScript
	await combino.combine({
		outputDir: path.join(__dirname, "output/react-ts"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/react"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			framework: "react",
			language: "ts",
			name: "my-react-app",
			description: "A React application with TypeScript"
		}
	});

	// Example 2: Vue with JavaScript
	await combino.combine({
		outputDir: path.join(__dirname, "output/vue-js"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/vue")
		],
		data: {
			framework: "vue",
			language: "js",
			name: "my-vue-app",
			description: "A Vue application"
		}
	});

	// Example 3: Svelte with TypeScript
	await combino.combine({
		outputDir: path.join(__dirname, "output/svelte-ts"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/svelte"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			framework: "svelte",
			language: "ts",
			name: "my-svelte-app",
			description: "A Svelte application with TypeScript"
		}
	});
}

generateWebFramework().catch(console.error);
