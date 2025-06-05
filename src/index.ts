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

interface CombinoConfig {
	ignore?: string[];
	data?: Record<string, any>;
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
			const lines = content.split("\n");
			const config: CombinoConfig = {};

			let currentSection: string | null = null;
			for (const line of lines) {
				const trimmedLine = line.trim();
				if (!trimmedLine) continue;

				if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
					currentSection = trimmedLine.slice(1, -1);
					if (currentSection === "ignore") {
						config.ignore = [];
					} else if (currentSection === "data") {
						config.data = {};
					}
				} else if (currentSection === "ignore" && config.ignore) {
					config.ignore.push(trimmedLine);
				} else if (currentSection === "data" && config.data) {
					const [key, value] = trimmedLine
						.split("=")
						.map((s) => s.trim());
					if (key && value) {
						// Remove quotes from value if present
						const cleanValue = value.replace(/^["']|["']$/g, "");
						// Handle nested properties (e.g., "project.name")
						const keys = key.split(".");
						let current = config.data;
						for (let i = 0; i < keys.length - 1; i++) {
							current[keys[i]] = current[keys[i]] || {};
							current = current[keys[i]];
						}
						current[keys[keys.length - 1]] = cleanValue;
					}
				}
			}

			return config;
		} catch (error) {
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
	): boolean {
		try {
			// Remove the [ and ] from the condition
			const cleanCondition = condition.slice(1, -1);

			// Replace operators to be compatible with expr-eval
			const parsedCondition = cleanCondition
				.replace(/&&/g, " and ")
				.replace(/\|\|/g, " or ");

			// console.log("Evaluating condition:", parsedCondition);
			// console.log("With data:", data);

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
			// console.log("Template path:", templatePath);
			// console.log("Ignore patterns:", ignorePatterns);

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

				// Check each directory in the path for conditions
				const parts = file.split(path.sep);
				for (const part of parts) {
					if (part.includes("[") && part.includes("]")) {
						// Extract the condition from the part
						const conditionMatch = part.match(/\[[^\]]+\]/);
						if (conditionMatch) {
							const condition = conditionMatch[0];
							// If any condition in the path is false, exclude the file
							if (!this.evaluateCondition(condition, data)) {
								return false;
							}
						}
					}
				}

				return true;
			});

			// Debug: print filtered files
			// console.log("Filtered files:", filteredFiles);

			// Transform the file paths to handle conditional folders
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
								// Otherwise, remove the condition from the part
								return part.replace(condition, "");
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

			// Debug: print mapped files
			// console.log("Mapped files:", mappedFiles);

			return mappedFiles;
		} catch (error) {
			throw new Error(`Failed to get files in template: ${error}`);
		}
	}

	private getMergeStrategy(filePath: string, config?: any): MergeStrategy {
		if (config?.merge?.strategy) {
			return config.merge.strategy;
		}

		const ext = path.extname(filePath).toLowerCase();
		switch (ext) {
			case ".json":
				return "deep";
			case ".md":
				return "replace";
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

	async combine(options: TemplateOptions): Promise<void> {
		const { targetDir, templates, data: externalData = {} } = options;

		// Create target directory if it doesn't exist
		await fs.mkdir(targetDir, { recursive: true });

		// First, collect ignore patterns and data from all templates
		const allIgnorePatterns = new Set<string>([
			"node_modules/**",
			".combino",
		]);
		const allData: Record<string, any> = { ...externalData }; // Start with external data

		for (const template of templates) {
			const config = await this.readCombinoConfig(template);
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
			const fullTargetPath = path.join(targetDir, targetPath);
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
			const files = await this.getFilesInTemplate(
				template,
				Array.from(allIgnorePatterns),
				allData
			);

			for (const { sourcePath, targetPath } of files) {
				const fullTargetPath = path.join(targetDir, targetPath);

				// Create target directory if it doesn't exist
				await fs.mkdir(path.dirname(fullTargetPath), {
					recursive: true,
				});

				// Read source file
				const sourceContent = await this.readFile(sourcePath);
				const strategy = this.getMergeStrategy(
					targetPath,
					sourceContent.config
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
