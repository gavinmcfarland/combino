import { Plugin } from './plugins/types.js';

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

export interface CombinoConfig {
	/** Template composition - specify additional templates to include */
	include?: IncludeConfig[];
	/** Files or folders to exclude from processing */
	exclude?: string[];
	/** Data to pass to templates for conditional logic and templating */
	data?: Record<string, any>;
	/** Merge strategy configuration for different file patterns */
	merge?: Record<string, Record<string, any>>;
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

export type FileHook = (context: FileHookContext) => Promise<FileHookResult> | FileHookResult;

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
	config?: TemplateConfig;
}

export interface ProcessedFile {
	sourcePath: string;
	targetPath: string;
	content: string;
	mergeStrategy?: MergeStrategy;
}
