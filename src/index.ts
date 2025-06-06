import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import deepmerge from "deepmerge";
import ejs from "ejs";
import { Parser } from "expr-eval";
import { TemplateOptions, FileContent, MergeStrategy } from "./types";
import { mergeJson } from "./mergers/json";
import { mergeMarkdown } from "./mergers/markdown";
import { mergeText } from "./mergers/text";
import * as ini from "ini";

interface CombinoConfig {
	ignore?: string[];
	data?: Record<string, any>;
	merge?: Record<string, Record<string, any>>;
}

export class Combino {
	private async readFile(filePath: string): Promise<FileContent> {
		const content = await fs.readFile(filePath, "utf-8");
		const { data, content: fileContent } = matter(content);
		return {
			content: fileContent,
			config: data as any,
		};
	}

	private async readCombinoConfig(
		templatePath: string
	): Promise<CombinoConfig> {
		const configPath = path.join(templatePath, ".combino");
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
					current[keys[keys.length - 1]] = value;
				});
			}

			// Extract merge config - handle sections with wildcards
			config.merge = {};
			Object.entries(parsedConfig).forEach(([section, settings]) => {
				if (section.startsWith("merge:")) {
					const pattern = section.slice(6); // Remove "merge:"
					if (typeof settings === "object" && settings !== null) {
						config.merge![pattern] = settings;
					}
				}
			});

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

			// Extract merge config
			if (parsedConfig.merge) {
				config.merge = parsedConfig.merge;
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

			// Parse and evaluate the expression
			const expr = parser.parse(parsedCondition);
			return expr.evaluate(scope);
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
			const files = await glob("**/*", {
				cwd: templatePath,
				nodir: true,
				ignore: ignorePatterns,
				dot: true,
			});

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
							// If any condition in the path is false, exclude the file
							const result = this.evaluateCondition(
								condition,
								data
							);
							if (typeof result === "boolean" && !result) {
								return false;
							}
						}
					}
				}

				return true;
			});

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

				return {
					sourcePath: path.join(templatePath, file),
					targetPath: path.join(...transformedParts),
				};
			});

			return mappedFiles;
		} catch (error) {
			throw new Error(`Failed to get files in template: ${error}`);
		}
	}

	private getMergeStrategy(filePath: string, config?: any): MergeStrategy {
		console.log(
			"Getting merge strategy for",
			filePath,
			"with config:",
			config
		);
		// Check for merge strategy in the config
		if (config?.merge) {
			// Check each pattern in the merge config
			for (const [pattern, settings] of Object.entries(config.merge)) {
				// Convert glob pattern to regex
				const regex = new RegExp(pattern.replace(/\*/g, ".*"));
				console.log(
					"Checking pattern",
					pattern,
					"against",
					filePath,
					"result:",
					regex.test(filePath)
				);
				if (regex.test(filePath)) {
					console.log(
						"Found matching pattern",
						pattern,
						"with settings:",
						settings
					);
					// Handle nested structure for file extensions
					const ext = path.extname(filePath).toLowerCase().slice(1); // Remove the dot
					const typedSettings = settings as Record<
						string,
						{ strategy?: MergeStrategy }
					>;
					if (typedSettings[ext]?.strategy) {
						return typedSettings[ext].strategy;
					}
					// If no extension-specific strategy, use the pattern's strategy
					return (typedSettings as any).strategy;
				}
			}
		}

		// Fall back to default strategies
		const ext = path.extname(filePath).toLowerCase();
		console.log(
			"No matching pattern found, using default strategy for extension",
			ext
		);
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

		console.log("mergedContent", targetPath, sourcePath, strategy);

		// Process the merged content with EJS
		return this.processTemplate(mergedContent, data);
	}

	async combine(options: TemplateOptions): Promise<void> {
		const {
			outputDir,
			templates,
			data: externalData = {},
			config,
		} = options;

		console.log("Starting combine with options:", {
			outputDir,
			templates,
			externalData,
			config,
		});

		// Create target directory if it doesn't exist
		await fs.mkdir(outputDir, { recursive: true });

		// First, collect ignore patterns and data from all templates
		const allIgnorePatterns = new Set<string>([
			"node_modules/**",
			".combino",
		]);
		const allData: Record<string, any> = { ...externalData }; // Start with external data
		const templateConfigs: CombinoConfig[] = []; // Store all template configs

		// Load config if specified
		if (typeof config === "string" && (await fileExists(config))) {
			const configPath = path.resolve(config);
			const loadedConfig = await this.readConfigFile(configPath);
			console.log("Loaded config from file:", loadedConfig);
			if (loadedConfig.data) {
				Object.assign(allData, loadedConfig.data);
			}
			if (loadedConfig.merge) {
				options.config = loadedConfig.merge;
			}
		}

		// Collect all template configs first
		for (const template of templates) {
			const config = await this.readCombinoConfig(template);
			console.log("Loaded template config for", template, ":", config);
			templateConfigs.push(config);
			if (config.ignore) {
				config.ignore.forEach((pattern) =>
					allIgnorePatterns.add(pattern)
				);
			}
			if (config.data) {
				Object.assign(allData, config.data); // Merge config data, allowing external data to override
			}
		}

		// First, copy all files from the first template
		const firstTemplate = templates[0];
		const firstTemplateFiles = await this.getFilesInTemplate(
			firstTemplate,
			Array.from(allIgnorePatterns),
			allData
		);

		for (const { sourcePath, targetPath } of firstTemplateFiles) {
			const fullTargetPath = path.join(outputDir, targetPath);
			await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });

			// Read and process the source file with EJS
			const content = await fs.readFile(sourcePath, "utf-8");
			const processedContent = await this.processTemplate(
				content,
				allData
			);
			await fs.writeFile(fullTargetPath, processedContent);
		}

		// Then merge files from subsequent templates
		for (let i = 1; i < templates.length; i++) {
			const template = templates[i];
			const templateConfig = templateConfigs[i];
			console.log(
				"Processing template",
				template,
				"with config:",
				templateConfig
			);
			const files = await this.getFilesInTemplate(
				template,
				Array.from(allIgnorePatterns),
				allData
			);

			for (const { sourcePath, targetPath } of files) {
				const fullTargetPath = path.join(outputDir, targetPath);

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
				console.log("Merged config for", targetPath, ":", mergedConfig);

				// Get merge strategy from template config
				const strategy = this.getMergeStrategy(
					targetPath,
					mergedConfig
				);

				try {
					const targetContent = await this.readFile(fullTargetPath);
					const mergedContent = await this.mergeFiles(
						fullTargetPath,
						sourcePath,
						strategy,
						allData
					);
					await fs.writeFile(fullTargetPath, mergedContent);
				} catch (error) {
					// If target doesn't exist, just copy and process the source
					const content = await fs.readFile(sourcePath, "utf-8");
					const processedContent = await this.processTemplate(
						content,
						allData
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
