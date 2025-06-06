import { promises as fs } from "fs";
export async function mergeText(targetPath, sourcePath, strategy) {
    const targetContent = await fs.readFile(targetPath, "utf-8");
    const sourceContent = await fs.readFile(sourcePath, "utf-8");
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
