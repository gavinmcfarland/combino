import { resolve, join } from 'path';
import { promises as fs } from 'fs';
import { ResolvedTemplate, ResolvedFile, CombinoConfig, IncludeConfig, IncludeItem, PluginManager } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';

export class TemplateResolver {
	private configParser: ConfigParser;
	private fileProcessor: FileProcessor;
	private configFileName: string;

	constructor(configFileName: string = 'combino.json') {
		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor(configFileName);
		this.configFileName = configFileName;
	}

	/**
	 * Normalize include items to the object format
	 */
	private normalizeIncludeItem(item: IncludeItem): IncludeConfig {
		if (typeof item === 'string') {
			return { source: item };
		}
		return item;
	}

	/**
	 * Normalize include array to object format
	 */
	private normalizeIncludeArray(include: IncludeItem[]): IncludeConfig[] {
		return include.map((item) => this.normalizeIncludeItem(item));
	}

	async resolveTemplates(
		includePaths: string[],
		config?: CombinoConfig | string,
		globalExclude?: string[],
		pluginManager?: PluginManager,
		data?: Record<string, any>,
	): Promise<ResolvedTemplate[]> {
		const templates: ResolvedTemplate[] = [];
		// Track specific paths that are being included with targets - these need to be excluded from their source templates
		const targetedIncludes = new Map<string, Set<string>>(); // sourcePath -> set of relative paths to exclude

		// First pass: collect all include source paths with targets from template configs
		for (const includePath of includePaths) {
			const resolvedPath = resolve(includePath);
			try {
				const configPath = join(resolvedPath, this.configFileName);
				const config = await this.configParser.parseConfigFile(
					configPath,
					pluginManager,
					data,
					this.configFileName,
				);
				if (config.include) {
					const normalizedIncludes = this.normalizeIncludeArray(config.include);
					for (const include of normalizedIncludes) {
						const includeSourcePath = resolve(resolvedPath, include.source);

						// Only track includes that have targets - these need to be excluded from their source
						if (include.target) {
							// Find the parent template directory that contains this include source
							let parentTemplatePath = includeSourcePath;
							let relativePath = '';

							// Walk up the directory tree to find which input directory contains this source
							for (const checkPath of includePaths) {
								const checkResolvedPath = resolve(checkPath);
								if (includeSourcePath.startsWith(checkResolvedPath)) {
									parentTemplatePath = checkResolvedPath;
									relativePath = includeSourcePath.substring(checkResolvedPath.length + 1);
									break;
								}
							}

							if (!targetedIncludes.has(parentTemplatePath)) {
								targetedIncludes.set(parentTemplatePath, new Set());
							}

							targetedIncludes.get(parentTemplatePath)!.add(relativePath);
						}
					}
				}
			} catch {
				// Config file doesn't exist or is invalid, continue
			}
		}

		// Handle additional includes from global config
		if (config) {
			const configObj =
				typeof config === 'string'
					? await this.configParser.parseConfigFile(config, pluginManager, data, this.configFileName)
					: config;

			if (configObj.include) {
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				for (const include of normalizedIncludes) {
					const resolvedPath = resolve(include.source);

					// Only track includes that have targets
					if (include.target) {
						if (!targetedIncludes.has(resolvedPath)) {
							targetedIncludes.set(resolvedPath, new Set());
						}

						// Extract the relative path from the include source
						const relativePath = include.source.split('/').pop() || '';
						targetedIncludes.get(resolvedPath)!.add(relativePath);
					}
				}
			}
		}

		// Second pass: process templates, filtering out targeted includes
		for (const includePath of includePaths) {
			const resolvedPath = resolve(includePath);

			// Get the specific paths to exclude for this template
			const pathsToExclude = targetedIncludes.get(resolvedPath);
			const template = await this.resolveTemplate(
				resolvedPath,
				undefined,
				globalExclude,
				pathsToExclude,
				pluginManager,
				data,
			);
			templates.push(template);
		}

		// Handle additional includes from config files
		if (config) {
			const configObj =
				typeof config === 'string'
					? await this.configParser.parseConfigFile(config, pluginManager, data, this.configFileName)
					: config;

			if (configObj.include) {
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				for (const include of normalizedIncludes) {
					const resolvedPath = resolve(include.source);
					const template = await this.resolveTemplate(
						resolvedPath,
						include.target,
						globalExclude,
						undefined,
						pluginManager,
						data,
					);
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
		pathsToExclude?: Set<string>,
		pluginManager?: PluginManager,
		data?: Record<string, any>,
	): Promise<ResolvedTemplate> {
		// Check if template exists
		try {
			await fs.access(templatePath);
		} catch {
			throw new Error(`Template not found: ${templatePath}`);
		}

		// Parse config file if it exists
		const configPath = join(templatePath, this.configFileName);
		let config: CombinoConfig | undefined;
		try {
			config = await this.configParser.parseConfigFile(configPath, pluginManager, data, this.configFileName);
		} catch {
			// Config file doesn't exist or is invalid, continue without it
		}

		// Get all files in the template
		// Merge global exclude patterns with template-specific ones
		const excludePatterns = [...(globalExclude || []), ...(config?.exclude || [])];

		// Add specific paths to exclude from targeted includes
		if (pathsToExclude) {
			for (const pathToExclude of pathsToExclude) {
				excludePatterns.push(`${pathToExclude}/**`);
				excludePatterns.push(pathToExclude);
			}
		}

		const mergedConfig = {
			...config,
			exclude: excludePatterns,
		};
		let files = await this.fileProcessor.getTemplateFiles(templatePath, mergedConfig);

		// Handle includes from the template's config
		if (config?.include) {
			const normalizedIncludes = this.normalizeIncludeArray(config.include);
			const includedFiles: ResolvedFile[] = [];

			for (const include of normalizedIncludes) {
				const includeSourcePath = resolve(templatePath, include.source);

				// Load the configuration from the included directory
				const includeConfigPath = join(includeSourcePath, this.configFileName);
				let includeConfig: CombinoConfig | undefined;
				try {
					includeConfig = await this.configParser.parseConfigFile(
						includeConfigPath,
						pluginManager,
						data,
						this.configFileName,
					);
				} catch {
					// Include config file doesn't exist or is invalid, continue without it
				}

				// Merge the include config's merge strategies into the main template config
				if (includeConfig?.merge) {
					config = {
						...config,
						merge: {
							...config.merge,
							...includeConfig.merge,
						},
					};
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

				includedFiles.push(...mappedFiles);
			}

			// Put included files first, then main template files
			// This ensures that included files are the target and main template files are the source
			files.splice(0, 0, ...includedFiles);
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
