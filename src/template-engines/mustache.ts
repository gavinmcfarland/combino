import Mustache from "mustache";
import { TemplateEngine } from "./index.js";

export class MustacheTemplateEngine implements TemplateEngine {
	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			return Mustache.render(content, data);
		} catch (error) {
			console.error("Error processing Mustache template:", error);
			return content;
		}
	}

	hasTemplateSyntax(content: string): boolean {
		return content.includes("{{") || content.includes("{{{");
	}
}

// Default export for convenience
export default MustacheTemplateEngine;
