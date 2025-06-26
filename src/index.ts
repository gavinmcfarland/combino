import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { Parser } from "expr-eval";
import { TemplateOptions, FileContent, MergeStrategy } from "./types.js";
import { mergeJson } from "./mergers/json.js";
import { mergeMarkdown } from "./mergers/markdown.js";
import { mergeText } from "./mergers/text.js";
import * as ini from "ini";
import { fileURLToPath } from "url";
import prettier from "prettier";
import prettierPluginSvelte from "prettier-plugin-svelte";
import {
	TemplateEngine,
	EJSTemplateEngine,
	HandlebarsTemplateEngine,
	MustacheTemplateEngine,
} from "./template-engines/index.js";

interface CombinoConfig {
	exclude?: string[];
	data?: Record<string, any>;
	merge?: Record<string, Record<string, any>>;
	include?: Array<{ source: string; target?: string }>;
}

// Helper to manually parse [merge:...] sections from ini-like config text
function parseMergeSections(configText: string): Record<string, any> {
	const merge: Record<string, any> = {};
	const sectionRegex = /^\[merge:([^\]]+)\]$/gm;
	let match: RegExpExecArray | null;
	while ((match = sectionRegex.exec(configText))) {
		const pattern = match[1];
		const start = match.index + match[0].length;
		const end = (() => {
			const nextSection = configText.slice(start).search(/^\[.*\]$/m);
			return nextSection === -1 ? configText.length : start + nextSection;
		})();
		const body = configText.slice(start, end).trim();
		const lines = body.split(/\r?\n/).filter(Boolean);
		const settings: Record<string, any> = {};
		for (const line of lines) {
			const eqIdx = line.indexOf("=");
			if (eqIdx !== -1) {
				const key = line.slice(0, eqIdx).trim();
				const value = line.slice(eqIdx + 1).trim();
				settings[key] = value;
			}
		}
		if (Object.keys(settings).length > 0) {
			merge[pattern] = settings;
		}
	}
	return merge;
}

// Helper to parse [include] section from ini-like config text
function parseIncludeSection(
	configText: string,
): Array<{ source: string; target?: string }> {
	const include: Array<{ source: string; target?: string }> = [];
	const sectionRegex = /^\[include\]$/gm;
	let match: RegExpExecArray | null;
	while ((match = sectionRegex.exec(configText))) {
		const start = match.index + match[0].length;
		const end = (() => {
			const nextSection = configText.slice(start).search(/^\[.*\]$/m);
			return nextSection === -1 ? configText.length : start + nextSection;
		})();
		const body = configText.slice(start, end).trim();
		const lines = body.split(/\r?\n/).filter(Boolean);
		for (const line of lines) {
			const [source, target] = line.split("=").map((s) => s.trim());
			if (source) {
				include.push({ source, target });
			}
		}
	}
	return include;
}

// Helper to format files with Prettier
async function formatFileWithPrettier(
	filePath: string,
	content: string,
): Promise<string> {
	try {
		// Get file extension to determine parser
		const ext = path.extname(filePath).toLowerCase();

		// Define which file types to format
		const formattableExtensions = [
			".js",
			".ts",
			".jsx",
			".tsx",
			".json",
			".md",
			".css",
			".scss",
			".html",
			".vue",
			".svelte",
		];

		if (!formattableExtensions.includes(ext)) {
			return content; // Return original content if not a formattable file type
		}

		// Determine parser based on file extension
		let parser: string;
		switch (ext) {
			case ".js":
			case ".jsx":
				parser = "babel";
				break;
			case ".ts":
			case ".tsx":
				parser = "typescript";
				break;
			case ".json":
				parser = "json";
				break;
			case ".md":
				parser = "markdown";
				break;
			case ".css":
			case ".scss":
				parser = "css";
				break;
			case ".html":
				parser = "html";
				break;
			case ".vue":
				parser = "vue";
				break;
			case ".svelte":
				parser = "svelte";
				break;
			default:
				parser = "babel";
		}

		// Try to find a Prettier config file in the project
		let prettierConfig: any = {
			useTabs: true,
			semi: false,
			singleQuote: true,
			printWidth: 120,
			overrides: [
				{
					files: "*.md",
					options: {
						useTabs: false,
						tabWidth: 4,
					},
				},
			],
		};
		try {
			const configPath = await prettier.resolveConfig(filePath);
			if (configPath) {
				prettierConfig = (await prettier.resolveConfig(filePath)) || {};
			}
		} catch (error) {
			// If no config found, use default settings
		}

		// Format the content
		const finalConfig = {
			...prettierConfig,
			parser,
			plugins: [prettierPluginSvelte, ...(prettierConfig.plugins || [])],
		};

		// Debug logging for JSON files
		// if (ext === '.json') {
		// 	console.log('Formatting JSON file:', filePath);
		// 	console.log('Final Prettier config:', JSON.stringify(finalConfig, null, 2));
		// }

		return prettier.format(content, finalConfig);
	} catch (error) {
		// If formatting fails, return original content
		console.warn(
			`Warning: Failed to format ${filePath} with Prettier:`,
			error,
		);
		return content;
	}
}

export class Combino {
	private data: Record<string, any> = {};
	private templateEngine: TemplateEngine | null = null;

	constructor(templateEngine?: TemplateEngine) {
		// Don't set a default template engine - let it be set later when needed
		if (templateEngine) {
			this.templateEngine = templateEngine;
		}
	}

	private async readFile(filePath: string): Promise<FileContent> {
		const content = await fs.readFile(filePath, "utf-8");
		const { data, content: fileContent } = matter(content);

		const config: CombinoConfig = {};

		// Try to read companion .combino file
		const companionPath = `${filePath}.combino`;
		try {
			const companionContent = await fs.readFile(companionPath, "utf-8");
			const parsedConfig = ini.parse(companionContent);

			// Extract data section and structure it properly
			if (parsedConfig.data) {
				config.data = {};
				// Convert flat data structure to nested
				Object.entries(parsedConfig.data).forEach(([key, value]) => {
					const keys = key.split(".");
					let current = config.data!;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					// Try to parse the value as JSON first
					try {
						const parsedValue = JSON.parse(value as string);
						current[keys[keys.length - 1]] = parsedValue;
					} catch {
						// If not valid JSON, use the value as is
						current[keys[keys.length - 1]] = value;
					}
				});
			}

			// Manually parse [merge:...] sections
			config.merge = parseMergeSections(companionContent);

			// Also support [merge] catch-all section from ini
			if (parsedConfig.merge && typeof parsedConfig.merge === "object") {
				config.merge = { ...config.merge, "*": parsedConfig.merge };
			}
		} catch (error) {
			// If no companion file exists, fall back to front matter
			if (data) {
				if (
					typeof data === "object" &&
					data !== null &&
					"data" in data
				) {
					config.data = (data as any).data;
				} else {
					config.data = data;
				}
			}

			// Extract merge section if it exists
			if (data?.merge) {
				config.merge = data.merge;
			}
		}

		return {
			content: fileContent,
			config,
		};
	}

	private async readCombinoConfig(
		templatePath: string,
	): Promise<CombinoConfig> {
		const configPath = path.join(templatePath, ".combino");
		// console.log("Reading config from:", configPath);
		try {
			const content = await fs.readFile(configPath, "utf-8");

			// Process the content with EJS first
			const processedContent = await this.processTemplate(content, {
				framework: "react", // Default value, can be overridden by data
				...this.data, // Include any existing data
			});

			// console.log("Processed .combino content:", processedContent);
			// console.log("Data used for EJS processing:", {
			// 	framework: "react",
			// 	...this.data,
			// });

			const parsedConfig = ini.parse(processedContent);

			const config: CombinoConfig = {};

			// Extract exclude section - handle as a list of values
			if (parsedConfig.exclude) {
				config.exclude = Object.keys(parsedConfig.exclude);
			}

			// Extract data section and structure it properly
			if (parsedConfig.data) {
				config.data = {};
				// Convert flat data structure to nested
				Object.entries(parsedConfig.data).forEach(([key, value]) => {
					const keys = key.split(".");
					let current = config.data!;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					// If the value is an array, try to parse each element as JSON
					if (Array.isArray(value)) {
						current[keys[keys.length - 1]] = value.map((item) => {
							try {
								return JSON.parse(item);
							} catch {
								return item;
							}
						});
					} else {
						current[keys[keys.length - 1]] = value;
					}
				});
			}

			// Manually parse [merge:...] sections
			config.merge = parseMergeSections(processedContent);

			// Also support [merge] catch-all section from ini
			if (parsedConfig.merge && typeof parsedConfig.merge === "object") {
				config.merge = { ...config.merge, "*": parsedConfig.merge };
			}

			// Parse [include] section
			config.include = parseIncludeSection(processedContent);

			// console.log("Parsed include config:", config.include);

			return config;
		} catch (error) {
			return {};
		}
	}

	private async readConfigFile(configPath: string): Promise<CombinoConfig> {
		try {
			const content = await fs.readFile(configPath, "utf-8");
			const parsedConfig = ini.parse(content);
			const config: CombinoConfig = {};

			// Extract data section and structure it properly
			if (parsedConfig.data) {
				config.data = {};
				// Convert flat data structure to nested
				Object.entries(parsedConfig.data).forEach(([key, value]) => {
					const keys = key.split(".");
					let current = config.data!;
					for (let i = 0; i < keys.length - 1; i++) {
						current[keys[i]] = current[keys[i]] || {};
						current = current[keys[i]];
					}
					current[keys[keys.length - 1]] = value;
				});
			}

			// Parse include section
			config.include = parseIncludeSection(content);

			// Manually parse [merge:...] sections
			config.merge = parseMergeSections(content);

			// Also support [merge] catch-all section from ini
			if (parsedConfig.merge && typeof parsedConfig.merge === "object") {
				config.merge = { ...config.merge, "*": parsedConfig.merge };
			}

			return config;
		} catch (error) {
			console.error("Error reading config file:", error);
			return {};
		}
	}

	private async processTemplate(
		content: string,
		data: Record<string, any>,
	): Promise<string> {
		if (!this.templateEngine) {
			// If no template engine is set, return content as-is
			return content;
		}

		try {
			return await this.templateEngine.render(content, data);
		} catch (error) {
			console.error("Error processing template:", error);
			return content;
		}
	}

	private evaluateCondition(
		condition: string,
		data: Record<string, any>,
	): string | boolean {
		try {
			// Add logging to see what data we're working with
			// console.log("Evaluating condition:", condition);
			// console.log("With data:", JSON.stringify(data, null, 2));

			// Remove the [ and ] from the condition
			const cleanCondition = condition.slice(1, -1);

			// Replace operators to be compatible with expr-eval
			const parsedCondition = cleanCondition
				.replace(/&&/g, " and ")
				.replace(/\|\|/g, " or ");

			// Create a parser instance
			const parser = new Parser();

			// Create a scope with the data
			const scope = Object.entries(data).reduce(
				(acc, [key, value]) => {
					// Handle nested properties
					const keys = key.split(".");
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
			return result;
		} catch (error) {
			console.error("Error evaluating condition:", error);
			return false;
		}
	}

	private async getFilesInTemplate(
		templatePath: string,
		ignorePatterns: string[],
		data: Record<string, any>,
	): Promise<{ sourcePath: string; targetPath: string }[]> {
		try {
			// Log the data being used for file processing
			// console.log(
			// 	"Processing template with data:",
			// 	JSON.stringify(data, null, 2)
			// );

			const files = await glob("**/*", {
				cwd: templatePath,
				nodir: true,
				ignore: ignorePatterns,
				dot: true,
			});

			// console.log("Found files:", files);

			const filteredFiles = files.filter((file) => {
				// First check if the file should be ignored
				if (
					ignorePatterns.some((pattern) => {
						const regex = new RegExp(pattern.replace(/\*/g, ".*"));
						return regex.test(file);
					})
				) {
					return false;
				}

				// Check each directory and file part in the path for conditions
				const parts = file.split(path.sep);
				for (const part of parts) {
					if (part.includes("[") && part.includes("]")) {
						// Extract the condition from the part
						const conditionMatch = part.match(/\[[^\]]+\]/);
						if (conditionMatch) {
							const condition = conditionMatch[0];
							// console.log("Checking condition for file:", file);
							// console.log("Condition:", condition);
							// If any condition in the path is false, exclude the file
							const result = this.evaluateCondition(
								condition,
								data,
							);
							if (typeof result === "boolean" && !result) {
								// console.log(
								// 	"File excluded due to condition:",
								// 	file
								// );
								return false;
							}
						}
					}
				}

				return true;
			});

			// console.log("Filtered files:", filteredFiles);

			// Transform the file paths to handle conditional folders and file extensions
			const mappedFiles = filteredFiles.map((file) => {
				const parts = file.split(path.sep);
				const transformedParts = parts
					.map((part) => {
						if (part.includes("[") && part.includes("]")) {
							// Extract the condition from the part
							const conditionMatch = part.match(/\[[^\]]+\]/);
							if (conditionMatch) {
								const condition = conditionMatch[0];
								// If the part is just the condition, return empty string
								if (part === condition) {
									return "";
								}

								// Evaluate the condition and get the result
								const result = this.evaluateCondition(
									condition,
									data,
								);

								// If it's a boolean result, remove the condition
								if (typeof result === "boolean") {
									return part.replace(condition, "");
								}

								// If it's a string result (from ternary), use it
								return part.replace(condition, result);
							}
						}
						return part;
					})
					.filter(Boolean); // Remove empty strings

				const result = {
					sourcePath: path.join(templatePath, file),
					targetPath: path.join(...transformedParts),
				};
				// console.log("Mapped file:", result);
				return result;
			});

			return mappedFiles;
		} catch (error) {
			throw new Error(`Failed to get files in template: ${error}`);
		}
	}

	private getMergeStrategy(
		filePath: string,
		allTemplates: Array<{ path: string; config: CombinoConfig }>,
		globalConfig?: CombinoConfig,
	): MergeStrategy {
		// Check templates in order (lowest priority first) to find merge strategy
		// This implements inheritance - lower priority templates set the default strategy
		// Higher priority templates can override it
		for (const template of allTemplates) {
			if (template.config?.merge) {
				// Check each pattern in the merge config
				for (const [pattern, settings] of Object.entries(
					template.config.merge,
				)) {
					// Convert glob pattern to regex, handling brace expansion
					const expandedPattern = pattern.replace(
						/\{([^}]+)\}/g,
						(match, p1) => {
							// Split the options in the braces and escape them
							const options = p1
								.split(",")
								.map((opt: string) =>
									opt
										.trim()
										.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
								);
							return `(${options.join("|")})`;
						},
					);
					// Convert * to .* and ensure the pattern matches the entire string
					const regex = new RegExp(
						`^${expandedPattern.replace(/\*/g, ".*")}$`,
					);
					if (regex.test(filePath)) {
						// If settings has a strategy property, use it directly
						const typedSettings = settings as {
							strategy?: MergeStrategy;
						};
						if (typedSettings.strategy) {
							return typedSettings.strategy;
						}
						// Handle nested structure for file extensions
						const ext = path
							.extname(filePath)
							.toLowerCase()
							.slice(1); // Remove the dot
						const nestedSettings = settings as Record<
							string,
							{ strategy?: MergeStrategy }
						>;
						if (nestedSettings[ext]?.strategy) {
							return nestedSettings[ext].strategy;
						}
						// If no extension-specific strategy, use the pattern's strategy
						return (nestedSettings as any).strategy;
					}
				}
			}
		}

		// Check global config if no template-specific strategy found
		if (globalConfig?.merge) {
			for (const [pattern, settings] of Object.entries(
				globalConfig.merge,
			)) {
				const expandedPattern = pattern.replace(
					/\{([^}]+)\}/g,
					(match, p1) => {
						const options = p1
							.split(",")
							.map((opt: string) =>
								opt
									.trim()
									.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
							);
						return `(${options.join("|")})`;
					},
				);
				const regex = new RegExp(
					`^${expandedPattern.replace(/\*/g, ".*")}$`,
				);
				if (regex.test(filePath)) {
					const typedSettings = settings as {
						strategy?: MergeStrategy;
					};
					if (typedSettings.strategy) {
						return typedSettings.strategy;
					}
					const ext = path.extname(filePath).toLowerCase().slice(1);
					const nestedSettings = settings as Record<
						string,
						{ strategy?: MergeStrategy }
					>;
					if (nestedSettings[ext]?.strategy) {
						return nestedSettings[ext].strategy;
					}
					return (nestedSettings as any).strategy;
				}
			}
		}

		// Default strategy is now "replace" for all file types
		return "replace";
	}

	private async mergeFiles(
		targetPath: string,
		sourcePath: string,
		strategy: MergeStrategy,
		data: Record<string, any>,
		baseTemplatePath?: string,
	): Promise<string> {
		const ext = path.extname(targetPath).toLowerCase();

		let mergedContent: string;
		switch (ext) {
			case ".json":
				mergedContent = await mergeJson(
					targetPath,
					sourcePath,
					strategy,
					baseTemplatePath,
					data,
					this.templateEngine,
				);
				break;
			case ".md":
				mergedContent = await mergeMarkdown(
					targetPath,
					sourcePath,
					strategy,
				);
				break;
			default:
				mergedContent = await mergeText(
					targetPath,
					sourcePath,
					strategy,
				);
		}

		// Process the merged content with the template engine
		return this.processTemplate(mergedContent, data);
	}

	private getCallerFileLocation(): string {
		// Get the stack trace
		const stack = new Error().stack;
		if (!stack) return process.cwd();

		// Split the stack into lines and find the first line that's not from our internal code
		const lines = stack.split("\n");
		for (const line of lines) {
			// Skip lines from our internal code
			if (
				line.includes("at Combino.combine") ||
				line.includes("at Combino.getCallerFileLocation") ||
				line.includes("at processTicksAndRejections")
			) {
				continue;
			}

			// Try to extract the file path
			const match = line.match(
				/at\s+(?:\w+\s+\()?(?:(?:file|http|https):\/\/)?([^:]+)/,
			);
			if (match) {
				const filePath = match[1];
				// Convert URL to file path if needed
				if (filePath.startsWith("file://")) {
					return path.dirname(fileURLToPath(filePath));
				}
				// Handle ESM module paths
				if (filePath.startsWith("/")) {
					return path.dirname(filePath);
				}
				// Handle relative paths
				return path.dirname(path.resolve(process.cwd(), filePath));
			}
		}

		return process.cwd();
	}

	async combine(options: TemplateOptions): Promise<void> {
		const {
			outputDir,
			include,
			data: externalData = {},
			config,
			templateEngine,
		} = options;

		// Set template engine if provided
		if (templateEngine) {
			if (typeof templateEngine === "string") {
				// Handle string-based template engine selection
				switch (templateEngine.toLowerCase()) {
					case "ejs":
						this.templateEngine = new EJSTemplateEngine();
						break;
					case "handlebars":
						this.templateEngine = new HandlebarsTemplateEngine();
						break;
					case "mustache":
						this.templateEngine = new MustacheTemplateEngine();
						break;
					default:
						throw new Error(
							`Unknown template engine: ${templateEngine}`,
						);
				}
			} else {
				this.templateEngine = templateEngine;
			}
		}

		this.data = { ...externalData };
		const callerDir = this.getCallerFileLocation();
		const resolvedOutputDir = path.resolve(callerDir, outputDir);
		const resolvedTemplates = include.map((template) =>
			path.resolve(callerDir, template),
		);

		for (const template of resolvedTemplates) {
			if (!(await fileExists(template))) {
				console.warn(
					`Warning: Template directory not found: ${template}`,
				);
			}
		}

		await fs.mkdir(resolvedOutputDir, { recursive: true });

		const allIgnorePatterns = new Set<string>([
			"node_modules/**",
			".combino",
		]);
		const allData: Record<string, any> = { ...externalData };
		let globalConfig: CombinoConfig = {};

		if (typeof config === "string" && (await fileExists(config))) {
			const configPath = path.resolve(callerDir, config);
			const loadedConfig = await this.readConfigFile(configPath);
			globalConfig = loadedConfig;
			if (loadedConfig.data) {
				Object.assign(allData, loadedConfig.data);
			}
		} else if (typeof config === "object" && config !== null) {
			globalConfig = config;
			if (config.data) {
				Object.assign(allData, config.data);
			}
		}

		// Robust recursive collection of all templates and their includes
		const allTemplates: Array<{
			path: string;
			targetDir?: string;
			config: CombinoConfig;
		}> = [];
		const processedTemplates = new Set<string>();
		const templateDependencies = new Map<string, Set<string>>();

		// First pass: collect all templates and their dependencies
		const collectTemplateDependencies = async (
			templatePath: string,
			targetDir?: string,
		) => {
			const resolved = path.resolve(templatePath);
			if (processedTemplates.has(resolved)) {
				return;
			}
			processedTemplates.add(resolved);

			const templateConfig = await this.readCombinoConfig(resolved);
			const dependencies = new Set<string>();

			// Collect includes as dependencies
			if (templateConfig.include) {
				// console.log(
				// 	`Template ${resolved} includes:`,
				// 	templateConfig.include
				// );
				for (const { source, target } of templateConfig.include) {
					const resolvedIncludePath = path.resolve(resolved, source);
					if (await fileExists(resolvedIncludePath)) {
						dependencies.add(resolvedIncludePath);
						// console.log(
						// 	`  Adding dependency: ${resolvedIncludePath} -> ${resolved}`
						// );
						// Recursively collect dependencies of included templates
						await collectTemplateDependencies(
							resolvedIncludePath,
							target,
						);
					} else {
						console.warn(
							`Warning: Included template not found: ${resolvedIncludePath}`,
						);
					}
				}
			}

			templateDependencies.set(resolved, dependencies);
		};

		// Start dependency collection from initial templates
		for (const template of resolvedTemplates) {
			await collectTemplateDependencies(template);
		}

		// console.log("Dependency graph:");
		for (const [template, deps] of templateDependencies.entries()) {
			// console.log(`  ${template} -> [${Array.from(deps).join(", ")}]`);
		}

		// Second pass: topological sort to determine processing order
		const sortedTemplates: Array<{
			path: string;
			targetDir?: string;
			config: CombinoConfig;
		}> = [];
		const visited = new Set<string>();
		const visiting = new Set<string>();

		const topologicalSort = async (templatePath: string) => {
			if (visiting.has(templatePath)) {
				throw new Error(
					`Circular dependency detected: ${templatePath}`,
				);
			}
			if (visited.has(templatePath)) {
				return;
			}

			visiting.add(templatePath);
			const dependencies =
				templateDependencies.get(templatePath) || new Set();

			// Process dependencies first (includes should be processed before the template that includes them)
			for (const dependency of dependencies) {
				await topologicalSort(dependency);
			}

			visiting.delete(templatePath);
			visited.add(templatePath);

			// Add template data and ignore patterns
			const templateConfig = await this.readCombinoConfig(templatePath);
			if (templateConfig.data) {
				Object.assign(allData, templateConfig.data);
			}
			if (templateConfig.exclude) {
				templateConfig.exclude.forEach((pattern) =>
					allIgnorePatterns.add(pattern),
				);
			}

			// Add this template to the sorted list
			sortedTemplates.push({
				path: templatePath,
				targetDir: undefined, // We'll need to track targetDir separately
				config: templateConfig,
			});
		};

		// Perform topological sort for all templates
		for (const templatePath of templateDependencies.keys()) {
			await topologicalSort(templatePath);
		}

		// console.log("Topologically sorted templates:");
		sortedTemplates.forEach((tpl, idx) => {
			// console.log(`  ${idx + 1}: ${tpl.path}`);
		});

		// Build targetDir map from initial templates
		const targetDirMap = new Map<string, string>();
		const buildTargetDirMap = async (
			templatePath: string,
			targetDir?: string,
		) => {
			const resolved = path.resolve(templatePath);
			if (targetDir) {
				targetDirMap.set(resolved, targetDir);
			}
			const templateConfig = await this.readCombinoConfig(resolved);
			if (templateConfig.include) {
				for (const { source, target } of templateConfig.include) {
					const resolvedIncludePath = path.resolve(resolved, source);
					if (await fileExists(resolvedIncludePath)) {
						await buildTargetDirMap(resolvedIncludePath, target);
					}
				}
			}
		};

		// Build targetDir map from initial templates
		for (const template of resolvedTemplates) {
			await buildTargetDirMap(template);
		}

		// After topological sort, reorder so initial templates are in the order given, but only after their dependencies
		const initialTemplatesSet = new Set(
			resolvedTemplates.map((t) => path.resolve(t)),
		);
		const reorderedTemplates: typeof sortedTemplates = [];
		const alreadyAdded = new Set<string>();

		// Helper to add a template and its dependencies
		const addWithDependencies = (templatePath: string) => {
			const resolved = path.resolve(templatePath);
			if (alreadyAdded.has(resolved)) return;
			// Add dependencies first
			const deps = templateDependencies.get(resolved) || new Set();
			for (const dep of deps) {
				addWithDependencies(dep);
			}
			// Then add the template itself
			const tpl = sortedTemplates.find(
				(t) => path.resolve(t.path) === resolved,
			);
			if (tpl) {
				reorderedTemplates.push(tpl);
				alreadyAdded.add(resolved);
			}
		};

		// Add initial templates in the order given, with their dependencies
		for (const template of resolvedTemplates) {
			addWithDependencies(template);
		}

		// Add any remaining templates (e.g., includes not in initial list)
		for (const tpl of sortedTemplates) {
			addWithDependencies(tpl.path);
		}

		// Update allTemplates with the new order
		allTemplates.length = 0;
		for (const template of reorderedTemplates) {
			allTemplates.push({
				...template,
				targetDir: targetDirMap.get(path.resolve(template.path)),
			});
		}

		// console.log("Ordered list of templates to process:");
		allTemplates.forEach((tpl, idx) => {
			// console.log(
			// 	`${idx + 1}: ${tpl.path}${
			// 		tpl.targetDir ? ` -> ${tpl.targetDir}` : ""
			// 	}`
			// );
		});

		// Build a set of all templates that have target directories
		const templatesWithTargetDirs = new Set<string>();
		// Map from template path to extra ignore patterns
		const templateExtraIgnores = new Map<string, Set<string>>();
		// Map from template path to included templates with targets
		const includedWithTargets = new Map<string, Set<string>>();

		for (const template of allTemplates) {
			if (template.targetDir) {
				templatesWithTargetDirs.add(path.resolve(template.path));
			}
			// If this template includes others with a target, add the source to ignore
			if (template.config && template.config.include) {
				for (const { source, target } of template.config.include) {
					if (target) {
						const ignoreSet =
							templateExtraIgnores.get(
								path.resolve(template.path),
							) || new Set();
						// Resolve the source path relative to the template and get the basename
						const resolvedSourcePath = path.resolve(
							template.path,
							source,
						);
						const sourceBasename =
							path.basename(resolvedSourcePath);
						ignoreSet.add(sourceBasename);
						templateExtraIgnores.set(
							path.resolve(template.path),
							ignoreSet,
						);

						// Track which templates are included with targets
						const includedSet =
							includedWithTargets.get(
								path.resolve(template.path),
							) || new Set();
						includedSet.add(resolvedSourcePath);
						includedWithTargets.set(
							path.resolve(template.path),
							includedSet,
						);
					}
				}
			}
		}

		// Build a set of all templates that are included with targets
		const allIncludedWithTargets = new Set<string>();
		for (const includedSet of includedWithTargets.values()) {
			for (const includedPath of includedSet) {
				allIncludedWithTargets.add(includedPath);
			}
		}

		// Now process/merge files in order
		for (const {
			path: template,
			targetDir,
			config: templateConfig,
		} of allTemplates) {
			// Merge global ignore patterns with any extra for this template
			const extraIgnores =
				templateExtraIgnores.get(path.resolve(template)) || new Set();
			const ignorePatterns = Array.from(
				new Set([...allIgnorePatterns, ...extraIgnores]),
			);
			const files = await this.getFilesInTemplate(
				template,
				ignorePatterns,
				allData,
			);

			// Filter out files that are part of templates included with targets (only when copying to root)
			const filteredFiles = targetDir
				? files
				: files.filter(({ sourcePath }) => {
						// Check if this file is part of a template that's included with a target
						for (const includedPath of allIncludedWithTargets) {
							if (sourcePath.startsWith(includedPath)) {
								return false;
							}
						}
						return true;
					});

			for (const { sourcePath, targetPath } of filteredFiles) {
				const finalTargetPath = targetDir
					? path.join(targetDir, targetPath)
					: targetPath;
				const fullTargetPath = path.join(
					resolvedOutputDir,
					finalTargetPath,
				);

				await fs.mkdir(path.dirname(fullTargetPath), {
					recursive: true,
				});

				// Log the template and file being processed
				// console.log(
				// 	`[PROCESSING] Template: ${template} -> File: ${finalTargetPath}`
				// );

				const sourceContent = await this.readFile(sourcePath);
				const mergedConfig = {
					...templateConfig,
					merge: {
						...globalConfig.merge,
						...templateConfig.merge,
						...sourceContent.config?.merge,
					},
				};

				const strategy = this.getMergeStrategy(
					targetPath,
					allTemplates,
					globalConfig,
				);

				// Find the first template that contains this file for property order preservation
				let baseTemplatePath: string | undefined;
				for (const tpl of allTemplates) {
					const potentialBasePath = path.join(tpl.path, targetPath);
					if (await fileExists(potentialBasePath)) {
						baseTemplatePath = potentialBasePath;
						break;
					}
				}

				try {
					const targetContent = await this.readFile(fullTargetPath);
					const fileData = {
						...allData,
						...(sourceContent.config?.data
							? sourceContent.config.data
							: {}),
					};
					const mergedContent = await this.mergeFiles(
						fullTargetPath,
						sourcePath,
						strategy,
						fileData,
						baseTemplatePath,
					);
					const formattedContent = await formatFileWithPrettier(
						fullTargetPath,
						mergedContent,
					);
					await fs.writeFile(fullTargetPath, formattedContent);
				} catch (error) {
					const fileData = {
						...allData,
						...(sourceContent.config?.data
							? sourceContent.config.data
							: {}),
					};
					const processedContent = await this.processTemplate(
						sourceContent.content,
						fileData,
					);
					const formattedContent = await formatFileWithPrettier(
						fullTargetPath,
						processedContent,
					);
					await fs.writeFile(fullTargetPath, formattedContent);
				}
			}
		}
	}
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}
