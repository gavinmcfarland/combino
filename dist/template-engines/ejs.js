import ejs from "ejs";
export class EJSTemplateEngine {
    async render(content, data) {
        try {
            return await ejs.render(content, data, { async: true });
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
