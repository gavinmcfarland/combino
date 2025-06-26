import { TemplateEngine } from "./index.js";

export class EJSTemplateEngine implements TemplateEngine {
	private ejs: any = null;

	constructor() {
		// Initialize will be called lazily when first needed
	}

	private async initialize(): Promise<void> {
		if (this.ejs === null) {
			try {
				const EJSModule = await import("ejs");
				this.ejs = EJSModule.default;
			} catch (error) {
				throw new Error(
					"EJS template engine requires the 'ejs' package to be installed. " +
						"Please run: npm install ejs",
				);
			}
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			await this.initialize();
			return await this.ejs.render(content, data, { async: true });
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
