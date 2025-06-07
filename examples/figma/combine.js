import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'enquirer';
const { Select, Confirm } = pkg;
import fs from 'fs/promises';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to strip ANSI color codes
function stripAnsi(str) {
	return str.replace(/\x1B\[\d+m/g, '');
}

async function getExampleChoices(type) {
	const examplesDir = path.join(__dirname, 'templates/examples');
	const choices = [];
	// Strip any ANSI color codes from the type
	type = stripAnsi(type).toLowerCase();

	const dirToRead = path.join(examplesDir, type);

	try {
		const examples = await fs.readdir(dirToRead);

		for (const example of examples) {
			const fullPath = path.join(dirToRead, example);
			const stats = await fs.stat(fullPath);

			if (stats.isDirectory()) {
				choices.push({
					message: example.charAt(0).toUpperCase() + example.slice(1).replace(/-/g, ' '),
					name: example,
					value: example
				});
			}
		}
	} catch (error) {
		console.error('Full error details:', {
			message: error.message,
			code: error.code,
			path: error.path,
			stack: error.stack
		});
		console.warn(`Warning: Could not read ${type} examples directory:`, error.message);
	}

	return choices;
}

async function generateWebFramework() {
	const combino = new Combino();

	// Framework selection
	const frameworkPrompt = new Select({
		name: 'framework',
		message: 'Choose your framework',
		choices: ['react', 'svelte', 'vue'],
		initial: 'react'
	});

	// TypeScript confirmation
	const typescriptPrompt = new Confirm({
		name: 'typescript',
		message: 'Include TypeScript?',
		initial: true
	});

	// Plugin/Widget selection
	const typePrompt = new Select({
		name: 'type',
		message: 'Create plugin or widget?',
		choices: [
			{ message: 'Plugin', name: 'plugin', value: 'plugin' },
			{ message: 'Widget', name: 'widget', value: 'widget' }
		],
		initial: 0
	});

	// Get user choices
	const framework = await frameworkPrompt.run();
	const typescript = await typescriptPrompt.run();
	const type = await typePrompt.run();

	// Get examples for the selected type
	const exampleChoices = await getExampleChoices(type);

	if (!exampleChoices.length) {
		console.error(`No examples found for type: ${type}`);
		process.exit(1);
	}

	// Example selection
	const examplePrompt = new Select({
		name: 'example',
		message: `Choose a ${type} example`,
		choices: exampleChoices,
		initial: exampleChoices[0]?.value
	});

	const example = await examplePrompt.run();

	// Prepare template paths based on user choices
	const templates = [
		path.join(__dirname, "templates/base"),
		path.join(__dirname, `templates/frameworks/${framework}`)
	];

	if (typescript) {
		templates.push(path.join(__dirname, "templates/typescript"));
	}

	console.log(path.join(__dirname, `templates/examples/${type}/${example}`))
	// Add example template
	templates.push(path.join(__dirname, `templates/examples/${type}/${example}`));

	// Generate the project
	await combino.combine({
		outputDir: path.join(__dirname, `output/${framework}-${type}`),
		templates,
		data: {
			framework,
			language: typescript ? 'ts' : 'js',
			name: `my-figma-${type}`,
			description: `A Figma ${type} with ${framework} and ${typescript ? 'TypeScript' : 'JavaScript'}`,
			typescript: typescript
		}
	});

	console.log(`Successfully generated ${framework} ${type} in output/${framework}-${type}`);
}

generateWebFramework().catch(console.error);