import React from 'react';

export function Button({ children, ...props }) {
  return (
    <button {...props} className="btn">
      {children}
    </button>
  );
}

// Framework: <%= framework %>
// UI Directory: <%= uiDir %>
