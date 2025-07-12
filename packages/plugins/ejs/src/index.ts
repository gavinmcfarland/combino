import * as ejsEngine from 'ejs';

// Define the Plugin interface locally since we can't import from combino
export interface Plugin {
	discover?: (context: any) => Promise<any> | any;
	compile?: (context: any) => Promise<any> | any;
	assemble?: (context: any) => Promise<any> | any;
	output?: (context: any) => Promise<void> | void;
}

export interface FileHookContext {
	sourcePath: string;
	id: string;
	content: string;
	data: Record<string, any>;
	allTemplates?: any[];
}

export interface FileHookResult {
	content: string;
	id?: string;
}

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
export default function plugin(options: any = {}): Plugin {
	return {
		// Compile hook: Full EJS template processing
		compile: async (context: FileHookContext): Promise<FileHookResult | void> => {
			// Strip front matter from content before processing
			const contentWithoutFrontMatter = stripFrontMatter(context.content);

			// Only process files that contain EJS syntax (check original content)
			if (
				!context.content.includes('<%') &&
				!context.content.includes('<%=') &&
				!context.content.includes('<%-')
			) {
				return;
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
