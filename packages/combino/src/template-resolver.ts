import { resolve, join, basename, dirname } from 'path';
import { promises as fs } from 'fs';
import { Parser } from 'expr-eval';
import { ResolvedTemplate, ResolvedFile, CombinoConfig, IncludeConfig, IncludeItem, PluginManager } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';

export class TemplateResolver {
	private configParser: ConfigParser;
	private fileProcessor: FileProcessor;
	private configFileName: string;
	private enableConditionalIncludePaths: boolean;

	constructor(configFileName: string = 'combino.json', enableConditionalIncludePaths: boolean = true) {
		this.configParser = new ConfigParser();
		this.fileProcessor = new FileProcessor(configFileName);
		this.configFileName = configFileName;
		this.enableConditionalIncludePaths = enableConditionalIncludePaths;
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
	 * Apply conditional logic to include paths, filtering out paths that should be excluded
	 */
	private applyConditionalLogicToIncludePaths(includes: IncludeConfig[], data: Record<string, any>): IncludeConfig[] {
		// If conditional include paths are disabled, return includes as-is
		if (!this.enableConditionalIncludePaths) {
			return includes;
		}

		return includes
			.filter((include) => {
				// Apply conditional logic to the source path
				const processedSource = this.applyConditionalLogicToIncludePath(include.source, data);
				return processedSource !== null; // Keep only paths that aren't excluded
			})
			.map((include) => {
				// Apply conditional logic to both source and target paths
				const processedSource = this.applyConditionalLogicToIncludePath(include.source, data);
				const processedTarget = include.target
					? this.applyConditionalLogicToIncludePath(include.target, data)
					: undefined;

				// Resolve the physical path for disk lookup
				const physicalSource = this.resolvePhysicalPathForInclude(processedSource!, include.source, data);

				return {
					source: processedSource!,
					target: processedTarget || include.target,
					physicalSource: physicalSource || undefined, // Convert null to undefined
				};
			});
	}

	/**
	 * Apply conditional logic to include paths using the correct unwrapping algorithm
	 */
	private applyConditionalLogicToIncludePath(path: string, data: Record<string, any>): string | null {
		// Split path into segments and process each one
		const segments = path.split('/');
		const resolvedSegments: string[] = [];

		for (const segment of segments) {
			// First, check if this segment is a complete conditional expression [expression]
			const completeMatch = segment.match(/^\[(.+?)\]$/);
			if (completeMatch) {
				const conditionExpr = completeMatch[1];

				// Skip ternary expressions (they contain "?" and ":")
				if (conditionExpr.includes('?') && conditionExpr.includes(':')) {
					// Handle as dynamic expression
					const evaluated = this.evaluateExpression(conditionExpr, data);
					if (evaluated) {
						resolvedSegments.push(evaluated);
					}
					continue;
				}

				// Check if this is a conditional expression
				const isConditional = this.isConditionalExpression(conditionExpr, data);
				if (isConditional) {
					const shouldInclude = this.evaluateCondition(conditionExpr, data);
					if (!shouldInclude) {
						return null; // Skip the entire path
					}
					// Don't add anything to resolvedSegments - we're "unwrapping" the folder
					// The folder is entered but the name is dropped from the resolved path
				} else {
					// Not a conditional, treat as dynamic expression
					const evaluated = this.evaluateExpression(conditionExpr, data);
					if (evaluated) {
						resolvedSegments.push(evaluated);
					}
				}
			} else {
				// Check for embedded conditional expressions within the segment
				const processedSegment = this.processEmbeddedConditionals(segment, data);
				if (processedSegment === null) {
					return null; // Skip the entire path
				}
				if (processedSegment !== '') {
					// Apply EJS templating to the processed segment
					const interpolated = this.ejsRender(processedSegment, data);
					resolvedSegments.push(interpolated);
				}
			}
		}

		return resolvedSegments.join('/');
	}

	/**
	 * Process embedded conditional expressions within a segment
	 */
	private processEmbeddedConditionals(segment: string, data: Record<string, any>): string | null {
		// Find all conditional expressions within the segment
		const conditionalMatches = segment.match(/\[([^\]]+)\]/g);
		if (!conditionalMatches) {
			return segment; // No conditionals found, return as-is
		}

		let processedSegment = segment;

		for (const match of conditionalMatches) {
			const conditionExpr = match.slice(1, -1); // Remove [ and ]

			// Skip ternary expressions
			if (conditionExpr.includes('?') && conditionExpr.includes(':')) {
				const evaluated = this.evaluateExpression(conditionExpr, data);
				processedSegment = processedSegment.replace(match, evaluated);
				continue;
			}

			// Check if this is a conditional expression
			const isConditional = this.isConditionalExpression(conditionExpr, data);
			if (isConditional) {
				const shouldInclude = this.evaluateCondition(conditionExpr, data);
				if (!shouldInclude) {
					return null; // Skip the entire path
				}
				// Remove the conditional part from the segment
				processedSegment = processedSegment.replace(match, '');
			} else {
				// Not a conditional, treat as dynamic expression
				const evaluated = this.evaluateExpression(conditionExpr, data);
				processedSegment = processedSegment.replace(match, evaluated);
			}
		}

		return processedSegment;
	}

	/**
	 * Simple EJS-like rendering for path segments
	 */
	private ejsRender(segment: string, data: Record<string, any>): string {
		// Handle basic EJS interpolation like <%= variable %>
		return segment.replace(/<%=?\s*([^%>]+)\s*%>/g, (match, expression) => {
			try {
				// Handle nested properties
				const keys = expression.trim().split('.');
				let value = data;
				for (const key of keys) {
					value = value?.[key];
					if (value === undefined) break;
				}
				return String(value || '');
			} catch (error) {
				return '';
			}
		});
	}

	private isConditionalExpression(expression: string, data: Record<string, any>): boolean {
		// Check if the expression contains conditional operators
		if (
			expression.includes('==') ||
			expression.includes('!=') ||
			expression.includes('&&') ||
			expression.includes('||')
		) {
			return true;
		}

		// Check if the expression is a simple boolean variable in the data
		try {
			const cleanExpression = expression.trim();
			// If it's a simple variable name and the value is a boolean, treat it as conditional
			if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanExpression)) {
				const value = data[cleanExpression];
				return typeof value === 'boolean';
			}
		} catch (error) {
			// If we can't determine, assume it's not conditional
		}

		return false;
	}

	private evaluateCondition(condition: string, data: Record<string, any>): boolean {
		try {
			// For conditions that don't have brackets, add them
			const conditionWithBrackets = condition.startsWith('[') ? condition : `[${condition}]`;

			// Remove the [ and ] from the condition
			const cleanCondition = conditionWithBrackets.slice(1, -1);

			// Replace operators to be compatible with expr-eval
			const parsedCondition = cleanCondition.replace(/&&/g, ' and ').replace(/\|\|/g, ' or ');

			// Create a parser instance
			const parser = new Parser();

			// Create a scope with the data
			const scope = Object.entries(data).reduce(
				(acc, [key, value]) => {
					// Handle nested properties
					const keys = key.split('.');
					let current = acc;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					current[keys[keys.length - 1]] = value;
					return acc;
				},
				{} as Record<string, any>,
			);

			// Parse and evaluate the expression
			const expr = parser.parse(parsedCondition);
			const result = expr.evaluate(scope);
			return !!result; // Convert to boolean
		} catch (error) {
			console.error('Error evaluating condition:', error);
			return false;
		}
	}

	private evaluateExpression(expression: string, data: Record<string, any>): string {
		try {
			// Handle ternary expressions like framework=="react"?"tsx":"ts"
			const ternaryMatch = expression.match(/^(.+)\?(.+):(.+)$/);
			if (ternaryMatch) {
				const condition = ternaryMatch[1];
				const trueValue = ternaryMatch[2].replace(/^["']|["']$/g, '');
				const falseValue = ternaryMatch[3].replace(/^["']|["']$/g, '');

				const result = this.evaluateCondition(condition, data) ? trueValue : falseValue;

				return result;
			}

			// Create a parser instance for simple expressions
			const parser = new Parser();

			// Create a scope with the data
			const scope = Object.entries(data).reduce(
				(acc, [key, value]) => {
					// Handle nested properties
					const keys = key.split('.');
					let current = acc;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					current[keys[keys.length - 1]] = value;
					return acc;
				},
				{} as Record<string, any>,
			);

			// Try to evaluate as an expression first
			try {
				const expr = parser.parse(expression);
				const result = expr.evaluate(scope);
				return String(result);
			} catch {
				// If parsing fails, treat as simple key lookup
				return String(data[expression] || '');
			}
		} catch (error) {
			console.error('Error evaluating expression:', error);
			return '';
		}
	}

	/**
	 * Given a logical include path (with [expr] segments unwrapped), return the real path on disk (with [expr] segments included if truthy)
	 */
	private resolvePhysicalPathForInclude(
		logicalPath: string,
		originalPath: string,
		data: Record<string, any>,
	): string | null {
		const originalSegments = originalPath.split('/');
		const resolvedSegments: string[] = [];

		for (let i = 0; i < originalSegments.length; i++) {
			const segment = originalSegments[i];
			// First, check if this segment is a complete conditional expression [expression]
			const completeMatch = segment.match(/^\[(.+?)\]$/);
			if (completeMatch) {
				const conditionExpr = completeMatch[1];
				const isConditional = this.isConditionalExpression(conditionExpr, data);
				if (isConditional) {
					const shouldInclude = this.evaluateCondition(conditionExpr, data);
					if (!shouldInclude) return null;
					// If truthy, keep the segment as-is (with brackets) for disk lookup
					resolvedSegments.push(segment);
				} else {
					// Not a conditional, treat as dynamic expression
					const evaluated = this.evaluateExpression(conditionExpr, data);
					if (evaluated) {
						resolvedSegments.push(evaluated);
					}
				}
			} else {
				// Check for embedded conditional expressions within the segment
				const processedSegment = this.processEmbeddedConditionalsForPhysicalPath(segment, data);
				if (processedSegment === null) {
					return null; // Skip the entire path
				}
				resolvedSegments.push(processedSegment);
			}
		}
		return resolvedSegments.join('/');
	}

	/**
	 * Process embedded conditional expressions within a segment for physical path resolution
	 * This is similar to processEmbeddedConditionals but keeps the conditional parts for disk lookup
	 */
	private processEmbeddedConditionalsForPhysicalPath(segment: string, data: Record<string, any>): string | null {
		// Find all conditional expressions within the segment
		const conditionalMatches = segment.match(/\[([^\]]+)\]/g);
		if (!conditionalMatches) {
			return segment; // No conditionals found, return as-is
		}

		let processedSegment = segment;

		for (const match of conditionalMatches) {
			const conditionExpr = match.slice(1, -1); // Remove [ and ]

			// Skip ternary expressions
			if (conditionExpr.includes('?') && conditionExpr.includes(':')) {
				const evaluated = this.evaluateExpression(conditionExpr, data);
				processedSegment = processedSegment.replace(match, evaluated);
				continue;
			}

			// Check if this is a conditional expression
			const isConditional = this.isConditionalExpression(conditionExpr, data);
			if (isConditional) {
				const shouldInclude = this.evaluateCondition(conditionExpr, data);
				if (!shouldInclude) {
					return null; // Skip the entire path
				}
				// Remove the conditional part for disk lookup (same as logical path)
				processedSegment = processedSegment.replace(match, '');
			} else {
				// Not a conditional, treat as dynamic expression
				const evaluated = this.evaluateExpression(conditionExpr, data);
				processedSegment = processedSegment.replace(match, evaluated);
			}
		}

		return processedSegment;
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
					// Apply conditional logic to include paths
					const conditionalIncludes = this.applyConditionalLogicToIncludePaths(
						normalizedIncludes,
						data || {},
					);
					for (const include of conditionalIncludes) {
						// Use physicalSource for disk lookup and exclusion tracking
						const includeSourcePath = resolve(resolvedPath, include.physicalSource || include.source);

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
				// Apply conditional logic to include paths
				const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});
				for (const include of conditionalIncludes) {
					// Use physicalSource for disk lookup and exclusion tracking
					const resolvedPath = resolve(include.physicalSource || include.source);

					// Only track includes that have targets
					if (include.target) {
						if (!targetedIncludes.has(resolvedPath)) {
							targetedIncludes.set(resolvedPath, new Set());
						}

						// Extract the relative path from the include source
						const relativePath = (include.physicalSource || include.source).split('/').pop() || '';
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
				// Apply conditional logic to include paths
				const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});
				for (const include of conditionalIncludes) {
					// Use physicalSource for disk lookup
					const resolvedPath = resolve(include.physicalSource || include.source);
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
				// Escape square brackets for minimatch (treat as literal text, not character classes)
				const escapedPath = pathToExclude.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
				const pattern1 = `${escapedPath}/**`;
				const pattern2 = escapedPath;
				excludePatterns.push(pattern1);
				excludePatterns.push(pattern2);
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
			// Apply conditional logic to include paths
			const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});
			const includedFiles: ResolvedFile[] = [];

			for (const include of conditionalIncludes) {
				// Use the original include.source for disk lookup, and the processed (logical) one for output
				const logicalSource = include.source;
				const originalInclude = this.normalizeIncludeItem(include);
				const physicalSource = include.physicalSource; // Use the physical source from applyConditionalLogicToIncludePaths
				if (!physicalSource) continue;
				const includeSourcePath = resolve(templatePath, physicalSource);

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
				const mappedFiles = includeFiles.map((file) => {
					let targetPath = file.targetPath;

					if (include.target) {
						// Check if the include target is a file path (ends with a filename)
						const targetBasename = basename(include.target);
						const targetDirname = dirname(include.target);

						// If the target has a filename (not just a directory), use it directly
						if (
							targetBasename !== targetDirname &&
							targetBasename !== '.' &&
							targetBasename.includes('.')
						) {
							targetPath = include.target;
						} else {
							// Otherwise, join the target directory with the file's target path
							targetPath = join(include.target, file.targetPath);
						}
					}

					// Compute the relative path from the physical include dir to the file
					const relativeFromPhysical = file.sourcePath.replace(includeSourcePath, '').replace(/^\/+/, '');
					// Remove any [expr] segments from the relative path for output
					const logicalRelative = relativeFromPhysical.replace(/\[.*?\]\/?/g, '');
					const logicalBase = resolve(templatePath, logicalSource);
					let logicalOutputPath = join(logicalBase, logicalRelative);

					return {
						...file,
						targetPath: targetPath || logicalOutputPath,
						// Store the include config so it can be used for merge strategy determination
						includeConfig: includeConfig,
					};
				});

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
