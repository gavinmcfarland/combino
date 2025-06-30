import ejsEngine from "ejs";
import {
	Plugin,
	PluginOptions,
	FileHook,
	FileHookContext,
	FileHookResult,
} from "./types.js";

/**
 * EJS Plugin Factory Function
 * Creates a plugin that processes EJS templates
 */
export function ejs(options: PluginOptions = {}, transform?: FileHook): Plugin {
	const ejsTransform: FileHook = async (context) => {
		try {
			const renderedContent = await ejsEngine.render(
				context.content,
				context.data,
			);
			return {
				content: renderedContent,
				targetPath: context.targetPath,
			};
		} catch (error) {
			throw new Error(`Error processing EJS template: ${error}`);
		}
	};

	// If no custom transform provided, use EJS transform directly
	if (!transform) {
		return {
			options: {
				priority: 0,
				patterns: ["*"], // Process all files by default
				...options,
			},
			transform: ejsTransform,
		};
	}

	// If custom transform provided, chain them together
	const combinedTransform: FileHook = async (context) => {
		// First apply EJS rendering
		const ejsResult = await ejsTransform(context);

		// Then apply custom transform
		const customContext: FileHookContext = {
			...context,
			content: ejsResult.content,
			targetPath: ejsResult.targetPath ?? context.targetPath,
		};

		return transform(customContext);
	};

	return {
		options: {
			priority: 0,
			patterns: ["*"], // Process all files by default
			...options,
		},
		transform: combinedTransform,
	};
}

// Default export for convenience
export default ejs;
