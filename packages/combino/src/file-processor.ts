import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { Parser } from 'expr-eval';
import { ResolvedTemplate, ResolvedFile, ProcessedFile, CombinoConfig, MergeStrategy, TemplateInfo } from './types.js';
import { PluginManager } from './types.js';
import { existsSync } from 'fs';

export class FileProcessor {
	private configFileName: string;
	private combinedMergeConfig: Record<string, Record<string, any>> = {};

	constructor(configFileName: string = 'combino.json') {
		this.configFileName = configFileName;
	}

	/**
	 * Combines merge configurations from all templates in topological order
	 * First global config, then local configs in the order of resolvedTemplates
	 */
	private combineMergeConfigs(
		templates: ResolvedTemplate[],
		globalConfig?: CombinoConfig,
	): Record<string, Record<string, any>> {
		const combinedConfig: Record<string, Record<string, any>> = {};

		// 1. Start with global config if provided
		if (globalConfig?.merge) {
			Object.assign(combinedConfig, globalConfig.merge);
		}

		// 2. Add local configs in the order of resolvedTemplates
		for (const template of templates) {
			if (template.config?.merge) {
				Object.assign(combinedConfig, template.config.merge);
			}
		}

		return combinedConfig;
	}

	async getTemplateFiles(
		templatePath: string,
		config?: CombinoConfig,
		data?: Record<string, any>,
	): Promise<ResolvedFile[]> {
		const files: ResolvedFile[] = [];
		const excludePatterns = config?.exclude || [];

		// Check if templatePath is actually a file (not a directory)
		try {
			const stats = await fs.stat(templatePath);
			if (stats.isFile()) {
				// Handle individual file include
				const content = await fs.readFile(templatePath, 'utf-8');

				// Parse file-specific config if it exists
				const fileConfigPath = join(templatePath, this.configFileName);
				let fileConfig;
				try {
					const configContent = await fs.readFile(fileConfigPath, 'utf-8');
					fileConfig = JSON.parse(configContent);
				} catch {
					// No file-specific config
				}

				// For individual files, use the filename as the target path
				const fileName = basename(templatePath);

				// Apply underscore exclusion logic to individual files
				const underscoreResult = this.shouldExcludeUnderscoreFile(fileName, config);
				if (underscoreResult.exclude) {
					return files; // Return empty array if file should be excluded
				}

				const targetPath = underscoreResult.targetPath || fileName;

				files.push({
					sourcePath: templatePath,
					targetPath,
					content,
					config: fileConfig,
				});

				return files;
			}
		} catch {
			// If we can't stat the path, assume it's a directory and continue with normal processing
		}

		// Get all files in the template directory, excluding config files
		const allFiles = await glob('**/*', {
			cwd: templatePath,
			dot: true,
			nodir: true,
			ignore: [...excludePatterns, `**/${this.configFileName}`, '**/*.combino'],
		});

		// Manually filter out files that match exclusion patterns or resolved exclusion paths
		const filteredFiles = allFiles.filter((file) => {
			// Always print debug info for every file
			const resolvedFile = this.applyConditionalLogic(file, data || {});
			if (resolvedFile) {
				const fileName = basename(resolvedFile);
				console.log('DEBUG: FileProcessor processing file:', {
					file,
					resolvedFile,
					fileName,
					hasExclusions: !!(config && config._resolvedExcludes),
					excludes: config && config._resolvedExcludes ? Array.from(config._resolvedExcludes) : [],
				});
			}

			// Exclude if matches any resolved exclusion path
			if (config && config._resolvedExcludes) {
				if (resolvedFile) {
					const fileName = basename(resolvedFile);
					console.log('DEBUG: FileProcessor exclusion check:', {
						file,
						resolvedFile,
						fileName,
						excludes: Array.from(config._resolvedExcludes),
					});
					const isExcluded = Array.from(config._resolvedExcludes).some((excludePath) => {
						console.log('  Checking excludePath:', excludePath);

						// Apply conditional logic to the exclude path to remove brackets for comparison
						const processedExcludePath = this.applyConditionalLogic(excludePath, data || {});
						const excludeFileName = processedExcludePath
							? basename(processedExcludePath)
							: basename(excludePath);

						// Also apply conditional logic to the file path to remove brackets for comparison
						const processedResolvedFile = this.applyConditionalLogic(resolvedFile, data || {});
						const processedFileName = processedResolvedFile ? basename(processedResolvedFile) : fileName;

						if (excludePath === resolvedFile) {
							console.log('    -> Exact match!');
							return true;
						}
						if (processedExcludePath === resolvedFile) {
							console.log('    -> Processed exact match!');
							return true;
						}
						if (processedExcludePath === processedResolvedFile) {
							console.log('    -> Processed exact match (both processed)!');
							return true;
						}
						if (excludePath === fileName) {
							console.log('    -> Filename match!');
							return true;
						}
						if (excludeFileName === fileName) {
							console.log('    -> Processed filename match!');
							return true;
						}
						if (excludeFileName === processedFileName) {
							console.log('    -> Processed filename match (both processed)!');
							return true;
						}
						if (excludePath.endsWith('/') && resolvedFile.startsWith(excludePath)) {
							console.log('    -> Directory match!');
							return true;
						}
						if (
							processedExcludePath &&
							processedExcludePath.endsWith('/') &&
							resolvedFile.startsWith(processedExcludePath)
						) {
							console.log('    -> Processed directory match!');
							return true;
						}
						return false;
					});
					if (isExcluded) {
						console.log('  -> File EXCLUDED');
						return false;
					}
					console.log('  -> File NOT excluded');
				}
			}
			// Handle underscore exclusion using resolved paths
			if (resolvedFile) {
				// Check if file should be excluded by underscore rule
				const segments = resolvedFile.split('/');
				for (const segment of segments) {
					if (segment.startsWith('_') && segment !== '_') {
						// Check if this underscore file/folder is explicitly included via config
						const isExplicitlyIncluded =
							config?._resolvedIncludes &&
							Array.from(config._resolvedIncludes).some(
								(includedPath) =>
									resolvedFile.startsWith(includedPath + '/') || resolvedFile === includedPath,
							);
						if (!isExplicitlyIncluded) {
							return false; // Exclude underscore-prefixed files/folders unless explicitly included
						}
					}
				}
			}
			// Fallback to minimatch for legacy patterns
			for (const pattern of excludePatterns) {
				if (minimatch(file, pattern)) {
					return false;
				}
			}
			return true;
		});

		// Get config file
		const configPath = join(templatePath, this.configFileName);
		const configExists = existsSync(configPath);

		for (const file of filteredFiles) {
			// Check for underscore exclusion: files/folders starting with _ should be excluded unless explicitly included
			const underscoreResult = this.shouldExcludeUnderscoreFile(file, config);
			if (underscoreResult.exclude) {
				continue;
			}

			// Check for tilde prefix: files starting with ~ should have the prefix removed
			const tildeResult = this.shouldRemoveTildePrefix(file);
			const processedFilePath = tildeResult.shouldRemove ? tildeResult.targetPath : file;

			const sourcePath = join(templatePath, file);
			const content = await fs.readFile(sourcePath, 'utf-8');

			// Parse file-specific config if it exists
			const fileConfigPath = join(sourcePath, this.configFileName);
			let fileConfig;
			try {
				const configContent = await fs.readFile(fileConfigPath, 'utf-8');
				fileConfig = JSON.parse(configContent);
			} catch {
				// No file-specific config
			}

			// Use the target path from underscore result if available, otherwise use the processed file path
			const targetPath = underscoreResult.targetPath || processedFilePath;

			files.push({
				sourcePath,
				targetPath,
				content,
				config: fileConfig,
			});
		}

		return files;
	}

	/**
	 * Resolve a pattern for comparison by applying conditional logic
	 * This is used to match exclusion patterns with actual file paths
	 */
	private resolvePatternForComparison(pattern: string, data: Record<string, any>): string {
		// Apply conditional logic to resolve the pattern
		// This removes [expression] segments when conditions are true
		const resolved = this.applyConditionalLogic(pattern, data);
		return resolved || pattern;
	}

	/**
	 * Resolve a file path for comparison by applying conditional logic
	 * This is used to match actual file paths with exclusion patterns
	 */
	private resolveFilePathForComparison(filePath: string, data: Record<string, any>): string {
		// Apply conditional logic to resolve the file path
		// This removes [expression] segments when conditions are true
		const resolved = this.applyConditionalLogic(filePath, data);
		return resolved || filePath;
	}

	/**
	 * Check if a file should be excluded due to underscore prefix
	 * Files and folders starting with _ are excluded unless explicitly included via local config
	 */
	private shouldExcludeUnderscoreFile(
		filePath: string,
		config?: CombinoConfig,
	): { exclude: boolean; targetPath?: string } {
		// Check if any part of the path starts with _
		const pathParts = filePath.split('/');
		const hasUnderscorePrefix = pathParts.some((part) => part.startsWith('_'));

		if (!hasUnderscorePrefix) {
			return { exclude: false }; // No underscore prefix, don't exclude
		}

		// If there's no config or no include array, exclude underscore files
		if (!config?.include) {
			return { exclude: true };
		}

		// Check if this file/folder is explicitly included in the config
		const normalizedIncludes = this.normalizeIncludeArray(config.include);

		for (const include of normalizedIncludes) {
			// Check if the include source matches this file path
			if (this.pathMatchesInclude(filePath, include.source)) {
				// If there's a target specified, use it for renaming
				if (include.target) {
					// Check if this is a directory include (file is within the included directory)
					if (filePath.startsWith(include.source + '/')) {
						// File is within the included directory, construct proper target path
						const relativePath = filePath.substring(include.source.length + 1); // +1 for the '/'
						const targetPath = join(include.target, relativePath);
						return { exclude: false, targetPath };
					} else if (filePath === include.source) {
						// Exact match - this is the directory itself
						return { exclude: false, targetPath: include.target };
					} else {
						// Individual file include
						return { exclude: false, targetPath: include.target };
					}
				}
				// If explicitly included without a target, remove the underscore prefix
				const targetPath = this.removeUnderscorePrefix(filePath);
				return { exclude: false, targetPath };
			}
		}

		return { exclude: true }; // Has underscore prefix but not explicitly included, exclude
	}

	/**
	 * Check if a file path matches an include source pattern
	 */
	private pathMatchesInclude(filePath: string, includeSource: string): boolean {
		// Handle exact matches
		if (filePath === includeSource) {
			return true;
		}

		// Handle directory includes (if includeSource is a directory, check if filePath is within it)
		if (filePath.startsWith(includeSource + '/')) {
			return true;
		}

		// Handle glob patterns (basic implementation)
		if (includeSource.includes('*')) {
			const pattern = includeSource.replace(/\*/g, '.*');
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(filePath);
		}

		return false;
	}

	/**
	 * Normalize include array to handle both string and object formats
	 */
	private normalizeIncludeArray(
		include: Array<string | { source: string; target?: string }>,
	): Array<{ source: string; target?: string }> {
		return include.map((item) => {
			if (typeof item === 'string') {
				return { source: item };
			}
			return item;
		});
	}

	/**
	 * Remove underscore prefix from file path
	 * Converts _package.json to package.json, _components/Button.tsx to components/Button.tsx, etc.
	 */
	private removeUnderscorePrefix(filePath: string): string {
		const pathParts = filePath.split('/');
		const processedParts = pathParts.map((part) => {
			if (part.startsWith('_')) {
				return part.substring(1); // Remove the underscore
			}
			return part;
		});
		return processedParts.join('/');
	}

	/**
	 * Check if a file should have its tilde prefix removed.
	 * Files starting with ~ are excluded until processed.
	 */
	private shouldRemoveTildePrefix(filePath: string): { shouldRemove: boolean; targetPath: string } {
		// Check if any part of the path starts with ~
		const pathParts = filePath.split('/');
		const hasTildePrefix = pathParts.some((part) => part.startsWith('~'));

		if (!hasTildePrefix) {
			return { shouldRemove: false, targetPath: filePath };
		}

		// Remove tilde prefix from all parts that have it
		const processedParts = pathParts.map((part) => {
			if (part.startsWith('~')) {
				return part.substring(1); // Remove the tilde
			}
			return part;
		});
		const targetPath = processedParts.join('/');

		return { shouldRemove: true, targetPath };
	}

	async compileFiles(
		templates: ResolvedTemplate[],
		data: Record<string, any>,
		pluginManager: PluginManager,
		globalConfig?: CombinoConfig,
	): Promise<ProcessedFile[]> {
		console.log('DEBUG: FileProcessor.compileFiles - Starting compilation');
		const compiledFiles: ProcessedFile[] = [];

		// Combine merge configurations in topological order
		this.combinedMergeConfig = this.combineMergeConfigs(templates, globalConfig);

		// Convert templates to TemplateInfo format for plugin context
		const templateInfos: TemplateInfo[] = templates.map((template) => ({
			path: template.path,
			targetDir: template.targetDir,
			config: template.config,
			files: template.files.map((file) => ({
				sourcePath: file.sourcePath,
				targetPath: file.targetPath,
				content: file.content,
			})),
		}));

		for (const template of templates) {
			console.log(`DEBUG: FileProcessor.compileFiles - Processing template: ${template.path}`);
			for (const file of template.files) {
				console.log(
					`DEBUG: FileProcessor.compileFiles - Processing file: ${file.sourcePath} -> ${file.targetPath}`,
				);

				// Skip companion files (they're only used for data)
				const isCompanionFile = file.targetPath.match(/\.json\.json$/);

				if (isCompanionFile) {
					console.log(`DEBUG: FileProcessor.compileFiles - Skipping companion file: ${file.targetPath}`);
					continue;
				}

				// Apply conditional logic to file paths
				const targetPath = this.applyConditionalLogic(file.targetPath, data);
				if (!targetPath) {
					console.log(
						`DEBUG: FileProcessor.compileFiles - File excluded by conditional logic: ${file.targetPath}`,
					);
					continue; // File excluded by conditional logic
				}

				console.log(
					`DEBUG: FileProcessor.compileFiles - Conditional logic result: ${file.targetPath} -> ${targetPath}`,
				);

				// Compile file content with plugins (single compile hook with full context)
				const context = {
					sourcePath: file.sourcePath,
					id: targetPath,
					content: file.content,
					data,
					allTemplates: templateInfos,
				};

				const result = await pluginManager.compileWithTemplates(context, templateInfos);

				// Determine merge strategy using combined configuration
				const mergeStrategy = this.getMergeStrategy(file, this.combinedMergeConfig);

				const finalTargetPath = result.id || targetPath;
				console.log(
					`DEBUG: FileProcessor.compileFiles - Final target path: ${finalTargetPath} (strategy: ${mergeStrategy})`,
				);

				compiledFiles.push({
					sourcePath: file.sourcePath,
					targetPath: finalTargetPath,
					content: result.content,
					mergeStrategy,
				});
			}
		}

		console.log('DEBUG: FileProcessor.compileFiles - Compilation complete');
		return compiledFiles;
	}

	async assembleFiles(
		mergedFiles: ProcessedFile[],
		data: Record<string, any>,
		pluginManager: PluginManager,
	): Promise<ProcessedFile[]> {
		const assembledFiles: ProcessedFile[] = [];

		for (const file of mergedFiles) {
			// Process merged file content with plugins (assemble hook)
			const context = {
				sourcePath: file.sourcePath,
				id: file.targetPath,
				content: file.content,
				data,
			};

			const result = await pluginManager.assemble(context);

			assembledFiles.push({
				...file,
				targetPath: result.id || file.targetPath,
				content: result.content,
			});
		}

		return assembledFiles;
	}

	public applyConditionalLogic(path: string, data: Record<string, any>): string | null {
		// Handle conditional file paths like [framework=="react"]App.tsx
		let result = path;

		// First pass: Handle all conditional logic (conditions that determine inclusion/exclusion)
		// This includes both complex conditions and simple boolean conditions
		const conditionalRegex = /\[([^\]]+)\]/g;
		let match;

		// Reset regex lastIndex
		conditionalRegex.lastIndex = 0;

		while ((match = conditionalRegex.exec(path)) !== null) {
			const expression = match[1];

			// Skip ternary expressions (they contain "?" and ":")
			if (expression.includes('?') && expression.includes(':')) {
				continue;
			}

			// Check if this is a conditional expression (has operators or is a simple boolean)
			const isConditional = this.isConditionalExpression(expression, data);

			if (isConditional) {
				const shouldInclude = this.evaluateCondition(expression, data);

				if (!shouldInclude) {
					return null; // File should be excluded
				}

				// Remove the conditional brackets since the condition is true
				result = result.replace(match[0], '');
			}
		}

		// Second pass: Handle dynamic naming like [name] or ternary expressions
		const dynamicRegex = /\[([^\]]+)\]/g;
		result = result.replace(dynamicRegex, (match, expression) => {
			const evaluated = this.evaluateExpression(expression, data);
			return evaluated || '';
		});

		// Normalize the path to remove leading slashes that might result from conditional removal
		result = result.replace(/^\/+/, '');

		return result;
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
			// Add logging to see what data we're working with
			// console.log("Evaluating condition:", condition);
			// console.log("With data:", JSON.stringify(data, null, 2));

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

			// Log the scope being used for evaluation
			// console.log("Evaluation scope:", JSON.stringify(scope, null, 2));

			// Parse and evaluate the expression
			const expr = parser.parse(parsedCondition);
			const result = expr.evaluate(scope);
			// console.log("Condition result:", result);
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

	private getMergeStrategy(file: ResolvedFile, config: Record<string, Record<string, any>>): MergeStrategy {
		console.log(`DEBUG: getMergeStrategy - File: ${file.targetPath}`);
		console.log(`DEBUG: getMergeStrategy - Config:`, config);

		// Check file-specific config first
		if (file.config?.merge) {
			console.log(`DEBUG: getMergeStrategy - File config merge:`, file.config.merge);
			for (const [pattern, config] of Object.entries(file.config.merge)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					const strategy = config.strategy || 'replace';
					console.log(`DEBUG: getMergeStrategy - File config match: ${pattern} -> ${strategy}`);
					return strategy;
				}
			}
		}

		// Check include config (for files that come from included directories)
		if (file.includeConfig?.merge) {
			console.log(`DEBUG: getMergeStrategy - Include config merge:`, file.includeConfig.merge);
			for (const [pattern, config] of Object.entries(file.includeConfig.merge)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					const strategy = config.strategy || 'replace';
					console.log(`DEBUG: getMergeStrategy - Include config match: ${pattern} -> ${strategy}`);
					return strategy;
				}
			}
		}

		// Check template config
		if (config) {
			console.log(`DEBUG: getMergeStrategy - Template config:`, config);
			for (const [pattern, mergeConfig] of Object.entries(config)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					const strategy = mergeConfig.strategy || 'replace';
					console.log(`DEBUG: getMergeStrategy - Template config match: ${pattern} -> ${strategy}`);
					return strategy;
				}
			}
		}

		console.log(`DEBUG: getMergeStrategy - No match found, using default: replace`);
		return 'replace'; // Default strategy
	}

	private matchesPattern(filePath: string, pattern: string): boolean {
		// Use minimatch for proper glob pattern matching
		const result = minimatch(filePath, pattern);
		console.log(`DEBUG: matchesPattern - "${filePath}" matches "${pattern}": ${result}`);
		return result;
	}
}
