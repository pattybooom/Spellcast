import { useEffect, useRef, useState } from 'react'
import type { LampState } from '../electron/preload'
import { useHandTracking } from './tracking/useHandTracking'
import { useHandOverlay } from './tracking/useHandOverlay'
import { useLampTargeting } from './targeting/useLampTargeting'
import { useTwoHandLampControl } from './control/useTwoHandLampControl'
import { playDing, playUnselectDing, primeDingAudio } from './audio/ding'
import { rayToPreviewEdge, type NormalizedBox } from './targeting/rayTargeting'
import type { ScreenPoint } from './tracking/projection'

type CameraState = 'idle' | 'starting' | 'live' | 'error'
type Nav = 'studio' | 'devices' | 'tracking'
const LAMP_BOX_STORAGE_KEY = 'spellcast.lamp-calibration.v1'

function loadLampBox(): NormalizedBox | null {
  try {
    const value = localStorage.getItem(LAMP_BOX_STORAGE_KEY)
    if (!value) return null
    const box = JSON.parse(value) as NormalizedBox
    if ([box.x, box.y, box.width, box.height].every(Number.isFinite)
      && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0
      && box.x + box.width <= 1 && box.y + box.height <= 1) return box
  } catch {
    // A missing or invalid calibration simply means the lamp needs calibrating again.
  }
  return null
}

function normalizedBox(a: ScreenPoint, b: ScreenPoint, width: number, height: number): NormalizedBox {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths: Record<string, React.ReactNode> = {
    aperture: <><circle cx="12" cy="12" r="9"/><path d="m14.5 3.4-2.6 5.1M20.2 8.8l-5.7.5m4.1 9.3-3.1-4.8m-8.7 5.7.8-5.7m-4.9-7 5.8.8"/></>,
    camera: <><path d="M14 5h-4l-1.5 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14 5Z"/><circle cx="12" cy="13" r="3.2"/></>,
    hand: <><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11 4a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6.5a7 7 0 0 1-7 7h-1a7 7 0 0 1-6.1-3.6L3 14.2a1.8 1.8 0 0 1 3-2.1L8 15"/></>,
    bulb: <><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.7.5 1 1.2 1 2.3h6c0-1.1.3-1.8 1-2.3A7 7 0 0 0 12 2Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.6.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.6-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.7Z" transform="translate(-2 -2) scale(1.16)"/></>,
    play: <path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="none"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    close: <path d="M6 6l12 12M18 6 6 18"/>
  }
  return <svg {...common}>{paths[name] ?? null}</svg>
}

const NAV: { id: Nav; label: string; icon: string }[] = [
  { id: 'studio', label: 'Studio', icon: 'grid' },
  { id: 'devices', label: 'Devices', icon: 'bulb' },
  { id: 'tracking', label: 'Tracking', icon: 'hand' }
]

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night.' : h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.'
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const targetOverlayRef = useRef<SVGSVGElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequestRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(false)
  const lastDingTargetRef = useRef(0)
  const wasLampSelectedRef = useRef(false)
  const brightnessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [error, setError] = useState('')
  const [nav, setNav] = useState<Nav>('studio')
  const [lampOn, setLampOn] = useState(true)
  const [brightness, setBrightness] = useState(72)
  const [lampConnection, setLampConnection] = useState<LampState['connection']>('connecting')
  const [lampError, setLampError] = useState('')
  const [lampBox, setLampBox] = useState<NormalizedBox | null>(loadLampBox)
  const [calibrating, setCalibrating] = useState(false)
  const [calibrationDraft, setCalibrationDraft] = useState<NormalizedBox | null>(null)
  const calibrationStartRef = useRef<ScreenPoint | null>(null)

  const tracking = useHandTracking(videoRef, camera === 'live')
  useHandOverlay(videoRef, overlayRef, tracking.resultsRef, camera === 'live' && tracking.status !== 'error')
  const targeting = useLampTargeting(videoRef, targetOverlayRef, tracking.resultsRef, camera === 'live' && tracking.status === 'ready', lampBox)
  const lampSelected = targeting.targeted
  const controlPose = useTwoHandLampControl(tracking.resultsRef, camera === 'live' && tracking.status === 'ready', lampSelected, targeting.selectorHandIndex, targeting.selectorHandedness)

  useEffect(() => {
    if (targeting.targetEntry <= lastDingTargetRef.current) return
    lastDingTargetRef.current = targeting.targetEntry
    playDing()
  }, [targeting.targetEntry])

  useEffect(() => {
    if (wasLampSelectedRef.current && !lampSelected) playUnselectDing()
    wasLampSelectedRef.current = lampSelected
  }, [lampSelected])

  useEffect(() => {
    const applyLampState = (state: LampState) => {
      setLampConnection(state.connection)
      setLampError(state.error ?? '')
      if (state.state) setLampOn(state.state === 'ON')
      if (state.brightness !== null) setBrightness(Math.round(state.brightness / 254 * 100))
    }
    const unsubscribe = window.spellcast.onLampState(applyLampState)
    void window.spellcast.getLampState().then(applyLampState)
    return () => {
      unsubscribe()
      if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current)
    }
  }, [])

  useEffect(() => {
    void primeDingAudio()
    const unlockAudio = () => { void primeDingAudio() }
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  function changeBrightness(value: number) {
    setBrightness(value)
    if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current)
    brightnessTimerRef.current = setTimeout(() => {
      void window.spellcast.setLampBrightness(Math.round(value / 100 * 254)).then(result => {
        if (!result.ok) setLampError(result.error ?? 'Could not set brightness.')
      })
    }, 140)
  }

  function setPower(on: boolean) {
    setLampOn(on)
    void window.spellcast.setLampPower(on ? 'ON' : 'OFF').then(result => {
      if (!result.ok) setLampError(result.error ?? 'Could not change lamp power.')
    })
  }

  async function startCamera() {
    if (cameraRequestRef.current) return cameraRequestRef.current
    setCamera('starting')
    setError('')
    const request = (async () => {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        if (!mountedRef.current) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCamera('live')
      } catch (cause) {
        stream?.getTracks().forEach(track => track.stop())
        streamRef.current = null
        if (!mountedRef.current) return
        const message = cause instanceof Error ? cause.message : 'Camera access could not be started.'
        setError(message.includes('NotAllowed') ? 'Camera access is blocked. Allow Spellcast in System Settings → Privacy & Security → Camera.' : message)
        setCamera('error')
      }
    })()
    cameraRequestRef.current = request
    try {
      await request
    } finally {
      if (cameraRequestRef.current === request) cameraRequestRef.current = null
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera('idle')
  }

  function cancelCalibration() {
    calibrationStartRef.current = null
    setCalibrationDraft(null)
    setCalibrating(false)
  }

  function calibrationPoint(event: React.PointerEvent<SVGSVGElement>): ScreenPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    }
  }

  function beginCalibration(event: React.PointerEvent<SVGSVGElement>) {
    if (!calibrating) return
    const point = calibrationPoint(event)
    calibrationStartRef.current = point
    event.currentTarget.setPointerCapture(event.pointerId)
    setCalibrationDraft({ x: point.x / event.currentTarget.clientWidth, y: point.y / event.currentTarget.clientHeight, width: 0, height: 0 })
  }

  function moveCalibration(event: React.PointerEvent<SVGSVGElement>) {
    const start = calibrationStartRef.current
    if (!calibrating || !start) return
    const rect = event.currentTarget.getBoundingClientRect()
    setCalibrationDraft(normalizedBox(start, calibrationPoint(event), rect.width, rect.height))
  }

  function finishCalibration(event: React.PointerEvent<SVGSVGElement>) {
    const start = calibrationStartRef.current
    if (!calibrating || !start) return
    const rect = event.currentTarget.getBoundingClientRect()
    const box = normalizedBox(start, calibrationPoint(event), rect.width, rect.height)
    calibrationStartRef.current = null
    if (box.width < 0.012 || box.height < 0.012) {
      setCalibrationDraft(null)
      return
    }
    setLampBox(box)
    try { localStorage.setItem(LAMP_BOX_STORAGE_KEY, JSON.stringify(box)) } catch { /* Keep this session's calibration if storage is unavailable. */ }
    setCalibrationDraft(null)
    setCalibrating(false)
  }

  useEffect(() => {
    if (!calibrating) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelCalibration() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [calibrating])

  useEffect(() => {
    mountedRef.current = true
    void startCamera()
    return () => {
      mountedRef.current = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const live = camera === 'live'
  const statusLabel = live ? 'Camera live' : camera === 'starting' ? 'Connecting' : camera === 'error' ? 'Camera unavailable' : 'Camera off'

  const rayEnd = targeting.ray ? rayToPreviewEdge(targeting.ray, targeting.width, targeting.height) : null
  const lampRect = lampBox && targeting.width > 0 && targeting.height > 0
    ? { x: lampBox.x * targeting.width, y: lampBox.y * targeting.height, width: lampBox.width * targeting.width, height: lampBox.height * targeting.height }
    : null
  const draftRect = calibrationDraft && targeting.width > 0 && targeting.height > 0
    ? { x: calibrationDraft.x * targeting.width, y: calibrationDraft.y * targeting.height, width: calibrationDraft.width * targeting.width, height: calibrationDraft.height * targeting.height }
    : null
  const lampLabelX = lampRect ? Math.max(8, Math.min(targeting.width - 150, lampRect.x)) : 0
  const lampLabelY = lampRect ? Math.max(24, lampRect.y - 15) : 0

  return <main className={`shell ${live ? 'is-live' : ''} ${calibrating ? 'is-calibrating' : ''}`}>
    {/* Canvas: the camera is the interface */}
    <div className="canvas" aria-label="Camera preview">
      <div className="ambient" aria-hidden="true"><i/><i/><i/></div>
      <video ref={videoRef} className="camera-feed" muted playsInline aria-label="Live camera feed" />
      <canvas ref={overlayRef} className="landmark-overlay" aria-hidden="true" />
      <svg
        ref={targetOverlayRef}
        className="target-overlay"
        viewBox={`0 0 ${targeting.width || 1} ${targeting.height || 1}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerDown={beginCalibration}
        onPointerMove={moveCalibration}
        onPointerUp={finishCalibration}
        onPointerCancel={cancelCalibration}
      >
        {targeting.ray && rayEnd && <g className={`pointing-ray ${targeting.targeted ? 'targeted' : ''}`}>
          <line x1={targeting.ray.origin.x} y1={targeting.ray.origin.y} x2={rayEnd.x} y2={rayEnd.y}/>
          <circle cx={targeting.ray.origin.x} cy={targeting.ray.origin.y} r="4"/>
        </g>}
        {lampRect && <g className={`lamp-bounds ${targeting.aiming ? 'aiming' : ''} ${targeting.targeted ? 'targeted' : ''}`}>
          <rect className="bounds-fill" x={lampRect.x} y={lampRect.y} width={lampRect.width} height={lampRect.height} rx="9"/>
          <rect className="bounds-line" x={lampRect.x} y={lampRect.y} width={lampRect.width} height={lampRect.height} rx="9"/>
          <rect className="bounds-label-bg" x={lampLabelX} y={lampLabelY - 16} width="142" height="24" rx="12"/>
          <text className="bounds-label" x={lampLabelX + 71} y={lampLabelY} textAnchor="middle">{targeting.targeted ? 'LAMP TARGETED' : targeting.aiming ? `AIMING · ${Math.round(targeting.dwellProgress * 100)}%` : 'LAMP · CALIBRATED'}</text>
        </g>}
        {draftRect && <rect className="calibration-draft" x={draftRect.x} y={draftRect.y} width={draftRect.width} height={draftRect.height} rx="8"/>}
      </svg>
      <div className="scrim" aria-hidden="true" />
    </div>

    {calibrating && <div className="calibration-hud glass-strong">
      <span>DRAG AROUND THE LAMP</span>
      <small>Draw a box over the lamp in the camera view · Esc to cancel</small>
      <button onClick={cancelCalibration}>Cancel</button>
    </div>}

    {live && <div className="reticle" aria-hidden="true">
      <span className="ring"/><span className="ring r2"/><span className="tick t1"/><span className="tick t2"/><span className="tick t3"/><span className="tick t4"/><span className="dot"/>
      <div className="gesture-chip glass"><Icon name="hand" size={14}/>{tracking.status === 'loading' ? 'Loading hand model…' : tracking.status === 'error' ? 'Tracking unavailable' : tracking.handCount > 0 ? `${tracking.handCount} ${tracking.handCount === 1 ? 'hand' : 'hands'} detected` : 'Waiting for a hand'}</div>
    </div>}

    <header className="topbar">
      <a className="brand glass" href="#studio" aria-label="Spellcast home"><Icon name="aperture" size={20}/><span>Spellcast</span></a>
      <div className="top-actions glass">
        <span className="pill" title={lampError || undefined}><i className={lampConnection === 'connected' ? 'dot-on' : 'dot-off'}/>{lampConnection === 'connected' ? 'Zigbee connected' : lampConnection === 'connecting' ? 'Zigbee connecting' : 'Zigbee offline'}</span>
        <span className="sep"/>
        <span className="pill"><i className={live ? 'dot-live' : 'dot-off'}/>{statusLabel}</span>
        <span className="sep"/>
        <button className="icon-button" aria-label="Settings" title="Settings"><Icon name="settings" size={16}/></button>
      </div>
    </header>

    <nav className="dock glass" aria-label="Main navigation">
      {NAV.map(item => <button key={item.id} className={`dock-item ${nav === item.id ? 'selected' : ''}`} aria-label={item.label} aria-current={nav === item.id} onClick={() => setNav(item.id)}><Icon name={item.icon}/><span className="tip">{item.label}</span></button>)}
      <span className="dock-spacer"/>
      <button className="dock-item" aria-label="Settings"><Icon name="settings"/><span className="tip">Settings</span></button>
      <span className="avatar">S</span>
    </nav>

    <section className="hero" id="studio">
      <h1>{greeting()}</h1>
      <p>Your space, within reach.</p>
    </section>

    {!live && <div className="invite glass-strong">
      <div className="invite-icon"><Icon name="camera" size={24}/><span/></div>
      <h2>{camera === 'error' ? 'Camera needs attention' : camera === 'starting' ? 'Starting your view' : 'Your view starts here'}</h2>
      <p>{camera === 'error' ? error : camera === 'starting' ? 'Requesting camera access…' : 'Turn on your camera to begin hand tracking.'}</p>
      {camera !== 'error'
        ? <button className="primary-button" onClick={startCamera} disabled={camera === 'starting'}><Icon name="play" size={13}/>{camera === 'starting' ? 'Connecting…' : 'Enable camera'}</button>
        : <button className="primary-button" onClick={startCamera}>Try again</button>}
      <small>Processed on this Mac. Video is never stored.</small>
    </div>}

    {live && <div className="live-bar glass">
      <span className="pill"><i className="dot-live"/>Live</span>
      <span className="readout">1280 × 720</span>
      <span className="sep"/>
      <span className="readout">30 fps target</span>
      <button className="stop-button" onClick={stopCamera} aria-label="Turn camera off"><Icon name="stop" size={12}/>Stop</button>
    </div>}

    {lampSelected && <aside className="control glass-strong" aria-label="Living room lamp controls">
      <div className="control-head">
        <div><strong>Living room lamp</strong><span>{lampOn ? `${brightness}% brightness` : 'Off'}</span></div>
        <span className="hand-control-status">HAND 2 · {controlPose === null ? 'WAITING' : controlPose === 0 ? 'FIST · OFF' : `${controlPose} FINGER${controlPose === 1 ? '' : 'S'} · ${controlPose * 20}%`}</span>
      </div>
      <div className="control-level" style={{ ['--v' as string]: `${lampOn ? brightness : 0}%` }}>
        <span className="level-num">{lampOn ? brightness : 0}</span>
        <input type="range" min={1} max={100} value={brightness} disabled={!lampOn || lampConnection !== 'connected'} aria-label="Brightness" onChange={e => changeBrightness(Number(e.target.value))}/>
      </div>
      <button className={`switch ${lampOn ? 'on' : ''}`} role="switch" aria-checked={lampOn} disabled={lampConnection !== 'connected'} onClick={() => setPower(!lampOn)}><i/><span>{lampOn ? 'On' : 'Off'}</span></button>
    </aside>}

    <section className="tray">
      <article className="panel glass">
        <div className="panel-head"><div><h2>Hand tracking</h2><p>Landmarks and gesture input</p></div><span className={`tag tracking-${tracking.status}`} title={tracking.error || undefined}><i/>{tracking.status === 'loading' ? 'Loading' : tracking.status === 'ready' ? 'Ready' : tracking.status === 'error' ? 'Unavailable' : 'Not active'}</span></div>
        <div className="panel-body">
          <div className="hand-orbit"><Icon name="hand" size={22}/><span className="orbit a"/><span className="orbit b"/></div>
          <div className="grow"><strong>{tracking.status === 'loading' ? 'Loading local model' : tracking.status === 'error' ? 'Hand tracking unavailable' : tracking.handCount > 0 ? `${tracking.handCount} ${tracking.handCount === 1 ? 'hand' : 'hands'} detected` : live ? 'Waiting for a hand' : 'Camera is off'}</strong><p>{tracking.status === 'error' ? tracking.error : tracking.status === 'loading' ? 'Preparing MediaPipe' : tracking.handCount > 0 ? 'Landmarks detected' : live ? 'Raise a hand into view' : 'Enable the camera to begin'}</p></div>
          <div className="count"><b>{tracking.handCount > 0 ? tracking.handCount * 21 : '—'}</b><span>landmarks</span></div>
        </div>
        <div className="panel-foot"><span>MediaPipe Hand Landmarker</span><span>{tracking.status === 'loading' ? 'Loading local model' : tracking.status === 'ready' ? 'Local model ready' : tracking.status === 'error' ? 'Model unavailable' : 'Camera off'}</span></div>
      </article>

      <article className="panel glass">
        <div className="panel-head"><div><h2>In your space</h2><p>Connected devices</p></div><button className="calibrate-button" onClick={() => { if (live) { setCalibrationDraft(null); setCalibrating(true) } }} disabled={!live}>{lampBox ? 'Recalibrate lamp' : 'Calibrate lamp'}</button></div>
        <div className={`device-row ${lampSelected ? 'selected' : ''} ${targeting.targeted ? 'targeted' : ''}`}>
          <span className="device-icon"><Icon name="bulb" size={19}/></span>
          <span className="device-info"><strong>Living room lamp</strong><span>IKEA · Color bulb</span></span>
          <span className="device-state"><i className={lampConnection === 'connected' ? '' : 'offline'}/>{lampConnection === 'connected' ? 'Online' : lampConnection === 'connecting' ? 'Connecting' : 'Offline'}</span>
          <span className={`lamp-glow ${lampOn ? 'on' : ''}`}><span/></span>
          {targeting.targeted && <span className="targeted-badge">LAMP TARGETED</span>}
        </div>
        <div className="panel-foot"><span><i className={lampConnection === 'connected' ? 'dot-on' : 'dot-off'}/>Zigbee2MQTT</span><span>{lampConnection === 'connected' ? 'Local network' : lampError || 'Check Mosquitto'}</span></div>
      </article>
    </section>

    <footer className="statusbar"><span><i className="dot-on"/>System ready</span><span>Perception runs locally on this Mac</span><span className="dm">Build 0.1.0</span></footer>
  </main>
}
