'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { createTerminalExperience } from './terminal-experience'

export default function YourFigmaSucksPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const previousThemeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    previousThemeRef.current = theme
    setTheme('dark')

    return () => {
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const cleanup = createTerminalExperience(containerRef.current!)
    return cleanup
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#0a0a0a',
        overflow: 'hidden',
      }}
    />
  )
}
