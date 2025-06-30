import {
	Plugin,
	PluginOptions,
	FileHook,
	FileHookContext,
	FileHookResult,
} from "./types.js";

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
 * Mustache Transform Hook
 * This handles template rendering through the transform pipeline
 */
async function mustacheTransform(
	context: FileHookContext,
): Promise<FileHookResult> {
	const engine = new MustacheTemplateEngine();
	const renderedContent = await engine.render(context.content, context.data);
	return {
		content: renderedContent,
		targetPath: context.targetPath,
	};
}

/**
 * Mustache Plugin Factory Function
 * This is the main export for the standalone Mustache plugin
 */
export function mustache(
	options: PluginOptions = {},
	transform?: FileHook,
): Plugin {
	// Create a combined transform function that handles both Mustache rendering and custom transforms
	const combinedTransform = async (
		context: FileHookContext,
	): Promise<FileHookResult> => {
		// First apply Mustache rendering
		let result = await mustacheTransform(context);

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
		options: {
			priority: 0,
			...options,
		},
		transform: combinedTransform,
	};
}

// Default export for convenience
export default mustache;
