const SKIN_TONE_LABELS = [
  'very fair',
  'light',
  'light-medium',
  'medium',
  'medium-deep',
  'deep',
]

const BODY_TYPE_LABELS = {
  petite: 'petite',
  regular: 'average-build',
  tall: 'tall',
  curvy: 'curvy full-figured',
}

function buildPrompt(profile) {
  const { heightCm, bodyType, skinToneIndex, ageRange } = profile
  const skinLabel = SKIN_TONE_LABELS[skinToneIndex] ?? 'medium'
  const bodyLabel = BODY_TYPE_LABELS[bodyType] ?? 'average-build'

  let coatLengthNote = 'mid-calf length on the frame'
  if (heightCm < 158) {
    coatLengthNote = 'appearing very long on the frame, falling close to the ankles'
  } else if (heightCm < 168) {
    coatLengthNote = 'falling just below the knee to mid-calf'
  } else if (heightCm > 178) {
    coatLengthNote = 'reaching just below the knee, proportionate to the tall frame'
  }

  return (
    `Generate a full-body fashion photograph of a fictional ${ageRange} ${bodyLabel} woman, ` +
    `${heightCm}cm tall, with ${skinLabel} skin tone, standing naturally with a relaxed posture. ` +
    `She is wearing exactly the coat shown in the reference image — same color, same style, same cut, same details, ` +
    `${coatLengthNote}. ` +
    `Studio lighting, clean white background, fashion editorial style, full figure visible from head to toe. ` +
    `This is a fictional individual, not a real person.`
  )
}

export async function generateFitImage(profile, garmentData) {
  const prompt = buildPrompt(profile)
  console.log('[FitCheck] Prompt:\n', prompt)

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        garmentImageBase64: garmentData?.imageBase64 ?? null,
        garmentMimeType: garmentData?.mimeType ?? 'image/jpeg',
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
