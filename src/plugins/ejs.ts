import ejsEngine from "ejs";
import { Plugin, PluginOptions, FileHook } from "./types.js";

/**
 * EJS Template Engine
 */
class EJSTemplateEngine {
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			await import("ejs");
			this.initialized = true;
		} catch (error) {
			throw new Error(
				"EJS template engine requires the 'ejs' package to be installed. Please run: npm install ejs",
			);
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		await this.initialize();
		try {
			return ejsEngine.render(content, data);
		} catch (error) {
			throw new Error(`Error processing EJS template: ${error}`);
		}
	}

	hasTemplateSyntax(content: string): boolean {
		// Check for EJS syntax patterns
		const ejsPatterns = [
			"<%=", // Output expression
			"<%#", // Comment
			"<%", // Code block
			"%>", // End tag
		];
		return ejsPatterns.some((pattern) => content.includes(pattern));
	}
}

/**
 * EJS Plugin Factory Function
 * This is the main export for the standalone EJS plugin
 */
export function ejs(options: PluginOptions = {}, transform?: FileHook): Plugin {
	return {
		engine: new EJSTemplateEngine(),
		options: {
			priority: 0,
			patterns: ["*"], // Process all files by default
			...options,
		},
		transform,
	};
}

// Default export for convenience
export default ejs;
