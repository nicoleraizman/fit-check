import { useState } from 'react'
import LandingScreen from './screens/LandingScreen'
import ProfileScreen from './screens/ProfileScreen'
import GeneratingScreen from './screens/GeneratingScreen'
import ResultScreen from './screens/ResultScreen'
import styles from './App.module.css'
import { generateFitImage } from './api/gemini'

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [profile, setProfile] = useState(null)
  const [garmentData, setGarmentData] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [error, setError] = useState(null)

  function handleGarmentFetched(data) {
    setGarmentData(data)
    setScreen('profile')
  }

  async function handleProfileSubmit(profileData) {
    setProfile(profileData)
    setScreen('generating')
    setError(null)
    setResultImage(null)

    const { imageUrl, error: genError } = await generateFitImage(profileData, garmentData)

    if (genError) {
      setError(genError)
      setScreen('result')
    } else {
      setResultImage(imageUrl)
      setScreen('result')
    }
  }

  return (
    <div className={styles.shell}>
      {screen === 'landing' && (
        <LandingScreen onStart={handleGarmentFetched} />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          initialProfile={profile}
          onSubmit={handleProfileSubmit}
          onBack={() => setScreen('landing')}
        />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'result' && (
        <ResultScreen
          imageUrl={resultImage}
          error={error}
          onTryAnother={() => setScreen('landing')}
          onAdjust={() => setScreen('profile')}
        />
      )}
    </div>
  )
}
