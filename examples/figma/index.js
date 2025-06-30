import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'enquirer';
const { Select, Confirm, Input } = pkg;
import fs from 'fs/promises';
import chalk from 'chalk';
import { ejs } from '../../dist/plugins/ejs.js';
import { stripTS } from '../../dist/plugins/combino-plugin-strip-ts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const debug = args.includes('-d') || args.includes('--debug');
	return { debug };
}

// Helper function to strip ANSI color codes
function stripAnsi(str) {
	return str.replace(/\x1B\[\d+m/g, '');
}

// Helper function to clear directory if it exists
async function clearDirectory(dirPath) {
	try {
		await fs.rm(dirPath, { recursive: true, force: true });
		console.log(chalk.yellow(`Cleared existing directory: ${dirPath}`));
	} catch (error) {
		// Directory doesn't exist, which is fine
	}
}

async function getFrameworkChoices() {
	const frameworksDir = path.join(__dirname, 'templates/frameworks');
	const choices = [];

	try {
		const frameworks = await fs.readdir(frameworksDir);

		for (const framework of frameworks) {
			const fullPath = path.join(frameworksDir, framework);
			const stats = await fs.stat(fullPath);

			if (stats.isDirectory()) {
				choices.push({
					message: framework.charAt(0).toUpperCase() + framework.slice(1),
					name: framework,
					value: framework
				});
			}
		}
	} catch (error) {
		console.error('Error reading frameworks directory:', error);
		// Fallback to default choices if directory can't be read
		return [
			{ message: 'React', name: 'react', value: 'react' },
			{ message: 'Svelte', name: 'svelte', value: 'svelte' },
			{ message: 'Vue', name: 'vue', value: 'vue' }
		];
	}

	return choices;
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
	const { debug } = parseArgs();

	// Framework selection
	const frameworkChoices = await getFrameworkChoices();
	const frameworkPrompt = new Select({
		name: 'framework',
		message: 'Choose your framework',
		choices: frameworkChoices,
		initial: 0
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
	const typescript = await typescriptPrompt.run();

	// Name prompt
	const namePrompt = new Input({
		name: 'name',
		message: `${type.charAt(0).toUpperCase() + type.slice(1)} name?`,
		initial: `${example}-${framework}-${type}`
	});

	const name = await namePrompt.run();

	// Clear the specific output directory if it exists
	let outputDir = path.join(__dirname, `output/${name}`);

	// Add debug suffix if debug flag is enabled
	if (debug) {
		const suffix = typescript ? '-ts' : '-js';
		outputDir = path.join(__dirname, `output/${name}${suffix}`);
	}

	await clearDirectory(outputDir);

	// Prepare template paths based on user choices
	const templates = [];

	// Add example template
	templates.push(path.join(__dirname, `templates/examples/${type}/${example}`));

	templates.push(path.join(__dirname, `templates/frameworks/${framework}`))

	if (typescript) {
		templates.push(path.join(__dirname, "templates/typescript"));
	}

	// Generate the project using the new plugin system
	await combino.combine({
		outputDir,
		include: templates,
		data: {
			framework,
			language: typescript ? 'ts' : 'js',
			name,
			description: `A Figma ${type} with ${framework} and ${typescript ? 'TypeScript' : 'JavaScript'}`,
			typescript: typescript
		},
		plugins: [
			// EJS template engine
			ejs(),
			// Strip TS functionality (replaces onFileProcessed)
			stripTS(),
		],
	});

	console.log(`Successfully generated ${framework} ${type} in ${outputDir}`);
}

generateWebFramework().catch(console.error);