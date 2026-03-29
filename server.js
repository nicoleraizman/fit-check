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

const FRAME_DESCS = [
  'very slim and narrow-shouldered',
  'lean with narrow shoulders',
  'medium frame with balanced proportions',
  'broad-shouldered with a wide frame',
  'very broad and wide-shouldered',
]

const HIP_DESCS = [
  'straight up-and-down silhouette with minimal hip curve',
  'slight hip curve',
  'balanced proportions between shoulders and hips',
  'full hips noticeably wider than shoulders',
  'very full hips and pronounced hourglass shape',
]

function buildPrompt(profile) {
  const { heightCm, garmentLength, frameValue, hipValue, skinToneIndex } = profile
  const skinLabel  = SKIN_TONE_LABELS[skinToneIndex] ?? 'medium'
  const frameDesc  = FRAME_DESCS[frameValue] ?? FRAME_DESCS[2]
  const hipDesc    = HIP_DESCS[hipValue]    ?? HIP_DESCS[2]

  const hemRatio = garmentLength / heightCm
  let hemDescription
  if (hemRatio < 0.55)      hemDescription = 'the coat hem falls well above her knees, showing most of her legs'
  else if (hemRatio < 0.62) hemDescription = 'the coat hem falls just above her knees'
  else if (hemRatio < 0.68) hemDescription = 'the coat hem falls at knee length'
  else if (hemRatio < 0.75) hemDescription = 'the coat hem falls mid-calf'
  else                      hemDescription = 'the coat hem falls near her ankles, almost floor length on her'

  return (
    `A full-body professional fashion photograph on a white studio background. ` +
    `A fictional woman who is ${heightCm}cm tall. ` +
    `She has a ${frameDesc} and ${hipDesc}. ` +
    `She has ${skinLabel} skin tone. ` +
    `She is wearing a coat that exactly matches the reference image in color, fabric, style and cut. ` +
    `${hemDescription}. ` +
    `Full body visible from head to toe. The proportions must be accurate — this is for a shopping fit visualization tool. Not a real person.`
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
