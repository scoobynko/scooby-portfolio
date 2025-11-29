# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 portfolio application built with:
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Analytics**: Statsig (with auto-capture, session replay, and web analytics plugins)
- **Icons**: Lucide React

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Structure

```
scooby-portfolio/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx         # Root layout with Statsig provider
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles with Tailwind v4 theme
│   └── my-statsig.tsx     # Statsig client-side provider
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   └── utils.ts           # Utility functions (cn helper)
└── public/                # Static assets
```

## Architecture Details

### Statsig Integration

The app uses Statsig for analytics and session tracking. The integration is implemented in `app/my-statsig.tsx`:
- **Client-side only**: Uses "use client" directive with `useClientAsyncInit`
- **Plugins enabled**: StatsigAutoCapturePlugin, StatsigSessionReplayPlugin
- **Wraps all pages**: Integrated in root layout via `<MyStatsig>` wrapper
- **Client key**: Configured with a client-side SDK key (publicly visible)

### Styling System

The project uses **Tailwind CSS v4** with a custom theme configuration:

1. **CSS Variables**: Design tokens defined in `app/globals.css` using CSS custom properties
2. **Custom variant**: `dark` variant configured as `@custom-variant dark (&:is(.dark *))`
3. **Theme inline**: Maps CSS variables to Tailwind theme using `@theme inline`
4. **Color scheme**: Uses OKLCH color space for both light and dark modes
5. **Design tokens**: Includes sidebar, chart, and component-specific colors

PostCSS configuration (`postcss.config.mjs`) explicitly defines content sources for Tailwind scanning.

### shadcn/ui Configuration

The `components.json` file configures shadcn/ui with:
- **Style**: "new-york"
- **RSC**: React Server Components enabled
- **Base color**: zinc
- **CSS variables**: enabled
- **Path aliases**: `@/components`, `@/lib/utils`, `@/components/ui`

When adding new components, use: `npx shadcn@latest add <component-name>`

### TypeScript Configuration

- **Target**: ES2017
- **Module resolution**: bundler
- **Path alias**: `@/*` maps to project root
- **Strict mode**: enabled
- **JSX**: react-jsx (Next.js optimized)

### Font Loading

The app uses Next.js font optimization with:
- **Geist Sans**: Primary sans-serif font (`--font-geist-sans`)
- **Geist Mono**: Monospace font (`--font-geist-mono`)
- Both fonts are loaded from Google Fonts and configured as CSS variables

## Key Conventions

### Component Development

1. **Server Components by default**: All components in `app/` are React Server Components unless marked with "use client"
2. **Client components**: Use "use client" directive for interactive components (e.g., `my-statsig.tsx`)
3. **Styling**: Use the `cn()` utility from `@/lib/utils` for conditional className merging

### Styling Patterns

1. **CSS variables**: Reference design tokens via CSS variables (e.g., `var(--background)`)
2. **Tailwind classes**: Use Tailwind utility classes with the configured theme
3. **Dark mode**: Add `dark:` prefix for dark mode styles (uses `.dark` class strategy)
4. **Custom colors**: Access custom colors like `bg-sidebar`, `text-chart-1`, etc.

### File Organization

- Place new pages in `app/` directory following App Router conventions
- Add reusable UI components to `components/ui/`
- Put custom components in `components/`
- Add utilities and helpers to `lib/`

## Important Notes

- The main application directory is `scooby-portfolio/` (nested within the parent directory)
- This is not a git repository (no `.git` in parent directory)
- ESLint uses Next.js config with TypeScript support
- The app uses CSS imports at the top of `globals.css` including `tw-animate-css` for animations
