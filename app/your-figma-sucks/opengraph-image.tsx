import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Your Figma Sucks'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FONT: Record<string, { w: number; rows: number[] }> = {
  'Y': { w: 5, rows: [0b10001, 0b01010, 0b00100, 0b00100, 0b00100] },
  'O': { w: 5, rows: [0b01110, 0b10001, 0b10001, 0b10001, 0b01110] },
  'U': { w: 5, rows: [0b10001, 0b10001, 0b10001, 0b10001, 0b01110] },
  'R': { w: 5, rows: [0b11110, 0b10001, 0b11110, 0b10010, 0b10001] },
  'F': { w: 5, rows: [0b11111, 0b10000, 0b11110, 0b10000, 0b10000] },
  'I': { w: 3, rows: [0b111, 0b010, 0b010, 0b010, 0b111] },
  'G': { w: 5, rows: [0b01111, 0b10000, 0b10011, 0b10001, 0b01111] },
  'M': { w: 5, rows: [0b10001, 0b11011, 0b10101, 0b10001, 0b10001] },
  'A': { w: 5, rows: [0b01110, 0b10001, 0b11111, 0b10001, 0b10001] },
  'S': { w: 5, rows: [0b01111, 0b10000, 0b01110, 0b00001, 0b11110] },
  'C': { w: 5, rows: [0b01111, 0b10000, 0b10000, 0b10000, 0b01111] },
  'K': { w: 5, rows: [0b10001, 0b10010, 0b11100, 0b10010, 0b10001] },
  ' ': { w: 2, rows: [0, 0, 0, 0, 0] },
}

const PX = 14       // pixel height
const PXW = PX * 1.2 // pixel width (slightly wider than tall, like monospace)

function getWordPixels(word: string): boolean[][] {
  const rows: boolean[][] = [[], [], [], [], []]
  for (let c = 0; c < word.length; c++) {
    const glyph = FONT[word[c]]
    if (!glyph) continue
    if (c > 0) {
      for (let r = 0; r < 5; r++) rows[r].push(false)
    }
    for (let r = 0; r < 5; r++) {
      for (let bit = glyph.w - 1; bit >= 0; bit--) {
        rows[r].push((glyph.rows[r] & (1 << bit)) !== 0)
      }
    }
  }
  return rows
}

function PixelGrid({ pixels, color, style }: {
  pixels: boolean[][]
  color: string
  style?: Record<string, unknown>
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column' as const,
      ...style,
    }}>
      {pixels.map((row, r) => (
        <div key={r} style={{ display: 'flex', height: PX }}>
          {row.map((on, c) => (
            <div key={c} style={{
              width: PXW,
              height: PX,
              backgroundColor: on ? color : 'transparent',
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function PixelWord({ word, color, shadowOffset, shadowColor, glowColor, rowShifts }: {
  word: string
  color: string
  shadowOffset?: number
  shadowColor?: string
  glowColor?: string
  rowShifts?: number[]
}) {
  let pixels = getWordPixels(word)

  // Apply row shifts for distortion
  if (rowShifts) {
    pixels = pixels.map((row, i) => {
      const shift = rowShifts[i] || 0
      if (shift === 0) return row
      if (shift > 0) return [...Array(shift).fill(false), ...row]
      return row.slice(-shift)
    })
  }

  const cols = Math.max(...pixels.map(r => r.length))
  const width = cols * PXW
  const height = 5 * PX

  return (
    <div style={{ position: 'relative', width, height, display: 'flex' }}>
      {shadowOffset && shadowColor && (
        <PixelGrid pixels={pixels} color={shadowColor} style={{
          position: 'absolute', top: shadowOffset, left: shadowOffset,
        }} />
      )}
      {glowColor && (
        <PixelGrid pixels={pixels} color={glowColor} style={{
          position: 'absolute',
          top: Math.round((shadowOffset || 6) / 2),
          left: Math.round((shadowOffset || 6) / 2),
        }} />
      )}
      <PixelGrid pixels={pixels} color={color} style={{
        position: 'absolute', top: 0, left: 0,
      }} />
    </div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <PixelWord
          word="YOUR"
          color="#ffffff"
          shadowOffset={8}
          shadowColor="#444"
          glowColor="#27c93f"
        />
        <PixelWord
          word="FIGMA"
          color="#ffffff"
          shadowOffset={8}
          shadowColor="#444"
          glowColor="#27c93f"
          rowShifts={[0, 0, 0, 1, 0]}
        />
        <PixelWord
          word="SUCKS"
          color="#ffffff"
          shadowOffset={8}
          shadowColor="#444"
          glowColor="#27c93f"
        />
      </div>
    ),
    { ...size }
  )
}
