import { promises as fs } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { Parser } from 'expr-eval';
import { ResolvedTemplate, ResolvedFile, ProcessedFile, CombinoConfig, MergeStrategy, TemplateInfo } from './types.js';
import { PluginManager } from './plugins/types.js';

export class FileProcessor {
	// This class is a placeholder for future file processing functionality
	// Currently, file processing is handled directly in the main Combino class

	async getTemplateFiles(templatePath: string, config?: CombinoConfig): Promise<ResolvedFile[]> {
		const files: ResolvedFile[] = [];
		const excludePatterns = config?.exclude || [];

		// Get all files in the template directory, excluding config files
		const allFiles = await glob('**/*', {
			cwd: templatePath,
			dot: true,
			nodir: true,
			ignore: [...excludePatterns, '**/combino.json', '**/config.json', '**/*.combino'],
		});

		for (const file of allFiles) {
			const sourcePath = join(templatePath, file);
			const content = await fs.readFile(sourcePath, 'utf-8');

			// Parse file-specific config if it exists
			const fileConfigPath = join(sourcePath, 'combino.json');
			let fileConfig;
			try {
				const configContent = await fs.readFile(fileConfigPath, 'utf-8');
				fileConfig = JSON.parse(configContent);
			} catch {
				// No file-specific config
			}

			files.push({
				sourcePath,
				targetPath: file,
				content,
				config: fileConfig,
			});
		}

		return files;
	}

	async compileFiles(
		templates: ResolvedTemplate[],
		data: Record<string, any>,
		pluginManager: PluginManager,
	): Promise<ProcessedFile[]> {
		const compiledFiles: ProcessedFile[] = [];

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
			for (const file of template.files) {
				// Skip companion files (they're only used for data)
				const isCompanionFile = file.targetPath.match(/\.json\.json$/);

				if (isCompanionFile) {
					continue;
				}

				// Apply conditional logic to file paths
				const targetPath = this.applyConditionalLogic(file.targetPath, data);
				if (!targetPath) continue; // File excluded by conditional logic

				// Compile file content with plugins (single compile hook with full context)
				const context = {
					sourcePath: file.sourcePath,
					id: targetPath,
					content: file.content,
					data,
					allTemplates: templateInfos,
				};

				const result = await pluginManager.compileWithTemplates(context, templateInfos);

				// Determine merge strategy
				const mergeStrategy = this.getMergeStrategy(file, template.config);

				compiledFiles.push({
					sourcePath: file.sourcePath,
					targetPath: result.id || targetPath,
					content: result.content,
					mergeStrategy,
				});
			}
		}

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

	private applyConditionalLogic(path: string, data: Record<string, any>): string | null {
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

	private getMergeStrategy(file: ResolvedFile, templateConfig?: CombinoConfig): MergeStrategy {
		// Check file-specific config first
		if (file.config?.merge) {
			for (const [pattern, config] of Object.entries(file.config.merge)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					return config.strategy || 'replace';
				}
			}
		}

		// Check include config (for files that come from included directories)
		if (file.includeConfig?.merge) {
			for (const [pattern, config] of Object.entries(file.includeConfig.merge)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					return config.strategy || 'replace';
				}
			}
		}

		// Check template config
		if (templateConfig?.merge) {
			for (const [pattern, config] of Object.entries(templateConfig.merge)) {
				if (this.matchesPattern(file.targetPath, pattern)) {
					return config.strategy || 'replace';
				}
			}
		}

		return 'replace'; // Default strategy
	}

	private matchesPattern(filePath: string, pattern: string): boolean {
		const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'));
		return regex.test(filePath);
	}
}
