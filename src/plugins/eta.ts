import { Eta } from 'eta';
import { Plugin, FileHookContext } from '../types.js';
import * as path from 'path';

export default function plugin(options: { patterns?: string[]; [key: string]: any } = {}): Plugin {
	const defaultPatterns = ['*.eta', '*.ejs', '*.md', '*.json'];
	const patterns = options.patterns || defaultPatterns;

	// Extract Eta options (everything except patterns)
	const { patterns: _, ...etaOptions } = options;

	// Helper function to check if file matches patterns
	function matchesPatterns(filePath: string): boolean {
		const fileName = path.basename(filePath);
		return patterns.some((pattern) => {
			const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'));
			return regex.test(fileName);
		});
	}

	function shouldSkipProcessing(context: FileHookContext): boolean {
		return context.sourcePath.includes('/output/') || context.sourcePath.includes('\\output\\');
	}

	return {
		compile: async (context: FileHookContext) => {
			// Only compile files that match our patterns
			if (!matchesPatterns(context.id)) {
				return { content: context.content, id: context.id };
			}

			try {
				if (shouldSkipProcessing(context)) {
					return { content: context.content, id: context.id };
				}

				// Render with Eta
				const eta = new Eta(etaOptions);
				const template = eta.compile(context.content);
				const renderedContent = template.call(eta, context.data);

				return { content: renderedContent, id: context.id };
			} catch (error) {
				throw new Error(`Error processing Eta template: ${error}`);
			}
		},
	};
}
