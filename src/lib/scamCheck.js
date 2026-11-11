
const RED_FLAGS = [
  // Money requests: warn for human review
  /\b(need|needs|want|wants|request|requesting|looking for|require|required)\b.{0,40}\b(money|cash|funds|payment|donation|fee|deposit)\b/i,
  /\b(money|cash|funds|payment|donation|fee|deposit)\b.{0,40}\b(needed|required|requested|send|transfer|pay)\b/i,
  /\b(send|give|transfer|pay|deposit)\b.{0,40}\b(money|cash|funds|payment)\b/i,
  /\b(pay|send|transfer)\b.{0,30}\b(first|before|upfront|in advance)\b/i,
  /\b(advance payment|upfront payment|processing fee|registration fee)\b/i,
  /\b(refund|repayment|reimbursement)\b.{0,40}\b(money|payment|fee)\b/i,

  // Bank and financial information
  /\b(bank account|account number|account details|bank details)\b/i,
  /\b(iban|swift code|routing number|account holder)\b/i,
  /\b(credit card|debit card|card number|cvv|cvc)\b/i,
  /\b(easypaisa|jazzcash|nayapay|sadapay)\b.{0,50}\b(pin|otp|password|transfer|payment|account)\b/i,
  /\b(wallet address|crypto wallet|bitcoin wallet)\b/i,
  /\b(western union|moneygram|wire transfer)\b/i,

  // Passwords and private information
  /\b(otp|one time password|verification code|security code)\b/i,
  /\b(pin code|secret pin|account pin)\b/i,
  /\b(password|passcode|login credentials|recovery code)\b/i,
  /\b(cnic|national identity|identity card|passport number)\b/i,
  /\b(send|share|provide|enter|submit)\b.{0,40}\b(otp|pin|password|cnic|passport|card number)\b/i,
  /\b(upload|submit|send)\b.{0,40}\b(identity document|identity card|passport)\b/i,

  // Suspicious links
  /https?:\/\/[^\s]+/i,
  /\b(bit\.ly|tinyurl|t\.co|cutt\.ly|shorturl)\b/i,
  /\b(click|open|visit|follow)\b.{0,40}\b(this link|the link|my link|website|url)\b/i,
  /\b(enter|submit|verify|confirm)\b.{0,50}\b(bank details|password|otp|pin|card details)\b/i,
  /\b(login|sign in|verify account)\b.{0,40}\b(link|website|page)\b/i,
  /\b(download|install)\b.{0,40}\b(apk|unknown app|remote access app)\b/i,

  // Fake prizes and rewards
  /\b(lottery|jackpot|prize money|cash prize|lucky winner)\b/i,
  /\b(you have won|you are selected|congratulations winner)\b/i,
  /\b(claim your prize|claim your reward|collect your winnings)\b/i,
  /\b(guaranteed profit|double your money|instant profit)\b/i,
  /\b(free money|free cash|easy money|earn money fast)\b/i,
  /\b(pay to claim|fee to receive|payment to release)\b/i,

  // Investment and cryptocurrency
  /\b(crypto|bitcoin|ethereum|usdt|trading signals)\b/i,
  /\b(investment opportunity|guaranteed returns|risk free investment)\b/i,
  /\b(double investment|daily returns|passive income guaranteed)\b/i,
  /\b(send crypto|transfer bitcoin|buy usdt)\b/i,

  // Suspicious pressure and manipulation
  /\b(act now|limited time|urgent payment|immediate payment)\b/i,
  /\b(account will be blocked|account will be suspended)\b/i,
  /\b(verify immediately|confirm immediately|payment required urgently)\b/i,
  /\b(do not tell anyone|keep this secret|confidential transaction)\b/i,
  /\b(send money to unlock|pay to activate|pay to release)\b/i,

  // Suspicious employment and task offers
  /\b(pay to get a job|registration fee for job|job processing fee)\b/i,
  /\b(earn from home guaranteed|work from home guaranteed income)\b/i,
  /\b(pay to complete tasks|deposit to withdraw earnings)\b/i,
  /\b(commission before work|fee before interview)\b/i,

  // Requests for private information
  /\b(send me your personal details|share your personal information)\b/i,
  /\b(send your bank details|share your account details)\b/i,
  /\b(give me your otp|send me your otp|share your pin)\b/i,
  /\b(share your password|send your password)\b/i,
]

// Offline checker for known suspicious patterns
export function checkScam(title, description) {
  const text = `${title || ''} ${description || ''}`
  const hits = RED_FLAGS.some((pattern) => pattern.test(text))

  return {
    scamFlag: hits,
    decision: hits ? 'WARN' : 'ALLOW',
    reason: hits
      ? 'Our offline safety checker detected a potentially suspicious phrase. Please verify this request carefully.'
      : '',
    source: 'offline',
    aiChecked: false,
  }
}

// AI request checker with automatic offline fallback
export async function checkScamAI(title, description) {
  try {
    const response = await fetch('/api/scam-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description }),
    })

    if (!response.ok) {
      throw new Error('AI service unavailable')
    }

    const result = await response.json()
    const decision = String(result.decision || '').toUpperCase()

    if (!['ALLOW', 'WARN', 'BLOCK'].includes(decision)) {
      throw new Error('Invalid AI response')
    }

    // Run offline checks as an additional safety layer.
    const offlineResult = checkScam(title, description)

    // AI BLOCK always remains BLOCK.
    if (decision === 'BLOCK') {
      return {
        decision: 'BLOCK',
        scamFlag: true,
        reason: result.reason || 'This request violates HelpNest safety rules.',
        source: 'groq',
        aiChecked: true,
      }
    }

    // A warning from either checker must not be ignored.
    if (decision === 'WARN' || offlineResult.scamFlag) {
      return {
        decision: 'WARN',
        scamFlag: true,
        reason:
          result.reason ||
          offlineResult.reason ||
          'Please verify this request carefully.',
        source: 'groq+offline',
        aiChecked: true,
      }
    }

    return {
      decision: 'ALLOW',
      scamFlag: false,
      reason: '',
      source: 'groq+offline',
      aiChecked: true,
    }
  } catch (error) {
    console.warn(
      'AI request moderation unavailable. Using offline checks.',
      error
    )

    // Groq failed: use the existing offline checker.
    const offlineResult = checkScam(title, description)

    return {
      ...offlineResult,
      reason: offlineResult.scamFlag
        ? offlineResult.reason
        : 'AI moderation is unavailable. Offline checks found no known suspicious patterns, but this is not a complete safety check.',
      source: 'offline-fallback',
      aiChecked: false,
    }
  }
}

// AI moderation for chat messages
export async function checkContentAI(content) {
  const response = await fetch('/api/moderate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    throw new Error('AI chat moderation unavailable. Please try again.')
  }

  const result = await response.json()
  const decision = String(result.decision || '').toUpperCase()

  if (!['ALLOW', 'WARN', 'BLOCK'].includes(decision)) {
    throw new Error('Invalid AI safety response.')
  }

  return {
    decision,
    flagged: result.flagged === true || decision !== 'ALLOW',
    reason: result.reason || '',
    aiChecked: true,
  }
}
