import { TemplateEngine } from "./index.js";
export declare class MustacheTemplateEngine implements TemplateEngine {
    private mustache;
    constructor();
    private initialize;
    render(content: string, data: Record<string, any>): Promise<string>;
    hasTemplateSyntax(content: string): boolean;
}
export default MustacheTemplateEngine;
