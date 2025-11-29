'use client';

import { useState, useEffect, useRef } from 'react';

interface TerminalEasterEggProps {
  onCommand?: (command: string) => string | null;
}

export function TerminalEasterEgg({ onCommand }: TerminalEasterEggProps) {
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ command: string; output: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default command handler
  const handleCommand = (cmd: string): string => {
    const command = cmd.trim().toLowerCase();

    // Custom handler first
    if (onCommand) {
      const result = onCommand(command);
      if (result !== null) return result;
    }

    // Built-in commands
    switch (command) {
      case 'help':
        return 'Available commands: help, clear, hello, skills, secret, exit';
      case 'clear':
        setHistory([]);
        return '';
      case 'hello':
        return 'Hey there! Nice to meet a curious explorer 👋';
      case 'hi':
        // Trigger email
        const subject = encodeURIComponent('Omg I wanna work with you');
        const body = encodeURIComponent('Hi, I really love your work, I would like to work with you. Please.');
        window.location.href = `mailto:som@jakubsalmik.com?subject=${subject}&body=${body}`;
        return '';
      case 'rikej mi':
        window.open('https://www.instagram.com/scoobysko/', '_blank');
        return '';
      case 'figma':
        window.open('https://github.com/scoobynko/claude-code-design-skills', '_blank');
        return '';
      case 'skills':
        return 'Figma, React, TypeScript, Next.js, Tailwind, AI/ML workflows';
      case 'secret':
        return '🎉 You found a secret! Here\'s a cookie: 🍪';
      case 'exit':
      case 'quit':
      case 'q':
        setIsActive(false);
        setInput('');
        return '';
      case '':
        return '';
      default:
        return `Command not found: ${cmd}. Type 'help' for available commands.`;
    }
  };

  // Listen for "/" key to activate and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape always closes
      if (e.key === 'Escape' && isActive) {
        setIsActive(false);
        setInput('');
        return;
      }

      // Don't activate if already typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '/' && !isActive) {
        e.preventDefault();
        setIsActive(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const output = handleCommand(input);
    if (output || input.trim().toLowerCase() !== 'clear') {
      setHistory(prev => [...prev, { command: input, output }]);
    }
    setInput('');
  };

  return (
    <div className="font-mono">
      {/* Title line with optional input */}
      <h1 className="text-xl md:text-2xl font-normal text-foreground flex items-center gap-0 whitespace-nowrap">
        <span className="text-muted-foreground">~</span>
        <span className="text-muted-foreground">/</span>
        <span>scooby</span>
        {isActive ? (
          <form onSubmit={handleSubmit} className="inline-flex items-center">
            <span className="relative inline-flex items-center">
              <span className="invisible whitespace-pre">{input || ' '}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="absolute left-0 top-0 bg-transparent border-none outline-none text-foreground caret-foreground w-full"
                placeholder=""
                autoComplete="off"
                spellCheck={false}
              />
            </span>
            {input.toLowerCase() === 'hi' && (
              <span className="text-muted-foreground/40">{'>'}sendhi</span>
            )}
            {input.toLowerCase() === 'rikej mi' && (
              <span className="text-muted-foreground/40">{'>'}instagram</span>
            )}
            {input.toLowerCase() === 'figma' && (
              <span className="text-muted-foreground/40">{'>'}claude skill</span>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsActive(true)}
            className="inline-flex items-center justify-center w-6 h-[1.2em] -ml-2 cursor-pointer"
            aria-label="Activate terminal"
          >
            <span className="inline-block w-[2px] h-full bg-foreground animate-[blink_1s_step-end_infinite]" />
          </button>
        )}
      </h1>


    </div>
  );
}
