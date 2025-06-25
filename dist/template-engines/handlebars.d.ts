import { TemplateEngine } from "./index.js";
export declare class HandlebarsTemplateEngine implements TemplateEngine {
    private handlebars;
    constructor();
    private initialize;
    render(content: string, data: Record<string, any>): Promise<string>;
    hasTemplateSyntax(content: string): boolean;
}
export default HandlebarsTemplateEngine;
