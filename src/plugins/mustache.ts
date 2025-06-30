import { Plugin, PluginOptions } from "./types.js";

/**
 * Mustache Template Engine
 */
class MustacheTemplateEngine {
	private initialized = false;
	private mustache: any = null;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			const { default: Mustache } = await import("mustache");
			this.mustache = Mustache;
			this.initialized = true;
		} catch (error) {
			throw new Error(
				"Mustache template engine requires the 'mustache' package to be installed. Please run: npm install mustache",
			);
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		await this.initialize();
		try {
			return this.mustache.render(content, data);
		} catch (error) {
			throw new Error(`Error processing Mustache template: ${error}`);
		}
	}

	hasTemplateSyntax(content: string): boolean {
		// Check for Mustache syntax patterns
		const mustachePatterns = [
			"{{", // Variable
			"{{{", // Unescaped variable
			"{{#", // Section
			"{{/", // End section
			"{{^", // Inverted section
			"{{>", // Partial
			"{{!", // Comment
		];
		return mustachePatterns.some((pattern) => content.includes(pattern));
	}
}

/**
 * Mustache Plugin Factory Function
 * This is the main export for the standalone Mustache plugin
 */
export function mustache(options: PluginOptions = {}): Plugin {
	return {
		engine: new MustacheTemplateEngine(),
		options: {
			priority: 0,
			...options,
		},
	};
}

// Default export for convenience
export default mustache;
