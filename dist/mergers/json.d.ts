import { MergeStrategy } from "../types.js";
export declare function mergeJson(targetPath: string, sourcePath: string, strategy: MergeStrategy, baseTemplatePath?: string, data?: Record<string, any>): Promise<string>;
