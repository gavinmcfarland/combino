import { MergeStrategy } from "../types.js";
export declare function mergeJson(targetPath: string, sourcePath: string, strategy: MergeStrategy, baseTemplatePath?: string): Promise<string>;
