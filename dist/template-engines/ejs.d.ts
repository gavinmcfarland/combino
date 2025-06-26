import { TemplateEngine } from "./index.js";
export declare class EJSTemplateEngine implements TemplateEngine {
    private ejs;
    constructor();
    private initialize;
    render(content: string, data: Record<string, any>): Promise<string>;
    hasTemplateSyntax(content: string): boolean;
}
export default EJSTemplateEngine;
