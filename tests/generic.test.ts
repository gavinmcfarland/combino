import { readdirSync, statSync, rmSync, existsSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, it, beforeAll } from "vitest";
import { Combino } from "../src/index.js";
import { ejs } from "../src/plugins/ejs.js";
import { handlebars } from "../src/plugins/handlebars.js";
import { mustache } from "../src/plugins/mustache.js";
import { Plugin } from "../src/plugins/types.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestConfig {
	data?: Record<string, any>;
	inputDirs?: string[];
	skip?: boolean;
	reason?: string;
	description?: string;
	plugins?: string[]; // Array of plugin names like ["ejs", "handlebars"]
	pluginConfigs?: Record<string, any>;
}

// Plugin mapping
const pluginMap: Record<string, (options?: any) => Plugin> = {
	ejs: (options) => ejs(options),
	handlebars: (options) => handlebars(options),
	mustache: (options) => mustache(options),
};

// Helper to find all test case directories
function getTestCaseDirs(testsRoot: string): string[] {
	return readdirSync(testsRoot)
		.filter((name) => {
			const fullPath = join(testsRoot, name);
			return (
				statSync(fullPath).isDirectory() &&
				!name.startsWith(".") &&
				name !== "utils"
			);
		})
		.map((name) => join(testsRoot, name));
}

// Helper to get input directories (input/* or inputs/*)
function getInputDirs(testCaseDir: string): string[] {
	const inputRoot = join(testCaseDir, "input");
	const inputsRoot = join(testCaseDir, "inputs");
	if (statSync(inputRoot, { throwIfNoEntry: false })?.isDirectory()) {
		// If input/ contains subfolders, use them; else, use input/ itself
		const subdirs = readdirSync(inputRoot)
			.map((name) => join(inputRoot, name))
			.filter((p) => statSync(p).isDirectory());
		return subdirs.length > 0 ? subdirs : [inputRoot];
	} else if (statSync(inputsRoot, { throwIfNoEntry: false })?.isDirectory()) {
		return readdirSync(inputsRoot)
			.map((name) => join(inputsRoot, name))
			.filter((p) => statSync(p).isDirectory());
	}
	throw new Error(`No input/ or inputs/ directory found in ${testCaseDir}`);
}

// Helper to read test configuration
function getTestConfig(testCaseDir: string): TestConfig {
	const configPath = join(testCaseDir, "test-config.json");
	if (existsSync(configPath)) {
		try {
			return JSON.parse(readFileSync(configPath, "utf-8"));
		} catch (error) {
			console.warn(
				`Failed to parse test config for ${testCaseDir}:`,
				error,
			);
		}
	}

	// Default configuration
	return {
		data: { framework: "react" },
		plugins: ["ejs"], // Default to EJS for tests
	};
}

// Helper to get plugins from config
function getPluginsFromConfig(testConfig: TestConfig): Plugin[] {
	if (!testConfig.plugins || testConfig.plugins.length === 0) {
		return [ejs()]; // Default to EJS if no plugins specified
	}

	return testConfig.plugins.map((pluginName) => {
		const pluginFactory = pluginMap[pluginName];
		if (!pluginFactory) {
			throw new Error(
				`Unknown plugin: ${pluginName}. Available plugins: ${Object.keys(pluginMap).join(", ")}`,
			);
		}
		const pluginOptions = testConfig.pluginConfigs?.[pluginName] || {};
		return pluginFactory(pluginOptions);
	});
}

// Helper to get input directories for specific tests
function getInputDirsForTest(
	testConfig: TestConfig,
	testCaseDir: string,
): string[] {
	if (testConfig.inputDirs) {
		// Use custom input directories from config
		return testConfig.inputDirs.map((dir) => join(testCaseDir, dir));
	}
	return getInputDirs(testCaseDir);
}

// Main generic test runner
describe("Combino Integration Test Suite", () => {
	const testsRoot = join(__dirname);
	const testCaseDirs = getTestCaseDirs(testsRoot);

	testCaseDirs.forEach((testCaseDir) => {
		const testName = testCaseDir.split("/").pop()!;
		const outputDir = join(testCaseDir, "output");
		const expectedDir = join(testCaseDir, "expected");
		const configFile = [
			".combino",
			"config.combino",
			join(testCaseDir, "input", ".combino"),
			join(testCaseDir, "input", "config.combino"),
		].find((f) => existsSync(f));

		const testConfig = getTestConfig(testCaseDir);

		// Skip tests that don't have expected directories or are marked to skip
		if (!existsSync(expectedDir) || testConfig.skip) {
			it.skip(`${testName} - skipped - ${!existsSync(expectedDir) ? "no expected directory" : testConfig.reason || "marked to skip"}`, () => {
				// Test skipped
			});
			return;
		}

		it(`${testName}: ${testConfig.description || "should match expected output"}`, async () => {
			try {
				rmSync(outputDir, { recursive: true, force: true });
			} catch {}
			const inputDirs = getInputDirsForTest(testConfig, testCaseDir);
			const plugins = getPluginsFromConfig(testConfig);
			const combino = new Combino();
			await combino.combine({
				outputDir,
				include: inputDirs,
				data: testConfig.data || { framework: "react" },
				plugins: plugins,
				...(configFile ? { config: configFile } : {}),
			});
			assertDirectoriesEqual(outputDir, expectedDir, {
				ignoreWhitespace: true,
				parseJson: true,
			});
		});
	});
});
