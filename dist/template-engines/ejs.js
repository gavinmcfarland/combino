export class EJSTemplateEngine {
    constructor() {
        this.ejs = null;
        // Initialize will be called lazily when first needed
    }
    async initialize() {
        if (this.ejs === null) {
            try {
                const EJSModule = await import("ejs");
                this.ejs = EJSModule.default;
            }
            catch (error) {
                throw new Error("EJS template engine requires the 'ejs' package to be installed. " +
                    "Please run: npm install ejs");
            }
        }
    }
    async render(content, data) {
        try {
            await this.initialize();
            return await this.ejs.render(content, data, { async: true });
        }
        catch (error) {
            console.error("Error processing EJS template:", error);
            return content;
        }
    }
    hasTemplateSyntax(content) {
        return content.includes("<%");
    }
}
// Default export for convenience
export default EJSTemplateEngine;
