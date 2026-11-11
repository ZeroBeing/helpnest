
const RED_FLAGS = [
  // Money requests
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

  // Suspicious pressure
  /\b(act now|limited time|urgent payment|immediate payment)\b/i,
  /\b(account will be blocked|account will be suspended)\b/i,
  /\b(verify immediately|confirm immediately|payment required urgently)\b/i,
  /\b(do not tell anyone|keep this secret|confidential transaction)\b/i,
  /\b(send money to unlock|pay to activate|pay to release)\b/i,

  // Suspicious employment
  /\b(pay to get a job|registration fee for job|job processing fee)\b/i,
  /\b(earn from home guaranteed|work from home guaranteed income)\b/i,
  /\b(pay to complete tasks|deposit to withdraw earnings)\b/i,
  /\b(commission before work|fee before interview)\b/i,

  // Private information
  /\b(send me your personal details|share your personal information)\b/i,
  /\b(send your bank details|share your account details)\b/i,
  /\b(give me your otp|send me your otp|share your pin)\b/i,
  /\b(share your password|send your password)\b/i,
]

// Offline chat checks.
// These focus on clear harmful intent, not isolated words.
const CHAT_BLOCK_PATTERNS = [
  // Explicit threats
  /\b(i will|i'm going to|im going to|i am going to)\b.{0,50}\b(kill you|hurt you|attack you|beat you up|shoot you)\b/i,
  /\b(threaten to kill|going to kill|going to hurt)\b/i,

  // Attempts to steal credentials
  /\b(send|give|tell|share)\b.{0,35}\b(your|me your)\b.{0,20}\b(otp|password|pin code|login credentials)\b/i,
  /\b(steal|hack into)\b.{0,35}\b(your account|your bank account|your password)\b/i,

  // Explicit sexual harassment or solicitation
  /\b(send me|show me|share)\b.{0,35}\b(nude photos|naked pictures|explicit pictures)\b/i,
  /\b(sexual favou?r|sexual services)\b/i,
]

const CHAT_WARN_PATTERNS = [
  // Targeted insults and harassment
  /\b(you are|you're|u are)\b.{0,25}\b(idiot|stupid|moron|worthless|disgusting)\b/i,
  /\b(i will|i'm going to|im going to)\b.{0,40}\b(ruin your life|make you regret|find you)\b/i,

  // Suspicious requests for money or personal information
  /\b(send|transfer|pay|deposit)\b.{0,40}\b(money|cash|payment|fee)\b/i,
  /\b(otp|one time password|bank details|card number|password|account pin)\b/i,
  /\b(keep this secret|do not tell anyone|don't tell anyone)\b/i,
]

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })

    if (!response.ok) throw new Error('AI service unavailable')

    const result = await response.json()
    const decision = String(result.decision || '').toUpperCase()

    if (!['ALLOW', 'WARN', 'BLOCK'].includes(decision)) {
      throw new Error('Invalid AI response')
    }

    const offlineResult = checkScam(title, description)

    if (decision === 'BLOCK') {
      return {
        decision: 'BLOCK',
        scamFlag: true,
        reason: result.reason || 'This request violates HelpNest safety rules.',
        source: 'groq',
        aiChecked: true,
      }
    }

    if (decision === 'WARN' || offlineResult.scamFlag) {
      return {
        decision: 'WARN',
        scamFlag: true,
        reason: result.reason || offlineResult.reason,
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
    console.warn('AI request moderation unavailable:', error)

    const offlineResult = checkScam(title, description)

    return {
      ...offlineResult,
      reason: offlineResult.reason ||
        'AI moderation is unavailable. The limited offline check found no known suspicious patterns.',
      source: 'offline-fallback',
      aiChecked: false,
    }
  }
}

// Offline fallback for chat messages
function checkOfflineChat(content) {
  const text = String(content || '').trim()

  if (CHAT_BLOCK_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      decision: 'BLOCK',
      reason: 'This message appears to contain a serious safety violation.',
    }
  }

  if (
    CHAT_WARN_PATTERNS.some((pattern) => pattern.test(text)) ||
    RED_FLAGS.some((pattern) => pattern.test(text))
  ) {
    return {
      decision: 'WARN',
      reason: 'The offline safety checker detected potentially suspicious or harmful content. Please review your message.',
    }
  }

  return {
    decision: 'ALLOW',
    reason: '',
  }
}

// AI moderation for chat messages with offline fallback
export async function checkContentAI(content) {
  try {
    const response = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      throw new Error(`Moderation service returned ${response.status}`)
    }

    const result = await response.json()
    const decision = String(result.decision || '').toUpperCase()

    if (!['ALLOW', 'WARN', 'BLOCK'].includes(decision)) {
      throw new Error('Invalid AI safety response')
    }

    return {
      decision,
      flagged: result.flagged === true || decision !== 'ALLOW',
      reason: result.reason || '',
      source: 'groq',
      aiChecked: true,
    }
  } catch (error) {
    console.warn(
      'AI chat moderation unavailable. Using offline checks.',
      error
    )

    const offline = checkOfflineChat(content)

    return {
      ...offline,
      flagged: offline.decision !== 'ALLOW',
      source: 'offline-fallback',
      aiChecked: false,
    }
  }
}
