export class MustacheTemplateEngine {
    constructor() {
        this.mustache = null;
        // Initialize will be called lazily when first needed
    }
    async initialize() {
        if (this.mustache === null) {
            try {
                const MustacheModule = await import("mustache");
                this.mustache = MustacheModule.default;
            }
            catch (error) {
                throw new Error("Mustache template engine requires the 'mustache' package to be installed. " +
                    "Please run: npm install mustache");
            }
        }
    }
    async render(content, data) {
        try {
            await this.initialize();
            return this.mustache.render(content, data);
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
