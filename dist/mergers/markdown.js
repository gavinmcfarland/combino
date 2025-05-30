"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMarkdown = mergeMarkdown;
const fs_1 = require("fs");
function parseMarkdown(content) {
    const sections = [];
    const lines = content.split("\n");
    let currentSection = null;
    let currentContent = [];
    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            if (currentSection) {
                currentSection.content = currentContent.join("\n").trim();
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
        currentSection.content = currentContent.join("\n").trim();
        sections.push(currentSection);
    }
    return sections;
}
function mergeSections(targetSections, sourceSections, strategy) {
    const mergedSections = new Map();
    // Add all target sections
    for (const section of targetSections) {
        mergedSections.set(section.header, { ...section });
    }
    // Merge or add source sections
    for (const section of sourceSections) {
        const existing = mergedSections.get(section.header);
        if (existing) {
            switch (strategy) {
                case "append":
                    existing.content += "\n\n" + section.content;
                    break;
                case "prepend":
                    existing.content =
                        section.content + "\n\n" + existing.content;
                    break;
                case "replace":
                    existing.content = section.content;
                    break;
                default:
                    throw new Error(`Unsupported merge strategy for Markdown: ${strategy}`);
            }
        }
        else {
            mergedSections.set(section.header, { ...section });
        }
    }
    return Array.from(mergedSections.values());
}
function sectionsToMarkdown(sections) {
    return sections
        .map((section) => {
        const header = "#".repeat(section.level) + " " + section.header;
        return `${header}\n\n${section.content}`;
    })
        .join("\n\n");
}
async function mergeMarkdown(targetPath, sourcePath, strategy) {
    const targetContent = await fs_1.promises.readFile(targetPath, "utf-8");
    const sourceContent = await fs_1.promises.readFile(sourcePath, "utf-8");
    const targetSections = parseMarkdown(targetContent);
    const sourceSections = parseMarkdown(sourceContent);
    const mergedSections = mergeSections(targetSections, sourceSections, strategy);
    return sectionsToMarkdown(mergedSections);
}
