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
		// Compile hook: Full EJS template processing
		compile: async (context: FileHookContext): Promise<FileHookResult> => {
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
				console.error('EJS compilation error:', error);
				return { content: contentWithoutFrontMatter };
			}
		},
	};
}

// Default export for convenience
export default ejs;
