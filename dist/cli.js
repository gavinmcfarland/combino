#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const index_1 = require("./index");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ini = __importStar(require("ini"));
const program = new commander_1.Command();
program
    .name("combino")
    .description("Combine multiple template folders to generate custom file and folder structures")
    .version("0.1.0")
    .argument("<templates...>", "One or more template folders (first has lowest priority, last wins)")
    .option("-o, --output <dir>", "Output directory for the generated result", "./output")
    .option("-c, --config <path>", "Path to a .combino config file (INI or JSON)")
    .option("--data <key=value>", "Inline key-value data to use for templating, conditions, and naming", collectData)
    .action(async (templates, options) => {
    try {
        const combino = new index_1.Combino();
        const config = {};
        let templateData = {};
        // Load config file if specified
        if (options.config) {
            const configPath = path.resolve(options.config);
            if (!fs.existsSync(configPath)) {
                console.error(`Config file not found: ${configPath}`);
                process.exit(1);
            }
            const configContent = fs.readFileSync(configPath, "utf-8");
            const parsedConfig = ini.parse(configContent);
            // Extract data section and structure it properly
            if (parsedConfig.data) {
                // Convert flat data structure to nested
                Object.entries(parsedConfig.data).forEach(([key, value]) => {
                    const keys = key.split(".");
                    let current = templateData;
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
        }
        // Merge command line data with config data
        if (options.data) {
            Object.entries(options.data).forEach(([key, value]) => {
                const keys = key.split(".");
                let current = templateData;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = current[keys[i]] || {};
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
            });
        }
        const templateOptions = {
            targetDir: options.output,
            templates: templates,
            config: config.merge,
            data: templateData,
        };
        await combino.combine(templateOptions);
        console.log(`Successfully generated output in ${options.output}`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        else {
            console.error("An unknown error occurred");
        }
        process.exit(1);
    }
});
function collectData(value, previous = {}) {
    // Try to parse as JSON first
    try {
        const jsonData = JSON.parse(value);
        if (typeof jsonData === "object" && jsonData !== null) {
            return { ...previous, ...jsonData };
        }
    }
    catch {
        // If not valid JSON, try key=value format
        const [key, val] = value.split("=");
        if (!key || !val) {
            throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
        }
        return { ...previous, [key]: val };
    }
    throw new Error(`Invalid data format: ${value}. Expected key=value or valid JSON object`);
}
program.parse();
