import { promises as fs } from "fs";
import deepmerge from "deepmerge";
import { MergeStrategy } from "../types.js";

// Custom array merge function that deduplicates items
const arrayMerge = (targetArray: any[], sourceArray: any[]) => {
	return [...new Set([...targetArray, ...sourceArray])];
};

export async function mergeJson(
	targetPath: string,
	sourcePath: string,
	strategy: MergeStrategy
): Promise<string> {
	const targetContent = await fs.readFile(targetPath, "utf-8");
	const sourceContent = await fs.readFile(sourcePath, "utf-8");

	const targetJson = JSON.parse(targetContent);
	const sourceJson = JSON.parse(sourceContent);

	let merged: any;
	switch (strategy) {
		case "deep":
			merged = deepmerge(targetJson, sourceJson, {
				arrayMerge,
			});
			break;
		case "shallow":
			merged = { ...targetJson, ...sourceJson };
			break;
		case "replace":
			merged = sourceJson;
			break;
		default:
			throw new Error(`Unsupported merge strategy for JSON: ${strategy}`);
	}

	return JSON.stringify(merged, null, 2);
}
