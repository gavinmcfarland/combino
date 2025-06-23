import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";
import * as jsonc from "jsonc-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to parse JSON with comments (same as in the merger)
function parseJsonWithComments(content: string): any {
	try {
		// First try standard JSON.parse
		return JSON.parse(content);
	} catch (error) {
		// If that fails, try parsing with comments
		try {
			const errors: jsonc.ParseError[] = [];
			const result = jsonc.parse(content, errors);
			if (errors.length > 0) {
				throw new Error(
					`JSON parsing errors: ${errors.map((e) => `Error at ${e.offset}: ${e.length} characters`).join(", ")}`,
				);
			}
			return result;
		} catch (jsoncError) {
			throw new Error(
				`Failed to parse JSON with comments: ${jsoncError}`,
			);
		}
	}
}

describe("tsconfig.ui.json Include Array Merge Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["basic", "svelte"].map((dir) =>
		join(testDir, "input", dir),
	);
	const outputDir = join(testDir, "output");
	const expectedDir = join(testDir, "expected");

	beforeAll(async () => {
		// Clean up output directory before running tests
		try {
			rmSync(outputDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore error if directory doesn't exist
		}

		const combino = new Combino();
		await combino.combine({
			outputDir: outputDir,
			templates: inputDirs,
		});
	});

	describe("tsconfig.ui.json include array merging", () => {
		it("should correctly merge include arrays from basic and svelte templates", () => {
			const outputPath = join(outputDir, "tsconfig.ui.json");
			const expectedPath = join(expectedDir, "tsconfig.ui.json");

			const output = parseJsonWithComments(
				readFileSync(outputPath, "utf-8"),
			);
			const expected = parseJsonWithComments(
				readFileSync(expectedPath, "utf-8"),
			);

			expect(output).toEqual(expected);
		});

		it("should include all file patterns in the merged include array", () => {
			const outputPath = join(outputDir, "tsconfig.ui.json");
			const output = parseJsonWithComments(
				readFileSync(outputPath, "utf-8"),
			);

			// Verify that all expected patterns are included
			expect(output.include).toContain("src/**/*.ts");
			expect(output.include).toContain("src/**/*.js");
			expect(output.include).toContain("src/**/*.svelte");

			// Verify the array has exactly 3 items
			expect(output.include).toHaveLength(3);
		});

		it("should preserve the extends and compilerOptions from the svelte template", () => {
			const outputPath = join(outputDir, "tsconfig.ui.json");
			const output = parseJsonWithComments(
				readFileSync(outputPath, "utf-8"),
			);

			// Verify extends is preserved
			expect(output.extends).toBe("@tsconfig/svelte/tsconfig.json");

			// Verify compilerOptions are preserved
			expect(output.compilerOptions).toBeDefined();
			expect(output.compilerOptions.target).toBe("ES2022");
			expect(output.compilerOptions.useDefineForClassFields).toBe(true);
			expect(output.compilerOptions.module).toBe("ESNext");
			expect(output.compilerOptions.resolveJsonModule).toBe(true);
			expect(output.compilerOptions.allowJs).toBe(true);
			expect(output.compilerOptions.checkJs).toBe(true);
			expect(output.compilerOptions.isolatedModules).toBe(true);
			expect(output.compilerOptions.moduleDetection).toBe("force");
		});
	});
});
