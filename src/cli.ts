#!/usr/bin/env node

import { Command } from 'commander';
import { Combino } from './index.js';
import { TemplateOptions, MergeStrategy } from './types.js';
import ejs from './plugins/ejs.js';
import ejsMate from './plugins/ejs-mate.js';
import handlebars from './plugins/handlebars.js';
import mustache from './plugins/mustache.js';
import { Plugin } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
	.name('combino')
	.description('Combine multiple template folders to generate custom file and folder structures')
	.version('0.1.0')
	.argument('<include...>', 'One or more template folders to include (first has lowest priority, last wins)')
	.option('-o, --output <dir>', 'Output directory for the generated result', './output')
	.option('-c, --config <path>', 'Path to a .json config file')
	.option('--data <key=value>', 'Inline key-value data to use for templating, conditions, and naming', collectData)
	.option(
		'--template-engine <engine>',
		'Template engine to use (ejs, handlebars, mustache) - requires installing the corresponding dependency',
	)
	.option(
		'--merge <pattern=strategy>',
		"Merge strategy for file patterns (e.g., '*.json=deep', '*.md=replace')",
		collectMergeStrategies,
	)
	.action(async (include: string[], options: any) => {
		try {
			// Create plugin based on template engine option
			let plugins: Plugin[] = [];
			if (options.templateEngine) {
				switch (options.templateEngine.toLowerCase()) {
					case 'ejs':
						plugins = [ejs()];
						break;
					case 'ejs-mate':
						plugins = [ejsMate()];
						break;
					case 'handlebars':
						plugins = [handlebars()];
						break;
					case 'mustache':
						plugins = [mustache()];
						break;
					default:
						console.error(
							`Error: Unknown template engine '${options.templateEngine}'. Supported engines: ejs, ejs-mate, handlebars, mustache`,
						);
						process.exit(1);
				}
			}

			const combino = new Combino();
			let templateData: Record<string, any> = {};
			let mergeConfig: Record<string, Record<string, any>> = {};

			// Load config file if specified
			if (options.config) {
				const configPath = path.resolve(options.config);
				if (!fs.existsSync(configPath)) {
					console.error(`Config file not found: ${configPath}`);
					process.exit(1);
				}

				try {
					const configContent = fs.readFileSync(configPath, 'utf-8');
					const parsedConfig = JSON.parse(configContent);

					// Extract data section
					if (parsedConfig.data) {
						templateData = {
							...templateData,
							...parsedConfig.data,
						};
					}

					// Extract merge configuration from config file
					if (parsedConfig.merge) {
						mergeConfig = { ...mergeConfig, ...parsedConfig.merge };
					}
				} catch (error) {
					console.error(`Error parsing config file: ${error}`);
					process.exit(1);
				}
			}

			// Merge command line data with config data
			if (options.data) {
				Object.entries(options.data).forEach(([key, value]) => {
					const keys = key.split('.');
					let current = templateData;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					current[keys[keys.length - 1]] = value;
				});
			}

			// Merge command line merge strategies with config merge strategies
			if (options.merge) {
				Object.entries(options.merge).forEach(([pattern, strategy]) => {
					mergeConfig[pattern] = {
						strategy: strategy as MergeStrategy,
					};
				});
			}

			const templateOptions: TemplateOptions = {
				outputDir: options.output,
				include: include,
				config: options.config || (Object.keys(mergeConfig).length > 0 ? { merge: mergeConfig } : undefined),
				data: templateData,
				plugins: plugins.length > 0 ? plugins : undefined,
			};

			await combino.combine(templateOptions);

			console.log(`Successfully generated output in ${options.output}`);
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Error:', error.message);
			} else {
				console.error('An unknown error occurred');
			}
			process.exit(1);
		}
	});

function collectData(value: string, previous: Record<string, any> = {}): Record<string, any> {
	// Try to parse as JSON first
	try {
		const jsonData = JSON.parse(value);
		if (typeof jsonData === 'object' && jsonData !== null) {
			return { ...previous, ...jsonData };
		}
	} catch {
		// If not valid JSON, try key=value format
		const [key, val] = value.split('=');
		if (!key || !val) {
			throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
		}
		return { ...previous, [key]: val };
	}
	throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
}

function collectMergeStrategies(
	value: string,
	previous: Record<string, MergeStrategy> = {},
): Record<string, MergeStrategy> {
	const validStrategies: MergeStrategy[] = ['deep', 'shallow', 'append', 'prepend', 'replace'];

	// Parse pattern=strategy format
	const [pattern, strategy] = value.split('=');
	if (!pattern || !strategy) {
		throw new Error(`Invalid merge format: ${value}. Expected pattern=strategy (e.g., '*.json=deep')`);
	}

	// Validate strategy
	if (!validStrategies.includes(strategy as MergeStrategy)) {
		throw new Error(`Invalid merge strategy: ${strategy}. Valid strategies are: ${validStrategies.join(', ')}`);
	}

	return { ...previous, [pattern]: strategy as MergeStrategy };
}

program.parse();
