export class HandlebarsTemplateEngine {
    constructor() {
        this.handlebars = null;
        // Initialize will be called lazily when first needed
    }
    async initialize() {
        if (this.handlebars === null) {
            try {
                const HandlebarsModule = await import("handlebars");
                this.handlebars = HandlebarsModule.default;
            }
            catch (error) {
                throw new Error("Handlebars template engine requires the 'handlebars' package to be installed. " +
                    "Please run: npm install handlebars");
            }
        }
    }
    async render(content, data) {
        try {
            await this.initialize();
            const template = this.handlebars.compile(content);
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
