import { Plugin, DiscoverContext, DiscoverResult } from '../types.js';
import * as ejs from 'ejs';

/**
 * EJS Discovery/Preprocessor Plugin
 * This plugin processes EJS templates in files before they are parsed during discovery
 * This allows dynamic config files with templating like <%= framework %> in include paths
 *
 * The plugin automatically targets the config file name being used (e.g., 'combino.json', 'template.json')
 * based on the configFileName provided in the context.
 *
 * Example usage:
 * ```javascript
 * export default function ejsDiscoverPlugin() {
 *   return {
 *     discover(context) {
 *       // Target specific config file name if provided
 *       if (context.configFileName) {
 *         if (!context.sourcePath.endsWith(context.configFileName)) return;
 *       } else {
 *         // Fallback to JSON files
 *         if (!context.sourcePath.endsWith('.json')) return;
 *       }
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
			const { content, data, sourcePath, configFileName } = context;

			// Only process config files (if configFileName is provided, target specifically that file)
			if (configFileName) {
				if (!sourcePath.endsWith(configFileName)) return;
			}

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
