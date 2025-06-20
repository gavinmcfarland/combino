import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Key-based Array Merge Test Suite", () => {
	const testDir = __dirname;
	const inputDirs = ["base", "override"].map((dir) =>
		join(testDir, "input", dir)
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

	describe("Key-based array merging", () => {
		it("should merge arrays of objects based on key field", () => {
			const outputPath = join(outputDir, "tsconfig.json");
			const expectedPath = join(expectedDir, "tsconfig.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});

		it("should merge the correct reference object based on path key", () => {
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

		it("should preserve existing reference objects that don't match the key", () => {
			const outputPath = join(outputDir, "tsconfig.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Find the tsconfig.main.json reference
			const mainReference = output.references.find(
				(ref: any) => ref.path === "./tsconfig.main.json"
			);

			expect(mainReference).toBeDefined();
			expect(mainReference.compilerOptions.composite).toBe(true);
			expect(mainReference.compilerOptions.outDir).toBe("dist/main");
			expect(mainReference.include).toEqual([
				"src/main/**/*.ts",
				"src/main/**/*.js",
			]);
		});
	});
});
