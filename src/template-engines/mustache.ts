import { TemplateEngine } from "./index.js";

export class MustacheTemplateEngine implements TemplateEngine {
	private mustache: any = null;

	constructor() {
		// Initialize will be called lazily when first needed
	}

	private async initialize(): Promise<void> {
		if (this.mustache === null) {
			try {
				const MustacheModule = await import("mustache");
				this.mustache = MustacheModule.default;
			} catch (error) {
				throw new Error(
					"Mustache template engine requires the 'mustache' package to be installed. " +
						"Please run: npm install mustache",
				);
			}
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		try {
			await this.initialize();
			return this.mustache.render(content, data);
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
