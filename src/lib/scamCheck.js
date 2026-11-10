const RED_FLAGS = [
  /send (me )?money/i,
  /western union/i,
  /gift ?card/i,
  /bank (account|details)/i,
  /\botp\b/i,
  /\bpin\b/i,
  /password/i,
  /crypto|bitcoin|usdt/i,
  /easypaisa|jazzcash/i,
  /advance payment|pay (first|in advance)/i,
  /\bcnic\b/i,
  /wire transfer/i,
  /lottery|prize|winner/i,
  /guaranteed profit|investment/i,
  /https?:\/\//i,
]

export function checkScam(title, description) {
  const text = `${title} ${description}`
  const hits = RED_FLAGS.filter((r) => r.test(text))
  return { scamFlag: hits.length > 0 }
}

export async function checkScamAI(title, description) {
  // Quick keyword rules first (free and instant)
  if (checkScam(title, description).scamFlag) {
    return { scamFlag: true, reason: 'This looks like it involves money, personal info or links.' }
  }
  // Then ask the AI. If it fails, we let the post through.
  try {
    const res = await fetch('/api/scam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    if (!res.ok) throw new Error('AI check unavailable')
    const data = await res.json()
    return { scamFlag: !!data.scamFlag, reason: data.reason || '' }
  } catch {
    return { scamFlag: false, reason: '' }
  }
}