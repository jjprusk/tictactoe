// © 2025 Joe Pruskowski
import React from 'react';

export const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => {
  const s = size;
  return (
    <svg
      data-testid="app-logo"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" className="fill-primary-500/10 dark:fill-primary-300/10" />
      <path d="M2 8h20M2 16h20M8 2v20M16 2v20" className="stroke-primary-600 dark:stroke-primary-300" strokeWidth="1.5" />
      <path d="M6 6l4 4M10 6l-4 4M14 14l4 4M18 14l-4 4" className="stroke-rose-500" strokeWidth="1.5" />
    </svg>
  );
};

export default Logo;


