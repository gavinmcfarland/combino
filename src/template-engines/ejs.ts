import ejs from "ejs";
import { TemplateEngine } from "./index.js";

export class EJSTemplateEngine implements TemplateEngine {
	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			return await ejs.render(content, data, { async: true });
		} catch (error) {
			console.error("Error processing EJS template:", error);
			return content;
		}
	}

	hasTemplateSyntax(content: string): boolean {
		return content.includes("<%");
	}
}

// Default export for convenience
export default EJSTemplateEngine;
