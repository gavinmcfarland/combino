import { resolve, join, basename, dirname, relative } from 'path';
import { promises as fs } from 'fs';
import { Parser } from 'expr-eval';
import { ResolvedTemplate, ResolvedFile, CombinoConfig, IncludeConfig, IncludeItem, PluginManager } from './types.js';
import { ConfigParser } from './config-parser.js';
import { FileProcessor } from './file-processor.js';
import { DebugLogger } from './utils/debug.js';

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
		if (!this.enableConditionalIncludePaths) {
			return includes;
		}

		const result: IncludeConfig[] = [];

		for (const include of includes) {
			// console.log('DEBUG: Processing include:', include.source, '->', include.target);

			// Apply conditional logic to the source path
			const logicalPath = this.applyConditionalLogicToIncludePath(include.source, data);
			// console.log('DEBUG: Logical path result:', logicalPath);

			if (logicalPath === null) {
				// console.log('DEBUG: Skipping include - condition is false');
				continue; // Skip this include if condition is false
			}

			// Create new include config with resolved paths
			// Use the original source as physicalSource for disk lookup
			const resolvedInclude: IncludeConfig = {
				...include,
				source: logicalPath,
				physicalSource: include.source, // Use original source for physical path resolution
			};

			// console.log('DEBUG: Adding resolved include:', resolvedInclude.source, '->', resolvedInclude.target);
			result.push(resolvedInclude);
		}

		return result;
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
					// Keep the original segment with brackets for physical path lookup
					// This matches the actual directory structure on disk
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
				// For embedded conditionals, keep the original segment with brackets
				// so that the fallback logic can try the unwrapped version
				const hasEmbeddedConditionals = segment.match(/\[([^\]]+)\]/g);
				if (hasEmbeddedConditionals) {
					// Keep the original segment with brackets for fallback logic
					resolvedSegments.push(segment);
				} else {
					resolvedSegments.push(segment);
				}
			}
		}
		return resolvedSegments.join('/');
	}

	/**
	 * Try to resolve a physical path by attempting both bracketed and non-bracketed versions
	 * of conditional segments. This allows for flexible directory structures.
	 */
	private tryResolvePhysicalPathWithFallback(
		logicalPath: string,
		originalPath: string,
		data: Record<string, any>,
	): string | null {
		// First try the original resolution (with brackets)
		const primaryPath = this.resolvePhysicalPathForInclude(logicalPath, originalPath, data);
		// console.log(`DEBUG: tryResolvePhysicalPathWithFallback - primaryPath: ${primaryPath}`);
		if (primaryPath) {
			// If the primary path contains brackets, it might not exist on disk
			// In that case, try the fallback logic
			if (primaryPath.includes('[') || primaryPath.includes(']')) {
				// console.log(
				// 	`DEBUG: tryResolvePhysicalPathWithFallback - primaryPath contains brackets, trying fallback`,
				// );
			} else {
				return primaryPath;
			}
		}

		// If that fails, try without brackets for conditional segments
		// But first, let's try the original path with brackets since that's the actual directory structure
		const originalSegments = originalPath.split('/');
		const fallbackSegments: string[] = [];

		for (let i = 0; i < originalSegments.length; i++) {
			const segment = originalSegments[i];

			// Check if this segment is a complete conditional expression [expression]
			const completeMatch = segment.match(/^\[(.+?)\]$/);
			if (completeMatch) {
				const conditionExpr = completeMatch[1];
				const isConditional = this.isConditionalExpression(conditionExpr, data);
				if (isConditional) {
					const shouldInclude = this.evaluateCondition(conditionExpr, data);
					if (!shouldInclude) return null;
					// For fallback, try the original bracketed version first
					// This matches the actual directory structure on disk
					fallbackSegments.push(segment);
				} else {
					// Not a conditional, treat as dynamic expression
					const evaluated = this.evaluateExpression(conditionExpr, data);
					if (evaluated) {
						fallbackSegments.push(evaluated);
					}
				}
			} else {
				// Check for embedded conditional expressions within the segment
				const processedSegment = this.processEmbeddedConditionalsForPhysicalPathFallback(segment, data);
				if (processedSegment === null) {
					return null; // Skip the entire path
				}
				fallbackSegments.push(processedSegment);
			}
		}
		return fallbackSegments.join('/');
	}

	/**
	 * Resolve a path for comparison by applying conditional logic
	 * This is used to match config paths with actual file paths
	 */
	private resolvePathForComparison(path: string, data: Record<string, any>): string {
		if (!this.enableConditionalIncludePaths) {
			return path;
		}

		// Apply conditional logic to resolve the path
		const resolved = this.applyConditionalLogicToIncludePath(path, data);
		return resolved || path;
	}

	/**
	 * Extract a condition name from a conditional expression for fallback path resolution
	 */
	private extractConditionName(conditionExpr: string): string | null {
		// For simple variable names like "typescript", return as-is
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(conditionExpr)) {
			return conditionExpr;
		}

		// For comparison expressions like "framework=='react'", extract the variable name
		const comparisonMatch = conditionExpr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[=!<>]+\s*['"][^'"]*['"]$/);
		if (comparisonMatch) {
			return comparisonMatch[1];
		}

		// For complex expressions, we can't easily extract a meaningful name
		return null;
	}

	/**
	 * Process embedded conditional expressions within a segment for fallback physical path resolution
	 * This version tries to extract condition names for fallback paths
	 */
	private processEmbeddedConditionalsForPhysicalPathFallback(
		segment: string,
		data: Record<string, any>,
	): string | null {
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
				// For fallback, remove the conditional part entirely
				// This matches the actual directory structure on disk
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
				// Remove the conditional part for physical path lookup (same as logical path)
				// The physical path should match the actual directory structure on disk
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

		// Use absolute paths for deduplication
		const allPathsToProcess = new Set<string>(includePaths.map((p) => resolve(p)));
		const processedPaths = new Set<string>();

		DebugLogger.log('DEBUG: allPathsToProcess:', Array.from(allPathsToProcess));

		// First pass: collect all include source paths with targets from template configs and gather recursive includes
		while (true) {
			let newPathsAdded = false;
			const pathsToProcess = Array.from(allPathsToProcess).filter((path) => !processedPaths.has(path));

			if (pathsToProcess.length === 0) break;

			for (const includePath of pathsToProcess) {
				processedPaths.add(includePath);
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
							// Use the original source (with brackets) for physical path construction
							const includeSourcePath = resolve(resolvedPath, include.source);

							// Only add directory paths to allPathsToProcess for recursive processing
							// Skip individual file paths (they should be handled by individual file includes)
							try {
								const stats = await fs.stat(includeSourcePath);
								if (stats.isDirectory()) {
									// Add the included path to the set of paths to process (for recursive includes)
									// Only add if it's not already in the set and not already processed
									if (
										!allPathsToProcess.has(includeSourcePath) &&
										!processedPaths.has(includeSourcePath)
									) {
										allPathsToProcess.add(includeSourcePath);
										newPathsAdded = true;
									}
								}
							} catch {
								// If we can't stat the path, assume it's a file and skip adding to allPathsToProcess
								// Individual files will be handled by the individual file include logic
							}

							// Only track includes that have targets - these need to be excluded from their source
							if (include.target) {
								// Find the parent template directory that contains this include source
								let parentTemplatePath = includeSourcePath;
								let relativePath = '';

								// Walk up the directory tree to find which input directory contains this source
								// For relative paths like ../frameworks/react/[typescript]/tsconfig.ui.json,
								// we need to find the base directory that contains the frameworks/ directory
								for (const checkPath of allPathsToProcess) {
									const checkResolvedPath = resolve(checkPath);
									// Check if the includeSourcePath is within this template directory
									if (includeSourcePath.startsWith(checkResolvedPath)) {
										parentTemplatePath = checkResolvedPath;
										relativePath = includeSourcePath.substring(checkResolvedPath.length + 1);
										break;
									}
									// For relative paths, we need to resolve them against the template directory
									const resolvedAgainstTemplate = resolve(checkResolvedPath, include.source);
									if (resolvedAgainstTemplate === includeSourcePath) {
										parentTemplatePath = checkResolvedPath;
										relativePath = include.source;
										break;
									}
								}

								if (!targetedIncludes.has(parentTemplatePath)) {
									targetedIncludes.set(parentTemplatePath, new Set());
								}

								// For exclusion, use the physical path to match the actual file structure
								// This ensures that files are properly excluded from their source locations
								// Use the physical path (with brackets) for proper exclusion matching
								const physicalPath = include.physicalSource || include.source;
								// Use the parent template path as the base for calculating the physical relative path
								const physicalSourcePath = resolve(parentTemplatePath, physicalPath);
								const physicalRelativePath = relative(parentTemplatePath, physicalSourcePath);
								// console.log('DEBUG: First loop exclusion path construction:', {
								// 	includeSource: include.source,
								// 	physicalPath,
								// 	parentTemplatePath,
								// 	physicalSourcePath,
								// 	physicalRelativePath,
								// });
								targetedIncludes.get(parentTemplatePath)!.add(physicalRelativePath);
							}
						}
					}
				} catch {
					// Config file doesn't exist or is invalid, continue
				}
			}

			// If no new paths were added, we can stop
			if (!newPathsAdded) break;
		}

		// Handle additional includes from global config
		if (config) {
			const configObj =
				typeof config === 'string'
					? await this.configParser.parseConfigFile(config, pluginManager, data, this.configFileName)
					: config;

			if (configObj.include) {
				// console.log('DEBUG: Processing global config includes:', configObj.include);
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				// Apply conditional logic to include paths
				const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});
				// console.log('DEBUG: Global conditional includes after processing:', conditionalIncludes);
				for (const include of conditionalIncludes) {
					// Use physicalSource for disk lookup and exclusion tracking
					const resolvedPath = resolve(include.physicalSource || include.source);

					// Only track includes that have targets
					if (include.target) {
						if (!targetedIncludes.has(resolvedPath)) {
							targetedIncludes.set(resolvedPath, new Set());
						}

						// For exclusion, we need to resolve both the config path and the actual file path
						// to match them properly. Store the resolved logical path for comparison.
						const resolvedLogicalPath = this.applyConditionalLogicToIncludePath(include.source, data || {});
						if (resolvedLogicalPath) {
							// Remove any bracketed segments and their preceding slashes from the logical path for exclusion
							const logicalPathNoBrackets = resolvedLogicalPath.replace(/(\/?\[.*?\])/g, '');
							let fileName = basename(logicalPathNoBrackets);
							const relativePath = logicalPathNoBrackets.replace(/^\.\.\//, ''); // Remove leading ../
							// console.log('DEBUG: Exclusion path construction (final):', {
							// 	includeSource: include.source,
							// 	resolvedLogicalPath,
							// 	logicalPathNoBrackets,
							// 	fileName,
							// 	relativePath,
							// });
							targetedIncludes.get(resolvedPath)!.add(fileName);
							targetedIncludes.get(resolvedPath)!.add(relativePath);
						}
					}

					// Resolve the template for this include
					// console.log('DEBUG: Resolving template for global include:', include.source, '->', resolvedPath);
					const template = await this.resolveTemplate(
						resolvedPath,
						include.target,
						globalExclude,
						undefined,
						pluginManager,
						data,
						undefined,
					);
					// console.log(
					// 	'DEBUG: Global template resolved:',
					// 	template.path,
					// 	'with',
					// 	template.files.length,
					// 	'files',
					// );
					templates.push(template);
				}
			}
		}

		// After collecting all targeted includes, union all excludes and set on every template config
		const allResolvedExcludes = new Set<string>();
		for (const excludeSet of targetedIncludes.values()) {
			for (const path of excludeSet) {
				allResolvedExcludes.add(path);
			}
		}

		// For each template, construct exclusion paths relative to that template
		const templateExclusions = new Map<string, Set<string>>();
		for (const templatePath of allPathsToProcess) {
			const resolvedTemplatePath = resolve(templatePath);
			const templateExcludeSet = new Set<string>();

			// For each template, check if it contains files that should be excluded
			for (const [sourceTemplatePath, excludeSet] of targetedIncludes.entries()) {
				for (const excludePath of excludeSet) {
					// Convert the exclude path to be relative to this template
					const absoluteExcludePath = resolve(sourceTemplatePath, excludePath);
					if (absoluteExcludePath.startsWith(resolvedTemplatePath)) {
						const relativeToTemplate = relative(resolvedTemplatePath, absoluteExcludePath);
						templateExcludeSet.add(relativeToTemplate);
					} else {
						// Handle cross-template exclusions by checking if the exclude path points to this template
						// For example, if excludePath is '../typescript[typescript]/tsconfig.main.json' from base template
						// and we're processing the typescript template, we need to extract the filename
						const excludePathSegments = excludePath.split('/');
						const lastSegment = excludePathSegments[excludePathSegments.length - 1];
						if (lastSegment && lastSegment.includes('.')) {
							// This is a file path, check if it matches any files in this template
							// For now, we'll add the filename to the exclusion set
							templateExcludeSet.add(lastSegment);
						}
					}
				}
			}

			templateExclusions.set(resolvedTemplatePath, templateExcludeSet);
		}

		// console.log(
		// 	'DEBUG: targetedIncludes for exclusion:',
		// 	Array.from(targetedIncludes.entries()).map(([k, v]) => [k, Array.from(v)]),
		// );
		// console.log('DEBUG: allResolvedExcludes:', Array.from(allResolvedExcludes));

		// Resolve all templates
		for (const templatePath of allPathsToProcess) {
			DebugLogger.log('DEBUG: Processing templatePath:', templatePath);
			const resolvedPath = resolve(templatePath);
			// console.log('DEBUG: Resolved path:', resolvedPath);

			// Skip file paths (they should be handled by individual file includes, not as templates)
			if (resolvedPath.endsWith('.json') && !resolvedPath.endsWith('/combino.json')) {
				DebugLogger.log(`DEBUG: Skipping file path as template: ${resolvedPath}`);
				continue;
			}

			// Get paths to exclude for this template
			const pathsToExclude = targetedIncludes.get(resolvedPath);
			const templateExcludeSet = templateExclusions.get(resolvedPath);
			// console.log('DEBUG: Paths to exclude for template:', pathsToExclude ? Array.from(pathsToExclude) : 'none');
			// console.log(
			// 	'DEBUG: Template-specific exclusions:',
			// 	templateExcludeSet ? Array.from(templateExcludeSet) : 'none',
			// );

			const template = await this.resolveTemplate(
				resolvedPath,
				undefined,
				globalExclude,
				templateExcludeSet,
				pluginManager,
				data,
				templateExcludeSet,
			);
			// console.log('DEBUG: Main template resolved:', template.path, 'with', template.files.length, 'files');
			templates.push(template);
		}

		// Handle additional includes from config files
		if (config) {
			DebugLogger.log('DEBUG: Template has config, processing includes');
			const configObj =
				typeof config === 'string'
					? await this.configParser.parseConfigFile(config, pluginManager, data, this.configFileName)
					: config;

			if (configObj.include) {
				DebugLogger.log('DEBUG: Processing template config includes:', configObj.include);
				const normalizedIncludes = this.normalizeIncludeArray(configObj.include);
				// Apply conditional logic to include paths
				const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});
				DebugLogger.log('DEBUG: Template conditional includes after processing:', conditionalIncludes);
				for (const include of conditionalIncludes) {
					// Use physicalSource for disk lookup
					const resolvedPath = resolve(include.physicalSource || include.source);
					DebugLogger.log('DEBUG: Resolving template for include:', include.source, '->', resolvedPath);

					// Get exclusion paths for this template
					const templateExcludeSet = templateExclusions.get(resolvedPath);
					DebugLogger.log(
						'DEBUG: Template-specific exclusions for included template:',
						templateExcludeSet ? Array.from(templateExcludeSet) : 'none',
					);

					const template = await this.resolveTemplate(
						resolvedPath,
						include.target,
						globalExclude,
						templateExcludeSet,
						pluginManager,
						data,
						allResolvedExcludes,
					);
					DebugLogger.log('DEBUG: Template resolved:', template.path, 'with', template.files.length, 'files');
					templates.push(template);
				}
			} else {
				DebugLogger.log('DEBUG: Template config has no includes');
			}
		} else {
			DebugLogger.log('DEBUG: Template has no config');
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
		allResolvedExcludes?: Set<string>,
	): Promise<ResolvedTemplate> {
		// At the top of resolveTemplate, before any includes are processed
		let includedFiles: any[] = [];
		// Check if template exists
		try {
			await fs.access(templatePath);
		} catch {
			throw new Error(`Template not found: ${templatePath}`);
		}

		// Parse config file if it exists
		const configPath = join(templatePath, this.configFileName);
		DebugLogger.log(`DEBUG: resolveTemplate - Checking for config at: ${configPath}`);
		let config: CombinoConfig | undefined;
		try {
			config = await this.configParser.parseConfigFile(configPath, pluginManager, data, this.configFileName);
			DebugLogger.log(`DEBUG: resolveTemplate - Config parsed successfully:`, config);
		} catch (error) {
			DebugLogger.log(`DEBUG: resolveTemplate - Config parsing failed:`, error);
			// Config file doesn't exist or is invalid, continue without it
		}

		// Get all files in the template
		// Merge global exclude patterns with template-specific ones
		const excludePatterns = [...(globalExclude || []), ...(config?.exclude || [])];

		// Add specific paths to exclude from targeted includes
		if (pathsToExclude) {
			for (const pathToExclude of pathsToExclude) {
				// Skip underscore patterns for minimatch - they'll be handled by resolved path logic
				if (!pathToExclude.includes('_')) {
					// Escape square brackets for minimatch (treat as literal text, not character classes)
					const escapedPath = pathToExclude.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
					const pattern1 = `${escapedPath}/**`;
					const pattern2 = escapedPath;
					excludePatterns.push(pattern1);
					excludePatterns.push(pattern2);
				}
			}
		}

		// Set _resolvedExcludes and _resolvedIncludes on the config for use in FileProcessor
		// Paths that should be excluded from other sources (but not underscore paths that are explicitly included)
		const excludedPaths = new Set<string>();
		const explicitlyIncludedPaths = new Set<string>();

		// Add global excludes from all templates
		if (allResolvedExcludes) {
			for (const path of allResolvedExcludes) {
				excludedPaths.add(path);
			}
		}

		if (pathsToExclude) {
			for (const path of pathsToExclude) {
				if (path.includes('_')) {
					// Underscore paths that are explicitly included should not be excluded
					explicitlyIncludedPaths.add(path);
				} else {
					// Non-underscore paths should be excluded
					excludedPaths.add(path);
				}
			}
		}

		if (config) {
			config._resolvedExcludes = excludedPaths;
			config._resolvedIncludes = explicitlyIncludedPaths;
		}

		const mergedConfig = {
			...config,
			exclude: excludePatterns,
			_resolvedExcludes: excludedPaths,
			_resolvedIncludes: explicitlyIncludedPaths,
		};
		DebugLogger.log(`DEBUG: resolveTemplate - Getting template files for: ${templatePath}`);
		let files = await this.fileProcessor.getTemplateFiles(templatePath, mergedConfig, data);
		DebugLogger.log(
			`DEBUG: resolveTemplate - Found ${files.length} files:`,
			files.map((f) => f.targetPath),
		);

		// Handle includes from the template's config
		if (config?.include) {
			const normalizedIncludes = this.normalizeIncludeArray(config.include);
			// Apply conditional logic to include paths
			const conditionalIncludes = this.applyConditionalLogicToIncludePaths(normalizedIncludes, data || {});

			for (const include of conditionalIncludes) {
				DebugLogger.log(`DEBUG: Processing conditional include: ${include.source} -> ${include.target}`);

				// Use the original include.source for disk lookup, and the processed (logical) one for output
				const logicalSource = include.source;
				const originalInclude = this.normalizeIncludeItem(include);
				const physicalSource = include.physicalSource; // Use the physical source from applyConditionalLogicToIncludePaths
				if (!physicalSource) {
					DebugLogger.warn(`⚠️  Include skipped: No physical source resolved for "${include.source}"`);
					continue;
				}

				// Try to find the actual path on disk with fallback support
				DebugLogger.log(`DEBUG: TemplateResolver - Resolving physical path:`);
				DebugLogger.log(`  - logicalSource: ${logicalSource}`);
				DebugLogger.log(`  - physicalSource: ${physicalSource}`);
				DebugLogger.log(`  - templatePath: ${templatePath}`);

				const resolvedPhysicalSource = this.tryResolvePhysicalPathWithFallback(
					logicalSource,
					physicalSource,
					data || {},
				);
				DebugLogger.log(`DEBUG: TemplateResolver - Resolved physical source: ${resolvedPhysicalSource}`);
				DebugLogger.log(`DEBUG: TemplateResolver - Original physical source: ${physicalSource}`);
				DebugLogger.log(`DEBUG: TemplateResolver - Logical source: ${logicalSource}`);

				if (!resolvedPhysicalSource) {
					DebugLogger.warn(`⚠️  Include skipped: Physical path resolution failed for "${include.source}"`);
					continue;
				}

				// Resolve the path relative to the template path
				// For relative paths like ../../typescript/file.json, we need to resolve them correctly
				let includeSourcePath: string;
				if (resolvedPhysicalSource.startsWith('/')) {
					// Handle absolute paths
					includeSourcePath = resolvedPhysicalSource;
				} else {
					// Handle relative paths by resolving them relative to the template path
					includeSourcePath = resolve(templatePath, resolvedPhysicalSource);
					DebugLogger.log(`DEBUG: TemplateResolver - Path resolution:`);
					DebugLogger.log(`  - templatePath: ${templatePath}`);
					DebugLogger.log(`  - resolvedPhysicalSource: ${resolvedPhysicalSource}`);
					DebugLogger.log(`  - includeSourcePath: ${includeSourcePath}`);
				}

				// Check if the resolved path exists
				DebugLogger.log(`DEBUG: TemplateResolver - Checking resolved path: ${includeSourcePath}`);
				try {
					await fs.access(includeSourcePath);
					DebugLogger.log(`DEBUG: TemplateResolver - Resolved path exists: ${includeSourcePath}`);
				} catch {
					// Path doesn't exist, skip this include
					DebugLogger.warn(
						`⚠️  Include skipped: Path not found "${includeSourcePath}" (resolved from "${include.source}")`,
					);
					continue;
				}

				// console.log(`DEBUG: TemplateResolver - Processing include:`);
				// console.log(`  - logicalSource: ${logicalSource}`);
				// console.log(`  - physicalSource: ${physicalSource}`);
				// console.log(`  - templatePath: ${templatePath}`);
				// console.log(`  - includeSourcePath: ${includeSourcePath}`);

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
					...includeConfig, // Merge in the includeConfig last
				};
				// Ensure _resolvedExcludes and _resolvedIncludes are also set on includeProcessingConfig after all merges
				if (mergedConfig._resolvedExcludes) {
					includeProcessingConfig._resolvedExcludes = mergedConfig._resolvedExcludes;
				}
				if (mergedConfig._resolvedIncludes) {
					includeProcessingConfig._resolvedIncludes = mergedConfig._resolvedIncludes;
				}

				// console.log('DEBUG: includeProcessingConfig before getTemplateFiles:', {
				// 	_resolvedExcludes: includeProcessingConfig._resolvedExcludes,
				// 	_resolvedIncludes: includeProcessingConfig._resolvedIncludes,
				// 	exclude: includeProcessingConfig.exclude,
				// 	merge: includeProcessingConfig.merge,
				// 	keys: Object.keys(includeProcessingConfig),
				// });
				const includeFiles = await this.fileProcessor.getTemplateFiles(
					includeSourcePath,
					includeProcessingConfig,
					data,
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

					const finalTargetPath = targetPath || logicalOutputPath;
					// console.log(
					// 	`DEBUG: TemplateResolver - Mapping include file: ${file.sourcePath} -> ${finalTargetPath}`,
					// );
					return {
						...file,
						targetPath: finalTargetPath,
						includeConfig: includeConfig,
					};
				});
				// console.log(
				// 	`DEBUG: TemplateResolver - Added ${mappedFiles.length} files from include: ${include.source} -> ${include.target}`,
				// );
				includedFiles.push(...mappedFiles);
			}
		}

		const template: ResolvedTemplate = {
			path: templatePath,
			targetDir,
			config,
			files: [...includedFiles, ...files],
		};
		return template;
	}
}
