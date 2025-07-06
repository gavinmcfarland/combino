import ejsEngine from 'ejs';
import { Plugin, FileHookContext, TemplateInfo } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

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
	block: (name: string, html?: string) => Block;
	layout: (view: string) => void;
	partial: (view: string) => string;
	[key: string]: any;
}

// Result type for layout processing
interface LayoutResult {
	content: string;
	targetPath: string;
}

// Constants for layout detection
const LAYOUT_DIRECTORIES = ['base', 'layout', 'layouts'];
const LAYOUT_EXTENSIONS = ['.ejs', '.md', '.html', '.txt'];
const LAYOUT_BLOCK_PATTERN = /<%-?\s*(?:block\(|body)/;
const EXPLICIT_LAYOUT_PATTERN = /<% layout\(['"]([^'"]+)['"]\) %>/;

// Block end tag patterns
const BLOCK_START_PATTERN = /^\s*<%\s*block\(['"]([^'\"]+)['"]\)\s*%>\s*$/;
const BLOCK_END_PATTERN = /^\s*<%\s*end\s*%>\s*$/;
const INLINE_BLOCK_PATTERN = /<% block\(['"]([^'\"]+)['"]\) %>([^<]*)<% end %>/g;

/**
 * EJS-Mate Plugin Factory Function
 * Creates a plugin that processes templates with flexible layout support
 * Supports layouts across different file types and directories
 * Automatically detects layouts based on template structure
 */
export function ejsMate(filePattern?: string[]): Plugin {
	return {
		filePattern: filePattern,
		// Transform hook: Used during template processing phase with full template context
		// This is where layout detection and block processing happens
		process: async (context) => {
			try {
				// In the process hook, data might not be fully available yet
				// So we provide a safe default context that won't cause errors
				const safeData = context.data || {};
				const renderedContent = await ejsEngine.render(context.content, safeData, { async: true });
				return {
					content: renderedContent,
					targetPath: context.targetPath,
				};
			} catch (error) {
				// Don't throw errors in process hook - just return the original content
				// console.warn(
				// 	`EJS process hook warning, returning original content: ${error}`,
				// );
				return {
					content: context.content,
					targetPath: context.targetPath,
				};
			}
		},
		transform: async (context: FileHookContext) => {
			try {
				console.log('EJS-Mate processing file:', context.sourcePath);
				// Early returns for files that shouldn't be processed
				if (shouldSkipProcessing(context)) {
					console.log('Skipping file:', context.sourcePath);
					return createResult(context.content, context.targetPath);
				}

				// Preprocess block end tags before layout processing
				const preprocessedContent = preprocessBlockEndTags(context.content);

				// Check for explicit layout
				const layoutMatch = preprocessedContent.match(EXPLICIT_LAYOUT_PATTERN);
				if (layoutMatch) {
					return await processExplicitLayout(context, layoutMatch[1], preprocessedContent);
				}

				// Check for automatic layout
				const autoLayout = detectAutomaticLayout(context);
				if (autoLayout) {
					return await processAutomaticLayout(context, autoLayout, preprocessedContent);
				}

				// Check if this is a layout template that should be suppressed
				const hasLayoutBlocks = LAYOUT_BLOCK_PATTERN.test(preprocessedContent);
				const hasBodyBlock = /<%-?\s*body\s*%>/.test(preprocessedContent);
				const isInLayoutDir = isLayoutDirectory(path.dirname(context.sourcePath));

				console.log('Layout blocks detected:', hasLayoutBlocks);
				console.log('Body block detected:', hasBodyBlock);
				console.log('In layout directory:', isInLayoutDir);
				console.log('Layout match:', layoutMatch);
				console.log('Auto layout:', autoLayout);

				// Only suppress if it has layout blocks AND (has body block OR is in layout directory)
				if (hasLayoutBlocks && (hasBodyBlock || isInLayoutDir) && !layoutMatch && !autoLayout) {
					console.log('Suppressing layout file:', context.sourcePath);
					return createResult('', context.targetPath);
				}

				// No layout processing needed, but still need to render EJS variables with block helpers
				const blocks: Record<string, Block> = {};
				const renderContext = createRenderingContext(context.data, blocks);

				const renderedContent = await ejsEngine.render(preprocessedContent, renderContext, { async: true });
				return createResult(renderedContent, context.targetPath);
			} catch (error) {
				throw new Error(`Error processing EJS-Mate template: ${error}`);
			}
		},
	};
}

/**
 * Preprocess block end tags to convert them to proper EJS syntax
 * Converts:
 * <% block('name') %>
 * content here
 * <% end %>
 *
 * To:
 * <% block('name', `
 * content here
 * `) %>
 */
function preprocessBlockEndTags(content: string): string {
	console.log('Preprocessing content:', content);

	// First, handle inline blocks (blocks that start and end on the same line)
	let processedContent = content.replace(INLINE_BLOCK_PATTERN, (match, blockName, blockContent) => {
		console.log('Found inline block:', blockName, 'with content:', blockContent);
		return `<% block('${blockName}', \`${blockContent.trim()}\`) %>`;
	});

	let blockStack: string[] = [];
	let currentBlockName: string | null = null;
	let currentBlockContent: string[] = [];
	let inBlock = false;
	let blockStartIndex = 0;

	// Split content into lines to process block tags
	const lines = processedContent.split('\n');
	const processedLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for block start
		const blockStartMatch = line.match(BLOCK_START_PATTERN);
		if (blockStartMatch && !inBlock) {
			console.log('Found block start:', blockStartMatch[1]);
			// Start a new block
			inBlock = true;
			currentBlockName = blockStartMatch[1];
			currentBlockContent = [];
			blockStartIndex = processedLines.length;
			blockStack.push(currentBlockName);

			// Add the block start line to processed content
			processedLines.push(line);
			continue;
		}

		// Check for block end
		if (BLOCK_END_PATTERN.test(line) && inBlock) {
			console.log('Found block end for:', currentBlockName);
			// End the current block
			inBlock = false;
			blockStack.pop();

			// Replace the block start line with the complete block
			const blockContent = currentBlockContent.join('\n');
			const blockStartLine = processedLines[blockStartIndex];

			console.log('Block content:', blockContent);

			// Create the new block line with content
			const newBlockLine = blockStartLine.replace(
				BLOCK_START_PATTERN,
				`<% block('${currentBlockName}', \`${blockContent}\`) %>`,
			);

			console.log('New block line:', newBlockLine);

			processedLines[blockStartIndex] = newBlockLine;

			// Reset block state
			currentBlockName = null;
			currentBlockContent = [];
			// Skip adding the end line
			continue;
		}

		// If we're inside a block, collect the content
		if (inBlock) {
			currentBlockContent.push(line);
		} else {
			// Regular line, add it as is
			processedLines.push(line);
		}
	}

	const result = processedLines.join('\n');
	console.log('Preprocessed result:', result);
	return result;
}

/**
 * Check if file should be skipped during processing
 */
function shouldSkipProcessing(context: FileHookContext): boolean {
	// Skip output files to prevent circular processing
	const isOutputFile = context.sourcePath.includes('/output/') || context.sourcePath.includes('\\output\\');

	if (isOutputFile) {
		return true;
	}

	// Skip if no template information available
	if (!context.allTemplates) {
		return true;
	}

	return false;
}

/**
 * Create a result object
 */
function createResult(content: string, targetPath: string): LayoutResult {
	return { content, targetPath };
}

/**
 * Check if a directory path contains layout directories
 */
function isLayoutDirectory(dirPath: string): boolean {
	return LAYOUT_DIRECTORIES.some(
		(layoutDir) =>
			dirPath.includes(`/${layoutDir}`) ||
			dirPath.includes(`\\${layoutDir}`) ||
			dirPath.endsWith(`/${layoutDir}`) ||
			dirPath.endsWith(`\\${layoutDir}`),
	);
}

/**
 * Check if a file is a layout file based on its directory or content
 */
function isLayoutFile(filePath: string, content?: string): boolean {
	const fileDir = path.dirname(filePath);
	return isLayoutDirectory(fileDir) || Boolean(content && LAYOUT_BLOCK_PATTERN.test(content));
}

/**
 * Create common EJS rendering context with block helpers
 */
function createRenderingContext(data: Record<string, any>, blocks: Record<string, Block>): EjsRenderingContext {
	return {
		...data,
		block: (name: string, html?: string): Block => {
			console.log(`BLOCK HELPER CALLED: ${name} with html: "${html}"`);
			if (!blocks[name]) {
				console.log(`Creating new block for: ${name}`);
				blocks[name] = new Block();
			}
			if (html) {
				console.log(`Appending to block ${name}: "${html}"`);
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
 * Create layout rendering context with collected blocks
 */
function createLayoutContext(
	data: Record<string, any>,
	body: string,
	blocks: Record<string, Block>,
): EjsRenderingContext {
	console.log('=== LAYOUT CONTEXT START ===');
	console.log('Blocks passed to layout context:', Object.keys(blocks), blocks);
	console.log('Block contents in layout context:');
	for (const [name, block] of Object.entries(blocks)) {
		console.log(`  ${name}: "${block.toString()}"`);
	}
	console.log('=== LAYOUT CONTEXT END ===');
	return {
		...data,
		body,
		block: (name: string): Block => {
			console.log(`LAYOUT BLOCK ACCESS: ${name}`);
			const block = blocks[name] || new Block();
			console.log(`LAYOUT BLOCK VALUE: ${name} = "${block.toString()}"`);
			return block;
		},
		partial: (view: string): string => '',
		layout: () => {},
	};
}

/**
 * Render content with blocks and return both body and collected blocks
 */
async function renderWithBlocks(
	content: string,
	data: Record<string, any>,
): Promise<{ body: string; blocks: Record<string, Block> }> {
	const blocks: Record<string, Block> = {};
	console.log('=== RENDER WITH BLOCKS START ===');
	console.log('Initial blocks object:', Object.keys(blocks), blocks);
	console.log('Content to render:', content.substring(0, 200) + '...');

	const renderContext = createRenderingContext(data, blocks);

	const rawBody = await ejsEngine.render(content, renderContext, {
		async: true,
	});

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
		.trim(); // Remove trailing whitespace

	console.log('Collected blocks after renderWithBlocks:', Object.keys(blocks), blocks);
	console.log('Block contents:');
	for (const [name, block] of Object.entries(blocks)) {
		console.log(`  ${name}: "${block.toString()}"`);
	}
	console.log('=== RENDER WITH BLOCKS END ===');

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

	return await ejsEngine.render(layoutContent, layoutContext, {
		async: true,
	});
}

/**
 * Detect automatic layout based on template structure
 */
function detectAutomaticLayout(context: FileHookContext): string | null {
	if (!context.allTemplates) return null;

	const currentFileName = path.basename(context.sourcePath);
	const currentDir = path.dirname(context.sourcePath);

	// If current file is a layout file, don't look for layouts for it
	if (isLayoutDirectory(currentDir)) {
		return null;
	}

	// Look for layout templates
	for (const template of context.allTemplates) {
		for (const file of template.files) {
			const fileName = path.basename(file.sourcePath);

			// Check if filename matches and it's a layout file
			if (
				fileName === currentFileName &&
				isLayoutFile(file.sourcePath, file.content) &&
				file.sourcePath !== context.sourcePath
			) {
				// Calculate relative path from current file to layout file
				return path.relative(currentDir, file.sourcePath);
			}
		}
	}

	return null;
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
 * Process automatic layout detection
 */
async function processAutomaticLayout(
	context: FileHookContext,
	layoutPath: string,
	preprocessedContent: string,
): Promise<LayoutResult> {
	// Find the layout template in the template information
	const layoutTemplate = findLayoutTemplate(context, layoutPath);
	if (!layoutTemplate) {
		throw new Error(`Layout template not found: ${layoutPath}`);
	}

	// Preprocess the layout content for block end tags
	const preprocessedLayoutContent = preprocessBlockEndTags(layoutTemplate.content || '');

	return await processLayout(context, layoutPath, preprocessedContent, preprocessedLayoutContent);
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
	const contentWithoutLayout = preprocessedContent.replace(EXPLICIT_LAYOUT_PATTERN, '');

	// Find and render the layout template
	const layoutContent = await findLayoutFileContent(context.sourcePath, layoutPath);

	// Preprocess the layout content for block end tags
	const preprocessedLayoutContent = preprocessBlockEndTags(layoutContent);

	return await processLayout(context, layoutPath, contentWithoutLayout, preprocessedLayoutContent);
}

/**
 * Resolve layout path relative to source file
 */
function resolveLayoutPath(sourcePath: string, layoutPath: string): string {
	const sourceDir = path.dirname(sourcePath);
	return path.resolve(sourceDir, layoutPath);
}

/**
 * Find layout file content from filesystem
 */
async function findLayoutFileContent(sourcePath: string, layoutPath: string): Promise<string> {
	const resolvedLayoutPath = resolveLayoutPath(sourcePath, layoutPath);

	// First try the exact path
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

	throw new Error(
		`Layout file not found: ${layoutPath} (tried: ${resolvedLayoutPath} and with extensions: ${LAYOUT_EXTENSIONS.join(', ')})`,
	);
}

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

// Default export for convenience
export default ejsMate;
