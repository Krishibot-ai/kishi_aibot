// ============================================================
//  KrishiBot — Backend Server (Render par deploy karo)
//  Gemini 1.5 Flash (v1) — Free tier supported ✅
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fetch   = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));   // images ke liye limit badhaya
app.use(express.static(path.join(__dirname, 'public')));  // index.html serve karega

// ── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'KrishiBot', time: new Date().toISOString() });
});

// ── Main Chat API ────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // API Key check
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY environment variable set nahi hai!');
      return res.status(500).json({
        error: { message: 'Server config error — GEMINI_API_KEY missing. Render Dashboard mein Environment Variable set karo.' }
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'Messages array required.' } });
    }

    // System message aur chat messages alag karo
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs  = messages.filter(m => m.role !== 'system');

    // Gemini format mein convert karo
    const contents = chatMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    // System prompt ko pehle user message ke saath jodo
    if (systemMsg && contents.length > 0) {
      contents[0].parts[0].text = systemMsg.content + '\n\n' + contents[0].parts[0].text;
    }

    // Gemini API call
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature:     0.7,
            maxOutputTokens: 500,   // ~150 words
            topP:            0.9
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        })
      }
    );

    const data = await geminiRes.json();

    // Gemini error handle karo
    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return res.status(400).json({ error: { message: data.error.message || 'Gemini API Error' } });
    }

    // Response nikaalo
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Maafi kijiye, jawab nahi mila. Dobara koshish karo.';

    // OpenAI-compatible format mein bhejo (frontend isi format mein expect karta hai)
    res.json({
      choices: [{ message: { role: 'assistant', content: reply } }]
    });

  } catch (err) {
    console.error('Server Error:', err.message);
    res.status(500).json({
      error: { message: 'Server error: ' + err.message }
    });
  }
});

// ── Image + Text Chat API ────────────────────────────────────
app.post('/api/chat-image', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: { message: 'GEMINI_API_KEY missing' } });

    const { text, imageBase64, mimeType, systemPrompt } = req.body;

    const parts = [];
    if (systemPrompt) parts.push({ text: systemPrompt + '\n\n' });
    if (imageBase64)  parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } });
    if (text)         parts.push({ text });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(400).json({ error: { message: data.error.message } });

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Photo se jawab nahi mila.';
    res.json({ choices: [{ message: { role: 'assistant', content: reply } }] });

  } catch (err) {
    res.status(500).json({ error: { message: 'Image API error: ' + err.message } });
  }
});

// ── Fallback: index.html serve karo ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ KrishiBot Server running on port ${PORT}`);
  console.log(`🌾 Health: http://localhost:${PORT}/health`);
  console.log(`🔑 Gemini Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ NOT SET — Render mein add karo!'}`);
});
