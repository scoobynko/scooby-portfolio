const ACCENT = '#27c93f'
const BG = '#0a0a0a'
const TEXT_COLOR = '#ffffff'
const MUTED_COLOR = '#888'
const FONT_SIZE = '14px'
const CHAR_DELAY = 30
const FACE_CHAR_DELAY = 40

const WORLD_WIDTH = 4800
const MOVE_SPEED = 1.8
const GROUND_Y_RATIO = 0.65
const CHARACTER_X_RATIO = 0.25
const COLLECTION_TOLERANCE = 60
const WALL_X = 4200

// 5-row pixel font for splash screen (each number's bits = pixels, MSB = left)
const SPLASH_FONT: Record<string, { w: number; rows: number[] }> = {
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

function renderSplashWord(word: string): string[] {
  const lines = ['', '', '', '', '']
  for (let c = 0; c < word.length; c++) {
    const glyph = SPLASH_FONT[word[c]]
    if (!glyph) continue
    if (c > 0) {
      for (let r = 0; r < 5; r++) lines[r] += ' '
    }
    for (let r = 0; r < 5; r++) {
      for (let bit = glyph.w - 1; bit >= 0; bit--) {
        lines[r] += (glyph.rows[r] & (1 << bit)) ? '█' : ' '
      }
    }
  }
  return lines
}

const FACES = {
  NEUTRAL: '(- _ -)',
  TIRED: '(= _ =)',
  BROKEN: '(x _ x)',
  SHOCK: '(O _ O)',
  RELEASED: '(~ _ ~)',
  HAPPY: '(^ _ ^)',
} as const

const GROUND_TEXTURE = '.  ·  .  ·.  . ·  .  · .  .·  .  ·  .'

const FIG_FILE_DEFS = [
  { worldX: 600,  label: 'COMPONENT_V3_FINAL.fig' },
  { worldX: 1100, label: 'HANDOFF_READY_v2.fig' },
  { worldX: 1700, label: 'APPROVED_DO_NOT_TOUCH.fig' },
  { worldX: 2900, label: 'WAITING_FOR_DEV.fig' },
  { worldX: 3500, label: 'FEEDBACK_PENDING.fig' },
]

function getNarrative(mobile: boolean): Record<number, string[]> {
  return {
    0: mobile
      ? ['> Use the button below to move.', '> Collect the files.']
      : ['> Use arrow keys to move.', '> Collect the files.'],
    1: ['> Another version nobody will ship.'],
    2: ['> waiting for dev... waiting for someone to care.'],
    3: ['> I\'ve spent years in Design Operations.', '> Building teams. Building processes.', '> Endless handoffs. Endless back-and-forth.', '> Watching great work die before it ships.'],
    4: ['> Your designs have no value here.', '> No one can access unrealized potential.'],
    5: ['> What if you finally pushed it?'],
  }
}

interface FigFile { worldX: number; label: string; collected: boolean }
interface ShatterParticle { char: string; x: number; y: number; vx: number; vy: number; opacity: number; life: number }
interface RainDrop { x: number; y: number; speed: number; opacity: number }
interface LightningBolt { segments: Array<{ x: number; y: number; char: string }>; life: number; maxLife: number }
interface Firework { x: number; y: number; sparks: Array<{ dx: number; dy: number; vx: number; vy: number; char: string; life: number }>; color: string }

interface GameState {
  cameraX: number
  movingRight: boolean
  movingLeft: boolean
  figFiles: FigFile[]
  filesCollected: number
  hitWall: boolean
  wallShattered: boolean
  shatterParticles: ShatterParticle[]
  catharsisPhase: 'none' | 'shock' | 'released' | 'happy'
  catharsisRunning: boolean
  currentFace: string
  targetFace: string
  faceTransitioning: boolean
  hopOffset: number
  hopPhase: number
  bounceOffset: number
  bounceVelocity: number
  isBouncing: boolean
  rainDrops: RainDrop[]
  currentRainIntensity: number
  targetRainIntensity: number
  groundFlickerActive: boolean
  lightningBolts: LightningBolt[]
  fireworks: Firework[]
  happyIdle: boolean
  happyIdlePhase: number
  gameRunning: boolean
  ctaReady: boolean
}

export function createTerminalExperience(container: HTMLElement): () => void {
  // --- Cleanup infrastructure ---
  const timeoutIds = new Set<number>()
  const intervalIds = new Set<number>()
  const rafIds = new Set<number>()
  const eventCleanups: Array<() => void> = []

  function safeTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => { timeoutIds.delete(id); fn() }, ms)
    timeoutIds.add(id)
    return id
  }

  function safeInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(() => { fn() }, ms)
    intervalIds.add(id)
    return id
  }

  function safeRaf(fn: (time: number) => void): number {
    const id = requestAnimationFrame((time) => { rafIds.delete(id); fn(time) })
    rafIds.add(id)
    return id
  }

  function addEventListener(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions | boolean): void {
    target.addEventListener(event, handler, options)
    eventCleanups.push(() => target.removeEventListener(event, handler, options))
  }

  // --- Game state initialization ---
  const state: GameState = {
    cameraX: 0, movingRight: false, movingLeft: false,
    figFiles: [], filesCollected: 0,
    hitWall: false, wallShattered: false, shatterParticles: [],
    catharsisPhase: 'none', catharsisRunning: false,
    currentFace: FACES.NEUTRAL, targetFace: FACES.NEUTRAL, faceTransitioning: false,
    hopOffset: 0, hopPhase: 0,
    bounceOffset: 0, bounceVelocity: 0, isBouncing: false,
    rainDrops: [], currentRainIntensity: 0, targetRainIntensity: 0,
    groundFlickerActive: false, lightningBolts: [], fireworks: [], happyIdle: false, happyIdlePhase: 0, gameRunning: false, ctaReady: false,
  }

  // --- DOM Construction ---
  const isMobile = window.innerWidth < 768
  const NARRATIVE = getNarrative(isMobile)

  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    height: '100dvh',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: FONT_SIZE,
    color: TEXT_COLOR,
    background: BG,
  })

  const terminalWindow = document.createElement('div')
  Object.assign(terminalWindow.style, {
    width: isMobile ? '100vw' : 'min(90vw, 1100px)',
    height: isMobile ? '100dvh' : 'min(85vh, 600px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: isMobile ? 'none' : '1px solid #444',
  })

  const titleBar = document.createElement('div')
  Object.assign(titleBar.style, {
    padding: '6px 12px',
    borderBottom: '1px solid #444',
    userSelect: 'none',
    flexShrink: '0',
    display: 'flex',
    justifyContent: 'space-between',
  })
  const titleLeft = document.createElement('span')
  titleLeft.textContent = 'user@scooby:~'
  titleLeft.style.color = MUTED_COLOR
  const titleRight = document.createElement('span')
  titleRight.textContent = 'bash'
  titleRight.style.color = MUTED_COLOR
  titleBar.appendChild(titleLeft)
  titleBar.appendChild(titleRight)

  // Split container: game left, text right
  const splitContainer = document.createElement('div')
  Object.assign(splitContainer.style, {
    flex: '1',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    overflow: 'hidden',
  })

  // Left pane: game canvas
  const contentArea = document.createElement('div')
  Object.assign(contentArea.style, {
    flex: isMobile ? '1' : '3',
    position: 'relative',
    overflow: 'hidden',
  })

  // Divider between panes
  const divider = document.createElement('div')
  Object.assign(divider.style, {
    width: isMobile ? '100%' : '1px',
    height: isMobile ? '1px' : '100%',
    background: '#444',
    flexShrink: '0',
  })

  // Right pane (desktop) / bottom pane (mobile): text
  const textPane = document.createElement('div')
  Object.assign(textPane.style, {
    flex: isMobile ? '0 0 auto' : '2',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    ...(isMobile ? { maxHeight: '120px', minHeight: '80px' } : {}),
  })

  const figCounter = document.createElement('span')
  Object.assign(figCounter.style, {
    position: 'absolute',
    top: '12px',
    left: '16px',
    color: MUTED_COLOR,
    zIndex: '2',
    opacity: '0',
  })
  figCounter.textContent = '[.fig \u00d7 0]'

  const lightningOverlay = document.createElement('div')
  Object.assign(lightningOverlay.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '20',
    opacity: '0',
    background: 'white',
  })

  const bootText = document.createElement('div')
  Object.assign(bootText.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    padding: '20px 24px',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
    transition: 'opacity 0.3s',
    zIndex: '5',
  })

  contentArea.appendChild(lightningOverlay)
  contentArea.appendChild(bootText)

  contentArea.appendChild(figCounter)

  splitContainer.appendChild(contentArea)
  if (!isMobile) {
    splitContainer.appendChild(divider)
    splitContainer.appendChild(textPane)
  }

  // Mobile move button (right arrow, full width bar at the bottom)
  let mobileMoveButton: HTMLElement | null = null
  if (isMobile) {
    mobileMoveButton = document.createElement('div')
    Object.assign(mobileMoveButton.style, {
      flexShrink: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      height: '52px',
      borderTop: '1px solid #444',
      background: '#111',
      color: TEXT_COLOR,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '22px',
      userSelect: 'none',
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    })
    mobileMoveButton.textContent = '\u2192'
  }

  terminalWindow.appendChild(titleBar)
  terminalWindow.appendChild(splitContainer)
  if (isMobile && mobileMoveButton) terminalWindow.appendChild(mobileMoveButton)
  wrapper.appendChild(terminalWindow)
  container.appendChild(wrapper)

  // --- Utility functions ---

  let typewriterGeneration = 0

  function typewriteLines(
    target: HTMLElement, lines: string[], charDelay: number, lineDelay: number,
    onLineComplete?: (lineIndex: number) => void, onAllComplete?: () => void,
    textColor?: string, boldText?: boolean,
  ): void {
    typewriterGeneration++
    const myGeneration = typewriterGeneration
    hideIdleCursor()
    let lineIndex = 0
    function typeLine(): void {
      if (myGeneration !== typewriterGeneration) return
      if (lineIndex >= lines.length) { showIdleCursor(); onAllComplete?.(); return }
      const line = lines[lineIndex]
      const div = document.createElement('div')
      if (textColor) div.style.color = textColor
      if (boldText) div.style.fontWeight = 'bold'
      target.insertBefore(div, target.firstChild)
      let charIndex = 0
      const currentLineIndex = lineIndex
      if (line.length === 0 || line === '>') {
        div.innerHTML = '&nbsp;'
        onLineComplete?.(currentLineIndex)
        lineIndex++
        safeTimeout(typeLine, lineDelay)
        return
      }
      const intervalId = safeInterval(() => {
        if (myGeneration !== typewriterGeneration) {
          clearInterval(intervalId)
          intervalIds.delete(intervalId)
          return
        }
        if (charIndex < line.length) {
          div.textContent = line.substring(0, charIndex + 1)
          charIndex++
        } else {
          clearInterval(intervalId)
          intervalIds.delete(intervalId)
          onLineComplete?.(currentLineIndex)
          lineIndex++
          if (lineIndex < lines.length) { safeTimeout(typeLine, lineDelay) }
          else { showIdleCursor(); onAllComplete?.() }
        }
      }, charDelay)
    }
    typeLine()
  }

  function triggerLightning(intensity?: number): Promise<void> {
    const peak = intensity ?? 1
    return new Promise((resolve) => {
      lightningOverlay.style.opacity = String(peak)
      safeTimeout(() => { lightningOverlay.style.opacity = '0' }, 60)
      safeTimeout(() => { lightningOverlay.style.opacity = String(peak * 0.7) }, 120)
      safeTimeout(() => { lightningOverlay.style.opacity = '0'; resolve() }, 180)
    })
  }

  function spawnLightningBolt(canvasWidth: number, groundY: number): LightningBolt {
    const segments: Array<{ x: number; y: number; char: string }> = []
    const boltChars = ['/', '\\', '|', '/', '\\', '|', '/']
    let x = 40 + Math.random() * (canvasWidth - 80)
    let y = 0
    const targetY = groundY * 0.6 + Math.random() * groundY * 0.3

    while (y < targetY) {
      const char = boltChars[Math.floor(Math.random() * boltChars.length)]
      segments.push({ x, y, char })
      y += 8 + Math.random() * 6
      x += (Math.random() - 0.5) * 16

      // Occasional branch
      if (Math.random() < 0.15 && segments.length > 2) {
        const branchLen = 2 + Math.floor(Math.random() * 3)
        let bx = x
        let by = y
        const dir = Math.random() < 0.5 ? -1 : 1
        for (let b = 0; b < branchLen; b++) {
          bx += dir * (6 + Math.random() * 8)
          by += 4 + Math.random() * 4
          segments.push({ x: bx, y: by, char: dir > 0 ? '\\' : '/' })
        }
      }
    }

    return { segments, life: 40, maxLife: 40 }
  }

  function updateLightningBolts(bolts: LightningBolt[]): LightningBolt[] {
    const alive: LightningBolt[] = []
    for (const bolt of bolts) {
      bolt.life--
      if (bolt.life > 0) alive.push(bolt)
    }
    return alive
  }

  function renderLightningBolts(ctx: CanvasRenderingContext2D, bolts: LightningBolt[]): void {
    ctx.font = 'bold 14px monospace'
    for (const bolt of bolts) {
      const alpha = Math.min((bolt.life / bolt.maxLife) * 1.5, 1.0)
      // Flicker effect
      const flicker = bolt.life % 4 === 0 ? 0.5 : 1.0
      ctx.globalAlpha = alpha * flicker
      ctx.fillStyle = '#ffffff'
      for (const seg of bolt.segments) {
        ctx.fillText(seg.char, seg.x, seg.y)
      }
    }
    ctx.globalAlpha = 1.0
  }

  function scheduleAmbientLightning(canvasWidth: number, groundY: number): void {
    function nextBolt(): void {
      if (state.hitWall || state.catharsisRunning || !state.gameRunning) return
      state.lightningBolts.push(spawnLightningBolt(canvasWidth, groundY))
      const delay = 2000 + Math.random() * 4000
      safeTimeout(nextBolt, delay)
    }
    safeTimeout(nextBolt, 1000 + Math.random() * 2000)
  }

  // --- Fireworks ---

  const FIREWORK_CHARS = ['*', '·', '+', '✦', '°', '•', '★']
  const FIREWORK_COLORS = [ACCENT, '#ffffff', '#ffdd44', '#ff6644', '#44ddff']

  function spawnFirework(canvasWidth: number, groundY: number): Firework {
    const x = 40 + Math.random() * (canvasWidth - 80)
    const y = 20 + Math.random() * (groundY * 0.5)
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
    const sparkCount = 12 + Math.floor(Math.random() * 10)
    const sparks: Firework['sparks'] = []

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3
      const speed = 1.5 + Math.random() * 2
      sparks.push({
        dx: 0, dy: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        char: FIREWORK_CHARS[Math.floor(Math.random() * FIREWORK_CHARS.length)],
        life: 30 + Math.floor(Math.random() * 25),
      })
    }

    return { x, y, sparks, color }
  }

  function updateFireworks(fireworks: Firework[]): Firework[] {
    const alive: Firework[] = []
    for (const fw of fireworks) {
      let hasLive = false
      for (const s of fw.sparks) {
        if (s.life <= 0) continue
        s.dx += s.vx
        s.dy += s.vy
        s.vy += 0.06 // gravity
        s.vx *= 0.98 // drag
        s.life--
        if (s.life > 0) hasLive = true
      }
      if (hasLive) alive.push(fw)
    }
    return alive
  }

  function renderFireworks(ctx: CanvasRenderingContext2D, fireworks: Firework[]): void {
    for (const fw of fireworks) {
      ctx.font = '12px monospace'
      for (const s of fw.sparks) {
        if (s.life <= 0) continue
        ctx.globalAlpha = Math.min(s.life / 20, 1)
        ctx.fillStyle = fw.color
        ctx.fillText(s.char, fw.x + s.dx, fw.y + s.dy)
      }
    }
    ctx.globalAlpha = 1.0
  }

  function scheduleFireworks(canvasWidth: number, groundY: number): void {
    // Launch a firework, then schedule the next one
    function launchNext(): void {
      if (!state.gameRunning) return
      state.fireworks.push(spawnFirework(canvasWidth, groundY))
      const nextDelay = 400 + Math.random() * 800
      safeTimeout(launchNext, nextDelay)
    }
    launchNext()
  }

  // --- Happy idle animation ---

  const HAPPY_FACES = ['(^ _ ^)', '(^ ‿ ^)', '(* _ *)', '(^ _ ^)']

  function updateHappyIdle(st: GameState): void {
    if (!st.happyIdle) return
    st.happyIdlePhase += 0.04
    // Gentle bobbing
    st.hopOffset = Math.sin(st.happyIdlePhase) * 2
    // Cycle face expressions
    const faceIdx = Math.floor(st.happyIdlePhase * 0.5) % HAPPY_FACES.length
    st.currentFace = HAPPY_FACES[faceIdx]
  }


  function setFigCount(count: number, shipped?: boolean): void {
    if (shipped) {
      figCounter.textContent = `[.fig \u00d7 ${count}] \u2713 shipped`
      figCounter.style.color = ACCENT
    } else {
      figCounter.textContent = `[.fig \u00d7 ${count}]`
      figCounter.style.color = MUTED_COLOR
    }
  }

  function pulseFigCounter(): void {
    figCounter.style.transition = 'transform 0.1s ease-out'
    figCounter.style.transform = 'scale(1.2)'
    safeTimeout(() => {
      figCounter.style.transition = 'transform 0.1s ease-in'
      figCounter.style.transform = 'scale(1)'
    }, 100)
  }

  // --- Task A: Canvas Engine ---

  function createGameCanvas(contentAreaEl: HTMLElement): {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    resize: () => void
  } {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.zIndex = '0'
    canvas.style.pointerEvents = 'none'
    contentAreaEl.appendChild(canvas)

    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const rect = contentAreaEl.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    resize()

    return { canvas, ctx, resize }
  }

  function worldToScreen(worldX: number, cameraX: number): number {
    return worldX - cameraX
  }

  function getCharacterScreenX(cssWidth: number): number {
    return CHARACTER_X_RATIO * cssWidth
  }

  function getCharacterWorldX(cameraX: number, cssWidth: number): number {
    return cameraX + getCharacterScreenX(cssWidth)
  }

  function getGroundY(cssHeight: number): number {
    return GROUND_Y_RATIO * cssHeight
  }

  function getCanvasDimensions(canvas: HTMLCanvasElement): { width: number; height: number } {
    const rect = canvas.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  // --- Task A: Controls ---

  function setupKeyboardControls(
    st: GameState,
    triggerCTAFn: () => void,
    addEvt: (target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions | boolean) => void,
  ): void {
    addEvt(window, 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (e.key === 'ArrowRight') e.preventDefault()
        st.movingRight = true
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (e.key === 'ArrowLeft') e.preventDefault()
        st.movingLeft = true
      }
      if (e.key === 'Enter' && st.ctaReady) {
        triggerCTAFn()
      }
    }) as EventListener)

    addEvt(window, 'keyup', ((e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd') {
        st.movingRight = false
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        st.movingLeft = false
      }
    }) as EventListener)
  }

  function setupTouchControls(
    st: GameState,
    wrapperEl: HTMLElement,
    triggerCTAFn: () => void,
    addEvt: (target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions | boolean) => void,
  ): void {
    let rightTouchId: number | null = null
    let leftTouchId: number | null = null
    const touchStarts: Map<number, { x: number; y: number; time: number }> = new Map()

    addEvt(wrapperEl, 'touchstart', ((e: TouchEvent) => {
      const wrapperWidth = wrapperEl.getBoundingClientRect().width
      const midpoint = wrapperWidth / 2

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const rect = wrapperEl.getBoundingClientRect()
        const localX = touch.clientX - rect.left

        touchStarts.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        })

        if (localX >= midpoint) {
          rightTouchId = touch.identifier
          st.movingRight = true
        } else {
          leftTouchId = touch.identifier
          st.movingLeft = true
        }
      }
    }) as EventListener)

    addEvt(wrapperEl, 'touchend', ((e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const startData = touchStarts.get(touch.identifier)

        if (startData) {
          const duration = Date.now() - startData.time
          const dx = Math.abs(touch.clientX - startData.x)
          const dy = Math.abs(touch.clientY - startData.y)
          const delta = Math.sqrt(dx * dx + dy * dy)

          if (duration < 300 && delta < 10 && st.ctaReady) {
            triggerCTAFn()
          }

          touchStarts.delete(touch.identifier)
        }

        if (touch.identifier === rightTouchId) {
          st.movingRight = false
          rightTouchId = null
        }
        if (touch.identifier === leftTouchId) {
          st.movingLeft = false
          leftTouchId = null
        }
      }
    }) as EventListener)
  }

  // --- Task A: Rain ---

  function createRainDrops(canvasWidth: number, canvasHeight: number): RainDrop[] {
    const drops: RainDrop[] = []
    for (let i = 0; i < 80; i++) {
      drops.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        speed: 2 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.5,
      })
    }
    return drops
  }

  function updateRainDrops(drops: RainDrop[], canvasWidth: number, groundY: number): void {
    for (let i = 0; i < drops.length; i++) {
      drops[i].y += drops[i].speed
      if (drops[i].y > groundY) {
        drops[i].y = -10
        drops[i].x = Math.random() * canvasWidth
      }
    }
  }

  function renderRain(
    ctx: CanvasRenderingContext2D,
    drops: RainDrop[],
    intensity: number,
  ): void {
    const activeCount = Math.floor(intensity * drops.length)
    ctx.font = '14px monospace'
    for (let i = 0; i < activeCount; i++) {
      const drop = drops[i]
      ctx.fillStyle = `rgba(200,200,220,${drop.opacity})`
      ctx.fillText('|', drop.x, drop.y)
    }
  }

  function getRainIntensity(filesCollected: number, hitWall: boolean): number {
    if (hitWall) return 0.0
    if (filesCollected === 0) return 0.0
    if (filesCollected === 1) return 0.2
    if (filesCollected === 2) return 0.4
    if (filesCollected === 3) return 0.6
    return 0.9
  }

  function lerpRainIntensity(st: GameState): void {
    st.currentRainIntensity += (st.targetRainIntensity - st.currentRainIntensity) * 0.02
  }

  // --- Task B: Ground Rendering ---

  function renderGround(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    groundY: number,
    canvasWidth: number,
  ): void {
    // 1. Horizontal ground line
    ctx.strokeStyle = MUTED_COLOR
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(canvasWidth, groundY)
    ctx.stroke()
    ctx.globalAlpha = 1.0

    // 2. Scrolling bumpy road texture
    const charWidth = 8.4
    const textureWidth = GROUND_TEXTURE.length * charWidth
    const startOffset = -(cameraX % textureWidth)

    ctx.font = '14px monospace'
    ctx.fillStyle = MUTED_COLOR

    let x = startOffset
    while (x < canvasWidth + textureWidth) {
      for (let i = 0; i < GROUND_TEXTURE.length; i++) {
        const drawX = x + i * charWidth
        if (drawX < -charWidth || drawX > canvasWidth + charWidth) continue
        ctx.fillText(GROUND_TEXTURE[i], drawX, groundY - 2)
      }
      x += textureWidth
    }
  }

  // --- Underground texture ---

  function seededRandom(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return n - Math.floor(n)
  }

  function renderStars(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    groundY: number,
    canvasWidth: number,
  ): void {
    const cellW = 40
    const cellH = 30
    const startCol = Math.floor(cameraX / cellW) - 1
    const endCol = Math.ceil((cameraX + canvasWidth) / cellW) + 1
    const rows = Math.ceil(groundY / cellH)

    ctx.font = '10px monospace'

    for (let row = 0; row < rows; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const r = seededRandom(col + 5000, row + 5000)
        if (r > 0.12) continue

        const screenX = col * cellW - cameraX + seededRandom(col, row + 100) * cellW * 0.8
        const screenY = row * cellH + seededRandom(col + 200, row) * cellH * 0.8

        if (screenX < -10 || screenX > canvasWidth + 10 || screenY > groundY * 0.55) continue

        const r2 = seededRandom(col + 400, row + 400)
        const twinkle = Math.sin(performance.now() * 0.001 + r2 * 100) * 0.5 + 0.5
        const chars = ['.', '*', '·', '+', '˙']
        const ch = chars[Math.floor(r2 * chars.length)]

        ctx.globalAlpha = 0.15 + twinkle * 0.25
        ctx.fillStyle = '#ffffff'
        ctx.fillText(ch, screenX, screenY)
      }
    }

    ctx.globalAlpha = 1.0
  }

  function renderUnderground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    groundY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const cellW = 14
    const cellH = 16
    const startCol = Math.floor(cameraX / cellW) - 1
    const endCol = Math.ceil((cameraX + canvasWidth) / cellW) + 1
    const startRow = 0
    const endRow = Math.ceil((canvasHeight - groundY) / cellH) + 1

    ctx.font = '12px monospace'

    for (let row = startRow; row < endRow; row++) {
      const depth = row / endRow // 0 = just below ground, 1 = deep
      const baseAlpha = 0.06 + depth * 0.12

      for (let col = startCol; col <= endCol; col++) {
        const r = seededRandom(col, row)
        const screenX = col * cellW - cameraX
        const screenY = groundY + 6 + row * cellH

        if (screenX < -cellW || screenX > canvasWidth + cellW) continue
        if (screenY > canvasHeight) continue

        // Sparse near surface, denser deeper
        const density = 0.15 + depth * 0.35
        if (r > density) continue

        const r2 = seededRandom(col + 999, row + 777)

        let ch: string
        let alpha = baseAlpha

        if (depth < 0.25) {
          // Topsoil: tiny pebbles and roots
          const chars = ['.', ',', "'", '`', '~', '-']
          ch = chars[Math.floor(r2 * chars.length)]
          alpha *= 0.8
        } else if (depth < 0.5) {
          // Gravel layer: small rocks
          const chars = ['o', '°', ':', ';', '·', '○']
          ch = chars[Math.floor(r2 * chars.length)]
        } else if (depth < 0.75) {
          // Rock layer: denser, bigger fragments
          const chars = ['#', '%', '@', '&', '■', '▪']
          ch = chars[Math.floor(r2 * chars.length)]
          alpha *= 1.2
        } else {
          // Deep bedrock
          const chars = ['█', '▓', '▒', '░', '#', '▪']
          ch = chars[Math.floor(r2 * chars.length)]
          alpha *= 1.4
        }

        // Occasional larger rock formations
        const r3 = seededRandom(col + 333, row + 555)
        if (r3 < 0.02 && depth > 0.3) {
          ch = '[@]'
          alpha *= 1.5
        }

        ctx.globalAlpha = Math.min(alpha, 0.3)
        ctx.fillStyle = MUTED_COLOR
        ctx.fillText(ch, screenX, screenY)
      }
    }

    ctx.globalAlpha = 1.0
  }

  // --- Task B: .fig Files ---

  function createFigFiles(): FigFile[] {
    return FIG_FILE_DEFS.map((def) => ({
      worldX: def.worldX,
      label: def.label,
      collected: false,
    }))
  }

  function checkCollections(figFiles: FigFile[], characterWorldX: number, tolerance: number): number[] {
    const newlyCollected: number[] = []
    for (let i = 0; i < figFiles.length; i++) {
      if (figFiles[i].collected) continue
      if (Math.abs(figFiles[i].worldX - characterWorldX) <= tolerance) {
        newlyCollected.push(i)
      }
    }
    return newlyCollected
  }

  function renderFiles(
    ctx: CanvasRenderingContext2D,
    figFiles: FigFile[],
    cameraX: number,
    groundY: number,
    canvasWidth: number,
  ): void {
    ctx.textAlign = 'center'

    for (let i = 0; i < figFiles.length; i++) {
      const file = figFiles[i]
      if (file.collected) continue

      const screenX = worldToScreen(file.worldX, cameraX)
      if (screenX < -100 || screenX > canvasWidth + 100) continue

      // File icon
      ctx.font = '14px monospace'
      ctx.globalAlpha = 0.6
      ctx.fillStyle = TEXT_COLOR
      ctx.fillText('[.fig]', screenX, groundY - 16)

      // Label above
      ctx.font = '10px monospace'
      ctx.globalAlpha = 1.0
      ctx.fillStyle = MUTED_COLOR
      ctx.fillText(file.label, screenX, groundY - 32)
    }

    ctx.globalAlpha = 1.0
    ctx.textAlign = 'start'
  }

  // --- Task B: Wall ---

  function renderWall(
    ctx: CanvasRenderingContext2D,
    wallX: number,
    cameraX: number,
    groundY: number,
    canvasHeight: number,
    shattered: boolean,
  ): void {
    if (shattered) return

    const screenX = worldToScreen(wallX, cameraX)
    const canvasWidth = ctx.canvas.getBoundingClientRect().width
    if (screenX < -50 || screenX > canvasWidth + 50) return

    // Three columns of '|' characters
    ctx.font = '14px monospace'
    ctx.fillStyle = TEXT_COLOR
    ctx.globalAlpha = 0.3

    const offsets = [0, 10, 20]
    for (const offset of offsets) {
      for (let y = 20; y <= groundY; y += 14) {
        ctx.fillText('|', screenX + offset, y)
      }
    }

    ctx.globalAlpha = 1.0

    // "PUSH TO" and "PRODUCTION" labels
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = ACCENT
    ctx.textAlign = 'center'

    const centerX = screenX + 10 // center of the 3 columns (0, 10, 20)
    ctx.fillText('PUSH TO', centerX, groundY * 0.4)
    ctx.fillText('PRODUCTION', centerX, groundY * 0.4 + 18)

    ctx.textAlign = 'start'
  }

  function checkWallCollision(characterWorldX: number, wallX: number): boolean {
    return characterWorldX + 30 >= wallX
  }

  function triggerShatter(wallScreenX: number, groundY: number): ShatterParticle[] {
    const particles: ShatterParticle[] = []
    const sourceChars = 'PUSHTORODUCTION|'

    for (let i = 0; i < 40; i++) {
      const char = Math.random() < 0.3
        ? '|'
        : sourceChars[Math.floor(Math.random() * sourceChars.length)]

      particles.push({
        char,
        x: wallScreenX + Math.random() * 20,
        y: 20 + Math.random() * (groundY - 20),
        vx: -4 + Math.random() * 12,
        vy: -6 + Math.random() * 8,
        opacity: 1.0,
        life: 60,
      })
    }

    return particles
  }

  function updateShatterParticles(particles: ShatterParticle[]): ShatterParticle[] {
    const alive: ShatterParticle[] = []

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.3
      p.opacity -= 0.015
      p.life -= 1

      if (p.life > 0 && p.opacity > 0) {
        alive.push(p)
      }
    }

    return alive
  }

  function renderShatterParticles(ctx: CanvasRenderingContext2D, particles: ShatterParticle[]): void {
    ctx.font = '14px monospace'
    ctx.fillStyle = TEXT_COLOR

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      ctx.globalAlpha = p.opacity
      ctx.fillText(p.char, p.x, p.y)
    }

    ctx.globalAlpha = 1.0
  }

  // --- Task C: Character Rendering & Animation ---

  function renderCharacter(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    groundY: number,
    face: string,
    hopOffset: number,
    bounceOffset: number,
  ): void {
    // Draw face
    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = TEXT_COLOR
    const faceWidth = ctx.measureText(face).width
    ctx.fillText(face, screenX - faceWidth / 2, groundY - 24 + hopOffset + bounceOffset)

  }

  function updateHop(st: GameState): void {
    if (st.movingRight || st.movingLeft) {
      st.hopPhase += 0.15
      st.hopOffset = Math.sin(st.hopPhase) * 3
    } else {
      st.hopOffset *= 0.9
      st.hopPhase = 0
    }
  }

  function updateBounce(st: GameState): void {
    if (!st.isBouncing) return
    st.bounceOffset += st.bounceVelocity
    st.bounceVelocity += 0.8
    if (st.bounceOffset >= 0) {
      st.bounceOffset = 0
      st.isBouncing = false
    }
  }

  function startBounce(st: GameState): void {
    st.isBouncing = true
    st.bounceVelocity = -8
    st.bounceOffset = 0
  }

  function getFace(st: GameState): string {
    if (st.catharsisPhase !== 'none') {
      if (st.catharsisPhase === 'shock') return FACES.SHOCK
      if (st.catharsisPhase === 'released') return FACES.RELEASED
      if (st.catharsisPhase === 'happy') return FACES.HAPPY
    }
    if (st.filesCollected === 0) return FACES.NEUTRAL
    if (st.filesCollected <= 2) return FACES.TIRED
    return FACES.BROKEN
  }

  function transitionFaceOnCanvas(
    st: GameState,
    from: string,
    to: string,
    safeTimeoutFn: (fn: () => void, ms: number) => number,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const chars = from.split('')
      let lastDiffIndex = -1

      for (let i = 0; i < 7; i++) {
        if (from[i] !== to[i]) {
          lastDiffIndex = i
        }
      }

      if (lastDiffIndex === -1) {
        st.currentFace = to
        resolve()
        return
      }

      st.faceTransitioning = true

      for (let i = 0; i < 7; i++) {
        if (from[i] !== to[i]) {
          const idx = i
          safeTimeoutFn(() => {
            chars[idx] = to[idx]
            st.currentFace = chars.join('')
            if (idx === lastDiffIndex) {
              st.faceTransitioning = false
              resolve()
            }
          }, i * FACE_CHAR_DELAY)
        }
      }
    })
  }

  // --- CTA ---

  function triggerCTA(): void {
    if (state.ctaReady) {
      window.open('https://www.linkedin.com/in/jakubsalmik/', '_blank')
    }
  }

  // --- Catharsis ---

  let textZone: HTMLElement | null = null
  let textCurrent: HTMLElement | null = null
  let textHistory: HTMLElement | null = null
  let idleCursor: HTMLElement | null = null
  let idleCursorBlinkId: number | null = null

  function showIdleCursor(): void {
    if (!textCurrent || !idleCursor) return
    idleCursor.textContent = '> █'
    idleCursor.style.display = ''
    idleCursor.style.opacity = '1'
    if (idleCursorBlinkId) { clearInterval(idleCursorBlinkId); intervalIds.delete(idleCursorBlinkId) }
    idleCursorBlinkId = safeInterval(() => {
      if (idleCursor) idleCursor.style.opacity = idleCursor.style.opacity === '0' ? '1' : '0'
    }, 500)
  }

  function hideIdleCursor(): void {
    if (!idleCursor) return
    idleCursor.style.display = 'none'
    if (idleCursorBlinkId) { clearInterval(idleCursorBlinkId); intervalIds.delete(idleCursorBlinkId); idleCursorBlinkId = null }
  }

  function archiveCurrentText(): void {
    if (!textCurrent || !textHistory) return
    // Move current text content to top of history (grayed out, newest first)
    const fragment = document.createDocumentFragment()
    const children = Array.from(textCurrent.childNodes)
    for (const child of children) {
      const clone = child.cloneNode(true) as HTMLElement
      if (clone.style) {
        clone.style.color = MUTED_COLOR
        clone.style.fontWeight = 'normal'
      }
      fragment.appendChild(clone)
    }
    textHistory.insertBefore(fragment, textHistory.firstChild)
    textCurrent.innerHTML = ''
    if (textZone) textZone.scrollTop = 0
  }

  function startCatharsis(): void {
    state.catharsisRunning = true
    state.catharsisPhase = 'shock'
    state.currentFace = FACES.SHOCK
    state.movingRight = false
    state.movingLeft = false

    // Lightning flash
    triggerLightning()

    // Wall shatter
    const dims = gameCanvas ? getCanvasDimensions(gameCanvas) : { width: 800, height: 600 }
    const wallScreenX = worldToScreen(WALL_X, state.cameraX)
    const groundY = getGroundY(dims.height)
    state.shatterParticles = triggerShatter(wallScreenX, groundY)
    state.wallShattered = true

    // Bounce character + start happy idle immediately
    startBounce(state)
    state.happyIdle = true

    // Fireworks — start and keep looping
    const fwDims = gameCanvas ? getCanvasDimensions(gameCanvas) : { width: 800, height: 600 }
    scheduleFireworks(fwDims.width, getGroundY(fwDims.height))

    // Text at 200ms
    safeTimeout(() => {
      if (textCurrent) {
        archiveCurrentText()
        const div = document.createElement('div')
        hideIdleCursor()
        div.textContent = '> PUSHED TO PRODUCTION.'
        div.style.fontWeight = 'bold'
        textCurrent.appendChild(div)
        showIdleCursor()
      }
    }, 200)

    // Rain to 0 at 500ms
    safeTimeout(() => {
      state.targetRainIntensity = 0
    }, 500)

    // Face SHOCK -> RELEASED at 2000ms
    safeTimeout(() => {
      state.catharsisPhase = 'released'
      transitionFaceOnCanvas(state, FACES.SHOCK, FACES.RELEASED, safeTimeout)
    }, 2000)

    // Shipped text at 2200ms
    safeTimeout(() => {
      if (textCurrent) {
        archiveCurrentText()
        typewriteLines(textCurrent,
          ['> Shipped.', '> Your user can finally see it.', "> That's what Design Engineering is."],
          CHAR_DELAY, 400)
      }
    }, 2200)

    // Counter countdown at 4500ms
    safeTimeout(() => {
      let count = state.filesCollected
      const countdownInterval = safeInterval(() => {
        count--
        setFigCount(Math.max(count, 0))
        pulseFigCounter()
        if (count <= 0) {
          clearInterval(countdownInterval)
          intervalIds.delete(countdownInterval)
          setFigCount(0, true)
        }
      }, 120)
    }, 4500)

    // Face RELEASED -> HAPPY at 6000ms + start happy idle
    safeTimeout(() => {
      state.catharsisPhase = 'happy'
      transitionFaceOnCanvas(state, FACES.RELEASED, FACES.HAPPY, safeTimeout)
    }, 6000)

    // Final text at 6200ms (green/ACCENT)
    safeTimeout(() => {
      if (textCurrent) {
        archiveCurrentText()
        typewriteLines(textCurrent, [
          '> This isn\'t a critique.',
          '> Designs stuck in Figma aren\'t your fault.',
          '>',
          '> But shipping them?',
          '> That part\'s on you.',
          '>',
          isMobile ? '> Wanna talk about it? [tap]' : '> Wanna talk about it? [\u21B5]',
        ], CHAR_DELAY, 400, undefined, () => {
          state.ctaReady = true
        }, ACCENT)
      }
    }, 6200)
  }

  // --- Game variables ---

  let gameCanvas: HTMLCanvasElement | null = null
  let gameCtx: CanvasRenderingContext2D | null = null

  function onFileCollected(totalCollected: number): void {
    setFigCount(totalCollected)
    pulseFigCounter()

    // Rain intensity
    state.targetRainIntensity = getRainIntensity(totalCollected, state.hitWall)

    // Start lightning after first file
    if (totalCollected === 1 && gameCanvas) {
      const dims = getCanvasDimensions(gameCanvas)
      scheduleAmbientLightning(dims.width, getGroundY(dims.height))
    }


    // Narrative text
    const narrative = NARRATIVE[totalCollected]
    if (narrative && textCurrent) {
      archiveCurrentText()
      typewriteLines(textCurrent, narrative, CHAR_DELAY, 600)
    }

    // Face transition
    const newFace = getFace(state)
    if (newFace !== state.currentFace && !state.faceTransitioning) {
      state.targetFace = newFace
      transitionFaceOnCanvas(state, state.currentFace, newFace, safeTimeout)
    }
  }

  // --- Game loop ---

  const TARGET_FPS = 60
  const TARGET_FRAME_MS = 1000 / TARGET_FPS
  let lastFrameTime = 0

  function gameLoop(time: number): void {
    if (!state.gameRunning || !gameCtx || !gameCanvas) return

    // Delta-time: normalize speed to 60fps regardless of actual framerate
    if (lastFrameTime === 0) lastFrameTime = time
    const deltaMs = Math.min(time - lastFrameTime, 50) // cap at 50ms to avoid jumps
    lastFrameTime = time
    const dt = deltaMs / TARGET_FRAME_MS // 1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps

    const dims = getCanvasDimensions(gameCanvas)
    const { width, height } = dims
    const groundY = getGroundY(height)
    const charScreenX = getCharacterScreenX(width)

    // Input processing
    if (!state.catharsisRunning) {
      const speed = MOVE_SPEED * dt
      if (state.movingRight && !state.hitWall) state.cameraX += speed
      if (state.movingLeft && state.cameraX > 0) state.cameraX -= speed
      state.cameraX = Math.max(0, Math.min(state.cameraX, WORLD_WIDTH - width))
    }

    const charWorldX = getCharacterWorldX(state.cameraX, width)

    // File collection
    if (!state.hitWall) {
      const collected = checkCollections(state.figFiles, charWorldX, COLLECTION_TOLERANCE)
      for (const idx of collected) {
        state.figFiles[idx].collected = true
        state.filesCollected++
        onFileCollected(state.filesCollected)
      }
    }

    // Wall collision
    if (!state.hitWall && checkWallCollision(charWorldX, WALL_X)) {
      state.hitWall = true
      startCatharsis()
    }

    // Animations
    updateHop(state)
    updateBounce(state)

    // Rain
    lerpRainIntensity(state)
    updateRainDrops(state.rainDrops, width, groundY)

    // Shatter particles
    if (state.shatterParticles.length > 0) {
      state.shatterParticles = updateShatterParticles(state.shatterParticles)
    }

    // Lightning bolts
    if (state.lightningBolts.length > 0) {
      state.lightningBolts = updateLightningBolts(state.lightningBolts)
    }

    // Fireworks
    if (state.fireworks.length > 0) {
      state.fireworks = updateFireworks(state.fireworks)
    }

    // Happy idle
    updateHappyIdle(state)

    // === RENDER ===
    gameCtx.clearRect(0, 0, width, height)


    renderStars(gameCtx, state.cameraX, groundY, width)
    renderGround(gameCtx, state.cameraX, groundY, width)
    if (!isMobile) renderUnderground(gameCtx, state.cameraX, groundY, width, height)
    renderFiles(gameCtx, state.figFiles, state.cameraX, groundY, width)
    renderWall(gameCtx, WALL_X, state.cameraX, groundY, height, state.wallShattered)
    renderCharacter(gameCtx, charScreenX, groundY, state.currentFace, state.hopOffset, state.bounceOffset)
    renderShatterParticles(gameCtx, state.shatterParticles)
    renderRain(gameCtx, state.rainDrops, state.currentRainIntensity)
    renderLightningBolts(gameCtx, state.lightningBolts)
    renderFireworks(gameCtx, state.fireworks)

    safeRaf(gameLoop)
  }

  // --- Start game ---

  function startGame(): void {
    // Remove contentArea padding (canvas fills it)
    contentArea.style.padding = '0'

    // Create game canvas
    const result = createGameCanvas(contentArea)
    gameCanvas = result.canvas
    gameCtx = result.ctx
    addEventListener(window, 'resize', result.resize)

    // Create text zone with current + history sections
    textZone = document.createElement('div')
    textCurrent = document.createElement('div')
    textHistory = document.createElement('div')
    Object.assign(textHistory.style, { marginTop: '12px' })

    idleCursor = document.createElement('div')
    Object.assign(idleCursor.style, { color: MUTED_COLOR, display: 'none' })

    if (isMobile) {
      Object.assign(textZone.style, {
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '35%',
        padding: '10px 16px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        lineHeight: '1.7',
        zIndex: '2',
        background: 'linear-gradient(transparent, rgba(10,10,10,0.95) 15%)',
      })
      textZone.appendChild(idleCursor)
      textZone.appendChild(textCurrent)
      textZone.appendChild(textHistory)
      contentArea.appendChild(textZone)
    } else {
      Object.assign(textZone.style, {
        flex: '1',
        padding: '16px 20px',
        overflowY: 'auto',
        lineHeight: '1.7',
      })
      textZone.appendChild(idleCursor)
      textZone.appendChild(textCurrent)
      textZone.appendChild(textHistory)
      textPane.appendChild(textZone)
    }

    // Initialize state
    const dims = getCanvasDimensions(gameCanvas)
    state.figFiles = createFigFiles()
    state.rainDrops = createRainDrops(dims.width, dims.height)
    state.currentFace = FACES.NEUTRAL
    state.targetFace = FACES.NEUTRAL
    state.gameRunning = true

    // Wire controls
    setupKeyboardControls(state, triggerCTA, addEventListener)
    if (!isMobile) {
      setupTouchControls(state, wrapper, triggerCTA, addEventListener)
    }

    // Mobile move button: hold to move right
    if (isMobile && mobileMoveButton) {
      mobileMoveButton.style.display = 'flex'
      addEventListener(mobileMoveButton, 'touchstart', ((e: TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        state.movingRight = true
      }) as EventListener, { passive: false })
      addEventListener(mobileMoveButton, 'touchend', (() => {
        state.movingRight = false
      }) as EventListener)
      addEventListener(mobileMoveButton, 'touchcancel', (() => {
        state.movingRight = false
      }) as EventListener)
    }

    // Show initial text
    typewriteLines(textCurrent!, NARRATIVE[0]!, CHAR_DELAY, 600)

    // Show fig counter
    figCounter.style.opacity = '1'


    // Start game loop
    safeRaf(gameLoop)
  }

  // --- Boot sequence ---

  function runBootSequence(): void {
    const loginLine = 'Last login: Thu Mar 26 09:41:22 on ttys001\n'
    const cmdLine = '$ run your-figma-sucks'

    bootText.textContent = loginLine

    let charIndex = 0
    const cmdInterval = safeInterval(() => {
      if (charIndex < cmdLine.length) {
        bootText.textContent = loginLine + cmdLine.substring(0, charIndex + 1)
        charIndex++
      } else {
        clearInterval(cmdInterval)
        intervalIds.delete(cmdInterval)

        safeTimeout(() => {
          bootText.style.opacity = '0'
          safeTimeout(() => {
            bootText.style.display = 'none'
            startGame()
          }, 300)
        }, 800)
      }
    }, CHAR_DELAY)
  }

  // --- Splash screen ---
  function showSplashScreen(): void {
    const splash = document.createElement('div')
    Object.assign(splash.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '30',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: BG,
      transition: 'opacity 0.4s',
    })

    const titleFontSize = isMobile ? '8px' : '14px'
    const titleLineHeight = isMobile ? '9px' : '15px'

    const fontStyle = {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: titleFontSize,
      lineHeight: titleLineHeight,
      letterSpacing: '0px',
      margin: '0',
      userSelect: 'none',
      whiteSpace: 'pre' as const,
    }

    function makeBold(lines: string[]): string {
      return lines.map(line =>
        line.split('').map(ch => ch === '█' ? '██' : '  ').join('')
      ).join('\n')
    }

    function makeWordBlock(word: string): { wrap: HTMLElement; text: string } {
      const text = makeBold(renderSplashWord(word))
      const wrap = document.createElement('div')
      Object.assign(wrap.style, { position: 'relative', display: 'inline-block' })

      const shadow = document.createElement('pre')
      Object.assign(shadow.style, { ...fontStyle, color: '#444', position: 'absolute', top: '6px', left: '6px' })
      shadow.textContent = text

      const glow = document.createElement('pre')
      Object.assign(glow.style, { ...fontStyle, color: ACCENT, position: 'absolute', top: '3px', left: '3px', opacity: '1' })
      glow.textContent = text

      const main = document.createElement('pre')
      Object.assign(main.style, { ...fontStyle, color: TEXT_COLOR, position: 'relative' })
      main.textContent = text

      wrap.appendChild(shadow)
      wrap.appendChild(glow)
      wrap.appendChild(main)

      return { wrap, text }
    }

    // Distort FIGMA pixel rows — shift some rows, corrupt some chars
    function distortLines(lines: string[]): string[] {
      const shifts = [0, 0, 0, 1, 0] // barely visible shift on one row
      return lines.map((line, i) => {
        const shift = shifts[i % shifts.length]
        // Pad and shift
        const padded = '  ' + line + '  '
        const start = Math.max(0, 2 - shift)
        const shifted = padded.substring(start, start + line.length)
        return shifted
      })
    }

    // Build words
    const yourBlock = makeWordBlock('YOUR')
    const sucksBlock = makeWordBlock('SUCKS')

    // FIGMA gets distorted pixel data
    const figmaRaw = renderSplashWord('FIGMA')
    const figmaDistorted = distortLines(figmaRaw)
    const figmaText = figmaDistorted.map(line =>
      line.split('').map(ch => ch === ' ' ? '  ' : ch + ch).join('')
    ).join('\n')

    const figmaWrap = document.createElement('div')
    Object.assign(figmaWrap.style, { position: 'relative', display: 'inline-block' })

    const figmaShadow = document.createElement('pre')
    Object.assign(figmaShadow.style, { ...fontStyle, color: '#444', position: 'absolute', top: '6px', left: '6px' })
    figmaShadow.textContent = figmaText

    const figmaGlow = document.createElement('pre')
    Object.assign(figmaGlow.style, { ...fontStyle, color: ACCENT, position: 'absolute', top: '3px', left: '3px', opacity: '1' })
    figmaGlow.textContent = figmaText

    const figmaMain = document.createElement('pre')
    Object.assign(figmaMain.style, { ...fontStyle, color: TEXT_COLOR, position: 'relative' })
    figmaMain.textContent = figmaText

    // Green offset ghost — static shift
    const figmaGhost = document.createElement('pre')
    Object.assign(figmaGhost.style, { ...fontStyle, color: ACCENT, position: 'absolute', top: '-1px', left: '3px', opacity: '1' })
    figmaGhost.textContent = figmaText

    figmaWrap.appendChild(figmaShadow)
    figmaWrap.appendChild(figmaGlow)
    figmaWrap.appendChild(figmaGhost)
    figmaWrap.appendChild(figmaMain)

    // Stack words
    const titleWrap = document.createElement('div')
    Object.assign(titleWrap.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '4px' : '8px' })
    titleWrap.appendChild(yourBlock.wrap)
    titleWrap.appendChild(figmaWrap)
    titleWrap.appendChild(sucksBlock.wrap)

    const prompt = document.createElement('div')
    Object.assign(prompt.style, {
      marginTop: '32px',
      color: MUTED_COLOR,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: isMobile ? '11px' : FONT_SIZE,
      userSelect: 'none',
      letterSpacing: '3px',
      textTransform: 'uppercase',
    })
    prompt.textContent = isMobile ? '[ tap to start ]' : '[ press enter to start ]'

    // Blink the prompt
    const blinkId = safeInterval(() => {
      prompt.style.opacity = prompt.style.opacity === '0' ? '1' : '0'
    }, 800)

    splash.appendChild(titleWrap)
    splash.appendChild(prompt)
    splitContainer.style.position = 'relative'
    splitContainer.appendChild(splash)

    let started = false
    function startFromSplash(): void {
      if (started) return
      started = true
      clearInterval(blinkId)
      intervalIds.delete(blinkId)

      splash.style.opacity = '0'
      safeTimeout(() => {
        splash.remove()
        runBootSequence()
      }, 400)
    }

    addEventListener(window, 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'Enter') startFromSplash()
    }) as EventListener)

    addEventListener(splash, 'touchend', (() => {
      startFromSplash()
    }) as EventListener)
  }

  showSplashScreen()

  // --- Cleanup ---
  return function cleanup(): void {
    state.gameRunning = false
    timeoutIds.forEach((id) => clearTimeout(id))
    timeoutIds.clear()
    intervalIds.forEach((id) => clearInterval(id))
    intervalIds.clear()
    rafIds.forEach((id) => cancelAnimationFrame(id))
    rafIds.clear()
    eventCleanups.forEach((fn) => fn())
    eventCleanups.length = 0
    container.innerHTML = ''
  }
}
