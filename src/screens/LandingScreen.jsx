import { useState } from 'react'
import styles from './LandingScreen.module.css'

export default function LandingScreen({ onStart }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCheckFit() {
    console.log('handleSubmit called')
    console.log('URL value:', url)
    console.log('Button disabled?', !url.trim() || loading)
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    try {
      console.log('Fetching scrape...')
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      console.log('Scrape response:', data)

      if (!res.ok) {
        setError(data.error || 'Could not fetch the product page.')
        setLoading(false)
        return
      }

      onStart({ imageUrl: data.imageUrl, imageBase64: data.imageBase64, mimeType: data.mimeType })
    } catch (err) {
      setError('Could not reach server. Is it running?')
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.logo}>FIT CHECK</span>
      </header>

      <div className={styles.hero}>
        <h1 className={styles.headline}>See it on<br />your body.</h1>
        <p className={styles.sub}>
          Paste any fashion product URL and see how<br />
          the garment looks on your body type.
        </p>
      </div>

      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>Product URL</label>
        <input
          className={styles.urlInput}
          type="url"
          placeholder="https://cos.com/en_gbp/women/…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleCheckFit()}
          disabled={loading}
          autoFocus
        />
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      <div className={styles.cta}>
        <button
          className={styles.ctaBtn}
          onClick={handleCheckFit}
          disabled={!url.trim() || loading}
        >
          {loading ? 'Fetching garment…' : 'Check the fit'}
        </button>
        <p className={styles.ctaNote}>Powered by AI image generation</p>
      </div>
    </div>
  )
}
