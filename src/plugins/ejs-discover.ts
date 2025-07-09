import { Plugin, DiscoverContext, DiscoverResult } from '../types.js';
import * as ejs from 'ejs';

/**
 * EJS Discovery/Preprocessor Plugin
 * This plugin processes EJS templates in files before they are parsed during discovery
 * This allows dynamic config files with templating like <%= framework %> in include paths
 */
export default function plugin(options: any = {}): Plugin {
	return {
		filePattern: options.patterns || ['*.json'],
		discover: async (context: DiscoverContext): Promise<DiscoverResult> => {
			const { content, data, sourcePath } = context;

			// Only process files that contain EJS syntax
			if (!content.includes('<%')) {
				return { content };
			}

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
