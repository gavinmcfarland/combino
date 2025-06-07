import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getExampleChoices(type) {
	const examplesDir = path.join(__dirname, 'examples');
	const choices = [];

	try {
		const examples = await fs.readdir(path.join(examplesDir, type));
		for (const example of examples) {
			const stats = await fs.stat(path.join(examplesDir, type, example));
			if (stats.isDirectory()) {
				choices.push({
					name: example.charAt(0).toUpperCase() + example.slice(1).replace(/-/g, ' '),
					value: example
				});
			}
		}
	} catch (error) {
		console.warn(`Warning: Could not read ${type} examples directory:`, error.message);
	}

	return choices;
}

async function generateWebFramework() {
	const combino = new Combino();

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
			name: 'type',
			message: 'Create plugin or widget?',
			choices: [
				{ name: chalk.cyan('Plugin'), value: 'plugin' },
				{ name: chalk.green('Widget'), value: 'widget' }
			],
			default: 'plugin'
		}
	]);

	// Get examples for the selected type
	const exampleChoices = await getExampleChoices(answers.type);

	// Prompt for specific example
	const { example } = await inquirer.prompt([
		{
			type: 'list',
			name: 'example',
			message: `Choose a ${answers.type} example`,
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
	templates.push(path.join(__dirname, `examples/${answers.type}/${example}`));

	// Generate the project
	await combino.combine({
		outputDir: path.join(__dirname, `output/${answers.framework}-${answers.type}`),
		templates,
		data: {
			framework: answers.framework,
			language: answers.typescript ? 'ts' : 'js',
			name: `my-figma-${answers.type}`,
			description: `A Figma ${answers.type} with ${answers.framework} and ${answers.typescript ? 'TypeScript' : 'JavaScript'}`
		}
	});

	console.log(`Successfully generated ${answers.framework} ${answers.type} in output/${answers.framework}-${answers.type}`);
}

generateWebFramework().catch(console.error);
