import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getExampleChoices() {
	const examplesDir = path.join(__dirname, 'examples');
	const choices = [];

	// Read plugin and widget directories
	const pluginDir = path.join(examplesDir, 'plugin');
	const widgetDir = path.join(examplesDir, 'widget');

	// Get plugin examples
	try {
		const pluginExamples = await fs.readdir(pluginDir);
		for (const example of pluginExamples) {
			const stats = await fs.stat(path.join(pluginDir, example));
			if (stats.isDirectory()) {
				choices.push({
					name: `${chalk.cyan('Plugin')}: ${example.charAt(0).toUpperCase() + example.slice(1).replace(/-/g, ' ')}`,
					value: `plugin/${example}`
				});
			}
		}
	} catch (error) {
		console.warn('Warning: Could not read plugin examples directory:', error.message);
	}

	// Get widget examples
	try {
		const widgetExamples = await fs.readdir(widgetDir);
		for (const example of widgetExamples) {
			const stats = await fs.stat(path.join(widgetDir, example));
			if (stats.isDirectory()) {
				choices.push({
					name: `${chalk.green('Widget')}: ${example.charAt(0).toUpperCase() + example.slice(1).replace(/-/g, ' ')}`,
					value: `widget/${example}`
				});
			}
		}
	} catch (error) {
		console.warn('Warning: Could not read widget examples directory:', error.message);
	}

	return choices;
}

async function generateWebFramework() {
	const combino = new Combino();

	// Get dynamic example choices
	const exampleChoices = await getExampleChoices();

	// Prompt for user input
	const answers = await inquirer.prompt([
		{
			type: 'list',
			name: 'framework',
			message: 'Choose your framework',
			choices: ['react', 'svelte', 'vue'],
			default: 'react'
		},
		{
			type: 'confirm',
			name: 'typescript',
			message: 'Include TypeScript?',
			default: true
		},
		{
			type: 'list',
			name: 'example',
			message: 'Choose an example',
			choices: exampleChoices,
			default: exampleChoices[0]?.value
		}
	]);

	// Prepare template paths based on user choices
	const templates = [
		path.join(__dirname, "templates/base"),
		path.join(__dirname, `templates/frameworks/${answers.framework}`)
	];

	if (answers.typescript) {
		templates.push(path.join(__dirname, "templates/typescript"));
	}

	// Add example template
	templates.push(path.join(__dirname, `examples/${answers.example}`));

	// Extract example type (plugin/widget) from the path
	const exampleType = answers.example.split('/')[0];

	// Generate the project
	await combino.combine({
		outputDir: path.join(__dirname, `output/${answers.framework}-${exampleType}`),
		templates,
		data: {
			framework: answers.framework,
			language: answers.typescript ? 'ts' : 'js',
			name: `my-figma-${exampleType}`,
			description: `A Figma ${exampleType} with ${answers.framework} and ${answers.typescript ? 'TypeScript' : 'JavaScript'}`
		}
	});

	console.log(`Successfully generated ${answers.framework} ${exampleType} in output/${answers.framework}-${exampleType}`);
}

generateWebFramework().catch(console.error);
