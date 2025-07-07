import ejsEngine from 'ejs';
import { Plugin, FileHookContext, TemplateInfo } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// ===== TYPES AND INTERFACES =====

// Block class to handle content blocks (replicated from ejs-mate)
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

// Common rendering context for EJS
interface EjsRenderingContext {
	block: (name: string, html?: string) => Block | undefined;
	layout: (view: string) => void;
	partial: (view: string) => string;
	[key: string]: any;
}

// Result type for layout processing
interface LayoutResult {
	content: string;
	targetPath: string;
}

// Block parsing result
interface BlockParseResult {
	name: string;
	content: string;
	startIndex: number;
	indentation: string;
}

// ===== CONSTANTS =====

// Regex patterns
const PATTERNS = {
	explicitLayout: /<% layout\(['"]([^'"]+)['"]\) %>/,
	blockStart: /^\s*<%\s*block\(['"]([^'\"]+)['"]\)\s*%>\s*$/,
	blockEnd: /^\s*<%\s*end\s*%>\s*$/,
	inlineBlock: /<% block\(['"]([^'\"]+)['"]\) %>([^<]*)<% end %>/g,
	layoutBlockStart: /^(\s*)<% block\('([^']+)'\) %>(\s*)$/,
	bodyBlock: /<%-?\s*body\s*%>/,
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Collect layout directories from template configurations
 */
function collectLayoutDirectories(context: FileHookContext): string[] {
	const layoutDirectories: string[] = [];

	if (context.allTemplates) {
		for (const template of context.allTemplates) {
			if (template.config?.layout) {
				for (const layoutDir of template.config.layout) {
					// Resolve relative paths relative to the template path
					const resolvedLayoutDir =
						layoutDir.startsWith('./') || layoutDir.startsWith('../')
							? path.resolve(template.path, layoutDir)
							: layoutDir;

					// Add to layout directories if not already present
					if (!layoutDirectories.includes(resolvedLayoutDir)) {
						layoutDirectories.push(resolvedLayoutDir);
					}
				}
			}
		}
	}

	return layoutDirectories;
}

/**
 * Check if file should be skipped during processing
 */
function shouldSkipProcessing(context: FileHookContext): boolean {
	// Skip output files to prevent circular processing
	const isOutputFile = context.sourcePath.includes('/output/') || context.sourcePath.includes('\\output\\');
	return isOutputFile;
}

/**
 * Create a result object
 */
function createResult(content: string, targetPath: string): LayoutResult {
	return { content, targetPath };
}

/**
 * Resolve layout path relative to source file
 */
function resolveLayoutPath(sourcePath: string, layoutPath: string): string {
	const sourceDir = path.dirname(sourcePath);
	return path.resolve(sourceDir, layoutPath);
}

// ===== BLOCK PROCESSING =====

/**
 * Parse blocks from content using a generic block parser
 */
function parseBlocks(
	content: string,
	options: {
		blockStartPattern: RegExp;
		blockEndPattern: RegExp;
		onBlockFound: (block: BlockParseResult, lines: string[], processedLines: string[]) => void;
	},
): string {
	const lines = content.split('\n');
	const processedLines: string[] = [];

	let blockStack: string[] = [];
	let currentBlockName: string | null = null;
	let currentBlockContent: string[] = [];
	let inBlock = false;
	let blockStartIndex = 0;
	let blockStartIndentation = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for block start
		const blockStartMatch = line.match(options.blockStartPattern);
		if (blockStartMatch && !inBlock) {
			inBlock = true;
			currentBlockName = blockStartMatch[2] || blockStartMatch[1]; // Handle different capture groups
			currentBlockContent = [];
			blockStartIndex = processedLines.length;
			blockStack.push(currentBlockName);
			blockStartIndentation = blockStartMatch[1] || '';

			// Add placeholder or original line
			processedLines.push(line);
			continue;
		}

		// Check for block end
		if (options.blockEndPattern.test(line) && inBlock) {
			inBlock = false;
			blockStack.pop();

			const blockResult: BlockParseResult = {
				name: currentBlockName!,
				content: currentBlockContent.join('\n'),
				startIndex: blockStartIndex,
				indentation: blockStartIndentation,
			};

			options.onBlockFound(blockResult, lines, processedLines);

			// Reset block state
			currentBlockName = null;
			currentBlockContent = [];
			blockStartIndentation = '';
			continue;
		}

		// If we're inside a block, collect the content
		if (inBlock) {
			currentBlockContent.push(line);
		} else {
			processedLines.push(line);
		}
	}

	return processedLines.join('\n');
}

/**
 * Preprocess content blocks (for content files)
 * Converts: <% block('name') %>content<% end %>
 * To: <% block('name', `content`) %>
 */
function preprocessContentBlocks(content: string): string {
	// First, handle inline blocks
	let processedContent = content.replace(PATTERNS.inlineBlock, (match, blockName, blockContent) => {
		return `<% block('${blockName}', \`${blockContent.trim()}\`) %>`;
	});

	// Then handle multiline blocks
	return parseBlocks(processedContent, {
		blockStartPattern: PATTERNS.blockStart,
		blockEndPattern: PATTERNS.blockEnd,
		onBlockFound: (block, lines, processedLines) => {
			const newBlockLine = `<% block('${block.name}', \`${block.content}\`) %>`;
			processedLines[block.startIndex] = newBlockLine;
		},
	});
}

/**
 * Preprocess layout blocks (for layout files)
 * Converts: <% block('name') %>default content<% end %>
 * To: <%= block('name') || `default content` %>
 */
function preprocessLayoutBlocks(content: string): string {
	return parseBlocks(content, {
		blockStartPattern: PATTERNS.layoutBlockStart,
		blockEndPattern: PATTERNS.blockEnd,
		onBlockFound: (block, lines, processedLines) => {
			const newBlockLine = `${block.indentation}<%= block('${block.name}') || \`${block.content}\` %>`;
			processedLines[block.startIndex] = newBlockLine;
		},
	});
}

// ===== RENDERING CONTEXTS =====

/**
 * Create common EJS rendering context with block helpers (for content rendering)
 */
function createRenderingContext(data: Record<string, any>, blocks: Record<string, Block>): EjsRenderingContext {
	return {
		...data,
		block: (name: string, html?: string): Block | undefined => {
			if (!blocks[name]) {
				blocks[name] = new Block();
			}
			if (html) {
				blocks[name].append(html);
			}
			return blocks[name];
		},
		layout: (view: string): void => {}, // no-op
		partial: (view: string): string => {
			console.warn(`Partial '${view}' not found - partials not yet implemented`);
			return '';
		},
	};
}

/**
 * Create layout rendering context with collected blocks (for layout rendering)
 */
function createLayoutContext(
	data: Record<string, any>,
	body: string,
	blocks: Record<string, Block>,
): EjsRenderingContext {
	return {
		...data,
		body,
		block: (name: string): Block | undefined => {
			return blocks[name] || undefined;
		},
		partial: (view: string): string => '',
		layout: () => {},
	};
}

// ===== RENDERING FUNCTIONS =====

/**
 * Render content with blocks and return both body and collected blocks
 */
async function renderWithBlocks(
	content: string,
	data: Record<string, any>,
): Promise<{ body: string; blocks: Record<string, Block> }> {
	const blocks: Record<string, Block> = {};
	const renderContext = createRenderingContext(data, blocks);

	const rawBody = await ejsEngine.render(content, renderContext, { async: true });

	// Clean up the body by removing excessive blank lines
	const body = rawBody
		.split('\n')
		.reduce((acc, line, index, lines) => {
			const trimmedLine = line.trim();

			// Skip blank lines at the beginning
			if (acc.length === 0 && trimmedLine === '') {
				return acc;
			}

			// If this is a blank line
			if (trimmedLine === '') {
				// Only add if the previous line wasn't blank
				const lastLine = acc[acc.length - 1];
				if (lastLine && lastLine.trim() !== '') {
					acc.push(line);
				}
			} else {
				// Non-blank line, always add
				acc.push(line);
			}

			return acc;
		}, [] as string[])
		.join('\n')
		.trim();

	return { body, blocks };
}

/**
 * Render layout with body and blocks
 */
async function renderLayout(
	layoutContent: string,
	data: Record<string, any>,
	body: string,
	blocks: Record<string, Block>,
): Promise<string> {
	const layoutContext = createLayoutContext(data, body, blocks);
	return await ejsEngine.render(layoutContent, layoutContext, { async: true });
}

// ===== LAYOUT PROCESSING =====

/**
 * Find layout template in template information
 */
function findLayoutTemplate(context: FileHookContext, layoutPath: string): { content?: string } | null {
	if (!context.allTemplates) return null;

	const resolvedLayoutPath = resolveLayoutPath(context.sourcePath, layoutPath);

	// Search through all templates to find the layout
	for (const template of context.allTemplates) {
		for (const file of template.files) {
			if (file.sourcePath === resolvedLayoutPath) {
				return { content: file.content };
			}
		}
	}

	return null;
}

/**
 * Find layout file content from filesystem, checking configured layout directories
 */
async function findLayoutFileContent(
	context: FileHookContext,
	sourcePath: string,
	layoutPath: string,
): Promise<string> {
	const LAYOUT_EXTENSIONS = ['.ejs', '.md', '.html', '.txt'];

	// First try relative to the source file
	const resolvedLayoutPath = resolveLayoutPath(sourcePath, layoutPath);

	// Try the exact path
	if (fs.existsSync(resolvedLayoutPath)) {
		return fs.readFileSync(resolvedLayoutPath, 'utf8');
	}

	// Try with common extensions
	for (const ext of LAYOUT_EXTENSIONS) {
		const pathWithExt = resolvedLayoutPath + ext;
		if (fs.existsSync(pathWithExt)) {
			return fs.readFileSync(pathWithExt, 'utf8');
		}
	}

	// If not found relative to source, try configured layout directories
	const layoutDirectories = collectLayoutDirectories(context);
	for (const layoutDir of layoutDirectories) {
		const layoutInConfiguredDir = path.resolve(layoutDir, layoutPath);

		// Try exact path in configured directory
		if (fs.existsSync(layoutInConfiguredDir)) {
			return fs.readFileSync(layoutInConfiguredDir, 'utf8');
		}

		// Try with extensions in configured directory
		for (const ext of LAYOUT_EXTENSIONS) {
			const pathWithExt = layoutInConfiguredDir + ext;
			if (fs.existsSync(pathWithExt)) {
				return fs.readFileSync(pathWithExt, 'utf8');
			}
		}
	}

	throw new Error(
		`Layout file not found: ${layoutPath} (searched relative to ${sourcePath} and in configured layout directories: ${layoutDirectories.join(', ')})`,
	);
}

/**
 * Process layout content by preprocessing blocks and rendering
 */
async function processLayoutContent(layoutContent: string): Promise<string> {
	// First preprocess layout blocks with default content
	const layoutWithDefaultBlocks = preprocessLayoutBlocks(layoutContent);

	// Then preprocess the layout content for block end tags
	return preprocessContentBlocks(layoutWithDefaultBlocks);
}

/**
 * Process layout (common logic for both explicit and automatic layouts)
 */
async function processLayout(
	context: FileHookContext,
	layoutPath: string,
	contentToRender: string,
	layoutContent: string,
): Promise<LayoutResult> {
	// Render the template with block helpers to collect blocks
	const { body, blocks } = await renderWithBlocks(contentToRender, context.data);

	// Render the layout with the collected blocks and body
	const renderedContent = await renderLayout(layoutContent, context.data, body, blocks);

	return createResult(renderedContent, context.targetPath);
}

/**
 * Process explicit layout directive
 */
async function processExplicitLayout(
	context: FileHookContext,
	layoutPath: string,
	preprocessedContent: string,
): Promise<LayoutResult> {
	// Remove the layout directive from the content before rendering
	const contentWithoutLayout = preprocessedContent.replace(PATTERNS.explicitLayout, '');

	// Find and render the layout template
	const layoutContent = await findLayoutFileContent(context, context.sourcePath, layoutPath);
	const processedLayoutContent = await processLayoutContent(layoutContent);

	return await processLayout(context, layoutPath, contentWithoutLayout, processedLayoutContent);
}

/**
 * Process file without layout (simple EJS rendering)
 */
async function processWithoutLayout(content: string, data: Record<string, any>): Promise<string> {
	const blocks: Record<string, Block> = {};
	const renderContext = createRenderingContext(data, blocks);
	return await ejsEngine.render(content, renderContext, { async: true });
}

/**
 * Find automatic layout file in configured directories
 * Looks for layout files that match the current filename or common layout names
 */
async function findAutomaticLayout(context: FileHookContext): Promise<string | null> {
	const layoutDirectories = collectLayoutDirectories(context);
	if (layoutDirectories.length === 0) {
		return null;
	}

	const currentFileName = path.basename(context.sourcePath);
	const currentBaseName = path.basename(currentFileName, path.extname(currentFileName));

	// Try to find layout files in configured directories
	for (const layoutDir of layoutDirectories) {
		const candidates = [
			// Try exact filename match
			currentFileName,
			// Try common layout names
			'layout.md',
			'layout.ejs',
			'layout.html',
			'base.md',
			'base.ejs',
			'base.html',
			'main.md',
			'main.ejs',
			'main.html',
			'index.md',
			'index.ejs',
			'index.html',
			'README.md',
			'readme.md',
		];

		for (const candidate of candidates) {
			const layoutPath = path.resolve(layoutDir, candidate);
			if (fs.existsSync(layoutPath)) {
				try {
					return fs.readFileSync(layoutPath, 'utf8');
				} catch (error) {
					continue; // Try next candidate
				}
			}
		}
	}

	return null;
}

/**
 * Process automatic layout (when no explicit layout directive is found)
 */
async function processAutomaticLayout(
	context: FileHookContext,
	preprocessedContent: string,
	layoutContent: string,
): Promise<LayoutResult> {
	return await processLayout(context, 'auto', preprocessedContent, layoutContent);
}

// ===== MAIN PLUGIN =====

/**
 * EJS-Mate Plugin Factory Function
 * Simplified version that only supports explicit layout directives
 */
export function ejsMate(filePattern?: string[]): Plugin {
	return {
		filePattern: filePattern,

		// Process hook: Used during template processing phase
		process: async (context) => {
			try {
				// Safe data context for process hook
				const safeData = context.data || {};
				const renderedContent = await ejsEngine.render(context.content, safeData, { async: true });
				return {
					content: renderedContent,
					targetPath: context.targetPath,
				};
			} catch (error) {
				// Don't throw errors in process hook - just return the original content
				return {
					content: context.content,
					targetPath: context.targetPath,
				};
			}
		},

		// Transform hook: Used during template processing phase with full template context
		transform: async (context: FileHookContext) => {
			try {
				// Early returns for files that shouldn't be processed
				if (shouldSkipProcessing(context)) {
					return createResult(context.content, context.targetPath);
				}

				// Preprocess block end tags before layout processing
				const preprocessedContent = preprocessContentBlocks(context.content);

				// Check for explicit layout directive
				const layoutMatch = preprocessedContent.match(PATTERNS.explicitLayout);
				if (layoutMatch) {
					return await processExplicitLayout(context, layoutMatch[1], preprocessedContent);
				}

				// Check for automatic layout from configured directories
				const automaticLayoutContent = await findAutomaticLayout(context);
				if (automaticLayoutContent) {
					const processedLayoutContent = await processLayoutContent(automaticLayoutContent);
					return await processAutomaticLayout(context, preprocessedContent, processedLayoutContent);
				}

				// No layout processing needed, render EJS with block helpers
				const renderedContent = await processWithoutLayout(preprocessedContent, context.data);
				return createResult(renderedContent, context.targetPath);
			} catch (error) {
				throw new Error(`Error processing EJS-Mate template: ${error}`);
			}
		},
	};
}

// Default export for convenience
export default ejsMate;
