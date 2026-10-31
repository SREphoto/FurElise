import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/healthz', (_req, res) => {
    res.status(200).type('text/plain').send('OK');
  });

  app.get('/_ah/health', (_req, res) => {
    res.status(200).type('text/plain').send('OK');
  });

  // 1. Server-side Gemini 3.8 TTS Singing & Voice Design endpoint
  app.post('/api/sing', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets. Using built-in Lyra vocal synthesizer.',
          fallback: true,
        });
        return;
      }

      const {
        lyrics = 'La la la, Mochi-Puff sings in the warm breeze! <laugh> Twinkle, twinkle, soft and fluffy!',
        style = 'Cheerful, melodic, cute singing creature with bright musical pitch, joyful rhythm, and sweet vibrato',
        voiceName = 'Puck',
      } = req.body || {};

      const allowedVoices = new Set(['Puck', 'Kore', 'Zephyr', 'Fenrir', 'Charon']);
      const safeVoice = allowedVoices.has(voiceName) ? voiceName : 'Puck';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: String(lyrics).slice(0, 600),
                speechMetadata: {
                  style: String(style).slice(0, 240),
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: safeVoice,
              },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      const mimeType = inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({
          error: 'No audio data returned from Gemini TTS model.',
          fallback: true,
        });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType,
        voiceName: safeVoice,
        lyrics,
      });
    } catch (err: any) {
      console.error('Gemini TTS /api/sing error:', err?.message || err);
      res.status(500).json({
        error: err?.message || 'Failed to synthesize singing audio via Gemini TTS.',
        fallback: true,
      });
    }
  });

  // 2. Server-side Gemini 3.8 Flash Song & Lyra Melody Composer endpoint
  app.post('/api/compose-song', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
          fallback: true,
        });
        return;
      }

      const { topic = 'dancing in the sakura wind', mood = 'cheerful' } = req.body || {};

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Compose a short, adorable 10-second song for "Mochi-Puff", a tiny 2-inch fluffy creature, about: "${String(topic).slice(0, 140)}" in a ${String(mood).slice(0, 40)} mood. Include singable lyrics (with optional <laugh> or <breath> vocal bursts for Gemini 3.8 TTS) and a 12-to-16 note Lyra harp melody using MIDI note numbers between 60 (C4) and 84 (C6).`,
        config: {
          systemInstruction:
            'You are a whimsical musical composer for an interactive 3D fluffy creature named Mochi-Puff. Keep lyrics short (2-4 rhyming lines, under 35 words) and joyful.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short cute song title',
              },
              lyrics: {
                type: Type.STRING,
                description: 'Singable lyrics with musical syllables like La-la-la and optional <laugh> or <breath> tags',
              },
              style: {
                type: Type.STRING,
                description: 'Voice style instruction for Gemini TTS singing',
              },
              tempoBpm: {
                type: Type.INTEGER,
                description: 'Tempo in BPM between 88 and 144',
              },
              notes: {
                type: Type.ARRAY,
                description: 'Sequence of 12 to 16 melody notes for the Lyra harp',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    midi: {
                      type: Type.INTEGER,
                      description: 'MIDI note number (60 to 84)',
                    },
                    dur: {
                      type: Type.NUMBER,
                      description: 'Duration in beats (0.5, 1.0, or 1.5)',
                    },
                    vowel: {
                      type: Type.STRING,
                      description: 'Vowel sound for formant lip-sync: ah, oh, ee, oo, or la',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const songData = JSON.parse(rawText);
      res.json(songData);
    } catch (err: any) {
      console.error('Gemini /api/compose-song error:', err?.message || err);
      res.status(500).json({
        error: err?.message || 'Failed to compose custom song.',
        fallback: true,
      });
    }
  });

  const distDir = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*splat', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Mochi-Puff server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
