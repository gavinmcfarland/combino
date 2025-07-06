import { promises as fs } from 'fs';
import { MergeStrategy } from '../types.js';
import matter from 'gray-matter';

interface MarkdownSection {
	header: string;
	level: number;
	content: string;
}

function parseMarkdown(content: string): MarkdownSection[] {
	const sections: MarkdownSection[] = [];
	const lines = content.split('\n');
	let currentSection: MarkdownSection | null = null;
	let inFrontmatter = false;
	let currentContent: string[] = [];

	for (const line of lines) {
		// Check for frontmatter
		if (line.trim() === '---') {
			inFrontmatter = !inFrontmatter;
			continue;
		}
		if (inFrontmatter) {
			continue;
		}

		// Check for headers
		const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (headerMatch) {
			if (currentSection) {
				// Join content lines and ensure there's a newline at the end
				currentSection.content = currentContent.join('\n');
				sections.push(currentSection);
			}
			currentSection = {
				header: headerMatch[2],
				level: headerMatch[1].length,
				content: '',
			};
			currentContent = [];
		} else if (currentSection) {
			currentContent.push(line);
		}
	}

	if (currentSection) {
		// Join content lines and ensure there's a newline at the end
		currentSection.content = currentContent.join('\n');
		sections.push(currentSection);
	}

	return sections;
}

function mergeSections(
	targetSections: MarkdownSection[],
	sourceSections: MarkdownSection[],
	strategy: MergeStrategy,
): MarkdownSection[] {
	// For shallow strategy, we want to keep all target sections and only replace matching ones
	if (strategy === 'shallow') {
		const result = [...targetSections];
		for (const sourceSection of sourceSections) {
			const targetIndex = result.findIndex((s) => s.header === sourceSection.header);
			if (targetIndex !== -1) {
				result[targetIndex] = {
					...result[targetIndex],
					content: sourceSection.content,
				};
			} else {
				// Add new sections from source
				result.push({ ...sourceSection });
			}
		}
		return result;
	}

	// For other strategies, use the map-based approach
	const mergedSections = new Map<string, MarkdownSection>();
	const sectionOrder: string[] = [];

	// Add all target sections first
	for (const section of targetSections) {
		mergedSections.set(section.header, { ...section });
		sectionOrder.push(section.header);
	}

	// Process source sections
	for (const section of sourceSections) {
		const existing = mergedSections.get(section.header);
		if (existing) {
			// For matching headers, use the specified strategy
			switch (strategy) {
				case 'append':
					existing.content += '\n\n' + section.content;
					break;
				case 'prepend':
					existing.content = section.content + '\n\n' + existing.content;
					break;
			}
		} else {
			// For new sections, add them as is
			mergedSections.set(section.header, { ...section });
			sectionOrder.push(section.header);
		}
	}

	// Return sections in the original order
	return sectionOrder.map((header) => mergedSections.get(header)!);
}

function sectionsToMarkdown(sections: MarkdownSection[]): string {
	const result =
		sections
			.map((section) => {
				const header = '#'.repeat(section.level) + ' ' + section.header;
				// Normalize bullet point formatting to use single space after dash
				const normalizedContent = section.content.replace(/^-\s+/gm, '- ');
				// Ensure there's a newline after the header and preserve content newlines
				const sectionContent = `${header}\n\n${normalizedContent}`;

				return sectionContent;
			})
			.join('\n\n')
			.replace(/(\n\s*){3,}/g, '\n\n') // collapse 3+ newlines to 2
			.trimEnd() + '\n'; // trim trailing whitespace and add final newline

	return result;
}

export async function mergeMarkdown(
	existingPath: string, // Path to the existing file (target)
	newPath: string, // Path to the new file (source)
	strategy: MergeStrategy,
): Promise<string> {
	const existingContent = await fs.readFile(existingPath, 'utf-8');
	const newContent = await fs.readFile(newPath, 'utf-8');

	// For replace strategy, return the new content directly
	if (strategy === 'replace') {
		return newContent;
	}

	// For shallow strategy, we want to keep all target sections and only replace matching ones
	if (strategy === 'shallow') {
		const existingSections = parseMarkdown(existingContent);
		const newSections = parseMarkdown(newContent);
		const result = [...existingSections];
		for (const sourceSection of newSections) {
			const targetIndex = result.findIndex((s) => s.header === sourceSection.header);
			if (targetIndex !== -1) {
				result[targetIndex] = {
					...result[targetIndex],
					content: sourceSection.content,
				};
			} else {
				// Add new sections from source
				result.push({ ...sourceSection });
			}
		}
		return sectionsToMarkdown(result);
	}

	// For other strategies, use the map-based approach
	const existingSections = parseMarkdown(existingContent);
	const newSections = parseMarkdown(newContent);
	const mergedSections = new Map<string, MarkdownSection>();
	const sectionOrder: string[] = [];

	// Add all target sections first
	for (const section of existingSections) {
		mergedSections.set(section.header, { ...section });
		sectionOrder.push(section.header);
	}

	// Process source sections
	for (const section of newSections) {
		const existing = mergedSections.get(section.header);
		if (existing) {
			// For matching headers, use the specified strategy
			switch (strategy) {
				case 'append':
					existing.content += '\n\n' + section.content;
					break;
				case 'prepend':
					existing.content = section.content + '\n\n' + existing.content;
					break;
			}
		} else {
			// For new sections, add them as is
			mergedSections.set(section.header, { ...section });
			sectionOrder.push(section.header);
		}
	}

	// Return sections in the original order
	return sectionsToMarkdown(sectionOrder.map((header) => mergedSections.get(header)!));
}
