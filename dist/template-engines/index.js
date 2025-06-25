/**
 * Check if a template engine dependency is available
 * @param engine The engine name to check
 * @returns Promise<boolean> True if the engine is available
 */
export async function isTemplateEngineAvailable(engine) {
    try {
        switch (engine.toLowerCase()) {
            case "ejs":
                return true; // EJS is always available as it's a core dependency
            case "handlebars":
                await import("handlebars");
                return true;
            case "mustache":
                await import("mustache");
                return true;
            default:
                return false;
        }
    }
    catch {
        return false;
    }
}
/**
 * Get installation instructions for a template engine
 * @param engine The engine name
 * @returns string Installation instructions
 */
export function getTemplateEngineInstallInstructions(engine) {
    switch (engine.toLowerCase()) {
        case "handlebars":
            return "npm install handlebars";
        case "mustache":
            return "npm install mustache";
        default:
            return "";
    }
}
export * from "./ejs.js";
export * from "./handlebars.js";
export * from "./mustache.js";
