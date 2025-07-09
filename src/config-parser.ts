import { promises as fs } from 'fs';
import { join } from 'path';
import { CombinoConfig, PluginManager } from './types.js';

export class ConfigParser {
	async parseConfigFile(
		configPath: string,
		pluginManager?: PluginManager,
		data?: Record<string, any>,
		configFileName?: string,
	): Promise<CombinoConfig> {
		let content = await fs.readFile(configPath, 'utf-8');

		// If plugin manager and data are provided, discover/preprocess the config file
		if (pluginManager && data) {
			const discoverContext = {
				sourcePath: configPath,
				content,
				data,
				configFileName,
			};

			const result = await pluginManager.discover(discoverContext);
			content = result.content;
		}

		return JSON.parse(content);
	}

	/**
	 * Extract data from YAML front matter in file content
	 */
	extractFrontMatter(content: string): Record<string, any> | null {
		const lines = content.split('\n');
		if (lines[0]?.trim() !== '---') {
			return null; // No front matter
		}

		const frontMatterLines: string[] = [];
		let endIndex = -1;

		// Find the end of front matter
		for (let i = 1; i < lines.length; i++) {
			if (lines[i]?.trim() === '---') {
				endIndex = i;
				break;
			}
			frontMatterLines.push(lines[i]);
		}

		if (endIndex === -1) {
			return null; // No closing front matter delimiter
		}

		try {
			// Simple YAML parsing for basic data structures
			const yamlContent = frontMatterLines.join('\n');
			const data = this.parseSimpleYaml(yamlContent);
			return data.data || data; // Return the data section if it exists, otherwise the whole object
		} catch (error) {
			console.warn('Failed to parse front matter YAML:', error);
			return null;
		}
	}

	/**
	 * Simple YAML parser for basic data structures
	 * This handles the most common cases without requiring a full YAML library
	 */
	private parseSimpleYaml(yamlContent: string): Record<string, any> {
		const result: Record<string, any> = {};
		const lines = yamlContent.split('\n');
		const stack: Array<{ obj: any; indent: number }> = [{ obj: result, indent: -1 }];

		for (const line of lines) {
			if (!line.trim() || line.trim().startsWith('#')) {
				continue; // Skip empty lines and comments
			}

			const indent = line.length - line.trimStart().length;
			const trimmed = line.trim();

			// Pop stack until we find the right parent level
			while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
				stack.pop();
			}

			const currentObj = stack[stack.length - 1].obj;

			// Handle array items
			if (trimmed.startsWith('- ')) {
				const value = trimmed.substring(2).trim();
				if (!Array.isArray(currentObj)) {
					// This shouldn't happen in well-formed YAML, but handle it gracefully
					continue;
				}
				currentObj.push(value);
				continue;
			}

			// Handle key-value pairs
			const colonIndex = trimmed.indexOf(':');
			if (colonIndex > 0) {
				const key = trimmed.substring(0, colonIndex).trim();
				const value = trimmed.substring(colonIndex + 1).trim();

				if (value === '') {
					// This is either an object or array start
					// Look ahead to see if the next non-empty line is an array item
					let nextLineIndex = lines.findIndex((l, i) => i > lines.indexOf(line) && l.trim());
					let isArray = false;
					if (nextLineIndex !== -1) {
						const nextLine = lines[nextLineIndex];
						const nextIndent = nextLine.length - nextLine.trimStart().length;
						isArray = nextIndent > indent && nextLine.trim().startsWith('- ');
					}

					if (isArray) {
						currentObj[key] = [];
						stack.push({ obj: currentObj[key], indent });
					} else {
						currentObj[key] = {};
						stack.push({ obj: currentObj[key], indent });
					}
				} else {
					// Simple value
					currentObj[key] = value;
				}
			}
		}

		return result;
	}

	/**
	 * Expand dot notation keys into nested objects
	 * e.g., { "project.name": "Plugma" } becomes { project: { name: "Plugma" } }
	 */
	expandDotNotation(data: Record<string, any>): Record<string, any> {
		const result: Record<string, any> = {};

		for (const [key, value] of Object.entries(data)) {
			if (key.includes('.')) {
				// Handle dot notation
				const keys = key.split('.');
				let current = result;
				for (let i = 0; i < keys.length - 1; i++) {
					const currentKey = keys[i];
					if (!current[currentKey] || typeof current[currentKey] !== 'object') {
						current[currentKey] = {};
					}
					current = current[currentKey];
				}
				current[keys[keys.length - 1]] = value;
			} else {
				// Regular key
				result[key] = value;
			}
		}

		return result;
	}
}
