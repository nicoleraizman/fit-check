# Fit Check

Paste any fashion product URL and see how the garment looks on your body type. Powered by Google Gemini image generation.

## Deploy to Railway

1. Push this repo to GitHub.

2. Go to [railway.app](https://railway.app), create a new project, and select **Deploy from GitHub repo**.

3. Under **Variables**, add:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Railway will automatically run `npm install` and `npm start`. The Express server serves the pre-built `dist/` folder and handles API routes.

5. Once deployed, Railway provides a public URL — open it and the app is live.

## Local development

```bash
# Install dependencies
npm install

# Copy env file and fill in your key
cp .env.example .env

# Run Vite dev server (hot reload, port 5173)
npm run dev

# Or build and run the Express server (port 3001)
npm run build
npm start
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key with image generation access |
