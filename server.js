import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.static(join(__dirname, 'dist')))

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY })

const SKIN_TONE_LABELS = ['very fair', 'light', 'light-medium', 'medium', 'medium-deep', 'deep']

function buildPrompt(profile) {
  const { heightCm, bodyType, skinToneIndex, ageRange } = profile
  const skinLabel = SKIN_TONE_LABELS[skinToneIndex] ?? 'medium'

  // Describe HOW THE COAT BEHAVES on this height — not the person's height
  let coatBehavior
  if (heightCm < 160) {
    coatBehavior =
      `The woman is very short (${heightCm}cm). The midi coat reaches all the way to her mid-calf, ` +
      `almost ankle length on her short frame. Her legs look short beneath the hem. ` +
      `The coat overwhelms her small frame — the shoulders are wide on her, the sleeves are long.`
  } else if (heightCm <= 170) {
    coatBehavior =
      `The woman is average height (${heightCm}cm). The midi coat falls at a classic midi length, ` +
      `sitting just below the knee. A moderate amount of leg is visible below the hem.`
  } else if (heightCm <= 180) {
    coatBehavior =
      `The woman is tall (${heightCm}cm) with long legs. The same midi coat only reaches her knee on her tall frame. ` +
      `Significant leg is visible below the hem. The coat looks shorter than it is because of her height.`
  } else {
    coatBehavior =
      `The woman is very tall (${heightCm}cm) with exceptionally long legs. The same midi coat sits well above her knee, ` +
      `almost like a mini coat on her frame. A lot of leg is visible. ` +
      `The coat looks dramatically short compared to how it would look on a shorter person.`
  }

  // Describe HOW THE COAT BEHAVES on this body shape
  const bodyBehavior = {
    petite:
      `The coat drapes loosely — petite frame with narrow shoulders and a slim silhouette. ` +
      `The fabric hangs straight with minimal shaping.`,
    regular:
      `The coat fits cleanly with proportionate drape across the shoulders and hips. ` +
      `The silhouette is balanced and the coat falls smoothly.`,
    curvy:
      `The woman has an hourglass figure with noticeably wide hips, full bust, and a clearly defined narrow waist. ` +
      `The coat fabric pulls and drapes around the hips. ` +
      `The belt cinches at a small waist between a full bust above and wide hips below. ` +
      `The coat flares outward over the hips.`,
    tall:
      `The coat fits well through the shoulders and torso on her lean frame. ` +
      `The silhouette is long and streamlined, with the hem sitting high due to her height.`,
  }
  const bodyDesc = bodyBehavior[bodyType] ?? bodyBehavior.regular

  return (
    `A full-body professional fashion photograph of a ${ageRange} woman with ${skinLabel} skin tone ` +
    `wearing the exact coat from the reference image — same color, fabric, style, and every detail preserved.\n\n` +
    `HOW THE COAT FITS HER HEIGHT:\n${coatBehavior}\n\n` +
    `HOW THE COAT FITS HER BODY SHAPE:\n${bodyDesc}\n\n` +
    `Show the full body from head to toe. White studio background. Fictional person, not a real individual.`
  )
}

app.post('/api/generate', async (req, res) => {
  const { profile, garmentImageUrl } = req.body

  const prompt = buildPrompt(profile)
  console.log('[server] Prompt:\n', prompt)

  try {
    const contents = []

    if (garmentImageUrl) {
      console.log('[server] Fetching garment image:', garmentImageUrl)
      const imgRes = await fetch(garmentImageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      })
      if (!imgRes.ok) {
        return res.status(502).json({ error: `Could not fetch garment image (HTTP ${imgRes.status}). Check the URL and try again.` })
      }
      const buffer = await imgRes.arrayBuffer()
      const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0]
      const imageBase64 = Buffer.from(buffer).toString('base64')
      console.log('[server] Garment image fetched, mimeType:', mimeType, 'size:', buffer.byteLength)
      contents.push({ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }] })
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        systemInstruction: 'You are a fashion visualization tool. Your only job is to show exactly how clothing fits on different body types. You must accurately represent the body type and height provided, especially how garment length changes relative to leg length.',
      },
    })

    const responseParts = response.candidates[0].content.parts
    const imagePart = responseParts.find(p => p.inlineData)

    if (!imagePart) {
      const text = responseParts.filter(p => p.text).map(p => p.text).join('\n')
      console.warn('[server] No image part. Text:', text)
      console.warn('[server] Finish reason:', response.candidates[0].finishReason)
      return res.status(500).json({
        error: `No image returned. Finish reason: ${response.candidates[0].finishReason ?? 'unknown'}${text ? ` — "${text}"` : ''}`,
      })
    }

    console.log('[server] Image generated, mimeType:', imagePart.inlineData.mimeType)
    res.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    })
  } catch (err) {
    console.error('[server] Gemini error:', err)
    res.status(500).json({ error: err.message ?? 'Unknown error' })
  }
})

app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(3001, () => {
  console.log('[server] Running on http://localhost:3001')
  console.log('Routes registered: POST /api/generate')
})
