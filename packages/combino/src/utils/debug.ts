/**
 * Debug utility for controlling debug output
 */
export class DebugLogger {
	private static isDebugEnabled(): boolean {
		// Check for debug flags in various ways
		return (
			process.env.DEBUG === 'true' ||
			process.env.DEBUG === '1' ||
			process.argv.includes('--debug') ||
			process.argv.includes('-d') ||
			process.env.NODE_ENV === 'debug'
		);
	}

	/** Whether warnings should be shown (default: true) */
	private static warningsEnabled = true;

	/**
	 * Enable or disable warnings
	 */
	static setWarningsEnabled(enabled: boolean): void {
		this.warningsEnabled = enabled;
	}

	/**
	 * Check if warnings are currently enabled
	 */
	static areWarningsEnabled(): boolean {
		return this.warningsEnabled;
	}

	static log(...args: any[]): void {
		if (this.isDebugEnabled()) {
			console.log(...args);
		}
	}

	static warn(...args: any[]): void {
		// Warnings should show based on the warnings setting
		if (this.warningsEnabled) {
			console.warn(...args);
		}
	}

	static error(...args: any[]): void {
		// Errors should always show, regardless of debug mode
		console.error(...args);
	}
}
