import Handlebars from "handlebars";
export class HandlebarsTemplateEngine {
    async render(content, data) {
        try {
            const template = Handlebars.compile(content);
            return template(data);
        }
        catch (error) {
            console.error("Error processing Handlebars template:", error);
            return content;
        }
    }
    hasTemplateSyntax(content) {
        return content.includes("{{") || content.includes("{{{");
    }
}
// Default export for convenience
export default HandlebarsTemplateEngine;
