import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { Combino } from "../src";

describe("Basic Test Suite", () => {
  const testDir = join(__dirname, "basic");
  const inputDirs = ["base", "typescript"].map((dir) =>
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
      targetDir: outputDir,
      templates: inputDirs,
    });
  });

  describe("Markdown file merging", () => {
    it("should correctly merge markdown files from multiple input folders", () => {
      const outputPath = join(outputDir, "README.md");
      const expectedPath = join(testDir, "expected", "README.md");

      const output = readFileSync(outputPath, "utf-8");
      const expected = readFileSync(expectedPath, "utf-8");

      expect(output).toBe(expected);
    });
  });

  describe("JSON file merging", () => {
    it("should correctly merge JSON files from multiple input folders", () => {
      const outputPath = join(outputDir, "package.json");
      const expectedPath = join(testDir, "expected", "package.json");

      const output = JSON.parse(readFileSync(outputPath, "utf-8"));
      const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

      expect(output).toEqual(expected);
    });
  });
});
