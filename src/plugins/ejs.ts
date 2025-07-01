import ejsEngine from "ejs";
import { Plugin } from "./types.js";

/**
 * EJS Plugin Factory Function
 * Creates a plugin that processes EJS templates
 */
export function ejs(filePattern?: string[]): Plugin {
	return {
		filePattern: filePattern || ["*"],
		// Transform hook: Operates on output files AFTER merging/copying but BEFORE formatting
		// This processes the final output content before prettier formatting
		// We only use transform hook since process hook runs before all data is available
		transform: async (context) => {
			try {
				console.log(
					`[EJS Plugin] TRANSFORM hook - ${context.targetPath}`,
					"Available data keys:",
					Object.keys(context.data).sort(),
					"Full merged data:",
					JSON.stringify(context.data, null, 2),
					"Content to process:",
					context.content,
				);
				const renderedContent = await ejsEngine.render(
					context.content,
					context.data,
				);
				console.log(
					`[EJS Plugin] Rendered content for ${context.targetPath}:`,
					renderedContent,
				);
				return {
					content: renderedContent,
					targetPath: context.targetPath,
				};
			} catch (error) {
				console.error(
					`[EJS Plugin] TRANSFORM hook error in ${context.targetPath}:`,
					error,
					"Available data:",
					Object.keys(context.data).sort(),
					"Full merged data:",
					JSON.stringify(context.data, null, 2),
				);
				throw new Error(`Error processing EJS template: ${error}`);
			}
		},
	};
}

// Default export for convenience
export default ejs;
