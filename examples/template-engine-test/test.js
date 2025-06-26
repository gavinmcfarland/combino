#!/usr/bin/env node

import { Combino } from '../../dist/index.js';
import { EJSTemplateEngine, HandlebarsTemplateEngine, MustacheTemplateEngine } from '../../dist/template-engines/index.js';

async function testTemplateEngine() {
	console.log('Testing Combino with configurable template engines...\n');

	// Test with EJS (default)
	console.log('1. Testing with EJS template engine:');
	const combino = new Combino();

	try {
		await combino.combine({
			outputDir: './output-ejs',
			include: ['./templates/ejs-example'],
			data: {
				name: 'My Awesome Project',
				description: 'amazing',
				features: ['Feature 1', 'Feature 2', 'Feature 3'],
				framework: 'React',
				language: 'TypeScript',
				version: '1.0.0'
			},
			templateEngine: "ejs",
		});
		console.log('✅ EJS test completed successfully');
	} catch (error) {
		console.error('❌ EJS test failed:', error.message);
	}

	// Test with explicit EJS engine
	console.log('\n2. Testing with explicit EJS template engine:');
	const combinoExplicit = new Combino(new EJSTemplateEngine());

	try {
		await combinoExplicit.combine({
			outputDir: './output-ejs-explicit',
			include: ['./templates/ejs-example'],
			data: {
				name: 'My Explicit Project',
				description: 'explicitly configured',
				features: ['Explicit Feature 1', 'Explicit Feature 2'],
				framework: 'Vue',
				language: 'JavaScript',
				version: '2.0.0'
			}
		});
		console.log('✅ Explicit EJS test completed successfully');
	} catch (error) {
		console.error('❌ Explicit EJS test failed:', error.message);
	}

	// Test with string-based engine selection
	console.log('\n3. Testing with string-based engine selection:');
	const combinoString = new Combino();

	try {
		await combinoString.combine({
			outputDir: './output-ejs-string',
			include: ['./templates/ejs-example'],
			templateEngine: 'ejs',
			data: {
				name: 'My String Project',
				description: 'string configured',
				features: ['String Feature 1', 'String Feature 2', 'String Feature 3'],
				framework: 'Svelte',
				language: 'TypeScript',
				version: '3.0.0'
			}
		});
		console.log('✅ String-based EJS test completed successfully');
	} catch (error) {
		console.error('❌ String-based EJS test failed:', error.message);
	}

	// Test with Handlebars
	console.log('\n4. Testing with Handlebars template engine:');
	const combinoHandlebars = new Combino(new HandlebarsTemplateEngine());

	try {
		await combinoHandlebars.combine({
			outputDir: './output-handlebars',
			include: ['./templates/handlebars-example'],
			data: {
				name: 'My Handlebars Project',
				description: 'handlebars powered',
				features: ['Handlebars Feature 1', 'Handlebars Feature 2'],
				framework: 'Angular',
				language: 'JavaScript',
				version: '4.0.0',
				hasTests: true
			}
		});
		console.log('✅ Handlebars test completed successfully');
	} catch (error) {
		console.error('❌ Handlebars test failed:', error.message);
	}

	// Test with string-based Handlebars selection
	console.log('\n5. Testing with string-based Handlebars selection:');
	const combinoHandlebarsString = new Combino();

	try {
		await combinoHandlebarsString.combine({
			outputDir: './output-handlebars-string',
			include: ['./templates/handlebars-example'],
			templateEngine: 'handlebars',
			data: {
				name: 'My String Handlebars Project',
				description: 'string configured handlebars',
				features: ['String Handlebars Feature 1', 'String Handlebars Feature 2'],
				framework: 'Ember',
				language: 'TypeScript',
				version: '5.0.0',
				hasTests: false
			}
		});
		console.log('✅ String-based Handlebars test completed successfully');
	} catch (error) {
		console.error('❌ String-based Handlebars test failed:', error.message);
	}

	// Test with Mustache
	console.log('\n6. Testing with Mustache template engine:');
	const combinoMustache = new Combino(new MustacheTemplateEngine());

	try {
		await combinoMustache.combine({
			outputDir: './output-mustache',
			include: ['./templates/mustache-example'],
			data: {
				name: 'My Mustache Project',
				description: 'mustache powered',
				features: ['Mustache Feature 1', 'Mustache Feature 2', 'Mustache Feature 3'],
				framework: 'Backbone',
				language: 'JavaScript',
				version: '6.0.0',
				hasTests: true
			}
		});
		console.log('✅ Mustache test completed successfully');
	} catch (error) {
		console.error('❌ Mustache test failed:', error.message);
	}

	// Test with string-based Mustache selection
	console.log('\n7. Testing with string-based Mustache selection:');
	const combinoMustacheString = new Combino();

	try {
		await combinoMustacheString.combine({
			outputDir: './output-mustache-string',
			include: ['./templates/mustache-example'],
			templateEngine: 'mustache',
			data: {
				name: 'My String Mustache Project',
				description: 'string configured mustache',
				features: ['String Mustache Feature 1', 'String Mustache Feature 2'],
				framework: 'jQuery',
				language: 'JavaScript',
				version: '7.0.0',
				hasTests: false
			}
		});
		console.log('✅ String-based Mustache test completed successfully');
	} catch (error) {
		console.error('❌ String-based Mustache test failed:', error.message);
	}

	console.log('\n🎉 All tests completed!');
}

testTemplateEngine().catch(console.error);
