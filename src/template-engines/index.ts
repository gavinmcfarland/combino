export interface TemplateEngine {
	/**
	 * Renders a template string with the provided data
	 * @param content The template content to render
	 * @param data The data to use for rendering
	 * @returns Promise<string> The rendered content
	 */
	render(content: string, data: Record<string, any>): Promise<string>;

	/**
	 * Checks if the content contains template syntax that needs processing
	 * @param content The content to check
	 * @returns boolean True if the content contains template syntax
	 */
	hasTemplateSyntax(content: string): boolean;
}

/**
 * Check if a template engine dependency is available
 * @param engine The engine name to check
 * @returns Promise<boolean> True if the engine is available
 */
export async function isTemplateEngineAvailable(
	engine: string,
): Promise<boolean> {
	try {
		switch (engine.toLowerCase()) {
			case "ejs":
				return true; // EJS is always available as it's a core dependency
			case "handlebars":
				await import("handlebars");
				return true;
			case "mustache":
				await import("mustache");
				return true;
			default:
				return false;
		}
	} catch {
		return false;
	}
}

/**
 * Get installation instructions for a template engine
 * @param engine The engine name
 * @returns string Installation instructions
 */
export function getTemplateEngineInstallInstructions(engine: string): string {
	switch (engine.toLowerCase()) {
		case "handlebars":
			return "npm install handlebars";
		case "mustache":
			return "npm install mustache";
		default:
			return "";
	}
}

export * from "./ejs.js";
export * from "./handlebars.js";
export * from "./mustache.js";
