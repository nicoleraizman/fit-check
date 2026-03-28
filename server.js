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

  let heightDesc
  if (heightCm < 160) {
    heightDesc = 'very petite woman, short stature, the coat hem reaches her mid-shin, noticeably short legs relative to torso'
  } else if (heightCm <= 170) {
    heightDesc = 'average height woman, the coat hem falls at knee length'
  } else if (heightCm <= 180) {
    heightDesc = 'tall woman, long legs, the coat hem sits above the knee'
  } else {
    heightDesc = 'very tall woman, exceptionally long legs, the coat appears short on her, hem well above the knee'
  }

  const bodyDescriptors = {
    petite:  'narrow shoulders, small frame, slim throughout',
    regular: 'proportionate shoulders and hips, medium build',
    curvy:   'wide hips significantly wider than shoulders, full bust, defined waist',
    tall:    'long limbs, lean proportions, leggy silhouette',
  }
  const bodyDesc = bodyDescriptors[bodyType] ?? bodyDescriptors.regular

  const fitConsequences = {
    petite:  'the coat overwhelms her small frame, sleeves are long, shoulders wide, hem near the ankle',
    regular: 'the coat fits proportionately, hem at knee, shoulders align well',
    curvy:   'the coat is fitted through the waist and flares over the hips, hips visibly wider than shoulders',
    tall:    'the coat looks short on her long frame, hem high, sleeves cropped, silhouette lean and elongated',
  }
  const fitConsequence = fitConsequences[bodyType] ?? fitConsequences.regular

  const skinLabel = SKIN_TONE_LABELS[skinToneIndex] ?? 'medium'

  return (
    `A full-body professional fashion photograph. A ${heightDesc}, ${bodyDesc} woman` +
    ` with ${skinLabel} skin tone, ${ageRange} age range, wearing this exact coat —` +
    ` same color, same style, preserve all details.` +
    ` The coat should visually demonstrate how it fits THIS specific body: ${fitConsequence}.` +
    ` White studio background, full body visible from head to toe. Fictional person, not a real individual.`
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
