import { Combino } from "../../src/index.js";
import { ejs } from "../../src/plugins/ejs.js";
import { handlebars } from "../../src/plugins/handlebars.js";
import { mustache } from "../../src/plugins/mustache.js";

// Example 1: Using plugins with the new architecture
const combino1 = new Combino();

await combino1.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejs(), // Use EJS for all files (no patterns specified)
        handlebars({
            patterns: ["*.hbs", "*.handlebars"], // Use Handlebars for specific patterns
        }),
        mustache({
            patterns: ["*.mustache", "*.ms"],
            priority: 10, // Higher priority than other plugins
        }),
    ],
    data: {
        name: "World",
        items: ["item1", "item2", "item3"],
    },
});

// Example 2: Using plugins with content-based detection
const combino2 = new Combino();

await combino2.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejs({ priority: 5 }),
        handlebars({ priority: 5 }),
        mustache({ priority: 5 }),
    ],
    data: { name: "World" },
});

// Example 3: Using plugins with custom options
const combino3 = new Combino();

await combino3.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejs({
            patterns: ["*.ejs", "*.js"],
            priority: 10,
            customOption: "value", // Custom options are supported
        }),
        handlebars({
            patterns: ["*.hbs"],
            priority: 5,
        }),
    ],
    data: { name: "World" },
});

// Example 4: Backward compatibility - still works with templateEngine
const combino4 = new Combino();

await combino4.combine({
    outputDir: "./output",
    include: ["./templates"],
    templateEngine: "ejs", // Legacy support still works
    data: { name: "World" },
});

// Example 5: Using plugin factory functions directly
const combino5 = new Combino();

await combino5.combine({
    outputDir: "./output",
    include: ["./templates"],
    plugins: [
        ejs({ patterns: ["*.ejs"] }),
        handlebars({ patterns: ["*.hbs"] }),
        mustache({ patterns: ["*.mustache"] }),
    ],
    data: { name: "World" },
});

console.log("Plugin architecture examples completed successfully!");
