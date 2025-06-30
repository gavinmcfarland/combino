import { Combino } from "../../src/index.js";
import { ejs } from "../../src/plugins/ejs.js";
import { handlebars } from "../../src/plugins/handlebars.js";
import { mustache } from "../../src/plugins/mustache.js";
import { combinoCore } from "../../src/plugins/combino-plugin-strip-ts.js";

// Example 1: EJS plugin with transform hook
const ejsWithTransform = ejs(
	{ patterns: ["*.ejs", "*.js"] },
	async (context) => {
		console.log(`EJS transform hook processing: ${context.targetPath}`);

		// Add a comment to the top of the file
		const comment = `// Processed by EJS plugin at ${new Date().toISOString()}\n`;
		const newContent = comment + context.content;

		return {
			content: newContent,
			targetPath: context.targetPath, // Keep same path
		};
	}
);

// Example 2: Handlebars plugin with transform hook that changes file extension
const handlebarsWithTransform = handlebars(
	{ patterns: ["*.hbs"] },
	async (context) => {
		console.log(`Handlebars transform hook processing: ${context.targetPath}`);

		// Change .hbs files to .html
		const newPath = context.targetPath.replace(/\.hbs$/, '.html');

		// Add some metadata
		const metadata = `<!-- Generated from ${context.sourcePath} -->\n`;
		const newContent = metadata + context.content;

		return {
			content: newContent,
			targetPath: newPath, // Change the output path
		};
	}
);

// Example 3: Plugin with conditional transform
const conditionalTransform = ejs(
	{ patterns: ["*.md"] },
	async (context) => {
		// Only transform files that contain certain content
		if (context.content.includes('{{')) {
			console.log(`Conditional transform processing: ${context.targetPath}`);

			// Add a processing note
			const note = `<!-- This file was processed by the conditional transform hook -->\n`;
			return {
				content: note + context.content,
				targetPath: context.targetPath,
			};
		}

		// Return unchanged content for files that don't match
		return {
			content: context.content,
			targetPath: context.targetPath,
		};
	}
);

// Example 4: Plugin with data-dependent transform
const dataDependentTransform = handlebars(
	{ patterns: ["*.txt"] },
	async (context) => {
		// Use the data from the context to customize the transform
		const { data } = context;

		if (data.framework === 'react') {
			// Add React-specific processing
			const reactHeader = `// React Framework: ${data.framework}\n`;
			return {
				content: reactHeader + context.content,
				targetPath: context.targetPath,
			};
		} else if (data.framework === 'vue') {
			// Add Vue-specific processing
			const vueHeader = `<!-- Vue Framework: ${data.framework} -->\n`;
			return {
				content: vueHeader + context.content,
				targetPath: context.targetPath,
			};
		}

		// Default processing
		return {
			content: context.content,
			targetPath: context.targetPath,
		};
	}
);

// Example 5: Using the combinoCore plugin (replaces onFileProcessed)
async function runCombinoCoreExample() {
	const combino = new Combino();

	await combino.combine({
		outputDir: "output",
		include: ["templates"],
		data: {
			framework: "react",
			typescript: false, // This will trigger TypeScript stripping
			projectName: "My Awesome Project",
			author: "John Doe",
			features: ["routing", "state-management", "testing"],
		},
		plugins: [
			// Template engines
			ejs(),
			handlebars(),
			mustache(),

			// Core functionality plugin (replaces onFileProcessed)
			combinoCore({
				priority: 0, // Run after template processing
			}),
		],
	});

	console.log("Combino Core plugin example completed successfully!");
}

// Run the examples
async function runExamples() {
	const combino = new Combino();

	// Example 1: Using plugins with transform hooks
	await combino.combine({
		outputDir: "./output",
		include: ["./templates"],
		plugins: [
			ejsWithTransform,
			handlebarsWithTransform,
			conditionalTransform,
			dataDependentTransform,
		],
		data: {
			name: "World",
			framework: "react",
			items: ["item1", "item2", "item3"],
		},
	});

	console.log("Plugin transform hook examples completed successfully!");
}

// Run all examples
async function runAllExamples() {
	await runExamples();
	await runCombinoCoreExample();
}

runAllExamples().catch(console.error);
