import { Plugin, FileHookContext } from '../types.js';
import { Edge } from 'edge.js';
import * as path from 'path';
import * as fs from 'fs';

function removeDirRecursive(dirPath: string) {
	if (fs.existsSync(dirPath)) {
		fs.readdirSync(dirPath).forEach((file) => {
			const curPath = path.join(dirPath, file);
			if (fs.lstatSync(curPath).isDirectory()) {
				removeDirRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(dirPath);
	}
}

export default function plugin(options: { patterns?: string[]; [key: string]: any } = {}): Plugin {
	const defaultPatterns = ['*.edge', '*.md', '*.json'];
	const patterns = options.patterns || defaultPatterns;

	// Helper to check if file matches patterns
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

	// Find layout content (Edge uses @layout, but we need to resolve the path)
	async function findLayoutContent(context: FileHookContext, layoutPath: string): Promise<string> {
		const resolvedLayoutPath = path.resolve(path.dirname(context.sourcePath), layoutPath);
		if (fs.existsSync(resolvedLayoutPath)) {
			return fs.readFileSync(resolvedLayoutPath, 'utf8');
		}
		const extensions = ['.edge', '.md', '.html', '.txt'];
		for (const ext of extensions) {
			const pathWithExt = resolvedLayoutPath + ext;
			if (fs.existsSync(pathWithExt)) {
				return fs.readFileSync(pathWithExt, 'utf8');
			}
		}
		throw new Error(`Layout file not found: ${layoutPath}`);
	}

	return {
		compile: async (context: FileHookContext) => {
			if (!matchesPatterns(context.id)) {
				return { content: context.content, id: context.id };
			}
			if (shouldSkipProcessing(context)) {
				return { content: context.content, id: context.id };
			}

			// Setup Edge instance
			const edge = new Edge({
				cache: false,
			});

			// Create a temporary directory for templates
			const tempDir = path.join(path.dirname(context.sourcePath), '.temp');
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			// Write template to temp file with .edge extension
			const templateName = path.basename(context.id, path.extname(context.id));
			const templatePath = path.join(tempDir, templateName + '.edge');
			fs.writeFileSync(templatePath, context.content);

			// If the template uses @layout, we need to write the layout as well
			const layoutMatch = context.content.match(/@layout\(['"]([^'"]+)['"]\)/);
			if (layoutMatch) {
				const layoutPath = layoutMatch[1];
				const layoutContent = await findLayoutContent(context, layoutPath);
				const layoutName = path.basename(layoutPath, path.extname(layoutPath));
				const layoutFilePath = path.join(tempDir, layoutName + '.edge');
				fs.writeFileSync(layoutFilePath, layoutContent);
			}

			// Mount the temp directory
			edge.mount(tempDir);

			// Render the template
			const renderedContent = await edge.render(templateName, context.data || {});

			return { content: renderedContent, id: context.id };
		},
		output: async (context: FileHookContext) => {
			// Clean up .temp directory after file is written
			const tempDir = path.join(path.dirname(context.sourcePath), '.temp');
			removeDirRecursive(tempDir);
		},
	};
}
