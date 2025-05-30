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
}

export interface TemplateConfig {
	merge?: MergeConfig;
}

export interface FileContent {
	content: string;
	config?: TemplateConfig;
}

export interface TemplateOptions {
	targetDir: string;
	templates: string[];
	config?: MergeConfig;
	data?: Record<string, any>;
}
