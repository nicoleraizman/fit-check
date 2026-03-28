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

app.post('/api/generate', async (req, res) => {
  const { prompt, garmentImageUrl } = req.body
  console.log('[server] Prompt received:\n', prompt)

  try {
    const parts = []

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
      parts.push({ inlineData: { mimeType, data: imageBase64 } })
    }

    parts.push({ text: prompt })

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: [{ role: 'user', parts }],
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
