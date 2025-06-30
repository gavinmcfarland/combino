import ejsEngine from "ejs";
import { Plugin } from "./types.js";

/**
 * EJS Plugin Factory Function
 * Creates a plugin that processes EJS templates
 */
export function ejs(filePattern?: string[]): Plugin {
	return {
		filePattern,
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
