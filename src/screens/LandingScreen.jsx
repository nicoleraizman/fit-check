import { useState } from 'react'
import styles from './LandingScreen.module.css'

export default function LandingScreen({ onStart }) {
  const [url, setUrl] = useState('')

  function handleCheckFit() {
    const trimmed = url.trim()
    if (!trimmed) return
    onStart({ imageUrl: trimmed })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.logo}>FIT CHECK</span>
      </header>

      <div className={styles.hero}>
        <h1 className={styles.headline}>See it on<br />your body.</h1>
        <p className={styles.sub}>
          Find a garment you love, copy its image URL,<br />
          and see how it looks on your body type.
        </p>
      </div>

      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>Garment image URL</label>
        <input
          className={styles.urlInput}
          type="url"
          placeholder="Right-click any clothing image → Copy Image Address"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheckFit()}
          autoFocus
        />
        <p className={styles.inputHint}>
          Use a flat-lay or ghost mannequin photo — ideally the product-only shot (usually the 2nd or 3rd photo in the gallery on COS or Zara).
        </p>
        <p className={styles.inputHintWarning}>
          Avoid photos of models wearing the item — use the flat product shot for best results.
        </p>
      </div>

      <div className={styles.cta}>
        <button
          className={styles.ctaBtn}
          onClick={handleCheckFit}
          disabled={!url.trim()}
        >
          Check the fit
        </button>
        <p className={styles.ctaNote}>Powered by AI image generation</p>
      </div>
    </div>
  )
}
