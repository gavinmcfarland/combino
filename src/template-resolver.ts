import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ResolvedTemplate, ResolvedFile, CombinoConfig, IncludeConfig, IncludeItem } from './types.js';
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

	/**
	 * Process template variables in include path
	 */
	private processIncludePath(path: string, data: Record<string, any>): string {
		// Simple template variable replacement for include paths
		// This handles <%= variable %> and <%- variable %> syntax
		return path.replace(/<%[-=]\s*([^%\s]+)\s*%>/g, (match, varName) => {
			const value = data[varName.trim()];
			return value !== undefined ? String(value) : match;
		});
	}

	async resolveTemplates(
		includePaths: string[],
		config?: CombinoConfig | string,
		globalExclude?: string[],
		initialData?: Record<string, any>,
	): Promise<ResolvedTemplate[]> {
		const templates: ResolvedTemplate[] = [];
		const includeSourcePaths = new Set<string>();

		// First pass: collect all include source paths from template configs
		for (const includePath of includePaths) {
			const resolvedPath = resolve(includePath);
			try {
				const configPath = join(resolvedPath, this.configFileName);
				const config = await this.configParser.parseConfigFile(configPath);
				if (config.include) {
					const normalizedIncludes = this.normalizeIncludeArray(config.include);
					for (const include of normalizedIncludes) {
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
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				for (const include of normalizedIncludes) {
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

			const template = await this.resolveTemplate(resolvedPath, undefined, globalExclude, initialData);
			templates.push(template);
		}

		// Handle additional includes from config files
		if (config) {
			const configObj = typeof config === 'string' ? await this.configParser.parseConfigFile(config) : config;

			if (configObj.include) {
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				for (const include of normalizedIncludes) {
					const resolvedPath = resolve(include.source);
					const template = await this.resolveTemplate(
						resolvedPath,
						include.target,
						globalExclude,
						initialData,
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
		initialData?: Record<string, any>,
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
			const normalizedIncludes = this.normalizeIncludeArray(config.include);
			const includedFiles: ResolvedFile[] = [];

			for (const include of normalizedIncludes) {
				// Process template variables in include path using initial data
				const processedIncludePath = initialData
					? this.processIncludePath(include.source, initialData)
					: include.source;
				const includeSourcePath = resolve(templatePath, processedIncludePath);

				// Load the configuration from the included directory
				const includeConfigPath = join(includeSourcePath, this.configFileName);
				let includeConfig: CombinoConfig | undefined;
				try {
					includeConfig = await this.configParser.parseConfigFile(includeConfigPath);
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
