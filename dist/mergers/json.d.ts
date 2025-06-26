import { MergeStrategy } from "../types.js";
import { TemplateEngine } from "../template-engines/index.js";
export declare function mergeJson(targetPath: string, sourcePath: string, strategy: MergeStrategy, baseTemplatePath?: string, data?: Record<string, any>, templateEngine?: TemplateEngine | null): Promise<string>;
