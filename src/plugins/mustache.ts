import { Plugin, PluginOptions, FileHook, FileHookContext, FileHookResult } from './types.js';
import Mustache from 'mustache';

/**
 * Mustache Template Engine
 */
class MustacheTemplateEngine {
	private initialized = false;
	private mustache: any = null;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			const { default: Mustache } = await import('mustache');
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
			'{{', // Variable
			'{{{', // Unescaped variable
			'{{#', // Section
			'{{/', // End section
			'{{^', // Inverted section
			'{{>', // Partial
			'{{!', // Comment
		];
		return mustachePatterns.some((pattern) => content.includes(pattern));
	}
}

/**
 * Mustache Transform Hook
 * This handles template rendering through the transform pipeline
 */
async function mustacheTransform(context: FileHookContext): Promise<FileHookResult> {
	const engine = new MustacheTemplateEngine();
	const renderedContent = await engine.render(context.content, context.data);
	return {
		content: renderedContent,
		id: context.id,
	};
}

/**
 * Mustache Plugin Factory Function
 * This is the main export for the standalone Mustache plugin
 */
export function mustache(options: any = {}): Plugin {
	return {
		filePattern: options.patterns || ['*.mustache'],
		compile: async (context: FileHookContext): Promise<FileHookResult> => {
			try {
				const content = Mustache.render(context.content, context.data, options.partials);
				return { content };
			} catch (error) {
				console.error('Mustache compilation error:', error);
				return { content: context.content };
			}
		},
	};
}

// Default export for convenience
export default mustache;
