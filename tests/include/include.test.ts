import { readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Include Test Suite", () => {
	const testDir = __dirname;
	const inputDir = join(testDir, "input", "included");
	const overrideDir = join(testDir, "input", "override");
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
			templates: [inputDir, overrideDir],
			data: {
				project: {
					name: "extended-project",
					description: "An extended project",
				},
				framework: "react",
			},
		});
	});

	describe("File merging with inclusion", () => {
		it("should correctly merge markdown files from base and included templates", () => {
			const outputPath = join(outputDir, "README.md");
			const expectedPath = join(expectedDir, "README.md");

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});

		it("should correctly merge JSON files from base and included templates", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(expectedDir, "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});

		it("should correctly handle template overrides with multiple templates", () => {
			const outputPath = join(outputDir, "package.json");
			const expectedPath = join(expectedDir, "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			// Verify that override template takes precedence
			expect(output).toEqual(expected);
			expect(output.name).toBe("override-project");
		});

		it("should place files in the correct target directory when specified", () => {
			// Test that files from the included template are placed in the specified target directory
			const outputPath = join(
				outputDir,
				"src",
				"components",
				"Component.tsx"
			);
			const expectedPath = join(
				expectedDir,
				"src",
				"components",
				"Component.tsx"
			);

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});

		it("should handle nested target directory mappings", () => {
			// Test that nested target directories are created correctly
			const outputPath = join(
				outputDir,
				"src",
				"components",
				"nested",
				"NestedComponent.tsx"
			);
			const expectedPath = join(
				expectedDir,
				"src",
				"components",
				"nested",
				"NestedComponent.tsx"
			);

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});

		it("should correctly process EJS templates in include paths", async () => {
			// Test with a different framework
			const vueOutputDir = join(testDir, "output-vue");
			try {
				rmSync(vueOutputDir, { recursive: true, force: true });
			} catch (error) {
				// Ignore error if directory doesn't exist
			}

			const combino = new Combino();
			await combino.combine({
				outputDir: vueOutputDir,
				templates: [inputDir],
				data: {
					project: {
						name: "vue-project",
						description: "A Vue project",
					},
					framework: "vue",
				},
			});

			// Verify that the Vue components were included
			const outputPath = join(
				vueOutputDir,
				"src",
				"components",
				"Component.tsx"
			);
			expect(() => readFileSync(outputPath, "utf-8")).not.toThrow();
		});
	});
});
