import ejsEngine from 'ejs';
import { Plugin, FileHookContext, TemplateInfo } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// ===== TYPES =====

class Block {
	private html: string[] = [];

	toString(): string {
		return this.html.join('\n');
	}

	append(more: string): Block {
		this.html.push(more);
		return this;
	}

	prepend(more: string): Block {
		this.html.unshift(more);
		return this;
	}

	replace(instead: string): Block {
		this.html = [instead];
		return this;
	}
}

interface EjsRenderingContext {
	block: (name: string, html?: string) => Block | undefined;
	layout: (view: string) => void;
	partial: (view: string) => string;
	[key: string]: any;
}

interface LayoutResult {
	content: string;
	targetPath: string;
}

// ===== CONSTANTS =====

const PATTERNS = {
	explicitLayout: /<% layout\(['"]([^'"]+)['"]\) %>/,
	blockStart: /^\s*<%\s*block\(['"]([^'\"]+)['"]\)\s*%>\s*$/,
	blockEnd: /^\s*<%\s*end\s*%>\s*$/,
	inlineBlock: /<% block\(['"]([^'\"]+)['"]\) %>([^<]*)<% end %>/g,
	layoutBlockStart: /^(\s*)<% block\('([^']+)'\) %>(\s*)$/,
	bodyBlock: /<%-?\s*body\s*%>/,
} as const;

const LAYOUT_EXTENSIONS = ['.ejs', '.md', '.html', '.txt'];

// ===== UTILITY FUNCTIONS =====

function collectLayoutDirectories(context: FileHookContext): string[] {
	const layoutDirectories: string[] = [];

	if (context.allTemplates) {
		for (const template of context.allTemplates) {
			if (template.config?.layout) {
				for (const layoutDir of template.config.layout) {
					const resolvedLayoutDir =
						layoutDir.startsWith('./') || layoutDir.startsWith('../')
							? path.resolve(template.path, layoutDir)
							: layoutDir;

					if (!layoutDirectories.includes(resolvedLayoutDir)) {
						layoutDirectories.push(resolvedLayoutDir);
					}
				}
			}
		}
	}

	return layoutDirectories;
}

function shouldSkipProcessing(context: FileHookContext): boolean {
	return context.sourcePath.includes('/output/') || context.sourcePath.includes('\\output\\');
}

function resolveLayoutPath(sourcePath: string, layoutPath: string): string {
	return path.resolve(path.dirname(sourcePath), layoutPath);
}

// ===== BLOCK PROCESSING =====

function processBlocks(content: string, isLayout: boolean = false): string {
	const lines = content.split('\n');
	const processedLines: string[] = [];

	let inBlock = false;
	let currentBlockName: string | null = null;
	let currentBlockContent: string[] = [];
	let blockStartIndex = 0;
	let blockIndentation = '';

	// Handle inline blocks first
	if (!isLayout) {
		content = content.replace(PATTERNS.inlineBlock, (match, blockName, blockContent) => {
			return `<% block('${blockName}', \`${blockContent.trim()}\`) %>`;
		});
		lines.splice(0, lines.length, ...content.split('\n'));
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for block start
		const blockStartMatch = line.match(isLayout ? PATTERNS.layoutBlockStart : PATTERNS.blockStart);
		if (blockStartMatch && !inBlock) {
			inBlock = true;
			currentBlockName = blockStartMatch[2] || blockStartMatch[1];
			currentBlockContent = [];
			blockStartIndex = processedLines.length;
			blockIndentation = blockStartMatch[1] || '';
			processedLines.push(line);
			continue;
		}

		// Check for block end
		if (PATTERNS.blockEnd.test(line) && inBlock) {
			inBlock = false;
			const blockContent = currentBlockContent.join('\n');

			// Replace the block start line with the appropriate format
			if (isLayout) {
				processedLines[blockStartIndex] =
					`${blockIndentation}<%= block('${currentBlockName}') || \`${blockContent}\` %>`;
			} else {
				processedLines[blockStartIndex] = `<% block('${currentBlockName}', \`${blockContent}\`) %>`;
			}

			// Reset state
			currentBlockName = null;
			currentBlockContent = [];
			blockIndentation = '';
			continue;
		}

		// Collect block content or regular lines
		if (inBlock) {
			currentBlockContent.push(line);
		} else {
			processedLines.push(line);
		}
	}

	return processedLines.join('\n');
}

// ===== RENDERING =====

function createRenderingContext(
	data: Record<string, any>,
	blocks: Record<string, Block>,
	isLayout: boolean = false,
	body?: string,
): EjsRenderingContext {
	const context: EjsRenderingContext = {
		...data,
		block: isLayout
			? (name: string): Block | undefined => blocks[name] || undefined
			: (name: string, html?: string): Block | undefined => {
					if (!blocks[name]) {
						blocks[name] = new Block();
					}
					if (html) {
						blocks[name].append(html);
					}
					return blocks[name];
				},
		layout: (): void => {},
		partial: (view: string): string => {
			console.warn(`Partial '${view}' not found - partials not yet implemented`);
			return '';
		},
	};

	if (isLayout && body) {
		context.body = body;
	}

	return context;
}

async function renderWithBlocks(
	content: string,
	data: Record<string, any>,
): Promise<{ body: string; blocks: Record<string, Block> }> {
	const blocks: Record<string, Block> = {};
	const renderContext = createRenderingContext(data, blocks);

	const rawBody = await ejsEngine.render(content, renderContext, { async: true });

	// Clean up excessive blank lines
	const body = rawBody
		.split('\n')
		.reduce((acc, line, index, lines) => {
			const trimmedLine = line.trim();
			if (acc.length === 0 && trimmedLine === '') return acc;

			if (trimmedLine === '') {
				const lastLine = acc[acc.length - 1];
				if (lastLine && lastLine.trim() !== '') {
					acc.push(line);
				}
			} else {
				acc.push(line);
			}
			return acc;
		}, [] as string[])
		.join('\n')
		.trim();

	return { body, blocks };
}

async function renderLayout(
	layoutContent: string,
	data: Record<string, any>,
	body: string,
	blocks: Record<string, Block>,
): Promise<string> {
	const layoutContext = createRenderingContext(data, blocks, true, body);
	return await ejsEngine.render(layoutContent, layoutContext, { async: true });
}

// ===== LAYOUT PROCESSING =====

async function findLayoutContent(context: FileHookContext, layoutPath: string): Promise<string> {
	const resolvedLayoutPath = resolveLayoutPath(context.sourcePath, layoutPath);

	// Try exact path first
	if (fs.existsSync(resolvedLayoutPath)) {
		return fs.readFileSync(resolvedLayoutPath, 'utf8');
	}

	// Try with extensions
	for (const ext of LAYOUT_EXTENSIONS) {
		const pathWithExt = resolvedLayoutPath + ext;
		if (fs.existsSync(pathWithExt)) {
			return fs.readFileSync(pathWithExt, 'utf8');
		}
	}

	// Try configured layout directories
	const layoutDirectories = collectLayoutDirectories(context);
	for (const layoutDir of layoutDirectories) {
		const layoutInConfiguredDir = path.resolve(layoutDir, layoutPath);

		if (fs.existsSync(layoutInConfiguredDir)) {
			return fs.readFileSync(layoutInConfiguredDir, 'utf8');
		}

		for (const ext of LAYOUT_EXTENSIONS) {
			const pathWithExt = layoutInConfiguredDir + ext;
			if (fs.existsSync(pathWithExt)) {
				return fs.readFileSync(pathWithExt, 'utf8');
			}
		}
	}

	throw new Error(`Layout file not found: ${layoutPath}`);
}

async function findDynamicLayout(context: FileHookContext): Promise<string | null> {
	const layoutDirectories = collectLayoutDirectories(context);
	if (layoutDirectories.length === 0) return null;

	// Get just the filename from the source file
	const currentFileName = path.basename(context.sourcePath);

	// Only look for exact filename matches in configured layout directories
	for (const layoutDir of layoutDirectories) {
		const layoutPath = path.resolve(layoutDir, currentFileName);
		if (fs.existsSync(layoutPath)) {
			try {
				return fs.readFileSync(layoutPath, 'utf8');
			} catch (error) {
				continue;
			}
		}
	}

	return null;
}

async function processWithLayout(
	context: FileHookContext,
	layoutPath: string,
	contentToRender: string,
	layoutContent: string,
): Promise<LayoutResult> {
	// Render content with blocks
	const { body, blocks } = await renderWithBlocks(contentToRender, context.data);

	// Process and render layout
	const processedLayoutContent = processBlocks(layoutContent, true);
	const renderedContent = await renderLayout(processedLayoutContent, context.data, body, blocks);

	return { content: renderedContent, targetPath: context.targetPath };
}

async function processWithoutLayout(content: string, data: Record<string, any>): Promise<string> {
	const blocks: Record<string, Block> = {};
	const renderContext = createRenderingContext(data, blocks);
	return await ejsEngine.render(content, renderContext, { async: true });
}

// ===== MAIN PLUGIN =====

export function ejsMate(filePattern?: string[]): Plugin {
	return {
		filePattern: filePattern,

		process: async (context) => {
			try {
				const safeData = context.data || {};
				const renderedContent = await ejsEngine.render(context.content, safeData, { async: true });
				return {
					content: renderedContent,
					targetPath: context.targetPath,
				};
			} catch (error) {
				return {
					content: context.content,
					targetPath: context.targetPath,
				};
			}
		},

		transform: async (context: FileHookContext) => {
			try {
				if (shouldSkipProcessing(context)) {
					return { content: context.content, targetPath: context.targetPath };
				}

				// Preprocess blocks
				const preprocessedContent = processBlocks(context.content);

				// Check for explicit layout
				const layoutMatch = preprocessedContent.match(PATTERNS.explicitLayout);
				if (layoutMatch) {
					const contentWithoutLayout = preprocessedContent.replace(PATTERNS.explicitLayout, '');
					const layoutContent = await findLayoutContent(context, layoutMatch[1]);
					return await processWithLayout(context, layoutMatch[1], contentWithoutLayout, layoutContent);
				}

				// Check for dynamic layout in configured directories
				const dynamicLayoutContent = await findDynamicLayout(context);
				if (dynamicLayoutContent) {
					return await processWithLayout(context, 'dynamic', preprocessedContent, dynamicLayoutContent);
				}

				// No layout, just render EJS
				const renderedContent = await processWithoutLayout(preprocessedContent, context.data);
				return { content: renderedContent, targetPath: context.targetPath };
			} catch (error) {
				throw new Error(`Error processing EJS-Mate template: ${error}`);
			}
		},
	};
}

export default ejsMate;
