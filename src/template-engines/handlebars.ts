import { TemplateEngine } from "./index.js";

export class HandlebarsTemplateEngine implements TemplateEngine {
	private handlebars: any = null;

	constructor() {
		// Initialize will be called lazily when first needed
	}

	private async initialize(): Promise<void> {
		if (this.handlebars === null) {
			try {
				const HandlebarsModule = await import("handlebars");
				this.handlebars = HandlebarsModule.default;
			} catch (error) {
				throw new Error(
					"Handlebars template engine requires the 'handlebars' package to be installed. " +
						"Please run: npm install handlebars",
				);
			}
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			await this.initialize();
			const template = this.handlebars.compile(content);
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
