import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
	compareDirectories,
	assertDirectoriesEqual,
} from "./directory-compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Directory Compare Utility", () => {
	const testDir = join(__dirname, "temp-test");
	const dir1 = join(testDir, "dir1");
	const dir2 = join(testDir, "dir2");

	beforeAll(() => {
		// Clean up and create test directories
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore if directory doesn't exist
		}

		mkdirSync(dir1, { recursive: true });
		mkdirSync(dir2, { recursive: true });
	});

	afterAll(() => {
		// Clean up test directories
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore errors
		}
	});

	it("should detect identical directories", () => {
		// Create identical files
		writeFileSync(join(dir1, "test.txt"), "Hello World");
		writeFileSync(join(dir2, "test.txt"), "Hello World");

		const result = compareDirectories(dir1, dir2);
		expect(result.identical).toBe(true);
		expect(result.differences).toHaveLength(0);
	});

	it("should detect different file contents", () => {
		// Create files with different content
		writeFileSync(join(dir1, "test.txt"), "Hello World");
		writeFileSync(join(dir2, "test.txt"), "Goodbye World");

		const result = compareDirectories(dir1, dir2);
		expect(result.identical).toBe(false);
		expect(result.differences).toContain("test.txt: Content differs");
	});

	it("should handle line ending differences", () => {
		// Create files with different line endings
		writeFileSync(join(dir1, "test.txt"), "Hello\nWorld");
		writeFileSync(join(dir2, "test.txt"), "Hello\r\nWorld");

		// Should fail without ignoreLineEndings
		let result = compareDirectories(dir1, dir2);
		expect(result.identical).toBe(false);

		// Should pass with ignoreLineEndings
		result = compareDirectories(dir1, dir2, { ignoreLineEndings: true });
		expect(result.identical).toBe(true);
	});

	it("should handle missing files", () => {
		// Create file in only one directory
		writeFileSync(join(dir1, "test.txt"), "Hello World");

		const result = compareDirectories(dir1, dir2);
		expect(result.identical).toBe(false);
		expect(result.differences.length).toBeGreaterThan(0);
	});

	it("should work with assertDirectoriesEqual", () => {
		// Create identical files
		writeFileSync(join(dir1, "test.txt"), "Hello World");
		writeFileSync(join(dir2, "test.txt"), "Hello World");

		// Should not throw
		expect(() => assertDirectoriesEqual(dir1, dir2)).not.toThrow();
	});

	it("should throw with detailed error when directories differ", () => {
		// Create files with different content
		writeFileSync(join(dir1, "test.txt"), "Hello World");
		writeFileSync(join(dir2, "test.txt"), "Goodbye World");

		expect(() => assertDirectoriesEqual(dir1, dir2)).toThrow();
	});
});
