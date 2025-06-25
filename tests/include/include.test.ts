import { rmSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Combino } from "../../src/index.js";
import { assertDirectoriesEqual } from "../utils/directory-compare.js";

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
		it("should correctly merge files from base and included templates", () => {
			// Compare the entire output directory with the expected directory
			assertDirectoriesEqual(outputDir, expectedDir, {
				ignoreWhitespace: true,
				parseJson: true,
			});
		});

		it("should correctly handle template overrides with multiple templates", () => {
			const outputPath = join(outputDir, "package.json");
			const output = JSON.parse(readFileSync(outputPath, "utf-8"));

			// Verify that override template takes precedence
			expect(output.name).toBe("override-project");
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
				"Component.tsx",
			);
			expect(() => readFileSync(outputPath, "utf-8")).not.toThrow();
		});
	});
});
