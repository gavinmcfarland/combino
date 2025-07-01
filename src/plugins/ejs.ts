import ejsEngine from "ejs";
import { Plugin } from "./types.js";

/**
 * EJS Plugin Factory Function
 * Creates a plugin that processes EJS templates
 */
export function ejs(filePattern?: string[]): Plugin {
	return {
		filePattern: filePattern || ["*"],
		// Process hook: Operates on template files BEFORE merging/copying/output
		// This processes the raw template content before any file operations
		process: async (context) => {
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
		},
		// Transform hook: Operates on output files AFTER merging/copying but BEFORE formatting
		// This processes the final output content before prettier formatting
		transform: async (context) => {
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
		},
	};
}

// Default export for convenience
export default ejs;
