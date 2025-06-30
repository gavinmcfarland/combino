import ejsEngine from "ejs";
import { Plugin, FileHookContext, TemplateInfo } from "./types.js";
import * as fs from "fs";
import * as path from "path";

// Block class to handle content blocks (replicated from ejs-mate)
class Block {
	private html: string[] = [];

	toString(): string {
		return this.html.join("\n");
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

// Template registry to store templates by path
interface TemplateRegistry {
	[path: string]: string;
}

/**
 * EJS-Mate Plugin Factory Function
 * Creates a plugin that processes templates with flexible layout support
 * Supports layouts across different file types and directories
 * Automatically detects layouts based on template structure
 */
export function ejsMate(filePattern?: string[]): Plugin {
	return {
		filePattern,
		transform: async (context: FileHookContext) => {
			try {
				// Only process files that are in input directories, not output directories
				// This prevents circular processing when the plugin is applied to output files
				const isOutputFile =
					context.sourcePath.includes("/output/") ||
					context.sourcePath.includes("\\output\\");

				if (isOutputFile) {
					// Skip processing output files to prevent circular processing
					return {
						content: context.content,
						targetPath: context.targetPath,
					};
				}

				// Only process files that are in the include list (from allTemplates)
				// If allTemplates is not available, return the content unchanged
				if (!context.allTemplates) {
					return {
						content: context.content,
						targetPath: context.targetPath,
					};
				}

				// Check if this template uses explicit layout functionality
				const layoutMatch = context.content.match(
					/<% layout\(['"]([^'"]+)['"]\) %>/,
				);

				// Check if this file contains layout blocks (like block('head'), body, etc.)
				const hasLayoutBlocks = /<%-?\s*(?:block\(|body)/.test(
					context.content,
				);

				// If explicit layout is used, process it
				if (layoutMatch) {
					return await processExplicitLayout(context, layoutMatch[1]);
				}

				// If no explicit layout, try automatic layout detection
				let autoLayout: string | null = null;
				if (context.allTemplates) {
					autoLayout = detectAutomaticLayout(context);
					if (autoLayout) {
						const result = await processAutomaticLayout(
							context,
							autoLayout,
						);
						return result;
					}
				}

				// If this file has layout blocks but no layout directive and no auto layout, it's a layout template
				// Return empty content to prevent it from being output
				if (hasLayoutBlocks && !layoutMatch && !autoLayout) {
					return {
						content: "",
						targetPath: context.targetPath,
					};
				}

				// If no layout is used, return the content unchanged
				return {
					content: context.content,
					targetPath: context.targetPath,
				};
			} catch (error) {
				throw new Error(`Error processing EJS-Mate template: ${error}`);
			}
		},
	};
}

/**
 * Detect automatic layout based on template structure
 */
function detectAutomaticLayout(context: FileHookContext): string | null {
	if (!context.allTemplates) return null;

	const currentFileName = path.basename(context.sourcePath);
	const currentDir = path.dirname(context.sourcePath);

	// Check if current file is in a layout directory (base, layout, layouts)
	const isCurrentFileLayout =
		currentDir.includes("/base") ||
		currentDir.includes("/layout") ||
		currentDir.includes("/layouts") ||
		currentDir.endsWith("/base") ||
		currentDir.endsWith("/layout") ||
		currentDir.endsWith("/layouts");

	// If current file is a layout file, don't look for layouts for it
	if (isCurrentFileLayout) {
		return null;
	}

	// Look for layout templates in base/ directories
	for (const template of context.allTemplates) {
		for (const file of template.files) {
			const fileDir = path.dirname(file.sourcePath);
			const fileName = path.basename(file.sourcePath);

			// Check if this is a potential layout file
			// Layout files are typically in base/ directories or have layout blocks
			const isLayoutFile =
				fileDir.includes("base") ||
				fileDir.includes("layout") ||
				fileDir.includes("layouts") ||
				/<%-?\s*(?:block\(|body)/.test(file.content || "");

			// Check if filename matches and it's a layout file
			if (
				fileName === currentFileName &&
				isLayoutFile &&
				file.sourcePath !== context.sourcePath
			) {
				// Calculate relative path from current file to layout file
				const relativePath = path.relative(currentDir, file.sourcePath);
				return relativePath;
			}
		}
	}

	return null;
}

/**
 * Process automatic layout detection
 */
async function processAutomaticLayout(
	context: FileHookContext,
	layoutPath: string,
): Promise<{ content: string; targetPath: string }> {
	// Find the layout template in the template information
	const layoutTemplate = findLayoutTemplate(context, layoutPath);
	if (!layoutTemplate) {
		throw new Error(`Layout template not found: ${layoutPath}`);
	}

	// First pass: render the page template with block helpers to collect blocks
	const blocks: Record<string, Block> = {};

	const renderContext = {
		...context.data,
		block: (name: string, html?: string): Block => {
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
			console.warn(
				`Partial '${view}' not found - partials not yet implemented`,
			);
			return "";
		},
	};

	const body = await ejsEngine.render(context.content, renderContext, {
		async: true,
	});

	// Second pass: render the layout with the collected blocks and body
	const layoutContent = layoutTemplate.content || "";

	const renderedContent = await ejsEngine.render(
		layoutContent,
		{
			...context.data,
			body,
			block: (name: string): Block => blocks[name] || new Block(),
			partial: (view: string): string => "",
			layout: () => {},
		},
		{
			async: true,
		},
	);

	return {
		content: renderedContent,
		targetPath: context.targetPath,
	};
}

/**
 * Process explicit layout directive
 */
async function processExplicitLayout(
	context: FileHookContext,
	layoutPath: string,
): Promise<{ content: string; targetPath: string }> {
	// First pass: render the template with layout and block helpers
	const blocks: Record<string, Block> = {};

	// Create the rendering context with ejs-mate helpers
	const renderContext = {
		...context.data,
		// Block helper
		block: (name: string, html?: string): Block => {
			if (!blocks[name]) {
				blocks[name] = new Block();
			}
			if (html) {
				blocks[name].append(html);
			}
			return blocks[name];
		},
		// Layout helper (no-op for now, we handle it separately)
		layout: (view: string): void => {
			// This will be called but we handle layout processing separately
		},
		// Partial helper (simplified - would need template registry)
		partial: (view: string): string => {
			// For now, return empty string
			// In a full implementation, you'd look up the template
			console.warn(
				`Partial '${view}' not found - partials not yet implemented`,
			);
			return "";
		},
	};

	// Remove the layout directive from the content before rendering
	const contentWithoutLayout = context.content.replace(
		/<% layout\(['"][^'"]+['"]\) %>/,
		"",
	);

	// Render the template
	const renderedContent = await ejsEngine.render(
		contentWithoutLayout,
		renderContext,
		{
			async: true,
		},
	);

	// Second pass: find and render the layout template
	// Resolve the layout path relative to the current file
	const sourceDir = path.dirname(context.sourcePath);
	const resolvedLayoutPath = path.resolve(sourceDir, layoutPath);

	// Try to find the layout file
	let layoutTemplate: string = "";

	// First try the exact path
	if (fs.existsSync(resolvedLayoutPath)) {
		layoutTemplate = fs.readFileSync(resolvedLayoutPath, "utf8");
	} else {
		// Try with common extensions
		const extensions = [".ejs", ".md", ".html", ".txt"];
		let found = false;

		for (const ext of extensions) {
			const pathWithExt = resolvedLayoutPath + ext;
			if (fs.existsSync(pathWithExt)) {
				layoutTemplate = fs.readFileSync(pathWithExt, "utf8");
				found = true;
				break;
			}
		}

		if (!found) {
			throw new Error(
				`Layout file not found: ${layoutPath} (tried: ${resolvedLayoutPath} and with extensions: ${extensions.join(", ")})`,
			);
		}

		// TypeScript doesn't know that layoutTemplate is assigned in the loop
		// This is a fallback that should never be reached
		if (!layoutTemplate) {
			throw new Error(`Layout file not found: ${layoutPath}`);
		}
	}

	// Render the layout with the body and blocks
	const layoutContext = {
		...context.data,
		body: renderedContent,
		block: (name: string): Block => {
			return blocks[name] || new Block();
		},
		partial: (view: string): string => {
			// For now, return empty string or implement lookup if you want
			return "";
		},
		layout: () => {}, // no-op in layout
	};

	const finalContent = await ejsEngine.render(layoutTemplate, layoutContext, {
		async: true,
	});

	return {
		content: finalContent,
		targetPath: context.targetPath,
	};
}

// Helper function to find layout template in template information
function findLayoutTemplate(
	context: FileHookContext,
	layoutPath: string,
): { content?: string } | null {
	if (!context.allTemplates) return null;

	// Resolve the layout path relative to the current file
	const sourceDir = path.dirname(context.sourcePath);
	const resolvedLayoutPath = path.resolve(sourceDir, layoutPath);

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

// Helper function to extract blocks from content
async function extractBlocks(content: string): Promise<Record<string, Block>> {
	const blocks: Record<string, Block> = {};

	// Create the rendering context with ejs-mate helpers
	const renderContext = {
		// Block helper
		block: (name: string, html?: string): Block => {
			if (!blocks[name]) {
				blocks[name] = new Block();
			}
			if (html) {
				blocks[name].append(html);
			}
			return blocks[name];
		},
		// Layout helper (no-op for block extraction)
		layout: (view: string): void => {
			// This will be called but we handle layout processing separately
		},
		// Partial helper (simplified)
		partial: (view: string): string => {
			return "";
		},
	};

	// Render the content to extract blocks
	await ejsEngine.render(content, renderContext, {
		async: true,
	});

	return blocks;
}

// Helper function to create EJS helpers for blocks
function createBlockHelpers(blocks: Record<string, Block>) {
	return {
		block: (name: string): Block => {
			return blocks[name] || new Block();
		},
		partial: (view: string): string => {
			// For now, return empty string
			console.warn(
				`Partial '${view}' not found - partials not yet implemented`,
			);
			return "";
		},
	};
}

// Default export for convenience
export default ejsMate;
