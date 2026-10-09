import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser
  app.use(express.json({ limit: '25mb' }));

  // Gemini Client Initialization with required telemetry header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '5.2.0',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Server-side text generation endpoint (migrated from client-side)
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('Gemini text error:', error?.message);
      res.status(500).json({ error: error?.message || 'Error generating text' });
    }
  });

  // Server-side image generation endpoint
  app.post('/api/gemini/generate-image', async (req, res) => {
    try {
      const { prompt, aspectRatio = '1:1', style } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      let styledPrompt = prompt.trim();
      if (style && style !== 'None' && style !== 'Auto') {
        styledPrompt = `${styledPrompt}, ${style} style, high quality visual composition`;
      }

      // Valid aspect ratios for gemini-3.1-flash-lite-image: "1:1", "3:4", "4:3", "9:16", "16:9"
      const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
      const finalAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

      console.log(`[Gemini Image] Request: "${styledPrompt.substring(0, 60)}..." [aspect: ${finalAspect}]`);

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: styledPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: finalAspect as any,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      let imageUrl: string | null = null;
      let mimeType = 'image/png';

      for (const part of parts) {
        if (part.inlineData?.data) {
          mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        return res.json({
          success: true,
          imageUrl,
          model: 'gemini-3.1-flash-lite-image',
          source: 'gemini-api',
          aspectRatio: finalAspect,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'No image data returned from model.',
      });
    } catch (error: any) {
      console.error('[Gemini Image Error]:', error?.message);
      const isQuota =
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('429');

      res.status(isQuota ? 429 : 500).json({
        success: false,
        isQuota,
        error: error?.message || 'Error generating image with Gemini',
      });
    }
  });

  // Setup Vite middlewares in development or serve static build in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nedit v5.2 Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server error:', err);
  process.exit(1);
});
