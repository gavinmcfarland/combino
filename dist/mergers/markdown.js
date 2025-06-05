"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMarkdown = mergeMarkdown;
const fs_1 = require("fs");
function parseMarkdown(content) {
    const sections = [];
    const lines = content.split("\n");
    let currentSection = null;
    let inFrontmatter = false;
    let currentContent = [];
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
                // Join content lines and ensure there's a newline at the end
                currentSection.content = currentContent.join("\n");
                sections.push(currentSection);
            }
            currentSection = {
                header: headerMatch[2],
                level: headerMatch[1].length,
                content: "",
            };
            currentContent = [];
        }
        else if (currentSection) {
            currentContent.push(line);
        }
    }
    if (currentSection) {
        // Join content lines and ensure there's a newline at the end
        currentSection.content = currentContent.join("\n");
        sections.push(currentSection);
    }
    return sections;
}
function mergeSections(targetSections, sourceSections, strategy) {
    // For replace strategy, we want to keep all target sections and only replace matching ones
    if (strategy === "replace") {
        const result = [...targetSections];
        for (const sourceSection of sourceSections) {
            const targetIndex = result.findIndex((s) => s.header === sourceSection.header);
            if (targetIndex !== -1) {
                result[targetIndex] = {
                    ...result[targetIndex],
                    content: sourceSection.content,
                };
            }
        }
        return result;
    }
    // For other strategies, use the map-based approach
    const mergedSections = new Map();
    const sectionOrder = [];
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
                    existing.content = section.content + "\n\n" + existing.content;
                    break;
            }
        }
        else {
            // For new sections, add them as is
            mergedSections.set(section.header, { ...section });
            sectionOrder.push(section.header);
        }
    }
    // Return sections in the original order
    return sectionOrder.map((header) => mergedSections.get(header));
}
function sectionsToMarkdown(sections) {
    const result = sections
        .map((section) => {
        const header = "#".repeat(section.level) + " " + section.header;
        // Ensure there's a newline after the header and preserve content newlines
        const sectionContent = `${header}\n\n${section.content}`;
        return sectionContent;
    })
        .join("\n\n")
        .replace(/(\n\s*){3,}/g, "\n\n") // collapse 3+ newlines to 2
        .trimEnd() + "\n"; // trim trailing whitespace and add final newline
    return result;
}
async function mergeMarkdown(targetPath, sourcePath, strategy) {
    const targetContent = await fs_1.promises.readFile(targetPath, "utf-8");
    const sourceContent = await fs_1.promises.readFile(sourcePath, "utf-8");
    const targetSections = parseMarkdown(targetContent);
    const sourceSections = parseMarkdown(sourceContent);
    const mergedSections = mergeSections(targetSections, sourceSections, strategy);
    return sectionsToMarkdown(mergedSections);
}
