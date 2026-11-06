// Petits bruitages fabriqués à la volée (aucun fichier son).
import { ecrireStockage, lireStockage } from './utils'

let ctx: AudioContext | null = null
let actif = lireStockage('son') !== 'off'

export const sonActif = () => actif
export function basculerSon() {
  actif = !actif
  ecrireStockage('son', actif ? '' : 'off')
  return actif
}

function audio() {
  if (!actif) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function note(freq: number, debut: number, duree: number, type: OscillatorType = 'square', vol = 0.08) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + debut
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + duree + 0.02)
}

function bruit(duree: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass', montee = false) {
  const a = audio()
  if (!a) return
  const n = Math.floor(a.sampleRate * duree)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) {
    const env = montee ? i / n : 1 - i / n
    d[i] = (Math.random() * 2 - 1) * env
  }
  const s = a.createBufferSource()
  s.buffer = buf
  const f = a.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = a.createGain()
  g.gain.value = vol
  s.connect(f).connect(g).connect(a.destination)
  s.start()
  return s
}

export const sons = {
  casse: () => {
    bruit(0.14, 0.35, 1600)
    note(180 + Math.random() * 90, 0, 0.07, 'square', 0.035)
  },
  bois: () => note(150 + Math.random() * 50, 0, 0.07, 'triangle', 0.15),
  pling: () => {
    note(880, 0, 0.25, 'sine', 0.12)
    note(1320, 0.08, 0.35, 'sine', 0.1)
  },
  xp: () => note(1100 + Math.random() * 700, 0, 0.14, 'sine', 0.06),
  succes: () => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.08, 0.32, 'triangle', 0.07)),
  boum: () => {
    bruit(1.4, 1, 380)
    note(70, 0, 0.7, 'sawtooth', 0.18)
  },
  meche: () => bruit(1.5, 0.12, 3500, 'highpass', true),
  ouf: () => {
    note(500, 0, 0.12, 'sine', 0.06)
    note(380, 0.1, 0.18, 'sine', 0.06)
  },
}
