import { useState } from 'react'
import styles from './ProfileScreen.module.css'

const BODY_TYPES = [
  { id: 'petite',  label: 'Petite',   desc: 'Under 162cm',  shape: 'petite' },
  { id: 'regular', label: 'Regular',  desc: '162–172cm',    shape: 'regular' },
  { id: 'tall',    label: 'Tall',     desc: 'Over 172cm',   shape: 'tall' },
  { id: 'curvy',   label: 'Curvy',    desc: 'Fuller figure', shape: 'curvy' },
]

const SKIN_TONES = [
  { index: 0, color: '#FDDBB4', label: 'Very fair' },
  { index: 1, color: '#EFC090', label: 'Light' },
  { index: 2, color: '#D4956A', label: 'Light-medium' },
  { index: 3, color: '#B07040', label: 'Medium' },
  { index: 4, color: '#7D4E24', label: 'Medium-deep' },
  { index: 5, color: '#4A2912', label: 'Deep' },
]

const AGE_RANGES = [
  { id: '20s–30s', label: '20s–30s' },
  { id: '30s–40s', label: '30s–40s' },
  { id: '40s+',    label: '40s+' },
]

const DEFAULT_HEIGHT_CM = 165

function cmToFtIn(cm) {
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inches = Math.round(totalIn % 12)
  return { ft, inches }
}

function ftInToCm(ft, inches) {
  return Math.round((ft * 12 + inches) * 2.54)
}

// Simple body silhouette SVG per type
function BodySilhouette({ shape }) {
  const paths = {
    petite:  'M50,15 C44,15 40,20 40,26 L36,60 L40,90 L60,90 L64,60 L60,26 C60,20 56,15 50,15Z',
    regular: 'M50,14 C43,14 38,20 38,27 L33,62 L38,95 L62,95 L67,62 L62,27 C62,20 57,14 50,14Z',
    tall:    'M50,12 C43,12 38,18 38,26 L33,68 L38,105 L62,105 L67,68 L62,26 C62,18 57,12 50,12Z',
    curvy:   'M50,14 C42,14 37,20 37,27 L30,60 L35,95 L65,95 L70,60 L63,27 C63,20 58,14 50,14Z',
  }
  const viewH = shape === 'tall' ? 118 : shape === 'curvy' ? 108 : 105
  return (
    <svg viewBox={`0 0 100 ${viewH}`} className={styles.silhouette}>
      <path d={paths[shape] ?? paths.regular} fill="currentColor" />
    </svg>
  )
}

export default function ProfileScreen({ initialProfile, onSubmit, onBack }) {
  const init = initialProfile ?? {}
  const [heightCm, setHeightCm] = useState(init.heightCm ?? DEFAULT_HEIGHT_CM)
  const [unit, setUnit] = useState('cm')
  const [ftIn, setFtIn] = useState(() => cmToFtIn(init.heightCm ?? DEFAULT_HEIGHT_CM))
  const [bodyType, setBodyType] = useState(init.bodyType ?? null)
  const [skinToneIndex, setSkinToneIndex] = useState(init.skinToneIndex ?? null)
  const [ageRange, setAgeRange] = useState(init.ageRange ?? null)

  const canSubmit = bodyType && skinToneIndex !== null && ageRange

  function handleCmChange(val) {
    const cm = Math.max(140, Math.min(210, Number(val)))
    setHeightCm(cm)
    setFtIn(cmToFtIn(cm))
  }

  function handleFtChange(val) {
    const next = { ...ftIn, ft: Number(val) }
    setFtIn(next)
    setHeightCm(ftInToCm(next.ft, next.inches))
  }

  function handleInChange(val) {
    const next = { ...ftIn, inches: Math.max(0, Math.min(11, Number(val))) }
    setFtIn(next)
    setHeightCm(ftInToCm(next.ft, next.inches))
  }

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ heightCm, bodyType, skinToneIndex, ageRange })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.logo}>FIT CHECK</span>
        <span style={{ width: 28 }} />
      </header>

      <div className={styles.content}>
        <h2 className={styles.sectionTitle}>Your proportions</h2>
        <p className={styles.sectionSub}>We use these to tailor the model to your body — not a runway standard.</p>

        {/* Height */}
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldLabel}>HEIGHT</span>
            <div className={styles.unitToggle}>
              <button
                className={`${styles.unitBtn} ${unit === 'cm' ? styles.unitActive : ''}`}
                onClick={() => setUnit('cm')}
              >cm</button>
              <button
                className={`${styles.unitBtn} ${unit === 'ft' ? styles.unitActive : ''}`}
                onClick={() => setUnit('ft')}
              >ft</button>
            </div>
          </div>

          {unit === 'cm' ? (
            <div className={styles.heightRow}>
              <input
                type="range"
                min="140"
                max="210"
                value={heightCm}
                className={styles.slider}
                onChange={e => handleCmChange(e.target.value)}
              />
              <span className={styles.heightValue}>{heightCm} cm</span>
            </div>
          ) : (
            <div className={styles.ftRow}>
              <div className={styles.ftField}>
                <input
                  type="number"
                  min="4"
                  max="7"
                  value={ftIn.ft}
                  className={styles.ftInput}
                  onChange={e => handleFtChange(e.target.value)}
                />
                <span className={styles.ftUnit}>ft</span>
              </div>
              <div className={styles.ftField}>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={ftIn.inches}
                  className={styles.ftInput}
                  onChange={e => handleInChange(e.target.value)}
                />
                <span className={styles.ftUnit}>in</span>
              </div>
              <span className={styles.heightValue}>{heightCm} cm</span>
            </div>
          )}
        </div>

        {/* Body type */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>BODY TYPE</span>
          <div className={styles.bodyGrid}>
            {BODY_TYPES.map(bt => (
              <button
                key={bt.id}
                className={`${styles.bodyCard} ${bodyType === bt.id ? styles.bodyCardActive : ''}`}
                onClick={() => setBodyType(bt.id)}
              >
                <BodySilhouette shape={bt.shape} />
                <span className={styles.bodyLabel}>{bt.label}</span>
                <span className={styles.bodyDesc}>{bt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Skin tone */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>SKIN TONE</span>
          <div className={styles.toneRow}>
            {SKIN_TONES.map(tone => (
              <button
                key={tone.index}
                className={`${styles.toneSwatch} ${skinToneIndex === tone.index ? styles.toneActive : ''}`}
                style={{ background: tone.color }}
                onClick={() => setSkinToneIndex(tone.index)}
                aria-label={tone.label}
                title={tone.label}
              />
            ))}
          </div>
          {skinToneIndex !== null && (
            <p className={styles.toneLabel}>{SKIN_TONES[skinToneIndex].label}</p>
          )}
        </div>

        {/* Age range */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>AGE RANGE</span>
          <div className={styles.ageRow}>
            {AGE_RANGES.map(ar => (
              <button
                key={ar.id}
                className={`${styles.ageBtn} ${ageRange === ar.id ? styles.ageBtnActive : ''}`}
                onClick={() => setAgeRange(ar.id)}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Generate my fit
        </button>
      </div>
    </div>
  )
}
