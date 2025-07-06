#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Function to parse INI content and convert to JSON
function parseIniToJson(content) {
	const config = {};
	const lines = content.split('\n');
	let currentSection = '';

	for (const line of lines) {
		const trimmedLine = line.trim();
		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
			continue;
		}
		// Check for section headers
		const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
		if (sectionMatch) {
			currentSection = sectionMatch[1];
			continue;
		}
		// Parse key-value pairs
		const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
		if (keyValueMatch) {
			const key = keyValueMatch[1].trim();
			const value = keyValueMatch[2].trim();
			switch (currentSection) {
				case 'include':
					if (!config.include) config.include = {};
					config.include[key] = value || null;
					break;
				case 'exclude':
					if (!config.exclude) config.exclude = [];
					config.exclude.push(value);
					break;
				case 'data':
					if (!config.data) config.data = {};
					config.data[key] = parseValue(value);
					break;
				default:
					// Handle merge sections like [merge:*.json]
					if (currentSection.startsWith('merge:')) {
						const pattern = currentSection.substring(7); // Remove "merge:"
						if (!config.merge) config.merge = {};
						if (!config.merge[pattern]) config.merge[pattern] = {};
						if (key === 'strategy') {
							config.merge[pattern].strategy = value;
						} else {
							config.merge[pattern][key] = parseValue(value);
						}
					}
					break;
			}
		}
	}
	return config;
}

// Function to parse values (try JSON, fallback to string)
function parseValue(value) {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

// Function to convert include object to array format if needed
function normalizeInclude(config) {
	if (config.include && typeof config.include === 'object') {
		const includeArray = [];
		for (const [source, target] of Object.entries(config.include)) {
			if (target) {
				includeArray.push({ source, target });
			} else {
				includeArray.push({ source });
			}
		}
		config.include = includeArray;
	}
	return config;
}

async function convertCombinoFiles() {
	try {
		// Use 'find' to get all .combino files
		const findOutput = execSync('find . -name "*.combino" -type f', { encoding: 'utf-8' });
		const combinoFiles = findOutput
			.split('\n')
			.map((f) => f.trim())
			.filter(Boolean);
		console.log(`Found ${combinoFiles.length} .combino files to convert`);
		for (const filePath of combinoFiles) {
			try {
				const content = await fs.readFile(filePath, 'utf-8');
				// Skip if already JSON
				try {
					JSON.parse(content);
					console.log(`Skipping ${filePath} - already JSON format`);
					continue;
				} catch {
					// Not JSON, proceed with conversion
				}
				// Parse INI and convert to JSON
				const jsonConfig = parseIniToJson(content);
				const normalizedConfig = normalizeInclude(jsonConfig);
				// Write back as JSON
				const jsonContent = JSON.stringify(normalizedConfig, null, 2);
				await fs.writeFile(filePath, jsonContent, 'utf-8');
				console.log(`Converted ${filePath}`);
			} catch (error) {
				console.error(`Error converting ${filePath}:`, error.message);
			}
		}
		console.log('Conversion complete!');
	} catch (error) {
		console.error('Error during conversion:', error);
		process.exit(1);
	}
}

convertCombinoFiles();
