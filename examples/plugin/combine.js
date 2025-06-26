import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePlugin() {
	const combino = new Combino();

	// Example 1: Figma Plugin
	await combino.combine({
		outputDir: path.join(__dirname, "output/figma-plugin"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/figma"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			pluginType: "figma",
			name: "design-tools",
			description: "Enhanced design tools for Figma",
			version: "1.0.0",
			author: "Design Team",
			ui: "react",
			language: "ts"
		}
	});

	// Example 2: VS Code Extension
	await combino.combine({
		outputDir: path.join(__dirname, "output/vscode-extension"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/vscode"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			pluginType: "vscode",
			name: "code-assistant",
			description: "AI-powered code assistant for VS Code",
			version: "1.0.0",
			author: "Dev Team",
			language: "ts",
			features: ["completion", "refactoring", "linting"]
		}
	});

	// Example 3: Chrome Extension
	await combino.combine({
		outputDir: path.join(__dirname, "output/chrome-extension"),
		include: [
			path.join(__dirname, "templates/base"),
			path.join(__dirname, "templates/chrome"),
			path.join(__dirname, "templates/typescript")
		],
		data: {
			pluginType: "chrome",
			name: "web-helper",
			description: "Productivity tools for web browsing",
			version: "1.0.0",
			author: "Web Team",
			language: "ts",
			permissions: ["storage", "tabs", "bookmarks"]
		}
	});
}

generatePlugin().catch(console.error);
