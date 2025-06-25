import Handlebars from "handlebars";
import { TemplateEngine } from "./index.js";

export class HandlebarsTemplateEngine implements TemplateEngine {
	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			const template = Handlebars.compile(content);
			return template(data);
		} catch (error) {
			console.error("Error processing Handlebars template:", error);
			return content;
		}
	}

	hasTemplateSyntax(content: string): boolean {
		return content.includes("{{") || content.includes("{{{");
	}
}

// Default export for convenience
export default HandlebarsTemplateEngine;
