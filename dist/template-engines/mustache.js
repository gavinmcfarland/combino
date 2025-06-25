import Mustache from "mustache";
export class MustacheTemplateEngine {
    async render(content, data) {
        try {
            return Mustache.render(content, data);
        }
        catch (error) {
            console.error("Error processing Mustache template:", error);
            return content;
        }
    }
    hasTemplateSyntax(content) {
        return content.includes("{{") || content.includes("{{{");
    }
}
// Default export for convenience
export default MustacheTemplateEngine;
