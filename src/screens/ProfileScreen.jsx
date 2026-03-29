import { useState } from 'react'
import styles from './ProfileScreen.module.css'

const SKIN_TONES = [
  { hex: '#f5d5b8', label: 'Fair' },
  { hex: '#e8b48a', label: 'Light' },
  { hex: '#c8854e', label: 'Medium' },
  { hex: '#a0622a', label: 'Tan' },
  { hex: '#6b3a1f', label: 'Deep' },
  { hex: '#3d1f0d', label: 'Rich' },
]

const FRAME_LABELS = ['Slim', 'Lean', 'Medium', 'Broad', 'Very broad']
const HIP_LABELS   = ['Straight', 'Slight', 'Balanced', 'Full', 'Very full']

function cmToFtIn(cm) {
  const totalIn = Math.round(cm / 2.54)
  return { ft: Math.floor(totalIn / 12), inches: totalIn % 12 }
}

function ftInToCm(ft, inches) {
  return Math.round((ft * 12 + inches) * 2.54)
}

export default function ProfileScreen({ onBack, onSubmit }) {
  const [unit, setUnit]               = useState('cm')
  const [heightCm, setHeightCm]       = useState(165)
  const [ftVal, setFtVal]             = useState(5)
  const [inVal, setInVal]             = useState(5)
  const [garmentLength, setGarmentLength] = useState('')
  const [frameValue, setFrameValue]   = useState(2)
  const [hipValue, setHipValue]       = useState(2)
  const [skinToneIndex, setSkinToneIndex] = useState(2)

  function handleUnitSwitch(u) {
    if (u === unit) return
    if (u === 'ft') {
      const { ft, inches } = cmToFtIn(heightCm)
      setFtVal(ft)
      setInVal(inches)
    } else {
      setHeightCm(ftInToCm(ftVal, inVal))
    }
    setUnit(u)
  }

  function handleSliderChange(val) {
    const cm = Number(val)
    setHeightCm(cm)
    const { ft, inches } = cmToFtIn(cm)
    setFtVal(ft)
    setInVal(inches)
  }

  function handleFtChange(val) {
    const ft = Math.max(3, Math.min(7, Number(val) || 3))
    setFtVal(ft)
    setHeightCm(ftInToCm(ft, inVal))
  }

  function handleInChange(val) {
    const inches = Math.max(0, Math.min(11, Number(val) || 0))
    setInVal(inches)
    setHeightCm(ftInToCm(ftVal, inches))
  }

  const canSubmit = garmentLength && Number(garmentLength) > 0

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ heightCm, garmentLength: Number(garmentLength), frameValue, hipValue, skinToneIndex })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <span className={styles.logo}>FIT CHECK</span>
        <div style={{ width: 48 }} />
      </header>

      <div className={styles.content}>
        <div>
          <h2 className={styles.sectionTitle}>Your measurements</h2>
          <p className={styles.sectionSub}>Help us visualize how this garment will fit your body</p>
        </div>

        {/* HEIGHT */}
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldLabel}>HEIGHT</span>
            <div className={styles.unitToggle}>
              <button className={`${styles.unitBtn} ${unit === 'cm' ? styles.unitActive : ''}`} onClick={() => handleUnitSwitch('cm')}>CM</button>
              <button className={`${styles.unitBtn} ${unit === 'ft' ? styles.unitActive : ''}`} onClick={() => handleUnitSwitch('ft')}>FT</button>
            </div>
          </div>
          {unit === 'cm' ? (
            <div className={styles.heightRow}>
              <input type="range" min={140} max={195} step={1} value={heightCm} onChange={e => handleSliderChange(e.target.value)} className={styles.slider} />
              <span className={styles.heightValue}>{heightCm} cm</span>
            </div>
          ) : (
            <div className={styles.ftRow}>
              <div className={styles.ftField}>
                <input type="number" className={styles.ftInput} value={ftVal} min={3} max={7} onChange={e => handleFtChange(e.target.value)} />
                <span className={styles.ftUnit}>ft</span>
              </div>
              <div className={styles.ftField}>
                <input type="number" className={styles.ftInput} value={inVal} min={0} max={11} onChange={e => handleInChange(e.target.value)} />
                <span className={styles.ftUnit}>in</span>
              </div>
              <span className={styles.heightValue}>({heightCm} cm)</span>
            </div>
          )}
        </div>

        {/* GARMENT LENGTH */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>COAT LENGTH (cm)</span>
          <input
            type="number"
            className={styles.lengthInput}
            placeholder="e.g. 114"
            value={garmentLength}
            min={40}
            max={160}
            onChange={e => setGarmentLength(e.target.value)}
          />
          <p className={styles.fieldHint}>Find this on the product page — usually listed as "back length" or "length from shoulder"</p>
        </div>

        {/* FRAME */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>FRAME</span>
          <div className={styles.sliderRow}>
            <span className={styles.sliderEdgeLabel}>Slim</span>
            <input type="range" min={0} max={4} step={1} value={frameValue} onChange={e => setFrameValue(Number(e.target.value))} className={styles.slider} />
            <span className={styles.sliderEdgeLabel}>Broad</span>
          </div>
          <p className={styles.sliderCenterLabel}>{FRAME_LABELS[frameValue]}</p>
        </div>

        {/* HIPS */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>HIPS</span>
          <div className={styles.sliderRow}>
            <span className={styles.sliderEdgeLabel}>Straight</span>
            <input type="range" min={0} max={4} step={1} value={hipValue} onChange={e => setHipValue(Number(e.target.value))} className={styles.slider} />
            <span className={styles.sliderEdgeLabel}>Full</span>
          </div>
          <p className={styles.sliderCenterLabel}>{HIP_LABELS[hipValue]}</p>
        </div>

        {/* SKIN TONE */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>SKIN TONE</span>
          <div className={styles.toneRow}>
            {SKIN_TONES.map((tone, i) => (
              <button
                key={i}
                className={`${styles.toneSwatch} ${skinToneIndex === i ? styles.toneActive : ''}`}
                style={{ background: tone.hex }}
                onClick={() => setSkinToneIndex(i)}
                aria-label={tone.label}
              />
            ))}
          </div>
        </div>

        <button className={styles.submitBtn} onClick={handleSubmit} disabled={!canSubmit}>
          GENERATE FIT
        </button>
      </div>
    </div>
  )
}
