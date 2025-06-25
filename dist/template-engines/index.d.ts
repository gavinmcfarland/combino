export interface TemplateEngine {
    /**
     * Renders a template string with the provided data
     * @param content The template content to render
     * @param data The data to use for rendering
     * @returns Promise<string> The rendered content
     */
    render(content: string, data: Record<string, any>): Promise<string>;
    /**
     * Checks if the content contains template syntax that needs processing
     * @param content The content to check
     * @returns boolean True if the content contains template syntax
     */
    hasTemplateSyntax(content: string): boolean;
}
/**
 * Check if a template engine dependency is available
 * @param engine The engine name to check
 * @returns Promise<boolean> True if the engine is available
 */
export declare function isTemplateEngineAvailable(engine: string): Promise<boolean>;
/**
 * Get installation instructions for a template engine
 * @param engine The engine name
 * @returns string Installation instructions
 */
export declare function getTemplateEngineInstallInstructions(engine: string): string;
export * from "./ejs.js";
export * from "./handlebars.js";
export * from "./mustache.js";
