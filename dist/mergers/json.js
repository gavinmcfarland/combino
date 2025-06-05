"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeJson = mergeJson;
const fs_1 = require("fs");
const deepmerge_1 = __importDefault(require("deepmerge"));
// Custom array merge function that deduplicates items
const arrayMerge = (targetArray, sourceArray) => {
    return [...new Set([...targetArray, ...sourceArray])];
};
async function mergeJson(targetPath, sourcePath, strategy) {
    const targetContent = await fs_1.promises.readFile(targetPath, "utf-8");
    const sourceContent = await fs_1.promises.readFile(sourcePath, "utf-8");
    const targetJson = JSON.parse(targetContent);
    const sourceJson = JSON.parse(sourceContent);
    let merged;
    switch (strategy) {
        case "deep":
            merged = (0, deepmerge_1.default)(targetJson, sourceJson, {
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
