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
export * from "./ejs.js";
export * from "./handlebars.js";
export * from "./mustache.js";
