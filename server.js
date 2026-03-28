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

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'Missing url' })

  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!pageRes.ok) {
      return res.status(502).json({ error: `Product page returned HTTP ${pageRes.status}` })
    }

    const html = await pageRes.text()

    // og:image is the most reliable across fashion sites — try both attribute orderings
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

    if (!ogMatch) {
      return res.status(422).json({ error: 'Could not find a product image on this page. Try a different URL.' })
    }

    let imageUrl = ogMatch[1]
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
    if (!imageUrl.startsWith('http')) {
      const base = new URL(url)
      imageUrl = base.origin + imageUrl
    }

    console.log('[server] Scraping image:', imageUrl)

    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!imgRes.ok) {
      return res.status(502).json({ error: `Could not download product image (HTTP ${imgRes.status})` })
    }

    const buffer = await imgRes.arrayBuffer()
    const imageBase64 = Buffer.from(buffer).toString('base64')
    const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0]

    console.log('[server] Scraped image, mimeType:', mimeType, 'size:', buffer.byteLength)
    res.json({ imageUrl, imageBase64, mimeType })
  } catch (err) {
    console.error('[server] Scrape error:', err)
    res.status(500).json({ error: err.message || 'Failed to scrape product page' })
  }
})

app.post('/api/generate', async (req, res) => {
  const { prompt, garmentImageBase64, garmentMimeType } = req.body
  console.log('[server] Prompt received:\n', prompt)

  try {
    const parts = []
    if (garmentImageBase64) {
      parts.push({ inlineData: { mimeType: garmentMimeType || 'image/jpeg', data: garmentImageBase64 } })
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
  console.log("Routes registered: POST /api/scrape, POST /api/generate")
})
