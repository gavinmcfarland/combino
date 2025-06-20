import { readFileSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Include Target Ignore Test Suite", () => {
	const testDir = __dirname;
	const inputDir = join(testDir, "input", "base");
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
			templates: [inputDir],
		});
	});

	describe("Include with target directory", () => {
		it("should not copy included template files to the root output directory", () => {
			// The components directory should NOT exist at the root
			const rootComponentsPath = join(outputDir, "components");
			expect(existsSync(rootComponentsPath)).toBe(false);
		});

		it("should copy included template files to the specified target directory", () => {
			// The components should exist in the target directory
			const targetComponentsPath = join(
				outputDir,
				"src",
				"ui",
				"components",
				"Component.tsx",
			);
			expect(existsSync(targetComponentsPath)).toBe(true);

			const output = readFileSync(targetComponentsPath, "utf-8");
			const expected = readFileSync(
				join(expectedDir, "src", "ui", "components", "Component.tsx"),
				"utf-8",
			);
			expect(output).toBe(expected);
		});

		it("should handle nested files in included templates", () => {
			// Nested files should also be in the target directory
			const nestedComponentPath = join(
				outputDir,
				"src",
				"ui",
				"components",
				"nested",
				"NestedComponent.tsx",
			);
			expect(existsSync(nestedComponentPath)).toBe(true);

			const output = readFileSync(nestedComponentPath, "utf-8");
			const expected = readFileSync(
				join(
					expectedDir,
					"src",
					"ui",
					"components",
					"nested",
					"NestedComponent.tsx",
				),
				"utf-8",
			);
			expect(output).toBe(expected);
		});

		it("should still copy base template files to the root", () => {
			// Base template files should still be at the root
			const readmePath = join(outputDir, "README.md");
			expect(existsSync(readmePath)).toBe(true);

			const output = readFileSync(readmePath, "utf-8");
			const expected = readFileSync(
				join(expectedDir, "README.md"),
				"utf-8",
			);
			expect(output).toBe(expected);
		});

		it("should not have any components directory at the root level", () => {
			// Verify that no components directory exists at the root
			const rootComponentsPath = join(outputDir, "components");
			expect(existsSync(rootComponentsPath)).toBe(false);
		});
	});
});
