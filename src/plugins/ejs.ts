import ejsEngine from 'ejs';
import { Plugin, FileHookContext, FileHookResult } from './types.js';

/**
 * Strip YAML front matter from content
 */
function stripFrontMatter(content: string): string {
	const lines = content.split('\n');
	if (lines[0]?.trim() !== '---') {
		return content; // No front matter
	}

	// Find the end of front matter
	for (let i = 1; i < lines.length; i++) {
		if (lines[i]?.trim() === '---') {
			// Return content after front matter
			return lines.slice(i + 1).join('\n');
		}
	}

	return content; // No closing delimiter found, return original
}

/**
 * EJS Plugin Factory Function
 * Creates a plugin that processes EJS templates
 */
export function ejs(options: any = {}): Plugin {
	return {
		filePattern: options.patterns || [
			'*.ejs',
			'*.md',
			'*.txt',
			'*.json',
			'*.js',
			'*.ts',
			'*.jsx',
			'*.tsx',
			'*.html',
			'*.css',
			'*.scss',
			'*.yaml',
			'*.yml',
			'*.xml',
		],
		// Process hook: Operates on template files BEFORE merging/copying/output
		// This processes the raw template content before any file operations
		process: async (context: FileHookContext): Promise<FileHookResult> => {
			// Strip front matter from content before processing
			const contentWithoutFrontMatter = stripFrontMatter(context.content);

			// Only process files that contain EJS syntax (check original content)
			if (
				!context.content.includes('<%') &&
				!context.content.includes('<%=') &&
				!context.content.includes('<%-')
			) {
				return { content: contentWithoutFrontMatter };
			}

			try {
				const content = await ejsEngine.render(contentWithoutFrontMatter, context.data, {
					async: true,
					...options,
				});
				return { content };
			} catch (error) {
				console.error('EJS processing error:', error);
				return { content: contentWithoutFrontMatter };
			}
		},
		// Transform hook: Operates on output files AFTER merging/copying but BEFORE formatting
		// This processes the final output content before prettier formatting
		transform: async (context: FileHookContext): Promise<FileHookResult> => {
			// Transform hook can be used for additional processing
			// For now, just return the content as-is
			return { content: context.content };
		},
	};
}

// Default export for convenience
export default ejs;
