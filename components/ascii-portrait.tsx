'use client';

import { useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import asciiData from '@/public/ascii-data.json';

interface CharData {
  char: string;
  brightness: number;
  isBackground: boolean;
}

interface AsciiPortraitProps {
  className?: string;
}

// Smooth interpolation
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Pseudo-random for glitch
function glitchRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Balanced glitchy TV effect
function getGlitch(x: number, y: number, time: number): { offsetX: number; alpha: number } {
  const burstSeed = Math.floor(time * 0.35);
  const burstRand = glitchRandom(burstSeed);

  let offsetX = 0;
  let alpha = 1;

  // Glitch bursts ~18% of time
  if (burstRand < 0.18) {
    const rowSeed = burstSeed * 100 + y;
    const rowRand = glitchRandom(rowSeed);

    if (rowRand > 0.8) {
      // Medium horizontal shift
      offsetX = (glitchRandom(rowSeed + 1) - 0.5) * 20;
    } else if (rowRand > 0.65) {
      // Small shift
      offsetX = (glitchRandom(rowSeed + 2) - 0.5) * 10;
    }

    // Occasional row flicker (rare)
    if (glitchRandom(rowSeed + 3) > 0.95) {
      alpha = 0;
    }
  }

  // Occasional subtle jitter
  const subtleJitter = glitchRandom(y * 7 + Math.floor(time * 1.2));
  if (subtleJitter > 0.96) {
    offsetX += (glitchRandom(y + time * 2.5) - 0.5) * 5;
  }

  return { offsetX, alpha };
}

export function AsciiPortrait({ className = '' }: AsciiPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const isHoveringRef = useRef(false);
  const timeRef = useRef(0);
  const animationRef = useRef<number>(0);
  const themeRef = useRef<string | undefined>(undefined);
  const { resolvedTheme } = useTheme();

  // Update theme ref when it changes
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  const data = asciiData as CharData[][];
  const charWidth = 7;
  const charHeight = 10;
  const width = data[0]?.length || 0;
  const height = data.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;

    const canvasWidth = width * charWidth;
    const canvasHeight = height * charHeight;

    // Set canvas size accounting for device pixel ratio
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    let isRunning = true;

    const draw = () => {
      if (!isRunning) return;

      const isDark = themeRef.current === 'dark';

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const time = timeRef.current;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const isHovering = isHoveringRef.current;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const charData = data[y][x];
          if (charData.isBackground) continue;

          const posX = x * charWidth + charWidth / 2;
          const posY = y * charHeight + charHeight / 2;

          // Use the original character from the data
          const displayChar = charData.char;

          let scale = 1;
          let offsetX = 0;
          let offsetY = 0;
          let r: number, g: number, b: number;
          let alpha = 1;

          if (isDark) {
            r = 255; g = 255; b = 255;
          } else {
            r = 0; g = 0; b = 0;
          }

          // Idle animation: glitchy broken monitor
          const glitch = getGlitch(x, y, time);
          offsetX += glitch.offsetX;
          alpha = glitch.alpha;

          if (isHovering) {
            const dx = mouseX - posX;
            const dy = mouseY - posY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxRadius = 200;

            if (distance < maxRadius) {
              const intensity = 1 - (distance / maxRadius);
              const easeIntensity = smoothstep(intensity);

              scale = 1 + easeIntensity * 0.35;

              const angle = Math.atan2(dy, dx);
              const waveStrength = easeIntensity * 8;
              offsetX = Math.cos(angle) * -waveStrength;
              offsetY = Math.sin(angle) * -waveStrength;

              // Restore opacity when hovering
              alpha = Math.max(alpha, 0.8 + easeIntensity * 0.2);
            }
          }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

          if (scale !== 1) {
            ctx.save();
            ctx.translate(posX + offsetX, posY + offsetY);
            ctx.scale(scale, scale);
            ctx.fillText(displayChar, 0, 0);
            ctx.restore();
          } else {
            ctx.fillText(displayChar, posX + offsetX, posY + offsetY);
          }
        }
      }

      timeRef.current += 0.025;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [data, width, height]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Use CSS pixel coordinates (not canvas pixel coordinates)
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const totalWidth = width * charWidth;
  const totalHeight = height * charHeight;

  return (
    <canvas
      ref={canvasRef}
      className={`select-none ${className}`}
      style={{
        width: totalWidth,
        height: totalHeight,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { isHoveringRef.current = true; }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        mouseRef.current = { x: -1000, y: -1000 };
      }}
    />
  );
}
