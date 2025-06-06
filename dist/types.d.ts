export type MergeStrategy = "deep" | "shallow" | "append" | "prepend" | "replace";
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
export type ConfigFile = string;
export interface TemplateOptions {
    outputDir: string;
    templates: string[];
    config?: MergeConfig | ConfigFile;
    data?: Record<string, any>;
}
