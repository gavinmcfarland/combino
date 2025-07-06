#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execSync } from 'child_process';

async function fixJsonNames() {
	try {
		// Find all files named .json
		const findOutput = execSync('find tests -name ".json" -type f', { encoding: 'utf-8' });
		const jsonFiles = findOutput
			.split('\n')
			.map((f) => f.trim())
			.filter(Boolean);

		console.log(`Found ${jsonFiles.length} .json files to rename to combino.json`);

		for (const filePath of jsonFiles) {
			try {
				// Create new filename with combino.json
				const dir = filePath.substring(0, filePath.lastIndexOf('/'));
				const newPath = `${dir}/combino.json`;

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

fixJsonNames();
