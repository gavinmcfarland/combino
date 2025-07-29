import React from 'react';

interface ButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
	return (
		<button onClick={onClick} className="btn">
			{children}
		</button>
	);
};
