import Handlebars from 'handlebars';
import { Plugin, PluginOptions, FileHook, FileHookContext, FileHookResult } from '../types.js';

/**
 * Handlebars Template Engine
 */
class HandlebarsTemplateEngine {
	private initialized = false;
	private handlebars: any = null;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		try {
			const { default: Handlebars } = await import('handlebars');
			this.handlebars = Handlebars;
			this.initialized = true;
		} catch (error) {
			throw new Error(
				"Handlebars template engine requires the 'handlebars' package to be installed. Please run: npm install handlebars",
			);
		}
	}

	async render(content: string, data: Record<string, any>): Promise<string> {
		await this.initialize();
		try {
			const template = this.handlebars.compile(content);
			return template(data);
		} catch (error) {
			throw new Error(`Error processing Handlebars template: ${error}`);
		}
	}

	hasTemplateSyntax(content: string): boolean {
		// Check for Handlebars syntax patterns
		const handlebarsPatterns = [
			'{{', // Output expression
			'{{{', // Unescaped output
			'{{#', // Block helper
			'{{/', // End block
			'{{>', // Partial
			'{{!', // Comment
		];
		return handlebarsPatterns.some((pattern) => content.includes(pattern));
	}
}

/**
 * Handlebars Transform Hook
 * This handles template rendering through the transform pipeline
 */
async function handlebarsTransform(context: FileHookContext): Promise<FileHookResult> {
	const engine = new HandlebarsTemplateEngine();
	const renderedContent = await engine.render(context.content, context.data);
	return {
		content: renderedContent,
		id: context.id,
	};
}

/**
 * Handlebars Plugin Factory Function
 * This is the main export for the standalone Handlebars plugin
 */
export default function plugin(options: any = {}): Plugin {
	return {
		compile: async (context: FileHookContext): Promise<FileHookResult | void> => {
			try {
				const template = Handlebars.compile(context.content, options);
				const content = template(context.data);
				return { content };
			} catch (error) {
				console.error('Handlebars compilation error:', error);
				return { content: context.content };
			}
		},
	};
}
