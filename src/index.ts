import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import ejs from "ejs";
import { Parser } from "expr-eval";
import {
	TemplateOptions,
	FileContent,
	MergeStrategy,
	TemplateConfig,
} from "./types.js";
import { mergeJson } from "./mergers/json.js";
import { mergeMarkdown } from "./mergers/markdown.js";
import { mergeText } from "./mergers/text.js";
import * as ini from "ini";
import { fileURLToPath } from "url";

interface CombinoConfig {
	ignore?: string[];
	data?: Record<string, any>;
	merge?: Record<string, Record<string, any>>;
	include?: string[];
}

// Helper to flatten merge config keys
function flattenMergeConfig(mergeObj: any): Record<string, any> {
	const flat: Record<string, any> = {};
	for (const [key, value] of Object.entries(mergeObj)) {
		if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value) &&
			!("strategy" in value)
		) {
			// Flatten one level
			for (const [subKey, subValue] of Object.entries(value)) {
				flat[`${key}.${subKey}`] = subValue;
			}
		} else {
			flat[key] = value;
		}
	}
	return flat;
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
function parseIncludeSection(configText: string): string[] {
	const include: string[] = [];
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
		include.push(...lines);
	}
	return include;
}

export class Combino {
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
		templatePath: string
	): Promise<CombinoConfig> {
		const configPath = path.join(templatePath, ".combino");
		console.log("Reading config from:", configPath);
		try {
			const content = await fs.readFile(configPath, "utf-8");

			const parsedConfig = ini.parse(content);

			const config: CombinoConfig = {};

			// Extract ignore section - handle as a list of values
			if (parsedConfig.ignore) {
				config.ignore = Object.keys(parsedConfig.ignore);
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
			config.merge = parseMergeSections(content);

			// Also support [merge] catch-all section from ini
			if (parsedConfig.merge && typeof parsedConfig.merge === "object") {
				config.merge = { ...config.merge, "*": parsedConfig.merge };
			}

			// Parse [include] section
			config.include = parseIncludeSection(content);

			return config;
		} catch (error) {
			return {};
		}
	}

	private async readConfigFile(
		configPath: string
	): Promise<{ merge?: any; data?: Record<string, any> }> {
		try {
			const content = await fs.readFile(configPath, "utf-8");
			const parsedConfig = ini.parse(content);
			const config: { merge?: any; data?: Record<string, any> } = {};

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
		data: Record<string, any>
	): Promise<string> {
		try {
			return await ejs.render(content, data, { async: true });
		} catch (error) {
			console.error("Error processing template:", error);
			return content;
		}
	}

	private evaluateCondition(
		condition: string,
		data: Record<string, any>
	): string | boolean {
		try {
			// Add logging to see what data we're working with
			console.log("Evaluating condition:", condition);
			console.log("With data:", JSON.stringify(data, null, 2));

			// Remove the [ and ] from the condition
			const cleanCondition = condition.slice(1, -1);

			// Replace operators to be compatible with expr-eval
			const parsedCondition = cleanCondition
				.replace(/&&/g, " and ")
				.replace(/\|\|/g, " or ");

			// Create a parser instance
			const parser = new Parser();

			// Create a scope with the data
			const scope = Object.entries(data).reduce((acc, [key, value]) => {
				// Handle nested properties
				const keys = key.split(".");
				let current = acc;
				for (let i = 0; i < keys.length - 1; i++) {
					current[keys[i]] = current[keys[i]] || {};
					current = current[keys[i]];
				}
				current[keys[keys.length - 1]] = value;
				return acc;
			}, {} as Record<string, any>);

			// Log the scope being used for evaluation
			console.log("Evaluation scope:", JSON.stringify(scope, null, 2));

			// Parse and evaluate the expression
			const expr = parser.parse(parsedCondition);
			const result = expr.evaluate(scope);
			console.log("Condition result:", result);
			return result;
		} catch (error) {
			console.error("Error evaluating condition:", error);
			return false;
		}
	}

	private async getFilesInTemplate(
		templatePath: string,
		ignorePatterns: string[],
		data: Record<string, any>
	): Promise<{ sourcePath: string; targetPath: string }[]> {
		try {
			// Log the data being used for file processing
			console.log(
				"Processing template with data:",
				JSON.stringify(data, null, 2)
			);

			const files = await glob("**/*", {
				cwd: templatePath,
				nodir: true,
				ignore: ignorePatterns,
				dot: true,
			});

			console.log("Found files:", files);

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
							console.log("Checking condition for file:", file);
							console.log("Condition:", condition);
							// If any condition in the path is false, exclude the file
							const result = this.evaluateCondition(
								condition,
								data
							);
							if (typeof result === "boolean" && !result) {
								console.log(
									"File excluded due to condition:",
									file
								);
								return false;
							}
						}
					}
				}

				return true;
			});

			console.log("Filtered files:", filteredFiles);

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
									data
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
				console.log("Mapped file:", result);
				return result;
			});

			return mappedFiles;
		} catch (error) {
			throw new Error(`Failed to get files in template: ${error}`);
		}
	}

	private getMergeStrategy(filePath: string, config?: any): MergeStrategy {
		// console.log(
		// 	"Getting merge strategy for",
		// 	filePath,
		// 	"with config:",
		// 	config
		// );
		// Check for merge strategy in the config
		if (config?.merge) {
			// Check each pattern in the merge config
			for (const [pattern, settings] of Object.entries(config.merge)) {
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
									.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
							);
						return `(${options.join("|")})`;
					}
				);
				// Convert * to .* and ensure the pattern matches the entire string
				const regex = new RegExp(
					`^${expandedPattern.replace(/\*/g, ".*")}$`
				);
				// console.log(
				// 	"Checking pattern",
				// 	pattern,
				// 	"against",
				// 	filePath,
				// 	"result:",
				// 	regex.test(filePath)
				// );
				if (regex.test(filePath)) {
					// console.log(
					// 	"Found matching pattern",
					// 	pattern,
					// 	"with settings:",
					// 	settings
					// );
					// If settings has a strategy property, use it directly
					const typedSettings = settings as {
						strategy?: MergeStrategy;
					};
					if (typedSettings.strategy) {
						return typedSettings.strategy;
					}
					// Handle nested structure for file extensions
					const ext = path.extname(filePath).toLowerCase().slice(1); // Remove the dot
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

		// Fall back to default strategies
		const ext = path.extname(filePath).toLowerCase();
		// console.log(
		// 	"No matching pattern found, using default strategy for extension",
		// 	ext
		// );
		switch (ext) {
			case ".json":
				return "deep";
			case ".md":
				return "shallow";
			default:
				return "replace";
		}
	}

	private async mergeFiles(
		targetPath: string,
		sourcePath: string,
		strategy: MergeStrategy,
		data: Record<string, any>
	): Promise<string> {
		const ext = path.extname(targetPath).toLowerCase();

		let mergedContent: string;
		switch (ext) {
			case ".json":
				mergedContent = await mergeJson(
					targetPath,
					sourcePath,
					strategy
				);
				break;
			case ".md":
				mergedContent = await mergeMarkdown(
					targetPath,
					sourcePath,
					strategy
				);
				break;
			default:
				mergedContent = await mergeText(
					targetPath,
					sourcePath,
					strategy
				);
		}

		// Process the merged content with EJS
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
				/at\s+(?:\w+\s+\()?(?:(?:file|http|https):\/\/)?([^:]+)/
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
			templates,
			data: externalData = {},
			config,
		} = options;

		// Get the directory of the calling script
		const callerDir = this.getCallerFileLocation();

		// Resolve paths relative to the caller's directory
		const resolvedOutputDir = path.resolve(callerDir, outputDir);
		const resolvedTemplates = templates.map((template) =>
			path.resolve(callerDir, template)
		);

		// Check if all template directories exist
		for (const template of resolvedTemplates) {
			if (!(await fileExists(template))) {
				console.warn(
					`Warning: Template directory not found: ${template}`
				);
			}
		}

		// Create target directory if it doesn't exist
		await fs.mkdir(resolvedOutputDir, { recursive: true });

		// First, collect ignore patterns and data from all templates
		const allIgnorePatterns = new Set<string>([
			"node_modules/**",
			".combino",
		]);
		const allData: Record<string, any> = { ...externalData }; // Start with external data
		const templateConfigs: CombinoConfig[] = []; // Store all template configs
		const allTemplates: string[] = []; // Store all templates including included ones

		// Load config if specified
		if (typeof config === "string" && (await fileExists(config))) {
			const configPath = path.resolve(callerDir, config);
			const loadedConfig = await this.readConfigFile(configPath);
			if (loadedConfig.data) {
				Object.assign(allData, loadedConfig.data);
			}
			if (loadedConfig.merge) {
				options.config = loadedConfig.merge;
			}
		} else if (typeof config === "object" && config !== null) {
			// Handle config object directly
			if (config.data) {
				Object.assign(allData, config.data);
			}
		}

		// First pass: collect all template configs and included templates
		for (const template of resolvedTemplates) {
			const config = await this.readCombinoConfig(template);
			templateConfigs.push(config);
			if (config.ignore) {
				config.ignore.forEach((pattern) =>
					allIgnorePatterns.add(pattern)
				);
			}
			if (config.data) {
				Object.assign(allData, config.data);
			}

			// Process included templates
			if (config.include) {
				for (const includePath of config.include) {
					const resolvedIncludePath = path.resolve(
						template,
						includePath
					);
					if (await fileExists(resolvedIncludePath)) {
						const includeConfig = await this.readCombinoConfig(
							resolvedIncludePath
						);
						templateConfigs.push(includeConfig);
						if (includeConfig.ignore) {
							includeConfig.ignore.forEach((pattern) =>
								allIgnorePatterns.add(pattern)
							);
						}
						if (includeConfig.data) {
							Object.assign(allData, includeConfig.data);
						}
						// Add included template to the list
						allTemplates.push(resolvedIncludePath);
					} else {
						console.warn(
							`Warning: Included template not found: ${resolvedIncludePath}`
						);
					}
				}
			}
		}

		// Add main templates after included ones (so they override included templates)
		allTemplates.push(...resolvedTemplates);

		// Process all templates in order
		for (let i = 0; i < allTemplates.length; i++) {
			const template = allTemplates[i];
			const templateConfig = templateConfigs[i];
			const files = await this.getFilesInTemplate(
				template,
				Array.from(allIgnorePatterns),
				allData
			);

			for (const { sourcePath, targetPath } of files) {
				const fullTargetPath = path.join(resolvedOutputDir, targetPath);

				// Create target directory if it doesn't exist
				await fs.mkdir(path.dirname(fullTargetPath), {
					recursive: true,
				});

				// Read source file
				const sourceContent = await this.readFile(sourcePath);
				// Merge template config with source file config
				const mergedConfig = {
					...templateConfig,
					merge: {
						...templateConfig.merge,
						...sourceContent.config?.merge,
					},
				};

				// Get merge strategy from template config
				const strategy = this.getMergeStrategy(
					targetPath,
					mergedConfig
				);

				try {
					const targetContent = await this.readFile(fullTargetPath);
					// Merge file's front matter data with template data
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
						fileData
					);
					await fs.writeFile(fullTargetPath, mergedContent);
				} catch (error) {
					// If target doesn't exist, just copy and process the source
					// Merge file's front matter data with template data
					const fileData = {
						...allData,
						...(sourceContent.config?.data
							? sourceContent.config.data
							: {}),
					};
					const processedContent = await this.processTemplate(
						sourceContent.content,
						fileData
					);
					await fs.writeFile(fullTargetPath, processedContent);
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
