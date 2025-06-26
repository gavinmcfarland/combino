/// <reference types="vite/client" />

import 'vite'
import type { UserConfigExport } from 'vite'

declare module 'vite' {
	// Overload defineConfig to acknowledge the context parameter
	function defineConfig(config)
}
