import { promises as fs } from "fs";
import deepmerge from "deepmerge";
import ejs from "ejs";
// Custom array merge function that handles key-based merging for objects
const arrayMerge = (targetArray, sourceArray) => {
    if (!targetArray.length)
        return sourceArray;
    if (!sourceArray.length)
        return targetArray;
    const allItems = [...targetArray, ...sourceArray];
    // If all objects have 'path', use 'path' as the key
    const allHavePath = allItems.every((item) => typeof item === "object" && item !== null && "path" in item);
    if (allHavePath) {
        const mergedMap = new Map();
        const targetKeys = new Set();
        // First, add all target items to establish the base order
        for (const item of targetArray) {
            const { $key, ...rest } = item;
            const keyValue = item.path;
            mergedMap.set(keyValue, rest);
            targetKeys.add(keyValue);
        }
        // Then merge with source items
        for (const item of sourceArray) {
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
            }
            else {
                mergedMap.set(keyValue, rest);
            }
        }
        // Return items in the order they appear in targetArray, then any new items
        const result = [];
        // First, add items in the order they appear in targetArray
        for (const item of targetArray) {
            const keyValue = item.path;
            if (mergedMap.has(keyValue)) {
                result.push({ path: keyValue, ...mergedMap.get(keyValue) });
            }
        }
        // Then add any new items from sourceArray that weren't in targetArray
        for (const item of sourceArray) {
            const keyValue = item.path;
            if (!targetKeys.has(keyValue)) {
                result.push({ path: keyValue, ...mergedMap.get(keyValue) });
            }
        }
        return result;
    }
    // Otherwise, use $key as a meta field to indicate the key field for that object
    const mergedMap = new Map();
    const targetKeys = new Set();
    // First, add all target items to establish the base order
    for (const item of targetArray) {
        if (typeof item === "object" && item !== null && "$key" in item) {
            const keyField = item.$key;
            const keyValue = item[keyField];
            const { $key, ...rest } = item;
            mergedMap.set(keyValue, rest);
            targetKeys.add(keyValue);
        }
        else if (typeof item === "object" && item !== null) {
            // Try to use 'name' or 'id' as fallback
            const keyField = "name" in item ? "name" : "id" in item ? "id" : undefined;
            if (keyField) {
                const keyValue = item[keyField];
                mergedMap.set(keyValue, item);
                targetKeys.add(keyValue);
            }
            else {
                // No key, deduplicate by JSON string
                const str = JSON.stringify(item);
                mergedMap.set(str, item);
                targetKeys.add(str);
            }
        }
        else {
            // Non-object, deduplicate by value
            const str = JSON.stringify(item);
            mergedMap.set(str, item);
            targetKeys.add(str);
        }
    }
    // Then merge with source items
    for (const item of sourceArray) {
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
            }
            else {
                mergedMap.set(keyValue, rest);
            }
        }
        else if (typeof item === "object" && item !== null) {
            // Try to use 'name' or 'id' as fallback
            const keyField = "name" in item ? "name" : "id" in item ? "id" : undefined;
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
                }
                else {
                    mergedMap.set(keyValue, item);
                }
            }
            else {
                // No key, deduplicate by JSON string
                const str = JSON.stringify(item);
                if (!mergedMap.has(str)) {
                    mergedMap.set(str, item);
                }
            }
        }
        else {
            // Non-object, deduplicate by value
            const str = JSON.stringify(item);
            if (!mergedMap.has(str)) {
                mergedMap.set(str, item);
            }
        }
    }
    // Return items in the order they appear in targetArray, then any new items
    const result = [];
    // First, add items in the order they appear in targetArray
    for (const item of targetArray) {
        let keyValue;
        if (typeof item === "object" && item !== null && "$key" in item) {
            const keyField = item.$key;
            keyValue = item[keyField];
        }
        else if (typeof item === "object" && item !== null) {
            const keyField = "name" in item ? "name" : "id" in item ? "id" : undefined;
            if (keyField) {
                keyValue = item[keyField];
            }
            else {
                keyValue = JSON.stringify(item);
            }
        }
        else {
            keyValue = JSON.stringify(item);
        }
        if (mergedMap.has(keyValue)) {
            if (typeof item === "object" && item !== null && "$key" in item) {
                const keyField = item.$key;
                result.push({
                    [keyField]: keyValue,
                    ...mergedMap.get(keyValue),
                });
            }
            else {
                result.push(mergedMap.get(keyValue));
            }
        }
    }
    // Then add any new items from sourceArray that weren't in targetArray
    for (const item of sourceArray) {
        let keyValue;
        if (typeof item === "object" && item !== null && "$key" in item) {
            const keyField = item.$key;
            keyValue = item[keyField];
        }
        else if (typeof item === "object" && item !== null) {
            const keyField = "name" in item ? "name" : "id" in item ? "id" : undefined;
            if (keyField) {
                keyValue = item[keyField];
            }
            else {
                keyValue = JSON.stringify(item);
            }
        }
        else {
            keyValue = JSON.stringify(item);
        }
        if (!targetKeys.has(keyValue)) {
            if (typeof item === "object" && item !== null && "$key" in item) {
                const keyField = item.$key;
                result.push({
                    [keyField]: keyValue,
                    ...mergedMap.get(keyValue),
                });
            }
            else {
                result.push(mergedMap.get(keyValue));
            }
        }
    }
    return result;
};
// Custom merge function that ensures our array merge is used consistently
const customMerge = (target, source) => {
    // If both are arrays, use our custom array merge
    if (Array.isArray(target) && Array.isArray(source)) {
        return arrayMerge(target, source);
    }
    // For objects, use deepmerge with our custom array merge
    if (typeof target === "object" &&
        target !== null &&
        typeof source === "object" &&
        source !== null) {
        return deepmerge(target, source, {
            arrayMerge,
        });
    }
    // For other types, use source value
    return source;
};
export async function mergeJson(targetPath, sourcePath, strategy, baseTemplatePath, data) {
    const targetContent = await fs
        .readFile(targetPath, "utf-8")
        .catch(() => "");
    const sourceContent = await fs.readFile(sourcePath, "utf-8");
    // Process EJS templates before parsing JSON
    const processTemplate = async (content, templateData) => {
        if (!templateData || !content.includes("<%")) {
            return content;
        }
        try {
            return await ejs.render(content, templateData, { async: true });
        }
        catch (error) {
            console.error("Error processing template:", error);
            return content;
        }
    };
    const processedTargetContent = await processTemplate(targetContent, data);
    const processedSourceContent = await processTemplate(sourceContent, data);
    // Handle empty or blank files by treating them as empty objects
    const targetJson = processedTargetContent.trim() ? JSON.parse(processedTargetContent) : {};
    const sourceJson = processedSourceContent.trim() ? JSON.parse(processedSourceContent) : {};
    // Get base template for property order if provided
    let baseJson = {};
    if (baseTemplatePath) {
        try {
            const baseContent = await fs.readFile(baseTemplatePath, "utf-8");
            const processedBaseContent = await processTemplate(baseContent, data);
            baseJson = processedBaseContent.trim() ? JSON.parse(processedBaseContent) : {};
        }
        catch (error) {
            // If base template doesn't exist, fall back to target/source logic
            baseJson = {};
        }
    }
    let merged;
    switch (strategy) {
        case "deep":
            merged = deepmerge(targetJson, sourceJson, {
                arrayMerge,
            });
            // Use base template for property order if available, otherwise fall back to target/source logic
            if (Object.keys(baseJson).length > 0) {
                merged = preservePropertyOrder(baseJson, merged);
            }
            else if (Object.keys(targetJson).length === 0) {
                merged = preservePropertyOrder(sourceJson, merged);
            }
            else {
                merged = preservePropertyOrder(targetJson, merged);
            }
            break;
        case "shallow":
            merged = { ...targetJson, ...sourceJson };
            if (Object.keys(baseJson).length > 0) {
                merged = preservePropertyOrder(baseJson, merged);
            }
            else if (Object.keys(targetJson).length === 0) {
                merged = preservePropertyOrder(sourceJson, merged);
            }
            else {
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
function preservePropertyOrder(baseTemplate, mergedObject) {
    const result = {};
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
