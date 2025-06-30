import { Combino } from "../../src/index.js";
import { ejs } from "../../src/plugins/ejs.js";
import { handlebars } from "../../src/plugins/handlebars.js";
import { mustache } from "../../src/plugins/mustache.js";

// Example 1: Using multiple plugins with file pattern matching
const combino1 = new Combino();

// Example 2: Using multiple plugins with content-based detection
const combino2 = new Combino();

// Example 3: Using a single plugin (backward compatibility)
const combino3 = new Combino();

// Example usage
async function runExample() {
    try {
        await combino1.combine({
            outputDir: "./output",
            include: ["./templates"],
            plugins: [
                ejs({ patterns: ["*.ejs", "*.ejs.*"], priority: 10 }),
                handlebars({ patterns: ["*.hbs", "*.handlebars", "*.hbs.*"], priority: 10 }),
                mustache({ patterns: ["*.mustache", "*.ms", "*.mustache.*"], priority: 10 }),
            ],
            data: {
                name: "World",
                items: ["item1", "item2", "item3"],
            },
        });
        console.log("Multi-engine example completed successfully!");
    } catch (error) {
        console.error("Error:", error);
    }
}

// Uncomment to run the example
// runExample();
