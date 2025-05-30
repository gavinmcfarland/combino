import { readFileSync } from "fs";
import { join } from "path";

describe("Basic Test Suite", () => {
	const testDir = join(__dirname, "basic-test");
	const inputDirs = ["basic", "typescript"];

	describe("Markdown file merging", () => {
		it("should correctly merge markdown files from multiple input folders", () => {
			const outputPath = join(testDir, "output", "README.md");
			const expectedPath = join(testDir, "expected", "README.md");

			const output = readFileSync(outputPath, "utf-8");
			const expected = readFileSync(expectedPath, "utf-8");

			expect(output).toBe(expected);
		});
	});

	describe("JSON file merging", () => {
		it("should correctly merge JSON files from multiple input folders", () => {
			const outputPath = join(testDir, "output", "package.json");
			const expectedPath = join(testDir, "expected", "package.json");

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

			expect(output).toEqual(expected);
		});
	});
});
