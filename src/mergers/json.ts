import { promises as fs } from "fs";
import deepmerge from "deepmerge";
import { MergeStrategy } from "../types.js";

// Custom array merge function that handles key-based merging for objects
const arrayMerge = (targetArray: any[], sourceArray: any[]) => {
	if (!targetArray.length) return sourceArray;
	if (!sourceArray.length) return targetArray;

	const allItems = [...targetArray, ...sourceArray];

	// If all objects have 'path', use 'path' as the key
	const allHavePath = allItems.every(
		(item) => typeof item === "object" && item !== null && "path" in item
	);

	if (allHavePath) {
		const mergedMap = new Map();
		for (const item of allItems) {
			const { $key, ...rest } = item;
			const keyValue = item.path;
			if (mergedMap.has(keyValue)) {
				// Use deepmerge without recursive arrayMerge to avoid infinite recursion
				const merged = deepmerge(mergedMap.get(keyValue), rest, {
					arrayMerge: (target, source) => [
						...new Set([...target, ...source]),
					],
				});
				mergedMap.set(keyValue, merged);
			} else {
				mergedMap.set(keyValue, rest);
			}
		}
		return Array.from(mergedMap.values());
	}

	// Otherwise, use $key as a meta field to indicate the key field for that object
	const mergedMap = new Map();
	for (const item of allItems) {
		if (typeof item === "object" && item !== null && "$key" in item) {
			const keyField = item.$key;
			const keyValue = item[keyField];
			const { $key, ...rest } = item;
			if (mergedMap.has(keyValue)) {
				// Use deepmerge without recursive arrayMerge to avoid infinite recursion
				const merged = deepmerge(mergedMap.get(keyValue), rest, {
					arrayMerge: (target, source) => [
						...new Set([...target, ...source]),
					],
				});
				mergedMap.set(keyValue, merged);
			} else {
				mergedMap.set(keyValue, rest);
			}
		} else if (typeof item === "object" && item !== null) {
			// Try to use 'name' or 'id' as fallback
			const keyField =
				"name" in item ? "name" : "id" in item ? "id" : undefined;
			if (keyField) {
				const keyValue = item[keyField];
				if (mergedMap.has(keyValue)) {
					// Use deepmerge without recursive arrayMerge to avoid infinite recursion
					const merged = deepmerge(mergedMap.get(keyValue), item, {
						arrayMerge: (target, source) => [
							...new Set([...target, ...source]),
						],
					});
					mergedMap.set(keyValue, merged);
				} else {
					mergedMap.set(keyValue, item);
				}
			} else {
				// No key, deduplicate by JSON string
				const str = JSON.stringify(item);
				if (!mergedMap.has(str)) {
					mergedMap.set(str, item);
				}
			}
		} else {
			// Non-object, deduplicate by value
			const str = JSON.stringify(item);
			if (!mergedMap.has(str)) {
				mergedMap.set(str, item);
			}
		}
	}
	return Array.from(mergedMap.values());
};

// Custom merge function that ensures our array merge is used consistently
const customMerge = (target: any, source: any) => {
	// If both are arrays, use our custom array merge
	if (Array.isArray(target) && Array.isArray(source)) {
		return arrayMerge(target, source);
	}

	// For objects, use deepmerge with our custom array merge
	if (
		typeof target === "object" &&
		target !== null &&
		typeof source === "object" &&
		source !== null
	) {
		return deepmerge(target, source, {
			arrayMerge,
		});
	}

	// For other types, use source value
	return source;
};

export async function mergeJson(
	targetPath: string,
	sourcePath: string,
	strategy: MergeStrategy,
	baseTemplatePath?: string
): Promise<string> {
	const targetContent = await fs
		.readFile(targetPath, "utf-8")
		.catch(() => "");
	const sourceContent = await fs.readFile(sourcePath, "utf-8");

	// Handle empty or blank files by treating them as empty objects
	const targetJson = targetContent.trim() ? JSON.parse(targetContent) : {};
	const sourceJson = sourceContent.trim() ? JSON.parse(sourceContent) : {};

	// Get base template for property order if provided
	let baseJson: any = {};
	if (baseTemplatePath) {
		try {
			const baseContent = await fs.readFile(baseTemplatePath, "utf-8");
			baseJson = baseContent.trim() ? JSON.parse(baseContent) : {};
		} catch (error) {
			// If base template doesn't exist, fall back to target/source logic
			baseJson = {};
		}
	}

	let merged: any;
	switch (strategy) {
		case "deep":
			merged = deepmerge(targetJson, sourceJson, {
				arrayMerge,
			});
			// Use base template for property order if available, otherwise fall back to target/source logic
			if (Object.keys(baseJson).length > 0) {
				merged = preservePropertyOrder(baseJson, merged);
			} else if (Object.keys(targetJson).length === 0) {
				merged = preservePropertyOrder(sourceJson, merged);
			} else {
				merged = preservePropertyOrder(targetJson, merged);
			}
			break;
		case "shallow":
			merged = { ...targetJson, ...sourceJson };
			if (Object.keys(baseJson).length > 0) {
				merged = preservePropertyOrder(baseJson, merged);
			} else if (Object.keys(targetJson).length === 0) {
				merged = preservePropertyOrder(sourceJson, merged);
			} else {
				merged = preservePropertyOrder(targetJson, merged);
			}
			break;
		case "replace":
			merged = sourceJson;
			break;
		default:
			throw new Error(`Unsupported merge strategy for JSON: ${strategy}`);
	}

	return JSON.stringify(merged, null, 2);
}

// Helper function to preserve property order from base template
function preservePropertyOrder(baseTemplate: any, mergedObject: any): any {
	const result: any = {};

	// First, add properties in the order they appear in the base template
	for (const key of Object.keys(baseTemplate)) {
		if (key in mergedObject) {
			result[key] = mergedObject[key];
		}
	}

	// Then, add any new properties from the merged object that weren't in the base template
	for (const key of Object.keys(mergedObject)) {
		if (!(key in baseTemplate)) {
			result[key] = mergedObject[key];
		}
	}

	return result;
}
