import { defineConfig } from "vite";


// https://vite.dev/config/
export default defineConfig(({ context }) => {
	return {
		plugins: context === 'ui' ? [] : []
	};
});
