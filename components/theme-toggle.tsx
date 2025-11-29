'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex gap-1 p-1 rounded-md bg-foreground/5">
        <div className="w-24 h-8" />
      </div>
    );
  }

  const options = [
    { value: 'light', label: '[ ]' },
    { value: 'dark', label: '[■]' },
    { value: 'system', label: '[~]' },
  ];

  return (
    <div className="flex gap-0.5 p-1 bg-foreground/5 font-mono text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            px-2 py-1 transition-all
            ${theme === option.value
              ? 'bg-foreground text-background'
              : 'text-foreground/60 hover:text-foreground hover:bg-foreground/10'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
