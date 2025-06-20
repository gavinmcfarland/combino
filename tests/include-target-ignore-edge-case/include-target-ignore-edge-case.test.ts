import { readFileSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Include Target Ignore Edge Case Test Suite", () => {
	const testDir = __dirname;
	const baseDir = join(testDir, "input", "base");
	const frameworkDir = join(testDir, "input", "framework");
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
		// This simulates the figma example where both templates are passed programmatically
		await combino.combine({
			outputDir: outputDir,
			templates: [baseDir, frameworkDir],
		});
	});

	describe("Template passed programmatically and included with target", () => {
		it("should not copy components directory to the root when framework template is passed programmatically", () => {
			// The components directory should NOT exist at the root
			const rootComponentsPath = join(outputDir, "components");
			expect(existsSync(rootComponentsPath)).toBe(false);
		});

		it("should copy framework template files to the root (except components)", () => {
			// Framework template files should be at the root
			const packageJsonPath = join(outputDir, "package.json");
			expect(existsSync(packageJsonPath)).toBe(true);

			const output = readFileSync(packageJsonPath, "utf-8");
			const expected = readFileSync(
				join(expectedDir, "package.json"),
				"utf-8",
			);
			expect(output).toBe(expected);
		});

		it("should copy included components to the target directory", () => {
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
	});
});
