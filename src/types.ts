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

export interface TemplateOptions {
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

export type FileHook = (context: FileHookContext) => Promise<FileHookResult> | FileHookResult;
export type DiscoverHook = (context: DiscoverContext) => Promise<DiscoverResult> | DiscoverResult;

export interface Plugin {
	/** File patterns this plugin should handle (e.g., ["*.ejs", "*.hbs"]) */
	filePattern?: string[];
	/** Discover hook for processing files before template resolution */
	discover?: DiscoverHook;
	/** Compile hook for full file processing with template context */
	compile?: FileHook;
	/** Assemble hook for processing files after merging but before formatting */
	assemble?: FileHook;
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
		const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'));
		return regex.test(filePath);
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
		// Collect all plugins that should compile this file
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.compile) return false;

			// If plugin has specific file patterns, only include if it matches
			if (plugin.filePattern && plugin.filePattern.length > 0) {
				return plugin.filePattern.some((pattern) => this.matchesPattern(context.id, pattern));
			}

			// If plugin has no patterns, include it for all files
			return true;
		});

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
		// Collect all plugins that should process this file during assembly
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.assemble) return false;

			// If plugin has specific file patterns, only include if it matches
			if (plugin.filePattern && plugin.filePattern.length > 0) {
				return plugin.filePattern.some((pattern) => this.matchesPattern(context.id, pattern));
			}

			// If plugin has no patterns, include it for all files
			return true;
		});

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

	async discover(context: DiscoverContext): Promise<DiscoverResult> {
		// Collect all plugins that should discover/preprocess files
		const matchingPlugins = this.plugins.filter((plugin) => {
			if (!plugin.discover) return false;

			// If plugin has specific file patterns, only include if it matches
			if (plugin.filePattern && plugin.filePattern.length > 0) {
				return plugin.filePattern.some((pattern) => this.matchesPattern(context.sourcePath, pattern));
			}

			// If plugin has no patterns, include it for all files
			return true;
		});

		let result: DiscoverResult = {
			content: context.content,
		};
		let currentContext = {
			...context,
		};

		for (const plugin of matchingPlugins) {
			try {
				const hookResult = await Promise.resolve(plugin.discover!(currentContext));
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
