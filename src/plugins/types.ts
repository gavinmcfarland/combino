export interface PluginOptions {
	/** Additional options specific to the plugin */
	[key: string]: any;
}

export interface TemplateInfo {
	/** The template path */
	path: string;
	/** The target directory (if specified) */
	targetDir?: string;
	/** All files in this template */
	files: Array<{
		sourcePath: string;
		targetPath: string;
		content?: string;
	}>;
}

export interface FileHookContext {
	/** The source file path from the template */
	sourcePath: string;
	/** The target file path where the file will be written */
	targetPath: string;
	/** The file content after template processing but before formatting */
	content: string;
	/** The data used for template processing */
	data: Record<string, any>;
	/** Information about all templates being processed (for layout detection) */
	allTemplates?: TemplateInfo[];
}

export interface FileHookResult {
	/** The transformed file content */
	content: string;
	/** The new target file path (optional - if not provided, original path is used) */
	targetPath?: string;
}

export type FileHook = (
	context: FileHookContext,
) => Promise<FileHookResult> | FileHookResult;

export interface Plugin {
	/** File patterns this plugin should handle (e.g., ["*.ejs", "*.hbs"]) */
	filePattern?: string[];
	/** Transform hook for file processing during template phase (with full template context) */
	transform?: FileHook;
	/** Process hook for file building phase (without template context, just file content) */
	process?: FileHook;
}

/**
 * Unified Plugin Manager that can handle multiple template engines
 * This is used internally by Combino to manage multiple plugins
 */
export class PluginManager {
	private plugins: Plugin[] = [];
	private defaultPlugin: Plugin | null = null;

	constructor(plugins?: Plugin[]) {
		if (plugins) {
			this.addPlugins(plugins);
		}
	}

	addPlugins(plugins: Plugin[]): void {
		for (const plugin of plugins) {
			this.addPlugin(plugin);
		}
	}

	addPlugin(plugin: Plugin): void {
		this.plugins.push(plugin);
	}

	setDefaultPlugin(plugin: Plugin): void {
		this.defaultPlugin = plugin;
	}

	findPlugin(filePath?: string, content?: string): Plugin | null {
		// Pattern matching
		if (filePath) {
			for (const plugin of this.plugins) {
				if (plugin.filePattern) {
					for (const pattern of plugin.filePattern) {
						if (this.matchesPattern(filePath, pattern)) {
							return plugin;
						}
					}
				}
			}
		}

		return this.defaultPlugin;
	}

	private matchesPattern(filePath: string, pattern: string): boolean {
		const regex = new RegExp(
			pattern
				.replace(/\./g, "\\.")
				.replace(/\*/g, ".*")
				.replace(/\?/g, "."),
		);
		return regex.test(filePath);
	}

	async render(
		content: string,
		data: Record<string, any>,
		filePath?: string,
	): Promise<string> {
		const context: FileHookContext = {
			sourcePath: filePath || "",
			targetPath: filePath || "",
			content,
			data,
		};

		const result = await this.process(context);
		return result.content;
	}

	async transform(context: FileHookContext): Promise<FileHookResult> {
		// Collect all plugins that should process this file during template phase
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.transform) return false;

			// If plugin has specific file patterns, only include if it matches
			if (plugin.filePattern && plugin.filePattern.length > 0) {
				return plugin.filePattern.some((pattern) =>
					this.matchesPattern(context.targetPath, pattern),
				);
			}

			// If plugin has no patterns, include it for all files
			return true;
		});

		let result: FileHookResult = {
			content: context.content,
			targetPath: context.targetPath,
		};
		let currentContext = {
			...context,
			targetPath: context.targetPath ?? "",
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(
					plugin.transform!(currentContext),
				);
				result = {
					content: hookResult.content,
					targetPath:
						typeof hookResult.targetPath === "string"
							? hookResult.targetPath
							: (currentContext.targetPath ?? ""),
				};
				currentContext = {
					...currentContext,
					content: result.content,
					targetPath: result.targetPath ?? "",
				};
			} catch (error) {
				console.error(`Error transforming with plugin:`, error);
				// Continue with the previous result on error
			}
		}

		return result;
	}

	async process(context: FileHookContext): Promise<FileHookResult> {
		// Collect all plugins that should process this file during file building phase
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.process) return false;

			// If plugin has specific file patterns, only include if it matches
			if (plugin.filePattern && plugin.filePattern.length > 0) {
				return plugin.filePattern.some((pattern) =>
					this.matchesPattern(context.targetPath, pattern),
				);
			}

			// If plugin has no patterns, include it for all files
			return true;
		});

		let result: FileHookResult = {
			content: context.content,
			targetPath: context.targetPath,
		};
		let currentContext = {
			...context,
			targetPath: context.targetPath ?? "",
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(
					plugin.process!(currentContext),
				);
				result = {
					content: hookResult.content,
					targetPath:
						typeof hookResult.targetPath === "string"
							? hookResult.targetPath
							: (currentContext.targetPath ?? ""),
				};
				currentContext = {
					...currentContext,
					content: result.content,
					targetPath: result.targetPath ?? "",
				};
			} catch (error) {
				console.error(`Error processing with plugin:`, error);
				// Continue with the previous result on error
			}
		}

		return result;
	}

	async transformWithTemplates(
		context: FileHookContext,
		allTemplates: TemplateInfo[],
	): Promise<FileHookResult> {
		// Add template information to the context
		const contextWithTemplates: FileHookContext = {
			...context,
			allTemplates,
		};

		return this.transform(contextWithTemplates);
	}

	getPlugins(): Plugin[] {
		return [...this.plugins];
	}

	getDefaultPlugin(): Plugin | null {
		return this.defaultPlugin;
	}
}
