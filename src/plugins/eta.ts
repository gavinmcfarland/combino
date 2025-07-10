import { Eta } from 'eta';
import { Plugin, FileHookContext } from '../types.js';
import * as path from 'path';
import * as fs from 'fs';

export default function plugin(options: { patterns?: string[]; [key: string]: any } = {}): Plugin {
	const defaultPatterns = ['*'];
	const patterns = options.patterns || defaultPatterns;

	// Extract Eta options (everything except patterns)
	const { patterns: _, ...etaOptions } = options;

	// Constants for layout processing
	const PATTERNS = {
		explicitLayout: /<% layout\(['"]([^'"]+)['"]\) %>/,
	} as const;

	// Helper function to check if file matches patterns
	function matchesPatterns(filePath: string): boolean {
		const fileName = path.basename(filePath);
		return patterns.some((pattern) => {
			const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'));
			return regex.test(fileName);
		});
	}

	function shouldSkipProcessing(context: FileHookContext): boolean {
		return (
			context.sourcePath.includes('/output/') ||
			context.sourcePath.includes('\\output\\') ||
			context.sourcePath.includes('/layouts/') ||
			context.sourcePath.includes('\\layouts\\')
		);
	}

	// Find layout content
	async function findLayoutContent(context: FileHookContext, layoutPath: string): Promise<string> {
		const resolvedLayoutPath = path.resolve(path.dirname(context.sourcePath), layoutPath);

		// Try exact path first
		if (fs.existsSync(resolvedLayoutPath)) {
			return fs.readFileSync(resolvedLayoutPath, 'utf8');
		}

		// Try with extensions
		const extensions = ['.eta', '.ejs', '.md', '.html', '.txt'];
		for (const ext of extensions) {
			const pathWithExt = resolvedLayoutPath + ext;
			if (fs.existsSync(pathWithExt)) {
				return fs.readFileSync(pathWithExt, 'utf8');
			}
		}

		throw new Error(`Layout file not found: ${layoutPath}`);
	}

	// Extract body content (content outside of layout directive)
	function extractBodyContent(content: string): string {
		return content.replace(PATTERNS.explicitLayout, '').trim();
	}

	// Render layout
	async function renderLayout(
		layoutContent: string,
		data: Record<string, any>,
		body: string,
		etaOptions: any = {},
	): Promise<string> {
		const layoutData = { ...data, body };

		const eta = new Eta(etaOptions);
		const template = eta.compile(layoutContent);
		return template.call(eta, layoutData);
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

				// Check for explicit layout
				const layoutMatch = context.content.match(PATTERNS.explicitLayout);
				if (layoutMatch) {
					const layoutContent = await findLayoutContent(context, layoutMatch[1]);

					// Extract body content
					const bodyContent = extractBodyContent(context.content);

					// Render body content
					const eta = new Eta(etaOptions);
					const bodyTemplate = eta.compile(bodyContent);
					const body = bodyTemplate.call(eta, { ...context.data, it: context.data });

					// Render layout
					const renderedContent = await renderLayout(layoutContent, context.data, body, etaOptions);

					return { content: renderedContent, id: context.id };
				}

				// No layout, just render normally
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
