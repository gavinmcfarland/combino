export type MergeStrategy = 'deep' | 'shallow' | 'append' | 'prepend' | 'replace';

export interface MergeConfig {
	strategy?: MergeStrategy;
	exclude?: string[];
	include?: string[];
	data?: Record<string, any>;
}

export interface IncludeConfig {
	source: string;
	target?: string;
	physicalSource?: string; // Physical path on disk (with [expr] segments included if truthy)
}

// Support both string and object formats for include configuration
export type IncludeItem = string | IncludeConfig;

export interface CombinoConfig {
	/** Template composition - specify additional templates to include */
	include?: IncludeItem[];
	/** Files or folders to exclude from processing */
	exclude?: string[];
	/** Data to pass to templates for conditional logic and templating */
	data?: Record<string, any>;
	/** Merge strategy configuration for different file patterns */
	merge?: Record<string, Record<string, any>>;
	/** Layout directories configuration for template engines like EJS-Mate */
	layout?: string[];
	/** Internal: Set of resolved logical paths to exclude (used for advanced exclusion logic) */
	_resolvedExcludes?: Set<string>;
	/** Internal: Set of resolved logical paths that are explicitly included (used to override underscore exclusion) */
	_resolvedIncludes?: Set<string>;
}

export interface TemplateConfig {
	exclude?: string[];
	data?: Record<string, any>;
	merge?: Record<string, Record<string, any>>;
	extend?: string[];
}

export interface FileContent {
	content: string;
	config?: TemplateConfig;
}

export type ConfigFile = string;

export interface TemplateInfo {
	/** The template path */
	path: string;
	/** The target directory (if specified) */
	targetDir?: string;
	/** The template configuration */
	config?: CombinoConfig;
	/** All files in this template */
	files: Array<{
		sourcePath: string;
		targetPath: string;
		content?: string;
	}>;
}

export interface Options {
	outputDir: string;
	include: string[];
	/** Files or folders to exclude from processing */
	exclude?: string[];
	/** Unified configuration object or path to .combino file */
	config?: CombinoConfig | ConfigFile;
	data?: Record<string, any>;
	/** Plugins to use for processing templates (new plugin architecture) */
	plugins?: Plugin[];
	/** Custom filename for config files in template directories (default: 'combino.json') */
	configFileName?: string;
	/** Enable/disable conditional include paths feature (default: true) */
	enableConditionalIncludePaths?: boolean;
	/** Enable/disable warning messages (default: true) */
	warnings?: boolean;
}

export interface ResolvedTemplate {
	path: string;
	targetDir?: string;
	config?: CombinoConfig;
	files: ResolvedFile[];
}

export interface ResolvedFile {
	sourcePath: string;
	targetPath: string;
	content: string;
	config?: CombinoConfig;
	includeConfig?: CombinoConfig;
}

export interface ProcessedFile {
	sourcePath: string;
	targetPath: string;
	content: string;
	mergeStrategy?: MergeStrategy;
}

// Plugin system types
export interface PluginOptions {
	/** Additional options specific to the plugin */
	[key: string]: any;
}

export interface FileHookContext {
	/** The source file path from the template */
	sourcePath: string;
	/** The target file path where the file will be written */
	id: string;
	/** The file content after template processing but before formatting */
	content: string;
	/** The data used for template processing */
	data: Record<string, any>;
	/** Information about all templates being processed (for layout detection) */
	allTemplates?: TemplateInfo[];
}

export interface DiscoverContext {
	/** The source file path */
	sourcePath: string;
	/** The file content */
	content: string;
	/** The data used for template processing */
	data: Record<string, any>;
	/** The config file name being used (e.g., 'combino.json', 'template.json') */
	configFileName?: string;
}

export interface FileHookResult {
	/** The transformed file content */
	content: string;
	/** The new target file path (optional - if not provided, original path is used) */
	id?: string;
}

export interface DiscoverResult {
	/** The transformed file content */
	content: string;
}

export type FileHook = (context: FileHookContext) => Promise<FileHookResult | void> | FileHookResult | void;
export type DiscoverHook = (context: DiscoverContext) => Promise<DiscoverResult | void> | DiscoverResult | void;
export type OutputHook = (context: FileHookContext) => Promise<void> | void;

export interface Plugin {
	/** Discover hook for processing files before template resolution */
	discover?: DiscoverHook;
	/** Compile hook for full file processing with template context */
	compile?: FileHook;
	/** Assemble hook for processing files after merging but before formatting */
	assemble?: FileHook;
	/** Output hook for processing files after they have been written to disk */
	output?: OutputHook;
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
		// Return the first plugin that has a compile hook
		// Plugins should handle their own file filtering internally
		for (const plugin of this.plugins) {
			if (plugin.compile) {
				return plugin;
			}
		}

		return this.defaultPlugin;
	}

	async render(content: string, data: Record<string, any>, filePath?: string): Promise<string> {
		const context: FileHookContext = {
			sourcePath: filePath || '',
			id: filePath || '',
			content,
			data,
		};

		const result = await this.compile(context);
		return result.content;
	}

	async compile(context: FileHookContext): Promise<FileHookResult> {
		// Collect all plugins that have compile hooks
		// Plugins should handle their own file filtering internally
		const matchingPlugins = this.plugins.filter((plugin) => plugin.compile);

		let result: FileHookResult = {
			content: context.content,
			id: context.id,
		};
		let currentContext = {
			...context,
			id: context.id ?? '',
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(plugin.compile!(currentContext));
				// If hook returns void, skip this plugin
				if (!hookResult) continue;

				result = {
					content: hookResult.content,
					id: typeof hookResult.id === 'string' ? hookResult.id : (currentContext.id ?? ''),
				};
				currentContext = {
					...currentContext,
					content: result.content,
					id: result.id ?? '',
				};
			} catch (error) {
				console.error(`Error compiling with plugin:`, error);
				// Continue with the previous result on error
			}
		}

		return result;
	}

	async compileWithTemplates(context: FileHookContext, allTemplates: TemplateInfo[]): Promise<FileHookResult> {
		// Add template information to the context
		const contextWithTemplates: FileHookContext = {
			...context,
			allTemplates,
		};

		return this.compile(contextWithTemplates);
	}

	async assemble(context: FileHookContext): Promise<FileHookResult> {
		// Collect all plugins that have assemble hooks
		// Plugins should handle their own file filtering internally
		const matchingPlugins = this.plugins.filter((plugin) => plugin.assemble);

		let result: FileHookResult = {
			content: context.content,
			id: context.id,
		};
		let currentContext = {
			...context,
			id: context.id ?? '',
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(plugin.assemble!(currentContext));
				// If hook returns void, skip this plugin
				if (!hookResult) continue;

				result = {
					content: hookResult.content,
					id: typeof hookResult.id === 'string' ? hookResult.id : (currentContext.id ?? ''),
				};
				currentContext = {
					...currentContext,
					content: result.content,
					id: result.id ?? '',
				};
			} catch (error) {
				console.error(`Error in assembly processing with plugin:`, error);
				// Continue with the previous result on error
			}
		}

		return result;
	}

	async output(context: FileHookContext): Promise<void> {
		// Collect all plugins that have output hooks
		// Plugins should handle their own file filtering internally
		const matchingPlugins = this.plugins.filter((plugin) => plugin.output);

		for (const plugin of matchingPlugins) {
			try {
				await Promise.resolve(plugin.output!(context));
			} catch (error) {
				console.error(`Error in output processing with plugin:`, error);
				// Continue with other plugins on error
			}
		}
	}

	async discover(context: DiscoverContext): Promise<DiscoverResult> {
		// Collect all plugins that have discover hooks
		// Plugins should handle their own file filtering internally
		const matchingPlugins = this.plugins.filter((plugin) => plugin.discover);

		let result: DiscoverResult = {
			content: context.content,
		};
		let currentContext = {
			...context,
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(plugin.discover!(currentContext));
				// If hook returns void, skip this plugin
				if (!hookResult) continue;

				result = {
					content: hookResult.content,
				};
				currentContext = {
					...currentContext,
					content: result.content,
				};
			} catch (error) {
				console.error(`Error during discovery with plugin:`, error);
				// Continue with the previous result on error
			}
		}

		return result;
	}

	getPlugins(): Plugin[] {
		return [...this.plugins];
	}

	getDefaultPlugin(): Plugin | null {
		return this.defaultPlugin;
	}
}
