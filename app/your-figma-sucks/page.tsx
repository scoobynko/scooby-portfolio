'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { createTerminalExperience } from './terminal-experience'

export default function YourFigmaSucksPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const themeRef = useRef(theme)

  useEffect(() => { themeRef.current = theme }, [theme])

  useEffect(() => {
    const cleanup = createTerminalExperience(
      containerRef.current!,
      setTheme,
      () => themeRef.current,
    )
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--background)',
        overflow: 'hidden',
      }}
    />
  )
}
