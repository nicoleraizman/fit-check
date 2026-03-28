import styles from './ResultScreen.module.css'

export default function ResultScreen({ imageUrl, error, onTryAnother, onAdjust }) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.logo}>FIT CHECK</span>
      </header>

      <div className={styles.imageSection}>
        {error ? (
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>✕</span>
            <p className={styles.errorText}>{error}</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Your fit model wearing the garment"
            className={styles.resultImage}
          />
        ) : null}
      </div>

      <div className={styles.cta}>
        {!error && imageUrl && (
          <p className={styles.question}>Does this fit work for you?</p>
        )}

        <button className={styles.primaryBtn} onClick={onTryAnother}>
          Try another garment
        </button>
        <button className={styles.secondaryBtn} onClick={onAdjust}>
          Adjust my profile
        </button>
      </div>
    </div>
  )
}
