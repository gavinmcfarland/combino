import { MergeStrategy } from "../types.js";
export declare function mergeMarkdown(existingPath: string, // Path to the existing file (target)
newPath: string, // Path to the new file (source)
strategy: MergeStrategy): Promise<string>;
