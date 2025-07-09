import { Plugin, DiscoverContext, DiscoverResult } from '../types.js';
import * as ejs from 'ejs';

/**
 * EJS Discovery/Preprocessor Plugin
 * This plugin processes EJS templates in files before they are parsed during discovery
 * This allows dynamic config files with templating like <%= framework %> in include paths
 *
 * Example usage:
 * ```javascript
 * export default function ejsDiscoverPlugin() {
 *   return {
 *     discover(context) {
 *       // Early return if not a JSON file
 *       if (!context.sourcePath.endsWith('.json')) return;
 *
 *       // Early return if no EJS syntax
 *       if (!context.content.includes('<%')) return;
 *
 *       // Process the file
 *       return { content: processedContent };
 *     }
 *   };
 * }
 * ```
 */
export default function plugin(options: any = {}): Plugin {
	return {
		discover: async (context: DiscoverContext): Promise<DiscoverResult | void> => {
			const { content, data, sourcePath } = context;

			// Only process JSON files (config files)
			if (!sourcePath.endsWith('.json')) return;

			// Only process files that contain EJS syntax
			if (!content.includes('<%')) return;

			try {
				// Process the file content with EJS
				const processedContent = await ejs.render(content, data, {
					async: true,
					filename: sourcePath,
					...options,
				});

				return { content: processedContent };
			} catch (error) {
				console.error(`Error processing EJS file during discovery ${sourcePath}:`, error);
				// Return original content on error
				return { content };
			}
		},
	};
}
