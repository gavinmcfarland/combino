import { defineConfig } from "vite";
import { ui } from "@figma/plugin-typings";
import { React } from "react";
import { ReactDOM } from "react-dom";

// https://vite.dev/config/
export default defineConfig(({ context }) => {
	return {
		plugins: context === 'ui' ? [ui(), React(), ReactDOM()] : []
	};
});
