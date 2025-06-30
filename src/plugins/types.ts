export interface PluginOptions {
	/** File patterns this plugin should handle (e.g., ["*.ejs", "*.hbs"]) */
	patterns?: string[];
	/** Priority - higher numbers take precedence */
	priority?: number;
	/** Additional options specific to the plugin */
	[key: string]: any;
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
	/** The template engine instance */
	engine: any;
	/** Plugin configuration options */
	options: PluginOptions;
	/** Transform hook for file processing (similar to Vite's transform hook) */
	transform?: FileHook;
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
		this.plugins.sort(
			(a, b) => (b.options.priority || 0) - (a.options.priority || 0),
		);
	}

	setDefaultPlugin(plugin: Plugin): void {
		this.defaultPlugin = plugin;
	}

	findPlugin(filePath?: string, content?: string): Plugin | null {
		// Pattern matching
		if (filePath) {
			for (const plugin of this.plugins) {
				if (plugin.options.patterns) {
					for (const pattern of plugin.options.patterns) {
						if (this.matchesPattern(filePath, pattern)) {
							return plugin;
						}
					}
				}
			}
		}

		// Content detection
		if (content) {
			for (const plugin of this.plugins) {
				if (plugin.engine.hasTemplateSyntax(content)) {
					return plugin;
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
		let selectedPlugin: Plugin | null = null;
		let highestPriority = -1;
		let matchingPlugins: Plugin[] = [];

		// First, collect all plugins that match by pattern
		if (filePath) {
			for (const plugin of this.plugins) {
				if (
					plugin.options.patterns &&
					plugin.options.patterns.length > 0
				) {
					for (const pattern of plugin.options.patterns) {
						if (this.matchesPattern(filePath, pattern)) {
							matchingPlugins.push(plugin);
							const priority = plugin.options.priority || 0;
							if (priority > highestPriority) {
								highestPriority = priority;
								selectedPlugin = plugin;
							}
						}
					}
				}
			}
		}

		// If multiple plugins match by pattern, pick the first whose hasTemplateSyntax returns true
		if (matchingPlugins.length > 1 && content) {
			for (const plugin of matchingPlugins.sort(
				(a, b) => (b.options.priority || 0) - (a.options.priority || 0),
			)) {
				if (plugin.engine.hasTemplateSyntax(content)) {
					selectedPlugin = plugin;
					break;
				}
			}
		}

		// If no plugin matched by pattern, use the first plugin whose hasTemplateSyntax returns true
		if (!selectedPlugin && content) {
			for (const plugin of this.plugins) {
				if (plugin.engine.hasTemplateSyntax(content)) {
					selectedPlugin = plugin;
					break;
				}
			}
		}

		if (!selectedPlugin) {
			selectedPlugin = this.defaultPlugin;
		}

		if (selectedPlugin) {
			try {
				return await selectedPlugin.engine.render(content, data);
			} catch (error) {
				console.error(`Error rendering template with plugin:`, error);
				return content;
			}
		}

		return content;
	}

	async transform(context: FileHookContext): Promise<FileHookResult> {
		// Collect all plugins whose transform hook matches the file (by pattern or by default)
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.transform) return false;
			if (
				!plugin.options.patterns ||
				plugin.options.patterns.length === 0
			)
				return true;
			return plugin.options.patterns.some((pattern) =>
				this.matchesPattern(context.targetPath, pattern),
			);
		});

		// Sort by priority (already sorted in addPlugin, but just in case)
		matchingPlugins.sort(
			(a, b) => (b.options.priority || 0) - (a.options.priority || 0),
		);

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
				console.error(`Error in plugin transform hook:`, error);
				// On error, continue with the previous result
			}
		}

		return result;
	}

	hasTemplateSyntax(content: string, filePath?: string): boolean {
		const plugin = this.findPlugin(filePath, content);
		return plugin ? plugin.engine.hasTemplateSyntax(content) : false;
	}

	getPlugins(): Plugin[] {
		return [...this.plugins];
	}

	getDefaultPlugin(): Plugin | null {
		return this.defaultPlugin;
	}
}
