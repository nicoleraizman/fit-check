export async function generateFitImage(profile, garmentData) {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        garmentImageUrl: garmentData?.imageUrl ?? null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[FitCheck] Server error:', data.error)
      return { imageUrl: null, error: data.error ?? 'Server error' }
    }

    const imageUrl = `data:${data.mimeType};base64,${data.imageData}`
    console.log('[FitCheck] Image received, mimeType:', data.mimeType)
    return { imageUrl, error: null }
  } catch (err) {
    console.error('[FitCheck] Fetch error:', err)
    return { imageUrl: null, error: `Could not reach generation server: ${err.message}` }
  }
}
