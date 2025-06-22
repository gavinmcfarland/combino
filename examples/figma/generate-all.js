import { Combino } from '../../dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hardcoded choices based on available templates
const FRAMEWORKS = ['react', 'svelte']; // Excluding 'vue' as requested
const TYPES = ['plugin', 'widget'];
const TYPESCRIPT_OPTIONS = [true, false];

// Available examples for each type - can be easily modified to disable types
const EXAMPLES = {
	plugin: ['basic', 'minimal'],
	// widget: ['sticky-note']
};

// Helper function to get enabled types and their examples
function getEnabledTypes() {
	return Object.entries(EXAMPLES)
		.filter(([type, examples]) => examples.length > 0)
		.map(([type, examples]) => ({ type, examples }));
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

// Helper function to generate a descriptive name
function generateName(framework, type, example, typescript) {
	const langSuffix = typescript ? '-ts' : '-js';
	return `${example}-${framework}-${type}${langSuffix}`;
}

async function generateAllCombinations() {
	const combino = new Combino();
	const outputBaseDir = path.join(__dirname, 'output');

	// Clear the entire output directory
	await clearDirectory(outputBaseDir);

	console.log(chalk.blue('🚀 Starting automated generation of all combinations...\n'));

	let totalCombinations = 0;
	let successfulGenerations = 0;
	let failedGenerations = 0;

	// Generate all combinations
	for (const framework of FRAMEWORKS) {
		for (const { type, examples } of getEnabledTypes()) {
			for (const example of examples) {
				for (const typescript of TYPESCRIPT_OPTIONS) {
					totalCombinations++;

					const name = generateName(framework, type, example, typescript);
					const outputDir = path.join(outputBaseDir, name);

					console.log(chalk.cyan(`\n📦 Generating: ${name}`));
					console.log(chalk.gray(`   Framework: ${framework}`));
					console.log(chalk.gray(`   Type: ${type}`));
					console.log(chalk.gray(`   Example: ${example}`));
					console.log(chalk.gray(`   TypeScript: ${typescript}`));

					try {
						// Prepare template paths based on choices
						const templates = [];

						// Add example template
						templates.push(path.join(__dirname, `templates/examples/${type}/${example}`));

						// Add framework template
						templates.push(path.join(__dirname, `templates/frameworks/${framework}`));

						// Add TypeScript template if needed
						if (typescript) {
							templates.push(path.join(__dirname, "templates/typescript"));
						}

						// Generate the project
						await combino.combine({
							outputDir,
							templates,
							data: {
								framework,
								language: typescript ? 'ts' : 'js',
								name,
								description: `A Figma ${type} with ${framework} and ${typescript ? 'TypeScript' : 'JavaScript'}`,
								typescript: typescript
							}
						});

						console.log(chalk.green(`   ✅ Successfully generated: ${name}`));
						successfulGenerations++;

					} catch (error) {
						console.log(chalk.red(`   ❌ Failed to generate: ${name}`));
						console.log(chalk.red(`   Error: ${error.message}`));
						failedGenerations++;
					}
				}
			}
		}
	}

	// Summary
	console.log(chalk.blue('\n📊 Generation Summary:'));
	console.log(chalk.white(`   Total combinations: ${totalCombinations}`));
	console.log(chalk.green(`   Successful: ${successfulGenerations}`));
	console.log(chalk.red(`   Failed: ${failedGenerations}`));
	console.log(chalk.blue(`   Output directory: ${outputBaseDir}`));

	// List all generated projects
	console.log(chalk.blue('\n📁 Generated Projects:'));
	try {
		const projects = await fs.readdir(outputBaseDir);
		projects.forEach(project => {
			console.log(chalk.white(`   📂 ${project}`));
		});
	} catch (error) {
		console.log(chalk.yellow('   No projects generated or output directory not accessible'));
	}
}

// Parse CLI arguments for additional options
function parseArgs() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run') || args.includes('-d');
	const verbose = args.includes('--verbose') || args.includes('-v');
	return { dryRun, verbose };
}

async function main() {
	const { dryRun, verbose } = parseArgs();

	if (dryRun) {
		console.log(chalk.yellow('🔍 DRY RUN MODE - No files will be generated\n'));
		console.log(chalk.blue('Combinations that would be generated:'));

		let count = 0;
		for (const framework of FRAMEWORKS) {
			for (const { type, examples } of getEnabledTypes()) {
				for (const example of examples) {
					for (const typescript of TYPESCRIPT_OPTIONS) {
						count++;
						const name = generateName(framework, type, example, typescript);
						console.log(chalk.white(`   ${count}. ${name}`));
					}
				}
			}
		}

		console.log(chalk.blue(`\nTotal combinations: ${count}`));
		return;
	}

	if (verbose) {
		console.log(chalk.blue('Available choices:'));
		console.log(chalk.white(`   Frameworks: ${FRAMEWORKS.join(', ')}`));
		console.log(chalk.white(`   Enabled Types: ${getEnabledTypes().map(t => t.type).join(', ')}`));
		console.log(chalk.white(`   TypeScript options: ${TYPESCRIPT_OPTIONS.join(', ')}`));
		console.log(chalk.white(`   Examples: ${JSON.stringify(EXAMPLES, null, 2)}`));
		console.log('');
	}

	await generateAllCombinations();
}

main().catch(error => {
	console.error(chalk.red('Fatal error:'), error);
	process.exit(1);
});
