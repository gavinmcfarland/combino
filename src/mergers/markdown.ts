import { promises as fs } from "fs";
import { MergeStrategy } from "../types";

interface MarkdownSection {
	header: string;
	level: number;
	content: string;
}

function parseMarkdown(content: string): MarkdownSection[] {
	const sections: MarkdownSection[] = [];
	const lines = content.split("\n");
	let currentSection: MarkdownSection | null = null;
	let inFrontmatter = false;

	for (const line of lines) {
		// Check for frontmatter
		if (line.trim() === "---") {
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
				sections.push(currentSection);
			}
			currentSection = {
				header: headerMatch[2],
				level: headerMatch[1].length,
				content: line + "\n",
			};
		} else if (currentSection) {
			currentSection.content += line + "\n";
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	return sections;
}

function mergeSections(
	targetSections: MarkdownSection[],
	sourceSections: MarkdownSection[],
	strategy: MergeStrategy
): MarkdownSection[] {
	if (strategy === "replace") {
		// For replace, use the source sections only
		return sourceSections;
	}

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
				case "append":
					existing.content += "\n\n" + section.content;
					break;
				case "prepend":
					existing.content =
						section.content + "\n\n" + existing.content;
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
	return sections
		.map((section) => {
			const header = "#".repeat(section.level) + " " + section.header;
			// Trim content to avoid leading/trailing blank lines
			const content = section.content.trim();
			return `${header}\n\n${content}`;
		})
		.join("\n\n")
		.replace(/(\n\s*){3,}/g, "\n\n") // collapse 3+ newlines to 2
		.trim(); // remove leading/trailing blank lines
}

export async function mergeMarkdown(
	targetPath: string,
	sourcePath: string,
	strategy: MergeStrategy
): Promise<string> {
	const targetContent = await fs.readFile(targetPath, "utf-8");
	const sourceContent = await fs.readFile(sourcePath, "utf-8");

	if (strategy === "replace") {
		// For replace, just use the source sections (without frontmatter)
		const sourceSections = parseMarkdown(sourceContent);
		return sectionsToMarkdown(sourceSections);
	}

	const targetSections = parseMarkdown(targetContent);
	const sourceSections = parseMarkdown(sourceContent);

	const mergedSections = mergeSections(
		targetSections,
		sourceSections,
		strategy
	);
	return sectionsToMarkdown(mergedSections);
}
