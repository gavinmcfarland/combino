"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeText = mergeText;
const fs_1 = require("fs");
async function mergeText(targetPath, sourcePath, strategy) {
    const targetContent = await fs_1.promises.readFile(targetPath, "utf-8");
    const sourceContent = await fs_1.promises.readFile(sourcePath, "utf-8");
    switch (strategy) {
        case "append":
            return targetContent + "\n" + sourceContent;
        case "prepend":
            return sourceContent + "\n" + targetContent;
        case "replace":
            return sourceContent;
        default:
            throw new Error(`Unsupported merge strategy for text: ${strategy}`);
    }
}
