import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import deepmerge from "deepmerge";
import { TemplateOptions, FileContent, MergeStrategy } from "./types";
import { mergeJson } from "./mergers/json";
import { mergeMarkdown } from "./mergers/markdown";
import { mergeText } from "./mergers/text";

export class Combino {
	private async readFile(filePath: string): Promise<FileContent> {
		const content = await fs.readFile(filePath, "utf-8");
		const { data, content: fileContent } = matter(content);
		return {
			content: fileContent,
			config: data as any,
		};
	}

	private async getFilesInTemplate(templatePath: string): Promise<string[]> {
		try {
			return await glob("**/*", {
				cwd: templatePath,
				nodir: true,
				ignore: ["node_modules/**"],
			});
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
		strategy: MergeStrategy
	): Promise<string> {
		const ext = path.extname(targetPath).toLowerCase();

		switch (ext) {
			case ".json":
				return mergeJson(targetPath, sourcePath, strategy);
			case ".md":
				return mergeMarkdown(targetPath, sourcePath, strategy);
			default:
				return mergeText(targetPath, sourcePath, strategy);
		}
	}

	async combine(options: TemplateOptions): Promise<void> {
		const { targetDir, templates } = options;

		// Create target directory if it doesn't exist
		await fs.mkdir(targetDir, { recursive: true });

		// Collect all files from all templates
		const templateFiles: string[][] = [];
		for (const template of templates) {
			const files = await this.getFilesInTemplate(template);
			templateFiles.push(files);
		}

		// Map: file path -> last template index that provides it
		const lastProvider: Record<string, number> = {};
		for (let i = 0; i < templates.length; i++) {
			for (const file of templateFiles[i]) {
				lastProvider[file] = i;
			}
		}

		// Process each template in order
		for (let i = 0; i < templates.length; i++) {
			const template = templates[i];
			console.log(`[Combino] Processing template: ${template}`);
			const files = templateFiles[i];

			for (const file of files) {
				const sourcePath = path.join(template, file);
				const targetPath = path.join(targetDir, file);

				// Create target directory if it doesn't exist
				await fs.mkdir(path.dirname(targetPath), { recursive: true });

				// Read source file
				const sourceContent = await this.readFile(sourcePath);
				const strategy = this.getMergeStrategy(
					file,
					sourceContent.config
				);

				// For 'replace', only process if this is the last template that provides this file
				if (strategy === "replace" && lastProvider[file] !== i) {
					continue;
				}

				try {
					const targetContent = await this.readFile(targetPath);
					console.log(
						`[Combino] Merging file: ${file} (strategy: ${strategy})`
					);
					const mergedContent = await this.mergeFiles(
						targetPath,
						sourcePath,
						strategy
					);
					await fs.writeFile(targetPath, mergedContent);
					console.log(`[Combino] Wrote merged file: ${targetPath}`);
				} catch (error) {
					// For Markdown files with 'replace', always use merge logic
					const ext = path.extname(file).toLowerCase();
					if (ext === ".md" && strategy === "replace") {
						const mergedContent = await this.mergeFiles(
							targetPath,
							sourcePath,
							strategy
						);
						await fs.writeFile(targetPath, mergedContent);
						console.log(
							`[Combino] Wrote merged file: ${targetPath}`
						);
					} else {
						console.log(
							`[Combino] Copying file: ${file} (reason: ${
								error instanceof Error ? error.message : error
							})`
						);
						await fs.copyFile(sourcePath, targetPath);
						console.log(`[Combino] Copied file to: ${targetPath}`);
					}
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
