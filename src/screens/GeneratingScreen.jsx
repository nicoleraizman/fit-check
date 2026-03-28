import { useEffect, useState } from 'react'
import styles from './GeneratingScreen.module.css'

const STEPS = [
  'Reading your proportions…',
  'Composing the silhouette…',
  'Draping the coat…',
  'Finishing the look…',
]

export default function GeneratingScreen() {
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepId = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
    }, 3500)
    const tickId = setInterval(() => {
      setElapsed(s => s + 1)
    }, 1000)
    return () => { clearInterval(stepId); clearInterval(tickId) }
  }, [])

  return (
    <div className={styles.screen}>
      <span className={styles.logo}>FIT CHECK</span>

      <div className={styles.center}>
        <div className={styles.spinnerWrap}>
          <svg className={styles.ring} viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" />
          </svg>
          <div className={styles.coat}>
            <div className={styles.coatShape} />
          </div>
        </div>

        <h2 className={styles.headline}>Creating your fit model…</h2>
        <p className={styles.step}>{STEPS[stepIndex]}</p>
      </div>

      <div className={styles.footerBlock}>
        <p className={styles.footer}>This takes about 15 seconds — stay with us.</p>
        {elapsed >= 10 && (
          <p className={styles.footerSub}>Still working… nearly there.</p>
        )}
      </div>
    </div>
  )
}
