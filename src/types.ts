import { TemplateEngine } from "./template-engines/index.js";

export type MergeStrategy =
	| "deep"
	| "shallow"
	| "append"
	| "prepend"
	| "replace";

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

export interface TemplateOptions {
	outputDir: string;
	include: string[];
	/** Unified configuration object or path to .combino file */
	config?: CombinoConfig | ConfigFile;
	data?: Record<string, any>;
	/** Template engine to use for processing templates */
	templateEngine?: string | TemplateEngine;
}
