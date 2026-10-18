import React from 'react';
import shared from './shared.module.css';

export function Button({ variant = 'secondary', className = '', children, type = 'button', ...props }) {
  return <button type={type} className={`${shared['button']} ${variant === 'secondary' ? '' : shared[variant]} ${className}`.trim()} {...props}>{children}</button>;
}
