import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ResolvedTemplate, CombinoConfig } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';

export class TemplateResolver {
	private configParser: ConfigParser;
	private fileProcessor: FileProcessor;

	constructor() {
		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor();
	}

	async resolveTemplates(
		includePaths: string[],
		config?: CombinoConfig | string,
		globalExclude?: string[],
	): Promise<ResolvedTemplate[]> {
		const templates: ResolvedTemplate[] = [];
		const includeSourcePaths = new Set<string>();

		// First pass: collect all include source paths from template configs
		for (const includePath of includePaths) {
			const resolvedPath = resolve(includePath);
			try {
				const configPath = join(resolvedPath, 'combino.json');
				const config = await this.configParser.parseConfigFile(configPath);
				if (config.include) {
					for (const include of config.include) {
						const includeSourcePath = resolve(resolvedPath, include.source);
						includeSourcePaths.add(includeSourcePath);
					}
				}
			} catch {
				// Config file doesn't exist or is invalid, continue
			}
		}

		// Handle additional includes from global config
		if (config) {
			const configObj = typeof config === 'string' ? await this.configParser.parseConfigFile(config) : config;

			if (configObj.include) {
				for (const include of configObj.include) {
					const resolvedPath = resolve(include.source);
					includeSourcePaths.add(resolvedPath);
				}
			}
		}

		// Second pass: process templates, excluding those that are include sources
		for (const includePath of includePaths) {
			const resolvedPath = resolve(includePath);

			// Skip processing this directory as a standalone template if it's being used as an include source
			if (includeSourcePaths.has(resolvedPath)) {
				continue;
			}

			const template = await this.resolveTemplate(resolvedPath, undefined, globalExclude);
			templates.push(template);
		}

		// Handle additional includes from config files
		if (config) {
			const configObj = typeof config === 'string' ? await this.configParser.parseConfigFile(config) : config;

			if (configObj.include) {
				for (const include of configObj.include) {
					const resolvedPath = resolve(include.source);
					const template = await this.resolveTemplate(resolvedPath, include.target, globalExclude);
					templates.push(template);
				}
			}
		}

		return templates;
	}

	private async resolveTemplate(
		templatePath: string,
		targetDir?: string,
		globalExclude?: string[],
	): Promise<ResolvedTemplate> {
		// Check if template exists
		try {
			await fs.access(templatePath);
		} catch {
			throw new Error(`Template not found: ${templatePath}`);
		}

		// Parse combino.json config if it exists
		const configPath = join(templatePath, 'combino.json');
		let config: CombinoConfig | undefined;
		try {
			config = await this.configParser.parseConfigFile(configPath);
		} catch {
			// Config file doesn't exist or is invalid, continue without it
		}

		// Get all files in the template
		// Merge global exclude patterns with template-specific ones
		const mergedConfig = {
			...config,
			exclude: [...(globalExclude || []), ...(config?.exclude || [])],
		};
		const files = await this.fileProcessor.getTemplateFiles(templatePath, mergedConfig);

		// Handle includes from the template's config
		if (config?.include) {
			for (const include of config.include) {
				const includeSourcePath = resolve(templatePath, include.source);

				// Load the configuration from the included directory
				const includeConfigPath = join(includeSourcePath, 'combino.json');
				let includeConfig: CombinoConfig | undefined;
				try {
					includeConfig = await this.configParser.parseConfigFile(includeConfigPath);
				} catch {
					// Include config file doesn't exist or is invalid, continue without it
				}

				// Merge the include config with the main config for file processing
				const includeProcessingConfig = {
					...mergedConfig,
					// Merge the include config's merge strategies
					merge: {
						...mergedConfig.merge,
						...includeConfig?.merge,
					},
				};

				const includeFiles = await this.fileProcessor.getTemplateFiles(
					includeSourcePath,
					includeProcessingConfig,
				);

				// Map the files to the target directory if specified and apply include config
				const mappedFiles = includeFiles.map((file) => ({
					...file,
					targetPath: include.target ? join(include.target, file.targetPath) : file.targetPath,
					// Store the include config so it can be used for merge strategy determination
					includeConfig: includeConfig,
				}));

				files.push(...mappedFiles);
			}
		}

		const template: ResolvedTemplate = {
			path: templatePath,
			targetDir,
			config,
			files,
		};

		return template;
	}
}
