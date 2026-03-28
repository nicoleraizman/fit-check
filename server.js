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

  const heightDescriptors = {
    short:   `very short (${heightCm}cm) with short legs and a compact frame`,
    average: `average height (${heightCm}cm) with balanced proportions`,
    tall:    `tall (${heightCm}cm) with long legs`,
    verytall: `very tall (${heightCm}cm) with exceptionally long legs`,
  }
  const heightKey = heightCm < 160 ? 'short' : heightCm <= 170 ? 'average' : heightCm <= 180 ? 'tall' : 'verytall'
  const heightDesc = heightDescriptors[heightKey]

  const bodyDescriptors = {
    petite:  'slim, narrow-shouldered',
    regular: 'proportionate, medium-build',
    curvy:   'hourglass — full bust, narrow waist, wide hips',
    tall:    'lean, long-limbed',
  }
  const bodyDesc = bodyDescriptors[bodyType] ?? bodyDescriptors.regular

  const hemConsequences = {
    short:    `Because she is short, the coat's hem falls near her mid-calf — it reads as a maxi length on her, with very little leg visible below.`,
    average:  `The coat hem falls just below the knee — a classic midi length with a moderate amount of leg visible.`,
    tall:     `Because she is tall, the coat's hem only reaches her knee — more leg is visible than intended by the design.`,
    verytall: `Because she is very tall, the coat's hem sits above the knee — it reads as a short coat on her, with most of her long legs on show.`,
  }
  const hemNote = hemConsequences[heightKey]

  return (
    `A full-body professional fashion photograph of a fictional ${ageRange} woman who is ${heightDesc} with a ${bodyDesc} figure, ${skinLabel} skin tone. ` +
    `She is wearing a coat that matches the reference image exactly — same color, fabric, style, cut, and all details. ` +
    `${hemNote} ` +
    `White studio background, full body visible from head to toe. This is a fictional individual, not a real person.`
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

    console.log('[server] Full Gemini response:', JSON.stringify(response))

    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      console.log('[server] Gemini refusal - full response:', JSON.stringify(response))
      return res.status(500).json({
        error: 'Gemini refused to generate. Reason: ' + (response.promptFeedback?.blockReason || 'unknown'),
      })
    }

    const parts = candidates[0]?.content?.parts
    if (!parts) {
      console.log('[server] No parts in response:', JSON.stringify(candidates[0]))
      return res.status(500).json({ error: 'No image returned from Gemini' })
    }

    const imagePart = parts.find(p => p.inlineData)
    if (!imagePart) {
      const text = parts.filter(p => p.text).map(p => p.text).join('\n')
      console.warn('[server] No image in parts. Text:', text)
      console.warn('[server] Finish reason:', candidates[0].finishReason)
      return res.status(500).json({
        error: `No image in response parts. Finish reason: ${candidates[0].finishReason ?? 'unknown'}${text ? ` — "${text}"` : ''}`,
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
