# FitCheck
https://fit-check-pi9n.onrender.com/ 
FitCheck solves a real online shopping problem: a coat that looks elegant on a 180cm model can look completely different on a shorter person — but there's no way to know before buying.

You paste a product URL, enter your height, body frame, and skin tone, and FitCheck generates an AI image showing how that garment would actually look on your body type.

## How it works
- Paste any fashion product image URL
- Set your height, frame width, hip shape, and skin tone
- FitCheck sends the garment image + your measurements to Google Gemini
- Gemini generates a full-body fashion photo showing the fit on your proportions

## Tech stack
- React (frontend)
- Express (backend)
- Google Gemini 2.5 Flash (AI image generation)
- Vite
- Deployed on Render

## Environment variables
| Variable | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key with image generation access |
