import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Figma Reproduce Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "svelte"].map((dir) =>
		join(testDir, "input", dir)
	);
	const outputDir = join(testDir, "output");

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

	describe("Figma reproduce issue", () => {
		it("should not have $key property in final output", () => {
			const outputPath = join(outputDir, "tsconfig.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Check that no object has a $key property
			const hasKeyProperty = output.references.some(
				(ref: any) => "$key" in ref
			);
			expect(hasKeyProperty).toBe(false);
		});

		it("should merge the tsconfig.ui.json reference correctly", () => {
			const outputPath = join(outputDir, "tsconfig.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Find the tsconfig.ui.json reference
			const uiReference = output.references.find(
				(ref: any) => ref.path === "./tsconfig.ui.json"
			);

			expect(uiReference).toBeDefined();
			expect(uiReference.extends).toBe("@tsconfig/svelte/tsconfig.json");
			expect(uiReference.include).toContain("src/**/*.svelte");
			expect(uiReference.include).toContain("src/**/*.ts");
			expect(uiReference.include).toContain("src/**/*.js");
		});

		it("should not have duplicate references", () => {
			const outputPath = join(outputDir, "tsconfig.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Check that there's only one reference for each path
			const paths = output.references.map((ref: any) => ref.path);
			const uniquePaths = [...new Set(paths)];
			expect(paths.length).toBe(uniquePaths.length);
		});
	});
});
