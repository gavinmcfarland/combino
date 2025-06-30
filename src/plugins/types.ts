export interface PluginOptions {
	/** File patterns this plugin should handle (e.g., ["*.ejs", "*.hbs"]) */
	patterns?: string[];
	/** Priority - higher numbers take precedence */
	priority?: number;
	/** Additional options specific to the plugin */
	[key: string]: any;
}

export interface Plugin {
	/** The template engine instance */
	engine: any;
	/** Plugin configuration options */
	options: PluginOptions;
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
		const plugin = this.findPlugin(filePath, content);

		if (!plugin) {
			return content;
		}

		try {
			return await plugin.engine.render(content, data);
		} catch (error) {
			console.error(`Error rendering template with plugin:`, error);
			return content;
		}
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
