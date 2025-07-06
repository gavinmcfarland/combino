import { promises as fs } from 'fs';
import { extname } from 'path';
import { ProcessedFile } from './types.js';

// Import prettier dynamically to handle potential missing dependency
let prettier: any;
let prettierPluginSvelte: any;

async function loadPrettier() {
	if (!prettier) {
		try {
			prettier = await import('prettier');
			prettierPluginSvelte = await import('prettier-plugin-svelte');
		} catch (error) {
			console.warn('Prettier not available, skipping formatting');
			return null;
		}
	}
	return prettier;
}

export class FileFormatter {
	private prettierLoaded = false;

	async formatFiles(files: ProcessedFile[]): Promise<ProcessedFile[]> {
		// Try to load prettier
		const prettierModule = await loadPrettier();
		if (!prettierModule) {
			// If prettier is not available, return files unchanged
			return files;
		}

		this.prettierLoaded = true;
		const formattedFiles: ProcessedFile[] = [];

		for (const file of files) {
			const formattedContent = await this.formatFileWithPrettier(file.targetPath, file.content);

			formattedFiles.push({
				...file,
				content: formattedContent,
			});
		}

		return formattedFiles;
	}

	private async formatFileWithPrettier(filePath: string, content: string): Promise<string> {
		if (!this.prettierLoaded || !prettier) {
			return content;
		}

		try {
			// Get file extension to determine parser
			const ext = extname(filePath).toLowerCase();

			// Define which file types to format
			const formattableExtensions = [
				'.js',
				'.ts',
				'.jsx',
				'.tsx',
				'.json',
				'.md',
				'.css',
				'.scss',
				'.html',
				'.vue',
				'.svelte',
			];

			if (!formattableExtensions.includes(ext)) {
				return content; // Return original content if not a formattable file type
			}

			// Determine parser based on file extension and content
			let parser: string;
			switch (ext) {
				case '.js':
				case '.jsx':
					parser = 'babel';
					break;
				case '.ts':
				case '.tsx':
					parser = 'typescript';
					break;
				case '.json':
					parser = 'json';
					break;
				case '.md':
					parser = 'markdown';
					break;
				case '.css':
				case '.scss':
					parser = 'css';
					break;
				case '.html':
					parser = 'html';
					break;
				case '.vue':
					parser = 'vue';
					break;
				case '.svelte':
					parser = 'svelte';
					break;
				default:
					parser = 'babel';
			}

			// Try to find a Prettier config file in the project
			let prettierConfig: any = {
				useTabs: true,
				singleQuote: true,
				printWidth: 120,
				overrides: [
					{
						files: '*.md',
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

			const formatted = prettier.format(content, finalConfig);

			// Handle case where prettier.format returns undefined
			if (formatted === undefined || formatted === null) {
				console.warn(`Prettier returned undefined for ${filePath}, returning original content`);
				return content;
			}

			return formatted;
		} catch (error) {
			// If formatting fails, return original content
			console.warn(`Warning: Failed to format ${filePath} with Prettier:`, error);
			return content;
		}
	}
}
