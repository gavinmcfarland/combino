// TypeScript declarations for optional dependencies
// These modules may not be available at runtime, but we declare them for type checking

declare module "ejs" {
	interface EJS {
		render(
			template: string,
			data: any,
			options?: { async?: boolean },
		): string | Promise<string>;
	}
	const ejs: EJS;
	export = ejs;
}

declare module "handlebars" {
	interface Handlebars {
		compile(template: string): (data: any) => string;
	}
	const handlebars: Handlebars;
	export = handlebars;
}

declare module "mustache" {
	interface Mustache {
		render(template: string, data: any): string;
	}
	const mustache: Mustache;
	export = mustache;
}
