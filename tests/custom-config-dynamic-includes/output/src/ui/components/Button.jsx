import React from 'react';

export function Button({ children, ...props }) {
	return (
		<button {...props} className="btn">
			{children}
		</button>
	);
}

// Framework: react
// UI Directory: src/ui
