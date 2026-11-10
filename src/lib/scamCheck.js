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