import {
	Plugin,
	PluginOptions,
	FileHook,
	FileHookContext,
	FileHookResult,
} from "./types.js";

/**
 * Handlebars Template Engine
 */
class HandlebarsTemplateEngine {
	private initialized = false;
	private handlebars: any = null;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			const { default: Handlebars } = await import("handlebars");
			this.handlebars = Handlebars;
			this.initialized = true;
		} catch (error) {
			throw new Error(
				"Handlebars template engine requires the 'handlebars' package to be installed. Please run: npm install handlebars",
			);
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		await this.initialize();
		try {
			const template = this.handlebars.compile(content);
			return template(data);
		} catch (error) {
			throw new Error(`Error processing Handlebars template: ${error}`);
		}
	}

	hasTemplateSyntax(content: string): boolean {
		// Check for Handlebars syntax patterns
		const handlebarsPatterns = [
			"{{", // Output expression
			"{{{", // Unescaped output
			"{{#", // Block helper
			"{{/", // End block
			"{{>", // Partial
			"{{!", // Comment
		];
		return handlebarsPatterns.some((pattern) => content.includes(pattern));
	}
}

/**
 * Handlebars Transform Hook
 * This handles template rendering through the transform pipeline
 */
async function handlebarsTransform(
	context: FileHookContext,
): Promise<FileHookResult> {
	const engine = new HandlebarsTemplateEngine();
	const renderedContent = await engine.render(context.content, context.data);
	return {
		content: renderedContent,
		targetPath: context.targetPath,
	};
}

/**
 * Handlebars Plugin Factory Function
 * This is the main export for the standalone Handlebars plugin
 */
export function handlebars(
	options: PluginOptions = {},
	transform?: FileHook,
): Plugin {
	// Create a combined transform function that handles both Handlebars rendering and custom transforms
	const combinedTransform = async (
		context: FileHookContext,
	): Promise<FileHookResult> => {
		// First apply Handlebars rendering
		let result = await handlebarsTransform(context);

		// Then apply any custom transform if provided
		if (transform) {
			const customContext: FileHookContext = {
				...context,
				content: result.content,
				targetPath: result.targetPath ?? context.targetPath,
			};
			const customResult = await Promise.resolve(
				transform(customContext),
			);
			result = {
				content: customResult.content,
				targetPath: customResult.targetPath ?? result.targetPath,
			};
		}

		return result;
	};

	return {
		filePattern: ["*"],
		transform: combinedTransform,
	};
}

// Default export for convenience
export default handlebars;
