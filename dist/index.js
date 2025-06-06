"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Combino = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const gray_matter_1 = __importDefault(require("gray-matter"));
const ejs_1 = __importDefault(require("ejs"));
const expr_eval_1 = require("expr-eval");
const json_1 = require("./mergers/json");
const markdown_1 = require("./mergers/markdown");
const text_1 = require("./mergers/text");
const ini = __importStar(require("ini"));
class Combino {
    async readFile(filePath) {
        const content = await fs_1.promises.readFile(filePath, "utf-8");
        const { data, content: fileContent } = (0, gray_matter_1.default)(content);
        return {
            content: fileContent,
            config: data,
        };
    }
    async readCombinoConfig(templatePath) {
        const configPath = path_1.default.join(templatePath, ".combino");
        try {
            const content = await fs_1.promises.readFile(configPath, "utf-8");
            const lines = content.split("\n");
            const config = {};
            let currentSection = null;
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine)
                    continue;
                if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
                    currentSection = trimmedLine.slice(1, -1);
                    if (currentSection === "ignore") {
                        config.ignore = [];
                    }
                    else if (currentSection === "data") {
                        config.data = {};
                    }
                }
                else if (currentSection === "ignore" && config.ignore) {
                    config.ignore.push(trimmedLine);
                }
                else if (currentSection === "data" && config.data) {
                    const [key, value] = trimmedLine
                        .split("=")
                        .map((s) => s.trim());
                    if (key && value) {
                        // Remove quotes from value if present
                        const cleanValue = value.replace(/^["']|["']$/g, "");
                        // Handle nested properties (e.g., "project.name")
                        const keys = key.split(".");
                        let current = config.data;
                        for (let i = 0; i < keys.length - 1; i++) {
                            current[keys[i]] = current[keys[i]] || {};
                            current = current[keys[i]];
                        }
                        current[keys[keys.length - 1]] = cleanValue;
                    }
                }
            }
            return config;
        }
        catch (error) {
            return {};
        }
    }
    async readConfigFile(configPath) {
        try {
            const content = await fs_1.promises.readFile(configPath, "utf-8");
            const parsedConfig = ini.parse(content);
            const config = {};
            // Extract data section and structure it properly
            if (parsedConfig.data) {
                config.data = {};
                // Convert flat data structure to nested
                Object.entries(parsedConfig.data).forEach(([key, value]) => {
                    const keys = key.split(".");
                    let current = config.data;
                    for (let i = 0; i < keys.length - 1; i++) {
                        current[keys[i]] = current[keys[i]] || {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                });
            }
            // Extract merge config
            if (parsedConfig.merge) {
                config.merge = parsedConfig.merge;
            }
            return config;
        }
        catch (error) {
            console.error("Error reading config file:", error);
            return {};
        }
    }
    async processTemplate(content, data) {
        try {
            return await ejs_1.default.render(content, data, { async: true });
        }
        catch (error) {
            console.error("Error processing template:", error);
            return content;
        }
    }
    evaluateCondition(condition, data) {
        try {
            // Remove the [ and ] from the condition
            const cleanCondition = condition.slice(1, -1);
            // Replace operators to be compatible with expr-eval
            const parsedCondition = cleanCondition
                .replace(/&&/g, " and ")
                .replace(/\|\|/g, " or ");
            // Create a parser instance
            const parser = new expr_eval_1.Parser();
            // Create a scope with the data
            const scope = Object.entries(data).reduce((acc, [key, value]) => {
                // Handle nested properties
                const keys = key.split(".");
                let current = acc;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = current[keys[i]] || {};
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
                return acc;
            }, {});
            // Parse and evaluate the expression
            const expr = parser.parse(parsedCondition);
            return expr.evaluate(scope);
        }
        catch (error) {
            console.error("Error evaluating condition:", error);
            return false;
        }
    }
    async getFilesInTemplate(templatePath, ignorePatterns, data) {
        try {
            const files = await (0, glob_1.glob)("**/*", {
                cwd: templatePath,
                nodir: true,
                ignore: ignorePatterns,
                dot: true,
            });
            const filteredFiles = files.filter((file) => {
                // First check if the file should be ignored
                if (ignorePatterns.some((pattern) => {
                    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
                    return regex.test(file);
                })) {
                    return false;
                }
                // Check each directory and file part in the path for conditions
                const parts = file.split(path_1.default.sep);
                for (const part of parts) {
                    if (part.includes("[") && part.includes("]")) {
                        // Extract the condition from the part
                        const conditionMatch = part.match(/\[[^\]]+\]/);
                        if (conditionMatch) {
                            const condition = conditionMatch[0];
                            // If any condition in the path is false, exclude the file
                            const result = this.evaluateCondition(condition, data);
                            if (typeof result === "boolean" && !result) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            });
            // Transform the file paths to handle conditional folders and file extensions
            const mappedFiles = filteredFiles.map((file) => {
                const parts = file.split(path_1.default.sep);
                const transformedParts = parts
                    .map((part) => {
                    if (part.includes("[") && part.includes("]")) {
                        // Extract the condition from the part
                        const conditionMatch = part.match(/\[[^\]]+\]/);
                        if (conditionMatch) {
                            const condition = conditionMatch[0];
                            // If the part is just the condition, return empty string
                            if (part === condition) {
                                return "";
                            }
                            // Evaluate the condition and get the result
                            const result = this.evaluateCondition(condition, data);
                            // If it's a boolean result, remove the condition
                            if (typeof result === "boolean") {
                                return part.replace(condition, "");
                            }
                            // If it's a string result (from ternary), use it
                            return part.replace(condition, result);
                        }
                    }
                    return part;
                })
                    .filter(Boolean); // Remove empty strings
                return {
                    sourcePath: path_1.default.join(templatePath, file),
                    targetPath: path_1.default.join(...transformedParts),
                };
            });
            return mappedFiles;
        }
        catch (error) {
            throw new Error(`Failed to get files in template: ${error}`);
        }
    }
    getMergeStrategy(filePath, config) {
        if (config?.merge?.strategy) {
            return config.merge.strategy;
        }
        const ext = path_1.default.extname(filePath).toLowerCase();
        switch (ext) {
            case ".json":
                return "deep";
            case ".md":
                return "replace";
            default:
                return "replace";
        }
    }
    async mergeFiles(targetPath, sourcePath, strategy, data) {
        const ext = path_1.default.extname(targetPath).toLowerCase();
        let mergedContent;
        switch (ext) {
            case ".json":
                mergedContent = await (0, json_1.mergeJson)(targetPath, sourcePath, strategy);
                break;
            case ".md":
                mergedContent = await (0, markdown_1.mergeMarkdown)(targetPath, sourcePath, strategy);
                break;
            default:
                mergedContent = await (0, text_1.mergeText)(targetPath, sourcePath, strategy);
        }
        // Process the merged content with EJS
        return this.processTemplate(mergedContent, data);
    }
    async combine(options) {
        const { outputDir, templates, data: externalData = {}, config, } = options;
        // Create target directory if it doesn't exist
        await fs_1.promises.mkdir(outputDir, { recursive: true });
        // First, collect ignore patterns and data from all templates
        const allIgnorePatterns = new Set([
            "node_modules/**",
            ".combino",
        ]);
        const allData = { ...externalData }; // Start with external data
        // Load config if specified
        if (typeof config === "string" && (await fileExists(config))) {
            const configPath = path_1.default.resolve(config);
            const loadedConfig = await this.readConfigFile(configPath);
            if (loadedConfig.data) {
                Object.assign(allData, loadedConfig.data);
            }
            if (loadedConfig.merge) {
                options.config = loadedConfig.merge;
            }
        }
        for (const template of templates) {
            const config = await this.readCombinoConfig(template);
            if (config.ignore) {
                config.ignore.forEach((pattern) => allIgnorePatterns.add(pattern));
            }
            if (config.data) {
                Object.assign(allData, config.data); // Merge config data, allowing external data to override
            }
        }
        // First, copy all files from the first template
        const firstTemplate = templates[0];
        const firstTemplateFiles = await this.getFilesInTemplate(firstTemplate, Array.from(allIgnorePatterns), allData);
        for (const { sourcePath, targetPath } of firstTemplateFiles) {
            const fullTargetPath = path_1.default.join(outputDir, targetPath);
            await fs_1.promises.mkdir(path_1.default.dirname(fullTargetPath), { recursive: true });
            // Read and process the source file with EJS
            const content = await fs_1.promises.readFile(sourcePath, "utf-8");
            const processedContent = await this.processTemplate(content, allData);
            await fs_1.promises.writeFile(fullTargetPath, processedContent);
        }
        // Then merge files from subsequent templates
        for (let i = 1; i < templates.length; i++) {
            const template = templates[i];
            const files = await this.getFilesInTemplate(template, Array.from(allIgnorePatterns), allData);
            for (const { sourcePath, targetPath } of files) {
                const fullTargetPath = path_1.default.join(outputDir, targetPath);
                // Create target directory if it doesn't exist
                await fs_1.promises.mkdir(path_1.default.dirname(fullTargetPath), {
                    recursive: true,
                });
                // Read source file
                const sourceContent = await this.readFile(sourcePath);
                const strategy = this.getMergeStrategy(targetPath, sourceContent.config);
                try {
                    const targetContent = await this.readFile(fullTargetPath);
                    const mergedContent = await this.mergeFiles(fullTargetPath, sourcePath, strategy, allData);
                    await fs_1.promises.writeFile(fullTargetPath, mergedContent);
                }
                catch (error) {
                    // If target doesn't exist, just copy and process the source
                    const content = await fs_1.promises.readFile(sourcePath, "utf-8");
                    const processedContent = await this.processTemplate(content, allData);
                    await fs_1.promises.writeFile(fullTargetPath, processedContent);
                }
            }
        }
    }
}
exports.Combino = Combino;
async function fileExists(path) {
    try {
        await fs_1.promises.access(path);
        return true;
    }
    catch {
        return false;
    }
}
