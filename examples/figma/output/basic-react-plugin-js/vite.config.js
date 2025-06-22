/// <reference path="./src/ui/vite-env.d.ts" />

import { defineConfig } from 'vite'
import ui from '@figma/plugin-typings'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ context }) => {
	return {
		plugins: context === 'ui' ? [ui(), react()] : [],
	}
})
