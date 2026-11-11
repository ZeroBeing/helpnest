import Groq from 'groq-sdk';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Safe request body parsing
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { content, type } = body || {};

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('GROQ_API_KEY missing in environment variables');
      return res.status(200).json({ flagged: false, warning: 'API key missing' });
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are an AI moderator for a community help platform called HelpNest. 
Analyze the following text for severe profanity, abuse, harassment, threats, hate speech, or explicit content.

Text to analyze: "${content}"

Respond strictly in JSON format with two keys:
- "flagged": boolean (true if inappropriate, false if allowed)
- "reason": string (short reason if flagged, otherwise empty string)

Do not block mild, normal, or respectful community requests. Respond ONLY with valid JSON.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return res.status(200).json({
      flagged: Boolean(result.flagged),
      reason: result.reason || ''
    });
  } catch (error) {
    console.error('Moderation error:', error);
    return res.status(200).json({ flagged: false, error: 'Moderation bypass due to server error' });
  }
}
