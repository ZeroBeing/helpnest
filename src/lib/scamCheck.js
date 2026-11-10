

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

  // Suspicious websites and links
  /https?:\/\/[^\s]+/i,
  /\b(bit\.ly|tinyurl|t\.co|cutt\.ly|shorturl)\b/i,
  /\b(click|open|visit|follow)\b.{0,40}\b(this link|the link|my link|website|url)\b/i,
  /\b(enter|submit|verify|confirm)\b.{0,50}\b(bank details|password|otp|pin|card details)\b/i,
  /\b(login|sign in|verify account)\b.{0,40}\b(link|website|page)\b/i,
  /\b(download|install)\b.{0,40}\b(apk|unknown app|remote access app)\b/i,

  // Prizes, lotteries and fake rewards
  /\b(lottery|jackpot|prize money|cash prize|lucky winner)\b/i,
  /\b(you have won|you are selected|congratulations winner)\b/i,
  /\b(claim your prize|claim your reward|collect your winnings)\b/i,
  /\b(guaranteed profit|double your money|instant profit)\b/i,
  /\b(free money|free cash|easy money|earn money fast)\b/i,
  /\b(pay to claim|fee to receive|payment to release)\b/i,

  // Investment and cryptocurrency scams
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

  // Suspicious requests for personal data
  /\b(send me your personal details|share your personal information)\b/i,
  /\b(send your bank details|share your account details)\b/i,
  /\b(give me your otp|send me your otp|share your pin)\b/i,
  /\b(share your password|send your password)\b/i,
]


export function checkScam(title, description) {
  const text = `${title} ${description}`
  const hits = RED_FLAGS.filter((r) => r.test(text))
  return { scamFlag: hits.length > 0 }
}

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

    return {
      scamFlag: result.scamFlag === true,
      reason: result.reason || '',
      source: 'groq',
      aiChecked: true,
    }
  } catch (error) {
    console.error('Groq check failed:', error)

    const fallback = checkScam(title, description)

    return {
      ...fallback,
      reason: fallback.scamFlag
        ? 'A suspicious phrase was detected by the backup safety checker.'
        : 'AI service unavailable. Only the backup safety checker was used.',
      source: 'fallback',
      aiChecked: false,
    }
  }
}
