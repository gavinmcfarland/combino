#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { dirname, basename } from 'path';

async function renameCombinoFiles() {
	try {
		// Use 'find' to get all .combino files
		const findOutput = execSync('find . -name "*.combino" -type f', { encoding: 'utf-8' });
		const combinoFiles = findOutput
			.split('\n')
			.map((f) => f.trim())
			.filter(Boolean);

		console.log(`Found ${combinoFiles.length} .combino files to rename`);

		for (const filePath of combinoFiles) {
			try {
				// Create new filename with .json extension
				const newPath = filePath.replace(/\.combino$/, '.json');

				// Rename the file
				await fs.rename(filePath, newPath);
				console.log(`Renamed ${filePath} → ${newPath}`);
			} catch (error) {
				console.error(`Error renaming ${filePath}:`, error.message);
			}
		}

		console.log('Renaming complete!');
	} catch (error) {
		console.error('Error during renaming:', error);
		process.exit(1);
	}
}

renameCombinoFiles();
